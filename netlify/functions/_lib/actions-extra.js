// actions-extra.js — handler backend rebuild untuk action yang belum ada di
// handlers.js. Semua aksi ini membaca/menulis Supabase asli (skema sudah
// diintrospeksi) dan mengikuti kontrak payload/respons frontend (lihat
// master-full.html, apply-full.html, ai_form.html, js/07_api.js, dll).
'use strict';

const bcrypt = require('bcryptjs');
const supabase = require('./supabase');
const session = require('./session');
const { env } = require('./env');

// ---------------------------------------------------------------------------
// Helper dasar
// ---------------------------------------------------------------------------
function requireRole(sessionToken, role) {
  const t = session.verifyToken(sessionToken);
  if (!t || t.role !== role) {
    return {
      error: { success: false, sessionInvalid: true, message: 'Sesi ' + role + ' tidak valid' },
    };
  }
  return { token: t };
}

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
function isOwnerOrAdmin(sessionToken, wa) {
  const t = session.verifyToken(sessionToken);
  if (!t) return false;
  if (t.role === 'admin') return true;
  if (t.role === 'kandidat' && supabase.normalizeWa(t.wa || '') === supabase.normalizeWa(wa)) {
    return true;
  }
  return false;
}

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
// plus alias-nya). Dipanggil SEBELUM upload supaya selalu menimpa file lama.
// Catatan API: object/list mengembalikan nama RELATIF terhadap prefix, jadi
// filter + delete harus pakai path lengkap (folder + "/" + nama).
async function hapusJenisVarian(folder, stem) {
  const f = String(folder).replace(/^\/+|\/+$/g, '');
  const stems = [String(stem || '')].concat(stemAliases(stem));
  try {
    const list = await storageRequest('POST', 'object/list/' + bucket(), {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix: f + '/', limit: 300, offset: 0 }),
    });
    const items = Array.isArray(list) ? list : [];
    const victims = items
      .map((o) => (o && o.name ? String(o.name) : ''))
      .filter((n) => n && stems.some((s) => n.startsWith(s + '.')));
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
  const rows = await supabase.findForms();
  return rows.find((r) => supabase.normalizeWa(String(r.no_wa || r.wa || '')) === want) || null;
}

// cekDataPelamar([wa]) → { found, nama, gender, usia, tb, bb, pasPhoto, jftUrl, sswUrl }
async function handleCekDataPelamar(payload) {
  const wa = String((payload && payload[0]) || '');
  if (!wa) return { found: false };
  try {
    const row = await findFormByWa(wa);
    if (!row) return { found: false };
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
    };
  } catch (e) {
    return { found: false };
  }
}

