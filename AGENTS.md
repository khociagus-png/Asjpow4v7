# AGENTS.md — Panduan Cepat untuk AI/Agent & Anggota Tim

> **Baca file ini di AWAL setiap sesi** sebelum menyentuh kode. File ini adalah peta
> struktur + konvensi penulisan/patching supaya tidak perlu cari-cari lagi saat
> revisi, patch, atau nambah fitur.

**Repo:** `khociagus-png/Asjpow4v7` · **Produk:** ASJ Portal — portal lowongan kerja
ke Jepang PT Amanah Sakura Japan (siswa ASJ daftar magang/kerja, isi biodata via
chat AI, upload berkas, admin kelola pipeline & pemberkasan).

---

## 1. Urutan dokumen yang wajib dibaca

| Dokumen                                                                                        | Isi                                                                                     | Kapan dibaca                             |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------- |
| **AGENTS.md** (ini)                                                                            | Peta kode + konvensi patch cepat                                                        | Setiap sesi                              |
| **WORKFLOW.md**                                                                                | Aturan kerja tim: commit/push, struktur, command, larangan deploy                       | Setiap sesi                              |
| **PIPELINE.md**                                                                                | Alur lapangan ASJ (JO → seleksi → lolos → pemberkasan) — **jangan mengubah pipeline**   | Sebelum menyentuh fitur tahapan kandidat |
| **REVIEW.md**                                                                                  | Audit keamanan & rekomendasi                                                            | Saat kerja di backend/keamanan           |
| **PROGRESS2.md / CHANGELOG2.md** (PROGRESS.md / CHANGELOG.md = legacy, ada pointer di atasnya) | Riwayat kerja & keputusan — **wajib ada header sesi: tanggal + pengerja + hash commit** | Saat butuh konteks perubahan lama        |

---

## 2. Peta struktur & pipeline build

```
root/
├── index.html, admin.html, apply-full.html, master-full.html,
│   share.html, siswa-baru.html, ai_form.html   # SPA statis (vanilla JS, no framework)
├── js/*.js, js/{init,engine,render,api,admin_modal,admin_ops,ai_copilot,pages,core}/  # logika frontend (sumber)
├── api-client.js, i18n.js   # client API + terjemahan — **sudah ESM (Fase 3)**: export + alias window.*
├── js/core/bridge.js        # bridge ESM→legacy: window.PortalBridge (lihat ESM_BRIDGE.md)
├── pwa.js                   # service worker helper (classic)
├── partials/modals-shared.html                 # SATU-SATUNYA sumber semua modal (~30 modal)
├── src/main.css                                # input Tailwind v4
├── netlify/functions/_lib/
│   ├── handlers.js      # DISPATCHER semua action backend (handleAction → dispatchAction)
│   ├── supabase.js      # akses DB Supabase + normalisasi WA + mapping kolom
│   ├── session.js       # token sesi HMAC
│   ├── env.js           # whitelist env var
│   └── rate-limit.js    # rate limit login/AI/Fonnte/admin
├── scripts/build-*.mjs  # build pipeline (css, html, js)
├── scripts/dedupe-duplicates.mjs  # dedupe kandidat duplikat (dry-run / --apply)
├── e2e/*.mjs            # test end-to-end Playwright
└── serve-static.mjs     # preview server (port 3000, backend handler jalan in-process)
```

### Golden rule build

**Edit SOURCE → `bun run build` → restart preview → verifikasi.**

| Yang diubah                                                                                                               | Sumber                                                                                                                                            | Build wajib                                               | Artifact ter-generate                                               |
| ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------- |
| Logika frontend                                                                                                           | `js/*.js`, `api-client.js`, `i18n.js`, `pwa.js`                                                                                                   | `bun run build:js`                                        | `assets/app-<hash>.js` + ref di `index.html`/`admin.html` + `sw.js` |
| ESM core (`api-client.js`, `i18n.js`, `js/core/*`, `js/init/state.js`, `js/init/util.js`, `js/04_auth.js`, `js/engine/*`) | **export + alias `window.*`** (state mutable pakai accessor get/set; fungsi yang dipanggil HTML onclick wajib alias — lihat `ESM_BRIDGE.md` §3.2) | build otomatis di-strip export (IIFE per file) utk bundel | halaman standalone load via `<script type="module">`                |
| Modal                                                                                                                     | `partials/modals-shared.html`                                                                                                                     | `bun run build:html` (+ `build:css` kalau kelas baru)     | `assets/modals-shared.html`                                         |
| Styling                                                                                                                   | `src/main.css` + kelas Tailwind di HTML/JS                                                                                                        | `bun run build:css`                                       | `assets/main.css`                                                   |
| Backend                                                                                                                   | `netlify/functions/_lib/*.js`                                                                                                                     | **tidak perlu build**                                     | — (preview baca langsung, wajib **restart preview**)                |

