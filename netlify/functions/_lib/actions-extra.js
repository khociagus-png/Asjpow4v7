// actions-extra.js — handler backend rebuild untuk action yang belum ada di
// handlers.js. Semua aksi ini membaca/menulis Supabase asli (skema sudah
// diintrospeksi) dan mengikuti kontrak payload/respons frontend (lihat
// master-full.html, apply-full.html, ai_form.html, js/07_api.js, dll).
'use strict';

const bcrypt = require('bcryptjs');
const supabase = require('./supabase');
const session = require('./session');
const { env } = require('./env');
const { requireRole, isOwnerOrAdmin } = require('./actions-auth');
const { findMasterByWa } = require('./actions-master');

// ---------------------------------------------------------------------------
// Helper dasar
// ---------------------------------------------------------------------------
// requireRole (Fase 1.2) dipusatkan di actions-auth.js — tidak ada definisi
// dobel lagi. Handler di file ini memakainya seperti biasa.

// ---------------------------------------------------------------------------
// REVIEW.md M2 — proteksi PII: data penuh hanya untuk pemilik WA (kandidat)
// atau admin; pemanggil tanpa sesi valid hanya mendapat field prefill.
// ---------------------------------------------------------------------------
const PUBLIC_PREFILL_FIELDS = new Set([
  'idKandidat',
  'id',
  'nama',
  'wa',
  'gender',
  'usia',
  'tb',
  'bb',
  'tbBb',
  'ttl',
  'pendidikan',
  'pasPhoto',
  'email',
  'tempatLahir',
  'tglLahir',
  'alamat',
  'jftText',
  'sswText',
  'jft',
  'ssw',
  'fileCv',
  'idLoker',
  'tahapan',
  'status',
]);

// true jika session valid: admin (bebas) ATAU kandidat pemilik `wa` tsb.
// Potong objek kandidat (hasil mapCandidate) hanya ke field prefill aman.
function pickPrefill(data) {
  const safe = {};
  for (const k of Object.keys(data || {})) {
    if (PUBLIC_PREFILL_FIELDS.has(k)) safe[k] = data[k];
  }
  return safe;
}

function bucket() {
  return env('SUPABASE_STORAGE_BUCKET') || 'asj-files';
}

// Request ke Supabase Storage (di luar /rest/v1).
async function storageRequest(method, pathname, opts = {}) {
  const url = supabase.supabaseUrl();
  const key = supabase.supabaseKey();
  if (!url || !key) throw new Error('Supabase belum dikonfigurasi');
  const res = await fetch(url.replace(/\/$/, '') + '/storage/v1/' + pathname, {
    method,
    headers: {
      apikey: key,
      Authorization: 'Bearer ' + key,
      ...(opts.headers || {}),
    },
    body: opts.body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error('storage/' + pathname + ' → HTTP ' + res.status + ' ' + text.slice(0, 200));
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function publicUrl(path) {
  return (
    supabase.supabaseUrl().replace(/\/$/, '') + '/storage/v1/object/public/' + bucket() + '/' + path
  );
}

// Terima base64 (boleh dengan prefix data:*) → kembalikan Buffer.
function b64ToBuffer(data) {
  let s = String(data || '');
  const comma = s.indexOf(',');
  if (comma >= 0 && /^data:/i.test(s.slice(0, comma + 1))) s = s.slice(comma + 1);
  return Buffer.from(s, 'base64');
}

function mimeFromName(name, fallback) {
  const ext = String(name || '')
    .split('.')
    .pop()
    .toLowerCase();
  const map = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    bmp: 'image/bmp',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    txt: 'text/plain',
    csv: 'text/csv',
    rtf: 'application/rtf',
    odt: 'application/vnd.oasis.opendocument.text',
  };
  return map[ext] || fallback || 'application/octet-stream';
}

// Alias nama file per jenis — semua jalur upload (apply-full, dashboard,
// master form, admin) dijamin memakai stem yang sama, sehingga file lama
// ikut terhapus & tidak ada dokumen dobel (mis. KTP 2 / KK 2 di share view).
function stemAliases(stem) {
  const u = String(stem || '').toUpperCase();
  const m = {
    PAS_PHOTO: ['PHOTOFILE', 'PASPHOTO', 'FOTO'],
    PHOTOFILE: ['PAS_PHOTO', 'PASPHOTO', 'FOTO'],
    PASPHOTO: ['PAS_PHOTO', 'PHOTOFILE', 'FOTO'],
    CV: ['CVFILE', 'FILE_CV', 'CV_REVISI'],
    CVFILE: ['CV', 'FILE_CV', 'CV_REVISI'],
    CV_REVISI: ['CV', 'CVFILE', 'FILE_CV'],
    JFT: ['JFTFILE'],
    JFTFILE: ['JFT'],
    SSW: ['SSWFILE'],
    SSWFILE: ['SSW'],
    KK: ['KARTU_KELUARGA'],
    KARTU_KELUARGA: ['KK'],
  };
  return m[u] || [];
}

// Hapus semua varian lama satu jenis file di folder (mis. KTP.jpg, KTP.png,
// KK_1786….pdf — termasuk varian bertimestamp dari backend lama — plus
// alias-nya). Dipanggil SEBELUM upload supaya selalu menimpa file lama.
// Catatan API: object/list mengembalikan nama RELATIF terhadap prefix, jadi
// filter + delete harus pakai path lengkap (folder + "/" + nama).
function isVarianOf(name, stem) {
  const n = String(name || '');
  if (!n || !stem) return false;
  // KTP.ext / KTP.png — varian tanpa timestamp.
  if (n.startsWith(stem + '.')) return true;
  // KTP_1786683311216.pdf — varian bertimestamp (backend lama menamai
  // file dengan timestamp sehingga upload kedua tidak menimpa).
  return n.startsWith(stem + '_');
}

async function hapusJenisVarian(folder, stem) {
  const f = String(folder).replace(/^\/+|\/+$/g, '');
  const stems = [String(stem || '')].concat(stemAliases(stem)).filter(Boolean);
  try {
    const list = await storageRequest('POST', 'object/list/' + bucket(), {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix: f + '/', limit: 300, offset: 0 }),
    });
    const items = Array.isArray(list) ? list : [];
    const victims = items
      .map((o) => (o && o.name ? String(o.name) : ''))
      .filter((n) => n && stems.some((s) => isVarianOf(n, s)));
    if (victims.length) {
      await storageRequest('DELETE', 'object/' + bucket(), {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefixes: victims.map((n) => f + '/' + n) }),
      });
    }
  } catch (e) {
    // List/hapus gagal tidak memblokir upload — x-upsert tetap menimpa nama sama.
  }
}

