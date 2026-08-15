// =============================================================================
// scan-orphan-files.mjs — Audit READ-ONLY: cari file di Supabase Storage
// folder master/ yang TIDAK direferensikan oleh kolom mana pun
// (database_candidate & master_database_candidate) ataupun keterangan form
// (database_asj_form). Output = daftar file yang aman dihapus (tidak pernah
// menulis apa pun — dry-run murni).
//   bun run scripts/scan-orphan-files.mjs
// =============================================================================
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const supabase = require('../netlify/functions/_lib/supabase.js');

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'asj-files';
const BASE = supabase.supabaseUrl().replace(/\/$/, '');
const KEY = supabase.supabaseKey();
if (!BASE || !KEY) {
  console.error('Supabase belum dikonfigurasi (cek .env.local / Keys).');
  process.exit(1);
}

// ---- 1. List SEMUA file di bawah master/ -----------------------------------
// API list dengan prefix 'master/' mengembalikan SATU level (nama folder,
// tanpa prefix). Jadi: list folder dulu, lalu list tiap folder (paralel).
async function listPrefix(prefix) {
  const res = await fetch(`${BASE}/storage/v1/object/list/${BUCKET}`, {
    method: 'POST',
    headers: {
      apikey: KEY,
      Authorization: 'Bearer ' + KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prefix, limit: 200, offset: 0, sortBy: { column: 'name', order: 'asc' } }),
  });
  if (!res.ok) throw new Error('storage list HTTP ' + res.status);
  const j = await res.json();
  return Array.isArray(j)
    ? j
        .map((o) => (o && o.name ? String(o.name).replace(/\/$/, '') : ''))
        .filter(Boolean)
    : [];
}

async function listAllUnderMaster() {
  const folders = await listPrefix('master/');
  const out = [];
  // Jalankan list tiap folder dengan concurrency 8.
  const CHUNK = 8;
  for (let i = 0; i < folders.length; i += CHUNK) {
    const chunk = folders.slice(i, i + CHUNK);
    const results = await Promise.all(
      chunk.map((f) =>
        listPrefix('master/' + f + '/')
          .then((names) => names.map((n) => ({ rel: 'master/' + f + '/' + n, folder: f, name: n })))
          .catch(() => []),
      ),
    );
    for (const arr of results) out.push(...arr);
  }
  return out;
}

// ---- 2. Kumpulkan SEMUA referensi path di database --------------------------
// Ekstrak path relatif dari URL storage:  …/storage/v1/object/public/<bucket>/<path>
function pathsFromUrls(cells) {
  const set = new Set();
  for (const v of cells) {
    if (typeof v !== 'string' || !v) continue;
    const m = String(v).match(
      new RegExp('/storage/v1/object/public/' + BUCKET + '/([^?#]+)'),
    );
    if (!m) continue;
    let rel = m[1];
    try {
      rel = decodeURIComponent(rel);
    } catch {
      /* biarkan apa adanya */
    }
    set.add(rel.replace(/^\/+/, ''));
  }
  return set;
}

async function collectReferences() {
  const refs = new Set();
  // a) Semua kolom bertipe URL di tabel kandidat & master.
  for (const table of ['database_candidate', 'master_database_candidate']) {
    try {
      const { rows, table: found } = await supabase.findTable([table]);
      for (const r of rows || []) {
        for (const u of pathsFromUrls(Object.values(r))) refs.add(u);
      }
      console.log(`  (info) referensi dari ${found || table}: ${(rows || []).length} baris`);
    } catch (e) {
      console.log(`  (info) ${table} dilewati: ${String(e.message || e).slice(0, 80)}`);
    }
  }
  // b) Keterangan form lamaran (NAMA:URL;...) via parseDocs — URL penuh,
  // dinormalisasi ke path relatif dengan regex yang sama seperti di atas.
  const forms = await supabase.findForms();
  for (const f of forms) {
    for (const d of supabase.parseDocs(supabase.toText(f.keterangan))) {
      if (d && d.url) for (const p of pathsFromUrls([d.url])) refs.add(p);
    }
  }
  console.log(`  (info) ${forms.length} form lamaran, ${refs.size} path direferensikan`);
  return refs;
}

