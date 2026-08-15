# PROGRESS.md — Status Pekerjaan ASJ Portal

> Pengingat untuk tim & AI assistant: baca file ini dulu sebelum mulai bekerja,
> supaya tidak mengerjakan ulang hal yang sudah selesai / tidak menyentuh yang
> memang belum waktunya.

**Update terakhir:** commit `c6744b4` (lihat `git log`).

---

## 🆕 SESI TERBARU — dedupe data & dokumen, share view, storage cleanup, CI

Rangkaian kerja terbaru (`e36fb64` → `c6744b4`), fokus: hilangkan data/file ganda
agar "1 loker = 1 kandidat = 1 CV/JFT/SSW/foto", perbaiki share view, dan pasang
CI.

### 1. Kandidat duplikat di database — dihapus & dicegah (`e36fb64`)

- **Penyebab:** WA korup (`62135812198` vs `628135812198` kehilangan digit) +
  `simpanKandidatDanUpload` selalu membuat baris baru tanpa cek duplikat.
- **Fix:** upsert per WA (baris lama di-update, bukan bikin baru), validasi format
  WA (62 + 10/11 digit) di `simpanKandidatDanUpload` & `daftarKandidat`, fix
  search admin (`queryPaged` or=(…) tanpa kurung → HTTP 400).
- **Eksekusi (produksi):** 30 baris kandidat + 1 master duplikat dihapus
  (253 → 222 kandidat, master 1:1). Merge RIZKY/DEILA: kandidat kosong ASJ00156
  dihapus, master lengkap DEILA dipindah ke WA kanonik `628581541420`.

### 2. Multi-apply — kandidat boleh melamar banyak loker (`ee459c9`, `9035526`, `e534de5`)

- `submitApply` dedup per **(WA + job)**: job sama → update baris, job beda →
  baris baru (lamaran lama tidak lagi tertimpa).
- `attachApplications` melampirkan SEMUA lamaran per WA di `getAppData`
  (admin & kandidat) + `getCandidatesPage`.
- UI: badge job semua lamaran di dashboard kandidat & modal CV admin (chip `+N`
  di tabel), dropdown Job Dilamar di Edit Cepat (LULUS-first), peringatan
  multi-apply di `apply-full.html`.
- `scripts/sync-idloker.mjs` (dry-run default, `--apply`): 15 kandidat
  `id_loker_pilihan` disinkronkan ke lamaran LULUS terbaru.

### 3. share.html & endpoint `/api/share-data` (`f1a1f21`, `1f6eb68`, `2d7a46c`, `c6744b4`)

- Fungsi netlify `share-data.js` + `handleShareData` + route GET di preview
  (sebelumnya 404 → "Akses Ditolak").
- **extraDocs** kini dari folder master Supabase Storage (KK/KTP sync — 21/21
  kandidat TG633), bukan dari keterangan form yang kosong.
- **Dedupe per tipe dokumen + klasifikasi nama lawas** (`docTypeOf`):
  `1. X_CV.xlsx`/`nama_jft.pdf`/`X_PAS_PHOTO.jpg` dikenali, alias dinormalisasi
  (CVFILE→CV, PHOTOFILE→PHOTO, KARTU_KELUARGA→KK), CV/JFT/SSW/foto selalu tipe
  utama → **tiap kartu tepat 5 tombol (CV, JFT, SSW, KK, KTP)**, sama seperti
  produksi.
- `share.html` pakai klasifikasi kanonik yang SAMA + dedupe defensif di
  frontend (tampilan bersih walau backend lama belum di-deploy).
- Hapus aksi mati `superSyncCleanup` dari `api-client.js`; audit endpoint
  menyeluruh (tidak ada endpoint hilang lain).

### 4. Storage cleanup & upload yang menimpa (`bf140e0`, `b6ae9dd`, `abb5352`)

- `hapusJenisVarian` kini menghapus varian **bertimestamp** (`KTP_1786….pdf`),
  bukan hanya `KTP.ext` — upload baru selalu menimpa file lama per tipe
  (isVarianOf + unit test).
