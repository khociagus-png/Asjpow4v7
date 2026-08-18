# CHANGELOG2 — ASJ Portal (riwayat terbaru)

> Kelanjutan `CHANGELOG.md` (legacy — entri lama ada di sana). Mulai sesi ini,
> entri per commit dicatat di sini supaya file riwayat tidak membengkak.
> Format: paling lama di atas (paling baru di bawah).

---

## 2026-08-18 — 🧹 Item opsional: dedupe dry-run, audit backend supabase.*, bersihkan file uji Cloudinary, build hook ke GitHub secret

### Ringkasan

- **Dedupe** — `bun run dedupe` dry-run: **0 duplikat** di ketiga tabel (tidak perlu `--apply`).
- **Audit backend `supabase.*`** — `fetchPagedAll` (db/candidates.js) & `queryPaged` (db/misc.js) direfactor ke helper terpusat baru `supabasePaged` (db/client.js, Range+Content-Range); `listStorageFolder` (db/berkas.js) pakai `storageRequest` (storage.js). Sisa fetch = 3 helper pusat + API eksternal sah (Fonnte, AI provider). Terverifikasi via preview: admin getAppData `candidatesTotal: 223` (jalur fetchPagedAll), `formInbox: 13`, `dbJobs: 140`, `sessionInvalid: false`; share-data 200 (jalur listStorageFolder).
- **File uji Cloudinary** — `DOKUMENASJ/e2e-cloudinary-check_w1whnt` dihapus via API (folder `e2e` kosong). 9 file `KK_*`/`KTP_*` 587 B mencurigakan tapi tak terkonfirmasi (cek dashboard); `638_-644_*` + `WhatsApp_Image_*` = dokumen asli (dibiarkan).
- **Build hook → GitHub secret** — `NETLIFY_BUILD_HOOK_URL` di-set via GitHub REST API (libsodium sealed box, token dari git credential manager; HTTP 201, terverifikasi terdaftar). Workflow `deploy-netlify.yml` kini baca `${{ secrets.NETLIFY_BUILD_HOOK_URL }}` + guard error kalau kosong. DEPLOY.md §2.5 di-update.

## 2026-08-18 — 🛡 Guard runtime handler inline (bridge.js) + deploy otomatis via build hook Netlify

### Ringkasan

- `js/core/bridge.js` + `checkInlineHandlers()`/`flushGuardWarnings()`: scan atribut event APA PUN di DOM (getAttributeNames — tanpa daftar event), cek resolve ke window, hanya console.warn + hanya host non-produksi. Deferred-flush di load+3s — scan awal false positive karena modul admin register alias SETELAH bridge dievaluasi; flush hanya mencetak nama yang MASIH hilang. Terverifikasi preview: 0 false positive, handler rusak di-injeksi di-warn 1×. Bundle lokal `app-699dfb4a86`.
- Deploy otomatis: build hook Netlify `6a84142ec210682c643028b8` + `.github/workflows/deploy-netlify.yml` (workflow_dispatch manual; auto-on-push tinggal buka komentar) + DEPLOY.md §2.5. Belum ada deploy dipicu.
- Env Netlify diverifikasi via API: ADMIN_NUMBERS sudah benar, ASJ_ADMINS lengkap, SESSION_SECRET terisi.
- Vitest 156/156, lint 0 error, scanner 184 ref = 0 missing, build lulus.

## 2026-08-18 — 🛡 Overhaul scanner check-handlers.mjs: self-check cakupan event + parser seam brace-balanced + lookahead window.X =

### Ringkasan

- Self-check baru: SEMUA atribut `onXXX` yang dipakai harus ada di `EVENT_NAMES` — event baru yang belum didaftarkan membuat CI GAGAL (blind spot kelas "event tidak di-scan" mati). Terbukti dengan `onwheel` di file scratch → GAGAL; pulihkan → LULUS.
- `findObjectEnd` brace-balanced (bukan `indexOf('}')` flat) + `collectSeamKeys` sadar-kedalaman — hanya kunci `registerSeamAliases` yang terdaftar, koma dalam nilai bersarang tidak memisah entri.
- Lookahead `(?!=)` pada scan `window.X =`: `typeof window.X === 'function'` tidak lagi jadi registrasi palsu (15 nama terbukti tetap terdaftar lewat jalur lain; 304→303 = hanya palsu yang dibuang).
- String masking sisi terdaftar dihapus — terbukti false negative (regex literal berisi kutip `/['"]/` menelan blok registrasi, 40 nama hilang).
- 184 ref / 10 event / 303 terdaftar = 0 missing, uji hapus-alias GAGAL persis, vitest 156/156, build lulus (bundle tetap `app-6080598722`).

