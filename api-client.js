// ============================================================
// api-client.js — Bridge ke Netlify Functions + Supabase
// ============================================================
// Seluruh backend sudah dipindah dari Google Apps Script ke Netlify Functions
// + Supabase. Semua action di bawah ini punya implementasi Netlify sendiri;
// tidak ada jalur GAS sama sekali (callAPI murni POST ke /.netlify/functions).

const NETLIFY_API_BASE = '/.netlify/functions';

// Aksi yang hanya boleh dipakai kandidat yang SUDAH LOGIN (session kandidat
// asli dari server, bukan hanya nomor WA). callAPI menempelkan asj_kandidat_session
// ke body request untuk action ini, dan backend memvalidasinya (WA harus cocok).
const CANDIDATE_ACTIONS = new Set([
  'getMasterDataByWa',
  'submitMasterForm',
  // M2 (REVIEW.md): getExistingCandidateJsonByWa memakai gerbang sesi —
  // kirim token supaya kandidat/admin tetap dapat data penuh (prefill).
  'getExistingCandidateJsonByWa',
  'getDrafCvMaster',
  'simpanUpdateMaster',
  'simpanBiodataLengkap',
  'simpanRevisiKandidat',
  'simpanBerkasTahapan',
  'simpanDataTtdNaitei',
  'gantiPasswordKandidat',
  // AI CV (ai_form, flow=master) dipakai KANDIDAT (VIP) DAN ADMIN (tombol AI CV
  // di tabel admin → bridge window berbagi localStorage). Kirim token yang
  // sedang aktif: utamakan admin supaya server bisa izinkan admin membuka AI CV
  // untuk kandidat non-VIP (guard VIP tetap berlaku untuk kandidat).
  'processAIChat',
  // Submit AI form (ai_form, saveToDatabase) dipakai KANDIDAT (data sendiri,
  // sesi harus cocok dengan WA yang dikirim) DAN ADMIN (bridge, WA apa pun).
  // Backend ai-form-submit.ts memvalidasi: admin valid ATAU kandidat pemilik WA
  // itu — selainnya 401 (anti spoof WA: tanpa sesi, data tidak bisa ditimpa).
  'submitDataAsj',
]);

const ADMIN_ACTIONS = new Set([
  'approveForm',
  'editLokerFull',
  'hapusJadwal',
  'hapusJobData',
  'hapusWaTemplate',
  'kirimSatuPesanFonnte',
  'rejectForm',
  'reviewForm',
  'setTugasStatus',
  'simpanJadwalBaru',
  'simpanJobBaru',
  'simpanWaTemplate',
  'superSyncCleanup',
  'tambahTugasBaru',
  'ubahStatusJob',
  'updateCatatanKandidat',
  'updateKandidatSuper',
  'getCandidatesPage',
  'deleteForm',
  'updateTahapanDbJob',
  'simpanKandidatDanUpload',
  'tandaiGagalJob',
  'updateDokumenShare',
  'getRincianPresets',
  'saveRincianPreset',
  'deleteRincianPreset',
  'runMigration',
  'getDriveLinkCandidates',
  'uploadDriveReplacement',
  // Aksi admin yang dulu tanpa gerbang server (audit keamanan 2026-08-09) -
  // sekarang wajib sesi admin di backend, jadi frontend harus kirim sessionToken.
  'updateSysConfig',
  'getAppConfig',
  'getDaftarSiswaBaru',
  'kirimTawaranMassal',
  'processAdminAIChat',
  'getAdminAiContext',
  'buildAdminAiCandidateSummary',
  // Signed upload URL ke Storage (files.ts) - sekarang wajib sesi admin.
  'getUploadUrls',
]);

