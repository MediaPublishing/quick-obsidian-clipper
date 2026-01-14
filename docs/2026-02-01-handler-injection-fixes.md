# Quick Obsidian Clipper - Handler Injection Fixes (v2.4.1)

Date: 2026-02-01

## Context
Several handler scripts (YouTube, Perplexity, Twitter bookmark scraper) failed to inject after the repo reorg that moved handlers into `src/handlers/`. This caused clip failures and auto-sync errors when Chrome could not find the scripts by legacy paths. A noisy SVG transform error also appeared during general extraction on some sites (e.g., neon.com).

## Changes
- Added a helper to inject scripts with fallback paths (`src/handlers/...` -> legacy root file name).
- YouTube/Twitter/Perplexity flows now fall back to `content.js` if a handler fails to inject.
- Twitter bookmark sync fails fast with a clearer message if the scraper script is missing.
- General extraction removes `svg` nodes before sanitization to avoid SVG transform errors.

## Files Updated
- `background-simple.js`
- `content.js`
- `manifest.json`
- `README.md`

## Notes
- This is a defensive change; when handler scripts are present, behavior remains unchanged.
- If handler injection fails, the clipper now still attempts the general extractor to avoid total clip failures.
