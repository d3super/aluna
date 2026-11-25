const V = 'voiceup-v7';
const ASSETS = ['./', 'index.html', 'app.css', 'app.js', 'config.js', 'theme.js', 'logo.js', 'manifest.webmanifest', 'icons/logo.png', 'icons/favicon.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => Promise.all(ASSETS.map(a => fetch(a, { cache: 'no-store' }).then(r => r.ok && c.put(a, r)).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))
    .then(() => self.clients.claim())
    .then(() => self.clients.matchAll({ type: 'window' }))
    .then(cs => cs.forEach(c => c.navigate(c.url))));
});
// Stale-while-revalidate: tampil seketika dari cache, lalu diperbarui di latar belakang. API (lintas domain/POST) tidak pernah di-cache.
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(caches.open(V).then(async c => {
    const hit = await c.match(r);
    const net = fetch(r).then(res => { if (res.ok) c.put(r, res.clone()); return res; }).catch(() => null);
    return hit || (await net) || (await c.match('index.html'));
  }));
});
