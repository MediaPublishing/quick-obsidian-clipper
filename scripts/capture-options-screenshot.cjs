const {
  closeExtensionContext,
  collectPageErrors,
  getExtensionId,
  launchExtensionContext,
  repo
} = require('./browser-test-helpers.cjs');

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
    const version = (await page.locator('footer .version').textContent())?.trim();

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
    if (version !== 'v2.4.17 — Chrome Web Store release candidate') throw new Error(`Unexpected options version: ${version}`);

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

    console.log(JSON.stringify({
      extensionId,
      version,
      openFolderEnabled,
      primaryActionsVisibleBeforeGrid: true,
      mobileLayout,
      xSyncLayout: { title: syncTitle, actions: syncActions, autoSync },
      screenshot: `${repo}/landing/assets/options-dashboard.png`
    }, null, 2));
  } finally {
    await closeExtensionContext(context);
  }
})();
