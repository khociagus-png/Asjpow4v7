# PROGRESS2.md — Status Pekerjaan ASJ Portal (sesi terbaru)

> **File ini adalah kelanjutan `PROGRESS.md`** (yang lama disimpan sebagai legacy —
> riwayat sesi 2026-08-15 s/d awal 2026-08-17 ada di sana, dibaca kalau butuh
> konteks lama). Mulai sesi ini, entri baru dicatat DI SINI supaya file riwayat
> tidak terus membengkak. Lihat juga `CHANGELOG2.md` untuk riwayat per commit.

**Update terakhir:** sesi 2026-08-18 — dikerjakan oleh **codebuff** (via Freebuff) — fix bug `tandaiDibacaForm` + chip versi footer + investigasi "Undangan Wali" & konfirmasi SW auto-update.

---

## 🆕 Sesi 2026-08-18 — dikerjakan oleh: codebuff (via Freebuff) — fix bug tandaiDibacaForm + chip versi footer + investigasi Undangan Wali

### 🐛 Fix "Gagal! Aksi tidak dikenal: tandaiDibacaForm" (dari screenshot pemilik)

- Akar masalah: handler backend ADA (`actions-mail.handleTandaiDibacaForm`, terdaftar di `action-registry.js`), tapi action TIDAK ada di peta routing frontend `NETLIFY_FUNCTIONS` (`api-client.js`) → `callAPI` menolak sebelum request terkirim. Juga tidak ada di `ADMIN_ACTIONS` → token sesi admin tidak dikirim.
- Fix: `tandaiDibacaForm` ditambahkan ke `ADMIN_ACTIONS` + `NETLIFY_FUNCTIONS` (`→ 'candidates'`, satu function dengan reviewForm/approveForm/rejectForm/deleteForm).
- **Kontrak test diperkuat** (`action-registry.test.js`): test baru — setiap `callAPI('x')` frontend wajib punya route di peta `NETLIFY_FUNCTIONS` (di-parse dari sumber karena peta PRIVATE modul). Bug kelas ini (handler backend ada, route frontend hilang) tidak akan lolos lagi. **149/149 vitest**.
- Terverifikasi di preview: `callAPI('tandaiDibacaForm')` kini dieksekusi (bukan "Aksi tidak dikenal" lagi).

### 🐛 Chip versi di footer hilang ("ga sync antar team")

- Akar masalah: `pasangPenandaVersi` (pwa.js) menempel badge `.asj-ver-badge` ke `[data-lang="footer.copyright"]`, lalu `renderLanguage` (`01_public.js`) / `renderLanguageLight` (`i18n/core.js`) menimpa elemen itu dengan `el.innerHTML = text` → badge terhapus tiap render bahasa. Jadi chip versi TIDAK PERNAH tampil di footer (bukan masalah cache/SW).
- Fix: kedua fungsi render bahasa mempertahankan child `.asj-ver-badge` saat mengganti innerHTML. Terverifikasi di preview: `ve185a7dd30` tampil di footer (bundel `app-e185a7dd30.js`).

### 🔍 Investigasi "Undangan Wali" — kok beda? (fitur vs template)

- **"Undang Wali" = FITUR Undang Grup Kelas** (commit `10a45bc`): modal di admin, pesan default **HARDCODED** di `js/admin_ops/candidates.js` (`DEFAULT_PESAN_UNDANGAN_KELAS` — "pengurus LPK AMANAH SAKURA JAPAN PONOROGO … bergabung ke grup WhatsApp resmi kelas … {link_grup}"), dikirim via `kirimTawaranMassal` (`customMessage`). Fitur ini TIDAK membaca tabel `wa_templates`.
- **Template DB "Undangan Wali"** (di-seed 2026-08-18 atas permintaan awal pemilik, `wa_templates` 2→3) isinya BEDA ("PT Amanah Sakura Japan … hadir dalam pertemuan orang tua/wali") dan HANYA dipakai panel **Kelola Template WA Pintar** (kirim pesan manual via template). Jadi isi berbeda karena memang dua hal yang berbeda.
- **Resolusi (setelah pertanyaan lanjutan pemilik "kok gak sama fitur wa undang wali")**: template seed "Undangan Wali" **DIHAPUS dari DB** (`WA1787018018630169` — isi karangan saya, tidak dipakai fitur mana pun, cuma bikin dobel dengan legacy `WA-001`). DB `wa_templates` kembali ke 2 template asli (`WA-001` "Undangan Grup Default" — dipakai tombol "Undang Grup" via fallback server, dan "PEMBERITAHUAN GA LOLOS SCREENING"). `scripts/seed-wa-templates.mjs` ikut dihapus (anti `--apply` ulang).

