/* ASJ Portal - Service Worker
   Cache shell + update strategy:
   - Navigasi halaman: network-first (online selalu fresh, offline pakai cache)
   - Aset statis: stale-while-revalidate
   - API (.netlify, /api) & domain luar: selalu jaringan, tidak pernah di-cache
*/
const VERSION = 'asj-portal-app-d80b6b5088-mb4f9dc47';
const SHELL = [
  '/',
  '/index.html',
  '/admin.html',
  '/ai_form.html',
  '/apply-full.html',
  '/master-full.html',
  '/share.html',
  '/siswa-baru.html',
  '/assets/app-d80b6b5088.js',
  '/assets/modals-shared.html',
  '/manifest.webmanifest?v=8f163ba13c',
  '/icons/icon-192.png?v=39eaab3509',
  '/icons/icon-512.png?v=3a0a6aff80',
  '/icons/icon-maskable-512.png?v=a59481744d',
  '/icons/apple-touch-icon.png?v=b90abf8d0a',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    (async () => {
      const cache = await caches.open(VERSION);
      // add per-item dengan catch: satu aset gagal tidak menggagalkan instalasi
      await Promise.all(SHELL.map((url) => cache.add(url).catch(() => {})));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Hanya tangani aset same-origin; jangan sentuh Supabase/storage eksternal
  if (url.origin !== self.location.origin) return;
  // API Netlify: selalu jaringan (jangan di-cache)
  if (url.pathname.startsWith('/.netlify/') || url.pathname.startsWith('/api/')) return;

  // Navigasi halaman: network-first dengan fallback cache
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req.url, { cache: 'no-cache' })
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(url.pathname, copy));
          return res;
        })
        .catch(() => caches.match(url.pathname).then((m) => m || caches.match('/index.html'))),
    );
    return;
  }

  // Aset statis: stale-while-revalidate
  e.respondWith(
    caches.match(req).then((hit) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || network;
    }),
  );
});
