# PROGRESS.md — Status Pekerjaan ASJ Portal

> Pengingat untuk tim & AI assistant: baca file ini dulu sebelum mulai bekerja,
> supaya tidak mengerjakan ulang hal yang sudah selesai / tidak menyentuh yang
> memang belum waktunya.

**Update terakhir:** sesi 2026-08-16 — dikerjakan oleh **agus khoci** (via Freebuff) — Fase 3 langkah 4: domain auth (`js/04_auth.js`) jadi ESM (commit menyusul).

---

## 🆕 Sesi 2026-08-16 — dikerjakan oleh: agus khoci (via Freebuff)

### Fase 3 langkah 4 — domain auth: js/04_auth.js ESM (commit menyusul)

- **`js/04_auth.js` → ESM** (domain pertama konversi per-domain): 14 fungsi
  auth jadi `export` + **14 alias window.***. Alias wajib karena pemanggil
  utama adalah HTML inline `onclick` (10 fungsi: bukaModalKandidat,
  prosesLoginKandidat, prosesLoginMaster, prosesLoginPersonal,
  showLoginAdminMaster/Personal, buka/tutupModalGantiPass, dll) + lintas
  file (`window.toastWaFormat` dipakai js/init/util.js, `window.showLoginAdminMaster`
  dipakai js/init/boot.js).
- Referensi global implisit di-window-kan eksplisit (no-undef scan **0 error**):
  `window.tr`, `window.callAPI`, `window.showToast`, `window.safeSet`,
  state writes via accessor (`window.isAdmin = true`, `window.currentAdminName
  = name`, `window.isKandidat = true`, `window.currentKandidatName/Wa`),
  `window.refreshDataDinamis`, `window.changePage`, `window.applyInterMilanVibe`.
- Build: `build-js.mjs` ESM_CORE + 1 entri → bundel `app-23ec7d1632.js`
  (412.2 KB, 45 file, 0 export bocor). check:globals nol kolisi (390 simbol).
- `js/04_auth.js` tidak dimuat halaman standalone → tanpa perubahan HTML.
- **Verifikasi**: node --check ESM ✓ · no-undef 0 error ✓ · lint 0/12 ✓ ·
  test **81/81** ✓ · **E2E SEMUA LULUS** — login-check (kandidat + admin
  master PIN + admin personal, 0 JS error), upload-check, biodata-check.

---

## 🆕 Sesi 2026-08-16 — dikerjakan oleh: agus khoci (via Freebuff)

### Fase 3 langkah 3 — state.js + util.js ESM + accessor bridge + E2E penuh (commit `6478be9`)

- **`js/init/state.js` → ESM**: 33 var state (`ALL_*`, `ASSETS`,
  `CURRENT_THEME`, `DROPDOWNS`, `isAdmin/isKandidat`, `current*`,
  `limit*`, `dbSortType/dbFilter*`, `mailFilterStatus`, `AUTO_REFRESH_*`,
  `ACTIVE_PEMBERKASAN_*`) jadi `export`. Karena pemakai classic
  **mereassign bare** (`ALL_JOBS = res.jobs` di engine/init,
  `isAdmin = true` di auth, `CURRENT_THEME = theme` di theme), bridge
  window.* memakai **ACCESSOR get/set** (`Object.defineProperty`
  mendelegasikan ke binding modul) — alias biasa akan membuat binding
  modul basi bagi import ESM berikutnya. Pola baru §3.2 `ESM_BRIDGE.md`.
- **`js/init/util.js` → ESM**: 19 fungsi (`thumbnailUrl`, `safeSetVal`,
  `normalizePhone`, `showToast`, `safeSet/setImg/setBg`,
  `getHighResImage/getDirectDownloadUrl`, `formatPendidikanTingkat`,
  `isPreviewableFile/previewFinalUrl`, `populate/populateCheckboxes`,
  `rePopulateDropdowns`, `formatInputWA/hapusRingWA`, `salinTeksDecode`,
  `toggleMinimize`) jadi `export` + 19 alias window. Referensi global
  implisit di-window-kan eksplisit: `window.tr`, `window.trOption`,
  `window.trOptionId`, `window.esc`, `window.DROPDOWNS`,
  `window.toastWaFormat` (no-undef scan **0 error**).
- **Build**: `build-js.mjs` ESM_CORE + 2 entri → bundel
  `app-c06313605c.js` (411.8 KB, 45 file, 0 export bocor, accessor
  defineProperty utuh). check:globals nol kolisi (**390 simbol**).
- **Audit**: 52 file · **395 simbol** · HIGH=0 · MEDIUM=24 · LOW=371
  (`.freebuff/audit-globals.json` + module-map diperbarui).
- **Verifikasi**: node --check ESM ✓ · no-undef 0 error ✓ · lint 0/12 ✓ ·
  test **81/81** ✓ · uji round-trip accessor di Node (tulis via window →
  binding modul ikut; getter baca binding; CURRENT_THEME & export let
  ACTIVE_PEMBERKASAN_WA live; populate/rePopulateDropdowns/salinTeksDecode
  pakai window.*) ✓ · **E2E SEMUA LULUS**: login-check, upload-check,
  biodata-check (bundle classic tetap jalan dengan state/util ESM).
- Catatan preview: proses background (`nohup`) tidak bertahan antar
  perintah di sandbox — preview dinyalakan sementara dalam 1 perintah
  bersama test (`PORT=3000 nohup node serve-static.mjs & … ; kill $!`).

---

## 🆕 Sesi 2026-08-16 — dikerjakan oleh: agus khoci (via Freebuff)

### Fase 3 langkah 2 — core layer ESM + bridge PortalBridge + audit global (commit `967a178`)

- **Audit global pollution** — `scripts/audit-globals.mjs` baru (risk
  HIGH/MEDIUM/LOW + shadowing window API), hasil di
  `.freebuff/audit-globals.json`: **52 file · 394 simbol · HIGH=0 ·
  MEDIUM=24 · LOW=370 · 0 kolisi · 0 shadowing API browser**. Daftar
  MEDIUM (kontrak lintas-file yang wajib export saat ESM) ada di
  `ESM_BRIDGE.md` §1.2.
- **`i18n.js` → ESM**: 8 deklarasi publik (CURRENT_LANG, LANG,
  OPTION_TRANSLATIONS, trOption, trOptionId, tr, renderLanguageLight,
  toggleFormLanguage) kini `export`; alias `window.*` dipertahankan.
- **`api-client.js` → ESM**: export callAPI/esc/escJs/resolveSelfUrl +
  `window.callAPI` alias BARU (dulu bare global di concat); **6 internal
  jadi private modul** (NETLIFY_API_BASE, CANDIDATE_ACTIONS,
  ADMIN_ACTIONS, NETLIFY_FUNCTIONS, getApiUrl, callNetlify — tidak bocor
  lagi).
- **Referensi global implisit di-window-kan** (modul strict tidak fallback
  ke global): `tr`/`showToast` (api-client, jalur sesi basi) +
  `renderLanguage`/`renderSysConfig`/`rePopulateDropdowns` (i18n,
  toggleFormLanguage) → `window.*` eksplisit; scan `no-undef` **0 error**.
- **Bridge** `js/core/bridge.js`: `window.PortalBridge` (callAPI, esc,
  escJs, resolveSelfUrl, LANG, CURRENT_LANG live-getter, tr, trOption,
  trOptionId, renderLanguageLight, toggleFormLanguage, safeCallAPI).
- **Build**: `build-js.mjs` meng-IIFE-kan api-client/i18n per file
  (format:'iife' → export di-strip, alias jalan); bundel tetap classic
  `assets/app-7f821ddf7c.js` (410.6 KB, 45 file, **0 export bocor**, 8
  alias window.* hadir); `check-globals` DECL_RE + `module-map`
  RE_FUNC_DECL didukung prefix `export`.
- **Halaman standalone**: i18n/api-client diganti `<script type="module">`
  (ai_form & master-full → `js/core/bridge.js`; apply-full & siswa-baru →
  api-client; share → i18n). Aman: modul deferred jalan sebelum
  DOMContentLoaded, dan tidak ada kode top-level classic yang memanggil
  callAPI/tr saat parse (diaudit).
- **Verifikasi**: node --check ESM ✓ · scan no-undef 0 error ✓ · lint
  0 error/12 warn ✓ · test **81/81** ✓ · build idempoten ✓ · uji impor
  ESM di Node (PortalBridge + alias + tr + toggle bahasa live + internal
  privat) ✓.
- **E2E Playwright — SEMUA LULUS** (preview :3000, serve-static):
  `login-check` (landing + login kandidat Agus khoci + admin KHOCI, 0 JS
  error) ✓ · `upload-check` (guard client + upload KTP/KK end-to-end +
  Storage + sinkron DB + cleanup) ✓ · `biodata-check` (simpanBiodataLengkap
  + cleanup) ✓ · smoke 5 halaman standalone (`ai_form`, `master-full`,
  `apply-full`, `share`, `siswa-baru`) — core ESM load via
  `<script type="module">` **0 JS error**, `PortalBridge`/`callAPI`/`tr`
  tersedia sesuai halaman ✓.
- Catatan: preview server sempat mati di sela test (CLI platform tidak
  ter-inject di sandbox) — dihidupkan ulang via `scripts/preview-watchdog.sh`
  (mekanisme resmi repo, log di `/tmp/preview-watchdog.log`).
- Detail lengkap + roadmap: **`ESM_BRIDGE.md`**.

---

## 🆕 Sesi 2026-08-16 — dikerjakan oleh: agus khoci (via Freebuff)

### Fase 2 langkah 4d — `js/09_ai_copilot.js` (785 baris) → `js/ai_copilot/*` — commit `d51cceb`

- **Baru** `js/ai_copilot/admin.js` (10 deklarasi) — adminAiHistory,
  currentAiCandidateId, urlFotoJeklin, bukaAdminAiCopilot, tutupAdminAi,
  kirimPesanAdminAi, autoFillFormDariAi, simpanKandidatDariAi,
  tambahPesanAdminAi, tampilkanSaranAdminAi.
- **Baru** `js/ai_copilot/interview.js` (10) — interviewHistory,
  bukaSimulatorInterview (gate VIP), pastikanTombolSelesaiInterview,
  selesaikanWawancaraInterview, mulaiWawancaraInterview, appendInterviewChat,
  sendInterviewMessage (+ marker ===HASIL===), cobaParseJsonLoose,
  kirimHasilWawancaraKeAdmin + `window.bukaSimulatorInterview`.
- **Baru** `js/ai_copilot/parse.js` (3) — pastikanBarParseAdminAi (inject
  bar upload), bacaFileBase64Front, uploadDokumenBiodataAdmin
  (parseDokumenBiodata → submitMasterForm).
- **Baru** `js/ai_copilot/results.js` (4) — generateWawancaraModelAdmin,
  lastAdminHasil, lihatHasilWawancaraAdmin, updateBiodataDariHasilAdmin.
- Body 27 deklarasi + 1 window assignment dipindah **byte-identik**
  (verifikasi brace-matching — semua OK).
- `scripts/build-js.mjs` STACK: `/js/09_ai_copilot.js` → 4 entri
  `js/ai_copilot/*`.
- `js/09_ai_copilot.js` **DIHAPUS** — module-map frontend 44 → **47 file /
  353 simbol** (total simbol TIDAK berubah). Bundel: `app-582d85d016.js` →
  `app-2c3caf0224.js`, ukuran tetap **421.022 byte**.

> 🎉 **Fase 2 langkah 4 TUNTAS** — semua god-object besar sudah dipecah
> (02_init 852, 06_admin_modal 729, 11_admin_ops 769, 09_ai_copilot 785).

---

## 🆕 Sesi 2026-08-16 — dikerjakan oleh: agus khoci (via Freebuff)

### Fase 3 langkah 1 — fondasi ESM: resolusi kolisi `tr` + guard `check:globals` + temuan empiris esbuild — commit `da210b9`

- **Kolisi global terakhir dihilangkan**: `tr` dideklarasikan ganda di
  `i18n.js` & `js/01_public.js`. Duplikat dihapus dari `01_public.js`
  (24 call-site `tr(` di file itu kini pakai global i18n.js yang dimuat
  lebih awal — isi setara, i18n lebih defensif `String(path)`).
- **Guard baru** `scripts/check-globals.mjs` → `bun run check:globals`
  (otomatis di awal `bun run build`): gagal kalau ada deklarasi top-level
  di 2+ file STACK, warning kalau nama STACK dipakai `js/pages/*`.
  Hasil: 45 file · 389 simbol unik · **nol kolisi ✓**.
- **🔬 Temuan empiris krusial** (eksperimen esbuild bundle mode):
  - esbuild **men-rename** deklarasi top-level modul saat scope digabung,
    bahkan tanpa kolisi, selama modul lain mereferensikannya sebagai global
    → referensi implisit patah (ReferenceError diam-diam).
  - esbuild **tree-shake** modul berisi deklarasi murni (tanpa side effect).
  - Rename tidak konsisten saat ada kolisi (bisa meng-rename SEMUA simbol
    satu modul → merusak semua referensi lintas file).
  → **Bundle mode baru bisa diaktifkan setelah SEMUA referensi lintas file
  menjadi import eksplisit**. Build concat + transform tetap dipakai sampai
  konversi tuntas (konversi bertahap per domain, urutan: core → util →
  domain; alias `window` utk pemakai classic; aktifkan `no-undef` per file
  yang sudah ESM).

**Verifikasi:** check:globals nol kolisi ✓ · lint 0 error/12 warn ✓ ·
test **81/81** ✓ · build OK (bundel baru `app-19e6249673.js`, 421.030 byte
— berubah wajar karena duplikat tr hilang).

---

## Sesi 2026-08-16 — dikerjakan oleh: agus khoci (via Freebuff)

### Fase 2 langkah 5 — inline script 5 halaman standalone → `js/pages/*` + `00_dictionary` dihapus — commit `30b79c7`

- **Baru** `js/pages/ai_form.js` (805 baris) — 2 blok inline ai_form.html
  digabung: konteks URL (AI_FORM_CONTEXT dari query string) + logika
  chat/autofill/upload CV Qween (berjalan urutan sama: konteks dulu,
  lalu body).
- **Baru** `js/pages/master_full.js` (536) — blok lang-btn (listener
  DOMContentLoaded — posisi-independen, aman pindah setelah api-client)
  + blok utama form master 5 langkah (SSW_LIST/PEKERJAAN_LIST,
  gerbang login kandidat, auto-fill, submitMasterForm).
- **Baru** `js/pages/apply_full.js` (429) — form lamaran 3 langkah
  (cekRiwayat + peringatan multi-apply LULUS, upload + downscale,
  submitApply).
- **Baru** `js/pages/share.js` (515) — viewer kandidat share
  (SHARE_LANG lokal, filter gender/usia/JFT, seleksi → kirim WA,
  preview dokumen lokal SheetJS/mammoth/pptx).
- **Baru** `js/pages/siswa_baru.js` (337) — chat pendaftaran siswa baru
  (draft auto-save, upload KTP/KK/ijazah, submitDaftarSiswa).
