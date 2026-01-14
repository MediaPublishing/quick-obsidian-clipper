# Bulk Clip All Tabs Feature

**Added:** 2026-01-06
**Version:** 2.1.0+
**Status:** ✅ Ready to Use

---

## Overview

The **Bulk Clip All Tabs** feature allows you to clip all open tabs in your current browser window with a single action. Perfect for research sessions where you've opened multiple articles, papers, or resources that you want to save to your Obsidian vault.

---

## How to Use

### Method 1: Context Menu (Right-Click)
1. Right-click anywhere on any page
2. Click **"Clip to Obsidian"** → **"📑 Clip All Tabs in Window"**
3. Extension will clip all tabs automatically

### Method 2: Keyboard Shortcut
- **Windows/Linux:** Press `Ctrl+Shift+A`
- **Mac:** Press `Cmd+Shift+A`

### Method 3: Options Page Button
1. Right-click extension icon → **Options**
2. Click the **"📑 Bulk Clip All Tabs"** button
3. Confirm when prompted

---

## What Gets Clipped

### ✅ Included Tabs
- All regular web pages (http:// and https://)
- YouTube videos (with transcripts if available)
- Paywalled articles (if archive mode enabled)
- Medium articles (if Medium bypass enabled)
- All content types your extension supports

### ❌ Excluded Tabs
- Chrome internal pages (`chrome://...`)
- Extension pages (`chrome-extension://...`)
- New tab pages (`about:blank`)
- Settings pages

### 🔄 Duplicate Detection
- **Automatic:** Skips URLs clipped in the last 5 minutes
- **Smart:** Prevents accidental re-clipping of same content
- **Transparent:** Shows count of duplicates skipped in notification

---

## Features

### 1. Smart Routing
Each tab is clipped using the appropriate method:
- **Paywalled sites** → Archive.ph (if enabled)
- **Medium articles** → Freedium bypass (if enabled)
- **YouTube videos** → Transcript extraction
- **Regular pages** → Standard clipping

### 2. Rate Limiting
- **Speed:** 3 tabs per second (safe, prevents overwhelming servers)
- **Reliable:** Won't trigger rate limits or blocks
- **Efficient:** Faster than clipping manually one-by-one

### 3. Progress Tracking
- **Badge:** Extension icon shows "5/20" progress
- **Color:** Green badge during bulk clip
- **Notifications:**
  - Start: "Clipping 20 tabs..."
  - Complete: "Clipped 18 tabs (2 failed) • 3 duplicates skipped"

### 4. Error Handling
- **Continues on errors:** One failed tab doesn't stop the rest
- **Reports failures:** Shows count of failed clips in notification
- **Logged:** All failures logged to history for review

---

## Example Workflow

**Research Session:**
```
1. Open 15 articles about "AI agents" in browser tabs
2. Press Ctrl+Shift+A (or right-click → Bulk Clip)
3. Wait 5-10 seconds (watch badge for progress)
4. Notification: "Clipped 15 tabs"
5. All articles now in Obsidian-Clips folder
6. Auto-synced to vault within 5 minutes
```

---

## Performance

### Timing
| Number of Tabs | Time to Clip | Rate |
|----------------|--------------|------|
| 5 tabs | ~2 seconds | 3/sec |
| 10 tabs | ~4 seconds | 3/sec |
| 20 tabs | ~7 seconds | 3/sec |
| 50 tabs | ~17 seconds | 3/sec |

**Note:** Archive.ph and Freedium add extra time per tab (~5-10 seconds each)

### Comparison to Manual Clipping
- **Manual:** ~5 seconds per tab (including clicking icon, waiting)
- **Bulk:** ~0.33 seconds per tab (3 tabs/sec)
- **Speedup:** ~15x faster

---

## Technical Details

### Duplicate Detection Window
- **Time window:** 5 minutes
- **Reason:** Prevents accidental re-clips during research session
- **Customization:** Not user-configurable (yet)

### Processing Order
1. Get all tabs in current window
2. Filter out invalid tabs (chrome://, extensions, etc.)
3. Check against recently clipped URLs (last 5 min)
4. Process remaining tabs with rate limiter
5. Show summary notification

### Smart Features
- **Respects settings:** Uses your archive mode, Medium bypass settings
- **Error resilient:** Continues even if some tabs fail
- **History logged:** Creates bulk-clip-tabs entry in history
- **Badge indicator:** Real-time progress display

---

## Advanced Usage

### Selective Bulk Clipping
**Want to clip only some tabs?**
1. Close tabs you don't want to clip
2. Use bulk clip on remaining tabs
3. Reopen closed tabs from history if needed

**Or use browser tab groups:**
1. Group tabs you want to clip
2. Open group in new window
3. Use bulk clip in that window
4. Close window when done

### Batch Processing Large Tab Sets
**For 100+ tabs:**
1. Split into multiple windows (~20 tabs each)
2. Bulk clip each window separately
3. Prevents overwhelming the system
4. Easier to track progress

---

## Troubleshooting

### Problem: "No Valid Tabs"
**Cause:** All tabs are chrome:// or extension pages
**Solution:** Open some regular web pages first

### Problem: "All Tabs Already Clipped"
**Cause:** You clipped these tabs in the last 5 minutes
**Solution:** Wait 5 minutes or manually clip individual tabs

### Problem: Some tabs failed to clip
**Cause:** Network errors, page access restrictions, etc.
**Solution:** Check notification for failure count, manually clip failed tabs

### Problem: Takes too long
**Cause:** Many archive.ph or Freedium tabs (each adds 5-10 sec)
**Solution:** Temporarily disable archive/Medium bypass in settings

---

## Settings Impact

### Archive Mode (ON)
- **Effect:** Paywalled tabs take 2-10 seconds each
- **Example:** 10 NYT articles = ~60 seconds total
- **Recommendation:** Worth it for full content

### Medium Bypass (ON)
- **Effect:** Medium tabs take 4-7 seconds each
- **Example:** 5 Medium articles = ~25 seconds total
- **Recommendation:** Worth it for full articles

### Twitter Sync (No Impact)
- **Effect:** Bulk clip doesn't interfere with Twitter sync
- **Note:** Both can run simultaneously

---

## History Entry

Bulk clip operations create a special history entry:

```json
{
  "type": "bulk-clip-tabs",
  "timestamp": "2026-01-06T15:30:00.000Z",
  "tabsFound": 25,
  "validTabs": 22,
  "duplicatesSkipped": 3,
  "clipped": 18,
  "failed": 1,
  "status": "success"
}
```

**View in:** Options page → View Full History

---

## Tips & Best Practices

### 📌 Before Bulk Clip
1. **Review tabs:** Close any you don't need
2. **Check settings:** Enable archive/Medium if needed
3. **Close other windows:** Focus on one research topic

### 📌 During Bulk Clip
1. **Watch badge:** Monitor progress (e.g., "15/20")
2. **Don't close window:** Let it finish
3. **Be patient:** Large batches take time

### 📌 After Bulk Clip
1. **Check notification:** Note any failures
2. **Review in Obsidian:** Files in Obsidian-Clips folder
3. **Wait for sync:** Auto-syncs to vault in ~5 minutes
4. **Close tabs:** Clear your browser tabs if desired

---

## Limitations

### Current Limitations
- **Window-only:** Clips current window, not all windows
  - **Reason:** Prevents accidental clipping of unrelated tabs
  - **Workaround:** Move tabs to same window first

- **Sequential processing:** One tab at a time
  - **Reason:** Rate limiting, prevents server overload
  - **Performance:** Still 15x faster than manual

- **5-minute duplicate window:** Fixed duration
  - **Reason:** Balances freshness vs. re-clipping
  - **Workaround:** None currently (future enhancement)

### Browser Limitations
- **Chrome only:** Not tested on Firefox/Safari
- **Tab API required:** Won't work in mobile browsers
- **Memory:** Large tab sets (100+) may slow down

---

## Future Enhancements

### Planned Features
1. **Configurable duplicate window** (5min → 1hr → 24hr)
2. **Tab group support** (clip only selected group)
3. **Parallel processing** (clip multiple tabs simultaneously)
4. **Pre-flight check** (estimate time before starting)
5. **Pause/resume** (pause bulk clip mid-process)
6. **Selective clip** (choose which tabs via checkbox UI)

### Under Consideration
- **Cross-window bulk clip** (all windows at once)
- **Scheduled bulk clip** (clip all tabs at specific time)
- **Regex URL filter** (clip only tabs matching pattern)
- **Domain grouping** (group clips by domain/topic)

---

## FAQ

**Q: Will it close my tabs after clipping?**
A: No, tabs remain open. You can close them manually if desired.

**Q: Can I clip tabs from all windows?**
A: Not yet. Currently clips only the current window. Move tabs to one window first.

**Q: What if I have 200+ tabs open?**
A: Works, but will take time (~1 minute). Consider splitting into multiple windows.

**Q: Does it respect my archive/Medium settings?**
A: Yes! Each tab is clipped using your configured settings.

**Q: Can I see which tabs failed?**
A: Check the notification for failure count. Individual failures are logged to history.

**Q: Will it skip tabs I already clipped?**
A: Yes, automatically skips URLs clipped in the last 5 minutes.

---

## Keyboard Shortcuts Summary

| Action | Windows/Linux | Mac |
|--------|---------------|-----|
| Clip current page | `Ctrl+Shift+S` | `Cmd+Shift+S` |
| Clip selection | `Ctrl+Shift+C` | `Cmd+Shift+C` |
| **Bulk clip tabs** | **`Ctrl+Shift+A`** | **`Cmd+Shift+A`** |

**Customize:** chrome://extensions/shortcuts

---

## Conclusion

The Bulk Clip All Tabs feature transforms your research workflow by:
- ✅ **Saving time:** 15x faster than manual clipping
- ✅ **Reducing effort:** One action instead of 20+ clicks
- ✅ **Preventing duplicates:** Smart detection
- ✅ **Respecting settings:** Uses your configured preferences
- ✅ **Providing feedback:** Clear progress and results

**Perfect for:**
- Research sessions with multiple sources
- Conference/course reading lists
- Competitive analysis (multiple competitor sites)
- News aggregation (morning reading queue)
- Reference collection (documentation, tutorials)

---

**Ready to try it? Open some tabs and press `Ctrl+Shift+A`!** 🚀

---

*Bulk Clip All Tabs - Added in v2.1.0 - 2026-01-06*