- `scripts/scan-orphan-files.mjs` (paginasi penuh + `--apply` + backup JSON ke
  `.freebuff/`): **195 file yatim dihapus dari `master/`** (25 varian-lama,
  153 `.keep`, 17 file folder test) — verifikasi 0 tersisa, share view utuh.
- `scripts/cleanup-job-misc.mjs`: audit `jobs/` & `misc/` — **77 file yatim di
  `jobs/`** (template CV 2026, pamflet/templateCv_TGxxxASJ lama, folder test).
  Dry-run siap; eksekusi menunggu konfirmasi.

### 5. CI / e2e (`.github/workflows/e2e-share.yml`)

- `e2e/share-view.mjs` (script npm `e2e:share`): cek API share-data + browser
  check best-effort; dijalankan vs produksi tiap push ke `main`.
- Fix `cache: npm` (repo tidak punya `package-lock.json`) → `npm install`;
  run CI hijau (contoh run 31865030810).

### Catatan deploy

- Data & storage sudah bersih di Supabase (berlaku untuk produksi).
- **Belum di-deploy ke Netlify** — backend baru (dedupe share-data, klasifikasi
  docTypeOf, upload menimpa) aktif di produksi setelah deploy ulang.

---

## ✅ SUDAH SELESAI

### 1. Patch-in-place: aksi admin instan (tanpa tarik ulang semua data)

Backend tiap aksi mengembalikan baris yang berubah; frontend menimpa di memori

- render tabel aktif saja. Tidak ada lagi global-loader/skeleton per klik.

| Aksi                                                        | File                                                                                                                                  |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Mail: review / LULUS / GAGAL / hapus / hapus massal         | `js/07_api.js` (patchFormMail, upsertCandidateMemory, removeFormMail) + `handlers.js` (handleFormStatus, handleDeleteForm)            |
| Kelola: ubah status loker, hapus loker, edit tahapan DB JOB | `js/07_api.js` (upsertJobMemory, removeJobMemory) + `handlers.js` (handleUbahStatusJob, handleHapusJobData, handleUpdateTahapanDbJob) |
| Kandidat: tombol Gagal di list kandidat                     | `js/11_admin_ops.js` (keluarkanKandidatDariJob) + `handlers.js` (handleTandaiGagalJob)                                                |
| Jadwal: tambah / hapus                                      | `js/07_api.js` + `actions-extra.js`                                                                                                   |
| Tugas: tambah / kerjakan / selesaikan / hapus               | `js/07_api.js` + `actions-extra.js`                                                                                                   |
| Badge mail terpusat                                         | `js/03_engine.js` (updateMailBadge)                                                                                                   |

Tarikan penuh (`getAppData`) masih jalan saat: load awal, pindah tab,
auto-refresh 60 dtk, dan aksi berat (buat loker/kandidat, upload revisi) —
itu sengaja.

### 2. Build CSS Tailwind hidup kembali

- `src/main.css` (tema + CSS custom + safelist kelas dinamis) → `assets/main.css`
- **WAJIB** `bun run build:css` setelah mengubah kelas Tailwind di HTML/JS.

### 3. Bersih total dari Google/Drive → 100% Supabase

- Semua URL `drive.google.com` / `lh3.googleusercontent.com` / `docs.google.com`
  dihapus (0 tersisa; satu-satunya Google = API Gemini di `actions-ai.js`).
- `gas-client.js` → `api-client.js`; semua halaman + sw.js pakai `callAPI()`.
- Fallback Google Docs Viewer di `share.html` diganti render lokal (SheetJS/mammoth).
- Satu hal yang PERLU dicek manual: demo assets di `_lib/demo.js` menunjuk
  `assets/logo_asj.png`, `tokyo_banner.jpg`, `tokyo_footer.jpg` di bucket
  `asj-files/assets` — pastikan file itu ada, kalau belum upload ulang.

### 4. Prettier + ESLint (sekarang benar-benar ada di repo)

- Config: `.prettierrc.json`, `.prettierignore`, `eslint.config.js`.
- Semua JS sudah diformat seragam (single quote, semi, 2-spasi).
- ESLint menemukan & sudah diperbaiki: **4 key duplikat di `i18n.js`**
  (`mf_masuk` tombol "Masuk" vs label bulan masuk; `ai_pekerjaan` header seksi)
  → dipisah jadi `mf_masuk_bulan` & `ai_pekerjaan_5`, pemakaian di
  `master-full.html` & `ai_form.html` di-update.### 5. Bundel JS: 20 script tag → 1 file
