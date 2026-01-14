# Quick Obsidian Clipper - Tweet Cleanup & Filename Prefixes (v2.4.4)

Date: 2026-01-14

## Context
Recent tweet clips were double-wrapped with frontmatter and included empty
"Untitled" captures when X.com returned login-gated markup. Filenames also
needed short domain prefixes for faster scanning.

## Changes
- Twitter handler now sends structured data (tweet text, metrics, media, replies)
  instead of full markdown, so the background script generates a single
  frontmatter block.
- Added login-gate detection for X.com to avoid saving empty tweet shells.
- Added filename prefix rules (x/yt/gh/etc.) with a settings UI to manage domain
  prefixes.
- Updated filename generation for tweets, YouTube, and GitHub for cleaner naming.

## Files Updated
- `background-simple.js`
- `src/handlers/twitter-handler.js`
- `options-redesigned.html`
- `options.js`
- `manifest.json`
- `README.md`
