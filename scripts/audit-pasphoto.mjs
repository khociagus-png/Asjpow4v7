// =============================================================================
// audit-pasphoto.mjs — Audit & perbaiki pas_photo kandidat yang menunjuk file
// yang TIDAK ADA di Supabase Storage (mis. PAS_PHOTO.jpg terhapus, atau path
// basi dari alur lama).
//   bun run scripts/audit-pasphoto.mjs           # dry-run (default)
//   bun run scripts/audit-pasphoto.mjs --apply   # backup JSON + PATCH
//
// Aturan perbaikan: kalau pas_photo kandidat 404, pakai pas_photo dari baris
// master (master_database_candidate, dicocokkan via no_wa) yang file-nya
// benar-benar ada di Storage. Kalau master juga kosong/404 → ditandai
// "TANPA PENGGANTI" (tidak diubah).
// =============================================================================
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const supabase = require('../netlify/functions/_lib/supabase.js');

const APPLY = process.argv.includes('--apply');
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'asj-files';
const BASE = supabase.supabaseUrl().replace(/\/$/, '');
const KEY = supabase.supabaseKey();
if (!BASE || !KEY) {
  console.error('Supabase belum dikonfigurasi (cek .env.local / Keys).');
  process.exit(1);
}

const normWa = (w) => String(w || '').replace(/\D/g, '');

