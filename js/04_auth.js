    // 6. SISTEM LOGIN & AUTHENTICATION
    // ==========================================
    // REFACTOR: seluruh alur auth kini async/await + try/catch/finally.
    // State tombol dikelola lewat finally sehingga tidak pernah terkunci,
    // dan pesan kesalahan ditangani di satu tempat (showAuthError).

    function bukaModalKandidat(mode) {
        const m = document.getElementById('modal-kandidat'); if (m) m.classList.remove('hidden');
        const fd = document.getElementById('form-daftar-kandidat'); if (fd) fd.classList.toggle('hidden', mode !== 'daftar');
        const fl = document.getElementById('form-login-kandidat'); if (fl) fl.classList.toggle('hidden', mode !== 'login');
    }

    // Helper: jalankan callGAS dengan state tombol loading + error terpusat.
    // Optimistic UI: tombol langsung menampilkan spinner, lalu dikembalikan
    // di finally — UI tidak pernah macet walau request gagal/timeout.
    async function runAuthAction(btn, loadingHtml, idleText, fn) {
        if (btn) { btn.innerHTML = loadingHtml; btn.disabled = true; }
        try {
            const res = await fn();
            return res;
        } catch (err) {
            showToast(tr('alert.network') + (err && err.message ? err.message : err), 'error');
            return null;
        } finally {
            if (btn) { btn.innerHTML = idleText; btn.disabled = false; }
        }
    }

    async function prosesDaftarKandidat() {
        const btn = document.getElementById('btn-reg-kandidat');
        const n = document.getElementById('reg-nama').value;
        const w = document.getElementById('reg-wa').value;
        if (!n || !w) { showToast(tr('alert.mandatory'), 'error'); return; }
        // Password tidak diminta lagi: otomatis 4 digit terakhir nomor WA
        // (kebijakan seragam, lihat daftarKandidat di auth.ts).
        const res = await runAuthAction(
            btn,
            '<i class="fas fa-spinner fa-spin mr-2"></i> ' + tr('ui.registering'),
            tr('button.register'),
            () => callGAS('daftarKandidat', [n, w])
        );
        if (res && res.success) { showToast(tr('alert.success'), 'success'); bukaModalKandidat('login'); }
        else if (res) showToast(res.error, 'error');
    }

    // Ganti password kandidat (fitur 2026-08-12): password default 4 digit WA
    // bisa diganti password pribadi. Backend (auth.ts gantiPasswordKandidat)
    // memverifikasi sesi + password lama, menyimpan hash bcrypt baru + flag
    // password_diubah=true (UI admin lalu menampilkan peringatan, bukan 4 digit).
    function bukaModalGantiPass() { const m = document.getElementById('modal-ganti-pass'); if (m) m.classList.remove('hidden'); }
    function tutupModalGantiPass() { const m = document.getElementById('modal-ganti-pass'); if (m) m.classList.add('hidden'); }
    async function prosesGantiPasswordKandidat() {
        const btn = document.getElementById('btn-gp-submit');
        const lama = document.getElementById('gp-pass-lama').value;
        const baru = document.getElementById('gp-pass-baru').value;
        const konfirmasi = document.getElementById('gp-pass-konfirmasi').value;
        if (!lama || !baru || !konfirmasi) { showToast(tr('alert.mandatory'), 'error'); return; }
        if (baru !== konfirmasi) { showToast(tr('ui.pass_mismatch'), 'error'); return; }
        if (baru.length < 6 || baru.length > 20 || /\s/.test(baru)) { showToast(tr('ui.pass_new_hint'), 'error'); return; }
        if (!currentKandidatWa) { showToast(tr('ui.toast_kandidat_session_expired'), 'error'); return; }
        const res = await runAuthAction(
            btn,
            '<i class="fas fa-spinner fa-spin mr-2"></i> ' + tr('ui.change_password') + '…',
            '<i class="fas fa-check mr-1.5"></i> ' + tr('ui.change_password'),
            () => callGAS('gantiPasswordKandidat', [currentKandidatWa, lama, baru])
        );
        if (res && res.success) {
            showToast(tr('ui.pass_changed_ok'), 'success');
            tutupModalGantiPass();
            document.getElementById('gp-pass-lama').value = '';
            document.getElementById('gp-pass-baru').value = '';
            document.getElementById('gp-pass-konfirmasi').value = '';
        } else if (res) {
            showToast(res.error || tr('ui.pass_mismatch'), 'error');
        }
    }

    async function prosesLoginKandidat() {
        const btn = document.getElementById('btn-log-kandidat');
        const w = document.getElementById('log-wa').value;
        const p = document.getElementById('log-pass').value;

        if (!w || !p) { showToast(tr('alert.mandatory'), 'error'); return; }

        const res = await runAuthAction(
            btn,
            '<i class="fas fa-spinner fa-spin mr-2"></i> ' + tr('ui.searching_data'),
            tr('button.enter_dashboard'),
            () => callGAS('loginKandidat', [w, p])
        );

        if (res && res.success) {
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

            const navM = document.getElementById('nav-mode'); if (navM) navM.classList.add('hidden');
            const navK = document.getElementById('nav-kandidat-mode'); if (navK) navK.classList.remove('hidden');

            // Sync mobile nav
            const mLoggedOut = document.getElementById('mobile-nav-logged-out');
            const mAdmin = document.getElementById('mobile-nav-admin');
            const mKandidat = document.getElementById('mobile-nav-kandidat');
            if (mLoggedOut) mLoggedOut.classList.add('hidden');
            if (mAdmin) mAdmin.classList.add('hidden');
            if (mKandidat) mKandidat.classList.remove('hidden');

            // Optimistic UI: pindah tampilan dulu, data di-refresh paralel di background
            await refreshDataDinamis();
        } else if (res) {
            showToast(res.error, 'error');
        }
    }

    function showLoginAdminMaster() {
        const s1 = document.getElementById('login-step-1'); if (s1) s1.classList.remove('hidden');
        const s2 = document.getElementById('login-step-2'); if (s2) s2.classList.add('hidden');
        const s3 = document.getElementById('login-step-3'); if (s3) s3.classList.add('hidden');
        const m = document.getElementById('modal-admin'); if (m) m.classList.remove('hidden');
    }

    async function prosesLoginMaster() {
        const pin = document.getElementById('admin-pin-master').value;
        const btn = document.getElementById('btn-login-master');
        const res = await runAuthAction(
            btn,
            '<i class="fas fa-spinner fa-spin mr-2"></i> ' + tr('ui.checking'),
            tr('button.verify'),
            () => callGAS('checkAdminMaster', [pin, localStorage.getItem('asj_session_token') || ''])
        );
        if (res && res.success) {
            document.getElementById('login-step-1').classList.add('hidden');
            document.getElementById('login-step-2').classList.remove('hidden');
        } else if (res) { showToast(res.error, 'error'); }
    }

    function showLoginPersonal(name) {
        const s2 = document.getElementById('login-step-2'); if (s2) s2.classList.add('hidden');
        safeSet('lbl-nama-admin', tr('header.admin_login') + ' ' + name);
        const t = document.getElementById('admin-name-temp'); if (t) t.value = name;
        const s3 = document.getElementById('login-step-3'); if (s3) s3.classList.remove('hidden');
    }

    async function prosesLoginPersonal() {
        const name = document.getElementById('admin-name-temp').value;
        const pin = document.getElementById('admin-pin-personal').value;
        const btn = document.getElementById('btn-login-personal');

        const res = await runAuthAction(
            btn,
            '<i class="fas fa-spinner fa-spin mr-2"></i> ' + tr('ui.checking'),
            tr('button.enter_portal'),
            () => callGAS('checkAdminPersonal', [name, pin, localStorage.getItem('asj_session_token') || ''])
        );

        if (res && res.success) {
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

            const mLoggedOut = document.getElementById('mobile-nav-logged-out');
            const mAdmin = document.getElementById('mobile-nav-admin');
            const mKandidat = document.getElementById('mobile-nav-kandidat');
            if (mLoggedOut) mLoggedOut.classList.add('hidden');
            if (mAdmin) mAdmin.classList.remove('hidden');
            if (mKandidat) mKandidat.classList.add('hidden');

            changePage('admin');
            await refreshDataDinamis();

            // 👉 TRIGGER TEMA KHOCI SAAT BARU LOGIN
            if (currentAdminName === 'KHOCI') {
                setTimeout(applyInterMilanVibe, 50);
            }
        } else if (res) {
            showToast(res.error, 'error');
        }
    }

    // ==========================================
