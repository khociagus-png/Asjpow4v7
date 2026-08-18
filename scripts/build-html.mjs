// =============================================================================
// build-html.mjs — Modal shared + partial region halaman
// -----------------------------------------------------------------------------
// Bagian 1 (modal): semua modal bersama admin.html & index.html disimpan di
// `partials/modals-shared.html` (single source of truth). Skrip ini:
//   1. Menyalin partial ke `assets/modals-shared.html` (URL statis yang
//      di-fetch browser saat runtime; ikut ter-deploy & di-precache SW)
//   2. Menghapus blok modal shared yang masih inline di halaman (idempotent)
//   3. Menyisipkan loader runtime kecil di antara marker SHARED_MODALS.
//
// Bagian 2 (Fase 5): region bersama (head/header/footer/bottom-nav di
// index.html & admin.html; stack <script> standalone) diregenerasi dari
// partials/*.html setiap build — marker <!--XXX_START/END--> tetap tinggal di
// halaman, isi region di antara keduanya diganti dari partial (idempotent,
// byte-exact: partial = byte persis region asli, token {{...}} untuk beda
// index vs admin / per-halaman standalone).
//
// Jalankan: bun run build:html  (bagian dari `bun run build`)
// =============================================================================

import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
// Halaman bundel + partial — satu sumber kebenaran: scripts/module-registry.mjs.
import {
  BUNDLE_PAGES,
  STANDALONE_PAGES,
  MODAL_PARTIAL,
  PARTIALS,
  BUNDLE_REGIONS,
  STANDALONE_REGION,
  BUNDLE_TOKENS,
  SCRIPT_TOKENS,
} from './module-registry.mjs';

const ROOT = process.cwd();
const PAGES = BUNDLE_PAGES;
const PARTIAL_PATH = `${ROOT}/${MODAL_PARTIAL}`;
const ASSET_PATH = `${ROOT}/assets/modals-shared.html`;
const START = '<!--SHARED_MODALS_START-->';
const END = '<!--SHARED_MODALS_END-->';
const ASSET_URL = '/assets/modals-shared.html';

// Loader runtime: sinkron saat parse (modal ada sebelum DOMContentLoaded /
// kode aplikasi), dengan retry + jaring pengaman pointerdown kalau fetch
// pertama gagal (mis. jaringan lambat).
const LOADER_HTML = `${START}
<script>
(function () {
  var url = '${ASSET_URL}';
  var inject = function () {
    try {
      var root = document.getElementById('modal-root');
      if (root && root.childElementCount > 0) return true;
      var x = new XMLHttpRequest();
      x.open('GET', url, false);
      x.send();
      if (x.status === 200 && x.responseText) {
        var r = document.getElementById('modal-root');
        if (!r) {
          r = document.createElement('div');
          r.id = 'modal-root';
          document.body.appendChild(r);
        }
        r.innerHTML = x.responseText;
        return true;
      }
    } catch (e) {}
    return false;
  };
  if (!inject()) {
    setTimeout(function () {
      if (!inject()) console.warn('[modal-root] Gagal memuat ' + url);
    }, 800);
  }
  // Jaring pengaman: interaksi pertama memastikan modal sudah ada sebelum click.
  document.addEventListener('pointerdown', function () {
    var root = document.getElementById('modal-root');
    if (!root || root.childElementCount === 0) inject();
  });
})();
</script>
${END}`;

// Cari blok <div id="modal-X" ...> ... </div> (nesting-aware) mulai dari posisi div terbuka.
function findModalBlock(html, id) {
  const needle = `<div id="modal-${id}"`;
  const start = html.indexOf(needle);
  if (start === -1) return null;
  let depth = 0;
  let i = start;
  while (i < html.length) {
    const open = html.indexOf('<div', i);
    const close = html.indexOf('</div>', i);
    if (close === -1) return null;
    if (open !== -1 && open < close) {
      depth++;
      i = open + 4;
    } else {
      depth--;
      i = close + 6;
      if (depth === 0) return { start, end: i };
    }
  }
  return null;
}

// Id modal TOP-LEVEL di partial (modal yang di-dalam modal lain tidak dihitung).
function topLevelModalIds(html) {
  const re = /<div id="modal-([^"]+)"[^>]*>/g;
  const all = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    const start = m.index;
    let depth = 0;
    let i = start;
    while (i < html.length) {
      const open = html.indexOf('<div', i);
      const close = html.indexOf('</div>', i);
      if (close === -1) break;
      if (open !== -1 && open < close) {
        depth++;
        i = open + 4;
      } else {
        depth--;
        i = close + 6;
        if (depth === 0) break;
      }
    }
    all.push({ id: m[1], start, end: i });
  }
  return all
    .filter((x) => !all.some((y) => y !== x && x.start > y.start && x.end < y.end))
    .map((x) => x.id);
}

if (!existsSync(PARTIAL_PATH)) {
  console.error('[build-html] partials/modals-shared.html tidak ditemukan.');
  process.exit(1);
}

const partial = readFileSync(PARTIAL_PATH, 'utf8');
const sharedIds = topLevelModalIds(partial);

if (sharedIds.length === 0) {
  console.error('[build-html] Tidak ada modal shared ditemukan di partial.');
  process.exit(1);
}

