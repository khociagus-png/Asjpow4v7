# PROGRESS2.md — Status Pekerjaan ASJ Portal (sesi terbaru)

> **File ini adalah kelanjutan `PROGRESS.md`** (yang lama disimpan sebagai legacy —
> riwayat sesi 2026-08-15 s/d awal 2026-08-17 ada di sana, dibaca kalau butuh
> konteks lama). Mulai sesi ini, entri baru dicatat DI SINI supaya file riwayat
> tidak terus membengkak. Lihat juga `CHANGELOG2.md` untuk riwayat per commit.

**Update terakhir:** sesi 2026-08-26 — dikerjakan oleh **AI Agent** — **Fix missing window.showToast in standalone pages and Cloudinary CSP** (`5d3a7f0`)

---

## Sesi 2026-08-22 (Sore) — Fix Laporan Bulanan + Regression Tests + Reviews (Buffy)

### Commits

| Hash      | Isi                                                     | Status    |
| --------- | ------------------------------------------------------- | --------- |
| `b317d57` | fix: laporan bulanan + regression tests + stale entries | ✅ Pushed |

### Yang Dikerjakan:

1. **Fix laporan bulanan** — `getMonthlyReport` tidak ada di `ADMIN_ACTIONS` → session token tidak dikirim → backend reject "Sesi tidak valid". Fix: tambah ke ADMIN_ACTIONS
2. **Hapus stale entries** — `getDriveLinkCandidates` & `uploadDriveReplacement` di ADMIN_ACTIONS tapi tidak ada handler/frontend. Dihapus
3. **Regression tests (+2)** — `action-registry.test.ts`:
   - Test: setiap backend `requireAdmin` action harus ada di frontend `ADMIN_ACTIONS`
   - Test: setiap `ADMIN_ACTIONS` entry harus ada di `ACTION_HANDLERS`
4. **Vitest fix** — Tambah `.freebuff` ke exclude list (deploy staging mempengaruhi test scan)
5. **MEMORY.md update** — Tambah §PELAJARAN DEPLOY: Netlify Free plan memblokir API env vars + function upload
6. **Security review** — 2 findings:
   - `ingest.js` tanpa rate limiting (Medium)
   - `ingest.js` CORS `Access-Control-Allow-Origin: *` (Medium)
7. **Supabase/Postgres review** — No critical issues. `select *` acceptable for detail views, `ilike` wildcard OK untuk dataset kecil
8. **Tailwind v4 review** — Setup sudah benar (CSS-first, @theme, no config.js)

### Test Results:

```
Test Files  32 passed (32)
Tests       285 passed (285)   ← +2 regression tests
Bundle:     app-bb81adcbdc.js  (374KB)
```

### Netlify Deploy Status:

- ✅ Site `asjportal-baru.netlify.app` — static files deployed (drag & drop)
- ❌ Functions — belum deployed (Netlify Free plan memblokir API upload)
- ❌ Env vars — belum di-set (Netlify Free plan memblokir API create)
- **Solusi:** Connect GitHub repo ke Netlify → auto-build + deploy functions + set env vars via Dashboard
- SSO account `suparnopnrg4` sudah dimatikan via API

---

## Sesi 2026-08-22 (Pagi) — Smart Ingestion + Bundle Optimization + SW Reload Fix (Buffy)

### Commits

| Hash      | Isi                                                                         | Status    |
| --------- | --------------------------------------------------------------------------- | --------- |
| `70d84ac` | feat: Smart Ingestion + fix toggle mobile + FCM graceful degrade + test fix | ✅ Pushed |
| `bc39b1d` | feat: optimize bundle + fix SW reload loop + Smart Ingestion E2E            | ✅ Pushed |

### Yang Dikerjakan:

1. **Smart Ingestion** — 3 jalur upload terkoneksi (handleSubmitApply, handleSimpanKandidatDanUpload, handleSimpanRevisiKandidat) ke `actions-ingest.ts` (Gemini parse → upsert master_database_candidate)
2. **Bundle optimization** — Smart Ingestion dipindah ke function terpisah (`ingest.js`). 18 function lainnya turun dari 5338KB → 1246KB (-76%). Total functions: 106MB → 26.7MB (-75%)
3. **SW reload loop fix** — Max 2 auto-reloads per session + 30s cooldown + persistent refreshing flag via sessionStorage (sebelumnya unlimited reloads 5-10x)
4. **Toggle detail mobile fix** — Hanya force simple di boot pertama (bukan di setiap toggle). User bisa toggle bebas di mobile
5. **FCM graceful degrade** — Polling 5 detik + no crash di localhost
6. **Test fix (Windows)** — action-registry.test.ts: `require()` → `import` ESM
7. **Smart Ingestion E2E test** — upload → Gemini parse → ai_data_json verified
8. **Pre-bundle** — 21 functions (was 20), all pass esbuild + vitest 283/283

### Deploy Attempt:

- ❌ Deploy gagal — netlify-cli v27 punya Intrinsic error di Windows + Node 22
- Root cause: compatibility bug di netlify-cli dependency (bukan kode project)
- Solusi: perlu downgrade netlify-cli ATAU deploy manual via Netlify Dashboard
- Detail: lihat MEMORY.md §PELAJARAN DEPLOY NETLIFY

---

## Sesi 2026-08-21 — Sentry + FCM + Anti-cache + Netlify Deploy Fix (Buffy)

### Ringkasan

**18 commits** (`a26c9e4` → `0197c57`):

- **Sentry lazy load** — SDK 688KB di-load dari CDN, bundle -62% (1.2MB → 461KB)
- **FCM Push Notifications** — sw.js notificationclick + fcm-client init + login trigger
- **Anti-cache 7 layer** — `_headers` + `updateViaCache:none` + anti-cache HTML + self-invalidating SW + version check + skipWaiting + clients.claim
- **Mail Inbox fix** — UMUM→UPDATE, folder guard, dedup docs, max-height
- **Netlify deploy fix** — Root cause: `package.json` `"type":"module"` → esbuild gagal resolve `.ts`. Fix: pre-bundle 20 functions ke CJS standalone
- **Deploy LIVE** ke `asjportal-terbaru.netlify.app`
- **Dev tooling** — commitlint, E2E CI, issue templates, bundle analyzer
- **Regression fixes** — XSS test, bundle-analyze TS error, FCM private_key escape

**Status:** 181/181 test, tsc 0 errors, deploy live, backend functions OK

---

## Sesi 2026-08-20 — TypeScript Migration

### Ringkasan

- Konversi 136+ file dari JS ke TypeScript: frontend (51), backend (35), scripts (21), tests, root files
- Infra baru: `tsconfig.json`, `types/supabase.ts` (5 tabel), `types/globals.d.ts` (window.*), `vitest.config.ts`
- Pipeline: esbuild `loader: .ts`, `serve-static.mts` resolve .js→.ts, `tsc --noEmit` di pre-commit + CI
- 73 file pakai `@ts-nocheck` (gradual migration — bisa dihapus bertahap)
- **181/181 tests, tsc 0 errors, build idempoten, lint clean, format clean**
- `sw.js` tetap .js (service worker browser requirement), Netlify entry points tetap CommonJS

---

Sesi sebelumnya → dikerjakan oleh **codebuff** (via Freebuff) — **DEPLOY `aaac6ac` LIVE** (deploy ID `6a841baec747d7187ea615a8`, bundle `app-699dfb4a86`): paket 8 fix + refactor backend sudah di domain asli, verifikasi live penuh.

---

## ⚡ Sesi 2026-08-20 — dikerjakan oleh: Antigravity — PERFORMANCE OPTIMIZATIONS (Pending Commit)

### Ringkasan

- Menerapkan Debounce (250ms) pada filter pencarian tabel admin untuk menghindari re-render berat saat pengetikan.
- Mengganti tombol "Muat Lebih" manual dengan Infinite Scroll berbasis IntersectionObserver.
- Menambahkan SessionStorage Cache (TTL 5 menit) untuk `getAppData`, `getCandidatesPage`, dan `getAppConfig` agar memuat instan saat tab reload. Cache otomatis invalidasi pada semua action mutasi (POST non-reader).
- Membakukan "Performance Guidelines" di `AGENTS.md` agar standar kecepatan tetap dijaga.
- Membatalkan implementasi _Bundle Split_ (Dynamic Import) pada fungsionalitas UI modal karena `guards.js` milik project secara agresif memblokir _inline handler_ yang _asynchronous_.
- Menjalankan `bun run build` sukses dan semua E2E test (upload, biodata, login) lulus lokal.

## 🆕 Sesi 2026-08-18 (lanjutan) — dikerjakan oleh: codebuff (via Freebuff) — GUARD RUNTIME HANDLER + DEPLOY OTOMATIS (A+C+D)

### Ringkasan

