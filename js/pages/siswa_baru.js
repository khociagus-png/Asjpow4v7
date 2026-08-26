import { registerSeamAliases as A } from '../core/bridge.js';
import '../init/util.js';
import { uploadToCloudinary as H } from '../cloudinary.js';
function o(a) {
  return document.getElementById(a);
}
var p = [],
  d = {},
  f = { ktp: null, kk: null, ijazah: null },
  D =
    'https://gdwvffmevwtwnzrapjwy.supabase.co/storage/v1/object/public/asj-files/assets/jeklin.png',
  v = 'asj_siswa_draft_v1',
  b = {
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
function L(a) {
  return String(a || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
var j = 'chat',
  k = window.innerWidth >= 768;
function x(a) {
  if (((j = a), !(window.innerWidth >= 768))) {
    var r = o('chatPanel'),
      e = o('formPanel'),
      i = o('btnTabChat'),
      s = o('btnTabForm');
    a === 'chat'
      ? (r.classList.remove('hidden'),
        e.classList.add('hidden'),
        (i.className =
          'flex-1 py-3 text-xs font-bold bg-amber-600/20 text-amber-400 border-b-2 border-amber-500 transition-colors'),
        (s.className =
          'flex-1 py-3 text-xs font-bold text-slate-400 border-b-2 border-transparent transition-colors'))
      : (r.classList.add('hidden'),
        e.classList.remove('hidden'),
        (s.className =
          'flex-1 py-3 text-xs font-bold bg-amber-600/20 text-amber-400 border-b-2 border-amber-500 transition-colors'),
        (i.className =
          'flex-1 py-3 text-xs font-bold text-slate-400 border-b-2 border-transparent transition-colors'));
  }
}
function h() {
  try {
    let a = { chat: p, data: d, files: f };
    localStorage.setItem(v, JSON.stringify(a));
  } catch {
    console.warn('Storage penuh, file terlalu besar untuk di-cache.');
  }
}
function z() {
  Object.keys(b).forEach(function (r) {
    var e = o(r);
    e &&
      (e.removeAttribute('readonly'),
      e.addEventListener('input', function () {
        ((d[b[r]] = e.value), e.classList.add('border-sky-400'), h());
      }));
  });
  let a = localStorage.getItem(v);
  if (a)
    try {
      let r = JSON.parse(a);
      ((p = r.chat || []),
        (d = r.data || {}),
        (f = r.files || { ktp: null, kk: null, ijazah: null }),
        p.forEach((e) => {
          let i = e.role === 'user' ? 'user' : 'ai',
            s =
              e && typeof e.content == 'string' && e.content
                ? e.content
                : (e && e.parts && e.parts[0] && e.parts[0].text) || '';
          s && m(i, s);
        }),
        ['ktp', 'kk', 'ijazah'].forEach((e) => {
          f[e] &&
            ((o('status_' + e).innerHTML =
              '<i class="fas fa-check-circle"></i> Tersimpan dari draf'),
            o('status_' + e).classList.remove('hidden'));
        }));
    } catch {
      (localStorage.removeItem(v), T());
    }
  else T();
  (S(), window.addEventListener('resize', B));
}
function B() {
  var a = window.innerWidth >= 768;
  a !== k && ((k = a), a || x(j));
}
function T() {
  var a = window.tr('form.siswa_welcome');
  (m('ai', a), p.push({ role: 'assistant', content: a }), h());
}
function F(a) {
  a.key === 'Enter' && (a.preventDefault(), M());
}
function m(a, r) {
  var e = a === 'user',
    i = L(r).replace(/\*\*(.*?)\*\*/g, '<b>$1</b>'),
    s = '<i class="fas fa-user"></i>',
    t = document.getElementById('previewFoto');
  t &&
    t.src &&
    t.src.length > 20 &&
    !t.classList.contains('hidden') &&
    (s =
      '<img src="' +
      t.src +
      `" alt="" class="w-full h-full object-cover" onerror="this.outerHTML='<i class=\\'fas fa-user\\'></i>'">`);
  var n = '<img src="' + D + '" alt="" class="w-full h-full rounded-full object-cover">',
    l =
      '<div class="flex gap-2 ' +
      (e ? 'flex-row-reverse' : '') +
      ' fade-in"><div class="w-8 h-8 rounded-full ' +
      (e ? 'bg-sky-500 overflow-hidden' : 'bg-amber-500 p-0.5 overflow-hidden') +
      ' flex-shrink-0 flex items-center justify-center text-xs text-white shadow">' +
      (e ? s : n) +
      '</div><div class="bg-slate-800 p-3 rounded-xl ' +
      (e
        ? 'rounded-tr-none text-sky-100 bg-sky-900/40 border border-sky-800'
        : 'rounded-tl-none text-slate-200 border border-slate-700') +
      ' text-xs max-w-[85%] shadow leading-relaxed whitespace-pre-wrap">' +
      i +
      '</div></div>';
  (o('chatBox').insertAdjacentHTML('beforeend', l),
    setTimeout(function () {
      o('chatBox').scrollTop = o('chatBox').scrollHeight;
    }, 100));
}
function U(a, r) {
  var e = o(a);
  !e ||
    !r ||
    (e.value !== r &&
      ((e.value = r),
      e.classList.add('border-amber-500', 'bg-amber-900/30'),
      setTimeout(function () {
        e.classList.remove('border-amber-500', 'bg-amber-900/30');
      }, 1500)));
}
function S() {
  Object.keys(b).forEach(function (a) {
    U(a, d[b[a]]);
  });
}
function M() {
  var a = o('userInput'),
    r = o('sendBtn'),
    e = a.value.trim();
  if (e) {
    (m('user', e),
      (a.value = ''),
      p.push({ role: 'user', content: e }),
      h(),
      (a.disabled = !0),
      (r.disabled = !0));
    var i = o('aiTypingStatus');
    (i &&
      (i.innerHTML =
        '<i class="fas fa-magic fa-spin mr-2"></i> ' + window.tr('form.ai_chat_typing')),
      o('aiTypingStatus') && o('aiTypingStatus').classList.remove('hidden'));
    var s = { history: p, currentData: d };
    window
      .callAPI('processSiswaAIChat', s)
      .then(function (t) {
        ((a.disabled = !1), (r.disabled = !1), a.focus());
        var n = o('aiTypingStatus');
        if ((n && n.classList.add('hidden'), t.reply)) {
          var l = t.reply;
          if (typeof t.reply == 'string' && t.reply.startsWith('{'))
            try {
              var c = JSON.parse(t.reply.replace(/\n/g, '\\n'));
              (c.reply && (l = c.reply), c.data && (t.data = Object.assign({}, t.data, c.data)));
            } catch {
              var w = t.reply.match(/"reply"\s*:\s*"([^]*?)"\s*,/);
              w && w[1] && (l = w[1]);
            }
          (m('ai', l),
            p.push({ role: 'assistant', content: typeof t == 'string' ? t : JSON.stringify(t) }));
        }
        (t.data && ((d = Object.assign({}, d, t.data)), S()), h());
      })
      .catch(function (t) {
        ((a.disabled = !1), (r.disabled = !1));
        var n = o('aiTypingStatus');
        (n && n.classList.add('hidden'), m('ai', window.tr('form.ai_chat_error')));
      });
  }
}
function C(a, r, e, i) {
  var s = new FileReader();
  ((s.onerror = function () {
    i({ data: '', name: a.name, mime: a.type || 'application/octet-stream' });
  }),
    (s.onload = function (t) {
      var n = t.target.result.split(',')[1];
      if (
        !a.type ||
        !a.type.startsWith('image/') ||
        a.type === 'image/svg+xml' ||
        a.type === 'image/gif'
      )
        return i({ data: n, name: a.name, mime: a.type || 'application/octet-stream' });
      var l = new Image();
      ((l.onload = function () {
        var c = document.createElement('canvas'),
          w = c.getContext('2d'),
          u = l.width,
          g = l.height,
          _ = r || 800;
        (u > _ && ((g = Math.round((g * _) / u)), (u = _)),
          (c.width = u),
          (c.height = g),
          w.drawImage(l, 0, 0, u, g));
        var E = c.toDataURL('image/jpeg', e || 0.8),
          y = E.split(',')[1],
          I = Math.floor((y.length / 4) * 3);
        if (!y || I >= a.size)
          return i({ data: n, name: a.name, mime: a.type || 'application/octet-stream' });
        i({
          data: y,
          name: String(a.name || 'scan').replace(/\.[^/.]+$/, '') + '.jpg',
          mime: 'image/jpeg',
        });
      }),
        (l.onerror = function () {
          i({ data: n, name: a.name, mime: a.type || 'application/octet-stream' });
        }),
        (l.src = t.target.result));
    }),
    s.readAsDataURL(a));
}
function P(a, r) {
  var e = a.target.files[0];
  if (e && window.cekUploadFile(a.target, { maxMb: 3 })) {
    var i = o('status_' + r);
    (i.classList.remove('hidden'),
      (i.innerHTML =
        '<i class="fas fa-spinner fa-spin text-amber-400"></i> ' + window.tr('ui.uploading_shard')),
      C(e, 800, 0.8, function (s) {
        ((f[r] = s), (i.innerHTML = '<i class="fas fa-check-circle"></i> ' + L(s.name)), h());
      }));
  }
}
function N(a, r) {
  for (var e = atob(a), i = [], s = 0; s < e.length; s += 512) {
    for (var t = e.slice(s, s + 512), n = new Array(t.length), l = 0; l < t.length; l++)
      n[l] = t.charCodeAt(l);
    i.push(new Uint8Array(n));
  }
  return new Blob(i, { type: r });
}
async function O(a, r) {
  var e = Object.keys(a).filter(function (w) {
    return a[w] && a[w].data;
  });
  if (e.length === 0) return {};
  for (var i = {}, s = 0; s < e.length; s++) {
    var t = e[s],
      n = a[t],
      l = N(n.data, n.mime),
      c = new File([l], n.name || t + '.jpg', { type: n.mime || 'application/octet-stream' });
    i[t] = await H(c);
  }
  return i;
}
async function W() {
  let a = [];
  if (
    (d.nama || a.push(window.tr('form.siswa_field_nama')),
    d.ttl || a.push(window.tr('form.siswa_field_ttl')),
    d.gender || a.push(window.tr('form.siswa_field_gender')),
    d.agama || a.push(window.tr('form.siswa_field_agama')),
    d.alamat || a.push(window.tr('form.siswa_field_alamat')),
    d.email || a.push(window.tr('form.siswa_field_email')),
    d.pendidikan || a.push(window.tr('form.siswa_field_pendidikan')),
    d.wa_siswa || a.push(window.tr('form.siswa_field_wa_siswa')),
    d.wa_ortu || a.push(window.tr('form.siswa_field_wa_ortu')),
    f.ktp || a.push(window.tr('form.siswa_field_ktp')),
    f.kk || a.push(window.tr('form.siswa_field_kk')),
    f.ijazah || a.push(window.tr('form.siswa_field_ijazah')),
    a.length > 0)
  ) {
    let t =
      window.tr('form.siswa_missing_header') +
      `

`;
    (a.forEach(
      (n) =>
        (t +=
          '- ' +
          n +
          `
`),
    ),
      (t +=
        `
` + window.tr('form.siswa_missing_footer')),
      window.showToast(t, 'error'),
      window.innerWidth < 768 && x('form'));
    return;
  }
  var r = o('btnSaveDB');
  ((r.disabled = !0),
    (r.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> ' + window.tr('form.siswa_sending') + '\u2026'));
  try {
    var e = 'siswa/' + (d.nama || 'UMUM').toUpperCase().replace(/[^A-Z0-9_-]/g, '_'),
      i = await O({ ktp: f.ktp, kk: f.kk, ijazah: f.ijazah }, e),
      s = Object.assign({}, d, { ktp: i.ktp || null, kk: i.kk || null, ijazah: i.ijazah || null });
    window
      .callAPI('submitDaftarSiswa', s)
      .then(function (t) {
        ((r.disabled = !1),
          t.success
            ? ((r.innerHTML =
                '<i class="fas fa-check"></i> ' + window.tr('form.siswa_success_btn')),
              r.classList.replace('bg-emerald-600', 'bg-sky-600'),
              localStorage.removeItem(v),
              window.showToast(window.tr('form.siswa_success'), 'success'))
            : (window.showToast(window.tr('form.siswa_failed') + ' ' + (t.message || ''), 'error'),
              (r.innerHTML =
                '<i class="fas fa-paper-plane"></i> ' + window.tr('form.siswa_submit_btn'))));
      })
      .catch(function (t) {
        ((r.disabled = !1),
          (r.innerHTML =
            '<i class="fas fa-paper-plane"></i> ' + window.tr('form.siswa_submit_btn')),
          window.showToast(window.tr('form.siswa_network_error'), 'error'));
      });
  } catch (t) {
    ((r.disabled = !1),
      (r.innerHTML = '<i class="fas fa-paper-plane"></i> ' + window.tr('form.siswa_submit_btn')),
      window.showToast(window.tr('form.siswa_upload_failed') + ' ' + (t.message || ''), 'error'));
  }
}
A({
  $: o,
  switchTab: x,
  initApp: z,
  handleEnter: F,
  sendMessage: M,
  handleDocUpload: P,
  saveToDatabase: W,
});
export {
  o as $,
  P as handleDocUpload,
  F as handleEnter,
  z as initApp,
  W as saveToDatabase,
  M as sendMessage,
  x as switchTab,
};