// ---- 3. Cocokkan folder -> nama kandidat (untuk laporan "folder yatim") -----
async function candidateFolderNames() {
  const found = await supabase.findCandidates();
  const set = new Set();
  for (const r of found.rows || []) {
    const nama = String(r.nama_lengkap || r.nama || r.name || '').trim();
    if (!nama) continue;
    // Persis cara apply-full.html menamai folder: UPPER + non [A-Z0-9_-] -> _
    set.add(nama.toUpperCase().replace(/[^A-Z0-9_-]/g, '_'));
  }
  return set;
}

// ---- Main -------------------------------------------------------------------
console.log('Scan file yatim di Supabase Storage master/ (read-only)...\n');
const files = await listAllUnderMaster();
console.log(`Total file di master/: ${files.length}`);

const refs = await collectReferences();
const candFolders = await candidateFolderNames();
console.log(`Folder kandidat dikenal: ${candFolders.size}`);

const orphans = [];
for (const o of files) {
  if (refs.has(o.rel)) continue;
  orphans.push(o);
}

console.log(`\nFile TIDAK direferensikan kolom/keterangan: ${orphans.length}\n`);

// Kategorikan dengan mempertimbangkan folder (share view menampilkan SEMUA
// file folder sebagai tombol dokumen — jadi KK/KTP di folder kandidat yang
// masih hidup BUKAN aman dihapus meski tidak ada di kolom DB):
//   A-varian-lama  — ada file lebih baru bertipe sama di folder yang sama
//                    (share view & DB memakai yang terbaru) → AMAN dihapus
//   B-folder-yatim — folder tidak cocok kandidat mana pun (kandidat dihapus) → AMAN
//   P-placeholder  — file .keep (penanda folder kosong) → AMAN dihapus
//   D-dipakai-folder — unik di folder kandidat hidup → TIDAK aman (share view)
function stemOf(name) {
  return String(name).replace(/\.\w+$/, '').replace(/_\d{10,}$/, '');
}
function docAgeOf(name) {
  const m = String(name).match(/_(\d{10,})/);
  return m ? Number(m[1]) : 0;
}

// Semua file per folder (termasuk yang direferensikan) untuk menemukan
// "terbaru per tipe".
const allByFolder = new Map();
for (const o of files) {
  if (!allByFolder.has(o.folder)) allByFolder.set(o.folder, []);
  allByFolder.get(o.folder).push(o);
}

const SAFE = [];
const USED = [];
for (const [folder, list] of [...allByFolder.entries()].sort()) {
  const folderKnown = candFolders.has(folder);
  // Tipe -> file terbaru di folder ini (share view pakai yang terbaru).
  const newestByType = new Map();
  for (const o of list) {
    const s = stemOf(o.name);
    const prev = newestByType.get(s);
    if (!prev || docAgeOf(o.name) > docAgeOf(prev.name)) newestByType.set(s, o);
  }
  for (const o of list) {
    if (refs.has(o.rel)) continue; // direferensikan kolom/keterangan — bukan yatim
    const isKeep = o.name === '.keep';
    const isVarianLama = !isKeep && newestByType.get(stemOf(o.name)) !== o;
    if (isKeep) {
      SAFE.push({ tag: 'P-placeholder', o });
    } else if (!folderKnown) {
      SAFE.push({ tag: 'B-folder-yatim', o });
    } else if (isVarianLama) {
      SAFE.push({ tag: 'A-varian-lama', o });
    } else {
      USED.push({ tag: 'D-dipakai-folder', o });
    }
  }
}

for (const { tag, o } of SAFE) console.log(`  [${tag}] master/${o.folder}/${o.name}`);
console.log(`\nFile dipakai SHARE VIEW (folder) — TIDAK aman dihapus: ${USED.length}`);
for (const { tag, o } of USED.slice(0, 40)) console.log(`  [${tag}] master/${o.folder}/${o.name}`);
if (USED.length > 40) console.log(`  …dan ${USED.length - 40} lainnya`);

const byTag = {};
for (const { tag } of SAFE) byTag[tag] = (byTag[tag] || 0) + 1;
console.log(
  `\nRINGKASAN: ${SAFE.length} file AMAN dihapus ` +
    `(A varian-lama: ${byTag['A-varian-lama'] || 0}, ` +
    `B folder-yatim: ${byTag['B-folder-yatim'] || 0}, ` +
    `P placeholder: ${byTag['P-placeholder'] || 0}).` +
    `\n${USED.length} file dipakai folder (share view) — jangan dihapus.` +
    `\nAudit ini read-only — tidak ada yang dihapus.`,
);
process.exit(0);
