import { callAPI } from '../../api-client.js';
import { tr } from '../../i18n.js';
import { showToast, safeSet } from '../init/util.js';
// MODUL BARU (Fase 2 REFACTOR_TODO.md): js/03_engine.js dipecah per domain →
// js/engine/{pipeline,dashboard,guards,init}.js. Body fungsi byte-identik dari
// 03_engine.js — perilaku tidak berubah.
// ==========================================
// MESIN UTAMA — tarik data super kilat (anti layar putih) & init dashboard
// ==========================================

export function refreshDataDinamis(switchTab, isSilent = false) {
  var loader = document.getElementById('global-loader');
  var isFirstLoad = window.ALL_JOBS.length === 0;

  if (loader && !isSilent && isFirstLoad) {
    loader.style.display = 'flex';
  } else if (!isSilent && !isFirstLoad) {
    window.jalankanSemuaSkeleton();
  }

  // ✅ CARA BARU: Membaca parameter URL langsung dari Browser
  let p = new URLSearchParams(window.location.search);
  let publicCvId = p.get('cv') || null; // Deteksi jika ada yang Scan QR

  let modeLoad = 'public';
  let payload = null;
  // FIX: kalau admin DAN kandidat login bersamaan (mis. perangkat admin
  // yang pernah dipakai kandidat), mode 'kandidat' menimpa 'admin' di sini -
  // akibatnya panel admin menerima data versi kandidat (formInbox minim,
  // candidates hanya 1, schedules/tugas kosong). Prioritas: admin menang,
  // karena mode admin mengembalikan semua data; kandidat hanya datanya sendiri.
  if (localStorage.getItem('asj_admin_login') === 'sukses') {
    modeLoad = 'admin';
    payload = null;
  } else if (localStorage.getItem('asj_kandidat_login') === 'sukses') {
    modeLoad = 'kandidat';
    payload = localStorage.getItem('asj_kandidat_wa');
  }

  // AUTO-LOGIN hardening: flag login ada tapi token sesi / WA hilang
  // (localStorage terhapus sebagian) → jangan panggil API dengan token
  // kosong (hasilnya data kosong diam-diam). Bersihkan & arahkan ke login
  // dengan pesan jelas.
  if (modeLoad !== 'public') {
    const token =
      modeLoad === 'admin'
        ? localStorage.getItem('asj_admin_session')
        : localStorage.getItem('asj_kandidat_session');
    const identLengkap = modeLoad === 'admin' || !!payload;
    if (!token || (modeLoad === 'kandidat' && !payload)) {
      localStorage.removeItem('asj_admin_login');
      localStorage.removeItem('asj_admin_session');
      localStorage.removeItem('asj_admin_name');
      localStorage.removeItem('asj_kandidat_login');
      localStorage.removeItem('asj_kandidat_name');
      localStorage.removeItem('asj_kandidat_wa');
      localStorage.removeItem('asj_kandidat_session');
      try {
        const msg =
          modeLoad === 'admin'
            ? tr('ui.toast_admin_session_expired')
            : tr('ui.toast_kandidat_session_expired');
        if (typeof showToast === 'function') showToast(msg, 'error');
        else if (typeof alert === 'function') alert(msg);
      } catch (e) { /* opsional */ }
      if (identLengkap) location.reload();
      return;
    }
  }

  // getAppData = muat data utama dashboard (BACA SAJA — aman diulang).
  // Kalau backend sempat mati / jaringan drop sesaat, coba SEKALI LAGI
  // setelah jeda singkat sebelum menampilkan toast error — kejadian
  // "server functions turun sesaat" tidak langsung melempar Gagal! ke user.
  // (Retry TIDAK diterapkan ke action tulis lain yang berisiko double-submit.)
  async function muatData(percobaan) {
    try {
      const res = await callAPI('getAppData', [modeLoad, payload, publicCvId]);
      if (!res || !res.success) {
        if (percobaan < 1) {
          setTimeout(function () {
            muatData(percobaan + 1);
          }, 1200);
          return;
        }
        if (!isSilent) showToast(tr('alert.failed'), 'error');
        if (loader) loader.style.display = 'none';
        return;
      }
      // FIX: dulu flag ini dikirim backend tapi tidak pernah dicek di sini -
      // kalau sesi admin sudah tidak valid/kadaluarsa, dashboard tetap render
      // seolah normal tapi candidates/dbJobs kosong tanpa penjelasan apapun
      // (persis gejala "table job ga muncul di admin"). Sekarang: sesi basi
      // dibersihkan otomatis dan admin diarahkan balik ke layar login.
      if (res.sessionInvalid && modeLoad === 'admin') {
        localStorage.removeItem('asj_admin_login');
        localStorage.removeItem('asj_admin_session');
        if (loader) loader.style.display = 'none';
        if (!isSilent) showToast(tr('ui.toast_admin_session_expired'), 'error');
        location.reload();
        return;
      }
      // Sesi kandidat kadaluarsa/di-revoke (mis. logout dari perangkat lain
      // atau cleanup server): bersihkan state, stop auto-refresh, toast,
      // lalu muat ulang ke halaman publik (kandidat harus login ulang).
      // Sebelumnya flag ini hanya dicek untuk admin — kandidat diam-diam
      // di-render ulang dengan data kosong tanpa penjelasan apa pun.
      if (res.sessionInvalid && modeLoad === 'kandidat') {
        localStorage.removeItem('asj_kandidat_login');
        localStorage.removeItem('asj_kandidat_name');
        localStorage.removeItem('asj_kandidat_wa');
        localStorage.removeItem('asj_kandidat_session');
        if (window.AUTO_REFRESH_TIMER) {
          clearInterval(window.AUTO_REFRESH_TIMER);
          window.AUTO_REFRESH_TIMER = null;
          window.PREV_MAIL_COUNT = null;
        }
        if (loader) loader.style.display = 'none';
        if (!isSilent) showToast(tr('ui.toast_kandidat_session_expired'), 'error');
        location.reload();
        return;
      }
      try {
        initApp(res, isSilent);
        if (modeLoad === 'admin' && switchTab && !isSilent) window.adminSwitchTab(switchTab);

        // JIKA ADA KAISHA / PUBLIK YANG SCAN QR CODE:
        if (publicCvId) {
          setTimeout(() => {
            window.bukaDigitalCV(publicCvId);
            // Hilangkan tombol close jika yang melihat adalah orang Jepang
            if (!window.isAdmin && !window.isKandidat) {
              let closeBtn = document.querySelector('#modal-cv button');
              if (closeBtn) closeBtn.style.display = 'none';
            }
          }, 800);
        }
      } catch (e) {
        if (!isSilent) showToast(tr('ui.toast_render_error') + e.message, 'error');
      } finally {
        if (loader) loader.style.display = 'none';
      }
    } catch (err) {
      // Backend/jaringan drop sesaat (fetch throw) — coba sekali lagi dulu.
      if (percobaan < 1) {
        setTimeout(function () {
          muatData(percobaan + 1);
        }, 1200);
        return;
      }
      if (!isSilent) showToast(tr('alert.network') + err.message, 'error');
      if (loader) loader.style.display = 'none';
      if (!isSilent && !isFirstLoad)
        initApp(
          {
            jobs: window.ALL_JOBS,
            dbJobs: window.ALL_DB_JOBS,
            candidates: window.ALL_CANDIDATES,
            schedules: window.ALL_SCHEDULES,
            tugas: window.ALL_TUGAS,
            formInbox: window.ALL_FORM,
            waTemplates: window.ALL_WA_TEMPLATES,
            kandidatRiwayat: window.ALL_RIWAYAT_KANDIDAT,
            dropdowns: window.DROPDOWNS,
            activeTheme: window.CURRENT_THEME,
            assets: window.ASSETS,
          },
          isSilent,
        );
    }
  }
  muatData(0);
}

