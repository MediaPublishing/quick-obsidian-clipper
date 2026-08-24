---
date: 2026-08-24
version: 2.4.16
status: submitted-pending-review
---

# Chrome Web Store Submission Metadata

## Item details

| Field | Value |
|---|---|
| Name | Quick Obsidian Clipper |
| Chrome Web Store item ID | `cjhbghekkonbpcibkbogbcemepolpnnl` |
| Summary | Save any web page as clean markdown to your Downloads folder — ready for Obsidian, one click or keyboard shortcut. |
| Category | Tools |
| Language | English (United States) |
| Homepage URL | https://github.com/MediaPublishing/quick-obsidian-clipper |
| Support URL | https://github.com/MediaPublishing/quick-obsidian-clipper/issues |
| Support email | webonomy@gmail.com |
| Privacy policy | https://mediapublishing.github.io/quick-obsidian-clipper/store-listing/privacy-policy.html |

## Store review answers

**Single purpose:** Save user-selected web content as Markdown files in the local Downloads folder.

**Distribution:** Public, all regions.

**Payments:** Free of charge; no in-app purchases.

**Remote code:** None. The package contains all executable code. No remote JavaScript, WASM, CSS, or HTML is fetched and executed.

**Broad host permission (`<all_urls>`):** A web clipper must work on the page the user chooses, including ordinary blogs and sites outside a fixed allowlist. General page clipping uses `activeTab`; broad host access additionally supports bulk clipping several already-open tabs and the optional X bookmark, archive.ph, and Freedium routes. The extension does not passively monitor browsing.

**Permission justifications:**

| Permission | Purpose |
|---|---|
| `storage` | Stores settings, duplicate-detection history, and X-sync IDs locally. |
| `activeTab` | Reads the current page after an explicit toolbar action, shortcut, or context-menu action. |
| `tabs` | Identifies URLs and titles for bulk clipping and reports progress. |
| `scripting` | Injects the local extraction script into a clippable HTTP or HTTPS page. Browser-internal pages are blocked. |
| `notifications` | Confirms completed, failed, or queued clips. |
| `downloads` | Writes the generated Markdown file through the browser download system. |
| `alarms` | Runs optional scheduled X bookmark syncing and retry processing. |
| `contextMenus` | Adds right-click actions for links, selections, images, and pages. |

## Data-use disclosures

- No user data is sold.
- No data is used for advertising, credit scoring, lending, insurance, employment, housing, or eligibility decisions.
- No data is transferred to the developer.
- Page text, titles, URLs, and metadata are processed locally to build the requested Markdown file. Downloaded files remain under the user's control.
- Duplicate history and X-sync IDs remain in local extension storage.
- The optional archive.ph and Freedium features navigate to those independent services only when enabled and explicitly triggered. Their handling is governed by their own policies.
- The optional X bookmark feature reads bookmarked posts from x.com after the user enables it.

## Assets

| Asset | Path |
|---|---|
| Screenshot uploaded to CWS, 1280x800 JPEG | `docs/store-listing/assets/screenshot-01-options-1280x800.jpg` |
| Promotional tile uploaded to CWS, 440x280 JPEG | `docs/store-listing/assets/promo-tile-440x280.jpg` |
| Upload ZIP | `dist/quick-obsidian-clipper-v2.4.16-chrome-store.zip` |

## Submission status

Submitted through the Media Publishing developer dashboard on 2026-08-24. The dashboard reports `Pending review` for item ID `cjhbghekkonbpcibkbogbcemepolpnnl`. Automatic publication after a successful review was enabled.
