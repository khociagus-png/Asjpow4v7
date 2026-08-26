# AGENTS.md — Panduan Cepat untuk AI/Agent & Anggota Tim

**Repo:** `khociagus-png/Asjpow4v7` · **Produk:** ASJ Portal — portal lowongan kerja
ke Jepang PT Amanah Sakura Japan (siswa ASJ daftar magang/kerja, isi biodata via
chat AI, upload berkas, admin kelola pipeline & pemberkasan).

---

## 📍 STATUS SEKARANG (baca ini dulu)

- **Live:** `asjportal.netlify.app` — bundle `app-7c598fcb55.js`
- **Status:** STABIL. Dev tooling baru ditambah (AI agent, bundle analyzer, E2E CI).
- **Known issues:** Sentry SDK = 688KB (perlu lazy load), 73 file pakai `@ts-nocheck`
- **Next:** Lazy load Sentry, hapus `@ts-nocheck` bertahap

**Aturan singkat:**

1. WA: selalu `628xxxxxxxxxxxx` (12-14 digit)
2. Upload: browser → Cloudinary → URL string
3. Modal: edit di `partials/modals-shared.html` saja
4. Build: `bun run build` setelah ubah JS/HTML/CSS
5. Deploy: JANGAN tanpa izin pemilik

---

## 1. Urutan dokumen (hanya jika butuh detail)

| Dokumen                                                                                        | Isi                                                                                     | Kapan dibaca                             |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------- |
| **MEMORY.md**                                                                                  | Detail history, decisions, known issues                                                 | Saat butuh konteks lengkap               |
| **AGENTS.md** (ini)                                                                            | Peta kode + konvensi                                                                    | Setiap sesi                              |
| **WORKFLOW.md**                                                                                | Aturan commit/push                                                                      | Setiap sesi                              |
| **WORKFLOW.md**                                                                                | Aturan kerja tim: commit/push, struktur, command, larangan deploy                       | Setiap sesi                              |
| **PIPELINE.md**                                                                                | Alur lapangan ASJ (JO → seleksi → lolos → pemberkasan) — **jangan mengubah pipeline**   | Sebelum menyentuh fitur tahapan kandidat |
| **REVIEW.md**                                                                                  | Audit keamanan & rekomendasi                                                            | Saat kerja di backend/keamanan           |
| **PROGRESS2.md / CHANGELOG2.md** (PROGRESS.md / CHANGELOG.md = legacy, ada pointer di atasnya) | Riwayat kerja & keputusan — **wajib ada header sesi: tanggal + pengerja + hash commit** | Saat butuh konteks perubahan lama        |
| **skills/SKILLS.md** (index) + `skills/<category>/<skill>/SKILL.md`                            | Agent skills library (dari davidondrej/skills) — **WAJIB per §10 untuk setiap task**    | Setiap sesi (§10 dispatch)               |
| **DEBUG-TODO.md**                                                                              | Checklist debug semua kode (92 parts) — **WAJIB update per §11 saat ada fitur baru**    | Setiap sesi debug + saat tambah fitur    |

