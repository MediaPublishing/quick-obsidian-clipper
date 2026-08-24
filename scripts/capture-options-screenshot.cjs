const { chromium } = require('/Users/MediaPublishing/Projects/tools-ainauten/node_modules/playwright');
const { mkdtemp } = require('node:fs/promises');
const path = require('node:path');

(async () => {
  const profile = await mkdtemp(path.join(require('node:os').tmpdir(), 'qoc-options-shot.'));
  const repo = '/Users/MediaPublishing/Projects/quick-obsidian-clipper';
  const context = await chromium.launchPersistentContext(profile, {
    headless: false,
    viewport: { width: 1440, height: 1100 },
    args: [
      `--disable-extensions-except=${repo}`,
      `--load-extension=${repo}`
    ]
  });

  let worker;
  for (let i = 0; i < 60 && !worker; i++) {
    worker = context.serviceWorkers().find(item => item.url().includes('background-simple.js'));
    if (!worker) await new Promise(resolve => setTimeout(resolve, 250));
  }
  if (!worker) throw new Error('Extension background worker not found');

  const extensionId = new URL(worker.url()).hostname;
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/options-redesigned.html`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  await page.screenshot({
    path: `${repo}/landing/assets/options-dashboard.png`,
    fullPage: true,
    animations: 'disabled'
  });

  console.log(JSON.stringify({ extensionId, screenshot: `${repo}/landing/assets/options-dashboard.png` }, null, 2));
  await context.close();
})();
