// Helper: Safe DOM element access
function $(id) {
  return document.getElementById(id);
}

// Load data from Chrome storage
function loadData() {
  chrome.storage.local.get(['settings', 'clippingHistory', 'clipperDownloadPath'], (result) => {
    const settings = result.settings || {};
    const history = result.clippingHistory || [];
    const detectedPath = result.clipperDownloadPath;

    // Remove loading state
    document.querySelectorAll('.loading').forEach(el => {
      el.classList.remove('loading');
    });

    // Update custom download path input
    const customPathInput = $('custom-download-path');
    if (customPathInput && settings.customDownloadPath) {
      customPathInput.value = settings.customDownloadPath;
    }

    // Update requested folder
    const requestedFolder = settings.saveLocation || 'Obsidian-Clips';
    const requestedFolderEl = $('requested-folder');
    if (requestedFolderEl) requestedFolderEl.textContent = requestedFolder;

    // Update detected path and status
    const statusLed = $('status-led');
    const pathStatus = $('path-status');
    const actualPath = $('actual-path');

    if (detectedPath) {
      if (actualPath) actualPath.textContent = detectedPath;
      if (statusLed) {
        statusLed.classList.add('active');
        statusLed.classList.remove('inactive');
      }
      if (pathStatus) {
        pathStatus.innerHTML = '<span>✓</span><span>Detected</span>';
        pathStatus.classList.remove('unknown');
        pathStatus.classList.add('detected');
      }
    } else {
      if (actualPath) actualPath.textContent = 'Not detected — clip something first';
      if (statusLed) {
        statusLed.classList.add('inactive');
        statusLed.classList.remove('active');
      }
      if (pathStatus) {
        pathStatus.innerHTML = '<span>⏳</span><span>Unknown</span>';
        pathStatus.classList.add('unknown');
        pathStatus.classList.remove('detected');
      }
    }

    // Calculate statistics
    const successful = history.filter(c => c.status === 'success').length;
    const failed = history.filter(c => c.status === 'failed').length;

    const totalClipsEl = $('total-clips');
    const successfulClipsEl = $('successful-clips');
    const failedClipsEl = $('failed-clips');

    if (totalClipsEl) totalClipsEl.textContent = history.length;
    if (successfulClipsEl) successfulClipsEl.textContent = successful;
    if (failedClipsEl) failedClipsEl.textContent = failed;
  });
}

// View history button
const viewHistoryBtn = $('view-history');
if (viewHistoryBtn) {
  viewHistoryBtn.addEventListener('click', () => {
    const extensionId = chrome.runtime.id;
    const historyUrl = `chrome-extension://${extensionId}/history.html`;
    chrome.tabs.create({ url: historyUrl });
  });
}

// Refresh button
const refreshStatsBtn = $('refresh-stats');
if (refreshStatsBtn) {
  refreshStatsBtn.addEventListener('click', () => {
    // Add loading state back
    document.querySelectorAll('.data-value, .stat-value').forEach(el => {
      el.classList.add('loading');
    });

    // Reload data after short delay for visual feedback
    setTimeout(loadData, 300);
  });
}

// Initial load
loadData();

// Auto-refresh every 5 seconds
setInterval(loadData, 5000);

// ===== TWITTER BOOKMARK SYNC HANDLERS =====

// Load Twitter sync data
function loadTwitterSyncData() {
  chrome.storage.local.get(['settings'], (result) => {
    const settings = result.settings || {};
    const syncSettings = settings.twitterBookmarkSync || {};

    // Remove loading state
    document.querySelectorAll('.loading').forEach(el => {
      el.classList.remove('loading');
    });

    // Update toggle
    const enableCheckbox = $('enable-twitter-sync');
    if (enableCheckbox) enableCheckbox.checked = syncSettings.enabled || false;

    // Update interval
    const intervalSelect = $('sync-interval');
    if (intervalSelect) intervalSelect.value = syncSettings.autoSyncInterval || 30;

    // Update LED status
    const twitterSyncLed = $('twitter-sync-led');
    if (twitterSyncLed) {
      if (syncSettings.enabled) {
        twitterSyncLed.classList.add('active');
        twitterSyncLed.classList.remove('inactive');
      } else {
        twitterSyncLed.classList.add('inactive');
        twitterSyncLed.classList.remove('active');
      }
    }

    // Update last sync time
    const lastSyncTime = $('last-sync-time');
    if (lastSyncTime) {
      if (syncSettings.lastSyncTimestamp) {
        const date = new Date(syncSettings.lastSyncTimestamp);
        lastSyncTime.textContent = date.toLocaleString();
      } else {
        lastSyncTime.textContent = 'Never';
      }
    }

    // Update total synced count
    const totalSynced = $('total-synced-count');
    if (totalSynced) totalSynced.textContent = syncSettings.syncedTweetIds?.length || 0;

    // Update stats
    const bookmarksFound = $('bookmarks-found');
    const newlySynced = $('newly-synced');
    const alreadySyncedEl = $('already-synced');

    if (bookmarksFound) bookmarksFound.textContent = syncSettings.totalBookmarksFound || 0;
    if (newlySynced) newlySynced.textContent = syncSettings.totalNewlySynced || 0;
    if (alreadySyncedEl) {
      const alreadySynced = (syncSettings.totalBookmarksFound || 0) - (syncSettings.totalNewlySynced || 0);
      alreadySyncedEl.textContent = Math.max(0, alreadySynced);
    }
  });
}

