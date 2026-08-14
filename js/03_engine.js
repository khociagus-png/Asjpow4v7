    // 4b. RENDER DASHBOARD & MESIN PENGGERAK UTAMA
    // Dipisah dari 03_candidate.js saat god-object refactor.
    // ==========================================
    // 4. MESIN PENGGERAK UTAMA & CROWN LOGIC
    // ==========================================
    
    // Logika Pemunculan Tombol Modal Pemberkasan
    function evaluasiTahapanKandidat(thpRaw) {
        if(!thpRaw) return; let thp = String(thpRaw).toUpperCase();
        let btnArea = document.getElementById('btn-pemberkasan-area');
        
        if (btnArea) btnArea.classList.add('hidden');

        let isTahap1 = /LOLOS|PEMBERKASAN|MCU|MEDICAL|MEDIKAL|PARPOR|PASPOR|PASPORT|MATCH|TERIMA|SIAP/i.test(thp);
        let isTahap2 = /TTD|KONTRAK|VISA|COE|KTKLN|SISKOP|FLIGHT|BERANGKAT|TERBANG|TIKET|E-ID/i.test(thp);

        // Jika masuk salah satu tahapan ini, tampilkan Tombol Sakti di Dashboard Kandidat
        if (isTahap1 || isTahap2) {
            if(btnArea) btnArea.classList.remove('hidden');
        }
    }

    // Ringkasan progres pemberkasan di dashboard kandidat: x/17 dokumen + status
    // biodata KTKLN/VISA. Data berkas & bio di-populate backend (get-app-data).
    var BERKAS_17 = [
        ['kk', 'KK'], ['akte', 'AKTE'], ['sd', 'IJAZAH SD'], ['smp', 'IJAZAH SMP'], ['sma', 'IJAZAH SMA'],
        ['pasport', 'PASPORT'], ['mcu', 'MCU'], ['kontrak', 'KONTRAK KERJA'], ['cert', 'CERTIFICATE JAPAN'],
        ['ktp', 'KTP'], ['foto2', 'PAS FOTO STUDIO'],
        ['ijinortu', 'SURAT IJIN ORTU'], ['cpmi', 'PERNYATAAN CPMI'], ['kawin', 'STATUS PERKAWINAN'],
        ['sehat', 'SURAT SEHAT PUSKESMAS'], ['bpjs', 'BPJS KETENAGAKERJAAN'], ['psikotes', 'HASIL PSIKOTES']
    ];
    var BIO_FIELDS_19 = ['email', 'tmplahir', 'tgllahir', 'alamat', 'ayah', 'ttl_ayah', 'ibu', 'ttl_ibu',
        'pasport', 'coe', 'kotapasport', 'tglpasport', 'exppasport', 'pt', 'shacou', 'telppt', 'webpt', 'alamatpt'];

    function renderProgresPemberkasan(myData) {
        var berkas = (myData && myData.berkas) || {};
        var bio = (myData && myData.bio) || {};
        var done = 0;
        var listHtml = '';
        BERKAS_17.forEach(function (b) {
            var isOk = !!(berkas[b[0]] && berkas[b[0]] !== '-');
            if (isOk) done++;
            listHtml += '<div class="flex items-center gap-1.5 text-[9px] font-bold ' + (isOk ? 'text-emerald-400' : 'text-slate-500') + '">' +
                '<i class="fas ' + (isOk ? 'fa-check-circle' : 'fa-circle') + ' text-[9px]"></i><span class="truncate">' + b[1] + '</span></div>';
        });
        var pct = Math.round((done / BERKAS_17.length) * 100);
        var bar = document.getElementById('prog-berkas-bar');
        var pctEl = document.getElementById('prog-berkas-persen');
        var txtEl = document.getElementById('prog-berkas-txt');
        var listEl = document.getElementById('prog-berkas-list');
        if (bar) bar.style.width = pct + '%';
        if (pctEl) pctEl.textContent = pct + '%';
        if (txtEl) txtEl.textContent = done + tr('ui.docs_count');
        if (listEl) listEl.innerHTML = listHtml;

        // Biodata: 18 field yang tersedia (19 di antaranya; pasport/coe dibagi jadi
        // 18 key unik). Hitung berapa yang terisi & tandai "Lengkap/Belum lengkap".
        var bioDone = 0;
        BIO_FIELDS_19.forEach(function (k) { if (bio[k] && String(bio[k]).trim() !== '' && String(bio[k]).trim() !== '-') bioDone++; });
        var bioFull = bioDone >= 16; // toleransi: sebagian besar terisi = lengkap
        var badge = document.getElementById('prog-biodata-badge');
        if (badge) {
            if (bioFull) badge.innerHTML = '<i class="fas fa-check-circle mr-0.5"></i> ' + tr('ui.biodata_complete') + '';
            else badge.innerHTML = '<i class="fas fa-exclamation-circle mr-0.5"></i> ' + tr('ui.biodata_partial') + bioDone + '/18';
            badge.className = 'text-[9px] font-bold px-2 py-0.5 rounded-full ' + (bioFull ? 'bg-emerald-900/50 text-emerald-300' : 'bg-amber-900/50 text-amber-300');
        }
    }

    // Pipeline tahapan kandidat DINAMIS dari system config (list_tahapan):
    // CHECK KAIWA → MENDAN → MENSETSU → LOLOS USER → MCU PARPOR → TTD KONTRAK
    // → PROSES COE → VISA → FLIGHT. Fallback ke daftar lama kalau config kosong.
    function tahapanPipeline() {
        if (window.DROPDOWNS && Array.isArray(DROPDOWNS.tahapan) && DROPDOWNS.tahapan.length) return DROPDOWNS.tahapan;
        return ['CHECK KAIWA', 'MENDAN', 'MENSETSU', 'LOLOS USER', 'MCU PARPOR', 'TTD KONTRAK', 'PROSES COE', 'VISA', 'FLIGHT'];
    }

    // Cocokkan tahapan kandidat ke salah satu langkah pipeline (case-insensitive,
    // prefix match). Return -1 kalau tidak ketemu (mis. status loker publik).
    function tahapanMatchIdx(thpRaw) {
        if (!thpRaw || thpRaw === '-') return -1;
        let thp = String(thpRaw).toUpperCase().trim();
        let pipe = tahapanPipeline();
        for (let i = 0; i < pipe.length; i++) {
            let p = String(pipe[i]).toUpperCase().trim();
            if (p && (thp.indexOf(p) >= 0 || p.indexOf(thp) >= 0)) return i;
        }
        return -1;
    }

    function getTahapanProgress(thpRaw) {
        if(!thpRaw || thpRaw === '-') return { percent: 10, color: 'from-slate-600 to-slate-400' };
        let thp = String(thpRaw).toUpperCase();
        if (/TOLAK|REJECT|GAGAL/i.test(thp)) return { percent: 100, color: 'from-red-600 to-rose-400' };
        let idx = tahapanMatchIdx(thpRaw);
        let pipe = tahapanPipeline();
        if (idx >= 0) {
            // Langkah terakhir (FLIGHT) = 100%, sisanya proporsional.
            let pct = Math.round(((idx + 1) / pipe.length) * 100);
            if (pct > 96) pct = 100;
            return { percent: pct, color: idx >= pipe.length - 2 ? 'from-emerald-600 to-teal-400' : (idx >= 4 ? 'from-amber-600 to-yellow-400' : 'from-sky-600 to-blue-400') };
        }
        if (/TTD|KONTRAK|VISA|COE|KTKLN|SISKOP|FLIGHT|BERANGKAT|TERBANG|TIKET|E-ID/i.test(thp)) return { percent: 100, color: 'from-emerald-600 to-teal-400' };
        if (/NAITEI|APPROVE|LULUS|PEMBERKASAN|MCU|MEDICAL|MEDIKAL|PARPOR|PASPOR/i.test(thp)) return { percent: 75, color: 'from-amber-600 to-yellow-400' };
        if (/WAWANCARA|INTERVIEW|SELEKSI|MATCH|MENDAN|MENSETSU/i.test(thp)) return { percent: 50, color: 'from-sky-600 to-blue-400' };
        return { percent: 25, color: 'from-slate-600 to-slate-400' }; // PENDAFTARAN
    }

    // Posisi tahapan kandidat dalam pipeline. -1 = proses dihentikan (gagal)
    // atau status tidak dikenali (menunggu/review admin).
    function tahapanStepIndex(thpRaw) {
        if(!thpRaw || thpRaw === '-') return -1;
        let thp = String(thpRaw).toUpperCase();
        if (/TOLAK|REJECT|GAGAL/i.test(thp)) return -1;
        let idx = tahapanMatchIdx(thpRaw);
        if (idx >= 0) return idx;
        if (/TTD|KONTRAK|VISA|COE|KTKLN|SISKOP|FLIGHT|BERANGKAT|TERBANG|TIKET|E-ID/i.test(thp)) return tahapanPipeline().length - 1;
        if (/NAITEI|APPROVE|LULUS|PEMBERKASAN|MCU|MEDICAL|MEDIKAL|PARPOR|PASPOR/i.test(thp)) return 4; // MCU PARPOR
        if (/WAWANCARA|INTERVIEW|SELEKSI|MATCH|MENDAN|MENSETSU/i.test(thp)) return 1;
        return -1; // MENUNGGU / REVIEW ADMIN dll → belum masuk pipeline
    }

    function kalkulasiProgress(myData) {
        let miniFields = [myData.nama, myData.wa, myData.gender, myData.usia, myData.tb, myData.bb, myData.pendidikan, myData.pasPhoto];
        let miniFilled = 0;
        miniFields.forEach(f => { if(f && String(f).trim() !== '' && String(f).trim() !== '-') miniFilled++; });
        let progMini = Math.round((miniFilled / miniFields.length) * 100);

        let masterFields = [myData.email, myData.tempatLahir, myData.tglLahir, myData.alamat, myData.jftText, myData.sswText];
        let masterFilled = 0;
        masterFields.forEach(f => { if(f && String(f).trim() !== '' && String(f).trim() !== '-') masterFilled++; });
        let progMaster = Math.round((masterFilled / masterFields.length) * 100);

        let elMiniBar = document.getElementById('prog-mini-bar');
        let elMiniTxt = document.getElementById('prog-mini-txt');
        if(elMiniBar) elMiniBar.style.width = progMini + '%';
        if(elMiniTxt) elMiniTxt.innerText = progMini + '%';

        let elMasterBar = document.getElementById('prog-master-bar');
        let elMasterTxt = document.getElementById('prog-master-txt');
        if(elMasterBar) elMasterBar.style.width = progMaster + '%';
        if(elMasterTxt) elMasterTxt.innerText = progMaster + '%';

        let isVip = (myData.catatanInt || '').includes('[VIP]');
        let badges = '<span class="inline-flex items-center gap-1.5 ml-3 align-middle">';
        
        badges += '<i class="fas fa-medal text-orange-500 text-2xl md:text-3xl drop-shadow-[0_0_10px_rgba(249,115,22,0.8)]" title="' + tr('ui.badge_bronze') + '"></i>';
        if (progMini === 100) { badges += '<i class="fas fa-award text-slate-300 text-2xl md:text-3xl drop-shadow-[0_0_10px_rgba(203,213,225,0.8)]" title="' + tr('ui.badge_silver') + '"></i>'; }
        if (progMaster === 100) { badges += '<i class="fas fa-crown text-yellow-400 text-3xl md:text-4xl drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]" title="' + tr('ui.badge_gold') + '"></i>'; }
        if (isVip) {
            let logoSrc = ASSETS.LOGO || 'https://lh3.googleusercontent.com/d/1BP_kwGeqU3ESFq6Z6eOkmHJ8IF2aEHuG';
            badges += '<img src="' + logoSrc + '" class="w-8 h-8 md:w-10 md:h-10 object-contain drop-shadow-[0_0_15px_rgba(52,211,153,0.8)] rounded-full border border-emerald-500/50" title="' + tr('ui.badge_official') + '">';
        }
        
        // Cek Badge Kelas
        let catatanIntStr = myData.catatanInt || '';
        let kelasMatch = catatanIntStr.match(/\[KELAS\s*([A-Z0-9]+)\]/i);
        if(kelasMatch) {
            badges += `<span class="px-2 py-0.5 ml-1 bg-indigo-900/60 text-indigo-300 border border-indigo-500/50 rounded text-xs font-bold shadow-sm whitespace-nowrap align-middle"><i class="fas fa-users mr-1"></i>KELAS ${kelasMatch[1].toUpperCase()}</span>`;
        }
        
        badges += '</span>';
        
        let namaHeader = document.getElementById('k-dash-nama');
        if(namaHeader) { namaHeader.innerHTML = tr('candidate.welcome') + ', ' + myData.nama + badges; }
        
        let progMsg = document.getElementById('prog-msg');
        if(progMsg) {
            if(isVip && progMaster === 100 && progMini === 100) { progMsg.innerHTML = '<span class="text-amber-400 font-black tracking-widest"><i class="fas fa-star mr-1"></i> ' + tr('ui.perfect_student') + ' <i class="fas fa-star ml-1"></i></span>'; } 
            else if (progMaster === 100 && progMini === 100) { progMsg.innerHTML = '<span class="text-yellow-400 font-bold">' + tr('ui.profile_100') + '</span>'; } 
            else if (progMini === 100) { progMsg.innerHTML = '<span class="text-slate-300 font-bold">' + tr('ui.profile_silver_next') + '</span>'; } 
            else { progMsg.innerHTML = '' + tr('ui.profile_incomplete') + ''; }
        }
    }

    // ==========================================
    // FUNGSI TARIK DATA SUPER KILAT (ANTI LAYAR PUTIH)
    // ==========================================
    // === FUNGSI OTOMATIS BACA URL QR CODE ===
    // Deteksi apakah ada modal yang sedang terbuka. Modal = elemen dengan id
    // berawalan "modal-" yang TIDAK punya class "hidden" (dan tampil di layar).
    // Dipakai sebagai guard auto-refresh: kalau admin sedang membaca modal
    // (preview CV, form, pemberkasan, dst) refresh ditunda supaya tidak
    // menutup/mengganggu modal tersebut.
    function adaModalTerbuka() {
        var els = document.querySelectorAll('[id^="modal-"]');
        for (var i = 0; i < els.length; i++) {
            var el = els[i];
            if (!el) continue;
            if (el.classList.contains('hidden')) continue;
            // Modal pakai position:fixed sehingga offsetParent selalu null — cek
            // computed display langsung supaya deteksi akurat.
            var disp = window.getComputedStyle(el).display;
            if (disp !== 'none' && disp !== '') return true;
        }
        return false;
    }

    // Deteksi apakah admin sedang meng-scroll halaman/tabel (mis. Mail Inbox).
    // Kalau iya, refresh TIDAK boleh render ulang tabel supaya posisi scroll
    // tidak ter-reset — data tetap diperbarui di memori + badge notif tetap jalan.
    function sedangDiscrollTabel() {
        if (window.scrollY > 80) return true;
        var boxes = document.querySelectorAll('.overflow-x-auto, .overflow-y-auto, .custom-scrollbar');
        for (var i = 0; i < boxes.length; i++) {
            var el = boxes[i];
            if (el.scrollTop > 0 || el.scrollLeft > 0) return true;
        }
        return false;
    }

    function refreshDataDinamis(switchTab, isSilent = false) {
        var loader = document.getElementById('global-loader'); 
        var isFirstLoad = (ALL_JOBS.length === 0);
        
        if (loader && !isSilent && isFirstLoad) { loader.style.display = 'flex'; } 
        else if (!isSilent && !isFirstLoad) { jalankanSemuaSkeleton(); }
        
        // ✅ CARA BARU: Membaca parameter URL langsung dari Browser
        let p = new URLSearchParams(window.location.search);
        let publicCvId = p.get('cv') || null; // Deteksi jika ada yang Scan QR
        
        let modeLoad = 'public'; let payload = null;
        // FIX: kalau admin DAN kandidat login bersamaan (mis. perangkat admin
        // yang pernah dipakai kandidat), mode 'kandidat' menimpa 'admin' di sini -
        // akibatnya panel admin menerima data versi kandidat (formInbox minim,
        // candidates hanya 1, schedules/tugas kosong). Prioritas: admin menang,
        // karena mode admin mengembalikan semua data; kandidat hanya datanya sendiri.
        if (localStorage.getItem('asj_admin_login') === 'sukses') { modeLoad = 'admin'; payload = null; }
        else if (localStorage.getItem('asj_kandidat_login') === 'sukses') { modeLoad = 'kandidat'; payload = localStorage.getItem('asj_kandidat_wa'); }

        // getAppData = muat data utama dashboard (BACA SAJA — aman diulang).
        // Kalau backend sempat mati / jaringan drop sesaat, coba SEKALI LAGI
        // setelah jeda singkat sebelum menampilkan toast error — kejadian
        // "server functions turun sesaat" tidak langsung melempar Gagal! ke user.
        // (Retry TIDAK diterapkan ke action tulis lain yang berisiko double-submit.)
        async function muatData(percobaan) {
        try {
            const res = await callGAS('getAppData', [modeLoad, payload, publicCvId]);
            if(!res || !res.success) { 
                if (percobaan < 1) { setTimeout(function () { muatData(percobaan + 1); }, 1200); return; }
                if(!isSilent) showToast(tr('alert.failed'), 'error'); 
                if(loader) loader.style.display = 'none'; 
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
                if (AUTO_REFRESH_TIMER) { clearInterval(AUTO_REFRESH_TIMER); AUTO_REFRESH_TIMER = null; PREV_MAIL_COUNT = null; }
                if (loader) loader.style.display = 'none';
                if (!isSilent) showToast(tr('ui.toast_kandidat_session_expired'), 'error');
                location.reload();
                return;
            }
            try { 
                initApp(res, isSilent); 
                if (modeLoad === 'admin' && switchTab && !isSilent) adminSwitchTab(switchTab); 
                
                // JIKA ADA KAISHA / PUBLIK YANG SCAN QR CODE:
                if (publicCvId) {
                    setTimeout(() => { 
                        bukaDigitalCV(publicCvId); 
                        // Hilangkan tombol close jika yang melihat adalah orang Jepang
                        if(!isAdmin && !isKandidat) {
                            let closeBtn = document.querySelector('#modal-cv button');
                            if(closeBtn) closeBtn.style.display = 'none';
                        }
                    }, 800);
                }

            } catch(e) { if(!isSilent) showToast(tr('ui.toast_render_error') + e.message, 'error'); } 
            finally { if(loader) loader.style.display = 'none'; } 
        } catch (err) {
            // Backend/jaringan drop sesaat (fetch throw) — coba sekali lagi dulu.
            if (percobaan < 1) { setTimeout(function () { muatData(percobaan + 1); }, 1200); return; }
            if(!isSilent) showToast(tr('alert.network') + err.message, 'error'); 
            if(loader) loader.style.display = 'none'; 
            if(!isSilent && !isFirstLoad) initApp({jobs: ALL_JOBS, dbJobs: ALL_DB_JOBS, candidates: ALL_CANDIDATES, schedules: ALL_SCHEDULES, tugas: ALL_TUGAS, formInbox: ALL_FORM, waTemplates: ALL_WA_TEMPLATES, kandidatRiwayat: ALL_RIWAYAT_KANDIDAT, dropdowns: DROPDOWNS, activeTheme: CURRENT_THEME, assets: ASSETS}, isSilent);
        }
        }
        muatData(0);
    }

    function initApp(res, isSilent = false) {
        // jobs & dbJobs konten identik; backend kirim salah satu per mode
        // (publik/kandidat: jobs; admin: dbJobs) - fallback silang supaya
        // kedua global selalu terisi.
        ALL_JOBS = res.jobs || res.dbJobs || []; ALL_DB_JOBS = res.dbJobs || res.jobs || []; ALL_CANDIDATES = res.candidates || []; ALL_CANDIDATES_TOTAL = res.candidatesTotal || ALL_CANDIDATES.length; 
        ALL_SCHEDULES = res.schedules || []; ALL_TUGAS = res.tugas || []; 
        ALL_FORM = res.formInbox || []; ALL_WA_TEMPLATES = res.waTemplates || [];
        ALL_RIWAYAT_KANDIDAT = res.kandidatRiwayat || [];
        ASSETS = res.assets || {}; DROPDOWNS = res.dropdowns || {};
      
        if(!isSilent) {
            var logo = document.getElementById('logo-asj'); if(logo && ASSETS.LOGO) logo.src = ASSETS.LOGO;
            if(ASSETS.SOCIAL) {
                var fWa = document.getElementById('footer-wa'); if(fWa) fWa.href = 'https://wa.me/' + (ASSETS.SOCIAL.whatsapp||'').replace(/\D/g, '');
                var fIg = document.getElementById('footer-ig'); if(fIg) fIg.href = ASSETS.SOCIAL.instagram || '#';
                var fTk = document.getElementById('footer-tk'); if(fTk) fTk.href = ASSETS.SOCIAL.tiktok || '#';
                var fGps = document.getElementById('footer-gps'); if(fGps) fGps.href = ASSETS.SOCIAL.maps || '#';
                // Link maps banner LPK ikut single-source dari ASSETS.SOCIAL.maps
                // (backend) supaya ganti 1 tempat, semua link ter-update.
                var mapsLpk = document.getElementById('maps-lpk-link');
                if (mapsLpk && ASSETS.SOCIAL && ASSETS.SOCIAL.maps) mapsLpk.href = ASSETS.SOCIAL.maps;
            }

            let pengumumanText = res.pengumuman || "";
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

            if(document.getElementById('input-kategori')) populate('input-kategori', DROPDOWNS.kategori); 
            if(document.getElementById('input-gender')) populate('input-gender', DROPDOWNS.gender); 
            if(document.getElementById('edit-k-tahapan')) populate('edit-k-tahapan', DROPDOWNS.tahapan); 
            if(document.getElementById('edit-k-status')) populate('edit-k-status', DROPDOWNS.tahapan); 
            if(document.getElementById('input-tsk')) populate('input-tsk', DROPDOWNS.tsk); 
            if(document.getElementById('j-tsk')) populate('j-tsk', DROPDOWNS.tsk); 
            if(document.getElementById('input-tahapan-db')) populate('input-tahapan-db', DROPDOWNS.tahapan); 
            if(document.getElementById('edit-db-tahapan')) populate('edit-db-tahapan', DROPDOWNS.tahapan);
            if(document.getElementById('checkbox-lokasi')) populateCheckboxes('checkbox-lokasi', DROPDOWNS.lokasi, 'lokasi_cb'); 
            if(document.getElementById('checkbox-syarat')) populateCheckboxes('checkbox-syarat', DROPDOWNS.syarat, 'syarat_cb'); 
            if(document.getElementById('ef-kategori')) populate('ef-kategori', DROPDOWNS.kategori); 
            if(document.getElementById('ef-tsk')) populate('ef-tsk', DROPDOWNS.tsk); 
            if(document.getElementById('ef-gender')) populate('ef-gender', DROPDOWNS.gender);

            // Datalist kode loker utk input "JOB DILAMAR (KODE)" di modal Input
            // Kandidat Manual. FIX 2026-08-12: sebelumnya menarget id 'datalist-loker'
            // yang TIDAK ADA di HTML (saran kode loker tidak pernah muncul); id asli
            // datalist-nya adalah 'list-kode-job' (lihat admin.html/index.html).
            let dlLoker = document.getElementById('list-kode-job');
            if(dlLoker) { 
                let htmlDl = '<option value="UMUM">Lamar Umum (Tanpa Loker Spesifik)</option>'; 
                ALL_JOBS.forEach(j => { htmlDl += '<option value="' + j.code + '">' + j.code + ' - ' + j.pekerjaan + '</option>'; }); 
                dlLoker.innerHTML = htmlDl; 
            }

            let dlKodeJob = document.getElementById('list-kode-job');
            if(dlKodeJob) { dlKodeJob.innerHTML = ALL_JOBS.map(j => '<option value="' + j.code + '">').join(''); }
            
            let dlLokasi = document.getElementById('list-lokasi');
            if(dlLokasi) {
                let uniqueLokasi = [...new Set(ALL_JOBS.map(j => j.lokasi).filter(Boolean))];
                dlLokasi.innerHTML = uniqueLokasi.map(l => '<option value="' + l + '">').join('');
            }
            
            let dlSyarat = document.getElementById('list-syarat');
            if(dlSyarat) {
                let uniqueSyarat = [...new Set(ALL_JOBS.map(j => j.syarat).filter(Boolean))];
                dlSyarat.innerHTML = uniqueSyarat.map(s => '<option value="' + s + '">').join('');
            }
        } 

        if (localStorage.getItem('asj_admin_login') === 'sukses') {
            isAdmin = true; currentAdminName = localStorage.getItem('asj_admin_name');
             
            if(!isSilent) {
                if(document.getElementById('nav-mode')) document.getElementById('nav-mode').classList.add('hidden');
                if(document.getElementById('nav-admin-mode')) document.getElementById('nav-admin-mode').classList.remove('hidden');
                changePage('admin'); renderAdminFull(); 
                // Audit otomatis: kandidat yg masih pakai link Google Drive -> banner kuning
                if (typeof muatMigrasiDrive === 'function') muatMigrasiDrive();
                
                var mLoggedOut = document.getElementById('mobile-nav-logged-out');
                var mAdmin = document.getElementById('mobile-nav-admin');
                var mKandidat = document.getElementById('mobile-nav-kandidat');
                if(mLoggedOut) mLoggedOut.classList.add('hidden');
                if(mAdmin) mAdmin.classList.remove('hidden');
                if(mKandidat) mKandidat.classList.add('hidden');
            } else {
                // AUTO-REFRESH PINTAR: kalau admin sedang scroll tabel (Mail Inbox
                // dll), jangan render ulang supaya posisi scroll tidak ter-reset.
                // Data (ALL_FORM) sudah di-update di memori di atas, dan badge
                // notifikasi tetap dihitung di bawah.
                if (!sedangDiscrollTabel()) {
                    renderFormInbox();
                }
            }

            let pendingMails = ALL_FORM.filter(f => f.status.toUpperCase() === 'MENUNGGU' || f.status.toUpperCase() === 'MAIL' || f.status.toUpperCase() === 'BARU').length;
            
            let notifBadge = document.getElementById('admin-notif-badge');
            if (notifBadge) {
                if (pendingMails > 0) {
                    notifBadge.innerText = pendingMails;
                    notifBadge.classList.remove('hidden');
                } else {
                    notifBadge.classList.add('hidden');
                }
            }

            let tabMailBtn = document.getElementById('tab-mail');
            if (tabMailBtn) {
                let label = '<i class="fas fa-envelope md:mr-1"></i> <span class="hidden md:inline">Mail Inbox</span>';
                if (pendingMails > 0) {
                    label += ' <span class="ml-1 px-1.5 py-0.5 bg-red-500 text-white rounded-full text-[10px] font-black animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]">' + pendingMails + '</span>';
                }
                tabMailBtn.innerHTML = label;
            }

            let botMailBtn = document.getElementById('nav-bot-notif');
            if (botMailBtn) {
                if (pendingMails > 0) { botMailBtn.classList.remove('hidden'); } 
                else { botMailBtn.classList.add('hidden'); }
            }

            if (PREV_MAIL_COUNT !== null && pendingMails > PREV_MAIL_COUNT) {
                showToast(tr('ui.toast_new_mail').replace('{n}', pendingMails - PREV_MAIL_COUNT) + tr('ui.toast_mail_inbox_n'), 'success');
                try { new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play(); } catch(e){}
            }
            PREV_MAIL_COUNT = pendingMails;

            // AUTO-REFRESH PINTAR (60 detik): refresh hanya berjalan jika TIDAK ada
            // modal yang terbuka (preview CV, form tambah/edit, pemberkasan, dst),
            // supaya modal yang sedang dibaca admin tidak tertutup paksa. Guard
            // scroll ada di refreshDataDinamis/initApp (skip render tabel yang
            // sedang di-scroll). Kalau ada modal terbuka, refresh ditunda dan akan
            // jalan di siklus berikutnya.
            if (!AUTO_REFRESH_TIMER) {
                AUTO_REFRESH_TIMER = setInterval(() => {
                    if (adaModalTerbuka()) return; // modal terbuka → skip refresh
                    refreshDataDinamis(null, true);
                }, 60000);
            }

        } else if (localStorage.getItem('asj_kandidat_login') === 'sukses') {
            isKandidat = true; currentKandidatName = localStorage.getItem('asj_kandidat_name'); currentKandidatWa = localStorage.getItem('asj_kandidat_wa'); 
             
            if(!isSilent) {
                if(document.getElementById('nav-mode')) document.getElementById('nav-mode').classList.add('hidden');
                if(document.getElementById('nav-kandidat-mode')) document.getElementById('nav-kandidat-mode').classList.remove('hidden');
                safeSet('nama-kandidat-login', tr('candidate.welcome') + ', ' + currentKandidatName);
                 
                var mLoggedOut = document.getElementById('mobile-nav-logged-out');
                var mAdmin = document.getElementById('mobile-nav-admin');
                var mKandidat = document.getElementById('mobile-nav-kandidat');
                if(mLoggedOut) mLoggedOut.classList.add('hidden');
                if(mAdmin) mAdmin.classList.add('hidden');
                if(mKandidat) mKandidat.classList.remove('hidden');
            }
            
            let myData = ALL_CANDIDATES.find(c => normalizePhone(c.wa) === normalizePhone(currentKandidatWa));
            if(myData) {
                currentKandidatId = myData.idKandidat; 
                safeSet('k-dash-job', myData.idLoker || '-'); 
                // Tampilan tahapan/status sesuai bahasa; logika (evaluasiTahapanKandidat
                // & regex) tetap memakai nilai ASLI myData.tahapan/status.
                safeSet('k-dash-tahapan', trOption(myData.tahapan)); 
                safeSet('k-dash-status', trOption(myData.status));
                
                let boxCatatan = document.getElementById('k-dash-catatan-box');
                if(boxCatatan) {
                    if(myData.catatanExt && myData.catatanExt.trim() !== '' && myData.catatanExt.trim() !== '-') {
                        boxCatatan.classList.remove('hidden'); safeSet('k-dash-catatan-ext', '"' + myData.catatanExt + '"');
                    } else { boxCatatan.classList.add('hidden'); }
                }

                let areaRev = document.getElementById('area-revisi');
                if(myData.status && myData.status.toUpperCase() === 'REVISI') { 
                    if(areaRev) areaRev.classList.remove('hidden'); 
                    safeSet('k-dash-catatan', myData.catatan || tr('candidate.doc_revise_desc'));
                } else { 
                    if(areaRev) areaRev.classList.add('hidden'); 
                }
                
                evaluasiTahapanKandidat(myData.tahapan);
                renderProgresPemberkasan(myData);
                kalkulasiProgress(myData);
                
                // Tombol AI CV & Latihan Interview tetap tampil untuk semua (biar kelihatan
                // bedanya siswa ASJ vs kandidat luar); aksesnya dibatasi di fungsi masing-masing.
                renderRiwayatKandidat();
                renderStudentCard();
                let mySchedules = res.mySchedules || [];
                let boxJadwal = document.getElementById('k-dash-jadwal-box');
                let listJadwal = document.getElementById('k-dash-jadwal-list');
                
                if(boxJadwal && listJadwal) {
                    if(mySchedules.length > 0) {
                        let htmlJadwal = '';
                        mySchedules.forEach(j => {
                            let linkBtn = (j.link && j.link !== '-') ? `<a href="${j.link}" target="_blank" class="mt-2 inline-flex items-center px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-bold rounded-lg shadow-md transition"><i class="fas fa-external-link-alt mr-1.5"></i> ${tr('ui.open_link')}</a>` : '';
                            
                            htmlJadwal += `
                            <div class="bg-black/60 p-4 rounded-xl border border-amber-500/30 shadow-inner">
                                <div class="flex justify-between items-start mb-2">
                                    <p class="text-amber-300 font-black text-sm uppercase">${j.agenda}</p>
                                    <span class="text-[9px] px-2 py-1 rounded bg-rose-900/50 text-rose-300 font-bold border border-rose-500/30 whitespace-nowrap">${trOption(j.status)}</span>
                                </div>
                                <p class="text-xs text-slate-300 mb-1.5"><i class="fas fa-clock w-4 text-center mr-1 text-slate-400"></i> ${j.waktu}</p>
                                <p class="text-xs text-slate-300 mb-1"><i class="fas fa-map-marker-alt w-4 text-center mr-1 text-rose-400"></i> ${trOption(j.lokasi)}</p>
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
             if(!isSilent) changePage('kandidat');
         } else {
             var mLoggedOut = document.getElementById('mobile-nav-logged-out');
             var mAdmin = document.getElementById('mobile-nav-admin');
             var mKandidat = document.getElementById('mobile-nav-kandidat');
             if(mLoggedOut) mLoggedOut.classList.remove('hidden');
             if(mAdmin) mAdmin.classList.add('hidden');
             if(mKandidat) mKandidat.classList.add('hidden');
         }
         
         // 👉 PERBAIKAN: INI KURUNG PENUTUP YANG HILANG!
         if(!isSilent) {
            if (currentAdminName === 'KHOCI') {
                 applyInterMilanVibe();
            } else {
                 // Pilihan theme pengunjung (localStorage) menang, fallback ke
                 // config backend, terakhir default TOKYO.
                 var savedTheme = null;
                 try { savedTheme = localStorage.getItem('asj_theme'); } catch(e) {}
                 applyTheme(savedTheme || res.activeTheme || 'TOKYO'); 
            }
            renderLanguage();
         }
    }

    // ==========================================
