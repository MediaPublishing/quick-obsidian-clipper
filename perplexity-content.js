// Perplexity Content Script (Auto-injected via manifest)
// Listens for activation from background script, then extracts content

console.log('🔮 Perplexity content script loaded on:', window.location.href);

// Prevent multiple injections
if (window.__perplexityClipperLoaded) {
  console.log('🔮 Perplexity content script already loaded, skipping');
} else {
  window.__perplexityClipperLoaded = true;

  // Listen for activation message from background
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('🔮 Perplexity: Received message:', message.type);
    if (message.type === 'PERPLEXITY_EXTRACT') {
      console.log('🔮 Perplexity: Processing extract request');
      handlePerplexityExtraction()
        .then(result => {
          console.log('🔮 Perplexity: Extraction complete:', result);
          sendResponse({ success: true, ...result });
        })
        .catch(error => {
          console.error('🔮 Perplexity extraction error:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Keep channel open for async response
    }
  });

  // Notify background that we're ready
  try {
    chrome.runtime.sendMessage({
      type: 'PERPLEXITY_CONTENT_READY',
      url: window.location.href
    });
    console.log('🔮 Perplexity: Notified background we are ready');
  } catch (e) {
    // Ignore - background may not be listening yet
  }
}

async function handlePerplexityExtraction() {
  console.log('🔮 Perplexity: Starting extraction...');

  // Go straight to DOM extraction - it's the most reliable method
  console.log('🔮 Perplexity: Using DOM extraction...');
  const content = extractPerplexityContent();

  if (content) {
    sendContentToBackground(content);
    return { extracted: true, method: 'dom' };
  } else {
    throw new Error('Could not extract content from Perplexity page');
  }
}

function extractPerplexityContent() {
  const title = document.title || 'Perplexity Search';
  const url = window.location.href;

  console.log('🔮 Perplexity: Extracting from page:', title);

  // Find the main content area - try multiple selectors
  const contentSelectors = [
    // Modern Perplexity selectors
    '[class*="AnswerContent"]',
    '[class*="prose"]',
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
    '[role="main"]',
    'main'
  ];

  let mainContent = null;
  for (const selector of contentSelectors) {
    const elements = document.querySelectorAll(selector);
    for (const el of elements) {
      if (el && el.textContent?.length > 200) {
        mainContent = el;
        console.log('🔮 Perplexity: Found content with selector:', selector);
        break;
      }
    }
    if (mainContent) break;
  }

  if (!mainContent) {
    // Fallback: get body content
    console.warn('🔮 Perplexity: Could not find main content, using body');
    mainContent = document.body;
  }

  // Try to extract the query/question
  let query = '';
  const querySelectors = [
    '[data-testid="query"]',
    'h1',
    '[class*="Query"]',
    '[class*="question"]',
    'input[type="text"]'
  ];

  for (const selector of querySelectors) {
    const el = document.querySelector(selector);
    if (el) {
      const text = el.value || el.textContent?.trim();
      if (text && text.length > 5 && text.length < 500) {
        query = text;
        break;
      }
    }
  }

  if (!query) {
    // Extract from title
    query = title.replace(' - Perplexity', '').replace('Perplexity', '').trim() || 'Perplexity Search';
  }

  // Extract answer text - try to get clean text
  let answerText = '';

  // Try to find answer blocks specifically
  const answerBlocks = mainContent.querySelectorAll('[class*="prose"], [class*="markdown"], p, li');
  if (answerBlocks.length > 0) {
    const textParts = [];
    answerBlocks.forEach(block => {
      const text = block.innerText?.trim();
      if (text && text.length > 20) {
        textParts.push(text);
      }
    });
    answerText = textParts.join('\n\n');
  }

  if (!answerText || answerText.length < 100) {
    answerText = mainContent.innerText || mainContent.textContent || '';
  }

  // Clean up the text
  answerText = answerText
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\s+|\s+$/g, '')
    .substring(0, 50000); // Limit size

  // Extract sources/citations
  const sources = [];
  const sourceEls = document.querySelectorAll('a[href^="http"]');
  const seenUrls = new Set();

  sourceEls.forEach(el => {
    const href = el.getAttribute('href');
    const text = el.textContent?.trim();
    if (href &&
        !href.includes('perplexity.ai') &&
        !href.includes('google.com') &&
        !seenUrls.has(href) &&
        text && text.length > 2) {
      seenUrls.add(href);
      sources.push({ url: href, text: text.substring(0, 100) });
    }
  });

  // Format as markdown
  const dateSaved = new Date().toISOString().split('T')[0];

  const lines = [
    '---',
    `title: "${query.replace(/"/g, '\\"').substring(0, 200)}"`,
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
    sources.slice(0, 15).forEach((source, i) => {
      lines.push(`${i + 1}. [${source.text}](${source.url})`);
    });
    lines.push('');
  }

  lines.push('---', '', `*Clipped from Perplexity on ${dateSaved}*`);

  console.log('🔮 Perplexity: Extracted content length:', answerText.length);
  return lines.join('\n');
}

function sendContentToBackground(content) {
  const title = document.title || 'Perplexity Search';
  const url = window.location.href;

  console.log('🔮 Perplexity: Sending content to background...');

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
      console.log('🔮 Perplexity: Content sent successfully');
    }
  });
}
