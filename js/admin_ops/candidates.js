// MODUL BARU (Fase 2 REFACTOR_TODO.md): js/11_admin_ops.js dipecah per domain →
// js/admin_ops/{schedule,candidates,sysconfig,loading,migration,drive}.js.
// Body fungsi byte-identik dari 11_admin_ops.js — perilaku tidak berubah.
// ==========================================
// LIST KANDIDAT PER JOB & UNDANGAN GRUP + CEK DATA SISWA
// ==========================================

export async function bukaModalListKandidat(code) {
  if (typeof window.ensureAllCandidates === 'function') {
    try {
      await window.ensureAllCandidates();
    } catch (e) {}
  }
  var job = window.ALL_DB_JOBS.find((j) => j.code === code);
  var cands = window.ALL_CANDIDATES.filter((c) => c.idLoker && c.idLoker.includes(code));
  if (!job) return;
  window.safeSet('list-job-code', code);
  var html = '';
  var txt = '*LIST KANDIDAT JOB ' + code + '* Total: ' + cands.length + ' Pelamar \n\n';

  if (cands.length === 0) {
    html = '<div class="text-center text-slate-500 py-4">' + window.tr('ui.no_applicants') + '</div>';
    txt += window.tr('ui.no_candidates_empty');
  } else {
    cands.forEach((c, i) => {
      html += `<div class="p-3 bg-black/40 border border-slate-700 rounded-lg flex justify-between items-center mb-2">
                        <div class="font-bold text-white text-xs">${i + 1}. ${window.esc(c.nama)}</div>
                        <div class="flex items-center gap-2">
                        <button onclick="bukaDigitalCV('${window.escJs(c.idKandidat)}')" aria-label="' + window.tr('ui.peek_cv') + '" class="w-7 h-7 flex items-center justify-center bg-sky-900/50 hover:bg-sky-600 text-sky-400 hover:text-white rounded-full transition shadow" title="' + window.tr('ui.peek_cv') + '"><i class="fas fa-eye text-xs"></i></button>
                        <button onclick="keluarkanKandidatDariJob('${window.escJs(c.wa)}', '${window.escJs(code)}')" class="px-2 py-1 bg-red-900/40 hover:bg-red-600 text-red-400 hover:text-white rounded text-[10px] font-bold transition shadow" title="' + window.tr('ui.remove_from_job') + '">Gagal</button>
                        </div></div>`;
      txt += i + 1 + '. ' + c.nama + ' - WA: ' + c.wa + '\n';
    });
  }
  var lc = document.getElementById('list-kandidat-content');
  if (lc) lc.innerHTML = html;
  window.currentCopyListTxt = txt;
  document.getElementById('modal-list-kandidat').classList.remove('hidden');
}

export async function keluarkanKandidatDariJob(wa, jobCode) {
  if (
    !confirm(
      'Keluarkan kandidat ini dari Job ' +
        jobCode +
        '?\n(Data tidak dihapus, hanya merubah statusnya menjadi Gagal & hapus job code)',
    )
  )
    return;
  try {
    const res = await window.callAPI('tandaiGagalJob', [wa, jobCode]);
    if (res.success) {
      window.showToast(window.tr('ui.toast_cand_removed_job'), 'success');
      document.getElementById('modal-list-kandidat').classList.add('hidden');
      // PATCH-IN-PLACE: backend mengembalikan kandidat & baris mail hasil
      // update — timpa di memori + render ulang, tanpa tarik ulang getAppData.
      window.upsertCandidateMemory(res.candidate);
      if (res.form) window.patchFormMail(res.form.rowIndex, res.form);
      if (typeof window.renderAdminFull === 'function') window.renderAdminFull();
    } else window.showToast(window.tr('ui.toast_error_prefix') + res.error, 'error');
  } catch (err) {
    window.showToast(window.tr('ui.toast_network_error'), 'error');
  }
}

