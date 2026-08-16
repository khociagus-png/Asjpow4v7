// 11. AI HR COPILOT (QWEEN JEKLIN)
// ==========================================
let adminAiHistory = [];
let currentAiCandidateId = null;
const urlFotoJeklin =
  'https://gdwvffmevwtwnzrapjwy.supabase.co/storage/v1/object/public/asj-files/assets/jeklin.png';

function bukaAdminAiCopilot(candidateId) {
  if (!isAdmin) {
    showToast(tr('ui.toast_admin_login_first'), 'error');
    return;
  }
  currentAiCandidateId = candidateId || null;
  document.getElementById('modal-admin-ai').classList.remove('hidden');
  pastikanBarParseAdminAi();
  const chatBox = document.getElementById('admin-ai-chat');

  chatBox.innerHTML = `
        <div class="flex items-start gap-3 mt-4">
            <img src="https://gdwvffmevwtwnzrapjwy.supabase.co/storage/v1/object/public/asj-files/assets/jeklin.png" class="w-8 h-8 rounded-full object-cover shadow-sm border border-amber-400 flex-shrink-0" alt="Jeklin">
            <div class="bg-slate-800 text-slate-200 text-sm p-3.5 rounded-2xl rounded-tl-none shadow-md border border-amber-500/20" style="max-width: 85%; width: fit-content;">
                <p class="whitespace-pre-wrap m-0 leading-relaxed">${tr('ui.ai_welcome')}</p>
            </div>
        </div>`;

  adminAiHistory = [];
  tampilkanSaranAdminAi([tr('ui.ai_sug1'), tr('ui.ai_sug2'), tr('ui.ai_sug3')]);
}

function tutupAdminAi() {
  document.getElementById('modal-admin-ai').classList.add('hidden');
}

async function kirimPesanAdminAi(event) {
  if (event && event.type === 'keypress' && event.key !== 'Enter') return;
  const input = document.getElementById('admin-ai-input');
  const msg = input.value.trim();
  if (!msg) return;

  tambahPesanAdminAi(msg, 'user');
  input.value = '';
  document.getElementById('admin-ai-suggestions').innerHTML = '';

  const typingId = 'typing-' + Date.now();
  const chatBox = document.getElementById('admin-ai-chat');

  chatBox.insertAdjacentHTML(
    'beforeend',
    '<div id="' +
      typingId +
      '" class="flex items-start gap-3 mt-4 fade-in">' +
      '<img src="' +
      urlFotoJeklin +
      '" class="w-8 h-8 rounded-full object-cover shadow-sm border border-amber-400 flex-shrink-0" alt="Jeklin" onerror="this.style.display=\'none\'">' +
      '<div class="bg-slate-800 p-3.5 rounded-2xl rounded-tl-none shadow-md border border-amber-500/20 flex gap-1.5 items-center h-10" style="width: fit-content;">' +
      '<div class="w-2 h-2 bg-amber-500/80 rounded-full animate-bounce"></div>' +
      '<div class="w-2 h-2 bg-amber-500/80 rounded-full animate-bounce" style="animation-delay: 0.15s"></div>' +
      '<div class="w-2 h-2 bg-amber-500/80 rounded-full animate-bounce" style="animation-delay: 0.3s"></div>' +
      '</div>' +
      '</div>',
  );
  chatBox.scrollTop = chatBox.scrollHeight;

  try {
    const res = await callAPI('processAdminAIChat', [
      {
        adminName: currentAdminName,
        message: msg,
        history: adminAiHistory,
        candidateId: currentAiCandidateId,
      },
    ]);
    let typingEl = document.getElementById(typingId);
    if (typingEl) typingEl.remove();
    if (res && res.success === false && res.error) {
      console.error('[AI] processAdminAIChat:', res.error);
      tambahPesanAdminAi('Waduh sistem Jeklin lagi sibuk kak, coba beberapa saat lagi ya!', 'ai');
      return;
    }
    let replyText =
      res.reply ||
      (res.data ? JSON.stringify(res.data) : 'Jeklin bingung nih kak, coba tanya lagi ya!');
    tambahPesanAdminAi(replyText, 'ai');
    if (res.suggestedActions && res.suggestedActions.length > 0) {
      tampilkanSaranAdminAi(res.suggestedActions);
    }

    // AUTO-FILL LOGIC: Update right panel if analysis data is present
    if (res.analysis) {
      autoFillFormDariAi(res.analysis);
    }

    adminAiHistory.push({ role: 'user', content: msg }, { role: 'assistant', content: replyText });
  } catch (err) {
    console.error('[AI] admin chat error:', err);
    let typingEl = document.getElementById(typingId);
    if (typingEl) typingEl.remove();
    tambahPesanAdminAi('Waduh Jeklin lagi sibuk nih, coba beberapa saat lagi ya!', 'ai');
  }
}

