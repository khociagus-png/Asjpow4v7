// 9. INTERAKSI BACKEND — DOMAIN JADWAL & TUGAS ADMIN (wa)
// ==========================================
// MODUL BARU (Fase 2 REFACTOR_TODO.md): js/07_api.js dipecah per domain →
// js/api/{forms,jobs,candidates,wa}.js (global scope TETAP di fase ini).
// File ini: papan tugas admin (tambah/kerjakan/selesaikan/hapus), jadwal
// (simpan/hapus), & helper memori window.ALL_TUGAS / window.ALL_SCHEDULES — domain
// reminder/agenda yang dikirim lewat WA (Fonnte). Body fungsi byte-identik
// dari 07_api.js — perilaku tidak berubah.
export function renderTugas() {
  var list = document.getElementById('todo-list');
  if (!list) return;
  var html = '';
  window.ALL_TUGAS.forEach((t) => {
    var bg =
      t.status == 'BARU'
        ? 'bg-slate-800'
        : t.status == 'PROSES'
          ? 'bg-amber-900/40 border-amber-500/30'
          : 'bg-emerald-900/30 border-emerald-500/30 opacity-60';
    var btn =
      t.status == 'BARU'
        ? '<button onclick="updateStatusTugas(\'' +
          t.id +
          '\', \'PROSES\')" class="px-3 py-1 bg-amber-600 text-[10px] rounded text-white font-bold">' +
          window.tr('form.txt_kerjakan') +
          '</button>'
        : t.status == 'PROSES'
          ? '<button onclick="updateStatusTugas(\'' +
            t.id +
            '\', \'SELESAI\')" class="px-3 py-1 bg-emerald-600 text-[10px] rounded text-white font-bold">' +
            window.tr('form.txt_selesai') +
            '</button>'
          : '<span class="text-[10px] font-bold text-emerald-400">' +
            window.tr('form.txt_done') +
            '</span>';
    // Tombol hapus tugas (baru ada — dulu papan tugas tidak punya aksi hapus).
    var delBtn =
      '<button onclick="hapusTugasAdmin(\'' +
      t.id +
      '\')" class="px-2.5 py-1.5 bg-slate-700 hover:bg-red-600 text-slate-400 hover:text-white rounded text-[10px] font-bold shadow transition" title="' +
      window.tr('table.delete') +
      '"><i class="fas fa-trash-alt"></i></button>';
    html +=
      '<div class="flex justify-between items-center p-3 rounded-lg mb-2 border border-slate-700 ' +
      bg +
      '"><div><div class="text-xs font-bold text-white">' +
      window.esc(t.task) +
      '</div></div><div class="flex gap-1.5">' +
      btn +
      delBtn +
      '</div></div>';
  });
  if (window.ALL_TUGAS.length === 0)
    html =
      '<div class="text-center text-slate-500 py-6 text-xs font-bold border border-dashed border-slate-700 rounded-xl bg-black/20">Tidak ada tugas baru.</div>';
  list.innerHTML = html;
}
// ===== PATCH-IN-PLACE: JADWAL/TUGAS =====
// Sama seperti mail: backend mengembalikan baris yang berubah, frontend
// menimpa di memori + render ulang dari memori (renderTugas/window.renderJadwal
// = murni DOM, tanpa network/skeleton). Tarikan penuh tetap jalan diam-diam
// lewat AUTO_REFRESH_TIMER (60 dtk) untuk menangkap perubahan admin lain.
export function upsertScheduleMemory(s) {
  if (!s || !s.idJadwal) return;
  var found = -1;
  for (var k = 0; k < window.ALL_SCHEDULES.length; k++) {
    if (
      window.ALL_SCHEDULES[k] &&
      (window.ALL_SCHEDULES[k].idJadwal === s.idJadwal || window.ALL_SCHEDULES[k].id === s.idJadwal)
    ) {
      found = k;
      break;
    }
  }
  if (found >= 0) window.ALL_SCHEDULES[found] = s;
  else window.ALL_SCHEDULES.push(s);
}
export function removeScheduleMemory(id) {
  if (!id) return;
  for (var k = window.ALL_SCHEDULES.length - 1; k >= 0; k--) {
    var s = window.ALL_SCHEDULES[k];
    if (s && (String(s.idJadwal) === String(id) || String(s.id || '') === String(id)))
      window.ALL_SCHEDULES.splice(k, 1);
  }
}
export function upsertTugasMemory(t) {
  if (!t || !t.id) return;
  var found = -1;
  for (var k = 0; k < window.ALL_TUGAS.length; k++) {
    if (window.ALL_TUGAS[k] && (window.ALL_TUGAS[k].id === t.id || window.ALL_TUGAS[k].idTugas === t.id)) {
      found = k;
      break;
    }
  }
  if (found >= 0) window.ALL_TUGAS[found] = t;
  else window.ALL_TUGAS.push(t);
}
export function removeTugasMemory(id) {
  if (!id) return;
  for (var k = window.ALL_TUGAS.length - 1; k >= 0; k--) {
    var t = window.ALL_TUGAS[k];
    if (t && (String(t.id) === String(id) || String(t.idTugas || '') === String(id)))
      window.ALL_TUGAS.splice(k, 1);
  }
}
export async function tambahTugasAdmin() {
  const input = document.getElementById('todo-input');
  if (!input || !input.value.trim()) return;
  // Optimistic UI: kosongkan input langsung, rollback hanya jika gagal.
  const text = input.value.trim();
  input.value = '';
  input.disabled = true;
  try {
    const res = await window.callAPI('tambahTugasBaru', [text, window.currentAdminName]);
    if (!res.success) {
      input.value = text;
      window.showToast(res.error || window.tr('alert.failed'), 'error');
    } else {
      upsertTugasMemory(res.tugas);
      if (typeof renderTugas === 'function') renderTugas();
    }
  } catch (err) {
    input.value = text;
    window.showToast(window.tr('alert.network') + (err && err.message ? err.message : err), 'error');
  } finally {
    input.disabled = false;
  }
}
export async function updateStatusTugas(id, st) {
  try {
    const res = await window.callAPI('setTugasStatus', [id, st, window.currentAdminName]);
    if (res.success) {
      upsertTugasMemory(res.tugas);
      if (typeof renderTugas === 'function') renderTugas();
    } else window.showToast(res.error || 'Gagal update status', 'error');
  } catch (err) {
    window.showToast(window.tr('alert.network') + (err && err.message ? err.message : err), 'error');
  }
}
export async function hapusTugasAdmin(id) {
  if (!confirm('Hapus tugas ini?')) return;
  try {
    const res = await window.callAPI('hapusTugas', [id, window.currentAdminName]);
    if (res.success) {
      removeTugasMemory(id);
      if (typeof renderTugas === 'function') renderTugas();
    } else window.showToast(res.error || 'Gagal hapus tugas', 'error');
  } catch (err) {
    window.showToast(window.tr('alert.network') + (err && err.message ? err.message : err), 'error');
  }
}
export async function prosesHapusJadwal(r) {
  if (!confirm('Hapus Jadwal?')) return;
  try {
    const res = await window.callAPI('hapusJadwal', [r, window.currentAdminName]);
    if (res.success) {
      removeScheduleMemory(r);
      if (typeof window.renderJadwal === 'function') window.renderJadwal();
    } else window.showToast(res.error || 'Gagal hapus jadwal', 'error');
  } catch (err) {
    window.showToast(window.tr('alert.network') + (err && err.message ? err.message : err), 'error');
  }
}