// ---- 1. List SEMUA file di master/ (paginasi penuh) ------------------------
async function listPrefix(prefix) {
  const out = [];
  let offset = 0;
  const LIMIT = 200;
  for (;;) {
    const res = await fetch(`${BASE}/storage/v1/object/list/${BUCKET}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix, limit: LIMIT, offset }),
    });
    if (!res.ok) throw new Error('list ' + prefix + ' → HTTP ' + res.status);
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    out.push(...batch);
    offset += batch.length;
    if (batch.length < LIMIT) break;
  }
  return out;
}

// File di master/ dua level: folder (level 1) + isi folder (level 2).
async function listAllMasterFiles() {
  const top = await listPrefix('master/');
  const folders = top.filter((o) => o.id === null); // folder (metada null)
  const files = top.filter((o) => o.id !== null);
  const nested = await Promise.all(
    folders.map(async (f) => {
      const prefix = 'master/' + f.name + '/';
      const items = await listPrefix(prefix);
      return items.filter((o) => o.id !== null).map((o) => prefix + o.name);
    }),
  );
  return new Set([...files.map((o) => 'master/' + o.name), ...nested.flat()]);
}

// Ekstrak path storage dari URL publik: .../object/public/<bucket>/<path>
function storagePathFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const m = url.match(/\/object\/public\/[^/]+\/(.+)$/);
  return m ? decodeURIComponent(m[1]) : null;
}

// ---- 2. Ambil kandidat & master -------------------------------------------------
async function getTable(name, select, order) {
  const out = [];
  let offset = 0;
  const LIMIT = 1000;
  for (;;) {
    const res = await fetch(
      `${BASE}/rest/v1/${name}?select=${select}&order=${order}&limit=${LIMIT}&offset=${offset}`,
      { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } },
    );
    if (!res.ok) throw new Error(name + ' → HTTP ' + res.status + ' ' + (await res.text()).slice(0, 200));
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    out.push(...batch);
    offset += batch.length;
    if (batch.length < LIMIT) break;
  }
  return out;
}

console.log('Membaca Storage master/ ...');
const existing = await listAllMasterFiles();
console.log('File di Storage master/:', existing.size);

console.log('Membaca database_candidate & master_database_candidate ...');
const candidates = await getTable('database_candidate', 'id,id_kandidat,nama_lengkap,no_wa,pas_photo', 'id');
const masters = await getTable('master_database_candidate', 'id,id_kandidat,nama_lengkap,no_wa,pas_photo', 'id');
console.log('Kandidat:', candidates.length, '| Master:', masters.length);

const masterByWa = new Map();
for (const m of masters) {
  const w = normWa(m.no_wa);
  if (w && !masterByWa.has(w)) masterByWa.set(w, m);
}
const masterByIdKand = new Map();
for (const m of masters) {
  if (m.id_kandidat && !masterByIdKand.has(String(m.id_kandidat))) masterByIdKand.set(String(m.id_kandidat), m);
}

// ---- 3. Audit ------------------------------------------------------------------
const broken = [];
const ok = [];
const nonStorage = [];
for (const c of candidates) {
  const url = c.pas_photo;
  const sp = storagePathFromUrl(url);
  if (!sp) {
    if (url && url !== '-' && url !== '' && !url.startsWith('data:')) nonStorage.push({ id: c.id, nama: c.nama_lengkap, url });
    continue; // drive link / kosong — di luar lingkup audit storage
  }
  if (existing.has(sp)) { ok.push(c.id); continue; }
  // Rusak — cari pengganti dari master
  const master = masterByWa.get(normWa(c.no_wa)) || masterByIdKand.get(String(c.id_kandidat || ''));
  let replacement = null;
  if (master) {
    const msp = storagePathFromUrl(master.pas_photo);
    if (msp && existing.has(msp)) replacement = master.pas_photo;
  }
  broken.push({ id: c.id, id_kandidat: c.id_kandidat, nama: c.nama_lengkap, wa: c.no_wa, rusak: url, pengganti: replacement, masterPunya: !!master });
}

console.log('\n================ HASIL AUDIT ================');
console.log('pas_photo valid           :', ok.length);
console.log('non-storage (drive/dll)   :', nonStorage.length);
console.log('RUSAK (file tidak ada)    :', broken.length);
const withFix = broken.filter((b) => b.pengganti);
const noFix = broken.filter((b) => !b.pengganti);
console.log('  → ada pengganti master  :', withFix.length);
console.log('  → TANPA pengganti       :', noFix.length);

for (const b of broken) {
  console.log(
    `  [${b.id}] ${b.nama} (${b.wa}) — rusak: ${b.rusak ? b.rusak.slice(0, 90) : '-'}`,
  );
  if (b.pengganti) console.log(`      → ganti: ${b.pengganti.slice(0, 110)}`);
  else console.log(`      → TANPA PENGGANTI${b.masterPunya ? ' (master ada tapi pas_photo-nya juga 404/kosong)' : ' (tidak ada master)'}`);
}
if (nonStorage.length) {
  console.log('\nNon-storage (tidak disentuh):');
  for (const n of nonStorage) console.log(`  [${n.id}] ${n.nama} — ${String(n.url).slice(0, 90)}`);
}

// ---- 4. Apply ------------------------------------------------------------------
if (APPLY) {
  if (!withFix.length) {
    console.log('\nTidak ada yang perlu diperbaiki.');
    process.exit(0);
  }
  const stamp = new Date().toISOString();
  const backupPath = path.resolve(fileURLToPath(import.meta.url), '../../.freebuff/pasphoto-fix-backup-' + stamp.replace(/[:.]/g, '-') + '.json');
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.writeFileSync(
    backupPath,
    JSON.stringify(
      withFix.map((b) => ({ id: b.id, nama: b.nama, wa: b.wa, lama: b.rusak, baru: b.pengganti })),
      null,
      2,
    ),
  );
  console.log('\nBackup ->', backupPath);

  let n = 0;
  for (const b of withFix) {
    const res = await fetch(`${BASE}/rest/v1/database_candidate?id=eq.${b.id}`, {
      method: 'PATCH',
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ pas_photo: b.pengganti }),
    });
    if (!res.ok) {
      console.error('  GAGAL id=' + b.id + ' → HTTP ' + res.status + ' ' + (await res.text()).slice(0, 150));
      continue;
    }
    n++;
    console.log('  OK id=' + b.id + ' (' + b.nama + ')');
  }
  console.log('\nDiperbaiki:', n, 'dari', withFix.length);
} else {
  console.log('\n(dry-run — jalankan dengan --apply untuk memperbaiki; backup otomatis dibuat dulu)');
}
