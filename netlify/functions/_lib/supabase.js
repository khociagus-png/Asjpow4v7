// supabase.js — klien REST Supabase (PostgREST) untuk backend rebuild.
//
// Skema database asli tidak ikut ter-upload ke repo, jadi helper ini "adaptif":
// mencari tabel dengan nama yang umum, lalu memetakan kolom secara heuristik
// ke bentuk yang dimengerti frontend. Begitu skema asli diketahui, mapping di
// bawah bisa dirapikan per-tabel.
'use strict';

const { env } = require('./env');

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

function normalizeGender(v) {
  const s = toText(v).toUpperCase();
  if (s.includes('LAKI') || s.includes('MALE') || s === 'P' || s === 'M' || s === 'PRIA')
    return 'PRIA';
  if (s.includes('PEREMPUAN') || s.includes('FEMALE') || s === 'W' || s === 'F' || s === 'WANITA')
    return 'WANITA';
  return 'L/P';
}

// Kolom asli tabel job_database (hasil introspeksi):
//   code_job, tsk, kategori, pekerjaan, lokasi, gender, kuota, jumlah_kandidat,
//   status, syarat, keterangan, tahapan, format_cv, link_pamflet,
//   total_biaya, rincian_biaya, dokumen_share
function mapJob(row) {
  const pekerjaan = pick(row, [
    'pekerjaan',
    'nama_pekerjaan',
    'judul',
    'title',
    'pekerjaan_loker',
    'nama_loker',
    'posisi',
    'job',
  ]);
  const klien = pick(row, ['perusahaan', 'klien', 'company', 'client']);
  const code = toText(
    pick(row, ['code_job', 'code', 'kode', 'no_loker', 'id_loker', 'id_lowongan', 'id']),
  );
  const templateCv = pick(row, ['format_cv', 'template_cv', 'templatecv', 'cv_template']) || '';
  return {
    // id:0 + rowIndex=kode — persis perilaku backend asli (diverifikasi dari
    // situs live asjportal.netlify.app).
    id: 0,
    code,
    rowIndex: code,
    pekerjaan: klien ? pekerjaan + ' - ' + klien : pekerjaan,
    kategori: toText(pick(row, ['kategori', 'category', 'bidang', 'sektor'])),
    // status & gender dikirim MENTAH (persis backend asli — frontend sudah
    // menghandle nilai seperti "❌ CLOSE", "👨 Pria👩 Wanita").
    status: toText(pick(row, ['status', 'state', 'is_open'])),
    lokasi: toText(pick(row, ['lokasi', 'location', 'prefektur', 'kota', 'area'])),
    gender: toText(pick(row, ['gender', 'jenis_kelamin', 'jk'])),
    kuota: (() => {
      const kv = pick(row, ['kuota', 'quota', 'jml_kuota']);
      // Asli mengirim "" kalau kosong/0.
      return kv == null || kv === '' || kv === 0 ? '' : toText(kv);
    })(),
    jumlahKandidat: Number(pick(row, ['jumlah_kandidat', 'jumlahKandidat'])) || 0,
    syarat: toText(pick(row, ['syarat', 'persyaratan', 'requirements', 'requirement'])),
    keterangan: toText(pick(row, ['keterangan', 'deskripsi', 'description', 'info_tambahan'])),
    tahapan: toText(pick(row, ['tahapan', 'tahapan_seleksi'])),
    tsk: toText(pick(row, ['tsk', 'pengurus'])),
    dokumenShare: toText(pick(row, ['dokumen_share', 'dokumenshare', 'dokumen', 'docs_share'])),
    template: templateCv,
    templateCv,
    pamflet: toText(pick(row, ['link_pamflet', 'pamflet', 'poster', 'flyer', 'brosur'])),
    rincianBiaya: toText(pick(row, ['rincian_biaya', 'rincianbiaya', 'biaya_rincian', 'rincian'])),
    totalBiaya: toText(pick(row, ['total_biaya', 'totalbiaya', 'total'])),
    createdAt: toText(pick(row, ['created_at', 'createdat', 'tanggal', 'date_created', 'tgl'])),
    _raw: row,
  };
}

