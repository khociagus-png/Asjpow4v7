# REFACTOR_TODO.md — Rencana Modularisasi ASJ Portal

> **Tujuan:** bikin seluruh kode **modular** supaya gampang di-patch, di-test, dan
> dirawat — tanpa mengubah perilaku aplikasi maupun pipeline lapangan (`PIPELINE.md`).
>
> **Aturan main setiap langkah:**
> 1. Satu langkah = satu commit, pesan mengikuti `WORKFLOW.md` §7.
> 2. Sebelum & sesudah tiap langkah: `node --check` file JS yang diubah → `bun run build`
>    → `bun run lint` → `bun run test` → E2E regresi (`e2e/*.mjs`) → restart preview.
> 3. **Jangan mengubah perilaku** — refactor murni (pindah/pecah kode, bukan ubah logika).
> 4. **Jangan edit hasil build** (`assets/*`, `sw.js`, region `SHARED_MODALS`) dengan
>    tangan — selalu edit sumber lalu `bun run build`.
> 5. Jangan ubah alur pipeline lapangan (JO → seleksi → lolos → pemberkasan).
> 6. Saat verifikasi di browser: **hard refresh** sekali (SW cache versi lama).
> 7. Halaman standalone (`apply-full`, `master-full`, `ai_form`, `share`, `siswa-baru`)
>    memuat `api-client.js`/`i18n.js`/`pwa.js` **langsung** (bukan lewat bundel) — setiap
>    langkah harus menjaga halaman ini tetap jalan.

---

## 📍 Kondisi aktual (baseline 2026-08-16)

| Wilayah | File | Ukuran | Catatan |
| --- | --- | --- | --- |
| Frontend (classic scripts) | 21 file `js/*.js` + `api-client.js` + `i18n.js` + `pwa.js` | **±11.4k baris** | Di-concat + minify jadi 1 bundel `assets/app-<hash>.js` (421 KB) — TANPA batas modul |
| Frontend terbesar | `js/07_api.js` 1696 · `js/05_render.js` 1371 · `i18n.js` 2631 | — | Callback & render campur jadi satu |
| Backend | `handlers.js` 1792 · `actions-extra.js` 2549 · `actions-ai.js` 1193 · `supabase.js` 1073 | **±7.5k baris** | Dispatcher `handleAction` → switch `dispatchAction` masih gemuk |
| HTML | 7 halaman ±6.5k baris | `index.html` 1328 · `admin.html` 1200 · `ai_form.html` 1158 | Modal sudah di-partial; header/footer/style inline belum |
| i18n | `i18n.js` 2631 baris (LANG.id + LANG.jp) | 125 KB | 1 file untuk semua domain & 2 bahasa |

**Masalah inti:** semua fungsi frontend saling panggil lewat **global scope** (tidak ada
import/export eksplisit) → mem-patch satu fitur bisa menyentuh file lain tanpa terdeteksi;
`actions-extra.js` 2.5k baris menampung banyak domain sekaligus; i18n 1 file raksasa.

---

## ✅ FASE 0 — Fondasi pengukuran (baseline) — SELESAI 2026-08-16

- [x] Jalankan semua check di repo bersih: `bun run lint` (0 error/12 warn), `bun run test` (51/51), `bun run build` (idempotent, `app-d80b6b5088.js` 411 KB), E2E read-only (login/share/modal/probe semua lulus) — tercatat di `PROGRESS.md` (sesi 2026-08-16 agus khoci).
- [x] Catat ukuran bundel & hash: `assets/app-d80b6b5088.js` (411.1 KB, 21 file, hash `d80b6b5088`) — pembanding tiap fase.
- [x] Buat `scripts/module-map.mjs` — audit dependensi global frontend (22 file, 353 simbol) + backend (9 → 11 → **13 file, 204 simbol** setelah Fase 1.1a+1.1b). Baseline JSON di `.freebuff/module-map-frontend.json` & `.freebuff/module-map-backend.json`.
- [x] `git config user.name/email` benar: `agus khoci` / `316617518+khociagus-png@users.noreply.github.com`.

