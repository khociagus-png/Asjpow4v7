# TODO.md — Daftar Pekerjaan Belum Selesai (ASJ Portal)

> Daftar gabungan semua item terbuka dari `REFACTOR_TODO.md`, `REVIEW.md`,
> `PROGRESS2.md`/`CHANGELOG2.md`, dan `DEPLOY.md`. Update: **2026-08-18 (malam)**.
> Coret `[x]` saat selesai. Detail & konteks ada di dokumen sumber masing-masing.

---

## 🔴 Deploy & live (butuh izin eksplisit pemilik — `DEPLOY.md` §2)

Paket fix terverifikasi di preview tapi **belum live** (live `app-0d473e8141`,
lokal `app-699dfb4a86`) — semua siap deploy sekaligus:- [x] **Deploy Netlify** — ✅ SELESAI 2026-08-18 (`aaac6ac`, deploy ID
`6a841baec747d7187ea615a8`): paket 8 fix (pwa.js reload palsu, 3 filter
seam, cekRiwayat, kartu Undangan Grup Kelas → puncak, hardening
filterKandidat, scanner check-handlers, guard runtime bridge, E2E SW) + refactor backend supabasePaged/storageRequest. Live kini
`app-699dfb4a86` — verifikasi: homepage 200, login SACHOU success,
getAppData admin candidatesTotal 223. Detail: DEPLOY.md §4.

- [x] **Hapus file uji Cloudinary** — ✅ 2026-08-18: `DOKUMENASJ/
 e2e-cloudinary-check_w1whnt` dihapus (API delete → `deleted`); folder
      `DOKUMENASJ/e2e` kini kosong. ⚠️ Catatan: 9 file `KK_*`/`KTP_*` (587 B)
      mencurigakan sebagai placeholder uji tapi asal-usul tak terkonfirmasi
      — cek di dashboard Cloudinary sebelum dihapus; `638_-644_*` &
      `WhatsApp_Image_2026-08-18…` ukurannya dokumen asli (biarkan).

## ✅ Env Netlify — SELESAI & TERVERIFIKASI (via Netlify API 2026-08-18)

- [x] **Env update 2026-08-18** — 14 var terpasang di dashboard Netlify
      (site `asjportal`, project `7e433a31-…`), diverifikasi langsung via API:
      `SUPABASE_URL/SERVICE_ROLE_KEY/ANON_KEY/STORAGE_BUCKET`,
      `ADMIN_MASTER_PIN`, `PIN_KHOCI`, `FONNTE_TOKEN`, `GEMINI_API_KEY`,
      `GROQ_API_KEY`, `LOG_DRAIN_TOKEN`, `NETLIFY_SITE_URL`, `SESSION_SECRET`,
      `ASJ_ADMINS`, `ADMIN_NUMBERS`.
- [x] **`SESSION_SECRET`** — ✅ terisi (64-hex kuat), diverifikasi via API.
- [x] **`ASJ_ADMINS`** — ✅ terisi format benar `SACHOU:1111,AYOK:2222,
 KHOLIS:3333,KHOCI:4444` (login SACHOU:1111 live `success:true`).
- [x] **`ADMIN_NUMBERS`** — ✅ typo diperbaiki `0082229020129` →
      `082229020129`. Legacy — belum dipakai kode mana pun.
- [x] **`CLOUDINARY_URL`** — tidak perlu: alur upload unsigned client-side,
      cloud `ybzzbw9i` hardcoded di `js/cloudinary.js`.

## 🗄️ Data & DB

- [x] ~~**Apply seed template WA "Undangan Wali"**~~ — ⚠️ **DIREVERT 2026-08-18**:
      "undang wali" adalah FITUR (Undang Grup Kelas, commit `10a45bc`), BUKAN
      template DB. Row seed dihapus (`WA1787018018630169`), DB kembali ke
      2 template asli, `scripts/seed-wa-templates.mjs` dihapus.
- [x] **Dedupe kandidat duplikat** — ✅ dry-run 2026-08-18: **0 duplikat** di
      `database_asj_form`, `database_candidate`, `pemberkasan_checklist`
      (tidak perlu `--apply`).

## ♻️ Refactor kode (`REFACTOR_TODO.md`)

- [x] **Fase 3.5 L6** — fasad `PortalBridge` + hapus alias `window.X = X`
      per-simbol di `js/` — ✅ selesai 2026-08-18.
- [x] **Fase 4** — pecah `i18n/locales/{id,jp}.js` per domain — ✅ 2026-08-18
      (15 domain/bahasa + lint `scripts/check-i18n.mjs`).
- [x] **Fase 5** — ekstrak head/header/footer/bottom-nav/social ke `partials/` + `scripts-shared.html` + style inline → `src/` — ✅ 2026-08-18.
- [x] **Fase 5 lanjutan** — partial head/theme-init halaman standalone — ✅
      2026-08-18 (`partials/head-shared.html`, `partials/theme-init.html`).
