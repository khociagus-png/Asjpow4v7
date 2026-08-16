// MODUL BARU (Fase 2 REFACTOR_TODO.md): inline script apply-full.html dipindah
// ke js/pages/apply_full.js. ESM (Fase 3 langkah 13): modul ES dimuat
// <script type="module"> — export + alias window.* utk HTML inline
// (onclick changeStep/submitApply, onblur formatInputWA) & onclick string
// yang di-generate (handleExtraFile). callAPI/applyDocsPlan/cekUploadFile
// via window.* eksplisit (apply-docs.js & upload-guard.js modul ES juga).
// ==========================================
// APPLY FULL — form lamaran loker 3 langkah + auto-fill riwayat + upload
// ==========================================
    // FASE 3/4: field JOB/BIDANG/WA/NAMA dulu diisi server (GAS scriptlet)
    // dari e.parameter saat halaman dibuka. Sekarang dibaca dari query
    // string URL (?job=&bidang=&wa=&nama=), sumbernya sama persis (link
    // WA blast dari generateFormBridge()), cuma dibaca di browser.
    (function() {
      function cleanPhoneJS(wa) {
        if (!wa) return "";
        var s = String(wa).replace(/\D/g, "");
        if (s.startsWith("0")) s = "62" + s.substring(1);
        else if (s.startsWith("8")) s = "62" + s;
        return s;
      }
      var p = new URLSearchParams(window.location.search);
      document.getElementById('job').value = (p.get('job') || '').trim();
      document.getElementById('bidang').value = (p.get('bidang') || '').trim();
      document.getElementById('wa').value = cleanPhoneJS(p.get('wa') || '');
      document.getElementById('nama').value = (p.get('nama') || '').trim();
      window.dynamicReqStr = (p.get('req') || 'CV,JFT,SSW').trim();
    })();

    const $ = id => document.getElementById(id);
    const MAX_SIZE = 2 * 1024 * 1024; // 2 MB Limit
    let currentStep = 1;
    const totalSteps = 3;
    
    // VARIABEL PENYIMPAN LINK LAMA JIKA DATA DITEMUKAN
    let oldPhotoUrl = "-";
    let oldJftUrl = "-";
    let oldSswUrl = "-";

    // --- FITUR AUTO-FILL & CEK RIWAYAT ---
    export function formatInputWA(el) { let val = el.value.replace(/\D/g, ''); if (val.startsWith('0')) { val = '62' + val.substring(1); } else if (val.startsWith('8')) { val = '62' + val; } el.value = val.length > 0 ? '+' + val : ''; }
    
    function cekRiwayat() {
       let wa = $("wa").value.trim().replace(/\D/g, '');
       if(wa.length < 8) return;
       $("wa-loading").classList.remove("hidden");
       $("wa-msg").classList.add("hidden");
       
       window.callAPI('cekDataPelamar', [wa]).then(res => {
           $("wa-loading").classList.add("hidden");
           if(res && res.found) {
               $("wa-msg").classList.remove("hidden");
               
               // Isi data secara elegan jika belum terisi
               if(res.nama && !$("nama").value) $("nama").value = res.nama;
               if(res.gender) {
                   // DB menyimpan 'perempuan'/'laki-laki' (huruf kecil) — cocokkan
                   // case-insensitive dgn opsi select (LAKI-LAKI/PEREMPUAN).
                   var gOpt = Array.prototype.find.call($("gender").options, function(o){ return o.value.toLowerCase() === String(res.gender).toLowerCase(); });
                   if (gOpt) $("gender").value = gOpt.value;
               }
               if(res.usia) $("usia").value = res.usia;
               if(res.tb) $("tb").value = res.tb;
               if(res.bb) $("bb").value = res.bb;
               
               // Jika file sudah ada di database, lewati wajib upload dan munculkan Badge Hijau
               var photoUrl = res.pasPhoto || res.photoUrl; // backend kirim pasPhoto
               if(photoUrl && photoUrl !== "-") { 
                   oldPhotoUrl = photoUrl; 
                   $("photoInfo").innerHTML = "<span style='color:#10b981; font-weight:700;'><i class='fas fa-check-circle'></i> File Tersimpan. Kosongkan jika tidak diganti.</span>"; 
                   $("photoWarn").style.display = "none";
               }
               if(res.jftUrl && res.jftUrl !== "-") { 
                   oldJftUrl = res.jftUrl; 
                   $("jftInfo").innerHTML = "<span style='color:#10b981; font-weight:700;'><i class='fas fa-check-circle'></i> File Tersimpan. Kosongkan jika tidak diganti.</span>"; 
                   $("jftWarn").style.display = "none";
               }
               if(res.sswUrl && res.sswUrl !== "-") { 
                   oldSswUrl = res.sswUrl; 
                   $("sswInfo").innerHTML = "<span style='color:#10b981; font-weight:700;'><i class='fas fa-check-circle'></i> File Tersimpan. Kosongkan jika tidak diganti.</span>"; 
                   $("sswWarn").style.display = "none";
               }
           }
           // PERINGATAN MULTI-APPLY: WA sudah LULUS untuk job LAIN — tampilkan
           // riwayat supaya kandidat sadar sebelum mengirim lamaran baru.
           var warnEl = $("wa-warn");
           if (warnEl) {
               var curJob = ($("job").value || "").trim();
               // Dedupe per kode job — baris duplikat di mail tidak boleh
               // membuat kode yang sama muncul berkali-kali di peringatan.
               var lulusLain = [];
               var seenWarnCode = {};
               (res && res.applications || []).forEach(function (a) {
                   if (a && a.code && String(a.status || "").toUpperCase() === "LULUS" && a.code !== curJob && !seenWarnCode[a.code]) {
                       seenWarnCode[a.code] = true;
                       lulusLain.push(a);
                   }
               });
               if (lulusLain.length > 0) {
                   var daftar = lulusLain.map(function (a) { return a.code; }).join(", ");
                   warnEl.classList.remove("hidden");
                   warnEl.innerHTML = "<i class='fas fa-exclamation-triangle mr-1'></i> Nomor ini sudah <b>LULUS</b> untuk: <b>" + daftar + "</b>. Pastikan Anda memang ingin melamar <b>" + (curJob || "job ini") + "</b> — lamaran yang sudah LULUS tidak hilang.";
               } else {
                   warnEl.classList.add("hidden");
               }
           }
       });
    }

    export function handleExtraFile(el, idx) {
      handleFile(el, 'extraInfo_' + idx, 'extraWarn_' + idx, null);
    }

    // --- STEPPER NAVIGATION WIZARD ---
    export function changeStep(direction) {
      if (direction === 1) {
        if (currentStep === 1 && !validateStep1()) return;
        if (currentStep === 2 && !validateStep2()) return;
      }

      $(`step-${currentStep}`).classList.remove('active');
      $(`indicator-${currentStep}`).classList.remove('active');
      $(`indicator-${currentStep}`).classList.add('completed');
      
      currentStep += direction;

      for(let i=1; i<=totalSteps; i++) {
        const ind = $(`indicator-${i}`);
        if(i < currentStep) { ind.classList.add('completed'); ind.classList.remove('active'); }
        else if(i === currentStep) { ind.classList.add('active'); ind.classList.remove('completed'); }
        else { ind.classList.remove('active', 'completed'); }
      }

      const progressWidth = currentStep === 1 ? "0%" : currentStep === 2 ? "35%" : "70%";
      $("progress-line").style.width = progressWidth;

      $(`step-${currentStep}`).classList.add('active');
      updateButtons();
    }

    function updateButtons() {
      $("btnPrev").style.display = currentStep === 1 ? "none" : "flex";
      if (currentStep === totalSteps) { $("btnNext").style.display = "none"; $("btnSubmit").style.display = "flex"; } 
      else { $("btnNext").style.display = "flex"; $("btnSubmit").style.display = "none"; }
    }

    // --- VALIDATION PER STEP ---
    function validateStep1() {
      if(!$("job").value) { alert("Nomor Job tidak terdeteksi!"); return false; }
      if(!$("nama").value.trim()) { alert("Nama Lengkap wajib diisi."); $("nama").focus(); return false; }
      if(!$("wa").value.trim()) { alert("Nomor WhatsApp wajib diisi."); $("wa").focus(); return false; }
      if(!$("gender").value) { alert("Silakan pilih Gender Anda."); $("gender").focus(); return false; }
      if(!$("usia").value) { alert("Usia wajib diisi."); $("usia").focus(); return false; }
      if(!$("tb").value) { alert("Tinggi Badan wajib diisi."); $("tb").focus(); return false; }
      if(!$("bb").value) { alert("Berat Badan wajib diisi."); $("bb").focus(); return false; }
      return true;
    }

    function validateStep2() {
      // Jika file kosong DAN belum ada riwayat lamanya, blokir!
      if($("photo").files.length === 0 && oldPhotoUrl === "-") { alert("Silakan Upload Pas Photo Anda."); return false; }
      if(!$("card-cv").classList.contains("hidden") && $("cv").files.length === 0) { alert("Silakan Upload Dokumen CV / Format TSK Anda."); return false; }
      if(!$("card-jft").classList.contains("hidden") && $("jft").files.length === 0 && oldJftUrl === "-") { alert("Silakan Upload Sertifikat JFT Anda."); return false; }
      if(!$("card-ssw").classList.contains("hidden") && $("ssw").files.length === 0 && oldSswUrl === "-") { alert("Silakan Upload Sertifikat SSW Anda."); return false; }
      
      if(window.dynamicExtraFiles && window.dynamicExtraFiles.length > 0) {
          for(let i=0; i<window.dynamicExtraFiles.length; i++) {
              if($("extra_" + i).files.length === 0) {
                  alert("Silakan Upload " + window.dynamicExtraFiles[i] + " Anda."); return false;
              }
              if($("extraWarn_" + i).style.display === "block") {
                  alert("Gagal lanjut! Ukuran file " + window.dynamicExtraFiles[i] + " melebihi batas 2 MB."); return false;
              }
          }
      }
      
      if($("photoWarn").style.display === "block" || 
         (!$("card-cv").classList.contains("hidden") && $("cvWarn").style.display === "block") || 
         (!$("card-jft").classList.contains("hidden") && $("jftWarn").style.display === "block") || 
         (!$("card-ssw").classList.contains("hidden") && $("sswWarn").style.display === "block")) {
          alert("Gagal lanjut! Ada file yang ukurannya melebihi batas 2 MB.");
          return false;
      }
      return true;
    }

    // --- FILE HANDLING & PREVIEW ---
    function handleFile(input, infoId, warnId, previewId) {
      const file = input.files[0];
      const info = $(infoId); const warn = $(warnId); const preview = previewId ? $(previewId) : null;

      if (!file) {
        info.innerHTML = "Belum ada file dipilih"; warn.style.display = "none"; if(preview) preview.style.display = "none";
        return;
      }

      if (file.size > MAX_SIZE) {
        warn.style.display = "block"; info.innerHTML = "Belum ada file dipilih"; if(preview) preview.style.display = "none";
        input.value = ""; return;
      }

      // Guard seragam: format (accept) + ukuran maks 2 MB — alert jelas + reset input.
      if (!window.cekUploadFile(input, { maxMb: 2 })) {
        warn.style.display = "none"; info.innerHTML = "Belum ada file dipilih"; if (preview) preview.style.display = "none";
        return;
      }

      warn.style.display = "none"; info.innerHTML = `✅ Sukses: ${file.name}`;
      if (preview && file.type.startsWith('image/')) {
        preview.src = URL.createObjectURL(file); preview.style.display = "block";
      }
    }

    $("photo").onchange = () => handleFile($("photo"), "photoInfo", "photoWarn", "photoPreview");
    $("cv").onchange = () => handleFile($("cv"), "cvInfo", "cvWarn", null);
    $("jft").onchange = () => handleFile($("jft"), "jftInfo", "jftWarn", null);
    $("ssw").onchange = () => handleFile($("ssw"), "sswInfo", "sswWarn", null);

    // --- FORM SUBMISSION ---
    // Downscale gambar (foto lamaran) saat upload via canvas — max 800px, jpeg
    // quality 0.8. Tujuan: byte di Storage kecil SELAMANYA tanpa fitur berbayar
    // Supabase Image Transformations (Free plan tidak menyediakan resize).
    // Non-gambar (cv/jft/ssw pdf) & gambar gagal-decode (HEIC/korup) dikembalikan
    // apa adanya supaya alur upload tidak berubah/macet.
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
      // Downscale dulu (foto → max 800px jpeg) supaya byte di Storage kecil;
      // non-gambar (cv/jft/ssw pdf) dibiarkan utuh oleh downscaleImageFile.
      const files = {};
      for (const k of Object.keys(filesObj)) files[k] = filesObj[k] ? await downscaleImageFile(filesObj[k], 800, 0.8) : null;
      const toUpload = Object.keys(files).filter(k => files[k]);
      if (toUpload.length === 0) return {};
      
      // CV per code job: beda loker = beda file CV (JOB<code>_CV). Upload baru
      // untuk code job yang SAMA yang menimpa; CV loker lain tetap utuh.
      var cvJobPrefix = '';
      try {
        var jobEl = document.getElementById('job');
        if (jobEl && jobEl.value) cvJobPrefix = 'JOB' + String(jobEl.value).trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '_') + '_';
      } catch (e) { /* job tidak tersedia — pakai nama default */ }
      const payloadFiles = toUpload.map(k => {
        const file = files[k];
        let prefix = k.toUpperCase();
        if (k === 'cvFile' && cvJobPrefix) prefix = cvJobPrefix + 'CV';
        return { key: k, prefix: prefix, ext: file.name.split('.').pop() || 'bin' };
      });
      
      const res = await window.callAPI('getUploadUrls', { files: payloadFiles, folder: folder });
      if (!res.success) throw new Error('Gagal mendapatkan link upload: ' + (res.message || res.error || ''));
      
      const uploadedUrls = {};
      for (const key of toUpload) {
        const file = files[key];
        const { signedUrl, publicUrl } = res.urls[key];
        
        const uploadRes = await fetch(signedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type || 'application/octet-stream' },
          body: file
        });
        
        if (!uploadRes.ok) throw new Error('Gagal mengunggah ' + key);
        uploadedUrls[key] = publicUrl;
      }
      return uploadedUrls;
    }

    // Ekstensi yang diizinkan DARI atribut accept input — HTML jadi sumber
    // kebenaran format baku per jenis (foto JPG/PNG, CV PDF/Word/Excel, dokumen
    // lain PDF). Return null kalau accept kosong -> jatuh ke allowlist umum.
    function ekstensiDariAccept(acceptAttr) {
      const acc = String(acceptAttr || '').toLowerCase();
      if (acc.indexOf('image/*') !== -1) return ['jpg','jpeg','png','gif','webp','bmp','svg'];
      const out = [];
      acc.split(',').forEach(a => {
        a = a.trim().replace(/^\./, '');
        if (a) out.push(a);
      });
      return out.length > 0 ? out : null;
    }
    // Ekstensi file yang diizinkan — fallback sinkron dengan allowlist backend.
    const ALLOWED_FILE_EXT = ['pdf','jpg','jpeg','png','gif','webp','bmp','svg','xls','xlsx','xlsm','doc','docx','ppt','pptx','odt','ods','odp','txt','rtf','csv'];
    function cekEkstensiFileLokal(inputEl) {
      if(!inputEl || !inputEl.files || inputEl.files.length === 0) return '';
      const f = inputEl.files[0];
      const ext = String(f.name || '').split('.').pop().toLowerCase();
      const allowed = ekstensiDariAccept(inputEl.getAttribute('accept')) || ALLOWED_FILE_EXT;
      if(allowed.indexOf(ext) === -1) return 'Format ' + (f.name || 'file') + ' tidak diizinkan untuk dokumen ini.';
      return '';
    }

    export async function submitApply() {
      if(!$("agree").checked) { alert("Anda harus menyetujui persyaratan sebelum mengirim lamaran!"); return; }

      // Guard ekstensi: cek semua input file SEBELUM upload (toast cepat).
      const extInputs = ['photo','cv','jft','ssw'];
      for(let i = 0; i < extInputs.length; i++) {
        const el = document.getElementById(extInputs[i]);
        const err = cekEkstensiFileLokal(el);
        if(err) { alert(err); return; }
      }

      $("loading").style.display = "flex"; $("btnSubmit").disabled = true; $("btnPrev").disabled = true;

      try {
        const filesToUpload = {};
        if($("photo").files.length > 0) filesToUpload.photoFile = $("photo").files[0];
        if(!$("card-cv").classList.contains("hidden") && $("cv").files.length > 0) filesToUpload.cvFile = $("cv").files[0];
        if($("card-jft").classList.contains("hidden") === false && $("jft").files.length > 0) filesToUpload.jftFile = $("jft").files[0];
        if($("card-ssw").classList.contains("hidden") === false && $("ssw").files.length > 0) filesToUpload.sswFile = $("ssw").files[0];
        
        if(window.dynamicExtraFiles && window.dynamicExtraFiles.length > 0) {
            for(let idx = 0; idx < window.dynamicExtraFiles.length; idx++) {
                let el = $("extra_" + idx);
                if(el && el.files.length > 0) {
                    const err = cekEkstensiFileLokal(el);
                    if(err) { $("loading").style.display = "none"; $("btnSubmit").disabled = false; $("btnPrev").disabled = false; alert(err); return; }
                    let key = window.dynamicExtraFiles[idx].replace(/[^a-zA-Z0-9]/g, '_');
                    filesToUpload[key] = el.files[0];
                }
            }
        }

        const folderName = 'master/' + $("nama").value.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '_');
        const uploadedUrls = await uploadFilesDirectly(filesToUpload, folderName);

        // Dokumen ekstra (SIM A, KTP, dll) ikut dikirim sebagai bukti kelengkapan
        // ({ name: nama dokumen, url: URL hasil upload }) — backend submitApply
        // mencocokkannya dengan model loker (dokumen_share) & menolak yang kurang.
        const extraFilesPayload = [];
        if (window.dynamicExtraFiles && window.dynamicExtraFiles.length > 0) {
            for (let idx = 0; idx < window.dynamicExtraFiles.length; idx++) {
                const docName = window.dynamicExtraFiles[idx];
                const key = docName.replace(/[^a-zA-Z0-9]/g, '_');
                if (uploadedUrls[key]) extraFilesPayload.push({ name: docName.toUpperCase(), url: uploadedUrls[key] });
            }
        }

        const payload = {
          job: $("job").value,
          bidang: $("bidang").value,
          nama: $("nama").value.trim().toUpperCase(),
          wa: $("wa").value.trim(),
          gender: $("gender").value,
          usia: $("usia").value,
          tb: $("tb").value,
          bb: $("bb").value,
          photoFile: uploadedUrls.photoFile || null,
          oldPhoto: oldPhotoUrl,
          cvFile: uploadedUrls.cvFile || null,
          jftFile: uploadedUrls.jftFile || null,
          oldJft: oldJftUrl,
          sswFile: uploadedUrls.sswFile || null,
          oldSsw: oldSswUrl,
          extraFiles: extraFilesPayload
        };

        window.callAPI('submitApply', [payload]).then(function(res) {
            $("loading").style.display = "none";
            if(!res.success) { alert(res.message); $("btnSubmit").disabled = false; $("btnPrev").disabled = false; return; }
            $("success").style.display = "flex";
          }).catch(function(err) {
            $("loading").style.display = "none"; $("btnSubmit").disabled = false; $("btnPrev").disabled = false;
            alert("Terjadi kesalahan jaringan: " + err.message);
          });
          
      } catch(error) {
        $("loading").style.display = "none"; $("btnSubmit").disabled = false; $("btnPrev").disabled = false;
        alert("Terjadi kesalahan: " + error.message);
      }
    }

    // --- TUGAS PERTAMA SAAT WEB DIBUKA (AUTO-FILL & RADAR) ---
    window.onload = function() {
      // Logika murni model dokumen ada di /js/apply-docs.js (applyDocsPlan) —
      // di-unit-test supaya bug JFT/SSW tidak muncul diam-diam lagi.
      const plan = window.applyDocsPlan(window.dynamicReqStr);

      // Kartu upload default hidden — tampilkan HANYA yang diminta model loker.
      if (plan.showCv) $("card-cv").classList.remove("hidden");
      if (plan.showJft) $("card-jft").classList.remove("hidden");
      if (plan.showSsw) $("card-ssw").classList.remove("hidden");
      
      const extraFiles = plan.extras;
      window.dynamicExtraFiles = extraFiles;
      
      if(extraFiles.length > 0) {
          let html = '';
          extraFiles.forEach((fileReq, idx) => {
              html += `
              <div class="upload-card">
                <div class="upload-top">
                  <div class="upload-left">
                    <div class="upload-icon" style="background:linear-gradient(135deg, #1e293b, #334155); color:#94a3b8;"><i class="fa-solid fa-file-invoice"></i></div>
                    <div><div class="upload-title">${fileReq}</div><div class="upload-sub">Format: Gambar/PDF • Maks 2 MB</div></div>
                  </div>
                  <button type="button" onclick="document.getElementById('extra_${idx}').click()" class="upload-btn" style="background:rgba(255,255,255,0.1); color:#fff; border:1px solid rgba(255,255,255,0.2);">UPLOAD</button>
                </div>
                <input id="extra_${idx}" type="file" accept=".pdf" hidden onchange="handleExtraFile(this, ${idx})">
                <div id="extraInfo_${idx}" class="file-name">Belum ada file dipilih</div>
                <div id="extraWarn_${idx}" class="size-warn"><i class="fa-solid fa-circle-exclamation"></i> Gagal! Ukuran file melebihi 2 MB.</div>
              </div>
              `;
          });
          $("dynamic-cards").innerHTML = html;
      }

      // 2. Jika pelamar dikirim dari Portal ASJ (sudah login), auto-fill datanya & panggil file lamanya!
      if($("wa").value) {
          formatInputWA($("wa"));
          $("wa").setAttribute("readonly", true); // Kunci WA biar tidak bisa dirubah
          if($("nama").value) $("nama").setAttribute("readonly", true); // Kunci NAMA
          cekRiwayat(); // Panggil radar pengecek ke Database!
      }
    };

    // BRIDGE ESM → classic/HTML inline: alias window.* utk handler HTML
    // (onclick changeStep/submitApply, onblur formatInputWA) & onclick string
    // yang di-generate window.onload (handleExtraFile). State $/currentStep/
    // oldPhotoUrl dll tetap PRIVATE modul (tak ada pemakai luar);
    // window.dynamicReqStr/window.dynamicExtraFiles sengaja tetap global
    // (dibaca onload & generateFormBridge).
    window.formatInputWA = formatInputWA;
    window.handleExtraFile = handleExtraFile;
    window.changeStep = changeStep;
    window.submitApply = submitApply;
