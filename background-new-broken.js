/**
 * Quick Obsidian Clipper - Background Service Worker
 * Enhanced with filesystem-first clipping (works without Obsidian running)
 */

// Filesystem Clipper (inlined to avoid importScripts issue with modules)
class FilesystemClipper {
  constructor() {
    this.isAvailable = typeof chrome !== 'undefined' && chrome.downloads;
  }

  generateFilename(clipData) {
    const date = new Date(clipData.timestamp).toISOString().split('T')[0];
    const sanitized = clipData.title
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 100);
    return `${date} ⌇ ${sanitized}.md`;
  }

  createMarkdownContent(clipData, settings) {
    const lines = ['---'];
    lines.push(`title: "${clipData.title.replace(/"/g, '\\"')}"`);
    lines.push(`source: "${clipData.url}"`);

    if (clipData.author && clipData.author.length > 0) {
      lines.push('author:');
      clipData.author.forEach(author => {
        lines.push(`  - "[[${author}]]"`);
      });
    } else if (settings.defaultAuthor) {
      lines.push('author:');
      lines.push(`  - "[[${settings.defaultAuthor}]]"`);
    }

    if (settings.includePublishDate && clipData.published) {
      lines.push(`published: ${clipData.published}`);
    }

    const created = new Date(clipData.timestamp).toISOString().split('T')[0];
    lines.push(`created: ${created}`);

    if (settings.includeDescription && clipData.description) {
      lines.push(`description: "${clipData.description.replace(/"/g, '\\"')}"`);
    }

    lines.push('tags:');
    const tags = settings.defaultTags || ['clippings'];
    tags.forEach(tag => {
      lines.push(`  - "${tag}"`);
    });

    lines.push('---', '');
    lines.push(clipData.content);

    return lines.join('\n');
  }

  async saveClip(clipData, settings) {
    if (!this.isAvailable) {
      throw new Error('Downloads API not available');
    }

    const filename = this.generateFilename(clipData);
    const content = this.createMarkdownContent(clipData, settings);

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);

    let saveAs = false;
    let downloadPath = filename;

    if (settings.filesystemPath) {
      downloadPath = settings.filesystemPath + '/' + filename;
      saveAs = false;
    } else {
      saveAs = true;
    }

    return new Promise((resolve, reject) => {
      chrome.downloads.download({
        url: url,
        filename: downloadPath,
        saveAs: saveAs,
        conflictAction: 'uniquify'
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          URL.revokeObjectURL(url);
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        const listener = (delta) => {
          if (delta.id === downloadId) {
            if (delta.state && delta.state.current === 'complete') {
              chrome.downloads.onChanged.removeListener(listener);
              URL.revokeObjectURL(url);

              chrome.downloads.search({ id: downloadId }, (results) => {
                if (results && results.length > 0) {
                  console.log(`✓ Clip saved to: ${results[0].filename}`);
                }
                resolve(true);
              });
            } else if (delta.state && delta.state.current === 'interrupted') {
              chrome.downloads.onChanged.removeListener(listener);
              URL.revokeObjectURL(url);
              reject(new Error('Download interrupted'));
            }
          }
        };

        chrome.downloads.onChanged.addListener(listener);
      });
    });
  }
}

// Message types
const MessageType = {
  CLIP_PAGE: 'CLIP_PAGE',
  CONTENT_EXTRACTED: 'CONTENT_EXTRACTED',
  GET_SETTINGS: 'GET_SETTINGS',
  SAVE_SETTINGS: 'SAVE_SETTINGS'
};

// Default settings
const DEFAULT_SETTINGS = {
  // API settings (legacy mode)
  apiUrl: 'http://localhost:27123',
  apiKey: '',
  vaultName: '',

  // Clipping settings
  folderPath: 'Clippings',
  defaultTags: ['clippings'],
  defaultAuthor: '',
  includeDescription: true,
  includePublishDate: true,

  // Mode selection
  clipMode: 'filesystem', // 'filesystem', 'api', or 'auto'
  filesystemPath: '', // Relative path within Downloads folder

  // Feature flags
  enabled: true,
  useWebhook: false,
  webhookUrl: ''
};

