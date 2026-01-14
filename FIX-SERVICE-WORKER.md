# Fix "No SW" Service Worker Error

**Status:** Extension stuck at 90% load with "No SW" error

## Problem

Chrome has cached a broken version of the service worker and won't clear it with normal reload. The files are correct but Chrome won't register the service worker.

## Solution: Complete Chrome Reset

### Step 1: Close Chrome Completely
```
1. Quit Chrome (Cmd+Q, not just close windows)
2. Wait 10 seconds
```

### Step 2: Clear Chrome Extension Cache
```bash
# Run this command to clear Chrome's extension cache
rm -rf ~/Library/Application\ Support/Google/Chrome/Default/Service\ Worker/ScriptCache
rm -rf ~/Library/Application\ Support/Google/Chrome/Default/Extension\ State
```

### Step 3: Reopen Chrome & Reload Extension
```
1. Open Chrome
2. Go to chrome://extensions/
3. Find "Quick Obsidian Clipper"
4. Click Remove
5. Click "Load unpacked"
6. Select: /Users/MediaPublishing/My Drive (webonomy@gmail.com)/!Vibe-Coding/Extensions/Extension WebClipperObsidian/quick-obsidian-clipper-extension
```

### Step 4: Verify
```
1. Extension should load to 100%
2. No "No SW" error
3. Purple half-clip icon appears in toolbar
```

## If Still Broken

If the above doesn't work, the path with spaces might be causing issues. Copy the extension to a path without spaces:

```bash
# Copy to simpler path
cp -r "/Users/MediaPublishing/My Drive (webonomy@gmail.com)/!Vibe-Coding/Extensions/Extension WebClipperObsidian/quick-obsidian-clipper-extension" ~/Desktop/quick-obsidian-clipper

# Load from new location
# chrome://extensions/ → Load unpacked → ~/Desktop/quick-obsidian-clipper
```

## What Changed

**Files that are correct:**
- ✅ background.js - restored from working backup
- ✅ content.js - timeout increased to 30s
- ✅ options.css - dropdown styled
- ✅ icons/* - new purple half-clip with transparent background

**The problem:** Chrome's service worker cache, not the files themselves.
