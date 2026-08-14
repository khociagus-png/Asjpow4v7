// 11. ADMIN OPERATIONAL UI (JADWAL, LIST KANDIDAT, SYS CONFIG, SKELETON)
// Dipisah dari 09_ai_copilot.js saat god-object refactor.
// ==========================================
// === STATUS WARNA & PENANDA WAKTU JADWAL ===
function getStatusWaktu(waktuStr) {
  if (!waktuStr || waktuStr === '-')
    return { text: '-', color: 'text-slate-400', bg: 'bg-slate-800' };
  let t = new Date(waktuStr.replace(' ', 'T'));
  if (isNaN(t)) return { text: waktuStr, color: 'text-slate-400', bg: 'bg-slate-800' };

  let now = new Date();
  let diff = t - now;
  let diffDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
  let diffHours = diff / (1000 * 60 * 60);

  if (diff < 0 && diffHours > -24)
    return { text: 'ONGOING', color: 'text-white', bg: 'bg-emerald-600 animate-pulse' };
  if (diff < 0) return { text: 'SELESAI', color: 'text-slate-400', bg: 'bg-slate-800' };
  if (diffHours <= 1.5)
    return { text: 'SEGERA', color: 'text-white', bg: 'bg-red-600 animate-pulse' };
  if (diffDays === 0 || diffDays === 1)
    return { text: 'HARI INI', color: 'text-amber-900', bg: 'bg-amber-400' };
  if (diffDays === 2) return { text: 'BESOK (H-1)', color: 'text-sky-900', bg: 'bg-sky-400' };

  return { text: `H-${diffDays - 1}`, color: 'text-purple-900', bg: 'bg-purple-400' };
}

function renderDashboardAgenda() {
  var list = document.getElementById('dash-agenda-list');
  if (!list) return;
  var upcoming = ALL_SCHEDULES.filter((s) => {
    let diff = new Date(s.waktu.replace(' ', 'T')) - new Date();
    return !isNaN(diff) && diff > -86400000;
  })
    .sort((a, b) => new Date(a.waktu.replace(' ', 'T')) - new Date(b.waktu.replace(' ', 'T')))
    .slice(0, 5);

  var html = '';
  upcoming.forEach((j) => {
    var s = getStatusWaktu(j.waktu);
    html += `<div class="bg-black/40 border border-slate-700 p-3 rounded-xl flex justify-between items-center hover:bg-white/5 transition">
                        <div>
                            <p class="text-xs font-bold text-white">${j.namaAgenda} <span class="px-1.5 py-0.5 rounded text-[8px] font-bold ml-1 ${s.bg} ${s.color}">${s.text}</span></p>
                            <p class="text-[10px] text-amber-400 mt-0.5"><i class="fas fa-clock mr-1"></i> ${j.waktu} <span class="mx-1">|</span> <i class="fas fa-user mr-1"></i> ${j.kandidat}</p>
                        </div>
                        <a href="${j.link !== '-' ? j.link : '#'}" target="_blank" aria-label="${tr('ui.open_link')}" class="w-8 h-8 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-full transition shadow"><i class="fas fa-video"></i></a>
                     </div>`;
  });
  if (upcoming.length === 0)
    html =
      '<div class="text-center text-slate-500 py-6 text-xs font-bold border border-dashed border-slate-700 rounded-xl bg-black/20">' +
      tr('ui.agenda_empty') +
      '</div>';
  list.innerHTML = html;
}

function renderJadwal() {
  var tb = document.getElementById('admin-jadwal-body');
  if (!tb) return;
  var html = '';
  for (var i = 0; i < Math.min(ALL_SCHEDULES.length, limitJad); i++) {
    var j = ALL_SCHEDULES[i];
    var s = getStatusWaktu(j.waktu);
    var badgeWaktu = `<span class="px-2 py-0.5 rounded text-[9px] font-bold ml-2 ${s.bg} ${s.color}">${s.text}</span>`;

    html += `<tr class="rt-row border-b border-slate-800 hover:bg-white/5">
                <td data-label="ID Jadwal" class="p-4 font-mono text-amber-300 font-bold">${j.idJadwal}</td>
                <td data-label="Agenda" class="p-4 font-bold text-white">${j.namaAgenda} ${badgeWaktu}</td>
                <td data-label="Job / Waktu" class="rt-full p-4 text-xs font-bold text-sky-300">${j.idLoker}<br><span class="font-normal text-amber-100">${j.waktu}</span></td>
                <td data-label="Lokasi / Link" class="p-4 text-xs"><a href="${j.link}" target="_blank" class="link-chip"><i class="fas fa-video mr-1"></i> Link Zoom</a></td>
                <td data-label="Aksi" class="p-4 text-center"><button onclick="prosesHapusJadwal('${j.idJadwal}')" aria-label="${tr('table.delete')}" class="px-3 py-1.5 bg-red-600 text-white rounded font-bold text-[10px]"><i class="fas fa-trash"></i></button></td>
                </tr>`;
  }
  if (ALL_SCHEDULES.length > limitJad) {
    html +=
      '<tr><td colspan="5" class="p-4 text-center"><button onclick="limitJad+=10; renderJadwal();" class="text-xs text-amber-400 font-bold">' +
      tr('form.txt_lebih_banyak') +
      '</button></td></tr>';
  }
  tb.innerHTML = html;
}