// Upload file base64 ke Storage, kembalikan public URL.
async function uploadBase64(data, folder, fileName) {
  if (!data) return null;
  const buf = b64ToBuffer(data);
  const cleanName = String(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
  const stem = cleanName.split('.')[0];
  // FIX anti-duplikat: hapus varian lama (KTP.jpg / KTP.png / alias) dulu.
  await hapusJenisVarian(folder, stem);
  const path = String(folder).replace(/^\/+|\/+$/g, '') + '/' + cleanName;
  await storageRequest('POST', 'object/' + bucket() + '/' + path, {
    headers: {
      'Content-Type': mimeFromName(cleanName),
      'x-upsert': 'true',
    },
    body: buf,
  });
  return publicUrl(path);
}

// ---------------------------------------------------------------------------
// getUploadUrls — signed upload URL + public URL per file (dipakai frontend
// uploadFilesDirectly di apply-full.html / ai_form.html / js/07_api.js).
// ---------------------------------------------------------------------------
async function handleGetUploadUrls(payload, sessionToken) {
  if (!supabase.hasBackend()) return { success: false, error: 'Backend belum dikonfigurasi.' };
  const body = (payload && payload[0]) || payload || {};
  const files = Array.isArray(body.files) ? body.files : [];
  const folder = String(body.folder || 'misc').replace(/^\/+|\/+$/g, '');
  if (files.length === 0) return { success: false, error: 'Tidak ada file untuk diupload.' };
  const urls = {};
  try {
    for (const f of files) {
      const key = String(f.key || '').trim();
      if (!key) continue;
      const prefix =
        String(f.prefix || key)
          .trim()
          .replace(/[^a-zA-Z0-9_-]/g, '_') || 'FILE';
      const ext =
        String(f.ext || 'bin')
          .replace(/[^a-z0-9]/gi, '')
          .toLowerCase() || 'bin';
      const path = (folder ? folder + '/' : '') + prefix + '.' + ext;
      // FIX anti-duplikat: hapus varian lama jenis ini sebelum upload baru.
      await hapusJenisVarian(folder, prefix);
      const res = await storageRequest('POST', 'object/upload/sign/' + bucket() + '/' + path, {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresIn: 120 }),
      });
      const rel = res && res.url ? String(res.url) : '/object/upload/sign/' + bucket() + '/' + path;
      urls[key] = {
        signedUrl:
          supabase.supabaseUrl().replace(/\/$/, '') +
          '/storage/v1' +
          (rel.startsWith('/') ? rel : '/' + rel),
        publicUrl: publicUrl(path),
      };
    }
    return { success: true, urls };
  } catch (e) {
    return { success: false, error: 'Gagal membuat link upload: ' + e.message };
  }
}

// ---------------------------------------------------------------------------
// Apply publik (apply-full.html)
// ---------------------------------------------------------------------------
const APPLY_WA_COLS = ['no_wa', 'wa', 'whatsapp'];

async function findFormByWa(wa) {
  const want = supabase.normalizeWa(wa);
  // Jalur cepat: tarik hanya lamaran WA ini, bukan scan 500 baris inbox.
  let rows = await supabase.findFormsByWa(wa);
  if (rows === undefined) rows = await supabase.findForms();
  return rows.find((r) => supabase.normalizeWa(String(r.no_wa || r.wa || '')) === want) || null;
}

// Cari lamaran per (WA + kode job) — kandidat boleh punya BANYAK lamaran
// untuk job berbeda; tiap kombinasi WA+job punya SATU baris di mail.
async function findFormByWaJob(wa, code) {
  const want = supabase.normalizeWa(wa);
  // Jalur cepat: tarik hanya lamaran WA ini, bukan scan 500 baris inbox.
  let rows = await supabase.findFormsByWa(wa);
  if (rows === undefined) rows = await supabase.findForms();
  return (
    rows.find(
      (r) =>
        supabase.normalizeWa(String(r.no_wa || r.wa || '')) === want &&
        String(r.code_job || '').trim() === String(code || '').trim(),
    ) || null
  );
}

// ---------------------------------------------------------------------------
// Mail sync — status UPDATE + ringkasan aktivitas (feedback_berkas)
// ---------------------------------------------------------------------------
// Status lamaran (database_asj_form.status):
//   MENUNGGU = lamaran baru / belum diproses admin
//   UPDATE   = kandidat MENGUBAH data (biodata/berkas) setelah barisnya sudah
//              pernah diproses admin — progres LULUS/GAGAL tidak di-reset,
//              admin cukup melihat badge UPDATE + ringkasan apa yang berubah.
const MAIL_PENDING_STATUS = ['MENUNGGU', 'MAIL', 'BARU', 'PENDING'];

function mailStatusUntukUpdate(currentStatus) {
  const cur = String(currentStatus || '').toUpperCase();
  if (!cur || MAIL_PENDING_STATUS.includes(cur)) return 'MENUNGGU';
  return 'UPDATE';
}

// Catat aktivitas terakhir (maks 3 entri) di feedback_berkas, mis.:
//   "[BIODATA] email & alamat diubah · [UPLOAD KTP] · [UPLOAD CV]"
function appendFeedback(prev, entry) {
  const items = String(prev || '')
    .split('·')
    .map((s) => s.trim())
    .filter(Boolean);
  items.unshift(String(entry || '').trim());
  return items.slice(0, 3).join(' · ');
}