// Enable/disable toggle handler
const enableTwitterSyncEl = $('enable-twitter-sync');
if (enableTwitterSyncEl) {
  enableTwitterSyncEl.addEventListener('change', (e) => {
    chrome.runtime.sendMessage({
      type: 'UPDATE_TWITTER_SYNC_SETTINGS',
      data: { enabled: e.target.checked }
    }, (response) => {
      if (response && response.success) {
        loadTwitterSyncData();
      }
    });
  });
}

// Interval change handler
const syncIntervalEl = $('sync-interval');
if (syncIntervalEl) {
  syncIntervalEl.addEventListener('change', (e) => {
    chrome.runtime.sendMessage({
      type: 'UPDATE_TWITTER_SYNC_SETTINGS',
      data: { autoSyncInterval: parseInt(e.target.value) }
    }, (response) => {
      if (response && response.success) {
        loadTwitterSyncData();
      }
    });
  });
}

// Sync now button
const syncTwitterNowBtn = $('sync-twitter-now');
if (syncTwitterNowBtn) {
  syncTwitterNowBtn.addEventListener('click', () => {
    const btn = $('sync-twitter-now');
    if (!btn) return;

    const spanEl = btn.querySelector('span');
    const originalText = spanEl ? spanEl.textContent : 'Sync Now';

    // Show loading state
    if (spanEl) spanEl.textContent = '⏳ Syncing...';
    btn.disabled = true;

    chrome.runtime.sendMessage({
      type: 'SYNC_TWITTER_BOOKMARKS'
    }, (response) => {
      // Restore button
      if (spanEl) spanEl.textContent = originalText;
      btn.disabled = false;

      if (response && response.success) {
        // Refresh data after sync completes
        setTimeout(() => {
          loadTwitterSyncData();
          loadData(); // Also refresh main stats
        }, 2000);
      } else {
        alert('Sync failed: ' + (response?.error || 'Unknown error'));
      }
    });
  });
}

// Reset tracking button
const resetTrackingBtn = $('reset-twitter-tracking');
if (resetTrackingBtn) {
  resetTrackingBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset Twitter bookmark sync tracking? This will allow previously synced tweets to be synced again.')) {
      chrome.runtime.sendMessage({
        type: 'RESET_TWITTER_SYNC_TRACKING'
      }, (response) => {
        if (response && response.success) {
          loadTwitterSyncData();
        }
      });
    }
  });
}

// Initial load of Twitter sync data
loadTwitterSyncData();

// ===== CUSTOM DOWNLOAD PATH HANDLER =====

