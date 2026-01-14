# Security Policy

## Security Review Summary

Last reviewed: 2026-01-13 | Version: 2.4.0

### Overall Assessment: **PASS**

This extension follows Chrome Extension security best practices and does not exhibit malicious behavior.

## Security Measures Implemented

### HTML Sanitization
- **DOMPurify** is used for HTML sanitization in content scripts
- User-generated content is escaped using `textContent` method before rendering
- External links use `rel="noopener"` to prevent reverse tabnapping

### Data Handling
- All data is stored locally using `chrome.storage.local`
- No data is sent to external servers
- URLs are normalized to strip tracking parameters, but original URLs are preserved

### File Operations
- Downloads use Chrome's `downloads` API with proper data URL encoding
- Filenames are sanitized (alphanumeric + dashes only, limited length)
- No arbitrary code execution

### Permissions
| Permission | Purpose | Risk Level |
|------------|---------|------------|
| `storage` | Store settings/history | Low |
| `activeTab` | Access current page | Low |
| `tabs` | Tab management | Medium |
| `scripting` | Content injection | Medium |
| `notifications` | User alerts | Low |
| `downloads` | Save files | Low |
| `alarms` | Scheduled tasks | Low |
| `contextMenus` | Right-click menu | Low |
| `<all_urls>` | Clip any site | Medium* |

*`<all_urls>` host permission is necessary for a web clipper to function on any website. The extension only activates when explicitly triggered by the user.

## Known Considerations

### Settings Import
- The settings import feature accepts JSON files
- A confirmation dialog is shown before applying imported settings
- Imported data is validated before use

### Archive Sites List
- The archive sites list uses innerHTML for rendering
- Site domains are sanitized on input (protocol/path stripped)
- Risk is mitigated by user confirmation during import

### External Services (Optional)
When enabled by user:
- **Freedium** (`freedium.cfd`) - Medium paywall bypass
- **Archive.ph** - Paywalled content access

These are disabled by default and require explicit user opt-in.

## Reporting Security Issues

If you discover a security vulnerability, please:

1. **Do not** open a public GitHub issue
2. Email the maintainer directly
3. Provide a detailed description and steps to reproduce
4. Allow reasonable time for a fix before disclosure

## Code Review Checklist

| Check | Status |
|-------|--------|
| No `eval()` usage | ✅ Pass |
| No `Function()` constructor | ✅ Pass |
| No `document.write()` | ✅ Pass |
| innerHTML with escaped content | ✅ Pass |
| DOMPurify for HTML sanitization | ✅ Pass |
| Proper URL encoding | ✅ Pass |
| External links with noopener | ✅ Pass |
| No hardcoded credentials | ✅ Pass |
| No external data collection | ✅ Pass |
| CSP-compliant | ✅ Pass |

## Content Security Policy

The extension's CSP is defined in `manifest.json`:

```json
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'self'"
}
```

This prevents:
- Inline script execution
- External script loading
- Object/embed abuse

## Changelog

### v2.4.0 Security Notes
- No new security concerns introduced
- Badge functionality uses standard Chrome APIs
- Custom path setting is handled by Chrome's download API (sandboxed)
