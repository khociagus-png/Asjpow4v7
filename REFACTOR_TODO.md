# REFACTOR_TODO.md — Roadmap Modularisasi (LEGACY, ringkas)

> ⚠️ Diringkas 2026-08-17. Fase yang sudah SELESAI (0,1,2,3,4) ada di git history
> file ini. Di bawah hanya **SISA PEKERJAAN TERBUKA** (update 2026-08-17).

## 📋 SISA PEKERJAAN (prioritas rendah — bukan blocker)

### Fase 3.5 — selesaikan jembatan `window.*` → import nyata

- [x] **SELESAI 2026-08-18** — Langkah 6: fasad `PortalBridge` (sentralisasi seam + dispatcher `data-action` + pembersihan alias per-simbol di `js/`). Blok alias terakhir (`helpers_cv.js`: getPath/isGood/makeV/fmtMonthYearJp/mergeArrRiwayat) dipindah ke registry seam via `registerSeamAliases` di `js/main.js` — modul tetap murni (unit-test node tanpa window). Catatan: alias core di ROOT (`api-client.js`, `i18n.js`, `pwa.js`) tetap ada by design — itu lapisan seam yang sudah di-re-export lewat `PortalBridge`.
- Kriteria terverifikasi: scan `window\.\w+\s*=` di `js/` 112→108 menurun · `no-undef` 0 error · `check:globals` nol kolisi · 148/148 vitest · bundle `app-698fbe088a.js` (E2E Playwright butuh node — lihat baris Infra E2E).

### Fase 4 lanjutan — i18n split per domain

- [ ] Pecah `i18n/locales/{id,jp}.js` per domain (`common`, `auth`, `public`, …) + lint key duplikat lintas file.

### Fase 5 — HTML & partial (belum dimulai)

- [ ] Ekstrak head/header/footer/bottom-nav/social ke `partials/`; normalisasi stack `<script>` standalone (`partials/scripts-shared.html`); pindahkan `<style>` inline → `src/`.
- [ ] Verifikasi `build:html` byte-compatible + visual.

### Fase 6 — build/tooling

- [ ] `build-js.mjs` daftar entry/modul eksplisit (hapus STACK concat); sourcemap opsional; CI diperluas (lint+test+build+e2e:share).

### Backend & keputusan terbuka

- [ ] Pastikan semua modul pakai `supabase.*` helper (bukan fetch mentah).
- [ ] Keputusan entry per halaman standalone (ESM sudah dipilih — dokumentasikan).
- [x] Hapus alias `window.*` per-simbol di `js/` (selesai di Fase 3.5 L6, 2026-08-18).

### Performa opsional (prioritas rendah)

- [ ] Cache admin TTL pendek; cek region Supabase.

### Infra E2E

- [ ] E2E Playwright butuh runtime Node ≥22 — playwright-core macet di Bun/Windows; developer/CI pakai Node ≥22, bukan bun.
