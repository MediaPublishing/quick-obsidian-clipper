# Quick Obsidian Clipper - 2025 Redesign

**Goal:** Minimal-hassle web clipping that "just works" with smart defaults and powerful features when needed.

---

## Research Summary

### Best-in-Class Features (from Obsidian/Notion Web Clippers)

Based on research of top web clippers in 2025:

**✅ Essential Features:**
- **One-click clipping** - Primary interaction, no multi-step process
- **Auto-templates** - Detect content type, apply appropriate format
- **Keyboard shortcuts** - Ctrl+Shift+S (customizable)
- **Highlight before clip** - Select text, right-click, clip selection
- **Smart metadata extraction** - Auto-detect title, author, date, tags
- **File-based storage** - Durable Markdown files
- **Minimal configuration** - Works out of the box
- **History tracking** - See all clips, successes, failures

**🎯 UX Best Practices:**
- Minimize cognitive load - familiar patterns
- Remove unnecessary steps - every click is friction
- One-click primary action
- Keyboard shortcuts for power users
- Right-click context menu for flexibility
- Visual feedback - notifications, progress indicators

---

## Your Specific Requirements

1. ✅ **Minimal hassle clipping** - One-click, auto-save, auto-sync
2. ✅ **Archive mode for paywalled sites** - Auto-detect, archive.ph integration
3. ✅ **Medium paywall bypass** - Freedium integration
4. ✅ **Batch link clipping** - Right-click → clip all links
5. ✅ **Clipping history** - Track all clips with success/failure status
6. ✅ **Filesystem-first** - Save to Downloads, cron sync to vault

---

## Redesigned Extension Architecture

### 1. Zero-Configuration First Use

**Out of the box experience:**
```
1. Install extension
2. Click icon on any page
3. Content saved to ~/Downloads/Obsidian-Clips/
4. Notification: "Saved! ✓"
```

**No setup required. It just works.**

### 2. Smart Defaults

**Auto-detect content type:**
- YouTube → Video clip template (title, channel, transcript)
- Twitter → Tweet template (author, engagement, thread)
- Medium → Article template (bypass paywall)
- NYT/WaPo → Archive template (archive.ph integration)
- GitHub → Code/repo template
- Generic → Article template

**Default settings:**
```json
{
  "saveLocation": "~/Downloads/Obsidian-Clips",
  "autoSync": true,
  "syncInterval": 5,  // minutes
  "archivePaywalls": true,
  "bypassMedium": true,
  "trackHistory": true,
  "notifications": true,
  "keyboardShortcut": "Ctrl+Shift+S"
}
```

### 3. Three-Level Interface

**Level 1: Power User (Zero UI)**
- Click icon → Instant clip → Done
- Or press Ctrl+Shift+S → Instant clip → Done
- No popup, no dialog, just works

**Level 2: Quick Options (Mini Popup)**
```
┌─────────────────────────────────┐
│  Quick Obsidian Clipper         │
├─────────────────────────────────┤
│  Clipping: New York Times...    │
│  [■■■■■■■■■□] 90%               │
│                                  │
│  Will use: Archive Mode          │
│                                  │
│  [Clip Now] [Cancel]             │
└─────────────────────────────────┘
```

**Level 3: Full Settings (Options Page)**
- Advanced configuration
- Template customization
- Site-specific rules
- History browser

---

## Core Features

### Feature 1: One-Click Clipping

**Primary interaction:**
```
User clicks extension icon
     ↓
1. Detect page type (NYT? Medium? YouTube?)
2. Apply appropriate handler
3. Extract content
4. Save to Downloads/Obsidian-Clips/
5. Log to history
6. Show notification
```

**Handlers:**
- `PaywallHandler` - Archive.ph for NYT, WaPo, etc.
- `MediumHandler` - Freedium for Medium
- `YouTubeHandler` - Video + transcript extraction
- `TwitterHandler` - Tweet thread extraction
- `GenericHandler` - Standard article extraction

**No user intervention needed** - all automatic.

### Feature 2: Keyboard Shortcuts