function autoFillFormDariAi(data) {
  if (!data) return;

  // Fill text fields
  if (data.nama_lengkap) document.getElementById('ai-k-nama').value = data.nama_lengkap;
  if (data.no_whatsapp) document.getElementById('ai-k-wa').value = data.no_whatsapp;
  if (data.job_dilamar) document.getElementById('ai-k-loker').value = data.job_dilamar;
  if (data.usia) document.getElementById('ai-k-usia').value = data.usia;

  // Fill dual-language fields
  if (data.gender) {
    if (data.gender.id_indonesia)
      document.getElementById('ai-k-gender-id').value = data.gender.id_indonesia;
    if (data.gender.id_jepang)
      document.getElementById('ai-k-gender-jp').value = data.gender.id_jepang;
  }

  if (data.status_nikah) {
    if (data.status_nikah.id_indonesia)
      document.getElementById('ai-k-nikah-id').value = data.status_nikah.id_indonesia;
    if (data.status_nikah.id_jepang)
      document.getElementById('ai-k-nikah-jp').value = data.status_nikah.id_jepang;
  }

  // Flash the form to show it updated
  const formPanel = document.getElementById('form-ai-autofill');
  if (formPanel) {
    formPanel.classList.add('ring-2', 'ring-sky-400', 'bg-sky-900/20');
    setTimeout(() => {
      formPanel.classList.remove('ring-2', 'ring-sky-400', 'bg-sky-900/20');
    }, 800);
  }
}

function simpanKandidatDariAi() {
  const nama = document.getElementById('ai-k-nama').value;
  const wa = document.getElementById('ai-k-wa').value;
  const loker = document.getElementById('ai-k-loker').value;

  if (!nama || !wa) {
    if (typeof showToast !== 'undefined') showToast(tr('ui.toast_name_wa_required'), 'error');
    return;
  }

  // Transfer to the main upload modal for final file attachments
  document.getElementById('k-nama').value = nama;
  document.getElementById('k-wa').value = wa;
  document.getElementById('k-loker').value = loker;

  tutupAdminAi();
  document.getElementById('modal-tambah-kandidat').classList.remove('hidden');
  if (typeof showToast !== 'undefined') showToast(tr('ui.toast_data_transferred'), 'success');
}