// Filesystem clipper instance
const filesystemClipper = new FilesystemClipper();

// Clipped URLs cache (for duplicate detection)
const clippedUrls = new Set();

/**
 * Progress indicator for user feedback
 */
class ProgressIndicator {
  constructor(tabId) {
    this.tabId = tabId;
    this.notificationId = null;
  }

  async start(message) {
    await chrome.action.setBadgeText({ tabId: this.tabId, text: '...' });
    await chrome.action.setBadgeBackgroundColor({ tabId: this.tabId, color: '#f97316' });
  }

  async complete(message) {
    await chrome.action.setBadgeText({ tabId: this.tabId, text: '✓' });
    await chrome.action.setBadgeBackgroundColor({ tabId: this.tabId, color: '#22c55e' });

    this.notificationId = await this.createNotification({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Clipped Successfully',
      message: message,
      silent: true
    });

    setTimeout(async () => {
      await chrome.action.setBadgeText({ tabId: this.tabId, text: '' });
      if (this.notificationId) {
        await chrome.notifications.clear(this.notificationId);
      }
    }, 2000);
  }

  async error(message, error) {
    await chrome.action.setBadgeText({ tabId: this.tabId, text: '✗' });
    await chrome.action.setBadgeBackgroundColor({ tabId: this.tabId, color: '#ef4444' });

    this.notificationId = await this.createNotification({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Clipping Failed',
      message: error ? `${message}: ${error.message}` : message,
      requireInteraction: true
    });

    setTimeout(async () => {
      await chrome.action.setBadgeText({ tabId: this.tabId, text: '' });
    }, 3000);
  }

  async createNotification(options) {
    return new Promise(resolve => {
      chrome.notifications.create(options, notificationId => {
        resolve(notificationId);
      });
    });
  }
}

/**
 * Clip using filesystem (downloads API)
 */
async function clipToFilesystem(clipData, settings) {
  console.log('🔵 Attempting filesystem clip...');
  try {
    await filesystemClipper.saveClip(clipData, settings);
    console.log('✅ Filesystem clip successful');
    return true;
  } catch (error) {
    console.error('❌ Filesystem clip failed:', error);
    throw error;
  }
}

/**
 * Clip using Obsidian API (requires Obsidian running)
 */
async function clipToAPI(clipData, settings) {
  console.log('🔵 Attempting API clip...');

  if (!settings.apiKey) {
    throw new Error('API key not configured');
  }

  if (!settings.vaultName) {
    throw new Error('Vault name not configured');
  }

  // Generate markdown content
  const content = filesystemClipper.createMarkdownContent(clipData, settings);
  const filename = filesystemClipper.generateFilename(clipData);
  const filepath = settings.folderPath ? `${settings.folderPath}/${filename}` : filename;
  const url = `${settings.apiUrl.replace(/\/$/, '')}/vault/${filepath}`;

  console.log('🌐 API URL:', url);

  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${settings.apiKey}`,
        'Content-Type': 'text/markdown'
      },
      body: content
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${errorText}`);
    }

    console.log('✅ API clip successful');
    return true;
  } catch (error) {
    console.error('❌ API clip failed:', error);
    throw error;
  }
}

/**
 * Main clipping function with fallback logic
 */
