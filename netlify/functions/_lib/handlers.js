// handlers.js — dispatcher pusat backend rebuild.
//
// Frontend mengirim { action, payload, sessionToken } ke /.netlify/functions/*
// (lihat api-client.js). Di Netlify production, request masuk lewat file wrapper
// per-fungsi (get-app-data.js, auth.js, ...) yang memanggil handleAction() ini.
// Di preview Freebuff, serve-static.mjs memanggil handleAction() langsung.
//
// Sebagian besar action belum diimplementasi ulang (skema Supabase asli belum
// diketahui) — handler default membalas pesan yang jelas, bukan error mentah.
'use strict';

const bcrypt = require('bcryptjs');
const { env, debugFileEnvKeys, debugFileStructure } = require('./env');
const supabase = require('./supabase');
const session = require('./session');
const demo = require('./demo');
const extra = require('./actions-extra');
const ai = require('./actions-ai');

const NOT_IMPLEMENTED =
  'Fungsi ini belum diimplementasi di backend rebuild (repo GitHub hanya berisi frontend).';

// sys_config.config_type -> key dropdown yang dikirim ke frontend
// (kunci ekstra statusLoker/lokasiZoom/dst. ikut dikirim persis seperti
// backend asli, walau UI utama hanya memakai 6 key pertama).
const DROPDOWN_MAP = {
  list_kategori: 'kategori',
  list_gender: 'gender',
  list_tahapan: 'tahapan',
  tsk: 'tsk',
  list_lokasi: 'lokasi',
  list_syarat: 'syarat',
  lokasi__link_zoom: 'lokasiZoom',
  list_status_loker: 'statusLoker',
  status_form: 'statusForm',
  list_status_lamaran: 'statusLamaran',
  broadcast: 'broadcast',
};

