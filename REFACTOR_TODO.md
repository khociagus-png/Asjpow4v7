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
- [x] `js/05_render.js` (1371) → `js/render/public.js`, `js/render/admin.js`, `js/render/candidate.js`, `js/render/share.js`, `js/render/mail.js`. — `e8445a7` (2026-08-16)
      Pecah per domain aktual file-nya: public = filter/tab publik + filter kelola loker, admin = renderAdmin/switchTab/table db-job/badgeTahapanDb, candidate = tabel daftar kandidat + jobDilamarCell, share = seluruh modal share loker + template WA, mail = seleksi massal MAIL_SELECTED + status/bucket + filter UI + renderFormInbox. Body 34 deklarasi dipindah **byte-identik** (verifikasi per-deklarasi via brace-matching — semua OK). STACK build-js: `/js/05_render.js` → 5 entri; module-map sudah rekursif untuk js/. Module-map 25 → **29 file / 353 simbol** (total simbol TIDAK berubah); bundel tetap **411.1 KB** (sama persis = isi identik). `js/xss-escape.test.js` (S1 coverage) di-update ke 5 modul. Verifikasi: node --check ✓ · lint 0 error/12 warn ✓ · test **81/81** ✓ · build idempotent ✓.
- [x] `js/03_engine.js` (856) → `js/engine/{pipeline,dashboard,guards,init}.js`. — `ff6e947` (2026-08-16)
      Pecah per domain aktual (TODO menyarankan init/badge/session — isi aslinya 4 klaster: pipeline tahapan, dashboard kandidat, guard refresh + badge mail, mesin init). Body 15 deklarasi dipindah **byte-identik** (verifikasi brace-matching — semua OK). STACK build-js: `/js/03_engine.js` → 4 entri. Module-map 29 → **32 file / 353 simbol** (total simbol TIDAK berubah); bundel tetap **421.022 byte** (sama persis = isi identik). Verifikasi: node --check ✓ · lint 0 error/12 warn ✓ · test **81/81** ✓ · build idempotent ✓.
- [x] `js/02_init.js` (852) → `js/init/{state,theme,util,preview,nav,boot}.js`. — `e76f885` (2026-08-16)
      Pecah per domain aktual: state (semua var global), theme (THEMES/DEFAULT_ASSETS + partikel sakura + applyTheme), util (helper DOM/WA/dropdown/format), preview (vendor SheetJS lazy + render iframe + pesan), nav (changePage/menu mobile/logoutApp), boot (DOMContentLoaded + listener click-outside). Body 71 deklarasi + 2 listener DOM dipindah **byte-identik** (verifikasi brace-matching — semua OK). STACK build-js: `/js/02_init.js` → 6 entri. Module-map 32 → **37 file / 353 simbol** (total simbol TIDAK berubah); bundel tetap **421.022 byte** (sama persis = isi identik). Verifikasi: node --check ✓ · lint 0 error/12 warn ✓ · test **81/81** ✓ · build idempotent ✓.
- [x] `js/06_admin_modal.js` (729) → `js/admin_modal/{dbfilter,cv,job}.js`. — `78f01f0` (2026-08-16)
      Pecah per domain aktual: dbfilter = chip filter/sort tabel DB job (setFilterBidang/Tahapan/setSortDb/renderDbFilters), cv = modal CV digital lengkap (bukaDigitalCV, isiEditCepatCv, toDateInputValue, toggleEditCepatCv, simpanEditCepatCv, bukaInlinePreview, bukaPdfPreview, simpanCatatanCv), job = aksi lamar (lamarJob/copyInfoLoker). Body 14 deklarasi dipindah **byte-identik** (verifikasi brace-matching — semua OK). STACK build-js: `/js/06_admin_modal.js` → 3 entri. Module-map 37 → **39 file / 353 simbol** (total simbol TIDAK berubah); bundel tetap **421.022 byte** & hash SAMA (`app-7c1aea6337.js` — urutan deklarasi identik). Verifikasi: node --check ✓ · lint 0 error/12 warn ✓ · test **81/81** ✓ · build idempotent ✓.
