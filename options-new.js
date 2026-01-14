// Options page logic
console.log('Options page loaded');

function loadData() {
  chrome.storage.local.get(['settings', 'clippingHistory', 'clipperDownloadPath'], (result) => {
    const settings = result.settings || {};
    const history = result.clippingHistory || [];
    const detectedPath = result.clipperDownloadPath;

    document.getElementById('requested-folder').textContent = settings.saveLocation || 'Obsidian-Clips';

    if (detectedPath) {
      document.getElementById('actual-path').textContent = detectedPath;
      document.getElementById('path-status').textContent = 'Detected';
      document.getElementById('path-status').className = 'status-badge status-detected';
    } else {
      document.getElementById('actual-path').textContent = 'Not detected - clip something first';
      document.getElementById('path-status').textContent = 'Unknown';
      document.getElementById('path-status').className = 'status-badge status-unknown';
    }

    const successful = history.filter(c => c.status === 'success').length;
    const failed = history.filter(c => c.status === 'failed').length;

    document.getElementById('total-clips').textContent = history.length;
    document.getElementById('successful-clips').textContent = successful;
    document.getElementById('failed-clips').textContent = failed;
  });
}

document.getElementById('view-history').addEventListener('click', () => {
  chrome.tabs.create({ url: `chrome-extension://${chrome.runtime.id}/history.html` });
});

document.getElementById('refresh-stats').addEventListener('click', loadData);

loadData();
setInterval(loadData, 5000);
