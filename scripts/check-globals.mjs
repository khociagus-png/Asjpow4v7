// =============================================================================
// check-globals.mjs — Guard kolisi global (prasyarat Fase 3 ESM)
// -----------------------------------------------------------------------------
// Sebelum konversi ES Modules bisa dimulai, bundel admin/index (STACK di
// build-js.mjs) HARUS bebas kolisi deklarasi top-level. Kenapa:
//   - esbuild bundle mode RENAMES deklarasi top-level saat ada nama yang
//     bentrok lintas modul, dan rename itu TIDAK konsisten dengan referensi
//     global implisit dari modul lain → ReferenceError diam-diam.
//   - eksperimen (Fase 3 langkah 1) membuktikan rename terjadi bahkan tanpa
//     kolisi, selama modul lain mereferensikan nama itu sebagai global.
//   - konversi bertahap ke ESM butuh jaminan "nol kolisi" supaya setiap simbol
//     yang di-export tidak punya kembaran deklarasi lain.
//
// Skrip ini membaca STACK dari scripts/build-js.mjs (satu-satunya sumber
// kebenaran urutan bundel), mengekstrak deklarasi top-level tiap file, dan
// GAGAL (exit 1) kalau ada nama yang dideklarasikan di 2+ file STACK.
// Juga melaporkan (warning) kalau nama STACK muncul di js/pages/* (risiko
// saat halaman standalone ikut dibundel).
//
// Jalankan: bun run check:globals  (juga dijalankan otomatis di `bun run build`)
// =============================================================================

import { readFileSync, existsSync } from 'node:fs';
// STACK dibaca dari registry (bukan di-parse dari build-js via regex) —
// satu sumber kebenaran struktur modul.
import { STACK, PAGE_JS } from './module-registry.mjs';

const ROOT = process.cwd();

// Deklarasi top-level (kolom 0): function/async function/class/const/let/var.
// Fase 3: prefix `export` di file ESM (api-client.js/i18n.js) diabaikan.
const DECL_RE =
  /^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)|^(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\b|^(?:export\s+)?class\s+([A-Za-z_$][\w$]*)/gm;

function topLevelDecls(filePath) {
  const text = readFileSync(filePath, 'utf8');
  const names = new Set();
  let m;
  DECL_RE.lastIndex = 0;
  while ((m = DECL_RE.exec(text)) !== null) {
    const name = m[1] || m[2] || m[3];
    if (name && !name.startsWith('window')) names.add(name);
  }
  return names;
}

const byName = new Map(); // name -> [file...]
let missing = 0;
for (const p of STACK) {
  const file = ROOT + p;
  if (!existsSync(file)) {
    console.error(`[check-globals] FILE HILANG: ${p}`);
    missing++;
    continue;
  }
  for (const name of topLevelDecls(file)) {
    if (!byName.has(name)) byName.set(name, []);
    byName.get(name).push(p);
  }
}

let errors = 0;
for (const [name, files] of byName) {
  const uniq = [...new Set(files)];
  if (uniq.length > 1) {
    errors++;
    console.error(
      `[check-globals] ✖ KOLISI GLOBAL: ${name} dideklarasikan di ${uniq.length} file STACK:`,
    );
    for (const f of uniq) console.error(`    ${f}`);
  }
}

// Warning: nama STACK juga dipakai js/pages/* (saat halaman standalone
// dijadikan entry ESM, kolisi dengan bundel admin/index harus dihindari).
const pageFiles = PAGE_JS;
let pageWarn = 0;
for (const p of pageFiles) {
  const file = ROOT + p;
  if (!existsSync(file)) continue;
  for (const name of topLevelDecls(file)) {
    if (byName.has(name)) {
      pageWarn++;
      console.warn(
        `[check-globals] ⚠ nama STACK "${name}" juga dideklarasikan di ${p} — hati-hati saat bundling per-halaman.`,
      );
    }
  }
}

console.log(
  `[check-globals] ${STACK.length} file STACK · ${byName.size} simbol top-level unik · ` +
    `${errors === 0 ? 'nol kolisi ✓' : errors + ' kolisi ✖'} · ${pageWarn} warning page`,
);

if (missing > 0 || errors > 0) process.exit(1);