```
Ctrl+Shift+S  - Clip current page
Ctrl+Shift+A  - Clip with archive mode (force)
Ctrl+Shift+H  - Open clipping history
Ctrl+Shift+L  - Clip all links on page
```

Customizable in settings.

### Feature 3: Context Menu Integration

**Right-click menu:**
```
┌─────────────────────────────────┐
│ Quick Obsidian Clipper          │
├─────────────────────────────────┤
│ ► Clip this page                │
│ ► Clip selection                │  (if text selected)
│ ► Clip link                     │  (if on link)
│ ► Clip all links on page        │
│ ► Archive and clip              │  (force archive mode)
│ ► View clipping history         │
└─────────────────────────────────┘
```

### Feature 4: Smart Archive Mode

**Auto-detect paywalled sites:**
```javascript
const PAYWALL_SITES = [
  'nytimes.com',
  'washingtonpost.com',
  'ft.com',
  'wsj.com',
  'forbes.com',
  'economist.com',
  'bloomberg.com',
  'theatlantic.com',
  'newyorker.com',
  'wired.com'
];

async function clipWithArchive(url) {
  // 1. Show progress notification
  showNotification('Archiving article...', { progress: true });

  // 2. Submit to archive.ph
  const archiveUrl = await archiveToArchivePh(url);

  // 3. Wait for archive (with progress updates)
  await waitForArchive(archiveUrl, (progress) => {
    updateNotification(`Archiving... ${progress}%`);
  });

  // 4. Extract from archived page
  const content = await extractFromArchive(archiveUrl);

  // 5. Save with both URLs
  await saveClip({
    ...content,
    original_url: url,
    archive_url: archiveUrl,
    clipped_via: 'archive.ph'
  });

  showNotification('Saved! (archived)', { success: true });
}
```

### Feature 5: Medium Bypass

**Freedium integration:**
```javascript
async function clipMediumArticle(url) {
  // Use Freedium to get full content
  const freediumUrl = `https://freedium.cfd/${url}`;

  const response = await fetch(freediumUrl);
  const html = await response.text();

  // Extract clean content
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const article = doc.querySelector('article');

  const content = turndownService.turndown(article.innerHTML);

  await saveClip({
    title: doc.querySelector('h1')?.textContent,
    content: content,
    url: url,
    clipped_via: 'freedium',
    paywall_bypassed: true
  });
}
```

### Feature 6: Batch Link Clipping

**UI for link selection:**
```
User right-clicks → "Clip all links on page"
     ↓
Modal appears with link list
     ↓
┌────────────────────────────────────────────────┐
│  Select Links to Clip                           │
├────────────────────────────────────────────────┤
│  [Select All] [Deselect All] [Smart Filter]    │
├────────────────────────────────────────────────┤
│  ☑ Article: "Best Web Clippers 2025"           │
│     → tooltivity.com                            │
│                                                  │
│  ☑ Article: "Obsidian Guide"                   │
│     → obsidian.md                               │
│                                                  │
│  ☐ Home                                         │
│     → example.com (same domain, filtered)       │
│                                                  │
│  ☑ Research: "UX Design Patterns"              │
│     → uxplaybook.org                            │
├────────────────────────────────────────────────┤
│  [Clip Selected (3)]  [Cancel]                 │
└────────────────────────────────────────────────┘