- [x] `js/11_admin_ops.js` (769) → `js/admin_ops/{schedule,candidates,sysconfig,loading,migration,drive}.js`. — `0007312` (2026-08-16)
      Pecah per fitur: schedule = status waktu/agenda dashboard/tabel jadwal, candidates = list kandidat per job + keluarkan dari job + undangan grup massal + cek data siswa, sysconfig = CONFIG_CATEGORIES + render/tambah/hapus/pindah/simpan config + simpanPengumuman, loading = skeleton anti layar hitam, migration = jalankan migrasi DB + hasil + salin SQL, drive = migrasi berkas Google Drive ke Storage. Body 28 deklarasi dipindah **byte-identik** (verifikasi brace-matching — semua OK). STACK build-js: `/js/11_admin_ops.js` → 6 entri. Module-map 39 → **44 file / 353 simbol** (total simbol TIDAK berubah); bundel tetap **421.022 byte**. Verifikasi: node --check ✓ · lint 0 error/12 warn ✓ · test **81/81** ✓ · build idempotent ✓.
- [x] `js/09_ai_copilot.js` (785) → `js/ai_copilot/{admin,interview,parse,results}.js`. — `d51cceb` (2026-08-16)
      Pecah per fitur: admin = chat AI HR Copilot (Jeklin) + auto-fill/simpan kandidat + saran aksi, interview = simulator wawancara VIP (buka/mulai/selesai/append/kirim pesan + cobaParseJsonLoose + kirim hasil ke admin + window.bukaSimulatorInterview), parse = bar upload & parse dokumen biodata (pastikanBarParseAdminAi/bacaFileBase64Front/uploadDokumenBiodataAdmin), results = generateWawancaraModelAdmin + lastAdminHasil + lihatHasilWawancaraAdmin + updateBiodataDariHasilAdmin. Body 27 deklarasi + 1 window assignment dipindah **byte-identik** (verifikasi brace-matching — semua OK). STACK build-js: `/js/09_ai_copilot.js` → 4 entri. Module-map 44 → **47 file / 353 simbol** (total simbol TIDAK berubah); bundel tetap **421.022 byte**. Verifikasi: node --check ✓ · lint 0 error/12 warn ✓ · test **81/81** ✓ · build idempotent ✓.

  **✅ Fase 2 langkah 4 SELESAI** — semua file god-object besar sudah dipecah: 02_init (852), 06_admin_modal (729), 11_admin_ops (769), 09_ai_copilot (785).
- [x] Pindahkan **inline script** besar di `ai_form.html`, `master-full.html`, `apply-full.html`, `share.html`, `siswa-baru.html` ke `js/pages/*.js` (diload dengan `<script>` biasa, urutan tetap). — `30b79c7` (2026-08-16)
      Blok inline 5 halaman standalone (±2.600 baris total) dipindah **byte-identik** ke `js/pages/`: `ai_form.js` (2 blok: konteks URL + utama — 805 baris), `master_full.js` (2 blok: lang-btn + utama — 536), `apply_full.js` (429), `share.js` (515), `siswa_baru.js` (337). Theme one-liner di `<head>` (anti-FOUC) TETAP inline di semua halaman. Verifikasi: `verify-pages-split.mjs` (setiap blok asli muncul verbatim di file halaman) + ekstraksi script byte-exact (isi blok == isi `js/pages/*.js` sebelum ditulis). Halaman sekarang: `i18n/api-client/upload-guard` → `js/pages/*.js` → `pwa.js` (urutan sama persis).
