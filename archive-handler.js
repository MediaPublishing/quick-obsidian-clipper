// Archive.ph Handler
// Automatically archives paywalled content before clipping

console.log('Archive Handler loaded');

class ArchiveHandler {
  constructor() {
    this.archiveUrl = 'https://archive.ph/submit/';
    this.paywallSites = [
      'nytimes.com',
      'newyorker.com',
      'washingtonpost.com',
      'ft.com',
      'wsj.com',
      'forbes.com',
      'economist.com',
      'bloomberg.com',
      'theatlantic.com'
    ];
  }

  shouldArchive(url) {
    return this.paywallSites.some(site => url.includes(site));
  }

  async archiveAndGetUrl(originalUrl) {
    console.log('Archiving URL via archive.ph:', originalUrl);

    try {
      // Method 1: Try direct archive.ph URL construction
      // Archive.ph accepts URLs in format: https://archive.ph/newest/URL
      const archiveCheckUrl = `https://archive.ph/newest/${encodeURIComponent(originalUrl)}`;

      console.log('Checking for existing archive:', archiveCheckUrl);

      // Try to get existing archive first
      const existingArchive = await this.checkExistingArchive(originalUrl);
      if (existingArchive) {
        console.log('Found existing archive:', existingArchive);
        return existingArchive;
      }

      // No existing archive - create new one
      console.log('No existing archive found, creating new one...');
      const newArchiveUrl = await this.createNewArchive(originalUrl);

      return newArchiveUrl;

    } catch (error) {
      console.error('Archive.ph failed:', error);
      // Fallback to original URL if archiving fails
      console.warn('Falling back to original URL');
      return originalUrl;
    }
  }

  async checkExistingArchive(url) {
    try {
      // Archive.ph stores archives with a shortcode
      // We can check if an archive exists by trying the "newest" endpoint
      const checkUrl = `https://archive.ph/newest/${encodeURIComponent(url)}`;

      console.log('Checking for existing archive at:', checkUrl);

      // Since we're in a content script, we can't directly fetch
      // Instead, we'll return the check URL and let the background script handle it
      // The background script can open this URL and if it redirects to an archive, use it

      // For now, we'll use a simpler approach: always create new archive
      // but this could be enhanced with a HEAD request in the background script

      return null;
    } catch (error) {
      console.warn('Archive check failed:', error);
      return null;
    }
  }

  async createNewArchive(url) {
    // Archive.ph accepts submissions via their submit page
    // The easiest way is to navigate to the submit URL with the target URL as parameter

    // Archive.ph submit URL format: https://archive.ph/submit/?url=ENCODED_URL
    const submitUrl = `https://archive.ph/submit/?url=${encodeURIComponent(url)}`;

    console.log('Creating archive via:', submitUrl);

    // Return the submit URL - archive.ph will process and redirect
    // The background script should open this, wait for redirect, then extract from the final URL
    return submitUrl;
  }

  async waitForArchiveReady(submitUrl, maxWait = 30000) {
    // This would need to be implemented in background script
    // since content scripts can't directly monitor tab navigation
    console.log('Archive submission sent, waiting for processing...');
    return submitUrl;
  }

  // Check if current page is an archive.ph page
  isArchivePage(url) {
    return url.includes('archive.ph') || url.includes('archive.is') || url.includes('archive.today');
  }

  // Extract original URL from archive page
  getOriginalUrl(archiveUrl) {
    // Archive URLs contain the original URL in the path
    // Example: https://archive.ph/XXXXX/https://example.com/article
    const match = archiveUrl.match(/archive\.(ph|is|today)\/[^/]+\/(https?:\/\/.+)/);
    if (match) {
      return match[2];
    }
    return null;
  }
}

// Make available globally
window.ArchiveHandler = ArchiveHandler;
