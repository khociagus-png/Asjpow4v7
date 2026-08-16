# PROGRESS.md — Status Pekerjaan ASJ Portal

> Pengingat untuk tim & AI assistant: baca file ini dulu sebelum mulai bekerja,
> supaya tidak mengerjakan ulang hal yang sudah selesai / tidak menyentuh yang
> memang belum waktunya.

**Update terakhir:** sesi 2026-08-16 — dikerjakan oleh **khoci89** (via Freebuff).

---

## 🆕 Sesi 2026-08-16 — dikerjakan oleh: khoci89 (via Freebuff)

### Commit `f6dc1bb` — Fix: Simpan Final master-full error (id duplikat ktp)

- **Laporan user (screenshot live master-full):** klik Simpan Final → alert
  "Terjadi kesalahan sistem: Cannot read properties of null (reading 'length')".
- **Akar:** id `ktp` duplikat — NIK (`<input type="number">`) dan file upload
  KTP (`<input type="file">`). `getEl("ktp")` ambil elemen pertama (NIK) →
  `.files` null → `.files.length` TypeError saat simpan; tombol PILIH KTP juga
  salah sasaran (men-trigger input NIK).
- Fix di master-full.html: file input KTP di-rename `ktpFile` (3 tempat: input,
  tombol PILIH, pembaca fileKtp). NIK tetap `ktp`. Cek duplikat id di semua
  halaman: bersih.
- Verifikasi: node --check inline script OK; grep duplikat id NO_DUP.

### Commit `5e8f65e` — Fix: Chat Jeklin tanya TB/BB yang sudah ada di DB

- **Laporan user (screenshot live ai_form):** user tanya ukuran baju/sepatu/topi
  berdasarkan TB/BB → Jeklin malah bertanya "TB & BB berapa?" padahal di master
  sudah terisi (TB 165, BB 57).
- **Akar masalah:** `handleProcessAIChat` (actions-ai.js) menerima
  `payload.currentData` (dari auto-fill `getDrafCvMaster`) tapi **tidak pernah
  membacanya** — prompt AI hanya instruksi generik, jadi Jeklin buta terhadap
  data yang sudah terisi dan menanyakan ulang.
- Fix: helper `buildRingkasData(cur)` → ringkasan data terisi (identitas, fisik
  TB/BB/ukuran, medis, sertifikasi, pendidikan, pekerjaan, keluarga, wawancara)
  disuntik ke system prompt + aturan "JANGAN tanya ulang data yang sudah terisi".
  Data kosong (NIK/Paspor dll.) tetap tidak dilist sehingga Jeklin tetap bisa
  menanyakannya.
- Bonus: sapaan awal (`generateSmartWelcomeMessage` di ai_form.html) kini juga
  mendeteksi TB/BB kosong; key i18n `form.chat_missing_tb`/`_bb` (ID + JP).
- Verifikasi: unit test baru `buildRingkasData` (51/51 pass), `node --check`
  bersih, `bun run build:js` OK (bundle `app-d80b6b5088.js`).

### Commit `d0c1a71` — Fix: AI form gagal simpan ke Supabase + verifikasi auto-fill

- **Permintaan user:** "Ai form dan CV ai check apakah semua data bisa
  masuk dan save di superbase dan auto fill sudah benar ambil semua".
- **Temuan BUG:** `submitDataAsj` (ai_form.html) menulis
  `mode:'ai'` + `status:'SUBMITTED'` ke `ai_form_submissions` — ditolak
  CHECK constraint DB (hanya `AI_MASTER`/`MENUNGGU` diizinkan, HTTP 400
  23514) → **simpan AI form selalu gagal** walau chat/isi sukses.
  Dikonfirmasi lewat probe nilai constraint & round-trip sebelum fix.