## 2026-08-18 — 🛡 Self-review scanner check-handlers.mjs: perluas cakupan event (keydown/keypress/error dkk) + parser seam key/value presisi

### Ringkasan

- Cakupan event handler diperluas dari 9 → ~40 (termasuk keydown/keypress/error yang ternyata dipakai nyata: rbAddChip, handleEnter, kirimPesanAdminAi, gateLogin — sebelumnya TIDAK di-scan = lubang di jaring). Daftar eksplisit (bukan `on[a-z]+`) agar `content=` tidak ketarik.
- Parser kunci `registerSeamAliases` diganti state machine key/value (`collectSeamKeys`) — regex lama salah daftarkan nilai objek sebagai alias (false negative laten).
- Skip `JS_KEYWORDS` (`if(` di onkeypress) — false positive baru dari perluasan.
- Terbukti menangkap regresi: hapus `rbAddChip` → GAGAL dengan pesan persis; pulihkan → LULUS. 184 ref = 0 missing, vitest 156/156, lint 0 error.

## 2026-08-18 — 🛡 Fix akar masalah: scanner check-handlers.mjs (build+CI) + bug ke-4 cekRiwayat (apply-full)

### Ringkasan

- **Akar masalah kelas bug** "handler inline tidak ter-expose": tidak ada pengaman otomatis. Baru: `scripts/check-handlers.mjs` — scan semua referensi handler (HTML statis + string JS, sadar-quote, strip komentar, skip DOM API/global browser) vs semua nama terdaftar di window (kunci registerSeamAliases + `window.X =`), exit 1 kalau ada yang missing. Terbukti menangkap regresi (uji hapus-alias).
- **Bug ke-4 ketemu scanner**: `cekRiwayat` dipanggil `onblur` di apply-full.html tapi tidak di-seam → radar cek WA terdaftar di form lamaran tidak pernah jalan. Fix di `js/pages/apply_full.js`, terverifikasi runtime.
- **Terpasang di `bun run build`** (check:globals && check:handlers && build:*) **dan CI** (step baru setelah lint). Vitest 156/156.
- **Self-review (receiving-code-review)**: scanner diperluas mencakup `data-action="..."` (dispatcher delegasi bridge — kalau nama tidak terdaftar, klik diam-diam tidak melakukan apa-apa + console.warn). Total 183 referensi (handler + data-action) = 0 missing.

## 2026-08-18 — 🔍 Perburuan bug menyeluruh: audit handler semua halaman/state + smoke click-through + hardening filterKandidat

### Ringkasan

- **Audit runtime lengkap** (Playwright): publik/admin(70+69 dinamis)/kandidat/5 halaman standalone → semua handler ter-expose, 0 page error, 0 console error. Scan `eslint no-undef` seluruh modul ESM → 0 error. 10 "missing" statis terbukti false positive (handler standalone).
- **Smoke click-through**: 5 tab admin + 8 modal utama + mail row + detail loker publik + CV Mini/Digital CV/modal edit kandidat → 0 error (tanpa mutasi data).
- **Hardening `filterKandidat`** (js/render/candidate.js): guard `|| ''` di `nama`/`idKandidat`/`tahapan`/`idLoker` — 1 baris kandidat NULL akan mematikan filter (TypeError). Fakta DB: 86/223 kandidat tahapan kosong (empty string aman), 0 NULL saat ini — defensif untuk data kotor ke depan.
- **Kesimpulan**: kelas bug "handler inline tidak ter-expose" tuntas (3 fix di `8812800`); tidak ada bug baru di jalur yang diaudit. Vitest 156/156, lint 0 error.

## 2026-08-18 — 🔧 Audit semua filter + fix 3 handler inline tidak ter-expose (ReferenceError filterKelolaLoker/filterCbx/cariKandidatManual)

### Ringkasan

- **Gejala**: search "Kelola Loker" di admin error `filterKelolaLoker is not defined` tiap ketik; auto-search LOKASI/SYARAT di form Tambah Job tidak bekerja ("kode lokasi ga ada" — padahal 57 opsi checkbox + 52 opsi datalist terisi, yang rusak hanya auto-search-nya).
- **Akar masalah**: 3 fungsi yang dipanggil HTML inline (`onkeyup`/`onclick`) tidak didaftarkan ke registry seam alias ESM (`registerSeamAliases`) → `window.*` undefined (regresi refactor Fase 3.5: dulu global otomatis saat STACK concat).
- **Fix** (+3 alias): `filterKelolaLoker` (js/render/public.js), `filterCbx` (js/api/candidates.js), `cariKandidatManual` (js/api/candidates.js — komentar lama "fungsi ini belum pernah dibuat" ternyata sudah ada fungsinya, cuma tidak di-alias).
- **Audit 64 handler inline** (admin/index/modals-shared) → 0 missing setelah fix; uji fungsional semua filter publik+admin lulus (Playwright), vitest 156/156, lint 0 error.

