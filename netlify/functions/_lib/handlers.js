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

const { env, debugFileEnvKeys, debugFileStructure } = require('./env');
const supabase = require('./supabase');
const session = require('./session');
const extra = require('./actions-extra');
const ai = require('./actions-ai');
const rateLimit = require('./rate-limit');
const publicData = require('./actions-public');
const auth = require('./actions-auth');
// Guard & PIN auth yang masih dipakai handler lain di file ini (Fase 1.1b:
// dipindah ke actions-auth.js, di-import balik supaya tidak dobel definisi).
const { requireAdmin, masterPins } = auth;
// Modul domain (Fase 1.1c): lowongan, kandidat, mail inbox — dipindah dari
// file ini, dispatcher tinggal memetakan action → handler modul.
const jobActions = require('./actions-job');
const candidateActions = require('./actions-candidate');
const mailActions = require('./actions-mail');

const NOT_IMPLEMENTED =
  'Fungsi ini belum diimplementasi di backend rebuild (repo GitHub hanya berisi frontend).';

// sys_config.config_type -> key dropdown yang dikirim ke frontend
// (kunci ekstra statusLoker/lokasiZoom/dst. ikut dikirim persis seperti
// backend asli, walau UI utama hanya memakai 6 key pertama).
// Fase 1.1 (2026-08-16): DROPDOWN_MAP, parseConfigList, stripRaw, loadSchedules,
// loadTugas, loadWaTemplates, dedupeKandidatRaw, saringKandidatUnik,
// loadCandidatesUnik & handleGetAppData dipindah ke actions-public.js
// (modul data publik + cache TTL). stripRaw/loadCandidatesUnik di-import
// di atas karena masih dipakai handler lain di file ini.
// ---------------------------------------------------------------------------
// getAppConfig — diagnostik koneksi (TIDAK membocorkan secret)
// ---------------------------------------------------------------------------
async function handleGetAppConfig(sessionToken) {
  // Endpoint ini mengembalikan info SENSITIF (skema DB, klasifikasi hash
  // password kandidat, daftar env key yang terpasang) — wajib sesi admin.
  // Tidak ada halaman publik yang memanggilnya; frontend mengirim token admin.
  const guard = requireAdmin(sessionToken);
  if (guard.error) return guard.error;
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
// Fase 1.1b (2026-08-16): kluster auth (masterPins, requireAdmin, isValidWaFormat,
// handleCheckAdminMaster/Personal, handleLoginKandidat, handleDaftarKandidat,
// handleGantiPasswordKandidat) dipindah ke actions-auth.js. findCandidateByWa
// & CAND_WA_COLS dipindah ke candidate-helpers.js (dipakai lintas domain).

// ---------------------------------------------------------------------------
// Admin: kelola lowongan (job_database) & kandidat (database_candidate)
// ---------------------------------------------------------------------------
// Pemetaan payload frontend -> kolom tabel job_database (snake_case).
// Fase 1.1c (2026-08-16): domain LOWONGAN (JOB_COLUMNS, mapJobPayloadToRow,
// nextJobCode, handleSimpanJobBaru, handleEditLokerFull, getJobMapped,
// handleUbahStatusJob, handleHapusJobData, handleUpdateTahapanDbJob,
// handleUpdateDokumenShare, handleTandaiGagalJob) dipindah ke
// actions-job.js — dispatcher tinggal memetakan action → jobActions.*.

// Fase 1.1c: domain KANDIDAT (handleUpdateCatatanKandidat,
// handleUpdateKandidatSuper, handleGetCandidatesPage) dipindah ke
// actions-candidate.js — dispatcher tinggal memetakan action →
// candidateActions.*.

// ---------------------------------------------------------------------------
// Admin: Mail inbox (database_asj_form) — review/approve/reject/delete
// ---------------------------------------------------------------------------
// Frontend mengirim rowIndex (posisi di array formInbox). Urutan harus sama
// Fase 1.1c: domain MAIL INBOX (handleFormStatus, nextCandidateId,
// syncCandidateDariForm, handleReviewForm/ApproveForm/RejectForm/DeleteForm/
// TandaiDibacaForm) dipindah ke actions-mail.js — dispatcher tinggal
// memetakan action → mailActions.*.

// ---------------------------------------------------------------------------
// Rate limit (REVIEW.md M3) — lapisan proteksi di dispatcher supaya semua
// endpoint (Netlify wrapper & preview server) kebagian, tanpa mengubah tiap
// handler. Nilai mengikuti definisi di REVIEW.md: login admin 5/menit/IP +
// lockout 5 menit setelah 10 gagal, AI 10/menit per identitas + 60/menit/IP,
// Fonnte 2×/menit per admin, aksi CRUD admin 120/menit sebagai jaring pengaman.
// ---------------------------------------------------------------------------
const LOGIN_ACTIONS = new Set([
  'checkAdminMaster',
  'checkAdminPersonal',
  'loginKandidat',
  'daftarKandidat',
]);
const AI_ACTIONS = new Set([
  'processAIChat',
  'processSiswaAIChat',
  'processAdminAIChat',
  'processAiInterview',
  'parseDokumenBiodata',
  'generateWawancaraModel',
]);
const FONNTE_ACTIONS = new Set(['kirimSatuPesanFonnte', 'kirimTawaranMassal']);

function sessionIdentity(sessionToken) {
  const t = session.verifyToken(sessionToken);
  if (!t) return null;
  return t.role === 'admin' ? 'admin:' + String(t.name || '') : 'kandidat:' + String(t.wa || '');
}

function rateLimitChecks(action, meta, sessionToken) {
  const ip = (meta && meta.ip && String(meta.ip).trim()) || 'anon';
  const ident = sessionIdentity(sessionToken);
  const adminKey = ident && ident.indexOf('admin:') === 0 ? ident : null;

  if (action === 'checkAdminMaster' || action === 'checkAdminPersonal') {
    return [
      {
        key: 'adminLogin:' + ip,
        opts: { limit: 5, windowMs: 60000, lockoutAfter: 10, lockoutMs: 300000 },
      },
    ];
  }
  if (action === 'loginKandidat' || action === 'daftarKandidat') {
    return [
      {
        key: 'kandidatLogin:' + ip,
        opts: { limit: 10, windowMs: 60000, lockoutAfter: 15, lockoutMs: 300000 },
      },
    ];
  }
  if (AI_ACTIONS.has(action)) {
    // Per identitas (WA/admin; anonim → IP): 10 req/menit. Global per IP: 60.
    return [
      { key: 'ai:' + (ident || ip), opts: { limit: 10, windowMs: 60000 } },
      { key: 'aiGlobal:' + ip, opts: { limit: 60, windowMs: 60000 } },
    ];
  }
  if (FONNTE_ACTIONS.has(action)) {
    return [{ key: 'fonnte:' + (adminKey || ip), opts: { limit: 2, windowMs: 60000 } }];
  }
  if (adminKey) {
    // Jaring pengaman aksi CRUD admin — kerja normal tidak boleh terhambat.
    return [{ key: 'adminCrud:' + adminKey, opts: { limit: 120, windowMs: 60000 } }];
  }
  return [];
}

// ---------------------------------------------------------------------------
// Dispatcher utama
// ---------------------------------------------------------------------------
async function handleAction(action, payload, sessionToken, meta) {
  const checks = rateLimitChecks(action, meta, sessionToken);
  for (const c of checks) {
    const r = rateLimit.check(c.key, c.opts);
    if (!r.ok) {
      return {
        success: false,
        error: 'Terlalu banyak permintaan. Coba lagi dalam ' + r.retryAfter + ' detik.',
        rateLimited: true,
        retryAfter: r.retryAfter,
      };
    }
  }
  const out = await dispatchAction(action, payload, sessionToken);
  // Lockout login: catat kegagalan (PIN/WA/password salah) sesuai REVIEW M3.
  if (out && out.success === false && !out.rateLimited && LOGIN_ACTIONS.has(action)) {
    for (const c of checks) {
      if (c.opts.lockoutAfter) rateLimit.fail(c.key, c.opts);
    }
  }
  return out;
}

async function dispatchAction(action, payload, sessionToken) {
  switch (action) {
    case 'getAppData':
      return publicData.handleGetAppData(payload, sessionToken);
    case 'getAppConfig':
      return handleGetAppConfig(sessionToken);
    case 'checkAdminMaster':
      return auth.handleCheckAdminMaster(payload);
    case 'checkAdminPersonal':
      return auth.handleCheckAdminPersonal(payload);
    case 'loginKandidat':
      return auth.handleLoginKandidat(payload);
    case 'daftarKandidat':
      return auth.handleDaftarKandidat(payload);
    case 'gantiPasswordKandidat':
      return auth.handleGantiPasswordKandidat(payload, sessionToken);
    case 'logout':
      return { success: true };
    // Kelola lowongan
    case 'simpanJobBaru':
      return jobActions.handleSimpanJobBaru(payload, sessionToken);
    case 'editLokerFull':
      return jobActions.handleEditLokerFull(payload, sessionToken);
    case 'parseDokumenBiodata':
      return ai.handleParseDokumenBiodata(payload, sessionToken);
    case 'generateWawancaraModel':
      return ai.handleGenerateWawancaraModel(payload, sessionToken);
    case 'simpanHasilWawancara':
      return ai.handleSimpanHasilWawancara(payload, sessionToken);
    case 'selesaikanWawancara':
      return ai.handleSelesaikanWawancara(payload, sessionToken);
    case 'getHasilWawancara':
      return ai.handleGetHasilWawancara(payload, sessionToken);
    case 'ubahStatusJob':
      return jobActions.handleUbahStatusJob(payload, sessionToken);
    case 'hapusJobData':
      return jobActions.handleHapusJobData(payload, sessionToken);
    case 'updateTahapanDbJob':
      return jobActions.handleUpdateTahapanDbJob(payload, sessionToken);
    case 'updateDokumenShare':
      return jobActions.handleUpdateDokumenShare(payload, sessionToken);
    case 'tandaiGagalJob':
      return jobActions.handleTandaiGagalJob(payload, sessionToken);
    // Kelola kandidat
    case 'updateCatatanKandidat':
      return candidateActions.handleUpdateCatatanKandidat(payload, sessionToken);
    case 'updateKandidatSuper':
      return candidateActions.handleUpdateKandidatSuper(payload, sessionToken);
    case 'getCandidatesPage':
      return candidateActions.handleGetCandidatesPage(payload, sessionToken);
    // Mail inbox
    case 'reviewForm':
      return mailActions.handleReviewForm(payload, sessionToken);
    case 'approveForm':
      return mailActions.handleApproveForm(payload, sessionToken);
    case 'rejectForm':
      return mailActions.handleRejectForm(payload, sessionToken);
    case 'deleteForm':
      return mailActions.handleDeleteForm(payload, sessionToken);
    case 'tandaiDibacaForm':
      return mailActions.handleTandaiDibacaForm(payload, sessionToken);
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
      return extra.handleGetExistingCandidateJsonByWa(payload, sessionToken);
    // Master data (master-full.html, CV)
    case 'getMasterDataByWa':
      return extra.handleGetMasterDataByWa(payload, sessionToken);
    case 'getDrafCvMaster':
      return extra.handleGetDrafCvMaster(payload, sessionToken);
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

// ---------------------------------------------------------------------------
// share-data — viewer TSK publik (share.html?job=KODE). Dipanggil LANGSUNG
// via GET dari netlify/functions/share-data.js (redirect /api/share-data),
// bukan lewat dispatch POST seperti aksi lain.
// ---------------------------------------------------------------------------
async function handleShareData(jobCode) {
  const code = String(jobCode || '').trim();
  if (!code) return { error: 'Kode job tidak ditemukan.' };
  try {
    // Jalur cepat: cari baris job via query server-side (filter code_job).
    let jobRow = await supabase.findJobByCodeFiltered(code);
    if (jobRow === undefined) {
      const found = await supabase.findJobs();
      jobRow =
        found.rows.find((r) => String(supabase.pick(r, ['code_job', 'code']) || '') === code) ||
        null;
    }
    if (!jobRow) return { error: 'Kode job tidak ditemukan: ' + code };
    const name = supabase.toText(
      supabase.pick(jobRow, ['pekerjaan', 'nama_pekerjaan', 'judul', 'title']),
    );
    // Kandidat yang ter-approve untuk job ini (id_loker_pilihan berisi kode).
    // Jalur cepat: filter server-side via ilike, lalu verifikasi token eksak di
    // JS (kode bisa banyak dipisah koma) supaya tidak salah tangkap.
    let candRows = await supabase.findCandidatesByJobFiltered(code);
    if (candRows === undefined) {
      const cands = await supabase.findCandidates();
      candRows = cands.rows;
    }
    const rows = (Array.isArray(candRows) ? candRows : []).filter((r) =>
      String(supabase.pick(r, ['id_loker_pilihan', 'id_loker']) || '')
        .split(',')
        .map((s) => s.trim())
        .includes(code),
    );
    const mapped = rows.map(supabase.mapCandidate);
    // extraDocs: SEMUA file folder master kandidat (KK/KTP/ijazah/dll) KECUALI
    // yang sudah jadi tombol utama (pas_photo, file_cv, jft, ssw) — persis
    // perilaku backend lama (produksi). Folder = master/<NAMA_HURUF_KAPITAL>/
    // (spasi → underscore), didaftarkan via Supabase Storage list API.
    const storageBase = supabase.supabaseUrl().replace(/\/$/, '');
    const pubBase = storageBase + '/storage/v1/object/public/asj-files/';
    // Jalur cepat: tarik lamaran hanya untuk WA kandidat job ini (in-filter),
    // bukan scan 500 baris inbox — cukup untuk membangun byWa extra docs.
    const waList = mapped.map((c) => supabase.normalizeWa(String(c.wa || ''))).filter(Boolean);
    let forms = await supabase.findFormsByWaList(waList);
    if (forms === undefined) forms = await supabase.findForms();
    const byWa = new Map();
    for (const f of forms) {
      const w = supabase.normalizeWa(String(f.no_wa || f.wa || f.whatsapp || ''));
      if (!w) continue;
      if (!byWa.has(w)) byWa.set(w, []);
      for (const d of supabase.parseDocs(supabase.toText(f.keterangan))) byWa.get(w).push(d);
    }
    const candidates = [];
    for (const c of mapped) {
      const folder =
        'master/' +
        String(c.nama || '')
          .toUpperCase()
          .replace(/\s+/g, '_') +
        '/';
      let names = [];
      try {
        names = await supabase.listStorageFolder(folder);
      } catch {
        /* non-fatal: tanpa folder → tanpa tombol ekstra */
      }
      // Tombol utama (pas_photo/file_cv/jft/ssw) sudah tampil — file folder
      // yang TIPENYA sama tidak boleh dobel (mis. CVFILE lama vs baru, atau
      // "1. X_CV.xlsx" lawas vs CVFILE_… baru). CV/JFT/SSW/foto SELALU
      // dianggap tipe utama (punya tombol sendiri), sisanya (KK/KTP/ijazah/
      // passport/dll) jadi tombol ekstra.
      const mainBasenames = [c.pasPhoto, c.fileCv, c.jft, c.ssw]
        .map((u) => {
          try {
            return decodeURIComponent(
              String(u || '')
                .split('/')
                .pop(),
            );
          } catch {
            return String(u || '')
              .split('/')
              .pop();
          }
        })
        .filter(Boolean);
      const mainTypes = new Set(['CV', 'JFT', 'SSW', 'PHOTO']);
      for (const b of mainBasenames) {
        const t = docTypeOf(b);
        if (t) mainTypes.add(t);
      }
      // Dedupe per tipe dokumen: upload lama tidak boleh menimbulkan tombol
      // dobel — cukup file TERBARU per tipe (KK/KTP/CV dst).
      const byType = new Map();
      for (const n of names) {
        if (mainBasenames.indexOf(n) !== -1) continue;
        const t = docTypeOf(n);
        if (mainTypes.has(t)) continue;
        const prev = byType.get(t);
        if (!prev || docAge(n) > docAge(prev.name)) {
          byType.set(t, { name: n, url: pubBase + folder + encodeURIComponent(n) });
        }
      }
      const extraDocs = [...byType.values()];
      // Gabungkan juga dokumen dari keterangan form (NAMA:URL;...) — dedupe
      // per URL biar tidak dobel dengan folder master.
      const formDocs = byWa.get(supabase.normalizeWa(String(c.wa || ''))) || [];
      const seenUrl = new Set(extraDocs.map((d) => d.url));
      for (const d of formDocs) {
        if (!seenUrl.has(String(d.url))) {
          seenUrl.add(String(d.url));
          extraDocs.push(d);
        }
      }
      // Foto: kalau pas_photo kandidat kosong/basi (404), pakai file foto dari
      // folder master (PHOTOFILE/PAS_PHOTO/FOTO) — folder di-list di atas.
      let pasPhoto = c.pasPhoto;
      if (!pasPhoto || pasPhoto === '-') {
        const photoFile = names.find((n) => docTypeOf(n) === 'PHOTO');
        if (photoFile) pasPhoto = pubBase + folder + encodeURIComponent(photoFile);
      }
      candidates.push({
        id_kandidat: c.idKandidat,
        no_wa: c.wa,
        nama_lengkap: c.nama,
        gender: c.gender,
        usia: c.usia,
        tb: c.tb,
        bb: c.bb,
        pas_photo: pasPhoto,
        file_cv: c.fileCv,
        jft: c.jft,
        ssw: c.ssw,
        nilai_jft_text: c.jftText,
        bidang_ssw_text: c.sswText,
        extraDocs,
      });
    }
    const tsk = supabase.toText(supabase.pick(jobRow, ['tsk', 'pengurus']));
    return { job: { code, name, tsk }, candidates };
  } catch (e) {
    return { error: 'Gagal memuat data share: ' + e.message };
  }
}

// Tipe dokumen dari nama file. Kenali pola baru (KK_1786…pdf → KK,
// CVFILE_1786…xlsx → CVFILE) DAN pola lawas (1. X_CV.xlsx → CV,
// 1._X_JFT.pdf → JFT, nama_jft.pdf → JFT, X_PAS_PHOTO.jpg → PHOTO)
// lalu normalisasi alias ke tipe kanonik (CVFILE→CV, PHOTOFILE→PHOTO, …).
// Dipakai dedupe extraDocs supaya 1 loker = 1 CV/JFT/SSW/foto (tidak dobel).
const TYPE_ALIAS = {
  CVFILE: 'CV',
  FILE_CV: 'CV',
  CV_REVISI: 'CV',
  PHOTOFILE: 'PHOTO',
  PAS_PHOTO: 'PHOTO',
  PASSPHOTO: 'PHOTO',
  FOTO: 'PHOTO',
  PHOTO: 'PHOTO',
  JFTFILE: 'JFT',
  SSWFILE: 'SSW',
  KARTU_KELUARGA: 'KK',
};
// Token tipe yang dicari di nama lawas (lebih panjang dulu agar tidak
// salah tangkap: PAS_PHOTO sebelum PHOTO/FOTO, KARTU_KELUARGA sebelum KK).
const TYPE_TOKENS = [
  'PAS_PHOTO',
  'PHOTOFILE',
  'KARTU_KELUARGA',
  'CVFILE',
  'FILE_CV',
  'CV_REVISI',
  'JFTFILE',
  'SSWFILE',
  'PASSPHOTO',
  'PASSPORT',
  'IJAZAH',
  'KTP',
  'KK',
  'CV',
  'JFT',
  'SSW',
  'FOTO',
  'PHOTO',
];
function docTypeOf(name) {
  const base = String(name || '').replace(/\.[a-z0-9]+$/i, '');
  const m = base.match(/^[A-Z]+/);
  const raw = m ? m[0] : null;
  let t = raw;
  if (!t) {
    const up = base.toUpperCase();
    const hit = TYPE_TOKENS.find((tk) => up.includes(tk));
    t = hit || up;
  }
  return TYPE_ALIAS[t] || t;
}

// Usia file dari suffix numerik nama (ms epoch) — makin besar makin baru.
function docAge(name) {
  const m = String(name || '').match(/_(\d{10,})/);
  return m ? Number(m[1]) : 0;
}

module.exports = { handleAction, NOT_IMPLEMENTED, handleShareData, docTypeOf };
