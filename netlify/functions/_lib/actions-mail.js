// actions-mail.js — Mail inbox (database_asj_form): review/approve/reject/
// delete/tandai dibaca + sinkronisasi kandidat. MODUL BARU (Fase 1.1c
// REFACTOR_TODO.md) — kode dipindah dari handlers.js, perilaku TIDAK berubah.
'use strict';

const bcrypt = require('bcryptjs');
const supabase = require('./supabase');
const { requireAdmin } = require('./actions-auth');
const { findCandidateByWa } = require('./candidate-helpers');
const { stripRaw } = require('./actions-public');

// Frontend mengirim rowIndex (posisi di array formInbox). Urutan harus sama
// dengan findForms() yang dipakai getAppData.
async function handleFormStatus(rowIndex, status, reason) {
  const idx = Number(rowIndex);
  if (!Number.isInteger(idx) || idx < 0) {
    return { success: false, error: 'Index form tidak valid.' };
  }
  try {
    // Jalur cepat: ambil baris mail di posisi index (urutan timestamp.desc)
    // via query server-side, bukan scan 500 baris inbox.
    let f = await supabase.findFormByIndexFiltered(idx);
    if (f === undefined) {
      const forms = await supabase.findForms();
      f = forms[idx] || null;
    }
    if (!f) return { success: false, error: 'Form tidak ditemukan.' };
    const body = { status };
    if (reason !== null && reason !== undefined) body.keterangan = reason;
    await supabase.supabaseJson('PATCH', 'database_asj_form', {
      query: { id: 'eq.' + f.id },
      body,
      headers: { Prefer: 'return=minimal' },
    });
    // Kandidat masuk list DB JOB HANYA setelah approve (LULUS); Gagal
    // mengeluarkannya. Sebelum approve, kandidat hanya ada di mail.
    try {
      await syncCandidateDariForm(f, status);
    } catch (e) {
      console.error('[form-status] sync candidate:', e && e.message ? e.message : e);
    }
    // PATCH-IN-PLACE: kembalikan baris mail hasil update + baris kandidat yang
    // berubah (LULUS → dibuat/diperbarui, GAGAL → status GAGAL & lepas job)
    // supaya frontend tidak perlu tarik ulang semua data (getAppData) hanya
    // untuk satu aksi — tabel aktif langsung di-render dari respons ini.
    f.status = status;
    if (reason !== null && reason !== undefined) f.keterangan = reason;
    let candidate = null;
    const wa = supabase.normalizeWa(String(f.no_wa || f.wa || ''));
    if (wa) {
      try {
        const row = await findCandidateByWa(wa);
        if (row && row.id !== undefined) {
          candidate = stripRaw([supabase.mapCandidate(row)])[0] || null;
          if (candidate) {
            try {
              await supabase.attachBerkasBio([candidate]);
            } catch (e2) {
              /* best-effort */
            }
          }
        }
      } catch (e3) {
        /* best-effort: frontend tetap dapat baris mail */
      }
    }
    return { success: true, form: supabase.mapForm(f, idx), candidate };
  } catch (e) {
    return { success: false, error: 'Gagal proses form: ' + e.message };
  }
}