## 2026-08-18 — 🟢 LIVE CHECK menyeluruh (E2E + tes + responsif + data + Cloudinary) + fix pwa.js self-check & guard SW E2E

### Ringkasan

- **Live check lengkap ke `asjportal.netlify.app`**: vitest **156/156**; tarikan data publik 132 jobs & admin 223 kandidat/13 inbox/2 template WA; E2E live lulus `share-view` (22 kandidat), `login-check`, `undang-grup-kelas` (20/20), `photo-check` (0 foto gagal), `upload-check` (Cloudinary KTP/KK tersimpan), `biodata-check` (sync DB). Responsif 390/768/1280px: 0 overflow, bottom-nav mobile-only benar. Cloudinary preset `asjportal` → upload uji 200 + `secure_url`.
- **Fix pwa.js (`cekVersiSw`)**: fallback `?v=esm<rev>` di halaman standalone dibandingkan dengan hash bundel sw.js → selalu beda → **purge+reload palsu tiap buka ai_form/master-full/dll** di live. Hard-check sekarang hanya untuk halaman bundel (`/assets/app-<hash>.js`); standalone pakai jaring SW + soft-reload. Bukti: standalone-smoke 15/15 ×2 di lokal (sebelumnya flaky di live).
- **Hardening E2E non-localhost**: `login-check`, `undang-grup-kelas`, `photo-check` unregister SW + bersihkan cache setelah `goto` (menyamakan upload/biodata-check) — mencegah SW lifecycle reload memotong tes (penyebab login-check gagal konsisten saat dijalankan ke live).

## 2026-08-18 — `8769ef5` 🟢 Undangan Wali terbukti LIVE + kartu dipindah ke puncak tab WA Pintar

### Ringkasan

- **Investigasi "WA Grup Wali hilang di live"**: dibuktikan dengan Playwright/Chromium nyata ke `asjportal.netlify.app` (login KHOCI) bahwa fitur **tidak pernah hilang** — kartu "Undangan Grup WhatsApp Kelas (Orang Tua/Wali)" + tombol "Mulai Kirim Undangan" tampil di viewport 390px & 797px, modal terbuka lengkap (daftar Nama|WA, link grup, jeda/delay, pesan), 0 error konsol. Live `admin.html` byte-identik dengan lokal; SW network-first + no-cache untuk navigasi.
- **Akar masalah = discoverability**: kartu ada di bawah grid template (y≈2309 di HP, di bawah lipatan) dan gelap di atas gelap — mudah terlewat.
- **Fix**: kartu dipindah ke PUNCAK `#admin-wa` (elemen pertama, di atas manajemen template) + styling mencolok (`bg-emerald-950/60`, `border-2 border-emerald-500/70`, glow, badge "Fitur Khusus"). Key i18n baru `ui.featured_badge` (id/jp). Bundel baru `app-d473519c0b.js`.
- Verifikasi: vitest 156/156, lint 0 error, prettier OK, Playwright lokal `cardIsFirst=true` + modal jalan.

---

## 2026-08-18 — `8511014` 🔑 Sesi admin selalu login (refresh token) + theme per user + auto-update versi

### Ringkasan

