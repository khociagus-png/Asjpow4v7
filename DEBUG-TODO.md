# DEBUG-TODO.md — Debug Checklist Lengkap Semua Kode ASJ Portal

> **Cara pakai:** Setiap sesi kerja, ambil 1-2 part dari daftar ini. Centang ✅
> yang sudah selesai. Kalau sesi terputus, lanjut dari part berikutnya.
> Update header sesi di bawah setiap kali mulai/mengakhiri sesi.

### Log Sesi

| Tgl        | Pengerja | Part dikerjakan  | Hash commit |
| ---------- | -------- | ---------------- | ----------- |
| 2026-08-20 | Buffy    | A1 api-client.js | pending     |

---

## A. CORE ESM (Foundation)### A1. `api-client.js` (389 baris) — API Bridge ✅ DIVERIFIKASI (2026-08-20)

- [x] Cek semua action di `CANDIDATE_ACTIONS` & `ADMIN_ACTIONS` ada di `action-registry.js` — 77/77 matched
- [x] Cek `NETLIFY_FUNCTIONS` mapping lengkap — semua action punya route
- [x] SWR cache: `CACHEABLE_READS` TTL 5 menit — benar
- [x] SWR invalidation: semua non-read action invalidate cache — benar
- [x] Session attachment: admin priority saat dual login — benar
- [x] `sessionInvalid` handling: toast + clear + reload — benar
- [x] `esc()` dan `escJs()`: tested via `xss-escape.test.js` — benar
- [x] **Audit detail**: `docs/evals/2026-08-20-api-client-debug.md`### A2. `i18n.js` + `i18n/` — Terjemahan ✅ DIVERIFIKASI (2026-08-20)
- [x] `tr()` fallback ke key mentah — benar, tidak crash
- [x] `LANG.id` & `LANG.jp` 1160 keys, parity perfect 1:1
- [x] `trOption()` handle undefined/null + fuzzy matching (emoji, casing)
- [x] `bun run check:i18n` — 0 missing keys, 15 domain
- [x] **Audit detail**: `docs/evals/2026-08-20-i18n-debug.md`### A3. `js/core/bridge.js` (468 baris) — ESM→Legacy Bridge ✅ DIVERIFIKASI (2026-08-20)
- [x] `registerSeamAliases()`: collision guard + idempotent — benar
- [x] `dispatchSeamAction()`: registry + window fallback — benar
- [x] `checkInlineHandlers()`: lazy flush +3detik, preview-only — benar
- [x] `initSentry()`: tidak crash kalau DSN kosong — benar
- [x] `initWebVitals()`: tidak crash di environment tanpa Performance API — benar
- [x] **Audit detail**: `docs/evals/2026-08-20-bridge-debug.md`

### A4. `js/core/sentry.js` + `js/core/sentry-dummy.js` — Error Tracking

- [ ] Cek DSN placeholder sudah diganti (production)
- [ ] Cek filter noise (ResizeObserver, empty rejections)
- [ ] Cek user context (role + WA/name) ter-set saat login
- [ ] Cek breadcrumbs untuk debugging

### A5. `js/init/state.js` (310 baris) — Global State

- [ ] Semua getter/setter berfungsi (tidak ada stale binding)
- [ ] `limitKan` awal = 50 (bukan 10)
- [ ] `AUTO_REFRESH_TIMER` bisa di-cleanup
- [ ] Tidak ada global pollution (cek `bun run check:globals`)

---

## B. FRONTEND — Core Pages

### B1. `js/engine/init.js` (505 baris) — Engine Utama

- [ ] `refreshDataDinamis()`: retry 1x sebelum error toast
- [ ] `initApp()`: pastikan mode admin/kandidat/public switch benar
- [ ] Auto-refresh 30s: pastikan interval cleanup saat logout
- [ ] `visibilitychange` listener: pastikan tidak duplicate
- [ ] Datalist `list-kode-job`: pastikan render 1x saja (bukan 2x)
- [ ] Hash-based routing: pastikan `hashchange` listener berfungsi
- [ ] Session check: pastikan token kosong → clear + reload

### B2. `js/04_auth.js` (319 baris) — Authentication

