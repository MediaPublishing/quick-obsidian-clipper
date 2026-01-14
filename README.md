# Quick Obsidian Clipper

**One-click web clipper with smart features** - Saves pages as clean markdown to your Downloads folder, ready for Obsidian.

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue?logo=googlechrome)](https://developer.chrome.com/docs/extensions/)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-green)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Why Quick Obsidian Clipper?

Unlike other web clippers that require complex OAuth setups or paid subscriptions, Quick Obsidian Clipper takes a **simple, privacy-first approach**:

- **No API keys required** - Works immediately after install
- **No account needed** - Your data stays local
- **Offline-capable** - Downloads to your filesystem, not to a cloud service
- **Clean markdown output** - YAML frontmatter, proper formatting, ready for Obsidian
- **Smart duplicate detection** - Alerts you if you've already clipped a page
- **Custom download path** - Configure where clips are saved

## Features

### Core Clipping
- **One-click clipping** - Click the icon or use `Cmd+Shift+S` (Mac) / `Ctrl+Shift+S` (Win)
- **Selection clipping** - Clip just the selected text with `Cmd+Shift+C`
- **Bulk clip all tabs** - Clip every tab in your window with `Cmd+Shift+A`
- **Right-click context menu** - Clip images, links, or selections

### Smart Features
- **Clipped Badge Indicator** - Green checkmark shows when you've already clipped a page
- **Duplicate Detection** - Warns before re-clipping recently saved pages
- **URL Normalization** - Strips tracking parameters (UTM, fbclid, etc.) for accurate duplicate detection
- **Custom Download Path** - Configure exactly where clips are saved

### Site-Specific Handlers
- **YouTube** - Extracts video metadata, description, and transcript when available
- **Twitter/X** - Captures tweets with author info, engagement metrics, and replies
- **Perplexity** - Clips AI search results with sources
- **Medium** - Optional paywall bypass via Freedium integration
- **Archive.ph** - Route paywalled sites through archive.ph for full content

### Output Quality
- **YAML Frontmatter** - Title, URL, date saved, author, tags, word count, reading time
- **Clean Markdown** - Proper headings, links, images, blockquotes
- **Obsidian-ready** - Tags, wiki-links format, ready to process

## Installation

### From Source (Development)

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/quick-obsidian-clipper.git
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable **Developer mode** (toggle in top right)

4. Click **Load unpacked** and select the `quick-obsidian-clipper-extension` folder

5. The extension icon will appear in your toolbar

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+Shift+S` / `Ctrl+Shift+S` | Clip current page |
| `Cmd+Shift+C` / `Ctrl+Shift+C` | Clip selected text |
| `Cmd+Shift+A` / `Ctrl+Shift+A` | Bulk clip all tabs |

## Configuration

Right-click the extension icon and select **Options** to configure:

### Download Path
- **Default**: Saves to `Downloads/Obsidian-Clips/`
- **Custom Path**: Specify your own path (e.g., `/Users/you/Obsidian/Vault/Clippings`)

> **Tip for Mac users**: In Finder, navigate to your target folder, then press `Option+Cmd+C` to copy the full path.

### Features
- **Clipped Badge** - Show green checkmark on pages you've clipped
- **Archive Mode** - Route paywalled sites through archive.ph
- **Medium Bypass** - Use Freedium for Medium articles

### Archive Sites
When Archive Mode is enabled, you can manage which sites get routed through archive.ph:
- Default list includes: NYT, WSJ, Bloomberg, The Atlantic, Wired, and more
- Add/remove sites as needed

## File Output Format

Each clip creates a markdown file with this structure:

```markdown
---
title: "Article Title"
source: web-clip
url: "https://example.com/article"
date_saved: 2026-01-13
date_published: 2026-01-10
author: ["Author Name"]
type: article
word_count: 1234
reading_time: 6
tags:
  - clipping/web
  - to-process
---

# Article Title

**URL:** https://example.com/article
**Saved:** 1/13/2026, 10:30:00 AM
**Words:** 1234 (~6 min read)

---

[Article content in clean markdown]

---

## Notes

<!-- Add your thoughts here -->
```

## Syncing to Obsidian

### Option 1: Direct Download Path
Configure your custom download path to point directly to a folder inside your Obsidian vault:
```
/Users/you/Documents/Obsidian/Vault/Clippings
```

### Option 2: Folder Sync
If your vault is in a cloud-synced location (iCloud, Dropbox, Google Drive), clips will automatically sync.

### Option 3: Manual Move
Files are saved to `Downloads/Obsidian-Clips/` - move them to your vault as needed.

## History & Statistics

The extension tracks all your clips:

- **Total Clips** - Lifetime count
- **Success Rate** - Percentage of successful clips
- **Recent Clips** - Today, this week, this month
- **Search & Filter** - Find clips by title, URL, status, or date
- **Export** - Download history as CSV
- **Re-clip** - Retry failed clips with one click

Access history via the **Options** page → **View History** button.

## Twitter/X Bookmark Sync

Automatically sync your Twitter/X bookmarks:

1. Enable Twitter Bookmark Sync in Options
2. Set sync interval (15-60 minutes)
3. Click "Sync Now" to start
4. Bookmarked tweets are clipped as individual markdown files

## Technical Details

### Permissions Used
| Permission | Purpose |
|------------|---------|
| `storage` | Save settings and clip history |
| `activeTab` | Access current tab for clipping |
| `tabs` | Tab management for bulk clip & badge |
| `scripting` | Inject content scripts for extraction |
| `notifications` | Show clip success/failure alerts |
| `downloads` | Save markdown files |
| `alarms` | Schedule automatic Twitter sync |
| `contextMenus` | Right-click context menu |

### Architecture
- **Manifest V3** - Modern Chrome extension format
- **Service Worker** - Background script for clip processing
- **Content Scripts** - Site-specific handlers for YouTube, Twitter, etc.
- **DOMPurify** - HTML sanitization for security

## Privacy

- **No data sent to servers** - All processing is local
- **No analytics** - We don't track your usage
- **No account required** - Works completely offline
- **Open source** - Inspect the code yourself

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development

```bash
# Clone the repo
git clone https://github.com/yourusername/quick-obsidian-clipper.git
cd quick-obsidian-clipper

# Load in Chrome
# 1. Go to chrome://extensions/
# 2. Enable Developer mode
# 3. Click "Load unpacked"
# 4. Select the extension folder
```

## Changelog

### v2.4.2 (2026-01-14)
- Added DOMPurify fallback when sanitization fails, returning clean text content
- Removed stray `text` SVG nodes to avoid transform parsing errors on sites like neon.com

### v2.4.1 (2026-02-01)
- Hardened handler injection with fallback paths (YouTube, Perplexity, Twitter bookmarks)
- Ensured general extraction still runs if a handler script is missing
- Removed SVG nodes before sanitization to avoid noisy transform errors

### v2.4.0 (2026-01-13)
- Added clipped badge indicator (green checkmark on icon)
- Added custom download path configuration
- Added Perplexity AI search handler
- Improved duplicate detection

### v2.3.1
- Fixed YouTube transcript cleanup
- Improved Twitter/X extraction for 2025 layout
- Added bulk clip all tabs feature

### v2.2.0
- Added Twitter bookmark sync
- Added archive.ph integration
- Added Medium bypass via Freedium

### v2.0.0
- Complete rewrite for Manifest V3
- New options page UI
- History tracking and statistics

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- [DOMPurify](https://github.com/cure53/DOMPurify) - HTML sanitization
- [Turndown](https://github.com/mixmark-io/turndown) - HTML to Markdown conversion
- [Freedium](https://freedium.cfd/) - Medium paywall bypass service
- Obsidian community for inspiration

---

Made with care for the Obsidian community.
