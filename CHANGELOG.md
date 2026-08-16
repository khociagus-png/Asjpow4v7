# CHANGELOG — ASJ Portal

> Riwayat fitur & perbaikan per commit, paling lama di atas. Update terakhir: `57ea59b`.

---

## 2026-08-15 — Print CV rirekisho FIT 1 halaman A4

### `57ea59b` — Feat: print CV rirekisho FIT 1 halaman A4 (dulu 3 lembar)
- Sebelumnya **tidak ada CSS print sama sekali** → print CV rirekisho ikut mencetak
  seluruh halaman web (2-3 lembar). Kini `@media print` menyembunyikan semua
  kecuali `#modal-preview-cv`, lembar di-paksa ukuran A4 (210×297mm, margin 0),
  isi tabel dirapikan (font 9px, padding kecil, warna header tetap dicetak).
- Verifikasi: PDF hasil `page.pdf` A4 = **1 halaman** (`/Count 1`); di emulasi
  media print `scrollHeight == clientHeight` di dua sumbu → **tidak ada konten
  terpotong** (CV AGUS KHOCI, tabel 1138px → muat 297mm).
- Hash `assets/main.css` di-bump `4f2c8a1e73 → 8657590e50` di 7 halaman.
- Catatan: preview CV memang berupa render HTML→PDF (bukan Excel) — file Excel
  "FORMAT CV" tetap tersedia sebagai template terpisah di dossier.

---

## 2026-08-15 — Tes menyeluruh live + fix kritis export fetchMasterByWa

### `ecc1828` — Fix: export fetchMasterByWa di supabase.js (upload & biodata kandidat rusak)
- **Bug kritis** dari commit `c1433d2`: `fetchMasterByWa`/`fetchMasterLightByWa`
  tidak di-export di `module.exports` supabase.js → semua action yang lewat
  `findMasterByWa` gagal (`supabase.fetchMasterByWa is not a function`):
  `simpanBerkasTahapan` (upload pemberkasan), `submitMasterForm` /
  `simpanBiodataLengkap`, `getDrafCvMaster`, `simpanRevisiKandidat`, dll.
- Fix 1 baris: keduanya ditambahkan ke export. Verifikasi in-process:
  upload KTP → `pemberkasan_checklist.ktp_url` tersimpan + `getDrafCvMaster` OK;
  unit test **49/49**.
- **Tes menyeluruh di live** (asjportal-379): login-check **20/20**, modal-runtime
  **8/8**, share-view ✅ (22 kandidat), backend-fast-path **13/13**. Kegagalan
  awal di tes = artefak rate limit (5 login/menit per IP) & asersi jadwal basi.
- Test e2e dirapikan: `login-check` (tabel jadwal boleh kosong — fitur sudah
  dihapus `d86b854`), `share-view` (tunggu render ±30 dtk — cold start Storage).
- **Redeploy Netlify** (izin user) `--skip-functions-cache` → live ikut `ecc1828`;
  verifikasi ulang live: upload-check & biodata-check **full lulus**, `getDrafCvMaster`
  AGUS KHOCI lengkap → **auto-fill CV AI terisi** (keluhan user: data kosong —
  akar masalahnya bug export yang sama).
- **Tes lokal** (preview localhost:3000): login-check 20/20, modal-runtime, share-view
  (22 kandidat), upload-check, biodata-check — semua hijau. Fix **sudah live**
  (riwayat izin di DEPLOY.md §4).

---

## 2026-08-15 — Kebijakan deploy & deploy Netlify pertama (asjportal-379)

### `beb294a` — Docs: kebijakan GitHub main base & deploy Netlify wajib izin (DEPLOY.md)
- `DEPLOY.md` baru: GitHub = satu-satunya sumber kode (branch `main`); **Netlify
  DILARANG deploy kecuali diizinkan eksplisit pemilik**; tabel riwayat izin;
  detail situs aktif `asjportal-379` (env vars, checklist, cara deploy CLI).
- `WORKFLOW.md` §4 & `AGENTS.md` (checklist 8 + larangan) diselaraskan;
  `.gitignore` menambah `.netlify` (state lokal CLI).