// Kolom asli tabel database_candidate:
//   id, id_kandidat, nama_lengkap, nik, gender, usia, tb, bb, pendidikan,
//   no_wa, id_loker_pilihan, tahapan_seleksi, status_kandidat, tanggal_daftar,
//   catatan_admin, pas_photo, folder_url, jft, ssw, file_cv, password_kandidat,
//   no_pasport, email, tempat_lahir, tgl_lahir, alamat_lengkap,
//   catatan_internal, catatan_external, nilai_jft_text, bidang_ssw_text,
//   created_at, updated_at, password_diubah
function mapCandidate(row) {
  const nama = toText(pick(row, ['nama_lengkap', 'nama', 'name', 'full_name']));
  const wa = toText(
    pick(row, ['no_wa', 'wa', 'whatsapp', 'telepon', 'phone', 'no_hp', 'telp']),
  ).replace(/\D/g, '');
  const idKandidat = toText(pick(row, ['id_kandidat', 'id', 'kandidat_id', 'uid']));
  const tb = toText(pick(row, ['tb']));
  const bb = toText(pick(row, ['bb']));
  const tempatLahir = toText(pick(row, ['tempat_lahir', 'tempatLahir']));
  const tglLahir = toText(pick(row, ['tgl_lahir', 'tglLahir', 'tanggal_lahir']));
  return {
    idKandidat,
    id: idKandidat,
    nama,
    wa,
    gender: toText(pick(row, ['gender', 'jenis_kelamin', 'jk'])),
    usia: toText(pick(row, ['usia', 'umur'])),
    tb,
    bb,
    // Gabungan TB/BB & TTL (komentar asli: dihitung backend mapCandidate).
    tbBb:
      (tb && tb !== '-') || (bb && bb !== '-')
        ? [tb, bb].filter((x) => x && x !== '-').join(' / ')
        : '-',
    ttl: [tempatLahir, tglLahir].filter((x) => x && x !== '-').join(', ') || '-',
    pendidikan: toText(pick(row, ['pendidikan'])),
    pasPhoto: pick(row, ['pas_photo', 'pasPhoto', 'photo']) || '',
    email: toText(pick(row, ['email'])),
    tempatLahir,
    tglLahir,
    alamat: toText(pick(row, ['alamat_lengkap', 'alamat', 'address'])),
    jftText: toText(pick(row, ['nilai_jft_text', 'jft_text'])),
    sswText: toText(pick(row, ['bidang_ssw_text', 'ssw_text'])),
    catatanInt: toText(pick(row, ['catatan_internal', 'catatan_int'])),
    catatanExt: toText(pick(row, ['catatan_external', 'catatan_ext'])),
    catatan: toText(pick(row, ['catatan_admin'])),
    tahapan: toText(pick(row, ['tahapan_seleksi', 'tahapan'])),
    status: toText(pick(row, ['status_kandidat', 'status'])),
    idLoker: toText(pick(row, ['id_loker_pilihan', 'id_loker'])),
    folderUrl: pick(row, ['folder_url', 'folderUrl']) || '',
    jft: pick(row, ['jft', 'file_jft']) || '',
    ssw: pick(row, ['ssw', 'file_ssw']) || '',
    fileCv: pick(row, ['file_cv', 'fileCv', 'cv']) || '',
    nik: toText(pick(row, ['nik'])),
    noPasport: toText(pick(row, ['no_pasport', 'no_paspor'])),
    tanggalDaftar: pick(row, ['tanggal_daftar', 'tanggalDaftar']) || '',
    createdAt: pick(row, ['created_at']) || '',
    _raw: row,
  };
}

