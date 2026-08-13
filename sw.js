/* ASJ Portal - Service Worker
   Cache shell + update strategy:
   - Navigasi halaman: network-first (online selalu fresh, offline pakai cache)
   - Aset statis: stale-while-revalidate
   - API (.netlify, /api) & domain luar: selalu jaringan, tidak pernah di-cache
*/
const VERSION = 'asj-portal-v903e5d11';
const SHELL = [
  '/',
  '/index.html',
  '/admin.html',
  '/ai_form.html',
  '/apply-full.html',
  '/master-full.html',
  '/share.html',
  '/siswa-baru.html',
  '/gas-client.js?v=c5abdf9b08',
  '/i18n.js?v=3ff6b871a5',
  '/js/00_dictionary.js?v=ebeebda8c1',
  '/js/01_public.js?v=5cbf2a6a61',
  '/js/02_init.js?v=ec8cf7949f',
  '/js/03_candidate.js?v=02563c4a4d',
  '/js/03_engine.js?v=a76fd877a1',
  '/js/04_auth.js?v=6fa1ad9405',
  '/js/05_render.js?v=d3d0f87171',
  '/js/06_admin_modal.js?v=53051ca243',
  '/js/07_api.js?v=587526b8f6',
  '/js/08_wa_pintar.js?v=d742fe968a',
  '/js/09_ai_copilot.js?v=004a100c65',
  '/js/10_cv_rirekisho.js?v=d75faef22e',
  '/js/10b_cv_builders.js?v=087a809365',
  '/js/11_admin_ops.js?v=0abcd06499',
  '/js/12_esign_match.js?v=ae1e3f0960',
  '/js/13_rincian_builder.js?v=65a0add615',
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

  // CDN statis (FontAwesome, Google Fonts, dll): cache-first agar offline tetap tampil
  const STATIC_CDN = ['cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];
  if (STATIC_CDN.includes(url.hostname)) {
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
    return;
  }

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
