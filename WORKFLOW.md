# WORKFLOW — ASJ Portal (khociagus-png/Asjpow4v7)

Dokumen ini adalah **kesepakatan kerja tim** + pengingat untuk siapa pun (termasuk AI assistant)
yang mengerjakan repo ini. Baca sebelum mulai bekerja.

> ⚠️ **Sebelum mengerjakan fitur apa pun, baca dulu [`PIPELINE.md`](PIPELINE.md)** —
> itu pedoman alur kerja lapangan ASJ (JO → seleksi → lolos user → pendokumenan).
> Portal hanya mendigitalkan/mengotomasi alur itu, **TIDAK BOLEH mengubah pipeline lapangan**.

---

## 1. Aturan utama: SELALU commit + push ke `main` 🚀

Repo ini dipakai bersama tim. **Setiap pekerjaan yang selesai WAJIB di-commit dan di-push
ke branch `main` di GitHub**, supaya anggota tim selalu bisa download versi terbaru.

- Branch kerja: **`main`** (bukan branch lain).
- Setelah selesai satu tugas (fix bug, fitur baru, refactor):
  1. `git add -A` (jangan sertakan `.env*`, sudah di `.gitignore`)
  2. `git commit -m "pesan singkat & jelas"`
  3. `git push origin main`
- Kalau lupa: cek dengan `git status` — kalau ada file belum di-commit, langsung commit + push.

### Cara tim mengambil versi terbaru

```bash
git pull origin main
```

> Jika ada versi lama nyangkut di browser/HP: muat ulang halaman / hapus cache (PWA).
> Data di Supabase tetap sama — yang di-pull hanya kode.

---

## 2. Struktur project (singkat)