// Label ID untuk ringkasan biodata (kolom master → nama yang dibaca manusia).
const MASTER_FIELD_LABEL = {
  nama_lengkap: 'nama',
  furigana: 'furigana',
  namapanggilan: 'panggilan',
  panggilan_katakana: 'panggilan katakana',
  gender: 'gender',
  tempat_lahir: 'tempat lahir',
  tgl_lahir: 'tgl lahir',
  usia: 'usia',
  agama: 'agama',
  status_pernikahan: 'status nikah',
  jumlah_anak: 'anak',
  nik: 'KTP/NIK',
  driver_license: 'SIM',
  alamat_lengkap: 'alamat',
  email: 'email',
  tb: 'tinggi',
  bb: 'berat',
  no_pasport: 'paspor',
  no_coe: 'nomor COE',
};

// Biodata diubah → tandai baris mail kandidat (SEMUA lamarannya) dengan
// status UPDATE (kalau sudah pernah diproses admin) + ringkasan apa yang
// berubah, supaya admin tidak bingung "email baru, tapi apa yang di-update?".
async function syncBiodataKeMail(wa, nama, labels) {
  const want = supabase.normalizeWa(wa);
  // Jalur cepat: tarik hanya lamaran WA ini, bukan scan 500 baris inbox.
  let rows = await supabase.findFormsByWa(wa);
  if (rows === undefined) rows = await supabase.findForms();
  const mine = rows.filter((r) => supabase.normalizeWa(String(r.no_wa || r.wa || '')) === want);
  if (!mine.length) return;
  for (const r of mine) {
    if (r.id === undefined || r.id === null) continue;
    // [[PREV:xxx]] menyimpan status sebelum UPDATE supaya tombol "Tandai
    // Dibaca" bisa mengembalikannya (LULUS/GAGAL/REVIEW tidak hilang).
    const isUpdate = mailStatusUntukUpdate(r.status) === 'UPDATE';
    const entry =
      (isUpdate ? '[[PREV:' + String(r.status || '').toUpperCase() + ']] ' : '') +
      '[BIODATA] ' +
      (labels.length ? labels.join(', ') : 'data diperbarui');
    const body = {
      timestamp: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      feedback_berkas: appendFeedback(r.feedback_berkas, entry),
    };
    if (isUpdate) body.status = 'UPDATE';
    await supabase.supabaseJson('PATCH', 'database_asj_form', {
      query: { id: 'eq.' + r.id },
      body,
      headers: { Prefer: 'return=minimal' },
    });
  }
}

// cekDataPelamar([wa]) → { found, nama, gender, usia, tb, bb, pasPhoto,
// jftUrl, sswUrl, applications } — applications = SEMUA lamaran WA (multi-apply),
// dipakai apply-full.html untuk menampilkan peringatan kalau sudah LULUS job lain.
async function handleCekDataPelamar(payload) {
  const wa = String((payload && payload[0]) || '');
  if (!wa) return { found: false, applications: [] };
  try {
    // Jalur cepat: tarik hanya lamaran WA ini, bukan scan 500 baris inbox.
    let rows = await supabase.findFormsByWa(wa);
    if (rows === undefined) rows = await supabase.findForms();
    const want = supabase.normalizeWa(wa);
    const apps = rows
      .filter((r) => supabase.normalizeWa(String(r.no_wa || r.wa || '')) === want)
      .map((r) => ({
        code: supabase.toText(r.code_job || ''),
        status: supabase.toText(r.status || 'MENUNGGU'),
        timestamp: supabase.toText(r.timestamp || r.created_at || ''),
      }))
      .sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
    const row =
      rows.find((r) => supabase.normalizeWa(String(r.no_wa || r.wa || '')) === want) || null;
    if (!row) return { found: false, applications: apps };
    return {
      found: true,
      nama: supabase.toText(supabase.pick(row, ['nama_lengkap', 'nama'])),
      gender: supabase.toText(supabase.pick(row, ['gender', 'jenis_kelamin'])),
      usia: supabase.toText(supabase.pick(row, ['usia', 'umur'])),
      tb: supabase.toText(supabase.pick(row, ['tb'])),
      bb: supabase.toText(supabase.pick(row, ['bb'])),
      pasPhoto: supabase.toText(supabase.pick(row, ['pas_photo', 'pasPhoto', 'photo'])) || '-',
      photoUrl: supabase.toText(supabase.pick(row, ['pas_photo', 'pasPhoto', 'photo'])) || '-',
      jftUrl: supabase.toText(supabase.pick(row, ['jft', 'jft_url'])) || '-',
      sswUrl: supabase.toText(supabase.pick(row, ['ssw', 'ssw_url'])) || '-',
      applications: apps,
    };
  } catch (e) {
    return { found: false, applications: [] };
  }
}

