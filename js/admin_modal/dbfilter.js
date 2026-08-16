// MODUL BARU (Fase 2 REFACTOR_TODO.md): js/06_admin_modal.js dipecah per domain →
// js/admin_modal/{dbfilter,cv,job}.js. Body fungsi byte-identik dari
// 06_admin_modal.js — perilaku tidak berubah.
// ==========================================
// FILTER & SORT TABEL DB JOB ADMIN — chip bidang/tahapan + urutan
// ==========================================
function setFilterBidang(v) {
  dbFilterBidang = v;
  renderDbFilters();
  filterDbJob();
}
function setFilterTahapan(v) {
  dbFilterTahapan = v;
  renderDbFilters();
  filterDbJob();
}
function setSortDb(t) {
  dbSortType = t;
  ['terbaru', 'terlama', 'terbanyak'].forEach((x) => {
    var b = document.getElementById('btn-sort-' + x);
    if (b)
      b.className =
        'px-4 py-1.5 rounded-full font-bold transition ' +
        (t === x.toUpperCase()
          ? 'bg-purple-600 text-white shadow-lg'
          : 'bg-slate-700 text-slate-300 hover:bg-slate-600');
  });
  filterDbJob();
}

function renderDbFilters() {
  var bContainer = document.getElementById('filter-bidang-container');
  var tContainer = document.getElementById('filter-tahapan-container');
  if (DROPDOWNS.kategori && bContainer) {
    var bHtml =
      '<button onclick="setFilterBidang(\'ALL\')" class="px-3 py-1 rounded-full ' +
      (dbFilterBidang === 'ALL' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400') +
      '">' +
      tr('public.all') +
      '</button>';
    // Label chip dwi bahasa (trOption); onclick tetap ID asli (trOptionId)
    // supaya filter cocok dengan data yang tersimpan.
    DROPDOWNS.kategori.forEach((kat) => {
      bHtml +=
        '<button onclick="setFilterBidang(\'' +
        escJs(trOptionId(kat)) +
        '\')" class="px-3 py-1 rounded-full ' +
        (dbFilterBidang === trOptionId(kat)
          ? 'bg-purple-600 text-white'
          : 'bg-slate-800 text-slate-400') +
        '">' +
        esc(trOption(kat)) +
        '</button>';
    });
    bContainer.innerHTML = bHtml;
  }
  if (DROPDOWNS.tahapan && tContainer) {
    var tHtml =
      '<button onclick="setFilterTahapan(\'ALL\')" class="px-3 py-1 rounded-full ' +
      (dbFilterTahapan === 'ALL' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400') +
      '">' +
      tr('public.all') +
      '</button>';
    DROPDOWNS.tahapan.forEach((thp) => {
      tHtml +=
        '<button onclick="setFilterTahapan(\'' +
        escJs(trOptionId(thp)) +
        '\')" class="px-3 py-1 rounded-full ' +
        (dbFilterTahapan === trOptionId(thp)
          ? 'bg-purple-600 text-white'
          : 'bg-slate-800 text-slate-400') +
        '">' +
        esc(trOption(thp)) +
        '</button>';
    });
    tContainer.innerHTML = tHtml;
  }
}