- [ ] `normalizeWaInput()`: pastikan hanya terima `/^628\d{9,10}$/`
- [ ] `isValidWaInput()`: pastikan reject WA typo
- [ ] Login flow: admin PIN check + kandidat WA+PIN check
- [ ] Session storage: pastikan semua key ter-set/hapus konsisten
- [ ] Auto-login guard: flag login tapi token hilang → clear + reload

### B3. `js/init/nav.js` — Navigation & Logout

- [ ] `logoutApp()`: pastikan `AUTO_REFRESH_TIMER` di-cleanup
- [ ] `logoutApp()`: pastikan semua localStorage key dihapus
- [ ] Mobile nav toggle: pastikan responsive
- [ ] `changePage()`: pastikan page switch benar

### B4. `js/init/theme.js` (291 baris) — Theme System

- [ ] `getSavedTheme()`: fallback ke backend → default 'TOKYO'
- [ ] `applyTheme()`: pastikan tidak error untuk theme unknown
- [ ] CSS class injection: pastikan tidak ada style leak

### B5. `js/init/util.js` (298 baris) — Utilities

- [ ] `showToast()`: pastikan tidak crash di environment tanpa DOM
- [ ] `safeSet()`: pastikan element existence check
- [ ] `populate()`: pastikan handle empty array input
- [ ] `jalankanSemuaSkeleton()`: pastikan skeleton animation berfungsi

---

## C. FRONTEND — Admin Panel

### C1. `js/render/admin.js` (357 baris) — Admin Render

- [ ] `renderAdminFull()`: pastikan sidebar nav berfungsi
- [ ] `adminSwitchTab()`: pastikan `aria-current="page"` ter-set/removed
- [ ] Hash routing: `#kelola`, `#dbjob`, `#mail`, `#pelamar`, dll
- [ ] `syncViewKandidatUi()`: pastikan mode simple/lengkap switch

### C2. `js/render/candidate.js` (930 baris) — Kandidat Table

- [ ] `filterKandidat()`: debounce 250ms berfungsi
- [ ] `filterKandidat()`: NULL guard pada semua field
- [ ] `renderKandidatTable()`: `limitKan` = 50 awal, +25 increment
- [ ] `toggleViewKandidat()`: auto-switch simple mode ≤768px
- [ ] `exportKandidatCsv()`: gender NULL guard (consistent `''`)
- [ ] `showMonthlyReport()`: modal render benar
- [ ] Column filter: debounced 250ms

### C3. `js/render/mail.js` (371 baris) — Mail Inbox

- [ ] `renderFormInbox()`: pagination benar
- [ ] Review/Approve/Reject/Delete: pastikan action ke backend benar
- [ ] Badge notification: count accurate
- [ ] Scroll position: jangan reset saat auto-refresh

### C4. `js/admin_ops/candidates.js` (368 baris) — Admin Candidates

- [ ] Super edit: pastikan `updateKandidatSuper` kirim field lengkap
- [ ] Add candidate manual: pastikan WA normalized
- [ ] Bulk actions: pastikan tidak ada race condition

### C5. `js/admin_ops/drive.js` — Drive Migration

- [ ] `muatMigrasiDrive()`: pastikan banner muncul untuk link Google Drive
- [ ] `uploadDriveReplacement()`: pastikan file terupload ke Storage

### C6. `js/admin_ops/schedule.js` — Schedule Management

- [ ] CRUD jadwal: create/read/delete berfungsi
- [ ] Tugas status: toggle BARU/DONE berfungsi

### C7. `js/admin_ops/sysconfig.js` — System Config

- [ ] `updateSysConfig()`: pastikan admin session ter-attach
- [ ] Preset rincian biaya: CRUD berfungsi

### C8. `js/admin_ops/loading.js` — Loading States

- [ ] Skeleton animation: pastikan tidak flicker
- [ ] Global loader: pastikan show/hide timing benar

### C9. `js/admin_modal/cv.js` (671 baris) — CV Preview Modal

- [ ] `bukaDigitalCV()`: pastikan data lengkap
- [ ] Print/download: pastikan format benar

### C10. `js/admin_modal/dbfilter.js` — DB Filter Modal

