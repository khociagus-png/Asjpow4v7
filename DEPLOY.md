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

---

## 3. Situs Netlify aktif (hasil sesi 2026-08-15)

| Item | Nilai |
| --- | --- |
| Nama site | `asjportal-379` |
| URL | https://asjportal-379.netlify.app |
| Admin URL | https://app.netlify.com/projects/asjportal-379 |
| Akun Netlify | `nerazzurri190889@gmail.com` (tim `asjamnag`) |
| Project ID | `7e433a31-82cd-4afb-8d1b-f0391cabdd3e` |

> ⚠️ **Penting — project privat by default:** sejak Juli 2026, project baru di akun
> Netlify baru **privat** (harus login Netlify untuk akses). Setelah membuat/deploy,
> wajib klik **Make public** (Project configuration → General → Visitor access →
> Project visibility → Production: Public). Kalau tidak, homepage & API dapat 401
> "Login Redirect" padahal deploy sukses.

### Env vars yang dipasang di site ini (nama saja — nilai ada di dashboard Netlify)
```
SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, SUPABASE_STORAGE_BUCKET,
ADMIN_MASTER_PIN, PIN_KHOCI, ASJ_ADMINS, ADMIN_NUMBERS, SESSION_SECRET,
GEMINI_API_KEY, FONNTE_TOKEN, NETLIFY_SITE_URL
```

---

## 4. Riwayat izin & deploy Netlify 📝

| Tanggal | Diizinkan oleh | Site | Catatan |
| --- | --- | --- | --- |
| 2026-08-15 | khoci89 (user, token diberikan via chat) | `asjportal-379` | Deploy CLI pertama (`--prod --dir .`); 237 file + 19 functions; 12 env var; visibility di-set Public; verifikasi OK (homepage 200, PIN admin, getAppData 132 jobs) |
| 2026-08-15 | khoci89 (user: "Redeploy") | `asjportal-379` | Redeploy fix `ecc1828` (export fetchMasterByWa) `--skip-functions-cache`; verifikasi ulang live: upload-check & biodata-check **full lulus**, getDrafCvMaster AGUS KHOCI lengkap (auto-fill CV AI terisi) |

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
