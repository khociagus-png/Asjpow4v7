// 7. FUNGSI RENDER — DOMAIN ADMIN (admin.html)
// ==========================================
// MODUL BARU (Fase 2 REFACTOR_TODO.md): js/05_render.js dipecah per domain →
// js/render/{public,admin,candidate,share,mail}.js (global scope TETAP).
// File ini: switch tab admin, render dashboard (renderAdminFull), tabel
// kelola loker, tabel DB JOB + badge tahapan pipeline. Body fungsi
// byte-identik dari 05_render.js — perilaku tidak berubah.

export function adminSwitchTab(t) {
  var tabs = ['kelola', 'dbjob', 'mail', 'tambah', 'pelamar', 'jadwal', 'wa', 'config'];
  tabs.forEach((x) => {
    var p = document.getElementById('admin-' + x);
    if (p) p.classList.add('hidden');
    var b = document.getElementById('tab-' + x);
    if (b)
      b.className =
        'px-4 py-2.5 bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg text-xs font-bold transition flex-1 md:flex-none text-center';
  });
  var tgtP = document.getElementById('admin-' + t);
  if (tgtP) tgtP.classList.remove('hidden');
  var tgtT = document.getElementById('tab-' + t);
  if (tgtT)
    tgtT.className =
      'px-4 py-2.5 bg-red-600 text-white rounded-lg text-xs font-bold transition shadow-md flex-1 md:flex-none text-center';
  if (t === 'mail') window.renderFormInbox();
  if (t === 'wa') window.renderWaTemplates();
  if (t === 'config') window.renderSysConfig();
}

export function renderAdminFull() {
  window.safeSet('dash-loker', window.ALL_JOBS.filter((j) => j.status.includes('OPEN')).length);
  var candTotal = window.ALL_CANDIDATES_TOTAL || window.ALL_CANDIDATES.length;
  window.safeSet('dash-pelamar', candTotal);
  var ccEl = document.getElementById('kandidat-count');
  if (ccEl) ccEl.textContent = window.ALL_CANDIDATES.length + ' dari ' + candTotal + ' kandidat';
  var btnMore = document.getElementById('btn-muat-kandidat');
  if (btnMore) btnMore.style.display = window.ALL_CANDIDATES.length >= candTotal ? 'none' : '';
  window.safeSet('dash-admin-name', window.currentAdminName);
  // FIX 2026-08-12: renderReport() dihapus — renderer Report Log dihapus total (migrasi 017) tapi call site-nya tertinggal,
  // menyebabkan ReferenceError "renderReport is not defined" di tiap render dashboard admin.
  window.renderAdmin();
  window.renderDbFilters();
  filterDbJob();
  window.renderFormInbox();
  window.filterKandidat();
  window.renderJadwal();
  window.renderTugas();
  window.renderDashboardAgenda();
  window.renderWaTemplates();
}

