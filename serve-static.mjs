// Minimal static file server for the ASJ Portal preview.
//
// This project is a static PWA with no package.json and no build step, so the
// "dev/preview" command is simply serving the repo root over HTTP. Binds to
// 0.0.0.0 and honors the PORT env var Freebuff injects for isolated
// workspaces (falling back to 3000).
//
// BACKEND (preview): the real frontend calls Netlify Functions
// (/.netlify/functions/*). This server runs the REBUILT backend handlers from
// netlify/functions/_lib/handlers.js in-process, so the preview talks to real
// Supabase data (env vars from Keys/API keys or .env.local) exactly like the
// production Netlify functions would. Until Supabase keys are configured, the
// getAppData handler returns demo data so the UI is still visible.
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);

const PORT = Number(process.env.PORT) || 3000;

// Bridge links (generateFormBridge / generateAiFormBridge) memakai
// NETLIFY_SITE_URL dari env; di preview override ke origin lokal supaya
// navigasi form (apply/ai/master) tidak lari ke situs produksi.
process.env.NETLIFY_SITE_URL = `http://127.0.0.1:${PORT}`;

// Root dokumen: kalau file ini dijalankan dari dalam dist/ (hasil build
// deploy — index.html + netlify/ ikut disalin), pakai direktori file-nya.
// Kalau dijalankan dari repo root (preview), pakai cwd.
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = existsSync(join(HERE, 'index.html')) ? HERE : normalize(process.cwd());

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

function sendJson(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

// Backend: jalankan handler rebuild (netlify/functions/_lib/handlers.js)
// in-process. Request body sama dengan yang dikirim ke Netlify Functions:
// { action, payload, sessionToken }.
let handlers = null;
function loadHandlers() {
  if (!handlers) handlers = require(join(HERE, 'netlify/functions/_lib/handlers.js'));
  return handlers;
}

async function handleApi(req, res) {
  let raw = '';
  req.on('data', (c) => (raw += c));
  req.on('end', async () => {
    let body = {};
    try {
      body = JSON.parse(raw || '{}');
    } catch {
      /* non-JSON body -> action kosong */
    }
    // Keep-alive via GET (?action=ping) — action boleh datang dari query string.
    if (!body.action) {
      const q = new URL(req.url, 'http://localhost').searchParams;
      body.action = q.get('action') || undefined;
      if (body.action) body.payload = body.payload || q.get('payload') || undefined;
    }
    let out;
    try {
      const fwd = req.headers['x-forwarded-for'];
      const ip =
        (fwd ? String(fwd).split(',')[0].trim() : null) || req.socket.remoteAddress || null;
      out = await loadHandlers().handleAction(body.action, body.payload, body.sessionToken, {
        ip,
      });
    } catch (e) {
      out = { success: false, message: 'Error internal: ' + e.message };
    }
    // Respons RAW dari handler (action 'ping' → { statusCode: 200, body: 'pong' })
    // diteruskan apa adanya, tanpa dibungkus JSON.
    if (
      out &&
      typeof out === 'object' &&
      typeof out.statusCode === 'number' &&
      out.body !== undefined
    ) {
      res.writeHead(out.statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(String(out.body));
      return;
    }
    sendJson(res, 200, out);
  });
}

// Service worker NO-OP untuk preview.
//
// Masalah nyata (user, 2026-08-17): preview Freebuff dibuka dari HP. Domain
// preview BUKAN localhost, jadi pwa.js mendaftarkan service worker beneran di
// domain preview itu -> cache SW nyangkut di HP -> reload berulang tetap versi
// lama walau kode sudah berubah. Solusi: preview TIDAK BOLEH punya SW beneran.
// sw.js yang dilayani di sini hanya pembersih:
//   - activate  -> hapus SEMUA cache + clients.claim (menimpa SW lama yang
//                  masih terdaftar & membersihkan cache versi lamanya),
//   - TANPA fetch listener -> tidak pernah meng-intercept request apa pun,
//                  setiap load diambil langsung dari jaringan (selalu fresh).
// Production (Netlify) TIDAK terpengaruh: file sw.js asli di repo tetap
// dipakai di sana (lihat netlify.toml + build-js.mjs).
const NOOP_SW = [
  '/* ASJ Portal preview: service worker no-op (lihat serve-static.mjs) */',
  "self.addEventListener('install', (e) => { e.waitUntil(self.skipWaiting()); });",
  "self.addEventListener('activate', (e) => {",
  '  e.waitUntil(',
  '    (async () => {',
  '      const keys = await caches.keys();',
  '      await Promise.all(keys.map((k) => caches.delete(k)));',
  '      await self.clients.claim();',
  '    })(),',
  '  );',
  '});',
  "self.addEventListener('message', (e) => {",
  "  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();",
  '});',
].join('\n');

async function resolveFile(pathname) {
  if (pathname.endsWith('/')) pathname += 'index.html';
  const file = normalize(join(ROOT, pathname));
  // Reject path traversal outside the repo root.
  if (file !== ROOT && !file.startsWith(ROOT + sep)) throw new Error('forbidden');
  let info = await stat(file);
  if (info.isDirectory()) {
    const idx = join(file, 'index.html');
    info = await stat(idx);
    return idx;
  }
  return file;
}

createServer(async (req, res) => {
  try {
    console.log(`[HTTP] ${req.method} ${req.url}`);
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);

    // Preview-only backend: semua POST data/action diarahkan ke handler rebuild.
    // GET dengan ?action=ping juga dilayani (keep-alive lokal) — lihat
    // handleApi untuk fallback query string.
    if (
      (req.method === 'POST' || req.method === 'GET') &&
      pathname.startsWith('/.netlify/functions/') &&
      (req.method === 'POST' ||
        new URL(req.url, 'http://localhost').searchParams.get('action') === 'ping')
    ) {
      handleApi(req, res);
      return;
    }

    // share.html memakai GET /api/share-data?job=KODE (di Netlify di-redirect
    // ke /.netlify/functions/share-data). Layani langsung di preview.
    if (
      req.method === 'GET' &&
      (pathname === '/api/share-data' || pathname === '/.netlify/functions/share-data')
    ) {
      const q = new URL(req.url, 'http://localhost').searchParams.get('job') || '';
      let out;
      try {
        out = await loadHandlers().handleShareData(q);
      } catch (e) {
        out = { error: 'Error internal: ' + e.message };
      }
      sendJson(res, out.error ? 400 : 200, out);
      return;
    }

    // Preview: /sw.js SELALU no-op (lihat NOOP_SW) — SW lama dari sesi
    // preview sebelumnya langsung diganti + cache-nya dihapus. Header
    // no-store supaya browser/proxy tidak meng-cache sw.js ini.
    if (req.method === 'GET' && pathname === '/sw.js') {
      res.writeHead(200, {
        'Content-Type': 'text/javascript; charset=utf-8',
        'Cache-Control': 'no-cache, no-store',
      });
      res.end(NOOP_SW);
      return;
    }

    const file = await resolveFile(pathname);
    const body = await readFile(file);
    const ext = extname(file).toLowerCase();
    const headers = {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    };

    // Hanya kirim Clear-Site-Data untuk dokumen HTML agar tidak error
    // saat browser nge-fetch manifest/asset dengan mode 'omit credentials'.
    if (ext === '.html' || ext === '') {
      headers['Clear-Site-Data'] = '"cache"';
    }

    res.writeHead(200, headers);
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
  }
}).listen(PORT, '0.0.0.0', () => {
  console.log(`ASJ Portal preview server listening on http://0.0.0.0:${PORT}`);
});