- [ ] Filter gender/age/job/tahapan: pastikan filter akurat
- [ ] Export CSV: pastikan semua kolom ter-include

### C11. `js/admin_modal/job.js` — Job Modal

- [ ] Create/Edit job: pastikan field mapped ke `job_database` columns
- [ ] Status change: pastikan `ubahStatusJob` berfungsi

---

## D. FRONTEND — Candidate Features

### D1. `js/03_candidate.js` (801 baris) — Candidate Core

- [ ] Upload flow: sequential retry 3x exponential backoff
- [ ] Upload: skip failed file (jangan kirim undefined URL)
- [ ] `bukaMasterEksternal()`: VIP guard berfungsi
- [ ] Overwrite confirmation: i18n (bukan hardcoded Indonesia)
- [ ] `normalizePhone()`: pastikan return format `628...`

### D2. `js/08_wa_pintar.js` (517 baris) — WA Pintar

- [ ] `bukaModalWaPintar()`: pastikan template list ter-load
- [ ] `kirimSatuPesanFonnte()`: pastikan rate limit 2/min
- [ ] `kirimTawaranMassal()`: pastikan batch processing benar

### D3. `js/10_cv_rirekisho.js` — CV Rirekisho Builder

- [ ] Form fields: pastikan mapped ke master_database
- [ ] PDF generation: pastikan format benar

### D4. `js/10b_cv_builders.js` (496 baris) — CV Builders

- [ ] `buildCVMini()`: pastikan data lengkap
- [ ] `buildCVFull()`: pastikan format konsisten

### D5. `js/12_esign_match.js` (583 baris) — E-Sign & Naitei

- [ ] `bukaModalTtd()`: pastikan tahapan gate berfungsi (regex check)
- [ ] `renderStudentCard()`: pastikan data kandidat lengkap
- [ ] VIP/KELAS guard: pastikan non-VIP di-block

### D6. `js/13_rincian_builder.js` (516 baris) — Rincian Biaya Builder

- [ ] `bukaRincianBiaya()`: pastikan presets ter-load
- [ ] Calculation: pastikan akurat

### D7. `js/cloudinary.js` — Cloudinary Upload

- [ ] `uploadToCloudinary()`: timeout 30s dengan AbortController
- [ ] `uploadToCloudinary()`: retry 3x untuk timeout/network error
- [ ] `uploadToCloudiny()`: 4xx = fatal (jangan retry), 5xx = retry
- [ ] `cloudinaryEndpoint()`: pastikan env var ter-baca

### D8. `js/apply-docs.js` — Apply Documents

- [ ] Document checklist: pastikan semua jenis ter-cover
- [ ] Upload validation: file size + type check

### D9. `js/fcm-client.js` — FCM Push Notifications

- [ ] `requestNotificationPermission()`: pastikan handle denied gracefully
- [ ] Token registration: pastikan `registerFcmToken` action ada

### D10. `js/upload-guard.js` — Upload Guard

- [ ] File size validation: pastikan `MAX_FILE_BYTES` ter-set
- [ ] File type validation: pastikan whitelist benar

---

## E. FRONTEND — AI Features

### E1. `js/ai_copilot/admin.js` — AI Copilot Admin

- [ ] `bukaMasterEksternalAdmin()`: pastikan admin session ter-attach
- [ ] Context loading: pastikan data kandidat lengkap

### E2. `js/ai_copilot/interview.js` — Interview Simulator

- [ ] `bukaSimulatorInterview()`: VIP guard berfungsi
- [ ] Question generation: pastikan AI response di-parse benar

### E3. `js/ai_copilot/parse.js` — AI Response Parser

- [ ] JSON parsing: pastikan handle malformed response
- [ ] Fallback: pastikan ada default response

### E4. `js/ai_copilot/results.js` — AI Results Display

- [ ] `renderAIResults()`: pastikan format rapi
- [ ] Save: pastikan `simpanHasilWawancara` berfungsi

---

## F. FRONTEND — Public Pages

### F1. `js/01_public.js` (622 baris) — Public Dashboard

