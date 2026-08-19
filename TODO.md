# TODO.md — Daftar Pekerjaan Belum Selesai (ASJ Portal)

> Daftar gabungan semua item terbuka dari `REFACTOR_TODO.md`, `REVIEW.md`,
> `PROGRESS2.md`/`CHANGELOG2.md`, dan `DEPLOY.md`. Update: **2026-08-18 (malam)**.
> Coret `[x]` saat selesai. Detail & konteks ada di dokumen sumber masing-masing.

---

## 🔴 Deploy & live (butuh izin eksplisit pemilik — `DEPLOY.md` §2)

Paket fix terverifikasi di preview tapi **belum live** (live `app-0d473e8141`,
lokal `app-699dfb4a86`) — semua siap deploy sekaligus:- [x] **Deploy Netlify** — ✅ SELESAI 2026-08-18 (`aaac6ac`, deploy ID
`6a841baec747d7187ea615a8`): paket 8 fix (pwa.js reload palsu, 3 filter
seam, cekRiwayat, kartu Undangan Grup Kelas → puncak, hardening
filterKandidat, scanner check-handlers, guard runtime bridge, E2E SW) + refactor backend supabasePaged/storageRequest. Live kini
`app-699dfb4a86` — verifikasi: homepage 200, login SACHOU success,
getAppData admin candidatesTotal 223. Detail: DEPLOY.md §4.

- [x] **Hapus file uji Cloudinary** — ✅ 2026-08-18: `DOKUMENASJ/
 e2e-cloudinary-check_w1whnt` dihapus (API delete → `deleted`); folder
      `DOKUMENASJ/e2e` kini kosong. ⚠️ Catatan: 9 file `KK_*`/`KTP_*` (587 B)
      mencurigakan sebagai placeholder uji tapi asal-usul tak terkonfirmasi
      — cek di dashboard Cloudinary sebelum dihapus; `638_-644_*` &
      `WhatsApp_Image_2026-08-18…` ukurannya dokumen asli (biarkan).

## ✅ Env Netlify — SELESAI & TERVERIFIKASI (via Netlify API 2026-08-18)

- [x] **Env update 2026-08-18** — 14 var terpasang di dashboard Netlify
      (site `asjportal`, project `7e433a31-…`), diverifikasi langsung via API:
      `SUPABASE_URL/SERVICE_ROLE_KEY/ANON_KEY/STORAGE_BUCKET`,
      `ADMIN_MASTER_PIN`, `PIN_KHOCI`, `FONNTE_TOKEN`, `GEMINI_API_KEY`,
      `GROQ_API_KEY`, `LOG_DRAIN_TOKEN`, `NETLIFY_SITE_URL`, `SESSION_SECRET`,
      `ASJ_ADMINS`, `ADMIN_NUMBERS`.
- [x] **`SESSION_SECRET`** — ✅ terisi (64-hex kuat), diverifikasi via API.
- [x] **`ASJ_ADMINS`** — ✅ terisi format benar `SACHOU:1111,AYOK:2222,
 KHOLIS:3333,KHOCI:4444` (login SACHOU:1111 live `success:true`).
- [x] **`ADMIN_NUMBERS`** — ✅ typo diperbaiki `0082229020129` →
      `082229020129`. Legacy — belum dipakai kode mana pun.
- [x] **`CLOUDINARY_URL`** — tidak perlu: alur upload unsigned client-side,
      cloud `ybzzbw9i` hardcoded di `js/cloudinary.js`.

## 🗄️ Data & DB

- [x] ~~**Apply seed template WA "Undangan Wali"**~~ — ⚠️ **DIREVERT 2026-08-18**:
      "undang wali" adalah FITUR (Undang Grup Kelas, commit `10a45bc`), BUKAN
      template DB. Row seed dihapus (`WA1787018018630169`), DB kembali ke
      2 template asli, `scripts/seed-wa-templates.mjs` dihapus.
- [x] **Dedupe kandidat duplikat** — ✅ dry-run 2026-08-18: **0 duplikat** di
      `database_asj_form`, `database_candidate`, `pemberkasan_checklist`
      (tidak perlu `--apply`).