- **Deploy Netlify (dengan izin user):** site `asjportal-379` dibuat di akun
  `nerazzurri190889@gmail.com`; 12 env var dipasang; deploy prod 237 file + 19
  functions; visibility di-set **Public** (project baru privat by default);
  verifikasi live OK — homepage 200, PIN admin benar/salah, `getDaftarSiswaBaru`,
  `getAppData` (132 jobs).

---

## 2026-08-15 — Optimasi S2 lanjutan: proyeksi kolom ringan (bottleneck tersisa)

### `c1433d2` — Proyeksi kolom ringan master & inbox admin
- `attachBerkasBio` (getAppData admin/kandidat + getCandidatesPage) tidak lagi
  menarik master `select *` (154 kolom, ±6,5 KB/baris): `fetchMasterLightByWa`
  dengan `MASTER_LIGHT_COLS` — **251 KB → 17,3 KB (hemat 93%)** untuk 50
  kandidat. `fetchMasterByWa` select * tetap untuk `findMasterByWa`/CV
  builder/ai_data_json.
- Inbox admin `getAppData` & `findFormsByWaList` pakai proyeksi
  `FORM_LIGHT_COLS` (`findFormsLight`): **22 KB → 3,9 KB (hemat 82%)**;
  urutan `timestamp.desc` tetap konsisten dengan `findFormByIndexFiltered`
  (rowIndex mail). Fallback `select *`/scan penuh kalau skema kolom berbeda.

### `56382b1` — Daftar admin kandidat: baris ringan + paginasi penuh
- `loadCandidatesUnik` memakai `findAllCandidatesLight` (proyeksi kolom
  dedupe/filter/sort, paginasi Range tanpa batas 300) lalu `findCandidatesByIds`
  hanya untuk halaman yang diminta — total = jumlah UNIK. Probe
  `scripts/probe-cols.mjs` & `scripts/probe-sizes.mjs` (read-only).

### `dd939ad` — Aturan jejak kerja: siapa & kapan wajib jelas
- WORKFLOW.md §7: format commit `<Kategori>: <ringkasan>`, cek `git config`,
  header sesi PROGRESS.md (tanggal + pengerja + hash).

---

## 2026-08-15 — Perombakan UI solid + tema light/dark merata

### `67bd3e0` — UI solid: hapus backdrop-blur/transparansi, menu samping ikut tema, tema diterapkan ke semua halaman
- **Tampilan SOLID:** semua elemen `backdrop-blur` & transparansi dihilangkan — `.glass-panel` kini `background:#0d0d0d` solid (teks selalu terbaca, tidak glossy); tombol header/nav solid (`bg-black hover:bg-zinc-800`, `border-white/60`); header tanpa `rounded-[2.5rem]`, overlay tanpa rounding; tombol "Tutup Paksa Loading" & shield admin `bg-red-600` solid; overlay share.html `rgba(30,41,59,0.97)` (sebelumnya 0.7 + blur).
- **Menu samping (hamburger) ikut tema light/dark:** warna dikontrol CSS variables `--mn-*` dan ditimpa `body.theme-light` → konsisten di kedua tema (`src/main.css` +596 baris, `assets/main.css` rebuild → `?v=4f2c8a1e73`).
- **Tema diterapkan ke SEMUA halaman mandiri:** `ai_form`, `apply-full`, `master-full`, `share`, `siswa-baru` kini punya `data-page="…"` + inline theme script (`theme-light`/`theme-dark` di `<body>`) — sebelumnya hanya index/admin yang ikut tema.
- **Fallback banner/footer:** `DEFAULT_ASSETS` di `js/02_init.js` — banner/footer default dari Supabase Storage selalu tampil walau backend belum mengirim ASSETS (mis. data gagal dimuat / preview tanpa backend).
- **Filter & tab publik solid per-tema:** warna tombol filter (js/05_render) dan tab Loker/Layanan (js/01_public) kini solid untuk tema terang & gelap; theme toggle button light style solid (`bg-slate-100 … border-stone-300`).
- **Verifikasi:** build byte-identik dengan working copy; test 41/41; lint 0 error; preview lokal → halaman termuat & `getAppData` sukses dari Supabase asli.

