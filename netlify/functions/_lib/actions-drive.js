// actions-drive.js — drive links & migrasi (admin). MODUL BARU (Fase 1.2
// REFACTOR_TODO.md) — kode dipindah dari actions-extra.js, perilaku TIDAK berubah.
'use strict';

const { pick, supabaseJson } = require('./db/client');
const { findCandidateByIdFiltered, findCandidates, mapCandidate } = require('./db/candidates');
const { requireRole } = require('./actions-auth');
const { uploadBase64 } = require('./storage');
const { FILE_LABEL_COLUMNS, fileLabelKey } = require('./actions-upload');
const { findMasterByWa } = require('./actions-master');
const { cacheClear } = require('./cache');

async function handleGetDriveLinkCandidates(payload, sessionToken) {
  const guard = requireRole(sessionToken, 'admin');
  if (guard.error) return guard.error;
  try {
    const found = await findCandidates();
    const data = found.rows
      .filter((r) =>
        /drive\.google/i.test(
          String(pick(r, ['folder_url', 'folderUrl', 'folder_id']) || ''),
        ),
      )
      .map(mapCandidate);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function handleUploadDriveReplacement(payload, sessionToken) {
  const guard = requireRole(sessionToken, 'admin');
  if (guard.error) return guard.error;
  const d = (payload && payload[0]) || {};
  const idKand = String(d.idKandidat || '');
  const label = String(d.label || '')
    .trim()
    .toUpperCase();
  const f = d.fileData || {};
  if (!idKand || !f.data) return { success: false, error: 'Data tidak lengkap.' };
  cacheClear(); // berkas kandidat diganti (Drive→Storage) → buang cache dedupe
  try {
    const nama = String(d.nama || 'KANDIDAT').toUpperCase();
    const folder = 'master/' + nama.replace(/[^A-Z0-9_-]/g, '_');
    const ext =
      String(f.name || 'file')
        .split('.')
        .pop() || 'jpg';
    const url = await uploadBase64(f.data, folder, (label || 'FILE') + '.' + ext);
    const labelKey = fileLabelKey(label);
    const map = labelKey ? FILE_LABEL_COLUMNS[labelKey] : null;
    // Jalur cepat: cari baris kandidat via query server-side (filter id_kandidat).
    let c = await findCandidateByIdFiltered(idKand);
    if (c === undefined) {
      const found = await findCandidates();
      c =
        found.rows.find((r) => String(pick(r, ['id_kandidat', 'id']) || '') === idKand) ||
        null;
    }
    if (c && c.id !== undefined && map && map.cand) {
      await supabaseJson('PATCH', 'database_candidate', {
        query: { id: 'eq.' + c.id },
        body: { [map.cand]: url },
        headers: { Prefer: 'return=minimal' },
      });
    }
    const m = await findMasterByWa(String(c && c.no_wa ? c.no_wa : ''));
    if (m && m.id !== undefined && map && map.master) {
      await supabaseJson('PATCH', 'master_database_candidate', {
        query: { id: 'eq.' + m.id },
        body: { [map.master]: url },
        headers: { Prefer: 'return=minimal' },
      });
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function handleRunMigration(payload, sessionToken) {
  const guard = requireRole(sessionToken, 'admin');
  if (guard.error) return guard.error;
  try {
    const rows = await supabaseJson('GET', 'meta_rev', {
      query: { select: '*', limit: 10 },
    });
    const cur =
      (Array.isArray(rows) ? rows : []).find((r) => String(r.domain || '') === 'migration') || null;
    await supabaseJson('POST', 'meta_rev', {
      body: {
        domain: 'migration',
        rev: cur ? Number(cur.rev || 0) + 1 : 1,
        updated_at: new Date().toISOString(),
      },
      headers: { Prefer: 'return=minimal' },
    });
    return { success: true, results: [{ id: 'migration', status: 'OK' }], pendingSql: [] };
  } catch (e) {
    return { success: false, error: e.message, results: [], pendingSql: [] };
  }
}

module.exports = {
  handleGetDriveLinkCandidates,
  handleUploadDriveReplacement,
  handleRunMigration,
};
