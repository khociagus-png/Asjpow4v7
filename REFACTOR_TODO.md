# REFACTOR_TODO.md — Roadmap Modularisasi (LEGACY, ringkas)

> ⚠️ Diringkas 2026-08-17. Fase yang sudah SELESAI (0,1,2,3,4) ada di git history
> file ini. Di bawah hanya **SISA PEKERJAAN TERBUKA** (update 2026-08-17).

## 📋 SISA PEKERJAAN (prioritas rendah — bukan blocker)

### Fase 3.5 — selesaikan jembatan `window.*` → import nyata

- [x] **SELESAI 2026-08-18** — Langkah 6: fasad `PortalBridge` (sentralisasi seam + dispatcher `data-action` + pembersihan alias per-simbol). Gelombang 1: blok alias `helpers_cv.js` (5 simbol) → registry via `js/main.js`. **Gelombang 2 (2026-08-18 lanjutan): alias core ROOT juga ikut registry** — `api-client.js` (callAPI/esc/escJs/resolveSelfUrl) & `i18n.js` (tr/LANG/trOption/dst) kini MURNI ESM, alias dipasang di `js/core/bridge.js` (source `bridge:api-client`/`bridge:i18n`); `pwa.js` (cobaInstallApp/bersihkanDraftLamaBase64) registrasi sendiri via import bridge (source `pwa`). Tidak ada lagi `window.X = X` per-simbol di file core.
- Kriteria terverifikasi: scan `window\.\w+\s*=` di `js/` 112→108 (gelombang 1) · no-undef 0 error · check:globals nol kolisi · 148/148 vitest · **E2E Playwright login-check + upload-check SEMUA LULUS** (Node v22.23.2 kini ter-install di mesin — lihat baris Infra E2E) · bundle `app-216286d90f.js`.

### Fase 4 lanjutan — i18n split per domain

- [x] **SELESAI 2026-08-18** — `i18n/locales/{id,jp}.js` dipecah per domain ke `i18n/locales/{id,jp}/` (15 domain/bahasa: loader, a11y, header, public, status, table, landing, siswa, ui, candidate, admin, button, footer, alert, form — form dipindah dari `i18n/core.js`; binding `public` pakai `publicKeys` karena reserved di strict mode).
- [x] **Lint duplikat lintas file** — `scripts/check-i18n.mjs` (baru, ikut `bun run lint`): tiap fragment 1 export objek berisi 1 domain; domain tidak boleh ada di 2+ file (spread-merge di index.js menimpa diam-diam); set domain id == jp; index.js memuat semua domain. Paritas leaf id↔jp tetap diuji runtime `i18n.test.js`.

### Fase 5 — HTML & partial (SELESAI 2026-08-18)

- [x] **SELESAI** — Ekstrak head/header/footer/social/bottom-nav ke `partials/` (6 partial baru: `head.html` [token `{{ADMIN_SCRIPT}}`], `header.html` [token hamburger/nav margin], `footer.html` + `social.html`, `bottom-nav.html`, `scripts-shared.html` [token `{{PAGE_MODULES}}`/`{{AFTER_PWA}}`]); normalisasi stack `<script>` standalone; style inline (fade-in, print CV, light theme) dipindah → `src/main.css` (light theme kini global, dulu hanya inline di index).
- [x] **Verifikasi** — `build:html` byte-compatible: 7 halaman = snapshot ± marker region ± style removal ± bump `?v=` CSS (`c1e5a9f34b`→`ed681b7b61`), semua byte lain identik; build idempotent (2× = md5 sama).

### Fase 6 — build/tooling (SELESAI 2026-08-18)

- [x] **SELESAI** — `build-js.mjs` pakai daftar modul eksplisit dari import `js/main.js` (`bundleModules()` di module-registry — STACK concat dihapus; bonus: daftar sekarang memuat `js/cloudinary.js` yang dulu tertinggal di STACK); CI diperluas dengan step **e2e:share** (bootstrap server + conditional pada secrets Supabase, di-skip kalau belum dikonfigurasi).

### Backend & keputusan terbuka

- [ ] Pastikan semua modul pakai `supabase.*` helper (bukan fetch mentah).
- [ ] Keputusan entry per halaman standalone (ESM sudah dipilih — dokumentasikan).
- [x] Hapus alias `window.*` per-simbol di `js/` (selesai di Fase 3.5 L6, 2026-08-18).

### Performa opsional (prioritas rendah)

- [ ] Cache admin TTL pendek; cek region Supabase.

### Infra E2E

- [ ] E2E Playwright butuh runtime Node ≥22 — playwright-core macet di Bun/Windows; developer/CI pakai Node ≥22, bukan bun.
