# Twitter Bookmark Auto-Sync Feature

**Status:** In Development
**Created:** 2026-01-05
**Priority:** High

---

## Overview

Automatically synchronize all Twitter/X bookmarked tweets to Obsidian vault with internal tracking to prevent duplicate syncing, even after markdown files are moved to the vault.

---

## User Requirements

From user request (2026-01-05):
> "Can we also add an option that all the bookmarked tweets are automatically being synchronized? It is important that you have an internal list of what has already been synchronized because the Markdown files will be moved to the vault."

**Key Constraints:**
1. **Auto-sync all bookmarks** - Not just clipped tweets, but ALL bookmarked tweets
2. **Internal tracking** - Must maintain persistent list of synced tweet IDs
3. **Post-move resilience** - Tracking must work even after markdown files moved to vault
4. **No duplicates** - Never sync the same tweet twice

---

## Technical Approach

### Option 1: Content Script + DOM Scraping (RECOMMENDED)

**Why this approach:**
- No API keys or OAuth required
- Works with user's existing Twitter session
- Can access bookmarks directly through web UI
- User is already logged in to Twitter

**How it works:**
1. Extension injects content script into `twitter.com/i/bookmarks`
2. Script scrolls through bookmarks page to load all tweets
3. Extracts tweet URLs and metadata from DOM
4. Sends batch to background script
5. Background script checks against `syncedTweetIds` storage
6. Only clips tweets not already synced
7. Updates tracking list after successful clips

**Implementation:**
- New file: `twitter-bookmark-scraper.js`
- Modify: `background-simple.js` (add bookmark sync handler)
- Modify: `manifest.json` (add permissions for twitter.com)
- Modify: `options-redesigned.html` (add sync controls)

### Option 2: Twitter API v2 (NOT RECOMMENDED)

**Why NOT this approach:**
- Requires Twitter Developer account
- OAuth flow complexity
- Rate limits
- Bookmark API access restricted

---

## Architecture

### Storage Schema

```javascript
// chrome.storage.local structure
{
  "twitterBookmarkSync": {
    "enabled": true,              // Feature toggle
    "autoSyncInterval": 30,       // Minutes between auto-syncs
    "syncedTweetIds": [           // Persistent tracking list
      "1976287721812365350",
      "1975123456789012345",
      // ... all previously synced tweet IDs
    ],
    "lastSyncTimestamp": "2026-01-05T14:30:00Z",
    "totalBookmarksFound": 247,
    "totalNewlySynced": 12,
    "syncInProgress": false
  }
}
```

### Sync Flow

```
User Action (Manual Sync Button OR Auto-Trigger)
  ↓
Background Script: Check if sync already in progress
  ↓
Open twitter.com/i/bookmarks in new tab (hidden)
  ↓
Content Script: Inject bookmark scraper
  ↓
Scroll & Extract all bookmark URLs
  ↓
Send batch of URLs to background script
  ↓
Background Script: Filter out already-synced IDs
  ↓
For each new tweet:
  - Open tweet URL
  - Extract content (use existing content.js)
  - Create markdown
  - Download to Obsidian-Clips folder
  - Add tweet ID to syncedTweetIds
  ↓
Close bookmark tab
  ↓
Show notification: "Synced X new bookmarks"
```

---

## Implementation Plan

### Phase 1: Core Infrastructure (TODAY)

**Files to create:**
1. `twitter-bookmark-scraper.js` - Content script for bookmark extraction

**Files to modify:**
1. `background-simple.js` - Add bookmark sync logic
2. `manifest.json` - Add Twitter permissions
3. `options-redesigned.html` - Add sync UI controls

**Storage setup:**
- Initialize `twitterBookmarkSync` in DEFAULT_SETTINGS
- Create tracking database schema

### Phase 2: Bookmark Scraper (TODAY)

**twitter-bookmark-scraper.js:**
```javascript
class TwitterBookmarkScraper {
  async getAllBookmarks() {
    // Scroll through bookmarks page to load all tweets
    // Extract tweet URLs from DOM
    // Return array of { tweetId, url, timestamp }
  }

  async scrollToLoadAll() {
    // Auto-scroll to trigger infinite loading
    // Detect when no more bookmarks
  }

  extractBookmarkData() {
    // Parse tweet elements from DOM
    // Extract ID, URL, author, timestamp
  }
}
```

**Integration:**
- Background script opens `twitter.com/i/bookmarks`
- Injects scraper script
- Receives bookmark data via message passing
- Processes batch

### Phase 3: Background Sync Logic (TODAY)

**background-simple.js additions:**
```javascript
// Add to message listener
if (message.type === 'SYNC_TWITTER_BOOKMARKS') {
  handleTwitterBookmarkSync()
    .then(result => sendResponse({ success: true, ...result }))
    .catch(error => sendResponse({ success: false, error: error.message }));
  return true;
}

async function handleTwitterBookmarkSync() {
  // 1. Check if sync in progress
  // 2. Open twitter.com/i/bookmarks in hidden tab
  // 3. Inject scraper script
  // 4. Receive bookmark URLs
  // 5. Filter against syncedTweetIds
  // 6. Clip each new tweet
  // 7. Update tracking database
  // 8. Close tab
  // 9. Return stats
}

async function clipTweetFromBookmark(tweetUrl, tweetId) {
  // Open tweet URL
  // Inject content.js
  // Extract content
  // Create markdown
  // Download file
  // Add tweetId to syncedTweetIds
  // Close tab
}
```

