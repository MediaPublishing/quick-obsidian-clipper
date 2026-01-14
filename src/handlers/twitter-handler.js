// Twitter/X Tweet Handler
// Improved extraction for twitter.com and x.com with updated selectors

console.log('Twitter Handler loaded');

class TwitterHandler {
  constructor() {
    this.name = 'Twitter DOM Extraction';
  }

  canHandle(url) {
    return url.includes('twitter.com') || url.includes('x.com');
  }

  async extract(timeout = 10000) {
    console.log('TwitterHandler: Starting extraction');

    // Wait for tweet to load
    await this.waitForTweet(timeout);

    // Try multiple extraction strategies
    const tweet = await this.extractMainTweet();

    if (!tweet) {
      throw new Error('Could not extract tweet - page may not contain a tweet or selectors may be outdated');
    }

    // Get replies if on a tweet detail page
    const replies = this.extractReplies();

    // Format as markdown
    const markdown = this.formatTweetMarkdown(tweet, replies);

    return {
      title: `Tweet by ${tweet.author}`,
      url: window.location.href,
      content: markdown,
      timestamp: new Date().toISOString(),
      author: tweet.author ? [tweet.author] : undefined,
      published: tweet.timestamp
    };
  }

  async waitForTweet(timeout) {
    const startTime = Date.now();

    // Initial delay to let X.com's React app hydrate
    console.log('TwitterHandler: Waiting for initial page render...');
    await this.sleep(1500);

    while (Date.now() - startTime < timeout) {
      // Check for tweet article with multiple selectors
      const tweet = document.querySelector('article[data-testid="tweet"]') ||
                   document.querySelector('article[role="article"]') ||
                   document.querySelector('[data-testid="cellInnerDiv"] article');

      if (tweet) {
        // Additional wait to ensure tweet content is fully rendered
        await this.sleep(500);
        console.log('TwitterHandler: Tweet found and rendered');
        return;
      }

      await this.sleep(300);
    }

    console.warn('TwitterHandler: Timeout waiting for tweet after', timeout, 'ms');
  }

  extractMainTweet() {
    // Try different selectors for the main tweet
    const tweetArticles = document.querySelectorAll('article[data-testid="tweet"], article[role="article"]');

    console.log('TwitterHandler: Found', tweetArticles?.length || 0, 'tweet articles');

    if (!tweetArticles || tweetArticles.length === 0) {
      console.warn('TwitterHandler: No tweet articles found');
      // Last resort: try to find ANY article element
      const anyArticle = document.querySelector('article');
      if (anyArticle) {
        console.log('TwitterHandler: Found generic article element, trying extraction');
        return this.extractTweetData(anyArticle);
      }
      return null;
    }

    // The main tweet is usually the first one on a status page
    const mainTweet = tweetArticles[0];

    return this.extractTweetData(mainTweet);
  }

  extractTweetData(article) {
    try {
      if (!article) {
        console.warn('TwitterHandler: No article element provided');
        return null;
      }

      // Extract author info - try multiple selector patterns
      const authorName = this.extractAuthorName(article);
      const authorHandle = this.extractAuthorHandle(article);

      // Extract tweet content
      const content = this.extractTweetContent(article);

      // Extract timestamp
      const timestamp = this.extractTimestamp(article);

      // Extract engagement metrics
      const metrics = this.extractMetrics(article);

      // Extract tweet URL
      const tweetUrl = this.extractTweetUrl(article);

      // Extract media
      const mediaUrls = this.extractMedia(article);

      // Extract tweet ID
      const tweetId = this.extractTweetId(tweetUrl);

      // Validate we have at least some content
      if (!content && !authorName && authorName === 'Unknown') {
        console.warn('TwitterHandler: Could not extract meaningful content from article');
        return null;
      }

      return {
        id: tweetId || '',
        author: authorName || 'Unknown',
        authorHandle: authorHandle || '@unknown',
        content: content || '',
        timestamp: timestamp || new Date().toISOString(),
        likes: metrics?.likes || 0,
        retweets: metrics?.retweets || 0,
        replies: metrics?.replies || 0,
        url: tweetUrl || window.location.href,
        mediaUrls: mediaUrls || []
      };
    } catch (error) {
      console.error('TwitterHandler: Failed to extract tweet data:', error);
      return null;
    }
  }