- `scripts/build-js.mjs` (idempotent) → `assets/app-<hash>.js` (minify esbuild).
- `admin.html` & `index.html` cuma 1 tag bundel; sw.js SHELL + VERSION ikut.
- Artefak Vite mati dihapus dari semua 7 halaman: stub `assets/*-DONYcaRI.js`,
  `main-DEfa6N4x.js`, dan `<link rel="modulepreload">` yang 404.### 6. Pecah HTML: semua modal bersama diekstrak + dimuat RUNTIME (on-demand)
- **Semua 30 modal** (146 KB) ada di `partials/modals-shared.html` (SATU sumber).
- `bun run build:html` kini **menyalin partial → `assets/modals-shared.html`** dan
  meng-inject **loader runtime** (bukan markup inline) di `admin.html`/`index.html`:
  loader sinkron (XMLHttpRequest) saat parse → modal tersedia SEBELUM
  `DOMContentLoaded`/kode aplikasi berjalan; ada retry + jaring pengaman
  `pointerdown` kalau fetch pertama gagal.
- **Efek: `admin.html` 253 KB → 107 KB, `index.html` 253 KB → 116 KB**
  (−146 KB markup modal per halaman — parse HP lebih ringan).
- `sw.js`: SHELL + precache `/assets/modals-shared.html`, dan VERSION ikut hash
  partial (`-m<hash>`) → SW otomatis refresh saat partial berubah tanpa ubah JS.
- `src/main.css` menambah `@source "./../partials/**/*.html"` supaya kelas di
  partial tetap ter-scan Tailwind (kelas modal TIDAK hilang dari CSS).
- 18 modal identik (85 KB) + 9 modal yang tadinya beda versi (146 KB total)
  dipindah ke `partials/modals-shared.html` (SATU sumber) → di-inject via
  `bun run build:html`. Hasil build byte-identik.
- **Rekonsiliasi 9 modal divergen**: diputuskan berdasarkan bukti, bukan tebakan
  - `rincian-builder` → versi INDEX (admin kehilangan `rb-catatan` yang DIBUTUHKAN
    JS `13_rincian_builder.js` → admin sebelumnya crash saat buka builder ini; kini diperbaiki)
  - `reject-mail` → versi ADMIN (superset: tombol instruksi PDF JFT/SSW)
  - `interview` → versi INDEX (`qween_jeklin.webp` branding baru)
  - `cv-mini`, `list-kandidat` → versi ADMIN (styling konsisten dengan app)
  - `admin`, `kandidat`, `cv`, `edit-kandidat` → versi INDEX (label/kosmetik)
- Sumber bug "ubah satu halaman, lupa yang lain" hilang untuk SEMUA modal.

---

## 🌐 URL PENTING (jangan lupa)

| Apa                                | URL                                                                    | Catatan                                                                                                                               |
| ---------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Netlify lama (produksi, aktif)** | `https://asjportal.netlify.app/`                                       | MASIH DIPAKAI user. Token akun netlify ini **tipis** — jangan deploy ke sini dulu. Rencana: pindah ke akun Netlify baru (email baru). |
| **Preview Freebuff**               | berubah tiap sesi — cek `freebuff-preview status` (field `previewUrl`) | Terakhir aktif: `https://3000-ed83aee3-c760-493b-82b4-a0c7f56d870e.daytonaproxy01.net`                                                |

> ⚠️ Setiap deploy Netlify baru WAJIB cek dulu: preview + e2e (`e2e/login-check.mjs`, `e2e/photo-check.mjs`, `e2e/probe-cleanup.mjs`) lalu bandingkan dengan `https://asjportal.netlify.app/`. Jangan pernah deploy ke akun lama tanpa persetujuan.

## 📊 Hasil verifikasi terakhir (preview vs Netlify lama) — commit `2b25a44`+

