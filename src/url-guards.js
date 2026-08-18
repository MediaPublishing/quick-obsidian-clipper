const CLIPPABLE_PROTOCOLS = new Set(['http:', 'https:']);

/**
 * Returns a user-facing error when a page cannot be accessed by the clipper.
 * Content-script injection is blocked on browser-internal and non-web pages.
 */
export function getClippablePageError(url) {
  if (!url) {
    return 'No active page found. Open a web page and try again.';
  }

  try {
    const parsedUrl = new URL(url);
    if (CLIPPABLE_PROTOCOLS.has(parsedUrl.protocol)) {
      return null;
    }
  } catch {
    // Treat malformed or opaque URLs as inaccessible rather than attempting
    // chrome.scripting.executeScript and producing a noisy browser error.
  }

  return 'Browser-internal pages cannot be clipped. Open a normal web page and try again.';
}

export function isClippablePage(url) {
  return getClippablePageError(url) === null;
}