### ✅ Konfirmasi SW auto-update — SUDAH AKTIF

- `pwa.js`: register `updateViaCache:'none'` (selalu cek sw.js ke jaringan); cek update saat load + tiap 60 dtk + saat tab fokus/visible; `SKIP_WAITING` saat SW baru terpasang; auto-reload saat `controllerchange`/pesan `ASJ_FORCE_RELOAD` (ditunda kalau user sedang interaksi); jaring pengaman self-check VERSION (fetch `/sw.js?v=` per session, reload sekali kalau berubah).
- `sw.js`: `self.skipWaiting()` PALING AWAL di install; `VERSION` di-patch otomatis tiap build; cache lama di-purge saat activate.
- Catatan: di localhost & host preview Freebuff SW sengaja TIDAK didaftarkan (anti cache nyangkut) — auto-update berlaku di production Netlify.

### ✅ Verifikasi

prettier bersih · lint 0 error (12 warning eqeqeq lama) · **149/149 vitest** · check:globals nol kolisi · check:i18n OK · build → bundel `app-e185a7dd30.js` · preview: chip versi tampil di footer, `tandaiDibacaForm` tidak lagi "Aksi tidak dikenal".

---

## 🆕 Sesi 2026-08-18 — dikerjakan oleh: codebuff (via Freebuff) — Fase 5 lanjutan + sourcemap/laporan bundel

### 🧩 Fase 5 lanjutan — duplikat head/theme-init halaman standalone di-partial-kan

- **`partials/head-shared.html`** — fonts trio (font-awesome + fonts.css + preload) yang duplikat di 5 halaman standalone, dengan token `{{INDENT}}`/`{{FA_ATTR}}`/`{{FA_ATTR2}}` (satu-satunya varian antar halaman: indent 2/4 spasi + urutan atribut link FA di share). **`partials/theme-init.html`** — script inisialisasi tema (identik 5×, tanpa token). Marker `<!--HEAD_SHARED_START/END-->` + `<!--THEME_INIT_START/END-->`; `build:html` meregenerasi per build (byte-compat + idempotent terverifikasi). Sisa head (title/meta/PWA/style inline) sengaja tetap per-halaman — konten memang berbeda (kendala byte-compat).

### ⚙️ Sourcemap bundel + laporan ukuran per-modul

- **`build-js.mjs` 2-pass**: pass 1 = kode+hash (write:false, perilaku lama), pass 2 = `sourcemap:'linked'` dengan write:true → `assets/app-216286d90f.js.map` external (**1.0 MB**, 81 sumber; tidak di-precache SW; bundel tetap 422 KB + komentar `sourceMappingURL`). Cleanup lama juga menghapus `app-*.js.map` usang.
- **`scripts/bundle-size-report.mjs`** (`bun run bundle:size`): esbuild metafile → laporan per-modul (minified bytes) ke `.freebuff/bundle-size-report.md` (gitignored). **Temuan kandidat lazy-load**: `i18n/locales/{id,jp}/{ui,form}.js` ≈ **97 KB / 23% bundel** (terbesar — hanya satu bahasa yang aktif dipakai runtime), CV builders (`10b_cv_builders` 22.3 KB + `10_cv_rirekisho` + `helpers_cv` ≈ 28 KB), `admin_ops/*` ≈ 30 KB (admin-only), `ai_copilot/*` ≈ 18 KB (admin-only), `08_wa_pintar` 13.6 KB, `13_rincian_builder` 10.1 KB.

### ✅ Verifikasi

format:check bersih · lint 0 error · 148/148 vitest · check:globals nol kolisi · build idempotent (md5 index/admin sama) · E2E login-check & share-view lulus · preview: apply-full render (theme-dark, fonts trio + main.css ter-load dari partial).

---

## 🆕 Sesi 2026-08-18 — dikerjakan oleh: codebuff (via Freebuff) — Fase 5 partial HTML + Fase 6 build/CI

### 🧩 Fase 5 — HTML & partial: byte-compatible