// Browse button - opens native folder picker
const browsePathBtn = $('browse-path');
if (browsePathBtn) {
  browsePathBtn.addEventListener('click', async () => {
    try {
      // Check if File System Access API is available
      if (!('showDirectoryPicker' in window)) {
        alert('Folder picker not available in this browser.\n\nTo get the path manually:\n1. Open Finder\n2. Navigate to your target folder\n3. Press Option+Cmd+C to copy the path\n4. Paste it in the input field');
        return;
      }

      // Open native folder picker
      const dirHandle = await window.showDirectoryPicker({
        mode: 'read',
        startIn: 'documents'
      });

      // We can only get the folder name, not the full path (browser security)
      const folderName = dirHandle.name;

      // Try to construct a likely path based on common patterns
      const customPathInput = $('custom-download-path');
      if (customPathInput) {
        // Show prompt with folder name to help user complete the path
        const currentValue = customPathInput.value || '';

        // If there's already a path, try to append or suggest
        if (currentValue) {
          const confirmAppend = confirm(`Selected folder: "${folderName}"\n\nAppend to current path?\n${currentValue}/${folderName}`);
          if (confirmAppend) {
            customPathInput.value = `${currentValue.replace(/\/$/, '')}/${folderName}`;
          }
        } else {
          // Suggest common base paths for Mac
          const suggestedPath = prompt(
            `Selected folder: "${folderName}"\n\nBrowser security prevents getting the full path.\n\nEnter the complete path to this folder:`,
            `/Users/${folderName}`
          );
          if (suggestedPath) {
            customPathInput.value = suggestedPath;
          }
        }
      }

    } catch (error) {
      // User cancelled or error
      if (error.name !== 'AbortError') {
        console.error('Folder picker error:', error);
        alert('Could not open folder picker.\n\nTo get the path manually:\n1. Open Finder\n2. Navigate to your target folder\n3. Press Option+Cmd+C to copy the path\n4. Paste it in the input field');
      }
    }
  });
}

// Save button
const saveCustomPathBtn = $('save-custom-path');
if (saveCustomPathBtn) {
  saveCustomPathBtn.addEventListener('click', () => {
    const customPathInput = $('custom-download-path');
    if (!customPathInput) return;

    const newPath = customPathInput.value.trim();

    chrome.storage.local.get(['settings'], (result) => {
      const settings = result.settings || {};
      settings.customDownloadPath = newPath;

      // Also update clipperDownloadPath for sync script
      chrome.storage.local.set({
        settings,
        clipperDownloadPath: newPath || null
      }, () => {
        console.log('Custom download path saved:', newPath);

        // Show confirmation
        const btn = $('save-custom-path');
        const span = btn?.querySelector('span');
        if (span) {
          const originalText = span.textContent;
          span.textContent = '✓ Saved!';
          setTimeout(() => {
            span.textContent = originalText;
          }, 2000);
        }
      });
    });
  });
}

// Clear button
const clearCustomPathBtn = $('clear-custom-path');
if (clearCustomPathBtn) {
  clearCustomPathBtn.addEventListener('click', () => {
    const customPathInput = $('custom-download-path');
    if (customPathInput) {
      customPathInput.value = '';
    }

    chrome.storage.local.get(['settings'], (result) => {
      const settings = result.settings || {};
      settings.customDownloadPath = '';

      chrome.storage.local.set({
        settings,
        clipperDownloadPath: null
      }, () => {
        console.log('Custom download path cleared');

        // Show confirmation
        const btn = $('clear-custom-path');
        const span = btn?.querySelector('span');
        if (span) {
          const originalText = span.textContent;
          span.textContent = '✓ Cleared!';
          setTimeout(() => {
            span.textContent = originalText;
          }, 2000);
        }
      });
    });
  });
}

// ===== PHASE 2 FEATURES HANDLERS =====

// Load Phase 2 settings
function loadPhase2Settings() {
  chrome.storage.local.get(['settings'], (result) => {
    const settings = result.settings || {};

    // Update clipped badge toggle
    const clippedBadgeCheckbox = $('enable-clipped-badge');
    if (clippedBadgeCheckbox) {
      clippedBadgeCheckbox.checked = settings.showClippedBadge !== false; // Default true
    }

    // Update archive mode toggle
    const archiveCheckbox = $('enable-archive-mode');
    if (archiveCheckbox) archiveCheckbox.checked = settings.autoArchive || false;

    // Update Medium bypass toggle
    const mediumCheckbox = $('enable-medium-bypass');
    if (mediumCheckbox) mediumCheckbox.checked = settings.bypassMedium || false;

    // Update domain prefix toggle
    const prefixCheckbox = $('enable-domain-prefixes');
    if (prefixCheckbox) {
      prefixCheckbox.checked = settings.useDomainPrefixes !== false;
    }

    // Update homepage bookmark toggle
    const homepageCheckbox = $('enable-homepage-bookmarks');
    if (homepageCheckbox) {
      homepageCheckbox.checked = settings.homepageAsBookmark || false;
    }
  });
}

