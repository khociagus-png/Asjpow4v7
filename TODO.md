# TODO.md — Daftar Pekerjaan Belum Selesai (ASJ Portal)

> Daftar gabungan semua item terbuka dari `REFACTOR_TODO.md`, `REVIEW.md`,
> `PROGRESS2.md`/`CHANGELOG2.md`, dan `DEPLOY.md`. Update: **2026-08-18**.
> Coret `[x]` saat selesai. Detail & konteks ada di dokumen sumber masing-masing.

---

## 🔴 Deploy & live (butuh izin eksplisit pemilik — `DEPLOY.md` §2)

- [ ] **Deploy Netlify terbaru** — semua kerjaan sejak deploy terakhir `83f5ebf`
      (17/8) **belum live**: keep-alive `ping`, migrasi upload → Cloudinary penuh
      (master-full, apply-full, ai_form, siswa-baru, loker admin), i18n JP fix,
      `.gitattributes` eol=lf, fix E2E upload-check.
- [ ] **Set env update 2026-08-18** di dashboard Netlify, lalu **redeploy**
      (env baru baru terpasang setelah redeploy).
- [ ] **`SESSION_SECRET`** — belum di-set (REVIEW.md K1). Wajib acak panjang di
      env Netlify; fallback publik di `session.js` hanya untuk sandbox.
- [ ] **`ASJ_ADMINS`** (`"Nama:pin,Nama:pin"`) — belum diberikan; dipakai
      `handleCheckAdminPersonal` (`actions-auth.js`).
- [ ] **Konfirmasi `ADMIN_NUMBERS`** — ada di whitelist `env.js` tapi **belum
      dipakai kode mana pun** (legacy). Nilai `0082229020129` dicurigai typo
      (yang lain format `08xx` 12 digit — cek nomor sebenarnya).
- [ ] (Opsional) hapus file uji Cloudinary `DOKUMENASJ/asj-preset-test_*.txt`
      dari akun Cloudinary (preset `asjportal` sudah terverifikasi OK).

## 🗄️ Data & DB

- [x] **Apply seed template WA "Undangan Wali"** — ✅ di-apply 2026-08-18
      (konfirmasi pemilik); DB `wa_templates` sekarang 3 template (sebelumnya 2).
- [ ] **Dedupe kandidat duplikat**: `bun run dedupe` (dry-run) → kalau ada,
      `bun run dedupe:apply` (backup otomatis ke `.freebuff/`).

## ♻️ Refactor kode (`REFACTOR_TODO.md`)

- [ ] **Fase 3.5 L6** — selesaikan fasad `PortalBridge` + hapus alias
      `window.X = X` per-simbol (seam & dispatcher `data-action` sudah selesai).
- [ ] **Fase 4** — pecah `i18n/locales/{id,jp}.js` per domain (`common`, `auth`,
      `public`, …) + lint key duplikat lintas file.
- [ ] **Fase 5** — ekstrak head/header/footer/bottom-nav/social ke `partials/`;
      `partials/scripts-shared.html`; pindah `<style>` inline → `src/`;
      verifikasi `build:html` byte-compatible.
- [ ] **Fase 6** — `build-js.mjs` entry/modul eksplisit (hapus STACK concat);
      sourcemap opsional; CI diperluas (lint+test+build+e2e:share).
- [ ] Pastikan semua modul backend pakai `supabase.*` helper (bukan fetch mentah).
- [ ] (Opsional) cache admin TTL pendek; cek region Supabase.

## 🔐 Keamanan (`REVIEW.md`)

- [ ] **K1** — set `SESSION_SECRET` (baris di atas) + verifikasi token admin
      tidak bisa dipalsukan.
- [ ] (Opsional) token sekali pakai di link `generateFormBridge` bila nanti ada
      halaman publik butuh prefill penuh tanpa sesi.

## 🧪 Infra E2E

- [ ] Jalankan E2E Playwright dengan **Node ≥22** (macet di Bun/Windows) —
      dev/CI pakai Node ≥22, bukan bun.

---

## 📋 Catatan env terbaru (2026-08-18)

Nilai lengkap sudah diberikan pemilik via chat dan **sudah ditulis ke
`.env.local` (gitignored) — 12 key terverifikasi cocok hash 2026-08-18**, jadi
preview lokal pakai kredensial terbaru. **Belum di-set ke dashboard Netlify**
(nilai secret tidak ditulis di repo ini — set di dashboard Netlify, lalu redeploy).

- ✅ Diberikan: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`,
  `SUPABASE_STORAGE_BUCKET` (asj-files), `ADMIN_MASTER_PIN`, `PIN_KHOCI`,
  `ADMIN_NUMBERS`, `FONNTE_TOKEN`, `GEMINI_API_KEY`, `GROQ_API_KEY`,
  `LOG_DRAIN_TOKEN`, `NETLIFY_SITE_URL`, `NETLIFY_AUTH_TOKEN`, deploy key SSH,
  `CLOUDINARY_URL`.
- ❌ Belum: `SESSION_SECRET`, `ASJ_ADMINS`.
- ⚠️ Perlu dicek saat set: `SUPABASE_ANON_KEY` terpecah baris (whitespace besar)
  — pastikan nilai utuh tanpa spasi; `ADMIN_NUMBERS` nomor `0082229020129`
  (lihat 🔴 di atas).
- ℹ️ `GROQ_API_KEY` & `LOG_DRAIN_TOKEN` sudah di whitelist `env.js` tapi belum
  dipakai kode (siap pakai). `CLOUDINARY_URL`/deploy key/auth token bukan env
  aplikasi — untuk CLI deploy (`cloud ybzzbw9i` sudah hardcoded di
  `js/cloudinary.js`).