function parseConfigList(v) {
  if (Array.isArray(v)) return v;
  const s = String(v || '').trim();
  // Nilai bisa berupa JSON array string ("[\"a\",\"b\"]").
  if (s.startsWith('[') || s.startsWith('{')) {
    try {
      const p = JSON.parse(s);
      if (Array.isArray(p)) return p;
    } catch {
      /* bukan JSON valid — lanjut split biasa */
    }
  }
  return s
    .split(/[\n,;]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function stripRaw(list) {
  return (list || []).map(({ _raw, ...rest }) => rest);
}

// Jadwal & tugas & template WA untuk dashboard admin (database_schedule,
// database_tugas, wa_templates — bentuk yang dipakai frontend).
async function loadSchedules() {
  try {
    const rows = await supabase.supabaseJson('GET', 'database_schedule', {
      query: { select: '*', limit: 500, order: 'created_at.desc' },
    });
    return (Array.isArray(rows) ? rows : []).map((r) => ({
      idJadwal: supabase.toText(r.id_jadwal || r.id || ''),
      namaAgenda: supabase.toText(r.nama_agenda || ''),
      idLoker: supabase.toText(r.id_loker_terkait || '-'),
      waktu: supabase.toText(r.tanggal_waktu || ''),
      link: supabase.toText(r.lokasi_link || '-'),
      kandidat: supabase.toText(r.daftar_kandidat || '-'),
      tsk: supabase.toText(r.tsk || ''),
    }));
  } catch {
    return [];
  }
}

async function loadTugas() {
  try {
    const rows = await supabase.supabaseJson('GET', 'database_tugas', {
      query: { select: '*', limit: 500, order: 'created_at.desc' },
    });
    return (Array.isArray(rows) ? rows : []).map((r) => ({
      id: supabase.toText(r.id_tugas || r.id || ''),
      task: supabase.toText(r.nama_tugas || ''),
      status: supabase.toText(r.status || 'BARU'),
      dibuatOleh: supabase.toText(r.dibuat_oleh || ''),
      waktuDibuat: supabase.toText(r.waktu_dibuat || ''),
    }));
  } catch {
    return [];
  }
}

async function loadWaTemplates() {
  try {
    const rows = await supabase.supabaseJson('GET', 'wa_templates', {
      query: { select: '*', limit: 500 },
    });
    return (Array.isArray(rows) ? rows : []).map((r) => ({
      id: supabase.toText(r.id || ''),
      nama: supabase.toText(r.nama || ''),
      isi: supabase.toText(r.isi || ''),
    }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// getAppData — data utama dashboard
// ---------------------------------------------------------------------------
async function handleGetAppData(payload, sessionToken) {
  const mode = (payload && payload[0]) || 'public';

  if (!supabase.hasBackend()) {
    // Belum ada key Supabase -> mode demo supaya preview tetap hidup.
    return demo.demoGetAppData(mode);
  }

  try {
    const base = demo.demoGetAppData(mode); // reuse assets default & bentuk respons
    let found = await supabase.findJobs();
    if (!found.table) {
      // Skema asli beda nama tabel — cari lewat skema OpenAPI berdasarkan kolom.
      const spec = await supabase.getSchema();
      const names = supabase.tablesFromSchema(spec);
      for (const name of names) {
        const cols = supabase.columnsFromSchema(spec, name);
        if (
          cols.some((c) => /pekerjaan|judul|nama_loker|lowongan|title/.test(c)) &&
          cols.some((c) => /status|kode|code/.test(c))
        ) {
          const hit = await supabase.findTable([name]);
          if (hit.table) {
            found = hit;
            break;
          }
        }
      }
    }
    if (!found.table) {
      base.pengumuman =
        '⚠ Backend Supabase terhubung, tapi tabel lowongan belum terdeteksi otomatis. Mapping skema perlu disesuaikan.';
      return base;
    }
    const jobs = found.rows.map(supabase.mapJob).filter((j) => j.pekerjaan && j.pekerjaan !== '');

    const assets = (await supabase.findAssets()) || base.assets;

    // dropdowns + pengumuman dari sys_config (list_*, broadcast).
    const settings = await supabase.findSettings();
    const dropdowns = {};
    let pengumuman = '';
    if (settings.table) {
      for (const row of settings.rows) {
        const type = supabase.toText(row.config_type);
        const key = DROPDOWN_MAP[type];
        // Setiap baris sys_config = SATU opsi (atau satu daftar) — gabungkan.
        if (key) {
          dropdowns[key] = (dropdowns[key] || []).concat(parseConfigList(row.config_value));
        }
        if (type === 'broadcast' && supabase.toText(row.config_value).trim() && !pengumuman) {
          pengumuman = supabase.toText(row.config_value);
        }
      }
      // TANPA dedupe — backend asli mengirim apa adanya (termasuk duplikat
      // pada tsk), dan kita samakan persis.
    }

    const result = {
      success: true,
      activeTheme: '',
      sessionInvalid: false,
      jobs: stripRaw(jobs),
      dropdowns,
      assets,
      pengumuman,
    };

    // Mode admin/kandidat: validasi sesi. TIDAK valid -> kirim data publik
    // + sessionInvalid:true (persis perilaku live — frontend lalu membersihkan
    // sesi & reload ke layar login).
    let t = null;
    if (mode === 'admin' || mode === 'kandidat') {
      const role = mode === 'admin' ? 'admin' : 'kandidat';
      t = session.verifyToken(sessionToken);
      const waPayload = String((payload && payload[1]) || '').replace(/\D/g, '');
      const valid =
        t &&
        t.role === role &&
        (mode !== 'kandidat' || (t.wa || '') === waPayload || waPayload === '');
      if (!valid) {
        result.sessionInvalid = true;
        return result;
      }
    }

    if (mode === 'admin') {
      // Halaman 1 (50) + total — sisa dimuat on-demand via getCandidatesPage.
      const paged = await supabase.queryPaged('database_candidate', {
        page: 1,
        pageSize: 50,
      });
      result.dbJobs = stripRaw(jobs);
      result.candidates = stripRaw(paged.rows.map(supabase.mapCandidate));
      // Lampirkan berkas (pemberkasan_checklist) & bio (master) ke tiap
      // kandidat — dipakai modal admin (berkas tersimpan, auto-fill biodata).
      await supabase.attachBerkasBio(result.candidates);
      result.candidatesTotal = paged.total;
      result.schedules = await loadSchedules();
      result.tugas = await loadTugas();
      result.formInbox = (await supabase.findForms()).map(supabase.mapForm);
      result.waTemplates = await loadWaTemplates();
      result.kandidatRiwayat = [];
    }

    if (mode === 'kandidat') {
      // Data kandidat miliknya sendiri (mapping lanjutan menyusul).
      const foundCand = await supabase.findCandidates();
      const w = supabase.normalizeWa(t.wa || '');
      const row = foundCand.rows.find(
        (r) =>
          supabase.normalizeWa(
            supabase.pick(r, ['no_wa', 'wa', 'whatsapp', 'telepon', 'phone', 'no_hp']) || '',
          ) === w,
      );
      result.dbJobs = stripRaw(jobs);
      // Kandidat juga mengisi ALL_CANDIDATES dengan datanya sendiri (sama
      // seperti backend asli) supaya dashboard (progres pemberkasan x/17,
      // biodata, progress bar) punya myData — plus berkas/bio dari master &
      // pemberkasan_checklist.
      const myCands = row ? stripRaw([supabase.mapCandidate(row)]) : [];
      await supabase.attachBerkasBio(myCands);
      result.candidates = myCands;
      result.kandidatRiwayat = myCands;
    }

    return result;
  } catch (e) {
    return { success: false, message: 'Gagal memuat data dari Supabase: ' + e.message };
  }
}

// ---------------------------------------------------------------------------
// getAppConfig — diagnostik koneksi (TIDAK membocorkan secret)
// ---------------------------------------------------------------------------
async function handleGetAppConfig() {
  const diag = {
    success: true,
    backend: 'netlify-functions-rebuild',
    supabaseConfigured: supabase.hasBackend(),
    supabaseUrlFormat: null,
    supabaseReachable: false,
    supabaseError: null,
    adminPinConfigured: masterPins().length > 0,
    fileEnvKeys: debugFileEnvKeys(),
    fileEnvStructure: debugFileStructure(),
    tables: {},
  };
  if (!supabase.hasBackend()) return diag;

  const url = supabase.supabaseUrl();
  diag.supabaseUrlFormat = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url)
    ? 'ok'
    : 'tidak valid — harus berbentuk https://<ref>.supabase.co';

  try {
    const spec = await supabase.supabaseJson('GET', '', {});
    diag.supabaseReachable = true;
    const names = supabase.tablesFromSchema(spec);
    diag.tables.all = names;
    // Kolom per tabel (hanya NAMA kolom — tanpa data).
    const columns = {};
    for (const name of names) {
      columns[name] = supabase.columnsFromSchema(spec, name);
    }
    diag.tables.columns = columns;
  } catch (e) {
    diag.supabaseError = String(e.message || e).slice(0, 300);
  }

  const jobs = await supabase.findJobs();
  diag.tables.jobs = jobs.table;
  if (jobs.rows[0]) {
    diag.tables.jobsColumns = Object.keys(jobs.rows[0]);
    // Contoh nilai mentah status (data publik lowongan — aman ditampilkan).
    diag.jobStatusSamples = [
      ...new Set(
        jobs.rows
          .slice(0, 20)
          .map(
            (r) =>
              'status=' + supabase.toText(r.status) + ' | tahapan=' + supabase.toText(r.tahapan),
          ),
      ),
    ].slice(0, 8);
    diag.jobStatusAll = [...new Set(jobs.rows.map((r) => supabase.toText(r.status)))].slice(0, 15);
  }

  const cands = await supabase.findCandidates();
  diag.tables.candidates = cands.table;
  if (cands.rows[0]) {
    diag.tables.candidatesColumns = Object.keys(cands.rows[0]);
    // Format password kandidat (KLASIFIKASI saja — isi tidak pernah tampil).
    const pw = cands.rows[0].password_kandidat ?? cands.rows[0].password ?? null;
    diag.candidatePassSample =
      pw == null
        ? 'kosong'
        : typeof pw === 'string' && pw.startsWith('$2')
          ? 'bcrypt'
          : 'plaintext';
    diag.candidatePassChanged = cands.rows[0].password_diubah ?? null;
  }

  const admins = await supabase.findAdmins();
  diag.tables.admins = admins.table;
  if (admins.rows[0]) diag.tables.adminsColumns = Object.keys(admins.rows[0]);

  const settings = await supabase.findSettings();
  diag.tables.settings = settings.table;
  if (settings.rows[0]) {
    diag.tables.settingsColumns = Object.keys(settings.rows[0]);
    // Nama config_type di sys_config (bukan nilai) — untuk menemukan
    // konfigurasi admin/assets/pengumuman.
    diag.sysConfigTypes = [
      ...new Set(settings.rows.map((r) => supabase.toText(r.config_type))),
    ].slice(0, 30);
  }

  return diag;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
function masterPins() {
  return [
    'ADMIN_PASSWORD',
    'ADMIN_MASTER_PASSWORD',
    'MASTER_PASSWORD',
    'ASJ_ADMIN_PASSWORD',
    'ADMIN_PIN',
    'PIN_ADMIN',
    'ADMIN_MASTER_PIN',
  ]
    .map(env)
    .filter(Boolean);
}

async function handleCheckAdminMaster(payload) {
  const pin = String((payload && payload[0]) || '');
  const pins = masterPins();
  if (pins.length === 0) {
    return {
      success: false,
      error:
        'PIN master admin belum dikonfigurasi di server. Set env ADMIN_PASSWORD (nilai dari dashboard Netlify) lewat Keys/API keys.',
    };
  }
  if (pins.includes(pin)) return { success: true };
  return { success: false, error: 'PIN master salah.' };
}

async function handleCheckAdminPersonal(payload) {
  const name = String((payload && payload[0]) || '').trim();
  const pin = String((payload && payload[1]) || '');
  if (!name || !pin) return { success: false, error: 'Nama dan PIN wajib diisi.' };

  let ok = false;
  // 1) KHOCI istimewa: pin-nya dari env PIN_KHOCI (tema Inter Milan di UI).
  if (name.toLowerCase() === 'khoci') {
    const khociPin = env('PIN_KHOCI');
    if (khociPin && khociPin === pin) ok = true;
  }
  // 2) Env ASJ_ADMINS="Nama1:pin1,Nama2:pin2" (cara cepat untuk rebuild).
  const envAdmins = env('ASJ_ADMINS');
  if (envAdmins) {
    for (const item of envAdmins.split(',')) {
      const idx = item.indexOf(':');
      if (idx < 0) continue;
      const n = item.slice(0, idx).trim();
      const p = item.slice(idx + 1).trim();
      if (n.toLowerCase() === name.toLowerCase() && p === pin) ok = true;
    }
  }
  // 3) Tabel admin di Supabase (adaptif).
  if (!ok && supabase.hasBackend()) {
    try {
      const found = await supabase.findAdmins();
      for (const row of found.rows) {
        const rn = supabase.toText(
          supabase.pick(row, ['nama', 'name', 'admin_name', 'username', 'nama_admin']),
        );
        const rp = supabase.toText(
          supabase.pick(row, ['pin', 'password', 'pass', 'pin_admin', 'kode']),
        );
        if (rn && rp && rn.toLowerCase() === name.toLowerCase() && rp === pin) ok = true;
      }
    } catch {
      /* tabel admin tidak ditemukan — lanjut */
    }
  }

  if (!ok) return { success: false, error: 'Nama atau PIN salah.' };
  return {
    success: true,
    sessionToken: session.signToken({ role: 'admin', name }),
  };
}

async function handleLoginKandidat(payload) {
  const wa = String((payload && payload[0]) || '').replace(/\D/g, '');
  const password = String((payload && payload[1]) || '');
  if (!wa || !password) return { success: false, error: 'Nomor WA dan password wajib diisi.' };
  if (!supabase.hasBackend()) {
    return { success: false, error: 'Backend belum dikonfigurasi (Supabase keys belum ada).' };
  }
  try {
    const row = await findCandidateByWa(wa);
    if (!row) return { success: false, error: 'Nomor WA belum terdaftar.' };
    const stored = supabase.pick(row, ['password_kandidat', 'password', 'pass', 'pin', 'hash']);
    const defaultPass = wa.slice(-4);
    let okPass = false;
    if (stored && String(stored).startsWith('$2')) {
      // bcrypt hash (daftar asli: hash dari 4 digit terakhir WA, atau
      // password pribadi yang sudah diganti kandidat).
      okPass = await bcrypt.compare(password, String(stored));
    } else if (stored == null || stored === '') {
      okPass = password === defaultPass;
    } else {
      okPass = String(stored) === password;
    }
    if (!okPass) return { success: false, error: 'Password salah.' };
    const nama =
      supabase.toText(supabase.pick(row, ['nama_lengkap', 'nama', 'name', 'full_name'])) || wa;
    return {
      success: true,
      nama,
      wa,
      sessionToken: session.signToken({ role: 'kandidat', wa }),
    };
  } catch (e) {
    return { success: false, error: 'Gagal memeriksa kandidat: ' + e.message };
  }
}

async function handleDaftarKandidat(payload) {
  const nama = String((payload && payload[0]) || '').trim();
  const wa = String((payload && payload[1]) || '').replace(/\D/g, '');
  if (!nama || !wa) return { success: false, error: 'Nama dan nomor WA wajib diisi.' };
  if (!supabase.hasBackend()) {
    return { success: false, error: 'Backend belum dikonfigurasi (Supabase keys belum ada).' };
  }
  try {
    const found = await supabase.findCandidates();
    if (!found.table) {
      return { success: false, error: 'Tabel kandidat belum terdeteksi di Supabase.' };
    }
    // Cek duplikat (format fleksibel 0xx/62xx).
    if (await findCandidateByWa(wa)) {
      return { success: false, error: 'Nomor WA sudah terdaftar.' };
    }
    const defaultPass = wa.slice(-4);
    const hash = bcrypt.hashSync(defaultPass, 10);
    const variants = [
      { nama_lengkap: nama, no_wa: wa, password_kandidat: hash, password_diubah: false },
      { nama_lengkap: nama, no_wa: wa, password: hash },
      { nama, wa, password: hash },
      { nama, whatsapp: wa, password: hash },
      { name: nama, wa, password: hash },
      { name: nama, whatsapp: wa, password: hash },
      { nama, no_wa: wa, password: hash },
    ];
    for (const body of variants) {
      try {
        await supabase.supabaseJson('POST', found.table, {
          body,
          headers: { Prefer: 'return=minimal' },
        });
        return { success: true };
      } catch {
        /* coba varian kolom berikutnya */
      }
    }
    return {
      success: false,
      error:
        'Pendaftaran gagal: kolom tabel kandidat tidak cocok dengan mapping. Hubungi developer.',
    };
  } catch (e) {
    return { success: false, error: 'Gagal mendaftar: ' + e.message };
  }
}

async function handleGantiPasswordKandidat(payload, sessionToken) {
  const wa = supabase.normalizeWa(String((payload && payload[0]) || ''));
  const lama = String((payload && payload[1]) || '');
  const baru = String((payload && payload[2]) || '');
  if (!wa || !lama || !baru) return { success: false, error: 'Data tidak lengkap.' };
  if (baru.length < 6 || baru.length > 20 || /\s/.test(baru)) {
    return { success: false, error: 'Password baru 6-20 karakter tanpa spasi.' };
  }
  const t = session.verifyToken(sessionToken);
  if (!t || t.role !== 'kandidat' || supabase.normalizeWa(t.wa) !== wa) {
    return { success: false, sessionInvalid: true, message: 'Sesi kandidat tidak valid' };
  }
  if (!supabase.hasBackend()) {
    return { success: false, error: 'Backend belum dikonfigurasi.' };
  }
  try {
    const found = await supabase.findCandidates();
    const colWa = ['no_wa', 'wa', 'whatsapp', 'telepon', 'phone', 'no_hp'].find(
      (c) => found.rows[0] && c in found.rows[0],
    );
    const colPass = ['password_kandidat', 'password', 'pass', 'pin'].find(
      (c) => found.rows[0] && c in found.rows[0],
    );
    if (!colWa || !colPass) return { success: false, error: 'Kolom password tidak ditemukan.' };
    const row = found.rows.find((r) => supabase.normalizeWa(String(r[colWa] || '')) === wa);
    if (!row) return { success: false, error: 'Kandidat tidak ditemukan.' };
    const stored = row[colPass];
    let okLama =
      stored && String(stored).startsWith('$2')
        ? await bcrypt.compare(lama, String(stored))
        : String(stored || '') === lama;
    if (!okLama) return { success: false, error: 'Password lama salah.' };
    const body = { [colPass]: bcrypt.hashSync(baru, 10) };
    if ('password_diubah' in (found.rows[0] || {})) body.password_diubah = true;
    await supabase.supabaseJson('PATCH', found.table, {
      query: { [colWa]: 'eq.' + row[colWa] },
      body,
      headers: { Prefer: 'return=minimal' },
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: 'Gagal mengganti password: ' + e.message };
  }
}

// ---------------------------------------------------------------------------
// Admin: kelola lowongan (job_database) & kandidat (database_candidate)
// ---------------------------------------------------------------------------
// Pemetaan payload frontend -> kolom tabel job_database (snake_case).
const JOB_COLUMNS = {
  tsk: 'tsk',
  kategori: 'kategori',
  pekerjaan: 'pekerjaan',
  lokasi: 'lokasi',
  gender: 'gender',
  templateCv: 'format_cv',
  status: 'status',
  kuota: 'kuota',
  jmlKandidat: 'jumlah_kandidat',
  syarat: 'syarat',
  keterangan: 'keterangan',
  pamflet: 'link_pamflet',
  tahapanDB: 'tahapan',
  totalBiaya: 'total_biaya',
  rincianBiaya: 'rincian_biaya',
  dokumenShare: 'dokumen_share',
};

function mapJobPayloadToRow(data) {
  const row = {};
  for (const [from, to] of Object.entries(JOB_COLUMNS)) {
    if (data[from] !== undefined && data[from] !== null) row[to] = data[from];
  }
  return row;
}

function requireAdmin(sessionToken) {
  const t = session.verifyToken(sessionToken);
  if (!t || t.role !== 'admin') {
    return { error: { success: false, sessionInvalid: true, message: 'Sesi admin tidak valid' } };
  }
  return { token: t };
}

const CAND_WA_COLS = ['no_wa', 'wa', 'whatsapp', 'telepon', 'phone', 'no_hp'];

// Cari baris kandidat berdasarkan WA (format fleksibel 0xx / 62xx).
async function findCandidateByWa(wa) {
  const found = await supabase.findCandidates();
  const want = supabase.normalizeWa(wa);
  return (
    found.rows.find((r) => supabase.normalizeWa(supabase.pick(r, CAND_WA_COLS) || '') === want) ||
    null
  );
}

// Kode loker baru: TG<max+1>ASJ (pola asli, mis. TG591ASJ).
async function nextJobCode() {
  const found = await supabase.findJobs();
  let max = 0;
  for (const row of found.rows) {
    const m = String(row.code_job || row.code || '').match(/TG(\d+)ASJ/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return 'TG' + (max + 1) + 'ASJ';
}

async function handleSimpanJobBaru(payload, sessionToken) {
  const guard = requireAdmin(sessionToken);
  if (guard.error) return guard.error;
  const data = (payload && payload[0]) || {};
  if (!data.pekerjaan) return { success: false, error: 'Nama pekerjaan wajib diisi.' };
  if (!supabase.hasBackend()) return { success: false, error: 'Backend belum dikonfigurasi.' };
  try {
    const code = await nextJobCode();
    const body = { code_job: code, ...mapJobPayloadToRow(data) };
    await supabase.supabaseJson('POST', 'job_database', {
      body,
      headers: { Prefer: 'return=minimal' },
    });
    return { success: true, code };
  } catch (e) {
    return { success: false, error: 'Gagal simpan loker: ' + e.message };
  }
}

async function handleEditLokerFull(payload, sessionToken) {
  const guard = requireAdmin(sessionToken);
  if (guard.error) return guard.error;
  const data = (payload && payload[0]) || {};
  if (!data.code) return { success: false, error: 'Kode loker tidak ditemukan.' };
  if (!supabase.hasBackend()) return { success: false, error: 'Backend belum dikonfigurasi.' };
  try {
    const body = mapJobPayloadToRow(data);
    // Kosong = pertahankan nilai lama (kontrak asli), kecuali dokumenShare
    // boleh dikosongkan via kiriman kosong.
    for (const k of Object.keys(body)) {
      if (k !== 'dokumen_share' && (body[k] === '' || body[k] === '-')) delete body[k];
    }
    await supabase.supabaseJson('PATCH', 'job_database', {
      query: { code_job: 'eq.' + data.code },
      body,
      headers: { Prefer: 'return=minimal' },
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: 'Gagal edit loker: ' + e.message };
  }
}

// Ambil baris job hasil update (bentuk dbJobs yang dipakai frontend) — dipakai
// handler kelola loker supaya respons aksi membawa barisnya sendiri (patch-in-
// place) tanpa frontend harus tarik ulang getAppData.
async function getJobMapped(code) {
  const found = await supabase.findJobs();
  const row = (found.rows || []).find((r) => String(r.code_job || r.code || '') === String(code));
  if (!row) return null;
  return stripRaw([supabase.mapJob(row)])[0] || null;
}

async function handleUbahStatusJob(payload, sessionToken) {
  const guard = requireAdmin(sessionToken);
  if (guard.error) return guard.error;
  const [code, status] = payload || [];
  if (!code || !status) return { success: false, error: 'Data tidak lengkap.' };
  try {
    await supabase.supabaseJson('PATCH', 'job_database', {
      query: { code_job: 'eq.' + code },
      body: { status },
      headers: { Prefer: 'return=minimal' },
    });
    return { success: true, job: await getJobMapped(code) };
  } catch (e) {
    return { success: false, error: 'Gagal ubah status: ' + e.message };
  }
}

async function handleHapusJobData(payload, sessionToken) {
  const guard = requireAdmin(sessionToken);
  if (guard.error) return guard.error;
  const [code] = payload || [];
  if (!code) return { success: false, error: 'Kode loker tidak ditemukan.' };
  try {
    // Tolak hapus bila masih ada kandidat terkait (pesan sama seperti asli).
    const cands = await supabase.findCandidates();
    const terkait = cands.rows.some((r) => String(r.id_loker_pilihan || '') === String(code));
    if (terkait) {
      return { success: false, error: 'Gagal hapus loker. Mungkin masih ada kandidat terkait.' };
    }
    await supabase.supabaseJson('DELETE', 'job_database', {
      query: { code_job: 'eq.' + code },
      headers: { Prefer: 'return=minimal' },
    });
    return { success: true, code };
  } catch (e) {
    return { success: false, error: 'Gagal hapus loker: ' + e.message };
  }
}

async function handleUpdateTahapanDbJob(payload, sessionToken) {
  const guard = requireAdmin(sessionToken);
  if (guard.error) return guard.error;
  const [code, tahapan, status] = payload || [];
  if (!code) return { success: false, error: 'Kode loker tidak ditemukan.' };
  const body = {};
  if (tahapan !== undefined && tahapan !== null) body.tahapan = tahapan;
  if (status !== undefined && status !== null) body.status = status;
  try {
    await supabase.supabaseJson('PATCH', 'job_database', {
      query: { code_job: 'eq.' + code },
      body,
      headers: { Prefer: 'return=minimal' },
    });
    return { success: true, job: await getJobMapped(code) };
  } catch (e) {
    return { success: false, error: 'Gagal update tahapan: ' + e.message };
  }
}

async function handleUpdateDokumenShare(payload, sessionToken) {
  const guard = requireAdmin(sessionToken);
  if (guard.error) return guard.error;
  const [code, joined] = payload || [];
  if (!code) return { success: false, error: 'Kode loker tidak ditemukan.' };
  try {
    await supabase.supabaseJson('PATCH', 'job_database', {
      query: { code_job: 'eq.' + code },
      body: { dokumen_share: joined || '' },
      headers: { Prefer: 'return=minimal' },
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: 'Gagal update dokumen: ' + e.message };
  }
}

async function handleTandaiGagalJob(payload, sessionToken) {
  const guard = requireAdmin(sessionToken);
  if (guard.error) return guard.error;
  const [wa, jobCode] = payload || [];
  if (!wa || !jobCode) return { success: false, error: 'Data tidak lengkap.' };
  try {
    const row = await findCandidateByWa(wa);
    if (!row) {
      return { success: false, error: 'Kandidat tidak ditemukan.' };
    }
    // Kolom loker bisa id_loker_pilihan ATAU id_loker (skema adaptif).
    const idLoker = supabase.toText(supabase.pick(row, ['id_loker_pilihan', 'id_loker']));
    if (String(idLoker) !== String(jobCode)) {
      return { success: false, error: 'Kandidat tidak terdaftar di job ini.' };
    }
    await supabase.supabaseJson('PATCH', 'database_candidate', {
      query: { id: 'eq.' + row.id },
      body: {
        status_kandidat: 'GAGAL',
        id_loker_pilihan: null,
        updated_at: new Date().toISOString(),
      },
      headers: { Prefer: 'return=minimal' },
    });
    // Sinkronkan mail: lamaran kandidat ikut berstatus GAGAL (tidak menunggu
    // review lagi).
    let formUpdated = null;
    try {
      const forms = await supabase.findForms();
      const want = supabase.normalizeWa(wa);
      const mIdx = forms.findIndex((r) => supabase.normalizeWa(String(r.no_wa || '')) === want);
      const m = mIdx >= 0 ? forms[mIdx] : null;
      if (m && m.id !== undefined) {
        await supabase.supabaseJson('PATCH', 'database_asj_form', {
          query: { id: 'eq.' + m.id },
          body: { status: 'GAGAL' },
          headers: { Prefer: 'return=minimal' },
        });
        m.status = 'GAGAL';
        formUpdated = supabase.mapForm(m, mIdx);
      }
    } catch (e) {
      /* opsional */
    }
    // PATCH-IN-PLACE: kembalikan kandidat & baris mail hasil update supaya
    // frontend cukup menimpa di memori (tanpa tarik ulang getAppData).
    let candidate = null;
    try {
      const row2 = await findCandidateByWa(wa);
      if (row2 && row2.id !== undefined) {
        candidate = stripRaw([supabase.mapCandidate(row2)])[0] || null;
        if (candidate) {
          try {
            await supabase.attachBerkasBio([candidate]);
          } catch (e2) {
            /* best-effort */
          }
        }
      }
    } catch (e3) {
      /* best-effort */
    }
    return { success: true, candidate, form: formUpdated };
  } catch (e) {
    return { success: false, error: 'Gagal tandai gagal: ' + e.message };
  }
}

async function handleUpdateCatatanKandidat(payload, sessionToken) {
  const guard = requireAdmin(sessionToken);
  if (guard.error) return guard.error;
  const [id, intNote, extNote] = payload || [];
  if (!id) return { success: false, error: 'ID kandidat tidak ditemukan.' };
  try {
    await supabase.supabaseJson('PATCH', 'database_candidate', {
      query: { id_kandidat: 'eq.' + id },
      body: {
        catatan_internal: intNote || '',
        catatan_external: extNote || '',
      },
      headers: { Prefer: 'return=minimal' },
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: 'Gagal simpan catatan: ' + e.message };
  }
}

async function handleUpdateKandidatSuper(payload, sessionToken) {
  const guard = requireAdmin(sessionToken);
  if (guard.error) return guard.error;
  const data = (payload && payload[0]) || {};
  if (!data.wa) return { success: false, error: 'Nomor WA tidak ditemukan.' };
  const body = {
    gender: data.gender !== undefined ? data.gender : undefined,
    usia: data.usia !== undefined ? data.usia : undefined,
    tempat_lahir: data.tempatLahir !== undefined ? data.tempatLahir : undefined,
    tgl_lahir: data.tglLahir !== undefined ? data.tglLahir : undefined,
    tb: data.tb !== undefined ? data.tb : undefined,
    bb: data.bb !== undefined ? data.bb : undefined,
    nilai_jft_text: data.jftText !== undefined ? data.jftText : undefined,
    bidang_ssw_text: data.sswText !== undefined ? data.sswText : undefined,
  };
  for (const k of Object.keys(body)) if (body[k] === undefined) delete body[k];
  try {
    const row = await findCandidateByWa(data.wa);
    if (!row) return { success: false, error: 'Kandidat tidak ditemukan.' };
    await supabase.supabaseJson('PATCH', 'database_candidate', {
      query: { id: 'eq.' + row.id },
      body,
      headers: { Prefer: 'return=minimal' },
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: 'Gagal update kandidat: ' + e.message };
  }
}

async function handleGetCandidatesPage(payload, sessionToken) {
  const guard = requireAdmin(sessionToken);
  if (guard.error) return guard.error;
  const opts = (payload && payload[0]) || {};
  const page = Number(opts.page) || 1;
  const pageSize = Number(opts.pageSize) || 50;
  try {
    const { rows, total } = await supabase.queryPaged('database_candidate', {
      page,
      pageSize,
      q: opts.q || '',
    });
    const cands = stripRaw(rows.map(supabase.mapCandidate));
    await supabase.attachBerkasBio(cands);
    return { success: true, candidates: cands, total };
  } catch (e) {
    return { success: false, error: 'Gagal memuat kandidat: ' + e.message };
  }
}

// ---------------------------------------------------------------------------
// Admin: Mail inbox (database_asj_form) — review/approve/reject/delete
// ---------------------------------------------------------------------------
// Frontend mengirim rowIndex (posisi di array formInbox). Urutan harus sama
// dengan findForms() yang dipakai getAppData.
async function handleFormStatus(rowIndex, status, reason) {
  const idx = Number(rowIndex);
  if (!Number.isInteger(idx) || idx < 0) {
    return { success: false, error: 'Index form tidak valid.' };
  }
  try {
    const forms = await supabase.findForms();
    const f = forms[idx];
    if (!f) return { success: false, error: 'Form tidak ditemukan.' };
    const body = { status };
    if (reason !== null && reason !== undefined) body.keterangan = reason;
    await supabase.supabaseJson('PATCH', 'database_asj_form', {
      query: { id: 'eq.' + f.id },
      body,
      headers: { Prefer: 'return=minimal' },
    });
    // Kandidat masuk list DB JOB HANYA setelah approve (LULUS); Gagal
    // mengeluarkannya. Sebelum approve, kandidat hanya ada di mail.
    try {
      await syncCandidateDariForm(f, status);
    } catch (e) {
      console.error('[form-status] sync candidate:', e && e.message ? e.message : e);
    }
    // PATCH-IN-PLACE: kembalikan baris mail hasil update + baris kandidat yang
    // berubah (LULUS → dibuat/diperbarui, GAGAL → status GAGAL & lepas job)
    // supaya frontend tidak perlu tarik ulang semua data (getAppData) hanya
    // untuk satu aksi — tabel aktif langsung di-render dari respons ini.
    f.status = status;
    if (reason !== null && reason !== undefined) f.keterangan = reason;
    let candidate = null;
    const wa = supabase.normalizeWa(String(f.no_wa || f.wa || ''));
    if (wa) {
      try {
        const row = await findCandidateByWa(wa);
        if (row && row.id !== undefined) {
          candidate = stripRaw([supabase.mapCandidate(row)])[0] || null;
          if (candidate) {
            try {
              await supabase.attachBerkasBio([candidate]);
            } catch (e2) {
              /* best-effort */
            }
          }
        }
      } catch (e3) {
        /* best-effort: frontend tetap dapat baris mail */
      }
    }
    return { success: true, form: supabase.mapForm(f, idx), candidate };
  } catch (e) {
    return { success: false, error: 'Gagal proses form: ' + e.message };
  }
}

// nextCandidateId — ID kandidat baru ASJ<max+1> (salinan dari actions-extra).
async function nextCandidateId() {
  const found = await supabase.findCandidates();
  let max = 0;
  for (const r of found.rows) {
    const m = String(supabase.pick(r, ['id_kandidat', 'id']) || '').match(/ASJ(\d+)/i);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return 'ASJ' + String(max + 1).padStart(5, '0');
}

// Approve (LULUS) → buat/perbarui database_candidate dengan id_loker_pilihan =
// code_job supaya kandidat muncul di list DB JOB. Reject (GAGAL) → status GAGAL
// + lepas dari job. Data diambil dari baris mail (form lamaran).
async function syncCandidateDariForm(f, status) {
  const wa = supabase.normalizeWa(String(f.no_wa || f.wa || ''));
  const codeJob = String(f.code_job || '');
  if (!wa) return;
  const row = await findCandidateByWa(wa);
  if (status === 'LULUS') {
    const now = new Date().toISOString();
    const base = {
      nama_lengkap: String(f.nama_lengkap || ''),
      gender: String(f.gender || ''),
      usia: String(f.usia || ''),
      tb: String(f.tb || ''),
      bb: String(f.bb || ''),
      pas_photo: f.pas_photo || '',
      jft: f.jft || '',
      ssw: f.ssw || '',
      file_cv: f.file_cv || '',
      status_kandidat: 'LULUS',
      updated_at: now,
    };
    if (codeJob) base.id_loker_pilihan = codeJob;
    if (row && row.id !== undefined) {
      for (const k of Object.keys(base)) if (base[k] === undefined) delete base[k];
      await supabase.supabaseJson('PATCH', 'database_candidate', {
        query: { id: 'eq.' + row.id },
        body: base,
        headers: { Prefer: 'return=minimal' },
      });
    } else if (codeJob) {
      // Belum ada baris kandidat → buat dari data mail (password default = 4
      // digit terakhir WA, sama seperti alur daftar).
      base.id_kandidat = await nextCandidateId();
      base.no_wa = wa;
      base.password_kandidat = bcrypt.hashSync(wa.slice(-4), 10);
      base.password_diubah = false;
      base.tahapan_seleksi = 'LIST';
      base.tanggal_daftar = now;
      base.created_at = now;
      base.updated_at = now;
      await supabase.supabaseJson('POST', 'database_candidate', {
        body: base,
        headers: { Prefer: 'return=minimal' },
      });
    }
  } else if (status === 'GAGAL' && row && row.id !== undefined) {
    const upd = { status_kandidat: 'GAGAL', updated_at: new Date().toISOString() };
    if (codeJob && String(supabase.pick(row, ['id_loker_pilihan', 'id_loker']) || '') === codeJob) {
      upd.id_loker_pilihan = null;
    }
    await supabase.supabaseJson('PATCH', 'database_candidate', {
      query: { id: 'eq.' + row.id },
      body: upd,
      headers: { Prefer: 'return=minimal' },
    });
  }
}

async function handleReviewForm(payload, sessionToken) {
  const guard = requireAdmin(sessionToken);
  if (guard.error) return guard.error;
  return handleFormStatus((payload || [])[0], 'REVIEW ADMIN', undefined);
}

async function handleApproveForm(payload, sessionToken) {
  const guard = requireAdmin(sessionToken);
  if (guard.error) return guard.error;
  return handleFormStatus((payload || [])[0], 'LULUS', undefined);
}

async function handleRejectForm(payload, sessionToken) {
  const guard = requireAdmin(sessionToken);
  if (guard.error) return guard.error;
  const [, , reason] = payload || [];
  return handleFormStatus((payload || [])[0], 'GAGAL', reason || 'Lamaran ditolak');
}

async function handleDeleteForm(payload, sessionToken) {
  const guard = requireAdmin(sessionToken);
  if (guard.error) return guard.error;
  const idx = Number((payload || [])[0]);
  if (!Number.isInteger(idx) || idx < 0) {
    return { success: false, error: 'Index form tidak valid.' };
  }
  try {
    const forms = await supabase.findForms();
    const f = forms[idx];
    if (!f) return { success: false, error: 'Form tidak ditemukan.' };
    await supabase.supabaseJson('DELETE', 'database_asj_form', {
      query: { id: 'eq.' + f.id },
      headers: { Prefer: 'return=minimal' },
    });
    return { success: true, rowIndex: idx };
  } catch (e) {
    return { success: false, error: 'Gagal hapus form: ' + e.message };
  }
}

// ---------------------------------------------------------------------------
// Dispatcher utama
// ---------------------------------------------------------------------------
async function handleAction(action, payload, sessionToken) {
  switch (action) {
    case 'getAppData':
      return handleGetAppData(payload, sessionToken);
    case 'getAppConfig':
      return handleGetAppConfig();
    case 'checkAdminMaster':
      return handleCheckAdminMaster(payload);
    case 'checkAdminPersonal':
      return handleCheckAdminPersonal(payload);
    case 'loginKandidat':
      return handleLoginKandidat(payload);
    case 'daftarKandidat':
      return handleDaftarKandidat(payload);
    case 'gantiPasswordKandidat':
      return handleGantiPasswordKandidat(payload, sessionToken);
    case 'logout':
      return { success: true };
    // Kelola lowongan
    case 'simpanJobBaru':
      return handleSimpanJobBaru(payload, sessionToken);
    case 'editLokerFull':
      return handleEditLokerFull(payload, sessionToken);
    case 'ubahStatusJob':
      return handleUbahStatusJob(payload, sessionToken);
    case 'hapusJobData':
      return handleHapusJobData(payload, sessionToken);
    case 'updateTahapanDbJob':
      return handleUpdateTahapanDbJob(payload, sessionToken);
    case 'updateDokumenShare':
      return handleUpdateDokumenShare(payload, sessionToken);
    case 'tandaiGagalJob':
      return handleTandaiGagalJob(payload, sessionToken);
    // Kelola kandidat
    case 'updateCatatanKandidat':
      return handleUpdateCatatanKandidat(payload, sessionToken);
    case 'updateKandidatSuper':
      return handleUpdateKandidatSuper(payload, sessionToken);
    case 'getCandidatesPage':
      return handleGetCandidatesPage(payload, sessionToken);
    // Mail inbox
    case 'reviewForm':
      return handleReviewForm(payload, sessionToken);
    case 'approveForm':
      return handleApproveForm(payload, sessionToken);
    case 'rejectForm':
      return handleRejectForm(payload, sessionToken);
    case 'deleteForm':
      return handleDeleteForm(payload, sessionToken);
    // Upload & file
    case 'getUploadUrls':
      return extra.handleGetUploadUrls(payload, sessionToken);
    // Lamaran publik (apply-full.html)
    case 'cekDataPelamar':
      return extra.handleCekDataPelamar(payload);
    case 'isJobRequiresCv':
      return extra.handleIsJobRequiresCv(payload);
    case 'submitApply':
      return extra.handleSubmitApply(payload);
    case 'getExistingCandidateJsonByWa':
      return extra.handleGetExistingCandidateJsonByWa(payload);
    // Master data (master-full.html, CV)
    case 'getMasterDataByWa':
      return extra.handleGetMasterDataByWa(payload, sessionToken);
    case 'getDrafCvMaster':
      return extra.handleGetDrafCvMaster(payload);
    case 'submitMasterForm':
    case 'simpanBiodataLengkap':
      return extra.handleSubmitMasterForm(payload, sessionToken);
    case 'simpanUpdateMaster':
      return extra.handleSimpanUpdateMaster(payload, sessionToken);
    case 'simpanKandidatDanUpload':
      return extra.handleSimpanKandidatDanUpload(payload, sessionToken);
    case 'simpanBerkasTahapan':
      return extra.handleSimpanBerkasTahapan(payload, sessionToken);
    case 'simpanRevisiKandidat':
      return extra.handleSimpanRevisiKandidat(payload, sessionToken);
    // Jadwal & tugas
    case 'simpanJadwalBaru':
      return extra.handleSimpanJadwalBaru(payload, sessionToken);
    case 'hapusJadwal':
      return extra.handleHapusJadwal(payload, sessionToken);
    case 'tambahTugasBaru':
      return extra.handleTambahTugasBaru(payload, sessionToken);
    case 'setTugasStatus':
      return extra.handleSetTugasStatus(payload, sessionToken);
    case 'hapusTugas':
      return extra.handleHapusTugas(payload, sessionToken);
    case 'checkAndSendAgendaReminders':
      return { success: true, sent: 0 };
    // Template & kirim WA (Fonnte)
    case 'simpanWaTemplate':
      return extra.handleSimpanWaTemplate(payload, sessionToken);
    case 'hapusWaTemplate':
      return extra.handleHapusWaTemplate(payload, sessionToken);
    case 'kirimSatuPesanFonnte':
      return extra.handleKirimSatuPesanFonnte(payload, sessionToken);
    case 'kirimTawaranMassal':
      return extra.handleKirimTawaranMassal(payload, sessionToken);
    // Konfigurasi sistem
    case 'updateSysConfig':
      return extra.handleUpdateSysConfig(payload, sessionToken);
    // Preset rincian biaya
    case 'getRincianPresets':
      return extra.handleGetRincianPresets(payload, sessionToken);
    case 'saveRincianPreset':
      return extra.handleSaveRincianPreset(payload, sessionToken);
    case 'deleteRincianPreset':
      return extra.handleDeleteRincianPreset(payload, sessionToken);
    // Siswa baru
    case 'getDaftarSiswaBaru':
      return extra.handleGetDaftarSiswaBaru(payload, sessionToken);
    case 'submitDaftarSiswa':
      return extra.handleSubmitDaftarSiswa(payload);
    // Link & bridge (QR / form)
    case 'getLinkSiswaBaru':
      return extra.handleGetLinkSiswaBaru();
    case 'generateFormBridge':
      return extra.handleGenerateFormBridge(payload);
    case 'generateLegacyMasterBridge':
      return extra.handleGenerateLegacyMasterBridge(payload);
    case 'generateAiFormBridge':
      return extra.handleGenerateAiFormBridge(payload);
    // Drive links & migrasi
    case 'getDriveLinkCandidates':
      return extra.handleGetDriveLinkCandidates(payload, sessionToken);
    case 'uploadDriveReplacement':
      return extra.handleUploadDriveReplacement(payload, sessionToken);
    case 'runMigration':
      return extra.handleRunMigration(payload, sessionToken);
    // AI (Gemini) & submit AI form
    case 'processAIChat':
      return ai.handleProcessAIChat(payload);
    case 'processAdminAIChat':
      return ai.handleProcessAdminAIChat(payload, sessionToken);
    case 'processSiswaAIChat':
      return ai.handleProcessSiswaAIChat(payload);
    case 'processAiInterview':
      return ai.handleProcessAiInterview(payload, sessionToken);
    case 'getAdminAiContext':
      return ai.handleGetAdminAiContext(payload, sessionToken);
    case 'buildAdminAiCandidateSummary':
      return ai.handleBuildAdminAiCandidateSummary(payload, sessionToken);
    case 'submitDataAsj':
      return ai.handleSubmitDataAsj(payload, sessionToken);
    case 'simpanDataTtdNaitei':
      return ai.handleSimpanDataTtdNaitei(payload, sessionToken);
    default:
      return { success: false, message: NOT_IMPLEMENTED + ' (action: ' + action + ')' };
  }
}

module.exports = { handleAction, NOT_IMPLEMENTED };