- Fix di `netlify/functions/_lib/actions-ai.js`: `handleSubmitDataAsj`
  pakai `mode='AI_MASTER'`, `status='MENUNGGU'`, dedup existing disaring
  `submitted_via='ai_form'` (tidak menimpa baris interview).
- Verifikasi: round-trip WA tes → 8 seksi semua masuk ke Supabase +
  master `ai_data_json` ikut update; auto-fill browser dengan sesi
  kandidat asli → semua field terisi (nama/katakana/TTL/TB/BB/alamat/HP/
  email); tanpa sesi → subset identitas saja (by design REVIEW M2);
  `getMasterDataByWa` (master-full) → 140 kolom lengkap. Unit test 49/49,
  `node --check` bersih.

### Commit `8874164` — Sesi: pesan jelas + auto-login kokoh

- **Permintaan user:** "kok bermasalah terus sih kandidat sesi apa admin
  juga apa ga perlu sesi" → dijawab: sesi TETAP perlu (proteksi PII, admin
  vs kandidat); yang bermasalah dulu adalah bug integrasi (token tidak
  terkirim), bukan konsep sesi. User pilih opsi 1 & 2: pesan error jelas +
  auto-login.
- **callAPI** (api-client.js): saat backend balas `sessionInvalid`, tampilkan
  toast "Sesi admin/kandidat sudah berakhir, silakan login lagi" sebelum
  bersihkan storage & reload (dulu diam-diam).
- **refreshDataDinamis** (03_engine.js): guard auto-login — flag login
  'sukses' tapi token sesi/WA hilang → bersihkan + pesan jelas, bukan
  panggil API dengan token kosong (data kosong diam-diam).
- Auto-login sudah jalan (restore localStorage, token tanpa expiry).
- Verifikasi: login → reload → dashboard kembali ±3 dtk; token hilang &
  token palsu → dibersihkan + toast, tanpa error JS; login-check 20/20,
  unit 49/49.

---

## 🆕 Sesi 2026-08-16 — dikerjakan oleh: khoci89 (via Freebuff)

### Commit `ec24dba` — Form bridge paksa ke origin sendiri

- **Keluhan user:** di local preview "ga bisa check form" (AI master, master
  lengkap, lamaran, dll) — form selalu lompat ke situs lain.
- **Akar masalah:** backend `siteBase()` memakai env `NETLIFY_SITE_URL`
  (nilai lama `https://asjportal.netlify.app`) → semua tombol form
  (master-full/ai_form/apply-full/siswa-baru) menghasilkan URL ke situs
  live, bukan aplikasi yang sedang dibuka. Ini juga bug di live
  asjportal-379 (form menunjuk situs lama).
- **Fix:** helper `resolveSelfUrl(url)` di api-client.js — kalau origin
  hasil bridge beda dengan `window.location.origin`, ganti origin-nya
  (path/query tetap). Dipakai di `bukaFormBridge` & `bukaFormSiswa`
  (js/03_candidate.js).
- Verifikasi: klik "Form Master Lengkap" di preview → navigasi ke
  `http://localhost:3000/master-full.html?wa=...` (bukan situs live);
  master-full (154 input) & ai_form (85 input) render tanpa error JS;
  login-check & unit 49/49.

---

## 🆕 Sesi 2026-08-16 — dikerjakan oleh: khoci89 (via Freebuff)

### Commit `0bd05a6` — Jadwal muncul di kandidat + selector loker card progres + riwayat lamaran

- **Permintaan user:** (1) hapus tugas admin, (2) cek kode jadwal reminder
  Fonnte, (3) jadwal muncul di kandidat, (4) card "Umum" di dashboard
  kandidat diganti update biodata + loker terpilih, (5) card progres punya
  pilihan loker — klik code_job → tampil tahapan loker itu saja.
- **Bug: `mySchedules` tidak pernah dibangun backend** — getAppData mode
  kandidat hanya kirim candidates/kandidatRiwayat; frontend sudah render
  `k-dash-jadwal-box` sejak lama tapi selalu kosong. Kini dibangun
  (loadSchedules + filter: WA di daftar_kandidat ATAU loker lamaran
  kandidat) dengan format objek yg benar (agenda/status/waktu/lokasi/link).
