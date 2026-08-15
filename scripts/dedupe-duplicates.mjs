// =============================================================================
// dedupe-duplicates.mjs — Merge baris duplikat warisan (dry-run default)
// -----------------------------------------------------------------------------
// Panel admin sekarang menampilkan 1 kandidat = 1 baris (dedupe by WA), tapi
// baris duplikat LAMA tetap ada di DB dan bikin bingung (lamaran yang sama
// tampil berulang di inbox, dokumen tersebar di beberapa baris).
//
// Tabel yang dirapikan:
//   - database_asj_form        grup by (no_wa, code_job)
//   - database_candidate       grup by no_wa
//   - pemberkasan_checklist    grup by (wa, tahap)
//
// Strategi: 1 baris "penjaga" per grup (status paling lanjut / updated_at
// terbaru / id terbesar), semua kolom dokumen & catatan dari baris lain
// digabung ke penjaga, lalu baris sisanya dihapus. Untuk lamaran, status
// LULUS > GAGAL > REVIEW > UPDATE > MENUNGGU — keputusan admin tidak hilang.
//
//   bun run scripts/dedupe-duplicates.mjs           # dry-run (read-only)
//   bun run scripts/dedupe-duplicates.mjs --apply   # backup JSON + merge + hapus
// Backup lengkap disimpan ke .freebuff/dedupe-backup-<timestamp>.json SEBELUM
// perubahan apa pun (baris asli + hasil merge), jadi bisa di-recover manual.
// =============================================================================
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const supabase = require('../netlify/functions/_lib/supabase.js');

const APPLY = process.argv.includes('--apply');
const BASE = supabase.supabaseUrl().replace(/\/$/, '');
const KEY = supabase.supabaseKey();
if (!BASE || !KEY) {
  console.error('Supabase belum dikonfigurasi (cek .env.local / Keys).');
  process.exit(1);
}
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' };
const normalizeWa = (v) => supabase.normalizeWa(v);

// ---- Helper fetch semua baris (paginasi Range) ------------------------------
async function getAll(table) {
  const out = [];
  let from = 0;
  const SIZE = 500;
  for (;;) {
    const res = await fetch(
      `${BASE}/rest/v1/${table}?select=*&order=id.asc`,
      { headers: { ...H, Range: `${from}-${from + SIZE - 1}` } },
    );
    if (!res.ok) throw new Error(`${table} GET HTTP ${res.status}: ${(await res.text()).slice(0, 120)}`);
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    out.push(...batch);
    if (batch.length < SIZE) break;
    from += SIZE;
  }
  return out;
}
async function patchRow(table, id, body) {
  const res = await fetch(`${BASE}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { ...H, Prefer: 'return=minimal' },
    body: JSON.stringify(body),
  });
  if (!res.ok && res.status !== 204) throw new Error(`PATCH ${table} #${id} HTTP ${res.status}`);
}
async function deleteRow(table, id) {
  const res = await fetch(`${BASE}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { ...H, Prefer: 'return=minimal' },
  });
  if (!res.ok && res.status !== 204) throw new Error(`DELETE ${table} #${id} HTTP ${res.status}`);
}

// ---- Strategi memilih baris penjaga ------------------------------------------
const FORM_PRIO = {
  LULUS: 6, LOLOS: 6, APPROVED: 6, APPROVE: 6,
  GAGAL: 5, TOLAK: 5, REJECTED: 5, REJECT: 5,
  'REVIEW ADMIN': 4, REVIEW: 4,
  UPDATE: 3, UPDATED: 3, PROSES: 3,
  MENUNGGU: 1, MAIL: 1, BARU: 1, PENDING: 1,
};
function formPrio(r) {
  const s = String(r.status || 'MENUNGGU').trim().toUpperCase();
  return FORM_PRIO[s] !== undefined ? FORM_PRIO[s] : 0;
}
function tsOf(r) {
  return String(r.updated_at || r.created_at || r.timestamp || '');
}
function pickKeeper(rows, opts = {}) {
  return [...rows].sort((a, b) => {
    const pa = opts.prio ? opts.prio(a) : 0;
    const pb = opts.prio ? opts.prio(b) : 0;
    if (pa !== pb) return pb - pa;
    const ta = tsOf(a), tb = tsOf(b);
    if (ta !== tb) return ta > tb ? -1 : 1;
    return (Number(b.id) || 0) - (Number(a.id) || 0);
  })[0];
}

// ---- Penggabung kolom ---------------------------------------------------------
const nonEmpty = (v) => v !== undefined && v !== null && String(v).trim() !== '';
// Kolom yang "diisi dari baris lain kalau penjaga kosong" (dokumen/data utama).
function mergeFill(keeper, dups, cols) {
  const body = {};
  let changed = false;
  for (const col of cols) {
    if (nonEmpty(keeper[col])) continue;
    for (const d of dups) {
      if (nonEmpty(d[col])) {
        body[col] = d[col];
        changed = true;
        break;
      }
    }
  }
  return { body, changed };
}
// keterangan "NAMA:URL;NAMA2:URL2;..." — gabungkan kamus dokumen semua baris.
function mergeDocs(keeper, dups) {
  const docs = {};
  for (const r of [keeper, ...dups]) {
    String(r.keterangan || '')
      .split(';')
      .forEach((chunk) => {
        const i = chunk.indexOf(':');
        if (i > 0) docs[chunk.slice(0, i).trim().toUpperCase()] = chunk.slice(i + 1).trim();
      });
  }
  const out = Object.entries(docs)
    .filter(([, v]) => v)
    .map(([k, v]) => k + ':' + v)
    .join(';');
  return out === String(keeper.keterangan || '') ? null : out;
}
// feedback_berkas "[UPLOAD KTP] · [BIODATA] ..." — gabung unik, urutan penjaga dulu.
function mergeFeedback(keeper, dups) {
  const items = [];
  const seen = new Set();
  for (const r of [keeper, ...dups]) {
    String(r.feedback_berkas || '')
      .split('·')
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((s) => {
        if (!seen.has(s)) {
          seen.add(s);
          items.push(s);
        }
      });
  }
  const out = items.join(' · ');
  return out === String(keeper.feedback_berkas || '').trim() ? null : out;
}
// catatan_internal kandidat — tag "[VIP]" / "[KELAS X]" digabung unik (tidak
// boleh hilang saat merge!), teks bebas diambil dari penjaga / baris lain.
function mergeCatatanInternal(keeper, dups) {
  const tags = [];
  const seenTag = new Set();
  const grab = (c) => String(c || '');
  for (const r of [keeper, ...dups]) {
    for (const t of grab(r.catatan_internal).match(/\[[^\]]+\]/g) || []) {
      if (!seenTag.has(t)) {
        seenTag.add(t);
        tags.push(t);
      }
    }
  }
  const freeTextOf = (c) => grab(c).replace(/\[[^\]]+\]\s*/g, '').trim();
  let freeText = freeTextOf(keeper.catatan_internal);
  if (!freeText) {
    for (const d of dups) {
      freeText = freeTextOf(d.catatan_internal);
      if (freeText) break;
    }
  }
  const out = [...tags, freeText].filter(Boolean).join(' ').trim();
  return out === grab(keeper.catatan_internal).trim() ? null : out;
}