- Theme one-liner di `<head>` (anti-FOUC) **tetap inline** di semua
  halaman — bukan bagian refactor.
- Halaman sekarang: `i18n/api-client/upload-guard` → `js/pages/*.js` →
  `pwa.js` (urutan muat sama persis dengan sebelumnya).
- `js/00_dictionary.js` **DIHAPUS** — isi 100% komentar (kamus lawas
  migrasi GAS); 1 entri dihapus dari STACK build-js. Bundel **TIDAK
  berubah** (hash sama `app-2c3caf0224.js`, 421.022 byte). Module-map
  47 → **51 file / 430 simbol** (5 file halaman baru — TIDAK masuk bundel).

**Verifikasi:** setiap blok inline asli dipindah **byte-identik**
(verify-pages-split verbatim + ekstraksi script byte-exact terhadap
`js/pages/*` sebelum ditulis; ai_form/master-full punya trailing-space
di banyak baris — pakai script mekanis, bukan salin manual). `node --check`
✓ · lint 0 error/12 warn ✓ · test **81/81** ✓ · build idempotent ✓
(bundel hash sama = isi identik).

> 🎉 **FASE 2 TUNTAS 100%** — semua god-object frontend dipecah
> (07_api 1696 → js/api/*, 05_render 1371 → js/render/*, 03_engine 856 →
> js/engine/*, 02_init 852 → js/init/*, 06_admin_modal 729 →
> js/admin_modal/*, 11_admin_ops 769 → js/admin_ops/*, 09_ai_copilot 785 →
> js/ai_copilot/*, inline 5 halaman ±2.600 baris → js/pages/*,
> 00_dictionary dihapus).

---

## Sesi 2026-08-16 — dikerjakan oleh: agus khoci (via Freebuff)

### Fase 2 langkah 4c — `js/11_admin_ops.js` (769 baris) → `js/admin_ops/*` — commit `0007312`

- **Baru** `js/admin_ops/schedule.js` (3 fn) — getStatusWaktu (ONGOING/
  SEGERA/HARI INI/H-1/H-n), renderDashboardAgenda, renderJadwal.
- **Baru** `js/admin_ops/candidates.js` (4 fn) — bukaModalListKandidat
  (+ salin list ke WA), keluarkanKandidatDariJob (patch-in-place),
  mulaiKirimUndanganGrup (kirimTawaranMassal), bukaModalCekDataSiswa.
- **Baru** `js/admin_ops/sysconfig.js` (7 deklarasi) — CONFIG_CATEGORIES,
  renderSysConfig, tambahConfigItem (dedupe by ID), hapusConfigItem,
  pindahConfigItem, simpanConfigKeServer, simpanPengumuman.
- **Baru** `js/admin_ops/loading.js` (2 fn) — setSkeletonLoading,
  jalankanSemuaSkeleton (anti layar hitam).
- **Baru** `js/admin_ops/migration.js` (3 fn) — jalankanMigrasi,
  renderMigrasiResults, salinSqlMigrasi.
- **Baru** `js/admin_ops/drive.js` (10 deklarasi) — DRIVE_CANDIDATES +
  muatMigrasiDrive/banner, modal daftar + render, field HTML, status,
  baca base64, uploadDriveReplacement.
- Body 28 deklarasi dipindah **byte-identik** (verifikasi brace-matching —
  semua OK).
- `scripts/build-js.mjs` STACK: `/js/11_admin_ops.js` → 6 entri
  `js/admin_ops/*`.
- `js/11_admin_ops.js` **DIHAPUS** — module-map frontend 39 → **44 file /
  353 simbol** (total simbol TIDAK berubah). Bundel: `app-7c1aea6337.js` →
  `app-582d85d016.js`, ukuran tetap **421.022 byte**.

---

## Sesi 2026-08-16 — dikerjakan oleh: agus khoci (via Freebuff)

### Fase 2 langkah 4b — `js/06_admin_modal.js` (729 baris) → `js/admin_modal/*` — commit `78f01f0`

- **Baru** `js/admin_modal/dbfilter.js` (4 fn) — chip filter bidang/tahapan
  + tombol sort tabel DB job: setFilterBidang, setFilterTahapan, setSortDb,
  renderDbFilters.
- **Baru** `js/admin_modal/cv.js` (8 fn) — modal CV digital (dossier):
  bukaDigitalCV (render profil + badge VIP/KELAS + foto fallback + tombol
  pemberkasan), isiEditCepatCv, toDateInputValue, toggleEditCepatCv,
  simpanEditCepatCv (updateKandidatSuper), bukaInlinePreview, bukaPdfPreview,
  simpanCatatanCv (updateCatatanKandidat + normalisasi [VIP]/[KELAS]).
- **Baru** `js/admin_modal/job.js` (2 fn) — lamarJob (form bridge + guard
  job tutup), copyInfoLoker (salin info loker ke WA).
- Body 14 deklarasi dipindah **byte-identik** (verifikasi brace-matching —
  semua OK).
- `scripts/build-js.mjs` STACK: `/js/06_admin_modal.js` → 3 entri
  `js/admin_modal/*`.
- `js/06_admin_modal.js` **DIHAPUS** — module-map frontend 37 → **39 file /
  353 simbol** (total simbol TIDAK berubah). Bundel: hash & ukuran SAMA
  (`app-7c1aea6337.js`, 421.022 byte) — urutan deklarasi identik → output
  minify byte-identik, bukti paling kuat tidak ada yang berubah.

---

## Sesi 2026-08-16 — dikerjakan oleh: agus khoci (via Freebuff)

### Fase 2 langkah 4a — `js/02_init.js` (852 baris) → `js/init/*` — commit `e76f885`

- **Baru** `js/init/state.js` — semua var global (ALL_*/ASSETS/CURRENT_THEME/
  DROPDOWNS/isAdmin/limit*/mailFilterStatus/PREV_MAIL_COUNT/AUTO_REFRESH_TIMER
  + state pemberkasan).
- **Baru** `js/init/theme.js` — THEMES/DEFAULT_ASSETS, renderThemeToggle,
  toggleTheme, partikel sakura (buatPartikelSakura/setSakuraParticles),
  applyInterMilanVibe, applyTheme.
- **Baru** `js/init/util.js` — thumbnailUrl, safeSetVal/normalizePhone/showToast,
  safeSet/setImg/setBg, getHighResImage/getDirectDownloadUrl,
  formatPendidikanTingkat, isPreviewableFile/previewFinalUrl,
  populate/rePopulateDropdowns/populateCheckboxes, formatInputWA/hapusRingWA,
  salinTeksDecode, toggleMinimize.
- **Baru** `js/init/preview.js` — VENDOR_V/_vendorPromises, muatVendorLib,
  renderExcelKeFrame, _pasangTimerPreviewFallback, previewFileInFrame,
  pesanLoadingPreview/pesanPreviewTidakTersedia.
- **Baru** `js/init/nav.js` — changePage, closeMobileMenu, toggleMobileMenu,
  logoutApp.
- **Baru** `js/init/boot.js` — DOMContentLoaded (tema awal + refreshDataDinamis
  + gerbang login admin) + listener click-outside.
- Body 71 deklarasi + 2 listener DOM dipindah **byte-identik** (verifikasi
  brace-matching — semua OK).
- `scripts/build-js.mjs` STACK: `/js/02_init.js` → 6 entri `js/init/*`.
- `js/02_init.js` **DIHAPUS** — module-map frontend 32 → **37 file / 353
  simbol** (total simbol TIDAK berubah). Bundel: `app-aa4fb559d5.js` →
  `app-7c1aea6337.js`, ukuran tetap **421.022 byte** (sama persis).

---

## Sesi 2026-08-16 — dikerjakan oleh: agus khoci (via Freebuff)

### Fase 2 langkah 3 — `js/03_engine.js` (856 baris) → `js/engine/*` — commit `ff6e947`

- **Baru** `js/engine/pipeline.js` (4 fn) — pipeline tahapan kandidat:
  tahapanPipeline (config dinamis + fallback 9 langkah), tahapanMatchIdx,
  getTahapanProgress, tahapanStepIndex.
- **Baru** `js/engine/dashboard.js` (6 deklarasi) — dashboard kandidat:
  evaluasiTahapanKandidat (tombol pemberkasan), renderJobDilamar (chip
  lamaran), konstanta `BERKAS_17`/`BIO_FIELDS_19`, renderProgresPemberkasan,
  kalkulasiProgress (bar progres + badge bronze/silver/gold/VIP/KELAS).
- **Baru** `js/engine/guards.js` (3 fn) — guard auto-refresh: adaModalTerbuka,
  sedangDiscrollTabel + updateMailBadge (semua badge mail + toast mail baru).
- **Baru** `js/engine/init.js` (2 fn) — mesin utama: refreshDataDinamis
  (tarik data super kilat, retry 1x, deteksi sesi basi) + initApp (boot
  dashboard admin/kandidat/publik, auto-refresh 60 dtk, theme & i18n).
- Body 15 deklarasi dipindah **byte-identik** (verifikasi brace-matching —
  semua OK di tepat satu modul).
- `scripts/build-js.mjs` STACK: `/js/03_engine.js` → 4 entri `js/engine/*`.
- `js/03_engine.js` **DIHAPUS** — module-map frontend 29 → **32 file / 353
  simbol** (total simbol TIDAK berubah). Bundel: `app-6a5a3721c6.js` →
  `app-aa4fb559d5.js`, ukuran tetap **421.022 byte** (sama persis).

---

## Sesi 2026-08-16 — dikerjakan oleh: agus khoci (via Freebuff)

### Fase 2 langkah 2 — `js/05_render.js` (1371 baris) → `js/render/*` — commit `e8445a7`

- **Baru** `js/render/public.js` (13 deklarasi) — filter/tab publik
  (renderPublicFiltered/UI, filterPublicData) + filter kelola loker
  (filterKelolaLoker, badge/jobDilamar publik).
- **Baru** `js/render/admin.js` (6) — adminSwitchTab, renderAdminFull,
  renderAdmin, filterDbJob, renderDbJobTable, badgeTahapanDb.
- **Baru** `js/render/candidate.js` (3) — tabel daftar kandidat admin:
  renderKandidatTable, filterKandidat, jobDilamarCell.
- **Baru** `js/render/share.js` (15) — seluruh modal Share Loker:
  shareLinkFor/bukaModalShare/toggleSharePreview/templateShareWa/
  updateSharePreview/copasShareWa/simpanDokumenShare dll + konstanta
  `SHARE_DOC_CHIPS` (SUMBER KEBENARAN chip share).
- **Baru** `js/render/mail.js` (10) — seleksi massal `MAIL_SELECTED`,
  konstanta MAIL_STATUS_KEYS/LABEL/STATE_OF/MAIL_BUCKET, renderMailFilterUI,
  renderFormInbox.
- Body 34 deklarasi dipindah **byte-identik** (verifikasi per-deklarasi via
  brace-matching — semua OK di tepat satu modul).
- `scripts/build-js.mjs` STACK: `/js/05_render.js` → 5 entri `js/render/*`.
- `js/xss-escape.test.js` (regresi XSS S1) di-update: membaca 5 modul render
  (dikonkatenasi) sebagai ganti file tunggal — assertion pola esc() tetap
  mencakup seluruh sink render (mail, kandidat, admin, loker publik).
- `js/05_render.js` **DIHAPUS** — module-map frontend 25 → **29 file / 353
  simbol** (total simbol TIDAK berubah). Bundel: `app-6113c31781.js` →
  `app-6a5a3721c6.js` (24 file), ukuran tetap **411.1 KB** (sama persis).

---

## Sesi 2026-08-16 — dikerjakan oleh: agus khoci (via Freebuff)

### Fase 2 langkah 1 — `js/07_api.js` (1696 baris) → `js/api/*` — commit `b7e6bd8`

- **Baru** `js/api/forms.js` (12 fungsi) — aksi mail inbox: reviewForm/
  approveForm/rejectForm/tandaiDibacaForm/deleteForm + patch-in-place
  `ALL_FORM`/`ALL_CANDIDATES`/`MAIL_SELECTED`.
- **Baru** `js/api/jobs.js` (12) — kelola loker: simpanJobBaru,
  editLokerFull, ubahStatusJob, hapusJobData, updateTahapanDbJob +
  upload pamflet/template (downscaleImageFile + uploadFilesDirectly) +
  `upsertJobMemory`/`removeJobMemory`.
- **Baru** `js/api/candidates.js` (32) — modal Input Kandidat Manual
  (cariKandidatManual/pilihKandidatManual/cekKandidatOtomatis), upload
  kandidat + baris dokumen lain dinamis (LAIN_JENIS_OPTIONS,
  renderLainRow, collectLainRows, guard ukuran/ekstensi), Super Edit
  Kandidat, upload revisi CV, QR loker lokal (buatQrDataUrl/aksiGenerateQr),
  filterCbx, pagination (fetchCandidatesPage/appendCandidates/
  ensureAllCandidates/muatLebihKandidat).
- **Baru** `js/api/wa.js` (10) — papan tugas & jadwal admin (tambahTugasAdmin,
  updateStatusTugas, hapusTugasAdmin, submitJadwal, prosesHapusJadwal) +
  memori `ALL_TUGAS`/`ALL_SCHEDULES`.
- Body fungsi dipindah **byte-identik** — verifikasi per-deklarasi via skrip
  Node (66 fungsi + 3 `window.*` assignment: semua OK di tepat satu modul).
- `scripts/build-js.mjs` STACK: `/js/07_api.js` → 4 entri `js/api/*`
  (global scope tetap di Fase 2 — urutan bebas, fungsi di-hoist).
- `scripts/module-map.mjs`: pemindaian frontend jadi **rekursif** (js/api/
  ikut diaudit — pola sama seperti backend `_lib` sejak Fase 1.3).
- `js/07_api.js` **DIHAPUS** — module-map frontend 22 → **25 file / 353
  simbol** (total simbol TIDAK berubah). Bundel: `app-d80b6b5088.js`
  (21 file) → `app-6113c31781.js` (24 file), ukuran 411.1 KB (sama).
- Verifikasi: node --check ✓ · lint 0 error/12 warn (baseline) ✓ · test
  81/81 ✓ · build idempotent ✓.

---

## 🆕 Sesi 2026-08-16 — dikerjakan oleh: agus khoci (via Freebuff)

### Fase 1.5 — Test backend per modul — commit `557c869` (test 51 → **81/81**)

- **Baru** `db/client.test.js` (12 test) — normalisasi WA (0xx→62xx, buang
  non-digit, format baku 628…), `normalizeStatus` (OPEN/CLOSE/URGENT),
  `normalizeGender` (PRIA/WANITA + fallback L/P).
- **Baru** `actions-auth.test.js` (6) — gate WA login/daftar
  (`isValidWaFormat`): terima 628+9/10 digit, **tolak 6223… (kasus
  SATRIA)**, terlalu pendek/panjang, non-digit.
- **Baru** `ai/chat.test.js` (3) — `normalizeBidang`: 7 bidang SSW +
  sinonim ID/EN (perawat lansia/caregiver/food/pertanian/dll), tidak
  dikenal → null (caller pakai BIDANG_DEFAULT).
