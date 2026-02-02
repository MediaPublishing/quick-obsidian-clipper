// Perplexity Content Script (Auto-injected via manifest)
// Listens for activation from background script, then extracts content

console.log('🔮 Perplexity content script loaded');

// Prevent multiple injections
if (window.__perplexityClipperLoaded) {
  console.log('🔮 Perplexity content script already loaded, skipping');
} else {
  window.__perplexityClipperLoaded = true;

  // Listen for activation message from background
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'PERPLEXITY_EXTRACT') {
      console.log('🔮 Perplexity: Received extract request');
      handlePerplexityExtraction()
        .then(result => sendResponse({ success: true, ...result }))
        .catch(error => {
          console.error('🔮 Perplexity extraction error:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Keep channel open for async response
    }
  });

  // Notify background that we're ready
  chrome.runtime.sendMessage({
    type: 'PERPLEXITY_CONTENT_READY',
    url: window.location.href
  }).catch(() => {
    // Ignore - background may not be listening yet
  });
}

async function handlePerplexityExtraction() {
  console.log('🔮 Perplexity: Starting extraction...');

  try {
    // Strategy 1: Try to find and click the share/export menu
    const shareButton = document.querySelector('[data-testid="share-button"]') ||
                        document.querySelector('button[aria-label*="Share"]') ||
                        document.querySelector('button[aria-label*="share"]') ||
                        document.querySelector('[data-testid="thread-share-button"]') ||
                        document.querySelector('button[aria-label*="Copy"]') ||
                        document.querySelector('[aria-label*="Export"]') ||
                        [...document.querySelectorAll('button')].find(b =>
                          b.querySelector('svg path[d*="M18"]') ||
                          b.textContent?.toLowerCase().includes('share')
                        );

    if (shareButton) {
      console.log('🔮 Perplexity: Found share button, clicking...');
      shareButton.click();
      await sleep(500);

      // Look for "Copy as Markdown" option
      const menuItems = document.querySelectorAll('[role="menuitem"], [role="option"], button');
      for (const item of menuItems) {
        const text = item.textContent?.toLowerCase() || '';
        if (text.includes('markdown') || text.includes('copy')) {
          console.log('🔮 Perplexity: Found markdown/copy option:', text);
          item.click();
          await sleep(500);

          const clipboardText = await tryReadClipboard();
          if (clipboardText && clipboardText.length > 100) {
            console.log('🔮 Perplexity: Got content from clipboard');
            sendContentToBackground(clipboardText);
            return { extracted: true, method: 'clipboard' };
          }
          break;
        }
      }
    }

    // Strategy 2: Try three-dot/more menu
    const moreButton = document.querySelector('[data-testid="more-button"]') ||
                       document.querySelector('button[aria-label*="More"]') ||
                       document.querySelector('button[aria-label*="more"]') ||
                       document.querySelector('[aria-haspopup="menu"]') ||
                       document.querySelector('[aria-label*="Options"]');

    if (moreButton) {
      console.log('🔮 Perplexity: Found more button, clicking...');
      moreButton.click();
      await sleep(500);

      const menuItems = document.querySelectorAll('[role="menuitem"], [role="option"], button');
      for (const item of menuItems) {
        const text = item.textContent?.toLowerCase() || '';
        if (text.includes('markdown') || text.includes('export') || text.includes('download')) {
          console.log('🔮 Perplexity: Found export option:', text);
          item.click();
          await sleep(1000);

          if (text.includes('download')) {
            chrome.runtime.sendMessage({ type: 'PERPLEXITY_STATUS', status: 'download_triggered' });
            return { extracted: true, method: 'download' };
          }
        }
      }
    }

    // Strategy 3: Direct DOM extraction as fallback
    console.log('🔮 Perplexity: Falling back to DOM extraction...');
    const content = extractPerplexityContent();

    if (content) {
      sendContentToBackground(content);
      return { extracted: true, method: 'dom' };
    } else {
      throw new Error('Could not extract content from Perplexity');
    }

  } catch (error) {
    console.error('🔮 Perplexity: Handler error:', error);
    throw error;
  }
}

function extractPerplexityContent() {
  const title = document.title || 'Perplexity Search';
  const url = window.location.href;

  // Find the main content area
  const contentSelectors = [
    '[data-testid="thread-content"]',
    '[data-testid="answer"]',
    '[data-testid="response"]',
    '.prose',
    'article',
    '[class*="answer"]',
    '[class*="response"]',
    '[class*="markdown"]',
    '[class*="AnswerContainer"]',
    '[class*="ThreadContent"]',
    '[role="main"] > div > div',
    'main [class*="prose"]',
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
    console.warn('🔮 Perplexity: Could not find main content');
    return null;
  }

  // Extract question/query
  const queryEl = document.querySelector('[data-testid="query"]') ||
                  document.querySelector('h1') ||
                  document.querySelector('[class*="query"]');
  const query = queryEl?.textContent?.trim() || title;

  // Extract the answer text
  const answerText = mainContent.innerText || mainContent.textContent || '';

  // Extract sources/citations
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
      console.error('🔮 Perplexity: Error sending message:', chrome.runtime.lastError);
    } else {
      console.log('🔮 Perplexity: Content sent to background');
    }
  });
}

async function tryReadClipboard() {
  if (!navigator.clipboard?.readText) {
    return '';
  }

  try {
    return await navigator.clipboard.readText();
  } catch (e) {
    console.warn('🔮 Perplexity: Could not read clipboard:', e);
    return '';
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