// nextCandidateId — ID kandidat baru ASJ<max+1> (salinan dari actions-extra).
async function nextCandidateId() {
  // Jalur cepat: ambil id_kandidat tertinggi via query server-side.
  const fastMax = await supabase.maxCandidateIdNumber();
  if (fastMax !== undefined) return 'ASJ' + String(fastMax + 1).padStart(5, '0');
  // Fallback: scan penuh.
  const found = await supabase.findCandidates();
  let max = 0;
  for (const r of found.rows) {
    const m = String(supabase.pick(r, ['id_kandidat', 'id']) || '').match(/ASJ(\d+)/i);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return 'ASJ' + String(max + 1).padStart(5, '0');
}

// Approve (LULUS) → buat/perbarui database_candidate dengan id_loker_pilihan =
// code_job supaya kandidat muncul di list DB JOB. Reject (GAGAL) → status GAGAL
// + lepas dari job. Data diambil dari baris mail (form lamaran).
async function syncCandidateDariForm(f, status) {
  const wa = supabase.normalizeWa(String(f.no_wa || f.wa || ''));
  const codeJob = String(f.code_job || '');
  if (!wa) return;
  const row = await findCandidateByWa(wa);
  if (status === 'LULUS') {
    const now = new Date().toISOString();
    const base = {
      nama_lengkap: String(f.nama_lengkap || ''),
      gender: String(f.gender || ''),
      usia: String(f.usia || ''),
      tb: String(f.tb || ''),
      bb: String(f.bb || ''),
      pas_photo: f.pas_photo || '',
      jft: f.jft || '',
      ssw: f.ssw || '',
      file_cv: f.file_cv || '',
      status_kandidat: 'LULUS',
      updated_at: now,
    };
    if (codeJob) base.id_loker_pilihan = codeJob;
    if (row && row.id !== undefined) {
      for (const k of Object.keys(base)) if (base[k] === undefined) delete base[k];
      await supabase.supabaseJson('PATCH', 'database_candidate', {
        query: { id: 'eq.' + row.id },
        body: base,
        headers: { Prefer: 'return=minimal' },
      });
    } else if (codeJob) {
      // Belum ada baris kandidat → buat dari data mail (password default = 4
      // digit terakhir WA, sama seperti alur daftar).
      base.id_kandidat = await nextCandidateId();
      base.no_wa = wa;
      base.password_kandidat = bcrypt.hashSync(wa.slice(-4), 10);
      base.password_diubah = false;
      base.tahapan_seleksi = 'LIST';
      base.tanggal_daftar = now;
      base.created_at = now;
      base.updated_at = now;
      await supabase.supabaseJson('POST', 'database_candidate', {
        body: base,
        headers: { Prefer: 'return=minimal' },
      });
    }
  } else if (status === 'GAGAL' && row && row.id !== undefined) {
    const upd = { status_kandidat: 'GAGAL', updated_at: new Date().toISOString() };
    if (codeJob && String(supabase.pick(row, ['id_loker_pilihan', 'id_loker']) || '') === codeJob) {
      upd.id_loker_pilihan = null;
    }
    await supabase.supabaseJson('PATCH', 'database_candidate', {
      query: { id: 'eq.' + row.id },
      body: upd,
      headers: { Prefer: 'return=minimal' },
    });
  }
}

async function handleReviewForm(payload, sessionToken) {
  const guard = requireAdmin(sessionToken);
  if (guard.error) return guard.error;
  return handleFormStatus((payload || [])[0], 'REVIEW ADMIN', undefined);
}

async function handleApproveForm(payload, sessionToken) {
  const guard = requireAdmin(sessionToken);
  if (guard.error) return guard.error;
  return handleFormStatus((payload || [])[0], 'LULUS', undefined);
}

async function handleRejectForm(payload, sessionToken) {
  const guard = requireAdmin(sessionToken);
  if (guard.error) return guard.error;
  const [, , reason] = payload || [];
  return handleFormStatus((payload || [])[0], 'GAGAL', reason || 'Lamaran ditolak');
}

async function handleDeleteForm(payload, sessionToken) {
  const guard = requireAdmin(sessionToken);
  if (guard.error) return guard.error;
  const idx = Number((payload || [])[0]);
  if (!Number.isInteger(idx) || idx < 0) {
    return { success: false, error: 'Index form tidak valid.' };
  }
  try {
    // Jalur cepat: ambil baris mail di posisi index via query server-side.
    let f = await supabase.findFormByIndexFiltered(idx);
    if (f === undefined) {
      const forms = await supabase.findForms();
      f = forms[idx] || null;
    }
    if (!f) return { success: false, error: 'Form tidak ditemukan.' };
    await supabase.supabaseJson('DELETE', 'database_asj_form', {
      query: { id: 'eq.' + f.id },
      headers: { Prefer: 'return=minimal' },
    });
    return { success: true, rowIndex: idx };
  } catch (e) {
    return { success: false, error: 'Gagal hapus form: ' + e.message };
  }
}

// Tandai Dibaca — baris status UPDATE (kandidat ubah data setelah lamaran
// pernah diproses admin) kembali ke status aslinya. Status lama disimpan di
// feedback_berkas sebagai "[[PREV:LULUS]] ..." saat UPDATE diset; tanpa
// marker (data lama) → kembali ke antrean MENUNGGU.
async function handleTandaiDibacaForm(payload, sessionToken) {
  const guard = requireAdmin(sessionToken);
  if (guard.error) return guard.error;
  const idx = Number((payload || [])[0]);
  if (!Number.isInteger(idx) || idx < 0) {
    return { success: false, error: 'Index form tidak valid.' };
  }
  try {
    // Jalur cepat: ambil baris mail di posisi index via query server-side.
    let f = await supabase.findFormByIndexFiltered(idx);
    if (f === undefined) {
      const forms = await supabase.findForms();
      f = forms[idx] || null;
    }
    if (!f) return { success: false, error: 'Form tidak ditemukan.' };
    const fb = String(f.feedback_berkas || '');
    const m = fb.match(/\[\[PREV:([^\]]+)\]\]/);
    const prevStatus = m ? m[1].trim() : 'MENUNGGU';
    const newFb = fb.replace(/\[\[PREV:[^\]]+\]\]\s*/, '').trim();
    await supabase.supabaseJson('PATCH', 'database_asj_form', {
      query: { id: 'eq.' + f.id },
      body: { status: prevStatus, feedback_berkas: newFb, updated_at: new Date().toISOString() },
      headers: { Prefer: 'return=minimal' },
    });
    f.status = prevStatus;
    f.feedback_berkas = newFb;
    return { success: true, form: supabase.mapForm(f, idx) };
  } catch (e) {
    return { success: false, error: 'Gagal tandai dibaca: ' + e.message };
  }
}

module.exports = {
  handleReviewForm,
  handleApproveForm,
  handleRejectForm,
  handleDeleteForm,
  handleTandaiDibacaForm,
};