| Cek                                         | Preview (kode baru)                                                | Netlify lama (asjportal.netlify.app)                                                                   |
| ------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `e2e/login-check.mjs`                       | 🎉 SEMUA LULUS (19/19)                                             | 💥 **10 GAGAL** (login kandidat & admin macet, data tidak render)                                      |
| `e2e/photo-check.mjs`                       | 🎉 SEMUA LULUS (3/3, foto publik/kandidat/admin)                   | — (login macet, tidak bisa diuji)                                                                      |
| `e2e/modal-runtime-check.mjs`               | 🎉 SEMUA LULUS (8/8: modal shared via runtime, fix `rb-catatan`)   | — (kode lama, modal inline)                                                                            |
| `e2e/probe-cleanup.mjs`                     | ✅ **SEMUA BERSIH** — 0 GAS, 0 request Google, brand dari Supabase | ❌ `callGAS` MASIH ADA di 6 halaman + request Google (`lh3.googleusercontent.com`, `drive.google.com`) |
| Font JP (`fonts/noto-jp/*.woff2`, 120 file) | ✅ (di-restore dari deploy lama ke repo)                           | ✅ (file ada di deploy)                                                                                |

Kesimpulan: keluhan di situs lama ("login sukses tapi data kosong / progress 0 / call gas masih jalan")
terbukti dari data: Netlify lama masih pakai GAS + gambar dari Google/drive, dan login-nya macet.
Preview kode terbaru bersih total. **Jangan deploy ke akun lama** — lanjut rencana akun Netlify baru.

### 7. Optimasi kecepatan ambil data — filter query Supabase SERVER-SIDE

(commit `15d2b56`+, file: `netlify/functions/_lib/supabase.js` + `handlers.js`)

Sebelumnya beberapa alur menarik ±300 baris `select *` lalu menyaring di JS:

| Alur                                                      | Sebelum                                 | Sesudah                                                                             |
| --------------------------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------- |
| Login kandidat / cek WA / approve-reject / ganti password | `findCandidates()` 300 baris penuh      | `findCandidateByWaFiltered()`: query `no_wa=eq.X` (atau `wa`/`whatsapp`), 1-5 baris |
| getAppData **mode kandidat** (dashboard kandidat)         | 300 baris untuk cari 1 baris sendiri    | query targeted by WA                                                                |
| `attachBerkasBio` (admin load + tiap halaman kandidat)    | scan 500 baris pemberkasan + 500 master | filter `wa.in.(...)` per daftar WA kandidat (max 150)                               |
| Hapus loker (cek kandidat terkait)                        | scan 300 baris                          | `select=id&id_loker_pilihan=eq.X&limit=1`                                           |
| `nextCandidateId` (approve → kandidat baru)               | scan 300 baris cari max                 | `select=id_kandidat&order=desc&limit=5`                                             |
| getAppData admin (jadwal/tugas/mail/template)             | 5 fetch berurutan                       | `Promise.all` paralel                                                               |

Setiap jalur cepat punya **fallback ke perilaku lama** kalau skema kolom berbeda
(balikan `undefined` → scan penuh), jadi aman untuk skema DB apa pun.

> ✅ **Verifikasi (langsung ke handler + Supabase asli)** — `e2e/backend-fast-path.mjs`
> 12/12 lulus: login kandidat (jalur cepat), getAppData kandidat (1 baris miliknya
>
> - berkas ter-attach via filter WA-set), getAppData admin (50 kandidat halaman 1 +
>   formInbox/schedules/tugas/waTemplates + berkas), gantiPassword jalur cepat.
>   Read-only: `maxCandidateIdNumber` → max=224, `countCandidatesForJob` → false,
>   `findCandidateByWaFiltered` → null (definitif). Unit test 16/16.
>   Browser e2e penuh belum bisa tuntas karena sandbox preview crash berulang
>   (502/". Is the Sandbox started?") — TEST 1 (getAppData publik) lulus 2× dgn
>   kode baru. Saat preview stabil, jalankan suite e2e sekali lagi.

### 8. Perbaikan bug kecil (commit setelah QR/auto-centang/i18n)