- **Baru** `ai/providers.test.js` (3) — `parseJsonLoose`: JSON murni,
  markdown fence, teks di sekitar JSON, invalid melempar (bukan silent).
- **Baru** `actions-mail.test.js` (6) — `mailStatusUntukUpdate` (MENUNGGU
  vs UPDATE — progres LULUS/GAGAL tidak di-reset) + `appendFeedback`
  (maks 3 entri, yang lama dibuang). Kedua helper kini di-export dari
  `actions-mail.js` (dulu internal).
- 🐛 **BUG FIX `normalizeGender`** (ketahuan unit test): dulu `'L'` → L/P
  (tidak dikenal), `'P'` → PRIA, dan `'FEMALE'` → PRIA (substring `'MALE'`
  kena duluan) — semua TERBALIK dari konvensi L/P aplikasi
  (PARSE_SYSTEM_PROMPT di ai/classify.js: L = Laki-laki, P = Perempuan).
  Kini: L/M/MALE → PRIA; P/F/FEMALE/W/WANITA → WANITA. Satu-satunya
  pemakai `normalizeGender`: `actions-register` (display siswa baru) —
  tidak ada yang bergantung perilaku lama.
- Verifikasi: **test 81/81 lulus** (9 file) · lint 0 error/12 warn
  (baseline) · module-map backend tetap **34 file / 204 simbol** ·
  `node --check` bersih.

---

## 🆕 Sesi 2026-08-16 — dikerjakan oleh: agus khoci (via Freebuff)

### Fase 1.4 — `actions-ai.js` (1194 baris) → `_lib/ai/*` — commit `76de288`

- **Baru** `_lib/ai/providers.js` — lapisan provider Gemini + fallback model
  (`geminiGenerate`, `geminiParseFile`, `parseJsonLoose`).
- **Baru** `_lib/ai/cv.js` — master/CV auto-fill: `buildMasterNested`,
  `buildRingkasData`, `findMasterByWa` + `APPLY_WA_COLS`, konteks admin AI
  copilot (`getAdminAiContext`, `buildAdminAiCandidateSummary`), simpan data
  AI form (`submitDataAsj`) & tanda tangan (`simpanDataTtdNaitei`).
- **Baru** `_lib/ai/chat.js` — chat/copilot (Qween Jeklin, Jeklin admin, Dede
  Jeklin) + klaster wawancara SSW (`BIDANG_INTERVIEW`, `normalizeBidang`,
  `resolveProfilKandidat`, `buildInterviewSystem`, process/generate/selesaikan/
  simpan/get hasil wawancara).
- **Baru** `_lib/ai/classify.js` — parse dokumen biodata admin
  (`PARSE_MAX_BYTES`/`PARSE_ALLOWED_MIME`/`PARSE_SYSTEM_PROMPT` +
  `handleParseDokumenBiodata`).
- Body fungsi dipindah **byte-identik** — verifikasi per-deklarasi via skrip
  Node (27 deklarasi: semua OK di tepat satu modul; blok konstanta parse
  byte-identik). `requireRole` kini di-import dari `actions-auth` (dipusatkan,
  salinan lokal dihapus). `actions-ai.js` **DIHAPUS**; `handlers.js` route ke
  `aiChat`/`aiCv`/`aiClassify`; `storage.test.js` import `buildRingkasData`
  dari `ai/cv`.
- Verifikasi: node --check ✓ · lint 0 error/12 warn (baseline) ✓ · test 51/51
  ✓ · module-map backend **34 file / 204 simbol** (total tidak berubah) ✓ ·
  smoke: guard admin/kandidat sessionInvalid ✓, fallback AI tanpa key
  (pesan ramah, bukan crash) ✓.

---

## 🆕 Sesi 2026-08-16 — dikerjakan oleh: agus khoci (via Freebuff)

### Fase 1.3 lanjutan — agregat `supabase.js` DIHAPUS, migrasi semua pemakai ke `db/*` — commit `1893d9c`

- 17 file `_lib` (actions-*, candidate-helpers, storage) + 2 e2e + 6 scripts
  (dedupe, sync-idloker, audit-pasphoto, cleanup-job-misc, migrate-filecv-drive,
  scan-orphan-files) migrasi dari re-export agregat ke import `_lib/db/*`
  langsung (50 import terverifikasi).
- `netlify/functions/_lib/supabase.js` **dihapus** — backend 32 → **31 file /
  204 simbol** (total simbol tidak berubah).
- 🐛 Fix bug ekstraksi: `db/candidates.js` memiliki deklarasi **ganda**
  `findCandidateByWaFiltered` (parsing error lint) — duplikat dihapus.
- Verifikasi: node --check bersih · lint 0 error/12 warn (baseline) · test
  51/51 · module-map backend 31 file/204 simbol · dedupe dry-run 0 duplikat.

---

## 🆕 Sesi 2026-08-16 — dikerjakan oleh: agus khoci (via Freebuff)

### Fase 1.3 — `supabase.js` (1.073 baris) → `_lib/db/*` + agregat — commit `d6d8c76`

- **Baru** `_lib/db/` (7 modul repo):
  - `client.js` (13 export) — fondasi PostgREST: supabaseUrl/Key, supabaseJson,
    findTable, pick, toText, normalizeWa/Status/Gender, getSchema.
  - `jobs.js` (5) — mapJob, findJobs, lookup by kode, max kode job.
  - `forms.js` (7) — mail inbox: mapForm, parseDocs, findForms(+Light), per WA.
  - `candidates.js` (10) — mapCandidate, findCandidates(+Light/ByIds), query WA/ID/job,
    max id ASJ, attachApplications.
  - `berkas.js` — pemberkasan_checklist + `attachBerkasBio` + listStorageFolder
    (`fetchBerkasByWa` tetap internal — kontrak export PERSIS).
  - `master.js` — fetchMasterByWa / fetchMasterLightByWa.
  - `misc.js` (6) — queryPaged, admins, settings, announcements, assets, pengumuman.
- `supabase.js` → **re-export agregat** (spread 7 modul) — 18 pemakai
  (actions-*, storage.js, e2e) jalan tanpa perubahan. Ekstraksi **byte-identik**
  via skrip Node (`.freebuff/split-supabase.mjs`, bracket-matched `{}[]()` +
  assertion baris + verifikasi otomatis kontrak export).
- `scripts/module-map.mjs` diperluas: pemindaian `_lib` **rekursif** (subfolder
  `db/` ikut) — backend 25 → **32 file / 204 simbol** (total simbol TIDAK
  berubah, artinya tidak ada fungsi yang hilang/duplikat).
- **Verifikasi:** node --check ✓ · test 51/51 ✓ · kontrak export: 44 identik
  vs HEAD (0 hilang, 0 tambahan) ✓ · smoke data asli: findJobs 132 loker,
  findForms 14 mail, findCandidates 222 kandidat, findSettings 154 baris ✓ ·
  getAppData 349 ms cold / 0 ms warm (sama dengan sebelum split) ✓ · **E2E
  SEMUA LULUS**: login-check, backend-fast-path, upload-check, share-view,
  biodata-check, photo-check ✓

---

## 🆕 Sesi 2026-08-16 — dikerjakan oleh: agus khoci (via Freebuff)

### Fase 1.2 langkah 5 (TERAKHIR) — `actions-extra.js` DIHAPUS — modul storage/upload/drive — commit `dd9ccd5`

- **Baru** `_lib/storage.js` (166 baris) — helper Supabase Storage murni:
  `bucket`, `storageRequest`, `publicUrl`, `b64ToBuffer`, `mimeFromName`,
  `stemAliases`, `isVarianOf`, `hapusJenisVarian`, `uploadBase64`.
- **Baru** `_lib/actions-upload.js` (725 baris) — inti upload/apply:
  getUploadUrls, cekDataPelamar, isJobRequiresCv, submitApply,
  getExistingCandidateJsonByWa, simpanKandidatDanUpload,
  simpanBerkasTahapan, simpanRevisiKandidat + `FILE_LABEL_COLUMNS`/
  `fileLabelKey` + PII guard (`PUBLIC_PREFILL_FIELDS`/`pickPrefill`).
- **Baru** `_lib/actions-drive.js` (105 baris) — drive links & migrasi
  (getDriveLinkCandidates, uploadDriveReplacement, runMigration).
- `nextCandidateId` dipusatkan di `candidate-helpers.js` (dulu 3 salinan:
  extra/mail/master → kini 1); blok mail-sync (`MAIL_PENDING_STATUS`,
  `mailStatusUntukUpdate`, `appendFeedback`, `syncBiodataKeMail`,
  `syncFormMailDariUpload`) pindah ke `actions-mail.js` (domain mail).
- Body fungsi dipindah **byte-identik** via skrip Node (`.freebuff/`, aset +
  assertion batas); `actions-extra.js` **dihapus**; test lama di-rename
  `actions-extra.test.js` → `storage.test.js` (import ke `./storage.js`).
- **🐛 BUG FIX penting — ketahuan oleh E2E `upload-check`:** sejak langkah 4
  (`adadb30`) `actions-master.js` lupa mengexport `findMasterByWa` →
  `simpanBerkasTahapan` (upload pemberkasan kandidat), `submitApply`,
  `simpanRevisiKandidat`, `uploadDriveReplacement` semua dapat `undefined`
  dan gagal diam-diam. Dua bug senyap lain dari ekstraksi master juga
  diperbaiki: `syncBiodataKeMail` + `nextCandidateId` dipakai tanpa import
  (ReferenceError ditelan `try/catch` → update biodata master tidak pernah
  sinkron ke mail, insert master tanpa id_kandidat).
- Verifikasi: node --check ✓ · test 51/51 ✓ (storage.test.js 10 test) ·
  smoke guard 6 action + dispatcher upload.* (data asli read-only) ✓ ·
  **E2E SEMUA LULUS**: login-check, share-view, backend-fast-path,
  **upload-check full** (Storage + checklist + master + UI), biodata-check,
  photo-check ✓ · backend module-map **25 file / 204 simbol**,
  `actions-extra` tidak ada lagi.

---

## 🆕 Sesi 2026-08-16 — dikerjakan oleh: agus khoci (via Freebuff)

### Fase 1.2 langkah 4 — modul `actions-master.js` — commit `adadb30`

- **Baru** `_lib/actions-master.js` — domain master biodata/CV
  (`master_database_candidate`) utuh dari `actions-extra.js`: konstanta map
  kolom (`MASTER_FILE_COLUMNS`, `MASTER_COLUMN_MAP`, `SNAKE_TO_CAMEL`),
  helper nested/riwayat (`cleanKey`, `entryHasAny`, `mergeRiwayatArrays`,
  `buildMasterNested`), `findMasterByWa`, dan 4 handler (getMasterDataByWa,
  getDrafCvMaster, submitMasterForm, simpanUpdateMaster).
- Diekstrak **byte-identik** via Node (header baru + module.exports), perilaku
  tidak berubah. `findMasterByWa` tetap di-export untuk upload/drive di
  `actions-extra.js` (dipakai 4 titik).
- `isOwnerOrAdmin` (PII guard REVIEW.md M2) dipusatkan ke `actions-auth.js`
  (dulu definisi lokal di extra) — dipakai master + upload/apply.
- `actions-extra.js` 1956 → **±1560 baris**; 4 handler dilepas dari exports;
  dispatcher route ke `master.*`.
- Verifikasi: node --check ✓, test 51/51 ✓, smoke getDrafCvMaster (sesi
  kandidat → limited utk WA non-pemilik) + getMasterDataByWa (token invalid
  ditolak) + getAppData OK ✓, E2E login-check SEMUA LULUS ✓, backend
  module-map 22 → **23 file**, 204 simbol, cross-file `actions-extra` 14 → 12,
  `actions-master` modul bersih (crossFile 3).

---

## 🆕 Sesi 2026-08-16 — dikerjakan oleh: agus khoci (via Freebuff)

### Fase 1.2 langkah 3 — modul `actions-register.js` — commit `b5073d7`

- **Baru** `_lib/actions-register.js` (6 export) — siswa baru
  (`respon_siswa_baru`: `getDaftarSiswaBaru` publik tanpa PII, `submitDaftarSiswa`)
  + link & bridge form (`siteBase`, `getLinkSiswaBaru`, `generateFormBridge`,
  `generateLegacyMasterBridge`, `generateAiFormBridge`). Dipindah utuh dari
  `actions-extra.js` (perilaku identik).
- `actions-extra.js` 2100 → **1956 baris**; 6 handler dilepas dari
  `module.exports`; dispatcher `handlers.js` route ke `register.*`.
- Catatan: potongan drive & migrasi ditunda — `handleUploadDriveReplacement`
  butuh helper inti upload (`uploadBase64`, `FILE_LABEL_COLUMNS`,
  `findMasterByWa`) yang masih di `actions-extra.js`; akan dipisah bareng
  ekstraksi helper storage (Fase 1.2 lanjutan).
- Verifikasi: node --check ✓, test 51/51 ✓, smoke getDaftarSiswaBaru (3 baris)
  + getLinkSiswaBaru (NETLIFY_SITE_URL) + generateFormBridge + getAppData OK ✓,
  E2E login-check SEMUA LULUS ✓, backend module-map 21 → **22 file**, 204
  simbol, cross-file `actions-extra` 20 → 14.

---

## 🆕 Sesi 2026-08-16 — dikerjakan oleh: agus khoci (via Freebuff)

### Fase 1.2 langkah 2 — modul `actions-wa.js` + `actions-config.js` — commit `c611a60`

- **Baru** `_lib/actions-wa.js` (5 export) — template WA (`wa_templates`),
  `fonnteSend` (Fonnte API, pakai `FONNTE_TOKEN`), kirim satu pesan,
  tawaran massal. Dipindah utuh dari `actions-extra.js` (perilaku identik).
- **Baru** `_lib/actions-config.js` (4 export) — `CONFIG_TYPE_MAP` +
  `handleUpdateSysConfig` (sys_config) + preset rincian biaya
  (`rincian_presets`). Dipindah utuh.
- `actions-extra.js` 2370 → **2100 baris**; 8 handler dilepas dari
  `module.exports`; dispatcher `handlers.js` route ke `wa.*`/`config.*`.
- Catatan: smoke test pertama menggunakan bentuk argumen salah
  (`{action, payload}` sebagai arg-1 padahal handleAction(action,
  payload, token)) → hasilnya NOT_IMPLEMENTED yang juga `success:false`
  (false positive). Diulang dengan bentuk benar → guard admin terverifikasi
  (7 action ditolak `sessionInvalid`), `getRincianPresets` OK (4 kategori),
  `getAppData` OK.
- Verifikasi: node --check ✓, test 51/51 ✓, E2E login-check SEMUA LULUS ✓,
  backend module-map 19 → **21 file**, 204 simbol, cross-file `actions-extra`
  28 → 20.

---

## 🆕 Sesi 2026-08-16 — dikerjakan oleh: agus khoci (via Freebuff)

### Fase 1.2 langkah 1 — modul `actions-schedule.js` (jadwal & tugas) — commit `aec1e9f`