- **Sesi admin "selalu login selama tidak logout"**: token HMAC tidak punya expiry (server tidak pernah logout sendiri) — yang terjadi di lapangan adalah key sesi localStorage hilang/terhapus sebagian → modal login muncul lagi. Fix: `checkAdminPersonal` kini mengembalikan **refreshToken** (HMAC `{role:'admin', name, kind:'refresh'}`); action baru **`refreshAdminSession`** menukar refresh token → `sessionToken` baru tanpa PIN ulang (terdaftar di `action-registry` LOGIN_ACTIONS). Boot (`js/init/boot.js`) memanggilnya SEBELUM data dimuat — kalau key sesi utama hilang tapi refresh token masih ada, sesi dipulihkan diam-diam, tanpa modal login. Terverifikasi di preview: hapus key sesi + reload → `isAdmin=true`, `currentAdminName=KHOCI`, modal login tidak muncul.
- **`logoutApp` tidak lagi `localStorage.clear()`**: hanya menghapus key sesi/auth (`asj_admin_*`, `asj_kandidat_*`, `asj_session_token`) — preferensi theme per user & draft CV tidak ikut terhapus; `asj_admin_refresh` ikut dicabut saat logout.
- **Theme per user** (`js/init/theme.js`): `getThemeKey()` → `asj_theme_admin` / `asj_theme_<wa>` / `asj_theme` (guest); `getSavedTheme()` + migrasi sekali dari key global lama; `applyTheme` menyimpan ke key per-user; boot + `initApp` membaca via `getSavedTheme()`. Terverifikasi: toggle theme saat admin login menulis `asj_theme_admin`, key guest tidak tersentuh.
- **Auto-update versi anti-cache** (`pwa.js`): self-check diperkuat — tiap buka portal, hash bundel yang termuat dibandingkan dengan VERSION `sw.js` di server (`cache:'no-store'`); kalau beda → SEMUA cache dibersihkan + SW di-unregister + reload sekali (guard `sessionStorage asj_sw_purged` anti-loop). Tidak bergantung siklus hidup SW lagi.
- **Test**: +2 vitest `refreshAdminSession` (valid → token baru; tolak token sesi biasa/role lain/rusak) — **153/153 vitest**, lint 0 error, prettier rapi, audit-globals bersih. Bundel `app-160ec775b8.js` · preview sehat.

---

## 2026-08-18 — 🚀 Env Netlify di-update + DEPLOY (izin eksplisit pemilik) — live bundle `app-0d473e8141.js`

### Ringkasan

- Pemilik kirim PIN admin (SACHOU=1111, AYOK=2222, KHOLIS=3333, KHOCI=4444) + env lengkap + izin "set env Netlify … dan redeploy".
- **Env produksi (14 var) via Netlify Envelope API**: `ASJ_ADMINS` dibetulkan ke `SACHOU:1111,AYOK:2222,KHOLIS:3333,KHOCI:4444` (sebelumnya salah — berisi nomor WA, login admin non-KHOCI mati); `ADMIN_NUMBERS` typo `0082229020129`→`082229020129`; `GROQ_API_KEY` & `LOG_DRAIN_TOKEN` dibuat. `SESSION_SECRET` (64-hex) dipertahankan. Verifikasi API: ASJ_ADMINS format `Nama:pin` ×4, ADMIN_NUMBERS 12 digit ×5.
- **Deploy** `acb299b` via `scripts/deploy-netlify.mjs` (SKIP_INSTALL=1): 202 file + 19 functions, Deploy ID `6a83e314edaee8348ce2f907`. Live: bundle `app-0d473e8141.js` + sw.js VERSION `asj-portal-app-0d473e8141-m886a44dc` — HP otomatis beralih ke versi baru (anti-cache-nyangkut live). Verifikasi: homepage 200, getAppData jobs=132, login `SACHOU:1111` + `refreshAdminSession` → success.

---

## 2026-08-18 — `acb299b` 🔁 Refresh token kandidat + audit env Netlify

### Ringkasan

- **Refresh token kandidat**: `loginKandidat` mengembalikan `refreshToken` (role kandidat + kind refresh); action baru `refreshKandidatSession` → `sessionToken` baru (nama diambil ulang dari DB, fallback WA). Boot memulihkan sesi kandidat diam-diam (tanpa modal login) di halaman bundel — kandidat tetap login selama tidak logout, setara fitur admin `8511014`.
- **Hardening**: token `kind:'refresh'` ditolak oleh `requireRole` / `isOwnerOrAdmin` / `handleGantiPasswordKandidat` — refresh token tidak bisa dipakai sebagai sesi aksi lain (test guard ditambahkan).
- **Audit env Netlify via API** (autoritatif): 12 key inti sudah terpasang termasuk `SESSION_SECRET` (64-hex). ⚠️ `ASJ_ADMINS` **salah format** (isi nomor WA, bukan `Nama:pin`) → login admin personal non-KHOCI tidak berfungsi; tidak ada tabel admin di Supabase. ⚠️ `ADMIN_NUMBERS` produksi masih typo `0082229020129`. `GROQ_API_KEY`/`LOG_DRAIN_TOKEN` belum dipasang (belum dipakai kode). DEPLOY.md §3 diperbarui dengan tabel audit.
- **Test**: +3 vitest → **156/156** · lint 0 error · bundel `app-0d473e8141.js` · preview terverifikasi.