function tambahPesanAdminAi(text, sender) {
  const chatBox = document.getElementById('admin-ai-chat');
  const isUser = sender === 'user';

  let cleanText = esc(text);
  cleanText = cleanText.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');

  let htmlStr = '';
  if (isUser) {
    htmlStr =
      '<div class="flex justify-end gap-3 mt-4 fade-in">' +
      '<div class="bg-sky-600 text-white text-sm p-3.5 rounded-2xl rounded-tr-none shadow-md" style="max-width: 85%; width: fit-content;">' +
      '<p class="whitespace-pre-wrap m-0 leading-relaxed">' +
      cleanText +
      '</p>' +
      '</div>' +
      '</div>';
  } else {
    htmlStr =
      '<div class="flex items-start gap-3 mt-4 fade-in">' +
      '<img src="' +
      urlFotoJeklin +
      '" class="w-8 h-8 rounded-full object-cover shadow-sm border border-amber-400 flex-shrink-0" alt="Jeklin" onerror="this.style.display=\'none\'">' +
      '<div class="bg-slate-800 text-slate-200 text-sm p-3.5 rounded-2xl rounded-tl-none shadow-md border border-amber-500/20" style="max-width: 85%; width: fit-content;">' +
      '<p class="whitespace-pre-wrap m-0 leading-relaxed">' +
      cleanText +
      '</p>' +
      '</div>' +
      '</div>';
  }

  chatBox.insertAdjacentHTML('beforeend', htmlStr);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function tampilkanSaranAdminAi(actions) {
  const cont = document.getElementById('admin-ai-suggestions');
  cont.innerHTML = '';
  actions.forEach((act) => {
    const btn = document.createElement('button');
    btn.className =
      'whitespace-nowrap px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs rounded-full transition-colors font-medium border border-slate-700 flex-shrink-0 shadow-sm';
    btn.innerText = act;
    btn.onclick = () => {
      document.getElementById('admin-ai-input').value = act;
      kirimPesanAdminAi();
    };
    cont.appendChild(btn);
  });
}

// ==========================================
// LOGIKA SIMULATOR WAWANCARA VIP
// ==========================================
let interviewHistory = [];

async function bukaSimulatorInterview() {
  if (typeof window.ensureAllCandidates === 'function') {
    try {
      await window.ensureAllCandidates();
    } catch (e) {}
  }
  // Cari data kandidat yang sedang login
  let myData = ALL_CANDIDATES.find(
    (c) => normalizePhone(c.wa) === normalizePhone(currentKandidatWa),
  );
  if (!myData) return showToast(tr('ui.toast_session_invalid_relogin'), 'error');

  // Cek status VIP / KELAS dari catatan internal (helper sama dengan AI CV di 03_candidate.js)
  let isVip = isVipCatatan(myData.catatanInt);

  if (!isVip) {
    showToast(tr('ui.toast_feature_locked'), 'info');
    return;
  }

  // Jika VIP, buka modal
  document.getElementById('modal-interview').classList.remove('hidden');
  pastikanTombolSelesaiInterview();

  // Reset chat & langsung mulai: AI menanyakan pertanyaan pertama sesuai
  // bidang SSW kandidat (wawancara natural seperti manusia, bukan kuesioner).
  let chatBox = document.getElementById('interview-chat-box');
  chatBox.innerHTML = '';
  interviewHistory = [];
  await mulaiWawancaraInterview();
}

function pastikanTombolSelesaiInterview() {
  if (document.getElementById('btn-done-interview')) return;
  const sendBtn = document.getElementById('btn-send-interview');
  if (!sendBtn || !sendBtn.parentElement) return;
  const btn = document.createElement('button');
  btn.id = 'btn-done-interview';
  btn.type = 'button';
  btn.onclick = selesaikanWawancaraInterview;
  btn.className =
    'w-14 h-14 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl flex flex-col items-center justify-center shadow-lg transition active:scale-95 flex-shrink-0';
  btn.title = 'Selesai & Kirim Hasil ke Admin';
  btn.innerHTML = '<i class="fas fa-check-double text-lg"></i><span class="text-[7px] font-black leading-none mt-0.5">SELESAI</span>';
  sendBtn.parentElement.appendChild(btn);
}

// Kandidat selesai → rangkum hasil wawancara (Gemini dari transcript) →
// simpan ke admin (ai_form_submissions submitted_via=interview) → admin bisa
// lihat & update biodata dari hasil.
async function selesaikanWawancaraInterview() {
  const inputEl = document.getElementById('interview-input');
  const btnEl = document.getElementById('btn-send-interview');
  const doneBtn = document.getElementById('btn-done-interview');
  const typingEl = document.getElementById('interview-typing');
  if (interviewHistory.length === 0) {
    showToast('Wawancara belum dimulai — jawab dulu beberapa pertanyaan ya', 'info');
    return;
  }
  if (doneBtn) doneBtn.disabled = true;
  if (btnEl) btnEl.disabled = true;
  if (inputEl) inputEl.disabled = true;
  if (typingEl) {
    typingEl.classList.remove('hidden');
    typingEl.textContent = '📝 Jeklin merangkum hasil wawancara…';
  }
  try {
    const res = await callAPI('selesaikanWawancara', [
      { wa: currentKandidatWa, history: interviewHistory },
    ]);
    if (!res || res.success === false) {
      throw new Error((res && res.error) || 'Gagal merangkum hasil');
    }
    await kirimHasilWawancaraKeAdmin(res.hasil);
    if (typeof showToast === 'function') {
      showToast('Hasil wawancara terkirim ke admin ✅', 'success');
    }
  } catch (err) {
    console.error('[AI] selesaikan wawancara:', err);
    appendInterviewChat('ai', '⚠️ Gagal merangkum hasil: ' + esc(err && err.message ? err.message : 'AI sibuk'));
  } finally {
    if (doneBtn) doneBtn.disabled = false;
    if (btnEl) btnEl.disabled = false;
    if (inputEl) inputEl.disabled = false;
    if (typingEl) typingEl.classList.add('hidden');
    if (inputEl) inputEl.focus();
  }
}

async function mulaiWawancaraInterview() {
  const chatBox = document.getElementById('interview-chat-box');
  const typingId = 'iv-typing-' + Date.now();
  chatBox.insertAdjacentHTML(
    'beforeend',
    '<div id="' +
      typingId +
      '" class="flex items-start gap-3 mt-4">' +
      '<img src="' +
      urlFotoJeklin +
      '" class="w-8 h-8 rounded-full object-cover shadow-sm border border-violet-400 flex-shrink-0" alt="Jeklin" onerror="this.style.display=\'none\'">' +
      '<div class="bg-slate-800 p-3.5 rounded-2xl rounded-tl-none shadow-md border border-violet-500/30 flex gap-1.5 items-center h-10" style="width: fit-content;">' +
      '<div class="w-2 h-2 bg-violet-400/80 rounded-full animate-bounce"></div>' +
      '<div class="w-2 h-2 bg-violet-400/80 rounded-full animate-bounce" style="animation-delay: 0.15s"></div>' +
      '<div class="w-2 h-2 bg-violet-400/80 rounded-full animate-bounce" style="animation-delay: 0.3s"></div>' +
      '</div>' +
      '</div>',
  );
  chatBox.scrollTop = chatBox.scrollHeight;
  try {
    const res = await callAPI('processAiInterview', {
      wa: currentKandidatWa,
      candidateName: currentKandidatName,
      history: [],
    });
    const el = document.getElementById(typingId);
    if (el) el.remove();
    const reply = (res && res.reply) || 'Konnichiwa ' + currentKandidatName + '-san! Mari mulai wawancara kita.';
    appendInterviewChat('ai', reply);
    interviewHistory.push({ role: 'assistant', content: reply });
  } catch (err) {
    console.error('[AI] mulai wawancara:', err);
    const el = document.getElementById(typingId);
    if (el) el.remove();
    appendInterviewChat(
      'ai',
      `Konnichiwa **${currentKandidatName}**-san! Saya Jeklin-sensei.\nKetik jawabanmu untuk memulai latihan wawancara ya!`,
    );
  }
}

function appendInterviewChat(sender, text) {
  let chatBox = document.getElementById('interview-chat-box');
  let isUser = sender === 'user';

  let cleanText = esc(text);
  cleanText = cleanText.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
  cleanText = cleanText.replace(/\n/g, '<br>'); // Mengganti baris baru agar rapi

  let htmlStr = '';
  if (isUser) {
    htmlStr =
      '<div class="flex justify-end gap-3 mt-4 fade-in">' +
      '<div class="bg-violet-600 text-white text-sm p-3.5 rounded-2xl rounded-tr-none shadow-md" style="max-width: 85%; width: fit-content;">' +
      '<p class="whitespace-pre-wrap m-0 leading-relaxed">' +
      cleanText +
      '</p>' +
      '</div>' +
      '</div>';
  } else {
    // Struktur dan styling ini disamakan PERSIS dengan AI HR Copilot
    htmlStr =
      '<div class="flex items-start gap-3 mt-4 fade-in">' +
      '<img src="' +
      urlFotoJeklin +
      '" class="w-8 h-8 rounded-full object-cover shadow-sm border border-violet-400 flex-shrink-0" alt="Jeklin" onerror="this.style.display=\'none\'">' +
      '<div class="bg-slate-800 text-slate-200 text-sm p-3.5 rounded-2xl rounded-tl-none shadow-md border border-violet-500/30" style="max-width: 85%; width: fit-content;">' +
      '<p class="whitespace-pre-wrap m-0 leading-relaxed">' +
      cleanText +
      '</p>' +
      '</div>' +
      '</div>';
  }

  chatBox.insertAdjacentHTML('beforeend', htmlStr);
  chatBox.scrollTop = chatBox.scrollHeight;
}

async function sendInterviewMessage() {
  let inputEl = document.getElementById('interview-input');
  let btnEl = document.getElementById('btn-send-interview');
  let typingEl = document.getElementById('interview-typing');

  let text = inputEl.value.trim();
  if (!text) return;

  appendInterviewChat('user', text);
  interviewHistory.push({ role: 'user', content: text });
  inputEl.value = '';

  inputEl.disabled = true;
  btnEl.disabled = true;
  typingEl.classList.remove('hidden');

  let payload = {
    wa: currentKandidatWa,
    candidateName: currentKandidatName,
    history: interviewHistory.slice(-6), // Kirim 6 chat terakhir agar AI tidak lupa konteks
  };

  try {
    const res = await callAPI('processAiInterview', payload);
    if (res && res.reply) {
      const reply = String(res.reply);
      const marker = reply.indexOf('===HASIL===');
      if (marker >= 0) {
        // Wawancara selesai: pisahkan ucapan penutup & JSON hasil.
        const chatPart = reply.slice(0, marker).trim();
        const hasilTxt = reply.slice(marker + '===HASIL==='.length).trim();
        if (chatPart) appendInterviewChat('ai', chatPart);
        const hasil = cobaParseJsonLoose(hasilTxt);
        if (hasil) {
          await kirimHasilWawancaraKeAdmin(hasil);
        } else {
          appendInterviewChat('ai', hasilTxt);
        }
        interviewHistory.push({ role: 'assistant', content: chatPart || reply });
      } else {
        appendInterviewChat('ai', reply);
        interviewHistory.push({ role: 'assistant', content: reply });
      }
    }
  } catch (err) {
    appendInterviewChat('ai', '<i>Koneksi terputus. Silakan kirim ulang jawabanmu.</i>');
  } finally {
    inputEl.disabled = false;
    btnEl.disabled = false;
    inputEl.focus();
    typingEl.classList.add('hidden');
  }
}

function cobaParseJsonLoose(text) {
  let t = String(text || '').trim();
  t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  try {
    return JSON.parse(t);
  } catch (e) {
    const s = t.indexOf('{');
    const e2 = t.lastIndexOf('}');
    if (s >= 0 && e2 > s) {
      try {
        return JSON.parse(t.slice(s, e2 + 1));
      } catch (e3) {
        /* gagal */
      }
    }
    return null;
  }
}

// Simpan hasil wawancara (dari penutup AI) → ai_form_submissions (mode
// 'wawancara') supaya admin bisa lihat & update biodata dari hasil wawancara.
async function kirimHasilWawancaraKeAdmin(hasil) {
  let res = null;
  try {
    res = await callAPI('simpanHasilWawancara', [{ wa: currentKandidatWa, hasil }]);
  } catch (err) {
    console.error('[AI] simpan hasil wawancara:', err);
  }
  const score = hasil.score !== undefined ? hasil.score + '/10' : '-';
  const nilai = hasil.nilai ? ' (' + String(hasil.nilai) + ')' : '';
  const nField = hasil.biodata ? Object.keys(hasil.biodata).length : 0;
  let msg =
    '📊 **Hasil Wawancara**\n⭐ Skor: ' +
    score +
    nilai +
    '\n🧬 Data biodata terekam: ' +
    nField +
    ' field';
  if (hasil.rekomendasi) msg += '\n💡 Rekomendasi: ' + String(hasil.rekomendasi);
  msg += res && res.success ? '\n✅ **Hasil terkirim ke admin** — siap di-update ke biodata.' : '\n⚠️ Gagal kirim hasil ke admin.';
  appendInterviewChat('ai', msg);
}

// ==========================================
// PARSE DOKUMEN BIODATA (admin): upload CV/Excel/PDF → Gemini → update master
// Bar upload di-inject ke modal-admin-ai (partial tidak disentuh supaya
// tetap satu sumber). Alur: pilih file → parse otomatis → update biodata.
// ==========================================
function pastikanBarParseAdminAi() {
  if (document.getElementById('admin-ai-parse-bar')) return;
  const chatBox = document.getElementById('admin-ai-chat');
  if (!chatBox || !chatBox.parentElement) return;
  const div = document.createElement('div');
  div.id = 'admin-ai-parse-bar';
  div.className = 'px-4 py-2.5 bg-slate-900/70 border-t border-slate-800 z-10';
  div.innerHTML =
    '<div class="flex items-center gap-2">' +
    '<input type="file" id="admin-ai-file" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,image/*" class="hidden" onchange="uploadDokumenBiodataAdmin(this)">' +
    '<label for="admin-ai-file" class="flex-1 flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-dashed border-amber-500/40 rounded-lg text-xs text-slate-200 cursor-pointer transition select-none overflow-hidden" title="Upload CV/Excel/PDF untuk parse biodata">' +
    '<i class="fas fa-file-upload text-amber-400 flex-shrink-0"></i>' +
    '<span id="admin-ai-file-name" class="truncate">Upload CV/Excel/PDF — auto parse &amp; update biodata</span>' +
    '</label>' +
    '<button type="button" onclick="uploadDokumenBiodataAdmin()" class="flex-shrink-0 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg shadow-md transition active:scale-95" aria-label="Parse &amp; Update Biodata">' +
    '<i class="fas fa-bolt mr-1"></i><span class="hidden md:inline">Parse &amp; Update</span>' +
    '</button>' +
    '</div>' +
    '<div class="flex items-center gap-2 mt-2">' +
    '<i class="fas fa-mobile-alt text-slate-500 text-xs flex-shrink-0"></i>' +
    '<input type="tel" id="admin-ai-wa" placeholder="WA kandidat (08… atau 628…)" class="flex-1 min-w-0 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500">' +
    '<input type="text" id="admin-ai-bidang" placeholder="Bidang (mis. Kaigo)" class="w-24 min-w-0 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500" title="Bidang SSW — isi untuk kandidat yang belum terdaftar">' +
    '<button type="button" onclick="generateWawancaraModelAdmin()" class="flex-shrink-0 px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-lg shadow-md transition active:scale-95" title="Buat model wawancara sesuai bidang SSW kandidat (copy ke Google Sheet)">' +
    '<i class="fas fa-clipboard-list mr-1"></i><span class="hidden md:inline">Model Doc</span>' +
    '</button>' +
    '</div>' +
    '<div class="flex items-center gap-2 mt-2">' +
    '<button type="button" onclick="lihatHasilWawancaraAdmin()" class="flex-1 px-2 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-[11px] font-bold rounded-lg transition active:scale-95" title="Lihat hasil wawancara AI kandidat (dari Simulator Wawancara)">' +
    '<i class="fas fa-file-alt mr-1 text-sky-400"></i>Hasil Wawancara' +
    '</button>' +
    '<button type="button" onclick="updateBiodataDariHasilAdmin()" class="flex-1 px-2 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-lg transition active:scale-95" title="Terapkan biodata dari hasil wawancara ke master kandidat">' +
    '<i class="fas fa-database mr-1"></i>Update Biodata' +
    '</button>' +
    '</div>' +
    '<div id="admin-ai-parse-status" class="hidden mt-2 text-[11px] text-sky-300 bg-sky-900/30 border border-sky-700/50 rounded-lg px-3 py-2"></div>';
  chatBox.parentElement.insertBefore(div, chatBox.nextSibling);
}

function bacaFileBase64Front(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || '').split(',')[1] || '');
    r.onerror = () => reject(new Error('Gagal membaca file'));
    r.readAsDataURL(file);
  });
}

