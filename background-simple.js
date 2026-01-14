// Simple, reliable background script for Quick Obsidian Clipper
// Phase 1 MVP: Downloads folder + history tracking
// Phase 2: Advanced features + rate limiting

console.log('Quick Obsidian Clipper - Background script loaded');

// Import rate limiter utility (will be injected dynamically)
let RateLimiter = null;
const rateLimiterReady = import('./rate-limiter.js')
  .then(module => {
    RateLimiter = module.RateLimiter || window.RateLimiter;
    console.log('Rate limiter loaded');
  })
  .catch(error => {
    console.warn('Rate limiter not available:', error);
  });

// Bulk clip state for status popup
let bulkClipState = {};
let bulkClipPopupId = null;

// Default settings
const DEFAULT_SETTINGS = {
  saveLocation: 'Obsidian-Clips',
  customDownloadPath: '',  // User-configured download path (empty = use Chrome default)
  notifications: true,
  trackHistory: true,
  showClippedBadge: true,  // Show indicator when page has been clipped
  autoArchive: false,  // User enables and manages site list
  bypassMedium: false,  // User enables manually
  archiveSites: [       // User-editable list of sites to route through archive.ph
    'nytimes.com',
    'newyorker.com',
    'washingtonpost.com',
    'ft.com',
    'wsj.com',
    'forbes.com',
    'economist.com',
    'bloomberg.com',
    'theatlantic.com',
    'wired.com',
    'theinformation.com',
    'barrons.com',
    'telegraph.co.uk',
    'thetimes.co.uk',
    'foreignpolicy.com',
    'hbr.org',
    'scientificamerican.com',
    'newscientist.com',
    'businessinsider.com',
    'visualcapitalist.com',
    'seekingalpha.com'
  ],
  actualDownloadPath: null,  // Will be detected on first download
  twitterBookmarkSync: {
    enabled: false,
    autoSyncInterval: 30,  // Minutes
    syncedTweetIds: [],
    lastSyncTimestamp: null,
    totalBookmarksFound: 0,
    totalNewlySynced: 0,
    syncInProgress: false
  }
};

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed/updated');

  // Merge existing settings with defaults (ensures new properties are added)
  chrome.storage.local.get(['settings'], (result) => {
    const existingSettings = result.settings || {};
    // Merge defaults with existing settings (existing values take precedence)
    const mergedSettings = { ...DEFAULT_SETTINGS, ...existingSettings };

    // Ensure nested objects are also merged
    if (existingSettings.twitterBookmarkSync) {
      mergedSettings.twitterBookmarkSync = {
        ...DEFAULT_SETTINGS.twitterBookmarkSync,
        ...existingSettings.twitterBookmarkSync
      };
    }

    chrome.storage.local.set({ settings: mergedSettings }, () => {
      console.log('Settings initialized/updated:', mergedSettings);
      // Set up Twitter auto-sync alarm if enabled
      setupAutoSyncAlarm();
    });
  });
});

// Also set up alarm when service worker starts (in case it was terminated)
chrome.runtime.onStartup.addListener(() => {
  console.log('Service worker started - setting up alarms');
  setupAutoSyncAlarm();
});

// Ensure alarms are set up immediately when service worker loads
// This handles the case where the worker was terminated and restarted
(async function initializeServiceWorker() {
  console.log('Service worker initializing...');

  try {
    // 1. Check and set up alarms
    const alarm = await chrome.alarms.get('twitterBookmarkAutoSync');
    if (!alarm) {
      console.log('No existing alarm found, setting up auto-sync alarm...');
      await setupAutoSyncAlarm();
    } else {
      console.log('Existing alarm found:', alarm);
    }

    // 2. Clear any stale sync locks (if service worker was terminated during sync)
    const result = await chrome.storage.local.get(['settings']);
    const settings = result.settings || {};
    const syncSettings = settings.twitterBookmarkSync;

    if (syncSettings?.syncInProgress) {
      const lockTime = syncSettings.syncLockTimestamp ? new Date(syncSettings.syncLockTimestamp).getTime() : 0;
      const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);

      if (lockTime < fiveMinutesAgo) {
        console.warn('Clearing stale sync lock from previous session');
        syncSettings.syncInProgress = false;
        syncSettings.syncLockTimestamp = null;
        settings.twitterBookmarkSync = syncSettings;
        await chrome.storage.local.set({ settings });
      }
    }
  } catch (e) {
    console.warn('Failed during service worker initialization:', e);
  }
})();

