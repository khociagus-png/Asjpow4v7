# REVIEW.md — Hasil Review Menyeluruh Codebase ASJ Portal

> Tanggal: 15 Agustus 2026 · Scope: seluruh repo (frontend js/* + 7 halaman, backend
> netlify/functions, i18n, build scripts, e2e) · Metode: audit manual + grep +
> test/lint/build.

---

## Ringkasan eksekutif

Kondisi keseluruhan **baik** untuk ukuran codebase classic-scripts sebesar ini:
keamanan dasar sudah benar (tidak ada secret hardcoded, semua aksi admin
ter-guard, session HMAC dengan `timingSafeEqual`), bersih dari Google/Drive,
test 16/16 hijau, lint 0 error. Ditemukan **1 issue kritikal (verifikasi env
produksi)**, **1 issue keamanan yang sudah langsung diperbaiki**, dan beberapa
rekomendasi medium yang butuh keputusan produk.

Prioritas:

- 🔴 **K1** — Pastikan `SESSION_SECRET` di-set di env Netlify produksi.
- 🟠 **M1** — (SUDAH DIPERBAIKI) `getAppConfig` publik membocorkan skema DB.
- 🟠 **M2** — Data kandidat (PII) bisa diambil dengan tebakan nomor WA.
- 🟠 **M3** — Tidak ada rate limit pada endpoint publik berbiaya (AI/Fonnte/login).
- 🟡 **S1..S4** — XSS stored (escape belum menyeluruh), sisa scan penuh, dll.

---

## 🔴 KRITIS

### K1 — Fallback secret sesi ada di repo (`session.js`)

`session.secret()` memakai fallback `'asj-portal-local-secret'` (nilai publik,
ada di kode) jika TIDAK SATU PUN dari `SESSION_SECRET` / `ADMIN_PASSWORD` /
`ASJ_ADMIN_PASSWORD` / `ADMIN_MASTER_PIN` / `PIN_KHOCI` ter-set di lingkungan
yang berjalan.

**Dampak:** kalau produksi Netlify tidak meng-set minimal salah satu env
tersebut, siapa pun bisa membuat token admin palsu (HMAC-SHA256 dengan secret
yang diketahui) dan menjalankan SEMUA aksi admin: hapus loker/kandidat,
migrasi DB, kirim WA massal (Fonnte = biaya), ganti status, dll.

**Tindakan yang diperlukan (di luar repo):**

1. Pastikan di Netlify (Environment Variables) ada `SESSION_SECRET` dengan
   nilai acak panjang (bukan nilai dari repo) — atau minimal salah satu
   `ADMIN_*` yang juga dipakai login admin (karena fallback-nya sama).
2. Verifikasi setelah deploy: login admin masih jalan, lalu cek token
   `asj_admin_session` di browser TIDAK bisa dipalsukan — cara paling mudah:
   set `SESSION_SECRET` berbeda dari `ADMIN_PASSWORD`.

> Catatan: di sandbox/preview fallback ini sengaja ada supaya lokal tetap bisa
> jalan tanpa konfigurasi. Risiko hanya berlaku jika produksi lupa set env.

---

## 🟠 MAJOR

### M1 — `getAppConfig` publik membocorkan info sensitif — ✅ SUDAH DIPERBAIKI

Endpoint ini (tanpa guard) mengembalikan: daftar nama tabel + kolom seluruh
DB, **klasifikasi hash password kandidat** (bcrypt vs plaintext), daftar env
key yang terpasang, dan struktur `.env.local` (nilai ter-mask). Tidak ada
halaman publik yang memanggilnya.

**Perbaikan yang sudah dilakukan (commit review ini):** `handleGetAppConfig`
sekarang wajib sesi admin (`requireAdmin`). Aksi `getAppConfig` sudah terdaftar
di `ADMIN_ACTIONS` frontend, jadi tidak ada yang rusak.

### M2 — Data kandidat (PII) bisa diambil dengan tebakan nomor WA

`handleGetExistingCandidateJsonByWa` (bridge apply-full) dan
`handleGetDrafCvMaster` (preview CV) menerima nomor WA dan mengembalikan
**profil lengkap kandidat tanpa autentikasi**: NIK KTP, alamat, riwayat,
URL dokumen pribadi. Nomor WA itu semi-tebakan (0812… pola umum).

Ini by-design untuk alur bridge (kandidat isi WA → data ter-prefill), tapi
tidak ada proteksi tambahan.

**Rekomendasi (butuh keputusan produk, jangan diubah asal-asalan):**

- Minimal: batasi jumlah field yang dikembalikan untuk jalur publik (hanya
  yang dibutuhkan prefill), jangan seluruh profil.
- Lebih baik: tambahkan token sekali pakai di link bridge (sudah ada
  `generateFormBridge` — bisa disisipkan parameter rahasia) yang divalidasi
  server sebelum mengembalikan data.

### M3 — Tidak ada rate limiting pada endpoint publik

- `processAIChat` / `processSiswaAIChat` (publik) → biaya API Gemini bisa
  dinaikkan siapa pun.
- `kirimSatuPesanFonnte` / `kirimTawaranMassal` (admin, tapi tanpa limit) →
  biaya WA.
- `checkAdminMaster` / `checkAdminPersonal` → brute force PIN admin.
- `loginKandidat` / `daftarKandidat` → spam.

**Rekomendasi:** rate limit sederhana per-IP/WA (mis. map in-memory per
function instance, atau Netlify Rate Limits bila pakai Edge). Minimal untuk
AI chat + login admin.

---

## 🟡 MINOR / REKOMENDASI

### S1 — XSS stored: escape belum menyeluruh

Sebagian jalur render sudah escape dengan benar (mail inbox pakai `esc()`,
loker publik pakai `esc()` di `01_public.js`), tapi banyak template string lain
yang menyisipkan data kandidat (nama, catatan, alamat) tanpa escape. Risiko:
kandidat menyisipkan HTML/script yang tereksekusi di panel admin (stored XSS).
**Rekomendasi:** audit render admin (`05_render.js`, `11_admin_ops.js`,
`03_candidate.js`) + terapkan escape terpusat (helper `esc()` global) di semua
sisi user-supplied. Jangan setengah-setengah — kalau dikerjakan, sekaligus.

### S2 — 27 panggilan scan penuh tersisa (`findCandidates`/`findJobs`/`findForms`)

Sebagian besar di path non-hot (hapus loker, daftar admin, diagnostik, migrasi)
dan sudah ada jalur cepat untuk login/getAppData/pemberkasan. Bisa di-target-kan
bertahap bila mau; bukan bottleneck utama lagi.

### S3 — `getAppConfig` masih menyertakan debug `.env.local` (kini admin-only)

Setelah M1, aman dari publik, tapi pertimbangkan memisahkan diagnostik
`debugFileStructure()` ke aksi khusus agar log admin tetap bersih.

### S4 — Artefak template stale

- `.convex/` (folder kosong dari template awal) — sudah dihapus; backend asli
  Netlify + Supabase, Convex tidak dipakai.
- `src/` hanya berisi `main.css` (input Tailwind) — dipakai, jangan dihapus.
- Font `fonts/noto-jp/*` (120 file, ~5.5 MB) — perlu, sudah di-repo.

### S5 — Admin PIN sama sumbernya dengan fallback secret sesi

`masterPins()` dan fallback `session.secret()` memakai env yang sama
(`ADMIN_PASSWORD`, `ADMIN_MASTER_PIN`, dst.). Setelah K1 dibereskan (pasang
`SESSION_SECRET` khusus), masalah ini hilang dengan sendirinya.

---

## ✅ Yang sudah benar (hasil verifikasi turn ini)

| Area               | Hasil                                                                                                                                   |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Secret di repo     | ✅ Tidak ada key hardcoded; `.env.local` di-ignore & tidak ter-track                                                                    |
| Auth aksi admin    | ✅ Semua handler admin punya `requireAdmin`/`requireRole('admin')` di 3 file backend                                                    |
| Session            | ✅ HMAC-SHA256 + `timingSafeEqual`, payload {role, wa/name}                                                                             |
| Google/Drive/GAS   | ✅ 0 sisa (hanya komentar penjelas)                                                                                                     |
| Duplikat fungsi JS | ✅ 0 (tidak ada definisi ganda yang menimpa)                                                                                            |
| Upload guard       | ✅ 32/32 input `type="file"` ter-guard (cekUploadFile)                                                                                  |
| Modal runtime      | ✅ 27 modal satu sumber (`partials/`), dimuat on-demand                                                                                 |
| Query Supabase     | ✅ Jalur cepat server-side untuk login/dashboard/pemberkasan                                                                            |
| Test/Lint/Format   | ✅ Test 16/16 · lint 0 error (10 warning gaya) · format bersih                                                                          |
| E2E                | ✅ `login-check`, `photo-check`, `modal-runtime-check`, `probe-cleanup`, `backend-fast-path` tersedia (hasil hijau saat preview stabil) |

---

## 📋 TODO / ACTION ITEMS (checklist — update centang saat selesai)

> Diperbarui: 15 Agustus 2026 · Sumber: review menyeluruh di dokumen ini.

### 🔴 K1 — WAJIB (di luar repo, butuh admin Netlify)

- [ ] Set `SESSION_SECRET` (nilai acak panjang, **berbeda** dari `ADMIN_PASSWORD`) di
      Environment Variables Netlify produksi.
- [ ] Verifikasi setelah deploy: login admin normal, token `asj_admin_session` tidak bisa
      dipalsukan (coba ubah satu karakter token → harus di-logout).

### 🟠 M1 — SUDAH DIPERBAIKI (commit `3504781`)

- [x] `getAppConfig` wajib sesi admin (tidak lagi publik).

### 🟠 M2 — Proteksi data kandidat di jalur publik — ✅ DIPERBAIKI

- [x] Batasi field yang dikembalikan `getExistingCandidateJsonByWa` / `getDrafCvMaster`
      untuk pemanggil tanpa sesi (hanya data yang dibutuhkan prefill, bukan seluruh profil).
      Implementasi: `isOwnerOrAdmin()` + `pickPrefill()` di `actions-extra.js`; tanpa sesi
      valid → `limited:true` (NIK/paspor/catatan internal/riwayat TIDAK ikut); sesi kandidat
      pemilik WA atau admin → data penuh. `getExistingCandidateJsonByWa` ditambahkan ke
      `CANDIDATE_ACTIONS` (api-client) supaya alur prefill kandidat/admin tetap dapat data
      penuh. Terverifikasi live preview: anonim → field terbatas, sesi → penuh.
- [x] `getDrafCvMaster` tanpa sesi TIDAK lagi mengembalikan `uploads` (URL pas foto/CV/JFT/SSW)
      — hanya subset identitas dasar. Satu-satunya konsumen (preview CV admin & dashboard
      kandidat) berjalan dengan sesi valid, jadi tidak ada alur yang rusak. Terverifikasi
      live: anonim → `{identitas, limited}`, sesi pemilik → penuh (termasuk uploads).
- [ ] (Opsional, lebih kuat) Sisipkan token sekali pakai di link `generateFormBridge` dan
      validasi server sebelum mengembalikan data. Keputusan saat ini: TIDAK dipasang karena
      tidak ada konsumen anonim yang membutuhkan data penuh; dapat ditambah jika nanti ada
      halaman publik yang butuh prefill data lengkap tanpa sesi.

### 🟠 M3 — Rate limit — ✅ DIPERBAIKI

- [x] Rate limit `checkAdminMaster` / `checkAdminPersonal` (login admin): 5 percobaan/menit
      per IP + lockout 5 menit setelah 10 gagal.
- [x] Rate limit `processAIChat` / `processSiswaAIChat` / `processAdminAIChat` (biaya Gemini):
      10 req/menit per WA/admin; global 60 req/menit per IP.
- [x] Rate limit `kirimSatuPesanFonnte` / `kirimTawaranMassal` (biaya WA): maks 2×/menit
      per admin (massal sudah punya delay antar pesan — endpoint-nya yang dijaga).
- [x] Aksi admin CRUD biasa (simpan/edit/hapus loker, kandidat, jadwal, mail): jangan
      di-throttle agresif — cukup 120 req/menit per admin sebagai jaring pengaman.
- [x] (Opsional) `loginKandidat` / `daftarKandidat`: 10 req/menit per IP.
      Implementasi: `netlify/functions/_lib/rate-limit.js` (in-memory Map, window bergulir,
      lockout) dipasang terpusat di `handleAction` (handlers.js) — berlaku untuk Netlify
      wrapper (IP dari `x-forwarded-for`) & preview (`serve-static.mjs`). Respons
      `{ success:false, rateLimited:true, retryAfter }`. Terverifikasi: percobaan ke-6
      ditolak (retryAfter 60s), IP lain bebas, lockout 300s setelah 10 gagal.

### 🟡 S1 — XSS stored (escape menyeluruh)

- [x] Audit render admin (`05_render.js`, `11_admin_ops.js`, `03_candidate.js`) +
      terapkan escape terpusat (helper global `esc()`) di semua data user-supplied.

      Implementasi: helper global `esc()` (teks & atribut) + `escJs()` (nilai di
      onclick ber-atribut kutip-ganda: escape JS `\\`→`\\\\` lalu `'`→`\\'`,
      kemudian HTML-entity `& < > "` — tanpa lapis HTML, `"` tetap memutus atribut
      dan payload bocor jadi atribut baru, terverifikasi di browser). Dipasang di:
      `05_render.js`, `11_admin_ops.js`, `03_candidate.js`, `03_engine.js`, `02_init.js`,
      `01_public.js` (detail loker publik), `06_admin_modal.js`, `07_api.js` (tugas &
      pencarian kandidat), `08_wa_pintar.js`, `09_ai_copilot.js` (chat AI),
      `12_esign_match.js` (matchmaking), `10_cv_rirekisho.js` (v() CV A4 di-escape
      terpusat), `ai_form.html` (nama file & URL di status dokumen). Terverifikasi:
      payload `<img onerror>` & `" onmouseover="` dinetralkan di browser; semua
      suite E2E hijau (login-check 19/19, photo 7/7, modal 8/8, probe bersih).

### 🟡 S2 — Sisa scan penuh — ✅ LANJUTAN DIKERJAKAN

- [x] Target-kan panggilan `findCandidates()`/`findJobs()`/`findForms()` tersisa ke
      query server-side ter-filter (bertahap). Implementasi sesi ini:

      Helper baru di `supabase.js` (kontrak sama: `undefined` → caller fallback scan):
      `findJobByCodeFiltered`, `findCandidateByIdFiltered`, `findFormsByWa`,
      `findFormByIndexFiltered` (baris inbox posisi index urutan `timestamp.desc`),
      `findFormsByWaList` (in-filter WA-set), `findCandidatesByJobFiltered` (ilike +
      caller verifikasi token eksak di JS supaya `TG9ASJ` vs `TG90ASJ` tidak salah
      tangkap), `maxJobCodeNumber`.

      Dipasang di ±24 call site:
      - **Mail inbox**: `handleFormStatus` / `handleDeleteForm` /
        `handleTandaiDibacaForm` (rowIndex → query `order+offset` 1 baris),
        `handleTandaiGagalJob`, `getAppData` kandidat (lamaran WA sendiri),
        `handleCekDataPelamar`, `syncBiodataKeMail`, `findFormByWa` /
        `findFormByWaJob`, `syncFormMailDariUpload`, `handleGetCandidatesPage`
        (lamaran per WA-set halaman).
      - **Kandidat/master**: `findMasterByWa` (via `fetchMasterByWa` in-filter),
        `handleGetExistingCandidateJsonByWa`, `handleGetDrafCvMaster`,
        `handleSubmitMasterForm`, `handleSimpanBerkasTahapan`,
        `handleSimpanRevisiKandidat` (2×), `handleUploadDriveReplacement`
        (by `id_kandidat`), `handleGetAdminAiContext` (by id/WA),
        `nextCandidateId` (pakai `maxCandidateIdNumber`).
      - **Job**: `nextJobCode` (`maxJobCodeNumber`), `getJobMapped`,
        `handleIsJobRequiresCv`, `handleSubmitApply`, `handleShareData`
        (job by code + kandidat by job + lamaran per WA-set).

      Sisa scan penuh yang **sengaja dipertahankan** (butuh keputusan produk / memang
      harus penuh): loker publik `getAppData` (semua job), diagnostik
      `getAppConfig`, `handleGetDriveLinkCandidates` (butuh semua baris),
      `daftarKandidat` (deteksi nama tabel).

      Verifikasi: unit 49/49 · lint 0 error · `backend-fast-path` 12/12 · live preview
      `share-data`/`isJobRequiresCv`/`getAppData` sukses (data Supabase asli).

      **Lanjutan berikutnya (commit `56382b1`, `c1433d2`):**

      - [x] `56382b1` — daftar admin `loadCandidatesUnik` TIDAK lagi scan penuh
            `select *` + terpotong 300 baris: `findAllCandidatesLight()` (proyeksi
            kolom ringan, paginasi Range penuh tanpa batas) + `findCandidatesByIds()`
            (baris penuh hanya untuk halaman yang diminta). Total = jumlah UNIK.
            Terukur: 222 kandidat — `select *` 215 KB vs light 54 KB.
      - [x] `c1433d2` — `attachBerkasBio` TIDAK lagi menarik master `select *`
            (154 kolom, ±6,5 KB/baris): `fetchMasterLightByWa()` dengan
            `MASTER_LIGHT_COLS` (hanya kolom BERKAS_COLUMNS/BIO_COLUMNS).
            Terukur 50 WA: **251 KB → 17,3 KB (hemat 93%)**. `fetchMasterByWa`
            select * tetap dipakai `findMasterByWa`/CV builder/ai_data_json.
      - [x] `c1433d2` — inbox admin `getAppData` & `findFormsByWaList` pakai
            proyeksi `FORM_LIGHT_COLS` (`findFormsLight`): **22 KB → 3,9 KB
            (hemat 82%)**, urutan `timestamp.desc` tetap konsisten dengan
            `findFormByIndexFiltered` (rowIndex). Kolom berat `ai_data_json` dll.
            tidak ikut.
      - Pola aman semua jalur: proyeksi gagal (skema kolom berbeda) → fallback
        `select *` / scan penuh — perilaku lama tidak berubah.

### 🟡 S4 — Artefak stale

- [x] `.convex/` dihapus (commit `3504781`).

---

## Jawaban cepat: "rate limit apa buat admin?"

Rate limit **tidak membatasi kerja admin normal** — justru melindungi aksi admin
agar tidak bisa disalahgunakan (PIN dibrute-force, WA blast/doa AI di-spam).
Usulan lapisan:

| Endpoint                                          | Limit                                                           | Alasan                                        |
| ------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------- |
| Login admin (PIN master/personal)                 | **5 percobaan/menit per IP** + lockout 5 menit setelah 10 gagal | Anti brute-force PIN                          |
| AI chat admin (Gemini)                            | **10 req/menit per admin**                                      | Biaya API Gemini                              |
| Kirim WA (satu/massal)                            | **2×/menit per admin**                                          | Biaya WA (massal sudah ada delay antar pesan) |
| Aksi CRUD admin (simpan/edit/hapus, mail, jadwal) | **120 req/menit per admin** (jaring pengaman saja)              | Kerja normal tidak boleh terhambat            |

Implementasi paling sederhana tanpa infra baru: map in-memory di dalam function
(`Map<key, {count, resetAt}>`) — cukup untuk satu instance; kalau mau akurat
lintas instance, pindah ke Supabase/Redis. Murni server-side, tanpa ubah UX.