// Clipped badge toggle handler
const clippedBadgeEl = $('enable-clipped-badge');
if (clippedBadgeEl) {
  clippedBadgeEl.addEventListener('change', (e) => {
    chrome.storage.local.get(['settings'], (result) => {
      const settings = result.settings || {};
      settings.showClippedBadge = e.target.checked;
      chrome.storage.local.set({ settings }, () => {
        console.log('Clipped badge:', e.target.checked);
      });
    });
  });
}

// Archive mode toggle handler
const archiveModeEl = $('enable-archive-mode');
if (archiveModeEl) {
  archiveModeEl.addEventListener('change', (e) => {
    chrome.storage.local.get(['settings'], (result) => {
      const settings = result.settings || {};
      settings.autoArchive = e.target.checked;
      chrome.storage.local.set({ settings }, () => {
        console.log('Archive mode:', e.target.checked);
      });
    });
  });
}

// Medium bypass toggle handler
const mediumBypassEl = $('enable-medium-bypass');
if (mediumBypassEl) {
  mediumBypassEl.addEventListener('change', (e) => {
    chrome.storage.local.get(['settings'], (result) => {
      const settings = result.settings || {};
      settings.bypassMedium = e.target.checked;
      chrome.storage.local.set({ settings }, () => {
        console.log('Medium bypass:', e.target.checked);
      });
    });
  });
}

// Domain prefix toggle handler
const domainPrefixesEl = $('enable-domain-prefixes');
if (domainPrefixesEl) {
  domainPrefixesEl.addEventListener('change', (e) => {
    chrome.storage.local.get(['settings'], (result) => {
      const settings = result.settings || {};
      settings.useDomainPrefixes = e.target.checked;
      chrome.storage.local.set({ settings }, () => {
        console.log('Domain prefixes:', e.target.checked);
        const prefixSection = $('prefix-rules-section');
        if (prefixSection) {
          prefixSection.style.display = e.target.checked ? 'flex' : 'none';
        }
      });
    });
  });
}

// Homepage bookmark toggle handler
const homepageBookmarksEl = $('enable-homepage-bookmarks');
if (homepageBookmarksEl) {
  homepageBookmarksEl.addEventListener('change', (e) => {
    chrome.storage.local.get(['settings'], (result) => {
      const settings = result.settings || {};
      settings.homepageAsBookmark = e.target.checked;
      chrome.storage.local.set({ settings }, () => {
        console.log('Homepage as bookmark:', e.target.checked);
      });
    });
  });
}

// Initial load of Phase 2 settings
loadPhase2Settings();

// ===== ARCHIVE SITES MANAGEMENT =====

// Default archive sites (same as in background-simple.js)
const DEFAULT_ARCHIVE_SITES = [
  'nytimes.com',
  'newyorker.com',
  'washingtonpost.com',
  'wsj.com',
  'ft.com',
  'economist.com',
  'theatlantic.com',
  'bloomberg.com',
  'businessinsider.com',
  'wired.com',
  'thetimes.co.uk',
  'telegraph.co.uk',
  'theguardian.com',
  'latimes.com',
  'bostonglobe.com',
  'chicagotribune.com',
  'sfchronicle.com',
  'seattletimes.com',
  'hbr.org',
  'foreignpolicy.com',
  'foreignaffairs.com'
];

const DEFAULT_PREFIX_RULES = [
  { domain: 'x.com', prefix: 'x' },
  { domain: 'twitter.com', prefix: 'x' },
  { domain: 'youtube.com', prefix: 'yt' },
  { domain: 'youtu.be', prefix: 'yt' },
  { domain: 'github.com', prefix: 'gh' },
  { domain: 'wsj.com', prefix: 'wsj' },
  { domain: 'nytimes.com', prefix: 'nyt' },
  { domain: 'substack.com', prefix: 'sub' },
  { domain: 'movieinsider.com', prefix: 'mi' },
  { domain: 'reddit.com', prefix: 'rd' },
  { domain: 'techcrunch.com', prefix: 'tc' },
  { domain: 'venturebeat.com', prefix: 'vb' }
];

// Load and display archive sites
function loadArchiveSites() {
  chrome.storage.local.get(['settings'], (result) => {
    const settings = result.settings || {};
    const sites = settings.archiveSites || DEFAULT_ARCHIVE_SITES;

    renderArchiveSitesList(sites);
    updateArchiveSitesCount(sites.length);

    // Show/hide section based on archive mode
    const archiveSitesSection = $('archive-sites-section');
    if (archiveSitesSection) {
      archiveSitesSection.style.display = settings.autoArchive ? 'flex' : 'none';
    }
  });
}