export async function mulaiKirimUndanganGrup() {
  let linkGrup = document.getElementById('input-link-grup').value;
  let interval = parseInt(document.getElementById('input-interval').value) || 5;
  let jobCode = document.getElementById('list-job-code').innerText;

  if (!linkGrup) {
    window.showToast(window.tr('ui.toast_group_link_required'), 'error');
    return;
  }

  if (typeof window.ensureAllCandidates === 'function') {
    try {
      await window.ensureAllCandidates();
    } catch (e) {}
  }
  let cands = window.ALL_CANDIDATES.filter((c) => c.idLoker && c.idLoker.includes(jobCode));
  if (cands.length === 0) {
    window.showToast(window.tr('ui.toast_no_cand_in_job'), 'error');
    return;
  }

  let btn = document.getElementById('btn-undang-grup');
  btn.innerHTML = window.tr('ui.sending');
  btn.disabled = true;

  // Loop client-side per kandidat (kirimSatuPesanFonnte) diganti satu
  // panggilan server: kirimTawaranMassal (whatsapp.ts). Jeda antar pesan
  // dikirim sebagai parameter `interval` supaya pacing user dihormati.
  // Pesan default server = "gabung ke Grup Resmi" (sama seperti dulu).
  try {
    const res = await window.callAPI('kirimTawaranMassal', [
      { candidates: cands, jobCode: jobCode, linkGrup: linkGrup, interval: interval },
    ]);
    const results = (res && res.results) || [];
    const successCount = results.filter((r) => r.success).length;
    window.showToast(window.tr('ui.toast_invites_done_n').replace('{n}', successCount), 'success');
  } catch (e) {
    window.showToast(window.tr('ui.toast_invite_send_failed') + (e && e.message ? e.message : e), 'error');
  }

  btn.innerHTML = window.tr('ui.start_send_invite');
  btn.disabled = false;
}

// === FUNGSI BUKA MODAL CEK DATA SISWA ===
export async function bukaModalCekDataSiswa() {
  const loader = document.getElementById('global-loader');
  if (loader) loader.style.display = 'flex';

  try {
    const res = await window.callAPI('getDaftarSiswaBaru', []);
    if (res.success) {
      let tb = document.getElementById('tbody-cek-siswa');
      let html = '';

      if (res.data.length === 0) {
        html =
          '<tr><td colspan="4" class="p-8 text-center text-slate-500 font-bold italic">' +
          window.tr('ui.no_students') +
          '</td></tr>';
      } else {
        res.data.forEach((s, i) => {
          const gRaw = String(s.jenis_kelamin || s.gender || '')
            .trim()
            .toUpperCase();
          let gBadge;
          if (gRaw === 'L' || gRaw.includes('LAKI') || gRaw === 'PRIA' || gRaw === 'MALE') {
            gBadge =
              '<span class="w-6 h-6 rounded-full bg-blue-900/50 text-blue-400 flex items-center justify-center font-bold text-[10px] mx-auto border border-blue-500/30">L</span>';
          } else if (
            gRaw === 'P' ||
            gRaw.includes('PEREMPUAN') ||
            gRaw === 'WANITA' ||
            gRaw === 'FEMALE'
          ) {
            gBadge =
              '<span class="w-6 h-6 rounded-full bg-pink-900/50 text-pink-400 flex items-center justify-center font-bold text-[10px] mx-auto border border-pink-500/30">P</span>';
          } else {
            gBadge =
              '<span class="w-6 h-6 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center font-bold text-[10px] mx-auto border border-slate-600/50" title="Gender belum diisi">&mdash;</span>';
          }

          html += `<tr class="hover:bg-white/5 transition duration-200">
                            <td class="p-3 text-center text-slate-400 text-xs">${i + 1}</td>
                            <td class="p-3 font-bold text-white text-xs">${window.esc(s.nama_lengkap || s.nama)}</td>
                            <td class="p-3 align-middle">${gBadge}</td>
                            <td class="p-3 text-xs text-amber-300 font-medium"><i class="fas fa-map-marker-alt text-red-400 mr-1.5"></i>${window.esc(s.alamat_lengkap || '-')}</td>
                        </tr>`;
        });
      }
      tb.innerHTML = html;
      document.getElementById('modal-cek-siswa').classList.remove('hidden');
    } else {
      window.showToast(window.tr('ui.toast_load_data_failed_prefix') + res.error, 'error');
    }
  } catch (err) {
    window.showToast(window.tr('ui.toast_network_error_prefix') + err.message, 'error');
  } finally {
    if (loader) loader.style.display = 'none';
  }
}


// BRIDGE ESM → classic (bundel): alias window.* utk pemakai lintas file /
// HTML inline onclick (render/admin.js bukaModalListKandidat, partials
// mulaiKirimUndanganGrup, admin/index bukaModalCekDataSiswa, tombol
// keluarkanKandidatDariJob di daftar).
window.bukaModalListKandidat = bukaModalListKandidat;
window.keluarkanKandidatDariJob = keluarkanKandidatDariJob;
window.mulaiKirimUndanganGrup = mulaiKirimUndanganGrup;
window.bukaModalCekDataSiswa = bukaModalCekDataSiswa;