- **Baru** `_lib/actions-schedule.js` (165 baris) — `handleSimpanJadwalBaru`,
  `handleHapusJadwal`, `handleTambahTugasBaru`, `handleSetTugasStatus`,
  `handleHapusTugas` (jadwal `database_schedule` + tugas `database_tugas`),
  dipindah utuh dari `actions-extra.js` (perilaku identik, FIX legacy id tetap).
- `requireRole` dipusatkan di `actions-auth.js` (dulu diduplikasi di
  `actions-extra.js`); `actions-extra.js` kini import dari sana.
- `actions-extra.js` 2549 → **2370 baris**; 5 handler jadwal/tugas dilepas dari
  `module.exports`-nya; dispatcher `handlers.js` route ke `schedule.*`.
- Catatan tooling: `str_replace` gagal match di region tengah-akhir file 98 KB
  (batas ±baris 1000) — pemindahan blok dilakukan via edit bedah Node
  (terverifikasi tersimpan via read_files).
- Verifikasi: node --check ✓, test 51/51 ✓, smoke guard admin (jadwal/tugas
  ditolak tanpa sesi admin) ✓, E2E login-check SEMUA LULUS ✓, backend
  module-map 18 → **19 file**, 204 simbol, cross-file `actions-extra` 33 → 28.

---

## 🆕 Sesi 2026-08-16 — dikerjakan oleh: agus khoci (via Freebuff)

### Fase 1.1d — modul share + diagnostics, backend modular SELESAI — commit `ba68c49`

- **Baru** `_lib/actions-share.js` — `handleShareData`, `docTypeOf`, `docAge`,
  `TYPE_ALIAS`/`TYPE_TOKENS` (viewer TSK publik via GET). `share-data.js` kini
  require langsung ke modul ini; `handlers.js` re-export `handleShareData`/`docTypeOf`
  supaya `serve-static.mjs` tetap kompat.
- **Baru** `_lib/actions-diagnostics.js` — `handleGetAppConfig` (diagnostik,
  wajib sesi admin).
- **`handlers.js` 629 → 343 baris** — kini isinya: dispatcher + core murni
  (handleAction, rateLimitChecks, sessionIdentity, NOT_IMPLEMENTED, sets
  LOGIN/AI/FONNTE). Import tak terpakai dibersihkan (env/supabase/requireAdmin
  tidak lagi dipakai langsung).
- **Backend modular SELESAI**: 7 modul domain + helper (`actions-public/auth/job/
  candidate/mail/share/diagnostics` + `cache` + `candidate-helpers`) dari satu
  file 1.792 baris.
- Verifikasi: node --check, test 51/51, smoke share-data (TG591ASJ → 20
  kandidat) + getAppConfig OK, E2E login + share-view SEMUA LULUS, backend
  module-map 16 → **18 file**, 204 simbol. Perilaku identik (tidak ada logika
  yang diubah — hanya dipindah).

---

## 🆕 Sesi 2026-08-16 — dikerjakan oleh: agus khoci (via Freebuff)

### Fase 1.1c — modul job, candidate, mail — commit `da0ad38`

- **Baru** `_lib/actions-job.js` (274) — kelola lowongan: simpan/edit/status/
  hapus/tahapan/dokumen share/tandai gagal + JOB_COLUMNS/mapJobPayloadToRow/
  nextJobCode/getJobMapped.
- **Baru** `_lib/actions-candidate.js` (97) — updateCatatanKandidat,
  updateKandidatSuper, getCandidatesPage.
- **Baru** `_lib/actions-mail.js` (234) — handleFormStatus, nextCandidateId,
  syncCandidateDariForm, review/approve/reject/delete/tandai dibaca.
- `handlers.js` 1.413 → **629 baris** (dari 1.792 awal). Import tidak terpakai
  dibersihkan (bcrypt pindah ke mail; stripRaw/findCandidateByWa/loadCandidatesUnik
  tidak lagi dipakai langsung di handlers).
- Verifikasi: node --check, test 51/51, smoke wiring (job/candidate/mail OK,
  guard admin menolak token kandidat), E2E login SEMUA LULUS, backend-fast-path
  SEMUA LULUS, getAppData publik tetap 0 ms warm (132 jobs).
- Backend module-map: 13 → **16 file**, 204 simbol.

---

## 🆕 Sesi 2026-08-16 — dikerjakan oleh: agus khoci (via Freebuff)

### Fase 1.1b — modul auth + candidate-helpers — commit `74c6c8a`

- **Baru** `netlify/functions/_lib/actions-auth.js` — kluster auth dipindah dari
  `handlers.js`: `masterPins`, `requireAdmin`, `isValidWaFormat`,
  `handleCheckAdminMaster/Personal`, `handleLoginKandidat`, `handleDaftarKandidat`,
  `handleGantiPasswordKandidat`.
- **Baru** `netlify/functions/_lib/candidate-helpers.js` — `findCandidateByWa` +
  `CAND_WA_COLS` (dipakai lintas domain: auth, job, form) supaya tidak ada
  saling-require antar modul action.
- `handlers.js` berkurang lagi (1.413 → **±1.080 baris**); dispatcher auth
  memakai `auth.handleXxx`; `requireAdmin`/`masterPins` di-import balik.
- Verifikasi: `node --check` bersih, test 51/51, smoke auth (PIN master OK,
  KHOCI OK, PIN salah ditolak, WA typo ditolak gate), E2E login-check SEMUA
  LULUS, getAppData publik 335 ms cold / 0 ms warm (132 jobs).
- Backend module-map: 11 → **13 file**, 204 simbol. `bcrypt` tetap di handlers
  (dipakai handler kandidat lain, line 598).

---

## 🆕 Sesi 2026-08-16 — dikerjakan oleh: agus khoci (via Freebuff)

### Fase 1.1 (sebagian) + Optimasi performa getAppData — `handlers.js` dipecah — commit `b52cd50`

**Masalah (laporan user):** aplikasi mulai terasa lambat padahal baru 2-3 job uji coba.

**Diagnosis terukur (sebelum fix):**
- `getAppData` publik **1.518 ms** (79 KB) / admin **2.573 ms** (242 KB) — padahal payload kecil.
- Tes mentah: 3 query ke Supabase berurutan = **1.489 ms**, paralel = **297 ms**.
- Akar: latensi per-request ke Supabase ~300-500 ms + query inti (jobs/assets/settings)
  dijalankan **berurutan** di `handlers.js`, plus auto-refresh 60 dtk.
- Bukan masalah data besar: 132 job = 66 KB, kolom ringan, tanpa base64 raksasa.

**Fix (digabung dengan langkah modularisasi Fase 1.1):**
- **Baru** `netlify/functions/_lib/cache.js` — TTL cache in-memory (20 dtk, max 50 entry),
  versi "Redis" tanpa Redis (cukup untuk skala ASJ).
- **Baru** `netlify/functions/_lib/actions-public.js` — modul data publik: `handleGetAppData`
  + helper (DROPDOWN_MAP, parseConfigList, stripRaw, loadSchedules/Tugas/WaTemplates,
  dedupe/saring/loadCandidatesUnik) dipindah dari `handlers.js`. Query publik
  **diparalelkan** (`Promise.all` jobs/assets/settings) + **di-cache TTL**.
- `handlers.js` −573 baris (1.792 → ±1.230): jadi dispatcher + handler lain;
  `stripRaw`/`loadCandidatesUnik` di-import balik dari modul (dipakai handler lain).
- Dispatcher: `getAppData` → `publicData.handleGetAppData`. Perilaku TIDAK berubah.

**Hasil terukur (setelah fix):**

| Mode | Sebelum | Sesudah cold | Sesudah warm (cache) |
| --- | --- | --- | --- |
| Publik | 1.518 ms | **937 ms** | **0 ms** |
| Admin | 2.573 ms | **2.074 ms** | **1.661 ms** |
| Kandidat | — | 1.968 ms | 1.627 ms |

- Data identik (132 jobs, 50 kandidat, sessionInvalid false) — perilaku terjaga.
- `bun run test` 51/51 lulus; `node --check` bersih; E2E login + share + probe SEMUA LULUS.
- Backend module-map: 9 → **11 file**, 204 simbol; `actions-public.js` modul bersih
  (12 definisi, 1 dipakai lintas file). Baseline JSON di-`gitignore`d (` .freebuff/`).

**Catatan:** admin/kandidat masih ~1,6-2 dtk warm karena query khusus (berkas/forms/
jadwal) tetap berjalan — panel admin dipakai sedikit orang, prioritas rendah. Yang
paling penting untuk publik (dipakai SEMUA user) sudah 0 ms warm. Lanjutan
optimasi: cache admin TTL pendek, atau per-halaman split bundel (Fase 3).

---

## 🆕 Sesi 2026-08-16 — dikerjakan oleh: agus khoci (via Freebuff)

### Fase 0 REFACTOR — baseline modularisasi (commit `5305fdd` + dokumen baru)

**Setup sesi ini (sebelumnya, konteks):** env var 12 key dipasang di `.env.local`
(SUPABASE_URL/SERVICE_ROLE/ANON/STORAGE_BUCKET, ADMIN_MASTER_PIN, PIN_KHOCI,
ADMIN_NUMBERS, FONNTE_TOKEN, GEMINI_API_KEY, GROQ_API_KEY, LOG_DRAIN_TOKEN,
NETLIFY_SITE_URL). Verifikasi backend langsung: `getAppData` success (132 jobs),
`checkAdminMaster(123456)` OK, `checkAdminPersonal(khoci,4444)` OK. Preview
commands terpasang: install `bun install`, preview `node serve-static.mjs :3000`,
build `bun run build`.

**Dokumen baru:**
- `REFACTOR_TODO.md` — rencana 6 fase modularisasi (backend split → frontend
  split → ESM → i18n → HTML partial → build/tooling) + aturan main & larangan.
- `scripts/module-map.mjs` — alat audit dependensi GLOBAL classic scripts
  (frontend & backend), untuk memutuskan batas modul tanpa tebakan.

**Baseline terukur (2026-08-16):**

| Check | Hasil |
| --- | --- |
| `bun run lint` | ✅ 0 error, 12 warning (eqeqeq saja) |
| `bun run test` | ✅ 51/51 lulus (4 file: helpers_cv 24, xss-escape 12, actions-extra 10, handlers 5) |
| `bun run build` | ✅ idempotent — bundel `assets/app-d80b6b5088.js` 411.1 KB (21 file, hash `d80b6b5088`) |
| E2E `login-check` | ✅ SEMUA LULUS (login kandidat + admin, dashboard render) |
| E2E `share-view` | ✅ SEMUA LULUS (22 kandidat render, tanpa error JS) |
| E2E `modal-runtime-check` | ✅ SEMUA LULUS |
| E2E `probe-cleanup` | ✅ SEMUA BERSIH (0 callGAS, 0 request Google) |
| Chromium Playwright | `bunx playwright install chromium` + `install-deps` (libglib dll.) |

*Catatan: E2E `upload-check` / `biodata-check` / `photo-check` TIDAK dijalankan
(di-skip untuk baseline karena menulis data kandidat) — jalankan saat fase
refactor yang menyentuh alur upload/biodata.*

**Hasil module-map (baseline disimpan di `.freebuff/module-map-*.json`):**

- **Frontend:** 22 file JS, **353 simbol global**. File paling tergantung lintas
  file: `js/07_api.js` (13 cross-file), `js/02_init.js` (12), `js/08_wa_pintar.js` (5).
- **Kontrak global frontend** (dipakai ≥3 file — WAJIB di-export saat ESM):
  `safeSet`, `normalizePhone`, `trOption`, `trOptionId`, `renderAdminFull`,
  `bukaDigitalCV`, `adminSwitchTab`.
- **Backend:** 9 file _lib, **200 simbol**. `actions-extra.js` (2.549 baris)
  dipanggil 33× lintas file — target split terbesar Fase 1.
- **Kontrak global backend:** `findCandidateByWaFiltered`, `findCandidates`, `verifyToken`.
- **Kandidat dead code:** 14 (frontend) — `callNetlify` & `getApiUrl` di
  `api-client.js` **terkonfirmasi mati** (warisan GAS, 0 pemanggil); sisanya
  perlu verifikasi manual (beberapa false-positive: fungsi nested seperti
  `finalize`, atau global yang diakses via property seperti `LANG.xxx`).

**Cara deteksi regresi cepat (pakai baseline ini):**
```bash
node scripts/module-map.mjs           # harus ≤ baseline (353 simbol frontend)
node scripts/module-map.mjs --backend # ≤ 200 simbol backend
bun run lint && bun run test && bun run build
```
Kalau jumlah simbol/kontrak berubah drastis tanpa sengaja → ada global baru
(bocor scope) atau fungsi terhapus → cek sebelum lanjut.

---

## 🆕 Sesi 2026-08-16 — dikerjakan oleh: khoci89 (via Freebuff)

### Commit `f6dc1bb` — Fix: Simpan Final master-full error (id duplikat ktp)

- **Laporan user (screenshot live master-full):** klik Simpan Final → alert
  "Terjadi kesalahan sistem: Cannot read properties of null (reading 'length')".
- **Akar:** id `ktp` duplikat — NIK (`<input type="number">`) dan file upload
  KTP (`<input type="file">`). `getEl("ktp")` ambil elemen pertama (NIK) →
  `.files` null → `.files.length` TypeError saat simpan; tombol PILIH KTP juga
  salah sasaran (men-trigger input NIK).
- Fix di master-full.html: file input KTP di-rename `ktpFile` (3 tempat: input,
  tombol PILIH, pembaca fileKtp). NIK tetap `ktp`. Cek duplikat id di semua
  halaman: bersih.
- Verifikasi: node --check inline script OK; grep duplikat id NO_DUP.

### Commit `5e8f65e` — Fix: Chat Jeklin tanya TB/BB yang sudah ada di DB

- **Laporan user (screenshot live ai_form):** user tanya ukuran baju/sepatu/topi
  berdasarkan TB/BB → Jeklin malah bertanya "TB & BB berapa?" padahal di master
  sudah terisi (TB 165, BB 57).
- **Akar masalah:** `handleProcessAIChat` (actions-ai.js) menerima
  `payload.currentData` (dari auto-fill `getDrafCvMaster`) tapi **tidak pernah
  membacanya** — prompt AI hanya instruksi generik, jadi Jeklin buta terhadap
  data yang sudah terisi dan menanyakan ulang.
- Fix: helper `buildRingkasData(cur)` → ringkasan data terisi (identitas, fisik
  TB/BB/ukuran, medis, sertifikasi, pendidikan, pekerjaan, keluarga, wawancara)
  disuntik ke system prompt + aturan "JANGAN tanya ulang data yang sudah terisi".
  Data kosong (NIK/Paspor dll.) tetap tidak dilist sehingga Jeklin tetap bisa
  menanyakannya.
- Bonus: sapaan awal (`generateSmartWelcomeMessage` di ai_form.html) kini juga
  mendeteksi TB/BB kosong; key i18n `form.chat_missing_tb`/`_bb` (ID + JP).
