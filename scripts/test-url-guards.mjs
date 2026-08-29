import assert from 'node:assert/strict';
import { getClippablePageError, isClippablePage } from '../src/url-guards.js';

for (const url of [
  'https://example.com/article',
  'http://localhost:3000/',
]) {
  assert.equal(isClippablePage(url), true, `${url} should be clippable`);
  assert.equal(getClippablePageError(url), null);
}

for (const url of [
  undefined,
  '',
  'chrome://extensions/',
  'chrome-extension://abcdefghijklmnop/options.html',
  'about:blank',
  'file:///Users/example/article.html',
  'not a valid URL',
]) {
  assert.equal(isClippablePage(url), false, `${url} should not be clippable`);
  assert.match(getClippablePageError(url), /cannot be clipped|No active page/);
}

console.log('URL guard tests passed');
