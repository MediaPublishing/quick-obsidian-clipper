# Quick Obsidian Clipper - MVP Installation Guide

**Phase 1 MVP is ready!** Simple, reliable clipping to Downloads with auto-sync to vault.

---

## What's Included

✅ One-click clipping to ~/Downloads/Obsidian-Clips/
✅ Smart markdown formatting with frontmatter
✅ Clipping history tracking
✅ Success/failure notifications
✅ Auto-sync to vault every 5 minutes
✅ Beautiful history viewer

---

## Installation Steps

### Step 1: Backup Old Extension (Optional)

```bash
cd "$HOME/Projects/quick-obsidian-clipper"

# Backup old background.js
cp background.js background-old-broken.js.bak 2>/dev/null || true

# Backup old manifest
cp manifest.json manifest-old.json.bak 2>/dev/null || true
```

### Step 2: Activate New Extension

```bash
# Replace manifest.json with new version
mv manifest-new.json manifest.json

# The extension will now use background-simple.js
```

### Step 3: Install in Chrome

1. **Remove old extension:**
   - Go to `chrome://extensions/`
   - Find "Quick Obsidian Clipper"
   - Click **Remove**

2. **Close Chrome completely:**
   - Cmd+Q (don't just close windows)
   - Wait 5 seconds

3. **Clear extension cache** (optional but recommended):
```bash
rm -rf ~/Library/Application\ Support/Google/Chrome/Default/Service\ Worker/ScriptCache
rm -rf ~/Library/Application\ Support/Google/Chrome/Default/Extension\ State
```

4. **Reopen Chrome:**
   - Go to `chrome://extensions/`
   - Enable **Developer mode** (top right)
   - Click **Load unpacked**
   - Select the cloned `quick-obsidian-clipper` repository folder.

5. **Verify it loaded:**
   - Should say "Service worker (Active)"
   - No errors
   - Purple half-clip icon in toolbar

### Step 4: Set Up Auto-Sync

The sync script is already created at `~/.claude/scripts/obsidian-clip-sync.sh`

**Install cron job:**
```bash
# Add to crontab (runs every 5 minutes)
(crontab -l 2>/dev/null | grep -v obsidian-clip-sync; echo "*/5 * * * * $HOME/.claude/scripts/obsidian-clip-sync.sh") | crontab -
```

**Verify cron job:**
```bash
crontab -l | grep obsidian-clip-sync
```

Should show:
```
*/5 * * * * "$HOME/.local/bin/obsidian-clip-sync.sh"
```

---

## Test It!

### Test 1: Basic Clipping

1. Go to any article (try https://tooltivity.com/categories/web-clipper)
2. Click the purple clip icon in toolbar
3. Should see notification: "Clipped Successfully"
4. Check `~/Downloads/Obsidian-Clips/` - should have a .md file
5. Open the file - should be formatted markdown

### Test 2: History Tracking

1. Right-click the extension icon → "View History" (or create history.html as right-click option)
2. Or navigate to: `chrome-extension://[your-extension-id]/history.html`
3. Should see your clip listed

### Test 3: Auto-Sync

1. Clip an article
2. Wait 5 minutes (or run manually: `~/.claude/scripts/obsidian-clip-sync.sh`)
3. Check `!Vault/Clippings/Browser-Clips/` - file should be there
4. Check sync log: `cat ~/.claude/logs/clip-sync.log`

---

## How to Use

### One-Click Clipping

**Just click the icon!**
- Navigate to any web page
- Click purple clip icon
- Done! File saved to Downloads

### View History

To add history to right-click menu, we'll need to add context menu support (Phase 3).

For now, access history by:
1. Going to `chrome://extensions/`
2. Find Quick Obsidian Clipper
3. Click "Details"
4. Scroll to "Extension options"
5. We'll add a button there

Or manually navigate to:
`chrome-extension://[id]/history.html`

---

## File Locations

**Downloaded clips:**
```
~/Downloads/Obsidian-Clips/
├── 2026-01-05--tooltivity-web-clippers.md
├── 2026-01-05--obsidian-clipper-guide.md
└── ...
```

**Synced to vault:**
```
!Vault/Clippings/Browser-Clips/
├── 2026-01-05--tooltivity-web-clippers.md
├── 2026-01-05--obsidian-clipper-guide.md
└── ...
```

**Sync log:**
```
~/.claude/logs/clip-sync.log
```

---

## Troubleshooting

### Extension won't load

**Symptom:** "Service worker (Inactive)" or errors

**Fix:**
```bash
# Clear Chrome cache completely
rm -rf ~/Library/Application\ Support/Google/Chrome/Default/Service\ Worker/ScriptCache
rm -rf ~/Library/Application\ Support/Google/Chrome/Default/Extension\ State

# Restart Chrome completely
killall "Google Chrome"
# Wait 10 seconds
open -a "Google Chrome"
```

### Downloads not appearing

**Check Downloads folder:**
```bash
ls -la ~/Downloads/Obsidian-Clips/
```

**Check Chrome downloads settings:**
- chrome://settings/downloads
- Ensure "Ask where to save each file" is OFF
- Default location should be ~/Downloads

### Sync not working

**Check cron is running:**
```bash
crontab -l | grep obsidian-clip-sync
```

**Run manually to test:**
```bash
~/.claude/scripts/obsidian-clip-sync.sh
cat ~/.claude/logs/clip-sync.log
```

**Check permissions:**
```bash
ls -la ~/.claude/scripts/obsidian-clip-sync.sh
```
Should show `-rwxr-xr-x` (executable)

---

## What Works Now (Phase 1 MVP)

✅ One-click clipping
✅ Smart markdown formatting
✅ Frontmatter with metadata
✅ Title, URL, date extraction
✅ Content cleanup and conversion
✅ Download to ~/Downloads/Obsidian-Clips/
✅ History tracking (all clips logged)
✅ Success/failure tracking
✅ Notifications
✅ Auto-sync to vault (every 5 min)
✅ Beautiful history viewer

---

## Coming Next (Phase 2)

⏳ Archive mode for paywalled sites
⏳ Medium paywall bypass
⏳ Auto-detect content type
⏳ YouTube transcript extraction
⏳ Twitter thread clipping

---

## Need Help?

**Check logs:**
```bash
# Chrome extension console
chrome://extensions/ → Quick Obsidian Clipper → Details → Inspect views: service worker

# Sync log
tail -f ~/.claude/logs/clip-sync.log
```

**Files:**
- `INSTALL-MVP.md` - This file
- `background-simple.js` - Main extension logic
- `manifest.json` - Extension configuration
- `history.html` - History viewer
- `~/.claude/scripts/obsidian-clip-sync.sh` - Sync script

---

**Ready to clip!** 🎉