- **6 partial baru** di `partials/`: `head.html` (token `{{ADMIN_SCRIPT}}` — satu-satunya beda index vs admin), `header.html` (token `{{HAMBURGER_COMMENT}}`/`{{HAMBURGER_CLASS_EXTRA}}`/`{{NAV_ADMIN_MARGIN}}`/`{{NAV_KANDIDAT_MARGIN}}`), `footer.html` + `social.html` (token `{{SOCIAL}}`), `bottom-nav.html` (identik kedua halaman), `scripts-shared.html` (token `{{PAGE_MODULES}}`/`{{AFTER_PWA}}` untuk 5 halaman standalone).
- **Marker region** `<!--HEAD/HEADER/FOOTER/BOTTOM_NAV/SCRIPTS_SHARED_START/END-->` tetap tinggal di halaman; `build:html` meregenerasi isi region dari partial tiap build (**idempotent** — diuji 2× md5 sama). Token per-halaman di `module-registry.mjs` (`BUNDLE_TOKENS`, `SCRIPT_TOKENS`, `BUNDLE_REGIONS`, `STANDALONE_REGION`).
- **Style inline dipindah → `src/main.css`** (fade-in, print CV, light theme). Catatan: light theme dulu hanya inline di index.html, sekarang global (admin ikut dapat saat theme-light) — posisi di akhir file menjaga kemenangan cascade seperti inline-in-body.
- **Verifikasi byte-compat**: 7 halaman (index/admin/5 standalone) di-diff terhadap snapshot pra-refactor — perbedaan hanya marker + style removal + bump `?v=` CSS `c1e5a9f34b`→`ed681b7b61`; semua byte lain identik. Partial dibuat dari byte persis halaman (script one-off di-generate + round-trip assert, lalu dihapus).

### ⚙️ Fase 6 — build tooling: entry eksplisit + CI e2e:share

- **STACK concat dihapus** dari `module-registry.mjs` → `bundleModules()` menurunkan daftar modul bundel dari **import eksplisit `js/main.js`** (satu sumber kebenaran; `build-js.mjs` validasi + `check-globals.mjs` scan). Bonus: daftar kini memuat `js/cloudinary.js` yang dulu tertinggal di STACK → **47 modul**.
- **CI diperluas**: step `E2E share-view` di `ci-check.yml` — bootstrap server (`bun serve-static.mjs` + ping wait), `node e2e/share-view.mjs`; step **conditional pada secrets Supabase** (di-skip kalau belum dikonfigurasi). Browser check best-effort (chromium tidak di-install di CI → API check yang dijamin).

### ✅ Verifikasi akhir

format:check bersih · lint 0 error (12 warning eqeqeq lama) · 148/148 vitest · check:globals nol kolisi (47 modul) · check:i18n OK · build idempotent · bundle `app-216286d90f.js` (tidak berubah — tidak ada JS yang disentuh) · **E2E login-check + upload-check + share-view SEMUA LULUS** · preview: index/admin/apply-full render bersih (konsol 0 error, IS_ADMIN_PORTAL true, sosial 4 ikon).

---

## 🆕 Sesi 2026-08-18 — dikerjakan oleh: codebuff (via Freebuff) — Fase 4 tuntas + alias core root + Node

### 🌐 Fase 4 — i18n dipecah per domain + lint duplikat lintas file

- `i18n/locales/{id,jp}.js` (masing-masing ~876 baris) dipecah ke `i18n/locales/{id,jp}/` — **15 domain per bahasa**: loader, a11y, header, public, status, table, landing, siswa, ui, candidate, admin, button, footer, alert, form. Domain `form` (mf__/ai__/txt_*) dipindah dari mutasi `LANG.{id,jp}.form` di `i18n/core.js` ke fragment `form.js` — core kini murni `LANG = { id, jp }`. Binding `public` pakai nama `publicKeys` (reserved di strict-mode ESM).
- **Lint duplikat lintas file**: `scripts/check-i18n.mjs` (baru, ikut `bun run lint`) — tiap fragment wajib 1 export objek berisi 1 domain; domain tidak boleh muncul di 2+ file (spread-merge di index.js menimpa diam-diam); set domain id == jp; index.js memuat semua domain. Paritas leaf id↔jp tetap diuji `i18n.test.js`.
- Migrasi pakai script one-off (di-generate, lalu dihapus) — 148/148 vitest lulus sebelum & sesudah.

