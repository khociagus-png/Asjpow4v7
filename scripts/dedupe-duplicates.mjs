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
// Selain WA persis, grup dengan nama sama + WA mirip (typo, jarak edit <= 2)
// ikut digabung supaya 1 kandidat = 1 baris (contoh: 6282... vs 6223...).
// Backup lengkap disimpan ke .freebuff/dedupe-backup-<timestamp>.json SEBELUM
// perubahan apa pun (baris asli + hasil merge), jadi bisa di-recover manual.
// =============================================================================
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { normalizeWa: normWa, supabaseKey, supabaseUrl } = require('../netlify/functions/_lib/db/client');

const APPLY = process.argv.includes('--apply');
const BASE = supabaseUrl().replace(/\/$/, '');
const KEY = supabaseKey();
if (!BASE || !KEY) {
  console.error('Supabase belum dikonfigurasi (cek .env.local / Keys).');
  process.exit(1);
}
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' };
const normalizeWa = (v) => normWa(v);

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

// ---- Fuzzy merge: WA typo (nama sama + digit hampir sama) ----------------------
// normalizeWa hanya mencocokkan digit persis. Ada duplikat warisan yang WA-nya
// beda sedikit karena typo (mis. 6282342782945 vs 622342782945 — kehilangan
// digit '8'). Kalau nama lengkapnya identik DAN jarak edit kedua WA <= 2,
// perlakukan sebagai kandidat yang sama dan gabung jadi 1 baris.
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return d[m][n];
}
const normNameKey = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
const waDigits = (r) => normalizeWa(r && (r.no_wa || r.wa) || '');
// Pilih WA "kanonik" dari sekumpulan WA yang mirip: preferensi awalan 628
// (nomor HP) lalu digit terbanyak — angka yang benar biasanya 13 digit 628xx.
function preferWa(was) {
  const score = (w) => (w.startsWith('628') ? 2 : 0) + w.length;
  return [...was].sort((a, b) => score(b) - score(a))[0];
}
// Gabung grup yang WA-nya typo: union-find di atas nama + jarak edit WA.
function fuzzyCluster(groups) {
  const keys = [...groups.keys()];
  const parent = new Map(keys.map((k) => [k, k]));
  const find = (k) => {
    while (parent.get(k) !== k) {
      parent.set(k, parent.get(parent.get(k)));
      k = parent.get(k);
    }
    return k;
  };
  const byName = new Map();
  for (const k of keys) {
    const n = normNameKey(groups.get(k)[0].nama_lengkap);
    if (!n) continue;
    if (!byName.has(n)) byName.set(n, []);
    byName.get(n).push(k);
  }
  for (const ks of byName.values()) {
    for (let i = 0; i < ks.length; i++) {
      for (let j = i + 1; j < ks.length; j++) {
        const a = waDigits(groups.get(ks[i])[0]);
        const b = waDigits(groups.get(ks[j])[0]);
        if (a && b && a !== b && levenshtein(a, b) <= 2) {
          const ra = find(ks[i]);
          const rb = find(ks[j]);
          if (ra !== rb) parent.set(rb, ra);
        }
      }
    }
  }
  const out = new Map();
  for (const k of keys) {
    const r = find(k);
    if (!out.has(r)) out.set(r, []);
    for (const row of groups.get(k)) out.get(r).push(row);
  }
  // Baris yang sama (id kembar) tidak boleh dobel di dalam satu grup.
  for (const [r, rowsArr] of out) {
    const seen = new Map();
    for (const row of rowsArr) seen.set(row.id, row);
    out.set(r, [...seen.values()]);
  }
  return out;
}
// Kolom WA dibetulkan ke format kanonik kalau grup punya >1 WA (fuzzy typo).
function fixWaKeeper(keeper, dups, body) {
  const was = [...new Set([keeper, ...dups].map(waDigits).filter(Boolean))];
  if (was.length > 1) {
    const pw = preferWa(was);
    if (waDigits(keeper) !== pw) body.no_wa = pw;
  }
  return body;
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
// ai_data_json (jsonb) — SNAPSHOT bertingkat: setiap submit membawa state form
// yang makin lengkap. JANGAN pakai fill-if-empty (baris penjaga dipilih by
// STATUS, bisa jadi snapshot PALING TUA → data hilang). Deep-merge semua
// snapshot, newest-wins per leaf; array: snapshot terbaru yang non-kosong.
const isEmptyVal = (v) =>
  v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
function mergeJsonDeep(target, source) {
  for (const [k, v] of Object.entries(source)) {
    if (isEmptyVal(v)) continue;
    const tv = target[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      if (tv && typeof tv === 'object' && !Array.isArray(tv)) {
        mergeJsonDeep(tv, v);
      } else {
        target[k] = JSON.parse(JSON.stringify(v));
      }
    } else if (Array.isArray(v)) {
      if (v.length > 0) target[k] = JSON.parse(JSON.stringify(v));
      else if (tv === undefined) target[k] = [];
    } else if (isEmptyVal(tv)) {
      target[k] = v;
    } else {
      target[k] = v; // keduanya terisi → yang terbaru menang
    }
  }
  return target;
}
function mergeAiJson(rows) {
  const withAi = rows.filter((r) => r && r.ai_data_json);
  if (withAi.length === 0) return null;
  withAi.sort((a, b) => (tsOf(a) > tsOf(b) ? 1 : -1));
  let merged = {};
  for (const r of withAi) {
    let j = r.ai_data_json;
    if (typeof j === 'string') {
      try {
        j = JSON.parse(j);
      } catch (e) {
        continue;
      }
    }
    if (!j || typeof j !== 'object') continue;
    merged = mergeJsonDeep(merged, j);
  }
  return Object.keys(merged).length ? merged : null;
}
// Kolom biodata: ambil nilai TERBARU yang terisi di semua baris grup (bukan
// "penjaga dulu baru isi sisanya") — penjaga dipilih by status, belum tentu
// snapshot biodata terbaru.
function mergeFillLatest(rows, cols) {
  const body = {};
  let changed = false;
  const sorted = [...rows].sort((a, b) => (tsOf(a) > tsOf(b) ? 1 : -1));
  for (const col of cols) {
    const latest = [...sorted]
      .reverse()
      .find((r) => nonEmpty(r[col]));
    if (latest && String(latest[col]) !== String(rows[0][col])) {
      body[col] = latest[col];
      changed = true;
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
    fuzzy: true,
    key: (r) => normalizeWa(String(r.no_wa || r.wa || '')) + '#' + String(r.code_job || '').trim(),
    pick: (rows) => pickKeeper(rows, { prio: formPrio }),
    merge: (keeper, dups) => {
      const all = [keeper, ...dups];
      // ai_data_json DEEP-MERGE semua snapshot (newest-wins) — bukan fill-if-empty.
      const ai = mergeAiJson(all);
      // Kolom biodata lain: nilai terbaru yang terisi menang (penjaga by status
      // bisa saja snapshot paling tua → jangan biarkan data baru hilang).
      const { body, changed } = mergeFillLatest(all, [
        'pas_photo', 'jft', 'ssw', 'file_cv', 'gender', 'usia', 'tb', 'bb',
        'email', 'tempat_lahir', 'tgl_lahir', 'alamat_lengkap', 'folder_url',
        'folder_id', 'folder_name', 'kategory', 'nama_lengkap', 'no_wa',
      ]);
      fixWaKeeper(keeper, dups, body); // WA typo → format kanonik
      const docs = mergeDocs(keeper, dups);
      const fb = mergeFeedback(keeper, dups);
      if (ai) {
        const cur = typeof keeper.ai_data_json === 'string' ? keeper.ai_data_json : JSON.stringify(keeper.ai_data_json || {});
        if (JSON.stringify(ai) !== cur) {
          body.ai_data_json = JSON.stringify(ai);
        }
      }
      if (docs) body.keterangan = docs;
      if (fb) body.feedback_berkas = fb;
      return { body, changed: changed || !!docs || !!fb || !!body.ai_data_json };
    },
  },
  {
    name: 'database_candidate',
    fuzzy: true,
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
      fixWaKeeper(keeper, dups, body); // WA typo → format kanonik
      const cat = mergeCatatanInternal(keeper, dups);
      if (cat) body.catatan_internal = cat;
      return { body, changed: changed || !!cat || !!body.no_wa };
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
  let groups = new Map();
  for (const r of rows) {
    const k = t.key(r);
    if (!k || k === '#') continue; // tanpa WA → jangan disentuh
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }
  // WA typo (nama sama, digit mirip) → gabung grup biar jadi 1 baris.
  if (t.fuzzy) groups = fuzzyCluster(groups);
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
  let groups = new Map();
  for (const r of rows) {
    const k = t.key(r);
    if (!k || k === '#') continue;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }
  if (t.fuzzy) groups = fuzzyCluster(groups);
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
