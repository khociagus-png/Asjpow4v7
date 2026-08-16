// db/client.js — klien REST Supabase (PostgREST) + normalisasi data.
// MODUL BARU (Fase 1.3 REFACTOR_TODO.md) — dipindah dari supabase.js,
// perilaku TIDAK berubah.
'use strict';

const { env } = require('../env');


function supabaseUrl() {
  return env('SUPABASE_URL');
}

function supabaseKey() {
  return env('SUPABASE_SERVICE_ROLE_KEY') || env('SUPABASE_ANON_KEY') || env('SUPABASE_KEY');
}

function hasBackend() {
  return !!(supabaseUrl() && supabaseKey());
}


async function supabaseJson(method, pathname, opts = {}) {
  const url = supabaseUrl();
  const key = supabaseKey();
  if (!url || !key) throw new Error('SUPABASE_URL / key belum dikonfigurasi');
  const qs = opts.query ? '?' + new URLSearchParams(opts.query).toString() : '';
  const res = await fetch(url.replace(/\/$/, '') + '/rest/v1/' + pathname + qs, {
    method,
    headers: {
      apikey: key,
      Authorization: 'Bearer ' + key,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(pathname + ' → HTTP ' + res.status + ' ' + text.slice(0, 200));
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}


// Coba daftar nama tabel sampai satu yang benar-benar ada & mengembalikan baris.
async function findTable(candidates, limit = 300) {
  for (const t of candidates) {
    try {
      const rows = await supabaseJson('GET', t, {
        query: { select: '*', limit },
      });
      if (Array.isArray(rows)) return { table: t, rows };
    } catch {
      /* coba tabel berikutnya */
    }
  }
  return { table: null, rows: [] };
}


function pick(row, keys) {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && row[k] !== '') return row[k];
  }
  return null;
}


function toText(v) {
  if (v == null) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}


// Normalisasi nomor WA Indonesia: "0821..." -> "62821...", "+62821..." -> "62821...".
function normalizeWa(v) {
  let d = String(v || '').replace(/\D/g, '');
  if (d.startsWith('0')) d = '62' + d.slice(1);
  return d;
}


// Status asli di DB campur: "✅ OPEN", "❌ CLOSE", "SELESAI / CLOSE",
// "PENCARIAN KANDIDAT", "PEMBERKASAN", "APPROVED", "" — yang berarti masih
// rekrutmen hanya yang eksplisit tertutup; sisanya dianggap OPEN.
function normalizeStatus(v) {
  const s = toText(v).toUpperCase();
  if (s.includes('URGENT')) return 'URGENT';
  if (s === '') return 'CLOSE';
  if (s.includes('CLOSE') || s.includes('TUTUP') || s.includes('SELESAI')) {
    return 'CLOSE';
  }
  return 'OPEN';
}


// SATU-SATUNYA normalisasi gender backend — disamakan dengan kanonikal situs
// lama (normalizeGenderValue di js/03_candidate.js): LAKI-LAKI / PEREMPUAN.
// CV AI dan render L/P mengecek format ini (includes('PEREMPUAN') dsb), jadi
// jangan tambah varian normalisasi lain di jalur mana pun.
function normalizeGender(v) {
  const s = toText(v).trim().toUpperCase();
  if (!s || s === '-') return '';
  if (s === 'L' || s === 'LK' || s === 'M' || s === 'PRIA' || s === 'MALE' || s.includes('LAKI'))
    return 'LAKI-LAKI';
  if (s === 'P' || s === 'PR' || s === 'F' || s === 'W' || s === 'FEMALE' || s === 'WANITA' || s === 'CEWEK' || s.includes('PEREMPUAN') || s.includes('女'))
    return 'PEREMPUAN';
  return '';
}


// Baca skema OpenAPI (daftar tabel + kolom) — dipakai untuk penemuan tabel
// adaptif saat nama tabel tidak cocok dengan tebakan.
async function getSchema() {
  if (!hasBackend()) return null;
  try {
    return await supabaseJson('GET', '', {});
  } catch {
    return null;
  }
}


function tablesFromSchema(spec) {
  if (!spec || !spec.paths) return [];
  return Object.keys(spec.paths)
    .map((p) => p.replace(/^\//, ''))
    .filter(Boolean);
}


function columnsFromSchema(spec, table) {
  if (!spec || !spec.components || !spec.components.schemas) return [];
  const s = spec.components.schemas[table];
  return s && s.properties ? Object.keys(s.properties) : [];
}

module.exports = {
  supabaseUrl,
  supabaseKey,
  hasBackend,
  supabaseJson,
  findTable,
  pick,
  toText,
  normalizeWa,
  normalizeStatus,
  normalizeGender,
  getSchema,
  tablesFromSchema,
  columnsFromSchema,
};