const NETLIFY_FUNCTIONS = {
  // AI (Gemini)
  processAIChat: 'ai-chat',
  processAdminAIChat: 'ai-chat',
  processSiswaAIChat: 'ai-chat',
  processAiInterview: 'ai-chat',
  // Form AI + upload berkas
  submitDataAsj: 'ai-form-submit',
  submitDaftarSiswa: 'ai-form-submit',
  simpanDataTtdNaitei: 'ai-form-submit',
  // Context AI admin
  getAdminAiContext: 'admin-ai-context',
  buildAdminAiCandidateSummary: 'admin-ai-context',
  // Jadwal & tugas
  checkAndSendAgendaReminders: 'schedule-reminders',
  simpanJadwalBaru: 'schedule-reminders',
  hapusJadwal: 'schedule-reminders',
  tambahTugasBaru: 'schedule-reminders',
  setTugasStatus: 'schedule-reminders',
  // WhatsApp (Fonnte)
  kirimTawaranMassal: 'whatsapp',
  kirimSatuPesanFonnte: 'whatsapp',
  simpanWaTemplate: 'whatsapp',
  hapusWaTemplate: 'whatsapp',
  // Konfigurasi sistem
  getAppConfig: 'config',
  updateSysConfig: 'config',
  // File generik (Supabase Storage) - hanya getUploadUrls (upload/list/delete
  // generik dihapus dari files.ts karena tidak dipakai & tanpa gerbang admin)
  getUploadUrls: 'files',
  // Data utama aplikasi
  getAppData: 'get-app-data',
  // Auth & akun
  daftarKandidat: 'auth',
  loginKandidat: 'auth',
  checkAdminMaster: 'auth',
  checkAdminPersonal: 'auth',
  gantiPasswordKandidat: 'auth',
  logout: 'auth',
  // Lamaran publik (apply-full.html)
  cekDataPelamar: 'apply',
  isJobRequiresCv: 'apply',
  submitApply: 'apply',
  getExistingCandidateJsonByWa: 'apply',
  // Data master kandidat (master-full.html + admin)
  getMasterDataByWa: 'master-data',
  submitMasterForm: 'master-data',
  getDrafCvMaster: 'master-data',
  simpanUpdateMaster: 'master-data',
  simpanKandidatDanUpload: 'master-data',
  simpanBiodataLengkap: 'master-data',
  simpanRevisiKandidat: 'master-data',
  simpanBerkasTahapan: 'master-data',
  // Manajemen loker (admin)
  simpanJobBaru: 'jobs',
  editLokerFull: 'jobs',
  ubahStatusJob: 'jobs',
  hapusJobData: 'jobs',
  updateTahapanDbJob: 'jobs',
  tandaiGagalJob: 'jobs',
  updateDokumenShare: 'jobs',
  // Manajemen kandidat (admin)
  updateKandidatSuper: 'candidates',
  getCandidatesPage: 'candidates',
  updateCatatanKandidat: 'candidates',
  approveForm: 'candidates',
  rejectForm: 'candidates',
  reviewForm: 'candidates',
  deleteForm: 'candidates',
  // Link bridge & siswa baru
  getDaftarSiswaBaru: 'bridge-links',
  getLinkSiswaBaru: 'bridge-links',
  generateFormBridge: 'bridge-links',
  generateLegacyMasterBridge: 'bridge-links',
  generateAiFormBridge: 'bridge-links',
  // Sinkronisasi & pembersihan data
  superSyncCleanup: 'admin-sync',
  // Preset Rincian Biaya (koleksi admin)
  getRincianPresets: 'rincian-presets',
  saveRincianPreset: 'rincian-presets',
  deleteRincianPreset: 'rincian-presets',
  // Migrasi database (tombol di tab Pengaturan)
  runMigration: 'run-migration',
  // Migrasi kandidat dari link Google Drive ke Storage
  getDriveLinkCandidates: 'drive-links',
  uploadDriveReplacement: 'drive-links',
};

function getApiUrl(action) {
  const funcName = NETLIFY_FUNCTIONS[action];
  return NETLIFY_API_BASE + '/' + (funcName || action);
}

