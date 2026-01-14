# Quick Obsidian Clipper - DOMPurify Fallback (v2.4.2)

Date: 2026-01-14

## Context
Some sites (e.g., https://neon.com/) include SVG text elements with invalid
transform attributes. DOMPurify throws while parsing those nodes, which caused
`extractMainContent()` to fail and halted clipping.

## Changes
- Remove stray `text` SVG nodes alongside `svg` before sanitization.
- Wrap DOMPurify in a try/catch and fall back to clean text content when
  sanitization fails.

## Files Updated
- `content.js`
- `manifest.json`
- `README.md`