> ⚠️ Jangan pernah edit `assets/*`, `sw.js`, atau wilayah `<!--SHARED_MODALS_START/END-->`
> di halaman secara manual — semua hasil build. Edit sumbernya, lalu build.
> `bun run build` = `build:css && build:html && build:js`.

---

## 3. Data model & konvensi WA (PALING PENTING) 🚨

Tabel utama di Supabase (`netlify/functions/_lib/supabase.js`):

| Tabel                       | Isi                                            | Kunci unik                                  |
| --------------------------- | ---------------------------------------------- | ------------------------------------------- |
| `database_asj_form`         | Lamaran = "mail inbox" (1 kandidat × code_job) | `(no_wa, code_job)` — di panel dedupe by WA |
| `database_candidate`        | Kandidat (biodata, status, folder)             | `no_wa` (1 baris per kandidat)              |
| `pemberkasan_checklist`     | Berkas upload per tahap                        | `(wa, tahap)`                               |
| `jobs` / `loker` / `lokers` | Lowongan                                       | `code_job`                                  |
| `master_database_candidate` | Master biodata / riwayat (CV)                  | per kandidat                                |

**Normalisasi WA — JANGAN PERNAH dilanggar:**

- `supabase.normalizeWa(v)` (di `supabase.js`): buang non-digit, `0xx…` → `62xx…`.
- Format baku tersimpan: **`628…`** (13 digit, awalan HP) — registrasi baru selalu disimpan format ini.
- **Gate login/daftar** (`isValidWaFormat` di `handlers.js` + `normalizeWaInput`/`isValidWaInput`
  di `js/04_auth.js`): hanya menerima `/^628\d{9,10}$/`. WA typo (mis. `6223…` vs `6282…`)
  **ditolak** — ini mencegah kandidat duplikat (kasus SATRIA, 2026-08-15).
- Jangan buat kandidat/lamaran dengan WA format bebas — selalu lewat normalisasi.

**Dedupe duplikat warisan** (`scripts/dedupe-duplicates.mjs`):

- `bun run dedupe` = dry-run (read-only, exit 1 kalau ada duplikat).
- `bun run dedupe:apply` = backup JSON penuh ke `.freebuff/dedupe-backup-<ts>.json`
  **sebelum** mutasi, lalu merge + hapus.
- Aturan merge: keeper by status (LULUS > GAGAL > REVIEW > UPDATE > MENUNGGU) →
  `updated_at` → id. `ai_data_json` **deep-merge semua snapshot (newest-wins per field)** —
  jangan pernah ganti dengan fill-if-empty dari 1 snapshot (data hilang!).
- Fuzzy merge: nama lengkap sama + jarak edit WA ≤ 2 → dianggap 1 kandidat.

---

## 4. Konvensi kode saat patch

**Frontend:**

- Panggilan backend: `callAPI('namaAction', [arg1, arg2])` (lihat `api-client.js`).
  Nama action = nama handler di backend. `callAPI`/`tr`/`LANG` adalah modul ESM
  - alias `window.*` — pemakai classic tetap pakai bare global; modul ESM baru
    pakai `import`. Kalau nambah file ESM: ikuti aturan di `ESM_BRIDGE.md` §5
    (export publik + alias window, referensi global → `window.*` eksplisit,
    scan `bunx eslint --rule 'no-undef: error' <file>`).
- i18n: semua teks UI lewat `tr('ui.key')` — key di `i18n.js` (`LANG.id` + `LANG.jp`).
  `tr()` sudah fallback ke `id` kalau key belum diterjemahkan. Key duplikat = error lint.
- Jangan menulis ulang async/await jadi callback `.then()`.
- Jangan sentuh `vite.config.ts`/HMR — project ini bukan Vite; preview = `serve-static.mjs`.

**Backend (`handlers.js`):**

- Tambah action baru = 1 fungsi `handleXxx(payload)` + daftarkan di switch `dispatchAction`.
- Action yang butuh rate limit: tambahkan ke `LOGIN_ACTIONS` / `AI_ACTIONS` / `FONNTE_ACTIONS`.
- Semua mutasi lewat `supabase.supabaseJson(...)` / helper di `supabase.js` — jangan fetch mentah.

**Modal:** semua modal di `partials/modals-shared.html` — edit SATU tempat, lalu `bun run build:html`.

---

## 5. Resep tugas umum

