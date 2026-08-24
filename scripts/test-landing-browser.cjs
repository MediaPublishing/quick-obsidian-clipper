const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const repo = '/Users/MediaPublishing/Projects/quick-obsidian-clipper';
const landingRoot = path.join(repo, 'landing');
const { chromium } = require('/Users/MediaPublishing/Projects/tools-ainauten/node_modules/playwright');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.txt': 'text/plain; charset=utf-8'
};

(async () => {
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost');
      let pathname = decodeURIComponent(url.pathname);
      if (pathname === '/') pathname = '/index.html';
      const file = await readFile(path.join(landingRoot, pathname));
      response.setHeader('content-type', mimeTypes[path.extname(pathname)] || 'application/octet-stream');
      response.end(file);
    } catch {
      response.statusCode = 404;
      response.end('Not found');
    }
  });

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const target = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Users/MediaPublishing/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', error => errors.push(error.message));

  await page.goto(target, { waitUntil: 'networkidle' });
  const english = {
    title: await page.title(),
    lang: await page.getAttribute('html', 'lang'),
    h1: (await page.locator('h1').textContent())?.trim(),
    screenshotsTitle: (await page.locator('#screenshots h2').textContent())?.trim(),
    imageSize: await page.locator('.screenshot-image').evaluate(image => ({ width: image.naturalWidth, height: image.naturalHeight }))
  };
  await page.screenshot({ path: '/tmp/qoc-landing-final-en.png', fullPage: true });

  await page.click('[data-lang-choice="de"]');
  await page.waitForTimeout(250);
  const german = {
    title: await page.title(),
    lang: await page.getAttribute('html', 'lang'),
    h1: (await page.locator('h1').textContent())?.trim(),
    screenshotsTitle: (await page.locator('#screenshots h2').textContent())?.trim()
  };
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(250);
  await page.screenshot({ path: '/tmp/qoc-landing-final-de-mobile.png', fullPage: true });

  if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
  console.log(JSON.stringify({ english, german }, null, 2));

  await browser.close();
  server.close();
})();
