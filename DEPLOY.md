# DEPLOY.md — Sumber Kode & Kebijakan Deploy (ASJ Portal)

Dokumen ini adalah **aturan tim** soal dari mana kode diambil/diubah dan **siapa yang
boleh deploy ke mana**. Baca sebelum commit, push, atau deploy.

> Repo: `khociagus-png/Asjpow4v7` · Produk: ASJ Portal (lowongan kerja ke Jepang,
> PT Amanah Sakura Japan). Baca juga `WORKFLOW.md`, `AGENTS.md`, `PIPELINE.md`.

---

## 1. GitHub = MAIN BASE (satu-satunya sumber kode) 🏠

- **Semua kode** (fitur, update, patch, revisi, perbaikan) hidup di **GitHub**,
  repo `khociagus-png/Asjpow4v7`, branch **`main`**.
- Anggota tim mengambil versi terbaru:
  ```bash
  git pull origin main
  ```
- **Dilarang mengerjakan di salinan repo lain yang tidak di-push ke GitHub.**
  (Riwayat kasus: kode "sudah dikerjakan" hilang/kerja ulang karena dikerjakan di
  copy repo terpisah dan tidak pernah masuk ke `main`.)
- Setiap tugas yang selesai **wajib commit + push ke `main`** dengan jejak
  siapa & kapan (aturan: `WORKFLOW.md` §7).
- Kalau ragu apakah kerjaanmu sudah masuk GitHub: `git status` + `git log --oneline -3`.

---

## 2. Aturan deploy 🔒

1. **Netlify: DILARANG deploy KECUALI diizinkan eksplisit oleh pemilik**
   (khoci89 / Agus / siapa pun yang memegang akun Netlify) pada sesi tersebut.
   - "Diizinkan" = pemilik memberikan token `NETLIFY_AUTH_TOKEN` **atau** secara
     tertulis menyuruh deploy ke Netlify.
   - Setiap deploy Netlify **dicatat di §4** (tanggal, diizinkan oleh, site, catatan).
2. Jalur deploy lain (mis. tombol **Deploy Freebuff**) boleh dipakai sesuai
   kebijakan masing-masing — tetap konfirmasi ke pemilik sebelum mengubah live.
3. `netlify.toml` & `netlify/functions` tetap ada di repo karena itu bentuk
   **backend/API** aplikasi — **bukan** izin otomatis untuk deploy ke Netlify.
4. Situs live **tidak otomatis sinkron dengan repo**. Setelah commit+push, live
   hanya berubah setelah deploy yang diizinkan.
5. **Jalur otomatis (2026-08-18)** — build hook Netlify dipicu dari GitHub
   Actions (`.github/workflows/deploy-netlify.yml`); URL hook ada di GitHub
   Actions secret `NETLIFY_BUILD_HOOK_URL` (di-set via API 2026-08-18 —
   repositori `khociagus-png/Asjpow4v7`). Workflow **sengaja manual**
   (`workflow_dispatch`) — deploy tetap butuh keputusan eksplisit pemilik
   (klik tombol **Run workflow**). Auto-deploy tiap push ke `main` tinggal
   membuka komentar blok `push:` di workflow — hanya setelah pemilik setuju.
   Setiap deploy yang jadi tetap dicatat di tabel §4.

---

## 3. Situs Netlify aktif (hasil sesi 2026-08-15)

| Item         | Nilai                                                                                               |
| ------------ | --------------------------------------------------------------------------------------------------- |
| Nama site    | `asjportal` (sebelumnya `asjportal-379` — di-rename; URL lama `asjportal-379.netlify.app` kini 404) |
| URL          | https://asjportal.netlify.app                                                                       |
| Admin URL    | https://app.netlify.com/projects/asjportal                                                          |
| Akun Netlify | `nerazzurri190889@gmail.com` (tim `asjamnag`)                                                       |
| Project ID   | `7e433a31-82cd-4afb-8d1b-f0391cabdd3e`                                                              |

> ⚠️ **Penting — project privat by default:** sejak Juli 2026, project baru di akun
> Netlify baru **privat** (harus login Netlify untuk akses). Setelah membuat/deploy,
> wajib klik **Make public** (Project configuration → General → Visitor access →
> Project visibility → Production: Public). Kalau tidak, homepage & API dapat 401
> "Login Redirect" padahal deploy sukses.

