const target = 'https://chromewebstore.google.com/detail/cjhbghekkonbpcibkbogbcemepolpnnl';
const response = await fetch(target, { redirect: 'follow' });
const html = await response.text();
const title = html.match(/<title>(.*?)<\/title>/)?.[1];

console.log(JSON.stringify({
  url: response.url,
  status: response.status,
  title,
  looksLive: /Quick Obsidian Clipper/i.test(html),
  maybePending: /(not available|no longer available|item not found|404)/i.test(html)
}, null, 2));
