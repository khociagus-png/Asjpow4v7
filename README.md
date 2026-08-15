# ASJ Portal (Asjpow4v7)

Portal lowongan kerja **PT Amanah Sakura Japan (ASJ)** — rekrutmen kandidat kerja ke
Jepang: landing publik, portal kandidat (dashboard progres pemberkasan + CV digital),
portal admin (mail inbox lamaran, kelola loker, DB Job, jadwal, papan tugas, WA pintar,
AI copilot, esign match / ASJ Dossier), dan form master/AI/lamaran. 100% mandiri:
**tanpa Google Apps Script, tanpa Google Drive, tanpa layanan QR eksternal** — semua
data & file di Supabase.

## Stack

- **Frontend**: HTML statis + vanilla JS (classic scripts, tanpa framework) — PWA
  (`sw.js`), Tailwind CSS v4, Font Awesome.
- **Backend**: Netlify Functions (rebuild) — dispatcher di
  `netlify/functions/_lib/handlers.js`, akses DB via `_lib/supabase.js` (PostgREST).
- **Database/Storage**: Supabase (tabel: `job_database`, `database_candidate`,
  `master_database_candidate`, `database_asj_form`, `database_schedule`,
  `database_tugas`, `wa_templates`, `sys_config`, `pemberkasan_checklist`, dll).

## Struktur penting

| Bagian              | Lokasi                                                                                  |
| ------------------- | --------------------------------------------------------------------------------------- |
| Halaman utama       | `index.html` (publik + dashboard kandidat), `admin.html` (portal admin)                 |
| Halaman mandiri     | `apply-full.html`, `master-full.html`, `ai_form.html`, `share.html`, `siswa-baru.html`  |
| Logika frontend     | `js/*.js` (global scope, classic scripts) → dibundel `assets/app-<hash>.js`             |
| API bridge frontend | `api-client.js` (`callAPI`) — dipakai SEMUA halaman                                     |
| Modal bersama       | `partials/modals-shared.html` → disalin ke `assets/modals-shared.html` + dimuat runtime |
| Backend             | `netlify/functions/**` (handler + actions + supabase client)                            |
| Build scripts       | `scripts/build-html.mjs`, `scripts/build-js.mjs`, `src/main.css` (input Tailwind)       |
| E2E / test          | `e2e/*.mjs` (Playwright), `js/helpers_cv.test.js` (Vitest)                              |

## Command (Bun)

```bash
bun install

bun run build        # build:css + build:html + build:js (WAJIB setelah ubah HTML/JS/CSS)
bun run build:css    # Tailwind → assets/main.css
bun run build:html   # partial modal → assets/modals-shared.html + loader runtime
bun run build:js     # bundel js/*.js + api-client + i18n + pwa → assets/app-<hash>.js

bun run test         # unit test (Vitest)
bun run lint         # ESLint
bun run format       # Prettier (seragam: single quote, semi, 2-spasi)

# E2E (butuh preview/server + Supabase keys)
BASE_URL=<url> bun run e2e
BASE_URL=<url> node e2e/photo-check.mjs
BASE_URL=<url> node e2e/modal-runtime-check.mjs
BASE_URL=<url> node e2e/probe-cleanup.mjs
node e2e/backend-fast-path.mjs   # backend langsung ke Supabase, tanpa HTTP
```

Preview lokal: `node serve-static.mjs` (port 3000, backend in-process).

## Aturan tim (penting)

1. **Setiap pekerjaan selesai WAJIB di-commit DAN di-push ke `main`** — tim lain
   selalu `git pull` untuk versi terbaru.
2. **Jangan deploy ke Netlify akun lama** (`asjportal.netlify.app`) — token tipis;
   rencana pindah ke akun Netlify baru. Sebelum deploy: cek preview + e2e dulu.
3. **WAJIB `bun run build`** setelah mengubah HTML/JS/CSS — artefak di-commit
   (hosting tidak menjalankan build). Lihat `WORKFLOW.md` untuk detail.
4. **Modal bersama**: edit di `partials/modals-shared.html`, bukan langsung di halaman.
5. **Jangan tambah dependensi eksternal** (Google/Drive/GAS/QR API dsb) — semua
   harus mandiri (Supabase + asset lokal). Kalau ragu, tanya dulu.
6. Kredensial: lewat API keys (Supabase URL + service role), bukan di-commit.

Status lengkap & riwayat kerja: `PROGRESS.md`. Pedoman pipeline & fitur: `PIPELINE.md`.
Cara kerja build/verifikasi: `WORKFLOW.md`. **Hasil review menyeluruh + TODO checklist
aksi (termasuk item keamanan yang WAJIB dicek): `REVIEW.md`.**
