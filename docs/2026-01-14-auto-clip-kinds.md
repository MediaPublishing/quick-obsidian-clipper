# Quick Obsidian Clipper - Auto Clip Kinds (v2.4.5)

Date: 2026-01-14

## Context
Clips serve different intents (bookmark vs research). Homepage clips are usually
just reminders, while news or repo clips need full extraction.

## Changes
- Added auto-detection for clip kinds: bookmark, news, repo, video, selection.
- Homepage URLs now save lightweight bookmark notes instead of full content.
- Tags are generated from clip kind (e.g., clipping/bookmark, clipping/news).
- Filename prefixes are applied per domain to make daily folders scan-friendly.

## Notes
- Clip kind is stored in frontmatter as `clip_kind` for easy filtering.
- Domain prefixes are editable in Settings.

## Files Updated
- `background-simple.js`
- `options.js`
- `options-redesigned.html`
- `manifest.json`
- `README.md`