### Env vars yang dipasang di site ini (nama saja — nilai ada di dashboard Netlify)

```
SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, SUPABASE_STORAGE_BUCKET,
ADMIN_MASTER_PIN, PIN_KHOCI, ASJ_ADMINS, ADMIN_NUMBERS, SESSION_SECRET,
GEMINI_API_KEY, FONNTE_TOKEN, NETLIFY_SITE_URL,
GROQ_API_KEY, LOG_DRAIN_TOKEN    # ditambahkan 2026-08-18 (whitelist env.js sudah ada)
```

> **Audit env produksi 2026-08-18** (dicek langsung via Netlify API — status
> autoritatif):
>
> | Key                                                                 | Produksi | Status            | Catatan                                                                                                            |
> | ------------------------------------------------------------------- | -------- | ----------------- | ------------------------------------------------------------------------------------------------------------------ |
> | `SUPABASE_URL` / `SERVICE_ROLE_KEY` / `ANON_KEY` / `STORAGE_BUCKET` | ✅       | OK                | —                                                                                                                  |
> | `ADMIN_MASTER_PIN`                                                  | ✅       | OK                | PIN master admin                                                                                                   |
> | `PIN_KHOCI`                                                         | ✅       | OK                | PIN khusus KHOCI (theme Inter)                                                                                     |
> | `GEMINI_API_KEY` / `FONNTE_TOKEN` / `NETLIFY_SITE_URL`              | ✅       | OK                | —                                                                                                                  |
> | `SESSION_SECRET`                                                    | ✅       | OK                | 64-hex kuat — penanda token sesi HMAC                                                                              | >   | `ASJ_ADMINS` | ✅  | **DIPERBAIKI 2026-08-18** | Diisi `SACHOU:1111,AYOK:2222,KHOLIS:3333,KHOCI:4444` (format `Nama:pin` benar — sebelumnya berisi nomor WA sehingga login admin non-KHOCI tidak berfungsi). |
> | `ADMIN_NUMBERS`                                                     | ✅       | typo diperbaiki   | `0082229020129` → `082229020129` (semua 12 digit). Belum dipakai kode (legacy).                                    |
> | `GROQ_API_KEY` / `LOG_DRAIN_TOKEN`                                  | ✅       | dibuat 2026-08-18 | Sudah di `.env.local` + whitelist `env.js`; **belum dibaca kode mana pun** — disiapkan untuk penggunaan mendatang. |
>
> Nilai secret tidak ditulis di repo; set di dashboard Netlify → **redeploy**
> (env baru terpasang setelah redeploy). Catatan lain: tidak ada tabel admin di
> Supabase (`admin_users`/`admins`/`staff` tidak ada; `findAdmins` hanya
> menemukan `user_sessions`) — jadi `ASJ_ADMINS` adalah SATU-SATUNYA mekanisme
> login admin personal selain KHOCI. `CLOUDINARY_URL`, `NETLIFY_AUTH_TOKEN`, dan
> deploy key SSH bukan env aplikasi — simpan di Keys/API keys Freebuff untuk CLI
> deploy (cloud `ybzzbw9i` sudah hardcoded di `js/cloudinary.js`). Daftar tugas
> terbuka: lihat `TODO.md`.

---

## 4. Riwayat izin & deploy Netlify 📝

