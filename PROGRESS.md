# PROGRESS.md — Status Pekerjaan ASJ Portal

> Pengingat untuk tim & AI assistant: baca file ini dulu sebelum mulai bekerja,
> supaya tidak mengerjakan ulang hal yang sudah selesai / tidak menyentuh yang
> memang belum waktunya.

**Update terakhir:** sesi lanjutan REVIEW.md S2 (scan penuh → query ter-filter).

---

## 🆕 SESI TERBARU — Lanjutan bottleneck: sisa scan penuh → query server-side (REVIEW S2)

Lanjutan optimasi "filter query Supabase SERVER-SIDE" (bagian 7 di bawah):
39 call `findCandidates()`/`findJobs()`/`findForms()` dipangkas ke ±15, sisanya
fallback (hanya jalan saat kolom/tabel tidak dikenal) atau memang harus penuh.

- **Helper baru `netlify/functions/_lib/supabase.js`** (kontrak `undefined` =
  fallback scan): `findJobByCodeFiltered`, `findCandidateByIdFiltered`,
  `findFormsByWa`, `findFormByIndexFiltered` (rowIndex inbox via `order`+`offset`),
  `findFormsByWaList` (in-filter WA-set), `findCandidatesByJobFiltered` (ilike +
  verifikasi token eksak di JS), `maxJobCodeNumber`.
- **Konversi ±24 call site** di `handlers.js`, `actions-extra.js`, `actions-ai.js`:
  aksi mail (review/approve/reject/hapus/tandai-dibaca → 1 baris by index;
  tandai-gagal & semua alur kandidat → hanya lamaran WA-nya), master & biodata
  (`findMasterByWa` via in-filter), simpan/upload berkas & revisi (lookup kandidat
  by WA/id via query), job (kode baru via `maxJobCodeNumber`, `getJobMapped`,
  validasi lamaran), share-data (job by code + kandidat by job + lamaran per
  WA-set).
- **Sengaja dipertahankan scan penuh**: daftar admin `loadCandidatesUnik`
  (dedupe-by-WA + urutan updated_at — butuh keputusan produk), inbox admin
  (formInbox penuh), loker publik, diagnostik `getAppConfig`,
  `handleGetDriveLinkCandidates`, `daftarKandidat` (deteksi tabel).
- **Bonus**: `e2e/backend-fast-path.mjs` memakai WA mentah (`0821…`) sebagai
  payload getAppData kandidat padahal token & frontend memakai bentuk
  ternormalisasi (`62821…`) → sesi dianggap tidak valid & 2 asersi gagal.
  Diperbaiki: pakai `login.wa` (normalisasi sama seperti `localStorage
  'asj_kandidat_wa'` di `04_auth.js`).
- **Verifikasi**: `node --check` 4 file · unit 49/49 · lint 0 error ·
  `format:check` bersih (4 file) · `e2e/backend-fast-path.mjs` 12/12 · live
  preview: `share-data?job=TG591ASJ`, `isJobRequiresCv`, `getAppData` sukses
  dengan data Supabase asli.

> ⚠️ Belum di-commit/deploy. Perlu `git add -A && git commit && git push` +
> deploy ulang lewat Freebuff supaya live ikut versi ini.

---

## 🆕 SESI TERBARU — Perombakan UI solid + tema light/dark merata (`67bd3e0`)

Tujuan: tampilan **solid** (tanpa backdrop-blur/transparansi) supaya teks selalu
terbaca jelas di semua halaman & tema, dan menu samping ikut tema light/dark.

### Yang berubah

- **`.glass-panel` solid** — `background:#0d0d0d` (sebelumnya `#000000b3` +
  `backdrop-filter: blur(12px)`); semua tombol header/nav yang translucent
  (`bg-white/20` + blur) jadi solid (`bg-black hover:bg-zinc-800`,
  `border-white/60`); header tanpa `rounded-[2.5rem]`, overlay gradient tanpa
  rounding; tombol close-loader & shield admin `bg-red-600` solid; overlay
  share.html `rgba(30,41,59,0.97)` (sebelumnya 0.7 + blur).
- **Menu samping (hamburger) ikut tema** — `#mobile-nav-menu` memakai CSS
  variables `--mn-bg/--mn-surface/--mn-text/…`; `body.theme-light` menimpanya
  (src/main.css +596 baris, assets/main.css rebuild → `?v=4f2c8a1e73`).
- **Tema merata ke semua halaman mandiri** — `ai_form`, `apply-full`,
  `master-full`, `share`, `siswa-baru` kini punya `data-page` + inline theme
  script (`theme-light`/`theme-dark` di `<body>`); sebelumnya hanya index/admin
  yang ikut tema (menu samping halaman mandiri tidak pernah ter-tema).