- Verifikasi: unit test baru `buildRingkasData` (51/51 pass), `node --check`
  bersih, `bun run build:js` OK (bundle `app-d80b6b5088.js`).

### Commit `d0c1a71` — Fix: AI form gagal simpan ke Supabase + verifikasi auto-fill

- **Permintaan user:** "Ai form dan CV ai check apakah semua data bisa
  masuk dan save di superbase dan auto fill sudah benar ambil semua".
- **Temuan BUG:** `submitDataAsj` (ai_form.html) menulis
  `mode:'ai'` + `status:'SUBMITTED'` ke `ai_form_submissions` — ditolak
  CHECK constraint DB (hanya `AI_MASTER`/`MENUNGGU` diizinkan, HTTP 400
  23514) → **simpan AI form selalu gagal** walau chat/isi sukses.
  Dikonfirmasi lewat probe nilai constraint & round-trip sebelum fix.
- Fix di `netlify/functions/_lib/actions-ai.js`: `handleSubmitDataAsj`
  pakai `mode='AI_MASTER'`, `status='MENUNGGU'`, dedup existing disaring
  `submitted_via='ai_form'` (tidak menimpa baris interview).
- Verifikasi: round-trip WA tes → 8 seksi semua masuk ke Supabase +
  master `ai_data_json` ikut update; auto-fill browser dengan sesi
  kandidat asli → semua field terisi (nama/katakana/TTL/TB/BB/alamat/HP/
  email); tanpa sesi → subset identitas saja (by design REVIEW M2);
  `getMasterDataByWa` (master-full) → 140 kolom lengkap. Unit test 49/49,
  `node --check` bersih.

### Commit `8874164` — Sesi: pesan jelas + auto-login kokoh

- **Permintaan user:** "kok bermasalah terus sih kandidat sesi apa admin
  juga apa ga perlu sesi" → dijawab: sesi TETAP perlu (proteksi PII, admin
  vs kandidat); yang bermasalah dulu adalah bug integrasi (token tidak
  terkirim), bukan konsep sesi. User pilih opsi 1 & 2: pesan error jelas +
  auto-login.
- **callAPI** (api-client.js): saat backend balas `sessionInvalid`, tampilkan
  toast "Sesi admin/kandidat sudah berakhir, silakan login lagi" sebelum
  bersihkan storage & reload (dulu diam-diam).
- **refreshDataDinamis** (03_engine.js): guard auto-login — flag login
  'sukses' tapi token sesi/WA hilang → bersihkan + pesan jelas, bukan
  panggil API dengan token kosong (data kosong diam-diam).
- Auto-login sudah jalan (restore localStorage, token tanpa expiry).
- Verifikasi: login → reload → dashboard kembali ±3 dtk; token hilang &
  token palsu → dibersihkan + toast, tanpa error JS; login-check 20/20,
  unit 49/49.

---

## 🆕 Sesi 2026-08-16 — dikerjakan oleh: khoci89 (via Freebuff)

### Commit `ec24dba` — Form bridge paksa ke origin sendiri

- **Keluhan user:** di local preview "ga bisa check form" (AI master, master
  lengkap, lamaran, dll) — form selalu lompat ke situs lain.
- **Akar masalah:** backend `siteBase()` memakai env `NETLIFY_SITE_URL`
  (nilai lama `https://asjportal.netlify.app`) → semua tombol form
  (master-full/ai_form/apply-full/siswa-baru) menghasilkan URL ke situs
  live, bukan aplikasi yang sedang dibuka. Ini juga bug di live
  asjportal-379 (form menunjuk situs lama).
- **Fix:** helper `resolveSelfUrl(url)` di api-client.js — kalau origin
  hasil bridge beda dengan `window.location.origin`, ganti origin-nya
  (path/query tetap). Dipakai di `bukaFormBridge` & `bukaFormSiswa`
  (js/03_candidate.js).
- Verifikasi: klik "Form Master Lengkap" di preview → navigasi ke
  `http://localhost:3000/master-full.html?wa=...` (bukan situs live);
  master-full (154 input) & ai_form (85 input) render tanpa error JS;
  login-check & unit 49/49.

---

## 🆕 Sesi 2026-08-16 — dikerjakan oleh: khoci89 (via Freebuff)

### Commit `0bd05a6` — Jadwal muncul di kandidat + selector loker card progres + riwayat lamaran

- **Permintaan user:** (1) hapus tugas admin, (2) cek kode jadwal reminder
  Fonnte, (3) jadwal muncul di kandidat, (4) card "Umum" di dashboard
  kandidat diganti update biodata + loker terpilih, (5) card progres punya
  pilihan loker — klik code_job → tampil tahapan loker itu saja.
- **Bug: `mySchedules` tidak pernah dibangun backend** — getAppData mode
  kandidat hanya kirim candidates/kandidatRiwayat; frontend sudah render
  `k-dash-jadwal-box` sejak lama tapi selalu kosong. Kini dibangun
  (loadSchedules + filter: WA di daftar_kandidat ATAU loker lamaran
  kandidat) dengan format objek yg benar (agenda/status/waktu/lokasi/link).
- **Bug: `kandidatRiwayat` = objek kandidat, bukan lamaran** —
  renderRiwayatKandidat baca r.jobCode/r.kode/r.code; karena isinya objek
  kandidat, kode loker selalu kosong ("-") & card tidak bisa difilter.
  Sekarang = daftar applications (code/status/timestamp).
- **Card progres:** pill pilihan loker (chip per code_job, default loker
  LULUS/terbaru) — klik = kartu progres tahapan loker itu saja (tidak
  numpuk). Label kategori kosong tidak lagi "Umum" (fallback kode loker).
- **Kode Fonnte dicek (TANPA tes kirim):** `fonnteSend` benar — POST
  api.fonnte.com/send, header Authorization = FONNTE_TOKEN, body
  x-www-form-urlencoded target+message; `kirimSatuPesanFonnte` &
  `kirimTawaranMassal` (template {nama}/{job}/{link}) rate-limit
  FONNTE_ACTIONS. Catatan: fitur "reminder otomatis" tidak ada —
  database_schedule murni agenda; pengingat via WA tetap manual
  (kirim pesan/tawaran massal).
- **Hapus tugas/jadwal:** sudah berfungsi (lookup id_tugas|id lalu hapus
  by PK, termasuk baris legacy). Verifikasi e2e: tambah→hapus→
  "Tidak ditemukan".
- Verifikasi: mySchedules tampil via loker lamaran & via daftar_kandidat;
  chips 2 loker → klik → 1 kartu; login-check 20/20, modal-runtime 8/8,
  unit 49/49.

---

## 🆕 Sesi 2026-08-15 — dikerjakan oleh: khoci89 (via Freebuff)

### Commit `7260b93` — Wawancara AI jadi percakapan asli + hasil → admin → update biodata

- **Feedback user:** "Herlina itu siswa kelas lama, itu cuma contoh pertanyaan.
  AI sekarang wawancaranya b aja — saya pingin kayak wawancara ASLI, bukan
  nulis doc. Ide bagus: hasil wawancara dikeluarkan jadi doc, kirim ke admin,
  dipakai update biodata."
- **processAiInterview** (`actions-ai.js`): prompt diubah total → percakapan
  natural (sapaan hangat → jikoshoukai → 1 pertanyaan per pesan, follow-up
  menggali, reaksi manusiawi, TANPA nomor/daftar). Bidang SSW tetap konteks
  pertanyaan (kaigo/shokuhin/nougyou/dll).
- **Fix bug pra-ada:** `processAiInterview` tidak ada di `CANDIDATE_ACTIONS`
  api-client → `callAPI` tidak pernah kirim token kandidat → backend
  requireRole gagal (sesi invalid/reload di browser). Kini + `selesaikanWawancara`
  & `simpanHasilWawancara` masuk CANDIDATE_ACTIONS.
- **Alur hasil wawancara (baru):** tombol **SELESAI** di simulator →
  `selesaikanWawancara` (Gemini rangkum transcript → JSON {score, nilai,
  rekomendasi, biodata, catatan}) → `simpanHasilWawancara` (ai_form_submissions,
  `submitted_via='interview'`; mode/status pakai AI_MASTER/MENUNGGU karena
  CHECK constraint tabel) → admin lihat via **Hasil Wawancara** & terapkan via
  **Update Biodata** (submitMasterForm admin). Fallback marker `===HASIL===`
  di chat tetap ada.
- **Verifikasi in-process:** Q1 natural tanpa nomor; selesaikanWawancara →
  hasil score 6/C + 5 field biodata (nama, alamat, hobi, ssw, keahlianKhusus);
  simpan OK; getHasilWawancara admin OK; cleanup OK. Unit test **49/49**.

---

## 🆕 Sesi 2026-08-15 — dikerjakan oleh: khoci89 (via Freebuff)

### Commit `59c6fed` — Model wawancara AI per bidang SSW (14 pertanyaan gaya dokumen isian)

- **Permintaan user:** "Bikin model wawancara AI seperti ini tergantung SSW nya
  dia ambil apa" — contoh dokumen jawaban wawancara kaigo HERLINA (14
  pertanyaan: ID + romaji + panduan jawaban ID/romaji/kanji).
- **Backend** (`actions-ai.js`): `processAiInterview` kini resolve bidang SSW
  kandidat dari master/kandidat via WA (`resolveProfilKandidat`) lalu memakai
  model wawancara per bidang (`BIDANG_INTERVIEW`: kaigo/shokuhin/nougyou/
  kensetsu/jidousha/binbou/sougou + default) — 14 pertanyaan berurutan dengan
  romaji, pertanyaan khusus bidang, evaluasi per jawaban, skor akhir 1-10.
- **Backend** (`actions-ai.js`): action admin baru `generateWawancaraModel`
  (rate limit AI) — hasilkan DOKUMEN model wawancara lengkap per kandidat
  (WA/candidateId, bidang bisa di-override untuk kandidat yang belum
  terdaftar) siap disalin ke Google Sheet kandidat.
- **Frontend** (`js/09_ai_copilot.js`): simulator wawancara VIP auto-start
  (langsung tanya Q1 sesuai bidang, kirim `wa` sebagai konteks); bar AI
  copilot admin dapat tombol **Model Wawancara** + kolom **Bidang** (mis.
  Kaigo) — hasil model tampil di chat untuk disalin.
- **Verifikasi in-process** (preview sandbox sedang turun): Q1 simulasi
  "Hobi kamu apa? (Shumi wa nan desu ka?)" dengan catatan sensei; model
  Kaigo/Osaka lengkap 9,8 KB — 14 pertanyaan bernomor, romaji, kanji,
  instruksi "SILAHKAN ISI DI DRIVE INI". Unit test **49/49**.
- Catatan: HERLINA belum terdaftar di DB (222 kandidat, 0 nama Herlina) —
  model bisa dibuat dulu via kolom Bidang sebelum kandidat daftar.

---

## 🆕 Sesi 2026-08-15 — dikerjakan oleh: khoci89 (via Freebuff)

### Commit `5081693` — Admin parse dokumen biodata (upload CV/Excel/PDF → Gemini → update master)

- **Permintaan user:** "Khusus CV AI untuk panel admin kasih file attachment buat
  upload doc/Excel/PDF, parse isinya, extract buat masukin biodata & update ke
  kandidat — jangan ketik manual."
- **Backend** (`actions-ai.js`): action baru `parseDokumenBiodata` (admin-only,
  masuk `AI_ACTIONS` rate limit). Menerima `{candidateId|wa, file:{name,mimeType,
  data(base64)}}` → validasi mime (pdf/xls/xlsx/doc/docx/csv/txt/gambar) & ukuran
  (maks 8MB) → resolve target kandidat (candidateId → WA via
  `findCandidateByIdFiltered`) → Gemini `inlineData` ekstrak JSON kunci
  `MASTER_COLUMN_MAP` camelCase + array `pendidikan/pekerjaan/keluarga` →
  `{success, wa, namaSekarang, data, fieldCount, riwayat}`.
- **Backend** (`actions-extra.js`): `handleSubmitMasterForm` kini menerima sesi
  **admin** (sebelumnya hanya kandidat) → admin bisa langsung update biodata
  master dari hasil parse.
- **Frontend** (`js/09_ai_copilot.js`): bar upload di-inject ke `modal-admin-ai`
  (file input + WA target + tombol Parse & Update) — pilih file → parse otomatis →
  `submitMasterForm` → toast + ringkasan di chat. Partial modal tidak diubah
  (tetap satu sumber) — bar dibuat via JS di `pastikanBarParseAdminAi()`.
- **Verifikasi:** parse live OK — CV teks → 11 field (nama, furigana アグス・コチ,
  tglLahir, tb/bb, dll) + 1 pendidikan + 1 pekerjaan + 1 keluarga; guard admin
  `submitMasterForm` lulus (wa kosong → "Nomor WA wajib diisi." bukan
  sessionInvalid); unit test **49/49**; `node --check` + `build:js` bersih.
- Catatan: preview sandbox sempat turun saat verifikasi UI browser (infra),
  tapi jalur backend sudah dibuktikan via HTTP sebelum turun.

---

## 🆕 Sesi 2026-08-15 — dikerjakan oleh: khoci89 (via Freebuff)

### Commit `57ea59b` — Print CV rirekisho FIT 1 halaman A4

- Keluhan user: print CV rirekisho jadi **3 lembar** (dan CV render berbasis
  HTML→PDF, bukan Excel — template Excel "FORMAT CV" tetap terpisah).
- Akar masalah: **tidak ada CSS print sama sekali** → print ikut mencetak seluruh
  halaman web. Kini `@media print` khusus CV: hanya `#modal-preview-cv` yang
  tampil, lembar dipaksa A4 210×297mm margin 0, isi tabel dirapikan (font 9px,
  padding kecil, warna header tetap dicetak via print-color-adjust).
- Verifikasi (CV AGUS KHOCI): PDF A4 = **1 halaman** (`/Count 1`); emulasi
  media print `scrollHeight == clientHeight` di dua sumbu → **tidak terpotong**.
- `assets/main.css` rebuild, hash bump `4f2c8a1e73 → 8657590e50` (7 halaman).
- Juga diverifikasi jawaban pertanyaan user: tabel kandidat admin **sudah 1 baris
  per kandidat** — `getCandidatesPage` total 222 = 222 WA unik, 0 duplikat.

---

## 🆕 Sesi 2026-08-15 — dikerjakan oleh: khoci89 (via Freebuff)

### Commit `ecc1828` — Tes menyeluruh live + fix kritis export fetchMasterByWa

### Lanjutan: redeploy live + verifikasi ulang + tes lokal (semua hijau)

- User minta tes **semua modal & fungsi** di situs live (`asjportal-379`).
- **E2E live:** login-check **20/20**, modal-runtime-check **8/8**, share-view ✅
  (22 kandidat + dokumen ekstra), backend-fast-path **13/13**. Kegagalan awal
  bukan bug aplikasi: rate limit login 5/menit per IP (kena tes curl saya sendiri)
  dan asersi jadwal basi (fitur jadwal sudah dihapus → tabel boleh kosong).