// Render the sites list
function renderArchiveSitesList(sites) {
  const listContainer = $('archive-sites-list');
  if (!listContainer) return;

  if (sites.length === 0) {
    listContainer.innerHTML = '<div style="color: var(--gray-500); font-size: 13px; padding: 12px; text-align: center;">No sites configured. Add sites above.</div>';
    return;
  }

  listContainer.innerHTML = sites.map(site => `
    <div class="archive-site-item" data-site="${site}" style="
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background: var(--gray-50);
      border-radius: 6px;
      margin-bottom: 6px;
      font-size: 13px;
    ">
      <span style="color: var(--gray-700);">${site}</span>
      <button class="remove-site-btn" data-site="${site}" style="
        background: none;
        border: none;
        color: var(--gray-400);
        cursor: pointer;
        padding: 4px 8px;
        font-size: 16px;
        line-height: 1;
        border-radius: 4px;
        transition: all 0.15s ease;
      " onmouseover="this.style.color='var(--red-500)';this.style.background='var(--red-50)'"
         onmouseout="this.style.color='var(--gray-400)';this.style.background='none'"
         title="Remove site">×</button>
    </div>
  `).join('');

  // Add click handlers for remove buttons
  listContainer.querySelectorAll('.remove-site-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const siteToRemove = e.target.dataset.site;
      removeArchiveSite(siteToRemove);
    });
  });
}

// Update sites count display
function updateArchiveSitesCount(count) {
  const countEl = $('archive-sites-count');
  if (countEl) countEl.textContent = count;
}

// Add a new site
function addArchiveSite(site) {
  // Clean up the site input
  site = site.trim().toLowerCase();

  // Remove protocol if present
  site = site.replace(/^https?:\/\//, '');
  // Remove www. if present
  site = site.replace(/^www\./, '');
  // Remove trailing slash
  site = site.replace(/\/$/, '');
  // Remove any path
  site = site.split('/')[0];

  if (!site || !site.includes('.')) {
    alert('Please enter a valid domain (e.g., example.com)');
    return;
  }

  chrome.storage.local.get(['settings'], (result) => {
    const settings = result.settings || {};
    const sites = settings.archiveSites || [...DEFAULT_ARCHIVE_SITES];

    // Check for duplicates
    if (sites.includes(site)) {
      alert('This site is already in the list.');
      return;
    }

    // Add new site and sort alphabetically
    sites.push(site);
    sites.sort();

    settings.archiveSites = sites;
    chrome.storage.local.set({ settings }, () => {
      loadArchiveSites();
      // Clear input
      const input = $('new-archive-site');
      if (input) input.value = '';
    });
  });
}

// Remove a site
function removeArchiveSite(site) {
  chrome.storage.local.get(['settings'], (result) => {
    const settings = result.settings || {};
    const sites = settings.archiveSites || [...DEFAULT_ARCHIVE_SITES];

    const index = sites.indexOf(site);
    if (index > -1) {
      sites.splice(index, 1);
      settings.archiveSites = sites;
      chrome.storage.local.set({ settings }, () => {
        loadArchiveSites();
      });
    }
  });
}

// Add site button handler
const addArchiveSiteBtn = $('add-archive-site');
if (addArchiveSiteBtn) {
  addArchiveSiteBtn.addEventListener('click', () => {
    const input = $('new-archive-site');
    if (input && input.value) {
      addArchiveSite(input.value);
    }
  });
}

// Enter key handler for input
const newArchiveSiteInput = $('new-archive-site');
if (newArchiveSiteInput) {
  newArchiveSiteInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addArchiveSite(e.target.value);
    }
  });
}

// Update archive mode toggle to show/hide sites section
const archiveModeElForSites = $('enable-archive-mode');
if (archiveModeElForSites) {
  // Override the existing handler to also toggle sites section
  archiveModeElForSites.addEventListener('change', (e) => {
    const archiveSitesSection = $('archive-sites-section');
    if (archiveSitesSection) {
      archiveSitesSection.style.display = e.target.checked ? 'flex' : 'none';
    }
  });
}

// Initial load of archive sites
loadArchiveSites();

// ===== FILENAME PREFIX RULES =====

