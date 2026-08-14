    // 9. INTERAKSI BACKEND (NETLIFY FUNCTIONS + SUPABASE)
    // ==========================================
    // REFACTOR: semua interaksi backend kini async/await + try/catch/finally.
    // Pola lama .then().catch() diganti blok try/finally supaya loader dan
    // tombol tidak pernah terkunci, dan error terpusat di satu tempat.
    async function prosesReviewForm(r) {
        if (!confirm(tr('form.txt_review_confirm'))) return;
        const loader = document.getElementById('global-loader');
        if (loader) loader.style.display = 'flex';
        try {
            const res = await callAPI('reviewForm', [r, currentAdminName]);
            if (res.success) refreshDataDinamis('mail');
            else showToast(tr('alert.failed') + ' ' + (res.error || ''), 'error');
        } catch (err) {
            showToast(tr('alert.network') + (err && err.message ? err.message : err), 'error');
        } finally {
            if (loader) loader.style.display = 'none';
        }
    }
    async function prosesApproveForm(r) {
        if (!confirm(tr('form.txt_approve_confirm'))) return;
        const loader = document.getElementById('global-loader');
        if (loader) loader.style.display = 'flex';
        try {
            const res = await callAPI('approveForm', [r, currentAdminName]);
            if (res.success) refreshDataDinamis('mail');
            else showToast(tr('alert.failed') + ' ' + (res.error || ''), 'error');
        } catch (err) {
            showToast(tr('alert.network') + (err && err.message ? err.message : err), 'error');
        } finally {
            if (loader) loader.style.display = 'none';
        }
    }
    function prosesRejectForm(r) {
        document.getElementById('reject-row-index').value = r;
        document.getElementById('reject-reason-text').value = '';
        const modal = document.getElementById('modal-reject-mail');
        if (modal) modal.classList.remove('hidden');
    }
    window.submitRejectForm = async function () {
        const r = document.getElementById('reject-row-index').value;
        const reason = document.getElementById('reject-reason-text').value;
        document.getElementById('modal-reject-mail').classList.add('hidden');
        const loader = document.getElementById('global-loader');
        if (loader) loader.style.display = 'flex';
        try {
            const res = await callAPI('rejectForm', [r, currentAdminName, reason]);
            if (res.success) refreshDataDinamis('mail');
            else showToast(tr('alert.failed') + ' ' + (res.error || ''), 'error');
        } catch (err) {
            showToast(tr('alert.network') + (err && err.message ? err.message : err), 'error');
        } finally {
            if (loader) loader.style.display = 'none';
        }
    }
    function toggleMailSelect(cb) {
        if (!cb) return;
        var idx = cb.dataset && cb.dataset.idx;
        if (idx === undefined || idx === null) return;
        if (cb.checked) MAIL_SELECTED[idx] = true;
        else delete MAIL_SELECTED[idx];
        // Sinkronkan tombol "centang semua" dengan kondisi baris yang tampil.
        var all = document.getElementById('mail-check-all');
        if (all) {
            var boxes = document.querySelectorAll('#admin-mail-body .mail-check');
            var vis = Array.prototype.filter.call(boxes, function (b) { return !b.closest('tr').classList.contains('hidden'); });
            all.checked = vis.length > 0 && vis.every(function (b) { return b.checked; });
        }
    }
    function mailSelectAll(cb) {
        var boxes = document.querySelectorAll('#admin-mail-body .mail-check');
        for (var i = 0; i < boxes.length; i++) {
            boxes[i].checked = cb.checked;
            if (cb.checked) MAIL_SELECTED[boxes[i].dataset.idx] = true;
            else delete MAIL_SELECTED[boxes[i].dataset.idx];
        }
    }
    async function hapusFormMailTerpilih() {
        var ids = Object.keys(MAIL_SELECTED);
        if (ids.length === 0) { showToast(tr('ui.select_mail_first'), 'error'); return; }
        if (!confirm('Hapus ' + ids.length + ' lamaran terpilih? Data kandidat & master TIDAK ikut terhapus.')) return;
        const loader = document.getElementById('global-loader');
        if (loader) loader.style.display = 'flex';
        var ok = 0; var fail = 0;
        try {
            for (var i = 0; i < ids.length; i++) {
                try {
                    const res = await callAPI('deleteForm', [Number(ids[i])]);
                    if (res && res.success) ok++; else fail++;
                } catch (e) { fail++; }
            }
            MAIL_SELECTED = {};
            showToast('Hapus: ' + ok + ' berhasil' + (fail ? ', ' + fail + ' gagal' : ''), fail ? 'error' : 'success');
            refreshDataDinamis('mail');
        } finally {
            if (loader) loader.style.display = 'none';
        }
    }
    async function hapusFormMail(id) {
        if (!confirm(tr('ui.confirm_delete_mail'))) return;
        const loader = document.getElementById('global-loader');
        if (loader) loader.style.display = 'flex';
        try {
            const res = await callAPI('deleteForm', [id]);
            if (res.success) refreshDataDinamis('mail');
            else showToast(tr('alert.failed') + ' ' + (res.error || ''), 'error');
        } catch (err) {
            showToast(tr('alert.network') + (err && err.message ? err.message : err), 'error');
        } finally {
            if (loader) loader.style.display = 'none';
        }
    }
    function renderTugas() {
        var list = document.getElementById('todo-list'); if (!list) return; var html = '';
        ALL_TUGAS.forEach(t => {
            var bg = t.status == 'BARU' ? 'bg-slate-800' : (t.status == 'PROSES' ? 'bg-amber-900/40 border-amber-500/30' : 'bg-emerald-900/30 border-emerald-500/30 opacity-60');
            var btn = t.status == 'BARU' ? '<button onclick="updateStatusTugas(\'' + t.id + '\', \'PROSES\')" class="px-3 py-1 bg-amber-600 text-[10px] rounded text-white font-bold">' + tr('form.txt_kerjakan') + '</button>' : (t.status == 'PROSES' ? '<button onclick="updateStatusTugas(\'' + t.id + '\', \'SELESAI\')" class="px-3 py-1 bg-emerald-600 text-[10px] rounded text-white font-bold">' + tr('form.txt_selesai') + '</button>' : '<span class="text-[10px] font-bold text-emerald-400">' + tr('form.txt_done') + '</span>');
            // Tombol hapus tugas (baru ada — dulu papan tugas tidak punya aksi hapus).
            var delBtn = '<button onclick="hapusTugasAdmin(\'' + t.id + '\')" class="px-2.5 py-1.5 bg-slate-700 hover:bg-red-600 text-slate-400 hover:text-white rounded text-[10px] font-bold shadow transition" title="' + tr('table.delete') + '"><i class="fas fa-trash-alt"></i></button>';
            html += '<div class="flex justify-between items-center p-3 rounded-lg mb-2 border border-slate-700 ' + bg + '"><div><div class="text-xs font-bold text-white">' + t.task + '</div></div><div class="flex gap-1.5">' + btn + delBtn + '</div></div>';
        });
        if(ALL_TUGAS.length === 0) html = '<div class="text-center text-slate-500 py-6 text-xs font-bold border border-dashed border-slate-700 rounded-xl bg-black/20">Tidak ada tugas baru.</div>';
        list.innerHTML = html;
    }
    async function tambahTugasAdmin() {
        const input = document.getElementById('todo-input');
        if (!input || !input.value.trim()) return;
        // Optimistic UI: kosongkan input langsung, rollback hanya jika gagal.
        const text = input.value.trim();
        input.value = ''; input.disabled = true;
        try {
            const res = await callAPI('tambahTugasBaru', [text, currentAdminName]);
            if (!res.success) { input.value = text; showToast(res.error || tr('alert.failed'), 'error'); }
            else refreshDataDinamis();
        } catch (err) {
            input.value = text;
            showToast(tr('alert.network') + (err && err.message ? err.message : err), 'error');
        } finally { input.disabled = false; }
    }
    async function updateStatusTugas(id, st) {
        const loader = document.getElementById('global-loader');
        if (loader) loader.style.display = 'flex';
        try {
            const res = await callAPI('setTugasStatus', [id, st, currentAdminName]);
            if (res.success) refreshDataDinamis();
            else showToast(res.error || 'Gagal update status', 'error');
        } catch (err) {
            showToast(tr('alert.network') + (err && err.message ? err.message : err), 'error');
        } finally { if (loader) loader.style.display = 'none'; }
    }
    async function hapusTugasAdmin(id) {
        if (!confirm('Hapus tugas ini?')) return;
        const loader = document.getElementById('global-loader');
        if (loader) loader.style.display = 'flex';
        try {
            const res = await callAPI('hapusTugas', [id, currentAdminName]);
            if (res.success) refreshDataDinamis();
            else showToast(res.error || 'Gagal hapus tugas', 'error');
        } catch (err) {
            showToast(tr('alert.network') + (err && err.message ? err.message : err), 'error');
        } finally { if (loader) loader.style.display = 'none'; }
    }
    async function aksiAdmin(st, r) {
        if (!confirm('Ubah status Loker?')) return;
        const loader = document.getElementById('global-loader');
        if (loader) loader.style.display = 'flex';
        try {
            const res = await callAPI('ubahStatusJob', [r, st, currentAdminName]);
            if (res.success) refreshDataDinamis('kelola');
            else showToast(res.error || 'Gagal ubah status', 'error');
        } catch (err) {
            showToast(tr('alert.network') + (err && err.message ? err.message : err), 'error');
        } finally { if (loader) loader.style.display = 'none'; }
    }
    async function hapusLoker(r) {
        if (!confirm('Hapus Loker?')) return;
        const loader = document.getElementById('global-loader');
        if (loader) loader.style.display = 'flex';
        try {
            const res = await callAPI('hapusJobData', [r, currentAdminName]);
            if (res.success) refreshDataDinamis('kelola');
            else showToast(res.error || 'Gagal hapus loker. Mungkin masih ada kandidat terkait.', 'error');
        } catch (err) {
            showToast(tr('alert.network') + (err && err.message ? err.message : err), 'error');
        } finally { if (loader) loader.style.display = 'none'; }
    }
    async function prosesHapusJadwal(r) {
        if (!confirm('Hapus Jadwal?')) return;
        const loader = document.getElementById('global-loader');
        if (loader) loader.style.display = 'flex';
        try {
            const res = await callAPI('hapusJadwal', [r, currentAdminName]);
            if (res.success) refreshDataDinamis('jadwal');
            else showToast(res.error || 'Gagal hapus jadwal', 'error');
        } catch (err) {
            showToast(tr('alert.network') + (err && err.message ? err.message : err), 'error');
        } finally { if (loader) loader.style.display = 'none'; }
    }

    // Downscale gambar (pamflet/foto) saat upload via canvas — max 800px, jpeg
    // quality 0.8. Tujuan: byte di Storage kecil SELAMANYA tanpa fitur berbayar
    // Supabase Image Transformations (Free plan tidak menyediakan resize).
    // Non-gambar (pdf/docx template CV) & gambar gagal-decode (HEIC/korup)
    // dikembalikan apa adanya supaya alur upload tidak berubah/macet.
    async function downscaleImageFile(file, maxWidth, quality) {
        if (!file || !file.type || !file.type.startsWith('image/')) return file;
        if (file.type === 'image/svg+xml' || file.type === 'image/gif') return file;
        try {
            const dataUrl = await new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = () => reject(new Error('read fail')); r.readAsDataURL(file); });
            const img = await new Promise((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = () => reject(new Error('decode fail')); i.src = dataUrl; });
            let w = img.width, h = img.height;
            const MAX = maxWidth || 800;
            if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
            const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality || 0.8));
            if (!blob || blob.size >= file.size) return file; // hasil tak lebih kecil → kirim asli
            const base = String(file.name || 'image').replace(/\.[^/.]+$/, '') || 'image';
            return new File([blob], base + '.jpg', { type: 'image/jpeg' });
        } catch (e) { return file; }
    }

    async function uploadFilesDirectly(filesObj, folder) {
      // Downscale dulu (foto/pamflet → max 800px jpeg) supaya byte di Storage
      // kecil; non-gambar dibiarkan utuh oleh downscaleImageFile.
      const files = {};
      for (const k of Object.keys(filesObj)) files[k] = filesObj[k] ? await downscaleImageFile(filesObj[k], 800, 0.8) : null;
      const toUpload = Object.keys(files).filter(k => files[k]);
      if (toUpload.length === 0) return {};
      const payloadFiles = toUpload.map(k => {
        const file = files[k];
        return { key: k, prefix: k.toUpperCase(), ext: file.name.split('.').pop() || 'bin' };
      });
      const res = await callAPI('getUploadUrls', { files: payloadFiles, folder: folder });
      if (!res.success) throw new Error('Gagal mendapatkan link upload');
      const uploadedUrls = {};
      for (const key of toUpload) {
        const file = files[key];
        const { signedUrl, publicUrl } = res.urls[key];
        const uploadRes = await fetch(signedUrl, { method: 'PUT', headers: { 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'true' }, body: file });
        if (!uploadRes.ok) throw new Error('Gagal mengunggah ' + key);
        uploadedUrls[key] = publicUrl;
      }
      return uploadedUrls;
    }

    async function submitFormAdmin(e) {
        e.preventDefault(); var btn = document.getElementById('btn-submit-admin'); if(!btn) return;
        btn.innerHTML = tr('ui.uploading'); btn.disabled = true; document.getElementById('global-loader').style.display = 'flex';
        
        var cbl = document.querySelectorAll('input[name="lokasi_cb"]:checked'); var arrLok = []; for (var i = 0; i < cbl.length; i++) { arrLok.push(cbl[i].value); }
        var customLok = document.getElementById('custom-lokasi').value; if (customLok.trim()) arrLok.push(customLok.trim());
        
        var cbs = document.querySelectorAll('input[name="syarat_cb"]:checked'); var arrSyr = []; for (var j = 0; j < cbs.length; j++) { arrSyr.push(cbs[j].value); }
        var customSyr = document.getElementById('custom-syarat').value; if (customSyr.trim()) arrSyr.push(customSyr.trim());

        var cbr = document.querySelectorAll('input.cbx-req-file:checked'); var arrReq = []; for (var k = 0; k < cbr.length; k++) { arrReq.push(cbr[k].value); }
        var customReq = document.getElementById('custom-req-file').value; if (customReq.trim()) { customReq.split(',').forEach(function(val) { if(val.trim()) arrReq.push(val.trim()); }); }
        
        try {
            var filesToUpload = {};
            if(document.getElementById('input-template').files[0]) filesToUpload.formatCv = document.getElementById('input-template').files[0];
            if(document.getElementById('input-pamflet').files[0]) filesToUpload.pamflet = document.getElementById('input-pamflet').files[0];
            
            var jobName = document.getElementById('input-pekerjaan').value;
            var folderName = 'jobs/' + Date.now() + '_' + jobName.substring(0, 10).replace(/[^A-Z0-9_-]/ig, '_');
            var uploadedUrls = await uploadFilesDirectly(filesToUpload, folderName);

            var data = { 
                admin: currentAdminName, tsk: document.getElementById('input-tsk').value || '-', kategori: document.getElementById('input-kategori').value, 
                pekerjaan: jobName, lokasi: arrLok.length > 0 ? arrLok.join(', ') : '-', gender: document.getElementById('input-gender').value, 
                templateCv: uploadedUrls.formatCv || '-', status: '✅ OPEN', kuota: document.getElementById('input-kuota').value || '-', 
                jmlKandidat: '0', syarat: arrSyr.length > 0 ? arrSyr.join(', ') : '-', keterangan: document.getElementById('input-keterangan').value || '-',
                pamflet: uploadedUrls.pamflet || '-', 
                tahapanDB: document.getElementById('input-tahapan-db').value || '-',
                totalBiaya: document.getElementById('input-total-biaya').value || '',
                rincianBiaya: document.getElementById('input-rincian-biaya').value || '',
                dokumenShare: arrReq.join(',')
            };
            const res = await callAPI('simpanJobBaru', [data]);
            if (res.success) { document.getElementById('form-tambah-job').reset(); refreshDataDinamis('kelola'); }
            else showToast(tr('alert.failed') + ' ' + (res.error || ''), 'error');
        } catch (err) {
            showToast(tr('ui.toast_upload_failed') + err.message, 'error');
        } finally {
            btn.innerHTML = tr('button.upload_job'); btn.disabled = false;
            document.getElementById('global-loader').style.display = 'none';
        }
    }
    
    async function submitJadwal(e) {
        e.preventDefault(); const btn = document.getElementById('btn-submit-jadwal'); if (!btn) return;
        btn.innerHTML = tr('ui.saving'); btn.disabled = true; document.getElementById('global-loader').style.display = 'flex';
        const data = { admin: currentAdminName, nama: document.getElementById('j-nama').value, loker: document.getElementById('j-loker').value || '-', waktu: document.getElementById('j-waktu').value.replace('T', ' '), lokasi: document.getElementById('j-lokasi').value || '-', link: document.getElementById('j-link').value || '-', tsk: document.getElementById('j-tsk').value, kandidat: '-' };
        try {
            const res = await callAPI('simpanJadwalBaru', [data]);
            if (res.success) {
                document.getElementById('form-tambah-jadwal').reset();
                document.getElementById('form-jadwal-container').classList.add('hidden');
                refreshDataDinamis('jadwal');
            } else showToast(tr('alert.failed') + ' ' + (res.error || ''), 'error');
        } catch (err) {
            showToast(tr('alert.network') + (err && err.message ? err.message : err), 'error');
        } finally {
            btn.innerHTML = tr('button.save_schedule'); btn.disabled = false;
            document.getElementById('global-loader').style.display = 'none';
        }
    }
    
    function bukaEditFullLoker(c) {
        try {
            var jp = ALL_JOBS.find(j => j.code === c); var jd = ALL_DB_JOBS.find(j => j.code === c); if (!jp) return;
            document.getElementById('ef-code').value = c; 
            document.getElementById('ef-pekerjaan').value = jp.pekerjaan || ""; 
            document.getElementById('ef-kategori').value = jp.kategori || ""; 
            document.getElementById('ef-lokasi').value = jp.lokasi || ""; 
            document.getElementById('ef-gender').value = jp.gender || ""; 
            document.getElementById('ef-syarat').value = jp.syarat || ""; 
            document.getElementById('ef-keterangan').value = jp.keterangan || "";
            document.getElementById('ef-total-biaya').value = jp.totalBiaya || ""; 
            document.getElementById('ef-rincian-biaya').value = jp.rincianBiaya || "";
            var sumEdit = document.getElementById('rincian-summary-edit');
            if (sumEdit && typeof window.rbSummaryFromData === 'function') {
                sumEdit.innerHTML = window.rbSummaryFromData(jp.totalBiaya || '', jp.rincianBiaya || '') || 'Klik untuk isi rincian biaya';
            }
            if (jd) { 
                document.getElementById('ef-tsk').value = jd.tsk || ""; 
                document.getElementById('ef-kuota').value = jd.kuota || ""; 
                // document.getElementById('ef-template').value = jd.templateCv || ""; 
                // document.getElementById('ef-pamflet').value = jd.pamflet || ""; 
            }
            
            // Set Checkboxes untuk Dokumen Share
            var dokArr = (jd && jd.dokumen_share) ? jd.dokumen_share.split(',') : (jp.dokumen_share ? jp.dokumen_share.split(',') : ['CV','JFT','SSW']);
            var cbsEdit = document.querySelectorAll('.cbx-req-file-edit');
            cbsEdit.forEach(cb => cb.checked = false);
            var customReqsEdit = [];
            var standardVals = Array.from(cbsEdit).map(cb => cb.value);
            dokArr.forEach(d => {
                var dt = d.trim();
                if(standardVals.includes(dt)) {
                    var cbMatch = Array.from(cbsEdit).find(cb => cb.value === dt);
                    if(cbMatch) cbMatch.checked = true;
                } else if(dt) {
                    customReqsEdit.push(dt);
                }
            });
            if(document.getElementById('custom-req-file-edit')) {
                document.getElementById('custom-req-file-edit').value = customReqsEdit.join(', ');
            }
            document.getElementById('modal-edit-full-loker').classList.remove('hidden');
        } catch (e) { showToast(tr('ui.toast_modal_error'), 'error'); }
    }
    
    async function submitEditFullLoker(e) {
        e.preventDefault(); var btn = document.getElementById('btn-submit-ef'); if(!btn) return;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> ' + tr('ui.saving') + ''; btn.disabled = true; document.getElementById('global-loader').style.display = 'flex';
        
        var cbr = document.querySelectorAll('input.cbx-req-file-edit:checked'); var arrReq = []; for (var k = 0; k < cbr.length; k++) { arrReq.push(cbr[k].value); }
        var customReq = document.getElementById('custom-req-file-edit') ? document.getElementById('custom-req-file-edit').value : ''; if (customReq.trim()) { customReq.split(',').forEach(function(val) { if(val.trim()) arrReq.push(val.trim()); }); }

        try {
            var filesToUpload = {};
            if(document.getElementById('ef-template').files[0]) filesToUpload.formatCv = document.getElementById('ef-template').files[0];
            if(document.getElementById('ef-pamflet').files[0]) filesToUpload.pamflet = document.getElementById('ef-pamflet').files[0];
            
            var jobCode = document.getElementById('ef-code').value;
            var uploadedUrls = {};
            if(Object.keys(filesToUpload).length > 0) {
                var folderName = 'jobs/' + jobCode;
                uploadedUrls = await uploadFilesDirectly(filesToUpload, folderName);
            }

            var jd = ALL_DB_JOBS.find(j => j.code === jobCode);
            var finalTemplate = uploadedUrls.formatCv || (jd ? jd.templateCv : '-');
            var finalPamflet = uploadedUrls.pamflet || (jd ? jd.pamflet : '-');

            var data = { 
                admin: currentAdminName, code: jobCode, pekerjaan: document.getElementById('ef-pekerjaan').value, 
                kategori: document.getElementById('ef-kategori').value, lokasi: document.getElementById('ef-lokasi').value, gender: document.getElementById('ef-gender').value, 
                syarat: document.getElementById('ef-syarat').value, keterangan: document.getElementById('ef-keterangan').value, tsk: document.getElementById('ef-tsk').value, 
                kuota: document.getElementById('ef-kuota').value, 
                templateCv: finalTemplate,
                pamflet: finalPamflet,
                totalBiaya: document.getElementById('ef-total-biaya').value || '',
                rincianBiaya: document.getElementById('ef-rincian-biaya').value || '',
                // Kirim nilai mentah (bisa kosong) — backend editLokerFull yang
                // memutuskan: kosong = pertahankan nilai lama, isi = timpa.
                dokumenShare: arrReq.join(',')
            };
            const res = await callAPI('editLokerFull', [data]);
            if (res.success) { document.getElementById('modal-edit-full-loker').classList.add('hidden'); refreshDataDinamis('kelola'); }
            else showToast(tr('alert.failed') + ' ' + (res.error || ''), 'error');
        } catch (err) {
            showToast(tr('ui.toast_upload_failed') + err.message, 'error');
        } finally {
            btn.innerText = tr('button.save_changes'); btn.disabled = false;
            document.getElementById('global-loader').style.display = 'none';
        }
    }
    
    function bukaModalTambahKandidat() {
        document.getElementById('modal-tambah-kandidat').classList.remove('hidden');
        var searchEl = document.getElementById('search-kandidat-manual');
        var ddEl = document.getElementById('dropdown-kandidat-manual');
        if (searchEl) searchEl.value = '';
        if (ddEl) { ddEl.classList.add('hidden'); ddEl.innerHTML = ''; }
        // Reset state auto-gelap JFT/SSW (form baru, kandidat belum dipilih).
        if (typeof cekDokumenSebelumnya === 'function') cekDokumenSebelumnya('');
        // Baris dokumen lain mulai dari 1 baris kosong.
        initLainRows('k');
    }

    // FIX: field pencarian "CARI KANDIDAT TERDAFTAR" di modal Input Kandidat Manual
    // memanggil cariKandidatManual() lewat onkeyup, tapi fungsi ini belum pernah
    // dibuat - jadi setiap ketik langsung error di console dan dropdown tidak
    // pernah muncul. Pola di bawah ini mengikuti auto-fill kandidat lama yang
    // sudah ada, tapi sebagai dropdown live-search (bukan <datalist>).
    function cariKandidatManual(query) {
        var ddEl = document.getElementById('dropdown-kandidat-manual');
        if (!ddEl) return;
        query = (query || '').trim().toLowerCase();
        if (query.length < 2) { ddEl.classList.add('hidden'); ddEl.innerHTML = ''; return; }

        var seenWa = {};
        var hasil = (ALL_CANDIDATES || []).filter(function(c) {
            if (!c.wa || seenWa[c.wa]) return false;
            var match = (c.nama || '').toLowerCase().indexOf(query) >= 0 || (c.wa || '').indexOf(query) >= 0;
            if (match) { seenWa[c.wa] = true; return true; }
            return false;
        }).slice(0, 8);

        if (hasil.length === 0) {
            ddEl.innerHTML = '<div class="p-2.5 text-sm text-slate-400">' + tr('ui.not_found') + '</div>';
        } else {
            ddEl.innerHTML = hasil.map(function(c) {
                return '<div class="p-2.5 text-sm text-white hover:bg-sky-600/30 cursor-pointer border-b border-slate-700 last:border-0" onclick="pilihKandidatManual(\'' + c.wa + '\')">'
                    + '<div class="font-semibold">' + (c.nama || '-') + '</div>'
                    + '<div class="text-xs text-slate-400">' + (c.wa || '-') + '</div>'
                    + '</div>';
            }).join('');
        }
        ddEl.classList.remove('hidden');
    }

    function pilihKandidatManual(wa) {
        var found = (ALL_CANDIDATES || []).find(function(c) { return c.wa === wa; });
        if (!found) return;
        var namaEl = document.getElementById('k-nama');
        var waEl = document.getElementById('k-wa');
        if (namaEl) namaEl.value = found.nama || '';
        if (waEl) waEl.value = found.wa || '';
        // Auto-fill data fisik kalau kandidat sudah punya profil (mapCandidate
        // sekarang mengisi dari master) - admin tidak perlu mengetik ulang.
        var g = found.gender;
        if (g === 'L') g = 'LAKI-LAKI'; else if (g === 'P') g = 'PEREMPUAN';
        var map = { 'k-gender': g, 'k-usia': found.usia, 'k-tb': found.tb, 'k-bb': found.bb, 'k-pendidikan': found.pendidikan };
        Object.keys(map).forEach(function (id) {
            var el = document.getElementById(id);
            if (!el) return;
            var v = map[id];
            el.value = (v && v !== '-') ? v : '';
        });
        var searchEl = document.getElementById('search-kandidat-manual');
        var ddEl = document.getElementById('dropdown-kandidat-manual');
        if (searchEl) searchEl.value = (found.nama || '') + ' - ' + (found.wa || '');
        if (ddEl) { ddEl.classList.add('hidden'); ddEl.innerHTML = ''; }
        // Auto-gelapkan JFT/SSW kalau kandidat sudah pernah upload (cukup CV).
        cekDokumenSebelumnya(wa);
    }

    // ===== AUTO-DETECT DOKUMEN SEBELUMNYA (modal Input Kandidat) =====
    // Kalau kandidat sudah pernah upload JFT/SSW, field upload-nya di-gelapkan
    // (disabled) — cukup CV yang perlu diupload untuk lamaran baru.
    function cekDokumenSebelumnya(wa) {
        var c = (ALL_CANDIDATES || []).find(function (x) { return normalizePhone(String(x.wa || '')) === normalizePhone(String(wa || '')); });
        var setDok = function (inputId, statusId, label, punya) {
            var input = document.getElementById(inputId);
            var st = document.getElementById(statusId);
            if (punya && input) {
                input.disabled = true;
                input.classList.add('opacity-40', 'cursor-not-allowed');
                if (st) st.innerHTML = '<span class="text-emerald-400"><i class="fas fa-check-circle mr-0.5"></i>' + label + ' ' + tr('ui.doc_already_uploaded') + '</span>';
            } else {
                if (input) { input.disabled = false; input.classList.remove('opacity-40', 'cursor-not-allowed'); }
                if (st) st.innerHTML = '';
            }
        };
        setDok('k-jft', 'st-jft', 'JFT', !!(c && (c.jftUrl || c.jft)));
        setDok('k-ssw', 'st-ssw', 'SSW', !!(c && (c.sswUrl || c.ssw)));
    }

    // Dipanggil saat WA di-blur di modal Input Kandidat: kalau nama/WA cocok
    // dengan kandidat terdaftar, auto-fill data + auto-gelapkan JFT/SSW.
    function cekKandidatOtomatis() {
        var waEl = document.getElementById('k-wa');
        var wa = waEl ? String(waEl.value || '').replace(/\D/g, '') : '';
        if (!wa) return;
        var c = (ALL_CANDIDATES || []).find(function (x) { return normalizePhone(String(x.wa || '')) === normalizePhone(wa); });
        if (!c) { cekDokumenSebelumnya(''); return; }
        var namaEl = document.getElementById('k-nama');
        if (namaEl && !namaEl.value) {
            namaEl.value = c.nama || '';
            var g = c.gender; if (g === 'L') g = 'LAKI-LAKI'; else if (g === 'P') g = 'PEREMPUAN';
            var map = { 'k-gender': g, 'k-usia': c.usia, 'k-tb': c.tb, 'k-bb': c.bb, 'k-pendidikan': c.pendidikan };
            Object.keys(map).forEach(function (id) {
                var el = document.getElementById(id);
                if (!el) return;
                var v = map[id];
                el.value = (v && v !== '-') ? v : '';
            });
            var searchEl = document.getElementById('search-kandidat-manual');
            if (searchEl && !searchEl.value) searchEl.value = (c.nama || '') + ' - ' + (c.wa || '');
        }
        cekDokumenSebelumnya(wa);
    }

    // ===== INDIKATOR STATUS UPLOAD (modal Input Manual) =====
    // Saat file dipilih di <input type=file> -> tampilkan "terpilih"
    function tandaiFileDipilih(inputId, statusId, label) {
        var el = document.getElementById(statusId);
        var input = document.getElementById(inputId);
        if (!el) return;
        if (input && input.files && input.files.length > 0) {
            el.innerHTML = '<span class="text-amber-300"><i class="fas fa-paperclip mr-0.5"></i>' + label + ' ' + tr('ui.file_selected') + '</span>';
        } else {
            el.innerHTML = '';
        }
    }

    // Status per file: uploading / ok / fail / none
    function setUploadStatus(statusId, label, state) {
        var el = document.getElementById(statusId);
        if (!el) return;
        if (state === 'uploading') el.innerHTML = '<span class="text-sky-300"><i class="fas fa-spinner fa-spin mr-0.5"></i>' + label + ' ' + tr('ui.file_uploading') + '</span>';
        else if (state === 'ok') el.innerHTML = '<span class="text-emerald-400"><i class="fas fa-check-circle mr-0.5"></i>' + label + ' ' + tr('ui.file_uploaded') + '</span>';
        else if (state === 'fail') el.innerHTML = '<span class="text-rose-400"><i class="fas fa-times-circle mr-0.5"></i>' + label + ' ' + tr('ui.file_failed') + '</span>';
        else if (state === 'none') el.innerHTML = '<span class="text-slate-500"><i class="fas fa-minus-circle mr-0.5"></i>' + label + ' ' + tr('ui.file_none') + '</span>';
    }

    function markUploadResults(labels, okList) {
        var all = [['st-photo', 'PAS_PHOTO', 'PAS PHOTO'], ['st-cv', 'CV', 'CV'], ['st-jft', 'JFT', 'JFT'], ['st-ssw', 'SSW', 'SSW']];
        all.forEach(function (x) {
            var sel = labels.indexOf(x[1]) >= 0;
            var ok = (okList || []).indexOf(x[1]) >= 0;
            setUploadStatus(x[0], x[2], ok ? 'ok' : (sel ? 'fail' : 'none'));
        });
    }

    function resetUploadStatus() {
        ['st-photo', 'st-cv', 'st-jft', 'st-ssw', 'edit-k-st-photo', 'edit-k-st-cv', 'edit-k-st-jft', 'edit-k-st-ssw'].forEach(function (id) {
            var el = document.getElementById(id);
            if (el) el.innerHTML = '';
        });
        // Status baris dokumen lain (dinamis, per baris: k-st-lain-N / edit-k-st-lain-N).
        document.querySelectorAll('[id^="k-st-lain-"], [id^="edit-k-st-lain-"]').forEach(function (el) {
            if (el) el.innerHTML = '';
        });
    }

    // ===== BARIS DOKUMEN LAIN DINAMIS (modal Input Kandidat & Super Edit) =====
    // Admin bisa upload >1 dokumen lain sekaligus: tombol + menambah baris,
    // tombol − menghapus (minimal 1 baris tersisa). Prefix: 'k' (Input Manual)
    // atau 'edit-k' (Super Edit Kandidat).
    var LAIN_JENIS_OPTIONS = '<option value="KTP">KTP</option><option value="KK">KK</option><option value="IJAZAH SD">IJAZAH SD</option><option value="IJAZAH SMP">IJAZAH SMP</option><option value="IJAZAH SMA">IJAZAH SMA</option><option value="UNIVERSITAS">UNIVERSITAS</option><option value="PASPORT">PASPORT</option><option value="MCU">MCU</option><option value="KONTRAK KERJA">KONTRAK KERJA</option><option value="CERTIFICATE JAPAN">CERTIFICATE JAPAN</option><option value="LAINNYA">LAINNYA</option>';

    function renderLainRow(prefix, idx) {
        return '<div class="grid grid-cols-2 gap-2" data-lain-row>' +
            '<div><label class="block text-[10px] font-bold text-slate-400 mb-1" data-lang="admin.form_other_docs_type">JENIS DOKUMEN</label>' +
            '<select id="' + prefix + '-lain-jenis-' + idx + '" class="w-full p-2.5 rounded-lg bg-black/60 border border-slate-700 text-white text-sm outline-none focus:border-emerald-500 transition">' + LAIN_JENIS_OPTIONS + '</select></div>' +
            '<div><label class="block text-[10px] font-bold text-slate-400 mb-1" data-lang="admin.form_other_docs_file">FILE (PDF/Gambar)</label>' +
            '<input type="file" id="' + prefix + '-lain-' + idx + '" accept=".pdf,.jpg,.jpeg,.png" onchange="tandaiFileDipilih(\'' + prefix + '-lain-' + idx + '\',\'' + prefix + '-st-lain-' + idx + '\',\'DOKUMEN\')" class="w-full text-sm text-slate-400 file:mr-2 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-slate-700 file:text-white">' +
            '</div>' +
            '<div class="col-span-2 flex items-center justify-between gap-2">' +
            '<span id="' + prefix + '-st-lain-' + idx + '" class="block text-xs font-bold h-4"></span>' +
            '<div class="flex gap-1.5">' +
            '<button type="button" onclick="tambahBarisLain(\'' + prefix + '\')" class="w-8 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-lg leading-none transition" aria-label="' + tr('admin.add_doc') + '" title="' + tr('admin.add_doc') + '"><i class="fas fa-plus"></i></button>' +
            '<button type="button" onclick="hapusBarisLain(this,\'' + prefix + '\')" class="w-8 h-8 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-lg leading-none transition" aria-label="' + tr('admin.remove_doc') + '" title="' + tr('admin.remove_doc') + '"><i class="fas fa-minus"></i></button>' +
            '</div></div></div>';
    }

    function initLainRows(prefix) {
        var container = document.getElementById(prefix + '-lain-rows');
        if (!container) return;
        container.innerHTML = renderLainRow(prefix, 0);
        if (typeof renderLanguage === 'function') renderLanguage();
    }

    // ===== BERKAS TERSIMPAN (Super Edit Kandidat) =====
    // Tampilkan daftar berkas pemberkasan yang SUDAH ada (c.berkas dari
    // pemberkasan_checklist) sebagai chip read-only dengan link buka, supaya
    // admin langsung lihat "dokumen lengkap" kandidat sebelum menambah.
    var BERKAS_TAMPIL_LABEL = {
        kk: 'KK', akte: 'AKTE', sd: 'IJAZAH SD', smp: 'IJAZAH SMP', sma: 'IJAZAH SMA', univ: 'UNIVERSITAS',
        pasport: 'PASPORT', mcu: 'MCU', kontrak: 'KONTRAK KERJA', cert: 'CERTIFICATE JAPAN',
        ktp: 'KTP', foto2: 'PAS FOTO STUDIO', ijinortu: 'SURAT IJIN ORTU', cpmi: 'PERNYATAAN CPMI',
        kawin: 'STATUS PERKAWINAN', sehat: 'SURAT SEHAT PUSKESMAS', bpjs: 'BPJS KETENAGAKERJAAN',
        psikotes: 'HASIL PSIKOTES'
    };
    function renderBerkasTersimpan(berkas) {
        var box = document.getElementById('edit-k-berkas-ada');
        if (!box) return;
        if (!berkas || Object.keys(berkas).length === 0) { box.classList.add('hidden'); box.innerHTML = ''; return; }
        var chips = '';
        Object.keys(berkas).forEach(function (k) {
            var url = String(berkas[k] || '');
            if (!url || url === '-') return;
            var label = BERKAS_TAMPIL_LABEL[k] || k.toUpperCase();
            var safe = url.replace(/'/g, "\\'");
            // Label adalah teks tampil chip (sudah terlihat), jadi tanpa title=
            // — audit i18n menolak title dinamis yang bukan tr().
            chips += '<a href="' + url + '" target="_blank" rel="noopener" class="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-900/40 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold hover:bg-emerald-800/60 transition"><i class="fas fa-file-alt"></i> ' + label + '</a>';
        });
        if (!chips) { box.classList.add('hidden'); box.innerHTML = ''; return; }
        box.classList.remove('hidden');
        box.innerHTML = '<p class="text-[10px] font-bold text-emerald-400 mb-1.5"><i class="fas fa-check-circle mr-1"></i><span data-lang="ui.berkas_tersimpan">Berkas Sudah Tersimpan</span>:</p><div class="flex flex-wrap gap-1.5">' + chips + '</div>';
        if (typeof renderLanguage === 'function') renderLanguage();
    }

    function tambahBarisLain(prefix) {
        var container = document.getElementById(prefix + '-lain-rows');
        if (!container) return;
        var idx = container.children.length;
        container.insertAdjacentHTML('beforeend', renderLainRow(prefix, idx));
        if (typeof renderLanguage === 'function') renderLanguage();
    }

    function hapusBarisLain(btn, prefix) {
        var container = document.getElementById(prefix + '-lain-rows');
        if (!container || container.children.length <= 1) return;
        var row = btn.closest('[data-lain-row]');
        if (row) row.remove();
    }

    // Kumpulkan semua baris dokumen lain yang punya file terpilih.
    function collectLainRows(prefix) {
        var out = [];
        var container = document.getElementById(prefix + '-lain-rows');
        if (!container) return out;
        Array.prototype.forEach.call(container.children, function (row) {
            var input = row.querySelector('input[type=file]');
            if (!input || !input.files || input.files.length === 0) return;
            var sel = row.querySelector('select');
            var st = row.querySelector('span');
            out.push({ jenis: sel ? sel.value : 'LAINNYA', input: input, stId: st ? st.id : '' });
        });
        return out;
    }

    // ===== GUARD FILE UPLOAD (UKURAN + EKSTENSI) =====
    // cekUkuranFile/cekEkstensiFile/MAX_FILE_MB didefinisikan di 03_candidate.js
    // (file yang dimuat PALING AWAL di semua halaman) — satu sumber kebenaran
    // untuk semua jalur upload. Di sini wrapper untuk cek semua input modal admin.
    // Periksa SEMUA file (foto/CV/JFT/SSW + semua baris dokumen lain): ukuran
    // dulu, lalu ekstensi — user langsung dapat toast tanpa nunggu server.
    function cekSemuaUkuranFile(lainPrefix) {
        var errs = [
            cekUkuranFile(document.getElementById(lainPrefix + '-photo')),
            cekUkuranFile(document.getElementById(lainPrefix + '-cv')),
            cekUkuranFile(document.getElementById((lainPrefix === 'edit-k' ? 'edit-k-file-jft' : lainPrefix + '-jft'))),
            cekUkuranFile(document.getElementById((lainPrefix === 'edit-k' ? 'edit-k-file-ssw' : lainPrefix + '-ssw')))
        ];
        collectLainRows(lainPrefix).forEach(function (r) { errs.push(cekUkuranFile(r.input)); });
        for (var i = 0; i < errs.length; i++) { if (errs[i]) return errs[i]; }
        return '';
    }

    // Sama seperti cekSemuaUkuranFile tapi untuk EKSTENSI: return pesan error
    // pertama (urutan: foto, CV, JFT, SSW, lalu baris dokumen lain).
    function cekSemuaEkstensiFile(lainPrefix) {
        var errs = [
            cekEkstensiFile(document.getElementById(lainPrefix + '-photo')),
            cekEkstensiFile(document.getElementById(lainPrefix + '-cv')),
            cekEkstensiFile(document.getElementById((lainPrefix === 'edit-k' ? 'edit-k-file-jft' : lainPrefix + '-jft'))),
            cekEkstensiFile(document.getElementById((lainPrefix === 'edit-k' ? 'edit-k-file-ssw' : lainPrefix + '-ssw')))
        ];
        collectLainRows(lainPrefix).forEach(function (r) { errs.push(cekEkstensiFile(r.input)); });
        for (var i = 0; i < errs.length; i++) { if (errs[i]) return errs[i]; }
        return '';
    }

    // Guard gabungan (ukuran dulu, lalu ekstensi) untuk dipanggil di awal
    // submit — satu titik yang menjamin SEMUA jalur modal admin lolos dua-duanya.
    function cekSemuaFileModal(lainPrefix) {
        var u = cekSemuaUkuranFile(lainPrefix);
        if (u) return u;
        return cekSemuaEkstensiFile(lainPrefix);
    }

    async function prosesUploadKandidat() {
        var btn = document.getElementById('btn-submit-kandidat'); var nama = document.getElementById('k-nama').value; var wa = document.getElementById('k-wa').value; var loker = document.getElementById('k-loker').value || 'UMUM';
        if (!nama || !wa) return;
        // Guard ukuran: tolak SEBELUM baca base64 supaya tidak buang waktu & tidak
        // kena 413/limit server untuk file yang pasti gagal.
        // Guard ukuran + ekstensi: tolak SEBELUM baca base64 supaya tidak buang
        // waktu & tidak kena 413/limit server untuk file yang pasti gagal.
        var ukuranErr = cekSemuaFileModal('k');
        if (ukuranErr) { showToast(ukuranErr, 'error'); return; }
        btn.innerHTML = tr('ui.processing'); btn.disabled = true;
        let fd = [];
        let ph = await bacaFileBase64(document.getElementById('k-photo'), 'PAS_PHOTO'); if (ph) fd.push(ph);
        let pc = await bacaFileBase64(document.getElementById('k-cv'), 'CV'); if (pc) fd.push(pc);
        let pj = await bacaFileBase64(document.getElementById('k-jft'), 'JFT'); if (pj) fd.push(pj);
        let ps = await bacaFileBase64(document.getElementById('k-ssw'), 'SSW'); if (ps) fd.push(ps);

        // Indikator: semua file yang dipilih -> mengupload (yang kosong -> tidak dipilih)
        var labels = fd.map(function (f) { return f.label; });
        markUploadResults(labels, []);
        labels.forEach(function (l) {
            var map = { PAS_PHOTO: ['st-photo', 'PAS PHOTO'], CV: ['st-cv', 'CV'], JFT: ['st-jft', 'JFT'], SSW: ['st-ssw', 'SSW'] };
            if (map[l]) setUploadStatus(map[l][0], map[l][1], 'uploading');
        });
        
        document.getElementById('global-loader').style.display = 'flex';
        // Kirim key 'loker' (bukan 'idLoker') + array files[] berlabel supaya
        // backend simpanKandidatDanUpload menerima kode job & file upload dengan benar.
        // Field fisik (gender/usia/TB/BB/pendidikan) ikut dikirim supaya kandidat
        // tidak lahir "kosong" - disimpan ke master + baris lamaran di backend.
        var data = {
            nama: nama, wa: wa, loker: loker,
            gender: document.getElementById('k-gender').value,
            usia: document.getElementById('k-usia').value,
            tb: document.getElementById('k-tb').value,
            bb: document.getElementById('k-bb').value,
            pendidikan: document.getElementById('k-pendidikan').value,
            files: fd
        };
        try {
        const res = await callAPI('simpanKandidatDanUpload', [data]);
        if (res.success) {
            const okList = res.uploaded || [];
            markUploadResults(labels, okList);
            const ringkas = fd.length === 0 ? 'tanpa berkas' : okList.length + '/' + fd.length + ' berkas terupload';
            // Password kandidat selalu 4 digit terakhir WA (kebijakan seragam)
            // - ditampilkan supaya admin langsung tahu, tidak ada yang tertutup.
            const passInfo = ' · ' + tr('ui.cand_pass_label') + ': ' + String(wa).replace(/\D/g, '').slice(-4) + ' (' + tr('ui.cand_pass_hint') + ')';

            // Upload dokumen lain (opsional, seperti form + Job) lewat jalur
            // pemberkasan — admin boleh upload langsung (bypass approval).
            // Bisa >1 dokumen sekaligus: tiap baris yang punya file di-upload.
            const lainRows = collectLainRows('k');
            for (const r of lainRows) {
                const jenisLabel = String(r.jenis || 'DOKUMEN');
                setUploadStatus(r.stId, jenisLabel, 'uploading');
                const lainFile = await bacaFileBase64(r.input, 'DOKUMEN');
                if (lainFile) {
                    try {
                        const lr = await callAPI('simpanBerkasTahapan', [{ wa: wa, nama: nama, jenisBerkas: r.jenis, file: lainFile }]);
                        setUploadStatus(r.stId, jenisLabel, (lr && lr.success) ? 'ok' : 'fail');
                    } catch (e) { setUploadStatus(r.stId, jenisLabel, 'fail'); }
                }
            }
            showToast(tr('ui.toast_cand_saved') + ringkas + '.' + passInfo, 'success');
            // Tampilkan centang beberapa saat supaya admin langsung melihat hasil, lalu tutup
            setTimeout(function () {
                document.getElementById('form-tambah-kandidat').reset();
                document.getElementById('modal-tambah-kandidat').classList.add('hidden');
                resetUploadStatus();
                refreshDataDinamis('pelamar');
            }, 1400);
        } else {
            markUploadResults(labels, []); // semua yang dipilih -> gagal
            showToast(res.error, 'error');
        }
        } catch (err) {
            markUploadResults(labels, []);
            showToast(tr('alert.network') + (err && err.message ? err.message : err), 'error');
        } finally {
            btn.innerHTML = tr('button.save_upload'); btn.disabled = false;
            document.getElementById('global-loader').style.display = 'none';
        }
    }
    
    function bukaSuperEditKandidat(idKan) {
        var c = ALL_CANDIDATES.find(x => x.idKandidat === idKan);
        if(!c) return showToast(tr('ui.toast_data_not_found'), "error");
        
        safeSet('super-nama-kandidat', c.nama);
        document.getElementById('edit-k-row').value = c.rowIndex;
        document.getElementById('edit-k-wa').value = normalizePhone(c.wa);
        
        document.getElementById('edit-k-tahapan').value = c.tahapan || '';
        document.getElementById('edit-k-status').value = c.status || 'Aktif';
        
        let rawInt = c.catatanInt || '';
        let isVip = rawInt.includes('[VIP]');
        document.getElementById('edit-k-privilege').checked = isVip;
        
        document.getElementById('edit-k-catatan').value = c.catatanExt || c.catatan || '';
        
        // Normalisasi gender (DB campur kapital: perempuan/PEREMPUAN/Perempuan/Laki-laki)
        // supaya select yang opsi-nya hanya LAKI-LAKI/PEREMPUAN selalu terisi benar.
        document.getElementById('edit-k-gender').value = normalizeGenderValue(c.gender);
        document.getElementById('edit-k-tempat-lahir').value = (c.tempatLahir && c.tempatLahir !== '-') ? c.tempatLahir : '';
        var editTgl = document.getElementById('edit-k-tgl-lahir');
        if (editTgl) editTgl.value = toDateInputValue(c.tglLahir);
        document.getElementById('edit-k-tb').value = (c.tb && c.tb !== '-') ? String(c.tb).replace(/\D/g,'') : '';
        document.getElementById('edit-k-bb').value = (c.bb && c.bb !== '-') ? String(c.bb).replace(/\D/g,'') : '';
        document.getElementById('edit-k-pendidikan').value = c.pendidikan || '-';
        
        let umur = "";
        if (c.tglLahir && c.tglLahir !== '-' && c.tglLahir.trim() !== '') {
            let dob = new Date(c.tglLahir);
            if (!isNaN(dob)) {
                let today = new Date();
                let age = today.getFullYear() - dob.getFullYear();
                let m = today.getMonth() - dob.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) { age--; }
                umur = age > 0 ? age : "";
            }
        }
        if(umur === "" && c.usia && c.usia !== "-") { umur = c.usia; }
        
        document.getElementById('edit-k-usia').value = umur;
        
        document.getElementById('edit-k-jft').value = c.jftText !== '-' ? (c.jftText || '') : '';
        document.getElementById('edit-k-ssw').value = c.sswText !== '-' ? (c.sswText || '') : '';
        
        ['edit-k-photo', 'edit-k-cv', 'edit-k-file-jft', 'edit-k-file-ssw'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        
        // Baris dokumen lain mulai dari 1 baris kosong (kandidat baru dipilih).
        initLainRows('edit-k');
        // Daftar berkas yang SUDAH tersimpan (pemberkasan_checklist) — read-only.
        renderBerkasTersimpan(c.berkas);
        
        document.getElementById('modal-edit-kandidat').classList.remove('hidden');
    }
    
    async function simpanSuperEditKandidat() {
        const btn = document.getElementById('btn-save-super');
        // Guard ukuran: cek dokumen lain di modal edit sebelum baca base64.
        const ukuranErr = cekSemuaFileModal('edit-k');
        if (ukuranErr) { showToast(ukuranErr, 'error'); return; }
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> ' + tr('ui.saving_upper') + '';
        btn.disabled = true; document.getElementById('global-loader').style.display = 'flex';
        
        const payload = {
            rowIndex: document.getElementById('edit-k-row').value,
            wa: normalizePhone(document.getElementById('edit-k-wa').value),
            admin: currentAdminName,
            tahapan: document.getElementById('edit-k-tahapan').value,
            status: document.getElementById('edit-k-status').value,
            catatanExt: document.getElementById('edit-k-catatan').value,
            // Normalisasi ke format kanonikal supaya DB konvergen (dan CV AI
            // yang mengecek includes('PEREMPUAN') tidak salah render Laki-laki).
            gender: normalizeGenderValue(document.getElementById('edit-k-gender').value),
            tempatLahir: document.getElementById('edit-k-tempat-lahir').value.trim(),
            tglLahir: document.getElementById('edit-k-tgl-lahir').value,
            tb: document.getElementById('edit-k-tb').value,
            bb: document.getElementById('edit-k-bb').value,
            pendidikan: document.getElementById('edit-k-pendidikan').value,
            usia: document.getElementById('edit-k-usia').value,
            jftText: document.getElementById('edit-k-jft').value,
            sswText: document.getElementById('edit-k-ssw').value,
            isVip: document.getElementById('edit-k-privilege').checked
        };
        
        try {
        const res = await callAPI('updateKandidatSuper', [payload]);
        if (res.success) {
            // Upload dokumen lain (opsional, seperti modal Input Kandidat):
            // admin boleh lampirkan berkas pemberkasan tambahan saat edit.
            // Bisa >1 dokumen sekaligus: tiap baris yang punya file di-upload.
            const eLainRows = collectLainRows('edit-k');

            // Tambahkan file utama (photo, cv, jft, ssw) ke daftar upload jika dipilih
            const mPhoto = document.getElementById('edit-k-photo');
            if (mPhoto && mPhoto.files && mPhoto.files.length > 0) eLainRows.unshift({ jenis: 'PAS_PHOTO', stId: 'edit-k-st-photo', input: mPhoto });
            const mCv = document.getElementById('edit-k-cv');
            if (mCv && mCv.files && mCv.files.length > 0) eLainRows.unshift({ jenis: 'CV', stId: 'edit-k-st-cv', input: mCv });
            const mJft = document.getElementById('edit-k-file-jft');
            if (mJft && mJft.files && mJft.files.length > 0) eLainRows.unshift({ jenis: 'JFT', stId: 'edit-k-st-jft', input: mJft });
            const mSsw = document.getElementById('edit-k-file-ssw');
            if (mSsw && mSsw.files && mSsw.files.length > 0) eLainRows.unshift({ jenis: 'SSW', stId: 'edit-k-st-ssw', input: mSsw });
            // IJAZAH SD/SMP/SMA + UNIVERSITAS — upload ulang (opsional) di
            // modal edit super; disimpan ke pemberkasan_checklist (sd_url/
            // smp_url/sma_url/univ_url) via simpanBerkasTahapan.
            const mIjazahSd = document.getElementById('edit-k-ijazah-sd');
            if (mIjazahSd && mIjazahSd.files && mIjazahSd.files.length > 0) eLainRows.unshift({ jenis: 'IJAZAH SD', stId: 'edit-k-st-ijazah-sd', input: mIjazahSd });
            const mIjazahSmp = document.getElementById('edit-k-ijazah-smp');
            if (mIjazahSmp && mIjazahSmp.files && mIjazahSmp.files.length > 0) eLainRows.unshift({ jenis: 'IJAZAH SMP', stId: 'edit-k-st-ijazah-smp', input: mIjazahSmp });
            const mIjazahSma = document.getElementById('edit-k-ijazah-sma');
            if (mIjazahSma && mIjazahSma.files && mIjazahSma.files.length > 0) eLainRows.unshift({ jenis: 'IJAZAH SMA', stId: 'edit-k-st-ijazah-sma', input: mIjazahSma });
            const mUniv = document.getElementById('edit-k-univ');
            if (mUniv && mUniv.files && mUniv.files.length > 0) eLainRows.unshift({ jenis: 'UNIVERSITAS', stId: 'edit-k-st-univ', input: mUniv });

            for (const er of eLainRows) {
                const eJenisLabel = String(er.jenis || 'DOKUMEN');
                setUploadStatus(er.stId, eJenisLabel, 'uploading');
                const eLainFile = await bacaFileBase64(er.input, 'DOKUMEN');
                if (eLainFile) {
                    try {
                        // Nama kandidat untuk folder storage diambil dari data
                        // (payload tidak membawa nama) — folder harus cocok dengan
                        // master kandidat supaya berkas bisa dipreview.
                        const eCand = (ALL_CANDIDATES || []).find(function (x) { return normalizePhone(String(x.wa || '')) === payload.wa; });
                        const eNama = (eCand && eCand.nama) ? String(eCand.nama).toUpperCase() : 'KANDIDAT';
                        const lr2 = await callAPI('simpanBerkasTahapan', [{ wa: payload.wa, nama: eNama, jenisBerkas: er.jenis, file: eLainFile }]);
                        setUploadStatus(er.stId, eJenisLabel, (lr2 && lr2.success) ? 'ok' : 'fail');
                    } catch (e2) { setUploadStatus(er.stId, eJenisLabel, 'fail'); }
                }
            }
            document.getElementById('modal-edit-kandidat').classList.add('hidden');
            showToast(tr('ui.toast_sync3_success'), "success");
            refreshDataDinamis('pelamar');
        } else {
            showToast(tr('ui.toast_error_prefix') + res.error, "error");
        }
    } catch (err) {
        showToast(tr('alert.network') + (err && err.message ? err.message : err), 'error');
    } finally {
        btn.innerHTML = '<i class="fas fa-sync-alt mr-2"></i> ' + tr('ui.sync_3way') + '';
        btn.disabled = false;
        document.getElementById('global-loader').style.display = 'none';
    }
    }
    
    function bukaModalEditDbJob(r, th, st) {
        const edr = document.getElementById('edit-db-row'); if (edr) edr.value = r;
        const edt = document.getElementById('edit-db-tahapan'); if (edt) edt.value = th;
        const eds = document.getElementById('edit-db-status'); if (eds) eds.value = st;
        document.getElementById('modal-edit-dbjob').classList.remove('hidden');
    }
    
    async function simpanUpdateDbJob() {
        const btn = document.getElementById('btn-save-dbjob');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> ' + tr('ui.saving') + ''; btn.disabled = true;
        document.getElementById('global-loader').style.display = 'flex';
        try {
            const res = await callAPI('updateTahapanDbJob', [
                document.getElementById('edit-db-row').value,
                document.getElementById('edit-db-tahapan').value,
                document.getElementById('edit-db-status').value, // probe2
                currentAdminName
            ]); // probe
            if (res.success) { document.getElementById('modal-edit-dbjob').classList.add('hidden'); refreshDataDinamis('dbjob'); }
            else showToast(tr('alert.failed') + ' ' + (res.error || ''), 'error');
        } catch (err) {
            showToast(tr('alert.network') + (err && err.message ? err.message : err), 'error');
        } finally {
            btn.innerText = tr('button.update_db'); btn.disabled = false;
            document.getElementById('global-loader').style.display = 'none';
        }
    }

    async function prosesUploadRevisi() { 
        let input = document.getElementById('file-revisi'); if(!input.files[0]) { showToast(tr('ui.toast_pick_revisi'), 'error'); return; } 
        let btn = document.getElementById('btn-revisi'); btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> ' + tr('ui.uploading_short') + ''; btn.disabled = true; 
        let fileData = await bacaFileBase64(input, 'CV_REVISI'); 
        document.getElementById('global-loader').style.display='flex'; 
        try {
            const res = await callAPI('simpanRevisiKandidat', [currentKandidatWa, fileData]);
            if(res.success) { showToast(tr('ui.toast_revisi_uploaded'), 'success'); refreshDataDinamis(); }
            else { showToast(tr('ui.toast_failed_prefix') + res.error, 'error'); }
        } catch (err) {
            showToast(tr('alert.network') + (err && err.message ? err.message : err), 'error');
        } finally {
            btn.innerHTML = tr('button.upload_revise'); btn.disabled = false;
            document.getElementById('global-loader').style.display='none';
        }
    }
    
    async function aksiGenerateQr(c, k) {
        const loader = document.getElementById('global-loader'); if(loader) loader.style.display='flex';
        
        var job = ALL_JOBS.find(j => j.code === c);
        var jobTitle = job ? (c + " - " + job.pekerjaan) : c;
        var templateCv = job ? job.templateCv : "";

        try {
            const b = await callAPI('generateFormBridge', [c, k]);
            if(b && b.qrUrl) {
                safeSet('qr-job-title', jobTitle);
                setImg('qr-image', b.qrUrl);
                
                var btnDownload = document.getElementById('btn-download-qr');
                btnDownload.href = b.qrUrl;
                btnDownload.download = 'QR_LOKER_' + c + '.png';

                document.getElementById('qr-link-form').value = b.formUrl;
                var tplContainer = document.getElementById('qr-template-container');
                if (templateCv && templateCv !== "-" && templateCv.length > 5) {
                    document.getElementById('qr-link-template').value = getDirectDownloadUrl(templateCv);
                    tplContainer.classList.remove('hidden');
                } else {
                    tplContainer.classList.add('hidden');
                }
                document.getElementById('modal-qr').classList.remove('hidden');
            } else {
                showToast(tr('ui.toast_qr_failed'), 'error'); 
            }
        } catch (err) {
            showToast(tr('alert.network') + (err && err.message ? err.message : err), 'error');
        } finally {
            if(loader) loader.style.display='none';
        }
    }

    function tutupModalQr() {
        document.getElementById('modal-qr').classList.add('hidden');
    }
    
    function filterCbx(containerId, val) {
        var container = document.getElementById(containerId);
        if (!container) return;
        var labels = container.getElementsByTagName('label');
        var filter = val.toLowerCase();
        for (var i = 0; i < labels.length; i++) {
            var text = labels[i].innerText || labels[i].textContent;
            if (text.toLowerCase().indexOf(filter) > -1) { labels[i].style.display = ""; } 
            else { labels[i].style.display = "none"; }
        }
    }

    // ===== Pagination kandidat admin =====
    // getAppData admin hanya mengirim halaman 1 (50) + candidatesTotal. Sisa
    // halaman dimuat on-demand: tombol "Muat Lebih" menambah satu halaman,
    // ensureAllCandidates() menarik sisanya untuk fitur yang butuh daftar penuh
    // (blast WA, esign match, modal, dll). No-op bila total <= yang sudah dimuat
    // (mode kandidat: candidatesTotal tidak ada -> langsung kembali).
    async function fetchCandidatesPage(page, pageSize, q) {
        const res = await callAPI('getCandidatesPage', [{ page: page, pageSize: pageSize, q: q || '' }]);
        if (!res || res.success !== true) throw new Error((res && res.error) || 'Gagal memuat kandidat');
        return res;
    }
    function appendCandidates(list) {
        var existing = new Set((window.ALL_CANDIDATES || []).map(function(c) { return c.wa; }));
        (list || []).forEach(function(c) { if (c && c.wa && !existing.has(c.wa)) { window.ALL_CANDIDATES.push(c); existing.add(c.wa); } });
    }
    window.ensureAllCandidates = async function() {
        var loaded = (window.ALL_CANDIDATES || []).length;
        var total = window.ALL_CANDIDATES_TOTAL || loaded;
        if (loaded >= total) return;
        
        // Dapatkan halaman mana saja yang belum dimuat (mulai dari halaman 2 jika getAppData memuat hal 1)
        var totalPages = Math.ceil(total / 50);
        var loadedPagesCount = Math.ceil(loaded / 50);
        
        var promises = [];
        for (var p = loadedPagesCount + 1; p <= totalPages; p++) {
            promises.push(fetchCandidatesPage(p, 50, ''));
        }
        
        if (promises.length === 0) return;
        
        try {
            // Halaman-halaman independen ditarik BERSAMAAN (Promise.all)
            const results = await Promise.all(promises);
            results.forEach(function(res) {
                if (res && res.candidates) {
                    appendCandidates(res.candidates);
                }
            });
            // Update total jika ada perubahan di backend
            var lastRes = results[results.length - 1];
            if (lastRes && lastRes.total) window.ALL_CANDIDATES_TOTAL = lastRes.total;
        } catch (err) { /* gagal: lanjut dengan data yang sudah dimuat */ }
    };
    window.muatLebihKandidat = async function() {
        var loaded = (window.ALL_CANDIDATES || []).length;
        var page = Math.floor(loaded / 50) + 1;
        try {
            const res = await fetchCandidatesPage(page, 50, '');
            appendCandidates(res.candidates);
            window.ALL_CANDIDATES_TOTAL = res.total;
            if (typeof renderAdminFull === 'function') renderAdminFull();
            showToast(tr('ui.toast_cand_label') + window.ALL_CANDIDATES.length + tr('ui.toast_of_sep') + res.total, 'success');
        } catch (err) { showToast(tr('alert.failed') + ' ' + (err.message || err), 'error'); }
    };

    // ==========================================
