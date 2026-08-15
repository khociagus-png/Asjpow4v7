// ==========================================
// Helper thumbnail Supabase Storage (dipakai 01_public/05_render/share.html):
// tambah ?width=&quality= HANYA untuk URL storage — URL Drive/lh3/ui-avatars/
// data: dikembalikan utuh. Param ini diaktifkan setelah "Image Transformations"
// dinyalakan di dashboard Supabase (gratis); TANPA toggle itu param diabaikan
// server & URL asli tetap valid (aman dipakai sekarang — tidak ada regresi).
// ==========================================
function thumbnailUrl(url, width) {
  if (!url || typeof url !== 'string') return url;
  if (!/^https?:\/\/[^/]+\/storage\/v1\/object\/public\//i.test(url)) return url;
  var sep = url.indexOf('?') >= 0 ? '&' : '?';
  return url + sep + 'width=' + (width || 300) + '&quality=80';
}

// 2. VARIABEL GLOBAL & INISIALISASI
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

// Hanya 2 theme publik: DARK (Tokyo) & LIGHT (Sakura). INTER_VIP khusus
// admin KHOCI (easter egg internal), tidak muncul sebagai tombol.
// Sakura = gradien pink REDUP (kustom muted, bukan rose-100 yang pekat)
// supaya tidak menyilaukan dan teks tetap kontras.
var THEMES = {
  SAKURA: {
    bg: 'bg-gradient-to-b from-[#bda8ae] via-[#cbb4bb] to-[#cbb4bb] text-stone-900',
    border: 'border-rose-400/60',
    head: 'bg-pink-800 text-white',
  },
  TOKYO: {
    bg: 'bg-slate-950 text-slate-100',
    border: 'border-slate-800',
    head: 'bg-slate-800 text-slate-200',
  },
  INTER_VIP: {
    bg: 'bg-slate-950 text-blue-50',
    border: 'border-blue-700',
    head: 'bg-blue-900 text-yellow-400',
  },
};

// SATU tombol theme: menampilkan theme aktif (Dark/Light), ditekan = ganti
// otomatis ke theme lainnya. Gaya pill mirip tombol ID-JP.
function renderThemeToggle() {
  var btn = document.getElementById('theme-toggle-btn');
  if (!btn) return;
  var light = CURRENT_THEME === 'SAKURA';
  btn.className =
    'px-3 py-2 rounded-full text-[10px] font-bold transition-colors shadow-lg flex items-center gap-1.5 border ' +
    (light
      ? 'bg-white text-slate-900 border-white shadow-xl scale-105'
      : 'bg-white/10 hover:bg-white/20 text-slate-200 border-white/25 hover:border-white/40');
  btn.innerHTML = light
    ? '<i class="fas fa-sun"></i> <span>Light</span>'
    : '<i class="fas fa-moon"></i> <span>Dark</span>';
  btn.title = light ? 'Ganti ke tema Dark (Tokyo)' : 'Ganti ke tema Light (Sakura)';
  // Label "Tema" di bar kontrol ikut menyesuaikan warna (terang/gelap).
  // Di light pakai stone-600 (lebih gelap) supaya kontras cukup di bar putih.
  var lab = document.getElementById('ctrl-label-tema');
  if (lab)
    lab.className =
      'text-[10px] font-bold mr-1 uppercase tracking-widest ' +
      (light ? 'text-stone-600' : 'text-slate-400');
}

// Tekan 1 tombol = ganti theme (Dark ↔ Light), pilihan disimpan di
// localStorage supaya diingat saat pengunjung buka halaman lagi.
function toggleTheme() {
  applyTheme(CURRENT_THEME === 'TOKYO' ? 'SAKURA' : 'TOKYO');
}

// ========== PARTIKEL SAKURA (hanya theme Light) ==========
// Kelopak sakura berjatuhan halus: kecil, tembus pandang, dan
// pointer-events-none sehingga tidak mengganggu baca maupun klik.
// Tiga lapisan biar hidup: jauh (kecil + blur, pelan), normal, dan hero
// (besar, lebih pekat, cepat) — plus dua jalur jatuh yang berbeda.
var SAKURA_PETALS_CREATED = false;
function buatPartikelSakura() {
  var box = document.getElementById('sakura-particles');
  if (!box || SAKURA_PETALS_CREATED) return;
  SAKURA_PETALS_CREATED = true;
  var N = 30; // lebih banyak: 30 kelopak (dari 16)
  for (var i = 0; i < N; i++) {
    var p = document.createElement('div');
    p.className = 'sakura-petal';
    var isHero = i % 9 === 0; // setiap ke-9 = hero (besar, jelas, cepat)
    var isFar = i % 7 === 0; // setiap ke-7 = lapisan jauh (kecil + blur)
    var size = isFar
      ? 5 + Math.random() * 4 // 5-9px
      : isHero
        ? 16 + Math.random() * 8 // 16-24px
        : 8 + Math.random() * 9; // 8-17px
    p.style.width = size + 'px';
    p.style.height = size * (0.8 + Math.random() * 0.3) + 'px'; // rasio bervariasi
    p.style.left = Math.random() * 100 + '%';
    p.style.opacity = (isHero ? 0.5 + Math.random() * 0.25 : 0.15 + Math.random() * 0.35).toFixed(
      2,
    );
    p.style.animationDuration = (isHero ? 7 + Math.random() * 5 : 6 + Math.random() * 13) + 's';
    // Delay negatif: kelopak sudah "di tengah jalan" sejak halaman dibuka
    p.style.animationDelay = -Math.random() * 24 + 's';
    // Variasi jalur jatuh: sakuraFall (standar) / sakuraFall2 (ayunan lebar)
    p.style.animationName = Math.random() < 0.45 ? 'sakuraFall2' : 'sakuraFall';
    p.style.transform = 'rotate(' + Math.random() * 360 + 'deg)';
    // Lapisan jauh sedikit blur (efek kedalaman), memperkuat ilusi 3D
    if (isFar) p.style.filter = 'blur(' + (0.4 + Math.random() * 0.8).toFixed(1) + 'px)';
    box.appendChild(p);
  }
}
function setSakuraParticles(visible) {
  var box = document.getElementById('sakura-particles');
  if (!box) return;
  if (visible) {
    buatPartikelSakura();
    box.classList.remove('hidden');
  } else {
    box.classList.add('hidden');
  }
}

document.addEventListener('DOMContentLoaded', function () {
  injectModalWaPintar();
  refreshDataDinamis(false);

  // admin.html (window.IS_ADMIN_PORTAL) = portal admin khusus.
  // Kalau belum login admin, langsung buka modal login admin supaya
  // halaman benar-benar berfungsi sebagai gerbang panel admin. Kalau
  // sudah login, initApp() sudah otomatis masuk mode admin.
  if (window.IS_ADMIN_PORTAL && localStorage.getItem('asj_admin_login') !== 'sukses') {
    setTimeout(function () {
      if (typeof showLoginAdminMaster === 'function') showLoginAdminMaster();
    }, 500);
  }
});

function applyInterMilanVibe() {
  applyTheme('INTER_VIP');
  var bannerInter = 'https://i.imgflip.com/53px0j.gif';
  var footerInter = 'https://i.imgflip.com/53px0j.gif';
  setBg('asj-header', bannerInter);
  setBg('asj-footer', footerInter);
}

// ==========================================
// 3. FUNGSI PELINDUNG & UTILITAS UTAMA
// ==========================================
function safeSetVal(id, value) {
  var el = document.getElementById(id);
  if (el) el.value = value || '';
}

function normalizePhone(wa) {
  if (!wa) return '';
  let s = String(wa).replace(/\D/g, '');
  if (s.startsWith('0')) {
    s = '62' + s.substring(1);
  } else if (s.startsWith('8')) {
    s = '62' + s;
  }
  return s;
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  const bgColor =
    type === 'success'
      ? 'bg-emerald-600 border-emerald-400'
      : type === 'error'
        ? 'bg-red-600 border-red-400'
        : 'bg-sky-600 border-sky-400';
  const icon =
    type === 'success'
      ? 'fa-check-circle'
      : type === 'error'
        ? 'fa-exclamation-triangle'
        : 'fa-info-circle';
  toast.className =
    'flex items-center gap-3 px-5 py-3.5 rounded-xl border text-white text-sm font-bold shadow-2xl transform transition-transform duration-300 translate-x-full ' +
    bgColor;
  toast.innerHTML = '<i class="fas ' + icon + ' text-lg"></i> <span>' + message + '</span>';
  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.classList.remove('translate-x-full');
  });
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-x-full');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