- **Bug: `kandidatRiwayat` = objek kandidat, bukan lamaran** —
  renderRiwayatKandidat baca r.jobCode/r.kode/r.code; karena isinya objek
  kandidat, kode loker selalu kosong ("-") & card tidak bisa difilter.
  Sekarang = daftar applications (code/status/timestamp).
- **Card progres:** pill pilihan loker (chip per code_job, default loker
  LULUS/terbaru) — klik = kartu progres tahapan loker itu saja (tidak
  numpuk). Label kategori kosong tidak lagi "Umum" (fallback kode loker).
- **Kode Fonnte dicek (TANPA tes kirim):** `fonnteSend` benar — POST
  api.fonnte.com/send, header Authorization = FONNTE_TOKEN, body
  x-www-form-urlencoded target+message; `kirimSatuPesanFonnte` &
  `kirimTawaranMassal` (template {nama}/{job}/{link}) rate-limit
  FONNTE_ACTIONS. Catatan: fitur "reminder otomatis" tidak ada —
  database_schedule murni agenda; pengingat via WA tetap manual
  (kirim pesan/tawaran massal).
- **Hapus tugas/jadwal:** sudah berfungsi (lookup id_tugas|id lalu hapus
  by PK, termasuk baris legacy). Verifikasi e2e: tambah→hapus→
  "Tidak ditemukan".
- Verifikasi: mySchedules tampil via loker lamaran & via daftar_kandidat;
  chips 2 loker → klik → 1 kartu; login-check 20/20, modal-runtime 8/8,
  unit 49/49.

---

## 🆕 Sesi 2026-08-15 — dikerjakan oleh: khoci89 (via Freebuff)

### Commit `7260b93` — Wawancara AI jadi percakapan asli + hasil → admin → update biodata

- **Feedback user:** "Herlina itu siswa kelas lama, itu cuma contoh pertanyaan.
  AI sekarang wawancaranya b aja — saya pingin kayak wawancara ASLI, bukan
  nulis doc. Ide bagus: hasil wawancara dikeluarkan jadi doc, kirim ke admin,
  dipakai update biodata."
- **processAiInterview** (`actions-ai.js`): prompt diubah total → percakapan
  natural (sapaan hangat → jikoshoukai → 1 pertanyaan per pesan, follow-up
  menggali, reaksi manusiawi, TANPA nomor/daftar). Bidang SSW tetap konteks
  pertanyaan (kaigo/shokuhin/nougyou/dll).
- **Fix bug pra-ada:** `processAiInterview` tidak ada di `CANDIDATE_ACTIONS`
  api-client → `callAPI` tidak pernah kirim token kandidat → backend
  requireRole gagal (sesi invalid/reload di browser). Kini + `selesaikanWawancara`
  & `simpanHasilWawancara` masuk CANDIDATE_ACTIONS.
- **Alur hasil wawancara (baru):** tombol **SELESAI** di simulator →
  `selesaikanWawancara` (Gemini rangkum transcript → JSON {score, nilai,
  rekomendasi, biodata, catatan}) → `simpanHasilWawancara` (ai_form_submissions,
  `submitted_via='interview'`; mode/status pakai AI_MASTER/MENUNGGU karena
  CHECK constraint tabel) → admin lihat via **Hasil Wawancara** & terapkan via
  **Update Biodata** (submitMasterForm admin). Fallback marker `===HASIL===`
  di chat tetap ada.
- **Verifikasi in-process:** Q1 natural tanpa nomor; selesaikanWawancara →
  hasil score 6/C + 5 field biodata (nama, alamat, hobi, ssw, keahlianKhusus);
  simpan OK; getHasilWawancara admin OK; cleanup OK. Unit test **49/49**.

