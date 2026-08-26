import { registerSeamAliases as b } from './js/core/bridge.js';
var A =
    typeof location < 'u' &&
    (location.hostname === 'localhost' ||
      location.hostname === '127.0.0.1' ||
      location.hostname === '[::1]'),
  k =
    typeof location < 'u' &&
    (location.hostname.indexOf('daytonaproxy') > -1 ||
      location.hostname.indexOf('.freebuff') > -1 ||
      location.hostname.indexOf('freebuff.app') > -1);
k && 'serviceWorker' in navigator
  ? (navigator.serviceWorker
      .getRegistrations()
      .then(function (e) {
        e.forEach(function (n) {
          n.unregister().catch(function () {});
        });
      })
      .catch(function () {}),
    window.caches &&
      caches.keys &&
      caches
        .keys()
        .then(function (e) {
          e.forEach(function (n) {
            caches.delete(n).catch(function () {});
          });
        })
        .catch(function () {}))
  : 'serviceWorker' in navigator &&
    ((d = !1),
    (v = !1),
    window.addEventListener(
      'pointerdown',
      function () {
        v = !0;
      },
      { once: !0, passive: !0 },
    ),
    window.addEventListener(
      'keydown',
      function () {
        v = !0;
      },
      { once: !0 },
    ),
    window.addEventListener('load', function () {
      var e = 2,
        n = 3e4;
      function f() {
        return window.sessionStorage
          ? parseInt(sessionStorage.getItem('asj_reload_count') || '0', 10)
          : 0;
      }
      function o() {
        if (!window.sessionStorage) return !1;
        var t = parseInt(sessionStorage.getItem('asj_last_reload') || '0', 10),
          a = Date.now();
        return !!((t && a - t < n) || f() >= e);
      }
      function r() {
        if (window.sessionStorage) {
          sessionStorage.setItem('asj_last_reload', String(Date.now()));
          var t = f() + 1;
          sessionStorage.setItem('asj_reload_count', String(t));
        }
      }
      sessionStorage.getItem('asj_refreshing_lock') === '1' &&
        (o() ? (d = !0) : sessionStorage.removeItem('asj_refreshing_lock'));
      function s() {
        ((d = !0), window.sessionStorage && sessionStorage.setItem('asj_refreshing_lock', '1'));
      }
      (function () {
        try {
          if (!window.sessionStorage || o()) return;
          fetch('/sw.js?v=' + Date.now(), { cache: 'no-store' })
            .then(function (a) {
              return a.text();
            })
            .then(function (a) {
              var c = a.match(/const VERSION = '([^']+)'/);
              if (c) {
                var u = c[1],
                  g = (u.match(/app-([a-f0-9]+)/) || [])[1],
                  l = '',
                  m = document.querySelector('script[src*="/assets/app-"]');
                if (m) {
                  var _ = m.getAttribute('src').match(/app-([a-f0-9]+)\.js/);
                  _ && (l = _[1]);
                }
                if (l && g && l !== g && !d) {
                  var L = sessionStorage.getItem('asj_sw_purged');
                  if (L !== u) {
                    (sessionStorage.setItem('asj_sw_purged', u),
                      s(),
                      r(),
                      window.caches &&
                        caches.keys &&
                        caches
                          .keys()
                          .then(function (p) {
                            p.forEach(function (S) {
                              caches.delete(S).catch(function () {});
                            });
                          })
                          .catch(function () {}),
                      navigator.serviceWorker &&
                        navigator.serviceWorker.getRegistrations &&
                        navigator.serviceWorker
                          .getRegistrations()
                          .then(function (p) {
                            p.forEach(function (S) {
                              S.unregister().catch(function () {});
                            });
                          })
                          .catch(function () {}),
                      window.location.reload());
                    return;
                  }
                }
                var y = sessionStorage.getItem('asj_sw_ver');
                (sessionStorage.setItem('asj_sw_ver', u),
                  y && y !== u && !d && !o() && (s(), r(), window.location.reload()));
              }
            })
            .catch(function () {});
        } catch {}
      })();
      var i = '/sw.js?v=' + Date.now();
      (navigator.serviceWorker
        .register(i, { updateViaCache: 'none' })
        .then(function (t) {
          if (!t) return;
          function a() {
            navigator.onLine && t.update().catch(function () {});
          }
          (a(),
            window.setInterval(a, 60 * 1e3),
            window.addEventListener('focus', a),
            document.addEventListener('visibilitychange', function () {
              document.visibilityState === 'visible' && a();
            }),
            t.addEventListener('updatefound', function () {
              var c = t.installing;
              c &&
                c.addEventListener('statechange', function () {
                  c.state === 'installed' &&
                    navigator.serviceWorker.controller &&
                    c.postMessage({ type: 'SKIP_WAITING' });
                });
            }));
        })
        .catch(function (t) {
          console.warn('[PWA] Registrasi service worker gagal:', t);
        }),
        navigator.serviceWorker.addEventListener('controllerchange', function () {
          if (!d && !v && !o()) {
            (s(), r());
            try {
              window.showToast &&
                window.showToast('Versi terbaru tersedia \u2014 memuat ulang\u2026', 'info');
            } catch {}
            window.setTimeout(function () {
              window.location.reload();
            }, 1200);
          }
        }),
        navigator.serviceWorker.addEventListener('message', function (t) {
          if (!(!t.data || t.data.type !== 'ASJ_FORCE_RELOAD') && !d && !v && !o()) {
            (s(), r());
            try {
              window.showToast &&
                window.showToast('Versi terbaru tersedia \u2014 memuat ulang\u2026', 'info');
            } catch {}
            window.setTimeout(function () {
              window.location.reload();
            }, 1200);
          }
        }));
    }),
    document.readyState === 'complete' &&
      ((E = '/sw.js?v=' + Date.now()),
      navigator.serviceWorker.register(E, { updateViaCache: 'none' }).catch(function () {})));