- [ ] `renderLanguage()`: pastikan toggle ID/JP berfungsi
- [ ] Job listing: pastikan cards render benar
- [ ] Image lazy loading: pastikan `loading="lazy"` + width/height hint

### F2. `js/render/public.js` (308 baris) — Public Render

- [ ] Job cards: pastikan responsive
- [ ] Pengumuman: pastikan marquee berfungsi

### F3. `js/render/share.js` — Share View

- [ ] `renderShareView()`: pastikan data job lengkap

### G4. `js/pages/apply_full.js` (643 baris) — Apply Page

- [ ] Form validation: pastikan semua field required ter-check
- [ ] `submitApply()`: pastikan action ke backend benar
- [ ] Job selection: pastikan datalist berfungsi

### F5. `js/pages/ai_form.js` (1220 baris) — AI Form Page

- [ ] Chat flow: pastikan `processAIChat` action benar
- [ ] VIP guard: pastikan non-VIP di-block
- [ ] Form submission: pastikan `submitDataAsj` berfungsi

### F6. `js/pages/master_full.js` (803 baris) — Master Form

- [ ] Biodata form: pastikan semua field ter-map
- [ ] `submitMasterForm()`: pastikan action ke backend benar

### F7. `js/pages/share.js` (701 baris) — Share Page

- [ ] `renderSharePage()`: pastikan data job lengkap
- [ ] Share link: pastikan URL benar

### F8. `js/pages/siswa_baru.js` (503 baris) — Siswa Baru Page

- [ ] Registration form: pastikan validation benar
- [ ] `submitDaftarSiswa()`: pastikan action ke backend benar

---

## G. BACKEND — Core

### G1. `handlers.js` — Dispatcher Pusat

- [ ] `handleAction()`: pastikan rate limit check untuk semua action
- [ ] `dispatchAction()`: pastikan semua action di ACTION_HANDLERS ada handler-nya
- [ ] `ping` action: pastikan early return SEBELUM rate limit
- [ ] Login lockout: pastikan `rateLimit.fail()` dipanggil saat gagal

### G2. `action-registry.js` — Action Registry

- [ ] Pastikan semua action di `callAPI()` frontend ada di registry
- [ ] Pastikan `LOGIN_ACTIONS`, `AI_ACTIONS`, `FONNTE_ACTIONS` lengkap
- [ ] Jalankan `bun run check:handlers` — pastikan 0 mismatch

### G3. `session.js` — HMAC Session

- [ ] `createToken()`: pastikan payload benar (role, wa, name, kind)
- [ ] `verifyToken()`: pastikan return null untuk token invalid/kadaluarsa
- [ ] `sessionIdentity()`: pastikan format `admin:name` atau `kandidat:wa`

### G4. `rate-limit.js` — Rate Limiter

- [ ] Token bucket: pastikan `check()` return `{ ok, retryAfter }`
- [ ] `fail()`: pastikan lockout counter berfungsi
- [ ] Cleanup: pastikan expired buckets di-cleanup

### G5. `cache.js` — TTL Cache

- [ ] `cacheGet()` / `cacheSet()`: pastikan TTL berfungsi
- [ ] `cacheClear()`: pastikan invalidasi lengkap

### G6. `env.js` — Environment Variables

- [ ] Pastikan whitelist lengkap (tidak ada env var yang di-block)
- [ ] Pastikan secret tidak di-bocorkan di response

---

## H. BACKEND — Domain Actions

### H1. `actions-public.js` (531 baris) — Public Data

- [ ] `handleGetAppData()`: pastikan paralel query berfungsi
- [ ] `handleGetMonthlyReport()`: pastikan admin guard berfungsi
- [ ] `loadCandidatesUnik()`: pastikan dedupe benar
- [ ] `loadPublicBase()`: pastikan cache 20s berfungsi

### H2. `actions-auth.js` (386 baris) — Authentication

- [ ] `handleLoginKandidat()`: pastikan bcrypt compare benar
- [ ] `handleDaftarKandidat()`: pastikan WA normalized
- [ ] `handleCheckAdminMaster()`: pastikan PIN comparison benar
- [ ] `registerFcmToken()`: pastikan token tersimpan

### H3. `actions-job.js` — Job Management