// Listen for clip requests from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received:', message.type);

  if (message.type === 'CONTENT_EXTRACTED') {
    const tabId = sender.tab?.id;

    if (tabId && (message.data?.source === 'perplexity' || isPerplexitySite(sender.tab?.url || ''))) {
      clearPerplexityFallback(tabId);
    }

    // Check if this is a pending extraction from archive/medium handler
    if (tabId && pendingExtractions.has(tabId)) {
      const pending = pendingExtractions.get(tabId);
      // Use the original URL instead of archive.ph/freedium URL
      if (pending.originalUrl) {
        message.data.url = pending.originalUrl;
      }
      pending.resolve(message.data);
    }

    handleContentExtracted(message.data, sender.tab)
      .then(result => sendResponse({ success: true, ...result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }

  if (message.type === 'GET_SETTINGS') {
    chrome.storage.local.get(['settings'], (result) => {
      sendResponse(result.settings || DEFAULT_SETTINGS);
    });
    return true;
  }

  if (message.type === 'SYNC_TWITTER_BOOKMARKS') {
    handleTwitterBookmarkSync()
      .then(result => sendResponse({ success: true, ...result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (message.type === 'BOOKMARKS_SCRAPED') {
    handleBookmarksScraped(message.data)
      .then(result => sendResponse({ success: true, ...result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (message.type === 'BOOKMARKS_SCRAPE_FAILED') {
    console.error('Bookmark scrape failed:', message.error);
    showNotification('Bookmark Sync Failed', message.error, 'icons/icon48.png');
    sendResponse({ success: false, error: message.error });
    return true;
  }

  if (message.type === 'BOOKMARK_SCRAPE_PROGRESS') {
    console.log('Scrape progress:', message.data);
    // Could update badge or send to options page
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'UPDATE_TWITTER_SYNC_SETTINGS') {
    updateTwitterSyncSettings(message.data)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (message.type === 'RESET_TWITTER_SYNC_TRACKING') {
    resetTwitterSyncTracking()
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (message.type === 'BULK_CLIP_TABS') {
    handleBulkClipTabs(message.windowId)
      .then(result => sendResponse({ success: true, ...result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (message.type === 'GET_BULK_CLIP_STATE') {
    sendResponse({ state: bulkClipState });
    return true;
  }

  // Handle Perplexity status updates
  if (message.type === 'PERPLEXITY_STATUS') {
    console.log('Perplexity status:', message.status);
    if (sender.tab?.id) {
      clearPerplexityFallback(sender.tab.id);
    }
    if (message.status === 'download_triggered') {
      showNotification(
        'Perplexity Export',
        'Download triggered - check your Downloads folder.',
        'icons/icon48.png'
      );
    }
    sendResponse({ success: true });
    return true;
  }

  // Handle clip errors from handlers
  if (message.type === 'CLIP_ERROR') {
    console.error('Clip error:', message.error);
    if (sender.tab?.id && isPerplexitySite(sender.tab?.url || '')) {
      clearPerplexityFallback(sender.tab.id);
    }
    showNotification('Clipping Failed', message.error, 'icons/icon48.png');
    sendResponse({ success: false, error: message.error });
    return true;
  }

  // Handle re-clip request from history page
  if (message.type === 'CLIP_TAB') {
    const tabId = message.tabId;
    if (tabId) {
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError) {
          console.error('Failed to get tab:', chrome.runtime.lastError);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
          return;
        }
        console.log('Re-clipping tab:', tab.url);
        handleClip(tab)
          .then(() => sendResponse({ success: true }))
          .catch(error => {
            console.error('Re-clip failed:', error);
            sendResponse({ success: false, error: error.message });
          });
      });
    } else {
      sendResponse({ success: false, error: 'No tab ID provided' });
    }
    return true;
  }
});

// Handle extracted content
async function handleContentExtracted(data, tab) {
  console.log('Processing content from:', data.url);

  try {
    // Check for duplicate URL (clipped within last 24 hours)
    const duplicateInfo = await checkForDuplicateUrl(data.url);
    if (duplicateInfo.isDuplicate) {
      console.log('Duplicate URL detected:', data.url);

      // Show badge on extension icon
      const tabId = tab?.id || null;
      showDuplicateBadge(tabId);

      // Also show notification
      showNotification(
        'Already Clipped',
        `This URL was clipped ${duplicateInfo.timeAgo}. Clipping again...`,
        'icons/icon48.png'
      );
    }

    // Clean up YouTube content if applicable
    const cleanedData = cleanYouTubeContent(data);

    // Create markdown content
    const markdown = createMarkdown(cleanedData);

    // Create filename
    const filename = createFilename(data.title);

    // Get settings
    const settings = await getSettings();

    // Download file
    const downloadId = await downloadFile(markdown, filename, settings.saveLocation);

    // Log to history
    await logToHistory({
      url: data.url,
      title: data.title,
      filename: filename,
      timestamp: new Date().toISOString(),
      status: 'success',
      downloadId: downloadId
    });

    // Show notification
    if (settings.notifications) {
      showNotification('Clipped Successfully', `Saved: ${data.title}`, 'icons/icon48.png');
    }

    // Show clipped badge on this tab (replaces any duplicate badge)
    if (tab?.id) {
      showClippedBadge(tab.id);
    }

    return { filename, downloadId };

  } catch (error) {
    console.error('Clipping failed:', error);

    // Log failure to history
    await logToHistory({
      url: data.url,
      title: data.title,
      timestamp: new Date().toISOString(),
      status: 'failed',
      error: error.message
    });

    // Show error notification
    showNotification('Clipping Failed', error.message, 'icons/icon48.png');

    throw error;
  }
}

// Post-process YouTube content to clean up transcripts and fix duplicates
function cleanYouTubeContent(data) {
  if (!data.url?.includes('youtube.com') && !data.url?.includes('youtu.be')) {
    return data;
  }

  let content = data.content || '';

  // Remove timestamp patterns from transcript: [0:00], [1:23], **[0:00]**, etc.
  content = content.replace(/\*?\*?\[?\d{1,2}:\d{2}(?::\d{2})?\]?\*?\*?\s*/g, '');

  // Remove duplicate Description sections (keep only the first one)
  const descriptionMatches = content.match(/## Description\n\n[\s\S]*?(?=\n## |\n---|\n$)/g);
  if (descriptionMatches && descriptionMatches.length > 1) {
    // Keep only the first description section
    for (let i = 1; i < descriptionMatches.length; i++) {
      content = content.replace(descriptionMatches[i], '');
    }
  }

  // Clean up Transcript section - convert to flowing paragraph text
  const transcriptMatch = content.match(/## Transcript\n\n([\s\S]*?)(?=\n## |\n---\n|$)/);
  if (transcriptMatch) {
    let transcript = transcriptMatch[1];

    // Remove any remaining timestamp-like patterns
    transcript = transcript.replace(/\*?\*?\[?\d{1,2}:\d{2}(?::\d{2})?\]?\*?\*?\s*/g, '');

    // Remove excessive newlines and normalize to paragraph text
    transcript = transcript
      .replace(/\n{3,}/g, '\n\n')  // Max 2 newlines
      .replace(/\n\n/g, ' ')       // Convert double newlines to spaces
      .replace(/\n/g, ' ')         // Convert single newlines to spaces
      .replace(/\s{2,}/g, ' ')     // Normalize multiple spaces
      .trim();

    // Replace the transcript section with cleaned version
    content = content.replace(
      /## Transcript\n\n[\s\S]*?(?=\n## |\n---\n|$)/,
      `## Transcript\n\n${transcript}\n\n`
    );
  }

  // Remove empty sections
  content = content.replace(/## \w+\n\n(?=## |---)/g, '');

  // Clean up multiple consecutive separators
  content = content.replace(/(---\n\n){2,}/g, '---\n\n');

  return { ...data, content };
}

// Create markdown content
function createMarkdown(data) {
  const date = new Date().toISOString().split('T')[0];
  const now = new Date().toLocaleString();

  // Calculate reading stats
  const stats = calculateReadingStats(data.content);

  // Determine content type
  const contentType = data.selectionOnly ? 'selection' :
                      data.imageOnly ? 'image' :
                      data.url.includes('youtube.com') ? 'video' :
                      'article';

  const frontmatter = `---
title: "${escapeQuotes(data.title)}"
source: web-clip
url: "${data.url}"
date_saved: ${date}
date_published: ${data.published || ''}
author: ${data.author ? JSON.stringify(data.author) : '[]'}
type: ${contentType}
word_count: ${stats.wordCount}
reading_time: ${stats.readingTime}
tags:
  - clipping/web
  - to-process
---

`;

  const body = `# ${data.title}

**URL:** ${data.url}
**Saved:** ${now}
${stats.wordCount > 0 ? `**Words:** ${stats.wordCount} (~${stats.readingTime} min read)\n` : ''}
${data.description ? `**Description:** ${data.description}\n\n` : ''}${data.author ? `**Author:** ${Array.isArray(data.author) ? data.author.join(', ') : data.author}\n\n` : ''}---

${data.content}

---

## Notes

<!-- Add your thoughts here -->
`;

  return frontmatter + body;
}

// Calculate word count and reading time
function calculateReadingStats(content) {
  if (!content || typeof content !== 'string') {
    return { wordCount: 0, readingTime: 0 };
  }

  // Remove markdown syntax for accurate word count
  const plainText = content
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/`[^`]+`/g, '') // Remove inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Extract link text
    .replace(/[#*_~`]/g, '') // Remove markdown formatting
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  const wordCount = plainText.split(/\s+/).filter(word => word.length > 0).length;

  // Average reading speed: 200 words per minute
  const readingTime = Math.ceil(wordCount / 200);

  return {
    wordCount,
    readingTime: readingTime || 1 // Minimum 1 minute
  };
}

// Create filename from title
function createFilename(title) {
  const date = new Date().toISOString().split('T')[0];

  // Sanitize title for filename
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric with dash
    .replace(/^-|-$/g, '')         // Remove leading/trailing dashes
    .substring(0, 50);              // Limit length

  return `${date}--${slug}.md`;
}

// Download file using Chrome downloads API
async function downloadFile(content, filename, folder) {
  // Check if custom download path is configured
  const settings = await getSettings();
  let downloadPath;

  if (settings.customDownloadPath && settings.customDownloadPath.trim()) {
    // Use custom path - append folder name to the custom base path
    // Custom path should be the full path to where clips should go
    // We'll put files directly in the custom path without adding the folder
    downloadPath = filename;

    console.log('Using custom download path:', settings.customDownloadPath);

    // Note: We can't directly specify an absolute path in Chrome downloads API,
    // but we store it for the sync script to use. The actual download goes to
    // Chrome's download folder with our folder structure.
    downloadPath = `${folder}/${filename}`;
  } else {
    // Use default folder name (relative to Chrome downloads folder)
    downloadPath = `${folder}/${filename}`;
  }

  return new Promise((resolve, reject) => {
    // Use data URL instead of blob URL (service workers don't support URL.createObjectURL)
    const dataUrl = 'data:text/markdown;charset=utf-8,' + encodeURIComponent(content);

    chrome.downloads.download({
      url: dataUrl,
      filename: downloadPath,
      saveAs: false,  // Auto-save, no dialog (but Chrome still shows notification)
      conflictAction: 'uniquify'  // Auto-rename if exists
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        console.log('Downloaded with ID:', downloadId);

        // Wait a moment for Chrome to populate the download item, then get the path
        setTimeout(() => {
          chrome.downloads.search({ id: downloadId }, (items) => {
            if (items && items.length > 0) {
              const fullPath = items[0].filename;
              console.log('Full download path:', fullPath);

              // Extract the base directory (everything before the filename)
              const pathParts = fullPath.split('/');
              pathParts.pop(); // Remove filename
              const basePath = pathParts.join('/');

              console.log('Base download directory:', basePath);

              // Store the actual download location in settings
              chrome.storage.local.get(['settings'], (result) => {
                const settings = result.settings || DEFAULT_SETTINGS;
                if (settings.actualDownloadPath !== basePath) {
                  settings.actualDownloadPath = basePath;
                  chrome.storage.local.set({ settings }, () => {
                    console.log('Updated actualDownloadPath:', basePath);
                  });

                  // Also store in a dedicated key for easy access by sync script
                  chrome.storage.local.set({
                    clipperDownloadPath: basePath
                  }, () => {
                    console.log('Stored download path for sync script access');
                  });
                }
              });
            } else {
              console.warn('Could not find download item:', downloadId);
            }
          });
        }, 500); // Wait 500ms for Chrome to populate the download info

        resolve(downloadId);
      }
    });
  });
}

// Log clip to history
async function logToHistory(clipData) {
  return new Promise((resolve) => {
    chrome.storage.local.get(['clippingHistory'], (result) => {
      const history = result.clippingHistory || [];

      // Add to beginning of array
      history.unshift(clipData);

      // Keep last 500 clips
      if (history.length > 500) {
        history.length = 500;
      }

      chrome.storage.local.set({ clippingHistory: history }, () => {
        console.log('Logged to history:', clipData.title);
        resolve();
      });
    });
  });
}

// Check if URL was recently clipped (within last 24 hours)
async function checkForDuplicateUrl(url) {
  return new Promise((resolve) => {
    chrome.storage.local.get(['clippingHistory'], (result) => {
      const history = result.clippingHistory || [];
      const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);

      // Normalize URL for comparison (remove tracking params, trailing slash, www)
      const normalizeUrl = (u) => {
        // Handle undefined/null/empty URLs
        if (!u || typeof u !== 'string') return '';
        try {
          const parsed = new URL(u);

          // Remove tracking/marketing parameters
          const trackingParams = [
            // UTM parameters
            'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
            'utm_id', 'utm_source_platform', 'utm_creative_format', 'utm_marketing_tactic',
            // Facebook/Meta
            'fbclid', 'fb_action_ids', 'fb_action_types', 'fb_source', 'fb_ref',
            // Google
            'gclid', 'gclsrc', 'dclid', 'gbraid', 'wbraid',
            // Twitter/X
            'twclid', 's', 't', // Twitter uses 's' and 't' for tracking
            // Microsoft/Bing
            'msclkid',
            // Other common trackers
            'mc_cid', 'mc_eid', // Mailchimp
            'ref', 'ref_src', 'ref_url', // Generic referrer
            '_ga', '_gl', // Google Analytics
            'yclid', // Yandex
            'igshid', // Instagram
            'si', // Spotify/YouTube
            'feature', // YouTube
            'pp', // PayPal
            'trk', 'trkInfo', // LinkedIn
            'sc_campaign', 'sc_channel', 'sc_content', 'sc_medium', 'sc_outcome', 'sc_geo', 'sc_country', // Snapchat
            'vero_id', 'vero_conv', // Vero
            'spm', 'scm', // Alibaba
            '_branch_match_id', // Branch
            'mkt_tok', // Marketo
            'elqTrackId', 'elqTrack', // Eloqua
            'assetType', 'assetId', // Adobe
          ];

          // Remove tracking parameters
          trackingParams.forEach(param => {
            parsed.searchParams.delete(param);
          });

          // Build normalized URL: hostname (without www) + pathname (without trailing slash) + cleaned search params
          const hostname = parsed.hostname.replace(/^www\./, '');
          const pathname = parsed.pathname.replace(/\/$/, '');
          const search = parsed.searchParams.toString();

          let normalized = hostname + pathname;
          if (search) {
            normalized += '?' + search;
          }

          return normalized.toLowerCase();
        } catch {
          return u.toLowerCase();
        }
      };

      const normalizedUrl = normalizeUrl(url);

      // Skip if we couldn't normalize the input URL
      if (!normalizedUrl) {
        resolve({ isDuplicate: false });
        return;
      }

      // Find recent clip of this URL
      const recentClip = history.find(clip => {
        if (clip.status !== 'success') return false;
        if (!clip.url) return false; // Skip clips without URL
        const clipTime = new Date(clip.timestamp).getTime();
        if (clipTime < twentyFourHoursAgo) return false;
        const clipNormalized = normalizeUrl(clip.url);
        return clipNormalized && clipNormalized === normalizedUrl;
      });

      if (recentClip) {
        const clipTime = new Date(recentClip.timestamp).getTime();
        const timeDiff = Date.now() - clipTime;
        let timeAgo;

        if (timeDiff < 60000) {
          timeAgo = 'just now';
        } else if (timeDiff < 3600000) {
          const minutes = Math.floor(timeDiff / 60000);
          timeAgo = `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        } else {
          const hours = Math.floor(timeDiff / 3600000);
          timeAgo = `${hours} hour${hours > 1 ? 's' : ''} ago`;
        }

        resolve({ isDuplicate: true, timeAgo, previousClip: recentClip });
      } else {
        resolve({ isDuplicate: false });
      }
    });
  });
}

// Get settings
function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['settings'], (result) => {
      resolve(result.settings || DEFAULT_SETTINGS);
    });
  });
}

// Show notification
function showNotification(title, message, iconUrl) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: iconUrl,
    title: title,
    message: message,
    priority: 1
  });
}

// Show badge on extension icon (for duplicates, errors, etc.)
function showBadge(text, color, tabId = null) {
  console.log('Showing badge:', text, 'color:', color, 'tabId:', tabId);

  // Set badge text and color
  if (tabId && typeof tabId === 'number') {
    // Show badge only on specific tab
    chrome.action.setBadgeText({ text: String(text), tabId: tabId });
    chrome.action.setBadgeBackgroundColor({ color: color, tabId: tabId });
  } else {
    // Show badge globally (on all tabs)
    chrome.action.setBadgeText({ text: String(text) });
    chrome.action.setBadgeBackgroundColor({ color: color });
  }

  // Clear badge after 5 seconds
  setTimeout(() => {
    if (tabId && typeof tabId === 'number') {
      chrome.action.setBadgeText({ text: '', tabId: tabId }).catch(() => {});
    } else {
      chrome.action.setBadgeText({ text: '' }).catch(() => {});
    }
  }, 5000);
}

// Show duplicate badge on extension icon
function showDuplicateBadge(tabId = null) {
  // Use "2x" as badge text (shorter and clearer than "DUP")
  showBadge('2x', [255, 107, 0, 255], tabId); // Orange badge - RGBA array format
}

// Show "clipped" badge (green checkmark) - persistent until tab changes
function showClippedBadge(tabId) {
  if (!tabId || typeof tabId !== 'number') return;

  console.log('Showing clipped badge for tab:', tabId);

  // Use a green checkmark to indicate this page was clipped
  chrome.action.setBadgeText({ text: '✓', tabId: tabId }).catch(() => {});
  chrome.action.setBadgeBackgroundColor({ color: [0, 200, 100, 255], tabId: tabId }).catch(() => {}); // Green
}

// Clear badge for a specific tab
function clearBadge(tabId) {
  if (!tabId || typeof tabId !== 'number') return;
  chrome.action.setBadgeText({ text: '', tabId: tabId }).catch(() => {});
}

// Check if URL was clipped (any time in history) and show badge
async function checkAndShowClippedBadge(tabId, url) {
  if (!tabId || !url) return;

  // Skip non-http URLs
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    clearBadge(tabId);
    return;
  }

  try {
    const settings = await getSettings();

    // Check if badge feature is enabled
    if (!settings.showClippedBadge) {
      clearBadge(tabId);
      return;
    }

    const result = await chrome.storage.local.get(['clippingHistory']);
    const history = result.clippingHistory || [];

    // Normalize URL for comparison
    const normalizeUrl = (u) => {
      if (!u || typeof u !== 'string') return '';
      try {
        const parsed = new URL(u);
        const trackingParams = [
          'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
          'utm_id', 'fbclid', 'gclid', 'twclid', 'msclkid', 'ref', 'si', 'feature'
        ];
        trackingParams.forEach(param => parsed.searchParams.delete(param));
        const hostname = parsed.hostname.replace(/^www\./, '');
        const pathname = parsed.pathname.replace(/\/$/, '');
        const search = parsed.searchParams.toString();
        let normalized = hostname + pathname;
        if (search) normalized += '?' + search;
        return normalized.toLowerCase();
      } catch {
        return u.toLowerCase();
      }
    };

    const normalizedUrl = normalizeUrl(url);
    if (!normalizedUrl) {
      clearBadge(tabId);
      return;
    }

    // Check if this URL exists in history (successful clips only)
    const wasClipped = history.some(clip => {
      if (clip.status !== 'success') return false;
      if (!clip.url) return false;
      const clipNormalized = normalizeUrl(clip.url);
      return clipNormalized && clipNormalized === normalizedUrl;
    });

    if (wasClipped) {
      showClippedBadge(tabId);
    } else {
      clearBadge(tabId);
    }
  } catch (e) {
    console.warn('Error checking clipped status:', e);
    clearBadge(tabId);
  }
}

// Listen for tab activation to show clipped badge
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url) {
      await checkAndShowClippedBadge(activeInfo.tabId, tab.url);
    }
  } catch (e) {
    console.warn('Error in tab activation handler:', e);
  }
});

// Listen for tab URL changes to update clipped badge
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only check when URL changes or page finishes loading
  if (changeInfo.url || changeInfo.status === 'complete') {
    try {
      if (tab.url) {
        await checkAndShowClippedBadge(tabId, tab.url);
      }
    } catch (e) {
      console.warn('Error in tab update handler:', e);
    }
  }
});

// Utility: Escape quotes in strings
function escapeQuotes(str) {
  return str.replace(/"/g, '\\"');
}

// Handle extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  console.log('Extension icon clicked on:', tab.url);

  const settings = await getSettings();

  try {
    // Check if this is a paywalled site that needs archiving
    if (settings.autoArchive && shouldArchive(tab.url, settings.archiveSites)) {
      await handlePaywalledSite(tab);
      return;
    }

    // Check if this is a Medium article that needs bypass
    if (settings.bypassMedium && isMediumSite(tab.url)) {
      await handleMediumArticle(tab);
      return;
    }

    // Check if this is a YouTube video
    if (isYouTubeSite(tab.url)) {
      await handleYouTubeVideo(tab);
      return;
    }

    // Check if this is a Twitter/X page
    if (isTwitterSite(tab.url)) {
      await handleTwitterPage(tab);
      return;
    }

    // Check if this is a Perplexity page
    if (isPerplexitySite(tab.url)) {
      await handlePerplexityPage(tab);
      return;
    }

    // Regular clipping
    await injectContentScript(tab.id);

  } catch (error) {
    console.error('Failed to clip:', error);
    showNotification('Clipping Failed', 'Could not access page content', 'icons/icon48.png');
  }
});

// Helper: Check if URL is a paywalled site
// Helper: Check if URL is in user's archive sites list
function shouldArchive(url, archiveSites) {
  // Use provided list or fallback to default
  const sites = archiveSites || DEFAULT_SETTINGS.archiveSites;
  return sites.some(site => url.includes(site));
}

// Helper: Check if URL is Medium
function isMediumSite(url) {
  const mediumDomains = [
    'medium.com',
    'towardsdatascience.com',
    'betterprogramming.pub',
    'levelup.gitconnected.com',
    'javascript.plainenglish.io',
    'python.plainenglish.io',
    'blog.devgenius.io',
    'uxplanet.org'
  ];
  return mediumDomains.some(domain => url.includes(domain));
}

// Helper: Check if URL is YouTube
function isYouTubeSite(url) {
  return url.includes('youtube.com/watch') ||
         url.includes('youtube.com/shorts') ||
         url.includes('youtu.be/');
}

// Helper: Check if URL is Twitter/X
function isTwitterSite(url) {
  return url.includes('twitter.com/') ||
         url.includes('x.com/');
}

// Helper: Check if URL is Perplexity
function isPerplexitySite(url) {
  return url.includes('perplexity.ai');
}

// Handle Perplexity page clipping
async function handlePerplexityPage(tab) {
  console.log('Handling Perplexity page:', tab.url);

  try {
    // Inject perplexity-handler.js to trigger native export or DOM extraction
    const injected = await injectScriptFilesWithFallback(
      tab.id,
      ['src/handlers/perplexity-handler.js'],
      ['perplexity-handler.js'],
      'Perplexity handler'
    );

    if (!injected) {
      console.warn('Perplexity handler unavailable, falling back to general extraction.');
      await injectContentScript(tab.id);
      return;
    }

    console.log('Perplexity handler injected');
    schedulePerplexityFallback(tab.id);
  } catch (error) {
    console.error('Failed to inject Perplexity handler:', error);

    // Fallback: show user instructions
    showNotification(
      'Perplexity Clipping',
      'Use Perplexity\'s Share menu → Copy as Markdown, then clip again.',
      'icons/icon48.png'
    );
    try {
      await injectContentScript(tab.id);
    } catch (injectError) {
      console.warn('Perplexity fallback injection failed:', injectError);
    }
  }
}

// Helper: Inject content script
async function injectContentScript(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['content.js']
  });
  console.log('Content script injected');
}

async function tryInjectScriptFiles(tabId, files, label) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files
    });
    return true;
  } catch (error) {
    console.warn(`${label} injection failed:`, error);
    return false;
  }
}

async function injectScriptFilesWithFallback(tabId, primaryFiles, fallbackFiles, label) {
  const injectedPrimary = await tryInjectScriptFiles(tabId, primaryFiles, label);
  if (injectedPrimary || !fallbackFiles?.length) {
    return injectedPrimary;
  }

  return tryInjectScriptFiles(tabId, fallbackFiles, `${label} (fallback)`);
}

// Track pending extractions by tab ID
const pendingExtractions = new Map();
const perplexityFallbackTimers = new Map();

function clearPerplexityFallback(tabId) {
  const timer = perplexityFallbackTimers.get(tabId);
  if (timer) {
    clearTimeout(timer);
    perplexityFallbackTimers.delete(tabId);
  }
}

function schedulePerplexityFallback(tabId, timeoutMs = 12000) {
  clearPerplexityFallback(tabId);

  const timer = setTimeout(async () => {
    perplexityFallbackTimers.delete(tabId);
    try {
      console.warn('Perplexity handler timed out, falling back to general extraction.');
      await injectContentScript(tabId);
    } catch (error) {
      console.warn('Perplexity fallback injection failed:', error);
    }
  }, timeoutMs);

  perplexityFallbackTimers.set(tabId, timer);
}

// Helper: Handle CAPTCHA on archive.ph - detect, try auto-click, wait for manual if needed
async function handleArchiveCaptcha(tabId) {
  let captchaDetected = await isArchiveCaptchaPage(tabId);

  if (!captchaDetected) {
    return true; // No CAPTCHA, success
  }

  console.log('CAPTCHA detected on archive.ph, attempting auto-click...');

  // Try to auto-click the CAPTCHA checkbox first
  const autoClickResult = await tryAutoClickCaptcha(tabId);

  if (autoClickResult?.clicked) {
    console.log('Auto-clicked CAPTCHA element:', autoClickResult.type);
    await sleep(3000);
    captchaDetected = await isArchiveCaptchaPage(tabId);
  }

  // If still showing CAPTCHA, bring to front for manual solving
  if (captchaDetected) {
    console.log('CAPTCHA requires manual solving...');

    // Bring tab to front
    await chrome.tabs.update(tabId, { active: true });

    // Show notification
    showNotification(
      'CAPTCHA Required',
      'Please solve the archive.ph security check.',
      'icons/icon48.png'
    );

    // Poll until CAPTCHA is solved (up to 2 minutes)
    const maxWaitTime = 120000;
    const pollInterval = 2000;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      await sleep(pollInterval);

      // Check if tab still exists
      try {
        await chrome.tabs.get(tabId);
      } catch (e) {
        console.log('Tab was closed during CAPTCHA');
        return false;
      }

      captchaDetected = await isArchiveCaptchaPage(tabId);
      if (!captchaDetected) {
        console.log('CAPTCHA solved!');
        await sleep(1500);
        return true;
      }
    }

    console.error('CAPTCHA timeout');
    return false;
  }

  return true;
}

// Helper: Check if archive.ph page is showing CAPTCHA/security check
async function isArchiveCaptchaPage(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const pageText = document.body?.innerText || '';
        const title = document.title || '';
        // Detect CAPTCHA page indicators
        return pageText.includes('complete the security check') ||
               pageText.includes('One more step') ||
               pageText.includes('Why do I have to complete a CAPTCHA') ||
               title.includes('Just a moment');
      }
    });
    return results?.[0]?.result || false;
  } catch (e) {
    console.warn('Could not check for CAPTCHA:', e);
    return false;
  }
}

// Helper: Try to automatically click the CAPTCHA checkbox
async function tryAutoClickCaptcha(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        // Try common CAPTCHA checkbox selectors
        const selectors = [
          // hCaptcha
          'iframe[src*="hcaptcha"]',
          '#h-captcha iframe',
          '.h-captcha iframe',
          // reCAPTCHA
          'iframe[src*="recaptcha"]',
          '.g-recaptcha iframe',
          '#rc-anchor-container',
          // Generic checkbox
          'input[type="checkbox"]',
          '.checkbox',
          '[role="checkbox"]'
        ];

        // First try to find and click any visible checkbox on the page
        const checkboxes = document.querySelectorAll('input[type="checkbox"]:not(:checked)');
        for (const checkbox of checkboxes) {
          if (checkbox.offsetParent !== null) { // Is visible
            checkbox.click();
            return { clicked: true, type: 'checkbox' };
          }
        }

        // Try to find CAPTCHA iframe and interact with it
        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element) {
            if (element.tagName === 'IFRAME') {
              // Can't click inside iframe due to cross-origin, but we found it
              return { clicked: false, type: 'iframe-found', message: 'CAPTCHA iframe found - manual interaction required' };
            } else {
              element.click();
              return { clicked: true, type: selector };
            }
          }
        }

        // Try clicking any button that might submit the challenge
        const buttons = document.querySelectorAll('button, input[type="submit"]');
        for (const btn of buttons) {
          const text = btn.textContent?.toLowerCase() || btn.value?.toLowerCase() || '';
          if (text.includes('verify') || text.includes('continue') || text.includes('submit')) {
            btn.click();
            return { clicked: true, type: 'verify-button' };
          }
        }

        return { clicked: false, type: 'none', message: 'No clickable CAPTCHA element found' };
      }
    });

    const result = results?.[0]?.result;
    console.log('CAPTCHA auto-click result:', result);
    return result;
  } catch (e) {
    console.warn('Could not auto-click CAPTCHA:', e);
    return { clicked: false, error: e.message };
  }
}

// Helper: Check if archive.ph page has loaded actual content
async function isArchiveContentLoaded(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        // Check for archive.ph content indicators
        const hasArchiveHeader = !!document.querySelector('#HEADER, .HEADER, [id*="HEADER"]');
        const hasContent = document.body?.innerText?.length > 1000;
        const url = window.location.href;
        // Valid archive URL pattern: archive.ph/XXXXX (not /newest/, /submit/, or captcha)
        const isValidArchiveUrl = url.includes('archive.ph/') &&
                                  !url.includes('/newest/') &&
                                  !url.includes('/submit/') &&
                                  !url.includes('challenge');
        return isValidArchiveUrl && hasContent && !document.body.innerText.includes('complete the security check');
      }
    });
    return results?.[0]?.result || false;
  } catch (e) {
    console.warn('Could not check archive content:', e);
    return false;
  }
}

// Helper: Check if we're on archive.ph and the form needs to be filled
async function checkIfNeedsFormFill(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const url = window.location.href;

        // Only check on archive.ph pages
        if (!url.includes('archive.ph') && !url.includes('archive.today') && !url.includes('archive.is')) {
          return { needsFill: false, reason: 'not archive.ph' };
        }

        // Look for the URL input field
        const urlInput = document.getElementById('url') ||
                         document.querySelector('input[name="url"]') ||
                         document.querySelector('form input[type="text"]');

        if (!urlInput) {
          return { needsFill: false, reason: 'no input field found' };
        }

        // Check if input is empty or has placeholder only
        const inputValue = urlInput.value?.trim() || '';
        const isEmpty = inputValue === '' || inputValue === 'https://' || inputValue === 'http://';

        // Check if there's a submit form visible
        const hasForm = !!document.querySelector('form');

        return {
          needsFill: isEmpty && hasForm,
          reason: isEmpty ? 'input is empty' : 'input has value',
          currentValue: inputValue,
          hasForm
        };
      }
    });

    const result = results?.[0]?.result;
    console.log('checkIfNeedsFormFill result:', result);
    return result?.needsFill || false;
  } catch (e) {
    console.warn('Could not check form fill status:', e);
    return false;
  }
}

// Helper: Fill the archive.ph form and submit it
async function fillAndSubmitArchiveForm(tabId, urlToArchive) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      args: [urlToArchive],
      func: (targetUrl) => {
        // Find the URL input - archive.ph uses id="url"
        const urlInput = document.getElementById('url') ||
                         document.querySelector('input[name="url"]') ||
                         document.querySelector('form input[type="text"]');

        if (!urlInput) {
          return { submitted: false, error: 'Could not find URL input field' };
        }

        // Multiple methods to set the value (some sites use React/Vue which intercepts .value)

        // Method 1: Direct value assignment
        urlInput.value = targetUrl;

        // Method 2: Use native input value setter to bypass frameworks
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeInputValueSetter.call(urlInput, targetUrl);

        // Method 3: Dispatch events
        urlInput.dispatchEvent(new Event('input', { bubbles: true }));
        urlInput.dispatchEvent(new Event('change', { bubbles: true }));
        urlInput.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
        urlInput.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));

        // Verify the value was set
        const valueAfter = urlInput.value;
        console.log('URL input value after setting:', valueAfter);

        if (valueAfter !== targetUrl) {
          return { submitted: false, error: 'Value was not set correctly', attempted: targetUrl, actual: valueAfter };
        }

        // Find submit button - in archive.ph it's in the first form (red "save" box)
        const forms = document.querySelectorAll('form');
        let submitBtn = null;

        // Look in the form that contains our input
        const parentForm = urlInput.closest('form');
        if (parentForm) {
          submitBtn = parentForm.querySelector('input[type="submit"]');
        }

        // Fallback: first form's submit
        if (!submitBtn && forms.length > 0) {
          submitBtn = forms[0].querySelector('input[type="submit"]');
        }

        // Last fallback: any submit button
        if (!submitBtn) {
          submitBtn = document.querySelector('input[type="submit"]');
        }

        if (submitBtn) {
          console.log('Clicking submit button:', submitBtn);
          submitBtn.click();
          return { submitted: true, message: 'Clicked submit button', value: valueAfter };
        }

        // Try form.submit() as last resort
        if (parentForm) {
          parentForm.submit();
          return { submitted: true, message: 'Called form.submit()', value: valueAfter };
        }

        return { submitted: false, error: 'Could not find submit button', value: valueAfter };
      }
    });

    return results?.[0]?.result;
  } catch (e) {
    console.error('fillAndSubmitArchiveForm error:', e);
    return { submitted: false, error: e.message };
  }
}

// Helper: Check if we're on the archive.ph submission form page
async function isArchiveSubmitPage(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const url = window.location.href;
        // Check if we're on the submit page with the form
        const isSubmitUrl = url.includes('archive.ph/submit') || url.includes('archive.ph/?url=');
        const hasForm = !!document.querySelector('form[action*="submit"], input[name="url"], #url');
        const hasSubmitButton = !!document.querySelector('input[type="submit"], button[type="submit"]');
        return isSubmitUrl || (hasForm && hasSubmitButton);
      }
    });
    return results?.[0]?.result || false;
  } catch (e) {
    console.warn('Could not check for submit page:', e);
    return false;
  }
}

// Helper: Fill and submit the archive.ph form
async function submitArchiveForm(tabId, urlToArchive) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      args: [urlToArchive],
      func: (targetUrl) => {
        // Archive.ph uses id="url" for the input field
        // Try multiple selectors in order of specificity
        const urlInput = document.getElementById('url') ||
                         document.querySelector('input#url') ||
                         document.querySelector('input[name="url"]') ||
                         document.querySelector('form input[type="text"]');

        if (!urlInput) {
          return { submitted: false, message: 'Could not find URL input field', debug: 'No input found' };
        }

        // Clear and fill the URL field - use multiple methods to ensure it works
        urlInput.focus();
        urlInput.value = '';
        urlInput.value = targetUrl;

        // Dispatch events to trigger any listeners
        urlInput.dispatchEvent(new Event('input', { bubbles: true }));
        urlInput.dispatchEvent(new Event('change', { bubbles: true }));
        urlInput.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));

        // Small delay to let any JS process the input
        // Then find and click the submit button

        // Archive.ph submit button is typically in the first form (red box for "save")
        // XPath equivalent: /html/body/center/div/form[1]/div[3]/input
        const forms = document.querySelectorAll('form');
        let submitBtn = null;

        // First form is usually the "save" form (red box)
        if (forms.length > 0) {
          const firstForm = forms[0];
          submitBtn = firstForm.querySelector('input[type="submit"]') ||
                      firstForm.querySelector('button[type="submit"]') ||
                      firstForm.querySelector('input[value*="save" i]');
        }

        // Fallback: look for any submit button
        if (!submitBtn) {
          submitBtn = document.querySelector('input[type="submit"]') ||
                      document.querySelector('button[type="submit"]');
        }

        if (submitBtn) {
          submitBtn.click();
          return { submitted: true, message: 'Form submitted via button click', inputValue: urlInput.value };
        }

        // Last resort: submit the form directly
        if (forms.length > 0) {
          forms[0].submit();
          return { submitted: true, message: 'Form submitted via form.submit()', inputValue: urlInput.value };
        }

        return { submitted: false, message: 'Could not find submit button', inputValue: urlInput.value };
      }
    });

    const result = results?.[0]?.result;
    console.log('Archive form submission result:', result);
    return result;
  } catch (e) {
    console.warn('Could not submit archive form:', e);
    return { submitted: false, error: e.message };
  }
}

// Helper: Check if we're on a successful archived page (shows "archived X days/hours ago")
async function isArchiveComplete(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const url = window.location.href;
        const pageText = document.body?.innerText || '';

        // Check URL pattern - successful archive has format archive.ph/XXXXX (5+ char hash)
        const archiveHashPattern = /archive\.(ph|today|is|md|vn)\/[a-zA-Z0-9]{5,}/;
        const hasArchiveHash = archiveHashPattern.test(url);

        // Check for "archived X time ago" indicators
        const archivedIndicators = [
          /archived?\s+\d+\s+(second|minute|hour|day|week|month|year)s?\s+ago/i,
          /saved?\s+\d+\s+(second|minute|hour|day|week|month|year)s?\s+ago/i,
          /archiv(ed|iert)\s+vor\s+\d+/i,  // German
          /snapshot\s+from/i,
          /webpage\s+capture/i
        ];

        const hasArchivedText = archivedIndicators.some(pattern => pattern.test(pageText));

        // Check for archive.ph specific elements
        const hasArchiveElements = !!document.querySelector('#HEADER, .HEADER, #CONTENT, #TEXT-BLOCK');

        // Not on submit/newest page
        const notSubmitPage = !url.includes('/submit') && !url.includes('/newest/') && !url.includes('?url=');

        return {
          isComplete: hasArchiveHash && notSubmitPage && (hasArchivedText || hasArchiveElements),
          hasHash: hasArchiveHash,
          hasArchivedText,
          hasArchiveElements,
          notSubmitPage,
          url
        };
      }
    });

    const result = results?.[0]?.result;
    console.log('Archive complete check:', result);
    return result?.isComplete || false;
  } catch (e) {
    console.warn('Could not check archive completion:', e);
    return false;
  }
}

// Handler: Paywalled sites via archive.ph
async function handlePaywalledSite(tab) {
  console.log('Paywalled site detected, using archive.ph...');

  // First, try to find existing archive (saves time)
  const existingArchiveUrl = await checkForExistingArchive(tab.url);

  let archiveTab;
  let isNewArchive = false;

  if (existingArchiveUrl) {
    console.log('Found existing archive:', existingArchiveUrl);
    archiveTab = await chrome.tabs.create({
      url: existingArchiveUrl,
      active: false
    });
    await sleep(3000);
  } else {
    console.log('No existing archive, creating new one via form submission...');
    isNewArchive = true;

    // Go to archive.ph main page (NOT with URL in path - use form submission)
    archiveTab = await chrome.tabs.create({
      url: 'https://archive.ph/',
      active: false
    });

    // Wait for page to load
    await sleep(3000);

    // Handle initial CAPTCHA if present (before form is accessible)
    await handleArchiveCaptcha(archiveTab.id);

    // Now fill and submit the form
    console.log('Filling archive.ph form with URL:', tab.url);
    const fillResult = await fillAndSubmitArchiveForm(archiveTab.id, tab.url);
    console.log('Form fill result:', fillResult);

    if (!fillResult?.submitted) {
      console.error('Failed to submit form:', fillResult);
      showNotification('Archive Failed', 'Could not submit URL to archive.ph', 'icons/icon48.png');
      try { await chrome.tabs.remove(archiveTab.id); } catch (e) {}
      return;
    }

    // Wait for form submission to process
    await sleep(3000);

    // Handle CAPTCHA that appears after form submission
    await handleArchiveCaptcha(archiveTab.id);

    // Now wait for archiving to complete
    console.log('Waiting for archive.ph to finish archiving...');

    const archiveTimeout = 180000; // 3 minutes max for archiving
    const pollInterval = 3000;
    const startTime = Date.now();

    while (Date.now() - startTime < archiveTimeout) {
      // Check if tab still exists
      try {
        await chrome.tabs.get(archiveTab.id);
      } catch (e) {
        console.log('Archive tab was closed');
        return;
      }

      // Check if archiving is complete (page shows "archived X ago")
      const archiveComplete = await isArchiveComplete(archiveTab.id);
      if (archiveComplete) {
        console.log('Archive complete! Page shows archived content.');
        break;
      }

      // Check for CAPTCHA that might appear during archiving
      const hasCaptcha = await isArchiveCaptchaPage(archiveTab.id);
      if (hasCaptcha) {
        console.log('CAPTCHA appeared during archiving...');
        await handleArchiveCaptcha(archiveTab.id);
      }

      console.log('Still archiving... waiting...');
      await sleep(pollInterval);
    }
  }

  // Verify content is actually loaded
  let contentLoaded = await isArchiveContentLoaded(archiveTab.id);
  if (!contentLoaded) {
    // Wait a bit more and check again
    await sleep(3000);
    contentLoaded = await isArchiveContentLoaded(archiveTab.id);
  }

  // Final check - is the archive complete?
  const finalCheck = await isArchiveComplete(archiveTab.id);
  if (!finalCheck && !contentLoaded) {
    console.warn('Archive content may not be fully loaded, but attempting extraction...');
  }

  // Create a promise that resolves when content is extracted
  const extractionPromise = new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      pendingExtractions.delete(archiveTab.id);
      reject(new Error('Content extraction timed out'));
    }, 30000); // 30 second timeout

    pendingExtractions.set(archiveTab.id, {
      resolve: (data) => {
        clearTimeout(timeoutId);
        pendingExtractions.delete(archiveTab.id);
        resolve(data);
      },
      reject: (error) => {
        clearTimeout(timeoutId);
        pendingExtractions.delete(archiveTab.id);
        reject(error);
      },
      originalUrl: tab.url // Store original URL for the clipping record
    });
  });

  // Inject content script into archive page
  try {
    await injectContentScript(archiveTab.id);

    // Wait for extraction to complete
    await extractionPromise;
    console.log('Archive content extraction completed');

  } catch (error) {
    console.error('Archive extraction failed:', error);
  } finally {
    // Close archive tab
    try {
      await chrome.tabs.remove(archiveTab.id);
    } catch (e) {
      console.warn('Failed to close archive tab:', e);
    }
  }
}

// Check if archive already exists (saves time)
async function checkForExistingArchive(url) {
  try {
    // archive.ph expects the raw URL in the path, not encoded
    const checkUrl = `https://archive.ph/newest/${url}`;

    // Create a temporary tab to check
    const checkTab = await chrome.tabs.create({
      url: checkUrl,
      active: false
    });

    // Wait for potential redirect (increased for reliability)
    await sleep(3000);

    // Get the final URL
    const tab = await chrome.tabs.get(checkTab.id);
    const finalUrl = tab.url;

    // Close check tab
    await chrome.tabs.remove(checkTab.id);

    // If we got redirected to an archive (not to submit or newest)
    if (finalUrl.includes('archive.ph/') &&
        !finalUrl.includes('/newest/') &&
        !finalUrl.includes('/submit/')) {
      return finalUrl;
    }

    return null;
  } catch (error) {
    console.warn('Archive check failed:', error);
    return null;
  }
}

// Handler: Medium articles via bypass services
// Tries multiple services: freedium-mirror.cfd -> archive.ph -> direct
async function handleMediumArticle(tab) {
  console.log('Medium article detected, attempting bypass...');

  // List of bypass services to try (in order)
  // NOTE: We only try Freedium, NOT archive.ph, because archive.ph requires its own handling
  const bypassServices = [
    { name: 'Freedium Mirror', urlTemplate: (url) => `https://freedium-mirror.cfd/${url}` }
  ];

  for (const service of bypassServices) {
    console.log(`Trying ${service.name}...`);
    const bypassUrl = service.urlTemplate(tab.url);

    // Open bypass page
    const bypassTab = await chrome.tabs.create({
      url: bypassUrl,
      active: false
    });

    // Wait for page to load
    await sleep(5000);

    // CRITICAL: Check the actual tab URL to see if we got redirected
    let currentTab;
    try {
      currentTab = await chrome.tabs.get(bypassTab.id);
    } catch (e) {
      console.warn('Tab was closed:', e);
      continue;
    }

    const currentUrl = currentTab.url;
    console.log(`${service.name} final URL:`, currentUrl);

    // Check if we got redirected to archive.ph - this is a FAILURE
    if (isArchiveDomain(currentUrl)) {
      console.warn(`${service.name} redirected to archive.ph - treating as failure`);
      try {
        await chrome.tabs.remove(bypassTab.id);
      } catch (e) {}
      continue;
    }

    // Check if service successfully loaded content
    const serviceWorked = await checkBypassSuccess(bypassTab.id, service.name);

    if (!serviceWorked) {
      console.warn(`${service.name} failed, trying next...`);
      try {
        await chrome.tabs.remove(bypassTab.id);
      } catch (e) {
        console.warn('Failed to close tab:', e);
      }
      continue;
    }

    // Service worked - extract content
    const extractionPromise = new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        pendingExtractions.delete(bypassTab.id);
        reject(new Error('Content extraction timed out'));
      }, 30000);

      pendingExtractions.set(bypassTab.id, {
        resolve: (data) => {
          clearTimeout(timeoutId);
          pendingExtractions.delete(bypassTab.id);
          resolve(data);
        },
        reject: (error) => {
          clearTimeout(timeoutId);
          pendingExtractions.delete(bypassTab.id);
          reject(error);
        },
        originalUrl: tab.url
      });
    });

    try {
      await injectContentScript(bypassTab.id);
      await extractionPromise;
      console.log(`${service.name} content extraction completed`);
      return; // Success - exit function
    } catch (error) {
      console.error(`${service.name} extraction failed:`, error);
    } finally {
      try {
        await chrome.tabs.remove(bypassTab.id);
      } catch (e) {
        console.warn('Failed to close tab:', e);
      }
    }
  }

  // All services failed - fall back to direct page
  console.warn('All bypass services failed, clipping direct Medium page');
  await injectContentScript(tab.id);
}

// Check if bypass service successfully loaded content
async function checkBypassSuccess(tabId, serviceName) {
  try {
    const result = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const currentUrl = window.location.href;

        // Check if we got redirected to archive.ph - this is a FAILURE for Freedium
        // We want the Freedium content, not archive.ph
        const redirectedToArchive = currentUrl.includes('archive.ph') ||
                                     currentUrl.includes('archive.today') ||
                                     currentUrl.includes('archive.is');

        if (redirectedToArchive) {
          return {
            success: false,
            reason: 'redirected_to_archive',
            url: currentUrl
          };
        }

        // Check for common error indicators across bypass services
        const bodyText = document.body.textContent.toLowerCase();
        const hasFreediumError =
          bodyText.includes('service unavailable') ||
          bodyText.includes('failed to load article') ||
          bodyText.includes('freedium error') ||
          bodyText.includes('unable to fetch') ||
          bodyText.includes('article not found') ||
          bodyText.includes('403 forbidden') ||
          bodyText.includes('500 internal') ||
          bodyText.includes('502 bad gateway') ||
          bodyText.includes('503 service') ||
          bodyText.includes('cloudflare') ||
          document.title.toLowerCase().includes('error') ||
          document.title.toLowerCase().includes('blocked');

        // Check if article content exists (more thorough check)
        const hasContent =
          document.querySelector('article') !== null ||
          document.querySelector('[role="article"]') !== null ||
          document.querySelector('.post-content') !== null ||
          document.querySelector('.article-content') !== null ||
          (document.body.textContent.length > 500 && !hasFreediumError);

        return {
          success: hasContent && !hasFreediumError,
          reason: hasFreediumError ? 'error_detected' : (hasContent ? 'content_found' : 'no_content'),
          url: currentUrl
        };
      }
    });

    const checkResult = result[0]?.result;
    console.log(`Bypass check result for ${serviceName}:`, checkResult);

    // Handle both old boolean and new object format
    if (typeof checkResult === 'boolean') {
      return checkResult;
    }

    if (checkResult?.reason === 'redirected_to_archive') {
      console.warn(`${serviceName} redirected to archive.ph - treating as failure`);
      return false;
    }

    return checkResult?.success || false;
  } catch (error) {
    console.warn('Freedium check failed:', error);
    return false; // Assume failure if we can't check
  }
}

// Helper: Check if a URL is on archive.ph domain
function isArchiveDomain(url) {
  if (!url) return false;
  return url.includes('archive.ph') ||
         url.includes('archive.today') ||
         url.includes('archive.is') ||
         url.includes('archive.md') ||
         url.includes('archive.vn');
}

// Handler: YouTube videos with transcript
async function handleYouTubeVideo(tab) {
  console.log('YouTube video detected, extracting with transcript...');

  await injectContentScript(tab.id);

  console.log('YouTube content script injected');
}

// Handler: Twitter/X pages
async function handleTwitterPage(tab) {
  console.log('Twitter/X page detected, using dedicated handler...');

  const handlerInjected = await injectScriptFilesWithFallback(
    tab.id,
    ['src/handlers/twitter-handler.js'],
    ['twitter-handler.js'],
    'Twitter handler'
  );

  if (handlerInjected) {
    console.log('Twitter handler injected');
    return;
  }

  console.warn('Twitter handler unavailable, falling back to general extraction.');
  await injectContentScript(tab.id);
}

// ===== TWITTER BOOKMARK SYNC FUNCTIONS =====

// Global state for tracking bookmark sync tab
let bookmarkSyncTabId = null;

async function handleTwitterBookmarkSync() {
  console.log('Starting Twitter bookmark sync...');

  const settings = await getSettings();
  const syncSettings = settings.twitterBookmarkSync || DEFAULT_SETTINGS.twitterBookmarkSync;

  // Check if sync already in progress - but with a timeout check
  if (syncSettings.syncInProgress) {
    // Check if the lock is stale (stuck for more than 5 minutes)
    const lockTime = syncSettings.syncLockTimestamp ? new Date(syncSettings.syncLockTimestamp).getTime() : 0;
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);

    if (lockTime > fiveMinutesAgo) {
      // Lock is recent, sync is genuinely in progress
      console.warn('Bookmark sync already in progress (started', Math.round((Date.now() - lockTime) / 1000), 'seconds ago)');
      throw new Error('Bookmark sync already in progress');
    } else {
      // Lock is stale, auto-reset it
      console.warn('Stale sync lock detected, resetting...');
      await updateSyncStatus({ syncInProgress: false, syncLockTimestamp: null });
    }
  }

  // Mark sync as in progress with timestamp
  await updateSyncStatus({ syncInProgress: true, syncLockTimestamp: new Date().toISOString() });

  try {
    // Open Twitter bookmarks page in new tab
    const BOOKMARKS_URL = 'https://twitter.com/i/bookmarks';

    const tab = await chrome.tabs.create({
      url: BOOKMARKS_URL,
      active: false  // Hidden tab
    });

    // Store tab ID globally so we can close it after scraping
    bookmarkSyncTabId = tab.id;

    console.log('Opened Twitter bookmarks tab:', tab.id);

    // Wait for page to load
    await waitForTabLoad(tab.id);

    // Inject bookmark scraper script
    const scraperInjected = await injectScriptFilesWithFallback(
      tab.id,
      ['src/handlers/twitter-bookmark-scraper.js'],
      ['twitter-bookmark-scraper.js'],
      'Twitter bookmark scraper'
    );

    if (!scraperInjected) {
      throw new Error('Twitter bookmark scraper script not found. Ensure src/handlers is included in the extension package.');
    }

    console.log('Scraper script injected - waiting for results...');

    // The scraper will send BOOKMARKS_SCRAPED message when complete
    return { tabId: tab.id, status: 'scraping' };

  } catch (error) {
    await updateSyncStatus({ syncInProgress: false, syncLockTimestamp: null });
    // Clean up tab on error
    if (bookmarkSyncTabId) {
      try {
        await chrome.tabs.remove(bookmarkSyncTabId);
      } catch (e) {
        console.warn('Failed to close bookmark tab:', e);
      }
      bookmarkSyncTabId = null;
    }
    throw error;
  }
}

async function handleBookmarksScraped(data) {
  console.log('Processing scraped bookmarks:', data);

  // Close bookmark scraping tab
  if (bookmarkSyncTabId) {
    try {
      await chrome.tabs.remove(bookmarkSyncTabId);
      console.log('Closed bookmark scraping tab');
    } catch (e) {
      console.warn('Failed to close bookmark tab:', e);
    }
    bookmarkSyncTabId = null;
  }

  const { bookmarks, totalFound } = data;

  const settings = await getSettings();
  const syncSettings = settings.twitterBookmarkSync || DEFAULT_SETTINGS.twitterBookmarkSync;

  // Get already-synced tweet IDs
  const syncedIds = new Set(syncSettings.syncedTweetIds || []);

  // Filter out already-synced bookmarks
  const newBookmarks = bookmarks.filter(b => !syncedIds.has(b.tweetId));

  console.log(`Total bookmarks: ${totalFound}, New: ${newBookmarks.length}, Already synced: ${totalFound - newBookmarks.length}`);

  if (newBookmarks.length === 0) {
    await updateSyncStatus({
      syncInProgress: false,
      syncLockTimestamp: null,
      lastSyncTimestamp: new Date().toISOString(),
      totalBookmarksFound: totalFound,
      totalNewlySynced: 0
    });

    showNotification(
      'Twitter Bookmarks Up to Date',
      'No new bookmarks to sync',
      'icons/icon48.png'
    );

    return {
      totalFound,
      newlySynced: 0,
      alreadySynced: totalFound,
      failed: 0
    };
  }

  // Use rate limiter for Twitter API protection
  // Limit: 5 requests per second to avoid rate limiting
  await rateLimiterReady; // Wait for rate limiter to load

  const limiter = RateLimiter ? new RateLimiter(5, 1000) : null;
  let successCount = 0;
  let failCount = 0;

  if (limiter) {
    console.log(`Using rate limiter for ${newBookmarks.length} bookmarks (5 req/sec)`);

    const result = await limiter.batchProcess(
      newBookmarks,
      async (bookmark) => {
        await clipTweetFromBookmark(bookmark);
        await markTweetSynced(bookmark.tweetId);
        return bookmark;
      },
      {
        onProgress: (progress) => {
          console.log(`Progress: ${progress.current}/${progress.total} (${progress.success} success, ${progress.failed} failed)`);

          // Update badge with progress
          chrome.action.setBadgeText({
            text: `${progress.current}/${progress.total}`
          });
          chrome.action.setBadgeBackgroundColor({ color: '#1DA1F2' }); // Twitter blue
        },
        continueOnError: true
      }
    );

    successCount = result.successCount;
    failCount = result.errorCount;

    // Clear badge when done
    chrome.action.setBadgeText({ text: '' });

  } else {
    // Fallback: sequential processing without rate limiting
    console.warn('Rate limiter not available, using sequential processing');

    for (const bookmark of newBookmarks) {
      try {
        console.log(`Clipping tweet ${bookmark.tweetId}...`);
        await clipTweetFromBookmark(bookmark);
        await markTweetSynced(bookmark.tweetId);
        successCount++;
      } catch (error) {
        console.error(`Failed to clip tweet ${bookmark.tweetId}:`, error);
        failCount++;
      }
    }
  }

  // Update sync stats
  await updateSyncStatus({
    syncInProgress: false,
    syncLockTimestamp: null,
    lastSyncTimestamp: new Date().toISOString(),
    totalBookmarksFound: totalFound,
    totalNewlySynced: successCount
  });

  // Log to history
  await logToHistory({
    type: 'twitter-bookmark-sync',
    timestamp: new Date().toISOString(),
    bookmarksFound: totalFound,
    newlySynced: successCount,
    alreadySynced: totalFound - newBookmarks.length,
    failed: failCount,
    status: 'success'
  });

  // Show notification
  if (successCount > 0) {
    showNotification(
      'Twitter Bookmarks Synced',
      `Synced ${successCount} new bookmark${successCount > 1 ? 's' : ''}${failCount > 0 ? ` (${failCount} failed)` : ''}`,
      'icons/icon48.png'
    );
  }

  return {
    totalFound,
    newlySynced: successCount,
    alreadySynced: totalFound - newBookmarks.length,
    failed: failCount
  };
}

async function clipTweetFromBookmark(bookmark) {
  console.log(`Clipping tweet: ${bookmark.url}`);

  // Open tweet in new tab
  const tab = await chrome.tabs.create({
    url: bookmark.url,
    active: false
  });

  try {
    // Wait for page to load
    await waitForTabLoad(tab.id);

    // Inject content script
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });

    // Content script will send CONTENT_EXTRACTED message
    // Wait for extraction to complete (with timeout)
    // Twitter/X pages are JavaScript-heavy and may need more time
    await waitForExtraction(tab.id, 20000);

    // Close tab
    await chrome.tabs.remove(tab.id);

  } catch (error) {
    // Make sure to close tab even on error
    try {
      await chrome.tabs.remove(tab.id);
    } catch (closeError) {
      console.warn('Failed to close tab:', closeError);
    }
    throw error;
  }
}

// Helper: Wait for content extraction to complete
function waitForExtraction(tabId, timeout = 20000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Content extraction timed out'));
    }, timeout);

    function cleanup() {
      clearTimeout(timer);
      chrome.runtime.onMessage.removeListener(messageListener);
    }

    function messageListener(message, sender) {
      if (message.type === 'CONTENT_EXTRACTED' && sender.tab?.id === tabId) {
        cleanup();
        resolve();
      }
    }

    chrome.runtime.onMessage.addListener(messageListener);
  });
}

async function markTweetSynced(tweetId) {
  const settings = await getSettings();
  const syncSettings = settings.twitterBookmarkSync || DEFAULT_SETTINGS.twitterBookmarkSync;

  // Add to synced IDs
  if (!syncSettings.syncedTweetIds.includes(tweetId)) {
    syncSettings.syncedTweetIds.push(tweetId);
  }

  // Update settings
  settings.twitterBookmarkSync = syncSettings;
  await chrome.storage.local.set({ settings });

  console.log(`Marked tweet ${tweetId} as synced`);
}

async function updateSyncStatus(updates) {
  const settings = await getSettings();
  const syncSettings = settings.twitterBookmarkSync || DEFAULT_SETTINGS.twitterBookmarkSync;

  // Merge updates
  Object.assign(syncSettings, updates);

  settings.twitterBookmarkSync = syncSettings;
  await chrome.storage.local.set({ settings });

  console.log('Updated sync status:', updates);
}

async function updateTwitterSyncSettings(updates) {
  const settings = await getSettings();
  const syncSettings = settings.twitterBookmarkSync || DEFAULT_SETTINGS.twitterBookmarkSync;

  // Merge updates
  Object.assign(syncSettings, updates);

  settings.twitterBookmarkSync = syncSettings;
  await chrome.storage.local.set({ settings });

  console.log('Updated Twitter sync settings:', updates);

  // If auto-sync interval changed, update alarm
  if (updates.autoSyncInterval !== undefined || updates.enabled !== undefined) {
    await setupAutoSyncAlarm();
  }
}

async function resetTwitterSyncTracking() {
  const settings = await getSettings();

  settings.twitterBookmarkSync = {
    ...DEFAULT_SETTINGS.twitterBookmarkSync,
    enabled: settings.twitterBookmarkSync?.enabled || false,
    autoSyncInterval: settings.twitterBookmarkSync?.autoSyncInterval || 30
  };

  await chrome.storage.local.set({ settings });

  console.log('Reset Twitter sync tracking');

  showNotification(
    'Sync Tracking Reset',
    'All tweet sync history cleared',
    'icons/icon48.png'
  );
}

async function setupAutoSyncAlarm() {
  const settings = await getSettings();
  const syncSettings = settings.twitterBookmarkSync || DEFAULT_SETTINGS.twitterBookmarkSync;

  // Clear existing alarm
  await chrome.alarms.clear('twitterBookmarkAutoSync');

  // Create new alarm if enabled
  if (syncSettings.enabled) {
    await chrome.alarms.create('twitterBookmarkAutoSync', {
      periodInMinutes: syncSettings.autoSyncInterval
    });
    console.log(`Auto-sync alarm set for every ${syncSettings.autoSyncInterval} minutes`);
  } else {
    console.log('Auto-sync disabled');
  }
}

// Alarm listener for auto-sync
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'twitterBookmarkAutoSync') {
    console.log('Auto-sync alarm triggered');
    try {
      await handleTwitterBookmarkSync();
    } catch (error) {
      console.error('Auto-sync failed:', error);
    }
  }
});