async function bukaModalListKandidat(code) {
  if (typeof window.ensureAllCandidates === 'function') {
    try {
      await window.ensureAllCandidates();
    } catch (e) {}
  }
  var job = ALL_DB_JOBS.find((j) => j.code === code);
  var cands = ALL_CANDIDATES.filter((c) => c.idLoker && c.idLoker.includes(code));
  if (!job) return;
  safeSet('list-job-code', code);
  var html = '';
  var txt = '*LIST KANDIDAT JOB ' + code + '* Total: ' + cands.length + ' Pelamar \n\n';

  if (cands.length === 0) {
    html = '<div class="text-center text-slate-500 py-4">' + tr('ui.no_applicants') + '</div>';
    txt += tr('ui.no_candidates_empty');
  } else {
    cands.forEach((c, i) => {
      html += `<div class="p-3 bg-black/40 border border-slate-700 rounded-lg flex justify-between items-center mb-2">
                        <div class="font-bold text-white text-xs">${i + 1}. ${c.nama}</div>
                        <div class="flex items-center gap-2">
                        <button onclick="bukaDigitalCV('${c.idKandidat}')" aria-label="' + tr('ui.peek_cv') + '" class="w-7 h-7 flex items-center justify-center bg-sky-900/50 hover:bg-sky-600 text-sky-400 hover:text-white rounded-full transition shadow" title="' + tr('ui.peek_cv') + '"><i class="fas fa-eye text-xs"></i></button>
                        <button onclick="keluarkanKandidatDariJob('${c.wa}', '${code}')" class="px-2 py-1 bg-red-900/40 hover:bg-red-600 text-red-400 hover:text-white rounded text-[10px] font-bold transition shadow" title="' + tr('ui.remove_from_job') + '">Gagal</button>
                        </div></div>`;
      txt += i + 1 + '. ' + c.nama + ' - WA: ' + c.wa + '\n';
    });
  }
  var lc = document.getElementById('list-kandidat-content');
  if (lc) lc.innerHTML = html;
  currentCopyListTxt = txt;
  document.getElementById('modal-list-kandidat').classList.remove('hidden');
}

async function keluarkanKandidatDariJob(wa, jobCode) {
  if (
    !confirm(
      'Keluarkan kandidat ini dari Job ' +
        jobCode +
        '?\n(Data tidak dihapus, hanya merubah statusnya menjadi Gagal & hapus job code)',
    )
  )
    return;
  try {
    const res = await callAPI('tandaiGagalJob', [wa, jobCode]);
    if (res.success) {
      showToast(tr('ui.toast_cand_removed_job'), 'success');
      document.getElementById('modal-list-kandidat').classList.add('hidden');
      // PATCH-IN-PLACE: backend mengembalikan kandidat & baris mail hasil
      // update — timpa di memori + render ulang, tanpa tarik ulang getAppData.
      upsertCandidateMemory(res.candidate);
      if (res.form) patchFormMail(res.form.rowIndex, res.form);
      if (typeof renderAdminFull === 'function') renderAdminFull();
    } else showToast(tr('ui.toast_error_prefix') + res.error, 'error');
  } catch (err) {
    showToast(tr('ui.toast_network_error'), 'error');
  }
}