// ---- Definisi tiap tabel -------------------------------------------------------
const TABLES = [
  {
    name: 'database_asj_form',
    key: (r) => normalizeWa(String(r.no_wa || r.wa || '')) + '#' + String(r.code_job || '').trim(),
    pick: (rows) => pickKeeper(rows, { prio: formPrio }),
    merge: (keeper, dups) => {
      const { body, changed } = mergeFill(keeper, dups, [
        'pas_photo', 'jft', 'ssw', 'file_cv', 'gender', 'usia', 'tb', 'bb',
        'email', 'tempat_lahir', 'tgl_lahir', 'alamat_lengkap', 'folder_url',
        'folder_id', 'folder_name', 'ai_data_json', 'kategory', 'nama_lengkap', 'no_wa',
      ]);
      const docs = mergeDocs(keeper, dups);
      const fb = mergeFeedback(keeper, dups);
      if (docs) body.keterangan = docs;
      if (fb) body.feedback_berkas = fb;
      return { body, changed: changed || !!docs || !!fb };
    },
  },
  {
    name: 'database_candidate',
    key: (r) => normalizeWa(String(r.no_wa || r.wa || '')),
    pick: (rows) => pickKeeper(rows),
    merge: (keeper, dups) => {
      const { body, changed } = mergeFill(keeper, dups, [
        'nik', 'gender', 'usia', 'tb', 'bb', 'pendidikan', 'id_loker_pilihan',
        'tahapan_seleksi', 'status_kandidat', 'tanggal_daftar', 'catatan_admin',
        'pas_photo', 'folder_url', 'jft', 'ssw', 'file_cv', 'no_pasport', 'email',
        'tempat_lahir', 'tgl_lahir', 'alamat_lengkap', 'catatan_external',
        'nilai_jft_text', 'bidang_ssw_text', 'id_kandidat',
      ]);
      const cat = mergeCatatanInternal(keeper, dups);
      if (cat) body.catatan_internal = cat;
      return { body, changed: changed || !!cat };
    },
  },
  {
    name: 'pemberkasan_checklist',
    key: (r) => normalizeWa(String(r.wa || r.no_wa || '')) + '#' + String(r.tahap ?? ''),
    pick: (rows) => pickKeeper(rows),
    merge: (keeper, dups) =>
      mergeFill(keeper, dups, [
        'nama_lengkap', 'kk_url', 'akte_url', 'sd_url', 'smp_url', 'sma_url',
        'pasport_url', 'mcu_url', 'kontrak_url', 'cert_url', 'ktp_url', 'foto2_url',
        'ijinortu_url', 'cpmi_url', 'kawin_url', 'sehat_url', 'bpjs_url',
        'psikotes_url', 'univ_url',
      ]),
  },
];

