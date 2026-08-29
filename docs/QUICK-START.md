# Quick Start Guide - Filesystem Mode

**✅ Fixed Issues:**
- Service worker error (importScripts)
- API key no longer required for filesystem mode
- UI simplified - only shows relevant fields
- Symlink command ready to copy/paste

## 🚀 3-Step Setup (No Obsidian needed!)

### Step 1: Reload Extension in Chrome

```
1. Go to chrome://extensions/
2. Find "Quick Obsidian Clipper"
3. Click the reload button (↻)
```

### Step 2: Configure Extension

```
1. Right-click extension icon → Options
2. Mode should already be: "Filesystem (works without Obsidian)" ✅
3. Path should be: "Obsidian/Clippings" ✅
4. Click "Save Settings"
```

**Note:** Symlink is already set up! The command shown in the UI is for reference only.

### Step 3: Test It!

```
1. Keep Obsidian CLOSED (to prove it works!)
2. Go to any webpage (try: https://example.com)
3. Click the extension icon
4. Check: !Vault/Clippings/Browser-Clips/
   - Your clip should be there!
```

## 📁 Where Files Are Saved

**Downloads:** `~/Downloads/Obsidian/Clippings/`
**Vault:** `!Vault/Clippings/Browser-Clips/` (via symlink)

Files saved to Downloads automatically appear in your vault!

## ⚙️ What Got Fixed

1. **Service Worker Error** ✅
   - Removed ES module type that was causing importScripts error
   - Inlined filesystem code into background.js

2. **API Key Requirement** ✅
   - Filesystem mode no longer requires API settings
   - Can save without API key, vault name, etc.

3. **Simplified UI** ✅
   - Shows only relevant fields based on mode
   - API fields hidden in filesystem mode
   - Clear 1-2-3 steps

4. **Symlink Command** ✅
   - Displayed in the UI for easy copy/paste
   - Already executed - just for reference

## 🔄 If You Need API Mode Later

Once Obsidian sync finishes and you can get your API key:

1. Go to extension Options
2. Change mode to "Auto" (tries filesystem first, then API)
3. Add your API key in the API fields (they'll appear)
4. Save settings

API mode will be used as fallback if filesystem fails.

## 🆘 Troubleshooting

**Extension won't load?**
- Make sure you reloaded it in chrome://extensions/

**Settings won't save?**
- Check that "Obsidian/Clippings" path is filled in
- Mode should be "Filesystem"

**Clips not appearing in vault?**
- Check Downloads/Obsidian/Clippings/ first
- Verify symlink: `ls -la "$HOME/Documents/Obsidian/Vault/Clippings/" | grep Browser-Clips`

**Want original extension back?**
- See UPGRADE-NOTES.md for rollback instructions

## 🎯 Ready to Clip!

The extension is now fully configured and ready to use WITHOUT Obsidian running.

Try clipping this page right now to test it! 🚀