// Helper: Wait for tab to finish loading
function waitForTabLoad(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.onUpdated.addListener(function listener(updatedTabId, changeInfo) {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    });
  });
}

// Helper: Sleep utility
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== CONTEXT MENU & KEYBOARD SHORTCUTS =====

// Create context menus function (called on install and startup)
function createContextMenus() {
  // Remove existing menus first to avoid duplicates
  chrome.contextMenus.removeAll(() => {
    // Create parent menu
    chrome.contextMenus.create({
      id: 'obsidian-clipper',
      title: 'Clip to Obsidian',
      contexts: ['page', 'selection', 'link', 'image']
    });

    // Clip full page
    chrome.contextMenus.create({
      id: 'clip-page',
      parentId: 'obsidian-clipper',
      title: 'Clip Full Page',
      contexts: ['page']
    });

    // Clip selection
    chrome.contextMenus.create({
      id: 'clip-selection',
      parentId: 'obsidian-clipper',
      title: 'Clip Selection',
      contexts: ['selection']
    });

    // Clip link
    chrome.contextMenus.create({
      id: 'clip-link',
      parentId: 'obsidian-clipper',
      title: 'Clip Linked Page',
      contexts: ['link']
    });

    // Clip image
    chrome.contextMenus.create({
      id: 'clip-image',
      parentId: 'obsidian-clipper',
      title: 'Clip Image',
      contexts: ['image']
    });

    // Separator
    chrome.contextMenus.create({
      id: 'separator-1',
      parentId: 'obsidian-clipper',
      type: 'separator',
      contexts: ['page']
    });

    // Bulk clip all tabs
    chrome.contextMenus.create({
      id: 'bulk-clip-tabs',
      parentId: 'obsidian-clipper',
      title: 'Clip All Tabs in Window',
      contexts: ['page']
    });

    console.log('Context menus created');
  });
}

