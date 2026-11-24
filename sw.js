const V = 'aluna-v5';
const ASSETS = ['./', 'index.html', 'app.css', 'app.js', 'config.js', 'theme.js', 'logo.js', 'manifest.webmanifest', 'icons/logo.png', 'icons/favicon.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => Promise.all(ASSETS.map(a => fetch(a, { cache: 'no-store' }).then(r => r.ok && c.put(a, r)).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))
    .then(() => self.clients.claim())
    .then(() => self.clients.matchAll({ type: 'window' }))
    .then(cs => cs.forEach(c => c.navigate(c.url))));   // muat ulang halaman yang sedang terbuka agar memakai versi terbaru
});
// Jaringan lebih dulu, cache hanya cadangan saat offline. API (lintas domain/POST) tidak pernah di-cache.
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(r, { cache: 'no-store' }).then(res => { if (res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); } return res; })
    .catch(() => caches.match(r).then(hit => hit || caches.match('index.html'))));
});