- [x] Setiap pecahan: verifikasi stack urutan (`scripts/build-js.mjs` STACK) tidak berubah untuk admin/index; halaman standalone tetap load file yang sama. — `30b79c7` (2026-08-16)
      STACK hanya berubah 1 entri: `/js/00_dictionary.js` dihapus (murni komentar 11 baris). Bundel **TIDAK berubah** (hash sama `app-2c3caf0224.js`, 421.022 byte — esbuild buang komentar). Module-map 47 → **51 file / 430 simbol** (naik wajar: 5 file halaman baru punya deklarasi sendiri; TIDAK masuk bundel). `node --check` ✓ · lint 0 error/12 warn ✓ · test **81/81** ✓.
- [x] Hapus `js/00_dictionary.js` (11 baris) → gabung ke konfigurasi yang memakainya. — `30b79c7` (2026-08-16)
      Isi 100% komentar (kamus lawas migrasi GAS) — dihapus total; tidak ada kode yang dirujuk.

---

## ✅ FASE 3 — Konversi ES Modules (win terbesar, risiko tertinggi) 🚀

Ubah bundel dari *concat 45 file* menjadi **bundle graph modul** (esbuild `bundle` mode + entry).

> ⚠️ **TEMUAN EMPIRIS (Fase 3 langkah 1, 2026-08-16)** — esbuild `bundle` mode
> TIDAK aman dipakai selama masih ada referensi global implisit lintas file:
> 1. esbuild **men-rename** deklarasi top-level modul saat scope digabung — bahkan
>    TANPA kolisi nama, selama modul lain mereferensikan simbol itu sebagai
>    global (eksperimen: `sharedFn` → `sharedFn2`, referensi dari modul lain
>    TIDAK ikut di-rename → `ReferenceError` diam-diam).
> 2. esbuild **tree-shake** modul yang cuma berisi deklarasi murni (tanpa side
>    effect) — deklarasi global hilang dari output.
> 3. Rename terjadi tak konsisten saat ada kolisi nama (bisa meng-rename SEMUA
>    simbol satu modul → merusak semua referensi lintas modul).
> Kesimpulan: bundle mode baru bisa diaktifkan SETELAH semua referensi lintas
> file menjadi `import` eksplisit (nol referensi global implisit). Build saat ini
> (concat + transform per file) tetap dipakai sampai konversi tuntas.

- [x] **Langkah 1 — fondasi**: resolusi kolisi global + guard otomatis. — commit `da210b9`
      Audit STACK (45 file): **1 kolisi** — `tr` dideklarasikan di `i18n.js` DAN
      `js/01_public.js` (duplikat; isi setara, i18n lebih defensif `String(path)`).
      Duplikat dihapus dari `01_public.js` (24 call-site `tr(` di file itu kini
      pakai global dari i18n.js yang dimuat lebih awal — perilaku sama).
      Guard baru `scripts/check-globals.mjs` (`bun run check:globals`, otomatis
      di awal `bun run build`): GAGAL kalau ada deklarasi top-level yang
      muncul di 2+ file STACK + warning kalau nama STACK dipakai `js/pages/*`.
      Hasil: 45 file · **389 simbol unik · nol kolisi ✓** · lint 0 error/12 warn
      ✓ · test 81/81 ✓.