  extractAuthorName(article) {
    // Try multiple selectors for author name (updated for 2024/2025 X layout)
    const selectors = [
      '[data-testid="User-Name"] span:not([class*="r-"]):first-child',
      '[data-testid="User-Name"] > div > div > span',
      '[data-testid="User-Name"] a > div > div > span',
      '[data-testid="User-Name"] span[dir="auto"]',
      'a[role="link"][href^="/"] span[style*="text-overflow"]',
      'div[dir="ltr"] span[style*="text-overflow: unset"]',
      // Newer X.com selectors
      'div[data-testid="User-Name"] span',
      'article a[role="link"][tabindex="-1"] span:first-child'
    ];

    for (const selector of selectors) {
      try {
        const el = article.querySelector(selector);
        if (el && el.textContent.trim()) {
          const text = el.textContent.trim();
          // Skip @handles and UI elements
          if (!text.startsWith('@') && text.length > 0 && text.length < 100) {
            return text;
          }
        }
      } catch (e) {
        console.warn('TwitterHandler: Selector failed:', selector, e);
      }
    }

    // Fallback: try to find any span that looks like a display name
    const allSpans = article.querySelectorAll('span');
    for (const span of allSpans) {
      const text = span.textContent?.trim();
      // Skip @ handles, numbers, and common UI text
      if (text && !text.startsWith('@') && !text.match(/^\d/) &&
          text.length > 1 && text.length < 50 &&
          !['Follow', 'Following', 'Reply', 'Repost', 'Like', 'Share', 'More', 'Views', 'Bookmark'].includes(text)) {
        return text;
      }
    }

    return 'Unknown';
  }

  extractAuthorHandle(article) {
    // Find @username
    const selectors = [
      '[data-testid="User-Name"] a[href^="/"]',
      'a[role="link"][href^="/"]'
    ];

    for (const selector of selectors) {
      const links = article.querySelectorAll(selector);
      for (const link of links) {
        const text = link.textContent.trim();
        if (text.startsWith('@')) {
          return text;
        }
        // Check href for username
        const href = link.getAttribute('href');
        if (href && href.match(/^\/[a-zA-Z0-9_]+$/)) {
          return '@' + href.slice(1);
        }
      }
    }

    return '@unknown';
  }

  extractTweetContent(article) {
    // Try multiple selectors for tweet text (updated for 2024/2025 X layout)
    const selectors = [
      '[data-testid="tweetText"]',
      '[data-testid="tweet-text-show-more-link"]', // Expanded tweet
      'div[data-testid="tweetText"] span',
      'div[lang][dir="auto"]',
      'article div[lang]',
      // Fallback for newer layouts
      'div[dir="auto"][lang] span',
      'div[lang] > span'
    ];

    for (const selector of selectors) {
      try {
        const el = article.querySelector(selector);
        if (el && el.textContent?.trim()) {
          const text = el.textContent.trim();
          // Make sure it's actual content, not UI text
          if (text.length > 5 && !['Show more', 'Read more', 'Translate'].includes(text)) {
            return text;
          }
        }
      } catch (e) {
        console.warn('TwitterHandler: Content selector failed:', selector, e);
      }
    }

    // Last resort: try to get all text from the tweet body area
    try {
      const tweetBody = article.querySelector('[data-testid="tweetText"]') ||
                        article.querySelector('div[lang]');
      if (tweetBody) {
        return tweetBody.innerText?.trim() || '';
      }
    } catch (e) {
      console.warn('TwitterHandler: Fallback content extraction failed:', e);
    }

    return '';
  }

  extractTimestamp(article) {
    // Find time element
    const timeEl = article.querySelector('time');
    if (timeEl) {
      return timeEl.getAttribute('datetime') || new Date().toISOString();
    }
    return new Date().toISOString();
  }

  extractMetrics(article) {
    const metrics = { likes: 0, retweets: 0, replies: 0 };

    // Try to find engagement buttons and extract numbers
    const buttons = article.querySelectorAll('[role="button"], button');

    for (const btn of buttons) {
      const label = btn.getAttribute('aria-label') || btn.textContent || '';
      const match = label.match(/(\d+[\d,]*)/);
      const count = match ? parseInt(match[1].replace(/,/g, ''), 10) : 0;

      if (label.toLowerCase().includes('like') || btn.querySelector('[data-testid="like"]')) {
        metrics.likes = count;
      } else if (label.toLowerCase().includes('repost') || label.toLowerCase().includes('retweet') ||
                 btn.querySelector('[data-testid="retweet"]')) {
        metrics.retweets = count;
      } else if (label.toLowerCase().includes('repl') || btn.querySelector('[data-testid="reply"]')) {
        metrics.replies = count;
      }
    }

    return metrics;
  }

  extractTweetUrl(article) {
    // Find the permalink to the tweet
    const links = article.querySelectorAll('a[href*="/status/"]');
    for (const link of links) {
      const href = link.getAttribute('href');
      if (href && href.includes('/status/')) {
        // Make sure it's a full URL
        if (href.startsWith('/')) {
          return 'https://x.com' + href;
        }
        return href;
      }
    }
    return window.location.href;
  }

