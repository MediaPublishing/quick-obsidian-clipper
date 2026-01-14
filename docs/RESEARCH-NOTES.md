# Research Notes: Archive & Paywall Bypass

## Free-Medium Extension Analysis

**GitHub:** https://github.com/fferrin/free-medium

### How It Works
- **NOT a direct bypass** - redirects to Freedium service
- Adds a "Read for free" button on Medium articles
- Button redirects: `medium.com/article` → `freedium.cfd/medium.com/article`
- Uses content script to inject button

### Implementation for Our Extension
Instead of redirecting, we should:
1. Use Freedium's API/service to fetch full content
2. Extract content from Freedium's rendered page
3. Clip the full content directly to Obsidian

**Better approach:**
```javascript
async function bypassMediumPaywall(mediumUrl) {
  // Option 1: Use Freedium service
  const freediumUrl = `https://freedium.cfd/${mediumUrl}`;
  const response = await fetch(freediumUrl);
  const html = await response.text();
  // Extract content from Freedium's clean HTML

  // Option 2: Extract from Medium's JSON-LD (if available)
  // Medium includes full article in JSON-LD for SEO
  const jsonLd = document.querySelector('script[type="application/ld+json"]');
  if (jsonLd) {
    const data = JSON.parse(jsonLd.textContent);
    return data.articleBody;
  }
}
```

---

## Archive.ph Integration

### How archive.ph Works

**Manual process:**
1. Go to https://archive.ph/
2. Paste URL in input field
3. Click "Submit"
4. Wait for archive to complete (15-60 seconds)
5. Get archived URL

**Automation approach:**

```javascript
async function archiveUrl(originalUrl) {
  // Submit to archive.ph
  const submitUrl = 'https://archive.ph/submit/';

  const formData = new FormData();
  formData.append('url', originalUrl);

  const response = await fetch(submitUrl, {
    method: 'POST',
    body: formData
  });

  // archive.ph redirects to archive URL
  const archiveUrl = response.url;

  // Poll until ready
  await waitForArchive(archiveUrl);

  return archiveUrl;
}

async function waitForArchive(archiveUrl, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(archiveUrl);
    const html = await response.text();

    // Check if archive is ready (not showing "processing" message)
    if (!html.includes('Saving page') && !html.includes('Please wait')) {
      return archiveUrl;
    }

    // Wait 2 seconds before next attempt
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  throw new Error('Archive timeout - page not ready after 60 seconds');
}
```

---

## Alternative: ArchiveClick Extension Analysis

**Chrome Web Store:** https://chromewebstore.google.com/detail/archiveclick/efmabpggcbblemppjjbpphknpegobeam

### Likely Implementation
Based on typical archive extensions:
- Adds button/icon in toolbar
- One-click submission to archive.ph
- Opens archived page in new tab
- May cache previous archives

### For Our Use
We should:
1. Auto-detect paywalled sites
2. Silently archive in background
3. Extract from archived page
4. No new tabs/windows needed

---

## Recommended Implementation Strategy

### Archive Mode (Paywalled News Sites)

```javascript
class PaywallHandler {
  constructor() {
    this.paywallSites = [
      'nytimes.com',
      'washingtonpost.com',
      'ft.com',
      'wsj.com',
      'forbes.com'
    ];
  }