- **A — commit overhaul scanner** (`e90f53a`): `check-handlers.mjs` self-validating + header sesi PROGRESS2/CHANGELOG2 + todolist (`docs/superpowers/plans/2026-08-18-todolist.md`).
- **C — env Netlify diverifikasi langsung via API** (site `7e433a31…`): `ADMIN_NUMBERS` sudah benar (`082229020129`, typo `0082229020129` sudah diperbaiki), `ASJ_ADMINS` lengkap `SACHOU:1111,AYOK:2222,KHOLIS:3333,KHOCI:4444`, `SESSION_SECRET` 64-hex terisi. `CLOUDINARY_URL` memang tidak dipakai kode (unsigned client-side).
- **D1 — guard runtime handler inline di browser** (`js/core/bridge.js`): `checkInlineHandlers()` + `flushGuardWarnings()` — scan atribut event APA PUN via `getAttributeNames` (tanpa daftar event → blind spot statis mati), hanya di host non-produksi, hanya console.warn. **Desain deferred-flush penting**: warning dicetak di load+3s hanya untuk nama yang MASIH tidak resolve — scan awal menemukan false positive (modul admin register alias SETELAH bridge dievaluasi: `adminSwitchTab` dkk belum di window saat module-eval). Terverifikasi di preview: halaman sehat 0 warning, handler rusak yang di-injeksi di-warn tepat 1×. Bundle lokal `app-699dfb4a86`.
- **D2 — audit cakupan event**: self-check `EVENT_NAMES` di scanner sudah memaksa + guard runtime menghapus blind spot sepenuhnya.
- **D3 — deploy otomatis**: build hook Netlify `6a84142ec210682c643028b8` + `.github/workflows/deploy-netlify.yml` (manual `workflow_dispatch`, auto-on-push tinggal buka komentar) + DEPLOY.md §2.5. **Belum ada deploy yang dipicu.**

---

## 🆕 Sesi 2026-08-18 (lanjutan) — dikerjakan oleh: codebuff (via Freebuff) — OVERHAUL scanner `check-handlers.mjs`: self-validating (bukti cakupan sendiri) + presisi parsing

### Ringkasan

- **Self-check cakupan event (baru)**: SEMUA atribut `onXXX` yang dipakai di repo harus ada di daftar `EVENT_NAMES` — kalau event baru dipakai tapi belum didaftarkan, skrip GAGAL (bukan diam-diam tidak di-scan). Atribut HTML berawalan `on` selalu event handler (konvensi HTML), jadi daftar ini satu-satunya titik pemeliharaan. Terbukti: `onwheel="x()"` di file scratch → GAGAL dengan pesan `onwheel (dipakai di: ...)`; dihapus → LULUS.
- **`findObjectEnd` brace-balanced** (ganti `indexOf('}')` yang mengasumsikan nilai seam "flat") + **`collectSeamKeys` sadar-kedalaman** (koma di dalam nilai bersarang `() => ({...})` tidak memisah entri; hanya kunci yang terdaftar).
- **Lookahead `(?!=)` pada `window.X =`**: `typeof window.X === 'function'` tidak lagi dianggap registrasi. Terbukti 15 nama yang cuma muncul di `===` (showToast, tr, XLSX, mammoth, dll) semuanya tetap terdaftar lewat jalur lain — tidak ada yang hilang nyata (304 → 303, yang dibuang murni registrasi palsu).
- **String masking pada sisi terdaftar DIHAPUS** setelah terbukti salah: regex literal JS berisi tanda kutip (`/['"]/`) membuat masker menelan blok registrasi asli (40 nama hilang = false negative, lebih buruk dari yang diperbaiki). Presisi diandalkan ke parser kunci + lookahead.
- **Jaring pengaman `refs.size === 0`** — skrip tidak bisa lulus vakum kalau scope scan rusak.
- **Status**: 184 referensi (sama persis baseline) / 10 event / 303 terdaftar = 0 missing; uji regresi hapus-alias GAGAL persis; vitest 156/156; build lulus (bundle tetap `app-6080598722` — guard bukan bagian bundel).

---

## 🆕 Sesi 2026-08-18 (lanjutan) — dikerjakan oleh: codebuff (via Freebuff) — SELF-REVIEW scanner `check-handlers.mjs`: tutup lubang cakupan event + parser seam presisi

### Ringkasan

- **Self-review kritis (receiving-code-review)** atas scanner yang baru dibuat menemukan 2 lubang:
  1. **Lubang nyata**: daftar event `ON_RE` tidak mencakup `keydown`/`keypress`/`error` dkk — padahal dipakai nyata: `onkeydown="...rbAddChip(...)"` (modals-shared), `onkeypress="handleEnter(event)"` (ai_form), `onkeypress="kirimPesanAdminAi(event)"` (modals-shared), `onkeypress="if(...)gateLogin(event)"` (master-full). Kalau alias salah satu dari itu regresi, scanner lama tidak menangkap. Daftar event diperluas ke ~40 event umum (tetap daftar eksplisit, bukan `on[a-z]+` — supaya atribut `content=` tidak ketarik).
  2. **Lubang laten**: parser kunci seam (regex) salah mendaftarkan NILAI objek sebagai alias (`{ a: b, c }` → `b` ikut terdaftar) — false negative di jaring. Saat ini 0 dampak (file nyata flat), tapi rapuh. Diganti state machine key/value `collectSeamKeys()` — hanya kunci yang terdaftar.
  3. **False positive baru dari perluasan**: `if(` di `onkeypress="if(event.key==='Enter'){...}"` — ditambah daftar `JS_KEYWORDS` yang di-skip.
- **Terbukti menangkap regresi**: hapus `rbAddChip` dari seam sementara → scanner GAGAL persis `rbAddChip (dipakai di: partials\modals-shared.html)` (atribut yang SEBELUMNYA tidak di-scan); pulihkan → LULUS.
- **Status**: 184 referensi = 0 missing, vitest 156/156, lint 0 error, prettier rapi, build lulus (bundle tetap `app-6080598722` — guard bukan bagian bundel). Commit `9e3b7c5`.

---

## 🆕 Sesi 2026-08-18 — dikerjakan oleh: codebuff (via Freebuff) — FIX AKAR MASALAH: scanner `check-handlers.mjs` + bug ke-4 `cekRiwayat` (apply-full)

### Ringkasan

- **Metode systematic-debugging**: fix sebelumnya (daftarkan 3 fungsi) adalah fix GEJALA. Akar masalahnya: TIDAK ADA pengaman otomatis yang menangkap "handler inline dipanggil tapi tidak terdaftar di seam" — kelas bug ini bisa lolos refactor ESM lagi kapan pun.
- **Baru**: `scripts/check-handlers.mjs` — scanner permanen yang mengumpulkan SEMUA nama fungsi yang dipanggil dari handler inline (HTML statis + string JS yang di-generate, sadar-string-literal, strip komentar, skip property access `document./this./event.` dan global standard browser) lalu membandingkan dengan SEMUA nama yang terdaftar ke `window` (kunci `registerSeamAliases` + `window.X =`) di seluruh js/ + file root. GAGAL (exit 1) kalau ada yang missing.
- **Terbukti menangkap regresi**: hapus 1 alias sementara (`cekRiwayat`) → scanner GAGAL dengan pesan persis `cekRiwayat (dipakai di: apply-full.html)`; dipulihkan → LULUS.
- **Bug nyata ke-4 ketemu oleh scanner** (lolos audit sebelumnya karena audit hanya menangkap call PERTAMA per atribut): `cekRiwayat` dipanggil `onblur="formatInputWA(this); cekRiwayat();"` di apply-full.html tapi TIDAK terdaftar di seam apply_full.js → radar "cek WA sudah pernah daftar" di form lamaran TIDAK PERNAH jalan (ReferenceError diam-diam). Fix: daftarkan di seam + terverifikasi runtime `window.cekRiwayat = function`, 0 error.
- **Terpasang permanen**: `bun run build` sekarang = `check:globals && check:handlers && build:*`; CI (ci-check.yml) dapat step `Check handler aliases (seam)` setelah lint — regresi kelas ini langsung memerah di CI/commit.
- Validasi: scanner 157 referensi = 0 missing; vitest 156/156; build lulus.

## Sesi 2026-08-18 — dikerjakan oleh: codebuff (via Freebuff) — PERBURUAN BUG MENYELURUH (audit handler semua halaman + smoke click-through + hardening filter)

### Ringkasan

- **Latarbelakang**: user minta "cari semua bug dulu, jangan buru-buru deploy" — audit sebelumnya hanya men-scan HTML statis; kali ini diperluas ke SEMUA jalur referensi handler.
- **Audit handler lintas semua halaman + state (runtime Playwright)**:
  - Publik (guest), Admin (70 handler + 69 handler dinamis JS-generated), Kandidat (15), dan 5 halaman standalone (apply-full/master-full/share/siswa-baru/ai_form) — **semua handler ter-expose, 0 page error, 0 console error** di tiap halaman.
  - 10 nama "missing" yang muncul di scan statis (addArrayItem/removeArrayItem/updateArrayField/toggleImaMade/toggleSelection/handleExtraFile/onPekerjaanSelect/onFamPekerjaanSelect/openPreview/closePreview) terbukti **false positive** — semuanya handler halaman standalone yang sudah lolos audit di halamannya masing-masing (dikonfirmasi via grep sumber).
  - Scan `eslint --rule 'no-undef: error'` di SEMUA modul ESM (api-client, i18n, core/init/engine/render/api/pages/admin_modal/ai_copilot, cloudinary, pwa) → **0 error**.