---

## 2026-08-15 — Sesi terbaru: dedupe data & dokumen, share view, keamanan, CI

### `cbfa8fc` — Kembalikan tombol FORMAT CV / SERTIF JFT / SERTIF SSW di dossier (ASJ DOSSIER)
- **Bug "fitur Netlify lama yang hilang":** modal CV admin (dossier) membaca `c.jftUrl / c.sswUrl / c.cvUrl`, tapi `mapCandidate` (backend rebuild) hanya mengembalikan `jft / ssw / fileCv` → ketiga tombol dokumen selalu `hidden` walau file-nya terisi di DB (verifikasi live: dossier SUSILO HADI SAPUTRA ASJ00217 tampil tanpa tombol).
- **Fix:** `mapCandidate` kini menambahkan alias `jftUrl` / `sswUrl` / `cvUrl` (nilai sama dengan jft / ssw / fileCv) → tombol FORMAT CV, SERTIF JFT, SERTIF SSW kembali muncul di dossier admin.
- **Verifikasi:** API getCandidatesPage (q=SUSILO) → ketiga alias terisi URL Storage; preview admin → modal dossier SUSILO menampilkan 3 tombol, foto & CV termuat dari Storage, console bersih. Test 41/41.

### `1113647` — Sambungkan file_cv kosong + rapikan fitur drive-links
- `migrate-filecv-drive.mjs` diperluas ke **file_cv kosong** (bukan hanya link Drive): dari 135 kosong, hanya **AZWAR ADUBA** yang punya file CV di Storage (`nama_TG632ASJcv.xlsx`) → tersambung; 134 lain memang tidak punya CV di Storage (dibiarkan).
- **Fix key mismatch fitur drive-links:** frontend baca `res.list` padahal handler mengembalikan `res.data` → fitur selalu kosong & banner tak pernah muncul; kini `res.data || res.list`.
- `folder_url` CITRA ANANDA (satu-satunya link Drive tersisa, file lama) di-clear — semua dokumennya sudah di Storage; `getDriveLinkCandidates` kini **0** → banner migrasi otomatis tersembunyi.

### `dd241fe` — Migrasi 40 file_cv kandidat dari Google Drive ke Storage master/
- Skrip baru `scripts/migrate-filecv-drive.mjs` (dry-run default, `--apply` + backup): file_cv → file CV **terbaru** di folder `master/<NAMA>/` (updated_at storage, fallback timestamp nama; deteksi CVFILE / `1. X_CV` / RIREKI).
- **Eksekusi produksi:** 40/40 kandidat legacy (created 2026-08-01) dimigrasi → **0 link Drive tersisa**; tombol CV di share view/dashboard membuka file Storage (verifikasi SATORI → `CVFILE_…xlsx`).

### `2f790ff` — Audit berkas kandidat 4 kolom + fallback foto share view + audit di CI
- `audit-pasphoto.mjs` diperluas: memeriksa **pas_photo, file_cv, jft, ssw** terhadap file Storage `master/` (paginasi penuh) dan memperbaiki ke nilai master sejenis (`pas_photo→pas_photo`, `file_cv→file_cv`, `jft→jft_url`, `ssw→ssw_url`). Hasil audit: **0 rusak** (40 link Google Drive legacy dicatat, tidak disentuh).
- Share view: `share.html` punya `onerror` → placeholder ui-avatars saat foto 404; `share-data` memakai file foto dari folder master (PHOTOFILE/PAS_PHOTO/FOTO) saat pas_photo kandidat kosong/basi.
- CI e2e-share: step **audit dry-run** tiap push ke `main` (butuh secrets SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY; dilewati bila belum di-set). `run.md` mendapat bagian skrip maintenance.

