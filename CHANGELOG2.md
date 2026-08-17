# CHANGELOG2 — ASJ Portal (riwayat terbaru)

> Kelanjutan `CHANGELOG.md` (legacy — entri lama ada di sana). Mulai sesi ini,
> entri per commit dicatat di sini supaya file riwayat tidak membengkak.
> Format: paling lama di atas (paling baru di bawah).

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
