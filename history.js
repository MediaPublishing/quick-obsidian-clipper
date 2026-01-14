// History page JavaScript
let allClips = [];
let filteredClips = [];

// Load history on page load
document.addEventListener('DOMContentLoaded', () => {
  loadHistory();
  setupEventListeners();
});

function loadHistory() {
  chrome.storage.local.get(['clippingHistory'], (result) => {
    allClips = result.clippingHistory || [];
    filteredClips = [...allClips];
    renderHistory(filteredClips);
    updateStats(allClips);
  });
}

function renderHistory(clips) {
  const container = document.getElementById('history-list');

  if (clips.length === 0) {
    container.innerHTML = `
      <div class="empty">
        <div class="empty-icon">📭</div>
        <div class="empty-title">No clips found</div>
        <div class="empty-text">Try adjusting your filters or start clipping!</div>
      </div>
    `;
    return;
  }

  container.innerHTML = clips.map((clip, index) => {
    const statusClass = clip.status === 'success' ? 'success' : 'failed';
    const statusLabel = clip.status === 'success' ? 'Success' : 'Failed';

    return `
      <div class="clip-item ${statusClass}" data-index="${index}">
        <div class="clip-header">
          <div class="clip-title">${escapeHtml(clip.title || 'Untitled')}</div>
          <div class="clip-status status-${clip.status}">${statusLabel}</div>
        </div>
        <div class="clip-meta">
          <div class="clip-url">
            <a href="${escapeHtml(clip.url)}" target="_blank" rel="noopener">${escapeHtml(truncateUrl(clip.url))}</a>
          </div>
          <div class="clip-time">${formatTime(clip.timestamp)}</div>
        </div>
        ${clip.error ? `<div class="clip-error">❌ ${escapeHtml(clip.error)}</div>` : ''}
        <div class="clip-actions">
          <button class="action-btn open-url-btn" data-url="${encodeURIComponent(clip.url)}">🔗 Open URL</button>
          ${clip.filename ? `<button class="action-btn show-folder-btn" data-filename="${encodeURIComponent(clip.filename)}">📁 Show File</button>` : ''}
          <button class="action-btn reclip-btn" data-url="${encodeURIComponent(clip.url)}">🔄 Re-clip</button>
          <button class="action-btn delete-btn" data-timestamp="${clip.timestamp}">🗑️ Delete</button>
        </div>
      </div>
    `;
  }).join('');

  // Set up action button event listeners using event delegation
  setupActionButtons(container);
}

function setupActionButtons(container) {
  // Event delegation for all action buttons
  // Don't clone - just add listeners once on the container
  container.onclick = (e) => {
    const btn = e.target.closest('.action-btn');
    if (!btn) return;

    e.preventDefault();
    e.stopPropagation();

    console.log('Action button clicked:', btn.className, btn.dataset);

    if (btn.classList.contains('open-url-btn')) {
      const url = btn.dataset.url ? decodeURIComponent(btn.dataset.url) : null;
      if (url) {
        console.log('Opening URL:', url);
        openUrl(url);
      } else {
        console.error('No URL data for open button');
      }
    } else if (btn.classList.contains('show-folder-btn')) {
      const filename = btn.dataset.filename ? decodeURIComponent(btn.dataset.filename) : null;
      if (filename) {
        console.log('Showing folder for:', filename);
        showInFolder(filename);
      }
    } else if (btn.classList.contains('reclip-btn')) {
      const url = btn.dataset.url ? decodeURIComponent(btn.dataset.url) : null;
      if (url) {
        console.log('Re-clipping URL:', url);
        reclip(url);
      } else {
        console.error('No URL data for reclip button');
      }
    } else if (btn.classList.contains('delete-btn')) {
      const timestamp = btn.dataset.timestamp;
      if (timestamp) {
        console.log('Deleting clip with timestamp:', timestamp);
        deleteClip(timestamp);
      } else {
        console.error('No timestamp data for delete button');
      }
    }
  };
}

function updateStats(clips) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

  const todayClips = clips.filter(c => c.timestamp && c.timestamp.startsWith(today));
  const weekClips = clips.filter(c => c.timestamp && new Date(c.timestamp) > weekAgo);
  const successClips = clips.filter(c => c.status === 'success');

  const successRate = clips.length > 0
    ? Math.round((successClips.length / clips.length) * 100)
    : 0;

  document.getElementById('total-clips').textContent = clips.length;
  document.getElementById('today-clips').textContent = todayClips.length;
  document.getElementById('week-clips').textContent = weekClips.length;
  document.getElementById('success-rate').textContent = successRate + '%';
}