### 🔌 Fase 3.5 L6 gelombang 2 — alias core root ikut registry seam

- `api-client.js` (callAPI/esc/escJs/resolveSelfUrl) & `i18n.js` (tr/LANG/trOption/trOptionId/renderLanguageLight/toggleFormLanguage) kini **MURNI ESM** — tidak ada `window.X = X` lagi; alias dipasang di `js/core/bridge.js` via `registerSeamAliases` (source `bridge:api-client` / `bridge:i18n`). `i18n.js` jadi agregat `export * from './i18n/core.js'`.
- `pwa.js` (cobaInstallApp/bersihkanDraftLamaBase64) registrasi sendiri via `import { registerSeamAliases } from './js/core/bridge.js'` (source `pwa`).
- Verifikasi: 148/148 vitest · eslint no-undef 0 · check:globals nol kolisi · verifikasi browser (bundel + halaman standalone: semua alias = fungsi, terdaftar di `getSeamAliases()`, `tr`/`callAPI` jalan) · **E2E Playwright login-check & upload-check SEMUA LULUS**.

### ⚙️ Infra — Node.js v22.23.2 ter-install

- **Node v22.23.2 + npm 10.9.8** di-install user-local (tanpa admin): `C:\Users\AMANAH Sakura 3\nodejs-v22.23.2\node-v22.23.2-win-x64` (User PATH). E2E Playwright (chromium sudah ada) dan pre-commit hook (`node --check`) kini bisa jalan penuh — dua E2E pertama sukses di mesin ini. Catatan sesi bash lama: `export PATH="$PATH:/c/Users/AMANAH Sakura 3/nodejs-v22.23.2/node-v22.23.2-win-x64"`.

---

## 🆕 Sesi 2026-08-18 — dikerjakan oleh: codebuff (via Freebuff) — commit `338feee`

### 🔧 Fase 3.5 Langkah 6 tuntas + perbaikan env

- **Fase 3.5 L6 (fasad PortalBridge) SELESAI** — blok alias per-simbol terakhir di `js/` (`helpers_cv.js`: getPath/isGood/makeV/fmtMonthYearJp/mergeArrRiwayat) dihapus; 5 alias diregistrasikan TERPUSAT via `registerSeamAliases` di `js/main.js` (source `main:helpers_cv`). `helpers_cv.js` tetap murni (unit-test node tanpa window).
- **Verifikasi**: scan `window.\w+=` di `js/` 112→108 · eslint no-undef 0 · `check:globals` nol kolisi · **148/148 vitest** · bundle `app-698fbe088a.js` · verifikasi browser (5 global = fungsi, `getSeamAliases` berisi, konsol bersih). E2E Playwright tidak jalan di mesin ini (node tidak ter-install — keterbatasan terdokumentasi di `REFACTOR_TODO.md` Infra E2E).
- **`.env.local` ditulis ulang bersih** — 12 key, satu baris masing-masing (sebelumnya ada baris duplikat `ADMIN_NUMBERS`/`NETLIFY_SITE_URL` dari update kemarin karena bug regex script).
- **`ADMIN_NUMBERS` typo diperbaiki (konfirmasi pemilik)**: `0082229020129` → **`082229020129`** (kelebihan satu 0). Nilai final: `082130442661, 082229020129, 087864932711, 087728149733, 087889502004`. Preview direstart agar env ter-load.
- Catatan: `ADMIN_NUMBERS`/`GROQ_API_KEY`/`LOG_DRAIN_TOKEN` masih whitelist-only (belum dipakai kode); `SESSION_SECRET` & `ASJ_ADMINS` belum ada.

---

## 🆕 Sesi 2026-08-18 — dikerjakan oleh: codebuff (via Freebuff) — commit `57eb79e`

### 📋 TODO list + update env 2026-08-18 + seed template WA

