const target = 'https://chromewebstore.google.com/detail/cjhbghekkonbpcibkbogbcemepolpnnl';
const response = await fetch(target, { redirect: 'follow' });
const html = await response.text();
const title = html.match(/<title>(.*?)<\/title>/)?.[1];
const publishedVersion = html.match(/>Version<\/div><div[^>]*>([^<]+)<\/div>/)?.[1];
const updated = html.match(/>Updated<\/div><div[^>]*>([^<]+)<\/div>/)?.[1];
const expectedVersion = '2.4.17';

if (!response.ok) throw new Error(`Store returned HTTP ${response.status}`);
if (publishedVersion !== expectedVersion) {
  throw new Error(`Public Store version is ${publishedVersion || 'unknown'}, expected ${expectedVersion}`);
}

console.log(JSON.stringify({
  url: response.url,
  status: response.status,
  title,
  looksLive: /Quick Obsidian Clipper/i.test(html),
  maybePending: /(not available|no longer available|item not found|404)/i.test(html),
  publishedVersion,
  updated
}, null, 2));
