/* ASJ Portal - PWA helper
   - Registrasi service worker
   - Tangkap beforeinstallprompt (Chrome Android/Desktop) agar tombol "Install App" bisa memicu prompt asli browser
   - Fallback ke modal panduan manual (iOS Safari / browser yang tidak support prompt)
*/
(function () {
  // 0. MODE DEV (localhost) — preview SELALU fresh, tanpa chance versi lama.
  // Service worker memakai strategi stale-while-revalidate: di production VERSION
  // SW naik tiap deploy (bump-cache-versions) jadi cache dibuang otomatis, tapi
  // di dev VERSION TIDAK berubah saat kita mengedit file -> aset JS lama bisa
  // terus disajikan dari cache SW walau kode sumber sudah berubah. Solusinya:
  // jangan daftarkan SW di localhost SAMA SEKALI, dan unregister + bersihkan
  // cache SW lama (dari sesi dev sebelumnya) supaya tidak ada yang ikut campur.
  var IS_DEV_HOST =
    typeof location !== 'undefined' &&
    (location.hostname === 'localhost' ||
      location.hostname === '127.0.0.1' ||
      location.hostname === '[::1]');
  if (IS_DEV_HOST && 'serviceWorker' in navigator) {
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
      navigator.serviceWorker.register('/sw.js').catch(function (err) {
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
        window.setTimeout(function () {
          window.location.reload();
        }, 1500);
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
  window.cobaInstallApp = function () {
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
  };

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
  window.bersihkanDraftLamaBase64 = function () {
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
  };

  // Jalankan migrasi begitu pwa.js termuat (script sync di semua halaman,
  // sebelum onload/initApp halaman mana pun).
  window.bersihkanDraftLamaBase64();
})();