**Temuan baseline (untuk fase berikutnya):**
- Kontrak global frontend yang wajib di-export saat ESM: `safeSet`, `normalizePhone`, `trOption`, `trOptionId`, `renderAdminFull`, `bukaDigitalCV`, `adminSwitchTab`.
- Dead code terkonfirmasi: `callNetlify`, `getApiUrl` (api-client.js, warisan GAS).
- `partials/modals-shared.html` adalah caller HTML terbesar (onclick handler modal) — jangan lupa di-scan tiap audit.
- E2E yang menulis data (upload/biodata/photo) belum dijalankan di baseline — jalankan saat fase menyentuh alur itu.

---

## ✅ FASE 1 — Backend modular (nilai tinggi, risiko rendah) 🔧

Backend sudah berarsitektur ok (`_lib/*`), tinggal dipecah lebih tajam. Semua fungsi murni → mudah di-test.

### 1.1 Pecah `handlers.js` (1.792 → ±1.230 baris setelah langkah pertama)
- [x] **DONE (2026-08-16, digabung dengan optimasi performa):** blok data publik
      (`handleGetAppData` + DROPDOWN_MAP/parseConfigList/stripRaw/loadSchedules/
      loadTugas/loadWaTemplates/dedupeKandidatRaw/saringKandidatUnik/loadCandidatesUnik)
      → **`_lib/actions-public.js`** (query publik paralel + TTL cache 20 dtk via
      `_lib/cache.js` baru). `handlers.js` −573 baris; `stripRaw`/`loadCandidatesUnik`
      di-import balik. Terukur: publik 1.518 → 937 ms cold / **0 ms warm**; 51/51 test,
      E2E lulus. Detail: `PROGRESS.md` sesi 2026-08-16.
- [x] **DONE (2026-08-16):** kluster auth + WA gate (`masterPins`, `requireAdmin`, `isValidWaFormat`, `handleCheckAdminMaster/Personal`, `handleLoginKandidat`, `handleDaftarKandidat`, `handleGantiPasswordKandidat`) → **`_lib/actions-auth.js`**; `findCandidateByWa`/`CAND_WA_COLS` → **`_lib/candidate-helpers.js`** (dipakai lintas domain). Test 51/51, smoke auth OK, E2E login lulus.
- [x] **DONE (2026-08-16):** handler mail/form (`handleFormStatus`, `syncCandidateDariForm`, review/approve/reject/delete/tandai dibaca) → **`_lib/actions-mail.js`**; handler kandidat (`updateCatatanKandidat`, `updateKandidatSuper`, `getCandidatesPage`) → **`_lib/actions-candidate.js`**; handler job/loker (simpan/edit/status/hapus/tahapan/dokumen/tandai gagal) → **`_lib/actions-job.js`**. `handlers.js` kini **629 baris** (dari 1.792). Test 51/51, smoke wiring OK, E2E login + backend-fast-path SEMUA LULUS.
- [ ] Pindahkan handler upload/pemberkasan → `_lib/actions-upload.js`.
- [x] **SELESAI (2026-08-16)** — `handlers.js` kini **343 baris** = dispatcher + core
      murni (handleAction, rateLimitChecks, sessionIdentity, NOT_IMPLEMENTED,
      sets LOGIN/AI/FONNTE). `handleShareData`/`docTypeOf`/`docAge` →
      **`_lib/actions-share.js`** (share-data.js & serve-static.mjs kompat via
      re-export); `handleGetAppConfig` → **`_lib/actions-diagnostics.js`**.
      Test 51/51, smoke share-data (TG591ASJ → 20 kandidat) + getAppConfig OK,
      E2E login + share-view SEMUA LULUS. Target ≤300 baris hampir tercapai
      (343 — sisa bisa dirapikan kapan saja, opsional).
- [ ] Pastikan semua modul memakai `supabase.*` helper (bukan fetch mentah).