- **Smoke click-through (browser nyata, tanpa mutasi data)**: 5 tab admin (mail/pelamar/kelola/wa/seting), 8 modal utama (WA Pintar, Undangan Kelas, Tambah Kandidat, Editor Rincian, Edit Loker Full, E-Sign TTD, CV Mini, AI Copilot), klik baris mail pertama, detail loker publik + tab filter publik, CV Mini + Digital CV + modal edit kandidat — **0 error** di semua.
- **Hardening `filterKandidat`** (js/render/candidate.js): `.toLowerCase()` pada `nama`/`idKandidat`/`tahapan`/`idLoker` tanpa guard → 1 baris kandidat dengan field NULL akan mematikan SELURUH filter (TypeError). Fakta DB: 86/223 kandidat punya `tahapan_seleksi` kosong (empty string, aman) tapi 0 NULL saat ini — hardening mencegah bug di masa depan kalau data kotor masuk.
- **Kesimpulan**: kelas bug "handler inline tidak ter-expose" sudah tuntas diberantas (3 fix di commit `8812800`); tidak ditemukan bug baru lain di jalur yang diaudit.

## Sesi 2026-08-18 — dikerjakan oleh: codebuff (via Freebuff) — audit semua filter admin/publik + fix 3 handler inline tidak ter-expose (ReferenceError)

### Ringkasan

- **Laporan user**: "filter admin loker publik ga jalan — `Uncaught ReferenceError: filterKelolaLoker is not defined`" dan "tambah job: kode lokasi ga ada & auto-search ga bisa".
- **Akar masalah (satu kelas bug)**: fungsi yang dipanggil HTML inline `onkeyup`/`onclick` tidak didaftarkan ke registry seam alias (`registerSeamAliases`) — jadi `window.filterKelolaLoker`/`window.filterCbx`/`window.cariKandidatManual` **undefined** di bundle (dulu global otomatis saat masih STACK concat, hilang setelah refactor ESM).
  - `filterKelolaLoker` (search tabel Kelola Loker) → tidak di-seam di `js/render/public.js`.
  - `filterCbx` (auto-search checkbox LOKASI & SYARAT di form Tambah Job) → tidak di-seam di `js/api/candidates.js`.
  - `cariKandidatManual` (auto-fill modal Input Kandidat Manual) → tidak di-seam di `js/api/candidates.js` (komentar di file bahkan sudah mencatat bug ini: "fungsi ini belum pernah dibuat" — padahal sudah ada, cuma tidak di-alias).
- **Audit menyeluruh**: scan semua `onkeyup/oninput/onclick/onchange/onblur` inline di `admin.html`/`index.html`/`partials/modals-shared.html` (64 handler unik) → setelah fix, **0 handler missing** di bundle (diverifikasi browser setelah login admin).
- **Uji fungsional semua model filter (Playwright, preview lokal)**: publik (search + tab `switchPublicTab`), admin Kelola Loker (`filterKelolaLoker`), Kandidat (`filterKandidat` + filter gender/umur/JFT), DB Job (`filterDbJob`), checkbox LOKASI & SYARAT (`filterCbx`), lokasi edit modal (`list-lokasi` datalist 52 opsi) — **semua memfilter dengan benar, 0 error JS**.
- **"kode lokasi ga ada" = persepsi efek bug**: opsi lokasi SEBENARNYA terisi penuh (57 checkbox di Tambah Job, 52 opsi datalist di Edit Loker) di lokal maupun live — yang rusak hanya auto-search-nya (ketik → ReferenceError → tidak memfilter apa pun). Setelah fix, ketik langsung memfilter.

## Sesi 2026-08-18 — dikerjakan oleh: codebuff (via Freebuff) — LIVE CHECK menyeluruh (E2E + tes + responsif + data + Cloudinary) + fix pwa.js self-check & guard SW E2E

### Ringkasan

- **Live check lengkap terhadap `asjportal.netlify.app`** (semua dijalankan ke domain asli, bukan preview):
  - `vitest` **156/156** lulus.
  - Tarikan data live: `getAppData` publik **132 jobs** (6 OPEN); admin (login KHOCI) **223 kandidat total** (50 termuat), **13 formInbox**, **132 dbJobs**, 2 template WA (`PEMBERITAHUAN GA LOLOS SCREENING` + `Undangan Grup Default` — isi lengkap tampil), pengumuman berjalan (JP). Login admin baru `ASJ_ADMINS` (SACHOU:1111 dll) terverifikasi sukses di live.
  - E2E live lulus: **share-view** (22 kandidat, dokumen ekstra), **login-check** (publik + kandidat + admin), **undang-grup-kelas** (20/20), **photo-check** (0 foto gagal di publik/kandidat/admin), **upload-check** (KTP/KK ter-upload via Cloudinary, `ktp_url`/`kk_url` tersimpan, cleanup bersih), **biodata-check** (simpan biodata + sync DB).
  - **Responsif live** (Playwright, 390/768/1280px): 0 overflow horizontal di publik & admin, tabel render, chip versi footer, bottom-nav admin benar mobile-only.
  - **Cloudinary OK**: upload uji ke `preset asjportal` → HTTP 200 + `secure_url`; upload KTP/KK end-to-end live terbukti. Catatan: `CLOUDINARY_URL` di `.env.local`/Netlify formatnya `cloudinary://<key><secret>@ybzzbw9i` (placeholder `< >`) — tidak dipakai kode (alur unsigned client-side), jadi tidak berdampak fungsional.
- **Bug ditemukan & diperbaiki (pwa.js, commit ini)**: self-check versi `cekVersiSw` membandingkan cache-buster `?v=esm15` (halaman standalone) dengan hash bundel sw.js → selalu beda → **purge + reload PALSU tiap buka ai_form/master-full/dll** di live (bikin E2E standalone flaky + flash reload di HP). Fix: hard-check hanya untuk halaman bundel (`/assets/app-<hash>.js`); standalone cukup jaring SW + soft-reload. Terverifikasi: standalone-smoke 15/15 ×2 di lokal.
- **E2E di-hardening untuk host non-localhost**: `login-check`, `undang-grup-kelas`, `photo-check` sekarang unregister SW + bersihkan cache setelah goto (sama seperti upload/biodata-check) — SW lifecycle reload (skipWaiting/controllerchange) bisa memotong tes di tengah (race nyata yang bikin login-check gagal konsisten di live).

## Sesi 2026-08-18 — dikerjakan oleh: codebuff (via Freebuff) — fitur Undangan Wali sudah LIVE, kartunya dipindah ke puncak tab WA Pintar (commit `8769ef5`)

### 🔎 Investigasi "Undangan Wali hilang di live" — ternyata tidak hilang

- Pemilik melapor fitur **Undangan Grup WhatsApp Kelas (Orang Tua/Wali)** hilang di live (`asjportal.netlify.app`) walau sudah hard reload (ctrl+shift+r / ctrl+F5) dan logout.
- **Penyelidikan tuntas** (Playwright/Chromium nyata terhadap domain live, login KHOCI:4444):
  - Live `admin.html` byte-identik dengan lokal — kartu ADA di baris ~788 (sudah diverifikasi sejak deploy `6a83e314`).
  - Browser test di viewport 390×844 & 797×959: kartu **tampil** (`cardVisible=true`), tombol "Mulai Kirim Undangan" tampil, modal `#modal-undangan-kelas` **terbuka** dengan semua field (daftar Nama|WA, link grup, jeda/delay, template pesan) — 0 error konsol.
  - `sw.js` sudah network-first + no-cache untuk navigasi, jadi bukan cache SW.
- **Akar masalah sebenarnya: discoverability.** Kartu berada di BAWAH grid template (posisi y≈2309 di HP — di bawah lipatan) dan bergaya gelap di atas latar gelap, sehingga mudah terlewat/terkesan hilang (screenshot pemilik: kartu ada tepat di antara kartu template dan editor pengumuman, tapi tidak terbaca).

### 🔧 Fix: kartu dipindah ke PUNCAK tab WA Pintar + styling mencolok

- Kartu sekarang elemen **pertama** di `#admin-wa` (di atas manajemen template) — begitu admin membuka tab WA, langsung terlihat.
- Styling: `bg-emerald-950/60` + `border-2 border-emerald-500/70` + glow `shadow-[0_0_25px_rgba(16,185,129,0.3)]` + badge "Fitur Khusus" (key i18n baru `ui.featured_badge`, id & jp).
- Verifikasi lokal (Playwright): `cardIsFirst=true` (y=1160 vs 2309 sebelumnya), modal tetap terbuka dengan semua field.
- Test: vitest **156/156**, lint 0 error, prettier rapi, i18n paritas id↔jp OK. Bundel baru `app-d473519c0b.js`.

---

## 🆕 Sesi 2026-08-18 — dikerjakan oleh: codebuff (via Freebuff) — sesi admin selalu login + theme per user + auto-update versi (commit `8511014`)

### 🔑 Sesi admin: "selama tidak logout, selalu login walau buka besok"