### Phase 4: UI Controls (TODAY)

**options-redesigned.html additions:**

New section:
```html
<div class="section">
  <h2 class="section-title">
    <span class="status-led" id="twitter-sync-led"></span>
    Twitter Bookmark Sync
  </h2>

  <div class="data-row">
    <div class="data-label">Status</div>
    <div>
      <label>
        <input type="checkbox" id="enable-twitter-sync">
        Enable auto-sync
      </label>
    </div>
  </div>

  <div class="data-row">
    <div class="data-label">Interval</div>
    <div>
      <select id="sync-interval">
        <option value="15">Every 15 minutes</option>
        <option value="30" selected>Every 30 minutes</option>
        <option value="60">Every hour</option>
        <option value="180">Every 3 hours</option>
      </select>
    </div>
  </div>

  <div class="data-row">
    <div class="data-label">Last Sync</div>
    <div class="data-value" id="last-sync-time">Never</div>
  </div>

  <div class="data-row">
    <div class="data-label">Total Synced</div>
    <div class="data-value" id="total-synced-count">0</div>
  </div>

  <div class="stats">
    <div class="stat">
      <div class="stat-value" id="bookmarks-found">0</div>
      <div class="stat-label">Found</div>
    </div>
    <div class="stat">
      <div class="stat-value" id="newly-synced">0</div>
      <div class="stat-label">New</div>
    </div>
    <div class="stat">
      <div class="stat-value" id="already-synced">0</div>
      <div class="stat-label">Skipped</div>
    </div>
  </div>

  <div class="actions">
    <button class="btn btn-primary" id="sync-now">
      <span>🔄 Sync Now</span>
    </button>
    <button class="btn btn-secondary" id="clear-sync-history">
      <span>🗑️ Reset Tracking</span>
    </button>
  </div>

  <div class="help-text">
    <strong>How it works:</strong> The extension periodically checks your Twitter bookmarks and automatically clips any new bookmarked tweets. Already-synced tweets are tracked by ID and never re-clipped, even after files are moved to your vault.
  </div>
</div>
```

### Phase 5: Auto-Sync Timer (TODAY)

**Background script:**
```javascript
// Set up periodic alarm for auto-sync
chrome.alarms.create('twitterBookmarkAutoSync', {
  periodInMinutes: 30  // User-configurable
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'twitterBookmarkAutoSync') {
    checkAndRunTwitterBookmarkSync();
  }
});

async function checkAndRunTwitterBookmarkSync() {
  const settings = await getSettings();
  if (settings.twitterBookmarkSync?.enabled) {
    await handleTwitterBookmarkSync();
  }
}
```

---

## Bookmark Extraction Strategy

### DOM Selectors (as of 2026-01-05)

Twitter's bookmark page structure:
```javascript
// Bookmark page URL
const BOOKMARKS_URL = 'https://twitter.com/i/bookmarks';

// Tweet article elements
const TWEET_SELECTOR = 'article[data-testid="tweet"]';

// Extract tweet ID from article
const getTweetId = (article) => {
  const links = article.querySelectorAll('a[href*="/status/"]');
  for (const link of links) {
    const match = link.href.match(/\/status\/(\d+)/);
    if (match) return match[1];
  }
  return null;
};

// Scroll detection
const isAtBottom = () => {
  return (window.innerHeight + window.scrollY) >= document.body.offsetHeight - 1000;
};
```

### Infinite Scroll Handler

```javascript
async function loadAllBookmarks() {
  let previousCount = 0;
  let stableCount = 0;

  while (true) {
    // Scroll to bottom
    window.scrollTo(0, document.body.scrollHeight);

    // Wait for new tweets to load
    await sleep(2000);

    // Count current tweets
    const currentCount = document.querySelectorAll(TWEET_SELECTOR).length;

    // Check if count stable (no new tweets loaded)
    if (currentCount === previousCount) {
      stableCount++;
      if (stableCount >= 3) {
        // No new tweets after 3 tries - we've reached the end
        break;
      }
    } else {
      stableCount = 0;
    }

    previousCount = currentCount;
  }

  // Extract all tweet data
  return extractAllTweetData();
}
```

---

## Deduplication Logic

### Tracking Database

```javascript
// Persistent storage of synced tweet IDs
const syncedTweetIds = new Set([
  "1976287721812365350",
  "1975123456789012345",
  // ...thousands more
]);

// Check before syncing
function shouldSyncTweet(tweetId) {
  return !syncedTweetIds.has(tweetId);
}

// Mark as synced after successful clip
function markTweetSynced(tweetId) {
  syncedTweetIds.add(tweetId);
  // Persist to chrome.storage.local
  saveToStorage();
}
```