| Tanggal    | Diizinkan oleh                                                                                                                       | Site                | Catatan                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-08-15 | khoci89 (user, token diberikan via chat)                                                                                             | `asjportal-379`     | Deploy CLI pertama (`--prod --dir .`); 237 file + 19 functions; 12 env var; visibility di-set Public; verifikasi OK (homepage 200, PIN admin, getAppData 132 jobs)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2026-08-15 | khoci89 (user: "Redeploy")                                                                                                           | `asjportal-379`     | Redeploy fix `ecc1828` (export fetchMasterByWa) `--skip-functions-cache`; verifikasi ulang live: upload-check & biodata-check **full lulus**, getDrafCvMaster AGUS KHOCI lengkap (auto-fill CV AI terisi)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2026-08-16 | khoci89 (user: "Tolong deploy ke netlify terus update github")                                                                       | `asjportal-379`     | Deploy `14c2661` (fix simpan AI form CHECK constraint `d0c1a71` + assets build) `--skip-functions-cache`; verifikasi live OK: homepage 200, checkAdminMaster `success:true`, getAppData jobs ada; 23 file + 19 functions                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-08-17 | khoci89 (user: kirim token `NETLIFY_AUTH_TOKEN` via chat, minta clean install + deploy)                                              | `asjportal`         | Deploy `7796fb7` (i18n JP fix + tombol undangan pindah ke panel WA + fix hapusTugas); clean install bun (146 pkg) + `netlify-cli` jadi devDependency; patch lokal `nodejs-compile-cache.js` (Bun: `enableCompileCache()` null → destructure crash); verifikasi live: homepage 200, bundle `app-70c4fbc34d.js` berisi 5 fix JP, checkAdminMaster `success:true`, getAppData jobs ada                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2026-08-17 | khoci89 (user: kirim token `nfp_…sb844` via chat, keluhan "Masih sama ga ada badgenya, wa undangan wali juga ga ada")                | `asjportal`         | Deploy `83f5ebf` (SW anti-cache-nyangkut: `skipWaiting()` instan + broadcast `ASJ_FORCE_RELOAD` + self-check versi + badge `v<hash>` di header admin) via **`scripts/deploy-netlify.mjs`** (SKIP_INSTALL/SKIP_BUILD — build lokal sudah identik dengan repo). Deploy ID `6a8316913c4ff6fd46510e5e`; hashing 328 file + 19 functions; CDN upload 8 file. **Kunci: live kini bundle `app-a6d33c32dd.js` + sw.js VERSION `asj-portal-app-a6d33c32dd-m886a44dc`** — HP yang masih nyangkut versi lama otomatis beralih di navigasi berikutnya (SW baru langsung aktif karena skipWaiting dipanggil pertama, cache lama di-purge). Verifikasi live: homepage 200, bundle `app-a6d33c32dd.js` 200, getAppData jobs=132                                                                                                                                                                                                                     |
| 2026-08-19 | khoci89 (user: deploy — izin eksplisit)                                                                                              | `asjportal`         | **Deploy fix shareLinkFor URL generation + FCM routing** `f18f6c7` via `scripts/deploy-netlify.mjs`. Fix: `shareLinkFor()` generate URL salah dari admin.html (`admin.htmlshare.html` → 404) — root cause: `.replace('index.html','')` tidak match `admin.html`. Fix: regex strip semua `.html` filenames ke `/`. Deploy ID `6a8572760599e5512c3f1a25`; 375 file + 19 functions. **Kunci: live kini bundle `app-d74730f28a.js` + sw.js VERSION `asj-portal-app-d74730f28a-m886a44dc`**. Verifikasi live: homepage 200, bundle `app-d74730f28a.js` 200, share.html?job=TG646ASJ 200, getAppData jobs=140                                                                                                                                                                                                                                                                                                                              |
| 2026-08-19 | khoci89 (user: "ok comit push deploy" — izin eksplisit)                                                                              | `asjportal`         | **Deploy fix registerFcmToken routing** `da38977` via `scripts/deploy-netlify.mjs`. Fix: `registerFcmToken: 'auth'` ditambahkan ke `NETLIFY_FUNCTIONS` di `api-client.js` — sebelumnya `callAPI('registerFcmToken')` menghasilkan URL `undefined` → 404. Deploy ID `6a856a58cf6f54a302e23567`; 375 file + 19 functions. **Kunci: live kini bundle `app-494ddb9f50.js` + sw.js VERSION `asj-portal-app-494ddb9f50-m886a44dc`**. Verifikasi live: homepage 200, bundle `app-494ddb9f50.js` 200, getAppData jobs=140                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-08-19 | khoci89 (user: deploy — izin eksplisit)                                                                                              | `asjportal`         | **Deploy fitur Data Pelamar Excel-style** `4f0f938` via `scripts/deploy-netlify.mjs`. Isi: Toggle Tampilan Sederhana ↔ Lengkap (persist per admin), Excel-style column filters (text input + dropdown per kolom, persist localStorage), Export filtered CSV (hanya baris yang match filter aktif), i18n id/jp. Deploy ID `6a851482035909afd13e5142`; 375 file + 19 functions. **Kunci: live kini bundle `app-cf4099018b.js` + sw.js VERSION `asj-portal-app-cf4099018b-m886a44dc`**. Verifikasi live: homepage 200, bundle `app-cf4099018b.js` 200, getAppData jobs=140                                                                                                                                                                                                                                                                                                                                                              |
| 2026-08-18 | khoci89 (user: "Berikan daftar nama admin + PIN … lalu set env Netlify … dan redeploy" + "tolong update semua env" — izin eksplisit) | `asjportal`         | **Env produksi di-update via Netlify Envelope API** (14 var): `ASJ_ADMINS` dibetulkan ke format benar `SACHOU:1111,AYOK:2222,KHOLIS:3333,KHOCI:4444` (sebelumnya salah: berisi nomor WA → login admin non-KHOCI tidak berfungsi); `ADMIN_NUMBERS` typo `0082229020129` → `082229020129` (12 digit semua); `GROQ_API_KEY` & `LOG_DRAIN_TOKEN` dibuat (sebelumnya tidak ada). `SESSION_SECRET` (64-hex) dipertahankan. Deploy `acb299b` (refresh token kandidat + auto-update versi + theme per user + sesi admin selalu login) via `scripts/deploy-netlify.mjs` (SKIP_INSTALL=1). Deploy ID `6a83e314edaee8348ce2f907`; 202 file + 19 functions. **Kunci: live kini bundle `app-0d473e8141.js` + sw.js VERSION `asj-portal-app-0d473e8141-m886a44dc`**. Verifikasi live: homepage 200, bundle `app-0d473e8141.js` 200, getAppData jobs=132, login `SACHOU:1111` → `success:true` + refreshAdminSession → `success:true`               |
| 2026-08-18 | khoci89 (user: "deploy" — izin eksplisit)                                                                                            | `asjportal`         | **Deploy paket 8 fix + refactor backend** `aaac6ac` via `scripts/deploy-netlify.mjs` (SKIP_INSTALL=1, SKIP_BUILD=1 — build lokal `app-699dfb4a86` identik repo, tree bersih). Isi: fix `pwa.js` reload palsu standalone, 3 fix filter seam (`filterKelolaLoker`/`filterCbx`/`cariKandidatManual`), fix `cekRiwayat` (apply-full), kartu Undangan Grup Kelas → puncak tab WA Pintar + badge "Fitur Khusus", hardening `filterKandidat`, guard `check-handlers.mjs` (scanner CI+build), guard runtime handler `bridge.js` (dev/preview), E2E anti-race SW, refactor backend `supabasePaged`/`storageRequest`. Deploy ID `6a841baec747d7187ea615a8`; 375 file + 19 functions. **Kunci: live kini bundle `app-699dfb4a86.js` + sw.js VERSION `asj-portal-app-699dfb4a86-m886a44dc`**. Verifikasi live: homepage 200, `getAppData jobs=140`, login `SACHOU:1111` → `success:true`, getAppData admin → `candidatesTotal:223`, `dbJobs:140` |
| 2026-08-19 | khoci89 (user: "ya tolong clean install deploy ke netlivy" — izin eksplisit via CLI token)                                           | `asjportal`         | **Deploy fitur Filter Admin Sederhana & Validasi Email** `d279b80` via `scripts/deploy-netlify.mjs`. Isi: Menambahkan _filter bar_ (input text & dropdown) di Tampilan Sederhana (Nama, WA, Email, Job, Tahapan) agar tetap fungsional tanpa memperlebar tabel, ditambah validasi Email Aktif & auto-fill dari backend pada _apply-full_. Deploy ID `6a85263c96e66eea408eff11`; Hashing 375 files + 19 functions. **Kunci: live kini bundle `app-a5a77f2f49.js` + sw.js VERSION `asj-portal-app-a5a77f2f49-m886a44dc`**. Verifikasi live OK: homepage 200, bundle 200, getAppData jobs=140.                                                                                                                                                                                                                                                                                                                                          |
| 2026-08-19 | khoci89 (user: "seperti aturan biasa commit ke main semua abis itu push ke git hub baru deploy ke netlivy")                          | `asjportal`         | **Deploy fitur Push Notification FCM** via `scripts/deploy-netlify.mjs`. Isi: Integrasi Firebase Cloud Messaging v1 (`firebase-app-compat`, `firebase-messaging-compat`). Tombol "Notifikasi" PWA di navbar admin & kandidat, Service Worker listener `onBackgroundMessage`, Helper JWT tanpa dependency (`fcm-server.js`), API pendaftaran token FCM `fcm_tokens`, dan Push otomatis ke Admin saat kandidat submit form lamaran. **Kunci: live kini bundle `app-106d758543.js` + sw.js VERSION `asj-portal-app-106d758543-m886a44dc`**.                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-08-21 | khoci89 (user: kirim token `nfp_…HvCKgE2f5c` via chat + "deploy" — izin eksplisit)                                                   | `asjportal-terbaru` | **Deploy setelah TS migration + share view fix** `032e71a` via Netlify API zip + CLI deploy. Isi: Pre-build `formsByWa` map di share view (performa + konsisten), seluruh TS migration (204 file `.js`→`.ts`), tipe definitions, build pipeline. Site pindah ke `asjportal-terbaru` (token baru). Deploy ID `6a87b8f0d60b0854d5447eab`; 498 file + 20 functions. **Kunci: live kini bundle `app-b88acaddd6.js`**. Verifikasi live: homepage 200, bundle 200, getAppData jobs=143. ⚠️ Catatan: deploy butuh compile `_lib/*.ts` → `.js` via esbuild lokal karena netlify-cli belum support resolve `.ts` dari `.js` require.                                                                                                                                                                                                                                                                                                          |
| 2026-08-26 | khoci89 (user: "email net lify baru", "build ulang saja di sini" — izin eksplisit via CLI token baru)                                | `asjportal`         | **Deploy ulang ke site baru karena limit credit akun lama** `b9730fa` via Netlify CLI deploy (`ntl sites:create` & `ntl deploy --prod`). Isi: Pindah ke akun Netlify baru, mengklaim ulang URL `asjportal.netlify.app`. Menyertakan fix build Tailwind CSS dan perbaikan bug *unreachable code* notifikasi FCM. Deploy ID `6a8e359768712ecf2f67d66e`; 481 files + 21 functions. **Kunci: site URL asjportal.netlify.app (Site ID: e2ae31ca-18ca-49ee-8198-bb6317b532bc)**. Verifikasi live: URL `asjportal.netlify.app` aktif.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

