import { DROPDOWNS } from './state.ts';
import { registerSeamAliases } from '../core/bridge.ts';
// MODUL BARU (Fase 2 REFACTOR_TODO.md): js/02_init.js dipecah per domain →
// js/init/{state,theme,util,preview,nav,boot}.js. Body fungsi byte-identik dari
// 02_init.js — perilaku tidak berubah.
// ==========================================
// UTIL — pelindung DOM (safeSet/setImg/setBg), normalisasi WA, toast,
// format data, dropdown/checkbox, preview URL & tipe file
// ==========================================

// Helper thumbnail Supabase Storage (dipakai 01_public/05_render/share.html):
// tambah ?width=&quality= HANYA untuk URL storage — URL Drive/lh3/ui-avatars/
// data: dikembalikan utuh. Param ini diaktifkan setelah "Image Transformations"
// dinyalakan di dashboard Supabase (gratis); TANPA toggle itu param diabaikan
// server & URL asli tetap valid (aman dipakai sekarang — tidak ada regresi).
export function thumbnailUrl(url, width) {
  if (!url || typeof url !== 'string') return url;
  if (!/^https?:\/\/[^/]+\/storage\/v1\/object\/public\//i.test(url)) return url;
  var sep = url.indexOf('?') >= 0 ? '&' : '?';
  return url + sep + 'width=' + (width || 300) + '&quality=80';
}

export function safeSetVal(id, value) {
  var el = document.getElementById(id);
  if (el) el.value = value || '';
}

export function normalizePhone(wa) {
  if (!wa) return '';
  let s = String(wa).replace(/\D/g, '');
  if (s.startsWith('0')) {
    s = '62' + s.substring(1);
  } else if (s.startsWith('8')) {
    s = '62' + s;
  }
  return s;
}

export function showToast(message, type = 'success') {
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

export function safeSet(id, value) {
  var el = document.getElementById(id);
  if (el) {
    el.innerHTML = value;
  }
}
export function setImg(id, url) {
  var el = document.getElementById(id);
  if (el && url) el.src = url;
}
export function setBg(id, url) {
  var el = document.getElementById(id);
  if (el && url) el.style.backgroundImage = "url('" + url + "')";
}

// Berkas kini selalu di Supabase Storage — URL langsung dipakai apa adanya.
// (Dulu di sini ada konversi link Google Drive; sudah dihapus.)
export function getHighResImage(url) {
  if (!url || url === '-') return '';
  return url;
}

export function getDirectDownloadUrl(url) {
  if (!url || url === '-' || url.trim() === '') return '';
  return url;
}

// Pendidikan dari DB bisa berupa JSON array 5-baris ('[{"tingkat":"SMA/SMK"}]')
// ATAU teks polos lama ('SMK'). Ambil tingkat pendidikan TERAKHIR yang terbaca
// untuk tampilan ringkas (CV Mini / select). Kalau tidak ada -> ''.
export function formatPendidikanTingkat(p) {
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
export function isPreviewableFile(url) {
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
export function previewFinalUrl(url) {
  var u = String(url || '');
  var lower = u.toLowerCase();
  var isImage =
    /[.](jpe?g|png|gif|webp|bmp|svg)([?#].*)?$/i.test(lower) || lower.includes('pas_photo');
  var isPdf = /[.]pdf([?#].*)?$/i.test(lower);
  if (isImage) return u;
  if (isPdf) {
    // FIX 2026-08-19: Google Docs Viewer untuk PDF — jalan di mobile & desktop.
    return 'https://docs.google.com/gview?url=' + encodeURIComponent(u) + '&embedded=true';
  }
  var isOffice = /[.](doc|docx|xls|xlsx|ppt|pptx)([?#].*)?$/i.test(lower);
  if (isOffice) {
    return 'https://view.officeapps.live.com/op/embed.aspx?src=' + encodeURIComponent(u);
  }
  return u;
}

export function populate(id, list) {
  var el = document.getElementById(id);
  if (!el) return;
  var html = '<option value="">-</option>';
  // Label tampil sesuai bahasa (trOption), value TETAP ID asli (trOptionId)
  // supaya data yang dipilih/disimpan tidak berubah.
  if (list && list.length > 0) {
    for (var i = 0; i < list.length; i++)
      html +=
        '<option value="' +
        window.esc(window.trOptionId(list[i])) +
        '">' +
        window.esc(window.trOption(list[i])) +
        '</option>';
  }
  el.innerHTML = html;
}

// Re-populate semua dropdown/checkbox yang nilainya dari sys config saat
// bahasa diganti — label ikut bahasa baru, value terpilih tetap dipertahankan.
export function rePopulateDropdowns() {
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

export function populateCheckboxes(id, list, nameAttr) {
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
        window.esc(window.trOptionId(list[i])) +
        '" class="accent-red-500"> ' +
        window.esc(window.trOption(list[i])) +
        '</label>';
    }
  }
  el.innerHTML = html;
}

export function formatInputWA(el) {
  let val = el.value.replace(/\D/g, '');
  if (val.startsWith('0')) {
    val = '62' + val.substring(1);
  } else if (val.startsWith('8')) {
    val = '62' + val;
  }
  el.value = val.length > 0 ? '+' + val : '';
  // Gate WA: tandai nomor yang bukan HP Indonesia (62 8xx, total 12-13 digit)
  // supaya typo seperti 6223... (bukan 6282...) langsung kelihatan.
  const valid = /^628\d{9,10}$/.test(val);
  el.classList.remove('ring-2', 'ring-red-500', 'ring-emerald-500');
  if (val.length > 0 && !valid) {
    el.classList.add('ring-2', 'ring-red-500');
    el.title = window.toastWaFormat();
  } else if (valid) {
    el.classList.add('ring-2', 'ring-emerald-500');
    el.title = '';
  } else {
    el.title = '';
  }
}

// Bersihkan ring validasi saat user mengetik ulang nomor WA.
export function hapusRingWA(el) {
  el.classList.remove('ring-2', 'ring-red-500', 'ring-emerald-500');
  el.title = '';
}

export function salinTeksDecode(encodedText) {
  var el = document.createElement('textarea');
  el.value = decodeURIComponent(encodedText);
  document.body.appendChild(el);
  el.select();
  try {
    document.execCommand('copy');
    showToast(window.tr('alert.success'), 'success');
  } catch (err) {}
  document.body.removeChild(el);
}

export function toggleMinimize(id, btnEl) {
  const el = document.getElementById(id);
  const icon = btnEl.querySelector('i.fa-chevron-down');
  if (el) el.classList.toggle('hidden');
  if (icon) icon.classList.toggle('rotate-180');
}

// ---------------------------------------------------------------------------
// BRIDGE ESM → classic (bundel admin/index): alias window.* untuk SEMUA
// helper di atas. Pemakai classic memanggil bare global (`showToast(...)`,
// `safeSet(...)`, `normalizePhone(...)`, …) — alias ini satu-satunya jalur
// masuk. Fungsi tidak pernah di-reassign, jadi data property cukup (beda
// dengan state.js yang butuh accessor get/set).
// ---------------------------------------------------------------------------
registerSeamAliases({
  thumbnailUrl,
  safeSetVal,
  normalizePhone,
  showToast,
  safeSet,
  setImg,
  setBg,
  getHighResImage,
  getDirectDownloadUrl,
  formatPendidikanTingkat,
  isPreviewableFile,
  previewFinalUrl,
  populate,
  rePopulateDropdowns,
  populateCheckboxes,
  formatInputWA,
  hapusRingWA,
  salinTeksDecode,
  toggleMinimize,
});