// ---- Main -----------------------------------------------------------------------
console.log(`Scan duplikat warisan (${APPLY ? 'APPLY — akan merge & hapus' : 'dry-run / read-only'})...\n`);
const report = [];
for (const t of TABLES) {
  const rows = await getAll(t.name);
  const groups = new Map();
  for (const r of rows) {
    const k = t.key(r);
    if (!k || k === '#') continue; // tanpa WA → jangan disentuh
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }
  let dupGroups = 0;
  let dupRows = 0;
  const groupsInfo = [];
  for (const [k, g] of groups) {
    if (g.length < 2) continue;
    dupGroups++;
    dupRows += g.length - 1;
    const keeper = t.pick(g);
    const dups = g.filter((r) => r.id !== keeper.id);
    const { body, changed } = t.merge(keeper, dups);
    groupsInfo.push({ key: k, rows: g.length, keeperId: keeper.id, dupIds: dups.map((d) => d.id), changed, mergedCols: Object.keys(body) });
    console.log(`  [${t.name}] ${k}: ${g.length} baris → penjaga #${keeper.id}${changed ? ' (+merge: ' + Object.keys(body).join(', ') + ')' : ' (tanpa isi tambahan)'}`);
  }
  if (!dupGroups) console.log(`  [${t.name}] bersih — tidak ada duplikat`);
  report.push({ table: t.name, dupGroups, dupRows, groups: groupsInfo });
  console.log('');
}

const totalGroups = report.reduce((a, r) => a + r.dupGroups, 0);
const totalRows = report.reduce((a, r) => a + r.dupRows, 0);
console.log(`RINGKASAN: ${totalGroups} grup duplikat, ${totalRows} baris duplikat siap dihapus (setelah digabung ke penjaga).`);

if (!APPLY) {
  console.log('\nDry-run selesai — tidak ada yang diubah. Jalankan dengan --apply untuk eksekusi.');
  process.exit(totalGroups ? 1 : 0);
}
if (totalGroups === 0) {
  console.log('\nTidak ada yang perlu dilakukan.');
  process.exit(0);
}

// Backup penuh SEBELUM mutasi.
const backupDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '.freebuff');
fs.mkdirSync(backupDir, { recursive: true });
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupFile = path.join(backupDir, `dedupe-backup-${ts}.json`);
const backupPayload = { timestamp: ts, report };
for (const t of TABLES) {
  backupPayload[t.name] = await getAll(t.name);
}
fs.writeFileSync(backupFile, JSON.stringify(backupPayload, null, 2));
console.log(`\n✅ Backup ${backupPayload.database_asj_form.length + backupPayload.database_candidate.length + backupPayload.pemberkasan_checklist.length} baris → ${backupFile}`);

let merged = 0;
let deleted = 0;
const errors = [];
for (const t of TABLES) {
  const rows = await getAll(t.name);
  const groups = new Map();
  for (const r of rows) {
    const k = t.key(r);
    if (!k || k === '#') continue;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }
  for (const [k, g] of groups) {
    if (g.length < 2) continue;
    const keeper = t.pick(g);
    const dups = g.filter((r) => r.id !== keeper.id);
    const { body, changed } = t.merge(keeper, dups);
    try {
      if (changed) {
        await patchRow(t.name, keeper.id, { ...body, updated_at: new Date().toISOString() });
        merged++;
      }
      for (const d of dups) await deleteRow(t.name, d.id);
      deleted += dups.length;
      console.log(`  ✅ [${t.name}] ${k}: gabung ke #${keeper.id}, hapus ${dups.length} baris`);
    } catch (e) {
      errors.push(`[${t.name}] ${k}: ${e.message}`);
      console.log(`  ❌ [${t.name}] ${k}: ${e.message}`);
    }
  }
}
console.log(`\n✅ Selesai: ${merged} penjaga diperbarui, ${deleted} baris duplikat dihapus.`);
if (errors.length) {
  console.log(`⚠ ${errors.length} grup gagal diproses (lihat daftar di atas). Backup tetap tersedia di ${backupFile}`);
  process.exit(1);
}
process.exit(0);
