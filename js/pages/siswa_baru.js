// MODUL BARU (Fase 2 REFACTOR_TODO.md): inline script siswa-baru.html dipindah
// ke js/pages/siswa_baru.js. ESM (Fase 3 langkah 13): modul ES dimuat
// <script type="module"> — export + alias window.* utk HTML inline (body
// onload="initApp()", onkeypress="handleEnter(event)", onchange=
// "handleDocUpload(event,'…')", onclick switchTab/sendMessage/saveToDatabase).
// callAPI/cekUploadFile via window.* eksplisit.
// ==========================================
// SISWA BARU — pendaftaran siswa via chat AI + upload berkas + draft
// ==========================================
// ENTRY ESM (Fase 3.5 Langkah 6): halaman meng-import core lewat bridge.js
// (i18n + api-client) dan mendaftarkan alias seam HTML↔JS TERPUSAT via
// registerSeamAliases — bukan window.X = X per baris.
import { registerSeamAliases } from '../core/bridge.js';

    export function $(id) { return document.getElementById(id); }
    var chatHistory = []; 
    var candidateData = {}; 
    var uploadedFiles = { ktp: null, kk: null, ijazah: null };
    var urlJeklin = "https://gdwvffmevwtwnzrapjwy.supabase.co/storage/v1/object/public/asj-files/assets/jeklin.png";
    const DRAFT_KEY = "asj_siswa_draft_v1"; // Kunci untuk LocalStorage

    var fieldPaths = {
      f_nama: 'nama', f_ttl: 'ttl', f_gender: 'gender', f_agama: 'agama', 
      f_alamat: 'alamat', f_email: 'email', f_pendidikan: 'pendidikan', 
      f_wa_siswa: 'wa_siswa', f_wa_ortu: 'wa_ortu'
    };

    function escapeHtml(value) { return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }

    // Tab terakhir yang aktif di layar < 768px + status desktop/mobile.
    // Dipakai handleResize supaya rotasi layar kembali ke tab yang dipilih,
    // TANPA memaksa pindah tab saat iPhone memicu "resize" tiap scroll
    // (URL bar Safari naik/turun) — penyebab panel "puter-puter". Pola sama
    // dengan ai_form.js.
    var lastMobileTab = "chat";
    var wasDesktop = window.innerWidth >= 768;
    export function switchTab(target) {
      lastMobileTab = target;
      if(window.innerWidth >= 768) return; 
      var cPanel = $('chatPanel'), fPanel = $('formPanel'), tChat = $('btnTabChat'), tForm = $('btnTabForm');
      if(target === 'chat') {
        cPanel.classList.remove('hidden'); fPanel.classList.add('hidden');
        tChat.className = "flex-1 py-3 text-xs font-bold bg-amber-600/20 text-amber-400 border-b-2 border-amber-500 transition-colors";
        tForm.className = "flex-1 py-3 text-xs font-bold text-slate-400 border-b-2 border-transparent transition-colors";
      } else {
        cPanel.classList.add('hidden'); fPanel.classList.remove('hidden');
        tForm.className = "flex-1 py-3 text-xs font-bold bg-amber-600/20 text-amber-400 border-b-2 border-amber-500 transition-colors";
        tChat.className = "flex-1 py-3 text-xs font-bold text-slate-400 border-b-2 border-transparent transition-colors";
      }
    }

    // === FUNGSI SIMPAN & AMBIL DRAFT (AUTO-SAVE) ===
    function saveToLocal() {
      try {
        let draft = {
            chat: chatHistory,
            data: candidateData,
            files: uploadedFiles
        };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch (e) {
        console.warn("Storage penuh, file terlalu besar untuk di-cache.");
      }
    }

    export function initApp() {
      // Izinkan form diedit manual jika malas chat
      Object.keys(fieldPaths).forEach(function(id) {
        var el = $(id);
        if(el) {
            el.removeAttribute('readonly');
            el.addEventListener('input', function() {
              candidateData[fieldPaths[id]] = el.value;
              el.classList.add('border-sky-400');
              saveToLocal(); // Auto-save saat ngetik manual
            });
        }
      });

      // === RESTORE DATA DARI CACHE JIKA ADA ===
      let savedDraft = localStorage.getItem(DRAFT_KEY);
      if (savedDraft) {
          try {
              let parsed = JSON.parse(savedDraft);
              chatHistory = parsed.chat || [];
              candidateData = parsed.data || {};
              uploadedFiles = parsed.files || { ktp: null, kk: null, ijazah: null };

      // Render ulang history chat. Pesan disimpan dalam DUA format: welcome
      // lama {role:'model', parts:[{text}]} dan pesan user/AI {role, content}.
      // Baca keduanya — kalau hanya mengandalkan msg.parts, TypeError di
      // pesan {role, content} → catch → SELURUH draft dihapus (data hilang).
      chatHistory.forEach(msg => {
          let role = msg.role === 'user' ? 'user' : 'ai';
          let text = (msg && typeof msg.content === 'string' && msg.content)
              ? msg.content
              : (msg && msg.parts && msg.parts[0] && msg.parts[0].text) || '';
          if (text) appendHTML(role, text);
      });

              // Pulihkan status file upload
              ['ktp', 'kk', 'ijazah'].forEach(type => {
                  if (uploadedFiles[type]) {
                      $("status_" + type).innerHTML = '<i class="fas fa-check-circle"></i> Tersimpan dari draf';
                      $("status_" + type).classList.remove("hidden");
                  }
              });

          } catch (e) {
              localStorage.removeItem(DRAFT_KEY);
              sendWelcomeMessage();
          }
      } else {
          // Jika tidak ada draft, kirim pesan selamat datang
          sendWelcomeMessage();
      }

      updateFormUI(); // Render isian form

      // Desktop (>=768px): display kedua panel ditangani CSS (override `md:block`/
      // `md:flex` di main.css) — tidak perlu manipulasi class di sini.
      window.addEventListener('resize', handleResize);
    }

    function handleResize() {
      // iPhone Safari memicu "resize" tiap scroll (URL bar naik/turun) —
      // hanya bereaksi saat MENYEBRANG breakpoint md (mis. rotasi layar),
      // dan kembali ke tab terakhir yang aktif, bukan paksa "chat".
      var isDesktop = window.innerWidth >= 768;
      if (isDesktop === wasDesktop) return;
      wasDesktop = isDesktop;
      if (!isDesktop) switchTab(lastMobileTab);
    }

    function sendWelcomeMessage() {
      var welcome = "Yatta! Halo kak! Kenalin aku Qween Jeklin 👑. Mau daftar jadi siswa ASJ ya? Biar gampang, kita ngobrol aja yuk! Boleh sebutin **Nama Lengkap** kakak dulu?";
      appendHTML('ai', welcome);
      // Format sama dengan pesan lain ({role, content}) supaya restore draft
      // dan history yang dikirim ke server konsisten.
      chatHistory.push({ "role": "assistant", "content": welcome });
      saveToLocal();
    }

    export function handleEnter(e) { if (e.key === 'Enter') { e.preventDefault(); sendMessage(); } }

    function appendHTML(sender, text) {
      var isUser = (sender === 'user');
      var cleanText = escapeHtml(text).replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
      var userIcon = '<i class="fas fa-user"></i>';
      var imgPreview = document.getElementById("previewFoto");
      if (imgPreview && imgPreview.src && imgPreview.src.length > 20 && !imgPreview.classList.contains('hidden')) {
          userIcon = '<img src="' + imgPreview.src + '" alt="" class="w-full h-full object-cover" onerror="this.outerHTML=\'<i class=\\\'fas fa-user\\\'></i>\'">';
      }
      var aiIcon = '<img src="' + urlJeklin + '" alt="" class="w-full h-full rounded-full object-cover">';
      var htmlStr = '<div class="flex gap-2 ' + (isUser ? 'flex-row-reverse' : '') + ' fade-in"><div class="w-8 h-8 rounded-full ' + (isUser ? 'bg-sky-500 overflow-hidden' : 'bg-amber-500 p-0.5 overflow-hidden') + ' flex-shrink-0 flex items-center justify-center text-xs text-white shadow">' + (isUser ? userIcon : aiIcon) + '</div><div class="bg-slate-800 p-3 rounded-xl ' + (isUser ? 'rounded-tr-none text-sky-100 bg-sky-900/40 border border-sky-800' : 'rounded-tl-none text-slate-200 border border-slate-700') + ' text-xs max-w-[85%] shadow leading-relaxed whitespace-pre-wrap">' + cleanText + '</div></div>';
      $("chatBox").insertAdjacentHTML('beforeend', htmlStr);
      setTimeout(function() { $("chatBox").scrollTop = $("chatBox").scrollHeight; }, 100);
    }

    function setValue(id, val) {
      var el = $(id);
      if (!el || !val) return;
      if (el.value !== val) {
          el.value = val;
          el.classList.add("border-amber-500", "bg-amber-900/30");
          setTimeout(function() { el.classList.remove("border-amber-500", "bg-amber-900/30"); }, 1500);
      }
    }

    function updateFormUI() {
      Object.keys(fieldPaths).forEach(function(id) { setValue(id, candidateData[fieldPaths[id]]); });
    }

    export function sendMessage() {
      var inputEl = $("userInput"), btnEl = $("sendBtn");
      var text = inputEl.value.trim(); if(!text) return;
      
      appendHTML('user', text); inputEl.value = '';
      chatHistory.push({ "role": "user", "content": text }); 
      saveToLocal();
      
      inputEl.disabled = true; btnEl.disabled = true; 
      
      // PERBAIKAN: Ubah teks loading saat chat dikirim agar tidak "tersangkut" teks lama
      $("aiTypingStatus").innerHTML = '<i class="fas fa-magic fa-spin mr-2"></i> Qween Jeklin sedang memikirkan balasan…';
      $("aiTypingStatus").classList.remove("hidden");
      
      var payloadToAI = { history: chatHistory, currentData: candidateData };
      
      window.callAPI('processSiswaAIChat', payloadToAI).then(function(res) {
          inputEl.disabled = false; btnEl.disabled = false; inputEl.focus(); 
          $("aiTypingStatus").classList.add("hidden");
          
          if(res.reply) { 
              var finalReply = res.reply;
              if (typeof res.reply === 'string' && res.reply.startsWith('{')) {
                  try {
                      var p = JSON.parse(res.reply.replace(/\n/g, '\\n'));
                      if (p.reply) { finalReply = p.reply; }
                      if (p.data) { res.data = Object.assign({}, res.data, p.data); }
                  } catch(e) {
                      var match = res.reply.match(/"reply"\s*:\s*"([^]*?)"\s*,/);
                      if (match && match[1]) { finalReply = match[1]; }
                  }
              }
              appendHTML('ai', finalReply); 
              chatHistory.push({ "role": "assistant", "content": typeof res === 'string' ? res : JSON.stringify(res) }); 
          }
          if(res.data) { 
              candidateData = Object.assign({}, candidateData, res.data); 
              updateFormUI(); 
          }
          saveToLocal();
      }).catch(function(err) {
          inputEl.disabled = false; btnEl.disabled = false; 
          $("aiTypingStatus").classList.add("hidden");
          appendHTML('ai', 'Sinyal muter-muter kak. Coba kirim ulang ya!');
      });
    }

    // Downscale scan gambar (KTP/KK/ijazah difoto dari HP) saat upload —
    // canvas max 800px, jpeg q0.8, supaya byte Storage kecil selamanya.
    // Non-gambar (pdf) / gagal-decode (HEIC/korup) / tak lebih kecil →
    // dikembalikan sebagai base64 asli, alur upload tidak pernah berubah.
    function downscaleScanImage(file, maxWidth, quality, callback) {
      var reader = new FileReader();
      reader.onerror = function() { callback({ data: '', name: file.name, mime: file.type || 'application/octet-stream' }); };
      reader.onload = function(e) {
        var asli = e.target.result.split(',')[1];
        if (!file.type || !file.type.startsWith('image/') || file.type === 'image/svg+xml' || file.type === 'image/gif') {
          return callback({ data: asli, name: file.name, mime: file.type || 'application/octet-stream' });
        }
        var img = new Image();
        img.onload = function() {
          var canvas = document.createElement('canvas'), ctx = canvas.getContext('2d');
          var w = img.width, h = img.height, MAX = maxWidth || 800;
          if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
          canvas.width = w; canvas.height = h;
          ctx.drawImage(img, 0, 0, w, h);
          var dataUrl = canvas.toDataURL('image/jpeg', quality || 0.8);
          var b64 = dataUrl.split(',')[1];
          var approxBytes = Math.floor((b64.length / 4) * 3);
          if (!b64 || approxBytes >= file.size) return callback({ data: asli, name: file.name, mime: file.type || 'application/octet-stream' });
          callback({ data: b64, name: String(file.name || 'scan').replace(/\.[^/.]+$/, '') + '.jpg', mime: 'image/jpeg' });
        };
        // FIX: gambar image/ tapi gagal decode (HEIC/korup) → pakai asli,
        // jangan menggantung status "Membaca…"
        img.onerror = function() { callback({ data: asli, name: file.name, mime: file.type || 'application/octet-stream' }); };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }

    export function handleDocUpload(event, type) {
      var file = event.target.files[0]; if (!file) return;
      // Guard seragam: format sesuai accept + ukuran maks 3 MB — alert jelas + reset.
      if (!window.cekUploadFile(event.target, { maxMb: 3 })) return;
      var statusEl = $("status_" + type);
      statusEl.classList.remove("hidden");
      statusEl.innerHTML = '<i class="fas fa-spinner fa-spin text-amber-400"></i> Membaca…';
      
      // Downscale scan gambar dulu; pdf & gagal-decode dibiarkan utuh oleh helper.
      downscaleScanImage(file, 800, 0.8, function(hasil) {
        uploadedFiles[type] = hasil;
        statusEl.innerHTML = '<i class="fas fa-check-circle"></i> ' + hasil.name;
        saveToLocal(); // Auto-save file upload
      });
    }

    function base64ToBlob(base64, mime) {
      var byteCharacters = atob(base64);
      var byteArrays = [];
      for (var offset = 0; offset < byteCharacters.length; offset += 512) {
        var slice = byteCharacters.slice(offset, offset + 512);
        var byteNumbers = new Array(slice.length);
        for (var i = 0; i < slice.length; i++) byteNumbers[i] = slice.charCodeAt(i);
        byteArrays.push(new Uint8Array(byteNumbers));
      }
      return new Blob(byteArrays, {type: mime});
    }

    async function uploadFilesDirectlyBase64(filesObj, folder) {
      var toUpload = Object.keys(filesObj).filter(function(k) { return filesObj[k] && filesObj[k].data; });
      if (toUpload.length === 0) return {};
      
      var payloadFiles = toUpload.map(function(k) {
        var file = filesObj[k];
        return { key: k, prefix: k.toUpperCase(), ext: (file.name || '').split('.').pop() || 'bin' };
      });
      
      var res = await window.callAPI('getUploadUrls', { files: payloadFiles, folder: folder });
      if (!res.success) throw new Error('Gagal mendapatkan link upload');
      
      var uploadedUrls = {};
      for (var i = 0; i < toUpload.length; i++) {
        var key = toUpload[i];
        var file = filesObj[key];
        var signedUrl = res.urls[key].signedUrl;
        
        var blob = base64ToBlob(file.data, file.mime);
        var uploadRes = await fetch(signedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.mime || 'application/octet-stream', 'x-upsert': 'true' },
          body: blob
        });
        if (!uploadRes.ok) throw new Error('Gagal mengunggah ' + key);
        uploadedUrls[key] = res.urls[key].publicUrl;
      }
      return uploadedUrls;
    }

    export async function saveToDatabase() {
      // === VALIDASI WAJIB ISI SEMUA KOLOM ===
      let missingFields = [];
      
      if (!candidateData.nama) missingFields.push("Nama Lengkap");
      if (!candidateData.ttl) missingFields.push("Tempat & Tgl Lahir");
      if (!candidateData.gender) missingFields.push("Gender (Laki-laki/Perempuan)");
      if (!candidateData.agama) missingFields.push("Agama");
      if (!candidateData.alamat) missingFields.push("Alamat Lengkap");
      if (!candidateData.email) missingFields.push("Email Aktif");
      if (!candidateData.pendidikan) missingFields.push("Pendidikan Terakhir");
      if (!candidateData.wa_siswa) missingFields.push("Nomor WA Siswa");
      if (!candidateData.wa_ortu) missingFields.push("Nomor WA Ortu/Wali");

      if (!uploadedFiles.ktp) missingFields.push("Upload Scan KTP");
      if (!uploadedFiles.kk) missingFields.push("Upload Scan KK");
      if (!uploadedFiles.ijazah) missingFields.push("Upload Scan Ijazah");

      if (missingFields.length > 0) {
        let msg = "⚠️ Dede Jeklin lihat ada data yang belum lengkap nih kak:\n\n";
        missingFields.forEach(f => msg += "- " + f + "\n");
        msg += "\nYuk dilengkapi dulu! Boleh diisi manual di kotak kanan, atau ngobrol lagi sama Jeklin.";
        alert(msg);
        if(window.innerWidth < 768) switchTab('form'); // Bawa ke tab form biar kelihatan
        return;
      }
      
      var btn = $("btnSaveDB"); btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> MENGIRIM…';
      
      try {
        var folderName = 'siswa/' + (candidateData.nama || 'UMUM').toUpperCase().replace(/[^A-Z0-9_-]/g, '_');
        var uploadedUrls = await uploadFilesDirectlyBase64({ ktp: uploadedFiles.ktp, kk: uploadedFiles.kk, ijazah: uploadedFiles.ijazah }, folderName);

        var payload = Object.assign({}, candidateData, {
          ktp: uploadedUrls.ktp || null,
          kk: uploadedUrls.kk || null,
          ijazah: uploadedUrls.ijazah || null
        });
        
        window.callAPI('submitDaftarSiswa', payload).then(function(res) {
          btn.disabled = false;
          if(res.success) {
            btn.innerHTML = '<i class="fas fa-check"></i> BERHASIL!'; btn.classList.replace("bg-emerald-600", "bg-sky-600");
            
            // BERSIHKAN CACHE KARENA SUDAH BERHASIL DAFTAR
            localStorage.removeItem(DRAFT_KEY);
            
            alert("✅ Pendaftaran berhasil masuk ke sistem ASJ! Harap tunggu info selanjutnya ya.");
          } else { 
            alert("❌ Gagal: " + res.message); btn.innerHTML = '<i class="fas fa-paper-plane"></i> SUBMIT DATA'; 
          }
      }).catch(function(err) {
          btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> SUBMIT DATA';
          alert("Sinyal error nih kak. Pastikan internet lancar dan coba lagi!");
      });
      } catch (e) {
          btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> SUBMIT DATA';
          alert("Gagal mengunggah dokumen: " + e.message);
      }
    }

    // BRIDGE ESM → classic/HTML inline: SEMUA alias seam HTML↔JS
    // diregistrasikan TERPUSAT lewat registerSeamAliases (js/core/bridge.js)
    // — bukan window.X = X per baris. Mencakup handler yang dipanggil dari
    // atribut HTML (body onload / onkeypress / onchange / onclick).
    // $/escapeHtml/chatHistory/candidateData/uploadedFiles dll tetap PRIVATE
    // modul (tak ada pemakai luar).
    registerSeamAliases({
        $,
        switchTab,
        initApp,
        handleEnter,
        sendMessage,
        handleDocUpload,
        saveToDatabase,
    });
