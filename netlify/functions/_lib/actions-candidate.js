// actions-candidate.js — kelola kandidat (database_candidate): catatan,
// update super (admin), halaman daftar kandidat. MODUL BARU (Fase 1.1c
// REFACTOR_TODO.md) — kode dipindah dari handlers.js, perilaku TIDAK berubah.
'use strict';

const { normalizeWa, supabaseJson } = require('./db/client');
const { findForms, findFormsByWaList } = require('./db/forms');
const { attachApplications, mapCandidate } = require('./db/candidates');
const { attachBerkasBio } = require('./db/berkas');
const { requireAdmin } = require('./actions-auth');
const { findCandidateByWa } = require('./candidate-helpers');
const { stripRaw, loadCandidatesUnik } = require('./actions-public');
const { cacheClear } = require('./cache');

async function handleUpdateCatatanKandidat(payload, sessionToken) {
  const guard = requireAdmin(sessionToken);
  if (guard.error) return guard.error;
  cacheClear(); // catatan kandidat berubah → buang cache dedupe
  const [id, intNote, extNote] = payload || [];
  if (!id) return { success: false, error: 'ID kandidat tidak ditemukan.' };
  try {
    await supabaseJson('PATCH', 'database_candidate', {
      query: { id_kandidat: 'eq.' + id },
      body: {
        catatan_internal: intNote || '',
        catatan_external: extNote || '',
      },
      headers: { Prefer: 'return=minimal' },
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: 'Gagal simpan catatan: ' + e.message };
  }
}

async function handleUpdateKandidatSuper(payload, sessionToken) {
  const guard = requireAdmin(sessionToken);
  if (guard.error) return guard.error;
  cacheClear(); // data kandidat berubah → buang cache dedupe
  const data = (payload && payload[0]) || {};
  if (!data.wa) return { success: false, error: 'Nomor WA tidak ditemukan.' };
  const body = {
    gender: data.gender !== undefined ? data.gender : undefined,
    usia: data.usia !== undefined ? data.usia : undefined,
    tempat_lahir: data.tempatLahir !== undefined ? data.tempatLahir : undefined,
    tgl_lahir: data.tglLahir !== undefined ? data.tglLahir : undefined,
    tb: data.tb !== undefined ? data.tb : undefined,
    bb: data.bb !== undefined ? data.bb : undefined,
    nilai_jft_text: data.jftText !== undefined ? data.jftText : undefined,
    bidang_ssw_text: data.sswText !== undefined ? data.sswText : undefined,
    // Multi-apply: admin bisa set job utama kandidat (id_loker_pilihan).
    id_loker_pilihan:
      data.idLoker !== undefined && data.idLoker !== null ? String(data.idLoker).trim() : undefined,
  };
  for (const k of Object.keys(body)) if (body[k] === undefined) delete body[k];
  try {
    const row = await findCandidateByWa(data.wa);
    if (!row) return { success: false, error: 'Kandidat tidak ditemukan.' };
    await supabaseJson('PATCH', 'database_candidate', {
      query: { id: 'eq.' + row.id },
      body,
      headers: { Prefer: 'return=minimal' },
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: 'Gagal update kandidat: ' + e.message };
  }
}

async function handleGetCandidatesPage(payload, sessionToken) {
  const guard = requireAdmin(sessionToken);
  if (guard.error) return guard.error;
  const opts = (payload && payload[0]) || {};
  const page = Number(opts.page) || 1;
  const pageSize = Number(opts.pageSize) || 50;
  try {
    // Konsisten dengan getAppData: dedupe GLOBAL by WA lalu slice halaman —
    // ukuran halaman & total selalu dihitung dari baris UNIK. Jalur cepat:
    // baris ringan untuk dedupe+sort, baris penuh hanya untuk halaman ini.
    const { rows: candRows, total } = await loadCandidatesUnik(opts.q || '', {
      page,
      pageSize,
    });
    const cands = stripRaw(candRows.map(mapCandidate));
    await attachBerkasBio(cands);
    // Halaman tambahan juga butuh daftar lamaran per kandidat (multi-apply).
    // Jalur cepat: tarik lamaran hanya untuk WA kandidat di halaman ini
    // (in-filter), bukan scan 500 baris inbox.
    const waList = cands.map((c) => normalizeWa(String(c.wa || ''))).filter(Boolean);
    let allForms = await findFormsByWaList(waList);
    if (allForms === undefined) allForms = await findForms();
    attachApplications(cands, allForms);
    return { success: true, candidates: cands, total };
  } catch (e) {
    return { success: false, error: 'Gagal memuat kandidat: ' + e.message };
  }
}

module.exports = {
  handleUpdateCatatanKandidat,
  handleUpdateKandidatSuper,
  handleGetCandidatesPage,
};
