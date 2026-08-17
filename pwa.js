/* ASJ Portal - PWA helper
   - Registrasi service worker
   - Tangkap beforeinstallprompt (Chrome Android/Desktop) agar tombol "Install App" bisa memicu prompt asli browser
   - Fallback ke modal panduan manual (iOS Safari / browser yang tidak support prompt)

   ESM (Fase 3 langkah 13): modul ES — cobaInstallApp/bersihkanDraftLamaBase64
   di-export + alias window.* (pemakai classic/bundel & HTML onclick).
   Listener top-level tetap terdaftar saat modul dievaluasi (bundel: IIFE per
   file; standalone: <script type="module"> yang dieksekusi setelah parse,
   sebelum DOMContentLoaded/onload).
*/
// 0. MODE DEV (localhost) & PREVIEW Freebuff — preview SELALU fresh, tanpa
// chance versi lama.
// Service worker memakai strategi stale-while-revalidate: di production VERSION
// SW naik tiap deploy (bump-cache-versions) jadi cache dibuang otomatis, tapi
// di dev VERSION TIDAK berubah saat kita mengedit file -> aset JS lama bisa
// terus disajikan dari cache SW walau kode sumber sudah berubah. Solusinya:
// jangan daftarkan SW di localhost SAMA SEKALI, dan unregister + bersihkan
// cache SW lama (dari sesi dev sebelumnya) supaya tidak ada yang ikut campur.
//
// Host PREVIEW Freebuff (mis. https://3000-<id>.daytonaproxy01.net) juga
// BUKAN production, tapi bukan localhost pula — tanpa pengecualian ini HP user
// mendaftarkan SW beneran di domain preview dan cache-nya nyangkut (reload
// berulang tetap versi lama, kasus 2026-08-17). Perlakukan sama seperti
// localhost: unregister SW lama + bersihkan cache + JANGAN daftar. (Server
// preview serve-static.mjs juga melayani sw.js no-op sebagai jaring pengaman —
// lihat NOOP_SW di sana.)
var IS_DEV_HOST =
  typeof location !== 'undefined' &&
  (location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1' ||
    location.hostname === '[::1]');
var IS_PREVIEW_HOST =
  typeof location !== 'undefined' &&
  (location.hostname.indexOf('daytonaproxy') > -1 ||
    location.hostname.indexOf('.freebuff') > -1 ||
    location.hostname.indexOf('freebuff.app') > -1);
