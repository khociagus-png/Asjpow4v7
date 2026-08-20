import { registerSeamAliases } from '../core/bridge.js';
// MODUL BARU (Fase 2 REFACTOR_TODO.md): js/11_admin_ops.js dipecah per domain →
// js/admin_ops/{schedule,candidates,sysconfig,loading,migration,drive}.js.
// Body fungsi byte-identik dari 11_admin_ops.js — perilaku tidak berubah.
// ==========================================
// MIGRASI BERKAS GOOGLE DRIVE -> STORAGE
// ==========================================
// Kandidat lama yang kolom berkasnya masih berisi link drive.google.com
// (folder, bukan file) tidak punya berkas di Storage. Tooling ini:
//  - audit otomatis saat dashboard admin dimuat -> banner kuning
//  - modal daftar kandidat + upload ulang per berkas (foto/CV/JFT/SSW)
//  - backend uploadDriveReplacement sinkronkan master + database_candidate

export var DRIVE_CANDIDATES = [];

export async function muatMigrasiDrive() {
  if (typeof window.callAPI !== 'function') return;
  try {
    const res = await window.callAPI('getDriveLinkCandidates', []);
    if (!res || !res.success) return;
    // Handler backend mengembalikan `data`; dulu frontend baca `list` yang
    // tidak pernah ada → fitur selalu kosong & banner tak pernah muncul.
    DRIVE_CANDIDATES = res.data || res.list || [];
    var banner = document.getElementById('drive-migrate-banner');
    var count = document.getElementById('drive-migrate-count');
    if (count) count.textContent = DRIVE_CANDIDATES.length;
    if (banner) {
      if (DRIVE_CANDIDATES.length > 0) banner.classList.remove('hidden');
      else banner.classList.add('hidden');
    }
    // Kalau modal migrasi sedang terbuka, render ulang daftarnya
    var modal = document.getElementById('modal-migrasi-drive');
    if (modal && !modal.classList.contains('hidden')) renderMigrasiDriveList();
  } catch (err) {
    /* non-fatal: banner tetap tersembunyi */
  }
}

export function bukaModalMigrasiDrive() {
  var modal = document.getElementById('modal-migrasi-drive');
  if (!modal) return;
  modal.classList.remove('hidden');
  // Muat ulang daftar supaya selalu fresh (kandidat bisa berubah)
  muatMigrasiDrive();
  renderMigrasiDriveList();
}

export function tutupModalMigrasiDrive() {
  var modal = document.getElementById('modal-migrasi-drive');
  if (modal) modal.classList.add('hidden');
}

export function renderMigrasiDriveList() {
  var box = document.getElementById('migrasi-drive-list');
  if (!box) return;
  if (!DRIVE_CANDIDATES.length) {
    box.innerHTML =
      '<div class="bg-emerald-900/20 border border-emerald-500/40 rounded-xl p-6 text-center"><p class="text-emerald-400 font-black text-sm mb-1"><i class="fas fa-check-circle mr-1"></i> ' +
      window.tr('ui.all_on_storage') +
      '</p><p class="text-[10px] text-slate-400">' +
      window.tr('ui.no_drive_links') +
      '</p></div>';
    return;
  }
  var html = '';
  DRIVE_CANDIDATES.forEach(function (c, i) {
    var chips = c.fields
      .map(function (f) {
        var info = {
          PAS_PHOTO: ['PAS PHOTO', 'image'],
          CV: ['CV', 'file-alt'],
          JFT: ['JFT', 'file-pdf'],
          SSW: ['SSW', 'file-pdf'],
        }[f] || [f, 'file'];
        return (
          '<span class="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-900/40 text-amber-300 border border-amber-500/40 rounded-full text-[9px] font-bold"><i class="fas fa-' +
          info[1] +
          ' text-[8px]"></i> ' +
          window.esc(info[0]) +
          '</span>'
        );
      })
      .join('');
    html +=
      '<div class="bg-black/40 border border-slate-700 rounded-xl p-3">' +
      '<div class="flex items-center justify-between gap-2 flex-wrap mb-2">' +
      '<div class="min-w-0"><p class="text-xs font-black text-white truncate">' +
      window.esc(c.nama) +
      '</p>' +
      '<p class="text-[9px] text-slate-500 font-mono">' +
      window.esc(c.idKandidat) +
      ' · ' +
      window.esc(c.wa) +
      '</p></div>' +
      '<div class="flex flex-wrap gap-1">' +
      chips +
      '</div>' +
      '</div>' +
      '<div class="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">' +
      c.fields
        .map(function (f) {
          return migrasiDriveFieldHtml(c, f);
        })
        .join('') +
      '</div>' +
      '</div>';
  });
  box.innerHTML = html;
}

