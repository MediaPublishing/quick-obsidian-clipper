// Medium Paywall Bypass Handler
// Uses Freedium service to bypass Medium paywalls

console.log('Medium Handler loaded');

class MediumHandler {
  constructor() {
    this.freediumUrl = 'https://freedium.cfd/';
    this.mediumDomains = [
      'medium.com',
      'towardsdatascience.com',
      'betterprogramming.pub',
      'levelup.gitconnected.com',
      'javascript.plainenglish.io',
      'python.plainenglish.io',
      'blog.devgenius.io',
      'uxplanet.org'
    ];
  }

  canHandle(url) {
    return this.mediumDomains.some(domain => url.includes(domain));
  }

  getFreeUrl(mediumUrl) {
    // Freedium URL format: https://freedium.cfd/MEDIUM_URL
    const freediumUrl = this.freediumUrl + mediumUrl;
    console.log('Freedium bypass URL:', freediumUrl);
    return freediumUrl;
  }

  // Alternative method: Use Medium's ?gi= parameter (less reliable)
  getUnlockedUrl(mediumUrl) {
    try {
      const url = new URL(mediumUrl);
      url.searchParams.set('gi', '1234567890');
      return url.toString();
    } catch (error) {
      console.error('Failed to create unlocked URL:', error);
      return mediumUrl;
    }
  }

  // Extract from JSON-LD if available
  extractFromJsonLd() {
    try {
      const jsonLdScript = document.querySelector('script[type="application/ld+json"]');
      if (jsonLdScript) {
        const data = JSON.parse(jsonLdScript.textContent);
        if (data.articleBody) {
          return {
            content: data.articleBody,
            method: 'json-ld'
          };
        }
      }
    } catch (error) {
      console.warn('JSON-LD extraction failed:', error);
    }
    return null;
  }

  // Remove paywall overlay from DOM
  removePaywallOverlay() {
    // Medium paywall selectors (may change over time)
    const paywallSelectors = [
      '[data-testid="paywall"]',
      '.meteredContent',
      '[class*="paywall"]',
      '[class*="meter"]'
    ];

    let removed = 0;
    paywallSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        el.remove();
        removed++;
      });
    });

    console.log(`Removed ${removed} paywall elements`);
    return removed > 0;
  }

  // Check if current page is Medium article
  isMediumArticle() {
    return this.canHandle(window.location.href) &&
           document.querySelector('article') !== null;
  }

  // Get article metadata
  getArticleMetadata() {
    try {
      const metadata = {};

      // Title
      const titleEl = document.querySelector('h1');
      metadata.title = titleEl ? titleEl.textContent.trim() : '';

      // Author
      const authorEl = document.querySelector('a[rel="author"]');
      metadata.author = authorEl ? authorEl.textContent.trim() : '';

      // Publication date
      const timeEl = document.querySelector('time');
      metadata.published = timeEl ? timeEl.getAttribute('datetime') : '';

      // Read time
      const readTimeEl = document.querySelector('[data-testid="storyReadTime"]');
      metadata.readTime = readTimeEl ? readTimeEl.textContent.trim() : '';

      return metadata;
    } catch (error) {
      console.error('Failed to extract metadata:', error);
      return {};
    }
  }
}

// Make available globally
window.MediumHandler = MediumHandler;
