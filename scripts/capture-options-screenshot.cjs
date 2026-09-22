const {
  closeExtensionContext,
  collectPageErrors,
  getExtensionId,
  launchExtensionContext,
  repo
} = require('./browser-test-helpers.cjs');
const { createHash } = require('node:crypto');
const { readFileSync, writeFileSync } = require('node:fs');
const version = JSON.parse(readFileSync(`${repo}/manifest.json`, 'utf8')).version;

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

(async () => {
  const context = await launchExtensionContext('qoc-options-shot.', { width: 1440, height: 1100 });
  try {
    const extensionId = await getExtensionId(context);
    const page = await context.newPage();
    const errors = collectPageErrors(page);
    await page.goto(`chrome-extension://${extensionId}/options-redesigned.html`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(500);

    const syncTitle = await page.locator('#twitter-sync-led').locator('xpath=..').boundingBox();
    const syncActions = await page.locator('.sync-actions').boundingBox();
    const autoSync = await page.locator('#enable-twitter-sync').locator('xpath=ancestor::div[contains(@class, "data-row")]').boundingBox();
    const primaryActions = await page.locator('.actions').boundingBox();
    const settingsGrid = await page.locator('.grid').boundingBox();
    const openFolderEnabled = await page.locator('#show-download-location').isEnabled();
    const displayedVersion = (await page.locator('footer .version').textContent())?.trim();

    if (errors.length) throw new Error(`Options page errors: ${errors.join(' | ')}`);
    if (!syncTitle || !syncActions || !autoSync || !primaryActions || !settingsGrid) {
      throw new Error('Could not measure settings layout');
    }
    if (primaryActions.y + primaryActions.height > settingsGrid.y) {
      throw new Error('Primary action toolbar is not visible before the settings grid');
    }
    if (syncActions.y < syncTitle.y + syncTitle.height || syncActions.y + syncActions.height > autoSync.y) {
      throw new Error('X sync actions overlap the section title or Auto-Sync row');
    }
    if (!openFolderEnabled) throw new Error('Open download folder action is disabled');
    if (displayedVersion !== `v${version} — Chrome Web Store release candidate`) throw new Error(`Unexpected options version: ${displayedVersion}`);

    await page.screenshot({
      path: `${repo}/landing/assets/options-dashboard.png`,
      fullPage: true,
      animations: 'disabled'
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(100);
    const mobileLayout = await page.evaluate(() => ({
      viewportWidth: window.innerWidth,
      contentWidth: document.documentElement.scrollWidth,
      actionColumns: getComputedStyle(document.querySelector('.actions')).gridTemplateColumns.split(' ').length,
      reducedMotionRulePresent: [...document.styleSheets]
        .flatMap(sheet => [...sheet.cssRules])
        .some(rule => rule.media?.mediaText?.includes('prefers-reduced-motion')),
      overflowElements: [...document.querySelectorAll('body *')]
        .map(element => {
          const rect = element.getBoundingClientRect();
          return { tag: element.tagName, id: element.id, className: element.className, right: Math.round(rect.right), width: Math.round(rect.width) };
        })
        .filter(item => item.right > window.innerWidth + 1)
        .slice(0, 8)
    }));
    if (mobileLayout.contentWidth > mobileLayout.viewportWidth) {
      throw new Error(
        `Mobile settings overflow horizontally: ${mobileLayout.contentWidth} > ${mobileLayout.viewportWidth}; ` +
        `offenders=${JSON.stringify(mobileLayout.overflowElements)}`
      );
    }
    if (mobileLayout.actionColumns !== 2 || !mobileLayout.reducedMotionRulePresent) {
      throw new Error(`Mobile/reduced-motion layout mismatch: ${JSON.stringify(mobileLayout)}`);
    }

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(100);
    const storeActions = await page.locator('.actions').boundingBox();
    if (!storeActions || storeActions.y < 0 || storeActions.y + storeActions.height > 800) {
      throw new Error(`Primary actions are outside the 1280x800 Store screenshot: ${JSON.stringify(storeActions)}`);
    }
    const storeScreenshotPng = `${repo}/docs/store-listing/assets/screenshot-01-options-1280x800.png`;
    const storeScreenshotJpg = `${repo}/docs/store-listing/assets/screenshot-01-options-1280x800.jpg`;
    await page.screenshot({ path: storeScreenshotPng, animations: 'disabled' });
    await page.screenshot({ path: storeScreenshotJpg, type: 'jpeg', quality: 92, animations: 'disabled' });

    await page.setViewportSize({ width: 440, height: 280 });
    await page.setContent(`
      <!doctype html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; width: 440px; height: 280px; overflow: hidden; background: #fff; color: #0b0b0b; font-family: Arial, Helvetica, sans-serif; }
          main { width: 100%; height: 100%; padding: 24px; border: 8px solid #0b0b0b; display: grid; grid-template-rows: auto 1fr auto; gap: 14px; }
          header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
          .brand { display: flex; align-items: center; gap: 10px; }
          img { width: 38px; height: 38px; border-radius: 9px; }
          h1 { margin: 0; font-size: 23px; line-height: 1; letter-spacing: -1px; }
          .version { padding: 7px 9px; background: #ff5a00; border: 2px solid #0b0b0b; font: 700 11px/1 monospace; white-space: nowrap; }
          .promise { align-self: center; margin: 0; max-width: 350px; font-size: 25px; line-height: 1.08; font-weight: 800; letter-spacing: -0.8px; }
          .features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; }
          .feature { padding: 9px 8px; border: 2px solid #0b0b0b; background: #f5f5f5; font-size: 10px; line-height: 1.15; font-weight: 700; text-align: center; text-transform: uppercase; letter-spacing: .3px; }
        </style>
      </head>
      <body>
        <main>
          <header>
            <div class="brand"><img src="chrome-extension://${extensionId}/icons/icon128.png" alt=""><h1>Quick Obsidian Clipper</h1></div>
            <div class="version">v${version}</div>
          </header>
          <p class="promise">Save the web as clean Markdown. Locally.</p>
          <div class="features">
            <div class="feature">One-click clipping</div>
            <div class="feature">X bookmark sync</div>
            <div class="feature">No cloud account</div>
          </div>
        </main>
      </body>
      </html>
    `, { waitUntil: 'load' });
    await page.waitForTimeout(100);
    const promoVersion = (await page.locator('.version').textContent())?.trim();
    if (promoVersion !== `v${version}`) throw new Error(`Unexpected promo tile version: ${promoVersion}`);
    const promoTilePng = `${repo}/docs/store-listing/assets/promo-tile-440x280.png`;
    const promoTileJpg = `${repo}/docs/store-listing/assets/promo-tile-440x280.jpg`;
    await page.screenshot({ path: promoTilePng, animations: 'disabled' });
    await page.screenshot({ path: promoTileJpg, type: 'jpeg', quality: 92, animations: 'disabled' });

    const captureManifestPath = `${repo}/docs/store-listing/assets/capture-manifest-v${version}.json`;
    const sourcePaths = ['options-redesigned.html', 'options.js', 'options.css', 'icons/icon128.png', 'scripts/capture-options-screenshot.cjs'];
    const assetPaths = {
      screenshotPng: 'docs/store-listing/assets/screenshot-01-options-1280x800.png',
      screenshotJpg: 'docs/store-listing/assets/screenshot-01-options-1280x800.jpg',
      tilePng: 'docs/store-listing/assets/promo-tile-440x280.png',
      tileJpg: 'docs/store-listing/assets/promo-tile-440x280.jpg'
    };
    const captureManifest = {
      version,
      sourceHashes: Object.fromEntries(sourcePaths.map(path => [path, sha256(`${repo}/${path}`)])),
      assetHashes: Object.fromEntries(Object.entries(assetPaths).map(([key, path]) => [key, sha256(`${repo}/${path}`)])),
      assertions: {
        storeViewport: { width: 1280, height: 800 },
        primaryActionsVisible: storeActions.y >= 0 && storeActions.y + storeActions.height <= 800,
        promoVersion
      }
    };
    writeFileSync(captureManifestPath, `${JSON.stringify(captureManifest, null, 2)}\n`);

    console.log(JSON.stringify({
      extensionId,
      version: displayedVersion,
      openFolderEnabled,
      primaryActionsVisibleBeforeGrid: true,
      mobileLayout,
      xSyncLayout: { title: syncTitle, actions: syncActions, autoSync },
      screenshot: `${repo}/landing/assets/options-dashboard.png`,
      storeAssets: { storeScreenshotPng, storeScreenshotJpg, promoTilePng, promoTileJpg, captureManifestPath },
      storeScreenshot: { viewport: { width: 1280, height: 800 }, primaryActions: storeActions },
      promoVersion
    }, null, 2));
  } finally {
    await closeExtensionContext(context);
  }
})();