export function renderAdmin(filteredJobs) {
  var tb = document.getElementById('admin-table-body');
  if (!tb) {
    console.warn('admin-table-body element not found');
    return;
  }
  var html = '';
  var sourceArray = [...(filteredJobs || window.ALL_JOBS || [])];
  sourceArray.sort(function (a, b) {
    var aOpen = (a.status || '').toUpperCase().includes('OPEN') ? 1 : 0;
    var bOpen = (b.status || '').toUpperCase().includes('OPEN') ? 1 : 0;
    if (aOpen !== bOpen) return bOpen - aOpen;

    var timeA = a.createdAt
      ? new Date(a.createdAt).getTime()
      : parseInt((a.code || '').replace(/\D/g, '')) || 0;
    var timeB = b.createdAt
      ? new Date(b.createdAt).getTime()
      : parseInt((b.code || '').replace(/\D/g, '')) || 0;
    return timeB - timeA;
  });

  for (var i = 0; i < Math.min(sourceArray.length, window.limitAdm); i++) {
    var j = sourceArray[i];
    html +=
      '<window.tr class="rt-row border-b border-slate-800 hover:bg-white/5 transition-all">' +
      '<td data-label="' +
      window.tr('table.code') +
      '" class="p-4 font-mono text-red-300 font-bold">' +
      window.esc(j.code) +
      '</td>' +
      '<td data-label="' +
      window.tr('table.job') +
      '" class="rt-full p-4 font-bold text-white">' +
      window.esc(j.pekerjaan) +
      '</td>' +
      '<td data-label="' +
      window.tr('table.status') +
      '" class="p-4 text-center">' +
      window.badgeTahapanDb(j.status) +
      '</td>' +
      '<td data-label="' +
      window.tr('table.admin_action') +
      '" class="rt-full p-4 text-center flex flex-wrap justify-center gap-2">' +
      "<button onclick=\"aksiAdmin('✅ OPEN', '" +
      window.escJs(j.code) +
      '\')" class="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-full text-[11px] text-white font-bold shadow-lg transition-all">' +
      window.tr('admin.set_open') +
      '</button> ' +
      "<button onclick=\"aksiAdmin('❌ CLOSE', '" +
      window.escJs(j.code) +
      '\')" class="px-5 py-2 bg-slate-600 hover:bg-slate-500 rounded-full text-[11px] text-white font-bold shadow-lg transition-all">' +
      window.tr('admin.set_close') +
      '</button> ' +
      '<button onclick="bukaMatchmaking(\'' +
      window.escJs(j.code) +
      "', '" +
      window.escJs(j.pekerjaan) +
      "', '" +
      window.escJs(j.gender) +
      '\')" class="px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-full text-[11px] font-bold shadow-[0_0_10px_rgba(139,92,246,0.4)] transition-all"><i class="fas fa-search-dollar mr-1"></i> ' +
      window.tr('admin.btn_match') +
      '</button> ' +
      '<button onclick="aksiGenerateQr(\'' +
      window.escJs(j.code) +
      "', '" +
      window.escJs(j.kategori) +
      '\')" class="px-5 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-full text-[11px] font-bold shadow-lg transition-all"><i class="fas fa-qrcode mr-1"></i> ' +
      window.tr('admin.btn_qr_pamflet') +
      '</button>' +
      '<button onclick="bukaEditFullLoker(\'' +
      window.escJs(j.code) +
      '\')" class="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-full text-[11px] font-bold shadow-lg transition-all"><i class="fas fa-edit"></i> ' +
      window.tr('admin.btn_edit') +
      '</button>' +
      '</td>' +
      '<td data-label="' +
      window.tr('table.delete') +
      '" class="p-4 text-center"><button onclick="hapusLoker(\'' +
      window.escJs(j.code) +
      '\')" aria-label="' +
      window.tr('table.delete') +
      '" class="w-10 h-10 flex items-center justify-center bg-red-600 text-white rounded-full text-xs font-bold shadow-lg hover:scale-105 transition-all"><i class="fas fa-trash"></i></button></td>' +
      '</window.tr>';
  }
  if (sourceArray.length > window.limitAdm) {
    html +=
      '<window.tr><td colspan="5" class="p-4 text-center"><button onclick="window.limitAdm+=10; window.renderAdmin();" class="text-xs text-red-400">' +
      window.tr('button.more') +
      '</button></td></window.tr>';
  }
  tb.innerHTML = html;
}

export function filterDbJob() {
  var el = document.getElementById('search-dbjob');
  var val = el ? el.value.toLowerCase() : '';
  var arr = window.ALL_DB_JOBS.filter(function (db) {
    var matchSearch =
      (db.code || '').toLowerCase().includes(val) ||
      (db.tsk || '').toLowerCase().includes(val) ||
      (db.pekerjaan || '').toLowerCase().includes(val) ||
      (db.lokasi || '').toLowerCase().includes(val);
    var matchBidang = window.dbFilterBidang === 'ALL' || db.kategori === window.dbFilterBidang;
    var matchTahapan = window.dbFilterTahapan === 'ALL' || db.tahapan === window.dbFilterTahapan;
    return matchSearch && matchBidang && matchTahapan;
  });
  arr.sort(function (a, b) {
    if (window.dbSortType === 'TERBANYAK') {
      return (
        window.ALL_CANDIDATES.filter((c) => c.idLoker === b.code).length -
        window.ALL_CANDIDATES.filter((c) => c.idLoker === a.code).length
      );
    }
    let tA = new Date(a.createdAt || 0).getTime();
    let tB = new Date(b.createdAt || 0).getTime();
    if (tA === tB || isNaN(tA) || isNaN(tB)) {
      return window.dbSortType === 'TERLAMA' ? a.code.localeCompare(b.code) : b.code.localeCompare(a.code);
    }
    return window.dbSortType === 'TERLAMA' ? tA - tB : tB - tA;
  });
  renderDbJobTable(arr);
}