- **Akar masalah**: token sesi HMAC tidak punya expiry, jadi server tidak pernah logout sendiri — yang terjadi di lapangan adalah key sesi di localStorage hilang/terhapus sebagian (atau pembersihan storage browser), lalu modal login muncul lagi.
- **Fix**: refresh token terpisah (`checkAdminPersonal` kini mengembalikan `refreshToken` = HMAC `{role:'admin', name, kind:'refresh'}`). Action baru **`refreshAdminSession`** menukar refresh token → `sessionToken` baru tanpa PIN ulang (terdaftar di `action-registry` LOGIN_ACTIONS + kontrak test). Frontend boot (`js/init/boot.js`) memanggilnya SEBELUM data dimuat: kalau key sesi utama hilang tapi refresh token masih ada, sesi dipulihkan diam-diam — tidak ada modal login. Refresh token dicabut saat logout.
- **`logoutApp`** tidak lagi `localStorage.clear()` (dulu menghapus SEMUA termasuk preferensi theme & draft CV) — sekarang hanya menghapus key sesi/auth.
- **Terverifikasi di preview**: simulasikan key sesi hilang + reload → `isAdmin=true`, `currentAdminName=KHOCI`, modal login TIDAK muncul; logout → semua key sesi hilang, theme tetap.

### 🎨 Theme per user

- `js/init/theme.js`: `getThemeKey()` → key per identitas: `asj_theme_admin` (admin), `asj_theme_<wa>` (kandidat), `asj_theme` (guest). `getSavedTheme()` + migrasi sekali: kalau key per-user belum ada, pakai nilai key global lama supaya pilihan lama tidak hilang.
- `applyTheme` menyimpan ke `getThemeKey()`; boot + `initApp` membaca via `getSavedTheme()`. Terverifikasi: admin theme SAKURA tersimpan di `asj_theme_admin`, guest `asj_theme` tidak tersentuh, `applyTheme` saat login admin menulis ke key admin.

### 🔄 Auto-update versi anti-cache (pwa.js)

- Self-check versi diperkuat: setiap buka portal, hash bundel yang BENAR-BENAR termuat (`app-<hash>.js`) dibandingkan dengan VERSION di `sw.js` server (fetch `cache:'no-store'`). Kalau beda → SEMUA cache dibersihkan + SW di-unregister + reload SEKALI (guard `sessionStorage asj_sw_purged` anti-loop). Tidak bergantung siklus hidup service worker lagi — jaring pengaman terkuat melawan cache basi.
- Netlify headers sudah no-cache untuk `sw.js` & HTML (sudah ada sebelumnya) — lengkap.

### Verifikasi

- 153/153 vitest (tambah 2 test `refreshAdminSession`) · lint 0 error · prettier rapi · audit-globals: tidak ada global baru bermasalah · bundel `app-160ec775b8.js` · preview sehat (PID 18744).

### 🔁 Lanjutan — refresh token KANDIDAT (commit `acb299b`)

- `loginKandidat` kini mengembalikan `refreshToken` (role kandidat + kind refresh); action baru **`refreshKandidatSession`** menukar refresh token → `sessionToken` baru (nama diambil ulang dari DB, fallback ke WA). Boot memulihkan sesi kandidat diam-diam di semua halaman bundel (index.html) — kandidat juga tetap login selama tidak logout.
- **Hardening keamanan**: token `kind:'refresh'` kini DITOLAK oleh `requireRole`, `isOwnerOrAdmin`, dan `handleGantiPasswordKandidat` — refresh token hanya sah untuk action refresh, tidak bisa dipakai sebagai sesi aksi lain.
- `logoutApp` ikut mencabut `asj_kandidat_refresh`. Test: +3 vitest — **156/156 vitest**, lint 0 error, bundel `app-0d473e8141.js`. Preview terverifikasi: hapus key sesi kandidat + reload → `isKandidat=true`, `currentKandidatName=AGUS KHOCI`, tanpa modal; logout → refresh token hilang, theme per user utuh.

### 🧪 Audit env Netlify (dicek langsung via Netlify API, 2026-08-18)

- **Semua 12 key inti sudah terpasang** di produksi, termasuk `SESSION_SECRET` (64-hex kuat) — DEPLOY.md lama yang bilang "masih menunggu" sudah salah.
- ⚠️ **`ASJ_ADMINS` salah format**: isinya daftar 5 nomor WA (salinan `ADMIN_NUMBERS`), bukan `Nama:pin,Nama:pin` → kode melewati item tanpa `:` → login admin personal via env tidak pernah match; praktis hanya KHOCI (via `PIN_KHOCI`) yang bisa login. Tidak ada tabel admin di Supabase sebagai fallback (`findAdmins` hanya menemukan `user_sessions`). **Butuh aksi pemilik**: kasih daftar `Nama:pin` untuk diisi.
- ⚠️ `ADMIN_NUMBERS` di produksi masih typo 13-digit `0082229020129` (sudah dibetulkan di `.env.local`). `GROQ_API_KEY` & `LOG_DRAIN_TOKEN` belum dipasang di produksi tapi juga belum dipakai kode — opsional.

### 🚀 Eksekusi — env Netlify di-update + DEPLOY (izin eksplisit pemilik 2026-08-18)

- Pemilik kirim PIN admin baru: **SACHOU=1111, AYOK=2222, KHOLIS=3333, KHOCI=4444** + daftar env lengkap, dan minta "set env Netlify (ASJ_ADMINS benar + fix typo ADMIN_NUMBERS) dan redeploy".
- **Env produksi di-update via Netlify Envelope API** (`/accounts/{id}/env?site_id=…`): `ASJ_ADMINS` = `SACHOU:1111,AYOK:2222,KHOLIS:3333,KHOCI:4444` (format benar), `ADMIN_NUMBERS` typo diperbaiki, `GROQ_API_KEY` & `LOG_DRAIN_TOKEN` dibuat — total **14 var**; `SESSION_SECRET` (64-hex) dipertahankan. Terverifikasi via API: semua key ada, ASJ_ADMINS format `Nama:pin` ×4, ADMIN_NUMBERS 12 digit ×5.
- **Deploy `acb299b`** via `scripts/deploy-netlify.mjs` (SKIP_INSTALL=1) — 202 file + 19 functions, Deploy ID `6a83e314edaee8348ce2f907`. **Live kini bundle `app-0d473e8141.js` + sw.js VERSION `asj-portal-app-0d473e8141-m886a44dc`** → HP yang masih pegang versi lama otomatis pindah ke versi baru (mekanisme anti-cache-nyangkut sudah live).
- Verifikasi live: homepage 200 · bundle baru 200 · getAppData jobs=132 · **login `SACHOU:1111` → success + refreshAdminSession → success** (ASJ_ADMINS kini benar-benar berfungsi).

---

## 🆕 Sesi 2026-08-18 — dikerjakan oleh: codebuff (via Freebuff) — lanjutan audit mail: AI form & jalur upload sync

### 🔍 Lanjutan — AI form (`submitDataAsj`) TIDAK sync mail → DISAMAKAN

- **Jalur AI terpetakan**: `processAIChat` hanya generate teks (tidak menulis DB); `parseDokumenBiodata` (admin parse dokumen) & `ai_copilot/results.js` (apply hasil AI) memanggil `submitMasterForm` → **sudah sync mail** (`syncBiodataKeMail`). Yang TIDAK sync: **`submitDataAsj`** (ai_form.html SIMPAN DB — kandidat simpan biodata AI) — hanya menulis `ai_form_submissions` + `master.ai_data_json`, tanpa menyentuh mail.
- **Fix** (`ai/cv.js`): `handleSubmitDataAsj` kini membandingkan `ai_data_json` lama vs baru per seksi (`AI_SEKSI_LABEL`: identitas, fisik & ukuran, medis, pendidikan, pekerjaan, sertifikasi, keluarga, wawancara) lalu memanggil `syncBiodataKeMail` dengan label yang BENAR-BENAR berubah → mail kandidat mendapat badge UPDATE + `[BIODATA] fisik & ukuran, medis` (hanya kalau ada perubahan nyata — simpan berulang tanpa perubahan tidak menulis apa-apa). Non-fatal.
- **Test baru** (`actions-mail.test.js`): `AI_SEKSI_LABEL` mencakup semua seksi + label terbaca (tanpa `_`) — sekaligus membuktikan tidak ada circular require (ai/cv → actions-mail). **151/151 vitest**.

### 🔍 Jalur upload dokumen — SUDAH LENGKAP sync (audit, tidak perlu ubah)

- `simpanBerkasTahapan` (line 618) & `simpanRevisiKandidat` (line 722) memanggil `syncFormMailDariUpload` untuk SEMUA jenis dokumen → status UPDATE (kalau sudah diproses admin) + feedback `[UPLOAD <JENIS>]` terbaca. `submitApply`/`simpanKandidatDanUpload` = lamaran/kandidat BARU (status MENUNGGU, wajar tanpa feedback).
- **11 baris mail feedback kosong** (semua status LULUS, updated 08-15/08-16) = baris yang di-approve admin tanpa ada update lanjutan — NORMAL, bukan bug. Frontend sudah fallback menampilkan "Lamaran disetujui".

### 🔍 Audit mail — "Agus update ukuran baju kok beda, Anis update kok gak keluar tulisan update"

