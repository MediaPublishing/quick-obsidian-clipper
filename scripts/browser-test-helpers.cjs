const path = require('node:path');
const os = require('node:os');
const { mkdtemp, rm } = require('node:fs/promises');

const repo = path.resolve(__dirname, '..');
const WORKER_POLL_ATTEMPTS = 60;
const WORKER_POLL_INTERVAL_MS = 250;

function loadPlaywright() {
  const configuredPath = process.env.QOC_PLAYWRIGHT_PATH;
  const fallbackPath = path.resolve(repo, '..', 'tools-ainauten', 'node_modules', 'playwright');

  try {
    return require('playwright');
  } catch (error) {
    try {
      return require(configuredPath || fallbackPath);
    } catch {
      throw new Error(
        `Playwright is required. Install it locally or set QOC_PLAYWRIGHT_PATH. Original error: ${error.message}`
      );
    }
  }
}

const { chromium } = loadPlaywright();

async function launchExtensionContext(profilePrefix, viewport) {
  const profile = await mkdtemp(path.join(os.tmpdir(), profilePrefix));
  const context = await chromium.launchPersistentContext(profile, {
    headless: false,
    viewport,
    args: [
      `--disable-extensions-except=${repo}`,
      `--load-extension=${repo}`
    ]
  });
  context.qocProfilePath = profile;
  return context;
}

async function closeExtensionContext(context) {
  if (!context) return;
  const profile = context.qocProfilePath;
  try {
    await context.close();
  } finally {
    if (profile) await rm(profile, { recursive: true, force: true });
  }
}

async function getExtensionId(context) {
  let worker;
  for (let attempt = 0; attempt < WORKER_POLL_ATTEMPTS && !worker; attempt += 1) {
    worker = context.serviceWorkers().find(item => item.url().includes('background-simple.js'));
    if (!worker) await new Promise(resolve => setTimeout(resolve, WORKER_POLL_INTERVAL_MS));
  }
  if (!worker) throw new Error('Extension background worker not found');
  return new URL(worker.url()).hostname;
}

function collectPageErrors(page) {
  const errors = [];
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', error => errors.push(error.message));
  return errors;
}

module.exports = {
  chromium,
  closeExtensionContext,
  collectPageErrors,
  getExtensionId,
  launchExtensionContext,
  repo
};