---

## 🆕 Sesi 2026-08-15 — dikerjakan oleh: khoci89 (via Freebuff)

### Commit `59c6fed` — Model wawancara AI per bidang SSW (14 pertanyaan gaya dokumen isian)

- **Permintaan user:** "Bikin model wawancara AI seperti ini tergantung SSW nya
  dia ambil apa" — contoh dokumen jawaban wawancara kaigo HERLINA (14
  pertanyaan: ID + romaji + panduan jawaban ID/romaji/kanji).
- **Backend** (`actions-ai.js`): `processAiInterview` kini resolve bidang SSW
  kandidat dari master/kandidat via WA (`resolveProfilKandidat`) lalu memakai
  model wawancara per bidang (`BIDANG_INTERVIEW`: kaigo/shokuhin/nougyou/
  kensetsu/jidousha/binbou/sougou + default) — 14 pertanyaan berurutan dengan
  romaji, pertanyaan khusus bidang, evaluasi per jawaban, skor akhir 1-10.
- **Backend** (`actions-ai.js`): action admin baru `generateWawancaraModel`
  (rate limit AI) — hasilkan DOKUMEN model wawancara lengkap per kandidat
  (WA/candidateId, bidang bisa di-override untuk kandidat yang belum
  terdaftar) siap disalin ke Google Sheet kandidat.
- **Frontend** (`js/09_ai_copilot.js`): simulator wawancara VIP auto-start
  (langsung tanya Q1 sesuai bidang, kirim `wa` sebagai konteks); bar AI
  copilot admin dapat tombol **Model Wawancara** + kolom **Bidang** (mis.
  Kaigo) — hasil model tampil di chat untuk disalin.
- **Verifikasi in-process** (preview sandbox sedang turun): Q1 simulasi
  "Hobi kamu apa? (Shumi wa nan desu ka?)" dengan catatan sensei; model
  Kaigo/Osaka lengkap 9,8 KB — 14 pertanyaan bernomor, romaji, kanji,
  instruksi "SILAHKAN ISI DI DRIVE INI". Unit test **49/49**.
- Catatan: HERLINA belum terdaftar di DB (222 kandidat, 0 nama Herlina) —
  model bisa dibuat dulu via kolom Bidang sebelum kandidat daftar.

---

## 🆕 Sesi 2026-08-15 — dikerjakan oleh: khoci89 (via Freebuff)

### Commit `5081693` — Admin parse dokumen biodata (upload CV/Excel/PDF → Gemini → update master)

- **Permintaan user:** "Khusus CV AI untuk panel admin kasih file attachment buat
  upload doc/Excel/PDF, parse isinya, extract buat masukin biodata & update ke
  kandidat — jangan ketik manual."
- **Backend** (`actions-ai.js`): action baru `parseDokumenBiodata` (admin-only,
  masuk `AI_ACTIONS` rate limit). Menerima `{candidateId|wa, file:{name,mimeType,
  data(base64)}}` → validasi mime (pdf/xls/xlsx/doc/docx/csv/txt/gambar) & ukuran
  (maks 8MB) → resolve target kandidat (candidateId → WA via
  `findCandidateByIdFiltered`) → Gemini `inlineData` ekstrak JSON kunci
  `MASTER_COLUMN_MAP` camelCase + array `pendidikan/pekerjaan/keluarga` →
  `{success, wa, namaSekarang, data, fieldCount, riwayat}`.
- **Backend** (`actions-extra.js`): `handleSubmitMasterForm` kini menerima sesi
  **admin** (sebelumnya hanya kandidat) → admin bisa langsung update biodata
  master dari hasil parse.
- **Frontend** (`js/09_ai_copilot.js`): bar upload di-inject ke `modal-admin-ai`
  (file input + WA target + tombol Parse & Update) — pilih file → parse otomatis →
  `submitMasterForm` → toast + ringkasan di chat. Partial modal tidak diubah
  (tetap satu sumber) — bar dibuat via JS di `pastikanBarParseAdminAi()`.