export async function submitJadwal(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-submit-jadwal');
  if (!btn) return;
  btn.innerHTML = window.tr('ui.saving');
  btn.disabled = true;
  document.getElementById('global-loader').style.display = 'flex';
  const data = {
    admin: window.currentAdminName,
    nama: document.getElementById('j-nama').value,
    loker: document.getElementById('j-loker').value || '-',
    waktu: document.getElementById('j-waktu').value.replace('T', ' '),
    lokasi: document.getElementById('j-lokasi').value || '-',
    link: document.getElementById('j-link').value || '-',
    tsk: document.getElementById('j-tsk').value,
    kandidat: '-',
  };
  try {
    const res = await window.callAPI('simpanJadwalBaru', [data]);
    if (res.success) {
      document.getElementById('form-tambah-jadwal').reset();
      document.getElementById('form-jadwal-container').classList.add('hidden');
      upsertScheduleMemory(res.schedule);
      if (typeof window.renderJadwal === 'function') window.renderJadwal();
    } else window.showToast(window.tr('alert.failed') + ' ' + (res.error || ''), 'error');
  } catch (err) {
    window.showToast(window.tr('alert.network') + (err && err.message ? err.message : err), 'error');
  } finally {
    btn.innerHTML = window.tr('button.save_schedule');
    btn.disabled = false;
    document.getElementById('global-loader').style.display = 'none';
  }
}


// BRIDGE ESM → classic (bundel): alias window.* utk pemakai lintas file /
// HTML inline onclick (papan tugas & jadwal admin) + render/admin.js
// (window.renderTugas).
window.renderTugas = renderTugas;
window.tambahTugasAdmin = tambahTugasAdmin;
window.updateStatusTugas = updateStatusTugas;
window.hapusTugasAdmin = hapusTugasAdmin;
window.prosesHapusJadwal = prosesHapusJadwal;
window.submitJadwal = submitJadwal;