- **Fallback banner/footer** — `DEFAULT_ASSETS` di `js/02_init.js`: banner/footer
  default dari Supabase Storage dipakai saat backend belum mengirim ASSETS
  (mis. preview tanpa backend) → banner & footer SELALU tampil.
- **Filter & tab publik solid per-tema** — warna tombol filter (`js/05_render.js`)
  dan tab Loker/Layanan (`js/01_public.js`) solid untuk tema terang & gelap;
  theme toggle light style solid (`bg-slate-100 … border-stone-300`).

### Verifikasi

- Build byte-identik dengan working copy; test 41/41; lint 0 error.
- Preview lokal (port 3100): halaman termuat, `getAppData` sukses dari Supabase
  asli (data job live), console bersih.

Catatan: aktif di produksi setelah **deploy ulang ke Netlify**.

---

## 🆕 SESI TERBARU — Dossier admin: tombol dokumen hilang di backend rebuild

Keluhan user: "ini fitur Netlify lama yang hilang di yang baru" — di modal ASJ
DOSSIER (modal CV admin) tombol **FORMAT CV / SERTIF JFT / SERTIF SSW** tidak
muncul walau data file-nya ada di DB.

### Akar masalah & fix

- Modal dossier membaca `c.jftUrl / c.sswUrl / c.cvUrl` (nama yang dikirim
  backend Netlify GAS lama), tapi `mapCandidate` di backend rebuild hanya
  mengembalikan `jft / ssw / fileCv` → kondisi `if (c.jftUrl && …)` selalu
  false → tombol permanen `hidden`.
- **Fix** (`netlify/functions/_lib/supabase.js`): `mapCandidate` kini menambah
  alias `jftUrl` / `sswUrl` / `cvUrl` (nilai = jft / ssw / fileCv). Konsumen
  lain (`07_api.js`) sudah punya fallback `jftUrl || jft`, jadi tidak ada yang
  rusak.
- **Verifikasi:** probe API `getCandidatesPage` (q=SUSILO) → ketiga alias
  terisi URL Storage; preview admin → dossier SUSILO HADI SAPUTRA (ASJ00217)
  menampilkan FORMAT CV / SERTIF JFT / SERTIF SSW, foto (PHOTOFILE) & CV
  (CVFILE) termuat dari Storage, console bersih. Test 41/41.

Catatan: aktif di produksi setelah **deploy ulang ke Netlify**.

---

## SESI SEBELUMNYA — Cek Data publik, CV rirekisho, z-index close, audit pas_photo

Rangkaian kerja terbaru (`1710865` → seterusnya), fokus: tombol publik yang
mati, CV rirekisho yang tidak lengkap (foto / alamat JP / tombol X), dan
konsistensi close modal + data foto kandidat.

### 1. Tombol "Cek Data" di landing publik — kini berfungsi (`1710865`)

- **Penyebab:** `getDaftarSiswaBaru` (fungsi `bridge-links`) butuh sesi admin,
  padahal tombolnya ada di landing publik. Pengunjung tanpa login dapat
  `sessionInvalid` → `callAPI` reload halaman → tombol terasa mati.
- **Fix:** endpoint jadi publik; **hanya kolom yang ditampilkan modal** yang
  dikirim (id, nama, gender, alamat) — WA/email/URL KTP-KK-ijazah tidak lagi
  bocor ke publik; urut `created_at` (baris legacy `timestamp` null).
- **Gender:** dinormalisasi ke `L`/`P`/`''`; badge "—" netral untuk yang belum
  diisi (sebelumnya apa pun yang bukan 'L' tampil P — YOGA/BAKTI jadi P).

### 2. CV rirekisho: foto tidak render, alamat JP hilang, tombol X mati (`17e6973`)

- **Foto:** `database_candidate.pas_photo` AGUS KHOCI menunjuk `PAS_PHOTO.jpg`
  yang sudah **tidak ada di Storage** (404); file benar `FOTOFILE_1786….jpg`
  ada di master. CV kini memakai `uploads.photo` (master) dulu, fallback ke
  pas_photo kandidat — berlaku untuk semua kandidat dengan pas_photo basi.
- **Alamat JP:** key mismatch — `buildMasterNested` membangun
  `identitas.alamatjp` (tanpa garis bawah) tapi builder CV mencari
  `identitas.alamat_jp` → nilai `alamatjp` master (terisi!) tidak pernah
  tampil. `v()` kini mencoba `ALAMATJP` → `identitas.alamatjp` →
  `identitas.alamat_jp`.