// Create context menus on install/update
chrome.runtime.onInstalled.addListener(() => {
  createContextMenus();
});

// Also create on service worker startup (in case it was terminated)
createContextMenus();

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  console.log('Context menu clicked:', info.menuItemId, info);

  try {
    // Safety check - tab might be undefined in some contexts
    if (!tab || !tab.url) {
      console.warn('Context menu invoked without valid tab context');
      showNotification('Context Error', 'Could not determine page context', 'icons/icon48.png');
      return;
    }

    if (info.menuItemId === 'clip-page') {
      // Clip full page (same as extension icon)
      const settings = await getSettings();

      if (settings.autoArchive && shouldArchive(tab.url)) {
        await handlePaywalledSite(tab);
      } else if (settings.bypassMedium && isMediumSite(tab.url)) {
        await handleMediumArticle(tab);
      } else if (isYouTubeSite(tab.url)) {
        await handleYouTubeVideo(tab);
      } else {
        await injectContentScript(tab.id);
      }
    } else if (info.menuItemId === 'clip-selection') {
      // Clip selected text
      await clipSelection(tab.id, info.selectionText);
    } else if (info.menuItemId === 'clip-link') {
      // Clip linked page
      await clipLinkedPage(info.linkUrl);
    } else if (info.menuItemId === 'clip-image') {
      // Clip image with context
      await clipImage(tab.id, info.srcUrl, info.pageUrl);
    } else if (info.menuItemId === 'bulk-clip-tabs') {
      // Bulk clip all tabs in current window
      await handleBulkClipTabs(tab.windowId);
    }
  } catch (error) {
    console.error('Context menu action failed:', error);
    showNotification('Clipping Failed', error.message, 'icons/icon48.png');
  }
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  console.log('Keyboard command:', command);

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (command === 'clip-selection') {
    // Get selected text via content script
    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection().toString()
    });

    const selectedText = result[0]?.result;

    if (selectedText && selectedText.trim()) {
      await clipSelection(tab.id, selectedText);
    } else {
      showNotification('No Selection', 'Please select text to clip', 'icons/icon48.png');
    }
  } else if (command === 'bulk-clip-tabs') {
    // Bulk clip all tabs in current window
    await handleBulkClipTabs(tab.windowId);
  }
});