- [ ] `handleSimpanJobBaru()`: pastikan `nextJobCode()` generate unik
- [ ] `handleEditLokerFull()`: pastikan semua field ter-update
- [ ] `handleUbahStatusJob()`: pastikan status transition valid

### H4. `actions-candidate.js` — Candidate Management

- [ ] `handleGetCandidatesPage()`: pastikan pagination benar
- [ ] `handleUpdateKandidatSuper()`: pastikan field lengkap
- [ ] `handleUpdateCatatanKandidat()`: pastikan catatan tersimpan

### H5. `actions-mail.js` (396 baris) — Mail Inbox

- [ ] `handleApproveForm()`: pastikan `syncCandidateDariForm()` benar
- [ ] `handleRejectForm()`: pastikan status di-update
- [ ] `handleDeleteForm()`: pastikan data ter-hapus

### H6. `actions-upload.js` (826 baris) — Upload & Files

- [ ] `handleSubmitApply()`: pastikan application ter-create
- [ ] `handleSimpanBerkasTahapan()`: pastikan file URL tersimpan
- [ ] `handleGetUploadUrls()`: pastikan signed URL valid

### H7. `actions-master.js` (1161 baris) — Master Data

- [ ] `handleSubmitMasterForm()`: pastikan semua field ter-map
- [ ] `handleGetMasterDataByWa()`: pastikan data lengkap
- [ ] `handleSimpanUpdateMaster()`: pastikan partial update benar

### H8. `actions-share.js` — Share View

- [ ] `handleShareData()`: pastikan public access tanpa session
- [ ] `docTypeOf()`: pastikan mapping file type benar

### H9. `actions-wa.js` — WhatsApp (Fonnte)

- [ ] `handleKirimSatuPesanFonnte()`: pastikan rate limit 2/min
- [ ] `handleKirimTawaranMassal()`: pastikan batch processing
- [ ] `handleSimpanWaTemplate()`: pastikan template tersimpan

### H10. `actions-schedule.js` — Schedule & Tasks

- [ ] `handleSimpanJadwalBaru()`: pastikan data lengkap
- [ ] `handleTambahTugasBaru()`: pastikan task tersimpan
- [ ] `handleSetTugasStatus()`: pastikan status toggle

### H11. `actions-config.js` — System Config

- [ ] `handleUpdateSysConfig()`: pastikan admin guard
- [ ] `handleGetRincianPresets()`: pastikan data lengkap

### H12. `actions-register.js` — Siswa Baru

- [ ] `handleSubmitDaftarSiswa()`: pastikan registration benar
- [ ] `handleGenerateFormBridge()`: pastikan URL benar

### H13. `actions-drive.js` — Drive Migration

- [ ] `handleGetDriveLinkCandidates()`: pastikan scan benar
- [ ] `handleUploadDriveReplacement()`: pastikan file ter-upload

### H14. `actions-diagnostics.js` — Diagnostics

- [ ] `handleGetAppConfig()`: pastikan tidak bocorkan secret
- [ ] `handleReportWebVital()`: pastikan data tersimpan

---

## I. BACKEND — AI

### I1. `ai/chat.js` (601 baris) — AI Chat

- [ ] `handleProcessAIChat()`: pastikan VIP guard berfungsi
- [ ] `handleProcessAdminAIChat()`: pastikan admin session valid
- [ ] `handleProcessAiInterview()`: pastikan interview flow benar
- [ ] Rate limit: pastikan 10/min per identitas + 60/min per IP

### I2. `ai/classify.js` — Document Classification

- [ ] `handleParseDokumenBiodata()`: pastikan parsing benar
- [ ] Error handling: pastikan malformed response di-handle

### I3. `ai/cv.js` (397 baris) — AI CV Builder

- [ ] `handleSubmitDataAsj()`: pastikan admin OR kandidat guard
- [ ] `handleSimpanDataTtdNaitei()`: pastikan data tersimpan
- [ ] `isAiCvAllowed()`: pastikan VIP guard berfungsi

### I4. `ai/providers.js` — AI Providers

- [ ] Gemini API key: pastikan env var ter-baca
- [ ] Error handling: pastikan timeout + retry

---

