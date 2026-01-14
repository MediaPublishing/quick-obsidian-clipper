// Bulk Clip Status Popup JavaScript

// State
let tabsState = {};
let autoCloseTabs = false;

// DOM Elements
const tabsList = document.getElementById('tabs-list');
const progressBar = document.getElementById('progress-bar');
const completedCount = document.getElementById('completed-count');
const totalCount = document.getElementById('total-count');
const successCount = document.getElementById('success-count');
const failedCount = document.getElementById('failed-count');
const closeCompletedBtn = document.getElementById('close-completed-btn');
const closePopupBtn = document.getElementById('close-popup-btn');
const autoCloseCheckbox = document.getElementById('auto-close-tabs');

// Processing type labels
const PROCESSING_LABELS = {
  'standard': 'Standard clip',
  'archive': 'Archive.ph',
  'youtube': 'YouTube transcript',
  'youtube-shorts': 'YouTube Shorts',
  'medium': 'Medium bypass',
  'twitter': 'Twitter/X',
  'tweet': 'Tweet extraction'
};

// Initialize
function init() {
  // Request current state from background
  chrome.runtime.sendMessage({ type: 'GET_BULK_CLIP_STATE' }, (response) => {
    if (response && response.state) {
      tabsState = response.state;
      renderTabs();
      updateStats();
    }
  });

  // Listen for updates from background
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'BULK_CLIP_UPDATE') {
      handleUpdate(message.data);
    } else if (message.type === 'BULK_CLIP_COMPLETE') {
      handleComplete(message.data);
    }
  });

  // Event listeners
  closeCompletedBtn.addEventListener('click', closeCompletedTabs);
  closePopupBtn.addEventListener('click', () => window.close());
  autoCloseCheckbox.addEventListener('change', (e) => {
    autoCloseTabs = e.target.checked;
  });
}

// Handle update from background
function handleUpdate(data) {
  const { tabId, status, processingType, error, title, url, favicon } = data;

  if (!tabsState[tabId]) {
    tabsState[tabId] = { tabId, title, url, favicon, status: 'pending' };
  }

  tabsState[tabId].status = status;
  if (processingType) tabsState[tabId].processingType = processingType;
  if (error) tabsState[tabId].error = error;
  if (title) tabsState[tabId].title = title;
  if (url) tabsState[tabId].url = url;
  if (favicon) tabsState[tabId].favicon = favicon;

  renderTabs();
  updateStats();

  // Auto-close if enabled and successful
  if (autoCloseTabs && status === 'success') {
    setTimeout(() => {
      chrome.tabs.remove(tabId).catch(() => {});
    }, 500);
  }
}

// Handle bulk clip complete
function handleComplete(data) {
  updateStats();
  closeCompletedBtn.disabled = false;
}

// Render tabs list
function renderTabs() {
  const tabs = Object.values(tabsState);

  if (tabs.length === 0) {
    tabsList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⏳</div>
        <p>Waiting for bulk clip to start...</p>
      </div>
    `;
    return;
  }

  // Sort: processing first, then pending, then success, then failed
  const statusOrder = { processing: 0, pending: 1, success: 2, failed: 3 };
  tabs.sort((a, b) => (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99));

  tabsList.innerHTML = tabs.map(tab => renderTabItem(tab)).join('');

  // Add event listeners to action buttons
  tabsList.querySelectorAll('.close-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tabId = parseInt(e.target.dataset.tabId);
      closeTab(tabId);
    });
  });

  tabsList.querySelectorAll('.focus-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tabId = parseInt(e.target.dataset.tabId);
      focusTab(tabId);
    });
  });
}

// Render single tab item
function renderTabItem(tab) {
  const statusClass = tab.status;
  const statusLabel = getStatusLabel(tab.status);
  const processingLabel = tab.processingType ? PROCESSING_LABELS[tab.processingType] || tab.processingType : '';
  const favicon = tab.favicon || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect fill="%23ddd" width="16" height="16" rx="2"/></svg>';

  return `
    <div class="tab-item ${statusClass}" data-tab-id="${tab.tabId}">
      <img class="tab-favicon" src="${favicon}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22><rect fill=%22%23ddd%22 width=%2216%22 height=%2216%22 rx=%222%22/></svg>'">
      <div class="tab-info">
        <div class="tab-title" title="${escapeHtml(tab.title || 'Untitled')}">${escapeHtml(tab.title || 'Untitled')}</div>
        <div class="tab-url" title="${escapeHtml(tab.url || '')}">${escapeHtml(truncateUrl(tab.url || ''))}</div>
        ${tab.error ? `<div style="color: var(--red-500); font-size: 11px; margin-top: 4px;">${escapeHtml(tab.error)}</div>` : ''}
        <div class="tab-actions">
          <button class="tab-action-btn focus-tab-btn" data-tab-id="${tab.tabId}">Focus</button>
          <button class="tab-action-btn close close-tab-btn" data-tab-id="${tab.tabId}">Close Tab</button>
        </div>
      </div>
      <div class="tab-status">
        <span class="status-badge ${statusClass}">
          ${tab.status === 'processing' ? '<span class="spinner"></span> ' : ''}
          ${statusLabel}
        </span>
        ${processingLabel ? `<span class="processing-type">${processingLabel}</span>` : ''}
      </div>
    </div>
  `;
}

// Get status label
function getStatusLabel(status) {
  switch (status) {
    case 'pending': return 'Pending';
    case 'processing': return 'Processing';
    case 'success': return 'Clipped';
    case 'failed': return 'Failed';
    default: return status;
  }
}

// Update statistics
function updateStats() {
  const tabs = Object.values(tabsState);
  const total = tabs.length;
  const completed = tabs.filter(t => t.status === 'success' || t.status === 'failed').length;
  const success = tabs.filter(t => t.status === 'success').length;
  const failed = tabs.filter(t => t.status === 'failed').length;

  totalCount.textContent = total;
  completedCount.textContent = completed;
  successCount.textContent = success;
  failedCount.textContent = failed;

  // Update progress bar
  const progress = total > 0 ? (completed / total) * 100 : 0;
  progressBar.style.width = `${progress}%`;

  // Enable close button if any completed
  closeCompletedBtn.disabled = success === 0;
}

// Close completed tabs
function closeCompletedTabs() {
  const completedTabIds = Object.values(tabsState)
    .filter(t => t.status === 'success')
    .map(t => t.tabId);

  if (completedTabIds.length === 0) return;

  if (confirm(`Close ${completedTabIds.length} completed tabs?`)) {
    completedTabIds.forEach(tabId => {
      chrome.tabs.remove(tabId).catch(() => {});
      delete tabsState[tabId];
    });
    renderTabs();
    updateStats();
  }
}

// Close single tab
function closeTab(tabId) {
  chrome.tabs.remove(tabId).catch(() => {});
  delete tabsState[tabId];
  renderTabs();
  updateStats();
}

// Focus tab
function focusTab(tabId) {
  chrome.tabs.update(tabId, { active: true }).catch(() => {});
}

// Helper: truncate URL for display
function truncateUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname + (urlObj.pathname.length > 30 ? urlObj.pathname.slice(0, 30) + '...' : urlObj.pathname);
  } catch {
    return url.length > 50 ? url.slice(0, 50) + '...' : url;
  }
}

// Helper: escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Start
init();