| Bug (laporan user)                                        | Status               | Catatan                                                                                                                                                                                                                     |
| --------------------------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **QR card dashboard / QR loker error**                    | ✅ DIPERBAIKI        | QR dulu pakai `api.qrserver.com` eksternal → sekarang **lokal** (`vendor/qrcode-generator.min.js`, data URL). Student card (`sc-qr`) & modal QR loker ikut; server bridge tidak lagi kirim URL eksternal. Offline/PWA aman. |
| **Dropdown kota/gender belum id-jp**                      | ✅ DIPERBAIKI        | `master-full.html`: opsi gender/agama/status nikah kini `data-lang` (ID: Laki-laki/Perempuan… JP: 男性/女性…) via `renderLanguageLight`.                                                                                    |
| **Auto-centang aksi review/approve/reject**               | ✅ DIPERBAIKI        | Baris mail yang baru diproses otomatis ter-centang (`MAIL_SELECTED`) → tinggal hapus massal. **Hapus mail HANYA menghapus baris `database_asj_form` — data kandidat & master TIDAK ikut terhapus.**                         |
| Gak bisa hapus jadwal                                     | ✅ SUDAH (cek ulang) | Handler cari `id_jadwal` ATAU `id` lalu hapus via PK; `hapusJadwal(FAKE)` → "Jadwal tidak ditemukan." (lookup OK).                                                                                                          |
| Papan tugas tanpa hapus                                   | ✅ SUDAH (cek ulang) | Tombol hapus tugas sudah ada; `hapusTugas(FAKE)` → "Tugas tidak ditemukan." (OK).                                                                                                                                           |
| Loker publik "Lamar" harus tetap CLOSED saat proses jalan | ✅ SUDAH             | `jobTutupUntukLamar` menutup lamar saat tahapan seleksi berjalan (CHECK KAIWA → … → FLIGHT) walau status kolom belum CLOSE.                                                                                                 |
| Link buka tab browser bukan PWA (Dossier/Master/AI)       | ✅ SUDAH             | `bukaFormBridge` pakai `window.location.href` (tab sama, tetap di PWA).                                                                                                                                                     |
| Tombol Gagal di list kandidat tidak menggugurkan          | ✅ SUDAH             | `tandaiGagalJob` mengembalikan candidate+form → patch-in-place sinkron.                                                                                                                                                     |

### 9. Helper validasi upload SERAGAM (format + ukuran) di semua form

(commit setelah QR/auto-centang/i18n; file: `js/upload-guard.js`)

Sebelumnya tiap form punya cek sendiri-sendiri & ada yang TIDAK punya sama sekali
(admin: template/pamflet/revisi tidak divalidasi; apply-full tidak cek format):

| Form upload                                            | Sebelum                               | Sesudah                                                            |
| ------------------------------------------------------ | ------------------------------------- | ------------------------------------------------------------------ |
| Admin: template CV, pamflet, file revisi               | ❌ tanpa validasi                     | ✅ `onchange="cekUploadFile(...)"` (format dari `accept` + ukuran) |
| `ai_form.html` (pas foto + JFT/SSW/KTP/KK/ijazah/UNIV) | cek ukuran saja, format baru di akhir | ✅ guard di `compressImage` (10 MB) & `handleDocUpload` (3 MB)     |
| `apply-full.html` (photo/CV/JFT/SSW/ekstra)            | cek ukuran 2 MB, tanpa cek format     | ✅ guard di `handleFile` (mencakup semua + dokumen ekstra dinamis) |
| `master-full.html` (9 dokumen)                         | cek 2 MB + ekstensi (manual)          | ✅ guard seragam di `handleFile`                                   |
| `siswa-baru.html` (KTP/KK/ijazah)                      | cek 3 MB + ekstensi (manual)          | ✅ guard seragam di `handleDocUpload`                              |

**Cara kerja `cekUploadFile(input, { maxMb })`:**

- Format dicek dari atribut `accept` (`image/*` diperluas ke jpg/jpeg/png/gif/webp/bmp).
- Ukuran dicek dari argumen `maxMb` / `data-max-mb` / default 5 MB (base64 +30% tetap muat).
- Gagal → `alert` pesan jelas (format yang diizinkan + batas MB, i18n ID/JP, fallback ID),
  input di-reset, return false. Sukses → return true (alur lama jalan normal).