- 🐛 **Bug kritis ditemukan:** `supabase.fetchMasterByWa is not a function` —
  fungsi `fetchMasterByWa` (baru di `c1433d2`) **tidak di-export** di
  `module.exports` supabase.js. Semua action lewat `findMasterByWa` rusak:
  `simpanBerkasTahapan` (upload pemberkasan → modal menutup tapi 0 tersimpan),
  `submitMasterForm`/`simpanBiodataLengkap`, `getDrafCvMaster`, `simpanRevisiKandidat`.
- **Fix 1 baris:** export `fetchMasterByWa` + `fetchMasterLightByWa`.
- **Verifikasi fix:** in-process `simpanBerkasTahapan` → `pemberkasan_checklist.ktp_url`
  tersimpan ✅, `getDrafCvMaster` (AGUS KHOCI) OK ✅, unit 49/49 ✅.
- Test e2e dirapikan: `login-check` (jadwal boleh kosong), `share-view` (tunggu
  render ±30 dtk — share-data lambat di cold start karena fetch Storage per
  kandidat).
- **Redeploy Netlify DIIZINKAN user** ("Redeploy") → `--skip-functions-cache` → live ikut
  `ecc1828`. Verifikasi ulang **live**: upload-check ✅ full (Storage + DB + master + UI),
  biodata-check ✅ full, `getDrafCvMaster` AGUS KHOCI lengkap (nama/katakana/alamat/foto/
  AIDATAJSON) → **auto-fill CV AI yang dilaporkan kosong sudah terisi** (akar masalahnya
  sama: `fetchMasterByWa` tidak di-export).
- **Tes lokal** (preview localhost:3000, env .env.local di-set dari nilai user): login-check
  20/20, modal-runtime ✅, share-view ✅ (22 kandidat), upload-check ✅ full, biodata-check
  ✅ full. Semua suite hijau di lokal & live.
- ⚠️ Fix **sudah live** — redeploy dicatat di DEPLOY.md §4.

---

## 🆕 Sesi 2026-08-15 — dikerjakan oleh: khoci89 (via Freebuff)

### Commit `beb294a` — Kebijakan GitHub main base & deploy Netlify wajib izin (DEPLOY.md)

- **Latar:** user punya akun Netlify baru (`nerazzurri190889@gmail.com`) dan minta
  deploy kode terbaru ke Netlify. Token `NETLIFY_AUTH_TOKEN` diberikan via chat.
- **Situs dibuat:** `asjportal-379` → https://asjportal-379.netlify.app
  (project `7e433a31-82cd-4afb-8d1b-f0391cabdd3e`, tim `asjamnag`). Nama `asjportal`
  sudah dipakai akun lama, Netlify memberi suffix `-379`.
- **12 env var dipasang** via Netlify CLI: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_ANON_KEY, SUPABASE_STORAGE_BUCKET, ADMIN_MASTER_PIN, PIN_KHOCI,
  ASJ_ADMINS, ADMIN_NUMBERS, SESSION_SECRET (acak), GEMINI_API_KEY, FONNTE_TOKEN,
  NETLIFY_SITE_URL (= URL baru).
- **Deploy produksi:** 237 file + 19 functions ✅ live.
- ⚠️ **Project baru privat by default** (Netlify sejak 2026-07-28) → homepage & API
  401 "Login Redirect". Tidak bisa diubah via API — user klik **Make public** di
  dashboard. Setelah itu semua hijau.
- **Review live:** homepage/admin.html/share.html HTTP 200; `checkAdminMaster` PIN
  benar → success, PIN salah → ditolak; `getDaftarSiswaBaru` (publik, PII aman);
  `getAppData` → 132 jobs + assets.
- **Aturan baru (permintaan user):** GitHub = **main base** (semua update/patch/
  revisi kode lewat repo); **Netlify DILARANG deploy kecuali diizinkan eksplisit
  pemilik** — setiap izin dicatat di `DEPLOY.md` §4. WORKFLOW.md §4 & AGENTS.md
  (checklist 8 + larangan) diselaraskan; `.gitignore` menambah `.netlify`.

---

## 🆕 Sesi 2026-08-15 (lanjutan) — dikerjakan oleh: khoci89 (via Freebuff)

### Commit `c1433d2` — Proyeksi kolom ringan master & inbox admin

Bottleneck berikutnya dipilih dari ukuran payload NYATA di Supabase produksi
(probe read-only):

- **Master ±6,5 KB/baris (154 kolom), 224 baris = ±1 MB** — `attachBerkasBio`
  menariknya `select *` untuk 50 kandidat halaman 1 = **±251 KB**. Sekarang
  `fetchMasterLightByWa()` dengan `MASTER_LIGHT_COLS` (hanya kolom
  BERKAS_COLUMNS/BIO_COLUMNS yang dibaca): **17,3 KB (hemat 93%)**.
  `fetchMasterByWa` select * TETAP untuk `findMasterByWa`/CV builder/
  ai_data_json (butuh baris penuh).
- **Inbox admin** `getAppData` memakai `findFormsLight()` (`FORM_LIGHT_COLS`):
  **22 KB → 3,9 KB (hemat 82%)**; urutan `timestamp.desc` tetap konsisten
  dengan `findFormByIndexFiltered` (rowIndex review/approve/reject/hapus).
  `findFormsByWaList` (getCandidatesPage & share-data) ikut light.
- **Pola aman**: proyeksi gagal (skema kolom beda) → fallback `select *` /
  scan penuh — perilaku lama tidak berubah.
- **Verifikasi**: `node --check` OK · unit 49/49 · probe live produksi:
  master 93% lebih kecil, form 82% lebih kecil, `mapForm` & `attachApplications`
  output identik light vs full, jumlah baris sama (50 master, 10 form).

Dokumen: REVIEW.md S2 di-update (checklist 56382b1 + c1433d2).

---

## 🆕 Sesi 2026-08-15 — dikerjakan oleh: khoci89 (via Freebuff)

### 1. Commit `56382b1` — Optimasi S2 lanjutan: daftar admin kandidat baris ringan + paginasi penuh

Bottleneck terakhir yang tersisa dari S2 (daftar admin `loadCandidatesUnik` masih
scan penuh `select *` + terpotong diam-diam di 300 baris):

- `findAllCandidatesLight()` (supabase.js): proyeksi kolom ringan (dedupe/filter/sort
  saja) dengan paginasi Range penuh tanpa batas 300 → payload ~5–10× lebih kecil.
- `loadCandidatesUnik(q, {page, pageSize})` (handlers.js): dedupe-by-WA + filter +
  sort di JS atas baris ringan, lalu `findCandidatesByIds()` hanya menarik baris
  PENUH untuk halaman yang diminta. Total = jumlah UNIK (pagination frontend
  konsisten). Fallback scan penuh lama kalau skema tabel tidak dikenal.
- `fetchPagedAll()` helper (loop Range 1000/halaman, `count=exact`).
- Probe read-only `scripts/probe-cols.mjs` & `scripts/probe-sizes.mjs`.
- Verifikasi: `node --check` OK, unit 49/49 hijau. Sudah di-push ke `main`.

### 2. Aturan jejak kerja: SIAPA & KAPAN wajib jelas (WORKFLOW.md §7 + AGENTS.md)

Aturan baru supaya riwayat tidak lagi ambigu (dulu ada commit dari akun berbeda
`khoci89` vs `ASJ OS DOKUMEN` di hari yang sama):

- Format pesan commit wajib `<Kategori>: <ringkasan>` + detail; dilarang pesan
  generik tanpa keterangan.
- Wajib cek `git config user.name/email` sebelum commit (identitas sesuai pengerja).
- Wajib update PROGRESS.md di akhir sesi dengan header: **tanggal + pengerja + hash commit**.
- Cara cek siapa/kapan terakhir: `git log -1 --format='%an | %ad | %s' --date=format:'%Y-%m-%d %H:%M'`

### Status riwayat saat ini (bukti siapa & kapan)

| Hash | Siapa | Kapan | Isi |
| --- | --- | --- | --- |
| `56382b1` | **khoci89** | 2026-08-15 19:15 | Optimasi S2 lanjutan: daftar admin baris ringan + paginasi penuh |
| `8f18bc3` | **khoci89** | 2026-08-15 18:54 | Optimasi S2: 39 scan penuh → query ter-filter |
| `d973794` | **ASJ OS DOKUMEN** | 2026-08-15 18:11 | Tambah AGENTS.md |

---

## SESI SEBELUMNYA — Lanjutan bottleneck: sisa scan penuh → query server-side (REVIEW S2)

Lanjutan optimasi "filter query Supabase SERVER-SIDE" (bagian 7 di bawah):
39 call `findCandidates()`/`findJobs()`/`findForms()` dipangkas ke ±15, sisanya
fallback (hanya jalan saat kolom/tabel tidak dikenal) atau memang harus penuh.

- **Helper baru `netlify/functions/_lib/supabase.js`** (kontrak `undefined` =
  fallback scan): `findJobByCodeFiltered`, `findCandidateByIdFiltered`,
  `findFormsByWa`, `findFormByIndexFiltered` (rowIndex inbox via `order`+`offset`),
  `findFormsByWaList` (in-filter WA-set), `findCandidatesByJobFiltered` (ilike +
  verifikasi token eksak di JS), `maxJobCodeNumber`.
- **Konversi ±24 call site** di `handlers.js`, `actions-extra.js`, `actions-ai.js`:
  aksi mail (review/approve/reject/hapus/tandai-dibaca → 1 baris by index;
  tandai-gagal & semua alur kandidat → hanya lamaran WA-nya), master & biodata
  (`findMasterByWa` via in-filter), simpan/upload berkas & revisi (lookup kandidat
  by WA/id via query), job (kode baru via `maxJobCodeNumber`, `getJobMapped`,
  validasi lamaran), share-data (job by code + kandidat by job + lamaran per
  WA-set).
- **Sengaja dipertahankan scan penuh**: daftar admin `loadCandidatesUnik`
  (dedupe-by-WA + urutan updated_at — butuh keputusan produk), inbox admin
  (formInbox penuh), loker publik, diagnostik `getAppConfig`,
  `handleGetDriveLinkCandidates`, `daftarKandidat` (deteksi tabel).
- **Bonus**: `e2e/backend-fast-path.mjs` memakai WA mentah (`0821…`) sebagai
  payload getAppData kandidat padahal token & frontend memakai bentuk
  ternormalisasi (`62821…`) → sesi dianggap tidak valid & 2 asersi gagal.
  Diperbaiki: pakai `login.wa` (normalisasi sama seperti `localStorage
  'asj_kandidat_wa'` di `04_auth.js`).
- **Verifikasi**: `node --check` 4 file · unit 49/49 · lint 0 error ·
  `format:check` bersih (4 file) · `e2e/backend-fast-path.mjs` 12/12 · live
  preview: `share-data?job=TG591ASJ`, `isJobRequiresCv`, `getAppData` sukses
  dengan data Supabase asli.

> ✅ Sudah di-commit `8f18bc3` & di-push ke `main`. Tinggal deploy ulang lewat
> Freebuff supaya live ikut versi ini.

---

## 🆕 SESI TERBARU — Perombakan UI solid + tema light/dark merata (`67bd3e0`)

Tujuan: tampilan **solid** (tanpa backdrop-blur/transparansi) supaya teks selalu
terbaca jelas di semua halaman & tema, dan menu samping ikut tema light/dark.

### Yang berubah

- **`.glass-panel` solid** — `background:#0d0d0d` (sebelumnya `#000000b3` +
  `backdrop-filter: blur(12px)`); semua tombol header/nav yang translucent
  (`bg-white/20` + blur) jadi solid (`bg-black hover:bg-zinc-800`,
  `border-white/60`); header tanpa `rounded-[2.5rem]`, overlay gradient tanpa
  rounding; tombol close-loader & shield admin `bg-red-600` solid; overlay
  share.html `rgba(30,41,59,0.97)` (sebelumnya 0.7 + blur).
- **Menu samping (hamburger) ikut tema** — `#mobile-nav-menu` memakai CSS
  variables `--mn-bg/--mn-surface/--mn-text/…`; `body.theme-light` menimpanya
  (src/main.css +596 baris, assets/main.css rebuild → `?v=4f2c8a1e73`).
- **Tema merata ke semua halaman mandiri** — `ai_form`, `apply-full`,
  `master-full`, `share`, `siswa-baru` kini punya `data-page` + inline theme
  script (`theme-light`/`theme-dark` di `<body>`); sebelumnya hanya index/admin
  yang ikut tema (menu samping halaman mandiri tidak pernah ter-tema).
- **Fallback banner/footer** — `DEFAULT_ASSETS` di `js/02_init.js`: banner/footer
  default dari Supabase Storage dipakai saat backend belum mengirim ASSETS
  (mis. preview tanpa backend) → banner & footer SELALU tampil.
- **Filter & tab publik solid per-tema** — warna tombol filter (`js/05_render.js`)
  dan tab Loker/Layanan (`js/01_public.js`) solid untuk tema terang & gelap;
  theme toggle light style solid (`bg-slate-100 … border-stone-300`).

### Verifikasi

- Build byte-identik dengan working copy; test 41/41; lint 0 error.
- Preview lokal (port 3100): halaman termuat, `getAppData` sukses dari Supabase
  asli (data job live), console bersih.

Catatan: aktif di produksi setelah **deploy ulang ke Netlify**.

---

## 🆕 SESI TERBARU — Dossier admin: tombol dokumen hilang di backend rebuild

Keluhan user: "ini fitur Netlify lama yang hilang di yang baru" — di modal ASJ
DOSSIER (modal CV admin) tombol **FORMAT CV / SERTIF JFT / SERTIF SSW** tidak
muncul walau data file-nya ada di DB.

### Akar masalah & fix

- Modal dossier membaca `c.jftUrl / c.sswUrl / c.cvUrl` (nama yang dikirim
  backend Netlify GAS lama), tapi `mapCandidate` di backend rebuild hanya
  mengembalikan `jft / ssw / fileCv` → kondisi `if (c.jftUrl && …)` selalu
  false → tombol permanen `hidden`.
- **Fix** (`netlify/functions/_lib/supabase.js`): `mapCandidate` kini menambah
  alias `jftUrl` / `sswUrl` / `cvUrl` (nilai = jft / ssw / fileCv). Konsumen
  lain (`07_api.js`) sudah punya fallback `jftUrl || jft`, jadi tidak ada yang
  rusak.
- **Verifikasi:** probe API `getCandidatesPage` (q=SUSILO) → ketiga alias
  terisi URL Storage; preview admin → dossier SUSILO HADI SAPUTRA (ASJ00217)
  menampilkan FORMAT CV / SERTIF JFT / SERTIF SSW, foto (PHOTOFILE) & CV
  (CVFILE) termuat dari Storage, console bersih. Test 41/41.

Catatan: aktif di produksi setelah **deploy ulang ke Netlify**.

---

## SESI SEBELUMNYA — Cek Data publik, CV rirekisho, z-index close, audit pas_photo

Rangkaian kerja terbaru (`1710865` → seterusnya), fokus: tombol publik yang
mati, CV rirekisho yang tidak lengkap (foto / alamat JP / tombol X), dan
konsistensi close modal + data foto kandidat.