async function clipPage(clipData, settings, tabId) {
  const progress = new ProgressIndicator(tabId);
  await progress.start('Starting clip...');

  let success = false;
  let method = '';
  let errors = [];

  // Determine clip order based on settings
  const methods = [];

  if (settings.clipMode === 'filesystem') {
    methods.push({ name: 'filesystem', func: clipToFilesystem });
    methods.push({ name: 'api', func: clipToAPI });
  } else if (settings.clipMode === 'api') {
    methods.push({ name: 'api', func: clipToAPI });
    methods.push({ name: 'filesystem', func: clipToFilesystem });
  } else { // 'auto' mode
    // Try filesystem first (works offline), then API
    methods.push({ name: 'filesystem', func: clipToFilesystem });
    methods.push({ name: 'api', func: clipToAPI });
  }

  // Try each method in order
  for (const { name, func } of methods) {
    try {
      await func(clipData, settings);
      success = true;
      method = name;
      break;
    } catch (error) {
      console.warn(`${name} clip failed:`, error);
      errors.push({ method: name, error });
      continue; // Try next method
    }
  }

  if (success) {
    // Mark as clipped for duplicate detection
    clippedUrls.add(clipData.url);
    await chrome.storage.local.set({ clippedUrls: Array.from(clippedUrls) });

    await progress.complete(`Saved via ${method}: ${clipData.title}`);
  } else {
    // All methods failed
    const errorMsg = errors.map(e => `${e.method}: ${e.error.message}`).join('; ');
    await progress.error('All clip methods failed', new Error(errorMsg));
  }

  return success;
}

/**
 * Handle extension icon click
 */
chrome.action.onClicked.addListener(async (tab) => {
  console.log('🖱️ Extension icon clicked for tab:', tab.url);

  if (!tab.id || !tab.url) {
    console.error('❌ Invalid tab - no ID or URL');
    return;
  }

  try {
    // Set up message listener for content extraction
    const extractionPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Content extraction timeout'));
      }, 20000);

      const messageListener = (message) => {
        console.log('📨 Received message:', message.type);
        if (message.type === MessageType.CONTENT_EXTRACTED) {
          console.log('✅ Got CONTENT_EXTRACTED message!');
          clearTimeout(timeout);
          chrome.runtime.onMessage.removeListener(messageListener);
          resolve(message.data);
        }
      };

      chrome.runtime.onMessage.addListener(messageListener);
      console.log('👂 Message listener set up');
    });

    // Inject content script
    console.log('💉 Injecting content script...');
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
    console.log('✅ Content script injected');

    // Wait for extracted data
    const clipData = await extractionPromise;
    console.log('📄 Extracted clip data:', {
      title: clipData.title,
      url: clipData.url,
      contentLength: clipData.content?.length
    });

    // Load settings
    console.log('⚙️ Loading settings...');
    const { settings } = await chrome.storage.local.get('settings');
    const finalSettings = settings || DEFAULT_SETTINGS;
    console.log('⚙️ Settings loaded');

    // Clip the page
    await clipPage(clipData, finalSettings, tab.id);

  } catch (error) {
    console.error('❌ Clipping failed:', error);
    const progress = new ProgressIndicator(tab.id);
    await progress.error('Clipping failed', error);
  }
});

/**
 * Handle messages from options page
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      switch (message.type) {
        case MessageType.GET_SETTINGS: {
          const { settings } = await chrome.storage.local.get('settings');
          return { success: true, data: settings || DEFAULT_SETTINGS };
        }

        case MessageType.SAVE_SETTINGS:
          await chrome.storage.local.set({ settings: message.data });
          return { success: true };

        default:
          return { success: false, error: 'Unknown message type' };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  })().then(sendResponse);

  return true; // Keep channel open for async response
});

/**
 * Initialize extension on install
 */
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Quick Obsidian Clipper installed');

  // Initialize settings if not present
  const { settings } = await chrome.storage.local.get('settings');
  if (!settings) {
    await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
  }

  // Load clipped URLs cache
  const { clippedUrls: saved } = await chrome.storage.local.get('clippedUrls');
  if (saved) {
    saved.forEach(url => clippedUrls.add(url));
  }

  console.log('✅ Extension initialized');
});

/**
 * Keep service worker alive (ping every minute)
 */
chrome.alarms.create('keep-alive', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keep-alive') {
    console.log('Service worker keep-alive ping');
  }
});

console.log('🚀 Quick Obsidian Clipper background script loaded');

// Global error handler
self.addEventListener('error', (event) => {
  console.error('❌ Service worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Unhandled promise rejection:', event.reason);
});
