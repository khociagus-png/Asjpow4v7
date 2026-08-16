// 9. INTERAKSI BACKEND (NETLIFY FUNCTIONS + SUPABASE) — DOMAIN MAIL INBOX
// ==========================================
// MODUL BARU (Fase 2 REFACTOR_TODO.md): js/07_api.js dipecah per domain →
// js/api/{forms,jobs,candidates,wa}.js (global scope TETAP di fase ini).
// File ini: aksi mail/form (review/approve/reject/delete/tandai dibaca) +
// patch-in-place di memori (ALL_FORM / ALL_CANDIDATES / MAIL_SELECTED).
// Body fungsi byte-identik dari 07_api.js — perilaku tidak berubah.
// REFACTOR: semua interaksi backend kini async/await + try/catch/finally.
// Pola lama .then().catch() diganti blok try/finally supaya loader dan
// tombol tidak pernah terkunci, dan error terpusat di satu tempat.
// ===== PATCH-IN-PLACE (aksi admin tanpa tarik ulang data penuh) =====
// Backend kini mengembalikan baris yang berubah (form/candidate) per aksi.
// Frontend cukup menimpa data di memori lalu render tabel aktif SAJA —
// tanpa global-loader/skeleton. Tarikan penuh (getAppData) tetap berjalan
// diam-diam lewat AUTO_REFRESH_TIMER (60 dtk) untuk menangkap perubahan
// dari admin lain, jadi data tidak pernah basi dalam waktu lama.
function patchFormMail(rowIndex, newForm) {
  if (!newForm) return;
  var i = Number(rowIndex);
  // Data bisa saja sudah bergeser karena aksi admin lain (auto-refresh
  // berjalan di latar) — fallback cari by id sebelum menimpa.
  if (i >= 0 && i < ALL_FORM.length && ALL_FORM[i] && ALL_FORM[i].id === newForm.id) {
    ALL_FORM[i] = newForm;
  } else {
    var found = -1;
    for (var k = 0; k < ALL_FORM.length; k++) {
      if (ALL_FORM[k] && ALL_FORM[k].id === newForm.id) {
        found = k;
        break;
      }
    }
    if (found >= 0) ALL_FORM[found] = newForm;
    else ALL_FORM.push(newForm);
  }
  if (typeof renderFormInbox === 'function') renderFormInbox();
  if (typeof updateMailBadge === 'function') updateMailBadge();
}
// Upsert kandidat hasil approve/reject ke memori — tab DB JOB & daftar
// kandidat langsung benar saat admin pindah tab (tanpa refetch).
function upsertCandidateMemory(cand) {
  if (!cand || !cand.wa) return;
  var found = -1;
  for (var k = 0; k < ALL_CANDIDATES.length; k++) {
    if (ALL_CANDIDATES[k] && ALL_CANDIDATES[k].wa === cand.wa) {
      found = k;
      break;
    }
  }
  if (found >= 0) ALL_CANDIDATES[found] = cand;
  else ALL_CANDIDATES.push(cand);
}
// Hapus baris mail di memori + render ulang (dipakai hapus tunggal).
function removeFormMail(rowIndex) {
  var i = Number(rowIndex);
  if (i >= 0 && i < ALL_FORM.length) ALL_FORM.splice(i, 1);
  // Indeks di atas baris yang dihapus bergeser → seleksi massal tidak valid.
  MAIL_SELECTED = {};
  if (typeof renderFormInbox === 'function') renderFormInbox();
  if (typeof updateMailBadge === 'function') updateMailBadge();
}
async function prosesReviewForm(r) {
  if (!confirm(tr('form.txt_review_confirm'))) return;
  try {
    const res = await callAPI('reviewForm', [r, currentAdminName]);
    if (res.success) {
      // Auto-centang baris yang sudah diproses (memudahkan hapus massal).
      MAIL_SELECTED[r] = true;
      patchFormMail(r, res.form);
    } else showToast(tr('alert.failed') + ' ' + (res.error || ''), 'error');
  } catch (err) {
    showToast(tr('alert.network') + (err && err.message ? err.message : err), 'error');
  }
}
async function prosesApproveForm(r) {
  if (!confirm(tr('form.txt_approve_confirm'))) return;
  try {
    const res = await callAPI('approveForm', [r, currentAdminName]);
    if (res.success) {
      // Auto-centang baris yang sudah diproses (memudahkan hapus massal).
      MAIL_SELECTED[r] = true;
      patchFormMail(r, res.form);
      upsertCandidateMemory(res.candidate);
    } else showToast(tr('alert.failed') + ' ' + (res.error || ''), 'error');
  } catch (err) {
    showToast(tr('alert.network') + (err && err.message ? err.message : err), 'error');
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
  try {
    const res = await callAPI('rejectForm', [r, currentAdminName, reason]);
    if (res.success) {
      // Auto-centang baris yang sudah diproses (memudahkan hapus massal).
      MAIL_SELECTED[r] = true;
      patchFormMail(r, res.form);
      upsertCandidateMemory(res.candidate);
    } else showToast(tr('alert.failed') + ' ' + (res.error || ''), 'error');
  } catch (err) {
    showToast(tr('alert.network') + (err && err.message ? err.message : err), 'error');
  }
};
// Tandai Dibaca — baris status UPDATE (kandidat ubah data) kembali ke
// status aslinya (LULUS/GAGAL/REVIEW) via [[PREV:...]] di feedback_berkas.
async function tandaiDibacaForm(r) {
  try {
    const res = await callAPI('tandaiDibacaForm', [r]);
    if (res.success) {
      MAIL_SELECTED[r] = false;
      patchFormMail(r, res.form);
    } else showToast(tr('alert.failed') + ' ' + (res.error || ''), 'error');
  } catch (err) {
    showToast(tr('alert.network') + (err && err.message ? err.message : err), 'error');
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
    var vis = Array.prototype.filter.call(boxes, function (b) {
      return !b.closest('tr').classList.contains('hidden');
    });
    all.checked =
      vis.length > 0 &&
      vis.every(function (b) {
        return b.checked;
      });
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
  if (ids.length === 0) {
    showToast(tr('ui.select_mail_first'), 'error');
    return;
  }
  if (
    !confirm(
      'Hapus ' + ids.length + ' lamaran terpilih? Data kandidat & master TIDAK ikut terhapus.',
    )
  )
    return;
  var ok = 0;
  var fail = 0;
  // Urutkan menurun supaya splice di memori tidak merusak indeks yang
  // belum diproses (baris di atas yang dihapus ikut bergeser).
  var idList = ids.map(Number).sort(function (a, b) {
    return b - a;
  });
  try {
    for (var i = 0; i < idList.length; i++) {
      try {
        const res = await callAPI('deleteForm', [idList[i]]);
        if (res && res.success) {
          ok++;
          ALL_FORM.splice(idList[i], 1);
        } else fail++;
      } catch (e) {
        fail++;
      }
    }
    MAIL_SELECTED = {};
    showToast(
      'Hapus: ' + ok + ' berhasil' + (fail ? ', ' + fail + ' gagal' : ''),
      fail ? 'error' : 'success',
    );
    if (fail > 0) {
      // Sebagian gagal → indeks server tidak sinkron lagi → tarik ulang penuh.
      refreshDataDinamis('mail');
    } else {
      if (typeof renderFormInbox === 'function') renderFormInbox();
      if (typeof updateMailBadge === 'function') updateMailBadge();
    }
  } catch (err) {
    showToast(tr('alert.network') + (err && err.message ? err.message : err), 'error');
  }
}
async function hapusFormMail(id) {
  if (!confirm(tr('ui.confirm_delete_mail'))) return;
  try {
    const res = await callAPI('deleteForm', [id]);
    if (res.success) removeFormMail(id);
    else showToast(tr('alert.failed') + ' ' + (res.error || ''), 'error');
  } catch (err) {
    showToast(tr('alert.network') + (err && err.message ? err.message : err), 'error');
  }
}