function loadPrefixRules() {
  chrome.storage.local.get(['settings'], (result) => {
    const settings = result.settings || {};
    const rules = settings.domainPrefixRules || [...DEFAULT_PREFIX_RULES];

    renderPrefixRulesList(rules);
    updatePrefixRulesCount(rules.length);

    const prefixSection = $('prefix-rules-section');
    if (prefixSection) {
      const enabled = settings.useDomainPrefixes !== false;
      prefixSection.style.display = enabled ? 'flex' : 'none';
    }
  });
}

function renderPrefixRulesList(rules) {
  const listContainer = $('prefix-rules-list');
  if (!listContainer) return;

  listContainer.innerHTML = '';

  if (!rules.length) {
    const empty = document.createElement('div');
    empty.style.color = 'var(--gray-500)';
    empty.style.fontSize = '13px';
    empty.style.padding = '12px';
    empty.style.textAlign = 'center';
    empty.textContent = 'No rules configured. Add rules above.';
    listContainer.appendChild(empty);
    return;
  }

  rules.forEach(rule => {
    const item = document.createElement('div');
    item.className = 'prefix-rule-item';
    item.dataset.domain = rule.domain;
    item.dataset.prefix = rule.prefix;
    item.style.display = 'flex';
    item.style.justifyContent = 'space-between';
    item.style.alignItems = 'center';
    item.style.padding = '8px 12px';
    item.style.background = 'var(--gray-50)';
    item.style.borderRadius = '6px';
    item.style.marginBottom = '6px';
    item.style.fontSize = '13px';

    const label = document.createElement('span');
    label.style.color = 'var(--gray-700)';
    label.textContent = `${rule.domain} → ${rule.prefix}`;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-prefix-btn';
    removeBtn.dataset.domain = rule.domain;
    removeBtn.style.background = 'none';
    removeBtn.style.border = 'none';
    removeBtn.style.color = 'var(--gray-400)';
    removeBtn.style.cursor = 'pointer';
    removeBtn.style.padding = '4px 8px';
    removeBtn.style.fontSize = '16px';
    removeBtn.style.lineHeight = '1';
    removeBtn.style.borderRadius = '4px';
    removeBtn.textContent = '×';
    removeBtn.title = 'Remove rule';

    removeBtn.addEventListener('mouseenter', () => {
      removeBtn.style.color = 'var(--error)';
      removeBtn.style.background = 'rgba(255, 51, 102, 0.08)';
    });

    removeBtn.addEventListener('mouseleave', () => {
      removeBtn.style.color = 'var(--gray-400)';
      removeBtn.style.background = 'none';
    });

    removeBtn.addEventListener('click', () => {
      removePrefixRule(rule.domain);
    });

    item.appendChild(label);
    item.appendChild(removeBtn);
    listContainer.appendChild(item);
  });
}

function updatePrefixRulesCount(count) {
  const countEl = $('prefix-rules-count');
  if (countEl) countEl.textContent = count;
}

function normalizePrefixDomain(domain) {
  if (!domain) {
    return '';
  }
  let value = domain.trim().toLowerCase();
  value = value.replace(/^https?:\/\//, '');
  value = value.replace(/^www\./, '');
  value = value.split('/')[0];
  return value;
}

function normalizePrefixValue(prefix) {
  if (!prefix) {
    return '';
  }
  return prefix.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function addPrefixRule(domain, prefix) {
  const cleanDomain = normalizePrefixDomain(domain);
  const cleanPrefix = normalizePrefixValue(prefix);

  if (!cleanDomain || !cleanDomain.includes('.')) {
    alert('Please enter a valid domain (e.g., youtube.com)');
    return;
  }

  if (!cleanPrefix) {
    alert('Please enter a short prefix (letters/numbers).');
    return;
  }

  chrome.storage.local.get(['settings'], (result) => {
    const settings = result.settings || {};
    const rules = settings.domainPrefixRules || [...DEFAULT_PREFIX_RULES];

    if (rules.some(rule => rule.domain === cleanDomain)) {
      alert('That domain already has a prefix.');
      return;
    }

    rules.push({ domain: cleanDomain, prefix: cleanPrefix });
    rules.sort((a, b) => a.domain.localeCompare(b.domain));

    settings.domainPrefixRules = rules;
    chrome.storage.local.set({ settings }, () => {
      loadPrefixRules();
      const domainInput = $('new-prefix-domain');
      const prefixInput = $('new-prefix-value');
      if (domainInput) domainInput.value = '';
      if (prefixInput) prefixInput.value = '';
    });
  });
}

function removePrefixRule(domain) {
  chrome.storage.local.get(['settings'], (result) => {
    const settings = result.settings || {};
    const rules = settings.domainPrefixRules || [...DEFAULT_PREFIX_RULES];

    const nextRules = rules.filter(rule => rule.domain !== domain);
    settings.domainPrefixRules = nextRules;

    chrome.storage.local.set({ settings }, () => {
      loadPrefixRules();
    });
  });
}

const addPrefixRuleBtn = $('add-prefix-rule');
if (addPrefixRuleBtn) {
  addPrefixRuleBtn.addEventListener('click', () => {
    const domainInput = $('new-prefix-domain');
    const prefixInput = $('new-prefix-value');
    if (domainInput && prefixInput) {
      addPrefixRule(domainInput.value, prefixInput.value);
    }
  });
}

const prefixDomainInput = $('new-prefix-domain');
if (prefixDomainInput) {
  prefixDomainInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const prefixInput = $('new-prefix-value');
      addPrefixRule(e.target.value, prefixInput?.value || '');
    }
  });
}