document.addEventListener('click', function (e) {
  if (e.target.classList.contains('fixed') && e.target.classList.contains('inset-0')) {
    e.target.classList.add('hidden');
  }
});

function safeSet(id, value) {
  var el = document.getElementById(id);
  if (el) {
    el.innerHTML = value;
  }
}
function setImg(id, url) {
  var el = document.getElementById(id);
  if (el && url) el.src = url;
}
function setBg(id, url) {
  var el = document.getElementById(id);
  if (el && url) el.style.backgroundImage = "url('" + url + "')";
}

// Berkas kini selalu di Supabase Storage — URL langsung dipakai apa adanya.
// (Dulu di sini ada konversi link Google Drive; sudah dihapus.)
function getHighResImage(url) {
  if (!url || url === '-') return '';
  return url;
}

function getDirectDownloadUrl(url) {
  if (!url || url === '-' || url.trim() === '') return '';
  return url;
}

// Pendidikan dari DB bisa berupa JSON array 5-baris ('[{"tingkat":"SMA/SMK"}]')
// ATAU teks polos lama ('SMK'). Ambil tingkat pendidikan TERAKHIR yang terbaca
// untuk tampilan ringkas (CV Mini / select). Kalau tidak ada -> ''.
function formatPendidikanTingkat(p) {
  if (p === undefined || p === null || p === '-' || p === '[]' || p === '{}') return '';
  var arr = null;
  if (typeof p === 'string') {
    var t = p.trim();
    if (t.startsWith('[')) {
      try {
        arr = JSON.parse(t);
      } catch (e) {
        arr = null;
      }
    }
  } else if (Array.isArray(p)) arr = p;
  if (arr && arr.length) {
    for (var i = arr.length - 1; i >= 0; i--) {
      var tk = arr[i] && (arr[i].tingkat || arr[i].tingkat_jp || '');
      if (tk && tk !== '-' && String(tk).trim() !== '') return String(tk).trim();
    }
    return '';
  }
  return String(p).trim();
}

