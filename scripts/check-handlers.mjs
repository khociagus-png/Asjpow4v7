// =============================================================================
// check-handlers.mjs — Guard handler inline TIDAK boleh missing di window
// -----------------------------------------------------------------------------
// Kelas bug yang sudah dua kali terjadi (2026-08-18):
//   - filterKelolaLoker / filterCbx / cariKandidatManual dipanggil HTML inline
//     (onkeyup/onclick) tapi TIDAK didaftarkan ke registerSeamAliases ->
//     ReferenceError tiap ketik (regresi refactor ESM Fase 3.5: dulu global
//     otomatis saat STACK concat, sekarang harus explicit window.*).
//   - Bug ini TIDAK terdeteksi lint/tes biasa: fungsi ada sebagai export,
//     tapi alias window-nya hilang.
//
// Skrip ini adalah jaring pengaman permanen:
//   1. Kumpulkan SEMUA nama fungsi yang DIPANGGIL dari handler inline:
//      - HTML statis (index/admin/partials + halaman standalone)
//      - string HTML yang di-generate JS (onclick="..." di dalam template)
//   2. Bandingkan dengan SEMUA nama yang didaftarkan ke window:
//      - kunci registerSeamAliases({...}) di seluruh js/
//      - assignment window.X = ... di seluruh js/
//   3. GAGAL (exit 1) kalau ada nama yang dipanggil tapi tidak terdaftar.
//
// Detail akurasi:
//   - Komentar (//, /* */, <!-- -->) di-strip dulu — jangan sampai contoh
//     di komentar dianggap referensi nyata.
//   - Property access (document.getElementById, this.select, event.stopPropagation)
//     di-skip — itu API DOM/JS, bukan alias seam.
//   - window.NAME(...) dihitung perlu terdaftar (kalau window.X dipanggil,
//     X harus ADA di window).
//
// Jalankan: bun run check:handlers  (otomatis di `bun run build`)
// =============================================================================

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const SKIP_DIRS = new Set(['node_modules', '.git', 'assets', '.freebuff', 'coverage', 'dist']);
const SKIP_FILES = /\.(map|test\.js|spec\.js)$/;

// ---- Utilitas ---------------------------------------------------------------

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (!SKIP_FILES.test(name) && /\.(html|js)$/.test(name)) out.push(p);
  }
  return out;
}

// Strip komentar: /* */ dan // (baris, hanya kalau diawali spasi/awal-baris —
// aman untuk kode prettier yang selalu spasi sebelum //) dan <!-- -->.
function stripComments(text) {
  text = text.replace(/\/\*[\s\S]*?\*\//g, ' ');
  text = text.replace(/(^|\s)\/\/[^\n]*/g, '$1 ');
  text = text.replace(/<!--[\s\S]*?-->/g, ' ');
  return text;
}

// ---- 1. Referensi handler ---------------------------------------------------

// Handler inline: onXXX="...". Nilai diambil sampai kutip penutup.
// Daftar event diperluas (2026-08-18, self-review): keydown/keypress/error dkk
// ternyata dipakai nyata di kode (rbAddChip, handleEnter, kirimPesanAdminAi,
// gateLogin) tapi sebelumnya TIDAK di-scan — lubang di jaring pengaman.
// Sengaja daftar eksplisit (bukan on[a-z]+) supaya atribut seperti `content=`
// tidak ketarik (regex `on[a-z]+` cocok dengan akhiran `content`).
const ON_RE =
  /on(?:click|dblclick|change|input|keyup|keydown|keypress|blur|focus|submit|reset|load|error|select|search|paste|scroll|mouseenter|mouseleave|mouseover|mouseout|mousedown|mouseup|touchstart|touchend|contextmenu|dragover|drop|dragstart|dragend|animationend|transitionend|pointerdown|pointerup|pointermove|pointerenter|pointerleave)="([^"]*)"/g;