const prefixValueInput = $('new-prefix-value');
if (prefixValueInput) {
  prefixValueInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const domainInput = $('new-prefix-domain');
      addPrefixRule(domainInput?.value || '', e.target.value);
    }
  });
}

loadPrefixRules();

// ===== BULK CLIP ALL TABS =====

const bulkClipBtn = $('bulk-clip-tabs');
if (bulkClipBtn) {
  bulkClipBtn.addEventListener('click', async () => {
    const btn = $('bulk-clip-tabs');
    if (!btn) return;

    const spanEl = btn.querySelector('span');
    const originalText = spanEl ? spanEl.textContent : 'Bulk Clip All Tabs';

    // Get current window (returns single Window object, not array)
    const currentWindow = await chrome.windows.getCurrent();

    // Confirm action
    const tabs = await chrome.tabs.query({ windowId: currentWindow.id });
    const validTabs = tabs.filter(tab =>
      tab.url &&  // Check URL exists first
      !tab.url.startsWith('chrome://') &&
      !tab.url.startsWith('chrome-extension://') &&
      !tab.url.startsWith('about:')
    );

    if (!confirm(`Clip all ${validTabs.length} tabs in this window?\n\nThis will clip all open tabs and may take a few minutes.`)) {
      return;
    }

    // Show loading state
    if (spanEl) spanEl.textContent = '⏳ Clipping...';
    btn.disabled = true;

    try {
      // Send bulk clip message
      chrome.runtime.sendMessage({
        type: 'BULK_CLIP_TABS',
        windowId: currentWindow.id
      });

      // Wait a bit then restore button
      setTimeout(() => {
        if (spanEl) spanEl.textContent = originalText;
        btn.disabled = false;

        // Refresh stats after bulk clip
        setTimeout(() => {
          loadData();
        }, 3000);
      }, 2000);

    } catch (error) {
      alert('Bulk clip failed: ' + error.message);
      if (spanEl) spanEl.textContent = originalText;
      btn.disabled = false;
    }
  });
}

// ===== SETTINGS EXPORT/IMPORT =====

// Export settings
const exportSettingsBtn = $('export-settings');
if (exportSettingsBtn) {
  exportSettingsBtn.addEventListener('click', () => {
    chrome.storage.local.get(null, (data) => {
      // Create JSON blob
      const settingsJson = JSON.stringify(data, null, 2);
      const blob = new Blob([settingsJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      // Create timestamp for filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const filename = `obsidian-clipper-settings-${timestamp}.json`;

      // Download
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();

      // Cleanup
      URL.revokeObjectURL(url);

      // Show confirmation
      alert(`Settings exported successfully!\nFile: ${filename}`);
    });
  });
}

// Import settings
const importSettingsBtn = $('import-settings');
const importFileInput = $('import-file-input');

if (importSettingsBtn && importFileInput) {
  importSettingsBtn.addEventListener('click', () => {
    importFileInput.click();
  });

  importFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const settings = JSON.parse(event.target.result);

        // Confirm before overwriting
        if (confirm('Are you sure you want to import these settings? This will overwrite your current configuration.')) {
          chrome.storage.local.set(settings, () => {
            alert('Settings imported successfully! Refreshing...');
            location.reload();
          });
        }
      } catch (error) {
        alert('Error importing settings: ' + error.message);
      }
    };

    reader.readAsText(file);

    // Reset file input
    e.target.value = '';
  });
}
