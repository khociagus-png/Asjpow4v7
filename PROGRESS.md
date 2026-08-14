# PROGRESS.md — Status Pekerjaan ASJ Portal

> Pengingat untuk tim & AI assistant: baca file ini dulu sebelum mulai bekerja,
> supaya tidak mengerjakan ulang hal yang sudah selesai / tidak menyentuh yang
> memang belum waktunya.

**Update terakhir:** commit `prettier+eslint+bundel+fix-i18n` (lihat `git log`).

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
  `main-DEfa6N4x.js`, dan `<link rel="modulepreload">` yang 404.

### 6. Pecah HTML (bagian 1): 18 modal bersama diekstrak

- 18 modal identik antara `admin.html` & `index.html` (85 KB) dipindah ke
  `partials/modals-shared.html` (SATU sumber) → di-inject via `bun run build:html`.
- Hasil build byte-identik dengan sebelumnya; sumber modal tidak bisa lagi
  beda versi antar halaman (sumber bug "ubah satu halaman, lupa yang lain").

---

## ⏳ BELUM SELESAI

1. **Rekonsiliasi 9 modal yang masih beda versi** antar `admin.html` & `index.html`:
   `cv-mini`, `admin`, `kandidat`, `cv`, `edit-kandidat`, `list-kandidat`,
   `rincian-builder`, `interview`, `reject-mail`. Setelah direkonsiliasi, modal
   itu bisa ikut dipindah ke `partials/modals-shared.html`.
2. **Runtime on-demand load modal** (penghematan parse HP: 165KB/halaman) —
   modal dimuat dari partial saat dibutuhkan, bukan di HTML awal. Perlu
   verifikasi preview dulu (berisiko kalau dikerjakan buta).
3. **Preview visual belum diverifikasi** untuk bundel JS (tool preview tidak
   tersedia di sesi pengerjaan). Saat pertama buka: **hard refresh sekali**
   (SW version baru otomatis buang cache lama).
4. **Deploy ke Netlify belum** — sesuai keputusan tim: tunggu sampai semua fix
   beres dulu (token free tier tipis).
5. **Demo assets cek manual** (lihat #3 di atas).
6. Sisa `refreshDataDinamis` di aksi berat (`simpanJobBaru`, `editLokerFull`,
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
bun run test         # Vitest (16 tes)
```

## Catatan untuk AI assistant (biar tidak muter-muter baca code)

- **Struktur**: classic scripts global scope — fungsi lintas file saling panggil.
  Frontend JS di-bundel jadi `assets/app-<hash>.js`, jadi kalau mengubah JS
  **wajib `bun run build:js`** sebelum selesai.
- Lokasi logika: render admin `js/05_render.js`, aksi backend
  `netlify/functions/_lib/handlers.js` + `actions-extra.js`, DB helper
  `_lib/supabase.js`, i18n `i18n.js` (hati-hati key duplikat!).
- Saat minta fix, sebutkan file + fungsi spesifik — menghemat baca ulang.
