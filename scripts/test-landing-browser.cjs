const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const { chromium, repo } = require('./browser-test-helpers.cjs');
const landingRoot = path.join(repo, 'landing');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.txt': 'text/plain; charset=utf-8'
};

async function readLandingState(page) {
  return {
    title: await page.title(),
    lang: await page.getAttribute('html', 'lang'),
    h1: (await page.locator('h1').textContent())?.trim(),
    screenshotsTitle: (await page.locator('#screenshots h2').textContent())?.trim(),
    firstFeature: (await page.locator('[data-static="featureCards.0.title"]').textContent())?.trim(),
    storeVersion: (await page.locator('[data-static="installCards.0.status"]').textContent())?.trim(),
    installVersion: (await page.locator('[data-static="installCards.1.status"]').textContent())?.trim()
  };
}

(async () => {
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost');
      let pathname = decodeURIComponent(url.pathname);
      if (pathname === '/') pathname = '/index.html';
      const candidate = path.resolve(landingRoot, pathname.replace(/^\/+/, ''));
      if (!candidate.startsWith(`${landingRoot}${path.sep}`)) throw new Error('Path outside landing root');
      const file = await readFile(candidate);
      response.setHeader('content-type', mimeTypes[path.extname(pathname)] || 'application/octet-stream');
      response.end(file);
    } catch {
      response.statusCode = 404;
      response.end('Not found');
    }
  });

  let browser;
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const target = `http://127.0.0.1:${server.address().port}/`;
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('console', message => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', error => errors.push(error.message));

    const traversalResponse = await page.request.get(`${target}..%2FREADME.md`);
    if (traversalResponse.status() !== 404) {
      throw new Error(`Landing server exposed a path outside landing/: ${traversalResponse.status()}`);
    }

    await page.goto(target, { waitUntil: 'networkidle' });
    const english = await readLandingState(page);
    english.imageSize = await page.locator('.screenshot-image').evaluate(image => ({
      width: image.naturalWidth,
      height: image.naturalHeight
    }));
    await page.screenshot({ path: '/tmp/qoc-landing-final-en.png', fullPage: true });

    await page.click('[data-lang-choice="de"]');
    await page.waitForTimeout(250);
    const german = await readLandingState(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(250);
    await page.screenshot({ path: '/tmp/qoc-landing-final-de-mobile.png', fullPage: true });

    if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
    if (english.firstFeature !== 'One click and shortcuts') throw new Error(`Unexpected English feature title: ${english.firstFeature}`);
    if (german.firstFeature !== 'Ein Klick und Shortcuts') throw new Error(`German static content did not update: ${german.firstFeature}`);
    if (english.storeVersion !== 'Version 2.4.16' || german.storeVersion !== 'Version 2.4.16') {
      throw new Error(`Store version mismatch: en=${english.storeVersion}, de=${german.storeVersion}`);
    }
    if (english.installVersion !== 'Version 2.4.17' || german.installVersion !== 'Version 2.4.17') {
      throw new Error(`Landing version mismatch: en=${english.installVersion}, de=${german.installVersion}`);
    }
    console.log(JSON.stringify({ english, german }, null, 2));
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})();
