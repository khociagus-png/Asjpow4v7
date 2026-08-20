'use strict';
// =============================================================================
// action-registry.js — SATU-SATUNYA sumber kebenaran kontrak action backend.
// -----------------------------------------------------------------------------
// Tabel nama action → handler + grup rate limit. Dispatcher (handlers.js)
// memakai tabel ini — bukan switch string. Test kontrak
// (action-registry.test.js) memastikan:
//   - setiap action yang dipanggil frontend (callAPI) ADA di tabel ini,
//   - grup rate limit (LOGIN/AI/FONNTE) hanya berisi action yang terdaftar.
// Tambah action baru = tambah 1 baris DI SINI (jangan di switch lagi).
// =============================================================================

const publicData = require('./actions-public');
const diagnostics = require('./actions-diagnostics');
const auth = require('./actions-auth');
const jobActions = require('./actions-job');
const aiChat = require('./ai/chat');
const aiClassify = require('./ai/classify');
const candidateActions = require('./actions-candidate');
const mailActions = require('./actions-mail');
const upload = require('./actions-upload');
const master = require('./actions-master');
const schedule = require('./actions-schedule');
const wa = require('./actions-wa');
const config = require('./actions-config');
const register = require('./actions-register');
const drive = require('./actions-drive');
const aiCv = require('./ai/cv');

