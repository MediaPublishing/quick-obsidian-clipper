// Twitter Bookmark Scraper
// Extracts all bookmarked tweets from twitter.com/i/bookmarks

console.log('Twitter Bookmark Scraper loaded');

class TwitterBookmarkScraper {
  constructor() {
    this.bookmarks = [];
    this.seenTweetIds = new Set();
    this.maxStableChecks = 5; // Stop after count stable for 5 checks (increased from 3)
    this.maxTotalScrolls = 200; // Safety limit (increased from 100)
    this.scrollWaitTime = 2500; // Wait time between scrolls in ms (increased from 2000)
  }

  async scrapeAllBookmarks() {
    console.log('Starting bookmark scrape...');

    try {
      // Wait for initial page load
      await this.waitForBookmarksToLoad();

      // Scroll through all bookmarks
      await this.scrollToLoadAll();

      // Extract bookmark data from DOM
      this.extractBookmarkData();

      console.log(`Scrape complete: ${this.bookmarks.length} bookmarks found`);

      // Send results to background script
      chrome.runtime.sendMessage({
        type: 'BOOKMARKS_SCRAPED',
        data: {
          bookmarks: this.bookmarks,
          totalFound: this.bookmarks.length
        }
      });

      return this.bookmarks;

    } catch (error) {
      console.error('Bookmark scrape failed:', error);
      chrome.runtime.sendMessage({
        type: 'BOOKMARKS_SCRAPE_FAILED',
        error: error.message
      });
      throw error;
    }
  }

  async waitForBookmarksToLoad() {
    console.log('Waiting for bookmarks to load...');

    const maxWait = 15000; // 15 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      // Try multiple selectors for tweet articles (updated for 2026 X.com)
      const tweets = document.querySelectorAll('article[data-testid="tweet"]') ||
                    document.querySelectorAll('article[role="article"]') ||
                    document.querySelectorAll('[data-testid="cellInnerDiv"] article');

      if (tweets && tweets.length > 0) {
        console.log('Bookmarks loaded, found', tweets.length, 'tweets');
        await this.sleep(500); // Extra wait for content to render
        return;
      }

      // Check for login requirement
      const loginPrompt = document.querySelector('[data-testid="loginButton"]') ||
                         document.querySelector('a[href="/login"]') ||
                         document.querySelector('a[href*="/i/flow/login"]');

      if (loginPrompt && Date.now() - startTime > 5000) {
        throw new Error('Twitter login required to access bookmarks');
      }

      // Check for empty bookmarks
      const emptyState = document.querySelector('[data-testid="emptyState"]') ||
                        document.body.innerText.includes('Save posts for later');

      if (emptyState && Date.now() - startTime > 5000) {
        console.log('No bookmarks found - empty state detected');
        return; // Not an error, just no bookmarks
      }

      await this.sleep(500);
    }