- [x] **Langkah 2 — core layer ESM: `i18n.js` + `api-client.js` + bridge `window.PortalBridge`** — commit `967a178`
      Audit global lengkap (`scripts/audit-globals.mjs` baru, hasil di
      `.freebuff/audit-globals.json`): 52 file · **394 simbol** · HIGH=0
      (nol shadowing API browser, nol kolisi) · MEDIUM=24 (kontrak lintas
      file — daftar di `ESM_BRIDGE.md` §1.2) · LOW=370.
      Konversi: 8 deklarasi i18n + 4 API publik api-client jadi `export`
      (alias `window.*` dipertahankan); **6 internal api-client jadi PRIVATE
      modul** (NETLIFY_API_BASE/CANDIDATE_ACTIONS/ADMIN_ACTIONS/
      NETLIFY_FUNCTIONS/getApiUrl/callNetlify — tidak lagi global).
      Referensi global implisit di modul di-window-kan eksplisit
      (`window.tr`, `window.showToast`, `window.render*` — scan no-undef
      bersih) karena modul ESM tidak fallback ke global scope.
      **Bridge** `js/core/bridge.js`: `window.PortalBridge` namespace tunggal
      (callAPI/tr/LANG/… + `safeCallAPI` dengan fallback) untuk pemakai legacy.
      Build: STACK concat tetap classic — `build-js.mjs` meng-IIFE-kan
      api-client/i18n per file (export di-strip, alias jalan; bukti bundel:
      8 alias `window.*` hadir, 0 export bocor). Halaman standalone load core
      sebagai `<script type="module">` (ai_form & master-full via bridge;
      apply-full & siswa-baru api-client saja; share i18n saja).
      Verifikasi: node --check ESM ✓ · scan no-undef 0 error ✓ · lint 0/12 ✓ ·
      test **81/81** ✓ · build idempoten `app-7f821ddf7c.js` (410.6 KB) ✓ ·
      uji import ESM di Node (PortalBridge + alias + tr + toggle bahasa +
      internal privat) ✓ · E2E login/upload/biodata + smoke standalone
      **SEMUA LULUS** (commit `af49b82`).
      Detail & roadmap: **`ESM_BRIDGE.md`**.
- [x] **Langkah 3 — `js/init/state.js` + `js/init/util.js` ESM** — commit `6478be9`
      State global (33 var, termasuk yang di-REASSIGN oleh classic seperti
      `ALL_JOBS = ...` di engine/init, `isAdmin = true` di auth, `CURRENT_THEME
      = theme` di theme) memakai **accessor get/set bridge** di window
      (`Object.defineProperty(window, name, {get, set})` mendelegasikan ke
      binding modul) — alias biasa akan membuat binding modul BASI untuk
      import ESM berikutnya. Pola ini didokumentasikan di `ESM_BRIDGE.md`
      §3.2. Util (19 fungsi: showToast/safeSet/normalizePhone/populate/dll)
      memakai alias window biasa + referensi global eksplisit `window.*`
      (`tr`, `trOption`, `trOptionId`, `esc`, `DROPDOWNS`, `toastWaFormat`).
      Build: `ESM_CORE` di build-js.mjs + 2 entri. `js/init/*` tidak dimuat
      halaman standalone → tidak ada perubahan HTML.
      Verifikasi: node --check ESM ✓ · scan no-undef 0 error ✓ · lint 0/12 ✓ ·
      test **81/81** ✓ · build `app-c06313605c.js` (411.8 KB) nol kolisi
      (390 simbol) · uji round-trip accessor di Node (tulis window → binding
      modul ikut; getter baca binding; CURRENT_THEME/ACTIVE_PEMBERKASAN_WA
      live) ✓ · E2E login/upload/biodata **SEMUA LULUS** ✓ · audit 52 file /
      **395 simbol** HIGH=0.
- [x] **Langkah 4 — `js/04_auth.js` ESM (domain auth pertama)** — commit `2463b5a`
      Domain pertama dari konversi per-domain: 14 fungsi auth (bukaModalKandidat,
      prosesLoginKandidat, prosesLoginMaster, prosesLoginPersonal, gate WA
      normalizeWaInput/isValidWaInput/toastWaFormat, ganti password, dll) jadi
      `export` + 14 alias window.*. Alias wajib: pemanggil utama adalah HTML
      inline onclick (10 fungsi) + lintas file (`window.toastWaFormat` dipakai
      util.js, `window.showLoginAdminMaster` dipakai init/boot.js).
      Referensi global implisit di-window-kan eksplisit: `window.tr`,
      `window.callAPI`, `window.showToast`, `window.safeSet`, state writes
      (`window.isAdmin = true`, `window.currentAdminName = name`, dll — lewat
      accessor bridge state.js), `window.refreshDataDinamis`,
      `window.changePage`, `window.applyInterMilanVibe` (no-undef 0 error).
      Build: ESM_CORE + 1 entri → `app-23ec7d1632.js` (412.2 KB, 0 export
      bocor). js/04_auth.js tidak dimuat halaman standalone → tanpa perubahan
      HTML. Verifikasi: node --check ESM ✓ · no-undef 0 error ✓ · lint 0/12 ✓ ·
      test **81/81** ✓ · E2E login/upload/biodata **SEMUA LULUS** ✓.