// ===== Mail inbox (database_asj_form) =====
// Kolom asli: id, timestamp, code_job, kategory, nama_lengkap, no_wa, gender,
// usia, tb, bb, pas_photo, jft, ssw, file_cv, folder_name, folder_id,
// folder_url, status, email, tempat_lahir, tgl_lahir, alamat_lengkap,
// created_at, updated_at, keterangan, ai_data_json, feedback_berkas
function mapForm(row, i) {
  return {
    rowIndex: i,
    id: row.id,
    timestamp: toText(row.timestamp || row.created_at),
    code: toText(row.code_job),
    kategori: toText(row.kategory),
    nama: toText(row.nama_lengkap),
    wa: toText(row.no_wa).replace(/\D/g, ''),
    status: toText(row.status) || 'MENUNGGU',
    folderUrl: row.folder_url || '',
    photo: row.pas_photo || '',
    jft: row.jft || '',
    ssw: row.ssw || '',
    cv: row.file_cv || '',
    keterangan: toText(row.keterangan),
    // Dokumen tambahan dari keterangan "NAMA:URL;NAMA2:URL2;..." — dipakai
    // mail inbox untuk menampilkan SEMUA yang di-upload kandidat + preview.
    docs: parseDocs(toText(row.keterangan)),
  };
}

