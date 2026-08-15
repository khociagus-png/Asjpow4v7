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
    let out;
    try {
      const fwd = req.headers['x-forwarded-for'];
      const ip = (fwd ? String(fwd).split(',')[0].trim() : null) || req.socket.remoteAddress || null;
      out = await loadHandlers().handleAction(body.action, body.payload, body.sessionToken, {
        ip,
      });
    } catch (e) {
      out = { success: false, message: 'Error internal: ' + e.message };
    }
    sendJson(res, 200, out);
  });
}

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
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);

    // Preview-only backend: semua POST data/action diarahkan ke handler rebuild.
    if (req.method === 'POST' && pathname.startsWith('/.netlify/functions/')) {
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

    const file = await resolveFile(pathname);
    const body = await readFile(file);
    res.writeHead(200, {
      'Content-Type': MIME[extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
  }
}).listen(PORT, '0.0.0.0', () => {
  console.log(`ASJ Portal preview server listening on http://0.0.0.0:${PORT}`);
});