  async handlePaywallSite(url, tabId) {
    try {
      // Step 1: Archive the page
      const archivedUrl = await this.archiveUrl(url);

      // Step 2: Open archived page in background
      const tempTab = await chrome.tabs.create({
        url: archivedUrl,
        active: false
      });

      // Step 3: Extract content once loaded
      await this.waitForLoad(tempTab.id);
      const content = await this.extractContent(tempTab.id);

      // Step 4: Close temp tab
      await chrome.tabs.remove(tempTab.id);

      // Step 5: Save to Obsidian
      await this.saveToObsidian(content, url, archivedUrl);

      return { success: true, archiveUrl: archivedUrl };
    } catch (error) {
      console.error('Archive failed:', error);
      return { success: false, error: error.message };
    }
  }
}
```

### Medium Bypass

```javascript
class MediumHandler {
  async handleMediumArticle(url, tabId) {
    try {
      // Use Freedium service
      const freediumUrl = `https://freedium.cfd/${url}`;

      // Fetch full article from Freedium
      const response = await fetch(freediumUrl);
      const html = await response.text();

      // Parse and extract clean content
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const article = doc.querySelector('article') || doc.querySelector('main');
      const content = this.convertToMarkdown(article);

      // Save to Obsidian with metadata
      await this.saveToObsidian({
        title: doc.querySelector('h1')?.textContent,
        content: content,
        url: url,
        source: 'Medium (via Freedium)'
      });

      return { success: true };
    } catch (error) {
      // Fallback: try direct extraction
      return await this.directExtraction(tabId);
    }
  }
}
```

---

## User Experience Flow

### Standard Clipping (No Paywall)
1. Click extension icon
2. Extract content immediately
3. Save to Obsidian
4. Show success notification

### Archive Mode Enabled (Paywalled Site)
1. Click extension icon
2. Show "Archiving article..." notification
3. Submit to archive.ph
4. Wait for archive (with progress indicator)
5. Extract from archived page
6. Save to Obsidian with archive URL in frontmatter
7. Show "Saved (archived)" notification

### Medium Article
1. Click extension icon
2. Show "Bypassing paywall..." notification
3. Fetch via Freedium
4. Extract full content
5. Save to Obsidian
6. Show "Saved (full article)" notification

---

## Settings UI Mockup

```
┌──────────────────────────────────────────────────┐
│ Advanced Clipping Settings                       │
├──────────────────────────────────────────────────┤
│                                                   │
│ Archive Mode                                      │
│ ☑ Enable automatic archiving for paywalled sites │
│                                                   │
│ Paywalled Sites:                                  │
│ ☑ New York Times (nytimes.com)                   │
│ ☑ Washington Post (washingtonpost.com)           │
│ ☑ Financial Times (ft.com)                       │
│ ☑ Wall Street Journal (wsj.com)                  │
│ ☑ Forbes (forbes.com)                            │
│ ☑ The Economist (economist.com)                  │
│ ☑ Bloomberg (bloomberg.com)                      │
│ ☑ The Atlantic (theatlantic.com)                 │
│                                                   │
│ Custom sites (comma-separated):                   │
│ [________________________________]                │
│                                                   │
│ Archive timeout: [30] seconds                     │
│                                                   │
├──────────────────────────────────────────────────┤
│                                                   │
│ Medium Articles                                   │
│ ☑ Enable paywall bypass for Medium articles      │
│                                                   │
│ Method:                                           │
│ ● Use Freedium service (recommended)              │
│ ○ Try direct extraction first                     │
│                                                   │
├──────────────────────────────────────────────────┤
│                                                   │
│ Context Menu Options                              │
│ ☑ Show "Clip link to Obsidian" on right-click    │
│ ☑ Show "Clip all links on page" on right-click   │
│                                                   │
│ Link filtering:                                   │
│ ☑ Exclude same-domain links                      │
│ ☑ Exclude anchor links (#section)                │
│ ☑ Exclude javascript: links                      │
│                                                   │
└──────────────────────────────────────────────────┘
```

---

## Next Steps

1. **First: Fix the extension** (resolve "No SW" error)
2. **Research Phase:**
   - Test archive.ph API manually
   - Test Freedium service
   - Examine archiveclick extension code if possible
3. **Prototype Phase:**
   - Create minimal archive-handler.js
   - Test with one paywalled site (NYT)
   - Verify it works before full implementation
4. **Full Implementation:**
   - Add settings UI
   - Implement all features
   - Comprehensive testing

---

**Updated:** 2026-01-05
