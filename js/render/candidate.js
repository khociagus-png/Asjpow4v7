// 7. FUNGSI RENDER — DOMAIN KANDIDAT (tabel daftar kandidat admin)
// ==========================================
// MODUL BARU (Fase 2 REFACTOR_TODO.md): js/05_render.js dipecah per domain →
// js/render/{public,admin,candidate,share,mail}.js (global scope TETAP).
// File ini: kolom "Job Dilamar", filter kandidat (teks/gender/usia/JFT) &
// tabel daftar kandidat admin. Body fungsi byte-identik dari 05_render.js —
// perilaku tidak berubah.

// Kolom "Job Dilamar" di tabel kandidat: job utama (id_loker_pilihan) +
// chip +N kalau kandidat punya lamaran lain di mail (multi-apply).
export function jobDilamarCell(c) {
  var primaryRaw = String((c && c.idLoker) || '').trim();
  var primaryCodes = primaryRaw
    .split(',')
    .map(function (s) {
      return s.trim();
    })
    .filter(Boolean);
  var extra = 0;
  (c.applications || []).forEach(function (a) {
    var code = a && a.code ? String(a.code).trim() : '';
    if (code && primaryCodes.indexOf(code) === -1) extra++;
  });
  var label = primaryRaw && primaryRaw !== '-' ? window.esc(primaryRaw) : window.esc('Umum');
  if (extra > 0) {
    label +=
      '<span class="px-1.5 py-0.5 ml-1 rounded-md bg-sky-900/70 text-sky-300 border border-sky-600/50 text-[9px] font-bold">+' +
      extra +
      '</span>';
  }
  // Riwayat lamaran (multi-apply): tombol CV per loker — tiap lamaran membawa
  // file_cv sendiri (CV loker lama & baru tetap utuh di folder kandidat).
  var appCvBtns = '';
  (c.applications || []).forEach(function (a) {
    var acode = a && a.code ? String(a.code).trim() : '';
    var acv = a && a.cv ? String(a.cv) : '';
    if (!acode || !acv || acv === '-' || !/^https?:/i.test(acv)) return;
    var isImg = /\.(jpe?g|png|webp|gif|bmp|svg)(\?|$)/i.test(acv) || /^data:image\//i.test(acv);
    appCvBtns +=
      '<button onclick="' +
      (isImg ? 'bukaFotoPreview' : 'bukaPdfPreview') +
      "('" +
      window.escJs(acv) +
      '\')" title="CV ' +
      window.esc(acode) +
      '" class="px-1.5 py-0.5 rounded bg-indigo-900/70 text-indigo-300 border border-indigo-600/50 text-[9px] font-bold hover:bg-indigo-700 hover:text-white transition whitespace-nowrap"><i class="fas fa-file-alt mr-0.5"></i>CV ' +
      window.esc(acode) +
      '</button>';
  });
  return label + (appCvBtns ? '<span class="flex flex-wrap gap-1 mt-1.5">' + appCvBtns + '</span>' : '');
}

export async function filterKandidat() {
  // Pencarian admin butuh daftar penuh - pastikan semua halaman sudah dimuat.
  if (typeof window.ensureAllCandidates === 'function') {
    try {
      await window.ensureAllCandidates();
    } catch (e) {}
  }
  var el = document.getElementById('search-kandidat');
  var val = el ? el.value.toLowerCase() : '';

  var genF = document.getElementById('filter-db-gender')
    ? document.getElementById('filter-db-gender').value
    : 'all';
  var ageF = document.getElementById('filter-db-age')
    ? document.getElementById('filter-db-age').value
    : 'all';
  var jftF = document.getElementById('filter-db-jft')
    ? document.getElementById('filter-db-jft').value
    : 'all';

  var arr = window.ALL_CANDIDATES.filter(function (c) {
    // Text Search
    let matchText =
      c.nama.toLowerCase().includes(val) ||
      c.idKandidat.toLowerCase().includes(val) ||
      c.tahapan.toLowerCase().includes(val) ||
      (c.idLoker && c.idLoker.toLowerCase().includes(val));
    if (!matchText) return false;

    // Gender Filter
    if (genF !== 'all') {
      let safeGender = (c.gender || '').toUpperCase();
      let isP = safeGender.includes('PEREMPUAN');
      let g = isP ? 'p' : 'l';
      if (g !== genF) return false;
    }

    // Age Filter
    if (ageF !== 'all') {
      let usia = parseInt(String(c.usia).replace(/\D/g, '')) || 0;
      if (ageF === 'under20' && (usia === 0 || usia >= 20)) return false;
      if (ageF === '20to25' && (usia < 20 || usia > 25)) return false;
      if (ageF === 'over25' && usia <= 25) return false;
    }

    // JFT Filter
    if (jftF !== 'all') {
      let jftText = (c.jft || c.nilai_jft || c.bahasa || c.catatanInt || '').toUpperCase();
      if (jftF === 'a2' && !jftText.includes('A2') && !jftText.includes('N4')) return false;
      if (jftF === 'b1' && !jftText.includes('B1') && !jftText.includes('N3')) return false;
    }

    return true;
  });
  renderKandidatTable(arr);
}