async function callAPI(action, payload) {
  const funcName = NETLIFY_FUNCTIONS[action];
  if (!funcName) {
    console.error('[api-client] Tidak ada function Netlify terdaftar untuk action:', action);
    return { success: false, error: 'Aksi tidak dikenal: ' + action };
  }

  const url = NETLIFY_API_BASE + '/' + funcName;
  const body = { action: action, payload: payload };

  if (action === 'logout') {
    // Logout dipakai admin DAN kandidat - kirim token yang sedang aktif
    // (utamakan admin kalau keduanya login di perangkat yang sama).
    body.sessionToken =
      (localStorage.getItem('asj_admin_login') === 'sukses'
        ? localStorage.getItem('asj_admin_session')
        : localStorage.getItem('asj_kandidat_session')) || '';
  } else if (
    ADMIN_ACTIONS.has(action) ||
    (action === 'getAppData' && payload && payload[0] === 'admin')
  ) {
    body.sessionToken = localStorage.getItem('asj_admin_session') || '';
  } else if (
    CANDIDATE_ACTIONS.has(action) ||
    (action === 'getAppData' && payload && payload[0] === 'kandidat')
  ) {
    // Beberapa action dipakai ADMIN dan KANDIDAT (mis. getDrafCvMaster untuk
    // preview CV dari tabel admin, getMasterDataByWa). Kalau admin sedang
    // login, kirim token admin; kalau tidak, token kandidat.
    body.sessionToken =
      (localStorage.getItem('asj_admin_login') === 'sukses'
        ? localStorage.getItem('asj_admin_session')
        : localStorage.getItem('asj_kandidat_session')) || '';
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      redirect: 'follow',
    });
    const text = await res.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      parsed = { success: false, message: text };
    }
    if (parsed && parsed.sessionInvalid) {
      localStorage.removeItem('asj_admin_login');
      localStorage.removeItem('asj_admin_session');
      localStorage.removeItem('asj_kandidat_login');
      localStorage.removeItem('asj_kandidat_name');
      localStorage.removeItem('asj_kandidat_wa');
      localStorage.removeItem('asj_kandidat_session');
      window.location.reload();
    }
    return parsed;
  } catch (err) {
    console.error('[Netlify Error]', action, err);
    return { success: false, error: err.message || 'Network error' };
  }
}

function callNetlify(action, payload) {
  return callAPI(action, payload);
}

// ============================================================
// esc() / escJs() — escape HTML global (REVIEW.md S1).
// Dipakai SEMUA halaman (bundel index/admin + halaman standalone)
// untuk data user-supplied sebelum masuk ke innerHTML / atribut /
// argumen onclick. esc() untuk teks & atribut; escJs() untuk nilai
// yang disisipkan ke string JS di dalam onclick (escape \ dan kutip).
// ============================================================
function esc(x) {
  return String(x == null ? '' : x)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escJs(x) {
  // Nilai disisipkan ke string JS DI DALAM atribut HTML ber-tanda kutip
  // ganda: onclick="fn('...')". Dua lapis yang harus dijaga:
  //   1) JS: \\ -> \\\\ dulu, lalu ' -> \\' (urutan ini wajib supaya
  //      payload \\ + ' tidak merusak literal string).
  //   2) HTML: & < > " -> entity. Tanpa ini, " di payload tetap
  //      memutus atribut (\\" bukan escape HTML) dan sisanya bocor
  //      menjadi atribut baru (stored XSS — diverifikasi di browser).
  //      Entity ter-decode balik oleh parser HTML sebelum masuk ke JS,
  //      jadi string JS-nya tetap utuh dan aman.
  return String(x == null ? '' : x)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/[\r\n\u2028\u2029]/g, ' ');
}

window.esc = esc;
window.escJs = escJs;

// Semua pemanggilan di frontend memakai callAPI() langsung ke Netlify Functions
// + Supabase — tidak ada lagi jalur Google Apps Script / callGAS.