```bash
# Verifikasi syntax JS
node --check js/04_auth.js && node --check netlify/functions/_lib/handlers.js

# Verifikasi syntax file ESM (api-client.js, i18n.js, js/core/*):
node --check --input-type=module < api-client.js

# Audit global pollution & collision (setelah ubah deklarasi top-level):
node scripts/audit-globals.mjs --high

# Scan referensi global terlewat di file ESM (wajib 0 error):
bunx eslint --no-warn-ignored --rule 'no-undef: error' --rule 'no-unused-vars: off' api-client.js i18n.js js/core/bridge.js

# Build lengkap (setelah ubah frontend/partial/css)
bun run build

# Restart preview (wajib setelah ubah netlify/functions/_lib/*.js)
freebuff-preview restart

# Test backend action langsung (preview):
curl -s -X POST http://localhost:3000/.netlify/functions/app \
  -H 'Content-Type: application/json' \
  -d '{"action":"loginKandidat","payload":["6281234567890","1234"]}'

# E2E regresi (butuh preview jalan):
BASE_URL="http://localhost:3000" node e2e/upload-check.mjs
BASE_URL="http://localhost:3000" node e2e/biodata-check.mjs
BASE_URL="http://localhost:3000" node e2e/login-check.mjs

# Dedupe duplikat DB:
bun run dedupe            # dry-run
bun run dedupe:apply      # eksekusi (backup otomatis)
```

---

## 6. Aturan lock fitur kandidat (jangan longgarkan tanpa persetujuan pemilik) 🔒

> Dibuat atas permintaan pemilik (2026-08-16): "tulis biar setiap AI gak binggung".
> Setiap fitur/lock di bawah MEMILIKI SATU sumber kebenaran — jangan menambah
> varian normalisasi/lock baru di jalur lain; jangan longgarkan lock ini.

| Fitur                      | Entry point                                                                                 | Terbuka untuk                                                                                                                                                                  | Lock kalau                                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| **E-Sign & Data Naitei**   | `bukaModalTtd` (`js/12_esign_match.js`)                                                     | Admin ATAU kandidat yang **TAHAPAN-nya di loker sudah lolos/pemberkasan** (regex tahapan `LOLOS\|PEMBERKASAN\|MCU\|…\|TTD\|KONTRAK\|VISA\|…\|NAITEI` — sama persis situs lama) | Tahapan belum masuk daftar → toast `toast_naitei_locked`; **BUKAN** status lamaran `LULUS` di mail                 |
| **AI CV Master Assistant** | `bukaMasterEksternal` (`js/03_candidate.js`) + guard `verifikasiAksesAiCv` (`ai_form.html`) | Admin ATAU kandidat ber-tag **VIP/KELAS** (`isVipCatatan` di `js/03_candidate.js`, catatan internal `[VIP]`/`[KELAS …]`)                                                       | Non-VIP → toast `toast_ai_cv_locked`; keputusan final di server (`processAIChat`: `isAiCvAllowed` ATAU sesi admin) |
| **Latihan Interview**      | `bukaSimulatorInterview` (`js/ai_copilot/interview.js`)                                     | Admin ATAU kandidat ber-tag **VIP/KELAS** (`isVipCatatan`)                                                                                                                     | Non-VIP → toast `toast_feature_locked`                                                                             |

- **Normalisasi gender** hanya satu: `normalizeGender` di `netlify/functions/_lib/db/client.js`
  → kanonikal `LAKI-LAKI`/`PEREMPUAN` (konvensi situs lama). Render L/P di UI
  (mis. modal siswa baru) pakai nilai kanonikal itu — JANGAN bikin varian baru.

## 7. Checklist wajib sebelum selesai

1. ✅ `node --check` semua file JS yang diubah
2. ✅ `bun run build` kalau menyentuh frontend/partial/css
3. ✅ `freebuff-preview restart` + pastikan status `running/listening`
4. ✅ E2E regresi (upload + biodata) kalau menyentuh alur kandidat/upload
5. ✅ Update `PROGRESS.md` (header sesi: **tanggal + pengerja + hash commit** — lihat WORKFLOW.md §7.3)
6. ✅ Cek `git config user.name/email` benar sesuai pengerja (WORKFLOW.md §7.2)
7. ✅ `git add -A && git commit -m "pesan Indonesia, jelas" && git push origin main`8. ✅ Ingatkan user soal kebijakan deploy (lihat **DEPLOY.md**): Netlify **hanya**
   boleh di-deploy bila diizinkan eksplisit oleh pemilik — tanpa izin, jangan deploy

---

## 8. Larangan mutlak

- ❌ Edit `.env*` — minta user isi di Keys/API keys.
- ❌ Deploy ke Netlify **tanpa izin eksplisit pemilik** (aturan & riwayat izin di `DEPLOY.md`).
- ❌ Mengubah urutan/alur pipeline lapangan (lihat `PIPELINE.md`).
- ❌ Menghapus/menimpa data user yang sudah ada tanpa diminta.
- ❌ Edit hasil build (`assets/*`, `sw.js`, region `SHARED_MODALS`) dengan tangan.
- ❌ Membuat kandidat/lamaran dengan WA yang tidak lolos normalisasi/gate.
