#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const expectedVersion = JSON.parse(readFileSync('manifest.json', 'utf8')).version;
const expectedZip = `dist/quick-obsidian-clipper-v${expectedVersion}-chrome-store.zip`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(path) {
  return readFileSync(path, 'utf8');
}

function sha256(data) {
  return createHash('sha256').update(data).digest('hex');
}

function listFiles(root, current = root) {
  return readdirSync(current, { withFileTypes: true }).flatMap(entry => {
    const path = join(current, entry.name);
    return entry.isDirectory() ? listFiles(root, path) : [relative(root, path).split(sep).join('/')];
  }).sort();
}

function buildPackage() {
  const output = execFileSync('bash', ['scripts/build-store-package.sh'], { encoding: 'utf8' }).trim();
  assert(output === expectedZip, `Build returned unexpected package path: ${output}`);
  return sha256(readFileSync(expectedZip));
}

function frontmatterVersion(path) {
  return read(path).match(/^version:\s*(\S+)$/m)?.[1];
}

function pngDimensions(path) {
  const buffer = readFileSync(path);
  assert(buffer.subarray(1, 4).toString('ascii') === 'PNG', `${path} is not a PNG`);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function jpegDimensions(path) {
  const buffer = readFileSync(path);
  assert(buffer[0] === 0xff && buffer[1] === 0xd8, `${path} is not a JPEG`);
  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) { offset += 1; continue; }
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  throw new Error(`Could not read JPEG dimensions: ${path}`);
}

const manifest = JSON.parse(read('manifest.json'));
assert(manifest.version === expectedVersion, `Manifest version is ${manifest.version}`);

for (const path of [
  'docs/store-listing/description-en.md',
  'docs/store-listing/description-de.md',
  'docs/store-listing/privacy-policy.md',
  'docs/store-listing/submission-metadata.md'
]) {
  assert(frontmatterVersion(path) === expectedVersion, `${path} is not version ${expectedVersion}`);
}

const options = read('options-redesigned.html');
assert(options.includes(`v${expectedVersion} — Chrome Web Store release candidate`), 'Options footer version mismatch');

const metadata = read('docs/store-listing/submission-metadata.md');
assert(metadata.includes(expectedZip), 'Submission metadata points to the wrong ZIP');

const landing = read('landing/app.js');
assert(landing.includes('Version 2.4.17 is live in the Chrome Web Store'), 'Landing Store status is stale');
assert(landing.includes(`manual version ${expectedVersion}`), 'Landing manual version is stale');

const firstBuildHash = buildPackage();
const secondBuildHash = buildPackage();
assert(firstBuildHash === secondBuildHash, `Store package is not reproducible: ${firstBuildHash} != ${secondBuildHash}`);

const screenshotPng = pngDimensions('docs/store-listing/assets/screenshot-01-options-1280x800.png');
const screenshotJpg = jpegDimensions('docs/store-listing/assets/screenshot-01-options-1280x800.jpg');
const tilePng = pngDimensions('docs/store-listing/assets/promo-tile-440x280.png');
const tileJpg = jpegDimensions('docs/store-listing/assets/promo-tile-440x280.jpg');
for (const dimensions of [screenshotPng, screenshotJpg]) {
  assert(dimensions.width === 1280 && dimensions.height === 800, 'Store screenshot must be 1280x800');
}
for (const dimensions of [tilePng, tileJpg]) {
  assert(dimensions.width === 440 && dimensions.height === 280, 'Promo tile must be 440x280');
}

const zipEntries = execFileSync('unzip', ['-Z1', expectedZip], { encoding: 'utf8' })
  .trim().split('\n').filter(Boolean);
const stagingRoot = 'dist/chrome-store-staging';
const stagedFiles = listFiles(stagingRoot);
assert(JSON.stringify(zipEntries) === JSON.stringify(stagedFiles), 'ZIP entries do not match the fresh staging tree');
const forbidden = zipEntries.filter(entry =>
  /(^|\/)(\.git|docs|archive|scripts)(\/|$)|(^|\/)\.DS_Store$|(^|\/)\.env($|\.)/.test(entry)
);
assert(forbidden.length === 0, `Forbidden ZIP entries: ${forbidden.join(', ')}`);

for (const entry of zipEntries) {
  const archived = execFileSync('unzip', ['-p', expectedZip, entry]);
  const staged = readFileSync(join(stagingRoot, entry));
  assert(sha256(archived) === sha256(staged), `ZIP payload differs from fresh staging: ${entry}`);
}

const embeddedManifest = JSON.parse(execFileSync('unzip', ['-p', expectedZip, 'manifest.json'], { encoding: 'utf8' }));
assert(embeddedManifest.version === expectedVersion, 'ZIP manifest version mismatch');

const zipHash = sha256(readFileSync(expectedZip));
const screenshotHashes = {
  screenshotPng: sha256(readFileSync('docs/store-listing/assets/screenshot-01-options-1280x800.png')),
  screenshotJpg: sha256(readFileSync('docs/store-listing/assets/screenshot-01-options-1280x800.jpg')),
  tilePng: sha256(readFileSync('docs/store-listing/assets/promo-tile-440x280.png')),
  tileJpg: sha256(readFileSync('docs/store-listing/assets/promo-tile-440x280.jpg'))
};
const captureManifest = JSON.parse(read(`docs/store-listing/assets/capture-manifest-v${expectedVersion}.json`));
assert(captureManifest.version === expectedVersion, 'Screenshot capture manifest version mismatch');
for (const [path, expectedHash] of Object.entries(captureManifest.sourceHashes || {})) {
  assert(sha256(readFileSync(path)) === expectedHash, `Store screenshots are stale for changed source: ${path}`);
}
for (const [asset, expectedHash] of Object.entries(captureManifest.assetHashes || {})) {
  assert(screenshotHashes[asset] === expectedHash, `Store screenshot hash mismatch: ${asset}`);
}
assert(captureManifest.assertions?.storeViewport?.width === 1280, 'Capture manifest Store width mismatch');
assert(captureManifest.assertions?.storeViewport?.height === 800, 'Capture manifest Store height mismatch');
assert(captureManifest.assertions?.primaryActionsVisible === true, 'Capture manifest did not prove action visibility');
assert(captureManifest.assertions?.promoVersion === `v${expectedVersion}`, 'Capture manifest promo version mismatch');
console.log(JSON.stringify({
  version: expectedVersion,
  zip: expectedZip,
  sha256: zipHash,
  runtimeFiles: zipEntries.length,
  forbiddenEntries: forbidden,
  reproducibleBuilds: { first: firstBuildHash, second: secondBuildHash, match: true },
  payloadMatchesFreshStaging: true,
  assets: { screenshotPng, screenshotJpg, tilePng, tileJpg },
  screenshotHashes,
  captureManifestVerified: true,
  landingVersions: { publicStore: '2.4.17', manualInstall: expectedVersion }
}, null, 2));
