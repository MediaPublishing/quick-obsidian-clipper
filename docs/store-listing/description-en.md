---
date: 2026-08-23
status: ready-for-submission
lang: en
version: 2.4.15
---

# Quick Obsidian Clipper — Store Description (English)

## Short Description (132 chars max)

> Save any web page as clean markdown to your Downloads folder — ready for Obsidian, one click or keyboard shortcut.

---

## Long Description (up to 16,000 chars; aim for ~500 words)

**Quick Obsidian Clipper** saves web pages as formatted Markdown files directly to your local Downloads folder. No cloud sync, no account, no API keys — just clean files ready to import into Obsidian or any other Markdown-based note app.

### Why a local-first approach?

Most web clippers either require a paid account or push your content to a cloud service. Quick Obsidian Clipper writes directly to your filesystem via the browser's Download API, so your clips are immediately available on disk without any intermediate step.

### Core features

**One-click clipping**
Click the toolbar icon or press `Cmd+Shift+S` (Mac) / `Ctrl+Shift+S` (Windows) to clip the current page. The extension extracts the main content, strips tracking noise, and downloads a clean Markdown file with YAML frontmatter (title, URL, date, author, tags, word count, reading time).

**Selection clipping**
Select any text on a page and press `Cmd+Shift+C` to clip only the selection — useful for quotes, code snippets, or specific sections.

**Bulk clip all tabs**
Press `Cmd+Shift+A` to clip every open tab in the current window in one pass — ideal for research sessions.

**Right-click context menu**
Clip images, links, or selected text via the browser context menu without opening the popup.

**Smart duplicate detection**
A green badge on the extension icon marks pages you have already clipped. A warning appears before re-clipping, based on URL-normalized comparison (UTM parameters, fbclid, and similar tracking fragments are stripped before matching).

**Site-specific handlers**

| Site | What is extracted |
|---|---|
| YouTube | Video title, description, metadata, transcript (if available) |
| Twitter/X | Tweet content, author, engagement numbers, replies |
| Perplexity | AI search results with source citations |
| Medium | Full article text (optional Freedium integration for paywalled posts) |
| Any paywalled site | Optional routing through archive.ph for full content |

**Custom download path**
Set the exact folder where clips are saved in the Options page.

### Permissions used

| Permission | Why |
|---|---|
| `storage` | Saves your settings and clip history locally |
| `activeTab` | Reads the current page's content when you click Clip |
| `tabs` | Detects open tabs for bulk clipping |
| `scripting` | Injects the content extractor into the active tab |
| `notifications` | Confirms when a clip has been saved |
| `downloads` | Saves the Markdown file to your local filesystem |
| `alarms` | Clears the duplicate-detection badge after a configurable timeout |
| `contextMenus` | Adds right-click options for clipping images, links, and selections |
| `<all_urls>` | Required so the content extractor can run on any site you choose to clip |

### No external services

The extension does not send your content to any external server. All processing happens in your browser. The optional archive.ph routing opens a tab to archive.ph at your explicit request and is disabled by default.

---

*No account required. No subscription. Files go to your Downloads folder.*
