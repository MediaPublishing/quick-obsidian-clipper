// Rate Limiter Utility
// Prevents overwhelming external services with too many requests

console.log('Rate Limiter loaded');

class RateLimiter {
  constructor(maxRequests = 5, windowMs = 1000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.queue = [];
    this.processing = false;
    this.requestTimestamps = [];
  }

  /**
   * Add request to queue and process
   * @param {Function} requestFn - Async function to execute
   * @param {Object} context - Context for the request (for logging)
   * @returns {Promise} - Resolves when request completes
   */
  async enqueue(requestFn, context = {}) {
    return new Promise((resolve, reject) => {
      this.queue.push({
        fn: requestFn,
        context,
        resolve,
        reject
      });

      this.processQueue();
    });
  }

  async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      // Clean up old timestamps outside the window
      const now = Date.now();
      this.requestTimestamps = this.requestTimestamps.filter(
        t => now - t < this.windowMs
      );

      // Check if we can make a request
      if (this.requestTimestamps.length >= this.maxRequests) {
        // Wait until the oldest request expires
        const oldestTimestamp = this.requestTimestamps[0];
        const waitTime = this.windowMs - (now - oldestTimestamp);

        console.log(`Rate limit reached. Waiting ${waitTime}ms...`);
        await this.sleep(waitTime);
        continue;
      }

      // Get next request
      const request = this.queue.shift();

      // Record timestamp
      this.requestTimestamps.push(Date.now());

      // Execute request
      try {
        console.log('Executing rate-limited request:', request.context);
        const result = await request.fn();
        request.resolve(result);
      } catch (error) {
        console.error('Rate-limited request failed:', error);
        request.reject(error);
      }
    }

    this.processing = false;
  }

  /**
   * Execute multiple requests with rate limiting
   * @param {Array} items - Items to process
   * @param {Function} processFn - Function to call for each item
   * @param {Object} options - Options (onProgress callback, etc.)
   * @returns {Promise<Array>} - Results array
   */
  async batchProcess(items, processFn, options = {}) {
    const {
      onProgress = null,
      continueOnError = true
    } = options;

    const results = [];
    const errors = [];

    for (let i = 0; i < items.length; i++) {
      try {
        const result = await this.enqueue(
          () => processFn(items[i], i),
          { item: items[i], index: i, total: items.length }
        );
        results.push({ success: true, data: result, index: i });

        if (onProgress) {
          onProgress({
            current: i + 1,
            total: items.length,
            success: results.filter(r => r.success).length,
            failed: errors.length
          });
        }
      } catch (error) {
        errors.push({ error, item: items[i], index: i });
        results.push({ success: false, error, index: i });

        if (!continueOnError) {
          throw error;
        }
      }
    }

    return {
      results,
      errors,
      successCount: results.filter(r => r.success).length,
      errorCount: errors.length
    };
  }

  /**
   * Get current queue status
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      recentRequests: this.requestTimestamps.length,
      maxRequests: this.maxRequests,
      windowMs: this.windowMs
    };
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export for ES modules (service worker compatible)
export { RateLimiter };

// Also make available globally for non-module contexts
if (typeof globalThis !== 'undefined') {
  globalThis.RateLimiter = RateLimiter;
}