// 1) Salin partial -> assets/modals-shared.html (URL runtime + precache SW).
copyFileSync(PARTIAL_PATH, ASSET_PATH);
console.log(
  `[build-html] assets/modals-shared.html <- partials/modals-shared.html (${sharedIds.length} modal, ${(partial.length / 1024).toFixed(1)} KB)`,
);

// 2) Per halaman: buang blok modal inline -> pasang loader runtime.
for (const page of PAGES) {
  const path = `${ROOT}/${page}`;
  let html = readFileSync(path, 'utf8');

  // 2a) Hapus blok modal shared yang masih inline (no-op kalau sudah bersih).
  let removed = 0;
  for (const id of sharedIds) {
    let block;
    while ((block = findModalBlock(html, id)) !== null) {
      html = html.slice(0, block.start) + html.slice(block.end);
      removed++;
    }
  }

  // 2b) Ganti region marker dengan loader (atau buat marker + loader).
  const hasStart = html.includes(START);
  const hasEnd = html.includes(END);
  if (hasStart) {
    const sIdx = html.indexOf(START);
    const eIdx = hasEnd ? html.indexOf(END, sIdx) : -1;
    if (eIdx === -1) {
      html = html.slice(0, sIdx) + LOADER_HTML + html.slice(sIdx + START.length);
    } else {
      html = html.slice(0, sIdx) + LOADER_HTML + html.slice(eIdx + END.length);
    }
    console.log(
      `[build-html] ${page}: loader runtime terpasang (modal inline: ${removed} blok dibuang)`,
    );
  } else {
    // Idempotent: loader sudah ada tanpa marker? (tidak mungkin di build ini)
    const bundleRe = /<script src="\/assets\/app-[^"]*\.js"><\/script>/;
    const bm = html.match(bundleRe);
    const bodyEnd = html.lastIndexOf('</body>');
    const anchor = bm ? bm.index : bodyEnd;
    if (anchor === -1) {
      console.error(`[build-html] </body> tidak ditemukan di ${page}`);
      process.exit(1);
    }
    html = html.slice(0, anchor) + LOADER_HTML + '\n' + html.slice(anchor);
    console.log(
      `[build-html] ${page}: marker + loader runtime dibuat (modal inline: ${removed} blok dibuang)`,
    );
  }

  writeFileSync(path, html);
}

// =============================================================================
// Bagian 2 (Fase 5) — expand region partial per halaman
// =============================================================================

// Token {{SOCIAL}} selalu diisi dari partials/social.html (sama utk semua
// halaman). Token lain diambil dari map token per-halaman (BUNDLE_TOKENS /
// SCRIPT_TOKENS). Token yang tidak dikenal dibiarkan apa adanya ({{...}}).
function expandPartial(partialPath, tokens) {
  let tpl = readFileSync(partialPath, 'utf8');
  if (tpl.includes('{{SOCIAL}}')) {
    tpl = tpl.split('{{SOCIAL}}').join(readFileSync(PARTIALS.social, 'utf8'));
  }
  return tpl.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in tokens ? tokens[k] : m));
}

// Ganti isi region di antara marker start/end dengan konten baru (dari
// partial). Konten di-trim trailing newline — newline disediakan oleh baris
// marker — sehingga idempotent (build berulang = byte sama).
function replaceRegion(html, startMarker, endMarker, content) {
  const s = html.indexOf(startMarker);
  if (s === -1) {
    console.warn(`[build-html] marker ${startMarker} tidak ditemukan — dilewati`);
    return html;
  }
  const e = html.indexOf(endMarker, s);
  if (e === -1) {
    console.warn(`[build-html] marker ${endMarker} tidak ditemukan — dilewati`);
    return html;
  }
  const trimmed = content.replace(/\n+$/, '');
  return (
    html.slice(0, s) +
    startMarker +
    '\n' +
    trimmed +
    '\n' +
    endMarker +
    html.slice(e + endMarker.length)
  );
}

// Halaman bundel: head/header/footer/bottom-nav dari partial.
for (const page of BUNDLE_PAGES) {
  const path = `${ROOT}/${page}`;
  let html = readFileSync(path, 'utf8');
  const tokens = BUNDLE_TOKENS[page] || {};
  for (const [name, region] of Object.entries(BUNDLE_REGIONS)) {
    if (!PARTIALS[name]) continue;
    const content = expandPartial(`${ROOT}/${PARTIALS[name]}`, tokens);
    const next = replaceRegion(html, region.start, region.end, content);
    if (next !== html) {
      html = next;
      console.log(
        `[build-html] ${page}: region ${name} <- partials/${PARTIALS[name].split('/').pop()}`,
      );
    }
  }
  writeFileSync(path, html);
}

// Halaman standalone: stack <script> akhir body dari scripts-shared partial.
for (const page of STANDALONE_PAGES) {
  const path = `${ROOT}/${page}`;
  const html = readFileSync(path, 'utf8');
  const tokens = SCRIPT_TOKENS[page] || {};
  const content = expandPartial(`${ROOT}/${PARTIALS.scriptsShared}`, tokens);
  const next = replaceRegion(html, STANDALONE_REGION.start, STANDALONE_REGION.end, content);
  if (next !== html) {
    writeFileSync(path, next);
    console.log(`[build-html] ${page}: region scripts-shared <- partials/scripts-shared.html`);
  } else {
    writeFileSync(path, html);
  }
}

console.log('[build-html] Selesai ✅');