Smart filter auto-excludes:
- Same-domain links
- Anchor links (#section)
- JavaScript links
- Common nav links (home, about, contact)
```

**Batch processing:**
```javascript
async function batchClipLinks(selectedLinks) {
  const total = selectedLinks.length;
  let completed = 0;

  showNotification(`Clipping ${total} links...`, {
    progress: true,
    persistent: true
  });

  for (const link of selectedLinks) {
    try {
      await clipUrl(link.url);
      completed++;
      updateNotification(`Clipping ${completed}/${total}...`);
    } catch (error) {
      logError(link.url, error);
    }
  }

  showNotification(`Clipped ${completed}/${total} links`, {
    success: true
  });
}
```

### Feature 7: Comprehensive History

**History page with filters:**
```
┌────────────────────────────────────────────────┐
│  Clipping History                               │
├────────────────────────────────────────────────┤
│  [Search...] [Today ▼] [All Status ▼] [Export] │
├────────────────────────────────────────────────┤
│  Stats: 247 total | 12 today | 98% success     │
├────────────────────────────────────────────────┤
│                                                  │
│  ✓ Best Web Clippers 2025                      │
│    tooltivity.com • 2 minutes ago               │
│    [Open] [Re-clip] [Delete]                    │
│                                                  │
│  ✓ Obsidian Web Clipper Guide (archived)       │
│    obsidian.md • 15 minutes ago                 │
│    [Open] [View Archive] [Re-clip]              │
│                                                  │
│  ✗ Paywall Article (failed)                     │
│    nytimes.com • 1 hour ago                     │
│    Error: Archive timeout                       │
│    [Retry] [Delete]                             │
│                                                  │
└────────────────────────────────────────────────┘
```

**Features:**
- Search by title, URL, content
- Filter by date, status, source
- Sort by date, title, domain
- Export to CSV
- Bulk operations (delete, re-clip)
- Statistics dashboard

---

## File Structure

**Downloads Organization:**
```
~/Downloads/Obsidian-Clips/
├── 2026-01-05--best-web-clippers-2025.md
├── 2026-01-05--obsidian-clipper-guide.md
├── 2026-01-05--nyt-article-archived.md
└── .clipping-history.json
```

**Vault Organization (after sync):**
```
!Vault/
└── Clippings/
    └── Browser-Clips/
        ├── 2026-01/
        │   ├── 2026-01-05--best-web-clippers-2025.md
        │   └── 2026-01-05--obsidian-clipper-guide.md
        └── 2026-01-05--nyt-article-archived.md
```

**Auto-organize by month** - cron job handles this.

---

## Template System

**Auto-select template based on URL:**

```yaml
templates:
  youtube:
    pattern: "youtube.com|youtu.be"
    file: youtube-video.md

  twitter:
    pattern: "twitter.com|x.com"
    file: tweet-thread.md

  medium:
    pattern: "medium.com"
    file: medium-article.md
    bypass_paywall: true

  paywall:
    pattern: "nytimes.com|washingtonpost.com|ft.com|wsj.com"
    file: archived-article.md
    use_archive: true

  github:
    pattern: "github.com"
    file: github-repo.md

  default:
    file: generic-article.md
```

**Templates include:**
- Frontmatter with metadata
- Title extraction
- Author/source attribution
- Date published/saved
- Tags (auto-generated + user tags)
- Archive URL (if archived)
- Original URL
- Content body
- Notes section

---

## Settings Organization

**Organized by workflow, not technology:**

```
┌────────────────────────────────────────────────┐
│  Quick Obsidian Clipper Settings               │
├────────────────────────────────────────────────┤
│                                                  │
│  ╔═══════════════════════════════════════╗     │
│  ║  Basic Settings                        ║     │
│  ╚═══════════════════════════════════════╝     │
│                                                  │
│  Save Location:                                 │
│  ● Downloads folder (sync to vault)             │
│  ○ Direct to vault (requires Obsidian running) │
│                                                  │
│  Auto-sync to vault: ☑ Enabled                 │
│  Sync every: [5] minutes                        │
│                                                  │
│  Show notifications: ☑ Enabled                 │
│  Track history: ☑ Enabled                      │
│                                                  │
│  ─────────────────────────────────────────      │
│                                                  │
│  ╔═══════════════════════════════════════╗     │
│  ║  Smart Clipping                        ║     │
│  ╚═══════════════════════════════════════╝     │
│                                                  │
│  Paywall Handling:                              │
│  ☑ Auto-archive paywalled articles             │
│                                                  │
│  Paywalled Sites: [Configure 10 sites ▼]       │
│                                                  │
│  Medium Articles:                               │
│  ☑ Bypass paywall automatically                │
│                                                  │
│  ─────────────────────────────────────────      │
│                                                  │
│  ╔═══════════════════════════════════════╗     │
│  ║  Advanced Features                     ║     │
│  ╚═══════════════════════════════════════╝     │
│                                                  │
│  Context Menu:                                  │
│  ☑ Show "Clip page"                            │
│  ☑ Show "Clip selection"                       │
│  ☑ Show "Clip link"                            │
│  ☑ Show "Clip all links"                       │
│                                                  │
│  Keyboard Shortcuts: [Customize...]            │
│                                                  │
│  Templates: [Manage Templates...]              │
│                                                  │
│  ─────────────────────────────────────────      │
│                                                  │
│  [View History] [Export Settings] [Help]       │
│                                                  │
└────────────────────────────────────────────────┘
```

---

## Implementation Priority

### Phase 1: Core Functionality (MVP)
1. ✅ One-click clipping to Downloads
2. ✅ Basic templates (article, YouTube, Twitter)
3. ✅ History tracking
4. ✅ Cron sync to vault
5. ✅ Notifications

**Goal:** Working clipper that "just works"

### Phase 2: Smart Features
1. ✅ Auto-detect paywalled sites
2. ✅ Archive.ph integration
3. ✅ Medium/Freedium bypass
4. ✅ Smart template selection

**Goal:** Minimal hassle for your specific use cases

### Phase 3: Power User Features
1. ✅ Context menu integration
2. ✅ Batch link clipping
3. ✅ Keyboard shortcuts
4. ✅ Advanced history filters

**Goal:** Maximum efficiency for power workflows

### Phase 4: Polish
1. ✅ Template customization UI
2. ✅ Statistics dashboard
3. ✅ Export/import settings
4. ✅ Comprehensive help docs

**Goal:** Professional, polished experience

---

## Key Design Principles

**1. Zero Friction by Default**
- No configuration required to start clipping
- Smart defaults for everything
- One-click primary action

**2. Progressive Disclosure**
- Hide complexity until needed
- Power features available but not intrusive
- Three-level interface (power/quick/full)

**3. Transparency**
- Always show what's happening
- Clear error messages
- History tracking for accountability

**4. Offline-First**
- Files saved locally immediately
- Sync happens in background
- Works without internet (for already-visited pages)

**5. User Control**
- All data in readable Markdown files
- Export settings/history anytime
- No vendor lock-in

---

## Comparison to Official Obsidian Clipper

| Feature | Official Clipper | Our Clipper |
|---------|-----------------|-------------|
| **One-click clipping** | ✅ Yes | ✅ Yes |
| **Templates** | ✅ Advanced | ✅ Smart auto-detect |
| **Highlights** | ✅ Yes | ⏳ Phase 4 |
| **Archive mode** | ❌ No | ✅ **Yes** |
| **Medium bypass** | ❌ No | ✅ **Yes** |
| **Batch link clipping** | ❌ No | ✅ **Yes** |
| **Clipping history** | ❌ No | ✅ **Yes** |
| **Filesystem-first** | ❌ No (requires app) | ✅ **Yes** |
| **Cron sync** | ❌ No | ✅ **Yes** |

**Our advantages:**
- Archive mode for paywalled sites
- Medium paywall bypass
- Batch operations
- Comprehensive history
- Works without Obsidian running
- Simpler setup

---

## Next Steps

1. ✅ **Review this design** - Does it fit your workflow?
2. ⏳ **Fix current extension** - Get it loading first
3. ⏳ **Build Phase 1 MVP** - Core clipping functionality
4. ⏳ **Test with real usage** - Clip 10-20 articles
5. ⏳ **Iterate based on feedback**

---

## Sources

- [Obsidian Web Clipper](https://obsidian.md/clipper)
- [Notion Web Clipper](https://chromewebstore.google.com/detail/notion-web-clipper/knheggckgoiihginacbkhaalnibhilkk)
- [Best Web Clipper Extensions 2025](https://tooltivity.com/categories/web-clipper)
- [Web Clipper UX Best Practices](https://survicate.com/blog/user-friction/)
- [Obsidian Clipper GitHub](https://github.com/obsidianmd/obsidian-clipper)
- [Top Web Clipper Tools Comparison](https://www.remio.ai/post/top-web-clipper-tools-compared-find-your-perfect-match-in-2025)

---

**Created:** 2026-01-05
**Status:** Design complete - ready for implementation