- **Verifikasi:** parse live OK — CV teks → 11 field (nama, furigana アグス・コチ,
  tglLahir, tb/bb, dll) + 1 pendidikan + 1 pekerjaan + 1 keluarga; guard admin
  `submitMasterForm` lulus (wa kosong → "Nomor WA wajib diisi." bukan
  sessionInvalid); unit test **49/49**; `node --check` + `build:js` bersih.
- Catatan: preview sandbox sempat turun saat verifikasi UI browser (infra),
  tapi jalur backend sudah dibuktikan via HTTP sebelum turun.

---

## 🆕 Sesi 2026-08-15 — dikerjakan oleh: khoci89 (via Freebuff)

### Commit `57ea59b` — Print CV rirekisho FIT 1 halaman A4

- Keluhan user: print CV rirekisho jadi **3 lembar** (dan CV render berbasis
  HTML→PDF, bukan Excel — template Excel "FORMAT CV" tetap terpisah).
- Akar masalah: **tidak ada CSS print sama sekali** → print ikut mencetak seluruh
  halaman web. Kini `@media print` khusus CV: hanya `#modal-preview-cv` yang
  tampil, lembar dipaksa A4 210×297mm margin 0, isi tabel dirapikan (font 9px,
  padding kecil, warna header tetap dicetak via print-color-adjust).
- Verifikasi (CV AGUS KHOCI): PDF A4 = **1 halaman** (`/Count 1`); emulasi
  media print `scrollHeight == clientHeight` di dua sumbu → **tidak terpotong**.
- `assets/main.css` rebuild, hash bump `4f2c8a1e73 → 8657590e50` (7 halaman).
- Juga diverifikasi jawaban pertanyaan user: tabel kandidat admin **sudah 1 baris
  per kandidat** — `getCandidatesPage` total 222 = 222 WA unik, 0 duplikat.

---

## 🆕 Sesi 2026-08-15 — dikerjakan oleh: khoci89 (via Freebuff)

### Commit `ecc1828` — Tes menyeluruh live + fix kritis export fetchMasterByWa

### Lanjutan: redeploy live + verifikasi ulang + tes lokal (semua hijau)

- User minta tes **semua modal & fungsi** di situs live (`asjportal-379`).
- **E2E live:** login-check **20/20**, modal-runtime-check **8/8**, share-view ✅
  (22 kandidat + dokumen ekstra), backend-fast-path **13/13**. Kegagalan awal
  bukan bug aplikasi: rate limit login 5/menit per IP (kena tes curl saya sendiri)
  dan asersi jadwal basi (fitur jadwal sudah dihapus → tabel boleh kosong).
- 🐛 **Bug kritis ditemukan:** `supabase.fetchMasterByWa is not a function` —
  fungsi `fetchMasterByWa` (baru di `c1433d2`) **tidak di-export** di
  `module.exports` supabase.js. Semua action lewat `findMasterByWa` rusak:
  `simpanBerkasTahapan` (upload pemberkasan → modal menutup tapi 0 tersimpan),
  `submitMasterForm`/`simpanBiodataLengkap`, `getDrafCvMaster`, `simpanRevisiKandidat`.
- **Fix 1 baris:** export `fetchMasterByWa` + `fetchMasterLightByWa`.
- **Verifikasi fix:** in-process `simpanBerkasTahapan` → `pemberkasan_checklist.ktp_url`
  tersimpan ✅, `getDrafCvMaster` (AGUS KHOCI) OK ✅, unit 49/49 ✅.
- Test e2e dirapikan: `login-check` (jadwal boleh kosong), `share-view` (tunggu
  render ±30 dtk — share-data lambat di cold start karena fetch Storage per
  kandidat).