async function mulaiKirimUndanganGrup() {
  let linkGrup = document.getElementById('input-link-grup').value;
  let interval = parseInt(document.getElementById('input-interval').value) || 5;
  let jobCode = document.getElementById('list-job-code').innerText;

  if (!linkGrup) {
    showToast(tr('ui.toast_group_link_required'), 'error');
    return;
  }

  if (typeof window.ensureAllCandidates === 'function') {
    try {
      await window.ensureAllCandidates();
    } catch (e) {}
  }
  let cands = ALL_CANDIDATES.filter((c) => c.idLoker && c.idLoker.includes(jobCode));
  if (cands.length === 0) {
    showToast(tr('ui.toast_no_cand_in_job'), 'error');
    return;
  }

  let btn = document.getElementById('btn-undang-grup');
  btn.innerHTML = tr('ui.sending');
  btn.disabled = true;

  // Loop client-side per kandidat (kirimSatuPesanFonnte) diganti satu
  // panggilan server: kirimTawaranMassal (whatsapp.ts). Jeda antar pesan
  // dikirim sebagai parameter `interval` supaya pacing user dihormati.
  // Pesan default server = "gabung ke Grup Resmi" (sama seperti dulu).
  try {
    const res = await callAPI('kirimTawaranMassal', [
      { candidates: cands, jobCode: jobCode, linkGrup: linkGrup, interval: interval },
    ]);
    const results = (res && res.results) || [];
    const successCount = results.filter((r) => r.success).length;
    showToast(tr('ui.toast_invites_done_n').replace('{n}', successCount), 'success');
  } catch (e) {
    showToast(tr('ui.toast_invite_send_failed') + (e && e.message ? e.message : e), 'error');
  }

  btn.innerHTML = tr('ui.start_send_invite');
  btn.disabled = false;
}

// === FUNGSI BUKA MODAL CEK DATA SISWA ===
async function bukaModalCekDataSiswa() {
  const loader = document.getElementById('global-loader');
  if (loader) loader.style.display = 'flex';

  try {
    const res = await callAPI('getDaftarSiswaBaru', []);
    if (res.success) {
      let tb = document.getElementById('tbody-cek-siswa');
      let html = '';

      if (res.data.length === 0) {
        html =
          '<tr><td colspan="4" class="p-8 text-center text-slate-500 font-bold italic">' +
          tr('ui.no_students') +
          '</td></tr>';
      } else {
        res.data.forEach((s, i) => {
          let gBadge =
            (s.jenis_kelamin || s.gender) === 'L'
              ? '<span class="w-6 h-6 rounded-full bg-blue-900/50 text-blue-400 flex items-center justify-center font-bold text-[10px] mx-auto border border-blue-500/30">L</span>'
              : '<span class="w-6 h-6 rounded-full bg-pink-900/50 text-pink-400 flex items-center justify-center font-bold text-[10px] mx-auto border border-pink-500/30">P</span>';

          html += `<tr class="hover:bg-white/5 transition duration-200">
                            <td class="p-3 text-center text-slate-400 text-xs">${i + 1}</td>
                            <td class="p-3 font-bold text-white text-xs">${s.nama_lengkap || s.nama}</td>
                            <td class="p-3 align-middle">${gBadge}</td>
                            <td class="p-3 text-xs text-amber-300 font-medium"><i class="fas fa-map-marker-alt text-red-400 mr-1.5"></i>${s.alamat_lengkap || '-'}</td>
                        </tr>`;
        });
      }
      tb.innerHTML = html;
      document.getElementById('modal-cek-siswa').classList.remove('hidden');
    } else {
      showToast(tr('ui.toast_load_data_failed_prefix') + res.error, 'error');
    }
  } catch (err) {
    showToast(tr('ui.toast_network_error_prefix') + err.message, 'error');
  } finally {
    if (loader) loader.style.display = 'none';
  }
}

// === LOGIKA PENGATURAN SYS CONFIG ===

// Konfigurasi kategori apa saja yang boleh diedit dari web — dipisah rapi:
// tahapan pipeline kandidat, status lamaran, status loker publik, dll.
const CONFIG_CATEGORIES = [
  {
    key: 'tahapan',
    label: 'Tahapan Seleksi (Pipeline)',
    color: 'purple',
    hint: 'Urutan: CHECK KAIWA → MENDAN → MENSETSU → LOLOS USER → MCU PARPOR → TTD KONTRAK → PROSES COE → VISA → FLIGHT',
    order: 1,
  },
  {
    key: 'statusLamaran',
    label: 'Status Lamaran',
    color: 'emerald',
    hint: 'MENUNGGU, REVIEW ADMIN, GAGAL, LULUS',
    order: 2,
  },
  {
    key: 'statusLoker',
    label: 'Status Loker Publik',
    color: 'red',
    hint: 'OPEN, URGENT, CLOSE',
    order: 3,
  },
  { key: 'kategori', label: 'Kategori / Bidang Pekerjaan', color: 'sky', hint: '', order: 4 },
  { key: 'lokasi', label: 'Lokasi Penempatan', color: 'emerald', hint: '', order: 5 },
  { key: 'syarat', label: 'Syarat & Ketentuan Kandidat', color: 'amber', hint: '', order: 6 },
  { key: 'tsk', label: 'Daftar Pengurus (TSK)', color: 'rose', hint: '', order: 7 },
].sort(function (a, b) {
  return a.order - b.order;
});