| Bagian                        | Lokasi                                                                                                                   | Keterangan                                                                                                                                                                                                                                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend (statis, vanilla JS) | root: `index.html`, `admin.html`, `master-full.html`, `apply-full.html`, `share.html`, `siswa-baru.html`, `ai_form.html` | SPA statis, di-host Netlify                                                                                                                                                                                                                                                                                   |
| Styling                       | `src/main.css` (input Tailwind v4) → build → `assets/main.css`                                                           | **WAJIB jalankan `bun run build:css` setelah menambah/ubah kelas Tailwind di HTML/JS**, supaya CSS hasil build ikut kelas terbaru (lihat #3)                                                                                                                                                                  |     | Logika frontend | `js/*.js` + `api-client.js` + `i18n.js` + `pwa.js` (sumber) → `bun run build:js` → `assets/app-<hash>.js` (bundel 1 file) | admin.html & index.html memuat **1 bundel** (`assets/app-<hash>.js`) — bukan 20 script tag lagi. **WAJIB jalankan `bun run build:js` setelah mengubah file JS apa pun** (lihat #3). Halaman lain (master/apply/share/dll) memuat api-client/i18n/pwa langsung |
| Modal bersama                 | `partials/modals-shared.html` → di-inject ke `admin.html` & `index.html` lewat `bun run build:html`                      | **Edit modal di SATU tempat** (partial), lalu jalankan build:html supaya kedua halaman ikut. 18 modal sudah di-share; 9 modal lain masih beda versi per halaman (lihat `PROGRESS.md`) — **jangan** mengubah modal yang di dalam wilayah `<!--SHARED_MODALS_START/END-->` langsung di halaman, ubah di partial |
| Backend API                   | `netlify/functions/**` (`_lib/handlers.js` = dispatcher action, `_lib/supabase.js` = DB)                                 | Semua `callGAS(...)` di frontend hanyalah **nama bridge** → Netlify Functions + Supabase. **TIDAK ada** Google Apps Script lagi. Jangan menambahkan endpoint GAS baru                                                                                                                                         |
| Konfigurasi Netlify           | `netlify.toml`                                                                                                           | `publish = "."`, `functions = "netlify/functions"`, redirect `/api/*` → `/.netlify/functions/:splat`                                                                                                                                                                                                          |
| E2E test                      | `e2e/login-check.mjs`                                                                                                    | Playwright (login admin/kandidat + render dashboard)                                                                                                                                                                                                                                                          |
| Unit test                     | `js/helpers_cv.test.js`                                                                                                  | Vitest                                                                                                                                                                                                                                                                                                        |

---

## 3. Command yang biasa dipakai

```bash
# Install dependency (dev)
bun install

# Rebuild CSS Tailwind (WAJIB setelah ubah kelas di HTML/JS)
bun run build:css

# Rebuild bundel JS (WAJIB setelah ubah file di js/, api-client.js, i18n.js, atau pwa.js)
bun run build:js

# Rebuild modal bersama (WAJIB setelah mengubah partials/modals-shared.html)
bun run build:html

# Build keduanya sekaligus
bun run build

# Format semua JS (Prettier) — jalankan sekali, lalu hanya saat ada PR besar
bun run format
bun run format:check   # cek saja

# Lint (ESLint) — error = bug nyata (mis. key duplikat di i18n), warning = gaya
bun run lint

# Unit test
bun run test

# E2E (butuh preview/live URL + Playwright chromium terinstall)
bunx playwright install chromium
BASE_URL="https://<url-preview-atau-live>" bun run e2e

# Cek syntax semua JS frontend
for f in js/*.js; do node --check "$f" || echo "ERROR: $f"; done
```

---

## 4. Deploy — **JANGAN deploy ke Netlify** 🚫

- **Satu-satunya jalur deploy**: tombol **Deploy di UI Freebuff** — build berjalan dari
  commit terbaru di `main`.
- Cek status/log dengan CLI: `freebuff-deploy status`, `freebuff-deploy logs`, `freebuff-deploy check`.
- **JANGAN** mem-build / meng-upload / mendeploy apa pun ke Netlify (dashboard Netlify,
  CLI netlify, dsb). File `netlify.toml` & `netlify/functions` tetap ada di repo hanya
  karena itu bentuk backend/API yang dipakai aplikasi — bukan berarti kita deploy ke Netlify.
- **PENTING**: situs live TIDAK otomatis sinkron dengan repo. Setelah commit+push,
  jalankan deploy lewat **Freebuff** supaya live ikut versi terbaru.

---

## 5. Env vars / kredensial

- Jangan commit `.env*` ke git (sudah di `.gitignore`).
- Backend membaca env dari whitelist di `netlify/functions/_lib/env.js`.
  Intinya butuh:
  - **Supabase** — URL project + service key (untuk baca/tulis semua tabel kandidat, master, pemberkasan).
  - **Fonnte API key** (opsional) — untuk kirim WA blast / tawaran massal.
- Di Freebuff: isi lewat tab **Keys/API keys**. Di Netlify: Environment variables di dashboard.
- Preview lokal: `.env.local` (dibaca otomatis oleh `serve-static.mjs`).

---

## 6. Pengingat AI assistant 🤖

Kalau kamu (assistant) sedang mengerjakan repo ini, patuhi:

1. **Setiap akhir tugas → `git add -A && git commit && git push origin main`** — jangan tanya dulu,
   kecuali ada perubahan yang mencurigakan (misal file rahasia ikut ter-stage).
2. Jangan hapus/ubah data timpaan user yang sudah ada. Hanya ubah yang relevan dengan permintaan.
3. Jangan pernah edit file `.env*`. Kalau butuh secret baru, minta user isi di Keys/API keys.
4. Jangan menulis ulang kode async/await menjadi callback `.then()` (regresi dari refactor).
5. Jangan menyentuh `vite.config.ts`/HMR — project ini bukan Vite; preview memakai `serve-static.mjs`.
6. Setelah commit, ingatkan user untuk **deploy ulang lewat Freebuff** supaya situs live ikut terbaru.
7. **JANGAN PERNAH deploy ke Netlify** — apa pun alasannya.
8. **Patuhi `PIPELINE.md`** — sebelum menambah/mengubah fitur yang menyentuh tahapan
   kandidat, seleksi, atau pendokumenan, cek dulu pipeline-nya. Jangan mengubah urutan
   tahapan lapangan; fitur baru harus lewat checklist di `PIPELINE.md` bagian 6.