- **`TODO.md` (baru)** — daftar gabungan semua pekerjaan belum selesai (deploy Netlify pending, `SESSION_SECRET` & `ASJ_ADMINS` belum di-set, seed WA, refactor Fase 3.5–6, K1, E2E Node ≥22) — sumber: `REFACTOR_TODO.md` / `REVIEW.md` / `PROGRESS2.md` / `DEPLOY.md`.
- **`DEPLOY.md` §3** — tambah `GROQ_API_KEY` & `LOG_DRAIN_TOKEN` ke daftar env + catatan refresh 2026-08-18.
- **Env terbaru pemilik ditulis ke `.env.local`** (gitignored): 12 key (Supabase ×4, `ADMIN_MASTER_PIN`, `PIN_KHOCI`, `ADMIN_NUMBERS`, `FONNTE_TOKEN`, `GEMINI_API_KEY`, `GROQ_API_KEY`, `LOG_DRAIN_TOKEN`, `NETLIFY_SITE_URL`) — verifikasi hash sha256 semua cocok; preview lokal kini pakai kredensial terbaru.
- **Seed template WA "Undangan Wali" di-apply** — `bun scripts/seed-wa-templates.mjs --apply` (konfirmasi pemilik): tabel `wa_templates` 2 → 3 template.
- Catatan: `SESSION_SECRET` & `ASJ_ADMINS` masih belum ada; `ADMIN_NUMBERS` angka `0082229020129` dicurigai typo; `ADMIN_NUMBERS` / `GROQ_API_KEY` / `LOG_DRAIN_TOKEN` sudah di whitelist `env.js` tapi belum dipakai kode.
- Alur kerja (keputusan pemilik): **tanpa branch** — kerja langsung di `main` local → GitHub.

---

## 🆕 Sesi 2026-08-18 — dikerjakan oleh: codebuff (via Freebuff) — commit `a679c35` + E2E fix

### 🔧 Line ending Windows & kualitas E2E

- **`.gitattributes` eol=lf** — hapus artefak "M" palsu di Windows pasca-build (CRLF vs LF); repo terverifikasi sudah LF semua (`--renormalize` 0 perubahan), build idempoten `app-23d620bb08.js`.
- **Audit bundle** — `app-23d620bb08.js` dari `26f2a91` TIDAK basi: minify esbuild membuat prettier (whitespace-only) tidak mengubah output; reproducible dari sumber `3134395`.
- **E2E upload-check diperbaiki** — PDF valid (Cloudinary menolak PDF palsu) + asersi URL Cloudinary `KTP_`/`KK_` + fix crash `JSON.stringify().slice()`.
- **Regresi penuh preview lokal**: login · biodata · upload · undang-grup-kelas SEMUA LULUS; vitest 296/296.

---

## 🆕 Sesi 2026-08-17 — dikerjakan oleh: codebuff (via Freebuff) — commit `02cc74f`

### 🔒 Pengaman format anti-melenceng (team pakai desktop/HP/GitHub web/local)

- **Pre-commit hook** `.githooks/pre-commit` (DI-COMMIT, executable): cek `format:check` (prettier) seluruh repo + `node --check` file `.js/.mjs` yang di-stage. Aktif otomatis saat `bun install` (`prepare` script di `package.json`) atau manual `bun run hook:install`. Skip darurat: `git commit --no-verify`.
- **CI check** `.github/workflows/ci-check.yml`: `bun install` → `format:check` → `lint` → `test` → `build` di tiap push/PR ke `main` — menangkap commit dari GitHub web/HP yang tidak lewat hook lokal.
- README (aturan 0) & AGENTS.md §7 di-update.
- **Teruji**: hook menolak file tak rapi (exit 1) & commit bersih lolos (commit ini sendiri dibuat lewat hook).

---

## 🆕 Sesi 2026-08-17 — dikerjakan oleh: codebuff (via Freebuff) — commit `dcb6938`

### 🧹 Rapikan repo (permintaan pemilik: "biar mudah dibaca AI, gak terlalu panjang, cukup point penting")

- **Dokumen besar diringkas** menjadi point-form (riwayat penuh tetap di git history):
  - `PROGRESS.md` 2300 → 35 baris (ringkasan fase 13–17/8 + keputusan penting)
  - `CHANGELOG.md` 1188 → 13 baris (era ringkas + pointer `git log`)
  - `ESM_BRIDGE.md` 774 → 25 baris (aturan ESM/bridge yang masih wajib)
  - `REFACTOR_TODO.md` 753 → 31 baris (hanya sisa pekerjaan terbuka)
  - `REVIEW.md` 302 → 30 baris (status item + rate limit + checklist K1)
  - `README.md` → titik masuk ringkas (stack, struktur, command, aturan, peta dokumen)