- Dipakai admin/index via bundel (build-js STACK) + 4 halaman standalone via
  `<script src="/js/upload-guard.js?v=1">`.

Verifikasi: bundel 21 file memuat guard; 32/32 input `type="file"` ter-guard; test 16/16;
format:check bersih; lint 0 error.

### 10. AI Master (ai_form.html) — perbaikan iPhone: kolom chat hilang/"puter-puter"

Keluhan: di iPhone kolom chat susah terlihat & tampak berputar/berpindah sendiri.
Penyebab & fix di `ai_form.html`:

1. **`100vh` vs URL bar Safari** — `100vh` di iPhone termasuk area di belakang URL
   bar → kolom chat (terutama bar input) terpotong di bawah layar. Sekarang pakai
   **`100dvh`** (dengan fallback `100vh` untuk browser lama) di `#chatPanel`,
   `#formPanel`, dan `<body>` (inline `height:100vh;height:100dvh`).
2. **`resize` memaksa pindah tab tiap scroll** — Safari iPhone memicu `resize`
   setiap kali URL bar naik/turun saat scroll, dan `handleResize()` lama memanggil
   `switchTab('chat')` → layar "puter-puter" (lompat balik ke tab chat) dan
   pengguna di tab Preview CV dilempar ke Chat. Sekarang `handleResize` hanya
   bereaksi saat **menyebrang breakpoint md** (mis. rotasi layar) dan kembali ke
   **tab terakhir yang aktif** (`lastMobileTab`), bukan paksa 'chat'.
3. **Safe-area iPhone** — bar input chat diberi `padding-bottom:
max(0.75rem, env(safe-area-inset-bottom))` supaya tidak tertutup home-indicator
   (`viewport-fit=cover` sudah ada).

Verifikasi: 2 blok inline script lolos `node --check`, test 16/16, format:check
bersih, build idempotent (hanya `ai_form.html` berubah). Belum dicek visual di
browser (sandbox preview tidak stabil) — perilaku sama untuk desktop (`md:flex`
side-by-side) & Android; fix khusus jalur mobile.

---

## ⏳ BELUM SELESAI

1. **Preview visual belum diverifikasi** (tool preview tidak tersedia di sesi
   pengerjaan) — terutama: modal masih terbuka normal di admin & index, dan
   offline mode (SW precache) tetap jalan. Saat pertama buka setelah deploy:
   **hard refresh sekali** (VERSION SW baru otomatis buang cache lama).
   (SW version baru otomatis buang cache lama).
2. **Deploy ke Netlify belum** — sesuai keputusan tim: tunggu sampai semua fix
   beres dulu (token free tier tipis).
3. **Demo assets cek manual** (lihat #3 di atas).
4. Sisa `refreshDataDinamis` di aksi berat (`simpanJobBaru`, `editLokerFull`,
   `simpanKandidatDanUpload`, sync 3-way, upload revisi) — bisa di-patch
   berikutnya kalau dirasa masih lambat.

---

## Command yang dipakai

```bash
bun install
bun run build        # CSS + JS (WAJIB setelah ubah kelas Tailwind / file JS)
bun run build:css    # hanya CSS
bun run build:js     # hanya bundel JS (setelah ubah js/, api-client.js, i18n.js, pwa.js)
bun run format       # prettier semua (kecuali assets/vendor/*.html)
bun run format:check
bun run lint         # ESLint — error = bug nyata, warning = gaya
bun run test         # Vitest (41 tes)
```

## Catatan untuk AI assistant (biar tidak muter-muter baca code)

- **Struktur**: classic scripts global scope — fungsi lintas file saling panggil.
  Frontend JS di-bundel jadi `assets/app-<hash>.js`, jadi kalau mengubah JS
  **wajib `bun run build:js`** sebelum selesai.
- Lokasi logika: render admin `js/05_render.js`, aksi backend
  `netlify/functions/_lib/handlers.js` + `actions-extra.js`, DB helper
  `_lib/supabase.js`, i18n `i18n.js` (hati-hati key duplikat!).
- Saat minta fix, sebutkan file + fungsi spesifik — menghemat baca ulang.
