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

const session = require('./session');
const extra = require('./actions-extra');
const schedule = require('./actions-schedule');
const wa = require('./actions-wa');
const config = require('./actions-config');
const ai = require('./actions-ai');
const rateLimit = require('./rate-limit');
const publicData = require('./actions-public');
const auth = require('./actions-auth');
// Modul domain (Fase 1.1c): lowongan, kandidat, mail inbox — dipindah dari
// file ini, dispatcher tinggal memetakan action → handler modul.
const jobActions = require('./actions-job');
const candidateActions = require('./actions-candidate');
const mailActions = require('./actions-mail');
const shareActions = require('./actions-share');
const diagnostics = require('./actions-diagnostics');

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
// Fase 1.1d (2026-08-16): handleGetAppConfig dipindah ke
// actions-diagnostics.js (diagnostik backend, wajib sesi admin).

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
      return diagnostics.handleGetAppConfig(sessionToken);
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
      return schedule.handleSimpanJadwalBaru(payload, sessionToken);
    case 'hapusJadwal':
      return schedule.handleHapusJadwal(payload, sessionToken);
    case 'tambahTugasBaru':
      return schedule.handleTambahTugasBaru(payload, sessionToken);
    case 'setTugasStatus':
      return schedule.handleSetTugasStatus(payload, sessionToken);
    case 'hapusTugas':
      return schedule.handleHapusTugas(payload, sessionToken);
    case 'checkAndSendAgendaReminders':
      return { success: true, sent: 0 };
    // Template & kirim WA (Fonnte)
    case 'simpanWaTemplate':
      return wa.handleSimpanWaTemplate(payload, sessionToken);
    case 'hapusWaTemplate':
      return wa.handleHapusWaTemplate(payload, sessionToken);
    case 'kirimSatuPesanFonnte':
      return wa.handleKirimSatuPesanFonnte(payload, sessionToken);
    case 'kirimTawaranMassal':
      return wa.handleKirimTawaranMassal(payload, sessionToken);
    // Konfigurasi sistem
    case 'updateSysConfig':
      return config.handleUpdateSysConfig(payload, sessionToken);
    // Preset rincian biaya
    case 'getRincianPresets':
      return config.handleGetRincianPresets(payload, sessionToken);
    case 'saveRincianPreset':
      return config.handleSaveRincianPreset(payload, sessionToken);
    case 'deleteRincianPreset':
      return config.handleDeleteRincianPreset(payload, sessionToken);
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

// Fase 1.1d (2026-08-16): handleShareData, docTypeOf, docAge, TYPE_ALIAS,
// TYPE_TOKENS dipindah ke actions-share.js (viewer TSK publik via GET).
// share-data.js & serve-static.mjs tetap kompat via re-export di bawah.

// handleShareData & docTypeOf di-re-export dari actions-share supaya wrapper
// lama (netlify/functions/share-data.js, serve-static.mjs) tetap kompat.
module.exports = {
  handleAction,
  NOT_IMPLEMENTED,
  handleShareData: shareActions.handleShareData,
  docTypeOf: shareActions.docTypeOf,
};
