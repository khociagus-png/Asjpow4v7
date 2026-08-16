// actions-diagnostics.js — diagnostik koneksi backend (getAppConfig).
// MODUL BARU (Fase 1.1d REFACTOR_TODO.md) — kode dipindah dari handlers.js,
// perilaku TIDAK berubah. Endpoint ini mengembalikan info SENSITIF (skema DB,
// klasifikasi hash password kandidat, daftar env key) — wajib sesi admin.
'use strict';

const { env, debugFileEnvKeys, debugFileStructure } = require('./env');
const { columnsFromSchema, hasBackend, supabaseJson, supabaseUrl, tablesFromSchema, toText } = require('./db/client');
const { findJobs } = require('./db/jobs');
const { findCandidates } = require('./db/candidates');
const { findAdmins, findSettings } = require('./db/misc');
const { requireAdmin, masterPins } = require('./actions-auth');

async function handleGetAppConfig(sessionToken) {
  // Endpoint ini mengembalikan info SENSITIF (skema DB, klasifikasi hash
  // password kandidat, daftar env key yang terpasang) — wajib sesi admin.
  // Tidak ada halaman publik yang memanggilnya; frontend mengirim token admin.
  const guard = requireAdmin(sessionToken);
  if (guard.error) return guard.error;
  const diag = {
    success: true,
    backend: 'netlify-functions-rebuild',
    supabaseConfigured: hasBackend(),
    supabaseUrlFormat: null,
    supabaseReachable: false,
    supabaseError: null,
    adminPinConfigured: masterPins().length > 0,
    fileEnvKeys: debugFileEnvKeys(),
    fileEnvStructure: debugFileStructure(),
    tables: {},
  };
  if (!hasBackend()) return diag;

  const url = supabaseUrl();
  diag.supabaseUrlFormat = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url)
    ? 'ok'
    : 'tidak valid — harus berbentuk https://<ref>.supabase.co';

  try {
    const spec = await supabaseJson('GET', '', {});
    diag.supabaseReachable = true;
    const names = tablesFromSchema(spec);
    diag.tables.all = names;
    // Kolom per tabel (hanya NAMA kolom — tanpa data).
    const columns = {};
    for (const name of names) {
      columns[name] = columnsFromSchema(spec, name);
    }
    diag.tables.columns = columns;
  } catch (e) {
    diag.supabaseError = String(e.message || e).slice(0, 300);
  }

  const jobs = await findJobs();
  diag.tables.jobs = jobs.table;
  if (jobs.rows[0]) {
    diag.tables.jobsColumns = Object.keys(jobs.rows[0]);
    // Contoh nilai mentah status (data publik lowongan — aman ditampilkan).
    diag.jobStatusSamples = [
      ...new Set(
        jobs.rows
          .slice(0, 20)
          .map(
            (r) =>
              'status=' + toText(r.status) + ' | tahapan=' + toText(r.tahapan),
          ),
      ),
    ].slice(0, 8);
    diag.jobStatusAll = [...new Set(jobs.rows.map((r) => toText(r.status)))].slice(0, 15);
  }

  const cands = await findCandidates();
  diag.tables.candidates = cands.table;
  if (cands.rows[0]) {
    diag.tables.candidatesColumns = Object.keys(cands.rows[0]);
    // Format password kandidat (KLASIFIKASI saja — isi tidak pernah tampil).
    const pw = cands.rows[0].password_kandidat ?? cands.rows[0].password ?? null;
    diag.candidatePassSample =
      pw == null
        ? 'kosong'
        : typeof pw === 'string' && pw.startsWith('$2')
          ? 'bcrypt'
          : 'plaintext';
    diag.candidatePassChanged = cands.rows[0].password_diubah ?? null;
  }

  const admins = await findAdmins();
  diag.tables.admins = admins.table;
  if (admins.rows[0]) diag.tables.adminsColumns = Object.keys(admins.rows[0]);

  const settings = await findSettings();
  diag.tables.settings = settings.table;
  if (settings.rows[0]) {
    diag.tables.settingsColumns = Object.keys(settings.rows[0]);
    // Nama config_type di sys_config (bukan nilai) — untuk menemukan
    // konfigurasi admin/assets/pengumuman.
    diag.sysConfigTypes = [
      ...new Set(settings.rows.map((r) => toText(r.config_type))),
    ].slice(0, 30);
  }

  return diag;
}

module.exports = { handleGetAppConfig };