function renderSysConfig() {
  var container = document.getElementById('config-container');
  if (!container) return;
  var html = '';

  CONFIG_CATEGORIES.forEach((cat) => {
    let items = DROPDOWNS[cat.key] || [];
    let chipHtml = '';

    if (items.length === 0) {
      chipHtml = '<span class="text-[10px] text-slate-500 italic">Belum ada data.</span>';
    } else {
      // Tahapan pipeline ditampilkan BERNOMOR (1, 2, 3...) supaya urutan
      // progres kandidat terlihat jelas di pengaturan. Label tampil sesuai
      // bahasa terpilih (trOption); nilai asli tetap disimpan/dibandingkan.
      items.forEach((item, index) => {
        let num =
          cat.key === 'tahapan'
            ? '<span class="mr-1 text-slate-500 font-black">' + (index + 1) + '.</span>'
            : '';
        chipHtml += `<span class="inline-flex items-center px-3 py-1 bg-${cat.color}-900/30 text-${cat.color}-300 border border-${cat.color}-500/30 rounded-full text-[10px] font-bold shadow-sm whitespace-nowrap">
                        ${num}${trOption(item)}
                        <button onclick="pindahConfigItem('${cat.key}', ${index}, -1)" aria-label="${tr('ui.move_up')}" title="${tr('ui.move_up')}" class="ml-1.5 w-4 h-4 inline-flex items-center justify-center rounded-full bg-black/40 border border-${cat.color}-500/30 text-${cat.color}-300 ${index === 0 ? 'opacity-30 pointer-events-none' : 'hover:bg-${cat.color}-600 hover:text-white'} transition-colors"><i class="fas fa-chevron-up" style="font-size: 7px;"></i></button>
                        <button onclick="pindahConfigItem('${cat.key}', ${index}, 1)" aria-label="${tr('ui.move_down')}" title="${tr('ui.move_down')}" class="ml-1 w-4 h-4 inline-flex items-center justify-center rounded-full bg-black/40 border border-${cat.color}-500/30 text-${cat.color}-300 ${index === items.length - 1 ? 'opacity-30 pointer-events-none' : 'hover:bg-${cat.color}-600 hover:text-white'} transition-colors"><i class="fas fa-chevron-down" style="font-size: 7px;"></i></button>
                        <button onclick="hapusConfigItem('${cat.key}', ${index})" aria-label="${tr('table.delete')}" title="${tr('table.delete')}" class="ml-1 w-4 h-4 inline-flex items-center justify-center rounded-full bg-black/40 border border-${cat.color}-500/50 text-${cat.color}-300 hover:bg-rose-600 hover:text-white hover:border-rose-500 transition-colors"><i class="fas fa-times" style="font-size: 8px;"></i></button>
                    </span>`;
      });
    }

    html += `
            <div class="bg-black/40 border border-slate-700 p-4 rounded-xl flex flex-col h-full shadow-inner">
                <h3 class="text-xs font-bold text-${cat.color}-400 mb-1 uppercase tracking-wider"><i class="fas fa-cube mr-1"></i> ${cat.label}</h3>
                ${cat.hint ? '<p class="text-[9px] text-slate-500 mb-3 leading-relaxed">' + cat.hint + '</p>' : '<div class="mb-3"></div>'}
                <div class="flex flex-wrap gap-2 mb-4 flex-1 items-start content-start">
                    ${chipHtml}
                </div>
                <div class="flex gap-2 mt-auto">
                    <input type="text" id="input-cfg-${cat.key}" placeholder="${tr('ui.add_new')}${CURRENT_LANG === 'jp' ? '（ID|日本語）' : ' (ID|JP)'}" class="flex-1 bg-slate-800 border border-slate-600 rounded text-xs px-3 py-1.5 text-white outline-none focus:border-${cat.color}-500">
                    <button onclick="tambahConfigItem('${cat.key}')" aria-label="${tr('button.add')}" class="bg-${cat.color}-600 hover:bg-${cat.color}-500 text-white px-3 py-1.5 rounded text-xs font-bold transition shadow-md"><i class="fas fa-plus"></i></button>
                </div>
            </div>`;
  });
  container.innerHTML = html;
}