- **Format kode seragam**: `bun run format` (prettier: single quote, semi, 2-spasi, LF) — 115 file JS/MD/CSS dinormalisasi; `format:check` hijau.
- **Template WA "Undangan Wali"**: dikonfirmasi tidak ada (DB cuma punya 2 template). Seed script baru `scripts/seed-wa-templates.mjs` (dry-run default, `--apply` insert yang belum ada) berisi default "Undangan Wali" — **belum di-apply ke DB** (butuh konfirmasi pemilik).
- **Verifikasi:** build idempoten (bundel `app-23d620bb08.js`) · 148/148 test · lint 0 error (12 warning gaya lama) · seed dry-run OK.

---

## 🆕 Sesi 2026-08-17 — dikerjakan oleh: codebuff (via Freebuff) — commit `26f2a91`

### ✅ Tes preset Cloudinary `asjportal` — BERFUNGSI

- Upload uji file kecil (raw) ke `https://api.cloudinary.com/v1_1/ybzzbw9i/upload` dengan `upload_preset=asjportal` → **HTTP 200 + `secure_url` dikembalikan**. Preset unsigned valid.
- Catatan: preset mengarahkan file ke folder `DOKUMENASJ/` (bawaan preset — tidak masalah, yang penting URL). File uji 35 byte (`DOKUMENASJ/asj-preset-test_*.txt`) tersisa di akun — boleh dihapus manual.

### 🎨 Penanda versi: header → footer saja

- **Permintaan pemilik:** "jangan tampilkan kode versi (mis. `36373f3`) di banner, taruh di footer saja".
- `pwa.js` (`pasangPenandaVersi`): blok pengisian chip header `#asj-ver-chip` dihapus; badge versi `.asj-ver-badge` di footer (`[data-lang="footer.copyright"]`) tetap ada.
- `index.html` & `admin.html`: elemen `<span id="asj-ver-chip">` dihapus dari judul header (pill kosong tidak ikut render).
- **Verifikasi:** `node --check` OK · bundel `app-23d620bb08.js` berisi 0 `asj-ver-chip`, 1 `asj-ver-badge` · 148/148 test lulus.

---

## 🆕 Sesi 2026-08-17 — dikerjakan oleh: codebuff (via Freebuff) — commit `36373f3`

### ☁️ Migrasi LENGKAP sisa alur upload → Cloudinary (lanjutan Task 2)

**Perintah user:** "lanjut master full dll yg berurusan dengan upload".

- `js/pages/master_full.js` (`submitMaster`): 9 field file (`photoFile`, `jftFile`, `sswFile`, `ijazahSdFile`, `ijazahSmpFile`, `ijazahSmaFile`, `univFile`, `ktpFile`, `kkFile`) TIDAK lagi base64 — sekarang `uploadToCloudinary(file)` → payload berisi **URL string**. Fungsi `fileToBase64` dihapus.
- `js/pages/apply_full.js` & `js/api/jobs.js` (`uploadFilesDirectly`): drop `getUploadUrls` + PUT signed-URL ke Supabase Storage → tiap file di-`uploadToCloudinary`. Prefix `JOB<code>_CV` tidak lagi perlu (Cloudinary memberi public_id unik per upload → tidak saling menimpa).
- `js/pages/ai_form.js` & `js/pages/siswa_baru.js` (`uploadFilesDirectlyBase64`): base64 hasil downscale → dikembalikan jadi `File` (base64ToBlob) → `uploadToCloudinary`. Backend `submitDataAsj` / `submitDaftarSiswa` memang sudah menyimpan URL string — tidak ada perubahan di sana.
- `netlify/functions/_lib/storage.js`: helper baru **`resolveFileUrl(value, folder, fileName)`** — nilai URL string (Cloudinary) dipakai apa adanya; base64 (jalur lama) fallback ke `uploadBase64`.
- `netlify/functions/_lib/actions-master.js` (`handleSubmitMasterForm`): loop `MASTER_FILE_COLUMNS` kini lewat `resolveFileUrl` → menerima URL string dari master-full; base64 lama tetap didukung.
- `getUploadUrls` TIDAK lagi dipanggil frontend mana pun (handler backend tetap ada sebagai fallback, tidak dihapus).
- **Verifikasi:** `node --check` OK · ESLint no-undef 0 error · **148/148 test lulus** · `bun run build` → bundel `assets/app-4843ad1360.js` (46 file) · uji langsung `resolveFileUrl`: URL passthrough, base64 fallback tetap jalan (sandbox punya env Supabase).

