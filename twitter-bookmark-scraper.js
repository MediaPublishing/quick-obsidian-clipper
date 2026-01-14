// Twitter Bookmark Scraper
// Extracts all bookmarked tweets from twitter.com/i/bookmarks

console.log('Twitter Bookmark Scraper loaded');

class TwitterBookmarkScraper {
  constructor() {
    this.bookmarks = [];
    this.seenTweetIds = new Set();
    this.maxStableChecks = 3; // Stop after count stable for 3 checks
    this.maxTotalScrolls = 100; // Safety limit to prevent infinite scrolling
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

    const maxWait = 10000; // 10 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      const tweets = document.querySelectorAll('article[data-testid="tweet"]');
      if (tweets.length > 0) {
        console.log('Bookmarks loaded');
        return;
      }
      await this.sleep(500);
    }

    throw new Error('Bookmarks failed to load - are you logged in to Twitter?');
  }

  async scrollToLoadAll() {
    console.log('Scrolling to load all bookmarks...');

    let previousCount = 0;
    let stableCount = 0;
    let totalScrolls = 0;

    while (totalScrolls < this.maxTotalScrolls) {
      // Scroll to bottom
      window.scrollTo(0, document.body.scrollHeight);

      // Wait for new tweets to load
      await this.sleep(2000);

      // Count current tweets
      const currentCount = document.querySelectorAll('article[data-testid="tweet"]').length;

      console.log(`Scroll ${totalScrolls + 1}: Found ${currentCount} tweets (was ${previousCount})`);

      // Check if count is stable (no new tweets loaded)
      if (currentCount === previousCount) {
        stableCount++;
        if (stableCount >= this.maxStableChecks) {
          console.log('No new tweets loading - reached end of bookmarks');
          break;
        }
      } else {
        stableCount = 0; // Reset stable count when new tweets appear
      }

      previousCount = currentCount;
      totalScrolls++;

      // Send progress update
      chrome.runtime.sendMessage({
        type: 'BOOKMARK_SCRAPE_PROGRESS',
        data: {
          tweetsFound: currentCount,
          scrolling: true
        }
      });
    }

    if (totalScrolls >= this.maxTotalScrolls) {
      console.warn(`Reached maximum scroll limit (${this.maxTotalScrolls})`);
    }

    console.log(`Scroll complete: ${previousCount} tweets visible after ${totalScrolls} scrolls`);
  }

  extractBookmarkData() {
    console.log('Extracting bookmark data from DOM...');

    const tweetArticles = document.querySelectorAll('article[data-testid="tweet"]');

    tweetArticles.forEach(article => {
      try {
        const tweetData = this.extractTweetData(article);
        if (tweetData && !this.seenTweetIds.has(tweetData.tweetId)) {
          this.bookmarks.push(tweetData);
          this.seenTweetIds.add(tweetData.tweetId);
        }
      } catch (error) {
        console.warn('Failed to extract tweet data:', error);
      }
    });

    console.log(`Extracted ${this.bookmarks.length} unique bookmarks`);
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