- [x] **Langkah 5 — `js/engine/*` ESM (4 file: pipeline, dashboard, guards, init)** — commit `4ea3e32`
      Engine = mesin tarik data + init dashboard: `pipeline.js` (4 fn tahapan),
      `dashboard.js` (6: BERKAS_17/BIO_FIELDS_19 + render progres), `guards.js`
      (3: adaModalTerbuka/sedangDiscrollTabel/updateMailBadge), `init.js` (2:
      refreshDataDinamis/initApp) → semua `export` + alias window.* (kontrak
      terberat: refreshDataDinamis 10 pemakai, initApp 6, updateMailBadge 2 +
      HTML onclick).
      Referensi global implisit di-window-kan eksplisit: state writes/reads
      via accessor (`window.ALL_JOBS = ...`, `window.AUTO_REFRESH_TIMER`,
      `window.isAdmin`, …), `window.tr/callAPI/showToast/esc/safeSet/`
      `populate/populateCheckboxes/normalizePhone/trOption`, render lintas
      domain (`window.renderAdminFull/renderFormInbox/renderJobDilamar/`
      `renderRiwayatKandidat/renderStudentCard/bukaDigitalCV`), `window.`
      `changePage/applyTheme/applyInterMilanVibe/renderLanguage/`
      `jalankanSemuaSkeleton/adminSwitchTab/muatMigrasiDrive` — no-undef 0 error.
      🐛 **Phantom global difix**: `ALL_CANDIDATES_TOTAL` (dulu di-assign bare
      di initApp tanpa deklarasi — strict mode akan ReferenceError) kini
      dideklarasikan resmi di state.js + accessor bridge (candidates.js sudah
      memakainya via window.*).
      ⚠️ Catatan penting: antar-file ESM belum boleh `import` (build masih
      concat+IIFE per file) → panggilan lintas modul engine (init → dashboard/
      guards/pipeline) memakai `window.*` eksplisit (lihat ESM_BRIDGE.md §3.3).
      Build: ESM_CORE + 4 entri → `app-a32c94c192.js` (413.5 KB, 0 export
      bocor). Verifikasi: node --check ESM ✓ · no-undef 0 error ✓ · lint 0/12 ✓
      · test **81/81** ✓ · uji import Node (pipeline 9 langkah, initApp
      DOM-safe, refreshDataDinamis via window.callAPI stub) ✓ · E2E
      login/upload/biodata **SEMUA LULUS** ✓ · audit 52 file / **396 simbol**
      HIGH=0.