  extractTweetId(url) {
    const match = url.match(/\/status\/(\d+)/);
    return match ? match[1] : '';
  }

  extractMedia(article) {
    const mediaUrls = [];

    // Find images
    const images = article.querySelectorAll('img[src*="pbs.twimg.com"], img[src*="video.twimg.com"]');
    images.forEach(img => {
      const src = img.getAttribute('src');
      if (src && !src.includes('profile_images') && !src.includes('emoji')) {
        mediaUrls.push(src);
      }
    });

    return mediaUrls;
  }

  extractReplies() {
    const replies = [];
    const tweetArticles = document.querySelectorAll('article[data-testid="tweet"], article[role="article"]');

    // Skip the first one (main tweet) and get up to 10 replies
    for (let i = 1; i < Math.min(tweetArticles.length, 11); i++) {
      const replyData = this.extractTweetData(tweetArticles[i]);
      if (replyData) {
        replies.push(replyData);
      }
    }

    return replies;
  }

  formatTweetMarkdown(tweet, replies = []) {
    const dateSaved = new Date().toISOString().split('T')[0];
    const datePublished = tweet.timestamp ? tweet.timestamp.split('T')[0] : dateSaved;

    const lines = [
      '---',
      `title: "Tweet by ${tweet.author}"`,
      'source: twitter',
      `url: "${tweet.url}"`,
      `author: "${tweet.author}"`,
      `author_handle: "${tweet.authorHandle}"`,
      `date_saved: ${dateSaved}`,
      `date_published: ${datePublished}`,
      'type: tweet',
      'tags:',
      '  - clipping/twitter',
      '  - social-media',
      'related:',
      `  - "[[${tweet.author}]]"`,
      '---',
      '',
      `# Tweet by ${tweet.author}`,
      '',
      `**Author:** [[${tweet.author}]] (${tweet.authorHandle})`,
      `**Published:** ${new Date(tweet.timestamp).toLocaleString()}`,
      `**URL:** ${tweet.url}`,
      '',
      '## Tweet Content',
      '',
      `> ${tweet.content.split('\n').join('\n> ')}`,
      '',
      '**Engagement:**',
      `- 💬 ${tweet.replies.toLocaleString()} replies`,
      `- 🔁 ${tweet.retweets.toLocaleString()} reposts`,
      `- ❤️ ${tweet.likes.toLocaleString()} likes`,
      ''
    ];

    // Add media if present
    if (tweet.mediaUrls && tweet.mediaUrls.length > 0) {
      lines.push('## Media', '');
      tweet.mediaUrls.forEach((url, i) => {
        lines.push(`![Image ${i + 1}](${url})`, '');
      });
    }

    // Add replies if present
    if (replies.length > 0) {
      lines.push('## Top Replies', '');
      replies.forEach((reply, i) => {
        lines.push(
          `### ${i + 1}. ${reply.author} (${reply.authorHandle})`,
          '',
          `> ${reply.content.split('\n').join('\n> ')}`,
          '',
          `**Engagement:** ${reply.likes} likes, ${reply.retweets} reposts`,
          '',
          '---',
          ''
        );
      });
    }

    lines.push('## Notes', '', '<!-- Add your thoughts here -->', '');

    return lines.join('\n');
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Auto-execute extraction and send to background
(async function() {
  const url = window.location.href;
  const handler = new TwitterHandler();

  if (!handler.canHandle(url)) {
    console.log('TwitterHandler: Not a Twitter/X page');
    return;
  }

  try {
    console.log('TwitterHandler: Starting extraction for', url);
    // Increased timeout for slow X.com pages (20 seconds)
    const data = await handler.extract(20000);

    console.log('TwitterHandler: Sending to background...', data.title);

    chrome.runtime.sendMessage({
      type: 'CONTENT_EXTRACTED',
      data: data
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('TwitterHandler: Error sending message:', chrome.runtime.lastError);
      } else {
        console.log('TwitterHandler: Message sent successfully');
      }
    });

  } catch (error) {
    console.error('TwitterHandler: Extraction failed:', error);

    // Send fallback with basic info
    chrome.runtime.sendMessage({
      type: 'CONTENT_EXTRACTED',
      data: {
        title: document.title || 'Twitter',
        url: window.location.href,
        content: `# ${document.title}\n\n**URL:** ${window.location.href}\n\n> Tweet extraction failed. The page structure may have changed.\n>\n> Error: ${error.message}\n\n## Notes\n\n<!-- Add your notes here -->`,
        timestamp: new Date().toISOString()
      }
    });
  }
})();