### `17e6973` — Perbaiki CV rirekisho: foto, alamat JP, tombol X
- **Foto:** pas_photo di `database_candidate` bisa menunjuk file yang sudah tidak ada (404); CV kini memakai `uploads.photo` dari **master dulu** (file terbaru yang benar), fallback ke pas_photo kandidat.
- **Alamat JP:** key mismatch — backend membangun `identitas.alamatjp` (tanpa garis bawah) tapi builder CV mencari `identitas.alamat_jp` → alamat Jepang master tidak pernah tampil; `v()` kini mencoba `alamatjp` juga (CV AGUS KHOCI kembali menampilkan "グジュンロル …ジャワティムール").
- **Tombol X modal CV:** badge "MODE PREVIEW"/baris tombol cetak (z-50, full-width) menutupi X (z-50) → klik nyata kena badge; z-index X dinaikkan ke `z-[100]`.

### `1710865` — Perbaiki tombol "Cek Data" di landing publik
- `getDaftarSiswaBaru` jadi **endpoint publik** (tombol ada di landing index.html; sebelumnya butuh sesi admin → pengunjung dapat `sessionInvalid` → halaman reload dan tombol terasa mati).
- Endpoint kini hanya mengirim kolom yang ditampilkan modal (nama, gender, alamat) — **WA/email/URL berkas PII tidak bocor** ke publik.
- Gender dinormalisasi ke L/P/'' (Laki-laki/Perempuan/MALE dsb. dipetakan); badge "—" netral untuk yang belum diisi (bukan asumsi P).

### `6e4f550` — Dokumentasi sesi terbaru
- `PROGRESS.md` diperbarui: rangkum seluruh kerja `e36fb64` → `c6744b4` (dedupe data/dokumen, share view, storage cleanup, CI).

### `c6744b4` — share.html: klasifikasi dokumen kanonik + dedupe defensif
- Frontend share view memakai aturan klasifikasi tipe yang **identik dengan backend** (nama lawas dikenali, alias dinormalisasi).
- Dedupe defensif per tipe di sisi klien — 1 loker tetap tampil 1 CV / 1 JFT / 1 SSW / 1 KK / 1 KTP bahkan sebelum backend produksi di-deploy.

### `2d7a46c` — share-data: klasifikasi nama lawas
- `docTypeOf` kini mengenali nama gaya lama (`1. X_CV.xlsx`, `nama_jft.pdf`, `X_PAS_PHOTO.jpg`, `PHOTOFILE_…`).
- CV/JFT/SSW/foto selalu dianggap tipe utama → varian lama & baru di-dedupe jadi satu (kartu SATORI/SUNARTO kembali 5 tombol).

### `abb5352` — Skrip pembersihan Storage `jobs/` & `misc/`
- `scripts/cleanup-job-misc.mjs`: scan template CV & pamflet yatim (paginasi penuh, dry-run default, `--apply` + backup).
- Dry-run menemukan **77 file yatim** di `jobs/` (20 template CV 2026, 24 pamflet lama, 31 template lama, 2 folder test) — `misc/` kosong.

### `b6ae9dd` — scan-orphan-files: paginasi + `--apply`, CI hijau
- Skrip scan mendapat paginasi lengkap (list Storage bisa tidak stabil — eventual consistency) dan mode `--apply` (backup JSON + bulk delete).
- **Eksekusi produksi:** 195 file yatim dihapus dari `master/` (731 → 536 file, 0 yatim tersisa). Backup di `.freebuff/`.
- CI e2e-share diperbaiki: hapus `cache: npm` (tidak ada `package-lock.json`) → run GitHub Actions hijau.

### `bf140e0` — Upload menimpa per tipe + e2e di CI
- `hapusJenisVarian` kini menghapus varian **bertimestamp** (`KK_1786….pdf`), bukan hanya `KK.ext` — duplikat upload tidak akan muncul lagi.
- `scripts/scan-orphan-files.mjs` (read-only): laporan pertama — 153 file aman dihapus (25 varian lama + 128 `.keep`).
- Unit test baru `actions-extra.test.js`; workflow GitHub Actions `e2e-share.yml` + script npm `e2e:share`.