// Clip selected text only
async function clipSelection(tabId, selectionText) {
  console.log('Clipping selection:', selectionText.substring(0, 50) + '...');

  // Get page info
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  const clipData = {
    title: `Selection from ${tab.title}`,
    url: tab.url,
    content: selectionText,
    author: [],
    description: `Selected text from ${tab.title}`,
    published: null,
    selectionOnly: true
  };

  await handleContentExtracted(clipData, tab);
}

// Clip linked page (open in background and clip)
async function clipLinkedPage(linkUrl) {
  console.log('Clipping linked page:', linkUrl);

  showNotification('Clipping Link', 'Opening linked page...', 'icons/icon48.png');

  // Open link in background
  const tab = await chrome.tabs.create({
    url: linkUrl,
    active: false
  });

  try {
    // Wait for page to load
    await waitForTabLoad(tab.id);

    // Check content type and clip appropriately
    const settings = await getSettings();

    if (settings.autoArchive && shouldArchive(linkUrl, settings.archiveSites)) {
      await handlePaywalledSite(tab);
    } else if (settings.bypassMedium && isMediumSite(linkUrl)) {
      await handleMediumArticle(tab);
    } else if (isYouTubeSite(linkUrl)) {
      await handleYouTubeVideo(tab);
    } else {
      await injectContentScript(tab.id);
    }

    // Close background tab
    setTimeout(async () => {
      try {
        await chrome.tabs.remove(tab.id);
      } catch (e) {
        console.warn('Failed to close background tab:', e);
      }
    }, 5000);

  } catch (error) {
    try {
      await chrome.tabs.remove(tab.id);
    } catch (e) {
      console.warn('Failed to close background tab:', e);
    }
    throw error;
  }
}