if ((IS_DEV_HOST || IS_PREVIEW_HOST) && 'serviceWorker' in navigator) {
  // Hapus SW lama + cache-nya (aman: hanya di localhost, production tidak
  // tersentuh). Dipanggil sekali di awal, sebelum registrasi apa pun.
  navigator.serviceWorker
    .getRegistrations()
    .then(function (regs) {
      regs.forEach(function (reg) {
        reg.unregister().catch(function () {});
      });
    })
    .catch(function () {});
  if (window.caches && caches.keys) {
    caches
      .keys()
      .then(function (keys) {
        keys.forEach(function (k) {
          caches.delete(k).catch(function () {});
        });
      })
      .catch(function () {});
  }
} else if ('serviceWorker' in navigator) {
  // 1. Registrasi service worker (HANYA production / non-localhost)
  var refreshing = false;
  var userInteracted = false;
  // Tandai interaksi user pertama (klik/touch/keydown) supaya auto-reload
  // tidak pernah memotong gestur install/prompt yang sedang berjalan.
  window.addEventListener(
    'pointerdown',
    function () {
      userInteracted = true;
    },
    { once: true, passive: true },
  );
  window.addEventListener(
    'keydown',
    function () {
      userInteracted = true;
    },
    { once: true },
  );

  window.addEventListener('load', function () {
    // SELF-CHECK ANTI-BASI (jaring pengaman #2, TIDAK tergantung siklus hidup
    // service worker): bandingkan VERSION sw.js di server dengan yang terakhir
    // dilihat. Kalau berubah (deploy baru), reload sekali — halaman basi dari
    // cache langsung dilempar ke versi terbaru. Query param acak memastikan
    // fetch ini tidak pernah dijawab dari cache SW/HTTP lama.
    // (Jaring pengaman #1 = siklus SW di bawah: skipWaiting + activate purge +
    // broadcast ASJ_FORCE_RELOAD di sw.js.)
    (function cekVersiSw() {
      try {
        if (!window.sessionStorage) return;
        fetch('/sw.js?v=' + Date.now(), { cache: 'no-store' })
          .then(function (r) {
            return r.text();
          })
          .then(function (t) {
            var m = t.match(/const VERSION = '([^']+)'/);
            if (!m) return;
            var ver = m[1];
            var last = sessionStorage.getItem('asj_sw_ver');
            sessionStorage.setItem('asj_sw_ver', ver);
            if (last && last !== ver && !refreshing) {
              refreshing = true;
              window.location.reload();
            }
          })
          .catch(function () {});
      } catch (e) {
        /* non-blokir */
      }
    })();

    // updateViaCache:'none' -> browser SELALU mengecek sw.js ke jaringan
    // (tidak memakai HTTP cache) setiap kali update dicek. Tanpa ini browser
    // bisa memakai sw.js lama berhari-hari dan versi lama terus disajikan.
    navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then(function (reg) {
        if (!reg) return;

        // Cek update: segera, tiap 60 dtk, dan saat tab kembali fokus.
        // reg.update() memaksa browser membandingkan sw.js dengan server —
        // versi baru langsung terdeteksi walau halaman sudah lama terbuka
        // (tanpa perlu reload manual).
        function cekUpdate() {
          if (!navigator.onLine) return;
          reg.update().catch(function () {});
        }
        cekUpdate();
        window.setInterval(cekUpdate, 60 * 1000);
        window.addEventListener('focus', cekUpdate);
        document.addEventListener('visibilitychange', function () {
          if (document.visibilityState === 'visible') cekUpdate();
        });

        // SW baru terpasang -> minta aktif segera via SKIP_WAITING (diterima
        // listener di sw.js). Tanpa ini SW baru menunggu sampai semua tab
        // ditutup sebelum mengambil alih — versi baru bisa tertunda.
        reg.addEventListener('updatefound', function () {
          var swBaru = reg.installing;
          if (!swBaru) return;
          swBaru.addEventListener('statechange', function () {
            if (swBaru.state === 'installed' && navigator.serviceWorker.controller) {
              swBaru.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      })
      .catch(function (err) {
        console.warn('[PWA] Registrasi service worker gagal:', err);
      });

    // Auto-reload saat Service Worker baru aktif (mencegah cache nyangkut).
    // DITUNDA: hanya reload saat halaman sudah lama tidak aktif / user tidak
    // sedang berinteraksi — reload di tengah klik "Install App" akan
    // membatalkan prompt install (deferredPrompt hilang).
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (refreshing) return;
      if (userInteracted) return; // user sedang aktif — jangan ganggu
      refreshing = true;
      try {
        if (window.showToast) {
          window.showToast('Versi terbaru tersedia — memuat ulang…', 'info');
        }
      } catch (e) {
        /* toast opsional — jangan sampai memblokir reload */
      }
      window.setTimeout(function () {
        window.location.reload();
      }, 1200);
    });

    // Pesan dari Service Worker: versi baru SUDAH aktif (ASJ_FORCE_RELOAD
    // dikirim sw.js saat activate). Langsung muat ulang — tanpa menunggu
    // reload manual. Sama seperti controllerchange di atas, tapi ini juga
    // menangkap tab yang sedang terbuka saat SW baru mengambil alih.
    navigator.serviceWorker.addEventListener('message', function (ev) {
      if (!ev.data || ev.data.type !== 'ASJ_FORCE_RELOAD') return;
      if (refreshing) return;
      if (userInteracted) return; // user sedang aktif — jangan ganggu
      refreshing = true;
      try {
        if (window.showToast) {
          window.showToast('Versi terbaru tersedia — memuat ulang…', 'info');
        }
      } catch (e) {
        /* toast opsional */
      }
      window.setTimeout(function () {
        window.location.reload();
      }, 1200);
    });
  });
}

// 2. Tangkap beforeinstallprompt (Chrome Android/Desktop)
var deferredPrompt = null;
var pendingInstallEvent = null;
window.addEventListener('beforeinstallprompt', function (e) {
  e.preventDefault();
  deferredPrompt = e;
});
// Chrome 117+: event `install` baru menggantikan peran beforeinstallprompt
// (yang mulai di-deprecate). Simpan juga supaya tombol tetap bisa memicu
// prompt native di browser yang hanya support API baru.
window.addEventListener('install', function (e) {
  e.preventDefault();
  pendingInstallEvent = e;
});

// 3. Fungsi global untuk tombol "Install App"
export function cobaInstallApp() {
  var modal = document.getElementById('modal-install');
  var evt = deferredPrompt || pendingInstallEvent;
  if (evt) {
    try {
      // beforeinstallprompt klasik: evt.prompt() + evt.userChoice Promise.
      // Event `install` (Chrome 117+): evt.prompt() juga async, tapi hasilnya
      // lewat return Promise, bukan properti userChoice.
      var result = evt.prompt();
      var settle = evt.userChoice || result || Promise.resolve(null);
      Promise.resolve(settle)
        .then(function (choice) {
          var dismissed = choice && choice.outcome === 'dismissed';
          if (dismissed && modal) {
            // User batal di prompt browser -> tampilkan panduan manual
            modal.classList.remove('hidden');
          }
        })
        .catch(function () {
          /* userChoice bisa tidak tersedia */
        });
    } catch (err) {
      console.warn('[PWA] Gagal memicu prompt install:', err);
      if (modal) modal.classList.remove('hidden');
    }
    deferredPrompt = null;
    pendingInstallEvent = null;
    return;
  }
  // Fallback: tampilkan modal panduan manual (iOS Safari, atau prompt tidak
  // tersedia karena belum memenuhi kriteria installable)
  if (modal) modal.classList.remove('hidden');
}

// 4. Saat app ter-install, tutup modal jika masih terbuka
window.addEventListener('appinstalled', function () {
  deferredPrompt = null;
  pendingInstallEvent = null;
  var modal = document.getElementById('modal-install');
  if (modal) modal.classList.add('hidden');
});

// 5. MIGRASI SATU KALI (terpusat): bersihkan draft lama ai_form yang masih
// menyimpan base64 JFT/SSW di localStorage.
//
// Kenapa di pwa.js, bukan di service worker: SW TIDAK punya akses ke
// localStorage (batasan spesifikasi — localStorage hanya ada di window
// context, SW cuma punya Cache API/IndexedDB/fetch). pwa.js dimuat di SEMUA
// halaman, jadi begitu user membuka halaman mana pun setelah deploy ini,
// draft lama langsung dibersihkan — tanpa perlu membuka ai_form dulu.
//
// Format lama (pra-fix): { currentJftBase64, currentSswBase64,
// currentJftFile, currentSswFile } berisi base64 PDF bisa puluhan MB -> quota
// localStorage 5MB penuh -> data "nyangkut"/gagal simpan. Rewrite (bukan
// hapus total): data teks (chatHistory/latestCandidateData) & foto kecil
// dipertahankan, hanya field base64/file yang dibuang. Idempotent: format
// baru tidak mengandung field itu, jadi aman dipanggil tiap load.
export function bersihkanDraftLamaBase64() {
  try {
    var prefix = 'asj_qween_cv_data_';
    // Kumpulkan dulu SEMUA key ber-prefix (jangan iterasi sambil menghapus:
    // indeks localStorage bergeser dan key bisa terlewat).
    var keys = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf(prefix) === 0) keys.push(k);
    }
    keys.forEach(function (key) {
      var raw = localStorage.getItem(key);
      if (!raw) return;
      var parsed = null;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        /* rusak */
      }
      if (!parsed || typeof parsed !== 'object') {
        localStorage.removeItem(key); // JSON rusak -> hapus, bukan dibiarkan
        return;
      }
      // Format lama = ada base64/file JFT/SSW ber-data (bukan kosong/null).
      var jftB = parsed.currentJftBase64,
        sswB = parsed.currentSswBase64;
      var jftF = parsed.currentJftFile,
        sswF = parsed.currentSswFile;
      var isOldFormat =
        (typeof jftB === 'string' && jftB.length > 0) ||
        (typeof sswB === 'string' && sswB.length > 0) ||
        (jftF && typeof jftF === 'object' && jftF.data) ||
        (sswF && typeof sswF === 'object' && sswF.data);
      if (isOldFormat) {
        // Rewrite ke format baru: buang field base64/file, simpan ulang.
        var bersih = {
          chatHistory: parsed.chatHistory || [],
          latestCandidateData: parsed.latestCandidateData || {},
          currentPhotoBase64: parsed.currentPhotoBase64 || '',
        };
        localStorage.setItem(key, JSON.stringify(bersih));
      }
    });
  } catch (e) {
    console.warn('[PWA] Gagal membersihkan draft lama:', e);
  }
}