> **Agent Skills (dari [davidondrej/skills](https://github.com/davidondrej/skills)):**
> Library instruksi terstruktur yang dimuat agent hanya saat task cocok.
> Lihat `skills/SKILLS.md` untuk daftar lengkap. Skills utama:
>
> - `before-building` — 🔥 Wajib sebelum bangun fitur: surface pilihan tersembunyi
> - `risky-changes` — ⚠️ Wajib sebelum ship perubahan risiko tinggi
> - `stop-overthinking` — Paksa keputusan praktis
> - `decisions` / `next-decision` — Review & drill keputusan
> - `effective-agent-skills` — 📘 Guide menulis SKILL.md yang efektif
> - `global-agent-guardrails` — Denylist shell command berbahaya (lihat `hooks/`)

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
├── hooks/               # dangerous-patterns.txt + deny-dangerous.sh (dari davidondrej/skills)
├── skills/              # Agent skills library (dari davidondrej/skills) — lihat skills/SKILLS.md
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
- Format baku tersimpan: **`628…`** (12-14 digit, awalan HP) — registrasi baru selalu disimpan format ini.
- **Gate login/daftar** (`isValidWaFormat` di `handlers.js` + `normalizeWaInput`/`isValidWaInput`
  di `js/04_auth.js`): hanya menerima `/^628\d{9,11}$/`. WA typo (mis. `6223…` vs `6282…`)
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

---

## 7. Performance Guidelines (Mandatory) ⚡

1. **Debounce Filter**: Semua input pencarian (seperti `search-kandidat`, `search-dbjob`) WAJIB menggunakan debounce minimal 250ms untuk menghindari UI _freeze_ saat mengetik.
2. **Infinite Scroll (Bukan Virtual Scroll murni)**: Render tabel besar (kandidat) dilimitasi (misal 25 baris awal), selanjutnya di-trigger via `IntersectionObserver` di akhir scroll untuk meniru infinite scroll yang ringan tanpa overhead manipulasi DOM berlebih.
3. **SessionStorage Cache (Bukan IndexedDB)**: Tarikan data utama (`getAppData`, `getCandidatesPage`) di-cache dalam memori tab (`sessionStorage`) dengan TTL ±5 menit. Mutasi (simpan/edit/delete) akan meng-invalidate cache ini. Hindari IndexedDB karena over-engineering untuk data relasional ini.

---

## 8. Checklist wajib sebelum selesai

0. ✅ Format & syntax dijaga otomatis: pre-commit hook `.githooks/` (aktif via `bun install` / `bun run hook:install`) + CI `ci-check.yml` di GitHub. Darurat: `git commit --no-verify`.
1. ✅ `node --check` semua file JS yang diubah
2. ✅ `bun run build` kalau menyentuh frontend/partial/css
3. ✅ `freebuff-preview restart` + pastikan status `running/listening`
4. ✅ E2E regresi (upload + biodata) kalau menyentuh alur kandidat/upload
5. ✅ Update `PROGRESS.md` (header sesi: **tanggal + pengerja + hash commit** — lihat WORKFLOW.md §7.3)
6. ✅ Cek `git config user.name/email` benar sesuai pengerja (WORKFLOW.md §7.2)
7. ✅ `git add -A && git commit -m "pesan Indonesia, jelas" && git push origin main`
8. ✅ Ingatkan user soal kebijakan deploy (lihat **DEPLOY.md**): Netlify **hanya**
   boleh di-deploy bila diizinkan eksplisit oleh pemilik — tanpa izin, jangan deploy

---

## 9. Larangan mutlak

- ❌ Edit `.env*` — minta user isi di Keys/API keys.
- ❌ Deploy ke Netlify **tanpa izin eksplisit pemilik** (aturan & riwayat izin di `DEPLOY.md`).
- ❌ Mengubah urutan/alur pipeline lapangan (lihat `PIPELINE.md`).
- ❌ Menghapus/menimpa data user yang sudah ada tanpa diminta.
- ❌ Edit hasil build (`assets/*`, `sw.js`, region `SHARED_MODALS`) dengan tangan.
- ❌ Membuat kandidat/lamaran dengan WA yang tidak lolos normalisasi/gate.
- ❌ Copy-paste skill dari external repo tanpa audit isi `scripts/` dan `references/` — skill bisa executed arbitrary code.
- ❌ **Menambah fitur baru TANPA update DEBUG-TODO.md & test** (lihat §11) — fitur tanpa debug trail = tech debt permanen.

---

## 10. Mandatory Skill Dispatch — DISIPLIN WAJIB SETIAP TASK 🧠

> **ATURAN INTI:** Setiap kali menerima prompt dari user (apapun isinya), AGENT WAJIB
> memuat dan menjalankan skill yang sesuai **SEBELUM mulai coding/fix/research**.
> Tidak ada exception. Skill = otak, coding = tangan. Otak duluan, tangan belakangan.

### 10.1 Dispatch Table — Skill Wajib per Tipe Task

| Tipe Task                           | Skill WAJIB (wajib dibaca sebelum coding)                  | Skill OPSIONAL (jika relevan) |
| ----------------------------------- | ---------------------------------------------------------- | ----------------------------- |
| **Bangun fitur baru**               | 🔥 `before-building` → `stop-overthinking`                 | `decisions`, `next-decision`  |
| **Revisi / Edit kode**              | `stop-overthinking` → `risky-changes` (jika risiko tinggi) | `decisions`                   |
| **Debug / Fix bug**                 | `risky-changes` → `stop-overthinking`                      | `decisions`                   |
| **Refactor**                        | `risky-changes` → `stop-overthinking`                      | `decisions`, `next-decision`  |
| **Optimasi performa**               | `risky-changes` → `stop-overthinking`                      | `decisions`                   |
| **Security / Auth**                 | 🔥 `risky-changes` (WAJIB) → `before-building`             | `decisions`                   |
| **UI / Responsive**                 | `before-building` → `stop-overthinking`                    | —                             |
| **Backend action baru**             | `before-building` → `risky-changes`                        | `decisions`                   |
| **Database schema change**          | 🔥 `risky-changes` (WAJIB) → `before-building`             | `decisions`                   |
| **Deploy**                          | 🔥 `risky-changes` (WAJIB)                                 | —                             |
| **Research / Arsitektur**           | `advise-project-approach` → `research-prompt`              | `neuroarxiv`                  |
| **Multi-step complex task**         | `before-building` → `decisions` → `next-decision`          | `stop-overthinking`           |
| **User bilang "lanjut"/"continue"** | `stop-overthinking` (cek progress, lanjut dari mana)       | —                             |
| **User bilang "review"/"audit"**    | `risky-changes` → `decisions`                              | `before-building`             |

### 10.2 Skill Execution Flow (WAJIB DIIKUTI)

```
1. BACA prompt user
2. IDENTIFIKASI tipe task (pakai tabel §10.1)
3. LOAD skill wajib dari skills/<category>/<skill>/SKILL.md
4. JALANKAN instruksi skill (surface choices, validate assumptions, dll)
5. PRESENT opsi/keputusan ke user (jika skill mensyaratkan)
6. TUNGGU keputusan user (jika ada pilihan)
7. BARU mulai coding/fix/research
8. SEBELUM commit: jalankan risky-changes jika perubahan signifikan
9. SEBELUM push: verifikasi (syntax, build, test)
```

### 10.3 Skill-Specific Rules

**`before-building`** — MUNCULKAN hidden choices dalam 1-3 detik:

- ❌ JANGAN langsung coding tanpa surface choices
- ✅ 1-3 consequential choices + rekomendasi → STOP → tunggu user
- ✅ Skip minor choices, fokus yang besar (scope, risk, approach)

**`risky-changes`** — VALIDATE sebelum ship:

- ❌ JANGAN ship tanpa naming assumptions explicitly
- ❌ JANGAN bilang "unit tests pass" sebagai bukti aman
- ✅ Write assumptions → research → live measurement → sign-off → verify after
- ✅ Jika tidak ada data live, bilang jujur: "belum terverifikasi di data production"

**`stop-overthinking`** — PRAKTIS, cepat:

- ❌ JANGAN analisis berlebihan
- ✅ Critical issues? Sebutkan. Tidak ada? Proceed.
- ✅ Next steps yang jelas, singkat

**`decisions` / `next-decision`** — REKAM keputusan:

- ❌ JANGAN list decisions yang sudah jelas terbaik
- ✅ Hanya decisions yang BENAR-BENAR tidak yakin
- ✅ next-decision: satu per satu, 4 opsi, rekomendasi, tunggu user

### 10.4 Discipline Enforcement

- **Setiap response** harusmulai dengan identifikasi skill yang dipakai (contoh: "🔥 Loading `before-building`...")
- **Jika skip skill** wajib jelaskan kenapa (contoh: "Skip `risky-changes` — perubahan 1 baris, risiko nol")
- **Jika user minta "lanjut"** → baca TODO.md/PROGRESS.md, identifikasi posisi, jalankan skill sesuai tipe task berikutnya
- **Jika ragu** → default ke `risky-changes` (lebih baik over-verify daripada under-verify)

### 10.5 Quick Reference: Skill Files

```
skills/
├── thinking-and-docs/
│   ├── before-building/SKILL.md     🔥 Fitur baru
│   ├── stop-overthinking/SKILL.md   ⚡ Praktis
│   ├── decisions/SKILL.md           📊 Review decisions
│   ├── next-decision/SKILL.md       🔍 Drill decisions
│   └── ask-then-build/SKILL.md      ❓ Scope → build
├── ops-and-setup/
│   ├── risky-changes/SKILL.md       ⚠️ Ship validation
│   └── global-agent-guardrails/     🚫 Shell denylist
└── advice/
    └── advise-project-approach/     🔥 Research & advise
```

---

## 11. Fitur Baru → Debug & Test Rule 📋

> **ATURAN INTI:** Setiap kali menambah fitur baru (atau mengubah fitur signifikan),
> AGENT WAJIB memperbarui `DEBUG-TODO.md` DAN menambah test sesuai standar project.
> Tidak ada fitur baru tanpa dokumentasi debug & test — ini mencegah regressi dan
> menghindari pengulangan kerja di sesi berikutnya.

### 11.1 Checklist Wajib Saat Tambah Fitur Baru

```
SEBELUM mulai coding:
1. Baca §10 (Mandatory Skill Dispatch) → load skill yang sesuai
2. Baca DEBUG-TODO.md → identifikasi domain mana yang terpengaruh

SETELAH coding & sebelum commit:
3. ✅ Update DEBUG-TODO.md → tambah item debug untuk fitur baru
4. ✅ Tambah unit test (minimal happy path + 1 edge case)
5. ✅ Tambah i18n keys kalau ada teks UI baru (lihat §4)
6. ✅ Jalankan `bun run test` → pastikan semua pass
7. ✅ Jalankan `node --check` pada semua file JS yang diubah
8. ✅ Jalankan `bun run check:handlers` kalau ada action baru
9. ✅ Jalankan `bun run check:i18n` kalau ada teks baru
10. ✅ Update PROGRESS.md (header sesi: tanggal + pengerja + hash)
```

### 11.2 Format Update DEBUG-TODO.md

Saat menambah fitur baru, tambah item di domain yang sesuai dengan format:

```markdown
### X1. `nama-file.js` — Deskripsi Fitur

- [ ] Happy path: pastikan [fungsi inti] berfungsi
- [ ] Edge case: pastikan [error scenario] di-handle
- [ ] Guard: pastikan [auth/validation] berfungsi
- [ ] i18n: pastikan semua teks UI lewat `tr()`
- [ ] Integration: pastikan [action backend] terdaftar + rate limit benar
```

**Contoh — Fitur baru "Export PDF":**

```markdown
### D11. `js/pdf-export.js` — Export PDF Kandidat

- [ ] `exportPdf()`: pastikan generate PDF benar
- [ ] `exportPdf()`: pastikan data kandidat lengkap
- [ ] Guard: pastikan admin session valid
- [ ] i18n: judul PDF, nama kolom lewat `tr()`
- [ ] Rate limit: pastikan tidak ada abuse (opsional)
```

### 11.3 Test Standards per Tipe Fitur

| Tipe Fitur              | Unit Test Wajib                                | E2E Test (jika applicable)          |
| ----------------------- | ---------------------------------------------- | ----------------------------------- |
| **Backend action baru** | Happy path + invalid payload + unauthorized    | `e2e/` flow yang menggunakan action |
| **Frontend component**  | Render benar + edge case (null, empty)         | Visual check di preview             |
| **Auth/Security**       | Valid token + invalid token + expired          | Login/logout flow                   |
| **Upload/File**         | File valid + file terlalu besar + type salah   | Upload flow                         |
| **AI/Chat**             | Prompt valid + response malformed + rate limit | AI chat flow                        |
| **i18n**                | Semua new keys ada di `LANG.id` + `LANG.jp`    | —                                   |

### 11.4 Debug Session Protocol

Saat mulai sesi debug (atau sesi kerja baru):

```
1. Baca AGENTS.md §10 → identifikasi tipe task
2. Baca DEBUG-TODO.md → cari part yang belum ✅
3. Ambil 1-2 part → kerjakan → centang ✅
4. Update header log sesi di DEBUG-TODO.md
5. Commit + push
6. Sesi berikutnya: lanjut dari part berikutnya
```

### 11.5 Anti-Regressi Rules

- ❌ **JANGAN** hapus item debug dari DEBUG-TODO.md (meskipun sudah ✅) — histori penting
- ❌ **JANGAN** skip test karena "sudah test manual" — automated test = safety net
- ❌ **JANGAN** commit fitur baru tanpa update DEBUG-TODO.md
- ✅ **WAJIB** update DEBUG-TODO.md SEBELUM commit (bukan sesudah)
- ✅ **WAJIB** test pass SEBELUM push (bukan sesudah)
- ✅ **WAJIB** i18n keys lengkap SEBELUM push

### 11.6 Quick Reference

```
Fitur baru → SKILL (§10) → CODE → DEBUG-TODO (§11.2) → TEST (§11.3) → i18n → BUILD → COMMIT → PUSH
                                                                                      ↑
                                                                              JANGAN skip step ini
```

---

## 12. Panduan Prompting AI untuk Coding yang Efektif 📝

> Agar AI menghasilkan kode yang akurat, aman, dan berstandar industri,
> diperlukan instruksi yang terstruktur. Bagian ini berisi panduan + template
> yang bisa langsung digunakan untuk project ASJ Portal.

### 12.1 Struktur Prompt yang Efektif (4 Elemen)

| #   | Elemen               | Penjelasan                                                      | Contoh untuk ASJ Portal                                                                          |
| --- | -------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 1   | **Peran (Role)**     | Identitas spesifik AI → gaya & kualitas kode lebih profesional  | "Bertindaklah sebagai Senior Fullstack Engineer untuk portal lowongan kerja"                     |
| 2   | **Tech Stack**       | Bahasa, framework, versi spesifik → mencegah sintaks deprecated | "Vanilla JS (ESM), Node.js backend, Supabase DB, Tailwind CSS v4, Netlify Functions"             |
| 3   | **Konteks & Tujuan** | Fitur spesifik + alur kerja fungsional                          | "Buat action backend baru untuk export kandidat ke PDF dengan filter tahapan"                    |
| 4   | **Aturan & Batasan** | Best practices yang WAJIB dipatuhi                              | "Semua teks lewat tr(), WA harus normalize 628xxx, rate limit sesuai §7, jangan sentuh pipeline" |

### 12.2 Template Prompt — Copy & Paste

```text
Bertindaklah sebagai Senior Fullstack Engineer untuk ASJ Portal
(portal lowongan kerja ke Jepang PT Amanah Sakura Japan).

**Tugas Utama:**
Tolong buatkan [jelaskan tugas spesifik, misal:
  "action backend baru handleExportPdf untuk export kandidat ke PDF"].

**Tech Stack:**
- Frontend: Vanilla JS (ESM), Tailwind CSS v4, i18n (tr())
- Backend: Node.js, Netlify Functions, Supabase REST API
- Database: Supabase (tabel: database_candidate, database_asj_form, jobs)
- Auth: HMAC-SHA256 session token (lihat session.js)
- Build: esbuild bundler, Tailwind CLI

**Aturan & Batasan (WAJIB):**
1. Ikuti AGENTS.md §4 (konvensi kode): callAPI() untuk backend, tr() untuk i18n
2. Semua teks UI lewat tr('ui.key') — lihat i18n.js
3. WA format: selalu 628xxxxxxxxxx (13 digit) — lihat §3 normalisasi WA
4. Backend: tambah action di action-registry.js + register rate limit
5. Frontend: registerSeamAliases() kalau ada fungsi baru yang dipanggil HTML
6. Jangan sentuh: pipeline (PIPELINE.md), .env, deploy tanpa izin
7. Error handling: wajib try-catch + user-facing toast message
8. Performance: debounce 250ms untuk filter, sessionStorage cache untuk reads
9. Security: admin guard (session verify), rate limit, input validation
10. Update DEBUG-TODO.md (§11) + tambah test sebelum commit

**Format Output:**
1. Kode lengkap (bukan snippet) dengan komentar pada logika kompleks
2. Penjelasan singkat apa yang dilakukan
3. File mana yang perlu diubah + bagian mana yang perlu ditambah
4. Test case minimal (happy path + 1 edge case)
5. i18n keys yang perlu ditambah (kalau ada teks UI baru)
```

### 12.3 Prompt per Tipe Task (Contoh Siap Pakai)

**Fitur Backend Baru:**

```text
Buat action backend baru: handleExportKandidatPdf.
- File: netlify/functions/_lib/actions-candidate.js
- Register: action-registry.js + handleGetMonthlyReport pattern
- Input: payload = [filter tahapan, filter job]
- Output: binary PDF (Content-Type: application/pdf)
- Guard: admin session required (lihat handleGetMonthlyReport)
- Rate limit: tambah ke adminCrud group
- Test: happy path + invalid filter + unauthorized
```

**Fitur Frontend Baru:**

```text
Buat tombol "Export PDF" di admin panel pelamar.
- File: js/render/candidate.js (tambah tombol di renderKandidatHead)
- Action: callAPI('handleExportKandidatPdf', [filter])
- UI: tombol biru di samping "Export CSV" yang sudah ada
- Loading state: tampilkan spinner saat download berlangsung
- Download: buat <a download> dari blob URL
- i18n: tambah key admin.export_pdf + admin.export_pdf_loading
- Guard: hanya muncul untuk admin (lihat admin.html pattern)
```

**Debug / Fix Bug:**

```text
Bug: filter kandidat tidak merespon setelah ketik 3+ karakter.
- File: js/render/candidate.js → filterKandidat()
- Symptom: UI freeze 500ms saat keystroke cepat
- Current: debounce 250ms sudah ada, tapi ensureAllCandidates() dipanggil ulang
- Expected: debounce apply, ensureAllCandidates() hanya 1x saat data belum loaded
- Test: buka admin panel → ketik cepat di search → tidak boleh freeze
```

**Refactor:**

```text
Refactor: pindahkan fungsi renderKandidatTable ke file terpisah.
- File sumber: js/render/candidate.js (930 baris, terlalu besar)
- File tujuan: js/render/candidate-table.js (export renderKandidatTable)
- Bridge: registerSeamAliases({ renderKandidatTable })
- Import: import di js/render/candidate.js
- Test: pastikan admin panel tetap render tabel benar
- i18n: tidak berubah (sudah pakai tr())
```

### 12.4 Anti-Pattern yang Harus Dihindari

| ❌ Jangan                             | ✅ Seharusnya                                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------------- |
| "Buatkan fitur login" (terlalu vague) | "Buat action loginKandidat yang validasi WA 628xxx + PIN, return session token HMAC"  |
| "Fix semua bug" (terlalu luas)        | "Fix bug di filterKandidat: debounce tidak apply setelah 3 karakter"                  |
| "Optimize performa" (tidak spesifik)  | "Optimize renderKandidatTable: ganti string concat jadi Array.join(), limit 50 baris" |
| "Tambah test" (tanpa konteks)         | "Tambah unit test untuk uploadToCloudinary: timeout 30s + retry 3x + abort error"     |
| "Deploy ke production" (tanpa izin)   | Tidak boleh tanpa izin eksplisit pemilik (lihat §9)                                   |

### 12.5 Checklist Prompt Sebelum Kirim ke AI

```
□ Apakah role sudah spesifik? (Senior Frontend/Backend Engineer)
□ Apakah tech stack sudah disebutkan? (JS ESM, Supabase, Netlify)
□ Apakah file target sudah disebutkan? (nama file + lokasi)
□ Apakah constraints sudah ada? (AGENTS.md §3-§9)
□ Apakah format output sudah jelas? (kode + test + i18n)
□ Apakah ada referensi ke code yang sudah ada? (pattern yang sudah dipakai)
```