- [x] **Langkah 6 — `js/render/*` ESM (5 file: public, admin, candidate, share, mail)** — commit `5afe39b`
      Domain render terbesar (pecahan 05_render.js): `public.js` (4: filter/tab
      publik + filter kelola loker), `admin.js` (6: renderAdminFull/switchTab/
      table DB job/badgeTahapanDb), `candidate.js` (tabel daftar kandidat +
      jobDilamarCell), `share.js` (modal share + template WA), `mail.js`
      (MAIL_SELECTED + status/bucket + filter UI + renderFormInbox) → export +
      alias window.* (15).
      `MAIL_SELECTED` di-reassign bare `js/api/forms.js` → **accessor bridge**
      (pola state.js). 44 referensi lintas-file di-window-kan eksplisit
      (no-undef 0 error); `var esc` lokal mail.js dipertahankan lokal (hoisting
      mencakup renderFormInbox). ⚠️ Blanket replace sempat menimpa 4 alias
      jadi self-reference (`window.x = window.x` → undefined) — ketahuan E2E,
      diperbaiki manual; scan `window.X = window.X` wajib setelah blanket.
      Build: ESM_CORE + 5 entri → `app-4c1c681c7c.js` (415.3 KB, 0 export
      bocor). Verifikasi: node --check ESM ✓ · no-undef 0 error ✓ · lint 0/12 ✓
      · test **81/81** ✓ · audit 45 file STACK / **391 simbol** HIGH=0 ✓.
      🐛 **Fix backend lintas-domain**: `nextCandidateId()` hanya scan
      `database_candidate` → master_database_candidate yang sudah punya id ≥ max
      bikin simpan biodata kandidat baru 409 `uq_master_id_kandidat` (kasus
      nyata ASJ00226). `maxCandidateIdNumber()` + fallback scan KEDUA tabel
      (`db/candidates.js` + `candidate-helpers.js`); 2 baris leftover E2E
      dibersihkan. E2E login/upload/biodata **SEMUA LULUS** ✓.
- [x] **Langkah 7 — `js/api/*` ESM (4 file: forms, jobs, candidates, wa)** — commit `fca83b6`
      Domain interaksi backend (pecahan 07_api.js): `forms.js` (12: mail inbox
      review/approve/reject/delete/tandai dibaca + patchFormMail/upsertCandidateMemory),
      `jobs.js` (11: kelola loker + downscale/upload pamflet/template + memori
      ALL_DB_JOBS/ALL_JOBS), `candidates.js` (32: modal Input Manual, upload +
      baris dokumen lain, Super Edit, revisi CV, QR lokal, filterCbx, pagination
      ensureAllCandidates/muatLebihKandidat), `wa.js` (10: papan tugas/jadwal +
      memori ALL_TUGAS/ALL_SCHEDULES) → `export` + alias window.* (59 total).
      `window.X = async function(){}` (submitRejectForm/ensureAllCandidates/
      muatLebihKandidat) diubah jadi `export async function` + alias. Referensi
      global implisit di-window-kan eksplisit (no-undef 0 error): state via
      accessor, MAIL_SELECTED via accessor, core/util/render/engine/helper
      classic (cekUkuranFile/bacaFileBase64/normalizeGenderValue/toDateInputValue)
      + vendor window.qrcode. ⚠️ Pelajaran blanket: `ALL_CANDIDATES` blanket
      merusak `window.ALL_CANDIDATES_TOTAL` → pakai pola terarah `(ALL_CANDIDATES`
      + `ALL_CANDIDATES.find`. Build: ESM_CORE + 4 entri → `app-ee4db83e37.js`
      (416.8 KB, 0 export bocor, idempoten). check:globals nol kolisi (45 file /
      394 simbol). Audit 52 file / **396 simbol** HIGH=0. Verifikasi: node --check
      ESM 4 file ✓ · no-undef 0 error ✓ · lint 0/12 ✓ · test **81/81** ✓ · E2E
      login/upload/biodata + backend-fast-path **SEMUA LULUS** ✓.
      🐛 Bonus fix artefak langkah 6: `<window.tr>` → `<tr>` di render/public,
      admin, candidate, mail (blanket replace `tr(` ikut mengubah literal `<tr`
      template tabel) — diverifikasi di browser (tabel mail/DB Job/landing render
      `tr.rt-row` asli, 0 elemen `window.tr`).