## J. BACKEND — Database

### J1. `db/client.js` — Supabase Client

- [ ] `supabaseJson()`: pastikan REST API call benar
- [ ] `normalizeWa()`: pastikan format `628...` (13 digit)
- [ ] `normalizeGender()`: pastikan kanonikal `LAKI-LAKI`/`PEREMPUAN`
- [ ] `getSchema()`: pastikan OpenAPI spec ter-load

### J2. `db/candidates.js` — Candidate Queries

- [ ] `findCandidates()`: pastikan pagination benar
- [ ] `findAllCandidatesLight()`: pastikan projection kolom benar
- [ ] `findCandidatesByIds()`: pastikan resolve benar
- [ ] `mapCandidate()`: pastikan semua field ter-map

### J3. `db/forms.js` — Form/Application Queries

- [ ] `findForms()`: pastikan query benar
- [ ] `findFormsByWa()`: pastikan filter WA benar
- [ ] `mapForm()`: pastikan semua field ter-map

### J4. `db/jobs.js` — Job Queries

- [ ] `findJobs()`: pastikan query benar
- [ ] `mapJob()`: pastikan semua field ter-map

### J5. `db/berkas.js` — Berkas/Upload Queries

- [ ] `attachBerkasBio()`: pastikan join benar

### J6. `db/master.js` — Master Data Queries

- [ ] Query functions: pastikan semua ada

### J7. `db/misc.js` — Assets & Settings

- [ ] `findAssets()`: pastikan query benar
- [ ] `findSettings()`: pastikan query benar

### J8. `candidate-helpers.js` — Candidate Helpers

- [ ] `findCandidateByWa()`: pastikan normalisasi benar
- [ ] `CAND_WA_COLS`: pastikan kolom lengkap

---

## K. BUILD & SCRIPTS

### K1. `scripts/build-js.mjs` — JS Bundler

- [ ] ESM strip export: pastikan IIFE conversion benar
- [ ] Source map: pastikan generate
- [ ] Hash: pastikan content hash unik

### K2. `scripts/build-html.mjs` — HTML Builder

- [ ] Shared modals: pastikan inject ke semua halaman
- [ ] Script tags: pastikan benar (module vs classic)

### K3. `scripts/build-css.mjs` — CSS Builder (Tailwind)

- [ ] Purge: pastikan unused class dihapus
- [ ] Minify: pastikan output kecil

### K4. `scripts/check-handlers.mjs` — Handler Checker

- [ ] Pastikan semua action di `callAPI()` ada di registry
- [ ] Pastikan rate limit groups lengkap

### K5. `scripts/check-globals.mjs` — Global Pollution Checker

- [ ] Pastikan tidak ada global yang collides

### K6. `scripts/check-i18n.mjs` — i18n Checker

- [ ] Pastikan semua `tr()` keys ada di `i18n.js`

### K7. `scripts/dedupe-duplicates.mjs` — Dedupe Tool

- [ ] Dry-run: pastikan read-only
- [ ] Apply: pastikan backup sebelum mutasi
- [ ] Merge rules: status priority + timestamp + id

### K8. `scripts/generate-api-docs.mjs` — API Docs Generator

- [ ] Pastikan parse `action-registry.js` benar
- [ ] Pastikan output OpenAPI 3.1 valid

---

## L. TESTS

### L1. Unit Tests (Vitest)

- [ ] `tests/ping.test.js` — ping action
- [ ] `js/core/bridge.test.js` — bridge seam
- [ ] `js/helpers_cv.test.js` — CV helpers
- [ ] `js/xss-escape.test.js` — XSS escape
- [ ] `i18n.test.js` — i18n
- [ ] `js/render/mail.test.js` — mail render
- [ ] `netlify/functions/_lib/action-registry.test.js` — registry
- [ ] `netlify/functions/_lib/actions-auth.test.js` — auth
- [ ] `netlify/functions/_lib/actions-mail.test.js` — mail
- [ ] `netlify/functions/_lib/actions-master.test.js` — master
- [ ] `netlify/functions/_lib/actions-wa.test.js` — WA
- [ ] `netlify/functions/_lib/ai/chat.test.js` — AI chat
- [ ] `netlify/functions/_lib/ai/providers.test.js` — AI providers
- [ ] `netlify/functions/_lib/db/client.test.js` — DB client
- [ ] `netlify/functions/_lib/handlers.test.js` — handlers
- [ ] `netlify/functions/_lib/rate-limit.test.js` — rate limit
- [ ] `netlify/functions/_lib/session.test.js` — session
- [ ] `netlify/functions/_lib/storage.test.js` — storage
- [ ] `scripts/dedupe-rules.test.js` — dedupe rules

