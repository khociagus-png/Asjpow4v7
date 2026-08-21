# MEMORY.md — AI Context Memory ASJ Portal

> **FILE INI ADALAH OTAK AI** — Dibaca di AWAL setiap sesi kerja.
> Update setelah SELESAI sesi (bukan sebelum).
> Format: ringkas, bullet point, tidak perlu kalimat panjang.

**Terakhir diupdate:** 2026-08-21 — oleh Buffy (AI agent)

---

## 📍 Posisi Sekarang

- **Produk:** ASJ Portal — portal lowongan kerja ke Jepang (Netlify + Supabase)
- **Live:** `asjportal.netlify.app` — bundle `app-0d473e8141.js`
- **Status:** STABIL. Deploy terakhir sukses. Tidak ada bug kritis.
- **Stack:** Vanilla JS (ESM), Netlify Functions, Supabase, Cloudinary, Tailwind v4

## 🔧 Yang Terakhir Dikerjakan (reverse chronological)

1. **TypeScript migration** (2026-08-20) — 136+ file dikonversi JS→TS, `@ts-nocheck` di 73 file (gradual)
2. **Performance optimization** — debounce 250ms, infinite scroll, sessionStorage cache (belum di-commit)
3. **Guard runtime handler** — `checkInlineHandlers()` di `bridge.js` (dev-only)
4. **Scanner `check-handlers.mjs`** — self-validating, mencegah handler inline hilang dari seam
5. **Fix 3 handler inline tidak ter-expose** — filterKelolaLoker, filterCbx, cariKandidatManual
6. **Sesi admin permanen** — refresh token, login persist tanpa re-login
7. **Theme per user** — admin/kandidat/guest punya theme sendiri-sendiri
8. **Cloudinary migration** — upload dokumen pindah ke Cloudinary (direct unsigned)

## 🐛 Known Issues / Belum Selesai

- **Performance optimization belum di-commit** (Antigravity, 2026-08-20) — debounce + infinite scroll + cache sudah diode tapi belum masuk git
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
