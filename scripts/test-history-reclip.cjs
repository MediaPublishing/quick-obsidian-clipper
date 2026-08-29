const {
  closeExtensionContext,
  collectPageErrors,
  getExtensionId,
  launchExtensionContext
} = require('./browser-test-helpers.cjs');
const { createServer } = require('node:http');

(async () => {
  const server = createServer((request, response) => {
    response.setHeader('content-type', 'text/html; charset=utf-8');
    response.end('<!doctype html><title>Re-clip target</title><main>Local test page</main>');
  });
  let context;

  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const normalUrl = `http://127.0.0.1:${server.address().port}/reclip-target`;
    context = await launchExtensionContext('qoc-history-reclip.', { width: 1200, height: 900 });
    const extensionId = await getExtensionId(context);
    const page = await context.newPage();
    const errors = collectPageErrors(page);
    let dialogMessage = '';
    page.on('dialog', async dialog => {
      dialogMessage = dialog.message();
      await dialog.dismiss();
    });

    await page.goto(`chrome-extension://${extensionId}/history.html`, { waitUntil: 'networkidle' });
    await page.evaluate(({ normalUrl }) => new Promise(resolve => {
      chrome.storage.local.set({
        clippingHistory: [
          {
            title: 'Internal browser page',
            url: 'chrome://extensions/',
            timestamp: new Date().toISOString(),
            status: 'success'
          },
          {
            title: 'Imported unsafe history',
            url: 'data:text/html,unsafe',
            timestamp: '2026-08-29" data-injected="yes',
            status: 'success" data-injected="yes'
          },
          {
            title: 'Normal web page',
            url: normalUrl,
            timestamp: new Date(Date.now() - 1000).toISOString(),
            status: 'success'
          }
        ]
      }, resolve);
    }), { normalUrl });
    await page.reload({ waitUntil: 'networkidle' });

    const unexpectedPagePromise = context.waitForEvent('page', { timeout: 1000 }).catch(() => null);
    await page.locator('.reclip-btn').first().click();
    const unexpectedPage = await unexpectedPagePromise;

    if (unexpectedPage) {
      await unexpectedPage.close();
      throw new Error('Re-clip opened an internal tab');
    }
    if (!dialogMessage.includes('Browser-internal pages cannot be clipped')) {
      throw new Error(`Unexpected re-clip warning: ${dialogMessage || 'none'}`);
    }

    if (await page.locator('[data-injected="yes"]').count()) {
      throw new Error('Imported history escaped into DOM attributes');
    }
    const unsafeRow = page.locator('.clip-item').filter({ hasText: 'Imported unsafe history' });
    if (await unsafeRow.locator('.clip-url a').count()) {
      throw new Error('Unsafe imported history URL was rendered as a link');
    }
    const unsafePagePromise = context.waitForEvent('page', { timeout: 1000 }).catch(() => null);
    await unsafeRow.locator('.open-url-btn').click();
    const unsafePage = await unsafePagePromise;
    if (unsafePage) {
      await unsafePage.close();
      throw new Error('Open URL navigated to an unsafe imported URL');
    }

    const openedPagePromise = context.waitForEvent('page');
    await page.locator('.reclip-btn').nth(2).click();
    const openedPage = await openedPagePromise;
    await openedPage.waitForLoadState('domcontentloaded').catch(() => {});
    if (openedPage.url() !== normalUrl) {
      throw new Error(`Normal re-clip opened unexpected URL: ${openedPage.url()}`);
    }
    await openedPage.close();

    if (errors.length) throw new Error(`History page errors: ${errors.join(' | ')}`);

    console.log(JSON.stringify({
      extensionId,
      blockedUrl: 'chrome://extensions/',
      internalTabOpened: false,
      importedMarkupSafe: true,
      unsafeOpenBlocked: true,
      normalHttpUrlOpened: true,
      warning: dialogMessage
    }, null, 2));
  } finally {
    await closeExtensionContext(context);
    if (server.listening) await new Promise(resolve => server.close(resolve));
  }
})();