// Badge warna untuk tahapan pipeline (posisi = warna progres) & status loker.
// Logika warna tetap pakai NILAI ASLI; label tampil sesuai bahasa (window.trOption).
export function badgeTahapanDb(tahapan) {
  var t = String(tahapan || '-');
  var label = window.esc(window.trOption(t));
  if (typeof window.tahapanStepIndex === 'function' && typeof window.tahapanPipeline === 'function') {
    var idx = window.tahapanStepIndex(t);
    if (idx >= 0) {
      var pipe = window.tahapanPipeline();
      var cls =
        idx >= pipe.length - 2
          ? 'bg-emerald-600 text-white border-emerald-400/60'
          : idx >= 4
            ? 'bg-amber-600 text-white border-amber-400/60'
            : 'bg-sky-600 text-white border-sky-400/60';
      return (
        '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-bold ' +
        cls +
        '"><i class="fas fa-chevron-circle-right"></i> ' +
        label +
        '</span>'
      );
    }
  }
  var up = t.toUpperCase();
  if (/OPEN/.test(up))
    return (
      '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-bold bg-emerald-600 text-white border-emerald-400/60"><i class="fas fa-door-open"></i> ' +
      label +
      '</span>'
    );
  if (/URGENT/.test(up))
    return (
      '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-bold bg-red-600 text-white border-red-400/60 animate-pulse"><i class="fas fa-exclamation-triangle"></i> ' +
      label +
      '</span>'
    );
  if (/CLOSE/.test(up))
    return (
      '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-bold bg-red-600 text-white border-red-400/60"><i class="fas fa-door-closed"></i> ' +
      label +
      '</span>'
    );
  return (
    '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-bold bg-slate-800 text-slate-300 border-slate-600"><i class="fas fa-tag"></i> ' +
    label +
    '</span>'
  );
}

export function renderDbJobTable(arr) {
  var tb = document.getElementById('admin-dbjob-body');
  if (!tb) return;
  var html = '';
  for (var i = 0; i < Math.min(arr.length, window.limitDb); i++) {
    var db = arr[i];
    var cands = window.ALL_CANDIDATES.filter((c) => c.idLoker === db.code);
    html +=
      '<window.tr class="rt-row border-b border-slate-800 hover:bg-white/5">' +
      '<td data-label="' +
      window.tr('table.job_code') +
      '" class="p-4 font-mono text-purple-300 font-bold">' +
      window.esc(db.code) +
      '</td>' +
      '<td data-label="' +
      window.tr('table.tsk') +
      '" class="p-4">' +
      window.esc(db.tsk) +
      '</td>' +
      '<td data-label="' +
      window.tr('table.field_location') +
      '" class="rt-full p-4">' +
      '<div class="font-bold text-white text-[13px]">' +
      window.esc(db.pekerjaan) +
      '</div>' +
      '<div class="text-[10px] text-slate-400 font-bold mt-1.5"><span class="text-sky-400"><i class="fas fa-tag mr-1"></i>' +
      window.esc(window.trOption(db.kategori)) +
      '</span> <span class="mx-1.5">&bull;</span> <span class="text-amber-300"><i class="fas fa-map-marker-alt text-red-400 mr-1"></i>' +
      window.esc(window.trOption(db.lokasi)) +
      '</span></div>' +
      '</td>' +
      '<td data-label="' +
      window.tr('table.candidate_count') +
      '" class="p-4 text-center cursor-pointer group" onclick="bukaModalListKandidat(\'' +
      window.escJs(db.code) +
      '\')"><div class="inline-block px-4 py-1.5 bg-sky-900/30 group-hover:bg-sky-600 rounded-lg transition-all"><span class="text-sky-400 group-hover:text-white font-bold text-lg">' +
      cands.length +
      '</span></div></td>' +
      '<td data-label="' +
      window.tr('table.stage_status') +
      '" class="p-4 text-center">' +
      window.badgeTahapanDb(db.tahapan) +
      '</td>' +
      '<td data-label="' +
      window.tr('table.action_db') +
      '" class="p-4 text-center">' +
      '<button onclick="bukaModalEditDbJob(\'' +
      window.escJs(db.code) +
      "', '" +
      window.escJs(db.tahapan || '') +
      "', '" +
      window.escJs(db.statusInt || '') +
      '\')" class="px-3 py-1.5 bg-purple-600 text-white rounded font-bold shadow text-[10px]"><i class="fas fa-edit"></i> ' +
      window.tr('admin.btn_edit') +
      '</button>' +
      '<button onclick="bukaModalShare(\'' +
      window.escJs(db.code) +
      '\')" class="ml-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold shadow text-[10px]" title="' +
      window.tr('ui.share_toggle_text') +
      '"><i class="fas fa-share-alt"></i> ' +
      window.tr('ui.share_toggle') +
      '</button>' +
      '</td>' +
      '</window.tr>';
  }
  if (arr.length > window.limitDb) {
    html +=
      '<window.tr><td colspan="6" class="p-4 text-center"><button onclick="window.limitDb+=10; filterDbJob();" class="text-xs text-purple-400 font-bold">' +
      window.tr('form.txt_lebih_banyak') +
      '</button></td></window.tr>';
  }
  tb.innerHTML = html;
}


// BRIDGE ESM → classic (bundel): alias window.* utk pemakai lintas file /
// HTML inline onclick (adminSwitchTab, filterDbJob, window.limitDb+=10;...).
window.adminSwitchTab = adminSwitchTab;
window.renderAdminFull = renderAdminFull;
window.renderAdmin = renderAdmin;
window.filterDbJob = filterDbJob;
window.badgeTahapanDb = badgeTahapanDb;
window.renderDbJobTable = renderDbJobTable;
