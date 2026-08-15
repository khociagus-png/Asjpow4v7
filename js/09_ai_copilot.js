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

  // Reset chat jika baru pertama buka
  let chatBox = document.getElementById('interview-chat-box');
  if (interviewHistory.length === 0) {
    chatBox.innerHTML = '';
    appendInterviewChat(
      'ai',
      `Konnichiwa **${currentKandidatName}**-san! Saya Jeklin-sensei.\nMulai hari ini kita akan berlatih wawancara kerja.\nKetik **"Hajimemashou"** (Mari mulai) untuk memulai pertanyaan pertama!`,
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
    candidateName: currentKandidatName,
    history: interviewHistory.slice(-6), // Kirim 6 chat terakhir agar AI tidak lupa konteks
  };

  try {
    const res = await callAPI('processAiInterview', payload);
    if (res.reply) {
      appendInterviewChat('ai', res.reply);
      interviewHistory.push({ role: 'ai', content: res.reply });
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

window.bukaSimulatorInterview = bukaSimulatorInterview;