export function renderKandidatTable(arr) {
  var tb = document.getElementById('admin-kandidat-body');
  if (!tb) return;
  var html = '';
  for (var i = 0; i < Math.min(arr.length, window.limitKan); i++) {
    var c = arr[i];
    var waLink = 'https://wa.me/' + String(c.wa).replace(/\D/g, '');

    let isVip = (c.catatanInt || '').includes('[VIP]');
    let logoSrc =
      window.ASSETS.LOGO ||
      'https://gdwvffmevwtwnzrapjwy.supabase.co/storage/v1/object/public/asj-files/assets/logo_asj.png';

    let namaTampil = isVip
      ? window.esc(c.nama) +
        ' <img src="' +
        window.esc(logoSrc) +
        '" class="inline-block w-4 h-4 ml-1 rounded-full border border-emerald-500/50 object-contain drop-shadow-md" title="' +
        window.tr('ui.badge_official') +
        '">'
      : window.esc(c.nama);

    html +=
      '<window.tr class="rt-row border-b border-slate-800 hover:bg-white/5">' +
      '<td data-label="' +
      window.tr('table.candidate_id') +
      '" class="p-4 font-mono text-sky-300 font-bold">' +
      window.esc(c.idKandidat) +
      '</td>' +
      '<td data-label="' +
      window.tr('table.full_name') +
      '" class="p-4 font-bold text-white">' +
      namaTampil +
      '</td>' +
      '<td data-label="' +
      window.tr('table.applied_job') +
      '" class="p-4 text-amber-300 font-mono text-xs max-w-[200px]">' +
      jobDilamarCell(c) +
      '</td>' +
      '<td data-label="' +
      window.tr('table.stage_status') +
      '" class="rt-full p-4 text-xs font-bold text-sky-400">' +
      window.esc(window.trOption(c.tahapan)) +
      '<br><span class="text-[10px] font-normal text-slate-400">' +
      window.esc(window.trOption(c.status)) +
      '</span></td>' +
      '<td data-label="' +
      window.tr('table.admin_note') +
      '" class="rt-full p-4 text-[11px] text-slate-400 max-w-[150px] truncate">' +
      window.esc(c.catatanExt || c.catatan || '-') +
      '</td>' +
      '<td data-label="' +
      window.tr('table.action_candidate') +
      '" class="rt-full p-4 text-center flex gap-2 justify-center flex-wrap">' +
      // TOMBOL 1: Lihat Dashboard/Profil Digital
      '<button onclick="bukaDigitalCV(\'' +
      window.escJs(c.idKandidat) +
      '\')" aria-label="' +
      window.tr('button.view_cv') +
      '" class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-[10px] shadow transition" title="' +
      window.tr('button.view_cv') +
      '"><i class="fas fa-user-circle"></i></button> ' +
      // TOMBOL 2: Tombol Baru Admin Lihat & Print CV
      '<button onclick="bukaPreviewCV_Admin(\'' +
      window.escJs(c.wa) +
      '\')" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] shadow transition font-bold" title="' +
      window.tr('ui.view_rireki') +
      '"><i class="fas fa-file-pdf mr-1"></i> CV</button> ' +
      // TOMBOL 3: Super Edit Kandidat
      '<button onclick="bukaSuperEditKandidat(\'' +
      window.escJs(c.idKandidat) +
      '\')" class="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded text-[10px] font-bold shadow transition" title="' +
      window.tr('ui.edit_candidate') +
      '"><i class="fas fa-user-shield"></i> ' +
      window.tr('admin.btn_edit') +
      '</button> ' +
      // TOMBOL 4 & 5: Buka Form Master Manual & Kirim WA
      '<button onclick="bukaMasterEksternalAdmin(\'' +
      window.escJs(c.wa) +
      "', '" +
      window.escJs(c.nama) +
      '\')" class="px-3 py-1.5 bg-pink-600 hover:bg-pink-500 text-white rounded text-[10px] shadow transition" title="' +
      window.tr('ui.open_master_form') +
      '"><i class="fas fa-file-alt"></i> AI CV</button>' +
      '<button onclick="bukaModalWaPintar(\'' +
      window.escJs(c.idKandidat) +
      '\')" aria-label="' +
      window.tr('ui.send_wa_call') +
      '" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] shadow transition" title="' +
      window.tr('ui.send_wa_call') +
      '"><i class="fab fa-whatsapp"></i></button>' +
      '</td></window.tr>';
  }
  if (arr.length > window.limitKan) {
    html +=
      '<window.tr><td colspan="6" class="p-4 text-center"><button onclick="window.limitKan+=10; window.filterKandidat();" class="text-xs text-sky-400 font-bold">' +
      window.tr('form.txt_lebih_banyak') +
      '</button></td></window.tr>';
  }
  tb.innerHTML = html;
}


// BRIDGE ESM → classic (bundel): alias window.* utk pemakai lintas file /
// HTML inline onclick (window.filterKandidat, window.limitKan+=10;...).
window.jobDilamarCell = jobDilamarCell;
window.filterKandidat = filterKandidat;
window.renderKandidatTable = renderKandidatTable;