// nama action → handler(payload, sessionToken). Handler dengan arity lebih
// kecil aman (argumen ekstra diabaikan JS).
const ACTION_HANDLERS = {
  // Data publik & diagnostik
  getAppData: publicData.handleGetAppData,
  getMonthlyReport: publicData.handleGetMonthlyReport,
  getAppConfig: diagnostics.handleGetAppConfig,
  reportWebVital: diagnostics.handleReportWebVital,
  // Auth
  checkAdminMaster: auth.handleCheckAdminMaster,
  checkAdminPersonal: auth.handleCheckAdminPersonal,
  refreshAdminSession: auth.handleRefreshAdminSession,
  refreshKandidatSession: auth.handleRefreshKandidatSession,
  loginKandidat: auth.handleLoginKandidat,
  daftarKandidat: auth.handleDaftarKandidat,
  gantiPasswordKandidat: auth.handleGantiPasswordKandidat,
  registerFcmToken: auth.registerFcmToken,
  logout: () => ({ success: true }),
  // Kelola lowongan
  simpanJobBaru: jobActions.handleSimpanJobBaru,
  editLokerFull: jobActions.handleEditLokerFull,
  ubahStatusJob: jobActions.handleUbahStatusJob,
  hapusJobData: jobActions.handleHapusJobData,
  updateTahapanDbJob: jobActions.handleUpdateTahapanDbJob,
  updateDokumenShare: jobActions.handleUpdateDokumenShare,
  tandaiGagalJob: jobActions.handleTandaiGagalJob,
  // Kelola kandidat
  updateCatatanKandidat: candidateActions.handleUpdateCatatanKandidat,
  updateKandidatSuper: candidateActions.handleUpdateKandidatSuper,
  getCandidatesPage: candidateActions.handleGetCandidatesPage,
  // Mail inbox
  reviewForm: mailActions.handleReviewForm,
  approveForm: mailActions.handleApproveForm,
  rejectForm: mailActions.handleRejectForm,
  deleteForm: mailActions.handleDeleteForm,
  tandaiDibacaForm: mailActions.handleTandaiDibacaForm,
  // Upload & file
  getUploadUrls: upload.handleGetUploadUrls,
  // Lamaran publik (apply-full.html)
  cekDataPelamar: upload.handleCekDataPelamar,
  isJobRequiresCv: upload.handleIsJobRequiresCv,
  submitApply: upload.handleSubmitApply,
  getExistingCandidateJsonByWa: upload.handleGetExistingCandidateJsonByWa,
  // Master data (master-full.html, CV)
  getMasterDataByWa: master.handleGetMasterDataByWa,
  getDrafCvMaster: master.handleGetDrafCvMaster,
  submitMasterForm: master.handleSubmitMasterForm,
  simpanBiodataLengkap: master.handleSubmitMasterForm,
  simpanUpdateMaster: master.handleSimpanUpdateMaster,
  simpanKandidatDanUpload: upload.handleSimpanKandidatDanUpload,
  simpanBerkasTahapan: upload.handleSimpanBerkasTahapan,
  simpanRevisiKandidat: upload.handleSimpanRevisiKandidat,
  // Jadwal & tugas
  simpanJadwalBaru: schedule.handleSimpanJadwalBaru,
  hapusJadwal: schedule.handleHapusJadwal,
  tambahTugasBaru: schedule.handleTambahTugasBaru,
  setTugasStatus: schedule.handleSetTugasStatus,
  hapusTugas: schedule.handleHapusTugas,
  checkAndSendAgendaReminders: () => ({ success: true, sent: 0 }),
  // Template & kirim WA (Fonnte)
  simpanWaTemplate: wa.handleSimpanWaTemplate,
  hapusWaTemplate: wa.handleHapusWaTemplate,
  kirimSatuPesanFonnte: wa.handleKirimSatuPesanFonnte,
  kirimTawaranMassal: wa.handleKirimTawaranMassal,
  // Konfigurasi sistem
  updateSysConfig: config.handleUpdateSysConfig,
  // Preset rincian biaya
  getRincianPresets: config.handleGetRincianPresets,
  saveRincianPreset: config.handleSaveRincianPreset,
  deleteRincianPreset: config.handleDeleteRincianPreset,
  // Siswa baru
  getDaftarSiswaBaru: register.handleGetDaftarSiswaBaru,
  submitDaftarSiswa: register.handleSubmitDaftarSiswa,
  // Link & bridge (QR / form)
  getLinkSiswaBaru: register.handleGetLinkSiswaBaru,
  generateFormBridge: register.handleGenerateFormBridge,
  generateLegacyMasterBridge: register.handleGenerateLegacyMasterBridge,
  generateAiFormBridge: register.handleGenerateAiFormBridge,
  // Drive links & migrasi
  getDriveLinkCandidates: drive.handleGetDriveLinkCandidates,
  uploadDriveReplacement: drive.handleUploadDriveReplacement,
  runMigration: drive.handleRunMigration,
  // AI (Gemini) & submit AI form
  processAIChat: aiChat.handleProcessAIChat,
  processAdminAIChat: aiChat.handleProcessAdminAIChat,
  processSiswaAIChat: aiChat.handleProcessSiswaAIChat,
  processAiInterview: aiChat.handleProcessAiInterview,
  generateWawancaraModel: aiChat.handleGenerateWawancaraModel,
  simpanHasilWawancara: aiChat.handleSimpanHasilWawancara,
  selesaikanWawancara: aiChat.handleSelesaikanWawancara,
  getHasilWawancara: aiChat.handleGetHasilWawancara,
  parseDokumenBiodata: aiClassify.handleParseDokumenBiodata,
  getAdminAiContext: aiCv.handleGetAdminAiContext,
  buildAdminAiCandidateSummary: aiCv.handleBuildAdminAiCandidateSummary,
  submitDataAsj: aiCv.handleSubmitDataAsj,
  simpanDataTtdNaitei: aiCv.handleSimpanDataTtdNaitei,
};

// Grup rate limit (REVIEW.md M3) — dipakai handlers.js (rateLimitChecks &
// lockout login). Hanya berisi action yang terdaftar di atas (dijaga test).
const LOGIN_ACTIONS = new Set([
  'checkAdminMaster',
  'checkAdminPersonal',
  'refreshAdminSession',
  'refreshKandidatSession',
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

module.exports = { ACTION_HANDLERS, LOGIN_ACTIONS, AI_ACTIONS, FONNTE_ACTIONS };