- **Redeploy Netlify DIIZINKAN user** ("Redeploy") → `--skip-functions-cache` → live ikut
  `ecc1828`. Verifikasi ulang **live**: upload-check ✅ full (Storage + DB + master + UI),
  biodata-check ✅ full, `getDrafCvMaster` AGUS KHOCI lengkap (nama/katakana/alamat/foto/
  AIDATAJSON) → **auto-fill CV AI yang dilaporkan kosong sudah terisi** (akar masalahnya
  sama: `fetchMasterByWa` tidak di-export).
- **Tes lokal** (preview localhost:3000, env .env.local di-set dari nilai user): login-check
  20/20, modal-runtime ✅, share-view ✅ (22 kandidat), upload-check ✅ full, biodata-check
  ✅ full. Semua suite hijau di lokal & live.
- ⚠️ Fix **sudah live** — redeploy dicatat di DEPLOY.md §4.

---

## 🆕 Sesi 2026-08-15 — dikerjakan oleh: khoci89 (via Freebuff)

### Commit `beb294a` — Kebijakan GitHub main base & deploy Netlify wajib izin (DEPLOY.md)

- **Latar:** user punya akun Netlify baru (`nerazzurri190889@gmail.com`) dan minta
  deploy kode terbaru ke Netlify. Token `NETLIFY_AUTH_TOKEN` diberikan via chat.
- **Situs dibuat:** `asjportal-379` → https://asjportal-379.netlify.app
  (project `7e433a31-82cd-4afb-8d1b-f0391cabdd3e`, tim `asjamnag`). Nama `asjportal`
  sudah dipakai akun lama, Netlify memberi suffix `-379`.
- **12 env var dipasang** via Netlify CLI: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_ANON_KEY, SUPABASE_STORAGE_BUCKET, ADMIN_MASTER_PIN, PIN_KHOCI,
  ASJ_ADMINS, ADMIN_NUMBERS, SESSION_SECRET (acak), GEMINI_API_KEY, FONNTE_TOKEN,
  NETLIFY_SITE_URL (= URL baru).
- **Deploy produksi:** 237 file + 19 functions ✅ live.
- ⚠️ **Project baru privat by default** (Netlify sejak 2026-07-28) → homepage & API
  401 "Login Redirect". Tidak bisa diubah via API — user klik **Make public** di
  dashboard. Setelah itu semua hijau.
- **Review live:** homepage/admin.html/share.html HTTP 200; `checkAdminMaster` PIN
  benar → success, PIN salah → ditolak; `getDaftarSiswaBaru` (publik, PII aman);
  `getAppData` → 132 jobs + assets.
- **Aturan baru (permintaan user):** GitHub = **main base** (semua update/patch/
  revisi kode lewat repo); **Netlify DILARANG deploy kecuali diizinkan eksplisit
  pemilik** — setiap izin dicatat di `DEPLOY.md` §4. WORKFLOW.md §4 & AGENTS.md
  (checklist 8 + larangan) diselaraskan; `.gitignore` menambah `.netlify`.

---

## 🆕 Sesi 2026-08-15 (lanjutan) — dikerjakan oleh: khoci89 (via Freebuff)

### Commit `c1433d2` — Proyeksi kolom ringan master & inbox admin

Bottleneck berikutnya dipilih dari ukuran payload NYATA di Supabase produksi
(probe read-only):

- **Master ±6,5 KB/baris (154 kolom), 224 baris = ±1 MB** — `attachBerkasBio`
  menariknya `select *` untuk 50 kandidat halaman 1 = **±251 KB**. Sekarang
  `fetchMasterLightByWa()` dengan `MASTER_LIGHT_COLS` (hanya kolom
  BERKAS_COLUMNS/BIO_COLUMNS yang dibaca): **17,3 KB (hemat 93%)**.
  `fetchMasterByWa` select * TETAP untuk `findMasterByWa`/CV builder/
  ai_data_json (butuh baris penuh).