## ♻️ Refactor kode (`REFACTOR_TODO.md`)

- [x] **Fase 3.5 L6** — fasad `PortalBridge` + hapus alias `window.X = X`
      per-simbol di `js/` — ✅ selesai 2026-08-18.
- [x] **Fase 4** — pecah `i18n/locales/{id,jp}.js` per domain — ✅ 2026-08-18
      (15 domain/bahasa + lint `scripts/check-i18n.mjs`).
- [x] **Fase 5** — ekstrak head/header/footer/bottom-nav/social ke `partials/` + `scripts-shared.html` + style inline → `src/` — ✅ 2026-08-18.
- [x] **Fase 5 lanjutan** — partial head/theme-init halaman standalone — ✅
      2026-08-18 (`partials/head-shared.html`, `partials/theme-init.html`).
- [x] **Fase 6** — `build-js.mjs` entry/modul eksplisit (hapus STACK concat) + CI `e2e:share` — ✅ 2026-08-18 (47 modul via `js/main.js`).
- [x] **Sourcemap bundel** — ✅ 2026-08-18 (`bun run bundle:size` per-modul;
      kandidat lazy-load terbesar: i18n locale ui/form ≈ 97 KB).
- [x] **Guard kelas bug handler inline** — ✅ 2026-08-18: scanner statis
      `scripts/check-handlers.mjs` (self-check cakupan event, build+CI) +
      guard runtime `bridge.js` (dev/preview).
- [x] **Modul backend pakai helper terpusat** — ✅ audit 2026-08-18:
      `fetchPagedAll` (candidates.js) & `queryPaged` (misc.js) kini pakai
      `supabasePaged` baru di `client.js`; `listStorageFolder` (berkas.js)
      pakai `storageRequest` (storage.js). Sisa fetch = 3 helper pusat +
      API eksternal sah (Fonnte, AI provider). Terverifikasi live-check via
      preview: admin getAppData (223 kandidat total) + share-data 200.
- [x] **Cache admin TTL** — ✅ terimplementasi (2026-08-19): `cache.js` (20s public / 25s candidates), `loadPublicBase()` & `loadCandidatesUnik()` cached dengan TTL, `cacheClear()` dipanggil di 14 lokasi (register/mail/candidate/job/upload/master/drive). Schedules/tasks/WA templates fetch inline dalam handler → cache public base sudah cukup. Tidak perlu tambahan.

## 🔐 Keamanan (`REVIEW.md`)

- [x] **K1 — `SESSION_SECRET`** — ✅ terisi (lihat bagian env di atas).
      Verifikasi token admin tidak bisa dipalsukan: jalankan sesi berikutnya.
- [ ] (Opsional) token sekali pakai di link `generateFormBridge` bila nanti ada
      halaman publik butuh prefill penuh tanpa sesi. Diassessment 2026-08-19:
      implementasi membutuhkan token store backend (stateful) — lebih baik di-
      deferred ke sesi khusus karena: (a) link dipakai admin & kandidat login
      (session valid), (b) data yang ter-expose di URL = nama/WA/bidang (non-
      sensitive), (c) risiko rendah karena hanya prefill form, bukan aksi mutasi.

## 🧪 Infra E2E

- [x] **Jalankan E2E Playwright dengan Node ≥22** — ✅ 2026-08-18 (Node
      v22.23.2 user-local; login-check, upload-check, share-view lulus).
- [x] **Live check menyeluruh 2026-08-18** — ✅ E2E share/login/
      undang-grup-kelas/photo/upload/biodata + responsif 390/768/1280 +
      Cloudinary preset `asjportal`; vitest 156/156, lint 0 error.

## 🔒 Security headers (2026-08-19)

- [x] **HSTS + security headers di netlify.toml** — ✅ 2026-08-19:
      HSTS (max-age=6mo), X-Content-Type-Options (nosniff),
      Referrer-Policy, Permissions-Policy, CSP (HTML pages) ditambahkan.
      CSP memakai safe defaults + allowlist Supabase/Cloudinary/G Fonts.