---

## 🆕 Sesi 2026-08-17 — dikerjakan oleh: codebuff (via Freebuff) — commit `941b01a`

### ⚡ TASK 1 — Anti Cold-Start (Keep-Warm)

**Perintah user:** dua optimasi teknis untuk mengamankan limit free-tier dan menghindari Cold Start/Timeout (keep-warm + offload storage).

- `netlify/functions/_lib/handlers.js`: early return action `ping` di baris PALING ATAS `handleAction` → `{ statusCode: 200, body: 'pong' }` — sebelum rate limit, dispatch, inisialisasi koneksi Supabase, atau kerja apa pun.
- `netlify/functions/_lib/netlify-wrapper.js` + `serve-static.mjs`: mendukung `GET ?action=ping` (query string fallback) + meneruskan respons RAW `{statusCode, body}` apa adanya (tanpa dibungkus JSON) — berlaku di semua fungsi Netlify & preview lokal.
- `.github/workflows/keep-alive.yml` (BARU): cron `*/5 * * * *` → curl `{"action":"ping"}` ke `https://asjportal.netlify.app/.netlify/functions/auth` (fallback GET); URL bisa di-override via repo variable `KEEPALIVE_URL`. Catatan: di repo privat, workflow terjadwal bisa dijeda GitHub setelah 60 hari tanpa aktivitas.
- **Verifikasi:** POST & GET ping → `200 "pong"` mentah (uji langsung via node); action normal tetap respons JSON; 148/148 test lulus.

### ☁️ TASK 2 — Offloading Upload ke Cloudinary (Direct Unsigned Upload)

**Akar masalah:** dokumen mengalir Frontend → Netlify Functions (base64) → Supabase Storage = bandwidth serverless + rawan timeout. Diubah menjadi browser → Cloudinary langsung; backend hanya menerima URL string.

- `js/cloudinary.js` (BARU): `uploadToCloudinary(file)` → POST FormData (`file` + `upload_preset='asjportal'`) ke `https://api.cloudinary.com/v1_1/<cloud>/upload` → return `secure_url`. Cloud name diisi `ybzzbw9i` (dari `CLOUDINARY_URL` pemilik). **Key/secret TIDAK pernah ditaruh di frontend** (file publik) — alur unsigned hanya butuh cloud name + preset.
- `js/03_candidate.js` (`prosesUploadPemberkasan`): file → `uploadToCloudinary` → payload `{wa, nama, jenisBerkas, fileUrl}` → `callAPI('simpanBerkasTahapan')`. Ditambah **konfirmasi "timpa file lama"**: kalau slot dokumen sudah punya URL tersimpan, `confirm(...)` dulu sebelum menimpa.
- `js/api/candidates.js`: `prosesTambahKandidat` (files jadi `{label, name, url}`), dokumen ekstra di modal input & super-edit (`fileUrl`), dan `prosesUploadRevisi` (`simpanRevisiKandidat` dengan `{name, url}`) — semua lewat Cloudinary.
- `netlify/functions/_lib/actions-upload.js`: `simpanBerkasTahapan`, `simpanRevisiKandidat`, `simpanKandidatDanUpload` kini hanya mengekstrak URL string dari payload (`d.fileUrl` / `f.url`) lalu update kolom dokumen; **base64 lama tetap didukung sebagai fallback** (klien lama aman).
- `js/main.js`: import `cloudinary.js` → ikut bundel admin/index.
- **Build:** `bun run build` → bundel `assets/app-85dc1bcb69.js` (46 file), `check:globals` 0 kolisi, 148/148 test lulus.

### ⚠️ Catatan untuk tim

- **Preset unsigned `asjportal` WAJIB ada** di dashboard Cloudinary (Settings → Upload → Unsigned upload preset) — belum diverifikasi dari sisi preset; tanpa preset itu upload ditolak `Invalid upload preset`.
- Keep-alive + Cloudinary baru efektif **setelah deploy Netlify** (tetap butuh izin eksplisit pemilik — lihat `DEPLOY.md`).
- Belum dimigrasi (pola sama bisa menyusul): `master-full.html` masih kirim base64 via `submitMasterForm`; `apply-full.html`/`ai_form.html`/loker admin sudah upload langsung browser→Supabase Storage via `getUploadUrls`.