- **Kasus AGUS KHOCI (mail id 263, status LULUS)**: update biodata SUDAH sync ke mail (`feedback_berkas` berisi `[BIODATA] …`), tapi **label tampil mentah** — `ukuranbaju` bukan "ukuran baju", `kenalan_di_jepang_alamat` bukan "alamat kenalan di Jepang". Akar: `MASTER_FIELD_LABEL` di `actions-master.js` hanya punya ~16 label untuk ~60 kolom `MASTER_COLUMN_MAP` → fallback nama kolom mentah.
- **Kasus ANIS AGUSTIN (mail id 141, status LULUS)**: `feedback_berkas` KOSONG walau data kandidat berubah hari itu. Akar: update lewat `updateKandidatSuper` (modal edit kandidat / admin) — jalur itu **tidak pernah memanggil `syncBiodataKeMail`**, jadi tidak ada badge UPDATE/tulisan `[BIODATA]` sama sekali (hanya `submitMasterForm` dari sisi kandidat yang sync).
- **Fix 1 — label lengkap** (`actions-master.js`): `MASTER_FIELD_LABEL` dilengkapi ke 64 label (fisik/ukuran baju/sepatu/topi, kontak darurat, kenalan di Jepang, paspor, harapan gaji, dll) → `ukuranbaju` → "ukuran baju".
- **Fix 2 — admin edit sync mail** (`actions-candidate.js`): `handleUpdateKandidatSuper` kini membandingkan field body vs baris lama dan memanggil `syncBiodataKeMail` dengan label yang BENAR-BENAR berubah (gender/usia/tinggi/berat/JFT/SSW/loker) → mail kandidat dapat badge UPDATE + `[BIODATA] …` seperti update dari sisi kandidat. Non-fatal (kegagalan sync tidak menggagalkan update).
- **Data lama dirapikan**: `feedback_berkas` Agus dinormalisasi di DB (`[BIODATA] ukuran baju, alamat kenalan di Jepang`) — 1 baris.
- Verifikasi: 149/149 vitest · lint 0 error · preview: mail Agus tampil rapi.

### 🐛 Fix "Gagal! Aksi tidak dikenal: tandaiDibacaForm" (dari screenshot pemilik)

- Akar masalah: handler backend ADA (`actions-mail.handleTandaiDibacaForm`, terdaftar di `action-registry.js`), tapi action TIDAK ada di peta routing frontend `NETLIFY_FUNCTIONS` (`api-client.js`) → `callAPI` menolak sebelum request terkirim. Juga tidak ada di `ADMIN_ACTIONS` → token sesi admin tidak dikirim.
- Fix: `tandaiDibacaForm` ditambahkan ke `ADMIN_ACTIONS` + `NETLIFY_FUNCTIONS` (`→ 'candidates'`, satu function dengan reviewForm/approveForm/rejectForm/deleteForm).
- **Kontrak test diperkuat** (`action-registry.test.js`): test baru — setiap `callAPI('x')` frontend wajib punya route di peta `NETLIFY_FUNCTIONS` (di-parse dari sumber karena peta PRIVATE modul). Bug kelas ini (handler backend ada, route frontend hilang) tidak akan lolos lagi. **149/149 vitest**.
- Terverifikasi di preview: `callAPI('tandaiDibacaForm')` kini dieksekusi (bukan "Aksi tidak dikenal" lagi).

### 🐛 Chip versi di footer hilang ("ga sync antar team")

- Akar masalah: `pasangPenandaVersi` (pwa.js) menempel badge `.asj-ver-badge` ke `[data-lang="footer.copyright"]`, lalu `renderLanguage` (`01_public.js`) / `renderLanguageLight` (`i18n/core.js`) menimpa elemen itu dengan `el.innerHTML = text` → badge terhapus tiap render bahasa. Jadi chip versi TIDAK PERNAH tampil di footer (bukan masalah cache/SW).
- Fix: kedua fungsi render bahasa mempertahankan child `.asj-ver-badge` saat mengganti innerHTML. Terverifikasi di preview: `ve185a7dd30` tampil di footer (bundel `app-e185a7dd30.js`).

### 🔍 Investigasi "Undangan Wali" — kok beda? (fitur vs template)

- **"Undang Wali" = FITUR Undang Grup Kelas** (commit `10a45bc`): modal di admin, pesan default **HARDCODED** di `js/admin_ops/candidates.js` (`DEFAULT_PESAN_UNDANGAN_KELAS` — "pengurus LPK AMANAH SAKURA JAPAN PONOROGO … bergabung ke grup WhatsApp resmi kelas … {link_grup}"), dikirim via `kirimTawaranMassal` (`customMessage`). Fitur ini TIDAK membaca tabel `wa_templates`.
- **Template DB "Undangan Wali"** (di-seed 2026-08-18 atas permintaan awal pemilik, `wa_templates` 2→3) isinya BEDA ("PT Amanah Sakura Japan … hadir dalam pertemuan orang tua/wali") dan HANYA dipakai panel **Kelola Template WA Pintar** (kirim pesan manual via template). Jadi isi berbeda karena memang dua hal yang berbeda.
- **Resolusi (setelah pertanyaan lanjutan pemilik "kok gak sama fitur wa undang wali")**: template seed "Undangan Wali" **DIHAPUS dari DB** (`WA1787018018630169` — isi karangan saya, tidak dipakai fitur mana pun, cuma bikin dobel dengan legacy `WA-001`). DB `wa_templates` kembali ke 2 template asli (`WA-001` "Undangan Grup Default" — dipakai tombol "Undang Grup" via fallback server, dan "PEMBERITAHUAN GA LOLOS SCREENING"). `scripts/seed-wa-templates.mjs` ikut dihapus (anti `--apply` ulang).

### ✅ Konfirmasi SW auto-update — SUDAH AKTIF

- `pwa.js`: register `updateViaCache:'none'` (selalu cek sw.js ke jaringan); cek update saat load + tiap 60 dtk + saat tab fokus/visible; `SKIP_WAITING` saat SW baru terpasang; auto-reload saat `controllerchange`/pesan `ASJ_FORCE_RELOAD` (ditunda kalau user sedang interaksi); jaring pengaman self-check VERSION (fetch `/sw.js?v=` per session, reload sekali kalau berubah).
- `sw.js`: `self.skipWaiting()` PALING AWAL di install; `VERSION` di-patch otomatis tiap build; cache lama di-purge saat activate.
- Catatan: di localhost & host preview Freebuff SW sengaja TIDAK didaftarkan (anti cache nyangkut) — auto-update berlaku di production Netlify.

### ➕ WA Pintar seragam dengan model Undang Grup Kelas (permintaan pemilik)

- Setiap kartu template WA Pintar kini punya tombol **Kirim** (`kirimTemplateKelas`) yang membuka **modal yang sama persis dengan fitur Undang Grup Kelas** (paste daftar Nama|WA + link grup + jeda + preview varian) — pesan template di-prefill ke textarea, dikirim via `kirimTawaranMassal` + `customMessage`. Model pengiriman jadi seragam di semua template.
- Terverifikasi di preview: 2 kartu template (WA-001 + PEMBERITAHUAN) punya tombol Kirim; klik → modal terbuka, isi template ter-prefill, `{nama}`/`{link_grup}` ke-preview.

### ✅ Verifikasi

prettier bersih · lint 0 error (12 warning eqeqeq lama) · **149/149 vitest** · check:globals nol kolisi · check:i18n OK · build → bundel `app-15ef889ffb.js` · preview: chip versi tampil di footer, `tandaiDibacaForm` tidak lagi "Aksi tidak dikenal", tombol Kirim template WA Pintar berfungsi.

---

## 🆕 Sesi 2026-08-18 — dikerjakan oleh: codebuff (via Freebuff) — Fase 5 lanjutan + sourcemap/laporan bundel

### 🧩 Fase 5 lanjutan — duplikat head/theme-init halaman standalone di-partial-kan

- **`partials/head-shared.html`** — fonts trio (font-awesome + fonts.css + preload) yang duplikat di 5 halaman standalone, dengan token `{{INDENT}}`/`{{FA_ATTR}}`/`{{FA_ATTR2}}` (satu-satunya varian antar halaman: indent 2/4 spasi + urutan atribut link FA di share). **`partials/theme-init.html`** — script inisialisasi tema (identik 5×, tanpa token). Marker `<!--HEAD_SHARED_START/END-->` + `<!--THEME_INIT_START/END-->`; `build:html` meregenerasi per build (byte-compat + idempotent terverifikasi). Sisa head (title/meta/PWA/style inline) sengaja tetap per-halaman — konten memang berbeda (kendala byte-compat).

### ⚙️ Sourcemap bundel + laporan ukuran per-modul

- **`build-js.mjs` 2-pass**: pass 1 = kode+hash (write:false, perilaku lama), pass 2 = `sourcemap:'linked'` dengan write:true → `assets/app-216286d90f.js.map` external (**1.0 MB**, 81 sumber; tidak di-precache SW; bundel tetap 422 KB + komentar `sourceMappingURL`). Cleanup lama juga menghapus `app-*.js.map` usang.
- **`scripts/bundle-size-report.mjs`** (`bun run bundle:size`): esbuild metafile → laporan per-modul (minified bytes) ke `.freebuff/bundle-size-report.md` (gitignored). **Temuan kandidat lazy-load**: `i18n/locales/{id,jp}/{ui,form}.js` ≈ **97 KB / 23% bundel** (terbesar — hanya satu bahasa yang aktif dipakai runtime), CV builders (`10b_cv_builders` 22.3 KB + `10_cv_rirekisho` + `helpers_cv` ≈ 28 KB), `admin_ops/*` ≈ 30 KB (admin-only), `ai_copilot/*` ≈ 18 KB (admin-only), `08_wa_pintar` 13.6 KB, `13_rincian_builder` 10.1 KB.