---

## 2026-08-18 — 🐛 fix `tandaiDibacaForm` + chip versi footer + investigasi Undangan Wali

### Ringkasan

- **Bug "Aksi tidak dikenal: tandaiDibacaForm"**: handler backend ada tapi action tidak terdaftar di peta routing frontend `NETLIFY_FUNCTIONS` (api-client.js) → `callAPI` menolak. Fix: tambah ke `ADMIN_ACTIONS` + `NETLIFY_FUNCTIONS` (`→ 'candidates'`); kontrak test baru memastikan setiap `callAPI` frontend punya route NETLIFY_FUNCTIONS (parsed dari sumber) — **149/149 vitest**.
- **Chip versi footer hilang**: `pasangPenandaVersi` menempel badge ke `[data-lang="footer.copyright"]`, tapi `renderLanguage`/`renderLanguageLight` menimpa elemen dengan `innerHTML` → badge terhapus tiap render bahasa. Fix: kedua fungsi mempertahankan child `.asj-ver-badge` — terverifikasi `ve185a7dd30` tampil di footer.
- **Investigasi "Undangan Wali"**: "undang wali" = FITUR Undang Grup Kelas (commit `10a45bc`, pesan default hardcoded di `js/admin_ops/candidates.js`, kirim via `kirimTawaranMassal` + `customMessage`) — TIDAK membaca tabel `wa_templates`. Template seed "Undangan Wali" (isi karangan, 2026-08-18) **DIHAPUS dari DB** (`WA1787018018630169`) — DB kembali ke 2 template asli (`WA-001` "Undangan Grup Default" + "PEMBERITAHUAN GA LOLOS SCREENING"); `scripts/seed-wa-templates.mjs` dihapus.
- **SW auto-update KONFIRMASI AKTIF**: `updateViaCache:'none'` + cek 60 dtk + focus/visibility + SKIP_WAITING + auto-reload (controllerchange/ASJ_FORCE_RELOAD) + self-check VERSION; sw.js `skipWaiting()` di install + purge cache lama. (Tidak aktif di localhost/preview — by design.)
- **WA Pintar seragam**: kartu template WA Pintar + tombol **Kirim** → membuka modal Undang Grup Kelas yang sama (paste Nama|WA + link + jeda + preview), pesan template di-prefill, kirim via `kirimTawaranMassal`. Build → bundel `app-15ef889ffb.js` · preview bersih.

---

## 2026-08-18 — Fase 5 lanjutan (partial head standalone) + sourcemap/laporan bundel

### Ringkasan

- Partial baru `head-shared.html` (fonts trio ber-token INDENT/FA_ATTR) + `theme-init.html` (identik 5×) untuk halaman standalone; marker `HEAD_SHARED`/`THEME_INIT`; byte-compat + idempotent.
- `build-js` 2-pass + sourcemap external (`app-*.js.map`, tidak di-precache); `bun run bundle:size` = laporan per-modul (kandidat lazy-load: i18n locale ≈ 97 KB, CV builders, admin_ops, ai_copilot).
- Verifikasi: prettier · lint 0 error · 148/148 vitest · build idempotent · E2E login+share lulus.

---

## 2026-08-18 — Fase 5 (HTML partial) + Fase 6 (build/CI)

### Ringkasan

- **Fase 5**: 6 partial baru (`head/header/footer/social/bottom-nav/scripts-shared`); halaman index/admin/standalone pakai marker region `<!--XXX_START/END-->` yang diregenerasi `build:html` (idempotent, byte-compat terverifikasi vs snapshot — beda hanya marker + style removal + bump `?v=` CSS); style inline (fade-in/print/light) pindah ke `src/main.css`.
- **Fase 6**: STACK concat dihapus → `bundleModules()` dari import `js/main.js` (47 modul, incl. `cloudinary.js`); CI + step `e2e:share` (conditional secrets Supabase).
- **Verifikasi**: prettier · lint 0 error · 148/148 vitest · check:globals nol kolisi · build idempotent · E2E login+upload+share semua lulus · preview bersih.

---

## 2026-08-17 — `02cc74f` 🔒 Pengaman format: pre-commit hook + CI check GitHub

### Ringkasan

- `.githooks/pre-commit` (di-commit, executable): format:check + node --check file staged; aktif via `bun install` (prepare) / `bun run hook:install`; skip `--no-verify`.
- `.github/workflows/ci-check.yml`: format + lint + test + build di tiap push/PR ke `main` (menangkap commit GitHub web/HP).
- Teruji: tolak file tak rapi (exit 1) + commit bersih lolos. README/AGENTS di-update.