### `1f6eb68` — share-data: extraDocs dari folder master + dedupe
- `handleShareData` mengambil dokumen ekstra dari **folder Storage master** (KK/KTP untuk 21/21 kandidat TG633), bukan hanya keterangan form.
- Dedupe per tipe dokumen di endpoint (file terbaru menang); hapus aksi mati `superSyncCleanup`; e2e `share-view.mjs`.

### `f1a1f21` — Perbaiki share.html: endpoint `/api/share-data`
- Endpoint Netlify `share-data` **belum pernah di-rebuild** di backend baru → share.html selalu 404 "Akses Ditolak".
- Dibuat `netlify/functions/share-data.js` + `handleShareData` + route GET di preview lokal; verifikasi: 23 kandidat render, seleksi & kirim WA jalan.

### `e534de5` — Skrip sinkron id_loker_pilihan
- `scripts/sync-idloker.mjs`: menyinkronkan `id_loker_pilihan` kandidat dengan lamaran LULUS terbaru di mail (15 kandidat diperbaiki).

### `9035526` — Sinkron idLoker + peringatan multi-apply
- Saat admin menyetujui lamaran (LULUS), `id_loker_pilihan` kandidat otomatis di-set ke job itu bila kosong/berbeda; pilihan job LULUS tampil lebih dulu di Edit Cepat.
- Form lamaran publik menampilkan peringatan riwayat bila nomor WA sudah punya lamaran LULUS untuk job lain.

### `ee459c9` — Dukung multi-apply (A/B/C)
- Kandidat boleh melamar **banyak loker**: lamaran di-dedup per (WA + job), badge semua job di profil, Edit Cepat menampilkan semua lamaran, hapus 4 baris duplikat persis (id 126, 113, 2, 3).

### `e36fb64` — Cegah duplikat kandidat
- `simpanKandidatDanUpload` kini **upsert per WA** (baris lama di-update, bukan bikin baru) + validasi format WA (62 + 10/11 digit) + perbaikan search admin (`queryPaged`).
- **Eksekusi produksi:** 30 baris kandidat + 1 master duplikat dihapus (253 → 222 kandidat); merge RIZKY/DEILA (kandidat kosong dihapus, master lengkap dipindah ke WA kanonik).

### `594cb82` — Fix sinkron CV AI ke Supabase
- Bridge tidak lagi menghilangkan WA kandidat; perbaiki pengecekan field VIP yang salah; auto-fill form AI pakai `getDrafCvMaster` → data benar-benar sync dengan Supabase.

### `3bdb9c6` — Keamanan: escape HTML menyeluruh + test XSS
- `esc()` diterapkan di semua render publik/admin/kandidat; `getDrafCvMaster` tidak lagi membocorkan daftar uploads; test XSS ditambahkan.

### `d0817ba` — Keamanan: escape HTML render admin/kandidat (REVIEW.md S1)

### `d6c52f9` — Keamanan: proteksi PII + rate limit (REVIEW.md M2/M3)
- Endpoint kandidat tidak lagi membocorkan PII yang tidak perlu; rate limit admin ditambahkan.

### `3cb4e66` — README menautkan REVIEW.md ke dokumentasi tim

### `8d1487f` — REVIEW.md: checklist aksi + jawaban rate limit admin

### `3504781` — Review menyeluruh codebase
- Tutup kebocoran `getAppConfig` publik; titik awal sesi audit keamanan.

### `0aaf12b` — Fix AI Master di iPhone
- Kolom chat terpotong diperbaiki; tab tidak lagi pindah sendiri di layar kecil.

---

## 2026-08-14 — Refactor besar: Netlify Functions & Supabase, optimasi, polish

### `3cafaa5` — Helper validasi upload seragam
- Format + ukuran file divalidasi satu helper di semua form (konsisten, tidak ada celah).

### `7efa4de` — QR eksternal, i18n dropdown, auto-centang review
- QR eksternal diperbaiki; dropdown i18n berfungsi; checkbox review auto-tercentang; rapikan repo.

### `0e9d085` — Verifikasi jalur cepat query server-side
- e2e backend-fast-path ditambahkan; jalur query teroptimasi terbukti bekerja.

