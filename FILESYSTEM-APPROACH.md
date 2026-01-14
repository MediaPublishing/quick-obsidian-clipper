# Filesystem-First Approach: Downloads Folder + Cron Sync

**Goal:** Get the extension working NOW by simplifying to Downloads folder, then sync to vault with cron.

## Why This Works Better

1. **No API complexity** - No service worker issues
2. **No authentication needed** - Just write files
3. **Simpler debugging** - Files you can see immediately
4. **Automatic sync** - Cron job handles vault integration
5. **Clipping history** - Track all clips with status

---

## Architecture

```
User clicks extension
     ↓
Extract content
     ↓
Save to ~/Downloads/Obsidian-Clips/YYYY-MM-DD--title.md
     ↓
Log to clipping-history.json
     ↓
Show notification: "Saved to Downloads"

---

Every 5 minutes (cron):
     ↓
Check ~/Downloads/Obsidian-Clips/
     ↓
Move *.md files → !Vault/Clippings/Browser-Clips/
     ↓
Update sync log
```

---

## Extension Changes

### 1. Remove API Dependency

**background.js - simplified:**
```javascript
// NO API calls, just file downloads
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CONTENT_EXTRACTED') {
    const { data } = message;

    // Create markdown file
    const markdown = createMarkdown(data);
    const filename = createFilename(data.title);

    // Download to ~/Downloads/Obsidian-Clips/
    chrome.downloads.download({
      url: 'data:text/markdown;charset=utf-8,' + encodeURIComponent(markdown),
      filename: `Obsidian-Clips/${filename}`,
      saveAs: false  // Auto-save, no dialog
    }, (downloadId) => {
      // Log to history
      logClip({
        url: data.url,
        title: data.title,
        filename: filename,
        timestamp: new Date().toISOString(),
        status: 'success',
        downloadId: downloadId
      });

      // Show notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Clipped to Downloads',
        message: `Saved: ${data.title}`
      });
    });
  }
});

function createMarkdown(data) {
  const date = new Date().toISOString().split('T')[0];

  return `---
title: "${data.title}"
source: web-clip
url: "${data.url}"
date_saved: ${date}
date_published: ${data.published || ''}
author: ${data.author ? JSON.stringify(data.author) : '[]'}
type: article
tags:
  - clipping/web
  - to-process
---

# ${data.title}

**URL:** ${data.url}
**Saved:** ${new Date().toLocaleString()}

---

${data.content}

---

## Notes

<!-- Add your thoughts here -->
`;
}

function createFilename(title) {
  const date = new Date().toISOString().split('T')[0];
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);

  return `${date}--${slug}.md`;
}

function logClip(clipData) {
  // Store in chrome.storage.local
  chrome.storage.local.get(['clippingHistory'], (result) => {
    const history = result.clippingHistory || [];
    history.unshift(clipData);  // Add to beginning

    // Keep last 500 clips
    if (history.length > 500) {
      history.length = 500;
    }

    chrome.storage.local.set({ clippingHistory: history });
  });
}
```

### 2. Clipping History Page

**history.html (new file):**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Clipping History - Quick Obsidian Clipper</title>
  <link rel="stylesheet" href="history.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>Clipping History</h1>
      <div class="stats">
        <span class="stat">Total: <strong id="total-clips">0</strong></span>
        <span class="stat">Today: <strong id="today-clips">0</strong></span>
        <span class="stat">This Week: <strong id="week-clips">0</strong></span>
      </div>
    </header>

    <div class="filters">
      <input type="search" id="search" placeholder="Search clips...">
      <select id="filter-status">
        <option value="all">All Status</option>
        <option value="success">Success</option>
        <option value="failed">Failed</option>
      </select>
      <select id="filter-time">
        <option value="all">All Time</option>
        <option value="today">Today</option>
        <option value="week">This Week</option>
        <option value="month">This Month</option>
      </select>
      <button id="clear-history">Clear History</button>
      <button id="export-history">Export CSV</button>
    </div>

    <div class="history-list" id="history-list">
      <!-- Populated by JavaScript -->
    </div>
  </div>

  <script src="history.js"></script>