// BRIDGE ESM → classic/bundel & HTML onclick: alias window.*.
window.cobaInstallApp = cobaInstallApp;
window.bersihkanDraftLamaBase64 = bersihkanDraftLamaBase64;  // Jalankan migrasi begitu pwa.js termuat (semua halaman, sebelum
  // onload/initApp halaman mana pun).
  bersihkanDraftLamaBase64();

  // 6. PENANDA VERSI (verifikasi cepat): tempel versi bundel ke baris
  // copyright di footer, mis. "…ALL RIGHTS RESERVED. · v2a72296550".
  // User bisa langsung melihat versi mana yang tampil di layar — kalau tidak
  // sama dengan versi terbaru, berarti browser masih pakai cache/SW lama
  // (bukan masalah server). Membaca hash dari src script bundel
  // (/assets/app-<hash>.js); halaman standalone fallback ke ?v= pwa.js.
  // Aman: tidak mengubah layout & tidak muncul kalau footer tidak ada.
  (function pasangPenandaVersi() {
    try {
      // Hitung dulu hash bundel dari <script src="/assets/app-<hash>.js">
      // (fallback: query ?v= di pwa.js untuk halaman standalone).
      var ver = '';
      var app = document.querySelector('script[src*="/assets/app-"]');
      if (app) {
        var m = app.getAttribute('src').match(/app-([a-f0-9]+)\.js/);
        if (m) ver = m[1];
      }
      if (!ver) {
        var pw = document.querySelector('script[src*="/pwa.js"]');
        if (pw) {
          var q = (pw.getAttribute('src') || '').match(/[?&]v=([^&]+)/);
          if (q) ver = q[1];
        }
      }
      if (!ver) return;
      var title =
        'Versi aplikasi. Kalau tidak sama dengan versi terbaru, refresh / clear site data.';
      // Badge versi di footer (kalau elemen footer ada). Chip di header
      // (asj-ver-chip) dihapus 2026-08-17 atas permintaan pemilik — versi
      // tidak perlu tampil di banner, cukup di footer.
      var el = document.querySelector('[data-lang="footer.copyright"]');
      if (!el || el.querySelector('.asj-ver-badge')) return; // idempotent
      var span = document.createElement('span');
      span.className = 'asj-ver-badge ml-2 text-emerald-300/90 font-mono';
      span.textContent = 'v' + ver;
      span.title = title;
      el.appendChild(span);
    } catch (e) {
      /* penanda versi opsional — jangan ganggu halaman */
    }
  })();
