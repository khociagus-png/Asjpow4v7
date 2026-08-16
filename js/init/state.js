// MODUL BARU (Fase 2 REFACTOR_TODO.md): js/02_init.js dipecah per domain →
// js/init/{state,theme,util,preview,nav,boot}.js. Deklarasi byte-identik dari
// 02_init.js — perilaku tidak berubah.
// ==========================================
// STATE GLOBAL — semua variabel global aplikasi (data dashboard, filter,
// sesi aktif, timer). Diinisialisasi saat script dimuat (urutan STACK).
// ==========================================
var ALL_JOBS = [];
var ALL_DB_JOBS = [];
var ALL_CANDIDATES = [];
var ALL_SCHEDULES = [];
var ALL_TUGAS = [];
var ALL_FORM = [];
var ALL_WA_TEMPLATES = [];
var ALL_RIWAYAT_KANDIDAT = [];
var ASSETS = {};
var CURRENT_THEME = 'TOKYO';
var DROPDOWNS = {};
var isAdmin = false;
var isKandidat = false;
var currentAdminName = '';
var currentKandidatName = '';
var currentKandidatWa = '';
var currentKandidatId = '';
var limitPub = 10,
  limitAdm = 10,
  limitKan = 10,
  limitJad = 10,
  limitDb = 10;
var dbSortType = 'TERBARU',
  dbFilterBidang = 'ALL',
  dbFilterTahapan = 'ALL';
var mailFilterStatus = 'MENUNGGU';
var mailSearchText = '';
var currentPublicFilter = 'ALL';
var currentCopyListTxt = '';
var CURRENT_WA_KANDIDAT = null;
var PREV_MAIL_COUNT = null;
var AUTO_REFRESH_TIMER = null;

// Variabel state untuk Modal Pemberkasan Sentral
let ACTIVE_PEMBERKASAN_WA = '';
let ACTIVE_PEMBERKASAN_NAMA = '';