### 1. Tombol "Cek Data" di landing publik — kini berfungsi (`1710865`)

- **Penyebab:** `getDaftarSiswaBaru` (fungsi `bridge-links`) butuh sesi admin,
  padahal tombolnya ada di landing publik. Pengunjung tanpa login dapat
  `sessionInvalid` → `callAPI` reload halaman → tombol terasa mati.
- **Fix:** endpoint jadi publik; **hanya kolom yang ditampilkan modal** yang
  dikirim (id, nama, gender, alamat) — WA/email/URL KTP-KK-ijazah tidak lagi
  bocor ke publik; urut `created_at` (baris legacy `timestamp` null).
- **Gender:** dinormalisasi ke `L`/`P`/`''`; badge "—" netral untuk yang belum
  diisi (sebelumnya apa pun yang bukan 'L' tampil P — YOGA/BAKTI jadi P).

### 2. CV rirekisho: foto tidak render, alamat JP hilang, tombol X mati (`17e6973`)

- **Foto:** `database_candidate.pas_photo` AGUS KHOCI menunjuk `PAS_PHOTO.jpg`
  yang sudah **tidak ada di Storage** (404); file benar `FOTOFILE_1786….jpg`
  ada di master. CV kini memakai `uploads.photo` (master) dulu, fallback ke
  pas_photo kandidat — berlaku untuk semua kandidat dengan pas_photo basi.
- **Alamat JP:** key mismatch — `buildMasterNested` membangun
  `identitas.alamatjp` (tanpa garis bawah) tapi builder CV mencari
  `identitas.alamat_jp` → nilai `alamatjp` master (terisi!) tidak pernah
  tampil. `v()` kini mencoba `ALAMATJP` → `identitas.alamatjp` →
  `identitas.alamat_jp`.
- **Tombol X modal CV:** ter-reproduksi — badge "MODE PREVIEW" / baris tombol
  cetak (`z-50 relative`, block full-width, DOM belakangan) **menutupi** X
  (`elementFromPoint` di titik X mengembalikan badge); z-index X dinaikkan ke
  `z-[100]`.

### 3. Seragamkan z-index tombol close semua modal (commit sesi ini)

- Semua **22 tombol close absolut** di `partials/modals-shared.html` kini
  `z-[100]` (sebelumnya tanpa z / `z-10` / `z-20`) supaya tidak ada konten
  modal yang bisa menutupinya. Tombol close inline di header (5) tidak perlu
  z-index (normal flow). Rebuild `assets/modals-shared.html`.

### 4. Audit & perbaiki pas_photo kandidat (commit sesi ini)

- Skrip baru **`scripts/audit-pasphoto.mjs`** (dry-run default, `--apply` +
  backup JSON ke `.freebuff/`): cek setiap `database_candidate.pas_photo`
  terhadap file yang benar-benar ada di Storage `master/` (paginasi penuh).
- **Eksekusi produksi:** 2 dari 223 kandidat rusak — AGUS KHOCI (id 40) &
  FIRMA ELGA PRATAMA (id 41), keduanya diperbaiki ke pas_photo master yang
  ada. Verifikasi ulang: **127 valid, 0 rusak**. Backup:
  `.freebuff/pasphoto-fix-backup-*.json`.

### 6. Migrasi file_cv ke Storage + rapikan fitur drive-links (`dd241fe`, `1113647`)

- **`migrate-filecv-drive.mjs`** (dry-run default, `--apply` + backup ke
  `.freebuff/`): sambungkan `file_cv` kandidat ke file CV **terbaru** di
  folder `master/<NAMA>/` (updated_at storage, fallback timestamp nama;
  deteksi CVFILE / `1. X_CV` / RIREKI).
- **Eksekusi 40 link Drive** (baris legacy 2026-08-01, era GAS): 40/40
  dimigrasi → **0 link Drive tersisa** di file_cv. Tombol CV di share view /
  dashboard kini membuka file Storage (SATORI → `CVFILE_…xlsx`).
- **Eksekusi 135 file_cv kosong:** hanya **AZWAR ADUBA** yang punya file CV di
  Storage (`nama_TG632ASJcv.xlsx`) → tersambung; 134 lain memang tidak punya
  CV di Storage (folder cuma foto/empty) — dibiarkan.
- **Fitur drive-links dirapikan:** (a) fix key mismatch — frontend baca
  `res.list` padahal handler mengembalikan `res.data` → fitur selalu kosong
  dan banner kuning tidak pernah muncul, kini `res.data || res.list`;
  (b) `folder_url` CITRA ANANDA (satu-satunya link Drive tersisa, file lama)
  di-clear karena dokumennya sudah di Storage → `getDriveLinkCandidates`
  kembali `0` → banner "kandidat Drive" otomatis tersembunyi.

### 5. Audit diperluas ke 4 kolom + fallback foto share view + audit di CI (`2f790ff`)

- **`audit-pasphoto.mjs`** kini memeriksa **pas_photo, file_cv, jft, ssw**
  kandidat terhadap file Storage `master/` dan memperbaiki ke nilai master
  sejenis (`pas_photo→pas_photo`, `file_cv→file_cv`, `jft→jft_url`,
  `ssw→ssw_url`; cocok via no_wa / id_kandidat). Hasil: **0 rusak**
  (pas_photo 127 · file_cv 48 · jft 79 · ssw 79 valid).
- **40 kandidat `file_cv` masih link Google Drive** (baris lama 2026-08-01,
  era GAS): file CV-nya **sudah ada di Storage** `master/` (CVFILE… /
  `1. NAMA_CV.xlsx`) — hanya kolom `file_cv` yang belum di-update ke URL
  Storage. Bukan "kembali ke Drive": backend 100% Supabase; tinggal migrasi
  kolom (fitur admin "Migrasi Berkas dari Google Drive" / skrip khusus).
- **Share view:** `share.html` kini `onerror` → placeholder ui-avatars saat
  foto 404; `share-data` fallback ke file foto folder master
  (PHOTOFILE/PAS_PHOTO/FOTO) saat pas_photo kandidat kosong/basi.
- **CI e2e-share:** step audit **dry-run** tiap push ke `main` (butuh secrets
  `SUPABASE_URL` & `SUPABASE_SERVICE_ROLE_KEY`; dilewati bila belum di-set).
  `run.md` mendapat bagian "Skrip maintenance".

---

## SESI SEBELUMNYA — dedupe data & dokumen, share view, storage cleanup, CI

Rangkaian kerja terbaru (`e36fb64` → `c6744b4`), fokus: hilangkan data/file ganda
agar "1 loker = 1 kandidat = 1 CV/JFT/SSW/foto", perbaiki share view, dan pasang
CI.

### 1. Kandidat duplikat di database — dihapus & dicegah (`e36fb64`)

- **Penyebab:** WA korup (`62135812198` vs `628135812198` kehilangan digit) +
  `simpanKandidatDanUpload` selalu membuat baris baru tanpa cek duplikat.
- **Fix:** upsert per WA (baris lama di-update, bukan bikin baru), validasi format
  WA (62 + 10/11 digit) di `simpanKandidatDanUpload` & `daftarKandidat`, fix
  search admin (`queryPaged` or=(…) tanpa kurung → HTTP 400).
- **Eksekusi (produksi):** 30 baris kandidat + 1 master duplikat dihapus
  (253 → 222 kandidat, master 1:1). Merge RIZKY/DEILA: kandidat kosong ASJ00156
  dihapus, master lengkap DEILA dipindah ke WA kanonik `628581541420`.

### 2. Multi-apply — kandidat boleh melamar banyak loker (`ee459c9`, `9035526`, `e534de5`)

- `submitApply` dedup per **(WA + job)**: job sama → update baris, job beda →
  baris baru (lamaran lama tidak lagi tertimpa).
- `attachApplications` melampirkan SEMUA lamaran per WA di `getAppData`
  (admin & kandidat) + `getCandidatesPage`.
- UI: badge job semua lamaran di dashboard kandidat & modal CV admin (chip `+N`
  di tabel), dropdown Job Dilamar di Edit Cepat (LULUS-first), peringatan
  multi-apply di `apply-full.html`.
- `scripts/sync-idloker.mjs` (dry-run default, `--apply`): 15 kandidat
  `id_loker_pilihan` disinkronkan ke lamaran LULUS terbaru.

### 3. share.html & endpoint `/api/share-data` (`f1a1f21`, `1f6eb68`, `2d7a46c`, `c6744b4`)

- Fungsi netlify `share-data.js` + `handleShareData` + route GET di preview
  (sebelumnya 404 → "Akses Ditolak").
- **extraDocs** kini dari folder master Supabase Storage (KK/KTP sync — 21/21
  kandidat TG633), bukan dari keterangan form yang kosong.
- **Dedupe per tipe dokumen + klasifikasi nama lawas** (`docTypeOf`):
  `1. X_CV.xlsx`/`nama_jft.pdf`/`X_PAS_PHOTO.jpg` dikenali, alias dinormalisasi
  (CVFILE→CV, PHOTOFILE→PHOTO, KARTU_KELUARGA→KK), CV/JFT/SSW/foto selalu tipe
  utama → **tiap kartu tepat 5 tombol (CV, JFT, SSW, KK, KTP)**, sama seperti
  produksi.
- `share.html` pakai klasifikasi kanonik yang SAMA + dedupe defensif di
  frontend (tampilan bersih walau backend lama belum di-deploy).
- Hapus aksi mati `superSyncCleanup` dari `api-client.js`; audit endpoint
  menyeluruh (tidak ada endpoint hilang lain).

### 4. Storage cleanup & upload yang menimpa (`bf140e0`, `b6ae9dd`, `abb5352`)

- `hapusJenisVarian` kini menghapus varian **bertimestamp** (`KTP_1786….pdf`),
  bukan hanya `KTP.ext` — upload baru selalu menimpa file lama per tipe
  (isVarianOf + unit test).
- `scripts/scan-orphan-files.mjs` (paginasi penuh + `--apply` + backup JSON ke
  `.freebuff/`): **195 file yatim dihapus dari `master/`** (25 varian-lama,
  153 `.keep`, 17 file folder test) — verifikasi 0 tersisa, share view utuh.
- `scripts/cleanup-job-misc.mjs`: audit `jobs/` & `misc/` — **77 file yatim di
  `jobs/`** (template CV 2026, pamflet/templateCv_TGxxxASJ lama, folder test).
  Dry-run siap; eksekusi menunggu konfirmasi.

### 5. CI / e2e (`.github/workflows/e2e-share.yml`)

- `e2e/share-view.mjs` (script npm `e2e:share`): cek API share-data + browser
  check best-effort; dijalankan vs produksi tiap push ke `main`.
- Fix `cache: npm` (repo tidak punya `package-lock.json`) → `npm install`;
  run CI hijau (contoh run 31865030810).

### Catatan deploy

- Data & storage sudah bersih di Supabase (berlaku untuk produksi).
- **Belum di-deploy ke Netlify** — backend baru (dedupe share-data, klasifikasi
  docTypeOf, upload menimpa) aktif di produksi setelah deploy ulang.

---

## ✅ SUDAH SELESAI

### 1. Patch-in-place: aksi admin instan (tanpa tarik ulang semua data)

Backend tiap aksi mengembalikan baris yang berubah; frontend menimpa di memori

- render tabel aktif saja. Tidak ada lagi global-loader/skeleton per klik.

| Aksi                                                        | File                                                                                                                                  |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Mail: review / LULUS / GAGAL / hapus / hapus massal         | `js/07_api.js` (patchFormMail, upsertCandidateMemory, removeFormMail) + `handlers.js` (handleFormStatus, handleDeleteForm)            |
| Kelola: ubah status loker, hapus loker, edit tahapan DB JOB | `js/07_api.js` (upsertJobMemory, removeJobMemory) + `handlers.js` (handleUbahStatusJob, handleHapusJobData, handleUpdateTahapanDbJob) |
| Kandidat: tombol Gagal di list kandidat                     | `js/11_admin_ops.js` (keluarkanKandidatDariJob) + `handlers.js` (handleTandaiGagalJob)                                                |
| Jadwal: tambah / hapus                                      | `js/07_api.js` + `actions-extra.js`                                                                                                   |
| Tugas: tambah / kerjakan / selesaikan / hapus               | `js/07_api.js` + `actions-extra.js`                                                                                                   |
| Badge mail terpusat                                         | `js/03_engine.js` (updateMailBadge)                                                                                                   |

Tarikan penuh (`getAppData`) masih jalan saat: load awal, pindah tab,
auto-refresh 60 dtk, dan aksi berat (buat loker/kandidat, upload revisi) —
itu sengaja.

### 2. Build CSS Tailwind hidup kembali

- `src/main.css` (tema + CSS custom + safelist kelas dinamis) → `assets/main.css`
- **WAJIB** `bun run build:css` setelah mengubah kelas Tailwind di HTML/JS.

### 3. Bersih total dari Google/Drive → 100% Supabase

- Semua URL `drive.google.com` / `lh3.googleusercontent.com` / `docs.google.com`
  dihapus (0 tersisa; satu-satunya Google = API Gemini di `actions-ai.js`).
- `gas-client.js` → `api-client.js`; semua halaman + sw.js pakai `callAPI()`.
- Fallback Google Docs Viewer di `share.html` diganti render lokal (SheetJS/mammoth).
- Satu hal yang PERLU dicek manual: demo assets di `_lib/demo.js` menunjuk
  `assets/logo_asj.png`, `tokyo_banner.jpg`, `tokyo_footer.jpg` di bucket
  `asj-files/assets` — pastikan file itu ada, kalau belum upload ulang.

### 4. Prettier + ESLint (sekarang benar-benar ada di repo)

- Config: `.prettierrc.json`, `.prettierignore`, `eslint.config.js`.
- Semua JS sudah diformat seragam (single quote, semi, 2-spasi).
- ESLint menemukan & sudah diperbaiki: **4 key duplikat di `i18n.js`**
  (`mf_masuk` tombol "Masuk" vs label bulan masuk; `ai_pekerjaan` header seksi)
  → dipisah jadi `mf_masuk_bulan` & `ai_pekerjaan_5`, pemakaian di
  `master-full.html` & `ai_form.html` di-update.### 5. Bundel JS: 20 script tag → 1 file
- `scripts/build-js.mjs` (idempotent) → `assets/app-<hash>.js` (minify esbuild).
- `admin.html` & `index.html` cuma 1 tag bundel; sw.js SHELL + VERSION ikut.
- Artefak Vite mati dihapus dari semua 7 halaman: stub `assets/*-DONYcaRI.js`,
  `main-DEfa6N4x.js`, dan `<link rel="modulepreload">` yang 404.### 6. Pecah HTML: semua modal bersama diekstrak + dimuat RUNTIME (on-demand)
- **Semua 30 modal** (146 KB) ada di `partials/modals-shared.html` (SATU sumber).
- `bun run build:html` kini **menyalin partial → `assets/modals-shared.html`** dan
  meng-inject **loader runtime** (bukan markup inline) di `admin.html`/`index.html`:
  loader sinkron (XMLHttpRequest) saat parse → modal tersedia SEBELUM
  `DOMContentLoaded`/kode aplikasi berjalan; ada retry + jaring pengaman
  `pointerdown` kalau fetch pertama gagal.
