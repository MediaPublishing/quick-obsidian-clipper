# Archive Mode & Advanced Clipping Features

**Status:** Planned - To be implemented after fixing "No SW" error

## Overview

Add three major features to the Quick Obsidian Clipper:
1. **Archive.ph integration** for paywalled news sites
2. **Medium.com paywall bypass** for full article access
3. **Context menu link clipping** for batch operations

---

## Feature 1: Archive Mode for Paywalled Sites

### User Story
When clipping from paid publications (NYT, WaPo, FT, Forbes), automatically archive the page using archive.ph to capture the full content before clipping.

### Settings UI

**New Options in options.html:**
```
┌─────────────────────────────────────────┐
│ Archive Mode Settings                    │
├─────────────────────────────────────────┤
│ ☑ Enable archive mode for paywalled    │
│   sites                                  │
│                                          │
│ Configured Sites:                        │
│ ┌─────────────────────────────────────┐ │
│ │ ☑ nytimes.com                       │ │
│ │ ☑ newyorker.com                     │ │
│ │ ☑ washingtonpost.com                │ │
│ │ ☑ ft.com (Financial Times)          │ │
│ │ ☑ wsj.com (Wall Street Journal)     │ │
│ │ ☑ forbes.com                        │ │
│ │ ☑ economist.com                     │ │
│ │ ☑ bloomberg.com                     │ │
│ │ ☑ theatlantic.com                   │ │
│ │ ☐ Custom: _______________           │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ Wait time for archive: [30] seconds     │
└─────────────────────────────────────────┘
```

### Implementation Approach

**archiveclick Extension Analysis:**
- URL: https://chromewebstore.google.com/detail/archiveclick/efmabpggcbblemppjjbpphknpegobeam
- Likely submits URL to archive.ph automatically
- Need to examine manifest and code

**Our Implementation:**

```javascript
// archive-handler.js (new file)
class ArchiveHandler {
  constructor() {
    this.archiveUrl = 'https://archive.ph/submit/';
    this.paywallSites = [
      'nytimes.com',
      'newyorker.com',
      'washingtonpost.com',
      'ft.com',
      'wsj.com',
      'forbes.com',
      'economist.com',
      'bloomberg.com',
      'theatlantic.com'
    ];
  }

  shouldArchive(url) {
    return this.paywallSites.some(site => url.includes(site));
  }

  async archiveAndClip(url) {
    // 1. Submit to archive.ph
    const archiveUrl = await this.submitToArchive(url);

    // 2. Wait for archive to be ready (poll every 5s, max 30s)
    const readyUrl = await this.waitForArchive(archiveUrl);

    // 3. Extract from archived page
    return readyUrl;
  }

  async submitToArchive(url) {
    // POST to archive.ph/submit/
    // Return archive.ph URL
  }

  async waitForArchive(archiveUrl, maxWait = 30000) {
    // Poll archive.ph to check if ready
    // Return final URL when ready
  }
}
```

**Workflow:**
1. User clicks extension on NYT article
2. Extension detects it's a paywalled site
3. Shows notification: "Archiving article..."
4. Submits to archive.ph
5. Waits for archive to be ready (up to 30s)
6. Extracts content from archived page
7. Clips to Obsidian

---

## Feature 2: Medium.com Paywall Bypass

### User Story
When clipping Medium articles, bypass the paywall to extract full content without login.

### free-medium Extension Analysis

**GitHub:** https://github.com/fferrin/free-medium

**How it works:**
- Likely uses one of these methods:
  1. Append `?gi=` query parameter
  2. Modify cookies to appear logged in
  3. Extract from Medium's JSON-LD data
  4. Use Medium's unlocked RSS feed

**Our Implementation:**