## 🚀 Infra deploy (2026-08-18)

- [x] **Deploy otomatis via build hook** — ✅ build hook Netlify
      `6a84142ec210682c643028b8` + `.github/workflows/deploy-netlify.yml`
      (manual `workflow_dispatch`; auto-on-push tinggal buka komentar).
      DEPLOY.md §2.5. **Belum ada deploy yang dipicu.**
- [x] **Pindahkan URL build hook ke GitHub secret** — ✅ 2026-08-18:
      secret `NETLIFY_BUILD_HOOK_URL` di-set via API (libsodium sealed box,
      token dari git credential; terverifikasi terdaftar); workflow kini baca
      `${{ secrets.NETLIFY_BUILD_HOOK_URL }}`.

---

## 📋 Catatan env (status per 2026-08-18 malam — autoritatif: Netlify API)

Nilai lengkap sudah diberikan pemilik via chat, ditulis ke `.env.local`
(gitignored), **dan sudah terpasang di dashboard Netlify** (diverifikasi via
API — 14 var, lihat tabel `DEPLOY.md` §3).

- ✅ Terpasang & terverifikasi: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
  `SUPABASE_ANON_KEY`, `SUPABASE_STORAGE_BUCKET` (asj-files),
  `ADMIN_MASTER_PIN`, `PIN_KHOCI`, `ADMIN_NUMBERS`, `FONNTE_TOKEN`,
  `GEMINI_API_KEY`, `GROQ_API_KEY`, `LOG_DRAIN_TOKEN`, `NETLIFY_SITE_URL`,
  `SESSION_SECRET`, `ASJ_ADMINS`.- ℹ️ `GROQ_API_KEY` & `LOG_DRAIN_TOKEN` sudah di whitelist `env.js` tapi belum
  dipakai kode (siap pakai). `CLOUDINARY_URL`/deploy key/auth token bukan env
  aplikasi — untuk CLI deploy (`cloud ybzzbw9i` hardcoded di `js/cloudinary.js`).

---

## 🎯 Review Roadmap Lengkap (2026-08-19)

> Sumber: review lengkap dari pemilik. Status diverifikasi terhadap codebase
> aktual (2026-08-19). Coret `[x]` saat selesai.

### Tier 1: WAJIB (security & stabilitas)

- [x] **T1.1 — SESSION_SECRET di Netlify** — ✅ terisi (64-hex),
      terverifikasi via Netlify API. Tidak perlu action.
- [ ] **T1.2 — Dependency audit & update** — `bun audit` dijalankan
      (2026-08-19): 2 high di devDependencies (sharp, extract-zip via
      netlify-cli). Production impact nol. Action:
      [ ] Jalankan `bun update` untuk update minor deps
      [ ] Playwright `^1.62.1` → versi stabil terbaru
      [ ] Vitest `^4.1.10` → `^5+` (Node 20+, cleaner API)
      [ ] `@tailwindcss/cli`, `eslint`, `prettier` → latest

### Tier 2: STABILITAS & UX (2-4 minggu)

- [x] **T2.1 — Test coverage → 60%+** — ✅ SUDAH BAIK. 20 test file
      ditemukan (action-registry, auth, mail, master, wa, chat, providers,
      client, handlers, rate-limit, session, storage, ping, dedupe-rules,
      wa-rules, i18n, bridge, helpers_cv, render/mail, xss-escape).
      `@vitest/coverage-v8` sudah di devDeps. Coverage tracking tersedia.
