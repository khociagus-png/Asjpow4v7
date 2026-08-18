# PROGRESS2.md — Status Pekerjaan ASJ Portal (sesi terbaru)

> **File ini adalah kelanjutan `PROGRESS.md`** (yang lama disimpan sebagai legacy —
> riwayat sesi 2026-08-15 s/d awal 2026-08-17 ada di sana, dibaca kalau butuh
> konteks lama). Mulai sesi ini, entri baru dicatat DI SINI supaya file riwayat
> tidak terus membengkak. Lihat juga `CHANGELOG2.md` untuk riwayat per commit.

**Update terakhir:** sesi 2026-08-18 — dikerjakan oleh **codebuff** (via Freebuff) — `338feee` Fase 3.5 L6 tuntas + perbaikan ADMIN_NUMBERS.

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