### Storage Optimization

**Problem:** Tracking list could grow to thousands of IDs

**Solution:** Use Set for fast lookup, periodically clean old entries

```javascript
// Store as array in chrome.storage.local
{
  "syncedTweetIds": [
    "1976287721812365350",
    "1975123456789012345",
    // ...
  ]
}

// Load as Set for fast lookups
const syncedTweetIds = new Set(await getSyncedTweetIds());

// Check membership: O(1)
syncedTweetIds.has(tweetId);
```

---

## Error Handling

### Scenarios and Solutions

| Scenario | Handling |
|----------|----------|
| Twitter not logged in | Show notification: "Please log in to Twitter" |
| Bookmark page fails to load | Retry 3 times, then fail gracefully |
| Tweet extraction fails | Skip tweet, log error, continue with others |
| Download fails | Mark as failed, don't add to syncedTweetIds |
| Storage quota exceeded | Show warning, offer to reset tracking |
| Rate limiting | Implement exponential backoff |

### Logging

```javascript
// Add to history with sync-specific metadata
await logToHistory({
  type: 'twitter-bookmark-sync',
  timestamp: new Date().toISOString(),
  bookmarksFound: 247,
  newlySynced: 12,
  alreadySynced: 235,
  failed: 0,
  status: 'success'
});
```

---

## User Experience

### Manual Sync Flow

1. User clicks "Sync Now" button in options page
2. Button shows loading state: "Syncing..."
3. Extension opens Twitter bookmarks (optionally hidden tab)
4. Progress indicator: "Loading bookmarks... X tweets found"
5. Progress indicator: "Clipping new tweets... Y of Z"
6. Completion notification: "✓ Synced 12 new bookmarks"
7. Stats update in options page

### Auto-Sync Flow

1. Timer triggers every 30 minutes (configurable)
2. Silent sync in background
3. Only shows notification if new bookmarks found
4. Notification: "🔖 Synced 5 new Twitter bookmarks"
5. Click notification to view synced tweets

### Settings

- ☑ Enable Twitter bookmark auto-sync
- Sync interval: [15 / 30 / 60 / 180 minutes]
- Manual "Sync Now" button
- "Reset Tracking" button (clears syncedTweetIds)
- Stats: Total synced, last sync time, newly synced count

---

## Manifest Permissions

```json
{
  "permissions": [
    "storage",
    "activeTab",
    "scripting",
    "notifications",
    "downloads",
    "alarms"  // NEW: For periodic auto-sync
  ],
  "host_permissions": [
    "<all_urls>"
  ]
}
```

---

## Testing Checklist

### Manual Testing

- [ ] Open options page, enable Twitter sync
- [ ] Click "Sync Now" button
- [ ] Verify bookmark page opens
- [ ] Verify scrolling loads all bookmarks
- [ ] Verify only new bookmarks are clipped
- [ ] Verify syncedTweetIds persists across browser restarts
- [ ] Verify auto-sync triggers after interval
- [ ] Verify notification shows correct count
- [ ] Verify "Reset Tracking" clears database
- [ ] Verify synced tweets appear in Downloads/Obsidian-Clips
- [ ] Move files to vault, run sync again - verify no duplicates

### Edge Cases

- [ ] No bookmarks (first use)
- [ ] All bookmarks already synced
- [ ] Twitter logged out
- [ ] Bookmark page fails to load
- [ ] Network disconnection during sync
- [ ] Storage quota exceeded
- [ ] Deleted tweets (404 errors)
- [ ] Protected tweets (no access)

---

## Files to Create/Modify

### New Files

1. **twitter-bookmark-scraper.js** - Content script for bookmark extraction
2. **FEATURE-SPEC-TWITTER-BOOKMARK-SYNC.md** - This file

### Modified Files

1. **background-simple.js** - Add bookmark sync handlers
2. **manifest.json** - Add alarms permission
3. **options-redesigned.html** - Add Twitter sync UI section
4. **READY-TO-USE.md** - Document new feature

---

## Implementation Timeline

**TODAY (2026-01-05):**
- ✅ Create feature specification (this file)
- ⏳ Create twitter-bookmark-scraper.js
- ⏳ Modify background-simple.js
- ⏳ Modify manifest.json
- ⏳ Modify options-redesigned.html
- ⏳ Test manual sync
- ⏳ Test auto-sync
- ⏳ Test deduplication

---

## Future Enhancements

**V2 Features (Post-MVP):**
- Sync Twitter Lists (not just bookmarks)
- Sync liked tweets
- Sync tweets from specific users
- Custom sync filters (date range, keywords, authors)
- Batch export all synced tweets
- Search synced tweets in extension
- View sync history log

---

## Notes

- Twitter's DOM structure may change - scraper needs to be resilient
- Consider adding a "force re-sync" option for edge cases
- May want to add option to sync bookmarks in reverse chronological order
- Could add option to auto-unbookmark after successful sync
- Consider adding progress bar for large bookmark collections

---

**Status:** Ready for implementation
**Next Step:** Create twitter-bookmark-scraper.js
