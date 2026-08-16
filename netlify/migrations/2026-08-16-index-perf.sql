-- =============================================================================
-- 2026-08-16 — Index performa ASJ Portal (Supabase / PostgreSQL)
-- -----------------------------------------------------------------------------
-- Latar belakang: getAppData admin menarik SEMUA baris database_candidate
-- (full scan tanpa limit), mengurutkan 500 baris database_asj_form per
-- timestamp, dan melakukan ILIKE '%kode%' pada id_loker_pilihan. Tanpa index,
-- query tersebut full table scan + sort penuh — beban naik linear seiring
-- tabel tumbuh (penyebab "mulai lambat").
--
-- Cara pakai: buka Supabase → SQL Editor → tempel seluruh file → Run.
-- SEMUA statement idempotent (IF NOT EXISTS) — aman dijalankan ulang.
-- Kalau sebuah statement error "column does not exist" (skema project beda),
-- HAPUS statement itu saja; sisanya tetap aman dijalankan.
--
-- Tidak ada perubahan perilaku aplikasi — murni performa. Bisa dijalankan
-- kapan pun tanpa downtime (PostgreSQL membuat index paralel).
-- =============================================================================

-- 1) Inbox form (database_asj_form)
--    Q2: ORDER BY timestamp DESC LIMIT 500 → index (timestamp DESC) membuat
--        PostgreSQL cukup ambil 500 baris teratas, tanpa sort seluruh tabel.
CREATE INDEX IF NOT EXISTS idx_asj_form_timestamp
  ON database_asj_form (timestamp DESC);

--    Lookup per WA (findFormsByWa, findFormsByWaList — filter no_wa IN ...)
CREATE INDEX IF NOT EXISTS idx_asj_form_no_wa
  ON database_asj_form (no_wa);

--    Lookup per kode job (lamaran per loker)
CREATE INDEX IF NOT EXISTS idx_asj_form_code_job
  ON database_asj_form (code_job);

-- 2) Kandidat (database_candidate)
--    Q1: dedupe+sort by updated_at → index (updated_at DESC) mempercepat
--        ambil halaman terbaru & sort (masih full scan oleh desain, tapi
--        sort tidak lagi dilakukan di memori PostgreSQL).
CREATE INDEX IF NOT EXISTS idx_cand_updated_at
  ON database_candidate (updated_at DESC);

--    Lookup per WA (findCandidateByWaFiltered, attachBerkasBio IN filter)
CREATE INDEX IF NOT EXISTS idx_cand_no_wa
  ON database_candidate (no_wa);

--    Q4: kandidat per job — id_loker_pilihan di-query pakai ILIKE '%kode%'
--        (wildcard KIRI). Index btree TIDAK bisa dipakai; trigram (pg_trgm)
--        memungkinkan GIN index utk pola seperti itu.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_cand_loker_trgm
  ON database_candidate USING gin (id_loker_pilihan gin_trgm_ops);

-- 3) Berkas & bio (batch IN filter di getAppData admin)
CREATE INDEX IF NOT EXISTS idx_berkas_wa
  ON pemberkasan_checklist (wa);

CREATE INDEX IF NOT EXISTS idx_master_no_wa
  ON master_database_candidate (no_wa);

-- =============================================================================
-- VERIFIKASI (jalankan setelah index dibuat)
-- -----------------------------------------------------------------------------
-- 1) Pastikan index benar-benar dipakai (idx_scan naik, seq_scan turun):
--
--    SELECT relname, seq_scan, idx_scan, seq_tup_read
--    FROM pg_stat_user_tables
--    WHERE relname IN ('database_candidate','database_asj_form',
--                      'pemberkasan_checklist','master_database_candidate')
--    ORDER BY seq_scan DESC;
--
-- 2) Cek rencana eksekusi query utama (sebelum vs sesudah index):
--
--    EXPLAIN (ANALYZE, BUFFERS)
--    SELECT id, timestamp, code_job, kategory, nama_lengkap, no_wa, status
--    FROM database_asj_form
--    ORDER BY timestamp DESC LIMIT 500;
--
--    EXPLAIN (ANALYZE, BUFFERS)
--    SELECT id, id_kandidat, nama_lengkap, no_wa, status_kandidat,
--           updated_at, created_at, tanggal_daftar
--    FROM database_candidate
--    ORDER BY updated_at DESC;
--
--    EXPLAIN (ANALYZE, BUFFERS)
--    SELECT * FROM database_candidate
--    WHERE id_loker_pilihan ILIKE '%TG9ASJ%' LIMIT 500;
-- =============================================================================