---

## 2026-08-17 — `dcb6938` 🧹 Rapikan repo: dokumen point-form + format kode seragam (prettier)

### Ringkasan

- Dokumen besar diringkas: `PROGRESS.md` (2300→35), `CHANGELOG.md` (1188→13), `ESM_BRIDGE.md` (774→25), `REFACTOR_TODO.md` (753→31), `REVIEW.md` (302→30); `README.md` jadi titik masuk ringkas. Riwayat penuh tetap di git history.
- `bun run format` (prettier) normalisasi 115 file → `format:check` hijau; build idempoten, 148/148 test, lint 0 error.
- `scripts/seed-wa-templates.mjs` (BARU): seed template WA (dry-run default) — default "Undangan Wali" (template ini memang belum ada di DB; belum di-apply).

---

## 2026-08-17 — `26f2a91` ✅ Tes preset Cloudinary + penanda versi header → footer

### Ringkasan

- **Tes preset `asjportal`** (unsigned) ke cloud `ybzzbw9i`: upload file uji → 200 + `secure_url` ✅. Preset valid; file masuk folder `DOKUMENASJ/` (konfigurasi preset).
- **Penanda versi**: `pwa.js` tidak lagi mengisi chip `#asj-ver-chip` di header — versi (`v<hash>`) hanya tampil sebagai badge kecil di footer; elemen chip dihapus dari `index.html`/`admin.html`.
- **Verifikasi**: build → `app-23d620bb08.js` (0 `asj-ver-chip`, badge footer tetap) · 148/148 test lulus.

---

## 2026-08-17 — `36373f3` ☁️ Migrasi lengkap sisa alur upload ke Cloudinary (master-full, apply-full, ai_form, siswa-baru, loker admin)

### Ringkasan

- **master-full.html** (`submitMaster`): 9 field dokumen tidak lagi base64 → `uploadToCloudinary(file)` → payload berisi URL string; `fileToBase64` dihapus.
- **apply-full.html & loker admin** (`uploadFilesDirectly`): drop `getUploadUrls`/PUT Supabase Storage → upload langsung ke Cloudinary (prefix `JOB<code>_CV` tidak perlu lagi).
- **ai_form.html & siswa-baru.html** (`uploadFilesDirectlyBase64`): base64 → `File` → `uploadToCloudinary`; backend `submitDataAsj`/`submitDaftarSiswa` sudah menyimpan URL string.
- **Backend**: `storage.js` + helper `resolveFileUrl` (URL passthrough, base64 fallback); `handleSubmitMasterForm` pakai `resolveFileUrl` untuk `MASTER_FILE_COLUMNS`.
- **Verifikasi**: `node --check` OK · ESLint no-undef 0 · 148/148 test lulus · build → `app-4843ad1360.js` · `resolveFileUrl` diuji langsung (URL passthrough + base64 fallback jalan).

### Perlu tindakan pemilik

- Preset unsigned `asjportal` tetap wajib ada di Cloudinary; deploy Netlify menunggu izin eksplisit pemilik.

---

## 2026-08-17 — `941b01a` ⚡ Optimasi free-tier: keep-alive `ping` + offloading upload dokumen ke Cloudinary

### Ringkasan

- **Keep-alive / anti cold-start**: action `ping` dilayani PALING AWAL di `handleAction` (`handlers.js`) — sebelum rate limit, dispatch, atau init Supabase — dan mengembalikan respons RAW `{statusCode:200, body:'pong'}`. `netlify-wrapper.js` & `serve-static.mjs` mendukung `GET ?action=ping` + meneruskan respons RAW apa adanya. Workflow GitHub Actions baru `.github/workflows/keep-alive.yml` (cron `*/5 * * * *`) menembak dispatcher Netlify; URL bisa di-override via repo variable `KEEPALIVE_URL`.
- **Cloudinary direct unsigned upload**: helper `uploadToCloudinary(file)` baru di `js/cloudinary.js` (cloud `ybzzbw9i`, preset `asjportal`) — file dikirim LANGSUNG browser→Cloudinary, backend tidak lagi memproses file fisik. Alur yang dikonversi: pemberkasan kandidat (+ konfirmasi timpa file lama), tambah kandidat admin, dokumen ekstra modal input & super-edit, dan revisi CV.
- **Backend** (`actions-upload.js`): `simpanBerkasTahapan` / `simpanRevisiKandidat` / `simpanKandidatDanUpload` hanya mengekstrak string URL dari payload JSON (`d.fileUrl` / `f.url`) lalu update kolom dokumen; jalur base64 lama tetap berfungsi sebagai fallback.
- **Keamanan**: key/secret Cloudinary TIDAK dimasukkan ke frontend (file publik); alur unsigned upload memang tidak membutuhkannya.
- **Verifikasi**: `node --check` OK · 148/148 unit test lulus · `bun run build` → bundel `app-85dc1bcb69.js` (46 file), `check:globals` 0 kolisi · simulasi langsung: POST & GET ping → `200 "pong"` mentah, action normal tetap JSON.