// data-action="nama" (dispatcher delegasi bridge — resolve dari seam/window;
// kalau missing: console.warn + klik tidak melakukan apa-apa).
const ACTION_RE = /data-action="([A-Za-z_$][A-Za-z0-9_$]*)"/g;
// Panggilan fungsi di dalam nilai handler: (window.)?NAME(
const CALL_RE = /(window\.)?([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g;

// Nama yang dipanggil dari handler tapi berasal dari global standard browser/JS —
// bukan alias seam (encodeURIComponent, scrollTo, open, alert, dsb).
const STD_GLOBALS = new Set([
  'encodeURIComponent',
  'decodeURIComponent',
  'encodeURI',
  'decodeURI',
  'scrollTo',
  'open',
  'close',
  'alert',
  'confirm',
  'prompt',
  'parseInt',
  'parseFloat',
  'isNaN',
  'isFinite',
  'setTimeout',
  'clearTimeout',
  'setInterval',
  'clearInterval',
  'String',
  'Number',
  'Boolean',
  'Array',
  'Object',
  'JSON',
  'Math',
  'Date',
  'RegExp',
  'Error',
  'Promise',
  'Map',
  'Set',
  'WeakMap',
  'WeakSet',
  'Symbol',
  'BigInt',
  'Infinity',
  'NaN',
  'undefined',
  'globalThis',
  'window',
  'document',
  'navigator',
  'location',
  'history',
  'localStorage',
  'sessionStorage',
  'fetch',
  'console',
  'FormData',
  'Blob',
  'File',
  'FileReader',
  'Image',
  'URL',
  'URLSearchParams',
  'XMLHttpRequest',
  'atob',
  'btoa',
  'crypto',
  'performance',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'matchMedia',
  'getComputedStyle',
  'requestIdleCallback',
  'cancelIdleCallback',
  'queueMicrotask',
  'structuredClone',
  'TextEncoder',
  'TextDecoder',
  'IntersectionObserver',
  'ResizeObserver',
  'MutationObserver',
  'CustomEvent',
  'Event',
]);

// Kata kunci JS yang muncul sebagai `if(...)`, `for(...)` dll di handler inline
// (mis. onkeypress="if(event.key==='Enter'){...}") — bukan panggilan fungsi.
const JS_KEYWORDS = new Set([
  'if',
  'for',
  'while',
  'switch',
  'return',
  'typeof',
  'instanceof',
  'new',
  'delete',
  'void',
  'do',
  'else',
  'in',
  'of',
  'function',
  'class',
  'const',
  'let',
  'var',
  'this',
  'super',
  'yield',
  'await',
  'import',
  'export',
  'default',
  'throw',
  'try',
  'catch',
  'finally',
  'case',
  'break',
  'continue',
  'debugger',
]);

const refs = new Map(); // name -> contoh file pertama

// Kembalikan bagian handler yang ADA DI LUAR string literal (ganti string dengan
// spasi). Mencegah teks natural seperti '... Simpan sebagai PDF (Save as PDF) ...'
// dianggap panggilan fungsi. Alternasi: indeks genap = luar string.
function outsideStrings(handler) {
  let out = '';
  let quote = null;
  for (let i = 0; i < handler.length; i++) {
    const ch = handler[i];
    if (quote) {
      if (ch === '\\') {
        i++;
        continue;
      }
      if (ch === quote) {
        quote = null;
        out += ' ';
        continue;
      }
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      out += ' ';
      continue;
    }
    out += ch;
  }
  return out;
}

function collect(text, file) {
  let m;
  while ((m = ON_RE.exec(text))) {
    const outside = outsideStrings(m[1]);
    let c;
    CALL_RE.lastIndex = 0;
    while ((c = CALL_RE.exec(outside))) {
      const prefix = c[1];
      const name = c[2];
      const before = outside[c.index - 1];
      if (!prefix && before === '.') continue; // document./this./event. — property access
      if (STD_GLOBALS.has(name)) continue; // global standard browser/JS
      if (JS_KEYWORDS.has(name)) continue; // if(...)/for(...) — control flow, bukan fungsi
      if (!refs.has(name)) refs.set(name, file);
    }
  }
  while ((m = ACTION_RE.exec(text))) {
    if (!refs.has(m[1])) refs.set(m[1], file);
  }
}

const htmlFiles = walk('.').filter((p) => p.endsWith('.html'));
for (const f of htmlFiles) collect(stripComments(readFileSync(f, 'utf8')), f);
// Modul ESM: seluruh js/ + file JS di root (pwa.js, api-client.js, i18n.js, upload-guard.js)
const jsFiles = [...walk('js'), ...walk('.').filter((p) => /^[^\\/]+\.js$/.test(p))];
for (const f of jsFiles) collect(stripComments(readFileSync(f, 'utf8')), f);

// ---- 2. Nama terdaftar di window --------------------------------------------

// Kunci objek dari registerSeamAliases({...}) — state machine kecil key/value.
// Parser regex lama salah daftarkan NILAI (mis. { a: b, c } -> 'b' ikut
// terdaftar padahal bukan alias) — membuat jaring punya false negative.
// Nilai seam di proyek ini selalu flat (identifier/property access, tanpa
// arrow/nested) — terbukti dari scan semua registerSeamAliases({ di js/.
function collectSeamKeys(body) {
  const keys = new Set();
  let i = 0;
  let expectKey = true; // posisi key: setelah '{' atau ','
  while (i < body.length) {
    const ch = body[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === ',') {
      expectKey = true;
      i++;
      continue;
    }
    if (ch === ':') {
      expectKey = false;
      i++;
      continue;
    }
    if (ch === "'" || ch === '"') {
      const q = ch;
      let j = i + 1;
      while (j < body.length && body[j] !== q) j++;
      if (expectKey) keys.add(body.slice(i + 1, j));
      i = j + 1;
      continue;
    }
    if (expectKey) {
      const m = /^[A-Za-z_$][A-Za-z0-9_$]*/.exec(body.slice(i));
      if (m) {
        keys.add(m[0]);
        i += m[0].length;
        continue;
      }
      i++;
      continue;
    }
    // posisi value: lewati sampai koma/} (nilai flat)
    if (ch === '}' || ch === ',') {
      expectKey = true;
      i++;
      continue;
    }
    i++;
  }
  return keys;
}

const registered = new Set();
for (const f of jsFiles) {
  const src = stripComments(readFileSync(f, 'utf8'));
  // registerSeamAliases({ ... }) — kunci normal (a: b), string ('a': b), atau shorthand (a,)
  const seamRe = /registerSeamAliases\(\s*\{/g;
  let sm;
  while ((sm = seamRe.exec(src))) {
    // ambil blok objek pertama sampai } seimbang (cukup: sampai } yang menutup,
    // nilai shorthand tidak pernah berisi kurung kurawal)
    const start = sm.index + sm[0].length;
    const end = src.indexOf('}', start);
    if (end < 0) continue;
    const body = src.slice(start, end);
    for (const k of collectSeamKeys(body)) registered.add(k);
  }
  // window.X = ... (assignment global lain)
  const winRe = /window\.([A-Za-z_$][A-Za-z0-9_$]*)\s*=/g;
  let w;
  while ((w = winRe.exec(src))) registered.add(w[1]);
}

// ---- 3. Diff -----------------------------------------------------------------

const missing = [...refs.keys()].filter((n) => !registered.has(n)).sort();

console.log(
  'check-handlers: ' +
    refs.size +
    ' referensi handler unik, ' +
    registered.size +
    ' nama terdaftar di window.',
);
if (missing.length === 0) {
  console.log('✅ SEMUA handler inline terdaftar — tidak ada risiko ReferenceError.');
  process.exit(0);
}
console.log('❌ HANDLER DIPANGGIL TAPI TIDAK TERDAFTAR (' + missing.length + '):');
for (const n of missing) console.log('  - ' + n + '  (dipakai di: ' + (refs.get(n) || '?') + ')');
console.log(
  '\nCara fix: daftarkan fungsi tsb di registerSeamAliases({...}) di modulnya (lihat js/core/bridge.js).',
);
process.exit(1);
