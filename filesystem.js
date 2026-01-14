/**
 * Filesystem Clipping Module
 * Saves clips directly to disk using chrome.downloads API
 * Works without Obsidian running
 */

class FilesystemClipper {
  constructor() {
    this.isAvailable = typeof chrome !== 'undefined' && chrome.downloads;
  }

  /**
   * Generate markdown filename from clip data
   */
  generateFilename(clipData) {
    const date = new Date(clipData.timestamp).toISOString().split('T')[0];
    const sanitized = clipData.title
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 100);
    return `${date} ⌇ ${sanitized}.md`;
  }

  /**
   * Create markdown content from clip data
   */
  createMarkdownContent(clipData, settings) {
    const lines = ['---'];

    // Title
    lines.push(`title: "${clipData.title.replace(/"/g, '\\"')}"`);

    // Source URL
    lines.push(`source: "${clipData.url}"`);

    // Author
    if (clipData.author && clipData.author.length > 0) {
      lines.push('author:');
      clipData.author.forEach(author => {
        lines.push(`  - "[[${author}]]"`);
      });
    } else if (settings.defaultAuthor) {
      lines.push('author:');
      lines.push(`  - "[[${settings.defaultAuthor}]]"`);
    }

    // Published date
    if (settings.includePublishDate && clipData.published) {
      lines.push(`published: ${clipData.published}`);
    }

    // Created date (clip date)
    const created = new Date(clipData.timestamp).toISOString().split('T')[0];
    lines.push(`created: ${created}`);

    // Description
    if (settings.includeDescription && clipData.description) {
      lines.push(`description: "${clipData.description.replace(/"/g, '\\"')}"`);
    }

    // Tags
    lines.push('tags:');
    const tags = settings.defaultTags || ['clippings'];
    tags.forEach(tag => {
      lines.push(`  - "${tag}"`);
    });

    lines.push('---', '');

    // Content
    lines.push(clipData.content);

    return lines.join('\n');
  }

  /**
   * Save clip to filesystem using downloads API
   * @param {Object} clipData - The clip data to save
   * @param {Object} settings - Extension settings
   * @returns {Promise<boolean>} - Success status
   */
  async saveClip(clipData, settings) {
    if (!this.isAvailable) {
      throw new Error('Downloads API not available');
    }

    const filename = this.generateFilename(clipData);
    const content = this.createMarkdownContent(clipData, settings);

    // Create blob and object URL
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);

    // Determine save path
    let saveAs = false;
    let downloadPath = filename;

    // If vault path is configured in settings, use it
    // Note: Chrome downloads API will place files relative to Downloads folder
    // Users should configure their vault to sync with Downloads or a subfolder
    if (settings.filesystemPath) {
      downloadPath = settings.filesystemPath + '/' + filename;
      saveAs = false; // Don't prompt if path is configured
    } else {
      // First time - will prompt user to choose location
      saveAs = true;
    }

    return new Promise((resolve, reject) => {
      chrome.downloads.download({
        url: url,
        filename: downloadPath,
        saveAs: saveAs,
        conflictAction: 'uniquify' // Avoid overwriting existing files
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          URL.revokeObjectURL(url);
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        // Monitor download completion
        const listener = (delta) => {
          if (delta.id === downloadId) {
            if (delta.state && delta.state.current === 'complete') {
              chrome.downloads.onChanged.removeListener(listener);
              URL.revokeObjectURL(url);

              // Optionally get the final path where file was saved
              chrome.downloads.search({ id: downloadId }, (results) => {
                if (results && results.length > 0) {
                  console.log(`✓ Clip saved to: ${results[0].filename}`);
                }
                resolve(true);
              });
            } else if (delta.state && delta.state.current === 'interrupted') {
              chrome.downloads.onChanged.removeListener(listener);
              URL.revokeObjectURL(url);
              reject(new Error('Download interrupted'));
            }
          }
        };

        chrome.downloads.onChanged.addListener(listener);
      });
    });
  }

  /**
   * Test if filesystem clipping is configured and working
   */
  async testFilesystemAccess(settings) {
    try {
      const testData = {
        title: 'Test Clip',
        url: 'https://example.com',
        content: 'This is a test clip to verify filesystem access is working.',
        timestamp: new Date().toISOString()
      };

      await this.saveClip(testData, settings);
      return { success: true, message: 'Filesystem access working' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

// Export for use in background.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FilesystemClipper;
}