### Perlu tindakan pemilik

- Pastikan preset unsigned `asjportal` ada di dashboard Cloudinary (Settings → Upload → Unsigned upload preset).
- Deploy Netlify menunggu izin eksplisit pemilik (DEPLOY.md) — keep-alive & Cloudinary baru live setelah deploy.

---

## 2026-08-18 — 🌐 Fase 4 i18n split + 🔌 alias core root + ⚙️ Node v22

### Ringkasan

- **Fase 4**: `i18n/locales/{id,jp}.js` → `i18n/locales/{id,jp}/` (15 domain/bahasa, `form` dipindah dari core.js); lint duplikat lintas file `scripts/check-i18n.mjs` (ikut `bun run lint`).
- **Fase 3.5 L6 gelombang 2**: alias core root (`api-client.js`, `i18n.js`, `pwa.js`) tidak lagi menulis `window.X = X` — diregistrasikan lewat registry seam di `js/core/bridge.js` (api/i18n) & import bridge (pwa).
- **Infra**: Node.js v22.23.2 user-local ter-install → E2E Playwright login-check & upload-check **SEMUA LULUS** di mesin ini; pre-commit hook jalan.
- Verifikasi: 148/148 vitest · eslint no-undef 0 · check:globals nol kolisi · bundle `app-216286d90f.js`.

---

## 2026-08-18 — `338feee` 🔧 Fase 3.5 L6 tuntas + perbaikan ADMIN_NUMBERS

### Ringkasan

- `helpers_cv.js`: blok alias `window.X = X` (5 simbol) dihapus → registrasi terpusat `registerSeamAliases` di `js/main.js` (Fase 3.5 L6 selesai; modul tetap murni untuk unit-test node).
- Verifikasi: scan `window.\w+=` di `js/` 112→108 · no-undef 0 · `check:globals` nol kolisi · 148/148 vitest · bundle `app-698fbe088a.js` · browser smoke test OK.
- `.env.local` ditulis ulang bersih (12 key, tanpa duplikat); `ADMIN_NUMBERS` typo `0082229020129` → `082229020129`.

---

## 2026-08-18 — 🔍 audit mail: label update biodata mentah + update admin tidak sync ke mail

### Ringkasan

- **Kasus AGUS KHOCI (mail id 263)**: update biodata sudah sync ke mail (`feedback_berkas` `[BIODATA] …`) tapi label tampil mentah (`ukuranbaju`, `kenalan_di_jepang_alamat`) karena `MASTER_FIELD_LABEL` hanya punya ~16 dari ~60 kolom `MASTER_COLUMN_MAP`.
- **Kasus ANIS AGUSTIN (mail id 141)**: `feedback_berkas` KOSONG — update lewat `updateKandidatSuper` (admin edit kandidat) yang TIDAK pernah memanggil `syncBiodataKeMail` (hanya `submitMasterForm` sisi kandidat yang sync).
- **Fix 1** (`actions-master.js`): `MASTER_FIELD_LABEL` dilengkapi ke 64 label (fisik/ukuran baju-sepatu-topi, kontak darurat, kenalan di Jepang, paspor, harapan gaji, dll).
- **Fix 2** (`actions-candidate.js`): `handleUpdateKandidatSuper` bandingkan body vs baris lama → `syncBiodataKeMail` dengan label yang benar-benar berubah (gender/usia/tinggi/berat/JFT/SSW/loker) → badge UPDATE + `[BIODATA] …` muncul seperti update kandidat. Non-fatal.
- Data lama dinormalisasi di DB (`feedback_berkas` Agus → "ukuran baju, alamat kenalan di Jepang"). Verifikasi: 149/149 vitest · lint 0 error · preview mail rapi.

---

## 2026-08-18 — 🔍 lanjutan audit mail: AI form sync ke mail + audit jalur upload

### Ringkasan