</body>
</html>
```

**history.js (new file):**
```javascript
let allClips = [];

// Load history on page load
chrome.storage.local.get(['clippingHistory'], (result) => {
  allClips = result.clippingHistory || [];
  renderHistory(allClips);
  updateStats(allClips);
});

function renderHistory(clips) {
  const container = document.getElementById('history-list');

  if (clips.length === 0) {
    container.innerHTML = '<div class="empty">No clips yet. Start clipping!</div>';
    return;
  }

  container.innerHTML = clips.map(clip => `
    <div class="clip-item ${clip.status}">
      <div class="clip-header">
        <div class="clip-title">${clip.title}</div>
        <div class="clip-status status-${clip.status}">${clip.status}</div>
      </div>
      <div class="clip-meta">
        <span class="clip-url">${clip.url}</span>
        <span class="clip-time">${formatTime(clip.timestamp)}</span>
      </div>
      <div class="clip-actions">
        <button onclick="openUrl('${clip.url}')">Open URL</button>
        <button onclick="openFile('${clip.filename}')">Open File</button>
        <button onclick="reclip('${clip.url}')">Re-clip</button>
        <button onclick="deleteClip('${clip.timestamp}')">Delete</button>
      </div>
    </div>
  `).join('');
}

function updateStats(clips) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

  document.getElementById('total-clips').textContent = clips.length;
  document.getElementById('today-clips').textContent =
    clips.filter(c => c.timestamp.startsWith(today)).length;
  document.getElementById('week-clips').textContent =
    clips.filter(c => new Date(c.timestamp) > weekAgo).length;
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return date.toLocaleDateString();
}

// Search and filter
document.getElementById('search').addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase();
  const filtered = allClips.filter(clip =>
    clip.title.toLowerCase().includes(query) ||
    clip.url.toLowerCase().includes(query)
  );
  renderHistory(filtered);
});

document.getElementById('filter-status').addEventListener('change', (e) => {
  const status = e.target.value;
  const filtered = status === 'all'
    ? allClips
    : allClips.filter(c => c.status === status);
  renderHistory(filtered);
});

// Export to CSV
document.getElementById('export-history').addEventListener('click', () => {
  const csv = [
    'Timestamp,Title,URL,Status,Filename',
    ...allClips.map(c =>
      `"${c.timestamp}","${c.title}","${c.url}","${c.status}","${c.filename}"`
    )
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);

  chrome.downloads.download({
    url: url,
    filename: `clipping-history-${new Date().toISOString().split('T')[0]}.csv`,
    saveAs: true
  });
});

// Clear history
document.getElementById('clear-history').addEventListener('click', () => {
  if (confirm('Clear all clipping history? This cannot be undone.')) {
    chrome.storage.local.set({ clippingHistory: [] });
    allClips = [];
    renderHistory([]);
    updateStats([]);
  }
});

function openUrl(url) {
  chrome.tabs.create({ url });
}

function openFile(filename) {
  // Open Downloads folder to the file
  chrome.tabs.create({
    url: `file://${chrome.runtime.getURL('/')}../../Downloads/Obsidian-Clips/${filename}`
  });
}

function reclip(url) {
  chrome.tabs.create({ url }, (tab) => {
    // Wait for load, then trigger clip
    chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
      if (tabId === tab.id && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        chrome.action.openPopup();
      }
    });
  });
}

function deleteClip(timestamp) {
  if (confirm('Delete this clip from history?')) {
    allClips = allClips.filter(c => c.timestamp !== timestamp);
    chrome.storage.local.set({ clippingHistory: allClips });
    renderHistory(allClips);
    updateStats(allClips);
  }
}
```

**history.css (new file):**
```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: #f5f5f5;
  padding: 20px;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

header {
  padding: 24px;
  border-bottom: 2px solid #e0e0e0;
}

h1 {
  font-size: 24px;
  margin-bottom: 16px;
}

.stats {
  display: flex;
  gap: 24px;
}

.stat {
  color: #666;
}

.stat strong {
  color: #7c3aed;
  font-size: 18px;
}

.filters {
  padding: 16px 24px;
  display: flex;
  gap: 12px;
  border-bottom: 1px solid #e0e0e0;
}