### 1.2 Pecah `actions-extra.js` (2549 baris) — **SELESAI** (file dihapus)
- [x] **`actions-schedule.js` baru (165 baris)** — jadwal `database_schedule` + tugas `database_tugas` (5 handler) dipindah dari `actions-extra.js`; `requireRole` dipusatkan di `actions-auth.js`. `actions-extra.js` 2549 → **2370 baris**, cross-file calls 33 → 28. Dispatcher `handlers.js` kini route ke `schedule.*`. Verifikasi: test 51/51, E2E login SEMUA LULUS, backend **19 file / 204 simbol**. Commit: `aec1e9f`.
- [x] **`actions-wa.js` + `actions-config.js` baru** — WA/Fonnte (4 handler + `fonnteSend`) dan config (sys_config + rincian_presets, 4 handler + `CONFIG_TYPE_MAP`) dipindah dari `actions-extra.js`. `actions-extra.js` 2370 → **2100 baris**, cross-file calls 28 → 20. Dispatcher route ke `wa.*`/`config.*`. Verifikasi: test 51/51, smoke guard admin 7 action + getRincianPresets (4 kategori), E2E login SEMUA LULUS, backend **21 file / 204 simbol**. Commit: `c611a60`.
- [x] **`actions-register.js` baru** — siswa baru `respon_siswa_baru` (get publik + submit) + link & bridge form (siswa-baru/apply-full/master-full/ai_form, `siteBase`). Dipindah dari `actions-extra.js`. `actions-extra.js` 2100 → **1956 baris**, cross-file calls 20 → 14. Verifikasi: test 51/51, smoke getDaftarSiswaBaru (3 baris) + getLinkSiswaBaru + generateFormBridge + getAppData OK, E2E login SEMUA LULUS, backend **22 file / 204 simbol**. Commit: `b5073d7`.
- [x] **`actions-master.js` baru** — master biodata/CV (`master_database_candidate`): `MASTER_FILE_COLUMNS`/`MASTER_COLUMN_MAP`/`SNAKE_TO_CAMEL`/`cleanKey`/`entryHasAny`/`mergeRiwayatArrays`/`buildMasterNested`/`findMasterByWa` + 4 handler (getMasterDataByWa, getDrafCvMaster, submitMasterForm, simpanUpdateMaster). Diekstrak byte-identik via Node. `isOwnerOrAdmin` (PII guard REVIEW M2) dipusatkan ke `actions-auth.js`. `actions-extra.js` 1956 → **±1560 baris**, cross-file 14 → 12. Verifikasi: test 51/51, smoke getDrafCvMaster (limited utk non-owner) + getMasterDataByWa (token invalid ditolak) + getAppData OK, E2E login SEMUA LULUS, backend **23 file / 204 simbol**. Commit: `adadb30`.
- [x] **langkah 5 (terakhir): `storage.js` + `actions-upload.js` + `actions-drive.js` baru — `actions-extra.js` DIHAPUS** 🎉. `_lib/storage.js` (166 baris) = helper Supabase Storage murni (`bucket`/`storageRequest`/`publicUrl`/`b64ToBuffer`/`mimeFromName`/`stemAliases`/`isVarianOf`/`hapusJenisVarian`/`uploadBase64`). `actions-upload.js` (725 baris) = inti upload/apply: getUploadUrls, cekDataPelamar, isJobRequiresCv, submitApply, getExistingCandidateJsonByWa, simpanKandidatDanUpload, simpanBerkasTahapan, simpanRevisiKandidat + `FILE_LABEL_COLUMNS`/`fileLabelKey` + `PUBLIC_PREFILL_FIELDS`/`pickPrefill` (PII REVIEW M2). `actions-drive.js` (105 baris) = getDriveLinkCandidates + uploadDriveReplacement + runMigration. Body fungsi dipindah **byte-identik** via Node (skrip di `.freebuff/`, aset + assertion batas). `nextCandidateId` dipusatkan di `candidate-helpers.js` (dulu 3 salinan: extra/mail/master); blok mail-sync (`MAIL_PENDING_STATUS`/`mailStatusUntukUpdate`/`appendFeedback`/`syncBiodataKeMail`/`syncFormMailDariUpload`) pindah ke `actions-mail.js` (domain mail). Test lama di-rename `actions-extra.test.js` → `storage.test.js`.
- [x] **BUG FIX (bukan refactor) — ketahuan oleh E2E `upload-check`**: sejak langkah 4 (`adadb30`), `actions-master.js` TIDAK mengexport `findMasterByWa` → semua pemakainya (`simpanBerkasTahapan`, `submitApply`, `simpanRevisiKandidat`, `uploadDriveReplacement`) dapat `undefined` dan gagal diam-diam. Ditambah 2 bug senyap lain dari ekstraksi master: `syncBiodataKeMail` + `nextCandidateId` dipakai tanpa import (ReferenceError ditelan `try/catch`). Ketiganya diperbaiki di langkah ini.
- [x] Ekspor per fitur (bukan satu objek raksasa) supaya dispatcher hanya impor yang dipakai.