// Clip image with page context
async function clipImage(tabId, imageUrl, pageUrl) {
  console.log('Clipping image:', imageUrl);

  // Get page info
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Get image alt text and context via content script
  const result = await chrome.scripting.executeScript({
    target: { tabId },
    args: [imageUrl],
    func: (imgUrl) => {
      const img = document.querySelector(`img[src="${imgUrl}"]`);
      if (img) {
        return {
          alt: img.alt || '',
          title: img.title || '',
          width: img.naturalWidth,
          height: img.naturalHeight,
          caption: img.closest('figure')?.querySelector('figcaption')?.textContent || ''
        };
      }
      return null;
    }
  });

  const imageInfo = result[0]?.result || {};

  const clipData = {
    title: imageInfo.alt || `Image from ${tab.title}`,
    url: pageUrl,
    content: `![${imageInfo.alt || 'Image'}](${imageUrl})

${imageInfo.caption ? `**Caption:** ${imageInfo.caption}\n\n` : ''}${imageInfo.width && imageInfo.height ? `**Dimensions:** ${imageInfo.width} × ${imageInfo.height}px\n\n` : ''}**Source:** ${pageUrl}`,
    author: [],
    description: imageInfo.alt || 'Image clip',
    published: null,
    imageOnly: true
  };

  await handleContentExtracted(clipData, tab);
}

