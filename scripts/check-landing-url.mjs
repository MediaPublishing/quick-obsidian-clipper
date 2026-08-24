const target = 'https://quick-obsidian-clipper.pages.dev/';
const response = await fetch(target, { redirect: 'follow' });
const html = await response.text();

console.log(JSON.stringify({
  url: response.url,
  status: response.status,
  title: html.match(/<title>(.*?)<\/title>/)?.[1],
  canonical: html.match(/rel="canonical" href="([^"]+)"/)?.[1],
  hasHero: html.includes('Save any web page straight into Obsidian'),
  csp: response.headers.get('content-security-policy'),
  contentType: response.headers.get('content-type'),
  xContentType: response.headers.get('x-content-type-options')
}, null, 2));

for (const path of ['/app.js', '/favicon.svg', '/robots.txt', '/assets/icon-128.png']) {
  const asset = await fetch(new URL(path, target));
  console.log(path, asset.status, asset.headers.get('content-type'));
}