### L2. E2E Tests (Playwright)

- [ ] `e2e/login-check.mjs` — login flow
- [ ] `e2e/upload-check.mjs` — upload flow
- [ ] `e2e/biodata-check.mjs` — biodata flow
- [ ] `e2e/check-share.mjs` — share view
- [ ] `e2e/share-view.mjs` — share page

---

## M. STANDALONE PAGES (HTML + Inline JS)

### M1. `index.html` — Landing Page

- [ ] Script loading order: bridge → init → render
- [ ] Mobile nav: responsive
- [ ] Footer links: WhatsApp, Instagram, TikTok, Maps

### M2. `admin.html` — Admin Dashboard

- [ ] Sidebar nav: 8 tabs + settings
- [ ] All modals from `partials/modals-shared.html` ter-inject
- [ ] Script tags: benar urutan load

### M3. `apply-full.html` — Apply Page

- [ ] Form validation
- [ ] Job selection datalist

### M4. `master-full.html` — Master Form

- [ ] Multi-step form
- [ ] File upload

### M5. `ai_form.html` — AI Form

- [ ] Chat interface
- [ ] VIP guard

### M6. `share.html` — Share View

- [ ] Public access (no session required)
- [ ] Document preview

### M7. `siswa-baru.html` — Siswa Baru

- [ ] Registration form
- [ ] Photo upload

---

## Summary Counter

| Domain | Total Parts | Status |
| --------------------- | ------------ | ----------- || A. Core ESM | 5 parts | ✅ 3/5 |
| B. Frontend Core | 5 parts | ⏳ 0/5 |
| C. Admin Panel | 11 parts | ⏳ 0/11 |
| D. Candidate Features | 10 parts | ⏳ 0/10 |
| E. AI Features | 4 parts | ⏳ 0/4 |
| F. Public Pages | 8 parts | ⏳ 0/8 |
| G. Backend Core | 6 parts | ⏳ 0/6 |
| H. Backend Actions | 14 parts | ⏳ 0/14 |
| I. Backend AI | 4 parts | ⏳ 0/4 |
| J. Backend DB | 8 parts | ⏳ 0/8 |
| K. Build & Scripts | 8 parts | ⏳ 0/8 |
| L. Tests | 2 parts | ⏳ 0/2 |
| M. HTML Pages | 7 parts | ⏳ 0/7 || **TOTAL** | **92 parts** | **✅ 3/92** |

---

## Recommended Session Order

### Sesi 1-2: Foundation (A + G)

Mulai dari core: API client, session, rate-limit, handlers. Ini fondasi semua.

### Sesi 3-4: Auth & Security (B2 + B3 + H2)

Authentication flow, session management, WA normalization.

### Sesi 5-7: Admin Panel (C1-C11)

Admin dashboard, candidate table, mail inbox, modals.

### Sesi 8-10: Candidate Features (D1-D10)

Upload flow, WA Pintar, CV builder, E-Sign, Cloudinary.

### Sesi 11-12: AI Features (E1-E4 + I1-I4)

AI chat, interview simulator, CV builder.

### Sesi 13-14: Public Pages (F1-F8)

Landing page, apply form, share view, siswa baru.

### Sesi 15-16: Database Layer (J1-J8)

All DB queries, mapping, dedupe.

### Sesi 17: Build & Scripts (K1-K8)

Build pipeline, checkers, dedupe tool.

### Sesi 18: Tests (L1-L2)

Run all unit tests + E2E tests.

### Sesi 19: HTML Pages (M1-M7)

All HTML pages, script loading, responsive.

### Sesi 20: Final Verification

Full build, full test, full E2E, deploy check.