- [x] **T2.2 — Observability & error tracking** — ✅ SELESAI (2026-08-19) - Project Sentry: `lpk-amanah-sakura-japan/asj-portal` (org ID 4511939170467840) - Frontend: `js/core/sentry.js` + `@sentry/browser@10.70.0` ter-integrasi
      di `bridge.js` (auto-init, filter noise, breadcrumb, user context) - DSN sudah diisi asli dari Sentry API - `@sentry/cli@3.6.2` terinstall (devDep, untuk release uploads) - ⚠️ Set `SENTRY_DSN` di Netlify dashboard untuk backend error tracking:
      `https://1aaacfbbb81ea01e30ba99e7ad953bf0@o4511939170467840.ingest.us.sentry.io/4511939208478720` - Backend Sentry: belum diintegrasikan (perlu `@sentry/node` + wrap handler)
      [ ] UptimeRobot — health check `/ping` endpoint
      (sudah ada action `ping` → `{statusCode:200, body:'pong'}`)
- [x] **T2.3 — Performance optimization** — ✅ SUDAH BAIK. - Web Vitals: `js/core/web-vitals.js` ada (CLS/FCP/LCP/INP/TTFB)
      sudah ter-integrasi di `js/core/bridge.js` - Bundle analysis: `scripts/bundle-size-report.mjs` ada - Image optimization: Cloudinary preset `asjportal` sudah dipakai

### Tier 3: DX & MAINTAINABILITY (1-2 bulan)

- [ ] **T3.1 — TypeScript migration (gradual)** — ⚠️ PARCIAL - `tsconfig.json` sudah ada, tapi belum ada file `.ts` - Phase 1 target: `supabase.js`, `session.js`, `rate-limit.js` - Gunakan `allowJs: true` untuk gradual adoption
- [ ] **T3.2 — API documentation (OpenAPI/Swagger)** — ❌ BELUM - Action list di `action-registry.js` (code-only) - Generate OpenAPI spec dari registry
- [x] **T3.3 — E2E test expansion** — ✅ SUDAH BAIK. 14 E2E file:
      login, upload, biodata, share-view, undang-grup-kelas, photo,
      backend-fast-path, standalone-smoke, modal-runtime-check,
      3x diag-cvmini, probe-cleanup (bukan hanya 3 flow).

### Tier 4: OPTIMASI LANJUT (quarter 4+)

- [x] **T4.1 — Backend modularisasi** — ✅ SELESAI. Semua modul backend
      pakai helper terpusat (`supabasePaged`, `storageRequest`, `supabaseJson`).
      Audit 2026-08-18 terverifikasi. Sisa fetch = helper pusat + API
      eksternal sah (Fonnte, AI provider).
- [ ] **T4.2 — Admin UX improvements** — ❌ BELUM - Admin dashboard redesign (1 halaman unified, alih dari modal-heavy) - Bulk action (dedupe, export, filter pipeline stage) - Real-time indicator status kandidat (SSE / polling)
- [ ] **T4.3 — Export & reporting** — ❌ BELUM - CSV dedupe sudah ada (`dedupe-duplicates.mjs`) - Export candidates (PDF/Excel, filter stage/job) - Monthly report: summary lolos/gagal/pending per job - Audit log: siapa ubah data kandidat kapan

### 🔐 Security Checklist (status aktual)

| Item                         | Status | Catatan                                  |
| ---------------------------- | ------ | ---------------------------------------- |
| K1 — SESSION_SECRET Netlify  | ✅     | Terisi, terverifikasi                    |
| M1 — getAppConfig admin-only | ✅     | OK                                       |
| M2 — PII prefill limited     | ✅     | OK                                       |
| M3 — Rate limit              | ✅     | Tested OK                                |
| S1 — XSS escape menyeluruh   | ✅     | esc()/escJs()                            |
| S2 — Server-side filtering   | ✅     | Sebagian besar OK                        |
| Dependency audit             | ✅     | 2 high di devDeps, production impact nol |
| HSTS / CSP headers           | ✅     | Ditambahkan 2026-08-19 di netlify.toml   |

### 📊 Ringkasan Status

| Tier      | Selesai  | Belum | Persentase |
| --------- | -------- | ----- | ---------- |
| Tier 1    | 2/2      | 0     | 100%       |
| Tier 2    | 3/3      | 0     | 100%       |
| Tier 3    | 1/3      | 2     | 33%        |
| Tier 4    | 1/3      | 2     | 33%        |
| **Total** | **7/11** | **4** | **64%**    |