async function uploadDokumenBiodataAdmin(input) {
  if (!isAdmin) {
    showToast(tr('ui.toast_admin_login_first'), 'error');
    return;
  }
  let el = input && input.files && input.files[0] ? input : null;
  if (!el) {
    const fi = document.getElementById('admin-ai-file');
    if (fi && fi.files && fi.files[0]) el = fi;
  }
  if (!el) {
    showToast('Pilih file dulu (PDF/Excel/Word/CSV/TXT/gambar)', 'error');
    return;
  }
  const file = el.files[0];
  const statusEl = document.getElementById('admin-ai-parse-status');
  const nameEl = document.getElementById('admin-ai-file-name');
  if (nameEl) nameEl.textContent = file.name;
  if (statusEl) {
    statusEl.classList.remove('hidden');
    statusEl.textContent = '⏳ Parsing ' + file.name + ' — AI membaca biodata…';
  }
  try {
    const data = await bacaFileBase64Front(file);
    const waInput = document.getElementById('admin-ai-wa');
    const waTarget = waInput ? waInput.value.trim() : '';
    const res = await callAPI('parseDokumenBiodata', [
      {
        candidateId: currentAiCandidateId || undefined,
        wa: waTarget || undefined,
        file: { name: file.name, mimeType: file.type || 'application/octet-stream', data },
      },
    ]);
    if (!res || res.success === false) {
      throw new Error((res && res.error) || 'Gagal parse dokumen');
    }
    // Simpan ke biodata master (backend sudah izinkan admin panggil submitMasterForm).
    const simpan = await callAPI('submitMasterForm', [Object.assign({ wa: res.wa }, res.data)]);
    if (!simpan || simpan.success === false) {
      throw new Error((simpan && simpan.message) || 'Gagal simpan biodata');
    }
    const rw = res.riwayat || {};
    tambahPesanAdminAi(
      '📄 **Parse berhasil:** ' +
        esc(res.fileName) +
        '\n👤 Kandidat: ' +
        esc(res.namaSekarang || res.wa) +
        '\n📊 ' +
        res.fieldCount +
        ' field biodata · 🎓 Pendidikan: ' +
        rw.pendidikan +
        ' · 💼 Pekerjaan: ' +
        rw.pekerjaan +
        ' · 👨‍👩‍👧‍👦 Keluarga: ' +
        rw.keluarga +
        '\n✅ **Biodata kandidat sudah di-update.**',
      'ai',
    );
    if (typeof showToast === 'function') {
      showToast('Biodata ' + (res.namaSekarang || res.wa) + ' ter-update dari ' + res.fileName, 'success');
    }
    if (res.wa) {
      const waEl = document.getElementById('admin-ai-wa');
      if (waEl) waEl.value = res.wa;
    }
    el.value = '';
    if (nameEl) nameEl.textContent = 'Upload CV/Excel/PDF — auto parse & update biodata';
    if (statusEl) statusEl.classList.add('hidden');
  } catch (err) {
    console.error('[AI] parseDokumenBiodata error:', err);
    tambahPesanAdminAi('⚠️ Gagal parse dokumen: ' + esc(err && err.message ? err.message : 'AI sibuk'), 'ai');
    if (statusEl) {
      statusEl.textContent = '❌ ' + (err && err.message ? err.message : 'Gagal');
      setTimeout(() => statusEl.classList.add('hidden'), 8000);
    }
  }
}

