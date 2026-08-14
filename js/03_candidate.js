    // 4. KANDIDAT: AKSI (CV MINI, PORTAL FORM MASTER, PEMBERKASAN)
    // Render/engine dipindah ke 03_engine.js saat god-object refactor.
    // ==========================================
    function bukaModalCvMini() {
        let myData = ALL_CANDIDATES.find(c => normalizePhone(c.wa) === normalizePhone(currentKandidatWa)); 
        if(myData) { 
            let cleanGender = (myData.gender && myData.gender !== '-') ? String(myData.gender).trim().toUpperCase() : 'LAKI-LAKI';
            if (cleanGender.includes('PRIA') || cleanGender === 'L') cleanGender = 'LAKI-LAKI';
            if (cleanGender.includes('WANITA') || cleanGender === 'P') cleanGender = 'PEREMPUAN';

            safeSetVal('um-gender', cleanGender);
            safeSetVal('um-usia', (myData.usia && myData.usia !== '-') ? String(myData.usia).replace(/\D/g,'') : '');
            safeSetVal('um-tb', (myData.tb && myData.tb !== '-') ? String(myData.tb).replace(/\D/g,'') : '');
            safeSetVal('um-bb', (myData.bb && myData.bb !== '-') ? String(myData.bb).replace(/\D/g,'') : '');
            // riwayatpendidikan kini JSON array 5-baris — ambil tingkat terakhir terbaca
            safeSetVal('um-pendidikan', formatPendidikanTingkat(myData.pendidikan) || '-');
            safeSetVal('um-jft-text', myData.jftText && myData.jftText !== '-' ? myData.jftText : "");
            safeSetVal('um-ssw-text', myData.sswText && myData.sswText !== '-' ? myData.sswText : "");
            
            document.getElementById('um-photo').value = ""; 
            document.getElementById('modal-cv-mini').classList.remove('hidden'); 
        } else { showToast(tr('ui.toast_profile_not_found'), 'error'); } 
    }

    async function prosesSimpanCvMini() { 
       let btn = document.getElementById('btn-submit-cv-mini'); 
       btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> ' + tr('ui.saving') + ''; 
       btn.disabled = true; 
    
       let pPhoto = await bacaFileBase64(document.getElementById('um-photo'), 'PHOTO'); 
       
       let payload = { 
          wa: normalizePhone(currentKandidatWa), 
          nama: currentKandidatName, 
          gender: document.getElementById('um-gender').value, 
          usia: document.getElementById('um-usia').value, 
          tb: document.getElementById('um-tb').value, 
          bb: document.getElementById('um-bb').value, 
          pendidikan: document.getElementById('um-pendidikan').value,
          jft_text: document.getElementById('um-jft-text').value, 
          ssw_text: document.getElementById('um-ssw-text').value, 
          photo: pPhoto
        }; 
    
        document.getElementById('global-loader').style.display='flex'; 
        try { 
            const res = await callGAS('simpanUpdateMaster', [payload]); 
            if(res.success) { 
              showToast(tr('ui.toast_cvmini_updated'), 'success'); 
              document.getElementById('modal-cv-mini').classList.add('hidden'); 
              refreshDataDinamis(); 
            } else { 
              showToast(tr('ui.toast_failed_prefix') + res.error, 'error'); 
            } 
        } catch (err) {
            showToast(tr('alert.network') + (err && err.message ? err.message : err), 'error');
        } finally {
            btn.innerHTML = '<i class="fas fa-save mr-1"></i> ' + tr('ui.save_cv_mini') + ''; 
            btn.disabled = false;
            document.getElementById('global-loader').style.display='none';
        }
    }

    // Helper tunggal: penentu status VIP/KELAS (sumber kebenaran untuk semua entry point)
    function isVipCatatan(catatan) {
        var c = catatan || '';
        return c.includes('[VIP]') || !!c.match(/\[(?:KELAS\s*[A-Z0-9]+|[A-Z0-9]+)\]/i);
    }

    function bukaMasterEksternal() {
        if(!currentKandidatWa) { showToast(tr('ui.toast_session_invalid_relogin'), "error"); return; }
        let myData = ALL_CANDIDATES.find(c => normalizePhone(c.wa) === normalizePhone(currentKandidatWa));
        let catatan = myData ? (myData.catatanInt || '') : '';
        if (isVipCatatan(catatan)) {
            bukaAiFormPortal('master', '', '', currentKandidatWa, currentKandidatName);
        } else {
            showToast(tr('ui.toast_ai_cv_locked'), 'info');
        }
    }

    // Helper: buka form bridge di tab baru — async/await + try/catch/finally.
    // Optimistic UI: loader tampil segera, dipadamkan di finally walau gagal.
    async function bukaFormBridge(endpoint, params, toastUrlMissing) {
        var w = window.open('', '_blank');
        var loader = document.getElementById('global-loader');
        if(loader) loader.style.display = 'flex';
        try {
            const res = await callGAS(endpoint, params);
            if(res && res.formUrl) { if (w) w.location.href = res.formUrl; else window.open(res.formUrl, '_blank'); }
            else { if (w) w.close(); showToast(toastUrlMissing, 'error'); }
        } catch (err) {
            if (w) w.close();
            showToast(tr('ui.toast_open_master_failed') + (err && err.message ? err.message : err), 'error');
        } finally {
            if(loader) loader.style.display = 'none';
        }
    }

    function bukaMasterEksternalAdmin(waRaw, nama) {
        var cleanWa = normalizePhone(waRaw);
        if(!cleanWa) return showToast(tr('ui.toast_wa_invalid_cand'), "error");
        bukaFormBridge('generateAiFormBridge', ['ai', '', '', cleanWa, nama], tr('ui.toast_master_form_url_missing'));
    }

    function bukaMasterLengkapPortal() {
        if(!currentKandidatWa) { showToast(tr('ui.toast_session_invalid_relogin'), "error"); return; }
        bukaFormBridge('generateLegacyMasterBridge', [currentKandidatWa, currentKandidatName], tr('ui.toast_master_form_url_missing'));
    }

    function bukaAiFormPortal(flow, job, bidang, wa, nama) {
        bukaFormBridge('generateAiFormBridge', [flow, job, bidang, wa, nama], tr('ui.toast_ai_form_url_missing'));
    }

    async function bukaFormSiswa() {
        const loader = document.getElementById('global-loader');
        if(loader) loader.style.display = 'flex';
        
        try {
            const url = await callGAS('getLinkSiswaBaru', []);
            if(url) {
                window.open(url.url || url.formUrl || url, '_blank');
            } else {
                showToast(tr('ui.toast_siswa_form_url_missing'), 'error');
            }
        } catch (err) {
            showToast(tr('ui.toast_open_form_failed') + (err && err.message ? err.message : err), 'error');
        } finally {
            if(loader) loader.style.display = 'none';
        }
    }

    // ==========================================
    // ===== GUARD UKURAN FILE UPLOAD (sumber kebenaran tunggal) =====
    // Netlify Functions: buffered request payload maks 6 MB, binary yang di-
    // base64 membengkak ~30% -> efektif ~4.5 MB. Batas 4 MB file mentah
    // (base64 ~5.3 MB + wrapper JSON) aman di bawah limit; file lebih besar
    // PASTI ditolak server, jadi cegah di frontend dengan toast. Definisi DI
    // SINI (file dimuat paling awal) supaya semua jalur upload — pemberkasan
    // kandidat (file ini) & modal admin (07_api.js) — memakai satu nilai.
    var MAX_FILE_MB = 4;
    var MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

    // Ekstensi file yang diizinkan — SINKRON dengan allowlist backend
    // (storage-helper.ts) & preview (isPreviewableFile): gambar + PDF + Office.
    var ALLOWED_FILE_EXT = ['pdf','jpg','jpeg','png','gif','webp','bmp','svg','xls','xlsx','xlsm','doc','docx','ppt','pptx','odt','ods','odp','txt','rtf','csv'];

    // Return pesan error kalau file melebihi batas, '' kalau aman/tidak ada.
    function cekUkuranFile(inputEl) {
        if (!inputEl || !inputEl.files || inputEl.files.length === 0) return '';
        var file = inputEl.files[0];
        if (file.size > MAX_FILE_BYTES) {
            return tr('ui.toast_file_too_big').replace('{nama}', file.name || 'File').replace('{mb}', String(MAX_FILE_MB));
        }
        return '';
    }

    // Ekstensi yang diizinkan DARI ATRIBUT accept input (mis. ".pdf,.jpg" atau
    // "image/*") — HTML jadi sumber kebenaran format baku per jenis dokumen
    // (foto JPG/PNG, CV PDF/Word/Excel, dokumen lain PDF). Return null kalau
    // accept kosong -> jatuh ke allowlist umum ALLOWED_FILE_EXT.
    function ekstensiDariAccept(acceptAttr) {
        var acc = String(acceptAttr || '').toLowerCase();
        if (acc.indexOf('image/*') !== -1) return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
        var out = [];
        acc.split(',').forEach(function (a) {
            a = a.trim().replace(/^\./, '');
            if (a) out.push(a);
        });
        return out.length > 0 ? out : null;
    }

    // Return pesan error kalau ekstensi file tidak diizinkan, '' kalau aman.
    // Dipanggil SEBELUM upload supaya user langsung tahu (tanpa nunggu server).
    // Validasi mengikuti accept input (format baku per jenis dokumen); input
    // tanpa accept tetap dicek ke allowlist umum backend.
    function cekEkstensiFile(inputEl) {
        if (!inputEl || !inputEl.files || inputEl.files.length === 0) return '';
        var file = inputEl.files[0];
        var ext = String(file.name || '').split('.').pop().toLowerCase();
        var allowed = ekstensiDariAccept(inputEl.getAttribute('accept')) || ALLOWED_FILE_EXT;
        if (allowed.indexOf(ext) === -1) {
            return tr('ui.toast_file_ext_bad').replace('{nama}', file.name || 'File');
        }
        return '';
    }

    // ===== NORMALISASI GENDER =====
    // Gender tersimpan di DB dengan CAMPURAN format (perempuan / PEREMPUAN /
    // Perempuan / laki-laki / LAKI-LAKI / L / P / WANITA) tergantung jalur
    // input (AI CV, CV Mini, apply, input manual admin). Select di Super Edit
    // & Edit Cepat hanya punya 2 opsi — tanpa normalisasi nilai yang beda
    // kapital/format tidak pernah cocok dan tampil kosong. Fungsi ini
    // mengembalikan format KANONIKAL: 'LAKI-LAKI' | 'PEREMPUAN' | '' (kosong
    // untuk yang tidak jelas), dipakai BOTH saat mengisi select (read) dan
    // saat menyimpan (write) supaya data DB konvergen ke satu format.
    function normalizeGenderValue(v) {
        if (!v) return '';
        var s = String(v).trim().toLowerCase();
        if (s === '-' || s === '') return '';
        if (s === 'l' || s === 'lk' || s === 'male' || s === 'pria' || s.includes('laki')) return 'LAKI-LAKI';
        if (s === 'p' || s === 'pr' || s === 'female' || s === 'wanita' || s === 'cewek' || s.includes('perempuan') || s.includes('女')) return 'PEREMPUAN';
        return '';
    }

    // 5. KANDIDAT: MULTI UPLOAD & PEMBERKASAN
    // ==========================================
    function compressImage(file, callback) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const dataUrl = e.target.result;
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                let width = img.width; let height = img.height;
                const MAX_WIDTH = 800; 
                if (width > MAX_WIDTH) { height = Math.round((height * MAX_WIDTH) / width); width = MAX_WIDTH; }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                callback(canvas.toDataURL('image/jpeg', 0.7).split(',')[1]); 
            };
            // FIX: file bertipe image/ tapi tidak bisa di-decode (korup, HEIC dari
            // HP, format eksotis) TIDAK boleh menggantung upload — sebelumnya tanpa
            // onerror, callback tidak pernah terpanggil -> bacaFileBase64 hang
            // selamanya -> prosesUploadKandidat macet diam-diam padahal kandidat
            // sudah tersimpan (gejala "sering eror" saat upload dokumen). Kirim
            // data asli tanpa kompresi supaya alur tetap lanjut.
            img.onerror = function() {
                callback(String(dataUrl || '').split(',')[1] || '');
            };
            img.src = dataUrl;
        };
        reader.readAsDataURL(file);
    }

    function bacaFileBase64(inputEl, label) { 
        return new Promise((resolve) => { 
            let settled = false;
            const done = (v) => { if (!settled) { settled = true; clearTimeout(timer); resolve(v); } };
            // Pengaman: JANGAN pernah menggantung selamanya. Kalau file rusak /
            // tidak bisa dibaca (compressImage/FileReader macet), resolve null
            // setelah 15 detik supaya upload tetap selesai + toast muncul.
            const timer = setTimeout(() => done(null), 15000);
            if(!inputEl.files || inputEl.files.length === 0) { 
                done(null); 
            } else { 
                let file = inputEl.files[0]; 
                if (file.type.startsWith('image/')) {
                    compressImage(file, (b64Data) => {
                        done({name: file.name.replace(/\.[^/.]+$/, "") + ".jpg", mimeType: 'image/jpeg', data: b64Data, label: label, seq: "1"});
                    });
                } else {
                    let reader = new FileReader(); 
                    reader.onload = e => done({name: file.name, mimeType: file.type, data: e.target.result.split(',')[1], label: label, seq: "1"}); 
                    reader.readAsDataURL(file); 
                }
            } 
        }); 
    }

    // Fungsi Checklist Berkas
    function setStatusBerkas(idSpan, val) {
        let el = document.getElementById(idSpan);
        if(!el) return;
        if(val && val !== "-") {
            // Preview INLINE (modal) — bukan buka tab baru, supaya admin/kandidat
            // lihat dokumennya langsung tanpa pindah halaman. URL di-escape
            // (quot) supaya aman walau path mengandung tanda kutip.
            let escUrl = String(val).replace(/'/g, "\\'");
            el.innerHTML = `<button type="button" onclick="bukaPreviewDokumen('${escUrl}')" class="text-emerald-400 hover:text-emerald-300 underline"><i class="fas fa-check-circle"></i> ${tr('ui.uploaded_view')}</button>`;
        } else {
            el.innerHTML = `<span class="text-rose-400"><i class="fas fa-times-circle"></i> ${tr('ui.not_yet')}</span>`;
        }
    }

    // Buka preview dokumen (gambar/PDF) di modal inline — bukan tab baru.
    function bukaPreviewDokumen(url) {
        if (!url || url === '-') return;
        let modal = document.getElementById('modal-preview-dokumen');
        let frame = document.getElementById('preview-dokumen-frame');
        let unduh = document.getElementById('preview-dokumen-unduh');
        let judul = document.getElementById('preview-dokumen-judul');
        if (!modal || !frame) return;
        // Drive folder link tidak bisa di-preview — buka di tab sebagai fallback.
        if (/drive\.google\.com\/drive\/folders/.test(url)) {
            window.open(url, '_blank', 'noopener');
            return;
        }

        // Satu pintu preview (02_init.js): gambar/PDF native, CSV -> render lokal,
        // Office (docx/pptx) -> MS Office Viewer, zip/dll -> pesan + tombol Unduh.
        if (typeof previewFileInFrame === 'function') {
            previewFileInFrame(frame, url);
        } else if (!isPreviewableFile(url)) { frame.srcdoc = pesanPreviewTidakTersedia(url); }
        else { frame.removeAttribute('srcdoc'); frame.src = url; }
        if (unduh) unduh.href = url;
        if (judul) {
            let nama = decodeURIComponent(url.split('/').pop() || 'Dokumen');
            judul.innerHTML = `<i class="fas fa-file-alt mr-1.5 text-sky-400"></i> ${tr('ui.preview_label')}${nama}`;
        }
        modal.classList.remove('hidden');
    }

    function tutupPreviewDokumen() {
        let modal = document.getElementById('modal-preview-dokumen');
        let frame = document.getElementById('preview-dokumen-frame');
        if (modal) modal.classList.add('hidden');
        if (frame) frame.src = 'about:blank';
    }

    // Buka Modal Pemberkasan Sentral
    function bukaModalPemberkasan(waTarget) {
        let cleanWa = normalizePhone(waTarget);
        let c = ALL_CANDIDATES.find(kan => normalizePhone(kan.wa) === cleanWa);
        if (!c) { showToast(tr('ui.toast_applicant_not_found'), 'error'); return; }

        ACTIVE_PEMBERKASAN_WA = c.wa;
        ACTIVE_PEMBERKASAN_NAMA = c.nama;
        safeSet('nama-pemilik-berkas', c.nama.toUpperCase());

        let thp = String(c.tahapan).toUpperCase();
        let isTahap1 = /LOLOS|PEMBERKASAN|MCU|MEDICAL|MEDIKAL|PARPOR|PASPOR|PASPORT|MATCH|TERIMA|SIAP/i.test(thp);
        let isTahap2 = /TTD|KONTRAK|VISA|COE|KTKLN|SISKOP|FLIGHT|BERANGKAT|TERBANG|TIKET|E-ID/i.test(thp);

        if (!isTahap1 && !isTahap2 && !isAdmin) {
            showToast(tr('ui.toast_upload_locked'), "error");
            return;
        }

        // Atur mana Panel yang terbuka
        let pT1 = document.getElementById('modal-panel-t1');
        let pT2 = document.getElementById('modal-panel-t2');
        let pBio = document.getElementById('modal-panel-bio');
        
        if (pT1) pT1.classList.add('hidden');
        if (pT2) pT2.classList.add('hidden');
        if (pBio) pBio.classList.add('hidden');

        if (isTahap2) {
            if(pT1) pT1.classList.remove('hidden');
            if(pT2) pT2.classList.remove('hidden');
            if(pBio) pBio.classList.remove('hidden');
        } else if (isTahap1 || isAdmin) {
            // Jika admin, biarkan terbuka semua untuk antisipasi
            if(pT1) pT1.classList.remove('hidden');
            if(pBio) pBio.classList.remove('hidden');
            if(isAdmin) if(pT2) pT2.classList.remove('hidden');
        }

        // Terapkan Checklist Dokumen (Sudah/Belum)
        if(c.berkas) {
            setStatusBerkas('st-kk', c.berkas.kk); setStatusBerkas('st-akte', c.berkas.akte);
            setStatusBerkas('st-sd', c.berkas.sd); setStatusBerkas('st-smp', c.berkas.smp);
            setStatusBerkas('st-sma', c.berkas.sma); setStatusBerkas('st-pasport', c.berkas.pasport);
            setStatusBerkas('st-mcu', c.berkas.mcu); setStatusBerkas('st-kontrak', c.berkas.kontrak);
            setStatusBerkas('st-cert', c.berkas.cert); setStatusBerkas('st-ktp', c.berkas.ktp);
            setStatusBerkas('st-foto2', c.berkas.foto2); setStatusBerkas('st-ijinortu', c.berkas.ijinortu);
            setStatusBerkas('st-cpmi', c.berkas.cpmi); setStatusBerkas('st-kawin', c.berkas.kawin);
            setStatusBerkas('st-sehat', c.berkas.sehat); setStatusBerkas('st-bpjs', c.berkas.bpjs);
            setStatusBerkas('st-psikotes', c.berkas.psikotes);
        }

        // Terapkan Auto-Fill Biodata Lama
        if(c.bio) {
            safeSetVal('bio-email', c.bio.email); safeSetVal('bio-tmplahir', c.bio.tmplahir);
            // Format lama DD/MM/YYYY → ISO (YYYY-MM-DD) supaya cocok dengan input type=date & format kanonik DB
            var bioTglLahir = c.bio.tgllahir || '';
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(bioTglLahir)) bioTglLahir = bioTglLahir.split('/').reverse().join('-');
            safeSetVal('bio-tgllahir', bioTglLahir); safeSetVal('bio-alamat', c.bio.alamat);
            safeSetVal('bio-ayah', c.bio.ayah); safeSetVal('bio-ttlayah', c.bio.ttlayah);
            safeSetVal('bio-ibu', c.bio.ibu); safeSetVal('bio-ttlibu', c.bio.ttlibu);
            safeSetVal('bio-pasport', c.bio.pasport); safeSetVal('bio-coe', c.bio.coe);
            safeSetVal('bio-kotapasport', c.bio.kotapasport); safeSetVal('bio-tglpasport', c.bio.tglpasport);
            safeSetVal('bio-exppasport', c.bio.exppasport); safeSetVal('bio-pt', c.bio.pt);
            safeSetVal('bio-shacou', c.bio.shacou); safeSetVal('bio-telppt', c.bio.telppt);
            safeSetVal('bio-webpt', c.bio.webpt); safeSetVal('bio-alamatpt', c.bio.alamatpt);
        }

        document.getElementById('modal-pemberkasan').classList.remove('hidden');
    }

    async function prosesUploadPemberkasan(tahap) {
        if(!ACTIVE_PEMBERKASAN_WA) return showToast(tr('ui.toast_target_invalid'), 'error');
        let btnId = tahap === 1 ? 'btn-upload-t1' : 'btn-upload-t2'; let btn = document.getElementById(btnId); if(!btn) return;
        let inputs = tahap === 1 ?
            [ {id: 'berkas-kk', jenis: 'KK'}, {id: 'berkas-akte', jenis: 'AKTE'}, {id: 'berkas-sd', jenis: 'IJAZAH SD'}, {id: 'berkas-smp', jenis: 'IJAZAH SMP'}, {id: 'berkas-sma', jenis: 'IJAZAH SMA'}, {id: 'berkas-univ', jenis: 'UNIVERSITAS'}, {id: 'berkas-pasport', jenis: 'PASPORT'}, {id: 'berkas-mcu', jenis: 'MCU'}, {id: 'berkas-kontrak', jenis: 'KONTRAK KERJA'}, {id: 'berkas-cert', jenis: 'CERTIFICATE JAPAN'}, {id: 'berkas-ktp', jenis: 'KTP'}, {id: 'berkas-foto2', jenis: 'PAS FOTO STUDIO'} ] :
            [ {id: 'berkas-ijinortu', jenis: 'SURAT IJIN ORTU'}, {id: 'berkas-cpmi', jenis: 'PERNYATAAN CPMI'}, {id: 'berkas-kawin', jenis: 'STATUS PERKAWINAN'}, {id: 'berkas-sehat', jenis: 'SURAT SEHAT PUSKESMAS'}, {id: 'berkas-bpjs', jenis: 'BPJS KETENAGAKERJAAN'}, {id: 'berkas-psikotes', jenis: 'HASIL PSIKOTES'} ];
        // Guard ukuran + ekstensi: tolak SEBELUM baca base64 supaya tidak kena
        // limit server / ditolak backend (konsisten dengan modal admin).
        for(let i=0; i<inputs.length; i++) {
            let el = document.getElementById(inputs[i].id);
            let err = cekUkuranFile(el);
            if(err) { showToast(err, 'error'); return; }
            err = cekEkstensiFile(el);
            if(err) { showToast(err, 'error'); return; }
        }
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> ' + tr('ui.processing') + ''; btn.disabled = true; document.getElementById('global-loader').style.display='flex';
        
        // Baca semua file yang dipilih SECARA PARALEL (Promise.all) — membaca
        // base64 tidak saling bergantung, jadi tidak perlu berurutan.
        const readJobs = inputs
            .filter(i => { const el = document.getElementById(i.id); return el && el.files && el.files[0]; })
            .map(async i => {
                const el = document.getElementById(i.id);
                const b64 = await bacaFileBase64(el, i.jenis);
                return b64 ? { file: b64, jenisBerkas: i.jenis } : null;
            });
        const hasilBaca = await Promise.all(readJobs);
        const filesToUpload = hasilBaca.filter(Boolean);
        
        if(filesToUpload.length === 0) { showToast(tr('ui.toast_pick_min_one'), 'error'); btn.innerHTML = tahap === 1 ? '<i class="fas fa-cloud-upload-alt mr-2"></i> Upload Berkas Tahap 1' : '<i class="fas fa-cloud-upload-alt mr-2"></i> Upload Berkas Tahap 2'; btn.disabled = false; document.getElementById('global-loader').style.display='none'; return; }
        
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> ' + tr('ui.uploading_files').replace('{n}', filesToUpload.length);
        
        // Upload tiap berkas secara paralel via Promise.allSettled — satu berkas
        // gagal tidak menggagalkan batch, dan hasil dihitung dari yang sukses.
        const results = await Promise.allSettled(filesToUpload.map(async (f) => {
            const payload = { wa: ACTIVE_PEMBERKASAN_WA, nama: ACTIVE_PEMBERKASAN_NAMA, file: f.file, jenisBerkas: f.jenisBerkas };
            const res = await callGAS('simpanBerkasTahapan', [payload]);
            return !!(res && res.success);
        }));
        const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
        
        document.getElementById('global-loader').style.display='none'; 
        btn.innerHTML = tahap === 1 ? '<i class="fas fa-cloud-upload-alt mr-2"></i> Upload Berkas Tahap 1' : '<i class="fas fa-cloud-upload-alt mr-2"></i> Upload Berkas Tahap 2'; 
        btn.disabled = false; 
        
        showToast(tr('ui.toast_uploaded_n').replace('{n}', successCount) + tr('ui.toast_docs_exclaim'), 'success'); 
        document.getElementById('modal-pemberkasan').classList.add('hidden');
        refreshDataDinamis(); 
    }

    async function prosesSimpanBiodataLengkap() {
        if(!ACTIVE_PEMBERKASAN_WA) return showToast(tr('ui.toast_target_invalid'), 'error');
        let btn = document.getElementById('btn-submit-bio'); if(!btn) return;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> ' + tr('ui.saving') + ''; btn.disabled = true; document.getElementById('global-loader').style.display='flex';
        
        let payload = { 
            wa: ACTIVE_PEMBERKASAN_WA, email: document.getElementById('bio-email').value, tempat_lahir: document.getElementById('bio-tmplahir').value, 
            tgl_lahir: document.getElementById('bio-tgllahir').value, alamat_lengkap: document.getElementById('bio-alamat').value, 
            nama_ayah: document.getElementById('bio-ayah').value, ttl_ayah: document.getElementById('bio-ttlayah').value, 
            nama_ibu: document.getElementById('bio-ibu').value, ttl_ibu: document.getElementById('bio-ttlibu').value, 
            no_pasport: document.getElementById('bio-pasport').value, no_coe: document.getElementById('bio-coe').value, 
            kota_pasport: document.getElementById('bio-kotapasport').value, tgl_pasport: document.getElementById('bio-tglpasport').value, 
            exp_pasport: document.getElementById('bio-exppasport').value, nama_perusahaan: document.getElementById('bio-pt').value, 
            nama_shacou: document.getElementById('bio-shacou').value, telp_perusahaan: document.getElementById('bio-telppt').value, 
            web_perusahaan: document.getElementById('bio-webpt').value, alamat_perusahaan: document.getElementById('bio-alamatpt').value 
        };
        
        try {
            const res = await callGAS('simpanBiodataLengkap', [payload]);
            if(res.success) { 
                showToast(tr('ui.toast_biodata_saved'), 'success'); 
                document.getElementById('modal-pemberkasan').classList.add('hidden');
                refreshDataDinamis(); 
            } else { showToast(tr('ui.toast_failed_prefix') + res.error, 'error'); } 
        } catch (err) { 
            showToast(tr('ui.toast_network_error_prefix') + err.message, 'error'); 
        } finally {
            document.getElementById('global-loader').style.display='none'; btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save mr-2"></i> ' + tr('button.save_biodata') + '';
        }
    }