// ===== BULK CLIP ALL TABS =====

// Helper: Send update to status popup
function sendBulkClipUpdate(data) {
  // Update local state
  if (data.tabId) {
    bulkClipState[data.tabId] = { ...bulkClipState[data.tabId], ...data };
  }

  // Broadcast to popup
  chrome.runtime.sendMessage({
    type: 'BULK_CLIP_UPDATE',
    data
  }).catch(() => {
    // Popup might not be open, ignore error
  });
}

// Helper: Determine processing type for a tab
function getProcessingType(url, settings) {
  if (isYouTubeSite(url)) {
    return url.includes('/shorts/') ? 'youtube-shorts' : 'youtube';
  }
  if (settings.bypassMedium && isMediumSite(url)) {
    return 'medium';
  }
  if (settings.autoArchive && shouldArchive(url, settings.archiveSites)) {
    return 'archive';
  }
  if (url.includes('twitter.com') || url.includes('x.com')) {
    return 'twitter';
  }
  return 'standard';
}

async function handleBulkClipTabs(windowId) {
  console.log('Starting bulk clip for window:', windowId);

  // Reset state for new bulk clip
  bulkClipState = {};

  // Get all tabs in the current window
  const tabs = await chrome.tabs.query({ windowId });

  console.log(`Found ${tabs.length} tabs to clip`);

  // Filter out invalid tabs
  const validTabs = tabs.filter(tab => {
    // Skip tabs without URL first (prevents TypeError on .startsWith())
    if (!tab.url) {
      console.log('Skipping tab without URL');
      return false;
    }
    // Skip chrome:// URLs, extension pages, new tab pages
    if (tab.url.startsWith('chrome://') ||
        tab.url.startsWith('chrome-extension://') ||
        tab.url.startsWith('about:') ||
        tab.url === 'chrome://newtab/') {
      console.log('Skipping invalid tab:', tab.url);
      return false;
    }
    return true;
  });

  console.log(`${validTabs.length} valid tabs to clip (${tabs.length - validTabs.length} skipped)`);

  if (validTabs.length === 0) {
    showNotification(
      'No Valid Tabs',
      'No clippable tabs found in this window',
      'icons/icon48.png'
    );
    return;
  }

  // Get recently clipped URLs to avoid duplicates
  const history = await new Promise(resolve => {
    chrome.storage.local.get(['clippingHistory'], (result) => {
      resolve(result.clippingHistory || []);
    });
  });

  // Get URLs clipped in last 5 minutes to avoid immediate duplicates
  const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
  const recentlyClippedUrls = new Set(
    history
      .filter(h => new Date(h.timestamp).getTime() > fiveMinutesAgo)
      .map(h => h.url)
  );

  // Filter out recently clipped URLs
  const tabsToClip = validTabs.filter(tab => {
    if (recentlyClippedUrls.has(tab.url)) {
      console.log('Skipping recently clipped:', tab.url);
      return false;
    }
    return true;
  });

  const duplicatesSkipped = validTabs.length - tabsToClip.length;

  console.log(`${tabsToClip.length} tabs to clip (${duplicatesSkipped} duplicates skipped)`);

  if (tabsToClip.length === 0) {
    showNotification(
      'All Tabs Already Clipped',
      'All tabs were clipped in the last 5 minutes',
      'icons/icon48.png'
    );
    return;
  }

  const settings = await getSettings();

  // Initialize state for all tabs
  tabsToClip.forEach(tab => {
    bulkClipState[tab.id] = {
      tabId: tab.id,
      title: tab.title,
      url: tab.url,
      favicon: tab.favIconUrl,
      status: 'pending',
      processingType: getProcessingType(tab.url, settings)
    };
  });

  // Open status popup
  try {
    const popup = await chrome.windows.create({
      url: chrome.runtime.getURL('bulk-clip-status.html'),
      type: 'popup',
      width: 500,
      height: 550,
      focused: true
    });
    bulkClipPopupId = popup.id;
  } catch (error) {
    console.warn('Could not open status popup:', error);
  }

  // Small delay to let popup initialize
  await new Promise(resolve => setTimeout(resolve, 300));

  // Use rate limiter for safety (3 clips per second)
  await rateLimiterReady;
  const limiter = RateLimiter ? new RateLimiter(3, 1000) : null;

  let successCount = 0;
  let failCount = 0;

  if (limiter) {
    console.log(`Using rate limiter for ${tabsToClip.length} tabs (3 req/sec)`);

    const result = await limiter.batchProcess(
      tabsToClip,
      async (tab) => {
        // Send processing update
        sendBulkClipUpdate({
          tabId: tab.id,
          status: 'processing',
          processingType: getProcessingType(tab.url, settings)
        });

        try {
          await clipTabSmart(tab, settings);
          sendBulkClipUpdate({
            tabId: tab.id,
            status: 'success'
          });
        } catch (error) {
          sendBulkClipUpdate({
            tabId: tab.id,
            status: 'failed',
            error: error.message
          });
          throw error;
        }
        return tab;
      },
      {
        onProgress: (progress) => {
          console.log(`Bulk clip progress: ${progress.current}/${progress.total}`);

          // Update badge
          chrome.action.setBadgeText({
            text: `${progress.current}/${progress.total}`
          });
          chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' }); // Green
        },
        continueOnError: true
      }
    );

    successCount = result.successCount;
    failCount = result.errorCount;

    // Clear badge
    chrome.action.setBadgeText({ text: '' });

  } else {
    // Fallback: sequential processing
    console.warn('Rate limiter not available, using sequential processing');

    for (let i = 0; i < tabsToClip.length; i++) {
      const tab = tabsToClip[i];

      // Send processing update
      sendBulkClipUpdate({
        tabId: tab.id,
        status: 'processing',
        processingType: getProcessingType(tab.url, settings)
      });

      try {
        console.log(`Clipping tab ${i + 1}/${tabsToClip.length}: ${tab.url}`);

        // Update badge
        chrome.action.setBadgeText({ text: `${i + 1}/${tabsToClip.length}` });
        chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });

        await clipTabSmart(tab, settings);
        sendBulkClipUpdate({
          tabId: tab.id,
          status: 'success'
        });
        successCount++;
      } catch (error) {
        console.error(`Failed to clip tab ${tab.url}:`, error);
        sendBulkClipUpdate({
          tabId: tab.id,
          status: 'failed',
          error: error.message
        });
        failCount++;
      }
    }

    // Clear badge
    chrome.action.setBadgeText({ text: '' });
  }

  // Send completion message to popup
  chrome.runtime.sendMessage({
    type: 'BULK_CLIP_COMPLETE',
    data: { successCount, failCount, duplicatesSkipped }
  }).catch(() => {});

  // Log to history
  await logToHistory({
    type: 'bulk-clip-tabs',
    timestamp: new Date().toISOString(),
    tabsFound: tabs.length,
    validTabs: validTabs.length,
    duplicatesSkipped,
    clipped: successCount,
    failed: failCount,
    status: 'success'
  });

  // Show completion notification
  const message = `Clipped ${successCount} tab${successCount !== 1 ? 's' : ''}${failCount > 0 ? ` (${failCount} failed)` : ''}${duplicatesSkipped > 0 ? ` • ${duplicatesSkipped} duplicate${duplicatesSkipped !== 1 ? 's' : ''} skipped` : ''}`;

  showNotification(
    'Bulk Clip Complete',
    message,
    'icons/icon48.png'
  );

  console.log('Bulk clip complete:', { successCount, failCount, duplicatesSkipped });
}

// Clip a single tab with smart routing
async function clipTabSmart(tab, settings) {
  console.log('Clipping tab:', tab.url);

  // Check if this is a paywalled site
  if (settings.autoArchive && shouldArchive(tab.url, settings.archiveSites)) {
    await handlePaywalledSite(tab);
    return;
  }

  // Check if this is a Medium article
  if (settings.bypassMedium && isMediumSite(tab.url)) {
    await handleMediumArticle(tab);
    return;
  }

  // Check if this is a YouTube video
  if (isYouTubeSite(tab.url)) {
    await handleYouTubeVideo(tab);
    return;
  }

  // Regular clipping
  await injectContentScript(tab.id);
}

// Initialize auto-sync alarm on startup
setupAutoSyncAlarm();

console.log('Background script ready (v2.1 with context menu & keyboard shortcuts)');
