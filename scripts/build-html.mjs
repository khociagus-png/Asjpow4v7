// =============================================================================
// build-html.mjs — Injeksi partial modal bersama (single source of truth)
// -----------------------------------------------------------------------------
// 18 modal identik antara admin.html & index.html disimpan di
// `partials/modals-shared.html`. Skrip ini:
//   1. Menghapus blok modal shared yang masih ada di halaman (mis. setelah
//      git reset / kerja manual — idempotent, no-op kalau sudah diekstrak)
//   2. Menyisipkan partial di antara marker <!--SHARED_MODALS_START/END-->
//      (atau membuat marker baru sebelum </body>)
//
// Efek: sumber HTML jauh lebih kecil (~85 KB/halaman berkurang), modal hanya
// dirawat di SATU tempat, dan hasil build identik dengan sebelumnya.
//
// Jalankan: bun run build:html  (bagian dari `bun run build`)
// =============================================================================

import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const ROOT = process.cwd();
const PAGES = ['admin.html', 'index.html'];
const PARTIAL_PATH = `${ROOT}/partials/modals-shared.html`;
const START = '<!--SHARED_MODALS_START-->';
const END = '<!--SHARED_MODALS_END-->';

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
const wrapped = `${START}\n${partial}\n${END}`;
// Fingerprint untuk deteksi "sudah ter-inject" (normalisasi spasi, robust).
const fingerprint = partial.slice(0, 120).replace(/\s+/g, ' ').trim();

if (sharedIds.length === 0) {
  console.error('[build-html] Tidak ada modal shared ditemukan di partial.');
  process.exit(1);
}

for (const page of PAGES) {
  const path = `${ROOT}/${page}`;
  let html = readFileSync(path, 'utf8');

  // 1) Hapus blok modal shared yang masih ada (no-op kalau sudah diekstrak).
  let removed = 0;
  for (const id of sharedIds) {
    let block;
    while ((block = findModalBlock(html, id)) !== null) {
      html = html.slice(0, block.start) + html.slice(block.end);
      removed++;
    }
  }

  // 2) Injeksi partial.
  const hasStart = html.includes(START);
  const alreadyInjected = html.includes(fingerprint);
  if (hasStart) {
    const sIdx = html.indexOf(START);
    const eIdx = html.indexOf(END, sIdx);
    if (eIdx === -1) {
      html = html.slice(0, sIdx) + wrapped + html.slice(sIdx + START.length);
    } else {
      html = html.slice(0, sIdx) + wrapped + html.slice(eIdx + END.length);
    }
    console.log(`[build-html] ${page}: partial di-inject ulang (${sharedIds.length} modal)`);
  } else if (alreadyInjected) {
    console.log(`[build-html] ${page}: sudah ter-inject (idempotent)`);
  } else {
    const bodyEnd = html.lastIndexOf('</body>');
    if (bodyEnd === -1) {
      console.error(`[build-html] </body> tidak ditemukan di ${page}`);
      process.exit(1);
    }
    html = html.slice(0, bodyEnd) + wrapped + '\n' + html.slice(bodyEnd);
    console.log(
      `[build-html] ${page}: hapus ${removed} blok + inject partial (${sharedIds.length} modal)`,
    );
  }

  writeFileSync(path, html);
}

console.log('[build-html] Selesai ✅');
