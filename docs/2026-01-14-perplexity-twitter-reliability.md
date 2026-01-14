# Quick Obsidian Clipper - Perplexity + Twitter Reliability (v2.4.3)

Date: 2026-01-14

## Context
Perplexity clipping could stall if the handler ran but never sent content, and
clipboard reads often failed without a user gesture. Twitter extraction also
allowed empty results and misread K/M engagement counts.

## Changes
- Added a Perplexity fallback timer in the background script to trigger general
  extraction when the handler doesn’t respond.
- Avoided clipboard failures by treating "Download" actions separately and
  gracefully falling back to DOM extraction.
- Fixed Twitter validation for empty results and parsed K/M/B metrics.
- Removed unused YouTube handler injection to prevent missing-file errors.

## Files Updated
- `background-simple.js`
- `src/handlers/perplexity-handler.js`
- `src/handlers/twitter-handler.js`
- `manifest.json`
- `README.md`
