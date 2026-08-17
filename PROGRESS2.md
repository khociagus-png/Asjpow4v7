# PROGRESS2.md — Status Pekerjaan ASJ Portal (sesi terbaru)

> **File ini adalah kelanjutan `PROGRESS.md`** (yang lama disimpan sebagai legacy —
> riwayat sesi 2026-08-15 s/d awal 2026-08-17 ada di sana, dibaca kalau butuh
> konteks lama). Mulai sesi ini, entri baru dicatat DI SINI supaya file riwayat
> tidak terus membengkak. Lihat juga `CHANGELOG2.md` untuk riwayat per commit.

**Update terakhir:** sesi 2026-08-17 — dikerjakan oleh **codebuff** (via Freebuff) — ☁️ Migrasi lengkap sisa alur upload ke Cloudinary (master-full, apply-full, ai_form, siswa-baru, loker admin).

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