// isJobRequiresCv([code]) — dipakai apply-full.html via api-client.
async function handleIsJobRequiresCv(payload) {
  const code = String((payload && payload[0]) || '');
  try {
    const found = await supabase.findJobs();
    const job = found.rows.find(
      (r) => String(supabase.pick(r, ['code_job', 'code']) || '') === code,
    );
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
    const found = await supabase.findJobs();
    const job = found.rows.find(
      (r) => String(supabase.pick(r, ['code_job', 'code']) || '') === code,
    );
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

    const body = {
      timestamp: new Date().toISOString(),
      code_job: code,
      kategory: String(d.bidang || ''),
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

    const existing = await findFormByWa(wa);
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
    const found = await supabase.findCandidates();
    const want = supabase.normalizeWa(wa);
    const row = found.rows.find(
      (r) => supabase.normalizeWa(String(supabase.pick(r, APPLY_WA_COLS) || '')) === want,
    );
    if (!row) return { success: false, error: 'Kandidat tidak ditemukan.' };
    const data = supabase.mapCandidate(row);
    if (isOwnerOrAdmin(sessionToken, wa)) return { success: true, data };
    return { success: true, data: pickPrefill(data), limited: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ---------------------------------------------------------------------------
// Master data (master-full.html + preview CV)
// ---------------------------------------------------------------------------
// Mapping kolom master_database_candidate (hasil introspeksi skema asli).
const MASTER_FILE_COLUMNS = {
  photoFile: 'pas_photo',
  jftFile: 'jft_url',
  sswFile: 'ssw_url',
  ijazahSdFile: 'ijazah_sd_url',
  ijazahSmpFile: 'ijazah_smp_url',
  ijazahSmaFile: 'ijazah_sma_url',
  univFile: 'univ_url',
  ktpFile: 'ktp_url',
  kkFile: 'kk_url',
  cvFile: 'file_cv',
};

const MASTER_COLUMN_MAP = {
  nama: 'nama_lengkap',
  furigana: 'furigana',
  panggilan: 'namapanggilan',
  panggilanKatakana: 'panggilan_katakana',
  gender: 'gender',
  tempatLahir: 'tempat_lahir',
  tglLahir: 'tgl_lahir',
  usia: 'usia',
  agama: 'agama',
  statusNikah: 'status_pernikahan',
  anak: 'jumlah_anak',
  ktp: 'nik',
  sim: 'driver_license',
  alamat: 'alamat_lengkap',
  email: 'email',
  tb: 'tb',
  bb: 'bb',
  goldar: 'golongan_darah',
  tangan: 'tangandominan',
  baju: 'ukuranbaju',
  sepatu: 'ukuransepatu',
  topi: 'ukuran_topi',
  tahanAc: 'tahan_ac',
  mataKiri: 'mata_kiri',
  mataKanan: 'mata_kanan',
  kacamata: 'kacamata',
  butaWarna: 'buta_warna',
  tato: 'tato',
  tindik: 'tindik',
  merokok: 'merokok',
  alkohol: 'minum_alkohol',
  penyakit: 'riwayat_penyakit',
  alergi: 'alergi',
  laka: 'riwayat_kecelakaan',
  promosi: 'promosi_diri',
  kelebihan: 'kelebihan',
  kekurangan: 'kekurangan',
  keahlianKhusus: 'keahlian_khusus',
  hobi: 'hobi_dan_keterampilan',
  alasanBidang: 'alasan_memilih_bidang',
  motivasiJepang: 'motivasi_ke_jepang',
  keinginan: 'keinginan_pribadi',
  rencanaPulang: 'rencana_setelah_pulang',
  tujuanJepang: 'tujuan_ke_jepang',
  eksJepang: 'status_eks_jepang',
  daruratNama: 'kontak_darurat_nama',
  daruratHubungan: 'kontak_darurat_hubungan',
  daruratWa: 'kontak_darurat_wa',
  kenalanNama: 'kenalan_di_jepang_nama',
  kenalanHubungan: 'kenalan_di_jepang_hubungan',
  kenalanPekerjaan: 'kenalan_di_jepang_pekerjaan',
  kenalanUsia: 'kenalan_di_jepang_usia',
  kenalanAlamat: 'kenalan_di_jepang_alamat',
  lamaJepang: 'status_eks_jepang',
  gajiYen: 'harapan_gaji_yen',
  tabungan: 'harapan_tabungan',
  bhsJepang: 'bahasa',
  nilai: 'jft',
  lisensi: 'bidangssw',
  ssw: 'ssw',
  noPaspor: 'no_paspor',
  tglTerbitPaspor: 'tgl_terbit_pasport',
  expPaspor: 'exp_pasport',
  kotaPaspor: 'kota_terbit_pasport',
  noCoe: 'no_coe',
};

async function findMasterByWa(wa) {
  const want = supabase.normalizeWa(wa);
  const rows = await supabase.supabaseJson('GET', 'master_database_candidate', {
    query: { select: '*', limit: 500 },
  });
  if (!Array.isArray(rows)) return null;
  return rows.find((r) => supabase.normalizeWa(String(r.no_wa || '')) === want) || null;
}

// Buat objek nested (identitas/fisik/medis/...) dari baris master untuk
// getDrafCvMaster & CV builder.
function buildMasterNested(row) {
  const v = (col, fallback) => {
    const x = row[col];
    return x !== undefined && x !== null && x !== ''
      ? supabase.toText(x)
      : fallback !== undefined
        ? fallback
        : '';
  };
  return {
    identitas: {
      nama_lengkap: v('nama_lengkap'),
      katakana: v('furigana'),
      panggilan: v('namapanggilan'),
      panggilan_katakana: v('panggilan_katakana'),
      tempat_lahir: v('tempat_lahir'),
      tempat_lahir_jp: v('tempatlahirjp'),
      tgl_lahir: v('tgl_lahir'),
      umur: v('usia'),
      gender: v('gender'),
      agama: v('agama'),
      agamajp: v('agamajp'),
      golongan_darah: v('golongan_darah'),
      status_nikah: v('status_pernikahan'),
      statusnikahjp: v('statusnikahjp'),
      anak: v('jumlah_anak'),
      email: v('email'),
      alamat: v('alamat_lengkap'),
      alamatjp: v('alamatjp'),
      hp: v('no_wa'),
      hp_darurat: v('kontak_darurat_wa'),
      ktp: v('nik'),
      paspor: v('no_paspor'),
      sim: v('driver_license'),
      status_eks_jepang: v('status_eks_jepang'),
    },
    fisik: {
      tb: v('tb'),
      bb: v('bb'),
      topi: v('ukuran_topi'),
      baju: v('ukuranbaju'),
      sepatu: v('ukuransepatu'),
      tangan_dominan: v('tangandominan'),
      tahan_ac: v('tahan_ac'),
    },
    medis: {
      mata_kiri: v('mata_kiri'),
      mata_kanan: v('mata_kanan'),
      kacamata: v('kacamata'),
      buta_warna: v('buta_warna'),
      tato: v('tato'),
      tindik: v('tindik'),
      rokok: v('merokok'),
      alkohol: v('minum_alkohol'),
      alergi_id: v('alergi'),
      alergi_jp: v('alergijp'),
      riwayat_medis_id: v('riwayat_penyakit'),
      riwayat_medis_jp: v('riwayat_medis_jp'),
      riwayat_kecelakaan_id: v('riwayat_kecelakaan'),
      riwayat_kecelakaan_jp: v('riwayat_kecelakaan_jp'),
    },
    wawancara: {
      keinginan_id: v('keinginan_pribadi'),
      keinginan_jp: v('keinginan_pribadi_jp'),
      tujuan_ke_jepang: v('tujuan_ke_jepang'),
      tujuan_ke_jepang_jp: v('tujuan_ke_jepang_jp'),
      riwayat_jepang: v('status_eks_jepang'),
      promosi_id: v('promosi_diri'),
      promosi_jp: v('promosi_diri_jp'),
      kelebihan_id: v('kelebihan'),
      kelebihan_jp: v('kelebihan_jp'),
      kekurangan_id: v('kekurangan'),
      kekurangan_jp: v('kekurangan_jp'),
      hobi_id: v('hobi_dan_keterampilan'),
      hobi_jp: v('hobi_jp'),
      keahlian_khusus: v('keahlian_khusus'),
      keahlian_khusus_jp: v('keahlian_khusus_jp'),
      motivasi_ke_jepang: v('motivasi_ke_jepang'),
      motivasi_ke_jepang_jp: v('motivasi_ke_jepang_jp'),
      alasan_memilih_bidang: v('alasan_memilih_bidang'),
      alasan_memilih_bidang_jp: v('alasan_memilih_bidang_jp'),
      rencana_setelah_pulang: v('rencana_setelah_pulang'),
      rencana_setelah_pulang_jp: v('rencana_setelah_pulang_jp'),
      // Alias yang dibaca builder CV (10b_cv_builders.js).
      rencana_pulang_id: v('rencana_setelah_pulang'),
      rencana_pulang_jp: v('rencana_setelah_pulang_jp'),
      gaji_yen: v('harapan_gaji_yen'),
      tabungan: v('harapan_tabungan'),
    },
    sertifikasi: {
      bahasa: v('bahasa'),
      jft: v('jft'),
      ssw: v('ssw'),
      bidang: v('bidangssw') || v('bidang'),
      // Alias yang dibaca builder CV (10b_cv_builders.js): JLPT row & Lain-lain row.
      bahasa_jepang: v('jft'),
      nilai: v('jft'),
      lisensi: v('ssw'),
    },
    pendidikan: (function () {
      const arr = [];
      for (let i = 1; i <= 5; i++) {
        const tingkat = row['pendidikan_' + i + '_tingkat'];
        if (tingkat === undefined || tingkat === null) continue;
        // Kunci yang dibaca builder CV: sekolah/masuk/lulus/jurusan_id (nama_sekolah/
        // tahun_masuk/dll dipertahankan sebagai alias untuk kompatibilitas).
        arr.push({
          tingkat: supabase.toText(tingkat),
          sekolah: v('pendidikan_' + i + '_nama_sekolah'),
          nama_sekolah: v('pendidikan_' + i + '_nama_sekolah'),
          sekolah_jp: v('pendidikan_' + i + '_sekolah_jp'),
          jurusan_id: v('pendidikan_' + i + '_jurusan_id'),
          jurusan: v('pendidikan_' + i + '_jurusan_id'),
          jurusan_jp: v('pendidikan_' + i + '_jurusan_jp'),
          masuk: v('pendidikan_' + i + '_tahun_masuk'),
          tahun_masuk: v('pendidikan_' + i + '_tahun_masuk'),
          lulus: v('pendidikan_' + i + '_tahun_lulus'),
          tahun_lulus: v('pendidikan_' + i + '_tahun_lulus'),
        });
      }
      return arr;
    })(),
    pekerjaan: (function () {
      const arr = [];
      for (let i = 1; i <= 3; i++) {
        const nm = row['pekerjaan_' + i + '_nama_perusahaan'];
        if (nm === undefined || nm === null) continue;
        arr.push({
          perusahaan: supabase.toText(nm),
          nama_perusahaan: supabase.toText(nm),
          perusahaan_jp: v('pekerjaan_' + i + '_perusahaan_jp'),
          jabatan: v('pekerjaan_' + i + '_jabatan'),
          jabatan_jp: v('pekerjaan_' + i + '_jabatan_jp'),
          masuk: v('pekerjaan_' + i + '_tahun_masuk'),
          tahun_masuk: v('pekerjaan_' + i + '_tahun_masuk'),
          keluar: v('pekerjaan_' + i + '_tahun_keluar'),
          tahun_keluar: v('pekerjaan_' + i + '_tahun_keluar'),
          gaji: v('pekerjaan_' + i + '_gaji'),
        });
      }
      return arr;
    })(),
    keluarga: (function () {
      const arr = [];
      for (let i = 1; i <= 5; i++) {
        const nm = row['keluarga_' + i + '_nama'];
        if (nm === undefined || nm === null) continue;
        arr.push({
          nama: supabase.toText(nm),
          umur: v('keluarga_' + i + '_usia'),
          usia: v('keluarga_' + i + '_usia'),
          hubungan: v('keluarga_' + i + '_hubungan'),
          hubungan_jp: v('keluarga_' + i + '_hubungan_jp'),
          pekerjaan: v('keluarga_' + i + '_pekerjaan'),
          pekerjaan_jp: v('keluarga_' + i + '_pekerjaan_jp'),
        });
      }
      return arr;
    })(),
    kenalan_jepang: {
      nama_id: v('kenalan_di_jepang_nama'),
      nama_jp: v('kenalan_di_jepang_nama_jp'),
      hubungan_id: v('kenalan_di_jepang_hubungan'),
      hubungan_jp: v('kenalan_di_jepang_hubungan_jp'),
      pekerjaan_id: v('kenalan_di_jepang_pekerjaan'),
      pekerjaan_jp: v('kenalan_di_jepang_pekerjaan_jp'),
      usia: v('kenalan_di_jepang_usia'),
      alamat_id: v('kenalan_di_jepang_alamat'),
      alamat_jp: v('kenalan_di_jepang_alamat_jp'),
    },
    uploads: {
      photo: row.pas_photo || '',
      cv: row.file_cv || '',
      jft: row.jft_url || '',
      ssw: row.ssw_url || '',
    },
  };
}

// getMasterDataByWa([wa]) → bentuk flat UPPERCASE (format kontrak lama/legacy).
async function handleGetMasterDataByWa(payload, sessionToken) {
  const wa = String((payload && payload[0]) || '');
  const guard = requireRole(sessionToken, 'kandidat');
  if (guard.error) return guard.error;
  if (!wa) return { error: 'Nomor WA wajib diisi.' };
  try {
    const row = await findMasterByWa(wa);
    if (!row) return { error: 'Data Master belum ada. Silakan isi form Master dulu.' };
    const v = (col) => {
      const x = row[col];
      return x !== undefined && x !== null ? supabase.toText(x) : '';
    };
    const out = {
      NAMA_LENGKAP: v('nama_lengkap'),
      FURIGANA: v('furigana'),
      NAMAPANGGILAN: v('namapanggilan'),
      PANGGILAN_KATAKANA: v('panggilan_katakana'),
      TEMPAT_LAHIR: v('tempat_lahir'),
      TGL_LAHIR: v('tgl_lahir'),
      GENDER: v('gender'),
      USIA: v('usia'),
      AGAMA: v('agama'),
      STATUS_PERNIKAHAN: v('status_pernikahan'),
      JUMLAH_ANAK: v('jumlah_anak'),
      NIK: v('nik'),
      DRIVER_LICENSE: v('driver_license'),
      ALAMAT_LENGKAP: v('alamat_lengkap'),
      EMAIL: v('email'),
      TT: v('tb'),
      TB: v('tb'),
      BB: v('bb'),
      GOLONGAN_DARAH: v('golongan_darah'),
      TANGANDOMINAN: v('tangandominan'),
      UKURANBAJU: v('ukuranbaju'),
      UKURANSEPATU: v('ukuransepatu'),
      UKURAN_TOPI: v('ukuran_topi'),
      TAHAN_AC: v('tahan_ac'),
      MATA_KIRI: v('mata_kiri'),
      MATA_KANAN: v('mata_kanan'),
      KACAMATA: v('kacamata'),
      BUTA_WARNA: v('buta_warna'),
      TATO: v('tato'),
      TINDIK: v('tindik'),
      MEROKOK: v('merokok'),
      MINUM_ALKOHOL: v('minum_alkohol'),
      RIWAYAT_PENYAKIT: v('riwayat_penyakit'),
      ALERGI: v('alergi'),
      RIWAYAT_KECELAKAAN: v('riwayat_kecelakaan'),
      LAMA_DI_JEPANG: v('status_eks_jepang'),
      HARAPAN_GAJI_YEN: v('harapan_gaji_yen'),
      HARAPAN_TABUNGAN: v('harapan_tabungan'),
      BAHASA: v('bahasa'),
      JFT: v('jft'),
      SSW: v('ssw'),
      BIDANGSSW: v('bidangssw'),
      PROMOSI_DIRI: v('promosi_diri'),
      KELEBIHAN: v('kelebihan'),
      KEKURANGAN: v('kekurangan'),
      KEAHLIAN_KHUSUS: v('keahlian_khusus'),
      'HOBI_&_KETERAMPILAN': v('hobi_dan_keterampilan'),
      ALASAN_MEMILIH_BIDANG: v('alasan_memilih_bidang'),
      MOTIVASI_KE_JEPANG: v('motivasi_ke_jepang'),
      KEINGINAN_PRIBADI: v('keinginan_pribadi'),
      RENCANA_SETELAH_PULANG: v('rencana_setelah_pulang'),
      TUJUAN_KE_JEPANG: v('tujuan_ke_jepang'),
      STATUS_EKS_JEPANG: v('status_eks_jepang'),
      KONTAK_DARURAT_NAMA: v('kontak_darurat_nama'),
      KONTAK_DARURAT_HUBUNGAN: v('kontak_darurat_hubungan'),
      KONTAK_DARURAT_WA: v('kontak_darurat_wa'),
      KENALAN_DI_JEPANG_NAMA: v('kenalan_di_jepang_nama'),
      KENALAN_DI_JEPANG_HUBUNGAN: v('kenalan_di_jepang_hubungan'),
      KENALAN_DI_JEPANG_PEKERJAAN: v('kenalan_di_jepang_pekerjaan'),
      KENALAN_DI_JEPANG_USIA: v('kenalan_di_jepang_usia'),
      KENALAN_DI_JEPANG_ALAMAT: v('kenalan_di_jepang_alamat'),
      NO_PASPORT: v('no_paspor'),
      TGL_TERBIT_PASPORT: v('tgl_terbit_pasport'),
      EXP_PASPORT: v('exp_pasport'),
      KOTA_TERBIT_PASPORT: v('kota_terbit_pasport'),
      NO_COE: v('no_coe'),
      PAS_PHOTO: v('pas_photo'),
      JFT_URL: v('jft_url'),
      SSW_URL: v('ssw_url'),
      FILE_CV: v('file_cv'),
    };
    for (let i = 1; i <= 5; i++) {
      out['PENDIDIKAN_' + i + '_TINGKAT'] = v('pendidikan_' + i + '_tingkat');
      out['PENDIDIKAN_' + i + '_NAMA_SEKOLAH'] = v('pendidikan_' + i + '_nama_sekolah');
      out['PENDIDIKAN_' + i + '_JURUSAN'] = v('pendidikan_' + i + '_jurusan_id');
      out['PENDIDIKAN_' + i + '_JURUSAN_ID'] = v('pendidikan_' + i + '_jurusan_id');
      out['PENDIDIKAN_' + i + '_TAHUN_MASUK'] = v('pendidikan_' + i + '_tahun_masuk');
      out['PENDIDIKAN_' + i + '_TAHUN_LULUS'] = v('pendidikan_' + i + '_tahun_lulus');
    }
    for (let i = 1; i <= 3; i++) {
      out['PEKERJAAN_' + i + '_NAMA_PERUSAHAAN'] = v('pekerjaan_' + i + '_nama_perusahaan');
      out['PEKERJAAN_' + i + '_JABATAN'] = v('pekerjaan_' + i + '_jabatan');
      out['PEKERJAAN_' + i + '_TAHUN_MASUK'] = v('pekerjaan_' + i + '_tahun_masuk');
      out['PEKERJAAN_' + i + '_TAHUN_KELUAR'] = v('pekerjaan_' + i + '_tahun_keluar');
      out['PEKERJAAN_' + i + '_GAJI'] = v('pekerjaan_' + i + '_gaji');
    }
    for (let i = 1; i <= 5; i++) {
      out['KELUARGA_' + i + '_HUBUNGAN'] = v('keluarga_' + i + '_hubungan');
      out['KELUARGA_' + i + '_NAMA'] = v('keluarga_' + i + '_nama');
      out['KELUARGA_' + i + '_USIA'] = v('keluarga_' + i + '_usia');
      out['KELUARGA_' + i + '_PEKERJAAN'] = v('keluarga_' + i + '_pekerjaan');
      out['KELUARGA_' + i + '_PENDAPATAN'] = '';
    }
    return out;
  } catch (e) {
    return { error: 'Gagal memuat data Master: ' + e.message };
  }
}

// getDrafCvMaster([wa]) → nested + AIDATAJSON + uploads (untuk render CV).
// REVIEW M2: tanpa sesi valid → subset identitas dasar + uploads saja.
async function handleGetDrafCvMaster(payload, sessionToken) {
  const wa = String((payload && payload[0]) || '');
  try {
    const row = await findMasterByWa(wa);
    if (!row) {
      // Kandidat terdaftar di database_candidate tapi belum punya baris di
      // master_database_candidate (profil master belum diisi/di-sync) → beri
      // pesan yang jelas dengan nama + WA, jangan error cryptic.
      let nama = '';
      try {
        const found = await supabase.findCandidates();
        const want = supabase.normalizeWa(wa);
        const c = ((found && found.rows) || []).find(
          (r) => supabase.normalizeWa(String(supabase.pick(r, APPLY_WA_COLS) || '')) === want,
        );
        if (c) nama = String(supabase.pick(c, ['nama_lengkap', 'nama']) || '');
      } catch (e) {
        /* lookup nama gagal — lanjut tanpa nama */
      }
      return {
        error:
          'Data Master belum ada' +
          (nama ? ' untuk ' + nama : '') +
          ' (' +
          wa +
          '). Isi Form Master dulu.',
      };
    }
    const nested = buildMasterNested(row);
    const full = Object.assign(nested, {
      AIDATAJSON: row.ai_data_json || '',
      // Dipakai builder CV untuk nomor rirekisho (buildCvIdentitas → v('id_kandidat')).
      id_kandidat: row.id_kandidat || row.id || '',
    });
    if (isOwnerOrAdmin(sessionToken, wa)) return full;
    // Tanpa sesi valid → jangan bocorkan NIK/alamat/riwayat/medis/dokumen.
    // uploads (URL pas foto/CV/JFT/SSW) juga TIDAK ikut — hanya subset
    // identitas dasar yang aman (REVIEW M2). Satu-satunya konsumen
    // getDrafCvMaster (preview CV admin & dashboard kandidat) berjalan
    // dengan sesi valid, jadi jalur anonim tidak kehilangan fungsionalitas.
    const i = nested.identitas || {};
    return {
      identitas: {
        nama_lengkap: i.nama_lengkap || '',
        katakana: i.katakana || '',
        gender: i.gender || '',
        tempat_lahir: i.tempat_lahir || '',
        tgl_lahir: i.tgl_lahir || '',
        umur: i.umur || '',
      },
      limited: true,
    };
  } catch (e) {
    return { error: e.message };
  }
}

// submitMasterForm([payload]) → simpan/update master_database_candidate.
async function handleSubmitMasterForm(payload, sessionToken) {
  const d = (payload && payload[0]) || {};
  const wa = supabase.normalizeWa(String(d.wa || ''));
  const guard = requireRole(sessionToken, 'kandidat');
  if (guard.error) return guard.error;
  if (!wa) return { success: false, message: 'Nomor WA wajib diisi.' };
  try {
    let row = await findMasterByWa(wa);
    const nama =
      String(d.nama || '')
        .trim()
        .toUpperCase() || 'KANDIDAT';
    const folder = 'master/' + nama.replace(/[^A-Z0-9_-]/g, '_');

    // Upload file base64 (jika ada).
    const fileUrls = {};
    for (const [from, col] of Object.entries(MASTER_FILE_COLUMNS)) {
      if (d[from]) {
        const prefix = from.replace(/File$/, '').toUpperCase();
        const url = await uploadBase64(d[from], folder, prefix + '.jpg');
        if (url) fileUrls[col] = url;
      }
    }

    const body = { no_wa: wa, updated_at: new Date().toISOString() };
    for (const [from, col] of Object.entries(MASTER_COLUMN_MAP)) {
      if (d[from] !== undefined && d[from] !== null && d[from] !== '') body[col] = String(d[from]);
    }
    body.nama_lengkap = nama;
    Object.assign(body, fileUrls);

    // Riwayat pendidikan (max 5), pekerjaan (max 3), keluarga (max 5).
    (Array.isArray(d.pendidikan) ? d.pendidikan : []).slice(0, 5).forEach((p, i) => {
      const n = i + 1;
      if (p.tingkat !== undefined) body['pendidikan_' + n + '_tingkat'] = String(p.tingkat);
      if (p.nama_sekolah !== undefined)
        body['pendidikan_' + n + '_nama_sekolah'] = String(p.nama_sekolah);
      if (p.jurusan !== undefined) body['pendidikan_' + n + '_jurusan_id'] = String(p.jurusan);
    });
    (Array.isArray(d.pekerjaan) ? d.pekerjaan : []).slice(0, 3).forEach((p, i) => {
      const n = i + 1;
      if (p.nama_perusahaan !== undefined)
        body['pekerjaan_' + n + '_nama_perusahaan'] = String(p.nama_perusahaan);
      if (p.jabatan !== undefined) body['pekerjaan_' + n + '_jabatan'] = String(p.jabatan);
      if (p.tahun_masuk !== undefined)
        body['pekerjaan_' + n + '_tahun_masuk'] = String(p.tahun_masuk);
      if (p.tahun_keluar !== undefined)
        body['pekerjaan_' + n + '_tahun_keluar'] = String(p.tahun_keluar);
      if (p.gaji !== undefined) body['pekerjaan_' + n + '_gaji'] = String(p.gaji);
    });
    (Array.isArray(d.keluarga) ? d.keluarga : []).slice(0, 5).forEach((p, i) => {
      const n = i + 1;
      if (p.hubungan !== undefined) body['keluarga_' + n + '_hubungan'] = String(p.hubungan);
      if (p.nama !== undefined) body['keluarga_' + n + '_nama'] = String(p.nama);
      if (p.usia !== undefined) body['keluarga_' + n + '_usia'] = String(p.usia);
      if (p.pekerjaan !== undefined) body['keluarga_' + n + '_pekerjaan'] = String(p.pekerjaan);
    });

    if (row && row.id !== undefined) {
      await supabase.supabaseJson('PATCH', 'master_database_candidate', {
        query: { id: 'eq.' + row.id },
        body,
        headers: { Prefer: 'return=minimal' },
      });
    } else {
      const idKand = await nextCandidateId();
      body.id_kandidat = idKand;
      await supabase.supabaseJson('POST', 'master_database_candidate', {
        body,
        headers: { Prefer: 'return=minimal' },
      });
    }

    // Sinkronisasi ringan ke database_candidate (kolom yang dipakai dashboard).
    try {
      const candFound = await supabase.findCandidates();
      const want = supabase.normalizeWa(wa);
      const c = candFound.rows.find(
        (r) => supabase.normalizeWa(String(supabase.pick(r, APPLY_WA_COLS) || '')) === want,
      );
      const candBody = {
        nama_lengkap: nama,
        gender: body.gender !== undefined ? body.gender : undefined,
        usia: body.usia !== undefined ? body.usia : undefined,
        tb: body.tb !== undefined ? body.tb : undefined,
        bb: body.bb !== undefined ? body.bb : undefined,
        nik: body.nik !== undefined ? body.nik : undefined,
        email: body.email !== undefined ? body.email : undefined,
        tempat_lahir: body.tempat_lahir !== undefined ? body.tempat_lahir : undefined,
        tgl_lahir: body.tgl_lahir !== undefined ? body.tgl_lahir : undefined,
        alamat_lengkap: body.alamat_lengkap !== undefined ? body.alamat_lengkap : undefined,
        pas_photo: fileUrls.pas_photo !== undefined ? fileUrls.pas_photo : undefined,
        jft: fileUrls.jft_url !== undefined ? fileUrls.jft_url : undefined,
        ssw: fileUrls.ssw_url !== undefined ? fileUrls.ssw_url : undefined,
        file_cv: fileUrls.file_cv !== undefined ? fileUrls.file_cv : undefined,
        nilai_jft_text: body.jft !== undefined ? body.jft : undefined,
        bidang_ssw_text: body.bidangssw !== undefined ? body.bidangssw : undefined,
      };
      for (const k of Object.keys(candBody)) if (candBody[k] === undefined) delete candBody[k];
      if (c && c.id !== undefined) {
        await supabase.supabaseJson('PATCH', 'database_candidate', {
          query: { id: 'eq.' + c.id },
          body: candBody,
          headers: { Prefer: 'return=minimal' },
        });
      }
    } catch (e) {
      /* sinkronisasi opsional — jangan gagalkan simpan master */
    }

    return { success: true };
  } catch (e) {
    return { success: false, message: 'Gagal simpan Master: ' + e.message };
  }
}

// simpanUpdateMaster / simpanBiodataLengkap — alias submitMasterForm
// (kontrak sama: payload[0] = data master).
async function handleSimpanUpdateMaster(payload, sessionToken) {
  return handleSubmitMasterForm(payload, sessionToken);
}

// ---------------------------------------------------------------------------
// Admin: tambah kandidat manual + upload berkas + revisi
// ---------------------------------------------------------------------------
async function nextCandidateId() {
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

// simpanBerkasTahapan([{wa, nama, jenisBerkas, file}]) — upload dokumen
// pemberkasan / file utama kandidat. Dipakai admin (modal edit/pemberkasan)
// DAN kandidat (upload berkas sendiri dari dashboard).
// ---------------------------------------------------------------------------
// MAIL = UPLOAD-DRIVEN (kebijakan). Hanya perubahan dokumen/upload yang masuk
// mail inbox (database_asj_form). Update data lain (status kandidat, CV mini,
// CV AI, auto approve) TIDAK menyentuh mail.
// ---------------------------------------------------------------------------
// Sinkronkan/muat baris mail kandidat dengan satu upload dokumen terbaru.
// Keterangan menyimpan daftar dokumen "NAMA:URL;..." — mail menampilkan
// SEMUA dokumen yang sudah di-upload kandidat beserta preview-nya.
async function syncFormMailDariUpload(wa, nama, docLabel, url) {
  const want = supabase.normalizeWa(wa);
  const rows = await supabase.supabaseJson('GET', 'database_asj_form', {
    query: { select: '*', limit: 500 },
  });
  const existing = (Array.isArray(rows) ? rows : []).find(
    (r) => supabase.normalizeWa(String(r.no_wa || r.wa || '')) === want,
  );
  // Baca dokumen lama dari keterangan, lalu gabung dengan yang baru.
  const docs = {};
  const raw = String((existing && existing.keterangan) || '');
  raw.split(';').forEach((chunk) => {
    const i = chunk.indexOf(':');
    if (i > 0) docs[chunk.slice(0, i).trim().toUpperCase()] = chunk.slice(i + 1).trim();
  });
  const label = String(docLabel || 'DOKUMEN')
    .trim()
    .toUpperCase();
  docs[label] = String(url || '');
  const keterangan = Object.entries(docs)
    .filter(([, v]) => v)
    .map(([k, v]) => k + ':' + v)
    .join(';');
  const body = {
    timestamp: new Date().toISOString(),
    code_job: existing && existing.code_job ? String(existing.code_job) : '',
    nama_lengkap: String(nama || (existing && existing.nama_lengkap) || 'KANDIDAT').toUpperCase(),
    no_wa: want,
    keterangan,
    status: 'MENUNGGU',
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
    const url = await uploadBase64(f.data, folder, (jenis || 'DOKUMEN') + '.' + ext);
    if (!url) return { success: false, error: 'Upload gagal.' };

    // MAIL = upload-driven: upload berkas → masuk mail inbox (untuk review),
    // menampilkan dokumen yang di-upload beserta preview-nya.
    try {
      await syncFormMailDariUpload(wa, nama, jenis, url);
    } catch (e) {
      /* sinkronisasi mail opsional — jangan gagalkan upload */
    }

    const labelKey = fileLabelKey(jenis);
    const map = labelKey ? FILE_LABEL_COLUMNS[labelKey] : null;
    if (map) {
      const candFound = await supabase.findCandidates();
      const want = supabase.normalizeWa(wa);
      const c = candFound.rows.find(
        (r) => supabase.normalizeWa(String(supabase.pick(r, APPLY_WA_COLS) || '')) === want,
      );
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
        const pRows = await supabase.supabaseJson('GET', 'pemberkasan_checklist', {
          query: { select: '*', limit: 500 },
        });
        const existing = Array.isArray(pRows)
          ? pRows.find((r) => supabase.normalizeWa(String(r.wa || '')) === want)
          : null;
        const pBody = {
          wa: wa,
          nama_lengkap: nama,
          tahap: 1,
          updated_at: new Date().toISOString(),
          [map.pemberkasan]: url,
        };
        if (existing && existing.id !== undefined) {
          await supabase.supabaseJson('PATCH', 'pemberkasan_checklist', {
            query: { id: 'eq.' + existing.id },
            body: pBody,
            headers: { Prefer: 'return=minimal' },
          });
        } else {
          await supabase.supabaseJson('POST', 'pemberkasan_checklist', {
            body: pBody,
            headers: { Prefer: 'return=minimal' },
          });
        }
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
    const url = await uploadBase64(f.data, folder, 'CV_REVISI.' + ext);
    // Upload CV revisi juga masuk mail (dokumen pendukung).
    try {
      await syncFormMailDariUpload(wa, nama, 'CV', url);
    } catch (e) {
      /* opsional */
    }
    const candFound = await supabase.findCandidates();
    const want = supabase.normalizeWa(wa);
    const c = candFound.rows.find(
      (r) => supabase.normalizeWa(String(supabase.pick(r, APPLY_WA_COLS) || '')) === want,
    );
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
  handleGetUploadUrls,
  handleCekDataPelamar,
  handleIsJobRequiresCv,
  handleSubmitApply,
  handleGetExistingCandidateJsonByWa,
  handleGetMasterDataByWa,
  handleGetDrafCvMaster,
  handleSubmitMasterForm,
  handleSimpanUpdateMaster,
  handleSimpanKandidatDanUpload,
  handleSimpanBerkasTahapan,
  handleSimpanRevisiKandidat,
  handleSimpanJadwalBaru,
  handleHapusJadwal,
  handleTambahTugasBaru,
  handleSetTugasStatus,
  handleHapusTugas,
  handleSimpanWaTemplate,
  handleHapusWaTemplate,
  handleKirimSatuPesanFonnte,
  handleKirimTawaranMassal,
  handleUpdateSysConfig,
  handleGetRincianPresets,
  handleSaveRincianPreset,
  handleDeleteRincianPreset,
  handleGetDaftarSiswaBaru,
  handleSubmitDaftarSiswa,
  handleGetLinkSiswaBaru,
  handleGenerateFormBridge,
  handleGenerateLegacyMasterBridge,
  handleGenerateAiFormBridge,
  handleGetDriveLinkCandidates,
  handleUploadDriveReplacement,
  handleRunMigration,
};

// ---------------------------------------------------------------------------
// Jadwal & tugas (database_schedule / database_tugas)
// ---------------------------------------------------------------------------
async function handleSimpanJadwalBaru(payload, sessionToken) {
  const guard = requireRole(sessionToken, 'admin');
  if (guard.error) return guard.error;
  const d = (payload && payload[0]) || {};
  if (!d.nama) return { success: false, error: 'Nama agenda wajib diisi.' };
  const idJadwal = 'JDW' + Date.now();
  try {
    await supabase.supabaseJson('POST', 'database_schedule', {
      body: {
        id_jadwal: idJadwal,
        nama_agenda: String(d.nama),
        id_loker_terkait: String(d.loker || '-'),
        tanggal_waktu: String(d.waktu || ''),
        lokasi_link: String(d.link || d.lokasi || '-'),
        daftar_kandidat: String(d.kandidat || '-'),
        tsk: String(d.tsk || ''),
        status_jadwal: 'AKTIF',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      headers: { Prefer: 'return=minimal' },
    });
    // PATCH-IN-PLACE: kembalikan baris jadwal baru (bentuk loadSchedules) supaya
    // frontend cukup push ke memori + render tabel tanpa tarik ulang getAppData.
    return {
      success: true,
      schedule: {
        idJadwal,
        namaAgenda: String(d.nama),
        idLoker: String(d.loker || '-'),
        waktu: String(d.waktu || ''),
        link: String(d.link || d.lokasi || '-'),
        kandidat: String(d.kandidat || '-'),
        tsk: String(d.tsk || ''),
      },
    };
  } catch (e) {
    return { success: false, error: 'Gagal simpan jadwal: ' + e.message };
  }
}

async function handleHapusJadwal(payload, sessionToken) {
  const guard = requireRole(sessionToken, 'admin');
  if (guard.error) return guard.error;
  const id = String((payload && payload[0]) || '');
  if (!id) return { success: false, error: 'ID jadwal tidak ditemukan.' };
  try {
    // FIX: jadwal legacy (sebelum rebuild) hanya punya kolom `id`, tanpa
    // `id_jadwal` — DELETE dengan filter id_jadwal yang tidak cocok diam-diam
    // menghapus 0 baris (kenapa dulu "gak bisa hapus jadwal"). Cari barisnya
    // dulu (id_jadwal ATAU id), lalu hapus berdasarkan primary key `id`.
    const rows = await supabase.supabaseJson('GET', 'database_schedule', {
      query: { select: '*', limit: 500 },
    });
    const row = (Array.isArray(rows) ? rows : []).find(
      (r) => String(r.id_jadwal || '') === id || String(r.id || '') === id,
    );
    if (!row || row.id === undefined || row.id === null) {
      return { success: false, error: 'Jadwal tidak ditemukan.' };
    }
    await supabase.supabaseJson('DELETE', 'database_schedule', {
      query: { id: 'eq.' + row.id },
      headers: { Prefer: 'return=minimal' },
    });
    return { success: true, id };
  } catch (e) {
    return { success: false, error: 'Gagal hapus jadwal: ' + e.message };
  }
}

async function handleTambahTugasBaru(payload, sessionToken) {
  const guard = requireRole(sessionToken, 'admin');
  if (guard.error) return guard.error;
  const nama = String((payload && payload[0]) || '').trim();
  const admin = String((payload && payload[1]) || '');
  if (!nama) return { success: false, error: 'Nama tugas wajib diisi.' };
  const idTugas = 'TGS' + Date.now();
  const waktuDibuat = new Date().toISOString();
  try {
    await supabase.supabaseJson('POST', 'database_tugas', {
      body: {
        id_tugas: idTugas,
        nama_tugas: nama,
        dibuat_oleh: admin,
        waktu_dibuat: waktuDibuat,
        status: 'BARU',
        created_at: waktuDibuat,
        updated_at: waktuDibuat,
      },
      headers: { Prefer: 'return=minimal' },
    });
    return {
      success: true,
      tugas: { id: idTugas, task: nama, status: 'BARU', dibuatOleh: admin, waktuDibuat },
    };
  } catch (e) {
    return { success: false, error: 'Gagal tambah tugas: ' + e.message };
  }
}

async function handleSetTugasStatus(payload, sessionToken) {
  const guard = requireRole(sessionToken, 'admin');
  if (guard.error) return guard.error;
  const id = String((payload && payload[0]) || '');
  const st = String((payload && payload[1]) || '');
  if (!id || !st) return { success: false, error: 'Data tidak lengkap.' };
  try {
    // FIX sama seperti hapus jadwal: tugas legacy hanya punya `id`, bukan
    // `id_tugas` — cari barisnya dulu, update berdasarkan primary key `id`.
    const rows = await supabase.supabaseJson('GET', 'database_tugas', {
      query: { select: '*', limit: 500 },
    });
    const row = (Array.isArray(rows) ? rows : []).find(
      (r) => String(r.id_tugas || '') === id || String(r.id || '') === id,
    );
    if (!row || row.id === undefined || row.id === null) {
      return { success: false, error: 'Tugas tidak ditemukan.' };
    }
    const body = { status: st, updated_at: new Date().toISOString() };
    if (st === 'SELESAI') body.waktu_selesai = new Date().toISOString();
    await supabase.supabaseJson('PATCH', 'database_tugas', {
      query: { id: 'eq.' + row.id },
      body,
      headers: { Prefer: 'return=minimal' },
    });
    return {
      success: true,
      tugas: {
        id: String(row.id_tugas || row.id || ''),
        task: supabase.toText(row.nama_tugas || ''),
        status: st,
        dibuatOleh: supabase.toText(row.dibuat_oleh || ''),
        waktuDibuat: supabase.toText(row.waktu_dibuat || ''),
      },
    };
  } catch (e) {
    return { success: false, error: 'Gagal update status tugas: ' + e.message };
  }
}

async function handleHapusTugas(payload, sessionToken) {
  const guard = requireRole(sessionToken, 'admin');
  if (guard.error) return guard.error;
  const id = String((payload && payload[0]) || '');
  if (!id) return { success: false, error: 'ID tugas tidak ditemukan.' };
  try {
    const rows = await supabase.supabaseJson('GET', 'database_tugas', {
      query: { select: '*', limit: 500 },
    });
    const row = (Array.isArray(rows) ? rows : []).find(
      (r) => String(r.id_tugas || '') === id || String(r.id || '') === id,
    );
    if (!row || row.id === undefined || row.id === null) {
      return { success: false, error: 'Tugas tidak ditemukan.' };
    }
    await supabase.supabaseJson('DELETE', 'database_tugas', {
      query: { id: 'eq.' + row.id },
      headers: { Prefer: 'return=minimal' },
    });
    return { success: true, id };
  } catch (e) {
    return { success: false, error: 'Gagal hapus tugas: ' + e.message };
  }
}

// ---------------------------------------------------------------------------
// Template WA (wa_templates) + Fonnte
// ---------------------------------------------------------------------------
async function handleSimpanWaTemplate(payload, sessionToken) {
  const guard = requireRole(sessionToken, 'admin');
  if (guard.error) return guard.error;
  const id = String((payload && payload[0]) || '');
  const nama = String((payload && payload[1]) || '').trim();
  const isi = String((payload && payload[2]) || '');
  if (!nama) return { success: false, error: 'Nama template wajib diisi.' };
  try {
    if (id && id !== '') {
      await supabase.supabaseJson('PATCH', 'wa_templates', {
        query: { id: 'eq.' + id },
        body: { nama, isi, updated_at: new Date().toISOString() },
        headers: { Prefer: 'return=minimal' },
      });
    } else {
      await supabase.supabaseJson('POST', 'wa_templates', {
        body: {
          id: 'WA' + Date.now(),
          nama,
          isi,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        headers: { Prefer: 'return=minimal' },
      });
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: 'Gagal simpan template: ' + e.message };
  }
}

async function handleHapusWaTemplate(payload, sessionToken) {
  const guard = requireRole(sessionToken, 'admin');
  if (guard.error) return guard.error;
  const id = String((payload && payload[0]) || '');
  if (!id) return { success: false, error: 'ID template tidak ditemukan.' };
  try {
    await supabase.supabaseJson('DELETE', 'wa_templates', {
      query: { id: 'eq.' + id },
      headers: { Prefer: 'return=minimal' },
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: 'Gagal hapus template: ' + e.message };
  }
}

async function fonnteSend(target, message) {
  const token = env('FONNTE_TOKEN') || env('FONNTE_API_KEY');
  if (!token) throw new Error('FONNTE_TOKEN belum dikonfigurasi');
  const params = new URLSearchParams();
  params.set('target', String(target));
  params.set('message', String(message));
  const res = await fetch('https://api.fonnte.com/send', {
    method: 'POST',
    headers: {
      Authorization: token,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  const text = await res.text();
  if (!res.ok) throw new Error('Fonnte HTTP ' + res.status + ' ' + text.slice(0, 200));
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function handleKirimSatuPesanFonnte(payload, sessionToken) {
  const guard = requireRole(sessionToken, 'admin');
  if (guard.error) return guard.error;
  const wa = String((payload && payload[0]) || '');
  const message = String((payload && payload[1]) || '');
  if (!wa || !message) return { success: false, error: 'Nomor WA dan pesan wajib diisi.' };
  try {
    const result = await fonnteSend(supabase.normalizeWa(wa), message);
    return { success: true, result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// kirimTawaranMassal([{candidates, jobCode, linkGrup, interval, customMessage}])
async function handleKirimTawaranMassal(payload, sessionToken) {
  const guard = requireRole(sessionToken, 'admin');
  if (guard.error) return guard.error;
  const d = (payload && payload[0]) || {};
  const cands = Array.isArray(d.candidates) ? d.candidates : [];
  if (cands.length === 0) return { success: false, error: 'Tidak ada kandidat.' };
  const jobCode = String(d.jobCode || '');
  const linkGrup = String(d.linkGrup || '');
  const interval = Math.max(Number(d.interval) || 5, 1);
  const results = [];
  try {
    let templateIsi = null;
    try {
      const rows = await supabase.supabaseJson('GET', 'wa_templates', {
        query: { select: '*', limit: 100 },
      });
      const tpl = (Array.isArray(rows) ? rows : []).find(
        (r) =>
          String(r.nama || '')
            .toLowerCase()
            .includes('grup') ||
          String(r.nama || '')
            .toLowerCase()
            .includes('undang'),
      );
      if (tpl) templateIsi = String(tpl.isi || '');
    } catch (e) {
      /* template opsional */
    }
    for (const c of cands) {
      const wa = supabase.normalizeWa(String(c.wa || ''));
      const nama = String(c.nama || 'Kandidat');
      let message =
        d.customMessage ||
        templateIsi ||
        'Halo ' +
          nama +
          '! Anda terpilih untuk Lowongan ' +
          jobCode +
          '. Silakan bergabung ke grup resmi kami: ' +
          linkGrup;
      if (templateIsi && !d.customMessage) {
        message = templateIsi
          .replace(/\{nama\}/g, nama)
          .replace(/\{job\}/g, jobCode)
          .replace(/\{link\}/g, linkGrup);
      }
      try {
        await fonnteSend(wa, message);
        results.push({ wa: c.wa, nama, success: true });
      } catch (e) {
        results.push({ wa: c.wa, nama, success: false, error: e.message });
      }
      if (interval > 0) await new Promise((r) => setTimeout(r, interval * 1000));
    }
    return { success: true, results };
  } catch (e) {
    return { success: false, error: e.message, results };
  }
}

// ---------------------------------------------------------------------------
// Konfigurasi sistem (sys_config)
// ---------------------------------------------------------------------------
const CONFIG_TYPE_MAP = {
  kategori: 'list_kategori',
  gender: 'list_gender',
  tahapan: 'list_tahapan',
  tsk: 'tsk',
  lokasi: 'list_lokasi',
  syarat: 'list_syarat',
  lokasiZoom: 'lokasi__link_zoom',
  statusLoker: 'list_status_loker',
  statusForm: 'status_form',
  statusLamaran: 'list_status_lamaran',
  broadcast: 'broadcast',
  pengumuman: 'broadcast',
};

async function handleUpdateSysConfig(payload, sessionToken) {
  const guard = requireRole(sessionToken, 'admin');
  if (guard.error) return guard.error;
  const key = String((payload && payload[0]) || '');
  const arr = (payload && payload[1]) || [];
  if (!key) return { success: false, error: 'Key konfigurasi tidak valid.' };
  const type = CONFIG_TYPE_MAP[key] || key;
  const items = Array.isArray(arr) ? arr.map((x) => String(x)) : [String(arr)];
  try {
    const settings = await supabase.findSettings();
    const rows = Array.isArray(settings.rows) ? settings.rows : [];
    const toDelete = rows.filter((r) => String(r.config_type || '') === type).map((r) => r.id);
    for (const id of toDelete) {
      await supabase.supabaseJson('DELETE', 'sys_config', {
        query: { id: 'eq.' + id },
        headers: { Prefer: 'return=minimal' },
      });
    }
    for (const item of items) {
      if (!item) continue;
      await supabase.supabaseJson('POST', 'sys_config', {
        body: {
          config_type: type,
          config_value: item,
          is_active: true,
          created_at: new Date().toISOString(),
        },
        headers: { Prefer: 'return=minimal' },
      });
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: 'Gagal simpan konfigurasi: ' + e.message };
  }
}

// ---------------------------------------------------------------------------
// Rincian biaya presets (rincian_presets)
// ---------------------------------------------------------------------------
async function handleGetRincianPresets() {
  try {
    const rows = await supabase.supabaseJson('GET', 'rincian_presets', {
      query: { select: '*', limit: 500 },
    });
    const presets = { include: [], exclude: [], benefit: [], persyaratan: [] };
    for (const r of Array.isArray(rows) ? rows : []) {
      const cat = String(r.kategori || '').toLowerCase();
      if (presets[cat]) presets[cat].push({ id: r.id, item: String(r.item || '') });
    }
    return { success: true, presets };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function handleSaveRincianPreset(payload, sessionToken) {
  const guard = requireRole(sessionToken, 'admin');
  if (guard.error) return guard.error;
  const d = (payload && payload[0]) || {};
  const cat = String(d.kategori || '');
  const items = Array.isArray(d.item) ? d.item.map((x) => String(x)) : [String(d.item || '')];
  if (!cat || !items[0]) return { success: false, error: 'Kategori dan item wajib diisi.' };
  try {
    let lastId = null;
    for (const item of items) {
      if (!item) continue;
      const rows = await supabase.supabaseJson('POST', 'rincian_presets', {
        body: { kategori: cat, item, created_at: new Date().toISOString() },
        headers: { Prefer: 'return=representation' },
      });
      if (Array.isArray(rows) && rows[0]) lastId = rows[0].id;
    }
    return { success: true, id: lastId };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function handleDeleteRincianPreset(payload, sessionToken) {
  const guard = requireRole(sessionToken, 'admin');
  if (guard.error) return guard.error;
  const id = String((payload && payload[0] && payload[0].id) || '');
  if (!id) return { success: false, error: 'ID preset tidak ditemukan.' };
  try {
    await supabase.supabaseJson('DELETE', 'rincian_presets', {
      query: { id: 'eq.' + id },
      headers: { Prefer: 'return=minimal' },
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ---------------------------------------------------------------------------
// Siswa baru (respon_siswa_baru)
// ---------------------------------------------------------------------------
async function handleGetDaftarSiswaBaru(payload, sessionToken) {
  const guard = requireRole(sessionToken, 'admin');
  if (guard.error) return guard.error;
  try {
    const rows = await supabase.supabaseJson('GET', 'respon_siswa_baru', {
      query: { select: '*', limit: 500, order: 'timestamp.desc' },
    });
    return { success: true, data: Array.isArray(rows) ? rows : [] };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function handleSubmitDaftarSiswa(payload) {
  const d = payload || {};
  const nama = String(d.nama || '').trim();
  if (!nama) return { success: false, message: 'Nama wajib diisi.' };
  try {
    await supabase.supabaseJson('POST', 'respon_siswa_baru', {
      body: {
        timestamp: new Date().toISOString(),
        nama_lengkap: nama,
        alamat_email: String(d.email || ''),
        jenis_kelamin: String(d.gender || ''),
        alamat_lengkap: String(d.alamat || ''),
        tempat_tanggal_lahir: String(d.ttl || ''),
        agama: String(d.agama || ''),
        nomor_wa_peserta: String(d.wa_siswa || ''),
        nomor_wa_orangtua: String(d.wa_ortu || ''),
        pendidikan_terakhir: String(d.pendidikan || ''),
        file_ktp: String(d.ktp || ''),
        file_kk: String(d.kk || ''),
        file_ijazah: String(d.ijazah || ''),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      headers: { Prefer: 'return=minimal' },
    });
    return { success: true };
  } catch (e) {
    return { success: false, message: 'Gagal mendaftar: ' + e.message };
  }
}

// ---------------------------------------------------------------------------
// Link & bridge (QR / form)
// ---------------------------------------------------------------------------
function siteBase() {
  return (env('NETLIFY_SITE_URL') || 'https://asjportal.netlify.app').replace(/\/$/, '');
}

async function handleGetLinkSiswaBaru() {
  return { url: siteBase() + '/siswa-baru.html', formUrl: siteBase() + '/siswa-baru.html' };
}

async function handleGenerateFormBridge(payload) {
  // Pemanggil:
  //  - aksiGenerateQr(c, k)        → [code, bidang]
  //  - lamarJob(jc, b, wa, nama, req) → [code, bidang, wa, nama, req]
  // Map posisional supaya WA/nama/req kandidat yang login ikut terbawa ke
  // apply-full.html (?job=&bidang=&wa=&nama=&req=).
  const code = String((payload && payload[0]) || '');
  const bidang = String((payload && payload[1]) || '');
  const wa = String((payload && payload[2]) || '');
  const nama = String((payload && payload[3]) || '');
  const req = String((payload && payload[4]) || '');
  const formUrl =
    siteBase() +
    '/apply-full.html?job=' +
    encodeURIComponent(code) +
    '&bidang=' +
    encodeURIComponent(bidang) +
    '&wa=' +
    encodeURIComponent(wa) +
    '&nama=' +
    encodeURIComponent(nama) +
    '&req=' +
    encodeURIComponent(req);
  return { formUrl };
}

async function handleGenerateLegacyMasterBridge(payload) {
  const wa = String((payload && payload[0]) || '');
  const nama = String((payload && payload[1]) || '');
  const formUrl =
    siteBase() +
    '/master-full.html?wa=' +
    encodeURIComponent(wa) +
    '&nama=' +
    encodeURIComponent(nama);
  return { formUrl };
}

async function handleGenerateAiFormBridge(payload) {
  // Pemanggil: bukaAiFormPortal(flow, job, bidang, wa, nama) → payload
  // [flow, job, bidang, wa, nama]. Dulu hanya payload[0]/[1] yang dibaca,
  // jadi ?job=<flow>&wa= (WA kandidat HILANG) → ai_form tidak dapat
  // auto-fill dan SIMPAN DB gagal. Sekarang seluruh context diteruskan ke
  // ai_form.html (?flow=&job=&bidang=&wa=&nama=).
  const flow = String((payload && payload[0]) || '');
  const job = String((payload && payload[1]) || '');
  const bidang = String((payload && payload[2]) || '');
  const wa = String((payload && payload[3]) || '');
  const nama = String((payload && payload[4]) || '');
  const formUrl =
    siteBase() +
    '/ai_form.html?flow=' +
    encodeURIComponent(flow) +
    '&job=' +
    encodeURIComponent(job) +
    '&bidang=' +
    encodeURIComponent(bidang) +
    '&wa=' +
    encodeURIComponent(wa) +
    '&nama=' +
    encodeURIComponent(nama);
  return { formUrl };
}

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
    const found = await supabase.findCandidates();
    const c = found.rows.find(
      (r) => String(supabase.pick(r, ['id_kandidat', 'id']) || '') === idKand,
    );
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
