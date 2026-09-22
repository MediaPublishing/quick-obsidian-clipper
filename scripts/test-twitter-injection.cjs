const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(new URL('../background-simple.js', `file://${__filename}`), 'utf8');
const injectionStart = source.indexOf('async function tryInjectScriptFiles(');
const injectionEnd = source.indexOf('// Track pending extractions', injectionStart);
const loadStart = source.indexOf('function waitForTabLoad(');
const loadEnd = source.indexOf('// Helper: Sleep utility', loadStart);
assert.ok(injectionStart >= 0 && injectionEnd > injectionStart && loadStart >= 0 && loadEnd > loadStart);

async function runScenario({ injectionErrors, tabExists = true }) {
  const injected = [];
  const chrome = {
    scripting: {
      async executeScript({ files }) {
        injected.push(files[0]);
        const error = injectionErrors.shift();
        if (error) throw new Error(error);
        return [];
      }
    },
    tabs: {
      async get() {
        if (!tabExists) throw new Error('No tab with id: 42.');
        return { id: 42, status: 'complete', url: 'https://x.com/i/web/status/123' };
      },
      onUpdated: { addListener() {}, removeListener() {} }
    }
  };
  const context = vm.createContext({ chrome, console: { log() {}, warn() {}, error() {} }, getClippablePageError: () => null, setTimeout, clearTimeout });
  vm.runInContext(`${source.slice(injectionStart, injectionEnd)}\n${source.slice(loadStart, loadEnd)}\nthis.inject = typeof injectScriptFilesWithNavigationRetry === 'function' ? injectScriptFilesWithNavigationRetry : injectScriptFilesWithFallback;`, context);
  let result;
  let error;
  try {
    result = await context.inject(42, ['src/handlers/twitter-handler.js'], 'Twitter handler');
  } catch (caught) {
    error = caught;
  }
  return { injected, result, error };
}

(async () => {
  const recovered = await runScenario({ injectionErrors: ['Frame with ID 0 was removed.'] });
  assert.equal(recovered.result, true);
  assert.deepEqual(recovered.injected, ['src/handlers/twitter-handler.js', 'src/handlers/twitter-handler.js']);

  const closed = await runScenario({ injectionErrors: ['Frame with ID 0 was removed.'], tabExists: false });
  assert.match(closed.error?.message || '', /tab.*closed|No tab with id/i);
  assert.deepEqual(closed.injected, ['src/handlers/twitter-handler.js']);

  const missing = await runScenario({ injectionErrors: ["Could not load file: 'src/handlers/twitter-handler.js'."] });
  assert.equal(missing.result, false);
  assert.deepEqual(missing.injected, ['src/handlers/twitter-handler.js']);

  const changedAgain = await runScenario({
    injectionErrors: ['Frame with ID 0 was removed.', 'Frame with ID 0 was removed.']
  });
  assert.match(changedAgain.error?.message || '', /page changed or closed/i);
  assert.deepEqual(changedAgain.injected, ['src/handlers/twitter-handler.js', 'src/handlers/twitter-handler.js']);

  console.log('twitter-injection: navigation retry, closed-tab and missing-file tests passed');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