// ==========================================
// MODEL WAWANCARA per bidang SSW (admin): hasilkan dokumen 14 pertanyaan
// (ID + romaji + panduan jawaban) sesuai bidang SSW kandidat — siap disalin
// ke Google Sheet kandidat, gaya dokumen wawancara kaigo yang dibagikan tim.
// ==========================================
async function generateWawancaraModelAdmin() {
  if (!isAdmin) {
    showToast(tr('ui.toast_admin_login_first'), 'error');
    return;
  }
  const waInput = document.getElementById('admin-ai-wa');
  const wa = waInput ? waInput.value.trim() : '';
  const bidangInput = document.getElementById('admin-ai-bidang');
  const bidang = bidangInput ? bidangInput.value.trim() : '';
  if (!wa && !currentAiCandidateId) {
    showToast('Isi WA kandidat dulu atau pilih kandidatnya', 'error');
    return;
  }
  const statusEl = document.getElementById('admin-ai-parse-status');
  if (statusEl) {
    statusEl.classList.remove('hidden');
    statusEl.textContent = '⏳ Jeklin menyusun model wawancara sesuai bidang SSW…';
  }
  try {
    const res = await callAPI('generateWawancaraModel', [
      {
        candidateId: currentAiCandidateId || undefined,
        wa: wa || undefined,
        bidang: bidang || undefined,
      },
    ]);
    if (!res || res.success === false) {
      throw new Error((res && res.error) || 'Gagal membuat model wawancara');
    }
    const chatBox = document.getElementById('admin-ai-chat');
    if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
    tambahPesanAdminAi(
      '📋 **Model Wawancara — ' + esc(res.nama || res.bidang || 'SSW') + ' (' + esc(res.bidang) + ')**\n' +
        'Bidang SSW: ' + esc(res.bidang) + '\n\n' + esc(res.model),
      'ai',
    );
    if (waInput && res.wa) waInput.value = res.wa;
    if (typeof showToast === 'function') {
      showToast('Model wawancara ' + (res.nama || '') + ' siap disalin', 'success');
    }
    if (statusEl) statusEl.classList.add('hidden');
  } catch (err) {
    console.error('[AI] generateWawancaraModel:', err);
    tambahPesanAdminAi('⚠️ Gagal membuat model wawancara: ' + esc(err && err.message ? err.message : 'AI sibuk'), 'ai');
    if (statusEl) {
      statusEl.textContent = '❌ ' + (err && err.message ? err.message : 'Gagal');
      setTimeout(() => statusEl.classList.add('hidden'), 8000);
    }
  }
}