- [x] **Fase 6** — `build-js.mjs` entry/modul eksplisit (hapus STACK concat) + CI `e2e:share` — ✅ 2026-08-18 (47 modul via `js/main.js`).
- [x] **Sourcemap bundel** — ✅ 2026-08-18 (`bun run bundle:size` per-modul;
      kandidat lazy-load terbesar: i18n locale ui/form ≈ 97 KB).
- [x] **Guard kelas bug handler inline** — ✅ 2026-08-18: scanner statis
      `scripts/check-handlers.mjs` (self-check cakupan event, build+CI) +
      guard runtime `bridge.js` (dev/preview).
- [x] **Modul backend pakai helper terpusat** — ✅ audit 2026-08-18:
      `fetchPagedAll` (candidates.js) & `queryPaged` (misc.js) kini pakai
      `supabasePaged` baru di `client.js`; `listStorageFolder` (berkas.js)
      pakai `storageRequest` (storage.js). Sisa fetch = 3 helper pusat +
      API eksternal sah (Fonnte, AI provider). Terverifikasi live-check via
      preview: admin getAppData (223 kandidat total) + share-data 200.
- [x] **Cache admin TTL** — ✅ terimplementasi (2026-08-19): `cache.js` (20s public / 25s candidates), `loadPublicBase()` & `loadCandidatesUnik()` cached dengan TTL, `cacheClear()` dipanggil di 14 lokasi (register/mail/candidate/job/upload/master/drive). Schedules/tasks/WA templates fetch inline dalam handler → cache public base sudah cukup. Tidak perlu tambahan.

## 🔐 Keamanan (`REVIEW.md`)

- [x] **K1 — `SESSION_SECRET`** — ✅ terisi (lihat bagian env di atas).
      Verifikasi token admin tidak bisa dipalsukan: jalankan sesi berikutnya.
- [ ] (Opsional) token sekali pakai di link `generateFormBridge` bila nanti ada
      halaman publik butuh prefill penuh tanpa sesi. Diassessment 2026-08-19:
      implementasi membutuhkan token store backend (stateful) — lebih baik di-
      deferred ke sesi khusus karena: (a) link dipakai admin & kandidat login
      (session valid), (b) data yang ter-expose di URL = nama/WA/bidang (non-
      sensitive), (c) risiko rendah karena hanya prefill form, bukan aksi mutasi.

## 🧪 Infra E2E

- [x] **Jalankan E2E Playwright dengan Node ≥22** — ✅ 2026-08-18 (Node
      v22.23.2 user-local; login-check, upload-check, share-view lulus).
- [x] **Live check menyeluruh 2026-08-18** — ✅ E2E share/login/
      undang-grup-kelas/photo/upload/biodata + responsif 390/768/1280 +
      Cloudinary preset `asjportal`; vitest 156/156, lint 0 error.

## 🔒 Security headers (2026-08-19)

- [x] **HSTS + security headers di netlify.toml** — ✅ 2026-08-19:
      HSTS (max-age=6mo), X-Content-Type-Options (nosniff),
      Referrer-Policy, Permissions-Policy, CSP (HTML pages) ditambahkan.
      CSP memakai safe defaults + allowlist Supabase/Cloudinary/G Fonts.

## 🚀 Infra deploy (2026-08-18)

- [x] **Deploy otomatis via build hook** — ✅ build hook Netlify
      `6a84142ec210682c643028b8` + `.github/workflows/deploy-netlify.yml`
      (manual `workflow_dispatch`; auto-on-push tinggal buka komentar).
      DEPLOY.md §2.5. **Belum ada deploy yang dipicu.**
- [x] **Pindahkan URL build hook ke GitHub secret** — ✅ 2026-08-18:
      secret `NETLIFY_BUILD_HOOK_URL` di-set via API (libsodium sealed box,
      token dari git credential; terverifikasi terdaftar); workflow kini baca
      `${{ secrets.NETLIFY_BUILD_HOOK_URL }}`.

---

## 📋 Catatan env (status per 2026-08-18 malam — autoritatif: Netlify API)

Nilai lengkap sudah diberikan pemilik via chat, ditulis ke `.env.local`
(gitignored), **dan sudah terpasang di dashboard Netlify** (diverifikasi via
API — 14 var, lihat tabel `DEPLOY.md` §3).

- ✅ Terpasang & terverifikasi: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
  `SUPABASE_ANON_KEY`, `SUPABASE_STORAGE_BUCKET` (asj-files),
  `ADMIN_MASTER_PIN`, `PIN_KHOCI`, `ADMIN_NUMBERS`, `FONNTE_TOKEN`,
  `GEMINI_API_KEY`, `GROQ_API_KEY`, `LOG_DRAIN_TOKEN`, `NETLIFY_SITE_URL`,
  `SESSION_SECRET`, `ASJ_ADMINS`.
- ℹ️ `GROQ_API_KEY` & `LOG_DRAIN_TOKEN` sudah di whitelist `env.js` tapi belum
  dipakai kode (siap pakai). `CLOUDINARY_URL`/deploy key/auth token bukan env
  aplikasi — untuk CLI deploy (`cloud ybzzbw9i` hardcoded di
  `js/cloudinary.js`).