### `3596934` — Optimasi query Supabase
- Filter query dijalankan **server-side** (bukan fetch semua lalu filter) + `getAppData` paralel → loading jauh lebih cepat.

### `15d2b56` — Verifikasi e2e vs Netlify lama
- Semua e2e lulus terhadap backend lama; font Jepang (JP) dipulihkan.

### `2b25a44` — Catat URL Netlify lama + e2e modal runtime

### `08c1d8b` — Modal dimuat on-demand
- Modal di-load saat runtime → ukuran admin/index turun **~146 KB**.

### `78d9a79` — Rekonsiliasi 9 modal divergen
- Modal admin & index yang sudah menyimpang dikembalikan ke partial yang sama.

### `4eef072` — Pecah HTML: 18 modal → partial
- Semua modal identik diekstrak ke `partials/modals-shared.html` (satu sumber kebenaran).

### `5784f3d` — Refactor aksi admin + bundel JS
- Aksi admin di-patch-in-place; prettier + eslint; **bundel JS jadi 1 file**; perbaikan i18n.

### `36ed28e` — Hidupkan build Tailwind
- CSS tidak lagi "beku" — kelas Tailwind baru selalu ikut ter-build.

### `51aa537` — Bersihkan total: 100% Supabase
- **Buang `gas-client`/GAS** dan artefak build basi; semua data kini di Supabase.

### `76b664a` — Fix alur approve kandidat
- Kandidat baru masuk list DB JOB **hanya setelah approve**; tombol Gagal diperbaiki.

### `291888a` — CV per code job
- **Beda loker = beda file CV**; hanya job yang sama yang menimpa file CV.

### `821964a` — Mail upload-driven + anti-duplikat storage
- Sesi mail di-drive oleh upload; dokumen storage **selalu menimpa file lama** (anti-duplikat).

### `561f126` — Pulihkan CRLF asli
- Line ending `admin.html`/`index.html` dikembalikan (diff minimal).

### `d86b854` — Fix admin bugs + polish portal
- Hapus jadwal/tugas; Lamar auto-closed; QR CV; link PWA; dropdown JP; hapus mail batch.

### `d7cf3bb` — PIPELINE.md
- Pedoman pipeline lapangan (JO → seleksi → lolos user → pendokumenan) sebagai kontrak fitur portal.

### `bd1c8e9` — Fix AI chat forms
- Model Gemini terkini (`flash-latest` / `3.5-flash`); error API mentah tidak lagi bocor ke user; skrip preview watchdog ditambahkan.

### `0e627bb` — Light theme (Sakura)
- Kartu & tabel loker kini render **light**, tidak lagi dark.

### `d01da5e` — Fix CV rirekisho kosong
- Key `buildMasterNested` diselaraskan dengan CV builders → rirekisho terisi.

### `0bb7cf1` — Fix preview CV tanpa master
- Kandidat tanpa data master kini dapat pesan error jelas (nama + WA), bukan crash.

### `967e4d1` — Kebijakan deploy
- Dokumentasi: **tidak deploy ke Netlify dari Freebuff**, hanya workflow lokal.

### `fd0c4d6` — Workflow tim
- Dokumen: commit & push ke main setelah setiap tugas.

### `f9e8f10` — Preview server dari dist/
- Preview server bekerja dari output deploy `dist/`.

### `881e1fa` — Refactor besar backend
- Frontend di-refactor ke **async/await**; backend di-rebuild di **Netlify Functions & Supabase** (dasar arsitektur saat ini).

### `0d71430` — Add files via upload
- Upload awal berkas proyek.

---

## 2026-08-13 — Awal repo

### `00e5ebb` — Initial commit
- Awal repository.

---

## Cara baca
- **Tambah fitur** = commit bertema "Fix/Add/Support/Perbaiki …"
- Detail teknis & keputusan desain ada di `PROGRESS.md`, `PIPELINE.md`, `REVIEW.md`, dan `E:\ASJ PORTAL\.freebuff\run.md` (cara menjalankan preview lokal).
- Riwayat penuh: `git log --format="%h %ad %s" --date=short`