- **Efek: `admin.html` 253 KB → 107 KB, `index.html` 253 KB → 116 KB**
  (−146 KB markup modal per halaman — parse HP lebih ringan).
- `sw.js`: SHELL + precache `/assets/modals-shared.html`, dan VERSION ikut hash
  partial (`-m<hash>`) → SW otomatis refresh saat partial berubah tanpa ubah JS.
- `src/main.css` menambah `@source "./../partials/**/*.html"` supaya kelas di
  partial tetap ter-scan Tailwind (kelas modal TIDAK hilang dari CSS).
- 18 modal identik (85 KB) + 9 modal yang tadinya beda versi (146 KB total)
  dipindah ke `partials/modals-shared.html` (SATU sumber) → di-inject via
  `bun run build:html`. Hasil build byte-identik.
- **Rekonsiliasi 9 modal divergen**: diputuskan berdasarkan bukti, bukan tebakan
  - `rincian-builder` → versi INDEX (admin kehilangan `rb-catatan` yang DIBUTUHKAN
    JS `13_rincian_builder.js` → admin sebelumnya crash saat buka builder ini; kini diperbaiki)
  - `reject-mail` → versi ADMIN (superset: tombol instruksi PDF JFT/SSW)
  - `interview` → versi INDEX (`qween_jeklin.webp` branding baru)
  - `cv-mini`, `list-kandidat` → versi ADMIN (styling konsisten dengan app)
  - `admin`, `kandidat`, `cv`, `edit-kandidat` → versi INDEX (label/kosmetik)
- Sumber bug "ubah satu halaman, lupa yang lain" hilang untuk SEMUA modal.

---

## 🌐 URL PENTING (jangan lupa)

| Apa                                | URL                                                                    | Catatan                                                                                                                               |
| ---------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Netlify lama (produksi, aktif)** | `https://asjportal.netlify.app/`                                       | MASIH DIPAKAI user. Token akun netlify ini **tipis** — jangan deploy ke sini dulu. Rencana: pindah ke akun Netlify baru (email baru). |
| **Preview Freebuff**               | berubah tiap sesi — cek `freebuff-preview status` (field `previewUrl`) | Terakhir aktif: `https://3000-ed83aee3-c760-493b-82b4-a0c7f56d870e.daytonaproxy01.net`                                                |

> ⚠️ Setiap deploy Netlify baru WAJIB cek dulu: preview + e2e (`e2e/login-check.mjs`, `e2e/photo-check.mjs`, `e2e/probe-cleanup.mjs`) lalu bandingkan dengan `https://asjportal.netlify.app/`. Jangan pernah deploy ke akun lama tanpa persetujuan.

## 📊 Hasil verifikasi terakhir (preview vs Netlify lama) — commit `2b25a44`+

| Cek                                         | Preview (kode baru)                                                | Netlify lama (asjportal.netlify.app)                                                                   |
| ------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `e2e/login-check.mjs`                       | 🎉 SEMUA LULUS (19/19)                                             | 💥 **10 GAGAL** (login kandidat & admin macet, data tidak render)                                      |
| `e2e/photo-check.mjs`                       | 🎉 SEMUA LULUS (3/3, foto publik/kandidat/admin)                   | — (login macet, tidak bisa diuji)                                                                      |
| `e2e/modal-runtime-check.mjs`               | 🎉 SEMUA LULUS (8/8: modal shared via runtime, fix `rb-catatan`)   | — (kode lama, modal inline)                                                                            |
| `e2e/probe-cleanup.mjs`                     | ✅ **SEMUA BERSIH** — 0 GAS, 0 request Google, brand dari Supabase | ❌ `callGAS` MASIH ADA di 6 halaman + request Google (`lh3.googleusercontent.com`, `drive.google.com`) |
| Font JP (`fonts/noto-jp/*.woff2`, 120 file) | ✅ (di-restore dari deploy lama ke repo)                           | ✅ (file ada di deploy)                                                                                |

Kesimpulan: keluhan di situs lama ("login sukses tapi data kosong / progress 0 / call gas masih jalan")
terbukti dari data: Netlify lama masih pakai GAS + gambar dari Google/drive, dan login-nya macet.
Preview kode terbaru bersih total. **Jangan deploy ke akun lama** — lanjut rencana akun Netlify baru.

### 7. Optimasi kecepatan ambil data — filter query Supabase SERVER-SIDE

(commit `15d2b56`+, file: `netlify/functions/_lib/supabase.js` + `handlers.js`)

Sebelumnya beberapa alur menarik ±300 baris `select *` lalu menyaring di JS:

| Alur                                                      | Sebelum                                 | Sesudah                                                                             |
| --------------------------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------- |
| Login kandidat / cek WA / approve-reject / ganti password | `findCandidates()` 300 baris penuh      | `findCandidateByWaFiltered()`: query `no_wa=eq.X` (atau `wa`/`whatsapp`), 1-5 baris |
| getAppData **mode kandidat** (dashboard kandidat)         | 300 baris untuk cari 1 baris sendiri    | query targeted by WA                                                                |
| `attachBerkasBio` (admin load + tiap halaman kandidat)    | scan 500 baris pemberkasan + 500 master | filter `wa.in.(...)` per daftar WA kandidat (max 150)                               |
| Hapus loker (cek kandidat terkait)                        | scan 300 baris                          | `select=id&id_loker_pilihan=eq.X&limit=1`                                           |
| `nextCandidateId` (approve → kandidat baru)               | scan 300 baris cari max                 | `select=id_kandidat&order=desc&limit=5`                                             |
| getAppData admin (jadwal/tugas/mail/template)             | 5 fetch berurutan                       | `Promise.all` paralel                                                               |

Setiap jalur cepat punya **fallback ke perilaku lama** kalau skema kolom berbeda
(balikan `undefined` → scan penuh), jadi aman untuk skema DB apa pun.

> ✅ **Verifikasi (langsung ke handler + Supabase asli)** — `e2e/backend-fast-path.mjs`
> 12/12 lulus: login kandidat (jalur cepat), getAppData kandidat (1 baris miliknya
>
> - berkas ter-attach via filter WA-set), getAppData admin (50 kandidat halaman 1 +
>   formInbox/schedules/tugas/waTemplates + berkas), gantiPassword jalur cepat.
>   Read-only: `maxCandidateIdNumber` → max=224, `countCandidatesForJob` → false,
>   `findCandidateByWaFiltered` → null (definitif). Unit test 16/16.
>   Browser e2e penuh belum bisa tuntas karena sandbox preview crash berulang
>   (502/". Is the Sandbox started?") — TEST 1 (getAppData publik) lulus 2× dgn
>   kode baru. Saat preview stabil, jalankan suite e2e sekali lagi.

### 8. Perbaikan bug kecil (commit setelah QR/auto-centang/i18n)

| Bug (laporan user)                                        | Status               | Catatan                                                                                                                                                                                                                     |
| --------------------------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **QR card dashboard / QR loker error**                    | ✅ DIPERBAIKI        | QR dulu pakai `api.qrserver.com` eksternal → sekarang **lokal** (`vendor/qrcode-generator.min.js`, data URL). Student card (`sc-qr`) & modal QR loker ikut; server bridge tidak lagi kirim URL eksternal. Offline/PWA aman. |
| **Dropdown kota/gender belum id-jp**                      | ✅ DIPERBAIKI        | `master-full.html`: opsi gender/agama/status nikah kini `data-lang` (ID: Laki-laki/Perempuan… JP: 男性/女性…) via `renderLanguageLight`.                                                                                    |
| **Auto-centang aksi review/approve/reject**               | ✅ DIPERBAIKI        | Baris mail yang baru diproses otomatis ter-centang (`MAIL_SELECTED`) → tinggal hapus massal. **Hapus mail HANYA menghapus baris `database_asj_form` — data kandidat & master TIDAK ikut terhapus.**                         |
| Gak bisa hapus jadwal                                     | ✅ SUDAH (cek ulang) | Handler cari `id_jadwal` ATAU `id` lalu hapus via PK; `hapusJadwal(FAKE)` → "Jadwal tidak ditemukan." (lookup OK).                                                                                                          |
| Papan tugas tanpa hapus                                   | ✅ SUDAH (cek ulang) | Tombol hapus tugas sudah ada; `hapusTugas(FAKE)` → "Tugas tidak ditemukan." (OK).                                                                                                                                           |
| Loker publik "Lamar" harus tetap CLOSED saat proses jalan | ✅ SUDAH             | `jobTutupUntukLamar` menutup lamar saat tahapan seleksi berjalan (CHECK KAIWA → … → FLIGHT) walau status kolom belum CLOSE.                                                                                                 |
| Link buka tab browser bukan PWA (Dossier/Master/AI)       | ✅ SUDAH             | `bukaFormBridge` pakai `window.location.href` (tab sama, tetap di PWA).                                                                                                                                                     |
| Tombol Gagal di list kandidat tidak menggugurkan          | ✅ SUDAH             | `tandaiGagalJob` mengembalikan candidate+form → patch-in-place sinkron.                                                                                                                                                     |

### 9. Helper validasi upload SERAGAM (format + ukuran) di semua form

(commit setelah QR/auto-centang/i18n; file: `js/upload-guard.js`)

Sebelumnya tiap form punya cek sendiri-sendiri & ada yang TIDAK punya sama sekali
(admin: template/pamflet/revisi tidak divalidasi; apply-full tidak cek format):

| Form upload                                            | Sebelum                               | Sesudah                                                            |
| ------------------------------------------------------ | ------------------------------------- | ------------------------------------------------------------------ |
| Admin: template CV, pamflet, file revisi               | ❌ tanpa validasi                     | ✅ `onchange="cekUploadFile(...)"` (format dari `accept` + ukuran) |
| `ai_form.html` (pas foto + JFT/SSW/KTP/KK/ijazah/UNIV) | cek ukuran saja, format baru di akhir | ✅ guard di `compressImage` (10 MB) & `handleDocUpload` (3 MB)     |
| `apply-full.html` (photo/CV/JFT/SSW/ekstra)            | cek ukuran 2 MB, tanpa cek format     | ✅ guard di `handleFile` (mencakup semua + dokumen ekstra dinamis) |
| `master-full.html` (9 dokumen)                         | cek 2 MB + ekstensi (manual)          | ✅ guard seragam di `handleFile`                                   |
| `siswa-baru.html` (KTP/KK/ijazah)                      | cek 3 MB + ekstensi (manual)          | ✅ guard seragam di `handleDocUpload`                              |

**Cara kerja `cekUploadFile(input, { maxMb })`:**

- Format dicek dari atribut `accept` (`image/*` diperluas ke jpg/jpeg/png/gif/webp/bmp).
- Ukuran dicek dari argumen `maxMb` / `data-max-mb` / default 5 MB (base64 +30% tetap muat).
- Gagal → `alert` pesan jelas (format yang diizinkan + batas MB, i18n ID/JP, fallback ID),
  input di-reset, return false. Sukses → return true (alur lama jalan normal).
- Dipakai admin/index via bundel (build-js STACK) + 4 halaman standalone via
  `<script src="/js/upload-guard.js?v=1">`.

Verifikasi: bundel 21 file memuat guard; 32/32 input `type="file"` ter-guard; test 16/16;
format:check bersih; lint 0 error.

### 10. AI Master (ai_form.html) — perbaikan iPhone: kolom chat hilang/"puter-puter"

Keluhan: di iPhone kolom chat susah terlihat & tampak berputar/berpindah sendiri.
Penyebab & fix di `ai_form.html`:

1. **`100vh` vs URL bar Safari** — `100vh` di iPhone termasuk area di belakang URL
   bar → kolom chat (terutama bar input) terpotong di bawah layar. Sekarang pakai
   **`100dvh`** (dengan fallback `100vh` untuk browser lama) di `#chatPanel`,
   `#formPanel`, dan `<body>` (inline `height:100vh;height:100dvh`).
2. **`resize` memaksa pindah tab tiap scroll** — Safari iPhone memicu `resize`
   setiap kali URL bar naik/turun saat scroll, dan `handleResize()` lama memanggil
   `switchTab('chat')` → layar "puter-puter" (lompat balik ke tab chat) dan
   pengguna di tab Preview CV dilempar ke Chat. Sekarang `handleResize` hanya
   bereaksi saat **menyebrang breakpoint md** (mis. rotasi layar) dan kembali ke
   **tab terakhir yang aktif** (`lastMobileTab`), bukan paksa 'chat'.
3. **Safe-area iPhone** — bar input chat diberi `padding-bottom:
max(0.75rem, env(safe-area-inset-bottom))` supaya tidak tertutup home-indicator
   (`viewport-fit=cover` sudah ada).

Verifikasi: 2 blok inline script lolos `node --check`, test 16/16, format:check
bersih, build idempotent (hanya `ai_form.html` berubah). Belum dicek visual di
browser (sandbox preview tidak stabil) — perilaku sama untuk desktop (`md:flex`
side-by-side) & Android; fix khusus jalur mobile.

---

## ⏳ BELUM SELESAI

1. **Preview visual belum diverifikasi** (tool preview tidak tersedia di sesi
   pengerjaan) — terutama: modal masih terbuka normal di admin & index, dan
   offline mode (SW precache) tetap jalan. Saat pertama buka setelah deploy:
   **hard refresh sekali** (VERSION SW baru otomatis buang cache lama).
   (SW version baru otomatis buang cache lama).
2. **Deploy ke Netlify belum** — sesuai keputusan tim: tunggu sampai semua fix
   beres dulu (token free tier tipis).
3. **Demo assets cek manual** (lihat #3 di atas).
4. Sisa `refreshDataDinamis` di aksi berat (`simpanJobBaru`, `editLokerFull`,
   `simpanKandidatDanUpload`, sync 3-way, upload revisi) — bisa di-patch
   berikutnya kalau dirasa masih lambat.

---

## Command yang dipakai

```bash
bun install
bun run build        # CSS + JS (WAJIB setelah ubah kelas Tailwind / file JS)
bun run build:css    # hanya CSS
bun run build:js     # hanya bundel JS (setelah ubah js/, api-client.js, i18n.js, pwa.js)
bun run format       # prettier semua (kecuali assets/vendor/*.html)
bun run format:check
bun run lint         # ESLint — error = bug nyata, warning = gaya
bun run test         # Vitest (41 tes)
```

## Catatan untuk AI assistant (biar tidak muter-muter baca code)

- **Struktur**: classic scripts global scope — fungsi lintas file saling panggil.
  Frontend JS di-bundel jadi `assets/app-<hash>.js`, jadi kalau mengubah JS
  **wajib `bun run build:js`** sebelum selesai.
- Lokasi logika: render admin `js/05_render.js`, aksi backend
  `netlify/functions/_lib/handlers.js` + `actions-extra.js`, DB helper
  `_lib/supabase.js`, i18n `i18n.js` (hati-hati key duplikat!).
- Saat minta fix, sebutkan file + fungsi spesifik — menghemat baca ulang.
