// Perplexity Handler
// Triggers Perplexity's native "Copy as Markdown" or "Download" functionality
// since content scripts can't run on perplexity.ai due to CSP

console.log('Perplexity Handler loaded');

(async function handlePerplexity() {
  console.log('Perplexity: Starting extraction...');

  try {
    // Wait for page to fully load
    await waitForElement('[data-testid="share-button"]', 5000).catch(() => null);
    await sleep(1000);

    // Strategy 1: Try to find and click the share/export menu
    const shareButton = document.querySelector('[data-testid="share-button"]') ||
                        document.querySelector('button[aria-label*="Share"]') ||
                        document.querySelector('button[aria-label*="share"]') ||
                        document.querySelector('[data-testid="thread-share-button"]');

    if (shareButton) {
      console.log('Perplexity: Found share button, clicking...');
      shareButton.click();
      await sleep(500);

      // Look for "Copy as Markdown" or "Download" option in the menu
      const menuItems = document.querySelectorAll('[role="menuitem"], [role="option"], button');
      for (const item of menuItems) {
        const text = item.textContent?.toLowerCase() || '';
        if (text.includes('markdown') || text.includes('copy') || text.includes('download')) {
          console.log('Perplexity: Found markdown/download option:', text);
          item.click();
          await sleep(500);

          if (text.includes('download')) {
            sendStatusToBackground('download_triggered');
            return;
          }

          const clipboardText = await tryReadClipboard();
          if (clipboardText && clipboardText.length > 100) {
            console.log('Perplexity: Got content from clipboard');
            sendContentToBackground(clipboardText);
            return;
          }

          console.warn('Perplexity: Clipboard unavailable or empty, falling back to DOM extraction.');
          break;
        }
      }
    }

    // Strategy 2: Try to find the three-dot menu (more options)
    const moreButton = document.querySelector('[data-testid="more-button"]') ||
                       document.querySelector('button[aria-label*="More"]') ||
                       document.querySelector('button[aria-label*="more"]') ||
                       document.querySelector('[aria-haspopup="menu"]');

    if (moreButton) {
      console.log('Perplexity: Found more button, clicking...');
      moreButton.click();
      await sleep(500);

      // Look for export/download option
      const menuItems = document.querySelectorAll('[role="menuitem"], [role="option"], button');
      for (const item of menuItems) {
        const text = item.textContent?.toLowerCase() || '';
        if (text.includes('markdown') || text.includes('export') || text.includes('download')) {
          console.log('Perplexity: Found export option:', text);
          item.click();
          await sleep(1000);

          // Notify user that download was triggered
          sendStatusToBackground('download_triggered');
          return;
        }
      }
    }

    // Strategy 3: Direct DOM extraction as fallback
    console.log('Perplexity: Falling back to DOM extraction...');
    const content = extractPerplexityContent();

    if (content) {
      sendContentToBackground(content);
    } else {
      sendErrorToBackground('Could not extract content from Perplexity. Try using Perplexity\'s native "Copy as Markdown" feature.');
    }

  } catch (error) {
    console.error('Perplexity: Handler error:', error);
    sendErrorToBackground(error.message);
  }
})();

function extractPerplexityContent() {
  // Try to extract the conversation/answer content directly
  const title = document.title || 'Perplexity Search';
  const url = window.location.href;

  // Find the main content area
  const contentSelectors = [
    '[data-testid="thread-content"]',
    '[data-testid="answer"]',
    '.prose',
    'article',
    '[class*="answer"]',
    '[class*="response"]',
    'main'
  ];

  let mainContent = null;
  for (const selector of contentSelectors) {
    mainContent = document.querySelector(selector);
    if (mainContent && mainContent.textContent?.length > 100) {
      break;
    }
  }

  if (!mainContent) {
    console.warn('Perplexity: Could not find main content');
    return null;
  }

  // Extract question/query
  const queryEl = document.querySelector('[data-testid="query"]') ||
                  document.querySelector('h1') ||
                  document.querySelector('[class*="query"]');
  const query = queryEl?.textContent?.trim() || title;

  // Extract the answer text
  const answerText = mainContent.innerText || mainContent.textContent || '';

  // Extract sources/citations if available
  const sources = [];
  const sourceEls = document.querySelectorAll('[data-testid="source"], [class*="citation"], a[href*="http"]');
  sourceEls.forEach(el => {
    const href = el.getAttribute('href');
    const text = el.textContent?.trim();
    if (href && href.startsWith('http') && !href.includes('perplexity.ai')) {
      sources.push({ url: href, text: text || href });
    }
  });

  // Format as markdown
  const dateSaved = new Date().toISOString().split('T')[0];

  const lines = [
    '---',
    `title: "${query.replace(/"/g, '\\"')}"`,
    'source: perplexity',
    `url: "${url}"`,
    `date_saved: ${dateSaved}`,
    'type: ai-search',
    'tags:',
    '  - clipping/perplexity',
    '  - ai-research',
    '---',
    '',
    `# ${query}`,
    '',
    '## Answer',
    '',
    answerText,
    ''
  ];

  if (sources.length > 0) {
    lines.push('## Sources', '');
    sources.slice(0, 10).forEach((source, i) => {
      lines.push(`${i + 1}. [${source.text}](${source.url})`);
    });
    lines.push('');
  }

  lines.push('## Notes', '', '<!-- Add your notes here -->', '');

  return lines.join('\n');
}

function sendContentToBackground(content) {
  const title = document.title || 'Perplexity Search';
  const url = window.location.href;

  chrome.runtime.sendMessage({
    type: 'CONTENT_EXTRACTED',
    data: {
      title: title,
      url: url,
      content: content,
      timestamp: new Date().toISOString(),
      source: 'perplexity'
    }
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Perplexity: Error sending message:', chrome.runtime.lastError);
    } else {
      console.log('Perplexity: Content sent to background');
    }
  });
}

function sendStatusToBackground(status) {
  chrome.runtime.sendMessage({
    type: 'PERPLEXITY_STATUS',
    status: status
  });
}

function sendErrorToBackground(error) {
  chrome.runtime.sendMessage({
    type: 'CLIP_ERROR',
    error: error
  });
}

async function tryReadClipboard() {
  if (!navigator.clipboard?.readText) {
    return '';
  }

  try {
    return await navigator.clipboard.readText();
  } catch (e) {
    console.warn('Perplexity: Could not read clipboard:', e);
    return '';
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const el = document.querySelector(selector);
    if (el) {
      resolve(el);
      return;
    }

    const observer = new MutationObserver((mutations, obs) => {
      const el = document.querySelector(selector);
      if (el) {
        obs.disconnect();
        resolve(el);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element ${selector} not found`));
    }, timeout);
  });
}
