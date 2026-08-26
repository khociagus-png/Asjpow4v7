import { registerSeamAliases as ee } from '../core/bridge.js';
var G = [],
  V = [],
  $ = [],
  X = 0,
  Y = [],
  Z = [],
  Q = [],
  aa = [],
  ea = [],
  ta = {},
  ra = 'TOKYO',
  m = {},
  na = !1,
  ia = !1,
  sa = '',
  oa = '',
  la = '',
  da = '',
  fa = 10,
  ca = 10,
  ua = 50,
  pa = 10,
  ma = 10,
  _a = 'TERBARU',
  ga = 'ALL',
  va = 'ALL',
  ha = 'MENUNGGU',
  wa = '',
  ba = 'ALL',
  ka = '',
  ja = null,
  ya = null,
  Aa = null,
  xa = '',
  La = '';
function f(a, e, t) {
  Object.defineProperty(window, a, { configurable: !0, get: e, set: t });
}
f(
  'ALL_JOBS',
  () => G,
  (a) => {
    G = a;
  },
);
f(
  'ALL_DB_JOBS',
  () => V,
  (a) => {
    V = a;
  },
);
f(
  'ALL_CANDIDATES',
  () => $,
  (a) => {
    $ = a;
  },
);
f(
  'ALL_CANDIDATES_TOTAL',
  () => X,
  (a) => {
    X = a;
  },
);
f(
  'ALL_SCHEDULES',
  () => Y,
  (a) => {
    Y = a;
  },
);
f(
  'ALL_TUGAS',
  () => Z,
  (a) => {
    Z = a;
  },
);
f(
  'ALL_FORM',
  () => Q,
  (a) => {
    Q = a;
  },
);
f(
  'ALL_WA_TEMPLATES',
  () => aa,
  (a) => {
    aa = a;
  },
);
f(
  'ALL_RIWAYAT_KANDIDAT',
  () => ea,
  (a) => {
    ea = a;
  },
);
f(
  'ASSETS',
  () => ta,
  (a) => {
    ta = a;
  },
);
f(
  'CURRENT_THEME',
  () => ra,
  (a) => {
    ra = a;
  },
);
f(
  'DROPDOWNS',
  () => m,
  (a) => {
    m = a;
  },
);
f(
  'isAdmin',
  () => na,
  (a) => {
    na = a;
  },
);
f(
  'isKandidat',
  () => ia,
  (a) => {
    ia = a;
  },
);
f(
  'currentAdminName',
  () => sa,
  (a) => {
    sa = a;
  },
);
f(
  'currentKandidatName',
  () => oa,
  (a) => {
    oa = a;
  },
);
f(
  'currentKandidatWa',
  () => la,
  (a) => {
    la = a;
  },
);
f(
  'currentKandidatId',
  () => da,
  (a) => {
    da = a;
  },
);
f(
  'limitPub',
  () => fa,
  (a) => {
    fa = a;
  },
);
f(
  'limitAdm',
  () => ca,
  (a) => {
    ca = a;
  },
);
f(
  'limitKan',
  () => ua,
  (a) => {
    ua = a;
  },
);
f(
  'limitJad',
  () => pa,
  (a) => {
    pa = a;
  },
);
f(
  'limitDb',
  () => ma,
  (a) => {
    ma = a;
  },
);
f(
  'dbSortType',
  () => _a,
  (a) => {
    _a = a;
  },
);
f(
  'dbFilterBidang',
  () => ga,
  (a) => {
    ga = a;
  },
);
f(
  'dbFilterTahapan',
  () => va,
  (a) => {
    va = a;
  },
);
f(
  'mailFilterStatus',
  () => ha,
  (a) => {
    ha = a;
  },
);
f(
  'mailSearchText',
  () => wa,
  (a) => {
    wa = a;
  },
);
f(
  'currentPublicFilter',
  () => ba,
  (a) => {
    ba = a;
  },
);
f(
  'currentCopyListTxt',
  () => ka,
  (a) => {
    ka = a;
  },
);
f(
  'CURRENT_WA_KANDIDAT',
  () => ja,
  (a) => {
    ja = a;
  },
);
f(
  'PREV_MAIL_COUNT',
  () => ya,
  (a) => {
    ya = a;
  },
);
f(
  'AUTO_REFRESH_TIMER',
  () => Aa,
  (a) => {
    Aa = a;
  },
);
f(
  'ACTIVE_PEMBERKASAN_WA',
  () => xa,
  (a) => {
    xa = a;
  },
);
f(
  'ACTIVE_PEMBERKASAN_NAMA',
  () => La,
  (a) => {
    La = a;
  },
);
import { registerSeamAliases as Pa } from '../core/bridge.js';
function Oa(a, e) {
  if (!a || typeof a != 'string' || !/^https?:\/\/[^/]+\/storage\/v1\/object\/public\//i.test(a))
    return a;
  var t = a.indexOf('?') >= 0 ? '&' : '?';
  return a + t + 'width=' + (e || 300) + '&quality=80';
}
function Ha(a, e) {
  var t = document.getElementById(a);
  t && (t.value = e || '');
}
function Ua(a) {
  if (!a) return '';
  let e = String(a).replace(/\D/g, '');
  return (e.startsWith('0') ? (e = '62' + e.substring(1)) : e.startsWith('8') && (e = '62' + e), e);
}
function Sa(a, e = 'success') {
  let t = document.getElementById('toast-container');
  if (!t) return;
  let n = document.createElement('div'),
    r =
      e === 'success'
        ? 'bg-emerald-600 border-emerald-400'
        : e === 'error'
          ? 'bg-red-600 border-red-400'
          : 'bg-sky-600 border-sky-400',
    i =
      e === 'success'
        ? 'fa-check-circle'
        : e === 'error'
          ? 'fa-exclamation-triangle'
          : 'fa-info-circle';
  ((n.className =
    'flex items-center gap-3 px-5 py-3.5 rounded-xl border text-white text-sm font-bold shadow-2xl transform transition-transform duration-300 translate-x-full ' +
    r),
    (n.innerHTML = '<i class="fas ' + i + ' text-lg"></i> <span>' + a + '</span>'),
    t.appendChild(n),
    requestAnimationFrame(() => {
      n.classList.remove('translate-x-full');
    }),
    setTimeout(() => {
      (n.classList.add('opacity-0', 'translate-x-full'), setTimeout(() => n.remove(), 300));
    }, 3500));
}
function Wa(a, e) {
  var t = document.getElementById(a);
  t && (t.innerHTML = e);
}
function Ka(a, e) {
  var t = document.getElementById(a);
  t && e && (t.src = e);
}
function za(a, e) {
  var t = document.getElementById(a);
  t && e && (t.style.backgroundImage = "url('" + e + "')");
}
function Ja(a) {
  return !a || a === '-' ? '' : a;
}
function qa(a) {
  return !a || a === '-' || a.trim() === '' ? '' : a;
}
function Ga(a) {
  if (a == null || a === '-' || a === '[]' || a === '{}') return '';
  var e = null;
  if (typeof a == 'string') {
    var t = a.trim();
    if (t.startsWith('['))
      try {
        e = JSON.parse(t);
      } catch {
        e = null;
      }
  } else Array.isArray(a) && (e = a);
  if (e && e.length) {
    for (var n = e.length - 1; n >= 0; n--) {
      var r = e[n] && (e[n].tingkat || e[n].tingkat_jp || '');
      if (r && r !== '-' && String(r).trim() !== '') return String(r).trim();
    }
    return '';
  }
  return String(a).trim();
}
function Va(a) {
  var e = String(a || '').toLowerCase();
  return !!(
    /[.](jpe?g|png|gif|webp|bmp|svg|pdf)([?#].*)?$/i.test(e) ||
    /[.](xls|xlsx|xlsm|doc|docx|ppt|pptx|odt|ods|odp|txt|rtf|csv)([?#].*)?$/i.test(e)
  );
}
function $a(a) {
  var e = String(a || ''),
    t = e.toLowerCase(),
    n = /[.](jpe?g|png|gif|webp|bmp|svg)([?#].*)?$/i.test(t) || t.includes('pas_photo'),
    r = /[.]pdf([?#].*)?$/i.test(t);
  if (n) return e;
  if (r) return 'https://docs.google.com/gview?url=' + encodeURIComponent(e) + '&embedded=true';
  var i = /[.](doc|docx|xls|xlsx|ppt|pptx)([?#].*)?$/i.test(t);
  return i ? 'https://view.officeapps.live.com/op/embed.aspx?src=' + encodeURIComponent(e) : e;
}
function Ta(a, e) {
  var t = document.getElementById(a);
  if (t) {
    var n = '<option value="">-</option>';
    if (e && e.length > 0)
      for (var r = 0; r < e.length; r++)
        n +=
          '<option value="' +
          window.esc(window.trOptionId(e[r])) +
          '">' +
          window.esc(window.trOption(e[r])) +
          '</option>';
    t.innerHTML = n;
  }
}
function Xa() {
  for (
    var a = [
        ['input-kategori', m.kategori, null],
        ['input-gender', m.gender, null],
        ['edit-k-tahapan', m.tahapan, null],
        ['edit-k-status', m.tahapan, null],
        ['input-tsk', m.tsk, null],
        ['j-tsk', m.tsk, null],
        ['input-tahapan-db', m.tahapan, null],
        ['edit-db-tahapan', m.tahapan, null],
        ['checkbox-lokasi', m.lokasi, 'lokasi_cb'],
        ['checkbox-syarat', m.syarat, 'syarat_cb'],
        ['ef-kategori', m.kategori, null],
        ['ef-tsk', m.tsk, null],
        ['ef-gender', m.gender, null],
      ],
      e = 0;
    e < a.length;
    e++
  ) {
    var t = document.getElementById(a[e][0]);
    if (t) {
      var n = t.value;
      (a[e][2] ? Ia(a[e][0], a[e][1], a[e][2]) : Ta(a[e][0], a[e][1]),
        n && t.tagName === 'SELECT' && t.value !== n && (t.value = n));
    }
  }
}
function Ia(a, e, t) {
  var n = document.getElementById(a);
  if (n) {
    var r = '';
    if (e && e.length > 0)
      for (var i = 0; i < e.length; i++)
        r +=
          '<label class="flex items-center gap-2 cursor-pointer p-1 hover:bg-white/10 rounded text-slate-300"><input type="checkbox" name="' +
          t +
          '" value="' +
          window.esc(window.trOptionId(e[i])) +
          '" class="accent-red-500"> ' +
          window.esc(window.trOption(e[i])) +
          '</label>';
    n.innerHTML = r;
  }
}
function Ya(a) {
  let e = a.value.replace(/\D/g, '');
  (e.startsWith('0') ? (e = '62' + e.substring(1)) : e.startsWith('8') && (e = '62' + e),
    (a.value = e.length > 0 ? '+' + e : ''));
  let t = /^628\d{9,10}$/.test(e);
  (a.classList.remove('ring-2', 'ring-red-500', 'ring-emerald-500'),
    e.length > 0 && !t
      ? (a.classList.add('ring-2', 'ring-red-500'), (a.title = window.toastWaFormat()))
      : (t && a.classList.add('ring-2', 'ring-emerald-500'), (a.title = '')));
}
function Za(a) {
  (a.classList.remove('ring-2', 'ring-red-500', 'ring-emerald-500'), (a.title = ''));
}
function Qa(a) {
  var e = document.createElement('textarea');
  ((e.value = decodeURIComponent(a)), document.body.appendChild(e), e.select());
  try {
    (document.execCommand('copy'), Sa(window.tr('alert.success'), 'success'));
  } catch {}
  document.body.removeChild(e);
}
function ae(a, e) {
  let t = document.getElementById(a),
    n = e.querySelector('i.fa-chevron-down');
  (t && t.classList.toggle('hidden'), n && n.classList.toggle('rotate-180'));
}
var y = typeof WeakMap < 'u' ? new WeakMap() : null,
  j = null;
function Ea(a) {
  if (!a) return;
  Fa(a);
  var e = document.activeElement,
    t = a.querySelectorAll(
      'button, [href], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])',
    );
  if (t.length === 0) return;
  var n = t[0],
    r = t[t.length - 1];
  function i(u) {
    if (u.key === 'Escape') {
      (a.classList.add('hidden'), o());
      return;
    }
    u.key === 'Tab' &&
      (u.shiftKey
        ? document.activeElement === n && (u.preventDefault(), r.focus())
        : document.activeElement === r && (u.preventDefault(), n.focus()));
  }
  function o() {
    (a.removeEventListener('keydown', i), l && l.disconnect());
    var u = y ? y.get(a) : null,
      c = u ? u.prev : j;
    (c && typeof c.focus == 'function' && c.focus(), y ? y.delete(a) : (j = null));
  }
  var l = null;
  (typeof MutationObserver < 'u' &&
    ((l = new MutationObserver(function () {
      a.classList.contains('hidden') && o();
    })),
    l.observe(a, { attributes: !0, attributeFilter: ['class'] })),
    y ? y.set(a, { prev: e, handler: i, observer: l }) : (j = e),
    (a._focusTrapCleanup = o),
    a.addEventListener('keydown', i),
    setTimeout(function () {
      n.focus();
    }, 50));
}
function Fa(a) {
  if (a && a._focusTrapCleanup) {
    (a._focusTrapCleanup(), (a._focusTrapCleanup = null));
    return;
  }
  (j && typeof j.focus == 'function' && j.focus(), (j = null));
}
if (typeof MutationObserver < 'u') {
  let a = function (e) {
    e.querySelectorAll('[role="dialog"]').forEach(function (t) {
      L.observe(t, { attributes: !0, attributeFilter: ['class'] });
    });
  };
  ((L = new MutationObserver(function (e) {
    e.forEach(function (t) {
      if (!(t.type !== 'attributes' || t.attributeName !== 'class')) {
        var n = t.target;
        n.getAttribute('role') === 'dialog' &&
          (n.classList.contains('hidden') || n._focusTrapCleanup || Ea(n));
      }
    });
  })),
    (U = new MutationObserver(function (e) {
      e.forEach(function (t) {
        t.addedNodes.forEach(function (n) {
          if (n.nodeType === 1) {
            var r = n;
            (r.getAttribute &&
              r.getAttribute('role') === 'dialog' &&
              L.observe(n, { attributes: !0, attributeFilter: ['class'] }),
              r.querySelectorAll &&
                r.querySelectorAll('[role="dialog"]').forEach(function (i) {
                  L.observe(i, { attributes: !0, attributeFilter: ['class'] });
                }));
          }
        });
      });
    })),
    document.readyState === 'loading'
      ? document.addEventListener('DOMContentLoaded', function () {
          (a(document), U.observe(document.body, { childList: !0, subtree: !0 }));
        })
      : (a(document), U.observe(document.body, { childList: !0, subtree: !0 })));
}
var L, U;
Pa({
  thumbnailUrl: Oa,
  safeSetVal: Ha,
  normalizePhone: Ua,
  showToast: Sa,
  safeSet: Wa,
  setImg: Ka,
  setBg: za,
  getHighResImage: Ja,
  getDirectDownloadUrl: qa,
  formatPendidikanTingkat: Ga,
  isPreviewableFile: Va,
  previewFinalUrl: $a,
  populate: Ta,
  rePopulateDropdowns: Xa,
  populateCheckboxes: Ia,
  formatInputWA: Ya,
  hapusRingWA: Za,
  salinTeksDecode: Qa,
  toggleMinimize: ae,
  trapFocus: Ea,
  releaseFocus: Fa,
});
import { uploadToCloudinary as te } from '../cloudinary.js';
(function () {
  function a(n) {
    if (!n) return '';
    var r = String(n).replace(/\D/g, '');
    return (
      r.startsWith('0') ? (r = '62' + r.substring(1)) : r.startsWith('8') && (r = '62' + r),
      r
    );
  }
  var e = new URLSearchParams(window.location.search),
    t = (e.get('flow') || 'master').toLowerCase() === 'apply' ? 'apply' : 'master';
  window.AI_FORM_CONTEXT = {
    flow: t,
    job: (e.get('job') || '').trim(),
    bidang: (e.get('bidang') || '').trim(),
    wa: a(e.get('wa') || ''),
    nama: (e.get('nama') || '').trim(),
  };
})();
function d(a) {
  return document.getElementById(a);
}
var k = [],
  s = {},
  h = '',
  S = '',
  T = '',
  I = null,
  E = null,
  F = null,
  M = null,
  C = null,
  D = null,
  R = null,
  N = null,
  re =
    'https://gdwvffmevwtwnzrapjwy.supabase.co/storage/v1/object/public/asj-files/assets/logo_asj.png',
  ne =
    'https://gdwvffmevwtwnzrapjwy.supabase.co/storage/v1/object/public/asj-files/assets/jeklin.png',
  g = window.AI_FORM_CONTEXT || {},
  B = {
    f_nama: 'identitas.nama_lengkap',
    f_katakana: 'identitas.katakana',
    f_panggilan: 'identitas.panggilan',
    f_panggilan_katakana: 'identitas.panggilan_katakana',
    f_tmplahir: 'identitas.tempat_lahir',
    f_tgllahir: 'identitas.tgl_lahir',
    f_umur: 'identitas.umur',
    f_gender: 'identitas.gender',
    f_agama: 'identitas.agama',
    f_goldar: 'identitas.golongan_darah',
    f_status: 'identitas.status_nikah',
    f_anak: 'identitas.anak',
    f_email: 'identitas.email',
    f_alamat: 'identitas.alamat',
    f_hp: 'identitas.hp',
    f_hpdarurat: 'identitas.hp_darurat',
    f_ktp: 'identitas.ktp',
    f_paspor: 'identitas.paspor',
    f_sim: 'identitas.sim',
    f_tb: 'fisik.tb',
    f_bb: 'fisik.bb',
    f_topi: 'fisik.topi',
    f_baju: 'fisik.baju',
    f_sepatu: 'fisik.sepatu',
    f_tangan: 'fisik.tangan_dominan',
    f_tahan_ac: 'fisik.tahan_ac',
    f_matakanan: 'medis.mata_kanan',
    f_matakiri: 'medis.mata_kiri',
    f_kacamata: 'medis.kacamata',
    f_butawarna: 'medis.buta_warna',
    f_tato: 'medis.tato',
    f_rokok: 'medis.rokok',
    f_alkohol: 'medis.alkohol',
    f_alergi_id: 'medis.alergi_id',
    f_alergi_jp: 'medis.alergi_jp',
    f_medis_id: 'medis.riwayat_medis_id',
    f_medis_jp: 'medis.riwayat_medis_jp',
    f_laka_id: 'medis.riwayat_kecelakaan_id',
    f_laka_jp: 'medis.riwayat_kecelakaan_jp',
    f_keinginan_id: 'wawancara.keinginan_id',
    f_keinginan_jp: 'wawancara.keinginan_jp',
    f_tujuan_id: 'wawancara.tujuan_ke_jepang',
    f_tujuan_jp: 'wawancara.tujuan_ke_jepang_jp',
    f_riwayatjepang: 'wawancara.riwayat_jepang',
    f_promo_id: 'wawancara.promosi_id',
    f_promo_jp: 'wawancara.promosi_jp',
    f_lebih_id: 'wawancara.kelebihan_id',
    f_lebih_jp: 'wawancara.kelebihan_jp',
    f_kurang_id: 'wawancara.kekurangan_id',
    f_kurang_jp: 'wawancara.kekurangan_jp',
    f_hobi_id: 'wawancara.hobi_id',
    f_hobi_jp: 'wawancara.hobi_jp',
    f_keahlian_id: 'wawancara.keahlian_id',
    f_keahlian_jp: 'wawancara.keahlian_jp',
    f_moti_id: 'wawancara.motivasi_id',
    f_moti_jp: 'wawancara.motivasi_jp',
    f_alasan_id: 'wawancara.alasan_bidang_id',
    f_alasan_jp: 'wawancara.alasan_bidang_jp',
    f_pulang_id: 'wawancara.rencana_pulang_id',
    f_pulang_jp: 'wawancara.rencana_pulang_jp',
    f_lama: 'wawancara.lama_di_jepang',
    f_gaji_yen: 'wawancara.harapan_gaji',
    f_tabungan: 'wawancara.harapan_tabungan',
    f_bhs_jepang: 'sertifikasi.bahasa_jepang',
    f_nilai: 'sertifikasi.nilai',
    f_lisensi: 'sertifikasi.lisensi',
    f_kenalan_nama_id: 'kenalan_jepang.nama_id',
    f_kenalan_nama_jp: 'kenalan_jepang.nama_jp',
    f_kenalan_hub_id: 'kenalan_jepang.hubungan_id',
    f_kenalan_hub_jp: 'kenalan_jepang.hubungan_jp',
    f_kenalan_kerja_id: 'kenalan_jepang.pekerjaan_id',
    f_kenalan_kerja_jp: 'kenalan_jepang.pekerjaan_jp',
    f_kenalan_usia: 'kenalan_jepang.usia',
    f_kenalan_alamat_id: 'kenalan_jepang.alamat_id',
    f_kenalan_alamat_jp: 'kenalan_jepang.alamat_jp',
  },
  ie = ['SD', 'SMP', 'SMA/SMK', 'D3/S1', 'LPK BAHASA'],
  se = ['AYAH', 'IBU', 'SUAMI', 'ISTRI', 'ANAK', 'KAKAK', 'ADIK'],
  Da = {
    pendidikan: [
      ['tingkat', 'form.ai_f_tingkat', 'select', ie],
      ['sekolah_id', 'form.ai_f_sekolah_id'],
      ['sekolah_jp', 'form.ai_f_sekolah_jp'],
      ['jurusan_id', 'form.ai_f_jurusan_id'],
      ['jurusan_jp', 'form.ai_f_jurusan_jp'],
      ['masuk', 'form.ai_f_masuk'],
      ['lulus', 'form.ai_f_lulus'],
    ],
    pekerjaan: [
      ['perusahaan_id', 'form.ai_f_perusahaan_id'],
      ['perusahaan_jp', 'form.ai_f_perusahaan_jp'],
      ['jabatan_id', 'form.ai_f_jabatan_id', 'datalist'],
      ['jabatan_jp', 'form.ai_f_jabatan_jp'],
      ['masuk', 'form.ai_f_mulai'],
      ['keluar', 'form.ai_f_selesai'],
      ['gaji', 'form.ai_f_gaji'],
    ],
    keluarga: [
      ['hubungan_id', 'form.ai_f_hubungan_id', 'select', se],
      ['hubungan_jp', 'form.ai_f_hubungan_jp'],
      ['nama', 'form.ai_f_nama'],
      ['katakana', 'form.ai_f_katakana'],
      ['umur', 'form.ai_f_umur'],
      ['pekerjaan_id', 'form.ai_f_pekerjaan_id', 'datalist'],
      ['pekerjaan_jp', 'form.ai_f_pekerjaan_jp'],
      ['gaji', 'form.ai_f_gaji'],
    ],
  };
function W(a, e) {
  return e.split('.').reduce(function (t, n) {
    return t && t[n] !== void 0 ? t[n] : '';
  }, a || {});
}
function z(a, e, t) {
  var n = e.split('.'),
    r = a;
  (n.slice(0, -1).forEach(function (i) {
    ((!r[i] || typeof r[i] != 'object') && (r[i] = {}), (r = r[i]));
  }),
    (r[n[n.length - 1]] = t));
}
function v(a) {
  return String(a ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
function P(a, e) {
  if (Array.isArray(e)) {
    var t = Array.isArray(a) ? a : [];
    if (!e.length) return t.slice();
    var n = e.map(function (o, l) {
      return P(t[l], o);
    });
    return n.concat(t.slice(e.length));
  }
  if (e && typeof e == 'object') {
    var r = a && typeof a == 'object' && !Array.isArray(a) ? a : {},
      i = {};
    return (
      Object.keys(r).forEach(function (o) {
        i[o] = r[o];
      }),
      Object.keys(e).forEach(function (o) {
        i[o] = P(r[o], e[o]);
      }),
      i
    );
  }
  return e == null || (typeof e == 'string' && !e.trim()) ? (a === void 0 ? '' : a) : e;
}
function oe() {
  (document
    .querySelectorAll('#formPanel input[readonly], #formPanel textarea[readonly]')
    .forEach(function (a) {
      (a.removeAttribute('readonly'), a.setAttribute('title', window.tr('form.ai_f_tooltip')));
    }),
    Object.keys(B).forEach(function (a) {
      var e = d(a);
      !e ||
        e.dataset.manualBound ||
        ((e.dataset.manualBound = 'true'),
        e.addEventListener('input', function () {
          ((s = s && typeof s == 'object' ? s : {}),
            z(s, B[a], e.value),
            e.classList.add('border-sky-400'),
            w());
        }));
    }));
}
function le(a, e, t, n) {
  (Array.isArray(s[a]) || (s[a] = []), s[a][e] || (s[a][e] = {}), (s[a][e][t] = n), w());
}
function de(a) {
  ((s = s && typeof s == 'object' ? s : {}), Array.isArray(s[a]) || (s[a] = []));
  var e = {};
  (Da[a].forEach(function (t) {
    e[t[0]] = '';
  }),
    s[a].push(e),
    x(),
    w());
}
function fe(a, e) {
  Array.isArray(s[a]) && (s[a].splice(e, 1), x(), w());
}
function J() {
  var a = String(g.wa || 'baru').replace(/\D/g, ''),
    e = String(g.job || g.flow || 'master').replace(/[^a-z0-9_-]/gi, '_');
  return 'asj_qween_cv_data_' + a + '_' + e;
}
function ce() {
  s = s && typeof s == 'object' ? s : {};
  var a = s.identitas || {};
  (!a.nama_lengkap && g.nama && z(s, 'identitas.nama_lengkap', g.nama),
    !a.hp && g.wa && z(s, 'identitas.hp', g.wa));
  var e =
    g.flow === 'apply'
      ? 'Lamaran ' + (g.job || 'umum') + ' tersambung ke portal.'
      : 'CV Master tersambung ke profil portal.';
  d('formModeLabel') && (d('formModeLabel').textContent = e);
}
function ue(a) {
  var e = a || '';
  return e.includes('[VIP]') || !!e.match(/\[(?:KELAS\s*[A-Z0-9]+|[A-Z0-9]+)\]/i);
}
function pe(a) {
  return localStorage.getItem('asj_admin_login') === 'sukses' ||
    localStorage.getItem('asj_kandidat_login') !== 'sukses'
    ? Promise.resolve(!0)
    : window
        .callAPI('getAppData', ['kandidat', a])
        .then(function (e) {
          if (e && e.sessionInvalid) return !0;
          var t = e && Array.isArray(e.candidates) ? e.candidates[0] : null,
            n = t ? String(t.catatanInt || t.catatan || '') : '';
          return (!n && e && e.myData && (n = String(e.myData.catatanInt || '')), ue(n));
        })
        .catch(function () {
          return !0;
        });
}
function Ma(a) {
  (d('aiTypingStatus') &&
    (d('aiTypingStatus').classList.remove('hidden'),
    (d('aiTypingStatus').innerHTML =
      '<i class="fas fa-sync fa-spin mr-2"></i> ' + window.tr('form.ai_loading_master'))),
    window
      .callAPI('getDrafCvMaster', [a])
      .then(function (e) {
        if (
          (d('aiTypingStatus') && d('aiTypingStatus').classList.add('hidden'),
          e && ((s = P(e, s)), x(), w(), k.length === 0))
        ) {
          d('chatBox').innerHTML = '';
          var t = _e(s);
          (A('ai', t),
            k.push({ role: 'assistant', content: JSON.stringify({ reply: t, data: {} }) }),
            w());
        }
      })
      .catch(function (e) {
        (d('aiTypingStatus') && d('aiTypingStatus').classList.add('hidden'),
          console.error('Gagal Auto-Fill Master:', e));
      }));
}
function me() {
  if (((d('logoAsj').src = re), typeof window.renderLanguageLight == 'function')) {
    window.renderLanguageLight();
    var a = document.getElementById('lang-btn-ai');
    a && (a.textContent = window.CURRENT_LANG === 'jp' ? 'ID' : 'JP');
  }
  (oe(), typeof window.bersihkanDraftLamaBase64 == 'function' && window.bersihkanDraftLamaBase64());
  var e = localStorage.getItem(J());
  if (e)
    try {
      var t = JSON.parse(e);
      ((k = t.chatHistory || []),
        (s = t.latestCandidateData || {}),
        (h = t.currentPhotoBase64 || ''),
        (S = ''),
        (T = ''),
        (I = null),
        (E = null));
    } catch {
      localStorage.removeItem(J());
    }
  ce();
  var n = g.wa || (s.identitas && s.identitas.hp);
  (n && g.flow === 'master'
    ? pe(n).then(function (r) {
        if (!r) {
          window.location.href =
            '/master-full.html?wa=' +
            encodeURIComponent(n) +
            '&nama=' +
            encodeURIComponent(g.nama || '');
          return;
        }
        Ma(n);
      })
    : n
      ? Ma(n)
      : k.length === 0 && ge(),
    x(),
    h &&
      ((d('previewFoto').src = 'data:image/jpeg;base64,' + h),
      d('previewFoto').classList.remove('hidden'),
      (d('compressStatus').innerHTML =
        '<i class="fas fa-check-circle"></i> ' + window.tr('form.ai_status_saved')),
      d('compressStatus').classList.remove('hidden')),
    S &&
      ((d('status_jft').innerHTML =
        '<i class="fas fa-check-circle"></i> ' + window.tr('form.ai_status_saved_auto')),
      d('status_jft').classList.remove('hidden')),
    T &&
      ((d('status_ssw').innerHTML =
        '<i class="fas fa-check-circle"></i> ' + window.tr('form.ai_status_saved_auto')),
      d('status_ssw').classList.remove('hidden')),
    window.addEventListener('resize', ve));
}
function _e(a) {
  var e = (a && a.identitas) || {},
    t = (a && a.fisik) || {},
    n = (a && a.wawancara) || {},
    r = e.panggilan || e.nama_lengkap || g.nama || '';
  if (r) {
    var i = [];
    (e.ktp || i.push(window.tr('form.chat_missing_ktp')),
      e.paspor || i.push(window.tr('form.chat_missing_paspor')),
      !n.promosi_jp && n.promosi_id && i.push(window.tr('form.chat_missing_jiko')),
      t.topi || i.push(window.tr('form.chat_missing_topi')),
      t.tahan_ac || i.push(window.tr('form.chat_missing_ac')),
      t.tb || i.push(window.tr('form.chat_missing_tb')),
      t.bb || i.push(window.tr('form.chat_missing_bb')),
      (!a.pendidikan || !a.pendidikan.length) && i.push(window.tr('form.chat_missing_pendidikan')),
      (!a.pekerjaan || !a.pekerjaan.length) && i.push(window.tr('form.chat_missing_pekerjaan')));
    var o = window.tr('form.chat_welcome_named_intro').replace('{nama}', r);
    return (
      i.length > 0
        ? (o += window
            .tr('form.chat_welcome_missing')
            .replace('{missing}', i.slice(0, 2).join(' & ')))
        : (o += window.tr('form.chat_welcome_complete')),
      o
    );
  } else return window.tr('form.chat_welcome_nameless');
}
function ge() {
  var a = window.tr('form.chat_welcome_nameless');
  (A('ai', a), k.push({ role: 'assistant', content: JSON.stringify({ reply: a, data: {} }) }), w());
}
function w() {
  try {
    localStorage.setItem(
      J(),
      JSON.stringify({ chatHistory: k, latestCandidateData: s, currentPhotoBase64: h }),
    );
  } catch (a) {
    console.warn('Penyimpanan lokal penuh; data teks tetap tersimpan di halaman saat ini.', a);
  }
}
var Ra = 'chat',
  Ca = window.innerWidth >= 768;
function q(a) {
  if (((Ra = a), !(window.innerWidth >= 768))) {
    var e = d('chatPanel'),
      t = d('formPanel'),
      n = d('btnTabChat'),
      r = d('btnTabForm');
    a === 'chat'
      ? (e.classList.remove('hidden'),
        t.classList.add('hidden'),
        (n.className =
          'flex-1 py-3 text-xs font-bold bg-amber-600/20 text-amber-400 border-b-2 border-amber-500 transition-colors'),
        (r.className =
          'flex-1 py-3 text-xs font-bold text-slate-400 border-b-2 border-transparent transition-colors'))
      : (e.classList.add('hidden'),
        t.classList.remove('hidden'),
        (r.className =
          'flex-1 py-3 text-xs font-bold bg-amber-600/20 text-amber-400 border-b-2 border-amber-500 transition-colors'),
        (n.className =
          'flex-1 py-3 text-xs font-bold text-slate-400 border-b-2 border-transparent transition-colors'));
  }
}
function ve() {
  var a = window.innerWidth >= 768;
  a !== Ca && ((Ca = a), a || q(Ra));
}
function he(a) {
  a.key === 'Enter' && (a.preventDefault(), Na());
}
function A(a, e) {
  var t = a === 'user',
    n = v(e).replace(/\*\*(.*?)\*\*/g, '<b>$1</b>'),
    r = '<i class="fas fa-user"></i>';
  if (typeof h < 'u' && h)
    r =
      '<img src="data:image/jpeg;base64,' +
      h +
      `" alt="" class="w-full h-full object-cover" onerror="this.outerHTML='<i class=&quot;fas fa-user&quot;></i>'">`;
  else {
    var i = document.getElementById('previewFoto');
    i &&
      i.src &&
      i.src.length > 20 &&
      !i.classList.contains('hidden') &&
      (r =
        '<img src="' +
        i.src +
        `" alt="" class="w-full h-full object-cover" onerror="this.outerHTML='<i class=&quot;fas fa-user&quot;></i>'">`);
  }
  var o = '<img src="' + ne + '" alt="" class="w-full h-full object-cover rounded-full">',
    l =
      '<div class="flex gap-2 ' +
      (t ? 'flex-row-reverse' : '') +
      ' fade-in"><div class="w-8 h-8 rounded-full overflow-hidden ' +
      (t ? 'bg-sky-500' : 'bg-amber-500 p-0.5') +
      ' flex-shrink-0 flex items-center justify-center text-xs text-white shadow">' +
      (t ? r : o) +
      '</div><div class="bg-slate-800 p-2.5 rounded-xl ' +
      (t
        ? 'rounded-tr-none text-sky-100 bg-sky-900/40 border border-sky-800'
        : 'rounded-tl-none text-slate-200 border border-slate-700') +
      ' text-[11px] md:text-xs max-w-[85%] shadow leading-relaxed whitespace-pre-wrap">' +
      n +
      '</div></div>';
  ((d('chatBox').innerHTML += l),
    setTimeout(function () {
      d('chatBox').scrollTop = d('chatBox').scrollHeight;
    }, 100));
}
function Na() {
  var a = d('userInput'),
    e = d('sendBtn'),
    t = a.value.trim();
  if (t) {
    (A('user', t),
      (a.value = ''),
      k.push({ role: 'user', content: t }),
      w(),
      (a.disabled = !0),
      (e.disabled = !0),
      (d('aiTypingStatus').innerHTML =
        '<i class="fas fa-magic fa-spin mr-2"></i> ' + window.tr('form.ai_chat_typing')),
      d('aiTypingStatus').classList.remove('hidden'));
    var n = {
      flow: g.flow,
      history: k,
      currentData: s,
      lang: typeof window.CURRENT_LANG < 'u' ? window.CURRENT_LANG : 'id',
    };
    window
      .callAPI('processAIChat', n)
      .then(function (r) {
        if (
          ((a.disabled = !1),
          (e.disabled = !1),
          a.focus(),
          d('aiTypingStatus').classList.add('hidden'),
          r.success === !1)
        ) {
          A('ai', r.error || window.tr('ui.toast_ai_cv_locked'));
          return;
        }
        if (r.reply) {
          var i = r.reply;
          if (typeof r.reply == 'string' && r.reply.startsWith('{'))
            try {
              var o = JSON.parse(r.reply.replace(/\n/g, '\\n'));
              (o.reply && (i = o.reply), o.data && (r.data = Object.assign({}, r.data, o.data)));
            } catch {
              var l = r.reply.match(/"reply"\s*:\s*"([^]*?)"\s*,/);
              l && l[1] && (i = l[1]);
            }
          (A('ai', i),
            k.push({ role: 'assistant', content: typeof r == 'string' ? r : JSON.stringify(r) }));
        }
        (r.data && ((s = P(s, r.data)), x()), w());
      })
      .catch(function (r) {
        ((a.disabled = !1),
          (e.disabled = !1),
          d('aiTypingStatus').classList.add('hidden'),
          A('ai', window.tr('form.ai_chat_error')));
      });
  }
}
function we(a, e) {
  var t = d(a);
  if (t) {
    var n = e == null ? '' : String(e);
    t.value !== n &&
      ((t.value = n),
      t.classList.add('border-amber-500', 'bg-amber-900/30'),
      setTimeout(function () {
        t.classList.remove('border-amber-500', 'bg-amber-900/30');
      }, 1500));
  }
}
function be(a, e) {
  var t = '<option value="">' + window.tr('form.ai_f_pilih') + '</option>',
    n = !1;
  return (
    e.forEach(function (r) {
      var i = Array.isArray(r) ? r[0] : r,
        o = Array.isArray(r) ? r[1] : r;
      String(a) === String(i)
        ? ((n = !0), (t += '<option value="' + v(i) + '" selected>' + v(o) + '</option>'))
        : (t += '<option value="' + v(i) + '">' + v(o) + '</option>');
    }),
    a && !n && (t = '<option value="' + v(a) + '">' + v(a) + '</option>' + t),
    t
  );
}
function K(a, e) {
  var t = d(e),
    n = Array.isArray(s[a]) ? s[a] : [],
    r = Da[a],
    i = n
      .map(function (o, l) {
        var u = r
          .map(function (c) {
            var p = c[0],
              _ = window.tr(c[1]),
              b = c[2],
              O = c[3];
            return b === 'select'
              ? '<div><label class="label-micro">' +
                  _ +
                  `</label><select class="input-micro" onchange="updateArrayField('` +
                  a +
                  "'," +
                  l +
                  ",'" +
                  p +
                  `',this.value)">` +
                  be(o[p], O) +
                  '</select></div>'
              : b === 'datalist'
                ? '<div><label class="label-micro">' +
                  _ +
                  '</label><input type="text" class="input-micro" list="pekerjaan-options" value="' +
                  v(o[p]) +
                  `" oninput="updateArrayField('` +
                  a +
                  "'," +
                  l +
                  ",'" +
                  p +
                  `',this.value)"></div>`
                : '<div><label class="label-micro">' +
                  _ +
                  '</label><input type="text" class="input-micro" value="' +
                  v(o[p]) +
                  `" oninput="updateArrayField('` +
                  a +
                  "'," +
                  l +
                  ",'" +
                  p +
                  `',this.value)"></div>`;
          })
          .join('');
        return (
          '<div class="bg-slate-800 p-2 rounded border border-slate-700 text-[9px] mb-1.5"><div class="flex justify-between items-center mb-1"><span class="font-bold text-slate-300">' +
          window.tr('form.ai_f_data') +
          ' ' +
          (l + 1) +
          `</span><button type="button" class="text-rose-300 hover:text-rose-200" onclick="removeArrayItem('` +
          a +
          "'," +
          l +
          ')"><i class="fas fa-trash"></i> ' +
          window.tr('form.ai_f_hapus') +
          '</button></div><div class="grid grid-cols-2 gap-1.5">' +
          u +
          '</div></div>'
        );
      })
      .join('');
  (i ||
    (i =
      '<div class="text-[9px] text-slate-500 italic py-1">' +
      window.tr('form.txt_belum_data') +
      '</div>'),
    (t.innerHTML =
      i +
      `<button type="button" class="w-full mt-1 py-1 text-[9px] font-bold rounded border border-dashed border-slate-600 text-slate-300 hover:bg-slate-800" onclick="addArrayItem('` +
      a +
      `')"><i class="fas fa-plus mr-1"></i>` +
      window.tr('form.ai_f_tambah') +
      '</button>'));
}
function x() {
  ((s = s && typeof s == 'object' ? s : {}),
    Object.keys(B).forEach(function (t) {
      we(t, W(s, B[t]));
    }),
    K('pendidikan', 'c_pendidikan'),
    K('pekerjaan', 'c_pekerjaan'),
    K('keluarga', 'c_keluarga'));
  var a = s.pas_photo || W(s, 'uploads.photo'),
    e = d('previewFoto');
  (a && a !== '-' && !h && e && ((e.src = a), e.classList.remove('hidden')),
    [
      ['jft', 'status_jft', !!S],
      ['ssw', 'status_ssw', !!T],
      ['ktp', 'status_ktp', !!F],
      ['kk', 'status_kk', !!M],
      ['ijazahSd', 'status_ijazahSd', !!C],
      ['ijazahSmp', 'status_ijazahSmp', !!D],
      ['ijazahSma', 'status_ijazahSma', !!R],
      ['univ', 'status_univ', !!N],
    ].forEach(function (t) {
      var n = t[0],
        r = t[1],
        i = t[2],
        o = W(s, 'uploads.' + n),
        l = d(r);
      if (!(!l || i) && o && o !== '-') {
        var u = v((o.split('/').pop() || n.toUpperCase()).replace(/_+/g, ' '));
        ((l.innerHTML =
          '<i class="fas fa-check-circle"></i> ' +
          window.tr('form.ai_status_existing') +
          ': <a href="' +
          v(o) +
          '" target="_blank" rel="noopener" class="underline hover:text-amber-300">' +
          u +
          '</a>'),
          l.classList.remove('hidden'));
      }
    }));
}
function ke(a) {
  var e = a.target.files[0];
  if (e && window.cekUploadFile(a.target, { maxMb: 10 })) {
    var t = d('compressStatus'),
      n = d('previewFoto');
    (t.classList.remove('hidden'),
      (t.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + window.tr('form.ai_f_proses')));
    var r = new FileReader();
    (r.readAsDataURL(e),
      (r.onload = function (i) {
        var o = new Image();
        ((o.src = i.target.result),
          (o.onload = function () {
            var l = document.createElement('canvas'),
              u = l.getContext('2d'),
              c = o.width,
              p = o.height,
              _ = 600;
            (c > p && c > _ ? ((p *= _ / c), (c = _)) : p > _ && ((c *= _ / p), (p = _)),
              (l.width = c),
              (l.height = p),
              u.drawImage(o, 0, 0, c, p));
            var b = l.toDataURL('image/jpeg', 0.6);
            ((n.src = b),
              n.classList.remove('hidden'),
              (t.innerHTML =
                '<i class="fas fa-check-circle"></i> ' + window.tr('form.ai_f_berhasil')),
              (h = b.split(',')[1]),
              w());
          }));
      }));
  }
}
function je(a, e, t, n) {
  var r = new FileReader();
  ((r.onerror = function () {
    n({ data: '', name: a.name, mime: a.type || 'application/octet-stream' });
  }),
    (r.onload = function (i) {
      var o = i.target.result.split(',')[1];
      if (
        !a.type ||
        !a.type.startsWith('image/') ||
        a.type === 'image/svg+xml' ||
        a.type === 'image/gif'
      )
        return n({ data: o, name: a.name, mime: a.type || 'application/octet-stream' });
      var l = new Image();
      ((l.onload = function () {
        var u = document.createElement('canvas'),
          c = u.getContext('2d'),
          p = l.width,
          _ = l.height,
          b = e || 800;
        (p > b && ((_ = Math.round((_ * b) / p)), (p = b)),
          (u.width = p),
          (u.height = _),
          c.drawImage(l, 0, 0, p, _));
        var O = u.toDataURL('image/jpeg', t || 0.8),
          H = O.split(',')[1],
          Ba = Math.floor((H.length / 4) * 3);
        if (!H || Ba >= a.size)
          return n({ data: o, name: a.name, mime: a.type || 'application/octet-stream' });
        n({
          data: H,
          name: String(a.name || 'scan').replace(/\.[^/.]+$/, '') + '.jpg',
          mime: 'image/jpeg',
        });
      }),
        (l.onerror = function () {
          n({ data: o, name: a.name, mime: a.type || 'application/octet-stream' });
        }),
        (l.src = i.target.result));
    }),
    r.readAsDataURL(a));
}
function ye(a, e) {
  var t = a.target.files[0];
  if (t && window.cekUploadFile(a.target, { maxMb: 3 })) {
    var n = d('status_' + e);
    (n.classList.remove('hidden'),
      (n.innerHTML =
        '<i class="fas fa-spinner fa-spin text-amber-400"></i> ' + window.tr('form.ai_f_membaca')),
      je(t, 800, 0.8, function (r) {
        (e === 'jft' && ((S = r.data), (I = r)),
          e === 'ssw' && ((T = r.data), (E = r)),
          e === 'ktp' && (F = r),
          e === 'kk' && (M = r),
          e === 'ijazahSd' && (C = r),
          e === 'ijazahSmp' && (D = r),
          e === 'ijazahSma' && (R = r),
          e === 'univ' && (N = r),
          (n.innerHTML = '<i class="fas fa-check-circle"></i> File: ' + r.name),
          w());
      }));
  }
}
function Ae(a, e) {
  for (var t = atob(a), n = [], r = 0; r < t.length; r += 512) {
    for (var i = t.slice(r, r + 512), o = new Array(i.length), l = 0; l < i.length; l++)
      o[l] = i.charCodeAt(l);
    n.push(new Uint8Array(o));
  }
  return new Blob(n, { type: e });
}
async function xe(a, e) {
  var t = Object.keys(a).filter(function (c) {
    return a[c] && a[c].data;
  });
  if (t.length === 0) return {};
  for (var n = {}, r = 0; r < t.length; r++) {
    var i = t[r],
      o = a[i],
      l = Ae(o.data, o.mime),
      u = new File([l], o.name || i + '.jpg', { type: o.mime || 'application/octet-stream' });
    n[i] = await te(u);
  }
  return n;
}
async function Le() {
  if (!s.identitas || !s.identitas.nama_lengkap) {
    (window.showToast(window.tr('form.ai_empty_chat_hint'), 'info'),
      window.innerWidth < 768 && q('chat'));
    return;
  }
  var a = d('btnSaveDB');
  ((a.disabled = !0),
    (a.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> ' + window.tr('form.ai_saving_db') + '\u2026'));
  for (
    var e = [
        { f: I, t: 'doc' },
        { f: E, t: 'doc' },
        { f: F, t: 'foto' },
        { f: M, t: 'foto' },
        { f: C, t: 'doc' },
        { f: D, t: 'doc' },
        { f: R, t: 'doc' },
        { f: N, t: 'doc' },
      ].filter(function (c) {
        return !!c.f;
      }),
      t = 0;
    t < e.length;
    t++
  ) {
    var n = String(e[t].f.name || '')
        .split('.')
        .pop()
        .toLowerCase(),
      r = e[t].t === 'foto' ? ['pdf', 'jpg', 'jpeg', 'png'] : ['pdf'];
    if (r.indexOf(n) === -1) {
      ((a.disabled = !1),
        (a.innerHTML = window.tr('form.ai_save_db')),
        window.showToast(
          window.tr('form.ai_ext_check_bad').replace('{file}', e[t].f.name || 'file'),
          'error',
        ));
      return;
    }
  }
  try {
    var i = 'master/' + s.identitas.nama_lengkap.toUpperCase().replace(/[^A-Z0-9_-]/g, '_'),
      o = {
        fotoFile: h ? { data: h, name: 'PAS_PHOTO.jpg', mime: 'image/jpeg' } : null,
        jftFile: I,
        sswFile: E,
        ktpFile: F,
        kkFile: M,
        ijazahSdFile: C,
        ijazahSmpFile: D,
        ijazahSmaFile: R,
        univFile: N,
      },
      l = await xe(o, i),
      u = {
        identitas: s.identitas,
        fisik: s.fisik,
        medis: s.medis,
        pendidikan: s.pendidikan,
        pekerjaan: s.pekerjaan,
        sertifikasi: s.sertifikasi,
        keluarga: s.keluarga,
        wawancara: s.wawancara,
        context: g,
        fotoFile: l.fotoFile || null,
        jftFile: l.jftFile || null,
        sswFile: l.sswFile || null,
        ktpFile: l.ktpFile || null,
        kkFile: l.kkFile || null,
        ijazahSdFile: l.ijazahSdFile || null,
        ijazahSmpFile: l.ijazahSmpFile || null,
        ijazahSmaFile: l.ijazahSmaFile || null,
        univFile: l.univFile || null,
      };
    window
      .callAPI('submitDataAsj', u)
      .then(function (c) {
        ((a.disabled = !1),
          c.success
            ? ((a.innerHTML =
                '<i class="fas fa-check"></i> ' + window.tr('form.ai_save_success_btn')),
              a.classList.replace('bg-emerald-600', 'bg-sky-600'),
              window.showToast(window.tr('form.ai_save_success'), 'success'))
            : (window.showToast(
                window.tr('form.ai_save_failed') + ' ' + (c.message || ''),
                'error',
              ),
              (a.innerHTML =
                '<i class="fas fa-cloud-upload-alt"></i> ' + window.tr('form.ai_save_db'))));
      })
      .catch(function (c) {
        ((a.disabled = !1),
          (a.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> SIMPAN DB'),
          window.showToast(window.tr('form.ai_chat_error'), 'error'));
      });
  } catch (c) {
    ((a.disabled = !1),
      (a.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> SIMPAN DB'),
      window.showToast(window.tr('form.ai_upload_failed') + ' ' + (c.message || ''), 'error'));
  }
}
ee({
  initApp: me,
  switchTab: q,
  handleEnter: he,
  sendMessage: Na,
  updateFormUI: x,
  compressImage: ke,
  handleDocUpload: ye,
  saveToDatabase: Le,
  updateArrayField: le,
  removeArrayItem: fe,
  addArrayItem: de,
});
export {
  de as addArrayItem,
  ke as compressImage,
  ye as handleDocUpload,
  he as handleEnter,
  me as initApp,
  fe as removeArrayItem,
  Le as saveToDatabase,
  Na as sendMessage,
  q as switchTab,
  le as updateArrayField,
  x as updateFormUI,
};
