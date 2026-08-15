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
  2. `git commit -m "pesan singkat & jelas"` (format wajib: lihat §7.1)
  3. `git push origin main`
- Kalau lupa: cek dengan `git status` — kalau ada file belum di-commit, langsung commit + push.
- **Jejak siapa & kapan wajib jelas** — baca §7 sebelum commit.

### Cara tim mengambil versi terbaru

```bash
git pull origin main
```

> Jika ada versi lama nyangkut di browser/HP: muat ulang halaman / hapus cache (PWA).
> Data di Supabase tetap sama — yang di-pull hanya kode.

---

## 2. Struktur project (singkat)

| Bagian                        | Lokasi                                                                                                                   | Keterangan                                                                                                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend (statis, vanilla JS) | root: `index.html`, `admin.html`, `master-full.html`, `apply-full.html`, `share.html`, `siswa-baru.html`, `ai_form.html` | SPA statis, di-host Netlify                                                                                                                                           |
| Styling                       | `src/main.css` (input Tailwind v4) → build → `assets/main.css`                                                           | **WAJIB jalankan `bun run build:css` setelah menambah/ubah kelas Tailwind di HTML/JS**, supaya CSS hasil build ikut kelas terbaru (lihat #3)                          |     | Logika frontend | `js/*.js` + `api-client.js` + `i18n.js` + `pwa.js` (sumber) → `bun run build:js` → `assets/app-<hash>.js` (bundel 1 file) | admin.html & index.html memuat **1 bundel** (`assets/app-<hash>.js`) — bukan 20 script tag lagi. **WAJIB jalankan `bun run build:js` setelah mengubah file JS apa pun** (lihat #3). Halaman lain (master/apply/share/dll) memuat api-client/i18n/pwa langsung |     | Modal bersama | `partials/modals-shared.html` → `bun run build:html` → disalin ke `assets/modals-shared.html` + loader runtime di-inject di `admin.html`/`index.html` | **SEMUA 30 modal di-share dan dimuat RUNTIME** (bukan inline): markup modal TIDAK ada di halaman, loader sinkron memuat `/assets/modals-shared.html` ke `#modal-root` sebelum kode aplikasi jalan. Edit modal di SATU tempat (partial) → `bun run build:html` (+ `build:css` kalau ada kelas baru — partial sudah di-scan Tailwind). **Jangan** mengubah wilayah `<!--SHARED_MODALS_START/END-->` langsung di halaman |
| Backend API                   | `netlify/functions/**` (`_lib/handlers.js` = dispatcher action, `_lib/supabase.js` = DB)                                 | Semua `callGAS(...)` di frontend hanyalah **nama bridge** → Netlify Functions + Supabase. **TIDAK ada** Google Apps Script lagi. Jangan menambahkan endpoint GAS baru |
| Konfigurasi Netlify           | `netlify.toml`                                                                                                           | `publish = "."`, `functions = "netlify/functions"`, redirect `/api/*` → `/.netlify/functions/:splat`                                                                  |
| E2E test                      | `e2e/login-check.mjs`                                                                                                    | Playwright (login admin/kandidat + render dashboard)                                                                                                                  |
| Unit test                     | `js/helpers_cv.test.js`                                                                                                  | Vitest                                                                                                                                                                |

---

## 3. Command yang biasa dipakai

```bash
# Install dependency (dev)
bun install

# Rebuild CSS Tailwind (WAJIB setelah ubah kelas di HTML/JS)
bun run build:css

# Rebuild bundel JS (WAJIB setelah ubah file di js/, api-client.js, i18n.js, atau pwa.js)
bun run build:js

# Rebuild modal bersama (WAJIB setelah mengubah partials/modals-shared.html):
# menyalin partial -> assets/modals-shared.html + pasang loader runtime di halaman
bun run build:html
# Kalau ada kelas Tailwind baru di partial, ikutkan juga:
bun run build:css

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
BASE_URL="https://<url-preview-atau-live>" bun run e2e:upload   # jalur upload (kandidat tes terisolasi + cleanup)
BASE_URL="https://<url-preview-atau-live>" bun run e2e:biodata # update biodata kandidat (nilai asli dipulihkan)

# Cek syntax semua JS frontend
for f in js/*.js; do node --check "$f" || echo "ERROR: $f"; done
```

---

## 4. Deploy — GitHub main base, Netlify HANYA dengan izin 🔒

- **Sumber kode = GitHub (`main`)** — semua perubahan kode (update, patch, revisi)
  lewat repo. Kebijakan lengkap: **`DEPLOY.md`**.
- **Netlify: DILARANG deploy KECUALI diizinkan eksplisit oleh pemilik** (khoci89/Agus)
  pada sesi itu (token `NETLIFY_AUTH_TOKEN` diberikan / perintah tertulis). Setiap
  deploy Netlify dicatat di `DEPLOY.md` §4.
- Jalur deploy lain (mis. tombol **Deploy Freebuff**) boleh dipakai sesuai kebijakan
  masing-masing — cek status/log dengan `freebuff-deploy status/logs/check`.
- `netlify.toml` & `netlify/functions` tetap ada di repo karena itu bentuk backend/API
  aplikasi — **bukan** izin otomatis untuk deploy ke Netlify.
- **PENTING**: situs live TIDAK otomatis sinkron dengan repo. Setelah commit+push,
  live hanya berubah setelah deploy yang diizinkan.

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
6. Setelah commit, ingatkan user tentang **kebijakan deploy** (lihat `DEPLOY.md`):
   Netlify hanya boleh di-deploy bila diizinkan eksplisit — jangan pernah deploy sendiri tanpa izin.
7. **JANGAN PERNAH deploy ke Netlify tanpa izin eksplisit pemilik** — aturan penuh di `DEPLOY.md`.
8. **Patuhi `PIPELINE.md`** — sebelum menambah/mengubah fitur yang menyentuh tahapan
   kandidat, seleksi, atau pendokumenan, cek dulu pipeline-nya. Jangan mengubah urutan
   tahapan lapangan; fitur baru harus lewat checklist di `PIPELINE.md` bagian 6.
9. **Jejak kerja wajib jelas (siapa & kapan)** — cek `git config user.name/email` sebelum
   commit, update `PROGRESS.md` dengan header sesi (tanggal + pengerja + hash commit),
   dan ikuti format pesan commit di §7.

---

## 7. Jejak kerja — WAJIB jelas SIAPA & KAPAN ⏱️

Repo ini dikerjakan dari beberapa akun/workspace (mis. `khoci89`, `ASJ OS DOKUMEN`),
jadi riwayat commit harus selalu bisa menjawab: *siapa* yang mengubah dan *kapan*.

### 7.1 Format pesan commit (wajib)

```
<Kategori>: <ringkasan apa yang dikerjakan>

<detail 1-3 baris: kenapa & apa yang berubah>

# footer otomatis kalau dikerjakan AI (Codebuff):
🤖 Generated with Codebuff
Co-Authored-By: Codebuff <noreply@codebuff.com>
```

- Kategori: `Fix`, `Feat`, `Optimasi`, `Refactor`, `Docs`, `Test`, dll.
- **Dilarang** pesan generik tanpa keterangan (mis. hanya "update", "fix", "perbaikan").
- Contoh: `Optimasi S2: sisa scan penuh Supabase dikonversi ke query server-side ter-filter`

### 7.2 Cek identitas git sebelum commit (wajib)

```bash
git config user.name   # contoh: khoci89 / ASJ OS DOKUMEN
 git config user.email
```

- Pastikan nama akun yang benar sesuai pengerja. Kalau identitas tidak dikenal,
  beri tahu tim — **jangan commit dengan identitas yang tidak jelas**.

### 7.3 Update PROGRESS.md di akhir setiap sesi (wajib)

Setiap sesi kerja WAJIB menambah entri di `PROGRESS.md` dengan header berisi
**tanggal, nama/akun pengerja, hash commit, ringkasan kerja**:

```markdown
## Sesi 2026-08-15 — dikerjakan oleh: khoci89 (via Freebuff)
- Commit: `56382b1` — Optimasi S2 lanjutan: daftar admin baris ringan + paginasi penuh
- Ringkasan: ...
```

`CHANGELOG.md` juga di-update per fitur/commit (format sudah ada di sana).

### 7.4 Cara cek "siapa & kapan terakhir"

```bash
git log --format='%h | %an | %ad | %s' --date=format:'%Y-%m-%d %H:%M' -5
# 1 baris terakhir saja:
git log -1 --format='%an | %ad | %s' --date=format:'%Y-%m-%d %H:%M'
```