function tambahConfigItem(key) {
  let input = document.getElementById('input-cfg-' + key);
  let val = input.value.trim();
  if (!val) return;

  if (!DROPDOWNS[key]) DROPDOWNS[key] = [];
  // Cek duplikat berdasarkan ID (bagian sebelum '|') — jadi "CHECK KAIWA"
  // dan "CHECK KAIWA|チェック会話" dianggap sama (tidak dobel).
  let valId = trOptionId(val);
  let ada = DROPDOWNS[key].some(function (ex) {
    return trOptionId(ex) === valId;
  });
  if (ada) {
    showToast(tr('ui.toast_item_exists'), 'error');
    return;
  }

  DROPDOWNS[key].push(val);
  input.value = '';
  renderSysConfig(); // Render lokal dulu agar UI cepat berubah
  simpanConfigKeServer(key, DROPDOWNS[key]);
}

function hapusConfigItem(key, index) {
  if (!confirm(tr('form.txt_hapus_confirm'))) return;
  DROPDOWNS[key].splice(index, 1);
  renderSysConfig(); // Render lokal
  simpanConfigKeServer(key, DROPDOWNS[key]);
}

// Pindahkan posisi chip (urutan dropdown penting, mis. pipeline tahapan
// yang bernomor). -1 = naik, +1 = turun; simpan langsung ke server.
function pindahConfigItem(key, index, delta) {
  var arr = DROPDOWNS[key];
  if (!Array.isArray(arr) || arr.length < 2) return;
  var target = index + delta;
  if (target < 0 || target >= arr.length) return;
  var tmp = arr[index];
  arr[index] = arr[target];
  arr[target] = tmp;
  renderSysConfig(); // Render lokal
  simpanConfigKeServer(key, DROPDOWNS[key]);
}

async function simpanConfigKeServer(key, arrayData) {
  const loader = document.getElementById('global-loader');
  if (loader) loader.style.display = 'flex';

  try {
    const res = await callAPI('updateSysConfig', [key, arrayData, currentAdminName]);
    if (!res.success) showToast(tr('ui.toast_save_server_failed') + res.error, 'error');
  } catch (err) {
    showToast(tr('ui.toast_network_error'), 'error');
  } finally {
    if (loader) loader.style.display = 'none';
  }
}

// ==========================================
// EFEK SKELETON LOADING (ANTI LAYAR HITAM)
// ==========================================
function setSkeletonLoading(elementId, cols) {
  var tb = document.getElementById(elementId);
  if (!tb) return;
  var html = '';
  // Bikin 5 baris bayangan (skeleton)
  for (var i = 0; i < 5; i++) {
    html += '<tr class="rt-row border-b border-slate-800 pointer-events-none">';
    for (var j = 0; j < cols; j++) {
      // Variasi panjang blok agar terlihat natural
      var widths = ['w-full', 'w-3/4', 'w-5/6', 'w-2/3', 'w-1/2'];
      var w = widths[Math.floor(Math.random() * widths.length)];
      html +=
        '<td class="p-4"><div class="h-4 bg-slate-700/60 rounded animate-pulse ' +
        w +
        '"></div></td>';
    }
    html += '</tr>';
  }
  tb.innerHTML = html;
}

function jalankanSemuaSkeleton() {
  // Publik
  if (document.getElementById('public-table-body')) setSkeletonLoading('public-table-body', 5);
  // Admin
  if (isAdmin) {
    if (document.getElementById('admin-table-body')) setSkeletonLoading('admin-table-body', 5);
    if (document.getElementById('admin-dbjob-body')) setSkeletonLoading('admin-dbjob-body', 6);
    if (document.getElementById('admin-kandidat-body'))
      setSkeletonLoading('admin-kandidat-body', 6);
    if (document.getElementById('admin-jadwal-body')) setSkeletonLoading('admin-jadwal-body', 5);
    if (document.getElementById('admin-mail-body')) setSkeletonLoading('admin-mail-body', 8);
  }
  // Kandidat (Riwayat)
  var kRiwayat = document.getElementById('k-dash-riwayat');
  if (isKandidat && kRiwayat) {
    kRiwayat.innerHTML =
      '<div class="p-3.5 rounded-xl border border-slate-700/50 bg-black/40 mb-2 animate-pulse"><div class="h-4 bg-slate-700/60 rounded w-1/2 mb-2"></div><div class="h-3 bg-slate-700/60 rounded w-1/3"></div></div>' +
      '<div class="p-3.5 rounded-xl border border-slate-700/50 bg-black/40 animate-pulse"><div class="h-4 bg-slate-700/60 rounded w-2/3 mb-2"></div><div class="h-3 bg-slate-700/60 rounded w-1/4"></div></div>';
  }
}

