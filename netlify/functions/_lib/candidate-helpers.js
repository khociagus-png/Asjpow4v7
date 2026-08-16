// candidate-helpers.js — helper kandidat SHARED (dipakai lintas domain:
// auth, job, form). Dipisah dari handlers.js (Fase 1.1b) supaya tidak ada
// saling-require antar modul action.
'use strict';

const supabase = require('./supabase');

// Kolom WA yang dikenali di tabel kandidat (urutan prioritas).
const CAND_WA_COLS = ['no_wa', 'wa', 'whatsapp', 'telepon', 'phone', 'no_hp'];

// Cari baris kandidat berdasarkan WA (format fleksibel 0xx / 62xx).
async function findCandidateByWa(wa) {
  const want = supabase.normalizeWa(wa);
  // Jalur cepat: query server-side (filter kolom WA) — tanpa tarik 300 baris.
  const hit = await supabase.findCandidateByWaFiltered(want);
  if (hit !== undefined) return hit;
  // Fallback: scan penuh (skema kolom WA tidak dikenal).
  const found = await supabase.findCandidates();
  return (
    found.rows.find((r) => supabase.normalizeWa(supabase.pick(r, CAND_WA_COLS) || '') === want) ||
    null
  );
}

module.exports = { CAND_WA_COLS, findCandidateByWa };