```javascript
// medium-handler.js (new file)
class MediumHandler {
  canHandle(url) {
    return url.includes('medium.com') || url.includes('towardsdatascience.com');
  }

  async extractFullArticle(url) {
    // Method 1: Try ?gi= parameter
    const unlockedUrl = url + (url.includes('?') ? '&' : '?') + 'gi=1234567890';

    // Method 2: Extract from JSON-LD
    const jsonLd = document.querySelector('script[type="application/ld+json"]');
    if (jsonLd) {
      const data = JSON.parse(jsonLd.textContent);
      return data.articleBody;
    }

    // Method 3: Direct DOM extraction with full content
    return this.extractFromDOM();
  }

  extractFromDOM() {
    // Extract article content bypassing paywall overlay
    const article = document.querySelector('article');
    // Remove paywall overlay elements
    document.querySelectorAll('[data-testid="paywall"]').forEach(el => el.remove());
    return article.textContent;
  }
}
```

**Settings UI:**
```
┌─────────────────────────────────────────┐
│ Medium Settings                          │
├─────────────────────────────────────────┤
│ ☑ Enable Medium paywall bypass          │
│                                          │
│ Method:                                  │
│ ○ Auto-detect (recommended)              │
│ ○ Query parameter (?gi=)                 │
│ ○ JSON-LD extraction                     │
│ ○ DOM extraction                         │
└─────────────────────────────────────────┘
```

---

## Feature 3: Context Menu Link Clipping

### User Story
Right-click any link → "Clip to Obsidian" to clip that specific URL, OR right-click page → "Clip all links on page" to batch clip multiple links.

### Settings UI

```
┌─────────────────────────────────────────┐
│ Context Menu Settings                    │
├─────────────────────────────────────────┤
│ ☑ Enable "Clip link" context menu       │
│ ☑ Enable "Clip all links" context menu  │
│                                          │
│ Link filtering:                          │
│ ☑ Exclude same-domain links              │
│ ☑ Exclude anchor links (#section)       │
│ ☑ Exclude javascript: links              │
│ ☐ Only include http/https links          │
└─────────────────────────────────────────┘
```

### Implementation

**manifest.json additions:**
```json
{
  "permissions": [
    "contextMenus"
  ],
  "background": {
    "service_worker": "background.js"
  }
}
```

**background.js additions:**
```javascript
// Create context menu items
chrome.runtime.onInstalled.addListener(() => {
  // Single link clipping
  chrome.contextMenus.create({
    id: "clip-link",
    title: "Clip link to Obsidian",
    contexts: ["link"]
  });

  // Batch link clipping
  chrome.contextMenus.create({
    id: "clip-all-links",
    title: "Clip all links on page",
    contexts: ["page"]
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "clip-link") {
    // Clip single link
    clipUrl(info.linkUrl, tab.id);
  } else if (info.menuItemId === "clip-all-links") {
    // Show link selection UI
    showLinkSelector(tab.id);
  }
});

async function clipUrl(url, tabId) {
  // Open URL in new tab
  const newTab = await chrome.tabs.create({ url, active: false });

  // Wait for page to load
  await waitForTabLoad(newTab.id);

  // Inject content script and extract
  const result = await chrome.scripting.executeScript({
    target: { tabId: newTab.id },
    files: ['content.js']
  });

  // Clip to Obsidian
  await clipToObsidian(result);

  // Close tab
  await chrome.tabs.remove(newTab.id);
}

function showLinkSelector(tabId) {
  // Inject link selector UI
  chrome.scripting.executeScript({
    target: { tabId },
    files: ['link-selector.js']
  });
}
```

**link-selector.js (new file):**
```javascript
// Create overlay with link selection UI
class LinkSelector {
  constructor() {
    this.links = this.extractLinks();
    this.createUI();
  }

  extractLinks() {
    const links = Array.from(document.querySelectorAll('a[href]'));
    return links
      .map(link => ({
        url: link.href,
        text: link.textContent.trim() || link.href,
        domain: new URL(link.href).hostname
      }))
      .filter(link => {
        // Filter out unwanted links
        return link.url.startsWith('http') &&
               !link.url.includes('#') &&
               link.domain !== window.location.hostname;
      });
  }

  createUI() {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.id = 'obsidian-link-selector';
    overlay.innerHTML = `
      <div class="link-selector-modal">
        <h2>Select Links to Clip</h2>
        <div class="link-selector-actions">
          <button id="select-all">Select All</button>
          <button id="deselect-all">Deselect All</button>
        </div>
        <div class="link-selector-list">
          ${this.links.map((link, i) => `
            <label>
              <input type="checkbox" data-index="${i}" checked>
              <span class="link-text">${link.text}</span>
              <span class="link-domain">(${link.domain})</span>
            </label>
          `).join('')}
        </div>
        <div class="link-selector-footer">
          <button id="clip-selected">Clip Selected (${this.links.length})</button>
          <button id="cancel">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    this.attachEventListeners();
  }

  attachEventListeners() {
    // Handle select/deselect all
    // Handle clip button
    // Send selected links to background script
  }
}