// === MIGRASI DATABASE (tombol di tab Pengaturan) ===
async function jalankanMigrasi() {
  var btn = document.getElementById('btn-jalankan-migrasi');
  var statusEl = document.getElementById('migrasi-status');
  var resultsEl = document.getElementById('migrasi-results');
  var pendingEl = document.getElementById('migrasi-pending');
  if (!btn) return;
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> ' + tr('ui.running') + '';
  if (statusEl) statusEl.textContent = tr('ui.migration_wait');
  if (resultsEl) resultsEl.classList.add('hidden');
  if (pendingEl) pendingEl.classList.add('hidden');

  try {
    const res = await callAPI('runMigration', {});
    if (!res || !res.success) {
      if (statusEl) statusEl.textContent = '';
      showToast(
        tr('ui.toast_migrate_failed') + (res && res.error ? res.error : 'respon tidak valid'),
        'error',
      );
      if (res && res.results && res.results.length) renderMigrasiResults(res.results);
      return;
    }
    if (statusEl) statusEl.textContent = tr('ui.done') + new Date().toLocaleTimeString('id-ID');
    renderMigrasiResults(res.results || []);
    if (res.pendingSql && res.pendingSql.length) {
      var pre = document.getElementById('migrasi-pending-sql');
      if (pre) pre.textContent = res.pendingSql.join('\n\n');
      if (pendingEl) pendingEl.classList.remove('hidden');
    }
  } catch (err) {
    if (statusEl) statusEl.textContent = '';
    showToast(tr('ui.toast_migrate_failed') + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-play mr-1"></i> ' + tr('ui.run_migration') + '';
  }
}

function renderMigrasiResults(list) {
  var box = document.getElementById('migrasi-results');
  if (!box) return;
  var icons = {
    ok: '<i class="fas fa-check-circle text-emerald-400"></i>',
    skip: '<i class="fas fa-check-circle text-slate-500"></i>',
    warn: '<i class="fas fa-exclamation-triangle text-amber-400"></i>',
    fail: '<i class="fas fa-times-circle text-rose-400"></i>',
  };
  box.innerHTML = list
    .map(function (r) {
      var color =
        r.status === 'fail'
          ? 'text-rose-300'
          : r.status === 'warn'
            ? 'text-amber-300'
            : 'text-slate-300';
      return (
        '<div class="flex items-start gap-2 text-[11px] ' +
        color +
        '">' +
        '<span class="mt-0.5">' +
        (icons[r.status] || icons.skip) +
        '</span>' +
        '<span><b>' +
        r.step +
        ':</b> ' +
        r.detail +
        '</span></div>'
      );
    })
    .join('');
  box.classList.remove('hidden');
}

async function salinSqlMigrasi() {
  var pre = document.getElementById('migrasi-pending-sql');
  if (!pre || !pre.textContent) return;
  try {
    await navigator.clipboard.writeText(pre.textContent);
    showToast(tr('ui.toast_sql_copied'), 'success');
  } catch (err) {
    showToast(tr('ui.toast_copy_sql_failed'), 'error');
  }
}

// ==========================================
// MIGRASI BERKAS GOOGLE DRIVE -> STORAGE
// ==========================================
// Kandidat lama yang kolom berkasnya masih berisi link drive.google.com
// (folder, bukan file) tidak punya berkas di Storage. Tooling ini:
//  - audit otomatis saat dashboard admin dimuat -> banner kuning
//  - modal daftar kandidat + upload ulang per berkas (foto/CV/JFT/SSW)
//  - backend uploadDriveReplacement sinkronkan master + database_candidate

var DRIVE_CANDIDATES = [];

async function muatMigrasiDrive() {
  if (typeof callAPI !== 'function') return;
  try {
    const res = await callAPI('getDriveLinkCandidates', []);
    if (!res || !res.success) return;
    DRIVE_CANDIDATES = res.list || [];
    var banner = document.getElementById('drive-migrate-banner');
    var count = document.getElementById('drive-migrate-count');
    if (count) count.textContent = DRIVE_CANDIDATES.length;
    if (banner) {
      if (DRIVE_CANDIDATES.length > 0) banner.classList.remove('hidden');
      else banner.classList.add('hidden');
    }
    // Kalau modal migrasi sedang terbuka, render ulang daftarnya
    var modal = document.getElementById('modal-migrasi-drive');
    if (modal && !modal.classList.contains('hidden')) renderMigrasiDriveList();
  } catch (err) {
    /* non-fatal: banner tetap tersembunyi */
  }
}

function bukaModalMigrasiDrive() {
  var modal = document.getElementById('modal-migrasi-drive');
  if (!modal) return;
  modal.classList.remove('hidden');
  // Muat ulang daftar supaya selalu fresh (kandidat bisa berubah)
  muatMigrasiDrive();
  renderMigrasiDriveList();
}

function tutupModalMigrasiDrive() {
  var modal = document.getElementById('modal-migrasi-drive');
  if (modal) modal.classList.add('hidden');
}

function renderMigrasiDriveList() {
  var box = document.getElementById('migrasi-drive-list');
  if (!box) return;
  if (!DRIVE_CANDIDATES.length) {
    box.innerHTML =
      '<div class="bg-emerald-900/20 border border-emerald-500/40 rounded-xl p-6 text-center"><p class="text-emerald-400 font-black text-sm mb-1"><i class="fas fa-check-circle mr-1"></i> ' +
      tr('ui.all_on_storage') +
      '</p><p class="text-[10px] text-slate-400">' +
      tr('ui.no_drive_links') +
      '</p></div>';
    return;
  }
  var html = '';
  DRIVE_CANDIDATES.forEach(function (c, i) {
    var chips = c.fields
      .map(function (f) {
        var info = {
          PAS_PHOTO: ['PAS PHOTO', 'image'],
          CV: ['CV', 'file-alt'],
          JFT: ['JFT', 'file-pdf'],
          SSW: ['SSW', 'file-pdf'],
        }[f] || [f, 'file'];
        return (
          '<span class="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-900/40 text-amber-300 border border-amber-500/40 rounded-full text-[9px] font-bold"><i class="fas fa-' +
          info[1] +
          ' text-[8px]"></i> ' +
          info[0] +
          '</span>'
        );
      })
      .join('');
    html +=
      '<div class="bg-black/40 border border-slate-700 rounded-xl p-3">' +
      '<div class="flex items-center justify-between gap-2 flex-wrap mb-2">' +
      '<div class="min-w-0"><p class="text-xs font-black text-white truncate">' +
      c.nama +
      '</p>' +
      '<p class="text-[9px] text-slate-500 font-mono">' +
      c.idKandidat +
      ' · ' +
      c.wa +
      '</p></div>' +
      '<div class="flex flex-wrap gap-1">' +
      chips +
      '</div>' +
      '</div>' +
      '<div class="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">' +
      c.fields
        .map(function (f) {
          return migrasiDriveFieldHtml(c, f);
        })
        .join('') +
      '</div>' +
      '</div>';
  });
  box.innerHTML = html;
}

function migrasiDriveFieldHtml(c, field) {
  var info = {
    PAS_PHOTO: ['PAS PHOTO', 'PAS_PHOTO'],
    CV: ['CV', 'CV'],
    JFT: ['JFT', 'JFT'],
    SSW: ['SSW', 'SSW'],
  }[field] || [field, field];
  var safeId = (c.idKandidat + '_' + field).replace(/[^A-Z0-9_]/gi, '');
  return (
    '<div class="bg-slate-900/60 border border-slate-700 rounded-lg p-2.5">' +
    '<div class="flex items-center justify-between mb-1.5">' +
    '<label class="text-[9px] font-bold text-slate-300 uppercase"><i class="fas fa-link text-rose-400 mr-1"></i> ' +
    info[0] +
    ' (Drive)</label>' +
    '<span id="dl-st-' +
    safeId +
    '" class="text-[9px]"></span>' +
    '</div>' +
    '<div class="flex gap-1.5">' +
    '<input type="file" id="dl-file-' +
    safeId +
    '" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" class="flex-1 text-[9px] text-slate-300 file:mr-2 file:px-2 file:py-1 file:rounded-md file:border-0 file:bg-slate-700 file:text-white file:text-[9px] file:font-bold">' +
    '<button type="button" onclick="uploadDriveField(\'' +
    c.idKandidat +
    "', '" +
    c.nama.replace(/'/g, "\\'") +
    "', '" +
    field +
    '\')" class="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[9px] font-black transition flex-shrink-0"><i class="fas fa-upload mr-1"></i> Upload</button>' +
    '</div>' +
    '</div>'
  );
}

function driveSetStatus(id, label, state, msg) {
  var el = document.getElementById('dl-st-' + id);
  if (!el) return;
  if (state === 'uploading')
    el.innerHTML =
      '<span class="text-sky-300"><i class="fas fa-spinner fa-spin mr-0.5"></i> ' +
      tr('ui.file_uploading') +
      '</span>';
  else if (state === 'ok')
    el.innerHTML =
      '<span class="text-emerald-400"><i class="fas fa-check-circle mr-0.5"></i> ' +
      label +
      ' ' +
      tr('ui.file_uploaded') +
      '</span>';
  else if (state === 'fail')
    el.innerHTML =
      '<span class="text-rose-400"><i class="fas fa-times-circle mr-0.5"></i> ' +
      tr('ui.file_failed') +
      '</span>';
}

function driveBacaFileBase64(input) {
  return new Promise(function (resolve) {
    if (!input || !input.files || !input.files[0]) return resolve(null);
    var f = input.files[0];
    var reader = new FileReader();
    reader.onload = function () {
      var dataUrl = reader.result || '';
      var base64 = dataUrl.split(',')[1] || '';
      var mime = (dataUrl.match(/^data:([^;]+);/) || [])[1] || f.type || 'application/octet-stream';
      resolve({ data: base64, name: f.name, mime: mime });
    };
    reader.onerror = function () {
      resolve(null);
    };
    reader.readAsDataURL(f);
  });
}

async function uploadDriveField(idKandidat, nama, field) {
  var safeId = (idKandidat + '_' + field).replace(/[^A-Z0-9_]/gi, '');
  var input = document.getElementById('dl-file-' + safeId);
  // Guard ekstensi: tolak SEBELUM baca base64 (format tak dikenal pasti
  // ditolak backend juga — user dapat toast lebih cepat).
  var extErr = cekEkstensiFile(input);
  if (extErr) {
    showToast(extErr, 'error');
    return;
  }
  var fileData = await driveBacaFileBase64(input);
  if (!fileData) {
    showToast(tr('ui.toast_pick_file_first'), 'error');
    return;
  }
  driveSetStatus(safeId, field, 'uploading');
  var labelNama = { PAS_PHOTO: 'PAS PHOTO', CV: 'CV', JFT: 'JFT', SSW: 'SSW' }[field] || field;
  try {
    const res = await callAPI('uploadDriveReplacement', [
      { idKandidat: idKandidat, nama: nama, label: field, fileData: fileData },
    ]);
    if (res && res.success) {
      driveSetStatus(safeId, labelNama, 'ok');
      showToast(res.field + ' ' + idKandidat + ' terupload ke Storage ✓', 'success');
      // Hapus field dari daftar kandidat (sudah termigrasi)
      var c = DRIVE_CANDIDATES.find(function (x) {
        return x.idKandidat === idKandidat;
      });
      if (c) {
        c.fields = (c.fields || []).filter(function (f) {
          return f !== field;
        });
        if (!c.fields.length)
          DRIVE_CANDIDATES = DRIVE_CANDIDATES.filter(function (x) {
            return x.idKandidat !== idKandidat;
          });
      }
      setTimeout(function () {
        renderMigrasiDriveList();
        muatMigrasiDrive();
      }, 1200);
    } else {
      driveSetStatus(safeId, labelNama, 'fail');
      showToast((res && res.error) || 'Gagal upload', 'error');
    }
  } catch (err) {
    driveSetStatus(safeId, labelNama, 'fail');
    showToast(tr('ui.toast_network_upload_error'), 'error');
  }
}

// === FUNGSI SIMPAN PENGUMUMAN BERJALAN ===
async function simpanPengumuman() {
  let teks = document.getElementById('input-pengumuman').value;
  let btn = event.currentTarget;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> ' + tr('ui.saving') + '';
  btn.disabled = true;

  try {
    const res = await callAPI('updateSysConfig', ['pengumuman', [teks], currentAdminName]);
    if (res.success) {
      showToast(tr('ui.toast_marquee_updated'), 'success');
      // Update langsung di layar Admin
      if (teks.trim()) {
        document.getElementById('marquee-text').innerText = teks;
        document.getElementById('global-announcement').classList.remove('hidden');
      } else {
        document.getElementById('global-announcement').classList.add('hidden');
      }
    } else {
      showToast(tr('ui.toast_failed_prefix') + res.error, 'error');
    }
  } catch (err) {
    showToast(tr('ui.toast_network_error'), 'error');
  } finally {
    btn.innerHTML = '<i class="fas fa-save mr-1"></i> ' + tr('ui.save_publish') + '';
    btn.disabled = false;
  }
}
