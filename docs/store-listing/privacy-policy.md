---
date: 2026-08-30
status: release-candidate-copy
version: 2.4.18
---

# Quick Obsidian Clipper — Privacy Policy

*Last updated: 2026-08-30*

---

## 1. Summary

Quick Obsidian Clipper does not collect or transmit clips, history, or settings to the developer. Extraction and Markdown creation happen locally in the browser. Optional features can open or navigate to x.com, archive.ph, or Freedium only when the user enables or triggers them, as described below.

---

## 2. Data stored locally

The extension stores the following data in Chrome's local extension storage (`chrome.storage.local`) and your local filesystem:

| Data | Purpose | Location |
|---|---|---|
| Extension settings (download path, duplicate-detection window, per-site handler preferences) | Persists your configuration | `chrome.storage.local` |
| Clip history (URL, normalized URL, timestamp of each clip) | Powers duplicate detection and the history page | `chrome.storage.local` |
| X bookmark sync state (enabled flag, interval, processed post IDs, counters, last result) | Avoids duplicate imports and reports sync progress | `chrome.storage.local` |
| Clipped content (full Markdown file with page text, title, URL, date) | Your actual clip | Local filesystem (Downloads folder) |

This locally stored data is not uploaded to the developer.

---

## 3. What the extension reads

When you trigger a clip, the extension:

1. Reads the **current page's DOM** (title, URL, main content, author, images) via a content script injected into the active tab.
2. Reads **tab metadata** (title, URL) when processing bulk clips.

For site-specific handlers:

- **YouTube**: Reads the video page DOM for title, description, and the transcript track (if present in the page source).
- **Twitter/X**: Reads the tweet DOM for tweet text, author name, and engagement counters visible on the page.
- **Perplexity**: Reads the search result DOM including source citations.

The extracted content is formatted locally and downloaded to your filesystem. Ordinary clipping does not upload the extracted Markdown to the developer.

---

## 4. Optional third-party features

**Archive.ph routing (optional, off by default)**
If you enable this feature for specific sites, the extension will open a new browser tab to `archive.ph` and navigate to that URL on your behalf. This is an explicit user-initiated action. Archive.ph is an independent service; their privacy practices are governed by their own policy.

**Freedium routing (optional, off by default)**
If enabled for Medium, the extension redirects Medium URLs through `freedium.cfd` or `freedium-mirror.cfd`. Freedium is an independent service with its own privacy practices.

**X bookmark sync (optional, off by default)**
If enabled, the extension opens the X bookmarks page in your existing signed-in browser session, reads bookmarked posts visible in that page, and saves new clips locally. Processed post IDs and sync counters remain in local extension storage. The extension does not receive or store your X password or session cookie.

These optional features are disabled by default. They contact the named service only after you enable or trigger them.

---

## 5. No analytics or tracking

The extension contains no analytics SDK, crash reporter, or telemetry of any kind.

---

## 6. `<all_urls>` host permission

The extension declares `<all_urls>` in its manifest. This is required so the content extractor can inject into any page you choose to clip and so optional bulk clipping and X bookmark sync can process user-selected or explicitly enabled pages. It does not passively monitor ordinary browsing.

---

## 7. Data deletion

- **Clip history and settings**: Remove the extension from Chrome, or clear extension storage via Chrome DevTools → Application → Extension Storage.
- **Downloaded Markdown files**: Delete them from your Downloads folder like any other file.

---

## 8. Children

This extension is not directed at children under 13 and does not knowingly process their data.

---

## 9. Changes

If data practices change in a future version, this policy will be updated.

---

## 10. Contact

Repository: https://github.com/MediaPublishing/quick-obsidian-clipper
Contact: webonomy@gmail.com