new LinkSelector();
```

**link-selector.css (new file):**
```css
#obsidian-link-selector {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.link-selector-modal {
  background: white;
  border-radius: 8px;
  padding: 24px;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.link-selector-list {
  margin: 16px 0;
  max-height: 400px;
  overflow-y: auto;
}

.link-selector-list label {
  display: block;
  padding: 8px;
  cursor: pointer;
}

.link-selector-list label:hover {
  background: #f0f0f0;
}

.link-domain {
  color: #666;
  font-size: 0.9em;
}
```

---

## Implementation Strategy

### Phase 1: Fix Current Extension
1. Resolve "No SW" error
2. Verify basic clipping works
3. Create git branch for new features

### Phase 2: Archive Mode (Prototype)
1. Create `archive-handler.js` module
2. Add settings UI for archive mode
3. Test with NYT, WaPo articles
4. Refine based on results

### Phase 3: Medium Bypass
1. Research free-medium implementation
2. Create `medium-handler.js` module
3. Test multiple bypass methods
4. Add settings UI

### Phase 4: Context Menu Integration
1. Add context menu permissions
2. Implement single link clipping
3. Create link selector UI
4. Implement batch clipping

### Phase 5: Integration & Testing
1. Integrate all three features
2. Add comprehensive settings page
3. Test edge cases
4. Performance optimization

---

## File Structure

```
quick-obsidian-clipper-extension/
├── manifest.json                  (updated with new permissions)
├── background.js                  (updated with context menu)
├── content.js                     (existing)
├── options.html                   (updated with new settings)
├── options.js                     (updated)
├── options.css                    (updated)
│
├── modules/                       (NEW)
│   ├── archive-handler.js        (archive.ph integration)
│   ├── medium-handler.js         (Medium paywall bypass)
│   ├── link-selector.js          (link selection UI)
│   └── batch-clipper.js          (batch clipping logic)
│
├── styles/                        (NEW)
│   └── link-selector.css         (link selector modal styles)
│
└── docs/
    ├── FEATURE-SPEC-ARCHIVE-MODE.md  (this file)
    └── IMPLEMENTATION-LOG.md         (development notes)
```

---

## Configuration Example

**Default Settings:**
```json
{
  "archiveMode": {
    "enabled": false,
    "sites": [
      "nytimes.com",
      "washingtonpost.com",
      "ft.com",
      "wsj.com",
      "forbes.com",
      "economist.com",
      "bloomberg.com",
      "theatlantic.com"
    ],
    "waitTime": 30,
    "customSites": []
  },
  "mediumBypass": {
    "enabled": false,
    "method": "auto"
  },
  "contextMenu": {
    "clipLink": true,
    "clipAllLinks": true,
    "excludeSameDomain": true,
    "excludeAnchors": true,
    "excludeJavascript": true
  }
}
```

---

## Next Steps

1. ✅ Document feature requirements (this file)
2. ⏳ Fix "No SW" error (see FIX-SERVICE-WORKER.md)
3. ⏳ Research archiveclick and free-medium implementations
4. ⏳ Create prototype branch
5. ⏳ Implement Phase 2 (Archive Mode)
6. ⏳ Test and refine

---

## References

- **archiveclick extension:** https://chromewebstore.google.com/detail/archiveclick/efmabpggcbblemppjjbpphknpegobeam
- **free-medium GitHub:** https://github.com/fferrin/free-medium
- **Chrome Context Menus API:** https://developer.chrome.com/docs/extensions/reference/contextMenus/
- **archive.ph API:** https://archive.ph/ (unofficial, needs research)

---

**Created:** 2026-01-05
**Status:** Planning phase - awaiting extension fix before implementation