// Tipe yang bisa ditampilkan INLINE: gambar/PDF native + format Office
// (xls/xlsx/doc/docx/ppt/pptx) — dirender client-side (SheetJS/mammoth)
// atau MS Office Viewer. Yang TIDAK bisa (zip, rar, 7z, dll) → pesan +
// tombol Unduh.
function isPreviewableFile(url) {
  var u = String(url || '').toLowerCase();
  if (/[.](jpe?g|png|gif|webp|bmp|svg|pdf)([?#].*)?$/i.test(u)) return true;
  if (/[.](xls|xlsx|xlsm|doc|docx|ppt|pptx|odt|ods|odp|txt|rtf|csv)([?#].*)?$/i.test(u))
    return true;
  return false;
}

// URL yang aman untuk iframe preview, per tipe:
//  - gambar/PDF   -> langsung (browser tampilkan native)
//  - Office       -> render client-side (SheetJS/mammoth di 02_init) atau
//                    MS Office Viewer sebagai fallback
//  - lainnya      -> URL asli (browser unduh)
function previewFinalUrl(url) {
  var u = String(url || '');
  var lower = u.toLowerCase();
  var isImage =
    /[.](jpe?g|png|gif|webp|bmp|svg)([?#].*)?$/i.test(lower) || lower.includes('pas_photo');
  var isPdf = /[.]pdf([?#].*)?$/i.test(lower);
  if (isImage || isPdf) return u;
  var isOffice = /[.](doc|docx|xls|xlsx|ppt|pptx)([?#].*)?$/i.test(lower);
  if (isOffice) {
    return 'https://view.officeapps.live.com/op/embed.aspx?src=' + encodeURIComponent(u);
  }
  return u;
}

// Render file Excel (xls/xlsx/xlsm/csv) CLIENT-SIDE via SheetJS -> HTML
// table di iframe preview — tidak bergantung layanan eksternal sama sekali
// (SheetJS langsung fetch URL storage & render).
// Vendor renderer di-load LAZY saat preview pertama dibuka — bukan
// <script> eager di HTML. HANYA XLSX yang dipakai (render CSV di jalur
// kandidat; admin memuatnya eager; share.html punya salinan inline sendiri).
// FIX 2026-08-12: renderDocxKeFrame/renderPptxKeDiv DIHAPUS — tidak ada
// pemanggil (docx/pptx dirute ke MS Office viewer via previewFinalUrl;
// lib mammoth/pptx-preview di index/admin tidak pernah dieksekusi).
// ?v= diisi hash konten oleh scripts/bump-cache-versions.cjs (konstanta
// VENDOR_V) — update vendor tetap memicu cache invalidation. Gagal dimuat
// -> return false -> pesan error + tombol unduh.
var VENDOR_V = { xlsx: '7f749f81a4' }; // diisi bump-cache-versions.cjs
var _vendorPromises = {};
function muatVendorLib(nama) {
  var src = '/vendor/' + { xlsx: 'xlsx.full.min.js' }[nama] + '?v=' + (VENDOR_V[nama] || '');
  if (!_vendorPromises[nama]) {
    _vendorPromises[nama] = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = function () {
        delete _vendorPromises[nama];
        reject(new Error('vendor gagal dimuat: ' + nama));
      };
      document.head.appendChild(s);
    });
  }
  return _vendorPromises[nama];
}

async function renderExcelKeFrame(frame, url) {
  if (typeof XLSX === 'undefined') {
    try {
      await muatVendorLib('xlsx');
    } catch (e) {
      return false;
    }
  }
  if (typeof XLSX === 'undefined') return false;
  try {
    var res = await fetch(url);
    if (!res || !res.ok) return false;
    var buf = await res.arrayBuffer();
    var wb = XLSX.read(buf, { type: 'array' });
    if (!wb || !wb.SheetNames || !wb.SheetNames.length) return false;
    var sheet = wb.Sheets[wb.SheetNames[0]];
    if (!sheet) return false;
    var html = XLSX.utils.sheet_to_html(sheet);
    var nama = decodeURIComponent(String(url).split('/').pop() || 'spreadsheet');
    var doc =
      '<!doctype html><html><head><meta charset="utf-8"><title>' +
      nama +
      '</title>' +
      '<style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#0f172a;color:#e2e8f0;margin:0;padding:16px;font-size:13px}table{border-collapse:collapse;background:#fff;color:#0f172a;min-width:60%}td,th{border:1px solid #cbd5e1;padding:6px 10px;white-space:nowrap}th{background:#e2e8f0;position:sticky;top:0;font-weight:700}tr:nth-child(even) td{background:#f8fafc}td[data-t]{text-align:center}</style>' +
      '</head><body><div style="margin-bottom:10px;color:#94a3b8;font-size:12px">📊 ' +
      nama +
      '</div>' +
      html +
      '</body></html>';
    frame.removeAttribute('src');
    frame.srcdoc = doc;
    return true;
  } catch (e) {
    console.error('[Preview] Excel render gagal:', e);
    return false;
  }
}

// Timer fallback preview: jika iframe gagal load dalam 8 detik, tampilkan
// pesan error + tombol unduh (bukan mengandalkan viewer eksternal).
function _pasangTimerPreviewFallback(frame, url) {
  if (!frame) return;
  var t = setTimeout(function () {
    var lo =
      document.getElementById('preview-loading') ||
      document.getElementById('preview-dokumen-loading') ||
      document.getElementById('cv-inline-loading') ||
      document.getElementById('pdf-loading');
    if (lo && !lo.classList.contains('hidden')) {
      frame.removeAttribute('src');
      frame.srcdoc = pesanPreviewTidakTersedia(url);
      lo.classList.add('hidden');
    }
  }, 8000);
  frame.addEventListener(
    'load',
    function _once() {
      clearTimeout(t);
      frame.removeEventListener('load', _once);
    },
    { once: true },
  );
}

// SATU pintu preview untuk semua pemanggil (admin modal, kandidat):
//  - gambar / PDF         -> native (frame.src = url)
//  - CSV                  -> render lokal SheetJS (srcdoc)
//  - Office (doc/docx/xls/xlsx/ppt/pptx) -> MS Office Viewer (previewFinalUrl)
//  - zip/rar/dll          -> pesan + tombol Unduh (anti auto-download)
//
// FIX 2026-08-12: param pptxHost & tampilkanPptxHost DIHAPUS — render
// lokal docx/pptx sudah dibuang (dead code); semua Office via viewer.
async function previewFileInFrame(frame, url) {
  if (!frame || !url || url === '-') return;
  if (!isPreviewableFile(url)) {
    frame.srcdoc = pesanPreviewTidakTersedia(url);
    return;
  }
  var u = String(url || '');
  var lower = u.toLowerCase();
  var isImage =
    /[.](jpe?g|png|gif|webp|bmp|svg)([?#].*)?$/i.test(lower) || lower.includes('pas_photo');
  var isPdf = /[.]pdf([?#].*)?$/i.test(lower);
  if (isImage || isPdf) {
    frame.classList.remove('hidden');
    frame.removeAttribute('srcdoc');
    frame.src = u;
    return;
  }
  frame.classList.remove('hidden');

  var isOffice = /[.](doc|docx|xls|xlsx|ppt|pptx)([?#].*)?$/i.test(lower);
  if (isOffice) {
    frame.removeAttribute('srcdoc');
    frame.src = previewFinalUrl(u);
    _pasangTimerPreviewFallback(frame, u);
    return;
  }

  if (/[.](csv)([?#].*)?$/i.test(lower)) {
    // Indikator loading di iframe: vendor xlsx di-load lazy (pertama
    // kali) di sisi kandidat — user harus lihat ada proses berjalan,
    // bukan layar diam yang membuat ragu data sudah termuat atau belum.
    frame.srcdoc = pesanLoadingPreview();
    var ok = await renderExcelKeFrame(frame, u);
    if (!ok) {
      console.warn('[Preview] Render lokal gagal, fallback viewer:', u);
      frame.removeAttribute('srcdoc');
      frame.src = previewFinalUrl(u);
      _pasangTimerPreviewFallback(frame, u);
    }
    return;
  }

  frame.removeAttribute('srcdoc');
  frame.src = previewFinalUrl(u);
}

// HTML pesan loading untuk iframe saat vendor renderer (lazy) sedang dimuat
// pertama kali — user harus tahu ada proses berjalan (bukan layar diam).
function pesanLoadingPreview() {
  var judul = tr('ui.preview_loading');
  return (
    '<div style="font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;text-align:center;padding:28px;box-sizing:border-box">' +
    '<div style="font-size:22px">⏳</div>' +
    '<div style="font-size:14px;font-weight:700">' +
    judul +
    '</div>' +
    '</div>'
  );
}

// HTML pesan untuk iframe saat file tidak bisa dipratinjau (anti auto-download).
function pesanPreviewTidakTersedia(url) {
  var ext = (String(url).match(/[.]([a-z0-9]+)([?#].*)?$/i) || [])[1] || '';
  var judul = tr('ui.preview_unavailable');
  var hint = tr('ui.preview_unavailable_hint');
  var unduh = tr('ui.download');
  return (
    '<div style="font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;text-align:center;padding:28px;box-sizing:border-box">' +
    '<div style="font-size:22px">📄</div>' +
    '<div style="font-size:16px;font-weight:700">' +
    judul +
    (ext ? ' <span style="opacity:.6">(.' + ext + ')</span>' : '') +
    '</div>' +
    '<div style="font-size:13px;opacity:.75;max-width:320px">' +
    hint +
    '</div>' +
    '<a href="' +
    String(url).replace(/"/g, '&quot;') +
    '" target="_blank" rel="noopener" style="padding:10px 26px;background:#0284c7;color:#fff;border-radius:999px;text-decoration:none;font-weight:700"><i class="fas fa-download"></i> ' +
    unduh +
    '</a>' +
    '</div>'
  );
}

function populate(id, list) {
  var el = document.getElementById(id);
  if (!el) return;
  var html = '<option value="">-</option>';
  // Label tampil sesuai bahasa (trOption), value TETAP ID asli (trOptionId)
  // supaya data yang dipilih/disimpan tidak berubah.
  if (list && list.length > 0) {
    for (var i = 0; i < list.length; i++)
      html +=
        '<option value="' +
        esc(trOptionId(list[i])) +
        '">' +
        esc(trOption(list[i])) +
        '</option>';
  }
  el.innerHTML = html;
}

// Re-populate semua dropdown/checkbox yang nilainya dari sys config saat
// bahasa diganti — label ikut bahasa baru, value terpilih tetap dipertahankan.
function rePopulateDropdowns() {
  var defs = [
    ['input-kategori', DROPDOWNS.kategori, null],
    ['input-gender', DROPDOWNS.gender, null],
    ['edit-k-tahapan', DROPDOWNS.tahapan, null],
    ['edit-k-status', DROPDOWNS.tahapan, null],
    ['input-tsk', DROPDOWNS.tsk, null],
    ['j-tsk', DROPDOWNS.tsk, null],
    ['input-tahapan-db', DROPDOWNS.tahapan, null],
    ['edit-db-tahapan', DROPDOWNS.tahapan, null],
    ['checkbox-lokasi', DROPDOWNS.lokasi, 'lokasi_cb'],
    ['checkbox-syarat', DROPDOWNS.syarat, 'syarat_cb'],
    ['ef-kategori', DROPDOWNS.kategori, null],
    ['ef-tsk', DROPDOWNS.tsk, null],
    ['ef-gender', DROPDOWNS.gender, null],
  ];
  for (var i = 0; i < defs.length; i++) {
    var el = document.getElementById(defs[i][0]);
    if (!el) continue;
    var prev = el.value; // pertahankan pilihan user saat ganti bahasa
    if (defs[i][2]) populateCheckboxes(defs[i][0], defs[i][1], defs[i][2]);
    else populate(defs[i][0], defs[i][1]);
    if (prev && el.tagName === 'SELECT' && el.value !== prev) el.value = prev;
  }
}

function populateCheckboxes(id, list, nameAttr) {
  var el = document.getElementById(id);
  if (!el) return;
  var html = '';
  // Label dwi bahasa; value tetap ID asli.
  if (list && list.length > 0) {
    for (var i = 0; i < list.length; i++) {
      html +=
        '<label class="flex items-center gap-2 cursor-pointer p-1 hover:bg-white/10 rounded text-slate-300"><input type="checkbox" name="' +
        nameAttr +
        '" value="' +
        esc(trOptionId(list[i])) +
        '" class="accent-red-500"> ' +
        esc(trOption(list[i])) +
        '</label>';
    }
  }
  el.innerHTML = html;
}

function formatInputWA(el) {
  let val = el.value.replace(/\D/g, '');
  if (val.startsWith('0')) {
    val = '62' + val.substring(1);
  } else if (val.startsWith('8')) {
    val = '62' + val;
  }
  el.value = val.length > 0 ? '+' + val : '';
}

function salinTeksDecode(encodedText) {
  var el = document.createElement('textarea');
  el.value = decodeURIComponent(encodedText);
  document.body.appendChild(el);
  el.select();
  try {
    document.execCommand('copy');
    showToast(tr('alert.success'), 'success');
  } catch (err) {}
  document.body.removeChild(el);
}

function toggleMinimize(id, btnEl) {
  const el = document.getElementById(id);
  const icon = btnEl.querySelector('i.fa-chevron-down');
  if (el) el.classList.toggle('hidden');
  if (icon) icon.classList.toggle('rotate-180');
}

function applyTheme(theme) {
  CURRENT_THEME = theme;
  var cfg = THEMES[theme];
  if (!cfg) return;
  var light = theme === 'SAKURA';
  var bodyEl = document.getElementById('asj-body');
  if (bodyEl)
    bodyEl.className =
      'min-h-screen flow-root transition-colors duration-300 ' +
      cfg.bg +
      (light ? ' theme-light' : ' theme-dark');
  var wrap = document.getElementById('public-table-wrap');
  // Theme Light (SAKURA): kartu tabel jadi TERANG (putih) — baris tabel
  // ikut dirender terang oleh renderPublicFiltered (teks gelap, badge terang).
  if (wrap)
    wrap.className =
      'overflow-x-auto rounded-xl border shadow-xl transition-colors ' +
      (light ? 'bg-white/95 border-rose-300/60 shadow-rose-200/30' : cfg.border);
  var head = document.getElementById('public-table-head');
  if (head)
    head.className =
      'text-xs uppercase tracking-wider font-bold border-b transition-colors ' +
      cfg.head +
      ' ' +
      cfg.border;
  // Pemisah baris tabel ikut terang di SAKURA (bukan divide-white).
  var tbody = document.getElementById('public-table-body');
  if (tbody)
    tbody.className =
      'divide-y transition-colors duration-300 ' + (light ? 'divide-rose-100' : 'divide-white/5');
  // Bar kontrol Tema & Filter menyesuaikan terang/gelap (Sakura = light).
  var bar = document.getElementById('public-ctrl-bar');
  if (bar) {
    bar.className =
      'flex flex-wrap justify-between items-center p-4 rounded-xl border shadow-lg mb-6 gap-4 transition-colors ' +
      (light ? 'bg-white/85 border-rose-200/80' : 'bg-black/20 border-white/10');
    bar.querySelectorAll('span.text-slate-400').forEach(function (s) {
      s.className = s.className.replace(
        'text-slate-400',
        light ? 'text-stone-600' : 'text-slate-400',
      );
    });
  }
  // Overlay gelap di header & footer: di theme light tetap cukup pekat di
  // bagian bawah (tempat teks putih) supaya TERBACA, tapi bagian atas
  // dibiarkan lebih terang agar gambar sakura terlihat.
  var overlay = document.getElementById('asj-header-overlay');
  // SAKURA: header jadi banner gelap sedang (scrim 60%) supaya tagline,
  // judul putih, dan tombol putih tetap TERBACA di atas gambar sakura
  // yang terang — gambar sakura masih samar terlihat di balik scrim.
  if (overlay)
    overlay.className =
      'absolute inset-0 rounded-[2.5rem] transition-colors duration-700 ' +
      (light
        ? 'bg-gradient-to-t from-black/90 via-black/60 to-black/60'
        : 'bg-gradient-to-t from-black/95 via-black/40 to-transparent');
  // Tagline header: putih di SAKURA (pink-300 tak bisa 4.5:1 di atas
  // gambar terang walau di-scrim), pink tetap di TOKYO (gelap).
  var tagline = document.getElementById('header-tagline');
  if (tagline)
    tagline.className =
      'text-xs md:text-sm font-bold tracking-[4px] mb-1 ' +
      (light ? 'text-white' : 'text-pink-300');
  var fOverlay = document.getElementById('asj-footer-overlay');
  if (fOverlay)
    fOverlay.className =
      'absolute inset-0 backdrop-blur-sm transition-colors duration-700 ' +
      (light ? 'bg-black/65' : 'bg-black/80');
  // Animasi transisi ganti theme: fade singkat konten publik supaya
  // pergantian terasa halus, tidak melompat.
  var pub = document.getElementById('page-public');
  if (pub && !pub.classList.contains('hidden')) {
    pub.classList.remove('animate-fade-in');
    void pub.offsetWidth; // paksa reflow agar animasi jalan lagi
    pub.classList.add('animate-fade-in');
  }
  // Partikel sakura hanya tampil di theme Light (Sakura).
  setSakuraParticles(theme === 'SAKURA');
  if (ASSETS.BANNER && ASSETS.BANNER[theme]) setBg('asj-header', ASSETS.BANNER[theme]);
  if (ASSETS.FOOTER && ASSETS.FOOTER[theme]) setBg('asj-footer', ASSETS.FOOTER[theme]);
  // Simpan pilihan theme pengunjung.
  try {
    localStorage.setItem('asj_theme', theme);
  } catch (e) {}
  renderThemeToggle();
  if (typeof renderPublicFilterUI === 'function') renderPublicFilterUI();
  if (typeof renderPublicFiltered === 'function') renderPublicFiltered();
}

function changePage(page) {
  var pPub = document.getElementById('page-public');
  if (pPub) pPub.classList.toggle('hidden', page !== 'public');
  var pAdm = document.getElementById('page-admin');
  if (pAdm) pAdm.classList.toggle('hidden', page !== 'admin');
  var pKan = document.getElementById('page-kandidat');
  if (pKan) pKan.classList.toggle('hidden', page !== 'kandidat');

  // Re-render tabel publik setiap kali halaman publik dibuka
  // agar tabel tidak kosong saat admin/kandidat berpindah halaman.
  if (page === 'public') {
    if (typeof renderPublicFilterUI === 'function') renderPublicFilterUI();
    if (typeof renderPublicFiltered === 'function') renderPublicFiltered();
  }

  // Close mobile nav when changing page
  closeMobileMenu();

  // Logika memunculkan Bottom Nav di HP
  // (ID bottom-nav-* = bar bawah; mobile-nav-* di menu hamburger dipakai
  // login/logout flow, jangan di-toggle di sini — dulu ID duplikat bikin
  // changePage men-toggle seksi menu hamburger sehingga menu jadi kosong
  // saat admin/kandidat melihat halaman publik.)
  var navAdm = document.getElementById('bottom-nav-admin');
  var navKan = document.getElementById('bottom-nav-kandidat');

  if (navAdm) navAdm.classList.toggle('hidden', page !== 'admin');
  if (navKan) navKan.classList.toggle('hidden', page !== 'kandidat');

  // Tambahkan padding bawah ke body agar konten tidak tertutup menu bawah
  if (page === 'admin' || page === 'kandidat') {
    document.body.style.paddingBottom = '70px';
  } else {
    document.body.style.paddingBottom = '0px';
  }
}

function closeMobileMenu() {
  var menu = document.getElementById('mobile-nav-menu');
  var overlay = document.getElementById('mobile-nav-overlay');
  if (!menu) return;
  if (!menu.classList.contains('translate-x-full')) {
    menu.classList.remove('translate-x-0');
    menu.classList.add('translate-x-full');
  }
  menu.classList.add('hidden');
  if (overlay) overlay.classList.add('hidden');
}

function toggleMobileMenu() {
  var menu = document.getElementById('mobile-nav-menu');
  var overlay = document.getElementById('mobile-nav-overlay');
  if (!menu) return;
  if (menu.classList.contains('translate-x-full')) {
    menu.classList.remove('hidden');
    overlay.classList.remove('hidden');
    requestAnimationFrame(function () {
      menu.classList.remove('translate-x-full');
      menu.classList.add('translate-x-0');
    });
  } else {
    menu.classList.remove('translate-x-0');
    menu.classList.add('translate-x-full');
    setTimeout(function () {
      menu.classList.add('hidden');
    }, 300);
    overlay.classList.add('hidden');
  }
}

function logoutApp() {
  // Cabut session di SERVER (hapus row user_sessions) - best-effort, tidak
  // menunda logout: callAPI membaca localStorage secara sinkron saat
  // membangun body, jadi token sudah terambil sebelum clear di bawah.
  callAPI('logout', []).catch(function () {});
  localStorage.clear();
  var nAdm = document.getElementById('nav-admin-mode');
  if (nAdm) nAdm.classList.add('hidden');
  var nKan = document.getElementById('nav-kandidat-mode');
  if (nKan) nKan.classList.add('hidden');
  var nMod = document.getElementById('nav-mode');
  if (nMod) nMod.classList.remove('hidden');
  // Sync menu hamburger: kembalikan ke seksi logged-out (Login/Daftar/Admin Login).
  // Dulu di sini seksi mobile-nav tidak di-reset, jadi setelah logout menu
  // hamburger masih menampilkan seksi admin/kandidat (Dashboard/Keluar) padahal
  // sudah tidak login.
  var mLg = document.getElementById('mobile-nav-logged-out');
  if (mLg) mLg.classList.remove('hidden');
  var mAd = document.getElementById('mobile-nav-admin');
  if (mAd) mAd.classList.add('hidden');
  var mKa = document.getElementById('mobile-nav-kandidat');
  if (mKa) mKa.classList.add('hidden');
  isAdmin = false;
  isKandidat = false;
  currentAdminName = '';
  currentKandidatName = '';
  currentKandidatWa = '';
  currentKandidatId = '';

  if (AUTO_REFRESH_TIMER) {
    clearInterval(AUTO_REFRESH_TIMER);
    AUTO_REFRESH_TIMER = null;
    PREV_MAIL_COUNT = null;
  }

  // Close mobile nav
  closeMobileMenu();

  changePage('public');
}

// ==========================================