#search {
  flex: 1;
  padding: 8px 12px;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  font-size: 14px;
}

select, button {
  padding: 8px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  font-size: 14px;
}

button:hover {
  background: #f5f5f5;
}

#clear-history {
  color: #ef4444;
  border-color: #ef4444;
}

#export-history {
  color: #7c3aed;
  border-color: #7c3aed;
}

.history-list {
  padding: 24px;
}

.clip-item {
  padding: 16px;
  margin-bottom: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  transition: all 0.2s;
}

.clip-item:hover {
  border-color: #7c3aed;
  box-shadow: 0 2px 8px rgba(124, 58, 237, 0.1);
}

.clip-item.failed {
  border-left: 4px solid #ef4444;
}

.clip-item.success {
  border-left: 4px solid #22c55e;
}

.clip-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 8px;
}

.clip-title {
  font-size: 16px;
  font-weight: 600;
  flex: 1;
}

.clip-status {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.status-success {
  background: #dcfce7;
  color: #166534;
}

.status-failed {
  background: #fee2e2;
  color: #991b1b;
}

.clip-meta {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
  font-size: 14px;
  color: #666;
}

.clip-url {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.clip-actions {
  display: flex;
  gap: 8px;
}

.clip-actions button {
  padding: 6px 12px;
  font-size: 13px;
  border: 1px solid #e0e0e0;
}

.empty {
  text-align: center;
  padding: 48px;
  color: #999;
  font-size: 16px;
}
```

### 3. Update manifest.json

```json
{
  "manifest_version": 3,
  "name": "Quick Obsidian Clipper",
  "version": "2.0.0",
  "description": "Streamlined web clipper with filesystem support and clipping history",
  "permissions": [
    "storage",
    "activeTab",
    "scripting",
    "notifications",
    "downloads"
  ],
  "action": {
    "default_title": "Clip to Obsidian"
  },
  "options_page": "options.html",
  "icons": {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "background": {
    "service_worker": "background-simple.js"
  }
}
```

---

## Cron Job for Sync

**~/.claude/scripts/obsidian-clip-sync.sh:**
```bash
#!/bin/bash

# Sync Downloads/Obsidian-Clips → Vault/Clippings/Browser-Clips

SOURCE="$HOME/Downloads/Obsidian-Clips"
DEST="$HOME/My Drive (webonomy@gmail.com)/!Vault/Clippings/Browser-Clips"
LOG="$HOME/.claude/logs/clip-sync.log"

# Create directories if they don't exist
mkdir -p "$SOURCE"
mkdir -p "$DEST"

# Count files
FILE_COUNT=$(find "$SOURCE" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')

if [ "$FILE_COUNT" -eq 0 ]; then
  echo "$(date): No clips to sync" >> "$LOG"
  exit 0
fi

echo "$(date): Syncing $FILE_COUNT clips..." >> "$LOG"

# Move all .md files
find "$SOURCE" -name "*.md" -type f | while read -r file; do
  filename=$(basename "$file")
  mv "$file" "$DEST/"
  echo "  → Moved: $filename" >> "$LOG"
done

echo "$(date): Sync complete" >> "$LOG"
```

**Install cron job:**
```bash
# Make script executable
chmod +x ~/.claude/scripts/obsidian-clip-sync.sh

# Add to crontab (every 5 minutes)
(crontab -l 2>/dev/null; echo "*/5 * * * * $HOME/.claude/scripts/obsidian-clip-sync.sh") | crontab -
```

---

## Benefits of This Approach

✅ **No service worker complexity** - Simpler background script
✅ **No API authentication** - Just file downloads
✅ **Visible immediately** - Files appear in Downloads
✅ **Auto-sync to vault** - Cron handles it
✅ **Full history tracking** - See all clips with status
✅ **Easy debugging** - Files you can inspect
✅ **Works offline** - No API dependency

---

## Next Steps

1. Create new simplified `background-simple.js`
2. Add history.html/js/css files
3. Update manifest.json
4. Test with one clip
5. Set up cron job
6. Verify full workflow

---

**This will actually work!** No more "No SW" errors, no API complexity.
