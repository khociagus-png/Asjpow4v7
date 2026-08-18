# CHANGELOG2 — ASJ Portal (riwayat terbaru)

> Kelanjutan `CHANGELOG.md` (legacy — entri lama ada di sana). Mulai sesi ini,
> entri per commit dicatat di sini supaya file riwayat tidak membengkak.
> Format: paling lama di atas (paling baru di bawah).

---

## 2026-08-18 — `8511014` 🔑 Sesi admin selalu login (refresh token) + theme per user + auto-update versi

### Ringkasan

- **Sesi admin "selalu login selama tidak logout"**: token HMAC tidak punya expiry (server tidak pernah logout sendiri) — yang terjadi di lapangan adalah key sesi localStorage hilang/terhapus sebagian → modal login muncul lagi. Fix: `checkAdminPersonal` kini mengembalikan **refreshToken** (HMAC `{role:'admin', name, kind:'refresh'}`); action baru **`refreshAdminSession`** menukar refresh token → `sessionToken` baru tanpa PIN ulang (terdaftar di `action-registry` LOGIN_ACTIONS). Boot (`js/init/boot.js`) memanggilnya SEBELUM data dimuat — kalau key sesi utama hilang tapi refresh token masih ada, sesi dipulihkan diam-diam, tanpa modal login. Terverifikasi di preview: hapus key sesi + reload → `isAdmin=true`, `currentAdminName=KHOCI`, modal login tidak muncul.
- **`logoutApp` tidak lagi `localStorage.clear()`**: hanya menghapus key sesi/auth (`asj_admin_*`, `asj_kandidat_*`, `asj_session_token`) — preferensi theme per user & draft CV tidak ikut terhapus; `asj_admin_refresh` ikut dicabut saat logout.
- **Theme per user** (`js/init/theme.js`): `getThemeKey()` → `asj_theme_admin` / `asj_theme_<wa>` / `asj_theme` (guest); `getSavedTheme()` + migrasi sekali dari key global lama; `applyTheme` menyimpan ke key per-user; boot + `initApp` membaca via `getSavedTheme()`. Terverifikasi: toggle theme saat admin login menulis `asj_theme_admin`, key guest tidak tersentuh.
- **Auto-update versi anti-cache** (`pwa.js`): self-check diperkuat — tiap buka portal, hash bundel yang termuat dibandingkan dengan VERSION `sw.js` di server (`cache:'no-store'`); kalau beda → SEMUA cache dibersihkan + SW di-unregister + reload sekali (guard `sessionStorage asj_sw_purged` anti-loop). Tidak bergantung siklus hidup SW lagi.
- **Test**: +2 vitest `refreshAdminSession` (valid → token baru; tolak token sesi biasa/role lain/rusak) — **153/153 vitest**, lint 0 error, prettier rapi, audit-globals bersih. Bundel `app-160ec775b8.js` · preview sehat.

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