// isJobRequiresCv([code]) — dipakai apply-full.html via api-client.
async function handleIsJobRequiresCv(payload) {
  const code = String((payload && payload[0]) || '');
  try {
    // Jalur cepat: cari baris job via query server-side (filter code_job).
    let job = await supabase.findJobByCodeFiltered(code);
    if (job === undefined) {
      const found = await supabase.findJobs();
      job =
        found.rows.find((r) => String(supabase.pick(r, ['code_job', 'code']) || '') === code) ||
        null;
    }
    if (!job) return { success: false, error: 'Kode loker tidak ditemukan.' };
    const share = String(supabase.pick(job, ['dokumen_share', 'format_cv']) || '').toUpperCase();
    return { success: true, requiresCv: share.includes('CV') };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// submitApply([payload]) → simpan/update lamaran di database_asj_form.
async function handleSubmitApply(payload) {
  const d = (payload && payload[0]) || {};
  const wa = supabase.normalizeWa(String(d.wa || ''));
  const code = String(d.job || '').trim();
  if (!wa || !code || !d.nama) return { success: false, message: 'Data lamaran tidak lengkap.' };
  try {
    // Validasi loker & kelengkapan dokumen sesuai model (dokumen_share).
    // Jalur cepat: cari baris job via query server-side (filter code_job).
    let job = await supabase.findJobByCodeFiltered(code);
    if (job === undefined) {
      const found = await supabase.findJobs();
      job =
        found.rows.find((r) => String(supabase.pick(r, ['code_job', 'code']) || '') === code) ||
        null;
    }
    if (!job) return { success: false, message: 'Kode loker tidak ditemukan: ' + code };
    const share = String(supabase.pick(job, ['dokumen_share']) || '')
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    const have = new Set();
    if (d.cvFile || d.oldCv) have.add('CV');
    if (d.jftFile || d.oldJft) have.add('JFT');
    if (d.sswFile || d.oldSsw) have.add('SSW');
    (d.extraFiles || []).forEach((x) => have.add(String((x && x.name) || '').toUpperCase()));
    const missing = share.filter(
      (req) => !have.has(req) && !['CV', 'JFT', 'SSW'].includes(req) && req !== '-',
    );
    const missingCore = share.filter((req) => ['CV', 'JFT', 'SSW'].includes(req) && !have.has(req));
    if (missingCore.length || missing.length) {
      return {
        success: false,
        message: 'Berkas belum lengkap. Harap upload: ' + [...missingCore, ...missing].join(', '),
      };
    }

    // D. kategory otomatis dari bidang loker (kolom kategori/bidang/sektor)
    // kalau form tidak membawa ?bidang= — supaya mail tidak semua tampil
    // "Umum" di panel admin.
    const jobBidang = String(
      supabase.pick(job, ['kategori', 'category', 'bidang', 'sektor']) || '',
    );
    const body = {
      timestamp: new Date().toISOString(),
      code_job: code,
      kategory: String(d.bidang || jobBidang || ''),
      nama_lengkap: String(d.nama || '')
        .trim()
        .toUpperCase(),
      no_wa: wa,
      gender: String(d.gender || ''),
      usia: String(d.usia || ''),
      tb: String(d.tb || ''),
      bb: String(d.bb || ''),
      pas_photo: d.photoFile || d.oldPhoto || '',
      jft: d.jftFile || d.oldJft || '',
      ssw: d.sswFile || d.oldSsw || '',
      file_cv: d.cvFile || d.oldCv || '',
      status: 'MENUNGGU',
      keterangan: (d.extraFiles || [])
        .map((x) => String((x && x.name) || '') + ':' + String((x && x.url) || ''))
        .join(';'),
    };

    // Dedup per (WA + job): job SAMA -> update baris lamaran itu; job BEDA
    // -> buat baris BARU (kandidat boleh melamar banyak loker).
    const existing = await findFormByWaJob(wa, code);
    if (existing && existing.id !== undefined) {
      await supabase.supabaseJson('PATCH', 'database_asj_form', {
        query: { id: 'eq.' + existing.id },
        body,
        headers: { Prefer: 'return=minimal' },
      });
    } else {
      await supabase.supabaseJson('POST', 'database_asj_form', {
        body,
        headers: { Prefer: 'return=minimal' },
      });
    }
    return { success: true, message: 'Lamaran berhasil dikirim.' };
  } catch (e) {
    return { success: false, message: 'Gagal simpan lamaran: ' + e.message };
  }
}

// getExistingCandidateJsonByWa([wa]) — data lengkap pelamar (untuk edit ulang).
// REVIEW M2: tanpa sesi valid → hanya field prefill (NIK, paspor, catatan
// internal, folder, dsb. TIDAK ikut); dengan sesi admin/pemilik WA → penuh.
async function handleGetExistingCandidateJsonByWa(payload, sessionToken) {
  const wa = String((payload && payload[0]) || '');
  try {
    // Jalur cepat: cari baris kandidat via query server-side (filter WA).
    let row = await supabase.findCandidateByWaFiltered(wa);
    if (row === undefined) {
      const found = await supabase.findCandidates();
      const want = supabase.normalizeWa(wa);
      row =
        found.rows.find(
          (r) => supabase.normalizeWa(String(supabase.pick(r, APPLY_WA_COLS) || '')) === want,
        ) || null;
    }
    if (!row) return { success: false, error: 'Kandidat tidak ditemukan.' };
    const data = supabase.mapCandidate(row);
    if (isOwnerOrAdmin(sessionToken, wa)) return { success: true, data };
    return { success: true, data: pickPrefill(data), limited: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}



// ---------------------------------------------------------------------------
// Admin: tambah kandidat manual + upload berkas + revisi
// ---------------------------------------------------------------------------
async function nextCandidateId() {
  // Jalur cepat: id_kandidat tertinggi via query server-side.
  const fastMax = await supabase.maxCandidateIdNumber();
  if (fastMax !== undefined) return 'ASJ' + String(fastMax + 1).padStart(5, '0');
  // Fallback: scan penuh (perilaku lama).
  const found = await supabase.findCandidates();
  let max = 0;
  for (const r of found.rows) {
    const m = String(supabase.pick(r, ['id_kandidat', 'id']) || '').match(/ASJ(\d+)/i);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return 'ASJ' + String(max + 1).padStart(5, '0');
}

const FILE_LABEL_COLUMNS = {
  PAS_PHOTO: { cand: 'pas_photo', master: 'pas_photo', pemberkasan: null },
  CV: { cand: 'file_cv', master: 'file_cv', pemberkasan: null },
  CV_REVISI: { cand: 'file_cv', master: 'file_cv', pemberkasan: null },
  JFT: { cand: 'jft', master: 'jft_url', pemberkasan: null },
  SSW: { cand: 'ssw', master: 'ssw_url', pemberkasan: null },
  KTP: { cand: null, master: 'ktp_url', pemberkasan: 'ktp_url' },
  'KARTU KELUARGA': { cand: null, master: 'kk_url', pemberkasan: 'kk_url' },
  KK: { cand: null, master: 'kk_url', pemberkasan: 'kk_url' },
  'IJAZAH SD': { cand: null, master: 'ijazah_sd_url', pemberkasan: 'sd_url' },
  'IJAZAH SMP': { cand: null, master: 'ijazah_smp_url', pemberkasan: 'smp_url' },
  'IJAZAH SMA': { cand: null, master: 'ijazah_sma_url', pemberkasan: 'sma_url' },
  UNIVERSITAS: { cand: null, master: 'univ_url', pemberkasan: 'univ_url' },
  AKTE: { cand: null, master: null, pemberkasan: 'akte_url' },
  PASPORT: { cand: null, master: null, pemberkasan: 'pasport_url' },
  PASSPORT: { cand: null, master: null, pemberkasan: 'pasport_url' },
  MCU: { cand: null, master: null, pemberkasan: 'mcu_url' },
  KONTRAK: { cand: null, master: null, pemberkasan: 'kontrak_url' },
  SERTIFIKAT: { cand: null, master: null, pemberkasan: 'cert_url' },
  'FOTO 2X3': { cand: null, master: null, pemberkasan: 'foto2_url' },
  'IZIN ORTU': { cand: null, master: null, pemberkasan: 'ijinortu_url' },
  CPMI: { cand: null, master: null, pemberkasan: 'cpmi_url' },
  'BUKU NIKAH': { cand: null, master: null, pemberkasan: 'kawin_url' },
  'SURAT SEHAT': { cand: null, master: null, pemberkasan: 'sehat_url' },
  BPJS: { cand: null, master: null, pemberkasan: 'bpjs_url' },
  PSIKOTES: { cand: null, master: null, pemberkasan: 'psikotes_url' },
};

function fileLabelKey(label) {
  const l = String(label || '')
    .trim()
    .toUpperCase();
  return FILE_LABEL_COLUMNS[l] ? l : null;
}

// simpanKandidatDanUpload([data]) — admin tambah kandidat manual + upload.
async function handleSimpanKandidatDanUpload(payload, sessionToken) {
  const guard = requireRole(sessionToken, 'admin');
  if (guard.error) return guard.error;
  const d = (payload && payload[0]) || {};
  const wa = supabase.normalizeWa(String(d.wa || ''));
  if (!d.nama || !wa) return { success: false, error: 'Nama dan nomor WA wajib diisi.' };
  // Validasi format WA Indonesia: 62 + 10/11 digit (12-13 total). Nomor yang
  // lebih pendek (mis. 62135812198 — kehilangan 1 digit "8") atau lebih panjang
  // jelas salah ketik; menolak di sini mencegah lahirnya kandidat duplikat.
  if (wa.length < 12 || wa.length > 13) {
    return {
      success: false,
      error:
        'Nomor WA tidak valid (' +
        wa +
        '). Harus 62 + 10/11 digit (total 12-13 digit). Periksa nomor kembali.',
    };
  }
  try {
    const nama = String(d.nama).trim().toUpperCase();
    // CEGAH DUPLIKAT: kalau WA sudah punya baris kandidat, perbarui baris itu
    // (id_kandidat, password, tahapan/status tetap) — jangan membuat baris baru.
    let existing = null;
    try {
      existing = await supabase.findCandidateByWaFiltered(wa);
    } catch {
      /* kolom WA tidak dikenal query filter → fallback scan */
    }
    if (!existing) {
      try {
        const found = await supabase.findCandidates();
        existing =
          found.rows.find(
            (r) =>
              supabase.normalizeWa(
                supabase.pick(r, ['no_wa', 'wa', 'whatsapp', 'telepon', 'phone', 'no_hp']) || '',
              ) === wa,
          ) || null;
      } catch {
        existing = null;
      }
    }
    const idKand = existing
      ? String(supabase.pick(existing, ['id_kandidat', 'id']) || '')
      : await nextCandidateId();
    const folder = 'master/' + nama.replace(/[^A-Z0-9_-]/g, '_');
    const uploaded = [];

    const files = Array.isArray(d.files) ? d.files : [];
    const fileUrls = {};
    for (const f of files) {
      if (!f || !f.data) continue;
      const label = String(f.label || '').toUpperCase();
      const ext =
        String(f.name || 'file')
          .split('.')
          .pop() || 'jpg';
      const url = await uploadBase64(f.data, folder, (label || 'FILE') + '.' + ext);
      if (url) {
        fileUrls[label] = url;
        uploaded.push(label);
      }
    }

    const now = new Date().toISOString();
    const pass = wa.slice(-4);
    const hash = bcrypt.hashSync(pass, 10);
    const candBody = {
      id_kandidat: idKand,
      nama_lengkap: nama,
      gender: String(d.gender || ''),
      usia: String(d.usia || ''),
      tb: String(d.tb || ''),
      bb: String(d.bb || ''),
      pendidikan: String(d.pendidikan || ''),
      no_wa: wa,
      id_loker_pilihan: String(d.loker || ''),
      tahapan_seleksi: 'LIST',
      status_kandidat: '',
      tanggal_daftar: now,
      pas_photo: fileUrls.PAS_PHOTO || '',
      jft: fileUrls.JFT || '',
      ssw: fileUrls.SSW || '',
      file_cv: fileUrls.CV || '',
      password_kandidat: hash,
      password_diubah: false,
      created_at: now,
      updated_at: now,
    };
    const masterBody = {
      id_kandidat: idKand,
      nama_lengkap: nama,
      gender: candBody.gender,
      usia: candBody.usia,
      tb: candBody.tb,
      bb: candBody.bb,
      no_wa: wa,
      pas_photo: candBody.pas_photo,
      jft_url: fileUrls.JFT || '',
      ssw_url: fileUrls.SSW || '',
      file_cv: fileUrls.CV || '',
    };
    const formBody = {
      timestamp: now,
      code_job: String(d.loker || ''),
      nama_lengkap: nama,
      no_wa: wa,
      gender: candBody.gender,
      usia: candBody.usia,
      tb: candBody.tb,
      bb: candBody.bb,
      pas_photo: candBody.pas_photo,
      jft: fileUrls.JFT || '',
      ssw: fileUrls.SSW || '',
      file_cv: fileUrls.CV || '',
      status: 'MENUNGGU',
    };

    if (existing && existing.id !== undefined) {
      // Update baris kandidat yang sudah ada: hanya data profil + dokumen.
      // Password, tanggal daftar, tahapan/status, id_kandidat TIDAK diubah.
      const upd = Object.assign({}, candBody);
      delete upd.id_kandidat;
      delete upd.password_kandidat;
      delete upd.password_diubah;
      delete upd.tanggal_daftar;
      delete upd.tahapan_seleksi;
      delete upd.status_kandidat;
      delete upd.created_at;
      await supabase.supabaseJson('PATCH', 'database_candidate', {
        query: { id: 'eq.' + existing.id },
        body: upd,
        headers: { Prefer: 'return=minimal' },
      });
    } else {
      await supabase.supabaseJson('POST', 'database_candidate', {
        body: candBody,
        headers: { Prefer: 'return=minimal' },
      });
    }
    // Master & mail: upsert per WA (jangan menumpuk baris duplikat).
    const mRow = await findMasterByWa(wa);
    if (mRow && mRow.id !== undefined) {
      await supabase.supabaseJson('PATCH', 'master_database_candidate', {
        query: { id: 'eq.' + mRow.id },
        body: Object.assign({}, masterBody, { updated_at: now }),
        headers: { Prefer: 'return=minimal' },
      });
    } else {
      await supabase.supabaseJson('POST', 'master_database_candidate', {
        body: Object.assign({ created_at: now, updated_at: now }, masterBody),
        headers: { Prefer: 'return=minimal' },
      });
    }
    const fRow = await findFormByWa(wa);
    if (fRow && fRow.id !== undefined) {
      await supabase.supabaseJson('PATCH', 'database_asj_form', {
        query: { id: 'eq.' + fRow.id },
        body: Object.assign({}, formBody, { updated_at: now }),
        headers: { Prefer: 'return=minimal' },
      });
    } else {
      await supabase.supabaseJson('POST', 'database_asj_form', {
        body: Object.assign({ created_at: now, updated_at: now }, formBody),
        headers: { Prefer: 'return=minimal' },
      });
    }
    return { success: true, uploaded };
  } catch (e) {
    return { success: false, error: 'Gagal simpan kandidat: ' + e.message };
  }
}

// ---------------------------------------------------------------------------
// MAIL = UPLOAD-DRIVEN (kebijakan). Hanya perubahan dokumen/upload yang masuk
// mail inbox (database_asj_form). Update data lain (status kandidat, CV mini,
// CV AI, auto approve) TIDAK menyentuh mail.
// ---------------------------------------------------------------------------
// Sinkronkan/muat baris mail kandidat dengan satu upload dokumen terbaru.
// - Target baris: CV = dokumen PER LOKER → hanya baris lamaran itu (fallback
//   WA saja); dokumen lain (KTP/KK/foto/JFT/SSW/dll) = dokumen KANDIDAT →
//   SEMUA lamaran WA ikut ter-update (dulu hanya baris pertama).
// - Status: lamaran masih MENUNGGU → tetap MENUNGGU; yang sudah pernah
//   diproses admin (LULUS/GAGAL/REVIEW) → UPDATE (progres TIDAK di-reset,
//   admin melihat badge UPDATE "kandidat ubah data").
// - Keterangan = daftar dokumen "NAMA:URL;..." (mail menampilkan SEMUA
//   dokumen + preview); feedback_berkas = catatan aktivitas terakhir
//   ("[UPLOAD KTP]") supaya admin tahu apa yang baru di-upload.
async function syncFormMailDariUpload(wa, nama, docLabel, url, jobCode) {
  const want = supabase.normalizeWa(wa);
  // Jalur cepat: tarik hanya lamaran WA ini, bukan scan 500 baris inbox.
  let rows = await supabase.findFormsByWa(wa);
  if (rows === undefined) {
    rows = await supabase.supabaseJson('GET', 'database_asj_form', {
      query: { select: '*', limit: 500 },
    });
  }
  const all = Array.isArray(rows) ? rows : [];
  const label = String(docLabel || 'DOKUMEN')
    .trim()
    .toUpperCase();
  const code = String(jobCode || '').trim();

  let targets = [];
  if (label === 'CV' || label === 'CV_REVISI') {
    if (code) {
      targets = all.filter(
        (r) =>
          supabase.normalizeWa(String(r.no_wa || r.wa || '')) === want &&
          String(r.code_job || '').trim() === code,
      );
    }
    if (!targets.length) {
      targets = all.filter((r) => supabase.normalizeWa(String(r.no_wa || r.wa || '')) === want);
    }
  } else {
    targets = all.filter((r) => supabase.normalizeWa(String(r.no_wa || r.wa || '')) === want);
  }
  if (!targets.length) targets = [null];

  for (const existing of targets) {
    // Baca dokumen lama dari keterangan baris ini, lalu gabung dengan yang baru.
    const docs = {};
    const raw = String((existing && existing.keterangan) || '');
    raw.split(';').forEach((chunk) => {
      const i = chunk.indexOf(':');
      if (i > 0) docs[chunk.slice(0, i).trim().toUpperCase()] = chunk.slice(i + 1).trim();
    });
    docs[label] = String(url || '');
    // [[PREV:xxx]] = status sebelum UPDATE (dipulihkan tombol Tandai Dibaca).
    const nextStatus = mailStatusUntukUpdate(existing && existing.status);
    const entry =
      (nextStatus === 'UPDATE' && existing && existing.status
        ? '[[PREV:' + String(existing.status).toUpperCase() + ']] '
        : '') +
      '[UPLOAD ' +
      label +
      ']';
    const keterangan = Object.entries(docs)
      .filter(([, v]) => v)
      .map(([k, v]) => k + ':' + v)
      .join(';');
    const body = {
      timestamp: new Date().toISOString(),
      code_job: String((existing && existing.code_job) || code || ''),
      nama_lengkap: String(nama || (existing && existing.nama_lengkap) || 'KANDIDAT').toUpperCase(),
      no_wa: want,
      keterangan,
      status: nextStatus,
      feedback_berkas: appendFeedback(existing && existing.feedback_berkas, entry),
      updated_at: new Date().toISOString(),
    };
    // Kolom utama kalau jenis dokumennya dikenali (foto/CV/JFT/SSW).
    if (label === 'PAS_PHOTO' || label === 'PHOTO') body.pas_photo = String(url || '');
    if (label === 'CV' || label === 'CV_REVISI') body.file_cv = String(url || '');
    if (label === 'JFT') body.jft = String(url || '');
    if (label === 'SSW') body.ssw = String(url || '');
    if (existing && existing.id !== undefined) {
      await supabase.supabaseJson('PATCH', 'database_asj_form', {
        query: { id: 'eq.' + existing.id },
        body,
        headers: { Prefer: 'return=minimal' },
      });
    } else {
      await supabase.supabaseJson('POST', 'database_asj_form', {
        body,
        headers: { Prefer: 'return=minimal' },
      });
    }
  }
}

// simpanBerkasTahapan([{wa, nama, jenisBerkas, file}]) — upload dokumen
// pemberkasan / file utama kandidat. Dipakai admin (modal edit/pemberkasan)
// DAN kandidat (upload berkas sendiri dari dashboard).
// ---------------------------------------------------------------------------
async function handleSimpanBerkasTahapan(payload, sessionToken) {
  const d = (payload && payload[0]) || {};
  const t = session.verifyToken(sessionToken);
  if (!t || (t.role !== 'admin' && t.role !== 'kandidat')) {
    return { success: false, sessionInvalid: true, message: 'Sesi tidak valid' };
  }
  if (t.role === 'kandidat') {
    const dWa = supabase.normalizeWa(String(d.wa || ''));
    if (dWa && supabase.normalizeWa(String(t.wa || '')) !== dWa) {
      return { success: false, error: 'Nomor WA tidak sesuai sesi.' };
    }
  }
  const wa = supabase.normalizeWa(String(d.wa || ''));
  const jenis = String(d.jenisBerkas || '')
    .trim()
    .toUpperCase();
  const f = d.file || {};
  if (!wa || !f.data) return { success: false, error: 'Data tidak lengkap.' };
  try {
    const nama = String(d.nama || 'KANDIDAT')
      .trim()
      .toUpperCase();
    const folder = 'master/' + nama.replace(/[^A-Z0-9_-]/g, '_');
    const ext =
      String(f.name || 'file')
        .split('.')
        .pop() || 'jpg';

    // CV per loker: nama file memakai kode job utama kandidat (konvensi sama
    // dengan apply-full: JOB<code>_CV) supaya CV loker lama & baru tersimpan
    // berdampingan di folder master/<NAMA> dan tidak saling menimpa.
    let fileName = (jenis || 'DOKUMEN') + '.' + ext;
    const isCv = jenis === 'CV' || jenis === 'CV_REVISI';
    let candRow = null;
    const want = supabase.normalizeWa(wa);
    try {
      // Jalur cepat: cari baris kandidat via query server-side (filter WA).
      candRow = await supabase.findCandidateByWaFiltered(wa);
      if (candRow === undefined) {
        const candFound = await supabase.findCandidates();
        candRow =
          candFound.rows.find(
            (r) => supabase.normalizeWa(String(supabase.pick(r, APPLY_WA_COLS) || '')) === want,
          ) || null;
      }
    } catch (e) {
      /* lookup kandidat non-fatal */
    }
    if (isCv && candRow) {
      const jobCode = String(supabase.pick(candRow, ['id_loker_pilihan', 'id_loker']) || '')
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9_-]/g, '_');
      if (jobCode) fileName = 'JOB' + jobCode + '_CV.' + ext;
    }
    const url = await uploadBase64(f.data, folder, fileName);
    if (!url) return { success: false, error: 'Upload gagal.' };

    // MAIL = upload-driven: upload berkas → masuk mail inbox (untuk review),
    // menampilkan dokumen yang di-upload beserta preview-nya. Baris dipilih
    // per (WA + loker utama kandidat) untuk CV; dokumen lain ikut ke semua
    // lamaran — multi-apply tidak salah baris.
    try {
      await syncFormMailDariUpload(
        wa,
        nama,
        jenis,
        url,
        candRow ? String(supabase.pick(candRow, ['id_loker_pilihan', 'id_loker']) || '') : '',
      );
    } catch (e) {
      /* sinkronisasi mail opsional — jangan gagalkan upload */
    }

    const labelKey = fileLabelKey(jenis);
    const map = labelKey ? FILE_LABEL_COLUMNS[labelKey] : null;
    if (map) {
      const c = candRow;
      if (c && c.id !== undefined && map.cand) {
        await supabase.supabaseJson('PATCH', 'database_candidate', {
          query: { id: 'eq.' + c.id },
          body: { [map.cand]: url },
          headers: { Prefer: 'return=minimal' },
        });
      }
      const m = await findMasterByWa(wa);
      if (m && m.id !== undefined && map.master) {
        await supabase.supabaseJson('PATCH', 'master_database_candidate', {
          query: { id: 'eq.' + m.id },
          body: { [map.master]: url },
          headers: { Prefer: 'return=minimal' },
        });
      }
      if (map.pemberkasan) {
        // UPSERT by (wa, tahap): kandidat meng-upload KTP & KK secara PARALEL
        // (Promise.allSettled di frontend) — GET-then-POST bikin dua baris.
        // Konflik unik (wa,tahap) di-resolve di sisi DB, jadi selalu 1 baris.
        await supabase.supabaseJson('POST', 'pemberkasan_checklist', {
          query: { on_conflict: 'wa,tahap' },
          body: {
            wa: wa,
            nama_lengkap: nama,
            tahap: 1,
            updated_at: new Date().toISOString(),
            [map.pemberkasan]: url,
          },
          headers: { Prefer: 'return=minimal,resolution=merge-duplicates' },
        });
      }
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: 'Gagal simpan berkas: ' + e.message };
  }
}

// simpanRevisiKandidat([wa, fileData]) — kandidat upload CV revisi.
async function handleSimpanRevisiKandidat(payload, sessionToken) {
  const guard = requireRole(sessionToken, 'kandidat');
  if (guard.error) return guard.error;
  const wa = String((payload && payload[0]) || '');
  const f = (payload && payload[1]) || {};
  if (!wa || !f.data) return { success: false, error: 'Data tidak lengkap.' };
  try {
    const row = await findMasterByWa(wa);
    const nama = row && row.nama_lengkap ? String(row.nama_lengkap).toUpperCase() : 'KANDIDAT';
    const folder = 'master/' + nama.replace(/[^A-Z0-9_-]/g, '_');
    const ext =
      String(f.name || 'file')
        .split('.')
        .pop() || 'jpg';
    // CV revisi juga memakai prefix loker utama (konvensi JOB<code>_CV) supaya
    // versi CV per loker tetap utuh di folder kandidat.
    let fileName = 'CV_REVISI.' + ext;
    let cvJobCode = '';
    try {
      // Jalur cepat: cari baris kandidat via query server-side (filter WA).
      let candRow = await supabase.findCandidateByWaFiltered(wa);
      if (candRow === undefined) {
        const candFound = await supabase.findCandidates();
        const want = supabase.normalizeWa(wa);
        candRow =
          candFound.rows.find(
            (r) => supabase.normalizeWa(String(supabase.pick(r, APPLY_WA_COLS) || '')) === want,
          ) || null;
      }
      if (candRow) {
        const jobCode = String(supabase.pick(candRow, ['id_loker_pilihan', 'id_loker']) || '')
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9_-]/g, '_');
        if (jobCode) fileName = 'JOB' + jobCode + '_CV.' + ext;
        cvJobCode = jobCode;
      }
    } catch (e) {
      /* lookup kandidat non-fatal */
    }
    const url = await uploadBase64(f.data, folder, fileName);
    // Upload CV revisi juga masuk mail (dokumen pendukung) — per loker.
    try {
      await syncFormMailDariUpload(wa, nama, 'CV', url, cvJobCode);
    } catch (e) {
      /* opsional */
    }
    // Jalur cepat: cari baris kandidat via query server-side (filter WA).
    let c = await supabase.findCandidateByWaFiltered(wa);
    if (c === undefined) {
      const candFound = await supabase.findCandidates();
      const want = supabase.normalizeWa(wa);
      c =
        candFound.rows.find(
          (r) => supabase.normalizeWa(String(supabase.pick(r, APPLY_WA_COLS) || '')) === want,
        ) || null;
    }
    if (c && c.id !== undefined) {
      await supabase.supabaseJson('PATCH', 'database_candidate', {
        query: { id: 'eq.' + c.id },
        body: { file_cv: url },
        headers: { Prefer: 'return=minimal' },
      });
    }
    if (row && row.id !== undefined) {
      await supabase.supabaseJson('PATCH', 'master_database_candidate', {
        query: { id: 'eq.' + row.id },
        body: { file_cv: url },
        headers: { Prefer: 'return=minimal' },
      });
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: 'Gagal upload revisi: ' + e.message };
  }
}

// Ekspor semua handler (fungsi deklarasi hoisted — letaknya boleh di tengah).
module.exports = {
  // Helper murni diekspor untuk unit test (pencocokan varian upload).
  isVarianOf,
  stemAliases,
  handleGetUploadUrls,
  handleCekDataPelamar,
  handleIsJobRequiresCv,
  handleSubmitApply,
  handleGetExistingCandidateJsonByWa,
          handleSimpanKandidatDanUpload,
  handleSimpanBerkasTahapan,
  handleSimpanRevisiKandidat,
                              handleGetDriveLinkCandidates,
  handleUploadDriveReplacement,
  handleRunMigration,
};

// ---------------------------------------------------------------------------
// Drive links & migrasi
// ---------------------------------------------------------------------------
async function handleGetDriveLinkCandidates(payload, sessionToken) {
  const guard = requireRole(sessionToken, 'admin');
  if (guard.error) return guard.error;
  try {
    const found = await supabase.findCandidates();
    const data = found.rows
      .filter((r) =>
        /drive\.google/i.test(
          String(supabase.pick(r, ['folder_url', 'folderUrl', 'folder_id']) || ''),
        ),
      )
      .map(supabase.mapCandidate);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function handleUploadDriveReplacement(payload, sessionToken) {
  const guard = requireRole(sessionToken, 'admin');
  if (guard.error) return guard.error;
  const d = (payload && payload[0]) || {};
  const idKand = String(d.idKandidat || '');
  const label = String(d.label || '')
    .trim()
    .toUpperCase();
  const f = d.fileData || {};
  if (!idKand || !f.data) return { success: false, error: 'Data tidak lengkap.' };
  try {
    const nama = String(d.nama || 'KANDIDAT').toUpperCase();
    const folder = 'master/' + nama.replace(/[^A-Z0-9_-]/g, '_');
    const ext =
      String(f.name || 'file')
        .split('.')
        .pop() || 'jpg';
    const url = await uploadBase64(f.data, folder, (label || 'FILE') + '.' + ext);
    const labelKey = fileLabelKey(label);
    const map = labelKey ? FILE_LABEL_COLUMNS[labelKey] : null;
    // Jalur cepat: cari baris kandidat via query server-side (filter id_kandidat).
    let c = await supabase.findCandidateByIdFiltered(idKand);
    if (c === undefined) {
      const found = await supabase.findCandidates();
      c =
        found.rows.find((r) => String(supabase.pick(r, ['id_kandidat', 'id']) || '') === idKand) ||
        null;
    }
    if (c && c.id !== undefined && map && map.cand) {
      await supabase.supabaseJson('PATCH', 'database_candidate', {
        query: { id: 'eq.' + c.id },
        body: { [map.cand]: url },
        headers: { Prefer: 'return=minimal' },
      });
    }
    const m = await findMasterByWa(String(c && c.no_wa ? c.no_wa : ''));
    if (m && m.id !== undefined && map && map.master) {
      await supabase.supabaseJson('PATCH', 'master_database_candidate', {
        query: { id: 'eq.' + m.id },
        body: { [map.master]: url },
        headers: { Prefer: 'return=minimal' },
      });
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function handleRunMigration(payload, sessionToken) {
  const guard = requireRole(sessionToken, 'admin');
  if (guard.error) return guard.error;
  try {
    const rows = await supabase.supabaseJson('GET', 'meta_rev', {
      query: { select: '*', limit: 10 },
    });
    const cur =
      (Array.isArray(rows) ? rows : []).find((r) => String(r.domain || '') === 'migration') || null;
    await supabase.supabaseJson('POST', 'meta_rev', {
      body: {
        domain: 'migration',
        rev: cur ? Number(cur.rev || 0) + 1 : 1,
        updated_at: new Date().toISOString(),
      },
      headers: { Prefer: 'return=minimal' },
    });
    return { success: true, results: [{ id: 'migration', status: 'OK' }], pendingSql: [] };
  } catch (e) {
    return { success: false, error: e.message, results: [], pendingSql: [] };
  }
}

// __PART3__
