    // 6. SISTEM LOGIN & AUTHENTICATION
    // ==========================================
    function bukaModalKandidat(mode) { 
        var m = document.getElementById('modal-kandidat'); if(m) m.classList.remove('hidden'); 
        var fd = document.getElementById('form-daftar-kandidat'); if(fd) fd.classList.toggle('hidden', mode !== 'daftar'); 
        var fl = document.getElementById('form-login-kandidat'); if(fl) fl.classList.toggle('hidden', mode !== 'login'); 
    }
    
    function prosesDaftarKandidat() { 
        var btn = document.getElementById('btn-reg-kandidat'); 
        var n = document.getElementById('reg-nama').value; var w = document.getElementById('reg-wa').value; 
        if(!n || !w) { showToast(tr('alert.mandatory'), 'error'); return; } 
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> ' + tr('ui.registering') + ''; btn.disabled = true; 
        // Password tidak diminta lagi: otomatis 4 digit terakhir nomor WA
        // (kebijakan seragam, lihat daftarKandidat di auth.ts).
        callGAS('daftarKandidat', [n, w]).then(res=>{ btn.innerText = tr('button.register'); btn.disabled = false; if(res.success) { showToast(tr('alert.success'), 'success'); bukaModalKandidat('login'); } else showToast(res.error, 'error'); }).catch(err => { btn.innerText = tr('button.register'); btn.disabled = false; showToast(tr('alert.network') + (err && err.message ? err.message : err), 'error'); }); 
    }
    
    // Ganti password kandidat (fitur 2026-08-12): password default 4 digit WA
    // bisa diganti password pribadi. Backend (auth.ts gantiPasswordKandidat)
    // memverifikasi sesi + password lama, menyimpan hash bcrypt baru + flag
    // password_diubah=true (UI admin lalu menampilkan peringatan, bukan 4 digit).
    function bukaModalGantiPass() { var m = document.getElementById('modal-ganti-pass'); if (m) m.classList.remove('hidden'); }
    function tutupModalGantiPass() { var m = document.getElementById('modal-ganti-pass'); if (m) m.classList.add('hidden'); }
    function prosesGantiPasswordKandidat() {
        var btn = document.getElementById('btn-gp-submit');
        var lama = document.getElementById('gp-pass-lama').value;
        var baru = document.getElementById('gp-pass-baru').value;
        var konfirmasi = document.getElementById('gp-pass-konfirmasi').value;
        if (!lama || !baru || !konfirmasi) { showToast(tr('alert.mandatory'), 'error'); return; }
        if (baru !== konfirmasi) { showToast(tr('ui.pass_mismatch'), 'error'); return; }
        if (baru.length < 6 || baru.length > 20 || /\s/.test(baru)) { showToast(tr('ui.pass_new_hint'), 'error'); return; }
        if (!currentKandidatWa) { showToast(tr('ui.toast_kandidat_session_expired'), 'error'); return; }
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> ' + tr('ui.change_password') + '…'; btn.disabled = true;
        callGAS('gantiPasswordKandidat', [currentKandidatWa, lama, baru]).then(function (res) {
            btn.innerHTML = '<i class="fas fa-check mr-1.5"></i> ' + tr('ui.change_password'); btn.disabled = false;
            if (res.success) {
                showToast(tr('ui.pass_changed_ok'), 'success');
                tutupModalGantiPass();
                document.getElementById('gp-pass-lama').value = '';
                document.getElementById('gp-pass-baru').value = '';
                document.getElementById('gp-pass-konfirmasi').value = '';
            } else {
                showToast(res.error || tr('ui.pass_mismatch'), 'error');
            }
        }).catch(function (err) {
            btn.innerHTML = '<i class="fas fa-check mr-1.5"></i> ' + tr('ui.change_password'); btn.disabled = false;
            showToast(tr('alert.network') + (err && err.message ? err.message : err), 'error');
        });
    }

    function prosesLoginKandidat() { 
        var btn = document.getElementById('btn-log-kandidat'); 
        var w = document.getElementById('log-wa').value; 
        var p = document.getElementById('log-pass').value; 
        
        if(!w || !p) { showToast(tr('alert.mandatory'), 'error'); return; } 
        
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> ' + tr('ui.searching_data') + ''; btn.disabled = true; 
        callGAS('loginKandidat', [w, p]).then(res => { 
            btn.innerText = tr('button.enter_dashboard'); btn.disabled = false; 
            
             if(res.success) {
                 localStorage.setItem('asj_kandidat_login', 'sukses');
                 localStorage.setItem('asj_kandidat_name', res.nama);
                 localStorage.setItem('asj_kandidat_wa', res.wa);
                 // Session kandidat ASLI dari server (loginKandidat) - dipakai
                 // semua aksi kandidat (getAppData mode kandidat, simpanUpdateMaster,
                 // ganti password, dll). Bukan lagi token acak buatan client.
                 localStorage.setItem('asj_kandidat_session', res.sessionToken || '');
                 localStorage.setItem('asj_session_token', Date.now().toString(36) + Math.random().toString(36).substr(2));
                 
                 document.getElementById('modal-kandidat').classList.add('hidden'); 
                 isKandidat = true; currentKandidatName = res.nama; currentKandidatWa = res.wa; 
                 
                 var navM = document.getElementById('nav-mode'); if(navM) navM.classList.add('hidden'); 
                 var navK = document.getElementById('nav-kandidat-mode'); if(navK) navK.classList.remove('hidden'); 
                 
                 // Sync mobile nav
                 var mLoggedOut = document.getElementById('mobile-nav-logged-out');
                 var mAdmin = document.getElementById('mobile-nav-admin');
                 var mKandidat = document.getElementById('mobile-nav-kandidat');
                 if(mLoggedOut) mLoggedOut.classList.add('hidden');
                 if(mAdmin) mAdmin.classList.add('hidden');
                 if(mKandidat) mKandidat.classList.remove('hidden');
                 
                 refreshDataDinamis();
                
            } else { 
                showToast(res.error, 'error'); 
            } 
        }).catch(err => {
            btn.innerText = tr('button.enter_dashboard'); btn.disabled = false;
            showToast(tr('alert.network') + (err && err.message ? err.message : err), 'error');
        }); 
    }
    
    function showLoginAdminMaster() { 
        var s1 = document.getElementById('login-step-1'); if(s1) s1.classList.remove('hidden'); 
        var s2 = document.getElementById('login-step-2'); if(s2) s2.classList.add('hidden'); 
        var s3 = document.getElementById('login-step-3'); if(s3) s3.classList.add('hidden'); 
        var m = document.getElementById('modal-admin'); if(m) m.classList.remove('hidden'); 
    }
    
    function prosesLoginMaster() { 
         var pin = document.getElementById('admin-pin-master').value; var btn = document.getElementById('btn-login-master'); 
         btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> ' + tr('ui.checking') + ''; btn.disabled = true; 
         callGAS('checkAdminMaster', [pin, localStorage.getItem('asj_session_token') || '']).then(res=>{ 
             btn.innerText = tr('button.verify'); btn.disabled = false; 
             if(res.success) { 
                 document.getElementById('login-step-1').classList.add('hidden'); document.getElementById('login-step-2').classList.remove('hidden'); 
             } else { showToast(res.error, 'error'); } 
         }).catch(err => {
             btn.innerText = tr('button.verify'); btn.disabled = false;
             showToast(tr('alert.network') + (err && err.message ? err.message : err), 'error');
         });
    }
    
    function showLoginPersonal(name) { 
        var s2 = document.getElementById('login-step-2'); if(s2) s2.classList.add('hidden'); 
        safeSet('lbl-nama-admin', tr('header.admin_login') + ' ' + name);
        var t = document.getElementById('admin-name-temp'); if(t) t.value = name; 
        var s3 = document.getElementById('login-step-3'); if(s3) s3.classList.remove('hidden'); 
    }
    
    function prosesLoginPersonal() { 
        var name = document.getElementById('admin-name-temp').value; 
        var pin = document.getElementById('admin-pin-personal').value; 
        var btn = document.getElementById('btn-login-personal'); 
        
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> ' + tr('ui.checking') + ''; btn.disabled = true; 
        
        callGAS('checkAdminPersonal', [name, pin, localStorage.getItem('asj_session_token') || '']).then(res => { 
            btn.innerText = tr('button.enter_portal'); btn.disabled = false; 
             if(res.success) {
                 localStorage.setItem('asj_admin_login', 'sukses');
                 localStorage.setItem('asj_admin_name', name);
                 // FASE 2 fix: dulu di sini men-generate token acak sendiri
                 // (cuma dipakai sebagai key rate-limit, bukan otorisasi asli).
                 // Sekarang simpan sessionToken ASLI dari server (hasil
                 // createSession di checkAdminPersonal) - inilah yang dicek
                 // ulang oleh doPost untuk semua aksi admin.
                 localStorage.setItem('asj_admin_session', res.sessionToken || '');
                 document.getElementById('modal-admin').classList.add('hidden'); 
                 isAdmin = true; currentAdminName = name; 
                 document.getElementById('nav-mode').classList.add('hidden'); 
                 document.getElementById('nav-admin-mode').classList.remove('hidden'); 
                 
                 var mLoggedOut = document.getElementById('mobile-nav-logged-out');
                 var mAdmin = document.getElementById('mobile-nav-admin');
                 var mKandidat = document.getElementById('mobile-nav-kandidat');
                 if(mLoggedOut) mLoggedOut.classList.add('hidden');
                 if(mAdmin) mAdmin.classList.remove('hidden');
                 if(mKandidat) mKandidat.classList.add('hidden');
                 
                 changePage('admin'); 
                 refreshDataDinamis();
                 
                 // 👉 TRIGGER TEMA KHOCI SAAT BARU LOGIN
                 if (currentAdminName === 'KHOCI') { 
                     setTimeout(applyInterMilanVibe, 50); 
                 }
            } else { 
                showToast(res.error, 'error'); 
            } 
         }).catch(err => {
             btn.innerText = tr('button.enter_portal'); btn.disabled = false;
             showToast(tr('alert.network') + (err && err.message ? err.message : err), 'error');
         });
    }

    // ==========================================