### 1.3 Pecah `supabase.js` (1073 baris) → client + repositori — **SELESAI**
- [x] `_lib/db/client.js` (13 export) — fondasi: `supabaseUrl`/`supabaseKey`/`hasBackend`/`supabaseJson`/`findTable`/`pick`/`toText`/`normalizeWa`/`normalizeStatus`/`normalizeGender` + skema (`getSchema`/`tablesFromSchema`/`columnsFromSchema`).
- [x] `_lib/db/candidates.js` (10 export) — `mapCandidate`, `findCandidates`, `findAllCandidatesLight`, `findCandidatesByIds`, `findCandidateByWaFiltered`/`findCandidateByIdFiltered`/`findCandidatesByJobFiltered`, `maxCandidateIdNumber`, `attachApplications`.
- [x] `_lib/db/jobs.js` (5 export) — `mapJob`, `findJobs`, `findJobByCodeFiltered`, `maxJobCodeNumber`, `countCandidatesForJob`.
- [x] `_lib/db/forms.js` (7 export) — `mapForm`, `parseDocs`, `findForms`, `findFormsLight`, `findFormsByWa`, `findFormByIndexFiltered`, `findFormsByWaList`.
- [x] `_lib/db/berkas.js` — `pemberkasan_checklist` + `attachBerkasBio` (berkas+bio kandidat) + `listStorageFolder` (Storage). `fetchBerkasByWa` tetap internal (tanpa export tambahan — kontrak 44 export PERSIS).
- [x] `_lib/db/master.js` — `fetchMasterByWa`/`fetchMasterLightByWa` (`master_database_candidate`).
- [x] `_lib/db/misc.js` (6 export) — `queryPaged`, `findAdmins`, `findSettings`, `findAnnouncements`, `findAssets`, `findPengumuman`.
- [x] `supabase.js` lama → **re-export agregat** (spread 7 modul db) — semua 18 pemakai (actions-*, storage.js, e2e) jalan tanpa perubahan. Ekstraksi **byte-identik** via skrip Node (`.freebuff/split-supabase.mjs`, bracket-matched + assertion baris). `scripts/module-map.mjs` diperluas agar memindai `_lib` rekursif (db/ ikut terhitung: 25 → **32 file / 204 simbol** — total simbol TIDAK berubah).
- [x] **Langkah lanjutan SELESAI (commit `1893d9c`)** — migrasi SEMUA pemakai → import `db/*` langsung: 17 file `_lib` (actions-*, candidate-helpers, storage) + 2 e2e + 6 scripts (dedupe, sync-idloker, audit-pasphoto, cleanup-job-misc, migrate-filecv-drive, scan-orphan-files). Agregat `supabase.js` **DIHAPUS** — file tidak ada lagi (backend 32 → **31 file / 204 simbol**). Dedupe dry-run tetap jalan (0 duplikat). Catatan: `dedupe-duplicates.mjs` pakai alias `normalizeWa: normWa` karena punya wrapper lokal sendiri. 🐛 Bonus fix: deklarasi ganda `findCandidateByWaFiltered` di `db/candidates.js` (parsing error lint) dihapus.

