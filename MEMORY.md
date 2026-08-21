# MEMORY.md — Detail History ASJ Portal

> **File ini untuk detail** — info singkat sudah ada di AGENTS.md §STATUS SEKARANG.
> Baca hanya saat butuh konteks lengkap (history, decisions, known issues detail).

**Terakhir diupdate:** 2026-08-21 — oleh Buffy (AI agent)

---

## 📍 Posisi Sekarang

- **Produk:** ASJ Portal — portal lowongan kerja ke Jepang (Netlify + Supabase)
- **Live:** `asjportal.netlify.app` — bundle `app-2bedcaa48d.js`
- **Status:** STABIL. 181/181 test lulus. TS clean (0 errors).
- **Stack:** Vanilla JS (ESM), Netlify Functions, Supabase, Cloudinary, Tailwind v4
- **Repo:** Bersih (21MB). Clone repos dihapus. Commit convention diterapkan.

## 📋 Sesi 2026-08-21 — Ringkasan

### Commits hari ini (7 commits, `a26c9e4` → `d3afc52`):

| # | Hash | Isi | Status |
|---|------|-----|--------|
| 1 | `a26c9e4` | feat: share view filter + upload helpers + Smart Ingestion fix + AI CV lang fix | ✅ Live |
| 2 | `3b9f560` | chore: AI agent (`.claude/`), bundle analyzer, E2E CI, issue templates | ✅ Pushed |
| 3 | `fe67a98` | docs: simplify context loading — status pindah ke AGENTS.md | ✅ Pushed |
| 4 | `4e9694d` | fix(mail): normalize 'UMUM' → 'UPDATE' + commitlint + i18n | ✅ Pushed |
| 5 | `c7825ee` | fix(mail): folder guard, dedup docs, max-height, badge fix + repo cleanup | ✅ Pushed |
| 6 | `3a55676` | fix(scripts): bundle-analyze.mts TS error (filename → writeFileSync) | ✅ Pushed |
| 7 | `d3afc52` | fix(test): update mail XSS test for displayStatus | ✅ Pushed |

### Yang dilakukan:

1. **Dev tooling:** `.claude/agents/` + 3 skills (build/debug/e2e), commitlint, E2E CI, issue templates, bundle analyzer
2. **Mail Inbox fix:** UMUM→UPDATE normalization, folder icon guard, dedup docs by URL, max-height scroll
3. **Repo cleanup:** hapus TencentDB-Agent-Memory (943MB) + playwright-agent-kit (504KB)
4. **Regression fix:** XSS test updated untuk `displayStatus` variable
5. **TypeScript:** `bun tsc -b --noEmit` clean (0 errors)

## 🔧 Yang Terakhir Dikerjakan (reverse chronological)

1. **Sesi 2026-08-21** — Dev tooling + Mail Inbox fix + repo cleanup + regression fix (7 commits)
2. **TypeScript migration** (2026-08-20) — 136+ file dikonversi JS→TS, `@ts-nocheck` di 73 file (gradual)
3. **Performance optimization** (Antigravity) — debounce 250ms, infinite scroll, sessionStorage cache (✅ sudah di kode)
3. **Guard runtime handler** — `checkInlineHandlers()` di `bridge.js` (dev-only)
4. **Scanner `check-handlers.mjs`** — self-validating, mencegah handler inline hilang dari seam
5. **Fix 3 handler inline tidak ter-expose** — filterKelolaLoker, filterCbx, cariKandidatManual
6. **Sesi admin permanen** — refresh token, login persist tanpa re-login
7. **Theme per user** — admin/kandidat/guest punya theme sendiri-sendiri
8. **Cloudinary migration** — upload dokumen pindah ke Cloudinary (direct unsigned)

## 🐛 Known Issues / Belum Selesai

- **Performance optimization** (Antigravity, 2026-08-20) — debounce 250ms + infinite scroll + sessionStorage cache — ✅ SUDAH ADA di kode & di-build (terverifikasi 2026-08-21)
- **73 file pakai `@ts-nocheck`** — perlu dihapus bertahap
- **`GROQ_API_KEY` & `LOG_DRAIN_TOKEN`** belum dipakai kode (opsional)
- **Node.js v22.23.2** perlu install manual di Windows (path: `C:\Users\AMANAH Sakura 3\nodejs-v22.23.2\`)

## 📋 Aturan Penting (JANGAN LUPA)

1. **WA format:** selalu `628xxxxxxxxxx` (13 digit) — gate `/^628\d{9,10}$/`
2. **Upload:** browser → Cloudinary → URL string ke backend. JANGAN base64 ke server.
3. **Modal:** edit HANYA di `partials/modals-shared.html`
4. **i18n:** semua teks UI lewat `tr('ui.key')`
5. **Build wajib:** `bun run build` setelah ubah JS/HTML/CSS
6. **Jangan deploy tanpa izin pemilik**
7. **Jangan sentuh pipeline** (PIPELINE.md)

## 🏗 Arsitektur Cepat

```
index.html (publik) ← js/main.js → assets/app-<hash>.js
admin.html (admin)  ← js/main.js → assets/app-<hash>.js
5 halaman standalone (apply-full, master-full, share, siswa-baru, ai_form)

Backend: netlify/functions/_lib/handlers.js → dispatchAction → actions-*.js
Bridge: js/core/bridge.js → registerSeamAliases() → window.*
```

## 🧠 Keputusan yang Sudah Diambil

- **Tanpa branch** — kerja langsung di `main` → GitHub
- **Cloudinary** untuk upload file (bukan Supabase Storage)
- **ESM modules** — semua modul sudah ESM, bridge ke window via `registerSeamAliases`
- **Prettier:** single quote, semi, 2-spasi, LF
- **Test:** Vitest 156/156 lulus

## 🛠 Dev Tooling (baru)

- **Bundle analyzer** — `bun run bundle:analyze` → `.freebuff/bundle-analysis.html`
- **Conventional commits** — `.githooks/commit-msg` validasi format `type(scope): desc`
- **E2E di CI** — `.github/workflows/e2e.yml` (Playwright, auto-run on push/PR)
- **Issue templates** — `.github/ISSUE_TEMPLATE/` (bug, feature, task)
- **AI agent** — `.claude/agents/senior-asj-developer.md` + 3 skills (build, debug, e2e)
- **Bundle insight** — Sentry = 688KB (29%), i18n = 97KB (4%), optimasi berikutnya: lazy load Sentry

## 📌 Yang Perlu Dilanjutkan

1. Commit performance optimization (Antigravity)
2. Hapus `@ts-nocheck` bertahap
3. Lazy load Sentry SDK (688KB → bisa di-load async)
4. Lazy load i18n inactive language (97KB → 50%)

---

> **CARA PAKAI FILE INI:**
> - AI agent: BACA file ini DI AWAL sesi sebelum coding
> - User: UPDATE file ini SELESAI sesi kerja (tambah bullet point apa yang dikerjakan)
> - File inipersist di git — semua AI agent yang kerja di project ini akan punya konteks yang sama