### ✅ Verifikasi

format:check bersih · lint 0 error · 148/148 vitest · check:globals nol kolisi · build idempotent (md5 index/admin sama) · E2E login-check & share-view lulus · preview: apply-full render (theme-dark, fonts trio + main.css ter-load dari partial).

---

## 🆕 Sesi 2026-08-18 — dikerjakan oleh: codebuff (via Freebuff) — Fase 5 partial HTML + Fase 6 build/CI

### 🧩 Fase 5 — HTML & partial: byte-compatible

- **6 partial baru** di `partials/`: `head.html` (token `{{ADMIN_SCRIPT}}` — satu-satunya beda index vs admin), `header.html` (token `{{HAMBURGER_COMMENT}}`/`{{HAMBURGER_CLASS_EXTRA}}`/`{{NAV_ADMIN_MARGIN}}`/`{{NAV_KANDIDAT_MARGIN}}`), `footer.html` + `social.html` (token `{{SOCIAL}}`), `bottom-nav.html` (identik kedua halaman), `scripts-shared.html` (token `{{PAGE_MODULES}}`/`{{AFTER_PWA}}` untuk 5 halaman standalone).
- **Marker region** `<!--HEAD/HEADER/FOOTER/BOTTOM_NAV/SCRIPTS_SHARED_START/END-->` tetap tinggal di halaman; `build:html` meregenerasi isi region dari partial tiap build (**idempotent** — diuji 2× md5 sama). Token per-halaman di `module-registry.mjs` (`BUNDLE_TOKENS`, `SCRIPT_TOKENS`, `BUNDLE_REGIONS`, `STANDALONE_REGION`).
- **Style inline dipindah → `src/main.css`** (fade-in, print CV, light theme). Catatan: light theme dulu hanya inline di index.html, sekarang global (admin ikut dapat saat theme-light) — posisi di akhir file menjaga kemenangan cascade seperti inline-in-body.
- **Verifikasi byte-compat**: 7 halaman (index/admin/5 standalone) di-diff terhadap snapshot pra-refactor — perbedaan hanya marker + style removal + bump `?v=` CSS `c1e5a9f34b`→`ed681b7b61`; semua byte lain identik. Partial dibuat dari byte persis halaman (script one-off di-generate + round-trip assert, lalu dihapus).

### ⚙️ Fase 6 — build tooling: entry eksplisit + CI e2e:share

- **STACK concat dihapus** dari `module-registry.mjs` → `bundleModules()` menurunkan daftar modul bundel dari **import eksplisit `js/main.js`** (satu sumber kebenaran; `build-js.mjs` validasi + `check-globals.mjs` scan). Bonus: daftar kini memuat `js/cloudinary.js` yang dulu tertinggal di STACK → **47 modul**.
- **CI diperluas**: step `E2E share-view` di `ci-check.yml` — bootstrap server (`bun serve-static.mjs` + ping wait), `node e2e/share-view.mjs`; step **conditional pada secrets Supabase** (di-skip kalau belum dikonfigurasi). Browser check best-effort (chromium tidak di-install di CI → API check yang dijamin).

### ✅ Verifikasi akhir

format:check bersih · lint 0 error (12 warning eqeqeq lama) · 148/148 vitest · check:globals nol kolisi (47 modul) · check:i18n OK · build idempotent · bundle `app-216286d90f.js` (tidak berubah — tidak ada JS yang disentuh) · **E2E login-check + upload-check + share-view SEMUA LULUS** · preview: index/admin/apply-full render bersih (konsol 0 error, IS_ADMIN_PORTAL true, sosial 4 ikon).

---

## 🆕 Sesi 2026-08-18 — dikerjakan oleh: codebuff (via Freebuff) — Fase 4 tuntas + alias core root + Node

### 🌐 Fase 4 — i18n dipecah per domain + lint duplikat lintas file

- `i18n/locales/{id,jp}.js` (masing-masing ~876 baris) dipecah ke `i18n/locales/{id,jp}/` — **15 domain per bahasa**: loader, a11y, header, public, status, table, landing, siswa, ui, candidate, admin, button, footer, alert, form. Domain `form` (mf__/ai__/txt_*) dipindah dari mutasi `LANG.{id,jp}.form` di `i18n/core.js` ke fragment `form.js` — core kini murni `LANG = { id, jp }`. Binding `public` pakai nama `publicKeys` (reserved di strict-mode ESM).
- **Lint duplikat lintas file**: `scripts/check-i18n.mjs` (baru, ikut `bun run lint`) — tiap fragment wajib 1 export objek berisi 1 domain; domain tidak boleh muncul di 2+ file (spread-merge di index.js menimpa diam-diam); set domain id == jp; index.js memuat semua domain. Paritas leaf id↔jp tetap diuji `i18n.test.js`.
- Migrasi pakai script one-off (di-generate, lalu dihapus) — 148/148 vitest lulus sebelum & sesudah.

### 🔌 Fase 3.5 L6 gelombang 2 — alias core root ikut registry seam

- `api-client.js` (callAPI/esc/escJs/resolveSelfUrl) & `i18n.js` (tr/LANG/trOption/trOptionId/renderLanguageLight/toggleFormLanguage) kini **MURNI ESM** — tidak ada `window.X = X` lagi; alias dipasang di `js/core/bridge.js` via `registerSeamAliases` (source `bridge:api-client` / `bridge:i18n`). `i18n.js` jadi agregat `export * from './i18n/core.js'`.
- `pwa.js` (cobaInstallApp/bersihkanDraftLamaBase64) registrasi sendiri via `import { registerSeamAliases } from './js/core/bridge.js'` (source `pwa`).
- Verifikasi: 148/148 vitest · eslint no-undef 0 · check:globals nol kolisi · verifikasi browser (bundel + halaman standalone: semua alias = fungsi, terdaftar di `getSeamAliases()`, `tr`/`callAPI` jalan) · **E2E Playwright login-check & upload-check SEMUA LULUS**.

### ⚙️ Infra — Node.js v22.23.2 ter-install

- **Node v22.23.2 + npm 10.9.8** di-install user-local (tanpa admin): `C:\Users\AMANAH Sakura 3\nodejs-v22.23.2\node-v22.23.2-win-x64` (User PATH). E2E Playwright (chromium sudah ada) dan pre-commit hook (`node --check`) kini bisa jalan penuh — dua E2E pertama sukses di mesin ini. Catatan sesi bash lama: `export PATH="$PATH:/c/Users/AMANAH Sakura 3/nodejs-v22.23.2/node-v22.23.2-win-x64"`.

---

## 🆕 Sesi 2026-08-18 — dikerjakan oleh: codebuff (via Freebuff) — commit `338feee`

### 🔧 Fase 3.5 Langkah 6 tuntas + perbaikan env

- **Fase 3.5 L6 (fasad PortalBridge) SELESAI** — blok alias per-simbol terakhir di `js/` (`helpers_cv.js`: getPath/isGood/makeV/fmtMonthYearJp/mergeArrRiwayat) dihapus; 5 alias diregistrasikan TERPUSAT via `registerSeamAliases` di `js/main.js` (source `main:helpers_cv`). `helpers_cv.js` tetap murni (unit-test node tanpa window).
- **Verifikasi**: scan `window.\w+=` di `js/` 112→108 · eslint no-undef 0 · `check:globals` nol kolisi · **148/148 vitest** · bundle `app-698fbe088a.js` · verifikasi browser (5 global = fungsi, `getSeamAliases` berisi, konsol bersih). E2E Playwright tidak jalan di mesin ini (node tidak ter-install — keterbatasan terdokumentasi di `REFACTOR_TODO.md` Infra E2E).
- **`.env.local` ditulis ulang bersih** — 12 key, satu baris masing-masing (sebelumnya ada baris duplikat `ADMIN_NUMBERS`/`NETLIFY_SITE_URL` dari update kemarin karena bug regex script).
- **`ADMIN_NUMBERS` typo diperbaiki (konfirmasi pemilik)**: `0082229020129` → **`082229020129`** (kelebihan satu 0). Nilai final: `082130442661, 082229020129, 087864932711, 087728149733, 087889502004`. Preview direstart agar env ter-load.
- Catatan: `ADMIN_NUMBERS`/`GROQ_API_KEY`/`LOG_DRAIN_TOKEN` masih whitelist-only (belum dipakai kode); `SESSION_SECRET` & `ASJ_ADMINS` belum ada.

---

## 🆕 Sesi 2026-08-18 — dikerjakan oleh: codebuff (via Freebuff) — commit `57eb79e`

### 📋 TODO list + update env 2026-08-18 + seed template WA