export function migrasiDriveFieldHtml(c, field) {
  var info = {
    PAS_PHOTO: ['PAS PHOTO', 'PAS_PHOTO'],
    CV: ['CV', 'CV'],
    JFT: ['JFT', 'JFT'],
    SSW: ['SSW', 'SSW'],
  }[field] || [field, field];
  var safeId = (c.idKandidat + '_' + field).replace(/[^A-Z0-9_]/gi, '');
  return (
    '<div class="bg-slate-900/60 border border-slate-700 rounded-lg p-2.5">' +
    '<div class="flex items-center justify-between mb-1.5">' +
    '<label class="text-[9px] font-bold text-slate-300 uppercase"><i class="fas fa-link text-rose-400 mr-1"></i> ' +
    window.esc(info[0]) +
    ' (Drive)</label>' +
    '<span id="dl-st-' +
    safeId +
    '" class="text-[9px]"></span>' +
    '</div>' +
    '<div class="flex gap-1.5">' +
    '<input type="file" id="dl-file-' +
    safeId +
    '" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" class="flex-1 text-[9px] text-slate-300 file:mr-2 file:px-2 file:py-1 file:rounded-md file:border-0 file:bg-slate-700 file:text-white file:text-[9px] file:font-bold">' +
    '<button type="button" onclick="uploadDriveField(\'' +
    window.escJs(c.idKandidat) +
    "', '" +
    window.escJs(c.nama) +
    "', '" +
    window.escJs(field) +
    '\')" class="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[9px] font-black transition flex-shrink-0"><i class="fas fa-upload mr-1"></i> Upload</button>' +
    '</div>' +
    '</div>'
  );
}

export function driveSetStatus(id, label, state, msg) {
  var el = document.getElementById('dl-st-' + id);
  if (!el) return;
  if (state === 'uploading')
    el.innerHTML =
      '<span class="text-sky-300"><i class="fas fa-spinner fa-spin mr-0.5"></i> ' +
      window.tr('ui.file_uploading') +
      '</span>';
  else if (state === 'ok')
    el.innerHTML =
      '<span class="text-emerald-400"><i class="fas fa-check-circle mr-0.5"></i> ' +
      label +
      ' ' +
      window.tr('ui.file_uploaded') +
      '</span>';
  else if (state === 'fail')
    el.innerHTML =
      '<span class="text-rose-400"><i class="fas fa-times-circle mr-0.5"></i> ' +
      window.tr('ui.file_failed') +
      '</span>';
}

export function driveBacaFileBase64(input) {
  return new Promise(function (resolve) {
    if (!input || !input.files || !input.files[0]) return resolve(null);
    var f = input.files[0];
    var reader = new FileReader();
    reader.onload = function () {
      var dataUrl = reader.result || '';
      var base64 = dataUrl.split(',')[1] || '';
      var mime = (dataUrl.match(/^data:([^;]+);/) || [])[1] || f.type || 'application/octet-stream';
      resolve({ data: base64, name: f.name, mime: mime });
    };
    reader.onerror = function () {
      resolve(null);
    };
    reader.readAsDataURL(f);
  });
}

export async function uploadDriveField(idKandidat, nama, field) {
  var safeId = (idKandidat + '_' + field).replace(/[^A-Z0-9_]/gi, '');
  var input = document.getElementById('dl-file-' + safeId);
  if (!input) return;
  // Guard ekstensi: tolak SEBELUM baca base64 (format tak dikenal pasti
  // ditolak backend juga — user dapat toast lebih cepat).
  var extErr = window.cekEkstensiFile(input);
  if (extErr) {
    window.showToast(extErr, 'error');
    return;
  }
  var fileData = await driveBacaFileBase64(input);
  if (!fileData) {
    window.showToast(window.tr('ui.toast_pick_file_first'), 'error');
    return;
  }
  driveSetStatus(safeId, field, 'uploading');
  var labelNama = { PAS_PHOTO: 'PAS PHOTO', CV: 'CV', JFT: 'JFT', SSW: 'SSW' }[field] || field;
  try {
    const res = await window.callAPI('uploadDriveReplacement', [
      { idKandidat: idKandidat, nama: nama, label: field, fileData: fileData },
    ]);
    if (res && res.success) {
      driveSetStatus(safeId, labelNama, 'ok');
      window.showToast(
        res.field + ' ' + idKandidat + ' ' + window.tr('ui.toast_upload_storage_ok'),
        'success',
      );
      // Hapus field dari daftar kandidat (sudah termigrasi)
      var c = DRIVE_CANDIDATES.find(function (x) {
        return x.idKandidat === idKandidat;
      });
      if (c) {
        c.fields = (c.fields || []).filter(function (f) {
          return f !== field;
        });
        if (!c.fields.length)
          DRIVE_CANDIDATES = DRIVE_CANDIDATES.filter(function (x) {
            return x.idKandidat !== idKandidat;
          });
      }
      setTimeout(function () {
        renderMigrasiDriveList();
        muatMigrasiDrive();
      }, 1200);
    } else {
      driveSetStatus(safeId, labelNama, 'fail');
      window.showToast((res && res.error) || window.tr('ui.toast_upload_failed'), 'error');
    }
  } catch (err) {
    driveSetStatus(safeId, labelNama, 'fail');
    window.showToast(window.tr('ui.toast_network_upload_error'), 'error');
  }
}

// BRIDGE ESM → classic (bundel): alias window.* utk pemakai lintas file /
// HTML inline onclick (index.html & engine/init.js window.muatMigrasiDrive,
// admin/index buka/tutupModalMigrasiDrive, tombol uploadDriveField di
// migrasiDriveFieldHtml).
registerSeamAliases({
  muatMigrasiDrive,
  bukaModalMigrasiDrive,
  tutupModalMigrasiDrive,
  uploadDriveField,
});