### 1.4 AI (1193 baris) — **SELESAI** (commit `76de288`)
- [x] `actions-ai.js` (1194 baris) **DIHAPUS** → pecah 4 modul `_lib/ai/*`:
      **`providers.js`** (lapisan Gemini: geminiGenerate, geminiParseFile, parseJsonLoose,
      fallback model flash-latest → 3.5 → 2.5) · **`cv.js`** (master/CV auto-fill:
      buildMasterNested, buildRingkasData, findMasterByWa + APPLY_WA_COLS, konteks admin
      copilot, submitDataAsj, simpanDataTtdNaitei) · **`chat.js`** (Qween Jeklin chat
      kandidat + Jeklin copilot admin + Dede Jeklin siswa baru + klaster wawancara SSW:
      BIDANG_INTERVIEW/normalizeBidang/resolveProfilKandidat/buildInterviewSystem + 5
      handler wawancara) · **`classify.js`** (parse dokumen biodata admin: PARSE_MAX_BYTES/
      PARSE_ALLOWED_MIME/PARSE_SYSTEM_PROMPT + handleParseDokumenBiodata). Body fungsi
      dipindah **byte-identik** (verifikasi per-deklarasi via skrip Node); `requireRole`
      kini import dari `actions-auth` (salinan lokal dihapus — dipusatkan). `handlers.js`
      route ke `aiChat/aiCv/aiClassify`; `storage.test.js` import `buildRingkasData` dari
      `ai/cv`. Backend 31 → **34 file / 204 simbol** (total tidak berubah). Verifikasi:
      node --check ✓ · lint 0 error/12 warn ✓ · test 51/51 ✓ · smoke guard admin/kandidat
      + fallback AI (tanpa key) ✓.

### 1.5 Test backend per modul — **SELESAI** (commit `557c869`) — test 51 → **81/81**
- [x] `db/client.test.js` (12) — normalisasi WA (0xx→62xx, buang non-digit,
      format baku 628…), normalizeStatus (OPEN/CLOSE/URGENT), normalizeGender.
- [x] `actions-auth.test.js` (6) — gate WA login/daftar (`isValidWaFormat`):
      terima 628+9/10 digit, tolak 6223… (kasus SATRIA), terlalu pendek/
      panjang, non-digit.
- [x] `ai/chat.test.js` (3) — `normalizeBidang`: 7 bidang SSW + sinonim
      ID/EN, tidak dikenal → null (caller pakai BIDANG_DEFAULT).
- [x] `ai/providers.test.js` (3) — `parseJsonLoose`: JSON murni, fence
      markdown, teks sekitar, invalid melempar (bukan silent).
- [x] `actions-mail.test.js` (6) — `mailStatusUntukUpdate` (MENUNGGU vs
      UPDATE — progres LULUS/GAGAL tidak di-reset) + `appendFeedback` (maks
      3 entri, yang lama dibuang). Kedua helper kini di-export (dulu internal).
- [x] 🐛 **BUG FIX normalizeGender** (ketahuan test): dulu 'L' → L/P, 'P' →
      PRIA, 'FEMALE' → PRIA (substring 'MALE' kena duluan) — TERBALIK dari
      konvensi L/P aplikasi (PARSE_SYSTEM_PROMPT). Kini L/M/MALE → PRIA,
      P/F/FEMALE/W/WANITA → WANITA. Satu-satunya pemakai: actions-register
      (display siswa baru) — tidak ada yang bergantung perilaku lama.
- Catatan: aturan merge/dedupe kandidat hidup di `scripts/dedupe-duplicates.mjs`
  yang dieksekusi saat di-import (bukan ekspor) — tidak di-test unit tanpa
  refactor tambahan; cakupan diganti normalisasi WA + status job (di atas).
  Job handler DB-bound sudah tercakup E2E (backend-fast-path).

