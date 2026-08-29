const {
  closeExtensionContext,
  collectPageErrors,
  getExtensionId,
  launchExtensionContext
} = require('./browser-test-helpers.cjs');

const ASSERTION_TIMEOUT_MS = 12000;

async function waitForText(page, selector, expected, timeout = ASSERTION_TIMEOUT_MS) {
  await page.waitForFunction(
    ({ selector, expected }) => document.querySelector(selector)?.textContent?.trim() === expected,
    { selector, expected },
    { timeout }
  );
}

(async () => {
  const context = await launchExtensionContext('qoc-options-runtime.', { width: 1440, height: 1100 });

  try {
    const extensionId = await getExtensionId(context);
    const page = await context.newPage();
    const errors = collectPageErrors(page);
    const dialogs = [];
    page.on('dialog', async dialog => {
      dialogs.push(dialog.message());
      if (dialog.type() === 'confirm') await dialog.accept();
      else await dialog.dismiss();
    });

    await page.goto(`chrome-extension://${extensionId}/options-redesigned.html`, { waitUntil: 'networkidle' });

    const now = new Date().toISOString();
    const eightDaysAgo = new Date(Date.now() - (8 * 24 * 60 * 60 * 1000)).toISOString();
    const syncedIds = Array.from({ length: 293 }, (_, index) => String(index + 1));

    await page.evaluate(({ now, eightDaysAgo, syncedIds }) => new Promise(resolve => {
      chrome.storage.local.set({
        settings: {
          saveLocation: 'Obsidian-Clips',
          actualDownloadPath: 'Downloads/Obsidian-Clips',
          twitterBookmarkSync: {
            enabled: true,
            autoSyncInterval: 180,
            lastSyncTimestamp: now,
            syncInProgress: false,
            syncedTweetIds: syncedIds,
            totalBookmarksFound: 364,
            totalNewlySynced: 70,
            lastError: null
          }
        },
        clippingHistory: [
          { status: 'success', timestamp: now },
          { status: 'success', timestamp: eightDaysAgo },
          { status: 'failed', timestamp: now }
        ]
      }, resolve);
    }), { now, eightDaysAgo, syncedIds });

    await waitForText(page, '#total-clips', '3');
    await waitForText(page, '#clips-7d', '2');
    await waitForText(page, '#success-rate', '67%');
    await waitForText(page, '#failed-clips', '1');
    await waitForText(page, '#total-synced-count', '293');
    await waitForText(page, '#bookmarks-found', '364');
    await waitForText(page, '#newly-synced', '70');
    await waitForText(page, '#already-synced', '294');

    const updatedIds = Array.from({ length: 300 }, (_, index) => String(index + 1));
    await page.evaluate(({ now, updatedIds }) => new Promise(resolve => {
      chrome.storage.local.get(['settings', 'clippingHistory'], result => {
        const settings = result.settings || {};
        settings.twitterBookmarkSync = {
          ...settings.twitterBookmarkSync,
          syncedTweetIds: updatedIds,
          totalBookmarksFound: 400,
          totalNewlySynced: 5
        };
        chrome.storage.local.set({
          settings,
          clippingHistory: [
            ...(result.clippingHistory || []),
            { status: 'success', timestamp: now }
          ]
        }, resolve);
      });
    }), { now, updatedIds });

    await waitForText(page, '#total-synced-count', '300');
    await waitForText(page, '#bookmarks-found', '400');
    await waitForText(page, '#newly-synced', '5');
    await waitForText(page, '#already-synced', '395');
    await waitForText(page, '#total-clips', '4');
    await waitForText(page, '#clips-7d', '3');
    await waitForText(page, '#success-rate', '75%');

    await page.locator('#enable-twitter-sync').uncheck();
    await page.waitForFunction(() => new Promise(resolve => {
      chrome.storage.local.get(['settings'], result => {
        resolve(result.settings?.twitterBookmarkSync?.enabled === false);
      });
    }));

    await page.locator('#enable-twitter-sync').check();
    await page.waitForFunction(() => new Promise(resolve => {
      chrome.storage.local.get(['settings'], result => {
        resolve(result.settings?.twitterBookmarkSync?.enabled === true);
      });
    }));

    await page.locator('#sync-interval').selectOption('60');
    await page.waitForFunction(() => new Promise(resolve => {
      chrome.storage.local.get(['settings'], result => {
        resolve(result.settings?.twitterBookmarkSync?.autoSyncInterval === 60);
      });
    }));

    const interceptionInstalled = await page.evaluate(() => {
      const originalSendMessage = chrome.runtime.sendMessage.bind(chrome.runtime);
      window.__qocRuntimeMessages = [];
      try {
        chrome.runtime.sendMessage = (...args) => {
          const [message, callback] = args;
          window.__qocRuntimeMessages.push(message);
          if (message?.type === 'SHOW_DOWNLOAD_LOCATION') {
            callback?.({ success: true, fallback: true });
            return;
          }
          if (message?.type === 'SYNC_TWITTER_BOOKMARKS') {
            callback?.({ success: false, error: 'Synthetic sync failure' });
            return;
          }
          return originalSendMessage(...args);
        };
        return chrome.runtime.sendMessage !== originalSendMessage;
      } catch {
        return false;
      }
    });
    if (!interceptionInstalled) throw new Error('Could not instrument runtime messages for options actions');

    await page.locator('#show-download-location').click();
    await page.waitForFunction(() => window.__qocRuntimeMessages?.some(message => message?.type === 'SHOW_DOWNLOAD_LOCATION'));

    await page.locator('#sync-twitter-now').click();
    await page.waitForFunction(() => window.__qocRuntimeMessages?.some(message => message?.type === 'SYNC_TWITTER_BOOKMARKS'));
    await page.waitForFunction(() => !document.querySelector('#sync-twitter-now')?.disabled);
    if (!dialogs.some(message => message.includes('Synthetic sync failure'))) {
      throw new Error(`Sync failure was not shown to the user: ${dialogs.join(' | ') || 'no dialog'}`);
    }

    await page.locator('#reset-twitter-tracking').click();
    await page.waitForFunction(() => new Promise(resolve => {
      chrome.storage.local.get(['settings'], result => {
        resolve((result.settings?.twitterBookmarkSync?.syncedTweetIds || []).length === 0);
      });
    }));
    await waitForText(page, '#total-synced-count', '0');
    if (!dialogs.some(message => message.includes('reset X bookmark sync tracking'))) {
      throw new Error('Reset confirmation was not shown');
    }

    if (errors.length) throw new Error(`Options page errors: ${errors.join(' | ')}`);

    console.log(JSON.stringify({
      extensionId,
      automaticRefresh: true,
      actions: {
        toggle: true,
        interval: 60,
        reset: true,
        downloadLocationClick: true,
        syncFailureVisible: true
      },
      overview: { allClips: 4, last7Days: 3, successRate: '75%', failed: 1 },
      xSyncBeforeReset: { trackedBookmarks: 300, currentBookmarks: 400, newThisSync: 5, alreadyTracked: 395 }
    }, null, 2));
  } finally {
    await closeExtensionContext(context);
  }
})();