- **`TODO.md` (baru)** — daftar gabungan semua pekerjaan belum selesai (deploy Netlify pending, `SESSION_SECRET` & `ASJ_ADMINS` belum di-set, seed WA, refactor Fase 3.5–6, K1, E2E Node ≥22) — sumber: `REFACTOR_TODO.md` / `REVIEW.md` / `PROGRESS2.md` / `DEPLOY.md`.
- **`DEPLOY.md` §3** — tambah `GROQ_API_KEY` & `LOG_DRAIN_TOKEN` ke daftar env + catatan refresh 2026-08-18.
- **Env terbaru pemilik ditulis ke `.env.local`** (gitignored): 12 key (Supabase ×4, `ADMIN_MASTER_PIN`, `PIN_KHOCI`, `ADMIN_NUMBERS`, `FONNTE_TOKEN`, `GEMINI_API_KEY`, `GROQ_API_KEY`, `LOG_DRAIN_TOKEN`, `NETLIFY_SITE_URL`) — verifikasi hash sha256 semua cocok; preview lokal kini pakai kredensial terbaru.
- **Seed template WA "Undangan Wali" di-apply** — `bun scripts/seed-wa-templates.mjs --apply` (konfirmasi pemilik): tabel `wa_templates` 2 → 3 template.
- Catatan: `SESSION_SECRET` & `ASJ_ADMINS` masih belum ada; `ADMIN_NUMBERS` angka `0082229020129` dicurigai typo; `ADMIN_NUMBERS` / `GROQ_API_KEY` / `LOG_DRAIN_TOKEN` sudah di whitelist `env.js` tapi belum dipakai kode.
- Alur kerja (keputusan pemilik): **tanpa branch** — kerja langsung di `main` local → GitHub.

---

## 🆕 Sesi 2026-08-18 — dikerjakan oleh: codebuff (via Freebuff) — commit `a679c35` + E2E fix

### 🔧 Line ending Windows & kualitas E2E

- **`.gitattributes` eol=lf** — hapus artefak "M" palsu di Windows pasca-build (CRLF vs LF); repo terverifikasi sudah LF semua (`--renormalize` 0 perubahan), build idempoten `app-23d620bb08.js`.
- **Audit bundle** — `app-23d620bb08.js` dari `26f2a91` TIDAK basi: minify esbuild membuat prettier (whitespace-only) tidak mengubah output; reproducible dari sumber `3134395`.
- **E2E upload-check diperbaiki** — PDF valid (Cloudinary menolak PDF palsu) + asersi URL Cloudinary `KTP_`/`KK_` + fix crash `JSON.stringify().slice()`.
- **Regresi penuh preview lokal**: login · biodata · upload · undang-grup-kelas SEMUA LULUS; vitest 296/296.

---

## 🆕 Sesi 2026-08-17 — dikerjakan oleh: codebuff (via Freebuff) — commit `02cc74f`

### 🔒 Pengaman format anti-melenceng (team pakai desktop/HP/GitHub web/local)

- **Pre-commit hook** `.githooks/pre-commit` (DI-COMMIT, executable): cek `format:check` (prettier) seluruh repo + `node --check` file `.js/.mjs` yang di-stage. Aktif otomatis saat `bun install` (`prepare` script di `package.json`) atau manual `bun run hook:install`. Skip darurat: `git commit --no-verify`.
- **CI check** `.github/workflows/ci-check.yml`: `bun install` → `format:check` → `lint` → `test` → `build` di tiap push/PR ke `main` — menangkap commit dari GitHub web/HP yang tidak lewat hook lokal.
- README (aturan 0) & AGENTS.md §7 di-update.
- **Teruji**: hook menolak file tak rapi (exit 1) & commit bersih lolos (commit ini sendiri dibuat lewat hook).

---

## 🆕 Sesi 2026-08-17 — dikerjakan oleh: codebuff (via Freebuff) — commit `dcb6938`

### 🧹 Rapikan repo (permintaan pemilik: "biar mudah dibaca AI, gak terlalu panjang, cukup point penting")

- **Dokumen besar diringkas** menjadi point-form (riwayat penuh tetap di git history):
  - `PROGRESS.md` 2300 → 35 baris (ringkasan fase 13–17/8 + keputusan penting)
  - `CHANGELOG.md` 1188 → 13 baris (era ringkas + pointer `git log`)
  - `ESM_BRIDGE.md` 774 → 25 baris (aturan ESM/bridge yang masih wajib)
  - `REFACTOR_TODO.md` 753 → 31 baris (hanya sisa pekerjaan terbuka)
  - `REVIEW.md` 302 → 30 baris (status item + rate limit + checklist K1)
  - `README.md` → titik masuk ringkas (stack, struktur, command, aturan, peta dokumen)
- **Format kode seragam**: `bun run format` (prettier: single quote, semi, 2-spasi, LF) — 115 file JS/MD/CSS dinormalisasi; `format:check` hijau.
- **Template WA "Undangan Wali"**: dikonfirmasi tidak ada (DB cuma punya 2 template). Seed script baru `scripts/seed-wa-templates.mjs` (dry-run default, `--apply` insert yang belum ada) berisi default "Undangan Wali" — **belum di-apply ke DB** (butuh konfirmasi pemilik).
- **Verifikasi:** build idempoten (bundel `app-23d620bb08.js`) · 148/148 test · lint 0 error (12 warning gaya lama) · seed dry-run OK.

---

## 🆕 Sesi 2026-08-17 — dikerjakan oleh: codebuff (via Freebuff) — commit `26f2a91`

### ✅ Tes preset Cloudinary `asjportal` — BERFUNGSI

- Upload uji file kecil (raw) ke `https://api.cloudinary.com/v1_1/ybzzbw9i/upload` dengan `upload_preset=asjportal` → **HTTP 200 + `secure_url` dikembalikan**. Preset unsigned valid.
- Catatan: preset mengarahkan file ke folder `DOKUMENASJ/` (bawaan preset — tidak masalah, yang penting URL). File uji 35 byte (`DOKUMENASJ/asj-preset-test_*.txt`) tersisa di akun — boleh dihapus manual.

### 🎨 Penanda versi: header → footer saja

- **Permintaan pemilik:** "jangan tampilkan kode versi (mis. `36373f3`) di banner, taruh di footer saja".
- `pwa.js` (`pasangPenandaVersi`): blok pengisian chip header `#asj-ver-chip` dihapus; badge versi `.asj-ver-badge` di footer (`[data-lang="footer.copyright"]`) tetap ada.
- `index.html` & `admin.html`: elemen `<span id="asj-ver-chip">` dihapus dari judul header (pill kosong tidak ikut render).
- **Verifikasi:** `node --check` OK · bundel `app-23d620bb08.js` berisi 0 `asj-ver-chip`, 1 `asj-ver-badge` · 148/148 test lulus.

---

## 🆕 Sesi 2026-08-17 — dikerjakan oleh: codebuff (via Freebuff) — commit `36373f3`

### ☁️ Migrasi LENGKAP sisa alur upload → Cloudinary (lanjutan Task 2)

**Perintah user:** "lanjut master full dll yg berurusan dengan upload".

- `js/pages/master_full.js` (`submitMaster`): 9 field file (`photoFile`, `jftFile`, `sswFile`, `ijazahSdFile`, `ijazahSmpFile`, `ijazahSmaFile`, `univFile`, `ktpFile`, `kkFile`) TIDAK lagi base64 — sekarang `uploadToCloudinary(file)` → payload berisi **URL string**. Fungsi `fileToBase64` dihapus.
- `js/pages/apply_full.js` & `js/api/jobs.js` (`uploadFilesDirectly`): drop `getUploadUrls` + PUT signed-URL ke Supabase Storage → tiap file di-`uploadToCloudinary`. Prefix `JOB<code>_CV` tidak lagi perlu (Cloudinary memberi public_id unik per upload → tidak saling menimpa).
- `js/pages/ai_form.js` & `js/pages/siswa_baru.js` (`uploadFilesDirectlyBase64`): base64 hasil downscale → dikembalikan jadi `File` (base64ToBlob) → `uploadToCloudinary`. Backend `submitDataAsj` / `submitDaftarSiswa` memang sudah menyimpan URL string — tidak ada perubahan di sana.
- `netlify/functions/_lib/storage.js`: helper baru **`resolveFileUrl(value, folder, fileName)`** — nilai URL string (Cloudinary) dipakai apa adanya; base64 (jalur lama) fallback ke `uploadBase64`.
- `netlify/functions/_lib/actions-master.js` (`handleSubmitMasterForm`): loop `MASTER_FILE_COLUMNS` kini lewat `resolveFileUrl` → menerima URL string dari master-full; base64 lama tetap didukung.
- `getUploadUrls` TIDAK lagi dipanggil frontend mana pun (handler backend tetap ada sebagai fallback, tidak dihapus).
- **Verifikasi:** `node --check` OK · ESLint no-undef 0 error · **148/148 test lulus** · `bun run build` → bundel `assets/app-4843ad1360.js` (46 file) · uji langsung `resolveFileUrl`: URL passthrough, base64 fallback tetap jalan (sandbox punya env Supabase).

---

## 🆕 Sesi 2026-08-17 — dikerjakan oleh: codebuff (via Freebuff) — commit `941b01a`

### ⚡ TASK 1 — Anti Cold-Start (Keep-Warm)

**Perintah user:** dua optimasi teknis untuk mengamankan limit free-tier dan menghindari Cold Start/Timeout (keep-warm + offload storage).

