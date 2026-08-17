# ASJ Portal

Portal rekrutmen **PT Amanah Sakura Japan** — kandidat kerja ke Jepang. 100% mandiri: **tanpa Google Apps Script / Drive / QR eksternal**. Data & file di Supabase; upload dokumen via **Cloudinary** (direct unsigned).

## Stack & arsitektur

- **Frontend**: HTML statis + vanilla JS (ESM, tanpa framework) · PWA · Tailwind v4.
- **Backend**: Netlify Functions — dispatcher `netlify/functions/_lib/handlers.js` → aksi per domain (`actions-*.js`) → Supabase (PostgREST) via `_lib/db/`.
- **Storage**: Supabase (DB) + Cloudinary (file, preset unsigned `asjportal`, cloud `ybzzbw9i`).

## Struktur penting

| Bagian             | Lokasi                                                                                 |
| ------------------ | -------------------------------------------------------------------------------------- |
| Halaman utama      | `index.html` (publik + dashboard kandidat), `admin.html` (admin)                       |
| Halaman mandiri    | `apply-full.html`, `master-full.html`, `ai_form.html`, `share.html`, `siswa-baru.html` |
| Logika frontend    | `js/*.js` (ESM) → bundel `assets/app-<hash>.js` (entry `js/main.js`)                   |
| Bridge ESM→classic | `js/core/bridge.js` (window alias + `registerSeamAliases`)                             |
| Modal              | `partials/modals-shared.html` → `assets/modals-shared.html` (runtime loader)           |
| Backend            | `netlify/functions/**` + `_lib/` (handlers, actions, db, storage, session, rate-limit) |
| Build              | `scripts/build-{js,html}.mjs`, `src/main.css` (input Tailwind)                         |
| Test / E2E         | `*.test.js` (Vitest), `e2e/*.mjs` (Playwright)                                         |

## Command (Bun)

```bash
bun install
bun run build        # check:globals + build:css + build:html + build:js (WAJIB setelah ubah JS/HTML/CSS)
bun run test         # Vitest
bun run lint         # ESLint
bun run format       # Prettier (single quote, semi, 2-spasi, LF)
node serve-static.mjs  # preview lokal :3000 (backend in-process)
```

## Aturan penting

0. **Format & syntax dijaga otomatis**: git hook pre-commit (`.githooks/`, aktif otomatis saat `bun install`) + **CI check GitHub** (`ci-check.yml`: format + lint + test + build) di tiap push/PR ke `main`. Skip darurat: `git commit --no-verify`.
1. **Selesai tugas = commit + push ke `main`** (WORKFLOW.md §7).
2. **Jangan deploy Netlify tanpa izin eksplisit pemilik** (DEPLOY.md).
3. **WAJIB `bun run build`** setelah ubah JS/HTML/CSS — artefak di-commit (hosting tidak build).
4. **Modal**: edit hanya di `partials/modals-shared.html`.
5. **Upload file**: browser → Cloudinary (`js/cloudinary.js`) → kirim URL string ke backend. Jangan kirim base64.
6. **Normalisasi WA** wajib (`628…`, gate `/^628\d{9,10}$/`) — jangan pernah longgarkan.

## Peta dokumen (baca sesuai kebutuhan)

| Dokumen                          | Isi                                                           |
| -------------------------------- | ------------------------------------------------------------- |
| `AGENTS.md`                      | Peta kode + konvensi patch (WAJIB baca tiap sesi)             |
| `WORKFLOW.md`                    | Aturan kerja tim (commit/push, struktur, larangan)            |
| `PIPELINE.md`                    | Alur lapangan ASJ — **jangan diubah**                         |
| `PROGRESS2.md` / `CHANGELOG2.md` | Riwayat sesi terbaru (legacy: `PROGRESS.md` / `CHANGELOG.md`) |
| `DEPLOY.md`                      | Kebijakan + riwayat izin deploy Netlify                       |
| `REVIEW.md`                      | Audit keamanan + checklist aksi                               |
| `ESM_BRIDGE.md`                  | Konvensi ESM / bridge `window.*`                              |
| `REFACTOR_TODO.md`               | Roadmap refactor — sisa pekerjaan terbuka                     |