var d,
  v,
  E,
  w = null,
  h = null;
window.addEventListener('beforeinstallprompt', function (e) {
  (e.preventDefault(), (w = e));
});
window.addEventListener('install', function (e) {
  (e.preventDefault(), (h = e));
});
function W() {
  var e = document.getElementById('modal-install'),
    n = w || h;
  if (n) {
    try {
      var f = n.prompt(),
        o = n.userChoice || f || Promise.resolve(null);
      Promise.resolve(o)
        .then(function (r) {
          var s = r && r.outcome === 'dismissed';
          s && e && e.classList.remove('hidden');
        })
        .catch(function () {});
    } catch (r) {
      (console.warn('[PWA] Gagal memicu prompt install:', r), e && e.classList.remove('hidden'));
    }
    ((w = null), (h = null));
    return;
  }
  e && e.classList.remove('hidden');
}
window.addEventListener('appinstalled', function () {
  ((w = null), (h = null));
  var e = document.getElementById('modal-install');
  e && e.classList.add('hidden');
});
function I() {
  try {
    for (var e = 'asj_qween_cv_data_', n = [], f = 0; f < localStorage.length; f++) {
      var o = localStorage.key(f);
      o && o.indexOf(e) === 0 && n.push(o);
    }
    n.forEach(function (r) {
      var s = localStorage.getItem(r);
      if (s) {
        var i = null;
        try {
          i = JSON.parse(s);
        } catch {}
        if (!i || typeof i != 'object') {
          localStorage.removeItem(r);
          return;
        }
        var t = i.currentJftBase64,
          a = i.currentSswBase64,
          c = i.currentJftFile,
          u = i.currentSswFile,
          g =
            (typeof t == 'string' && t.length > 0) ||
            (typeof a == 'string' && a.length > 0) ||
            (c && typeof c == 'object' && c.data) ||
            (u && typeof u == 'object' && u.data);
        if (g) {
          var l = {
            chatHistory: i.chatHistory || [],
            latestCandidateData: i.latestCandidateData || {},
            currentPhotoBase64: i.currentPhotoBase64 || '',
          };
          localStorage.setItem(r, JSON.stringify(l));
        }
      }
    });
  } catch (r) {
    console.warn('[PWA] Gagal membersihkan draft lama:', r);
  }
}
b({ cobaInstallApp: W, bersihkanDraftLamaBase64: I }, { source: 'pwa' });
I();
(function () {
  try {
    var n = '',
      f = document.querySelector('script[src*="/assets/app-"]');
    if (f) {
      var o = f.getAttribute('src').match(/app-([a-f0-9]+)\.js/);
      o && (n = o[1]);
    }
    if (!n) {
      var r = document.querySelector('script[src*="/pwa.js"]');
      if (r) {
        var s = (r.getAttribute('src') || '').match(/[?&]v=([^&]+)/);
        s && (n = s[1]);
      }
    }
    if (!n) return;
    var i = 'Versi aplikasi. Kalau tidak sama dengan versi terbaru, refresh / clear site data.',
      t = document.querySelector('[data-lang="footer.copyright"]');
    if (!t || t.querySelector('.asj-ver-badge')) return;
    var a = document.createElement('span');
    ((a.className = 'asj-ver-badge ml-2 text-emerald-300/90 font-mono'),
      (a.textContent = 'v' + n),
      (a.title = i),
      t.appendChild(a));
  } catch {}
})();
'serviceWorker' in navigator &&
  !k &&
  ((j = '/sw.js?v=' + Date.now()),
  navigator.serviceWorker.register(j, { updateViaCache: 'none' }).catch(function () {}));
var j;
export { I as bersihkanDraftLamaBase64, W as cobaInstallApp };