---

## ✅ FASE 2 — Frontend: pecah file raksasa (tanpa ubah perilaku) 🧩

Global scope **tetap** di fase ini — tujuannya cuma mengecilkan unit patch. Konversi ESM di Fase 3.

- [x] **`js/07_api.js` (1696 baris) DIHAPUS → `js/api/{forms,jobs,candidates,wa}.js`**
      (commit `b7e6bd8`). Domain: forms = mail inbox (review/approve/reject/
      delete/tandai dibaca) · jobs = kelola loker (simpan/edit/status/hapus/
      tahapan DB + upload pamflet/template) · candidates = modal kandidat
      manual, upload + dokumen lain dinamis, super edit, revisi, QR, pagination
      · wa = papan tugas & jadwal admin. Body fungsi dipindah **byte-identik**
      (verifikasi per-deklarasi: 66 fungsi + 3 `window.*` — semua OK). STACK
      build-js: `/js/07_api.js` → 4 entri; module-map frontend kini rekursif
      (js/api ikut diaudit). Module-map 22 → **25 file / 353 simbol** (total
      simbol TIDAK berubah); bundel 21 → 24 file, 411.1 KB (sama). Verifikasi:
      lint 0 error/12 warn ✓ · test 81/81 ✓ · build idempotent ✓.
- [ ] `js/05_render.js` (1371) → `js/render/public.js`, `js/render/admin.js`, `js/render/candidate.js`, `js/render/cv.js`.
- [ ] `js/03_engine.js` (856) → `js/engine/init.js`, `js/engine/badge.js`, `js/engine/session.js` (pola `updateMailBadge`, refresh).
- [ ] `js/02_init.js` (852) → pisahkan boot (parse URL, restore sesi) vs helper utilitas → `js/init/boot.js`, `js/init/util.js`.
- [ ] `js/06_admin_modal.js` (729) → per kelompok modal (kandidat, loker, mail, pemberkasan, esign).
- [ ] `js/11_admin_ops.js` (769) & `js/09_ai_copilot.js` (785) → pecah per fitur.
- [ ] Pindahkan **inline script** besar di `ai_form.html`, `master-full.html`, `apply-full.html`, `share.html`, `siswa-baru.html` ke `js/pages/*.js` (diload dengan `<script>` biasa, urutan tetap).
- [ ] Setiap pecahan: verifikasi stack urutan (`scripts/build-js.mjs` STACK) tidak berubah untuk admin/index; halaman standalone tetap load file yang sama.
- [ ] Hapus `js/00_dictionary.js` (11 baris) → gabung ke konfigurasi yang memakainya.

---

## ✅ FASE 3 — Konversi ES Modules (win terbesar, risiko tertinggi) 🚀

Ubah bundel dari *concat 21 file* menjadi **bundle graph modul** (esbuild `bundle` mode + entry).

- [ ] Buat entry `js/main.js` (admin/index) yang `import` semua modul domain dan memicu `initApp()`.
- [ ] Ubah `scripts/build-js.mjs`: concat → `esbuild.build({ entryPoints: ['js/main.js'], bundle: true, format: 'iife' })` (hasil sama-sama 1 file, tetap tanpa runtime ESM di browser).
- [ ] Tandai batas modul per domain: `export` fungsi yang dipakai lintas file; `import` eksplisit — **hapus ketergantungan global scope** (kecuali yang benar-benar global seperti `window.ASJ`).
- [ ] Objek global publik (mis. `callAPI`, `tr`) diekspor dari `core/api-client.js` & `core/i18n.js` — halaman standalone tetap bisa pakai via `window` alias (uji kompat).
- [ ] Halaman standalone: buat entry per halaman kalau perlu (`js/pages/apply-full.js`, dll) atau biarkan classic jika lebih kecil risikonya — **keputusan dicatat di PROGRESS.md**.
- [ ] Verifikasi: bundel idempoten, ukuran ≤ +10% dari baseline, `bun run lint` bersih (no-undef terdeteksi lebih dini — manfaat utama ESM), E2E penuh lulus.