// Parse keterangan mail menjadi daftar dokumen {nama, url} (format NAMA:URL;...).
function parseDocs(keterangan) {
  const out = [];
  String(keterangan || '')
    .split(';')
    .forEach((chunk) => {
      const i = chunk.indexOf(':');
      if (i <= 0) return;
      const nama = chunk.slice(0, i).trim();
      const url = chunk.slice(i + 1).trim();
      if (!nama || !url || !/^https?:\/\//i.test(url)) return;
      out.push({ nama, url });
    });
  return out;
}

// Urutan form konsisten (dipakai getAppData DAN handler review/approve/reject/
// delete yang menerima rowIndex = posisi di array ini).
async function findForms() {
  const rows = await supabaseJson('GET', 'database_asj_form', {
    query: { select: '*', order: 'timestamp.desc', limit: 500 },
  });
  return Array.isArray(rows) ? rows : [];
}

// Query paginated dengan Range header + total dari Content-Range.
async function queryPaged(table, { page = 1, pageSize = 50, q = '' } = {}) {
  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;
  const params = { select: '*' };
  if (q && q.trim()) {
    const needle = q.trim().replace(/'/g, "''");
    params.or = `nama_lengkap.ilike.*${needle}*,no_wa.ilike.*${needle}*`;
  }
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(supabaseUrl().replace(/\/$/, '') + '/rest/v1/' + table + '?' + qs, {
    method: 'GET',
    headers: {
      apikey: supabaseKey(),
      Authorization: 'Bearer ' + supabaseKey(),
      Range: start + '-' + end,
      Prefer: 'count=exact',
    },
  });
  if (!res.ok) {
    throw new Error(table + ' → HTTP ' + res.status + ' ' + (await res.text()).slice(0, 150));
  }
  const rows = await res.json();
  const cr = res.headers.get('content-range') || '';
  const total = parseInt(String(cr).split('/')[1] || '0', 10) || rows.length;
  return { rows, total };
}

// Nama tabel asli (hasil introspeksi skema Supabase project):
//   job_database (lowongan), database_candidate + master_database_candidate
//   (kandidat), sys_config (konfigurasi/assets/pengumuman), database_tugas,
//   database_schedule, wa_templates, ai_form_submissions, user_sessions, dll.
async function findJobs() {
  return findTable([
    'job_database',
    'jobs',
    'lokers',
    'loker',
    'lowongan',
    'job_listings',
    'joblistings',
    'tbl_jobs',
    'data_loker',
  ]);
}

async function findCandidates() {
  return findTable([
    'database_candidate',
    'master_database_candidate',
    'candidates',
    'kandidat',
    'calon',
    'data_kandidat',
    'siswa',
    'candidate_data',
    'master_kandidat',
  ]);
}

async function findAdmins() {
  return findTable([
    'user_sessions',
    'admin_users',
    'admins',
    'admin',
    'staff',
    'users',
    'pengguna',
  ]);
}

async function findSettings() {
  return findTable([
    'sys_config',
    'assets',
    'settings',
    'app_config',
    'config',
    'system_config',
    'pengaturan',
    'site_config',
  ]);
}

async function findAnnouncements() {
  return findTable(['pengumuman', 'announcements', 'announcement', 'marquee']);
}

// Bangun objek assets ({LOGO, BANNER, FOOTER, SOCIAL}) dari tabel settings jika ada.
async function findAssets() {
  const found = await findSettings();
  for (const row of found.rows) {
    const logo =
      pick(row, ['logo', 'LOGO', 'logo_url', 'logoUrl', 'assets_logo']) ||
      (row.assets && typeof row.assets === 'object' && row.assets.LOGO);
    if (logo) {
      const nested = (k) => (row.assets && typeof row.assets === 'object' && row.assets[k]) || null;
      return {
        LOGO: logo,
        BANNER: {
          TOKYO:
            pick(row, ['banner_tokyo', 'banner', 'BANNER_TOKYO']) ||
            nested('BANNER')?.TOKYO ||
            null,
          SAKURA:
            pick(row, ['banner_sakura', 'banner_sakura_url']) || nested('BANNER')?.SAKURA || null,
        },
        FOOTER: {
          TOKYO:
            pick(row, ['footer_tokyo', 'footer', 'footer_momiji']) ||
            nested('FOOTER')?.TOKYO ||
            null,
          SAKURA: pick(row, ['footer_sakura']) || nested('FOOTER')?.SAKURA || null,
        },
        SOCIAL: {
          whatsapp:
            pick(row, ['wa_admin', 'whatsapp_admin', 'social_wa']) ||
            nested('SOCIAL')?.whatsapp ||
            null,
          instagram:
            pick(row, ['ig', 'instagram', 'social_ig']) || nested('SOCIAL')?.instagram || null,
          tiktok: pick(row, ['tiktok', 'social_tiktok']) || nested('SOCIAL')?.tiktok || null,
          maps: pick(row, ['maps', 'maps_link', 'lokasi_maps']) || nested('SOCIAL')?.maps || null,
        },
      };
    }
  }
  return null;
}

async function findPengumuman() {
  const ann = await findAnnouncements();
  for (const row of ann.rows) {
    const txt = pick(row, ['pengumuman', 'teks', 'isi', 'text', 'message', 'marquee']);
    if (txt) return toText(txt);
  }
  const settings = await findSettings();
  for (const row of settings.rows) {
    const txt = pick(row, ['pengumuman', 'marquee', 'announcement', 'teks_pengumuman']);
    if (txt) return toText(txt);
  }
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

// ---------------------------------------------------------------------------
// Lampirkan berkas (pemberkasan_checklist) & bio (master_database_candidate)
// ke tiap kandidat — bentuk yang diharapkan frontend (candidate.berkas /
// candidate.bio) untuk dashboard kandidat (progres pemberkasan x/17, biodata)
// dan modal admin (berkas tersimpan, auto-fill biodata). Backend asli (GAS)
// mengirim keduanya di getAppData; rebuild ini sebelumnya tidak melakukannya.
// Kolom sumber per dokumen ikut skema yang dipakai handleSimpanBerkasTahapan
// (FILE_LABEL_COLUMNS di actions-extra.js) + fallback nama kolom legacy.
// ---------------------------------------------------------------------------
// Kandidat kolom per dokumen — urut: pemberkasan_checklist → master → legacy.
// pemberkasan_checklist (dibuat rebuild) bisa kosong untuk data lama, jadi
// master_database_candidate (*_url) dipakai sebagai fallback.
const BERKAS_COLUMNS = [
  ['kk', ['kk_url', 'kk']],
  ['akte', ['akte_url', 'akte']],
  ['sd', ['sd_url', 'ijazah_sd_url', 'ijazah_sd', 'sd']],
  ['smp', ['smp_url', 'ijazah_smp_url', 'ijazah_smp', 'smp']],
  ['sma', ['sma_url', 'ijazah_sma_url', 'ijazah_sma', 'sma']],
  ['univ', ['univ_url', 'univ']],
  ['pasport', ['pasport_url', 'pasport']],
  ['mcu', ['mcu_url', 'mcu']],
  ['kontrak', ['kontrak_url', 'kontrak']],
  ['cert', ['cert_url', 'certificate_japan', 'cert']],
  ['ktp', ['ktp_url', 'ktp']],
  ['foto2', ['foto2_url', 'pas_foto_studio', 'foto2']],
  ['ijinortu', ['ijinortu_url', 'ijin_ortu', 'ijinortu']],
  ['cpmi', ['cpmi_url', 'cpmi']],
  ['kawin', ['kawin_url', 'buku_nikah', 'kawin']],
  ['sehat', ['sehat_url', 'surat_sehat', 'sehat']],
  ['bpjs', ['bpjs_url', 'bpjs']],
  ['psikotes', ['psikotes_url', 'psikotes']],
];
const BIO_COLUMNS = [
  ['email', ['email']],
  ['tmplahir', ['tempat_lahir', 'tmplahir']],
  ['tgllahir', ['tgl_lahir', 'tgllahir']],
  ['alamat', ['alamat_lengkap', 'alamat']],
  ['ayah', ['nama_ayah', 'ayah']],
  ['ttlayah', ['ttl_ayah', 'ttlayah']],
  ['ibu', ['nama_ibu', 'ibu']],
  ['ttlibu', ['ttl_ibu', 'ttlibu']],
  ['pasport', ['no_pasport', 'pasport']],
  ['coe', ['no_coe', 'coe']],
  ['kotapasport', ['kota_pasport', 'kotapasport']],
  ['tglpasport', ['tgl_pasport', 'tglpasport']],
  ['exppasport', ['exp_pasport', 'exppasport']],
  ['pt', ['nama_perusahaan', 'pt']],
  ['shacou', ['nama_shacou', 'shacou']],
  ['telppt', ['telp_perusahaan', 'telppt']],
  ['webpt', ['web_perusahaan', 'webpt']],
  ['alamatpt', ['alamat_perusahaan', 'alamatpt']],
];

async function attachBerkasBio(candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) return candidates;
  try {
    // Tarik BERSAMAAN (Promise.all) — dua tabel independen.
    const [pRows, mRows] = await Promise.all([
      supabaseJson('GET', 'pemberkasan_checklist', {
        query: { select: '*', limit: 500 },
      }),
      supabaseJson('GET', 'master_database_candidate', {
        query: { select: '*', limit: 500 },
      }),
    ]);
    const pByWa = new Map();
    for (const r of Array.isArray(pRows) ? pRows : []) {
      pByWa.set(normalizeWa(String(r.wa || '')), r);
    }
    const mByWa = new Map();
    for (const r of Array.isArray(mRows) ? mRows : []) {
      mByWa.set(normalizeWa(String(pick(r, ['no_wa', 'wa', 'whatsapp']) || '')), r);
    }
    for (const c of candidates) {
      const want = normalizeWa(String(c.wa || ''));
      const pr = pByWa.get(want);
      const mr = mByWa.get(want);
      // Gabung pemberkasan_checklist + master (*_url) — master jadi fallback
      // untuk data lama yang belum pernah ditulis ke pemberkasan_checklist.
      const sources = [pr, mr].filter(Boolean);
      if (sources.length) {
        const berkas = {};
        for (const [key, cols] of BERKAS_COLUMNS) {
          let v = '';
          for (const src of sources) {
            for (const col of cols) {
              if (src[col]) {
                v = src[col];
                break;
              }
            }
            if (v) break;
          }
          berkas[key] = v && v !== '-' ? toText(v) : '';
        }
        c.berkas = berkas;
      } else {
        c.berkas = {};
      }
      if (mr) {
        const bio = {};
        for (const [key, cols] of BIO_COLUMNS) {
          const v = pick(mr, cols);
          bio[key] = v && v !== '-' ? toText(v) : '';
        }
        c.bio = bio;
      } else {
        c.bio = {};
      }
    }
  } catch (e) {
    // Non-fatal: tanpa berkas/bio dashboard tetap render (progres 0/x).
  }
  return candidates;
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
  getSchema,
  tablesFromSchema,
  columnsFromSchema,
  findTable,
  findJobs,
  findCandidates,
  findAdmins,
  findSettings,
  findAnnouncements,
  findAssets,
  findPengumuman,
  queryPaged,
  mapForm,
  findForms,
  normalizeWa,
  pick,
  toText,
  mapJob,
  mapCandidate,
  normalizeStatus,
  normalizeGender,
  attachBerkasBio,
};
