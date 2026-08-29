# Quick Obsidian Clipper - Upgrade Notes

**Date:** 2026-01-05
**Version:** 1.1.0 (Filesystem Support)

## What's New

### ✨ Major Features

1. **Filesystem Mode (NEW - Recommended)**
   - Clips now save directly to disk using Chrome's downloads API
   - **Works WITHOUT Obsidian running!**
   - No need for Local REST API server
   - Files are immediately available on your filesystem

2. **Proper Extension Icons**
   - Replaced placeholder purple square with professional gradient icon
   - All sizes properly generated (16x16, 32x32, 48x48, 128x128)

3. **Three Clipping Modes**
   - **Filesystem:** Direct file save (works offline, no Obsidian needed)
   - **API:** Legacy mode using Obsidian Local REST API
   - **Auto:** Try filesystem first, fall back to API if needed

### 🔧 Technical Changes

- Added `downloads` and `downloads.ui` permissions to manifest
- New `filesystem.js` module for direct file operations
- Rewrote `background.js` with readable, maintainable code
- Updated `options.html` and `options.js` for new settings
- Maintained backward compatibility with API mode

## Backup Information

**Backup Location:**
```
$HOME/Projects/
```

**Backup Files:**
- `quick-obsidian-clipper-extension-backup-YYYYMMDD-HHMMSS.tar.gz` (full backup)
- `background-api-only.js` (original minified background.js)
- `options-old.js` (original minified options.js)

## Rollback Instructions

If you need to revert to the previous version:

### Option 1: Quick Rollback (Recommended)

```bash
cd "$HOME/Projects/quick-obsidian-clipper"

# Restore old background.js
mv background.js background-new.js
mv background-api-only.js background.js

# Restore old options.js
mv options.js options-new.js
mv options-old.js options.js

# Remove new files
rm filesystem.js

# Revert manifest (remove downloads permissions manually)
# Edit manifest.json and remove "downloads" and "downloads.ui" from permissions
# Remove web_accessible_resources section

# Reload extension in Chrome
```

### Option 2: Full Restore from Backup

```bash
cd "$HOME/Projects"

# Find your backup file
ls -lt *.tar.gz | head -1

# Extract backup (replace TIMESTAMP with actual timestamp from filename)
tar -xzf quick-obsidian-clipper-extension-backup-TIMESTAMP.tar.gz

# This will restore the complete original extension
# Reload extension in Chrome
```

## Migration Guide

### For New Users

1. Install the extension
2. Go to Options
3. Select **"Filesystem (works without Obsidian)"** mode
4. Set Filesystem Save Path to `Obsidian/Clippings`
5. Start clipping - that's it!

### For Existing Users (API Mode)

Your existing settings are preserved. You have three options:

**Option A: Switch to Filesystem Mode (Recommended)**
1. Go to extension Options
2. Change Clipping Mode to "Filesystem"
3. Configure Filesystem Save Path
4. All future clips will save directly to disk

**Option B: Keep API Mode**
- No changes needed
- Extension continues to work exactly as before
- Requires Obsidian to be running

**Option C: Use Auto Mode**
- Tries filesystem first, falls back to API
- Best of both worlds
- No configuration needed

## How Filesystem Mode Works

1. **File Creation:** Uses Chrome's `downloads` API to save markdown files
2. **Save Location:** Downloads folder (configurable subfolder)
3. **Vault Integration Options:**
   - Symlink Downloads subfolder to Obsidian vault
   - Configure vault to sync with Downloads folder (Google Drive)
   - Manually move files periodically

### Symlink Example

```bash
# Create symlink from Downloads to your Obsidian vault
ln -s "$HOME/Downloads/Obsidian/Clippings" "$HOME/Documents/Obsidian/Vault/Clippings"

# Now files saved to Downloads/Obsidian/Clippings automatically appear in your vault!
```

## Troubleshooting

### Issue: Files not appearing in vault

**Solution:**
- Check that Filesystem Save Path is configured correctly
- Verify the symlink (if using) is set up properly
- Check Chrome's Downloads settings (make sure download location is correct)

### Issue: "Download failed" error

**Solution:**
- Grant downloads permission when prompted
- Check disk space
- Verify Downloads folder is writable

### Issue: Want to go back to old version

**Solution:** Use rollback instructions above

## Testing the Upgrade

1. **Test Filesystem Mode:**
   - Configure filesystem mode
   - Clip a test page (try youtube.com or any article)
   - Check Downloads folder for saved markdown file
   - Verify file format and content

2. **Test API Mode (if used):**
   - Switch to API mode
   - Ensure Obsidian is running
   - Test clipping
   - Verify file appears in vault

3. **Test Auto Mode:**
   - Switch to Auto mode
   - Test with Obsidian closed (should use filesystem)
   - Test with Obsidian open (might use API)
   - Both should work

## Files Changed

- ✅ `manifest.json` - Added downloads permissions
- ✅ `background.js` - Complete rewrite with filesystem support
- ✅ `options.js` - Updated for new settings
- ✅ `options.html` - Added filesystem mode UI
- ✅ `filesystem.js` - NEW file for filesystem operations
- ✅ `icons/icon*.png` - Replaced with proper icons

## Files Backed Up

- ✅ `background-api-only.js` - Original background.js
- ✅ `options-old.js` - Original options.js
- ✅ Full extension backup in .tar.gz format

## Support

If you encounter any issues:

1. Check this document for troubleshooting
2. Try rollback if filesystem mode doesn't work
3. Report issues with specific error messages

## Future Enhancements

Potential improvements for future versions:

- Direct File System Access API (user grants permanent folder access)
- Queue system for offline clipping with auto-sync
- Better duplicate detection across modes
- Batch clipping improvements

---

**Remember:** You can always rollback using the commands above. The original extension is safely backed up!