function formatTime(timestamp) {
  if (!timestamp) return 'Unknown';

  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  // Less than 1 minute
  if (diff < 60000) return 'Just now';

  // Less than 1 hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes}m ago`;
  }

  // Less than 1 day
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}h ago`;
  }

  // Less than 1 week
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000);
    return `${days}d ago`;
  }

  // Older - show date
  return date.toLocaleDateString();
}

function truncateUrl(url) {
  if (!url) return '';
  try {
    const urlObj = new URL(url);
    const maxLength = 60;
    let display = urlObj.hostname + urlObj.pathname;
    if (display.length > maxLength) {
      display = display.substring(0, maxLength) + '...';
    }
    return display;
  } catch {
    return url.length > 60 ? url.substring(0, 60) + '...' : url;
  }
}

function setupEventListeners() {
  // Search
  document.getElementById('search').addEventListener('input', applyFilters);

  // Status filter
  document.getElementById('filter-status').addEventListener('change', applyFilters);

  // Time filter
  document.getElementById('filter-time').addEventListener('change', applyFilters);

  // Export button
  document.getElementById('export-history').addEventListener('click', exportToCSV);

  // Clear history button
  document.getElementById('clear-history').addEventListener('click', clearHistory);
}

function applyFilters() {
  const searchQuery = document.getElementById('search').value.toLowerCase();
  const statusFilter = document.getElementById('filter-status').value;
  const timeFilter = document.getElementById('filter-time').value;

  let filtered = [...allClips];

  // Apply search filter
  if (searchQuery) {
    filtered = filtered.filter(clip =>
      (clip.title && clip.title.toLowerCase().includes(searchQuery)) ||
      (clip.url && clip.url.toLowerCase().includes(searchQuery))
    );
  }

  // Apply status filter
  if (statusFilter !== 'all') {
    filtered = filtered.filter(clip => clip.status === statusFilter);
  }

  // Apply time filter
  if (timeFilter !== 'all') {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    filtered = filtered.filter(clip => {
      if (!clip.timestamp) return false;
      const clipDate = new Date(clip.timestamp);

      switch (timeFilter) {
        case 'today':
          return clip.timestamp.startsWith(today);
        case 'week':
          const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
          return clipDate > weekAgo;
        case 'month':
          const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
          return clipDate > monthAgo;
        default:
          return true;
      }
    });
  }

  filteredClips = filtered;
  renderHistory(filteredClips);
}

function exportToCSV() {
  const csv = [
    'Timestamp,Title,URL,Status,Filename,Error',
    ...allClips.map(c =>
      `"${c.timestamp || ''}","${escapeCSV(c.title || '')}","${c.url || ''}","${c.status || ''}","${c.filename || ''}","${c.error || ''}"`
    )
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const date = new Date().toISOString().split('T')[0];

  chrome.downloads.download({
    url: url,
    filename: `clipping-history-${date}.csv`,
    saveAs: true
  });
}

function clearHistory() {
  if (confirm('Clear all clipping history?\n\nThis will permanently delete all clip records (but not the actual files).\n\nThis action cannot be undone.')) {
    chrome.storage.local.set({ clippingHistory: [] }, () => {
      allClips = [];
      filteredClips = [];
      renderHistory([]);
      updateStats([]);
      alert('History cleared!');
    });
  }
}

function openUrl(url) {
  if (!url) return;
  chrome.tabs.create({ url: url });
}

function showInFolder(filename) {
  if (!filename) return;
  // Get the actual download path from storage
  chrome.storage.local.get(['clipperDownloadPath', 'settings'], (result) => {
    const basePath = result.clipperDownloadPath || 'Downloads';
    const folder = result.settings?.saveLocation || 'Obsidian-Clips';
    alert(`File saved to:\n${basePath}/${filename}\n\nOpen your file manager to view it.`);
  });
}

function reclip(url) {
  if (!url) {
    console.error('reclip: No URL provided');
    return;
  }

  console.log('Initiating re-clip for:', url);

  // Open the URL in a new tab and trigger clipping via message to background
  chrome.tabs.create({ url: url, active: true }, (tab) => {
    if (chrome.runtime.lastError) {
      console.error('Failed to create tab:', chrome.runtime.lastError);
      alert('Failed to open URL. Please try again.');
      return;
    }

    // Wait for page to load then trigger clipping via background script
    const listener = (tabId, changeInfo) => {
      if (tabId === tab.id && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);

        // Small delay to ensure page is ready
        setTimeout(() => {
          // Send message to background script to trigger clip
          chrome.runtime.sendMessage({
            type: 'CLIP_TAB',
            tabId: tab.id
          }, (response) => {
            if (chrome.runtime.lastError) {
              console.error('Failed to send clip message:', chrome.runtime.lastError);
              // Fallback: try injecting content script directly
              chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
              }).then(() => {
                console.log('Re-clip triggered via content script for:', url);
              }).catch(err => {
                console.error('Failed to re-clip:', err);
                alert('Failed to re-clip. Please click the extension icon manually.');
              });
            } else {
              console.log('Re-clip response:', response);
            }
          });
        }, 1500);
      }
    };

    chrome.tabs.onUpdated.addListener(listener);

    // Timeout fallback - remove listener after 30 seconds
    setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
    }, 30000);
  });
}

function deleteClip(timestamp) {
  if (!timestamp) return;

  if (confirm('Delete this clip from history?\n\n(The downloaded file will not be deleted)')) {
    allClips = allClips.filter(c => c.timestamp !== timestamp);
    chrome.storage.local.set({ clippingHistory: allClips }, () => {
      applyFilters();
      updateStats(allClips);
    });
  }
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function escapeCSV(text) {
  if (!text) return '';
  return text.replace(/"/g, '""');
}
