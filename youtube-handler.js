// YouTube Transcript Handler
// Extracts video transcripts from YouTube

console.log('YouTube Handler loaded');

class YouTubeHandler {
  constructor() {
    this.transcriptApiUrl = 'https://www.youtube.com/youtubei/v1/get_transcript';
  }

  canHandle(url) {
    return url.includes('youtube.com/watch') || url.includes('youtu.be/');
  }

  getVideoId(url) {
    // Extract video ID from various YouTube URL formats
    let videoId = null;

    // Format: https://www.youtube.com/watch?v=VIDEO_ID
    const watchMatch = url.match(/[?&]v=([^&]+)/);
    if (watchMatch) {
      videoId = watchMatch[1];
    }

    // Format: https://youtu.be/VIDEO_ID
    const shortMatch = url.match(/youtu\.be\/([^?]+)/);
    if (shortMatch) {
      videoId = shortMatch[1];
    }

    // Format: https://www.youtube.com/embed/VIDEO_ID
    const embedMatch = url.match(/\/embed\/([^?]+)/);
    if (embedMatch) {
      videoId = embedMatch[1];
    }

    return videoId;
  }

  async getTranscript(videoId) {
    console.log('Fetching transcript for video:', videoId);

    try {
      // Method 1: Try to get transcript from page DOM
      const domTranscript = this.extractTranscriptFromDOM();
      if (domTranscript) {
        console.log('Extracted transcript from DOM');
        return domTranscript;
      }

      // Method 2: Try clicking the transcript button
      const clickTranscript = await this.openTranscriptPanel();
      if (clickTranscript) {
        console.log('Opened transcript panel');
        return clickTranscript;
      }

      console.warn('Could not extract transcript - may not be available');
      return null;

    } catch (error) {
      console.error('Transcript extraction failed:', error);
      return null;
    }
  }

  extractTranscriptFromDOM() {
    // YouTube transcript panel selectors
    const transcriptPanel = document.querySelector('ytd-transcript-renderer');
    if (!transcriptPanel) {
      return null;
    }

    const transcriptItems = transcriptPanel.querySelectorAll('ytd-transcript-segment-renderer');
    if (!transcriptItems || transcriptItems.length === 0) {
      return null;
    }

    const transcript = [];
    transcriptItems.forEach(item => {
      const timestamp = item.querySelector('.segment-timestamp')?.textContent?.trim();
      const text = item.querySelector('.segment-text')?.textContent?.trim();

      if (text) {
        transcript.push({
          timestamp: timestamp || '',
          text: text
        });
      }
    });

    return transcript.length > 0 ? transcript : null;
  }

  async openTranscriptPanel() {
    // Try to click the "Show transcript" button
    const buttons = Array.from(document.querySelectorAll('button'));
    const transcriptButton = buttons.find(btn =>
      btn.textContent.toLowerCase().includes('transcript') ||
      btn.getAttribute('aria-label')?.toLowerCase().includes('transcript')
    );

    if (transcriptButton) {
      console.log('Found transcript button, clicking...');
      transcriptButton.click();

      // Wait for panel to open
      await this.sleep(2000);

      // Try extracting again
      return this.extractTranscriptFromDOM();
    }

    return null;
  }

  formatTranscript(transcript) {
    if (!transcript || transcript.length === 0) {
      return '';
    }

    // Format as plain text paragraph (no timestamps)
    let formatted = '## Transcript\n\n';

    // Join all text segments into flowing paragraph text
    const plainText = transcript
      .map(item => item.text)
      .filter(Boolean)
      .join(' ')
      .replace(/\s{2,}/g, ' ')
      .trim();

    formatted += plainText + '\n\n';

    return formatted;
  }

  getVideoMetadata() {
    try {
      const metadata = {};

      // Title
      const titleEl = document.querySelector('h1.ytd-watch-metadata yt-formatted-string');
      metadata.title = titleEl ? titleEl.textContent.trim() : '';

      // Channel
      const channelEl = document.querySelector('ytd-channel-name a');
      metadata.channel = channelEl ? channelEl.textContent.trim() : '';

      // Views
      const viewsEl = document.querySelector('ytd-watch-metadata span.view-count');
      metadata.views = viewsEl ? viewsEl.textContent.trim() : '';

      // Upload date
      const dateEl = document.querySelector('ytd-watch-metadata #info-strings yt-formatted-string');
      metadata.uploadDate = dateEl ? dateEl.textContent.trim() : '';

      // Description
      const descEl = document.querySelector('ytd-watch-metadata #description-inline-expander');
      metadata.description = descEl ? descEl.textContent.trim().substring(0, 500) : '';

      return metadata;
    } catch (error) {
      console.error('Failed to extract video metadata:', error);
      return {};
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Make available globally
window.YouTubeHandler = YouTubeHandler;