- **Tombol X modal CV:** ter-reproduksi — badge "MODE PREVIEW" / baris tombol
  cetak (`z-50 relative`, block full-width, DOM belakangan) **menutupi** X
  (`elementFromPoint` di titik X mengembalikan badge); z-index X dinaikkan ke
  `z-[100]`.

### 3. Seragamkan z-index tombol close semua modal (commit sesi ini)

- Semua **22 tombol close absolut** di `partials/modals-shared.html` kini
  `z-[100]` (sebelumnya tanpa z / `z-10` / `z-20`) supaya tidak ada konten
  modal yang bisa menutupinya. Tombol close inline di header (5) tidak perlu
  z-index (normal flow). Rebuild `assets/modals-shared.html`.

### 4. Audit & perbaiki pas_photo kandidat (commit sesi ini)

- Skrip baru **`scripts/audit-pasphoto.mjs`** (dry-run default, `--apply` +
  backup JSON ke `.freebuff/`): cek setiap `database_candidate.pas_photo`
  terhadap file yang benar-benar ada di Storage `master/` (paginasi penuh).
- **Eksekusi produksi:** 2 dari 223 kandidat rusak — AGUS KHOCI (id 40) &
  FIRMA ELGA PRATAMA (id 41), keduanya diperbaiki ke pas_photo master yang
  ada. Verifikasi ulang: **127 valid, 0 rusak**. Backup:
  `.freebuff/pasphoto-fix-backup-*.json`.

### 6. Migrasi file_cv ke Storage + rapikan fitur drive-links (`dd241fe`, `1113647`)

- **`migrate-filecv-drive.mjs`** (dry-run default, `--apply` + backup ke
  `.freebuff/`): sambungkan `file_cv` kandidat ke file CV **terbaru** di
  folder `master/<NAMA>/` (updated_at storage, fallback timestamp nama;
  deteksi CVFILE / `1. X_CV` / RIREKI).
- **Eksekusi 40 link Drive** (baris legacy 2026-08-01, era GAS): 40/40
  dimigrasi → **0 link Drive tersisa** di file_cv. Tombol CV di share view /
  dashboard kini membuka file Storage (SATORI → `CVFILE_…xlsx`).
- **Eksekusi 135 file_cv kosong:** hanya **AZWAR ADUBA** yang punya file CV di
  Storage (`nama_TG632ASJcv.xlsx`) → tersambung; 134 lain memang tidak punya
  CV di Storage (folder cuma foto/empty) — dibiarkan.
- **Fitur drive-links dirapikan:** (a) fix key mismatch — frontend baca
  `res.list` padahal handler mengembalikan `res.data` → fitur selalu kosong
  dan banner kuning tidak pernah muncul, kini `res.data || res.list`;
  (b) `folder_url` CITRA ANANDA (satu-satunya link Drive tersisa, file lama)
  di-clear karena dokumennya sudah di Storage → `getDriveLinkCandidates`
  kembali `0` → banner "kandidat Drive" otomatis tersembunyi.

### 5. Audit diperluas ke 4 kolom + fallback foto share view + audit di CI (`2f790ff`)

- **`audit-pasphoto.mjs`** kini memeriksa **pas_photo, file_cv, jft, ssw**
  kandidat terhadap file Storage `master/` dan memperbaiki ke nilai master
  sejenis (`pas_photo→pas_photo`, `file_cv→file_cv`, `jft→jft_url`,
  `ssw→ssw_url`; cocok via no_wa / id_kandidat). Hasil: **0 rusak**
  (pas_photo 127 · file_cv 48 · jft 79 · ssw 79 valid).
- **40 kandidat `file_cv` masih link Google Drive** (baris lama 2026-08-01,
  era GAS): file CV-nya **sudah ada di Storage** `master/` (CVFILE… /
  `1. NAMA_CV.xlsx`) — hanya kolom `file_cv` yang belum di-update ke URL
  Storage. Bukan "kembali ke Drive": backend 100% Supabase; tinggal migrasi
  kolom (fitur admin "Migrasi Berkas dari Google Drive" / skrip khusus).
- **Share view:** `share.html` kini `onerror` → placeholder ui-avatars saat
  foto 404; `share-data` fallback ke file foto folder master
  (PHOTOFILE/PAS_PHOTO/FOTO) saat pas_photo kandidat kosong/basi.
- **CI e2e-share:** step audit **dry-run** tiap push ke `main` (butuh secrets
  `SUPABASE_URL` & `SUPABASE_SERVICE_ROLE_KEY`; dilewati bila belum di-set).
  `run.md` mendapat bagian "Skrip maintenance".

---

## SESI SEBELUMNYA — dedupe data & dokumen, share view, storage cleanup, CI

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