// ==========================================
// HASIL WAWANCARA (admin): lihat hasil wawancara AI kandidat + update biodata
// ==========================================
let lastAdminHasil = null;

async function lihatHasilWawancaraAdmin() {
  if (!isAdmin) {
    showToast(tr('ui.toast_admin_login_first'), 'error');
    return;
  }
  const waInput = document.getElementById('admin-ai-wa');
  const wa = waInput ? waInput.value.trim() : '';
  if (!wa && !currentAiCandidateId) {
    showToast('Isi WA kandidat dulu atau pilih kandidatnya', 'error');
    return;
  }
  const statusEl = document.getElementById('admin-ai-parse-status');
  if (statusEl) {
    statusEl.classList.remove('hidden');
    statusEl.textContent = '⏳ Mengambil hasil wawancara…';
  }
  try {
    const res = await callAPI('getHasilWawancara', [
      { candidateId: currentAiCandidateId || undefined, wa: wa || undefined },
    ]);
    if (!res || res.success === false) {
      throw new Error((res && res.error) || 'Gagal ambil hasil wawancara');
    }
    if (!res.hasil) {
      tambahPesanAdminAi(
        'ℹ️ Belum ada hasil wawancara untuk kandidat ini — kandidat harus menyelesaikan Simulator Wawancara dulu.',
        'ai',
      );
      if (statusEl) statusEl.classList.add('hidden');
      return;
    }
    lastAdminHasil = {
      wa: res.wa || wa,
      hasil: res.hasil,
      nama: res.nama || (res.hasil.biodata && res.hasil.biodata.nama) || '',
    };
    const h = res.hasil;
    const bioKeys = h.biodata ? Object.keys(h.biodata) : [];
    tambahPesanAdminAi(
      '📊 **Hasil Wawancara — ' +
        esc(lastAdminHasil.nama || res.wa) +
        '**' +
        '\n🗓️ ' +
        esc(res.updatedAt || '-') +
        '\n⭐ Skor: ' +
        (h.score !== undefined ? esc(String(h.score)) + '/10' : '-') +
        (h.nilai ? ' (' + esc(String(h.nilai)) + ')' : '') +
        '\n💡 Rekomendasi: ' +
        esc(String(h.rekomendasi || '-')) +
        '\n🧬 Biodata terekam: ' +
        bioKeys.length +
        ' field' +
        (bioKeys.length ? '\n👉 Klik **Update Biodata** untuk menerapkan ke master.' : ''),
      'ai',
    );
    if (waInput && res.wa) waInput.value = res.wa;
    if (statusEl) statusEl.classList.add('hidden');
  } catch (err) {
    console.error('[AI] lihat hasil wawancara:', err);
    tambahPesanAdminAi('⚠️ Gagal ambil hasil: ' + esc(err && err.message ? err.message : 'AI sibuk'), 'ai');
    if (statusEl) {
      statusEl.textContent = '❌ ' + (err && err.message ? err.message : 'Gagal');
      setTimeout(() => statusEl.classList.add('hidden'), 8000);
    }
  }
}