    throw new Error('Bookmarks failed to load - are you logged in to Twitter?');
  }

  async scrollToLoadAll() {
    console.log('Scrolling to load all bookmarks...');

    let previousUniqueCount = 0;
    let stableCount = 0;
    let totalScrolls = 0;

    while (totalScrolls < this.maxTotalScrolls) {
      // Scroll to bottom
      window.scrollTo(0, document.body.scrollHeight);

      // Wait for new tweets to load
      await this.sleep(this.scrollWaitTime);

      // IMPORTANT: Extract tweet IDs incrementally as we scroll
      // Twitter virtualizes the list, so we need to capture IDs before they're removed from DOM
      this.extractBookmarkDataIncremental();

      const currentUniqueCount = this.seenTweetIds.size;

      console.log(`Scroll ${totalScrolls + 1}: ${currentUniqueCount} unique tweets collected (was ${previousUniqueCount})`);

      // Check if count is stable (no new unique tweets found)
      if (currentUniqueCount === previousUniqueCount) {
        stableCount++;
        if (stableCount >= this.maxStableChecks) {
          console.log('No new tweets loading - reached end of bookmarks');
          break;
        }
      } else {
        stableCount = 0; // Reset stable count when new tweets appear
      }

      previousUniqueCount = currentUniqueCount;
      totalScrolls++;

      // Send progress update
      chrome.runtime.sendMessage({
        type: 'BOOKMARK_SCRAPE_PROGRESS',
        data: {
          tweetsFound: currentUniqueCount,
          scrolling: true
        }
      });
    }

    if (totalScrolls >= this.maxTotalScrolls) {
      console.warn(`Reached maximum scroll limit (${this.maxTotalScrolls})`);
    }

    console.log(`Scroll complete: ${this.seenTweetIds.size} unique tweets collected after ${totalScrolls} scrolls`);
  }

  // Extract tweet data incrementally during scrolling (handles virtualized list)
  extractBookmarkDataIncremental() {
    const tweetSelectors = [
      'article[data-testid="tweet"]',
      'article[role="article"]',
      '[data-testid="cellInnerDiv"] article'
    ];

    let tweetArticles = null;
    for (const selector of tweetSelectors) {
      tweetArticles = document.querySelectorAll(selector);
      if (tweetArticles.length > 0) break;
    }

    if (!tweetArticles || tweetArticles.length === 0) return;

    tweetArticles.forEach(article => {
      try {
        const tweetData = this.extractTweetData(article);
        if (tweetData && !this.seenTweetIds.has(tweetData.tweetId)) {
          this.bookmarks.push(tweetData);
          this.seenTweetIds.add(tweetData.tweetId);
        }
      } catch (error) {
        // Silently skip problematic tweets during incremental extraction
      }
    });
  }

  extractBookmarkData() {
    // Final extraction pass - catches any tweets still visible after scrolling
    console.log('Final extraction pass...');
    this.extractBookmarkDataIncremental();
    console.log(`Total unique bookmarks collected: ${this.bookmarks.length}`);
  }

  extractTweetData(article) {
    // Extract tweet ID from status link
    const tweetId = this.extractTweetId(article);
    if (!tweetId) {
      console.warn('Could not extract tweet ID');
      return null;
    }

    // Extract author username
    const authorLink = article.querySelector('a[href^="/"][href*="/status/"]');
    const username = authorLink ? authorLink.href.split('/')[3] : 'unknown';

    // Construct tweet URL
    const tweetUrl = `https://twitter.com/${username}/status/${tweetId}`;

    // Extract timestamp (optional)
    const timeElement = article.querySelector('time');
    const timestamp = timeElement ? timeElement.getAttribute('datetime') : null;

    // Extract tweet text preview (optional, for logging)
    const textElement = article.querySelector('div[data-testid="tweetText"]');
    const textPreview = textElement ? textElement.textContent.substring(0, 100) : '';

    return {
      tweetId,
      url: tweetUrl,
      username,
      timestamp,
      textPreview,
      scrapedAt: new Date().toISOString()
    };
  }

  extractTweetId(article) {
    // Try multiple methods to extract tweet ID

    // Method 1: From status links
    const links = article.querySelectorAll('a[href*="/status/"]');
    for (const link of links) {
      const match = link.href.match(/\/status\/(\d+)/);
      if (match) return match[1];
    }

    // Method 2: From time element link
    const timeElement = article.querySelector('time');
    if (timeElement) {
      const parentLink = timeElement.closest('a');
      if (parentLink) {
        const match = parentLink.href.match(/\/status\/(\d+)/);
        if (match) return match[1];
      }
    }

    // Method 3: From any link in the article
    const allLinks = article.querySelectorAll('a');
    for (const link of allLinks) {
      const match = link.href.match(/\/status\/(\d+)/);
      if (match) return match[1];
    }

    return null;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Auto-start scraping when script is injected
const scraper = new TwitterBookmarkScraper();
scraper.scrapeAllBookmarks();