- [x] **Langkah 8 — `js/admin_modal/*` ESM (3 file: dbfilter, cv, job)** — commit `720e28e`
      Domain modal CV digital & filter DB job (pecahan 06_admin_modal.js):
      `dbfilter.js` (4: setFilterBidang/Tahapan/setSortDb/renderDbFilters — chip
      filter/sort tabel DB job), `cv.js` (8: bukaDigitalCV/isiEditCepatCv/
      toDateInputValue/toggleEditCepatCv/simpanEditCepatCv/bukaInlinePreview/
      bukaPdfPreview/simpanCatatanCv), `job.js` (2: lamarJob/copyInfoLoker) →
      `export` + 14 alias window.*. `toDateInputValue` (definisi di cv.js)
      dipakai api/candidates.js via `window.toDateInputValue` — alias wajib.
      Referensi global implisit di-window-kan eksplisit (no-undef 0 error):
      state via accessor (dbFilter*/DROPDOWNS/ALL_CANDIDATES/ALL_DB_JOBS/
      ASSETS/isAdmin), helper classic (jobTutupUntukLamar 01_public,
      bukaFormBridge/bukaPreviewDokumen/normalizeGenderValue 03_candidate,
      previewFileInFrame init/preview), util/core via window. Build: ESM_CORE
      + 3 entri → `app-1057be7ccc.js` (417.7 KB, 0 export bocor, idempoten).
      check:globals nol kolisi (45 file / 394 simbol). Audit 52 file /
      **396 simbol** HIGH=0. Verifikasi: node --check ESM 3 file ✓ · no-undef
      0 error ✓ · lint 0/12 ✓ · test **81/81** ✓ · E2E login/upload/biodata
      **SEMUA LULUS** ✓ · cek modal CV terarah (bukaDigitalCV → modal render,
      Edit Cepat tampil, 0 error JS) ✓.
- [ ] Buat entry `js/main.js` (admin/index) yang `import` semua modul domain dan memicu `initApp()` — **baru setelah konversi eksplisit tuntas**.
- [ ] Ubah `scripts/build-js.mjs`: concat → `esbuild.build({ entryPoints: ['js/main.js'], bundle: true, format: 'iife', treeShaking: false })` — hasil 1 file IIFE; tambahkan plugin exposure `window.<simbol> = <simbol>` per modul untuk kompat HTML `onclick`/`onload` (atau alias `window` eksplisit di tiap modul).
- [ ] Tandai batas modul per domain — **urutan konversi (dependency order)**
      (langkah 1-2 core layer ✅, langkah 3 init ✅):
      1. ✅ `api-client.js` + `i18n.js` (core; diekspor + alias `window` utk pemakai classic),
      2. ✅ `init/{state,util}.js` (state: accessor bridge; util: alias window),
      3. ✅ `04_auth.js` (langkah 4) + `engine/*` (langkah 5) + `render/*` (langkah 6) — lanjut: api → admin_* → ai_copilot → sisanya,
      tiap langkah: `export` simbol + `import` di pemakainya, `bun run check:globals`
      tetap hijau, lint/test hijau, bundel tetap sama ukurannya.
- [ ] Objek global publik (`callAPI`, `tr`, `LANG`, `CURRENT_LANG`) — ✅ sudah diekspor dari `api-client.js` & `i18n.js` (langkah 2); pemakai classic tetap dapat via `window` alias (uji kompat); hapus alias satu per satu setelah semua pemakainya di-import.
- [ ] Halaman standalone: buat entry per halaman (`js/pages/` → entry ESM) ATAU biarkan classic — **keputusan dicatat di PROGRESS.md**; jangan sampai nama `js/pages/*` bentrok dengan bundel (guard sudah warning).
- [ ] Verifikasi akhir: bundel idempoten, ukuran ≤ +10% dari baseline (421.030 byte), lint bersih + **aktifkan `no-undef` per file yang sudah ESM** (deteksi referensi yang terlewat — manfaat utama ESM; saat ini nonaktif global di eslint.config.js karena classic), E2E penuh lulus.

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