- `netlify/functions/_lib/handlers.js`: early return action `ping` di baris PALING ATAS `handleAction` → `{ statusCode: 200, body: 'pong' }` — sebelum rate limit, dispatch, inisialisasi koneksi Supabase, atau kerja apa pun.
- `netlify/functions/_lib/netlify-wrapper.js` + `serve-static.mjs`: mendukung `GET ?action=ping` (query string fallback) + meneruskan respons RAW `{statusCode, body}` apa adanya (tanpa dibungkus JSON) — berlaku di semua fungsi Netlify & preview lokal.
- `.github/workflows/keep-alive.yml` (BARU): cron `*/5 * * * *` → curl `{"action":"ping"}` ke `https://asjportal.netlify.app/.netlify/functions/auth` (fallback GET); URL bisa di-override via repo variable `KEEPALIVE_URL`. Catatan: di repo privat, workflow terjadwal bisa dijeda GitHub setelah 60 hari tanpa aktivitas.
- **Verifikasi:** POST & GET ping → `200 "pong"` mentah (uji langsung via node); action normal tetap respons JSON; 148/148 test lulus.

### ☁️ TASK 2 — Offloading Upload ke Cloudinary (Direct Unsigned Upload)

**Akar masalah:** dokumen mengalir Frontend → Netlify Functions (base64) → Supabase Storage = bandwidth serverless + rawan timeout. Diubah menjadi browser → Cloudinary langsung; backend hanya menerima URL string.

- `js/cloudinary.js` (BARU): `uploadToCloudinary(file)` → POST FormData (`file` + `upload_preset='asjportal'`) ke `https://api.cloudinary.com/v1_1/<cloud>/upload` → return `secure_url`. Cloud name diisi `ybzzbw9i` (dari `CLOUDINARY_URL` pemilik). **Key/secret TIDAK pernah ditaruh di frontend** (file publik) — alur unsigned hanya butuh cloud name + preset.
- `js/03_candidate.js` (`prosesUploadPemberkasan`): file → `uploadToCloudinary` → payload `{wa, nama, jenisBerkas, fileUrl}` → `callAPI('simpanBerkasTahapan')`. Ditambah **konfirmasi "timpa file lama"**: kalau slot dokumen sudah punya URL tersimpan, `confirm(...)` dulu sebelum menimpa.
- `js/api/candidates.js`: `prosesTambahKandidat` (files jadi `{label, name, url}`), dokumen ekstra di modal input & super-edit (`fileUrl`), dan `prosesUploadRevisi` (`simpanRevisiKandidat` dengan `{name, url}`) — semua lewat Cloudinary.
- `netlify/functions/_lib/actions-upload.js`: `simpanBerkasTahapan`, `simpanRevisiKandidat`, `simpanKandidatDanUpload` kini hanya mengekstrak URL string dari payload (`d.fileUrl` / `f.url`) lalu update kolom dokumen; **base64 lama tetap didukung sebagai fallback** (klien lama aman).
- `js/main.js`: import `cloudinary.js` → ikut bundel admin/index.
- **Build:** `bun run build` → bundel `assets/app-85dc1bcb69.js` (46 file), `check:globals` 0 kolisi, 148/148 test lulus.

### ⚠️ Catatan untuk tim

- **Preset unsigned `asjportal` WAJIB ada** di dashboard Cloudinary (Settings → Upload → Unsigned upload preset) — belum diverifikasi dari sisi preset; tanpa preset itu upload ditolak `Invalid upload preset`.
- Keep-alive + Cloudinary baru efektif **setelah deploy Netlify** (tetap butuh izin eksplisit pemilik — lihat `DEPLOY.md`).
- Belum dimigrasi (pola sama bisa menyusul): `master-full.html` masih kirim base64 via `submitMasterForm`; `apply-full.html`/`ai_form.html`/loker admin sudah upload langsung browser→Supabase Storage via `getUploadUrls`.

---

## Sesi 2026-08-25 (Malam) — Fix Build Pipeline, E2E Tests, Bundle Optimization, Dashboard + Email Auto-fill (Buffy)

### Commits

| Hash      | Isi                                                                                   | Status    |
| --------- | ------------------------------------------------------------------------------------- | --------- |
| `9184036` | fix(build): compile standalone .ts → .js untuk Netlify (8 file)                       | ✅ Pushed |
| `0257389` | chore: bersihkan 62 komentar basi REFACTOR_TODO + buat sentry-dummy.js                | ✅ Pushed |
| `8d5f3dd` | fix: node-compatible build + typecheck + hapus dead function (admin-sync.js)          | ✅ Pushed |
| `94b4fe5` | fix(e2e): require → import handlers.ts untuk 3 test (backend-fast-path, diag-cvmini*) | ✅ Pushed |
| `e539257` | fix(e2e+preview): fix all failing E2E tests + backend preview loading                 | ✅ Pushed |
| `a44f472` | perf(build): externalize shared deps → bridge.js + cloudinary.js (-35% bundle size)   | ✅ Pushed |
| `bb903b8` | fix(e2e): login/dashboard visibility check using getComputedStyle                     | ✅ Pushed |
| `2a9c117` | fix(html): tambah missing `</div>` untuk page-admin → fix dashboard kandidat          | ✅ Pushed |
| `1200d0f` | fix(apply): tambah email auto-fill di cekDataPelamar                                  | ✅ Pushed |

### Yang Dikerjakan:

#### 1. Build Pipeline Fixes

- **Standalone .ts → .js compile** — 8 file (.ts) yang tidak di-bundle oleh esbuild (apply_full, master_full, share, siswa_baru, ai_form, cloudinary, upload-guard, pwa) perlu di-compile manual supaya Netlify bisa serve .js statis
- **sentry-dummy.js** — Import map refer ke `@sentry/browser` yang tidak ada → buat ESM stub 506 bytes
- **Node-compatible build** — `bun run` diganti `npx/node` di package.json (bun tidak jalan di Windows dev)
- **TypeCheck** — `tsc --noEmit` ditambah ke build pipeline

#### 2. E2E Test Fixes

- **serve-static.mts** — Backend preview `require()` tidak bisa resolve `.ts` extensionless imports → esbuild bundling + `await import()`
- **backend-fast-path, diag-cvmini, diag-cvmini3** — `require('handlers.js')` → `import('handlers.ts')` + jalankan pakai `npx tsx`
- **standalone-smoke** — chatBox check fixed wait 2.5s → polling up to 10s (500ms intervals)
- **share-view** — Hardcoded job `TG633ASJ` tidak ada di local DB → auto-discover job dari server
- **login-check, biodata-check, upload-check** — Playwright `isVisible()` tidak detect Tailwind `!hidden` → pakai `getComputedStyle`

#### 3. Bundle Optimization (-35% per page)

- Pre-build `bridge.js` + `cloudinary.js` sebagai shared ESM modules
- esbuild `external` plugin: standalone pages import bridge/cloudinary dari shared file (bukan inline bundle)
- Hasil: ai_form 107KB→22KB, master_full 105KB→20KB, share 105KB→21KB, apply_full 98KB→13KB

#### 4. Dashboard Kandidat Fix

- **Missing `</div>`** di `index.html` menyebabkan `page-kandidat` ter-nested di dalam `page-admin`
- Saat `changePage('kandidat')` hide page-admin, page-kandidat ikut ter-hide → dashboard kosong

#### 5. Email Auto-fill di Apply Form

- `handleCekDataPelamar` tidak mengembalikan field `email` (hanya baca `database_asj_form` yang tidak punya kolom email)
- Fix: fetch email dari `database_candidate` via single `findCandidates()` call (merged dengan existing photo/JFT/SSW fallback)
- Verified: `cekDataPelamar` → `email: "khoci89@gmail.com"` ✅

### Test Results:

```
E2E Tests:   89/89 pass (backend-fast-path 13, login-check 20, biodata-check 11, upload-check 20, standalone-smoke 15, share-view 10, diag-cvmini OK, diag-cvmini3 OK)
TypeCheck:   tsc --noEmit → 0 errors
Build:       npm run build → clean (0 errors)
```

### Auto-fill Data Sync Summary:

| Form                           | Source                                                                 | Fields                                                             |
| ------------------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------------ |
| CV Master (`master-full.html`) | `getMasterDataByWa` → `master_database_candidate`                      | 100+ fields (full profile)                                         |
| CV AI (`ai_form.html`)         | `getDrafCvMaster` → `master_database_candidate`                        | 100+ fields (full profile)                                         |
| Apply (`apply-full.html`)      | `cekDataPelamar` → `database_asj_form` + `database_candidate` fallback | nama, gender, usia, tb, bb, **email** ✅, pasPhoto, jftUrl, sswUrl |

---

## Sesi 2026-08-26 — dikerjakan oleh AI Agent

### Commits

| Hash      | Isi                                                 | Status    |
| --------- | --------------------------------------------------- | --------- |
| `5d3a7f0` | fix(core): import util.ts di ai_form, whitelist CSP | ✅ Pushed |

### Yang Dikerjakan:

- Import `util.ts` pada standalone pages `ai_form.ts` dan `siswa_baru.ts` yang kehilangan method `window.showToast` setelah migrasi ESM.
- Menambahkan URL origin `https://api.cloudinary.com` ke header `connect-src` CSP pada `netlify.toml` untuk mengizinkan unggahan dari plugin Cloudinary.
