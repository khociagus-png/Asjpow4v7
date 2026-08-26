import { registerSeamAliases as je } from '../core/bridge.js';
var I = [],
  D = [],
  M = [],
  R = 0,
  C = [],
  N = [],
  B = [],
  F = [],
  O = [],
  U = {},
  j = 'TOKYO',
  f = {},
  P = !1,
  W = !1,
  H = '',
  K = '',
  z = '',
  J = '',
  $ = 10,
  q = 10,
  V = 50,
  G = 10,
  Y = 10,
  X = 'TERBARU',
  Z = 'ALL',
  Q = 'ALL',
  ee = 'MENUNGGU',
  te = '',
  ae = 'ALL',
  re = '',
  ne = null,
  ie = null,
  se = null,
  oe = '',
  le = '';
function s(e, t, a) {
  Object.defineProperty(window, e, { configurable: !0, get: t, set: a });
}
s(
  'ALL_JOBS',
  () => I,
  (e) => {
    I = e;
  },
);
s(
  'ALL_DB_JOBS',
  () => D,
  (e) => {
    D = e;
  },
);
s(
  'ALL_CANDIDATES',
  () => M,
  (e) => {
    M = e;
  },
);
s(
  'ALL_CANDIDATES_TOTAL',
  () => R,
  (e) => {
    R = e;
  },
);
s(
  'ALL_SCHEDULES',
  () => C,
  (e) => {
    C = e;
  },
);
s(
  'ALL_TUGAS',
  () => N,
  (e) => {
    N = e;
  },
);
s(
  'ALL_FORM',
  () => B,
  (e) => {
    B = e;
  },
);
s(
  'ALL_WA_TEMPLATES',
  () => F,
  (e) => {
    F = e;
  },
);
s(
  'ALL_RIWAYAT_KANDIDAT',
  () => O,
  (e) => {
    O = e;
  },
);
s(
  'ASSETS',
  () => U,
  (e) => {
    U = e;
  },
);
s(
  'CURRENT_THEME',
  () => j,
  (e) => {
    j = e;
  },
);
s(
  'DROPDOWNS',
  () => f,
  (e) => {
    f = e;
  },
);
s(
  'isAdmin',
  () => P,
  (e) => {
    P = e;
  },
);
s(
  'isKandidat',
  () => W,
  (e) => {
    W = e;
  },
);
s(
  'currentAdminName',
  () => H,
  (e) => {
    H = e;
  },
);
s(
  'currentKandidatName',
  () => K,
  (e) => {
    K = e;
  },
);
s(
  'currentKandidatWa',
  () => z,
  (e) => {
    z = e;
  },
);
s(
  'currentKandidatId',
  () => J,
  (e) => {
    J = e;
  },
);
s(
  'limitPub',
  () => $,
  (e) => {
    $ = e;
  },
);
s(
  'limitAdm',
  () => q,
  (e) => {
    q = e;
  },
);
s(
  'limitKan',
  () => V,
  (e) => {
    V = e;
  },
);
s(
  'limitJad',
  () => G,
  (e) => {
    G = e;
  },
);
s(
  'limitDb',
  () => Y,
  (e) => {
    Y = e;
  },
);
s(
  'dbSortType',
  () => X,
  (e) => {
    X = e;
  },
);
s(
  'dbFilterBidang',
  () => Z,
  (e) => {
    Z = e;
  },
);
s(
  'dbFilterTahapan',
  () => Q,
  (e) => {
    Q = e;
  },
);
s(
  'mailFilterStatus',
  () => ee,
  (e) => {
    ee = e;
  },
);
s(
  'mailSearchText',
  () => te,
  (e) => {
    te = e;
  },
);
s(
  'currentPublicFilter',
  () => ae,
  (e) => {
    ae = e;
  },
);
s(
  'currentCopyListTxt',
  () => re,
  (e) => {
    re = e;
  },
);
s(
  'CURRENT_WA_KANDIDAT',
  () => ne,
  (e) => {
    ne = e;
  },
);
s(
  'PREV_MAIL_COUNT',
  () => ie,
  (e) => {
    ie = e;
  },
);
s(
  'AUTO_REFRESH_TIMER',
  () => se,
  (e) => {
    se = e;
  },
);
s(
  'ACTIVE_PEMBERKASAN_WA',
  () => oe,
  (e) => {
    oe = e;
  },
);
s(
  'ACTIVE_PEMBERKASAN_NAMA',
  () => le,
  (e) => {
    le = e;
  },
);
import { registerSeamAliases as ye } from '../core/bridge.js';
function Ae(e, t) {
  if (!e || typeof e != 'string' || !/^https?:\/\/[^/]+\/storage\/v1\/object\/public\//i.test(e))
    return e;
  var a = e.indexOf('?') >= 0 ? '&' : '?';
  return e + a + 'width=' + (t || 300) + '&quality=80';
}
function Le(e, t) {
  var a = document.getElementById(e);
  a && (a.value = t || '');
}
function Te(e) {
  if (!e) return '';
  let t = String(e).replace(/\D/g, '');
  return (t.startsWith('0') ? (t = '62' + t.substring(1)) : t.startsWith('8') && (t = '62' + t), t);
}
function de(e, t = 'success') {
  let a = document.getElementById('toast-container');
  if (!a) return;
  let r = document.createElement('div'),
    i =
      t === 'success'
        ? 'bg-emerald-600 border-emerald-400'
        : t === 'error'
          ? 'bg-red-600 border-red-400'
          : 'bg-sky-600 border-sky-400',
    n =
      t === 'success'
        ? 'fa-check-circle'
        : t === 'error'
          ? 'fa-exclamation-triangle'
          : 'fa-info-circle';
  ((r.className =
    'flex items-center gap-3 px-5 py-3.5 rounded-xl border text-white text-sm font-bold shadow-2xl transform transition-transform duration-300 translate-x-full ' +
    i),
    (r.innerHTML = '<i class="fas ' + n + ' text-lg"></i> <span>' + e + '</span>'),
    a.appendChild(r),
    requestAnimationFrame(() => {
      r.classList.remove('translate-x-full');
    }),
    setTimeout(() => {
      (r.classList.add('opacity-0', 'translate-x-full'), setTimeout(() => r.remove(), 300));
    }, 3500));
}
function Se(e, t) {
  var a = document.getElementById(e);
  a && (a.innerHTML = t);
}
function ke(e, t) {
  var a = document.getElementById(e);
  a && t && (a.src = t);
}
function Ee(e, t) {
  var a = document.getElementById(e);
  a && t && (a.style.backgroundImage = "url('" + t + "')");
}
function Ie(e) {
  return !e || e === '-' ? '' : e;
}
function De(e) {
  return !e || e === '-' || e.trim() === '' ? '' : e;
}
function Me(e) {
  if (e == null || e === '-' || e === '[]' || e === '{}') return '';
  var t = null;
  if (typeof e == 'string') {
    var a = e.trim();
    if (a.startsWith('['))
      try {
        t = JSON.parse(a);
      } catch {
        t = null;
      }
  } else Array.isArray(e) && (t = e);
  if (t && t.length) {
    for (var r = t.length - 1; r >= 0; r--) {
      var i = t[r] && (t[r].tingkat || t[r].tingkat_jp || '');
      if (i && i !== '-' && String(i).trim() !== '') return String(i).trim();
    }
    return '';
  }
  return String(e).trim();
}
function Re(e) {
  var t = String(e || '').toLowerCase();
  return !!(
    /[.](jpe?g|png|gif|webp|bmp|svg|pdf)([?#].*)?$/i.test(t) ||
    /[.](xls|xlsx|xlsm|doc|docx|ppt|pptx|odt|ods|odp|txt|rtf|csv)([?#].*)?$/i.test(t)
  );
}
function Ce(e) {
  var t = String(e || ''),
    a = t.toLowerCase(),
    r = /[.](jpe?g|png|gif|webp|bmp|svg)([?#].*)?$/i.test(a) || a.includes('pas_photo'),
    i = /[.]pdf([?#].*)?$/i.test(a);
  if (r) return t;
  if (i) return 'https://docs.google.com/gview?url=' + encodeURIComponent(t) + '&embedded=true';
  var n = /[.](doc|docx|xls|xlsx|ppt|pptx)([?#].*)?$/i.test(a);
  return n ? 'https://view.officeapps.live.com/op/embed.aspx?src=' + encodeURIComponent(t) : t;
}
function ce(e, t) {
  var a = document.getElementById(e);
  if (a) {
    var r = '<option value="">-</option>';
    if (t && t.length > 0)
      for (var i = 0; i < t.length; i++)
        r +=
          '<option value="' +
          window.esc(window.trOptionId(t[i])) +
          '">' +
          window.esc(window.trOption(t[i])) +
          '</option>';
    a.innerHTML = r;
  }
}
function Ne() {
  for (
    var e = [
        ['input-kategori', f.kategori, null],
        ['input-gender', f.gender, null],
        ['edit-k-tahapan', f.tahapan, null],
        ['edit-k-status', f.tahapan, null],
        ['input-tsk', f.tsk, null],
        ['j-tsk', f.tsk, null],
        ['input-tahapan-db', f.tahapan, null],
        ['edit-db-tahapan', f.tahapan, null],
        ['checkbox-lokasi', f.lokasi, 'lokasi_cb'],
        ['checkbox-syarat', f.syarat, 'syarat_cb'],
        ['ef-kategori', f.kategori, null],
        ['ef-tsk', f.tsk, null],
        ['ef-gender', f.gender, null],
      ],
      t = 0;
    t < e.length;
    t++
  ) {
    var a = document.getElementById(e[t][0]);
    if (a) {
      var r = a.value;
      (e[t][2] ? ue(e[t][0], e[t][1], e[t][2]) : ce(e[t][0], e[t][1]),
        r && a.tagName === 'SELECT' && a.value !== r && (a.value = r));
    }
  }
}
function ue(e, t, a) {
  var r = document.getElementById(e);
  if (r) {
    var i = '';
    if (t && t.length > 0)
      for (var n = 0; n < t.length; n++)
        i +=
          '<label class="flex items-center gap-2 cursor-pointer p-1 hover:bg-white/10 rounded text-slate-300"><input type="checkbox" name="' +
          a +
          '" value="' +
          window.esc(window.trOptionId(t[n])) +
          '" class="accent-red-500"> ' +
          window.esc(window.trOption(t[n])) +
          '</label>';
    r.innerHTML = i;
  }
}
function Be(e) {
  let t = e.value.replace(/\D/g, '');
  (t.startsWith('0') ? (t = '62' + t.substring(1)) : t.startsWith('8') && (t = '62' + t),
    (e.value = t.length > 0 ? '+' + t : ''));
  let a = /^628\d{9,10}$/.test(t);
  (e.classList.remove('ring-2', 'ring-red-500', 'ring-emerald-500'),
    t.length > 0 && !a
      ? (e.classList.add('ring-2', 'ring-red-500'), (e.title = window.toastWaFormat()))
      : (a && e.classList.add('ring-2', 'ring-emerald-500'), (e.title = '')));
}
function Fe(e) {
  (e.classList.remove('ring-2', 'ring-red-500', 'ring-emerald-500'), (e.title = ''));
}
function Oe(e) {
  var t = document.createElement('textarea');
  ((t.value = decodeURIComponent(e)), document.body.appendChild(t), t.select());
  try {
    (document.execCommand('copy'), de(window.tr('alert.success'), 'success'));
  } catch {}
  document.body.removeChild(t);
}
function Ue(e, t) {
  let a = document.getElementById(e),
    r = t.querySelector('i.fa-chevron-down');
  (a && a.classList.toggle('hidden'), r && r.classList.toggle('rotate-180'));
}
var h = typeof WeakMap < 'u' ? new WeakMap() : null,
  g = null;
function fe(e) {
  if (!e) return;
  pe(e);
  var t = document.activeElement,
    a = e.querySelectorAll(
      'button, [href], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])',
    );
  if (a.length === 0) return;
  var r = a[0],
    i = a[a.length - 1];
  function n(c) {
    if (c.key === 'Escape') {
      (e.classList.add('hidden'), o());
      return;
    }
    c.key === 'Tab' &&
      (c.shiftKey
        ? document.activeElement === r && (c.preventDefault(), i.focus())
        : document.activeElement === i && (c.preventDefault(), r.focus()));
  }
  function o() {
    (e.removeEventListener('keydown', n), l && l.disconnect());
    var c = h ? h.get(e) : null,
      p = c ? c.prev : g;
    (p && typeof p.focus == 'function' && p.focus(), h ? h.delete(e) : (g = null));
  }
  var l = null;
  (typeof MutationObserver < 'u' &&
    ((l = new MutationObserver(function () {
      e.classList.contains('hidden') && o();
    })),
    l.observe(e, { attributes: !0, attributeFilter: ['class'] })),
    h ? h.set(e, { prev: t, handler: n, observer: l }) : (g = t),
    (e._focusTrapCleanup = o),
    e.addEventListener('keydown', n),
    setTimeout(function () {
      r.focus();
    }, 50));
}
function pe(e) {
  if (e && e._focusTrapCleanup) {
    (e._focusTrapCleanup(), (e._focusTrapCleanup = null));
    return;
  }
  (g && typeof g.focus == 'function' && g.focus(), (g = null));
}
if (typeof MutationObserver < 'u') {
  let e = function (t) {
    t.querySelectorAll('[role="dialog"]').forEach(function (a) {
      y.observe(a, { attributes: !0, attributeFilter: ['class'] });
    });
  };
  ((y = new MutationObserver(function (t) {
    t.forEach(function (a) {
      if (!(a.type !== 'attributes' || a.attributeName !== 'class')) {
        var r = a.target;
        r.getAttribute('role') === 'dialog' &&
          (r.classList.contains('hidden') || r._focusTrapCleanup || fe(r));
      }
    });
  })),
    (k = new MutationObserver(function (t) {
      t.forEach(function (a) {
        a.addedNodes.forEach(function (r) {
          if (r.nodeType === 1) {
            var i = r;
            (i.getAttribute &&
              i.getAttribute('role') === 'dialog' &&
              y.observe(r, { attributes: !0, attributeFilter: ['class'] }),
              i.querySelectorAll &&
                i.querySelectorAll('[role="dialog"]').forEach(function (n) {
                  y.observe(n, { attributes: !0, attributeFilter: ['class'] });
                }));
          }
        });
      });
    })),
    document.readyState === 'loading'
      ? document.addEventListener('DOMContentLoaded', function () {
          (e(document), k.observe(document.body, { childList: !0, subtree: !0 }));
        })
      : (e(document), k.observe(document.body, { childList: !0, subtree: !0 })));
}
var y, k;
ye({
  thumbnailUrl: Ae,
  safeSetVal: Le,
  normalizePhone: Te,
  showToast: de,
  safeSet: Se,
  setImg: ke,
  setBg: Ee,
  getHighResImage: Ie,
  getDirectDownloadUrl: De,
  formatPendidikanTingkat: Me,
  isPreviewableFile: Re,
  previewFinalUrl: Ce,
  populate: ce,
  rePopulateDropdowns: Ne,
  populateCheckboxes: ue,
  formatInputWA: Be,
  hapusRingWA: Fe,
  salinTeksDecode: Oe,
  toggleMinimize: Ue,
  trapFocus: fe,
  releaseFocus: pe,
});
import { uploadToCloudinary as Pe } from '../cloudinary.js';
function d(e) {
  return document.getElementById(e);
}
var w = [],
  u = {},
  m = { ktp: null, kk: null, ijazah: null },
  We =
    'https://gdwvffmevwtwnzrapjwy.supabase.co/storage/v1/object/public/asj-files/assets/jeklin.png',
  A = 'asj_siswa_draft_v1',
  L = {
    f_nama: 'nama',
    f_ttl: 'ttl',
    f_gender: 'gender',
    f_agama: 'agama',
    f_alamat: 'alamat',
    f_email: 'email',
    f_pendidikan: 'pendidikan',
    f_wa_siswa: 'wa_siswa',
    f_wa_ortu: 'wa_ortu',
  };
function we(e) {
  return String(e || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
var ve = 'chat',
  me = window.innerWidth >= 768;
function E(e) {
  if (((ve = e), !(window.innerWidth >= 768))) {
    var t = d('chatPanel'),
      a = d('formPanel'),
      r = d('btnTabChat'),
      i = d('btnTabForm');
    e === 'chat'
      ? (t.classList.remove('hidden'),
        a.classList.add('hidden'),
        (r.className =
          'flex-1 py-3 text-xs font-bold bg-amber-600/20 text-amber-400 border-b-2 border-amber-500 transition-colors'),
        (i.className =
          'flex-1 py-3 text-xs font-bold text-slate-400 border-b-2 border-transparent transition-colors'))
      : (t.classList.add('hidden'),
        a.classList.remove('hidden'),
        (i.className =
          'flex-1 py-3 text-xs font-bold bg-amber-600/20 text-amber-400 border-b-2 border-amber-500 transition-colors'),
        (r.className =
          'flex-1 py-3 text-xs font-bold text-slate-400 border-b-2 border-transparent transition-colors'));
  }
}
function x() {
  try {
    let e = { chat: w, data: u, files: m };
    localStorage.setItem(A, JSON.stringify(e));
  } catch {
    console.warn('Storage penuh, file terlalu besar untuk di-cache.');
  }
}
function He() {
  Object.keys(L).forEach(function (t) {
    var a = d(t);
    a &&
      (a.removeAttribute('readonly'),
      a.addEventListener('input', function () {
        ((u[L[t]] = a.value), a.classList.add('border-sky-400'), x());
      }));
  });
  let e = localStorage.getItem(A);
  if (e)
    try {
      let t = JSON.parse(e);
      ((w = t.chat || []),
        (u = t.data || {}),
        (m = t.files || { ktp: null, kk: null, ijazah: null }),
        w.forEach((a) => {
          let r = a.role === 'user' ? 'user' : 'ai',
            i =
              a && typeof a.content == 'string' && a.content
                ? a.content
                : (a && a.parts && a.parts[0] && a.parts[0].text) || '';
          i && b(r, i);
        }),
        ['ktp', 'kk', 'ijazah'].forEach((a) => {
          m[a] &&
            ((d('status_' + a).innerHTML =
              '<i class="fas fa-check-circle"></i> Tersimpan dari draf'),
            d('status_' + a).classList.remove('hidden'));
        }));
    } catch {
      (localStorage.removeItem(A), ge());
    }
  else ge();
  (he(), window.addEventListener('resize', Ke));
}
function Ke() {
  var e = window.innerWidth >= 768;
  e !== me && ((me = e), e || E(ve));
}
function ge() {
  var e = window.tr('form.siswa_welcome');
  (b('ai', e), w.push({ role: 'assistant', content: e }), x());
}
function ze(e) {
  e.key === 'Enter' && (e.preventDefault(), be());
}
function b(e, t) {
  var a = e === 'user',
    r = we(t).replace(/\*\*(.*?)\*\*/g, '<b>$1</b>'),
    i = '<i class="fas fa-user"></i>',
    n = document.getElementById('previewFoto');
  n &&
    n.src &&
    n.src.length > 20 &&
    !n.classList.contains('hidden') &&
    (i =
      '<img src="' +
      n.src +
      `" alt="" class="w-full h-full object-cover" onerror="this.outerHTML='<i class=\\'fas fa-user\\'></i>'">`);
  var o = '<img src="' + We + '" alt="" class="w-full h-full rounded-full object-cover">',
    l =
      '<div class="flex gap-2 ' +
      (a ? 'flex-row-reverse' : '') +
      ' fade-in"><div class="w-8 h-8 rounded-full ' +
      (a ? 'bg-sky-500 overflow-hidden' : 'bg-amber-500 p-0.5 overflow-hidden') +
      ' flex-shrink-0 flex items-center justify-center text-xs text-white shadow">' +
      (a ? i : o) +
      '</div><div class="bg-slate-800 p-3 rounded-xl ' +
      (a
        ? 'rounded-tr-none text-sky-100 bg-sky-900/40 border border-sky-800'
        : 'rounded-tl-none text-slate-200 border border-slate-700') +
      ' text-xs max-w-[85%] shadow leading-relaxed whitespace-pre-wrap">' +
      r +
      '</div></div>';
  (d('chatBox').insertAdjacentHTML('beforeend', l),
    setTimeout(function () {
      d('chatBox').scrollTop = d('chatBox').scrollHeight;
    }, 100));
}
function Je(e, t) {
  var a = d(e);
  !a ||
    !t ||
    (a.value !== t &&
      ((a.value = t),
      a.classList.add('border-amber-500', 'bg-amber-900/30'),
      setTimeout(function () {
        a.classList.remove('border-amber-500', 'bg-amber-900/30');
      }, 1500)));
}
function he() {
  Object.keys(L).forEach(function (e) {
    Je(e, u[L[e]]);
  });
}
function be() {
  var e = d('userInput'),
    t = d('sendBtn'),
    a = e.value.trim();
  if (a) {
    (b('user', a),
      (e.value = ''),
      w.push({ role: 'user', content: a }),
      x(),
      (e.disabled = !0),
      (t.disabled = !0));
    var r = d('aiTypingStatus');
    (r &&
      (r.innerHTML =
        '<i class="fas fa-magic fa-spin mr-2"></i> ' + window.tr('form.ai_chat_typing')),
      d('aiTypingStatus') && d('aiTypingStatus').classList.remove('hidden'));
    var i = { history: w, currentData: u };
    window
      .callAPI('processSiswaAIChat', i)
      .then(function (n) {
        ((e.disabled = !1), (t.disabled = !1), e.focus());
        var o = d('aiTypingStatus');
        if ((o && o.classList.add('hidden'), n.reply)) {
          var l = n.reply;
          if (typeof n.reply == 'string' && n.reply.startsWith('{'))
            try {
              var c = JSON.parse(n.reply.replace(/\n/g, '\\n'));
              (c.reply && (l = c.reply), c.data && (n.data = Object.assign({}, n.data, c.data)));
            } catch {
              var p = n.reply.match(/"reply"\s*:\s*"([^]*?)"\s*,/);
              p && p[1] && (l = p[1]);
            }
          (b('ai', l),
            w.push({ role: 'assistant', content: typeof n == 'string' ? n : JSON.stringify(n) }));
        }
        (n.data && ((u = Object.assign({}, u, n.data)), he()), x());
      })
      .catch(function (n) {
        ((e.disabled = !1), (t.disabled = !1));
        var o = d('aiTypingStatus');
        (o && o.classList.add('hidden'), b('ai', window.tr('form.ai_chat_error')));
      });
  }
}
function $e(e, t, a, r) {
  var i = new FileReader();
  ((i.onerror = function () {
    r({ data: '', name: e.name, mime: e.type || 'application/octet-stream' });
  }),
    (i.onload = function (n) {
      var o = n.target.result.split(',')[1];
      if (
        !e.type ||
        !e.type.startsWith('image/') ||
        e.type === 'image/svg+xml' ||
        e.type === 'image/gif'
      )
        return r({ data: o, name: e.name, mime: e.type || 'application/octet-stream' });
      var l = new Image();
      ((l.onload = function () {
        var c = document.createElement('canvas'),
          p = c.getContext('2d'),
          v = l.width,
          _ = l.height,
          T = t || 800;
        (v > T && ((_ = Math.round((_ * T) / v)), (v = T)),
          (c.width = v),
          (c.height = _),
          p.drawImage(l, 0, 0, v, _));
        var xe = c.toDataURL('image/jpeg', a || 0.8),
          S = xe.split(',')[1],
          _e = Math.floor((S.length / 4) * 3);
        if (!S || _e >= e.size)
          return r({ data: o, name: e.name, mime: e.type || 'application/octet-stream' });
        r({
          data: S,
          name: String(e.name || 'scan').replace(/\.[^/.]+$/, '') + '.jpg',
          mime: 'image/jpeg',
        });
      }),
        (l.onerror = function () {
          r({ data: o, name: e.name, mime: e.type || 'application/octet-stream' });
        }),
        (l.src = n.target.result));
    }),
    i.readAsDataURL(e));
}
function qe(e, t) {
  var a = e.target.files[0];
  if (a && window.cekUploadFile(e.target, { maxMb: 3 })) {
    var r = d('status_' + t);
    (r.classList.remove('hidden'),
      (r.innerHTML =
        '<i class="fas fa-spinner fa-spin text-amber-400"></i> ' + window.tr('ui.uploading_shard')),
      $e(a, 800, 0.8, function (i) {
        ((m[t] = i), (r.innerHTML = '<i class="fas fa-check-circle"></i> ' + we(i.name)), x());
      }));
  }
}
function Ve(e, t) {
  for (var a = atob(e), r = [], i = 0; i < a.length; i += 512) {
    for (var n = a.slice(i, i + 512), o = new Array(n.length), l = 0; l < n.length; l++)
      o[l] = n.charCodeAt(l);
    r.push(new Uint8Array(o));
  }
  return new Blob(r, { type: t });
}
async function Ge(e, t) {
  var a = Object.keys(e).filter(function (p) {
    return e[p] && e[p].data;
  });
  if (a.length === 0) return {};
  for (var r = {}, i = 0; i < a.length; i++) {
    var n = a[i],
      o = e[n],
      l = Ve(o.data, o.mime),
      c = new File([l], o.name || n + '.jpg', { type: o.mime || 'application/octet-stream' });
    r[n] = await Pe(c);
  }
  return r;
}
async function Ye() {
  let e = [];
  if (
    (u.nama || e.push(window.tr('form.siswa_field_nama')),
    u.ttl || e.push(window.tr('form.siswa_field_ttl')),
    u.gender || e.push(window.tr('form.siswa_field_gender')),
    u.agama || e.push(window.tr('form.siswa_field_agama')),
    u.alamat || e.push(window.tr('form.siswa_field_alamat')),
    u.email || e.push(window.tr('form.siswa_field_email')),
    u.pendidikan || e.push(window.tr('form.siswa_field_pendidikan')),
    u.wa_siswa || e.push(window.tr('form.siswa_field_wa_siswa')),
    u.wa_ortu || e.push(window.tr('form.siswa_field_wa_ortu')),
    m.ktp || e.push(window.tr('form.siswa_field_ktp')),
    m.kk || e.push(window.tr('form.siswa_field_kk')),
    m.ijazah || e.push(window.tr('form.siswa_field_ijazah')),
    e.length > 0)
  ) {
    let n =
      window.tr('form.siswa_missing_header') +
      `

`;
    (e.forEach(
      (o) =>
        (n +=
          '- ' +
          o +
          `
`),
    ),
      (n +=
        `
` + window.tr('form.siswa_missing_footer')),
      window.showToast(n, 'error'),
      window.innerWidth < 768 && E('form'));
    return;
  }
  var t = d('btnSaveDB');
  ((t.disabled = !0),
    (t.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> ' + window.tr('form.siswa_sending') + '\u2026'));
  try {
    var a = 'siswa/' + (u.nama || 'UMUM').toUpperCase().replace(/[^A-Z0-9_-]/g, '_'),
      r = await Ge({ ktp: m.ktp, kk: m.kk, ijazah: m.ijazah }, a),
      i = Object.assign({}, u, { ktp: r.ktp || null, kk: r.kk || null, ijazah: r.ijazah || null });
    window
      .callAPI('submitDaftarSiswa', i)
      .then(function (n) {
        ((t.disabled = !1),
          n.success
            ? ((t.innerHTML =
                '<i class="fas fa-check"></i> ' + window.tr('form.siswa_success_btn')),
              t.classList.replace('bg-emerald-600', 'bg-sky-600'),
              localStorage.removeItem(A),
              window.showToast(window.tr('form.siswa_success'), 'success'))
            : (window.showToast(window.tr('form.siswa_failed') + ' ' + (n.message || ''), 'error'),
              (t.innerHTML =
                '<i class="fas fa-paper-plane"></i> ' + window.tr('form.siswa_submit_btn'))));
      })
      .catch(function (n) {
        ((t.disabled = !1),
          (t.innerHTML =
            '<i class="fas fa-paper-plane"></i> ' + window.tr('form.siswa_submit_btn')),
          window.showToast(window.tr('form.siswa_network_error'), 'error'));
      });
  } catch (n) {
    ((t.disabled = !1),
      (t.innerHTML = '<i class="fas fa-paper-plane"></i> ' + window.tr('form.siswa_submit_btn')),
      window.showToast(window.tr('form.siswa_upload_failed') + ' ' + (n.message || ''), 'error'));
  }
}
je({
  $: d,
  switchTab: E,
  initApp: He,
  handleEnter: ze,
  sendMessage: be,
  handleDocUpload: qe,
  saveToDatabase: Ye,
});
export {
  d as $,
  qe as handleDocUpload,
  ze as handleEnter,
  He as initApp,
  Ye as saveToDatabase,
  be as sendMessage,
  E as switchTab,
};