---

## ✅ FASE 4 — i18n modular (i18n.js 2631 baris) 🌐

- [ ] `i18n/core.js`: `tr()`, fallback ke `id`, `setLanguage`, deteksi bahasa, render `data-lang` (logika — kecil).
- [ ] `i18n/locales/id.js` + `i18n/locales/jp.js`: **hanya data**, dipecah per domain (`common`, `auth`, `public`, `candidate`, `admin`, `cv`, `ai`, `wa`, `mail`).
- [ ] Lint key duplikat (yang sudah ada di `eslint.config.js`) tetap jalan lintas file.
- [ ] Test: setiap key `id` punya pasangan `jp` atau dijamin fallback `id` (regresi i18n).

---

## ✅ FASE 5 — HTML & partial 🎨

- [ ] Ekstrak `head`, header, footer, bottom-nav, template social ke `partials/` (sistem partial modal sudah jalan via `bun run build:html` — perluas loader untuk section).
- [ ] Normalisasi stack `<script>` halaman standalone → satu urutan shared (`partials/scripts-shared.html`) supaya nambah file tinggal 1 tempat.
- [ ] Pindahkan `<style>` inline halaman ke `src/main.css` (kalau class custom) atau file `src/pages/*.css`.
- [ ] Verifikasi: `bun run build:html` byte-compatible / hash berubah wajar; visual cek admin + index + 1 halaman form.

---

## ✅ FASE 6 — Build, tooling & dokumentasi 🔨

- [ ] `scripts/build-js.mjs` → daftar entry/modul eksplisit (import graph), hapus `STACK` concat.
- [ ] (Opsional) sourcemap untuk bundel (`--sourcemap=inline` dev, off di prod) supaya error produksi gampang dilacak.
- [ ] CI: `.github/workflows/` tambah job `lint + test + build + e2e:share` (sudah ada `e2e-share.yml` — perluas).
- [ ] Update `AGENTS.md` (peta struktur baru) + `WORKFLOW.md` (command & aturan patch) + `CHANGELOG.md` per fase.
- [ ] Update `PROGRESS.md` di **akhir setiap sesi** (tanggal + pengerja + hash commit).

---

## ⚡ Optimasi performa (lanjutan — backend sudah, frontend menyusul)

- [x] **Backend: cache TTL + paralel** (`_lib/cache.js` + `_lib/actions-public.js`) — publik 1.518 → 0 ms warm (2026-08-16).
- [ ] **Frontend: SWR cache di `api-client.js`** (IndexedDB/in-memory) — tampilkan data terakhir instan, validasi di background; kandidat HP tidak nunggu loading tiap buka.
- [ ] **Auto-refresh 60 dtk → 120 dtk + skip saat tab hidden** (`js/03_engine.js` / `02_init.js`) — kurangi tarikan sia-sia.
- [ ] **(Opsional) cache admin TTL pendek** — admin warm masih ±1,6 dtk karena query berkas/forms; prioritas rendah (dipakai sedikit orang).
- [ ] **Cek region Supabase** di dashboard (Settings → Region) — kalau jauh dari Netlify, latensi per-request tetap tinggi; caching sudah menutup, ini dokumentasi saja.

---

## 🚫 Yang TIDAK dilakukan dalam refactor ini

- ❌ Mengubah alur/pipeline lapangan (`PIPELINE.md`).
- ❌ Mengubah perilaku/teks/UI yang terlihat user (kecuali bug yang sudah dilaporkan).
- ❌ Menambah dependensi eksternal baru (tetap mandiri: Supabase + asset lokal).
- ❌ Menghapus `assets/*` lama sebelum bundel baru terverifikasi penuh.
- ❌ Refactor besar dalam 1 commit raksasa — **satu langkah satu commit**.