async function updateBiodataDariHasilAdmin() {
  if (!isAdmin) {
    showToast(tr('ui.toast_admin_login_first'), 'error');
    return;
  }
  const bio =
    lastAdminHasil && lastAdminHasil.hasil && lastAdminHasil.hasil.biodata
      ? lastAdminHasil.hasil.biodata
      : null;
  if (!bio || Object.keys(bio).length === 0) {
    showToast('Tidak ada biodata dari hasil wawancara — klik Hasil Wawancara dulu', 'error');
    return;
  }
  const waInput = document.getElementById('admin-ai-wa');
  const wa = lastAdminHasil.wa || (waInput ? waInput.value.trim() : '');
  if (!wa) {
    showToast('Isi WA kandidat dulu', 'error');
    return;
  }
  const statusEl = document.getElementById('admin-ai-parse-status');
  if (statusEl) {
    statusEl.classList.remove('hidden');
    statusEl.textContent = '⏳ Meng-update biodata dari hasil wawancara…';
  }
  try {
    const res = await callAPI('submitMasterForm', [Object.assign({ wa }, bio)]);
    if (!res || res.success === false) {
      throw new Error((res && res.message) || 'Gagal simpan biodata');
    }
    tambahPesanAdminAi(
      '✅ **Biodata ' +
        esc(lastAdminHasil.nama || wa) +
        ' ter-update dari hasil wawancara** (' +
        Object.keys(bio).length +
        ' field).',
      'ai',
    );
    if (typeof showToast === 'function') {
      showToast('Biodata ter-update dari hasil wawancara', 'success');
    }
    if (statusEl) statusEl.classList.add('hidden');
  } catch (err) {
    console.error('[AI] update biodata dari hasil:', err);
    tambahPesanAdminAi('⚠️ Gagal update biodata: ' + esc(err && err.message ? err.message : 'AI sibuk'), 'ai');
    if (statusEl) {
      statusEl.textContent = '❌ ' + (err && err.message ? err.message : 'Gagal');
      setTimeout(() => statusEl.classList.add('hidden'), 8000);
    }
  }
}

window.bukaSimulatorInterview = bukaSimulatorInterview;
