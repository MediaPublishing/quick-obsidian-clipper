import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../src/handlers/twitter-bookmark-scraper.js', import.meta.url), 'utf8')
  .replace(/\/\/ Auto-start scraping when script is injected[\s\S]*$/, '');

const fallbackArticles = [{ id: 'fallback-article' }];
const queries = [];
const context = {
  console: { log() {}, warn() {}, error() {} },
  document: {
    querySelectorAll(selector) {
      queries.push(selector);
      return selector === 'article[role="article"]' ? fallbackArticles : [];
    }
  },
  chrome: { runtime: { sendMessage() {} } },
  Date,
  Set,
  Promise
};

vm.runInNewContext(`${source}\nthis.TwitterBookmarkScraper = TwitterBookmarkScraper;`, context);
const scraper = new context.TwitterBookmarkScraper();

assert.deepEqual(scraper.findTweetArticles(), fallbackArticles);
assert.deepEqual(queries, [
  'article[data-testid="tweet"]',
  'article[role="article"]'
]);

console.log('twitter-bookmark-scraper: fallback selector test passed');