> Isi baris baru SETIAP kali deploy Netlify dilakukan. Tanpa baris di tabel ini,
> deploy Netlify dianggap tidak sah.

---

## 5. Checklist deploy Netlify (hanya dengan izin §2)

1. ✅ `git pull` → pastikan di commit terbaru `main`
2. ✅ Kalau menyentuh frontend/partial/css: `bun run build` + **commit asset**
   (`assets/*` hasil build wajib ikut repo — Netlify tidak menjalankan build)
3. ✅ Env vars lengkap (daftar §3) — `npx netlify-cli env:list`
4. ✅ Site visibility **Public**
5. ✅ Verifikasi setelah deploy:
   ```bash
   curl -s -o /dev/null -w "%{http_code}" https://<site>.netlify.app/            # 200
   curl -s -X POST https://<site>.netlify.app/.netlify/functions/auth \
     -H 'Content-Type: application/json' \
     -d '{"action":"checkAdminMaster","payload":["<PIN>",""]}'                   # {"success":true}
   curl -s -X POST https://<site>.netlify.app/.netlify/functions/get-app-data \
     -H 'Content-Type: application/json' -d '{"action":"getAppData","payload":[]}' # jobs ada
   ```

---

## 6. Cara deploy Netlify via CLI (hanya dengan izin)

```bash
# Token disimpan di Keys/API keys Freebuff dengan nama NETLIFY_AUTH_TOKEN
NETLIFY_AUTH_TOKEN=<token> npx netlify-cli deploy --prod --dir . --site 7e433a31-82cd-4afb-8d1b-f0391cabdd3e
```

- `--dir .` = publish root repo (sesuai `netlify.toml`); functions otomatis dari
  `netlify/functions` (19 function).
- Ganti env var di Netlify: `npx netlify-cli env:set KEY VALUE --site <id>`.
- Setelah ubah env: **redeploy** supaya env baru terpasang.
