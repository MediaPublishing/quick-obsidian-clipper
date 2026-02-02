// Perplexity Popup Handler
// Manual clipboard-based clipping for Perplexity (bypasses content script restrictions)

document.addEventListener('DOMContentLoaded', async () => {
  const clipFromClipboard = document.getElementById('clipFromClipboard');
  const clipFromTextarea = document.getElementById('clipFromTextarea');
  const contentArea = document.getElementById('content');
  const statusEl = document.getElementById('status');
  const pageUrlEl = document.getElementById('pageUrl');

  // Get page URL and title from query parameters (passed from background script)
  const urlParams = new URLSearchParams(window.location.search);
  const pageUrl = urlParams.get('url') || '';
  const pageTitle = urlParams.get('title') || 'Perplexity Search';

  // Display the URL
  if (pageUrlEl) {
    pageUrlEl.textContent = pageUrl || 'Unknown';
  }

  function showStatus(message, isError = false) {
    statusEl.textContent = message;
    statusEl.className = 'status ' + (isError ? 'error' : 'success');
  }

  async function clipContent(content) {
    if (!content || content.trim().length < 50) {
      showStatus('Content too short. Please copy the full Perplexity response.', true);
      return;
    }

    // Format as markdown if not already
    let markdown = content.trim();

    // Check if it's already markdown (has frontmatter)
    if (!markdown.startsWith('---')) {
      // Extract title from content or use page title
      let title = pageTitle.replace(' - Perplexity', '').trim() || 'Perplexity Search';

      // Try to extract query from first line if it looks like a question
      const firstLine = markdown.split('\n')[0].trim();
      if (firstLine.length < 200 && (firstLine.endsWith('?') || firstLine.length < 100)) {
        title = firstLine;
      }

      const dateSaved = new Date().toISOString().split('T')[0];

      markdown = `---
title: "${title.replace(/"/g, '\\"')}"
source: perplexity
url: "${pageUrl}"
date_saved: ${dateSaved}
type: ai-search
tags:
  - clipping/perplexity
  - ai-research
---

# ${title}

${markdown}

---

*Clipped from Perplexity on ${dateSaved}*
`;
    }

    // Send to background for saving
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'CONTENT_EXTRACTED',
        data: {
          title: pageTitle,
          url: pageUrl,
          content: markdown,
          timestamp: new Date().toISOString(),
          source: 'perplexity-popup'
        }
      });

      if (response?.success) {
        showStatus('Clipped successfully!');
        setTimeout(() => window.close(), 1500);
      } else {
        showStatus('Failed to save: ' + (response?.error || 'Unknown error'), true);
      }
    } catch (error) {
      showStatus('Error: ' + error.message, true);
    }
  }

  // Clip from clipboard button
  clipFromClipboard.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        await clipContent(text);
      } else {
        showStatus('Clipboard is empty. Copy content from Perplexity first.', true);
      }
    } catch (error) {
      showStatus('Cannot access clipboard. Paste content manually.', true);
      contentArea.focus();
    }
  });

  // Clip from textarea button
  clipFromTextarea.addEventListener('click', async () => {
    const content = contentArea.value;
    if (content) {
      await clipContent(content);
    } else {
      showStatus('Please paste content first.', true);
    }
  });

  // Auto-try clipboard on popup open
  try {
    const text = await navigator.clipboard.readText();
    if (text && text.length > 100) {
      contentArea.value = text;
      contentArea.placeholder = 'Content loaded from clipboard. Click "Clip Pasted Content" to save.';
    }
  } catch (e) {
    // Clipboard not accessible, user will paste manually
  }

  // Allow Ctrl+Enter to clip
  contentArea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      clipFromTextarea.click();
    }
  });
});