- **Inbox admin** `getAppData` memakai `findFormsLight()` (`FORM_LIGHT_COLS`):
  **22 KB → 3,9 KB (hemat 82%)**; urutan `timestamp.desc` tetap konsisten
  dengan `findFormByIndexFiltered` (rowIndex review/approve/reject/hapus).
  `findFormsByWaList` (getCandidatesPage & share-data) ikut light.
- **Pola aman**: proyeksi gagal (skema kolom beda) → fallback `select *` /
  scan penuh — perilaku lama tidak berubah.
- **Verifikasi**: `node --check` OK · unit 49/49 · probe live produksi:
  master 93% lebih kecil, form 82% lebih kecil, `mapForm` & `attachApplications`
  output identik light vs full, jumlah baris sama (50 master, 10 form).

Dokumen: REVIEW.md S2 di-update (checklist 56382b1 + c1433d2).

---

## 🆕 Sesi 2026-08-15 — dikerjakan oleh: khoci89 (via Freebuff)

### 1. Commit `56382b1` — Optimasi S2 lanjutan: daftar admin kandidat baris ringan + paginasi penuh

Bottleneck terakhir yang tersisa dari S2 (daftar admin `loadCandidatesUnik` masih
scan penuh `select *` + terpotong diam-diam di 300 baris):

- `findAllCandidatesLight()` (supabase.js): proyeksi kolom ringan (dedupe/filter/sort
  saja) dengan paginasi Range penuh tanpa batas 300 → payload ~5–10× lebih kecil.
- `loadCandidatesUnik(q, {page, pageSize})` (handlers.js): dedupe-by-WA + filter +
  sort di JS atas baris ringan, lalu `findCandidatesByIds()` hanya menarik baris
  PENUH untuk halaman yang diminta. Total = jumlah UNIK (pagination frontend
  konsisten). Fallback scan penuh lama kalau skema tabel tidak dikenal.
- `fetchPagedAll()` helper (loop Range 1000/halaman, `count=exact`).
- Probe read-only `scripts/probe-cols.mjs` & `scripts/probe-sizes.mjs`.
- Verifikasi: `node --check` OK, unit 49/49 hijau. Sudah di-push ke `main`.

### 2. Aturan jejak kerja: SIAPA & KAPAN wajib jelas (WORKFLOW.md §7 + AGENTS.md)

Aturan baru supaya riwayat tidak lagi ambigu (dulu ada commit dari akun berbeda
`khoci89` vs `ASJ OS DOKUMEN` di hari yang sama):

- Format pesan commit wajib `<Kategori>: <ringkasan>` + detail; dilarang pesan
  generik tanpa keterangan.
- Wajib cek `git config user.name/email` sebelum commit (identitas sesuai pengerja).
- Wajib update PROGRESS.md di akhir sesi dengan header: **tanggal + pengerja + hash commit**.
- Cara cek siapa/kapan terakhir: `git log -1 --format='%an | %ad | %s' --date=format:'%Y-%m-%d %H:%M'`

### Status riwayat saat ini (bukti siapa & kapan)

| Hash | Siapa | Kapan | Isi |
| --- | --- | --- | --- |
| `56382b1` | **khoci89** | 2026-08-15 19:15 | Optimasi S2 lanjutan: daftar admin baris ringan + paginasi penuh |
| `8f18bc3` | **khoci89** | 2026-08-15 18:54 | Optimasi S2: 39 scan penuh → query ter-filter |
| `d973794` | **ASJ OS DOKUMEN** | 2026-08-15 18:11 | Tambah AGENTS.md |

---

## SESI SEBELUMNYA — Lanjutan bottleneck: sisa scan penuh → query server-side (REVIEW S2)

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

> ✅ Sudah di-commit `8f18bc3` & di-push ke `main`. Tinggal deploy ulang lewat
> Freebuff supaya live ikut versi ini.

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