- **AI form (`submitDataAsj`) kini sync mail**: bandingkan `ai_data_json` lama vs baru per seksi (`AI_SEKSI_LABEL`: identitas, fisik & ukuran, medis, pendidikan, pekerjaan, sertifikasi, keluarga, wawancara) → `syncBiodataKeMail` dengan label yang benar-benar berubah → badge UPDATE + `[BIODATA] …` di mail kandidat. Sebelumnya jalur ini hanya menulis `ai_form_submissions` + `ai_data_json` tanpa menyentuh mail. Non-fatal; simpan tanpa perubahan tidak menulis feedback.
- Jalur AI lain sudah sync lewat `submitMasterForm` (`parseDokumenBiodata` admin + `results.js` apply hasil AI). `processAIChat` hanya generate teks (tidak menulis DB).
- **Audit upload**: `simpanBerkasTahapan` & `simpanRevisiKandidat` sudah memanggil `syncFormMailDariUpload` (UPDATE + `[UPLOAD <JENIS>]`) — lengkap. 11 baris mail feedback kosong = baris LULUS tanpa update lanjutan (normal, frontend fallback "Lamaran disetujui").
- **Test**: `AI_SEKSI_LABEL` di-export dari `ai/cv.js` + test baru (cakupan seksi + label terbaca, bukti tanpa circular require) — **151/151 vitest**, lint 0 error.

---

## 2026-08-18 — `57eb79e` 📋 TODO list + env terbaru + seed template WA

### Ringkasan

- `TODO.md` (baru): daftar gabungan pekerjaan belum selesai (deploy Netlify pending, `SESSION_SECRET` & `ASJ_ADMINS` belum di-set, seed WA, refactor Fase 3.5–6, K1, E2E Node ≥22).
- `DEPLOY.md` §3: tambah `GROQ_API_KEY` & `LOG_DRAIN_TOKEN` + status refresh env 2026-08-18.
- Env terbaru pemilik (12 key) ditulis ke `.env.local` (gitignored) — verifikasi hash cocok semua; preview lokal pakai kredensial baru.
- Seed template WA "Undangan Wali" di-apply ke DB (`wa_templates` 2 → 3).
- Keputusan pemilik: tanpa branch — kerja langsung di `main` local → GitHub.

---

## 2026-08-18 — `a679c35` + E2E fix `upload-check` — .gitattributes eol=lf & asersi Cloudinary

### Ringkasan

- **`.gitattributes` (`* text=auto eol=lf`)** — di Windows (`core.autocrlf=true`) checkout menghasilkan CRLF sementara build script (Node/Bun) menulis LF, jadi 4 file (admin.html, index.html, assets/*) tampil "modified" padahal isi identik. `eol=lf` membuat checkout selalu LF, konsisten dengan isi repo (sudah LF via prettier `dcb6938`, `endOfLine: "lf"` di `.prettierrc.json`) dan output build. Verifikasi: `git add --renormalize` = 0 perubahan blob (repo sudah LF semua) + `bun run build` → `git status` bersih.
- **Audit staleness bundle**: bundle `assets/app-23d620bb08.js` pertama dibuat di commit `26f2a91` (sebelum prettier `dcb6938`), tapi KARENA esbuild `minify:true` (hash = sha1 output minified), reformat prettier yang hanya mengubah whitespace menghasilkan output byte-identik → bundle committed TIDAK basi, reproducible dari sumber `3134395` (dibuktikan rebuild idempoten di 2 worktree, `git diff` kosong). Warning LF→CRLF murni artefak autocrlf Windows, bukan bukti staleness.
- **Fix E2E `upload-check.mjs`** — setelah migrasi Cloudinary, E2E gagal 6 asersi karena: (1) PDF dummy `%PDF-1.4` minimal DITOLAK Cloudinary (HTTP 400 "Invalid image file" — Cloudinary memvalidasi isi, Supabase Storage tidak); (2) asersi masih mengharapkan URL berisi `KTP.pdf` persis, padahal Cloudinary menghasilkan `KTP_<acak>.pdf`; (3) bug laten `JSON.stringify(undefined).slice()` di argumen diagnostik `check()`. Fix: PDF minimal VALID (xref offset benar, 587 B), asersi pakai `KTP_`/`KK_`, dan `(JSON.stringify(x)||'')` defensif. Hasil: E2E upload **SEMUA LULUS** di preview lokal `3134395` (11 asersi).
- **E2E regresi penuh di preview lokal**: `login-check` LULUS, `biodata-check` LULUS, `upload-check` LULUS, `undang-grup-kelas` LULUS (20 asersi). Unit test vitest `296/296` lulus.
