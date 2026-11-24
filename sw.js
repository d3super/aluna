const V = 'aluna-v1';
const ASSETS = ['./', 'index.html', 'app.css', 'app.js', 'config.js', 'theme.js', 'manifest.webmanifest', 'icons/logo.png', 'icons/favicon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;   // API (POST, lintas domain) tidak pernah di-cache
  e.respondWith(caches.match(r).then(hit => {
    const net = fetch(r).then(res => { if (res.ok) caches.open(V).then(c => c.put(r, res.clone())); return res; }).catch(() => hit || caches.match('index.html'));
    return hit || net;
  }));
});