export function initApp(res, isSilent = false) {
  // jobs & dbJobs konten identik; backend kirim salah satu per mode
  // (publik/kandidat: jobs; admin: dbJobs) - fallback silang supaya
  // kedua global selalu terisi.
  window.ALL_JOBS = res.jobs || res.dbJobs || [];
  window.ALL_DB_JOBS = res.dbJobs || res.jobs || [];
  window.ALL_CANDIDATES = res.candidates || [];
  window.ALL_CANDIDATES_TOTAL = res.candidatesTotal || window.ALL_CANDIDATES.length;
  window.ALL_SCHEDULES = res.schedules || [];
  window.ALL_TUGAS = res.tugas || [];
  window.ALL_FORM = res.formInbox || [];
  window.ALL_WA_TEMPLATES = res.waTemplates || [];
  window.ALL_RIWAYAT_KANDIDAT = res.kandidatRiwayat || [];
  window.ASSETS = res.assets || {};
  window.DROPDOWNS = res.dropdowns || {};

  if (!isSilent) {
    var logo = document.getElementById('logo-asj');
    if (logo && window.ASSETS.LOGO) logo.src = window.ASSETS.LOGO;
    if (window.ASSETS.SOCIAL) {
      var fWa = document.getElementById('footer-wa');
      if (fWa) fWa.href = 'https://wa.me/' + (window.ASSETS.SOCIAL.whatsapp || '').replace(/\D/g, '');
      var fIg = document.getElementById('footer-ig');
      if (fIg) fIg.href = window.ASSETS.SOCIAL.instagram || '#';
      var fTk = document.getElementById('footer-tk');
      if (fTk) fTk.href = window.ASSETS.SOCIAL.tiktok || '#';
      var fGps = document.getElementById('footer-gps');
      if (fGps) fGps.href = window.ASSETS.SOCIAL.maps || '#';
      // Link maps banner LPK ikut single-source dari window.ASSETS.SOCIAL.maps
      // (backend) supaya ganti 1 tempat, semua link ter-update.
      var mapsLpk = document.getElementById('maps-lpk-link');
      if (mapsLpk && window.ASSETS.SOCIAL && window.ASSETS.SOCIAL.maps) mapsLpk.href = window.ASSETS.SOCIAL.maps;
    }

    let pengumumanText = res.pengumuman || '';
    let marqueeEl = document.getElementById('marquee-text');
    let globalAnnounce = document.getElementById('global-announcement');
    let inputAnnounce = document.getElementById('input-pengumuman');

    if (pengumumanText && marqueeEl && globalAnnounce) {
      marqueeEl.innerText = pengumumanText;
      globalAnnounce.classList.remove('hidden');
      if (inputAnnounce) inputAnnounce.value = pengumumanText;
    } else if (globalAnnounce) {
      globalAnnounce.classList.add('hidden');
    }

    if (document.getElementById('input-kategori')) window.populate('input-kategori', window.DROPDOWNS.kategori);
    if (document.getElementById('input-gender')) window.populate('input-gender', window.DROPDOWNS.gender);
    if (document.getElementById('edit-k-tahapan')) window.populate('edit-k-tahapan', window.DROPDOWNS.tahapan);
    if (document.getElementById('edit-k-status')) window.populate('edit-k-status', window.DROPDOWNS.tahapan);
    if (document.getElementById('input-tsk')) window.populate('input-tsk', window.DROPDOWNS.tsk);
    if (document.getElementById('j-tsk')) window.populate('j-tsk', window.DROPDOWNS.tsk);
    if (document.getElementById('input-tahapan-db'))
      window.populate('input-tahapan-db', window.DROPDOWNS.tahapan);
    if (document.getElementById('edit-db-tahapan')) window.populate('edit-db-tahapan', window.DROPDOWNS.tahapan);
    if (document.getElementById('checkbox-lokasi'))
      window.populateCheckboxes('checkbox-lokasi', window.DROPDOWNS.lokasi, 'lokasi_cb');
    if (document.getElementById('checkbox-syarat'))
      window.populateCheckboxes('checkbox-syarat', window.DROPDOWNS.syarat, 'syarat_cb');
    if (document.getElementById('ef-kategori')) window.populate('ef-kategori', window.DROPDOWNS.kategori);
    if (document.getElementById('ef-tsk')) window.populate('ef-tsk', window.DROPDOWNS.tsk);
    if (document.getElementById('ef-gender')) window.populate('ef-gender', window.DROPDOWNS.gender);

    // Datalist kode loker utk input "JOB DILAMAR (KODE)" di modal Input
    // Kandidat Manual. FIX 2026-08-12: sebelumnya menarget id 'datalist-loker'
    // yang TIDAK ADA di HTML (saran kode loker tidak pernah muncul); id asli
    // datalist-nya adalah 'list-kode-job' (lihat admin.html/index.html).
    let dlLoker = document.getElementById('list-kode-job');
    if (dlLoker) {
      let htmlDl = '<option value="UMUM">Lamar Umum (Tanpa Loker Spesifik)</option>';
      window.ALL_JOBS.forEach((j) => {
        htmlDl +=
          '<option value="' +
          window.esc(j.code) +
          '">' +
          window.esc(j.code) +
          ' - ' +
          window.esc(j.pekerjaan) +
          '</option>';
      });
      dlLoker.innerHTML = htmlDl;
    }

    let dlKodeJob = document.getElementById('list-kode-job');
    if (dlKodeJob) {
      dlKodeJob.innerHTML = window.ALL_JOBS.map((j) => '<option value="' + window.esc(j.code) + '">').join('');
    }

    let dlLokasi = document.getElementById('list-lokasi');
    if (dlLokasi) {
      let uniqueLokasi = [...new Set(window.ALL_JOBS.map((j) => j.lokasi).filter(Boolean))];
      dlLokasi.innerHTML = uniqueLokasi.map((l) => '<option value="' + window.esc(l) + '">').join('');
    }

    let dlSyarat = document.getElementById('list-syarat');
    if (dlSyarat) {
      let uniqueSyarat = [...new Set(window.ALL_JOBS.map((j) => j.syarat).filter(Boolean))];
      dlSyarat.innerHTML = uniqueSyarat.map((s) => '<option value="' + window.esc(s) + '">').join('');
    }
  }

  if (localStorage.getItem('asj_admin_login') === 'sukses') {
    window.isAdmin = true;
    window.currentAdminName = localStorage.getItem('asj_admin_name');

    if (!isSilent) {
      if (document.getElementById('nav-mode'))
        document.getElementById('nav-mode').classList.add('hidden');
      if (document.getElementById('nav-admin-mode'))
        document.getElementById('nav-admin-mode').classList.remove('hidden');
      window.changePage('admin');
      window.renderAdminFull();
      // Audit otomatis: kandidat yg masih pakai link Google Drive -> banner kuning
      if (typeof window.muatMigrasiDrive === 'function') window.muatMigrasiDrive();

      var mLoggedOut = document.getElementById('mobile-nav-logged-out');
      var mAdmin = document.getElementById('mobile-nav-admin');
      var mKandidat = document.getElementById('mobile-nav-kandidat');
      if (mLoggedOut) mLoggedOut.classList.add('hidden');
      if (mAdmin) mAdmin.classList.remove('hidden');
      if (mKandidat) mKandidat.classList.add('hidden');
    } else {
      // AUTO-REFRESH PINTAR: kalau admin sedang scroll tabel (Mail Inbox
      // dll), jangan render ulang supaya posisi scroll tidak ter-reset.
      // Data (window.ALL_FORM) sudah di-update di memori di atas, dan badge
      // notifikasi tetap dihitung di bawah.
      if (!window.sedangDiscrollTabel()) {
        window.renderFormInbox();
      }
    }

    window.updateMailBadge();

    // AUTO-REFRESH PINTAR (120 detik, Fase 3 langkah 16): refresh hanya
    // berjalan jika TIDAK ada modal yang terbuka (preview CV, form tambah/edit,
    // pemberkasan, dst), supaya modal yang sedang dibaca admin tidak tertutup
    // paksa. Guard scroll ada di refreshDataDinamis/initApp (skip render tabel
    // yang sedang di-scroll). Kalau ada modal terbuka, refresh ditunda dan akan
    // jalan di siklus berikutnya. Tab yang tidak terlihat (hidden) juga di-skip
    // — tarikan sia-sia dikurangi (kandidat/admin buka tab lain).
    if (!window.AUTO_REFRESH_TIMER) {
      window.AUTO_REFRESH_TIMER = setInterval(() => {
        if (document.hidden) return; // tab tidak terlihat → skip tarikan sia-sia
        if (window.adaModalTerbuka()) return; // modal terbuka → skip refresh
        refreshDataDinamis(null, true);
      }, 120000);
      // Tab kembali terlihat → refresh SEKALI segera (tanpa menunggu siklus
      // interval berikutnya) supaya data tidak basi saat user balik ke tab.
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) return;
        if (!window.AUTO_REFRESH_TIMER) return;
        if (window.adaModalTerbuka()) return;
        refreshDataDinamis(null, true);
      });
    }
  } else if (localStorage.getItem('asj_kandidat_login') === 'sukses') {
    window.isKandidat = true;
    window.currentKandidatName = localStorage.getItem('asj_kandidat_name');
    window.currentKandidatWa = localStorage.getItem('asj_kandidat_wa');

    if (!isSilent) {
      if (document.getElementById('nav-mode'))
        document.getElementById('nav-mode').classList.add('hidden');
      if (document.getElementById('nav-kandidat-mode'))
        document.getElementById('nav-kandidat-mode').classList.remove('hidden');
      safeSet('nama-kandidat-login', tr('candidate.welcome') + ', ' + window.esc(window.currentKandidatName));

      var mLoggedOut = document.getElementById('mobile-nav-logged-out');
      var mAdmin = document.getElementById('mobile-nav-admin');
      var mKandidat = document.getElementById('mobile-nav-kandidat');
      if (mLoggedOut) mLoggedOut.classList.add('hidden');
      if (mAdmin) mAdmin.classList.add('hidden');
      if (mKandidat) mKandidat.classList.remove('hidden');
    }

    let myData = window.ALL_CANDIDATES.find(
      (c) => window.normalizePhone(c.wa) === window.normalizePhone(window.currentKandidatWa),
    );
    if (myData) {
      window.currentKandidatId = myData.idKandidat;
      safeSet('k-dash-job', window.renderJobDilamar(myData));
      // Tampilan tahapan/status sesuai bahasa; logika (evaluasiTahapanKandidat
      // & regex) tetap memakai nilai ASLI myData.tahapan/status.
      safeSet('k-dash-tahapan', window.esc(window.trOption(myData.tahapan)));
      safeSet('k-dash-status', window.esc(window.trOption(myData.status)));

      let boxCatatan = document.getElementById('k-dash-catatan-box');
      if (boxCatatan) {
        if (
          myData.catatanExt &&
          myData.catatanExt.trim() !== '' &&
          myData.catatanExt.trim() !== '-'
        ) {
          boxCatatan.classList.remove('hidden');
          safeSet('k-dash-catatan-ext', '"' + window.esc(myData.catatanExt) + '"');
        } else {
          boxCatatan.classList.add('hidden');
        }
      }

      let areaRev = document.getElementById('area-revisi');
      if (myData.status && myData.status.toUpperCase() === 'REVISI') {
        if (areaRev) areaRev.classList.remove('hidden');
        safeSet('k-dash-catatan', window.esc(myData.catatan || tr('candidate.doc_revise_desc')));
      } else {
        if (areaRev) areaRev.classList.add('hidden');
      }

      window.evaluasiTahapanKandidat(myData.tahapan);
      window.renderProgresPemberkasan(myData);
      window.kalkulasiProgress(myData);

      // Tombol AI CV & Latihan Interview tetap tampil untuk semua (biar kelihatan
      // bedanya siswa ASJ vs kandidat luar); aksesnya dibatasi di fungsi masing-masing.
      window.renderRiwayatKandidat();
      window.renderStudentCard();
      let mySchedules = res.mySchedules || [];
      let boxJadwal = document.getElementById('k-dash-jadwal-box');
      let listJadwal = document.getElementById('k-dash-jadwal-list');

      if (boxJadwal && listJadwal) {
        if (mySchedules.length > 0) {
          let htmlJadwal = '';
          mySchedules.forEach((j) => {
            let linkBtn =
              j.link && j.link !== '-'
                ? `<a href="${window.esc(j.link)}" target="_blank" class="mt-2 inline-flex items-center px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-bold rounded-lg shadow-md transition"><i class="fas fa-external-link-alt mr-1.5"></i> ${tr('ui.open_link')}</a>`
                : '';

            htmlJadwal += `
                            <div class="bg-black/60 p-4 rounded-xl border border-amber-500/30 shadow-inner">
                                <div class="flex justify-between items-start mb-2">
                                    <p class="text-amber-300 font-black text-sm uppercase">${window.esc(j.agenda)}</p>
                                    <span class="text-[9px] px-2 py-1 rounded bg-rose-900/50 text-rose-300 font-bold border border-rose-500/30 whitespace-nowrap">${window.esc(window.trOption(j.status))}</span>
                                </div>
                                <p class="text-xs text-slate-300 mb-1.5"><i class="fas fa-clock w-4 text-center mr-1 text-slate-400"></i> ${window.esc(j.waktu)}</p>
                                <p class="text-xs text-slate-300 mb-1"><i class="fas fa-map-marker-alt w-4 text-center mr-1 text-rose-400"></i> ${window.esc(window.trOption(j.lokasi))}</p>
                                ${linkBtn}
                            </div>`;
          });
          listJadwal.innerHTML = htmlJadwal;
          boxJadwal.classList.remove('hidden');
        } else {
          boxJadwal.classList.add('hidden');
        }
      }
    }
    if (!isSilent) window.changePage('kandidat');
  } else {
    var mLoggedOut = document.getElementById('mobile-nav-logged-out');
    var mAdmin = document.getElementById('mobile-nav-admin');
    var mKandidat = document.getElementById('mobile-nav-kandidat');
    if (mLoggedOut) mLoggedOut.classList.remove('hidden');
    if (mAdmin) mAdmin.classList.add('hidden');
    if (mKandidat) mKandidat.classList.add('hidden');
  }

  // 👉 PERBAIKAN: INI KURUNG PENUTUP YANG HILANG!
  if (!isSilent) {
    if (window.currentAdminName === 'KHOCI') {
      window.applyInterMilanVibe();
    } else {
      // Pilihan theme pengunjung (localStorage) menang, fallback ke
      // config backend, terakhir default TOKYO.
      var savedTheme = null;
      try {
        savedTheme = localStorage.getItem('asj_theme');
      } catch (e) {}
      window.applyTheme(savedTheme || res.activeTheme || 'TOKYO');
    }
    window.renderLanguage();
  }
}


// BRIDGE ESM → classic (bundel): alias window.* utk pemakai lintas file
// (init/boot.js initApp, js/04_auth.js refreshDataDinamis, HTML onclick,
// api/*.js refreshDataDinamis, render/*.js, dll).
window.refreshDataDinamis = refreshDataDinamis;
window.initApp = initApp;
