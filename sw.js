/* ASJ Portal - Service Worker
   Cache shell + update strategy:
   - Navigasi halaman: network-first (online selalu fresh, offline pakai cache)
   - Aset statis: stale-while-revalidate
   - API (.netlify, /api) & domain luar: selalu jaringan, tidak pernah di-cache
*/
const VERSION = 'asj-portal-va9642c4fe7';
const SHELL = [
  '/',
  '/index.html',
  '/admin.html',
  '/ai_form.html',
  '/apply-full.html',
  '/master-full.html',
  '/share.html',
  '/siswa-baru.html',
  '/api-client.js?v=4fbd0619d2',
  '/i18n.js?v=3ff6b871a5',
  '/js/00_dictionary.js?v=ebeebda8c1',
  '/js/01_public.js?v=3881137dee',
  '/js/02_init.js?v=1fe14ba5de',
  '/js/03_candidate.js?v=a5b9aff2ab',
  '/js/03_engine.js?v=5bbb3afec6',
  '/js/04_auth.js?v=93074feddc',
  '/js/05_render.js?v=73bf06b3b8',
  '/js/06_admin_modal.js?v=799f5b2d8f',
  '/js/07_api.js?v=3ba1f98316',
  '/js/08_wa_pintar.js?v=ad9fcaa47a',
  '/js/09_ai_copilot.js?v=0fac2e267d',
  '/js/10_cv_rirekisho.js?v=8ccdf1e400',
  '/js/10b_cv_builders.js?v=087a809365',
  '/js/11_admin_ops.js?v=abb84595e5',
  '/js/12_esign_match.js?v=37f0e41191',
  '/js/13_rincian_builder.js?v=c3868da5a7',
  '/js/helpers_cv.js?v=c08f6266d3',
  '/manifest.webmanifest?v=8f163ba13c',
  '/icons/icon-192.png?v=39eaab3509',
  '/icons/icon-512.png?v=3a0a6aff80',
  '/icons/icon-maskable-512.png?v=a59481744d',
  '/icons/apple-touch-icon.png?v=b90abf8d0a',
  '/src/main.js',
  '/src/styles/main.css'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    (async () => {
      const cache = await caches.open(VERSION);
      // add per-item dengan catch: satu aset gagal tidak menggagalkan instalasi
      await Promise.all(SHELL.map((url) => cache.add(url).catch(() => {})));
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
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
        .catch(() =>
          caches.match(url.pathname).then((m) => m || caches.match('/index.html'))
        )
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
    })
  );
});
