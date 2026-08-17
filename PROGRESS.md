# PROGRESS.md — Status Pekerjaan ASJ Portal

> Pengingat untuk tim & AI assistant: baca file ini dulu sebelum mulai bekerja,
> supaya tidak mengerjakan ulang hal yang sudah selesai / tidak menyentuh yang
> memang belum waktunya.

**Update terakhir:** sesi 2026-08-17 — dikerjakan oleh **codebuff** (via Freebuff) — 🔧 Fase 3.5 L2-6 tuntas (jembatan `window.*`→import + sentralisasi alias seam via bridge) + merge fitur Undangan Grup Kelas + fix alias WA + test E2E/unit + sentralisasi alias modul bundel (208 alias) + **non-fungsi & guard duplikat & dispatcher `data-action`** + **audit hoisting + unit test `renderFormInbox` jalur `f.docs`** + **audit TDZ `let`/`const` (skrip tokenizer lengkap) + fix TDZ `timer` di `bacaFileBase64`** + **fix action `hapusTugas` tidak terdaftar di api-client.js** + **tombol Undang Grup Kelas dipindah ke panel WA Pintar** + **i18n lengkap teks Undang Grup Kelas (placeholder + deskripsi panel WA) id+jp** + **audit kualitas terjemahan JP: 5 key salah arti/janggal diperbaiki (bio_mother, class_dana_desc, exam_list_3, domisili, zero_candidates)** + **deploy Netlify otomatis (`scripts/deploy-netlify.mjs`, netlify-cli jadi devDependency) + fix `e2e/login-check.mjs` (click via evaluate) + E2E regresi penuh di live LULUS (login, upload, biodata, undang grup) + catatan rename site Netlify `asjportal-379` → `asjportal`** + **fix kontras tema light halaman standalone + keterbacaan label AI CV (commit `dce8da8`)** + **deploy Netlify commit `693931b` (izin token user) — live kini `app-935b39d018.js` + `sw.js` precache bundel terbaru (user HP tidak nyangkut versi lama)**.

---

## 🆕 Sesi 2026-08-17 — dikerjakan oleh: codebuff (via Freebuff) — commit `693931b` (deploy Netlify)

### 🚀 Deploy Netlify — versi terbaru live (SW fix SHELL bundel lama)

**Perintah user:** kirim token Netlify + "Deploy Ke netlivy".

- `bun run build` lokal idempotent (bundle `app-935b39d018.js`, sw.js SHELL → bundel terbaru, VERSION `asj-portal-app-935b39d018-m886a44dc`) — repo bersih, tidak ada asset berubah.
- Deploy via `scripts/deploy-netlify.mjs` (SKIP_INSTALL/SKIP_BUILD): deploy ID `6a8311c8ba99f1911dd51677`; hashing 328 file + 19 functions; CDN diff 0 baru karena file sudah di upload Freebuff deploy yang sempat putus — deploy baru tetap valid & live.
- **Verifikasi live:** homepage 200 · bundle `app-935b39d018.js` 200 · `getAppData` jobs=132 · `sw.js` live precache `app-935b39d018.js` + `Cache-Control: no-cache` (netlify.toml).
- **Efek untuk user:** HP/desktop yang nyangkut versi lama kini otomatis beralih — `sw.js` tidak lagi menunjuk bundel yang dihapus; PWA auto-update (SKIP_WAITING + hapus cache lama) jalan di Netlify.

---

## 🆕 Sesi 2026-08-17 — dikerjakan oleh: codebuff (via Freebuff) — commit `548d12c`

### 📱 Preview Freebuff di HP selalu tampil versi LAMA — fix: preview dilarang pakai service worker

**Masalah user:** preview Freebuff dibuka dari HP (`hp.freebuff web preview`) — reload berulang-ulang tetap tampil model lama, padahal kode sudah ter-update. Akar masalah: domain preview (`…daytonaproxy….net`) BUKAN `localhost`, jadi `pwa.js` mendaftarkan **service worker beneran** di domain preview → cache SW nyangkut di HP → versi lama terus disajikan walau bundel baru sudah di-build (pola sama seperti bug `sw.js` SHELL lama di Netlify, commit `f9a83ca`).

**Fix berlapis (preview):**
- `serve-static.mjs`: `/sw.js` SELALU dilayani **service worker no-op** (`NOOP_SW`) — `activate` menghapus SEMUA cache + `clients.claim()`, TANPA fetch listener (tidak pernah meng-intercept request) → SW lama di HP langsung diganti & cache-nya dibuang, setiap load diambil fresh dari jaringan. Header `Cache-Control: no-cache, no-store`. Production Netlify tidak terpengaruh (sw.js asli tetap dipakai di sana).
- `pwa.js`: host preview Freebuff (`daytonaproxy`, `.freebuff`, `freebuff.app`) diperlakukan sama seperti localhost — unregister SW lama + bersihkan cache + **tidak** mendaftarkan SW lagi (jaring pengaman sisi klien).

**Verifikasi:** build bersih (bundle baru `app-935b39d018.js`, sw.js production ikut update `asj-portal-app-935b39d018-m886a44dc`, bundel lama dihapus); uji langsung server preview → `/sw.js` mengembalikan no-op, `/` HTTP 200 + referensi bundel baru; bundel memuat logika `daytonaproxy`; `node --check` bersih.

**Cara user cek di HP:** buka/refresh preview — load pertama mungkin masih versi lama (SW lama yang sedang mengontrol), lalu dalam ≤60 dtk SW no-op mengambil alih + auto-reload → versi baru. Kalau masih lama, tutup tab & buka lagi (maks 2×). Cek badge **`v935b39d018`** di footer.

---

## 🆕 Sesi 2026-08-17 — dikerjakan oleh: codebuff (via Freebuff) — commit `d68c6ce`

### 🚀 PWA selalu versi terbaru: auto-update service worker + auto-hapus cache lama + header cache Netlify

**Masalah user:** preview terus menampilkan versi lama walau file sudah ter-update — browser memakai service worker + cache lama (parah saat server preview mati/502: SW fallback ke shell cache lama → fitur baru seperti "undang grup wali" tidak kelihatan).

**Fix berlapis (berlaku di preview & Netlify):**
- `pwa.js`: registrasi SW pakai `updateViaCache:'none'` (browser selalu re-check sw.js ke jaringan), cek update otomatis tiap 60 dtk + saat tab kembali fokus, kirim `SKIP_WAITING` ke SW baru (langsung aktif tanpa tunggu tab ditutup), toast "Versi terbaru tersedia — memuat ulang…" sebelum auto-reload.
- `sw.js`: listener pesan `SKIP_WAITING`; cache versi lama tetap dihapus otomatis di `activate` (VERSION baru = cache baru, yang lama dibuang).
- `netlify.toml`: header cache baru — `/sw.js` & `/*.html` = `no-cache` (revalidasi tiap load), `/assets/app-*.js` = `immutable` (URL unik per konten → update = URL baru).
- 5 halaman standalone: bump `/pwa.js?v=esm13` → `esm15` (bust cache).

**Verifikasi:** build idempotent (bundle `app-2a72296550.js`), test **148/148**, prettier/lint bersih, preview serve bundel/sw.js/HTML terbaru, URL publik HTTP 200. Catatan: server preview sempat mati lagi (pola sandbox tidak stabil) — dihidupkan ulang via `scripts/preview-watchdog.sh`.

---

## 🆕 Sesi 2026-08-17 — dikerjakan oleh: codebuff (via Freebuff) — commit `dce8da8`

### 🎨 Fix kontras tema light halaman standalone + keterbacaan label AI CV

User melaporkan: di share view mode light **nama kandidat tidak terbaca**; di AI CV (ai_form.html) **tulisan label di atas blok isian manual tidak kebaca di mode dark** ("tulisan kayak mata semut").

**Akar masalah kontras light (BUG selector lama):** semua override tema light generic (`body.theme-light :is(#page-admin, #modal-root, [data-page="share"], ...) :is(.bg-slate-950, .text-white, ...)`) memakai DESCENDANT combinator — hanya cocok elemen ber-`data-page` DI DALAM body. Kenyataannya atribut `data-page` ada di `<body>` itu sendiri → selector tidak pernah match di halaman standalone → kartu share tetap putih (glass-card di-override) tapi teks nama tetap `text-white` = **putih di atas putih**; panel ai-form/apply/master tetap gelap di mode light.

**Fix:** semua selector generic tema light diperluas dengan varian `body.theme-light[data-page="share|ai-form|siswa-baru|apply-full|master-full"]` (langsung ke body) + varian opacity bg baru (`.bg-slate-900/70,/60,/40`, `.bg-slate-800/40`, `.bg-slate-700/80`) → override bg/text/border kini benar-benar jalan di 5 halaman standalone. Bagian ini sebenarnya sudah digarap sesi sebelumnya tapi **belum di-build ke `assets/main.css`** — sekarang di-build + hash `?v=` di-bump di 7 halaman.

**Fix keterbacaan AI CV (mode dark):** di `ai_form.html` inline `<style>`:
- `.label-micro`: 0.55rem → **0.66rem**, warna `#94a3b8` → **`#cbd5e1`** (lebih terang di atas blok isian gelap), margin bawah sedikit dilonggarkan.
- `.section-title`: 0.65rem → **0.78rem** (judul seksi "1. Identitas & Kontak" dll).
- `.input-micro`: 0.65rem → **0.72rem** (isi kolom manual ikut lebih terbaca); mobile 0.7/0.78rem.
- Light mode tetap: `body.theme-light[data-page=ai-form] .label-micro/.section-title` = `#475569` (kontras 7.4:1 di atas putih) — tidak berubah.

**Verifikasi:** `bun run build` idempotent (bundle `app-70c4fbc34d.js` & sw.js tidak berubah; assets/main.css kini memuat 86× selector `body.theme-light[data-page=apply-full]` — sebelumnya 0) · test **148/148** · diff bersih hanya 9 file (src/main.css + build + hash `?v=907489c892` di 7 HTML).

---

## 🆕 Sesi 2026-08-17 — dikerjakan oleh: codebuff (via Freebuff) — commit `0b3edbe`

### 🐛 Fix bug pre-existing: `Error Render: f is not a function` di Mail Inbox (renderFormInbox)

User melaporkan error banner `Error Render: f is not a function` di halaman (screenshot preview).

**Akar masalah (BUG PRE-EXISTING, bukan regresi sesi ini — terkonfirmasi ada sejak 3c1e493/58340e4):** di `renderFormInbox` (`js/render/mail.js`), `var escNama = esc(dc.nama...)` di dalam `forEach(f.docs)` (baris ~151) memanggil `esc` SEBELUM deklarasi `var esc = function...` (baris ~182). Karena hoisting `var`, `esc` = `undefined` saat forEach jalan → TypeError "f is not a function". Error hanya muncul kalau ada lamaran dengan dokumen tambahan (`f.docs` non-kosong) — makanya tidak ketahuan di smoke sebelumnya (data kosong).

**Fix:** deklarasi `var esc` dipindah ke ATAS fungsi `renderFormInbox` (sebelum pemakaian), dengan komentar penjelas; blok duplikat di dalam loop dihapus.

**Verifikasi:** `node --check` OK · lint 0/12 · test 145/145 · build (`app-45f0576074.js`) · smoke preview: `renderFormInbox()` OK termasuk SIMULASI data docs (jalur bug dipaksa jalan), `renderDashboardAgenda` OK, toast & console 0 error.

---

## 🆕 Sesi 2026-08-17 — dikerjakan oleh: codebuff (via Freebuff) — commit `4135421`

### 🔧 Seam registry lengkap: non-fungsi eksplisit + guard duplikat + dispatcher delegasi `data-action`

**Ringkasan kerja:**
1. **`registerSeamAliases` menerima NON-FUNGSI eksplisit** (`{ allowNonFunction: true, source }`) — `THEMES` (objek konfigurasi) & `urlFotoJeklin` (const string) pindah dari `window.X = X` ke registry → **210 alias seam** (audit `getSeamAliases()`). `helpers_cv.js` tetap satu-satunya pengecualian (guard `typeof window` untuk vitest).
2. **Guard tabrakan nama seam** — nama yang sudah terdaftar lalu didaftarkan ulang dengan nilai BERBEDA → `console.warn` (deteksi dini duplikat antar modul; `opts.source` memberi label pendaftar di pesan). Re-registrasi nilai sama = idempotent tanpa warn.
3. **Dispatcher delegasi `data-action`** di bridge.js — 1 listener document (click + change) menangkap elemen `[data-action]`, resolve nama dari registry seam (→ fallback `window.*`), panggil dengan argumen JSON `data-action-arg`, `false` → preventDefault. HTML tidak lagi butuh `window.fn` untuk handler polos.
4. **Migrasi 131 handler** di `admin.html`/`index.html` (103 unik: `changePage`, `adminSwitchTab`, `filterPublicData`, `bukaModal*`, `setSortDb`, `openRincianBuilder`, dll) dari `onclick="fn('x')"` → `data-action="fn" data-action-arg='["x"]'` (skrip `.freebuff/migrasi-data-action.mjs`, JSON-validated, escape `&#39;`). ~50 handler tetap inline karena ekspresi/multi-statement/`this` (tidak bisa didelegasikan tanpa mengubah markup).
5. **Test baru** `js/core/bridge.test.js` (6 test: non-fungsi ditolak/diterima, guard tabrakan, idempotent, resolve registry + fallback window, nama tak dikenal) — dynamic import dengan stub global (bridge/api-client eksekusi `window` di module scope).

**Verifikasi:** no-undef 0 · lint 0 error/12 warn (baseline) · test **145/145** (139 + 6) · build idempoten (bundel `app-6cd19287b4.js`, 46 file) · audit-globals HIGH=0 · smoke browser (preview :3100): admin/index — 210 alias, SEMUA nama `data-action` ter-resolve (0 unresolved), klik delegasi nyata (`toggleTheme` SAKURA→TOKYO, `setSortDb` dispatch dengan argumen) bekerja, `dispatchSeamAction` + fallback window terverifikasi, 0 error JS; share standalone — tetap jalan (6 alias, dispatcher tersedia).

---

## 🆕 Sesi 2026-08-17 — dikerjakan oleh: codebuff (via Freebuff) — commit `58340e4`

### 🔧 Sentralisasi alias seam modul bundel — 208 self-alias `window.X = X` → `registerSeamAliases` via bridge

**Ringkasan kerja:**
1. **Migrasi 208 self-alias fungsi di 39 modul bundel** (`render/*` 5, `admin_ops/*` 6, `admin_modal/*` 3, `api/*` 4, `ai_copilot/*` 4, `engine/*` 4, `init/*` 5, plus `01_public`, `03_candidate`, `08_wa_pintar`, `10_cv_rirekisho`, `10b_cv_builders`, `12_esign_match`, `13_rincian_builder`, `upload-guard`) — tiap modul kini `import { registerSeamAliases } from '../core/bridge.js'` + satu panggilan registrasi, menggantikan blok `window.X = X` per file. `js/apply-docs.js` (standalone apply-full, bukan modul STACK) dikonversi manual — `applyDocsPlan` via bridge, tetap tampil sebagai `window.applyDocsPlan`.
2. **Yang sengaja TETAP `window.X = X`**: non-fungsi (`window.THEMES` objek, `window.urlFotoJeklin` const — `registerSeamAliases` menolak non-fungsi) dan `helpers_cv.js` (guard `typeof window` untuk vitest — import bridge akan mengeksekusi i18n di node → ReferenceError).
3. **🐛 Fix EOL-critical**: skrip versi awal menulis LF murni → `git diff` churn penuh (1227 baris palsu di `01_public.js`) karena blob HEAD ber-CRLF + lone-CR (artefak sesi lama) dan autocrlf menormalkan sisi working tree. Skrip ditulis ulang **EOL-preserving per-baris** (CRLF/LF/lone-CR dipertahankan) → diff hanya berisi perubahan nyata (411+/639−, `diff -w` identik).
4. **Skrip migrasi** `.freebuff/sentralisasi-alias.mjs` (dry-run default, `--apply` untuk menulis) — didokumentasikan di ESM_BRIDGE §3.4.

**Verifikasi:** no-undef 0 error (40 file tersentuh) · lint 0 error / 12 warning baseline · test **139/139** · build idempoten (bundel `app-5a15730349.js`, 46 file) · audit-globals HIGH=0 · smoke browser preview :3100 — admin **208 alias seam terdaftar** via `PortalBridge.getSeamAliases()` (sampel lintas modul: `adminSwitchTab`, `filterDbJob`, `bukaModalUndanganKelas`, `bukaAdminAiCopilot`, `openRincianBuilder`, `bukaModalTtd`), index boot normal + halaman publik tampil, share standalone 6 alias, apply-full `applyDocsPlan` terdaftar + tetap `window.applyDocsPlan` — semua 0 error JS.

---

## 🆕 Sesi 2026-08-17 — dikerjakan oleh: codebuff (via Freebuff) — commit `ee3e44d`

### 🔧 Fase 3.5 L2-6 tuntas + sentralisasi alias seam via bridge + merge & verifikasi Undangan Grup Kelas

**Ringkasan kerja:**
1. **Jalur unblock sentralisasi PortalBridge** (ESM_BRIDGE §3.4) — `js/pages/*` jadi **entry ESM** (import core via `js/core/bridge.js`, tag core HTML standalone dihapus); **bridge.js masuk STACK bundel** (module-registry + `js/main.js`) → index/admin ikut punya `window.PortalBridge` + `registerSeamAliases`; alias seam HTML↔JS di 5 halaman standalone diregistrasikan **terpusat** via `registerSeamAliases({...})` (registry `SEAM_ALIASES` private, audit `getSeamAliases()`), menggantikan blok `window.X = X` per file.
2. **Merge fitur Undang Grup Kelas (`10a45bc`)** ke worktree — stash → fast-forward → pop; `candidates.js` auto-merge bersih (hunk fitur vs hunk Fase 3.5 tidak bentrok); build artifact di-rebuild (bundel `app-7bc915049b.js`, 28 modal).
3. **🐛 Fix regresi alias WA** (ketahuan smoke E2E): alias `window.normalizeWaInput`/`isValidWaInput` HILANG saat pembersihan Fase 3.5 L6 (04_auth.js) → `parseDaftarOrtu` fallback regex ketat menolak `0xx/8xx` (janji "0xx→62xx" di modal gagal). Alias dipulihkan + bundel di-rebuild.
4. **Backend testable**: `buildPesanTawaranMassal` diekstrak jadi fungsi murni di `actions-wa.js` (rotasi varian bergilir anti-ban — tidak mengubah perilaku) + **`actions-wa.test.js`** (8 test: rotasi 3×5, varian=jumlah penerima, placeholder per penerima, template fallback, pesan default, gaya lama `<<NAMA>>`).
5. **`e2e/undang-grup-kelas.mjs`** (Playwright, pola harness) — login admin → buka modal → preview (jumlah/varian/placeholder) → kirim dengan `window.callAPI` di-STUB (anti WA beneran — Fonnte terkonfigurasi) → verifikasi payload (WA ternormalisasi 62x, invalid dibuang, jobCode '', linkGrup, interval, 2 varian di customMessage) + toast + 0 error JS.

**Verifikasi:** lint 0 error / 12 warning baseline · test **139/139** (131 + 8 baru) · build idempoten (bundel `app-7bc915049b.js`, 46 file, 0 kolisi, VERSION stabil) · smoke interaktif preview (parse ortu 2 valid + 1 invalid, preview varian, payload tertangkap, `081234567890`→`6281234567890`) · E2E Playwright TIDAK dijalankan di mesin ini (tanpa Node ≥22; playwright macet di Bun/Windows — jalankan `BASE_URL=http://localhost:3000 node e2e/undang-grup-kelas.mjs` di mesin ber-Node).

---

## 🆕 Sesi 2026-08-17 — dikerjakan oleh: codebuff (via Freebuff) — commit `10a45bc` (fitur di-push pemilik)

### ✉️ Undangan Grup Kelas — kirim undangan WA grup ke orang tua/wali (Opsi A: tanpa ubah DB)

**Fokus user:** WA admin sering kena banned saat invite massal ke grup kelas orang tua/wali (kasus: 34 siswa kelas J). Minta: pakai fitur undangan loker yang SUDAH ADA, ditambah jalur untuk kirim undangan grup ke ortu. Cakupan A (cepat, tanpa ubah DB) — sumber nomor dari daftar admin (Excel/WA).

**Keputusan desain:** TIDAK membuat handler/action backend baru — reuse `kirimTawaranMassal` (`actions-wa.js`) yang sudah punya guard admin + rate limit `FONNTE_ACTIONS` + replace placeholder `{nama}`/`{link_grup}` di `customMessage`. Anti-ban tetap: tiap orang dapat PESAN berisi link undangan (bukan add anggota manual), jeda default **10 dtk** (lebih lambat dari 5 dtk di undangan loker) supaya akun sender aman.

**Yang ditambahkan:**
1. **Modal `modal-undangan-kelas`** (`partials/modals-shared.html`) — textarea tempel daftar `Nama|628xxx` (1 baris per ortu, pemisah `|`/tab/`;` atau nomor di akhir baris), input link grup, jeda (default 10), template pesan editable (pre-filled contoh pesan ortu yang dipakai admin, placeholder `{nama}`/`{link_grup}`), pratinjau jumlah terbaca + pesan pertama live.
2. **JS** (`js/admin_ops/candidates.js`) — `parseDaftarOrtu` (normalisasi+gate WA pakai `window.normalizeWaInput`/`isValidWaInput` dari `shared/wa-rules.js` — SATU sumber kebenaran, baris invalid dihitung & dikeluarkan), `bukaModalUndanganKelas` (prefill link terakhir dari localStorage), `previewUndanganKelas`, `kirimUndanganKelas` (validasi → confirm → `callAPI('kirimTawaranMassal', [{candidates, jobCode:'', linkGrup, interval, customMessage}])`).
3. **Tombol "Undang Grup Kelas"** di `admin.html` (samping "Cek Data", ikon WA).
4. **Pesan custom ANTI-BAN bisa beda-beda per orang**: template pesan boleh berisi BANYAK VARIAN dipisah baris `---`; `parseVarianPesan` + backend `handleKirimTawaranMassal` mengirim varian BERGILIRAN per penerima (varian ke-i mod jumlah varian, placeholder tetap di-replace per penerima). Untuk 34 ortu: tulis 34 pesan beda (urutan sama dgn daftar) atau beberapa varian — tiap orang dapat pesan berbeda → aman dari banned pesan identik massal. Modal menampilkan badge jumlah varian (`span-kelas-varian`) + preview pesan pertama.
5. **i18n** id+jp (±20 key baru: label modal, hint format, toast invalid rows / no valid WA / confirm, `variant_count_n`).

**Verifikasi:** `node --check` 4 file OK · `bun run build` hijau (check:globals 0 kolisi, CSS/HTML/JS OK — 28 modal, bundel `app-07b85797dd.js`) · lint **0 error** (12 warning lama, tidak disentuh) · test **131/131** (paritas i18n id↔jp ikut lulus).

**Catatan pemakaian:** admin tinggal tempel daftar (contoh 34 pesan user → 1 template + daftar `Nama|WA`), isi link grup (`https://chat.whatsapp.com/…`), jeda disarankan 10-20 dtk, kirim bertahap 10-15 nomor dulu supaya aman.

---

## 🆕 Sesi 2026-08-17 — dikerjakan oleh: codebuff (via Freebuff) — commit `4fa4114`

### 🔧 Refactor arsitektur (5 kandidat deepening) + E2E penuh + 2 debug root-cause

**Fokus user:** "kerjakan semua to do list dan rekomendasi di atas" — laporan arsitektur (`.freebuff/architecture-review.html`, 6 kandidat → 5 dieksekusi), E2E tertunda, 2 tugas debug, lalu eksekusi Fase 3.5 Langkah 1 + Fase 4 i18n.

**Debug (systematic-debugging — root cause dulu, tanpa fix ditebak):**
1. **Hash VERSION sw.js beda tiap build** — root cause: `build-js.mjs` menghitung `-m<8hex>` dari byte mentah `assets/modals-shared.html`; `core.autocrlf=true` → working tree CRLF vs blob LF → sha1 beda padahal konten sama (CRLF `1335ddba` vs LF `b4f9dc47` = nilai commit, jadi sw.js di repo benar). Fix: hash atas konten ternormalisasi LF → build idempoten, VERSION stabil.
2. **E2E gagal launch Playwright** — root cause lingkungan: Node.js/Python tidak terpasang (hanya Bun); playwright-core macet di Bun/Windows (pipe DevTools buntu, ws mati setelah handshake 101). Aplikasi & binary chrome sehat (dump-dom OK). Solusi: **Node.js v24.19.0 portable** (temp, ~30 MB) → 4 skrip E2E semua lulus.

**Kandidat arsitektur yang dieksekusi:**
1. **Normalisasi WA satu sumber** — `shared/wa-rules.js` baru (`normalizeWa` + `isValidWaFormat`) dipakai frontend (`js/04_auth.js`) + backend (`db/client.js` re-export ke 19 pemakai). **Drift nyata diperbaiki**: frontend terima `8xx…` → backend tolak; kini konsisten. (+11 test, kasus SATRIA + 8xx)
2. **Registry modul build** — `scripts/module-registry.mjs` satu sumber STACK 45 file / halaman / partial modal; `build-js`, `build-html`, `check-globals` (tanpa parse regex), `module-map` semuanya baca registry. Output identik.
3. **Registry action backend** — `netlify/functions/_lib/action-registry.js` tabel 60+ action + grup rate limit; `handlers.js` turun ±195 baris (switch → lookup). **Test kontrak**: tiap `callAPI('x')` di frontend wajib ada di registry — typo action gagal di test, bukan produksi. (+7 test)
4. **Harness E2E + dedupe testable** — `e2e/harness.mjs` (check/waitFor/launchBrowser/finish) dipakai 4 skrip (login/upload/biodata/share); `scripts/dedupe-rules.mjs` aturan merge (pickKeeper, fuzzyCluster, deep-merge `ai_data_json`) jadi fungsi murni (+17 test), skrip CLI tinggal orkestrasi.
5. **i18n fondasi Fase 4** — `i18n.test.js` paritas id↔jp (1.125 key) + guard typo `tr()`. **Bug nyata diperbaiki**: `ui.toast_wa_format` tidak punya terjemahan jp (user JP lihat key mentah). Temuan: `tr()` TIDAK fallback ke id (berlawanan klaim AGENTS.md) — dicatat di REFACTOR_TODO.

**Eksekusi lanjutan (diminta user):**
- **Fase 3.5 Langkah 1**: `callAPI`/`tr`/`showToast`/`safeSet` jadi **import nyata** di 9 file (`04_auth.js`, `engine/{dashboard,guards,init}`, `render/{public,admin,candidate,share,mail}`) — penggantian word-boundary, `window.trOption`/`trOptionId` tidak tersentuh; `window.*` tinggal di seam HTML onclick.
- **Fase 4**: `i18n.js` dipecah → `i18n/core.js` (logika + accessor `CURRENT_LANG` + ekstensi `form.*`) + `i18n/locales/{id,jp}.js` (data 852/848 baris); `i18n.js` jadi agregat re-export + alias `window.*` — semua pemuat lama (bundel, bridge, halaman standalone) tidak berubah. Catatan teknis: accessor wajib di core (esbuild tolak assignment ke binding import).

**Verifikasi:** lint 0 error / 12 warning (baseline) · unit test **91 → 131** · build idempoten (`app-4c52ddca9f.js`, VERSION `-mb4f9dc47` stabil) · **4 E2E SEMUA LULUS** (Node portable) · preview :3000 render sempurna, konsol bersih, toggle JP `応募者ログイン` / ID `Login Pelamar` bekerja di browser.

---

## 🆕 Sesi 2026-08-17 — dikerjakan oleh: khoci89 (via Freebuff) — commit `74f503f` (+ `f0c66ce`)

### 🛠️ Fix 5 bug hasil perburuan bug + commit sisa sesi sebelumnya (naitei by tahapan, carry-over TSK)

**Fokus user:** "cari semua bug di sini" → 5 bug ditemukan & dilaporkan, user pilih **fix semua sekaligus**.

**Perbaikan (semua terverifikasi):**
1. **i18n JP tidak lengkap** — 12 key salah namespace: `master-full.html` pakai `form.gender_l/p`, `form.agama_*`, `form.nikah_*` padahal definisinya di `candidate.*`; `ai_form.html` pakai `form.ai_nilai` (tidak ada); `js/api/candidates.js` pakai `ui.berkas_tersimpan` (ada di `admin.*`). Fix: `master-full.html` → `candidate.*`, tambah `form.ai_nilai` (id+jp) & `ui.berkas_tersimpan` (id+jp). Check i18n otomatis: 0 key hilang (dari 12).
2. **Draft siswa baru HILANG setelah refresh** ⚠️ — `siswa_baru.js` restore pakai `msg.parts[0].text` tapi pesan user/AI disimpan `{role, content}` → TypeError → catch → `localStorage.removeItem(DRAFT_KEY)` → chat + form + status upload hilang total. Fix: restore baca dua format + welcome diseragamkan ke `{role:'assistant', content}`.
3. **Resize "puter-puter" iPhone** di `siswa_baru.js` — pola lama paksa `switchTab('chat')` tiap resize; diganti pola `lastMobileTab`/`wasDesktop`/`handleResize` (sama persis `ai_form.js`).
4. **Placeholder WA massal tidak ter-replace** — frontend/UI pakai `<<NAMA>>`/`<<JOB>>`, server massal cuma replace `{nama}`/`{job}`/`{link}`, dan `customMessage` (matchmaking esign `{nama}`/`{job_code}`/`{link_grup}`) TIDAK di-replace sama sekali → kandidat terima teks mentah. Fix: `applyTemplatePlaceholders` di `actions-wa.js` menangani semua format untuk template & customMessage.
5. **Lock VIP AI CV tidak di-enforce server** — klaim AGENTS.md (`isAiCvAllowed`) tidak ada di kode; `processAIChat` dipanggil tanpa sessionToken & tanpa cek VIP → non-VIP bisa bypass. Fix: `handleProcessAIChat(payload, sessionToken)` — flow=master wajib sesi admin ATAU catatan kandidat `[VIP]`/`[KELAS]` (cek `database_candidate` → fallback `master_database_candidate`; error lookup fail-open). Frontend `ai_form.js` menampilkan pesan lock saat `{success:false}`. Smoke test live: `processAIChat` flow=master WA fiktif → `{success:false, error:'Fitur AI CV Master eksklusif…'}` tanpa panggil Gemini.

**Verifikasi:** `node --check` semua file JS diubah · eslint 0 error (ESM no-undef 0) · unit test **91/91** · `bun run build` sukses (`app-fbbbee6390.js`) · check i18n 0 key hilang · preview restart OK · smoke test lock VIP live OK.

---

## 🆕 Sesi 2026-08-16 — dikerjakan oleh: khoci89 (via Freebuff) — commit `f10c98a`

### 🛠️ L/P siswa baru, auto-fill AI form, biaya magang 5,5 Jt, lock naitei by LULUS

**Fokus user:** L/P di modal siswa baru tidak keluar; AI form tidak auto-fill setelah chat; biaya magang pendidikan 5→5,5 Jt; banyak lock status (naitei dll) terlalu terbuka; tulis aturannya biar AI tidak bingung.

**Perbaikan (semua terverifikasi):**
1. **L/P '-'** — root cause: data `respon_siswa_baru.jenis_kelamin` null karena AI chat siswa (`processSiswaAIChat`) cuma balas teks, tidak pernah ekstrak data. Kini balas **JSON `{reply, data}`** (gender dinormalisasi LAKI-LAKI/PEREMPUAN) → form siswa auto-fill → L/P tampil. Verifikasi live: submit `gender:'laki-laki'` → `jenis_kelamin:'L'` (getDaftarSiswaBaru), cleanup OK.
2. **Normalisasi gender disatukan** — `normalizeGender` di `db/client.js` → kanonikal `LAKI-LAKI`/`PEREMPUAN` (konvensi situs lama `normalizeGenderValue`); mapping `getDaftarSiswaBaru` → `L`/`P`; varian inline di render modal siswa (`js/admin_ops/candidates.js`) dihapus. Unit test diperbarui.
3. **AI form auto-fill** — `processAIChat` kini balas **JSON `{reply, data}`** dengan kunci persis `fieldPaths` ai_form (identitas/fisik/medis/sertifikasi/wawancara/kenalan_jepang/pendidikan/pekerjaan/keluarga). Frontend sudah punya jalur `res.data` → merge → `updateFormUI`; sekarang data benar-benar datang. Verifikasi live: chat "Siti Aminah, perempuan, 160/50" → `data.identitas.nama_lengkap`, `gender:PEREMPUAN`, `fisik.tb:160`.
4. **Biaya magang pendidikan 5 Jt → 5,5 Jt** — `i18n.js` (id `5,5 Jt` + jp `550万ルピア`) + fallback `index.html`/`admin.html`.
5. **Lock E-Sign & Data Naitei** (`bukaModalTtd`) — dulu regex tahapan (LOLOS..NAITEI) terlalu longgar; sekarang hanya untuk kandidat yang **SUDAH LULUS** (lamaran `LULUS`/`LOLOS`/`APPROVED`/`APPROVE`), admin bebas. Verifikasi browser dua arah: AGUS (MENUNGGU) → ditolak + toast; ANGGUN (LULUS) → modal terbuka.
6. **Aturan lock ditulis di `AGENTS.md` §6** (baru): tabel lock naitei/CV AI/interview + aturan satu normalisasi gender — biar sesi AI berikutnya tidak bingung.

**Verifikasi:** `node --check` semua file JS diubah · unit test **91/91** · `bun run build` sukses (`app-0464d48a8c.js`) · E2E: standalone-smoke 15/15, login-check, modal-runtime-check, upload-check, biodata-check semua lulus · diag `.freebuff/diag-lock-form.mjs` semua lulus.

---

## 🆕 Sesi 2026-08-16 — dikerjakan oleh: khoci89 (via Freebuff) — commit `89a1f03`

### 🔍 Debug sistematis (semua yang belum dites) + fix reload-loop ai_form & anti-duplikat lamaran

**Fokus user:** review apakah setelah semua difix masih ada data dobel (update kandidat & lamar loker). **Larangan: jangan tes Fonnte** (review kode saja, tidak ada send WA ke siapa pun).

**Yang diuji (semua lulus):**
- Fase statis: `node --check` semua JS · lint 0 error · unit test **91/91** · `check:globals` 0 kolisi · audit-globals HIGH=0 · build idempotent.
- E2E regresi **8 suite** (login-check, upload-check, biodata-check, share-view, modal-runtime, backend-fast-path, probe) — semua lulus.
- Diag handler langsung ke Supabase asli: CRUD jadwal/tugas round-trip + cleanup, AI chat fungsional, getAppData mode admin.
- Smoke standalone BARU (`e2e/standalone-smoke.mjs`, ditrack): 15 cek — ai_form stabil + chatBox terisi, apply-full, master-full, siswa-baru.

**Bug nyata ditemukan & difix:**
1. **Reload-loop ai_form** — guard VIP `verifikasiAksesAiCv` memanggil `getAppData('kandidat')` tanpa sesi kandidat → backend balas `sessionInvalid` → `callAPI` reload halaman → loop tak berujung (14× load/detik, chatBox kosong). Fix di `js/pages/ai_form.js`: tanpa sesi kandidat dibiarkan masuk (keputusan final di server, sesuai komentar kode). Halaman standalone, tidak masuk bundel → tanpa build.
2. **Duplikat lamaran `database_asj_form`** (WA `6285692313050` + job `UMUM`: #143 LULUS & #229 MENUNGGU) — akar: DB **tidak punya constraint unik `(no_wa, code_job)`** + semua jalur simpan GET-then-POST (race paralel bisa dobel). Baris #229 `timestamp` null → dibuat situs lama (`asjportal.netlify.app`, DB sama, masih dipakai user), bukan `submitApply` baru.
   - **Resolusi data:** `bun run dedupe:apply` (backup `.freebuff/dedupe-backup-2026-08-16T18-05-52-546Z.json`) → gabung ke #143 (LULUS, deep-merge `ai_data_json`), hapus #229; koreksi pasca-merge: `tgl_lahir` kembali ISO `2001-08-01` (merge newest-wins sempat menimpa jadi `01-08-2001`), `tempat_lahir` di-trim. Dedupe dry-run kini **0 grup / 0 baris**.
   - **Fix kode:** helper `upsertFormRow` di `db/forms.js` — POST `on_conflict=no_wa,code_job` + `Prefer: resolution=merge-duplicates`, fallback INSERT biasa kalau constraint belum ada (HTTP 400 42P10). Dipakai di `submitApply`, `simpanKandidatDanUpload`, `syncFormMailDariUpload` (upload paralel KTP+KK tidak bikin mail dobel).
   - **Verifikasi live:** 3× `submitApply` WA+job sama → tetap **1 baris**, data terbaru menang (usia 27), cleanup OK.
3. **Audit jalur update kandidat** (`database_candidate`/`master_database_candidate`): semua jalur update PATCH by id/WA (tidak pernah INSERT baru) — POST hanya saat baris belum ada (baru pertama). Tidak ada jalur dobel untuk update.

**⚠️ Aksi user (wajib untuk jaminan anti-dobel permanen):** jalankan di SQL Editor Supabase:
```sql
ALTER TABLE database_asj_form
ADD CONSTRAINT database_asj_form_no_wa_code_job_key UNIQUE (no_wa, code_job);
```
Tanpa constraint ini, `upsertFormRow` otomatis fallback ke INSERT biasa (perilaku lama). Setelah constraint ada, race paralel mustahil menghasilkan baris dobel — `submitApply` ganda juga dijamin 1 baris.

**Catatan:** preview sandbox sempat down (`freebuff-preview` tidak ditemukan — infra Freebuff). Semua verifikasi di atas tanpa browser kecuali E2E yang sudah dijalankan saat preview hidup. Kalau preview sudah pulih dari UI: `BASE_URL="http://localhost:3000" node e2e/standalone-smoke.mjs` untuk regresi cepat.

---

## 🆕 Sesi 2026-08-16 — dikerjakan oleh: khoci89 (via Freebuff)

### 🐛 Fix CV Master: simpan gagal total + data kenalan/auto-fill kosong (vs Netlify lama)

**Gejala user:** "tes CV master kok data saya ada yang kosong perasaan sudah terisi". Netlify lama dipakai sebagai pembanding (bedanya cuma modular vs global).

**Bukti (dibandingkan langsung: repo vs `asjportal.netlify.app`, env sama, WA AGUS KHOCI `6282130442661`):**
- **Simpan Form Master Lengkap SELALU gagal** — `submitMasterForm` menulis kolom yang TIDAK ADA di tabel `master_database_candidate` (skema 154 kolom) → Supabase HTTP 400 PGRST204 → `"Gagal simpan Master: Could not find the 'keluarga_1_gaji' column"`. Ditemukan **30 kolom** yang ditulis tapi tidak ada (cek exhaustif vs schema):
  - `keluarga_N_gaji` (semua slot) & `keluarga_2..5_{hubungan,nama,usia,pekerjaan}` (kolom keluarga HANYA slot 1),
  - `pendidikan_{1,2,4,5}_jurusan_id` (jurusan HANYA slot 3),
  - `pekerjaan_{2,3}_gaji` (gaji pekerjaan HANYA slot 1),
  - `kenalan_di_jepang_{pekerjaan,usia,alamat}` (kenalan HANYA nama & hubungan).
- **Auto-fill Form Master kosong**: `getMasterDataByWa` cuma baca kolom → `KENALAN_DI_JEPANG_ALAMAT` (TOKYO) & versi JP (ケンジ/友達/東京) kosong, padahal ada di `ai_data_json` (Netlify lama mengembalikannya → form lama tampil terisi).
- **Nested CV kosong**: `buildMasterNested.kenalan_jepang` baca kolom yang tidak ada → preview CV / auto-fill ai_form tidak dapat kenalan JP & alamat.
- **Simpan CV AI menghapus kenalan**: `submitDataAsj` menimpa `ai_data_json` master dengan 8 seksi (identitas/fisik/…/wawancara) → `kenalan_jepang`, `context`, `fotoFile/jftFile/sswFile` terhapus tiap kali kandidat save dari ai_form.

**Fix (`netlify/functions/_lib/actions-master.js` + `ai/cv.js`):**
1. `MASTER_COLUMN_MISSING` (30 kolom) → dibuang dari body PATCH/POST sebelum simpan; nilainya disimpan ke `ai_data_json` via `buildAiOverflow` + `mergeAiOverflow` (deep-merge newest-wins, isi lama utuh) → simpan master-full **berhasil** & round-trip form/CV utuh.
2. `buildMasterNested.kenalan_jepang` → merge `ai_data_json.kenalan_jepang` (fill-if-empty) → CV preview & auto-fill ai_form lengkap.
3. `handleGetMasterDataByWa` → kenalan fallback ke ai + key JP parity (NAMA_JP/HUBUNGAN_JP/PEKERJAAN_JP/ALAMAT_JP/TEMPAT_LAHIR_JP/AGAMA_JP/STATUS_NIKAH_JP/ALAMAT_JP/HOBI_JP/KEAHLIAN_JP).
4. `submitDataAsj` → pertahankan kunci non-managed (kenalan_jepang, context, file) dari `ai_data_json` lama (kunci managed = 8 seksi form AI).
5. `ai/cv.js` → pakai `buildMasterNested` SHARED dari actions-master (hapus salinan lama) → admin AI copilot dapat data lengkap (kenalan + array riwayat yang dulu cuma di ai_data_json).

**Verifikasi (langsung ke handler + Supabase asli, backup/restore penuh):** simpan master-full payload 5 edu/3 job/5 fam + kenalanAlamat=TOKYO → `success:true` (dulu selalu 400) · round-trip kenalan: simpan OSAKA → flat `KENALAN_DI_JEPANG_ALAMAT=OSAKA` + nested `alamat_id=OSAKA` + JP dari ai (ケンジ/友達/東京) · submitDataAsj → `kenalan_jepang` tetap utuh · test **91/91** (10 baru: filter kolom + merge ai) · lint 0 error · `node --check` ✓ · smoke admin/getAppData (132 jobs) ✓.

---

## 🆕 Sesi 2026-08-16 — dikerjakan oleh: khoci89 (via Freebuff)

### ⚡ Fix: AI lambat / 502 — pakai model Gemini LITE yang sama dengan Netlify lama

**Gejala user:** "AI lemot banget, setelah balasan pertama gak bales, error".

**Bukti (dites langsung ke API dengan key yang sama):**

| Model (urutan lama di `providers.js`) | Hasil tes 2026-08-16 |
| --- | --- |
| `gemini-flash-latest` | ❌ **503 "high demand"** — tiap request buang 3–9 dtk |
| `gemini-3.5-flash` | ⚠️ 200 tapi **7–29 dtk** → kena timeout Netlify (502) |
| `gemini-2.5-flash` | ❌ **404** — tidak tersedia untuk key baru |
| **`gemini-flash-lite-latest`** (BARU) | ✅ **0,4–1,3 dtk** stabil |
| **`gemini-3.5-flash-lite`** (BARU) | ✅ **0,5–1,7 dtk** stabil |

**Netlify lama (`asjportal.netlify.app`) respons AI ±1,0–1,4 dtk** dengan key yang sama → terbukti dia pakai model LITE. Kode baru di-rebuild pakai flash penuh → jadi lambat/502.

**Fix di `netlify/functions/_lib/ai/providers.js`:**
- Urutan model → `['gemini-3.5-flash-lite', 'gemini-flash-lite-latest', 'gemini-3.5-flash']` (LITE pin paling stabil dulu, lalu alias LITE terbaru, flash penuh hanya fallback terakhir).
- Tambah **timeout per-model 7 dtk** (`AbortSignal.timeout`) — model yang menggantung tidak lagi menghabiskan budget fungsi Netlify (±10 dtk → 502).
- **Trim giliran model di akhir history** sebelum kirim — perbaiki error Gemini 400 `"Requests ending with a model turn are not supported"` (dulu balasan "AI sedang sibuk" setelah chat pertama).

**Verifikasi:** handler `processAIChat` 3 panggilan (kosong → history user+assistant → history penuh) = **1,1 dtk / 0,8 dtk / 0,7 dtk** (sebelumnya 72 dtk / 14 dtk / 29 dtk) · test **81/81** ✓ · lint 0 error ✓ · `node --check` ✓.

---

## 🆕 Sesi 2026-08-16 — dikerjakan oleh: khoci89 (via Freebuff)

### 🗂️ Kronologi: hubungan repo GitHub ↔ Netlify lama ↔ Netlify baru (biar tim tidak bingung)

Konfirmasi langsung dari pemilik (khoci89):

| Aset | URL / lokasi | Status | Peran |
| --- | --- | --- | --- |
| **Netlify LAMA (produksi, masih dipakai user)** | `https://asjportal.netlify.app/` | **LIVE & dipakai sehari-hari** | **Pembanding / baseline** — jangan di-deploy tanpa izin (token akun tipis) |
| **Kode di GitHub ini** (`Asjpow4v7`) | repo `main` | **Rebuild hampir total** | Sumber kode masa depan; menunggu stabil & bebas bug baru dipindahkan |
| **Netlify BARU (uji)** | `https://asjportal-379.netlify.app/` | Deploy uji (riwayat izin di DEPLOY.md §4) | Tempat uji hasil rebuild sebelum dipindah ke produksi |

**Kronologi singkat (cerita asli dari pemilik):**
1. **Awalnya** semua hidup di Netlify lama (`asjportal.netlify.app`); build-nya ada di komputer pemilik (tapi sudah **rusak**).
2. **Unduhan deploy Netlify lama** dijadikan dasar repo ini — tapi **hasil build-nya tidak ikut ter-unduh** (hanya source).
3. **Build baru dibuat ulang** untuk menyamakan perilaku Netlify lama, lalu **refactor ESM Fase 3** dijalankan di atasnya.
4. Karena langkah 2–3, **kode di GitHub ini hampir semuanya hasil rebuild** — bukan salinan persis kode Netlify lama.
5. **Env var SAMA** (Supabase, Gemini, Fonnte, dll) antara Netlify lama & baru → bisa dites langsung ke Netlify lama sebagai pembanding (seperti sesi ini: model AI dibandingkan lewat latensi API).

**Konsekuensi yang perlu diingat tim:**
- ⚠️ **Netlify lama ≠ kode repo ini.** Kalau perilaku beda (mis. AI cepat di lama tapi lambat di baru), jangan anggap "bug Netlify" — itu perbedaan rebuild/refactor, cek kode repo dulu.
- Setiap fix di repo **tidak otomatis sampai ke Netlify lama** — user masih pakai yang lama sampai repo dinyatakan stabil; hanya deploy yang diizinkan (DEPLOY.md §2).
- Saat membandingkan fitur: tes ke Netlify lama (baseline) DAN preview/repo (hasil rebuild), lalu catat perbedaannya.

---

## 🆕 Sesi 2026-08-16 — dikerjakan oleh: khoci89 (via Freebuff)

### 🐛 Fix: teks JFT/SSW & pendidikan di modal CV Mini (kandidat) tidak tersimpan

- **Gejala user**: di Update CV Mini (dashboard kandidat) ganti usia bisa, tapi ganti teks JFT/JLPT & Bidang SSW tidak tersimpan (balik ke nilai lama setelah refresh).
- **Akar masalah**: `prosesSimpanCvMini` kirim key `jft_text`/`ssw_text` ke `simpanUpdateMaster` → `handleSubmitMasterForm` (actions-master.js) hanya mengenal `nilai`/`lisensi` (MASTER_COLUMN_MAP → kolom `jft`/`bidangssw`) & `jftText`/`sswText` (jalur admin `updateKandidatSuper`) → key CV mini **diabaikan diam-diam**; kolom `nilai_jft_text`/`bidang_ssw_text` (database_candidate) & `jft`/`bidangssw` (master) tidak pernah di-update. `pendidikan` string dari CV mini juga tidak dipetakan (master-full kirim array slot).
- **Fix** (additif, kontrak jalur lain tidak berubah): normalisasi `jft_text`/`jftText` → `nilai` & `ssw_text`/`sswText` → `lisensi` sebelum loop MASTER_COLUMN_MAP (guard `d[to] === undefined` → master-full/AI form yang sudah kirim `nilai`/`lisensi` tidak tersentuh); pendidikan string → `pendidikan_1_tingkat` (master) + `pendidikan` (database_candidate). Plus bersihkan artefak double-prefix `window.window.safeSetVal('um-usia',` di js/03_candidate.js (baris korup dari konversi ESM — jalan karena `window.window` valid).
- **Verifikasi**: unit **81/81** ✓ · lint 0 error ✓ · build `app-ddf857242b.js` ✓ · **E2E CV Mini** (login kandidat → ubah JFT/SSW → simpan → nilai tampil kembali setelah refresh → nilai asli dipulihkan) ✓ · regresi login-check ✓ + biodata-check (jalur `simpanUpdateMaster` yang sama) ✓.

---

## 🆕 Sesi 2026-08-16 — dikerjakan oleh: agus khoci (via Freebuff)

### Fase 3.18 lanjutan — pembersihan index redundan (bukti dari pg_indexes)

Dari `indexdef` yang user paste (SQL Editor): `idx_cand_no_wa` & `idx_master_no_wa` (dibuat di migrasi Fase 3.17) **redundan dengan index lama yang sudah ada** → dihapus dari rencana; file migrasi direvisi.

- **`idx_cand_no_wa` (btree no_wa) redundant** dengan `idx_dc_no_wa_loker` = btree **(no_wa, id_loker_pilihan)** — kolom `no_wa` di posisi pertama, jadi semua query `no_wa = ?` / `IN` (findCandidateByWaFiltered, fetchMasterByWa, fetchMasterLightByWa) sudah terlayani prefix btree index lama.
- **`idx_master_no_wa` (btree no_wa) redundant** dengan constraint unik `master_database_candidate_no_wa_key` (UNIQUE btree no_wa) — index constraint juga melayani lookup.
- **Yang TETAP dipertahankan**: `idx_asj_form_timestamp/no_wa/code_job` (tidak ada padanan lama), `idx_cand_updated_at`, `idx_cand_loker_trgm` (GIN ILIKE — `idx_candidate_id_loker` btree hanya eq eksak, beda fungsi), `idx_berkas_wa` (vs `idx_pemberkasan_wa_tahap` belum terverifikasi — tabel 5 baris, dampak ~nol, dibiarkan dulu), plus semua index/constraint lama.
- **`netlify/migrations/2026-08-16-index-perf.sql` (REVISI)**: CREATE `idx_cand_no_wa` & `idx_master_no_wa` dihapus dari daftar + section 4 baru berisi `DROP INDEX IF EXISTS idx_cand_no_wa; DROP INDEX IF EXISTS idx_master_no_wa;` (idempotent) + catatan verifikasi opsional `idx_berkas_wa`. File kini aman ditempel ulang utuh — tidak membuat ulang index redundan.
- **Aksi di DB (oleh user, SQL Editor)**: jalankan ulang seluruh isi file yang sudah direvisi → index redundan ter-drop, sisanya tetap. Tidak ada perubahan kode backend/frontend — murni pembersihan index.

---

## 🆕 Sesi 2026-08-16 — dikerjakan oleh: agus khoci (via Freebuff)

### Fase 3.18 — optimasi paralel tarikan data backend (hasil verifikasi Fase 3.17 → eksekusi)

Latar: verifikasi Fase 3.17 menemukan `getAppData kandidat` (~2,5–3,0 dtk) & `getCandidatesPage` (~1,9 dtk) paling lambat karena **banyak roundtrip berurutan** ke Supabase (latensi per request ±260–290 ms). Optimasi: jalankan query independen PARALEL, tanpa mengubah perilaku/respons.

- **`actions-public.js` — `handleGetAppData`**: (1) validasi sesi dipindah PALING AWAL (murni lokal, tanpa query) — sesi tidak valid langsung pulang; (2) SEMUA tarikan independen diparalelkan: publik (jobs/assets/settings) + [admin: `loadCandidatesUnik`] / [kandidat: `findCandidateByWaFiltered` + `findFormsByWa` + `loadSchedules`] → 1 gelombang RTT. `Promise.all` aman karena semua fetch sudah catch internal.
- **`actions-candidate.js` — `handleGetCandidatesPage`**: `attachBerkasBio` (berkas+master) & `findFormsByWaList` (lamaran per-WA) ditarik PARALEL — dulu berurutan.
- **`db/candidates.js` — `findCandidateByWaFiltered`**: probe 3 kolom WA (`no_wa`/`wa`/`whatsapp`) via `Promise.allSettled` PARALEL (dulu serial s/d 3 roundtrip); prioritas hasil tetap no_wa → wa → whatsapp.
- **`db/berkas.js` — `attachBerkasBio`**: fetch `pemberkasan_checklist` & `master_database_candidate` (light) PARALEL — dulu serial.
- **Hasil terukur** (`node scripts/verify-index-perf.mjs`, dingin → sesudah): getAppData kandidat **2.482–3.043 → 1.631 ms** (−45%), getCandidatesPage **1.898–1.965 → 832 ms** (−57%), getAppData admin **1.673–1.693 → 1.379 ms** (−18%); warm: kandidat 1.370 ms, admin 821 ms. Integritas handler = DB TETAP COCOK (kandidat 223, inbox 12, loker 132, tugas 2, template WA 2).
- Verifikasi: node --check 4 file ✓ · lint 0 error ✓ · test **81/81** ✓ · E2E SEMUA LULUS (backend-fast-path 12/12, login, upload, biodata — kandidat tes dibersihkan) ✓.

---

## 🆕 Sesi 2026-08-16 — dikerjakan oleh: agus khoci (via Freebuff)

### Verifikasi Fase 3.17: migrasi index 8/8 terpasang + script ukur performa + E2E penuh

- **Migrasi index SQL 8/8 TERPASANG di Supabase** — konfirmasi dari `pg_indexes` (SQL Editor): `idx_asj_form_timestamp/no_wa/code_job`, `idx_cand_updated_at/no_wa`, `idx_cand_loker_trgm` (GIN pg_trgm), `idx_berkas_wa`, `idx_master_no_wa`. Extension `pg_trgm` terbukti terpasang: fungsi `show_trgm` dipanggil via REST mengembalikan trigram "TG9ASJ" → `[" tg","tg9","g9a","9as","asj","sj "]`.
- **`scripts/verify-index-perf.mjs` (BARU)** — verifikasi READ-ONLY: (A) koneksi Supabase + bukti pg_trgm, (B) timing query REST persis backend (inbox sort, kandidat light full paginasi, ILIKE trigram panjang vs pola 2-char sebagai proksi tanpa-index, lookup WA, batch berkas/master, form per WA) 3 ronde, (C) timing SEMUA tarikan data via handler dingin → cache server-side, (D) integritas hitung handler vs DB count. Jalankan: `node scripts/verify-index-perf.mjs`.
- **Hasil ukur**: semua query ±260–290 ms (batas latensi jaringan ke Supabase; tabel masih kecil — 223 kandidat, 12 inbox, 132 loker — jadi PostgreSQL belum memakai index baru, manfaatnya terasa saat tabel tumbuh; TIDAK ada regresi). Cache server-side terukur: getAppData admin **1.690 → 1.096 ms** (dingin → cache), kandidat 2.482 → 2.154 ms. Integritas SEMUA COCOK: kandidat 223 (halaman 1 = 50), inbox 12, loker 132, tugas 2, template WA 2, master 225, berkas 5.
- **E2E penuh SEMUA LULUS** (preview lokal): login-check 19/19 ✓, upload-check (kandidat tes terisolasi + cleanup) ✓, biodata-check (nilai dipulihkan) ✓, modal-runtime 8/8 ✓, photo-check 3/3 ✓, probe-cleanup 0 GAS / 0 request Google ✓, share-view (22 kandidat render) ✓, backend-fast-path 12/12 ✓. Unit test **81/81** ✓ · lint 0 error ✓ · `node --check` ✓.
- Catatan (bukan blocker): (1) index lama `idx_dc_no_wa_loker` (komposit) berpotensi redundan dengan `idx_cand_no_wa` — kalau ingin rapikan biaya write, cek dulu definisi kolomnya; (2) `getAppData kandidat` & `getCandidatesPage` masih banyak roundtrip berurutan (probe kolom WA, attachBerkasBio, findFormsByWa, loadSchedules) — kandidat paralelisasi kalau terasa lambat.

---

## 🆕 Sesi 2026-08-16 — dikerjakan oleh: agus khoci (via Freebuff)

### Fase 3 langkah 15 — aktifkan no-undef permanen (frontend ESM) + 🐛 fix 2 bug latent

- **`eslint.config.js`**: `no-undef: error` diaktifkan utk `js/**/*.js` + `api-client.js` + `i18n.js` + `pwa.js` (semua sudah ESM sejak langkah 13; referensi global implisit sudah di-window-kan). `.mjs` (scripts/e2e) & netlify functions (CommonJS `require`) tetap tanpa no-undef. Scan awal menemukan **39 pelanggaran di `js/pages/master_full.js`** saja — file lain sudah bersih (0 error).
- 🐛 **Bugfix 1 — bare global di master_full.js (latent, nyata)**: 30× `tr(`, 2× `callAPI(`, 1× `cekUploadFile(` bare → di ESM bakal ReferenceError saat render box pendidikan/pekerjaan/keluarga (langkah 3-5) & simpan/upload. Semua di-window-kan (`window.tr` dll). **Diverifikasi di browser**: navigasi step 1→5 render semua dynamic box, kembali ke step 1, 0 error JS.
- 🐛 **Bugfix 2 — bridge alias hilang total di master_full.js**: `changeStep`/`submitMaster`/`handleFile` tidak di-export & TIDAK ada satu pun `window.*` alias → HTML `onclick="changeStep(1)"` / `submitMaster(true)` / `onchange="handleFile(...)"` bakal ReferenceError (bridge sempat hilang saat konversi langkah 13). Fix: 3 fungsi di-export + bridge 8 alias (`toggleImaMade`/`gateLogin`/`onSswSelect`/`onPekerjaanSelect`/`onFamPekerjaanSelect`/`handleFile`/`changeStep`/`submitMaster`). Pelajaran dicatat di ESM_BRIDGE §6: **saat konversi, wajib cek `window.X` ter-expose untuk SEMUA handler HTML page itu** — cek dengan membuka halaman & klik, bukan cuma no-undef (no-undef tidak menangkap alias yang hilang).
- Verifikasi: lint 0/12 ✓ (no-undef aktif) · test **81/81** ✓ · build idempoten (`app-f90fc61af6.js`) · check:globals nol kolisi (405 simbol) · audit HIGH=0 · **E2E SEMUA LULUS**: login, upload, biodata + **smoke master-full**: nama dari URL, alias onclick ada, step 1→5 render (edu_tk_1/job_nm_1/fam_nm_1), 0 error JS ✓.

---

## 🆕 Sesi 2026-08-16 — dikerjakan oleh: agus khoci (via Freebuff)

### Fase 3 langkah 17 — optimasi query backend (index SQL + cache server-side kandidat)

- **`netlify/migrations/2026-08-16-index-perf.sql` (BARU)** — index utk query tersibuk getAppData (semua idempotent, aman dijalankan ulang di Supabase SQL Editor): `database_asj_form(timestamp DESC)` (sort inbox limit 500 tanpa sort penuh), `database_asj_form(no_wa)` + `(code_job)` (lookup WA/job), `database_candidate(updated_at DESC)` (sort dedupe) + `(no_wa)` (lookup WA), `pemberkasan_checklist(wa)` + `master_database_candidate(no_wa)` (IN-filter berkas/bio), `pg_trgm` GIN index `database_candidate(id_loker_pilihan)` (ILIKE '%kode%' — wildcard kiri). Termasuk query verifikasi `pg_stat_user_tables` + `EXPLAIN ANALYZE`.
- **Cache server-side `loadCandidatesUnik`** (`actions-public.js`): hasil dedupe+filter+sort kandidat (halaman 1 admin) di-cache in-memory TTL **25 dtk** (key `cand:<q>|p<page>|s<pageSize>`) — getAppData berulang (ganti tab, auto-refresh 120 dtk) TIDAK lagi full-scan `database_candidate` tiap kali. Public base (jobs/assets/settings) sudah di-cache sebelumnya (20 dtk).
- **Invalidasi cache di SEMUA jalur mutasi kandidat** (`cacheClear()`): updateCatatanKandidat, updateKandidatSuper, formStatus (approve/review/reject → PATCH/POST kandidat), deleteForm, submitMasterForm, submitDaftarSiswa, submitApply, simpanKandidatDanUpload, simpanBerkasTahapan, simpanRevisiKandidat, **+ baru ditambahkan di sesi ini**: daftarKandidat (auth), tandaiGagalJob (job), uploadDriveReplacement (drive). Mutasi form-only (inbox tidak di-cache) & PATCH master oleh AI CV (tidak menyentuh kolom light dedupe) sengaja tidak invalidate.
- Verifikasi: node --check semua file backend ✓ · lint 0/12 ✓ · test **81/81** ✓ · **E2E SEMUA LULUS** (login/upload/biodata — getAppData berulang + mutasi upload→cacheClear) ✓.
- ⏭️ Berikutnya (opsional): jalankan migrasi SQL di Supabase (perlu akses dashboard — lihat cara pakai di header file), cap scan `findAllCandidatesLight` kalau tabel sudah ribuan, atau lanjut refactor lain (i18n split, partials HTML).

---

## 🆕 Sesi 2026-08-16 — dikerjakan oleh: agus khoci (via Freebuff)

### Fase 3 langkah 16 — performa tarikan data: auto-refresh pintar + SWR-lite cache

- **Auto-refresh 60 → 120 detik + skip tab hidden** (`js/engine/init.js`): interval refresh `setInterval` jadi 120.000 ms; kalau `document.hidden` (user buka tab lain) refresh di-skip total — tarikan sia-sia berkurang setengah + tidak berjalan di background. Saat tab kembali terlihat (`visibilitychange`), refresh dijalankan SEKALI segera (data tidak basi, tanpa menunggu siklus berikutnya). Guard lama tetap: skip kalau ada modal terbuka + guard scroll di refreshDataDinamis.
- **SWR-lite cache di `api-client.js`**: `getAppData` + `getAppConfig` (tarikan data utama — jobs/kandidat/forms/config) di-cache **in-memory** TTL 10 detik. Navigasi antar-tab SPA langsung render dari cache (0 ms, tanpa jaringan); siklus auto-refresh 120 dtk memvalidasi ulang di background (stale-while-revalidate sederhana). Semua action BUKAN pembaca (mutasi/login/logout) meng-invalidate cache → data tidak pernah basi setelah perubahan. `sessionInvalid` tidak ikut di-cache. Cache in-memory SAJA (response getAppData ratusan KB — tidak aman untuk kuota localStorage 5 MB).
- **Dampak**: tarikan berulang dalam 10 dtk (ganti tab admin, refresh otomatis) tidak lagi hit backend — request get-app-data berkurang drastis; kombinasi interval 120 dtk + hidden skip menurunkan tarikan periodik 50%+.
- Verifikasi: node --check ✓ · no-undef 0 error ✓ · lint 0/12 ✓ · test **81/81** ✓ · build: bundel `app-18222bfae2.js` (420.2 KB, 45 file, idempoten) · check:globals nol kolisi (408 simbol) · audit HIGH=0 · **E2E SEMUA LULUS** (login, upload, biodata) + **smoke cache**: getAppData 2× dalam TTL → delta 1 request jaringan (kedua dari cache); action non-pembaca → invalidate → fetch ulang; 0 error JS ✓.
- ⏭️ Roadmap performa tersisa (opsional): cache admin TTL pendek di backend, cek region Supabase (dokumentasi), atau lanjut refactor lain (i18n split, partials HTML, backend actions-upload).

---

## 🆕 Sesi 2026-08-16 — dikerjakan oleh: agus khoci (via Freebuff)

### Fase 3 langkah 14 — entry js/main.js + esbuild bundle mode (concat → bundle)

- **`js/main.js` (BARU, entry)** — side-effect `import` SEMUA modul domain sesuai urutan STACK (sumber kebenaran di build-js.mjs). Tidak ada export/exposure tambahan: tiap modul sudah alias window.* sendiri (bridge §3.2/§5 ESM_BRIDGE.md). Boot TIDAK dipicu dari sini — `js/init/boot.js` tetap mendaftarkan listener DOMContentLoaded (jalan saat evaluasi bundel) yang memanggil `initApp` (engine/init.js). Halaman standalone TIDAK memuat file ini (tetap `<script type="module">` per halaman).
- **`scripts/build-js.mjs` → bundle mode**: hapus concat + ESM_CORE (tidak relevan lagi — semua file sudah ESM). Sekarang `esbuild.build({ entryPoints: ['js/main.js'], bundle: true, format: 'iife', treeShaking: false, minify: true, write: false })` → 1 file IIFE. `treeShaking: false` WAJIB (import side-effect + alias window.* harus dipertahankan — eksperimen langkah 1 membuktikan tree-shake RENAME/membuang simbol & mematahkan referensi global). STACK tetap ada (dipakai check-globals + validasi semua file ada). Sisa pipeline (ganti tag HTML, sw.js SHELL/VERSION, bersihkan bundel lama, hapus stub Vite) tidak berubah.
- **Hasil**: bundel `app-f90fc61af6.js` (419.8 KB, 45 file via entry — ukuran hampir sama dengan era concat, perbedaan kecil dari cara esbuild menggabung).
- Verifikasi: node --check ESM ✓ · lint 0/12 ✓ · test **81/81** ✓ · build idempoten (hash sama saat rerun) · **0 export bocor** di bundel · check:globals nol kolisi (45 file / 405 simbol) · audit HIGH=0 MEDIUM=25 LOW=382 · **E2E SEMUA LULUS**: login, upload, biodata (dashboard admin KHOCI render via bundel baru, 0 error JS) ✓.
- ⏭️ Roadmap berikutnya: evaluasi halaman standalone jadi entry ESM per halaman (opsional — kini bisa via esbuild `entryPoints` array / `--splitting`) — atau langsung lanjut fitur/perbaikan lain.

---

## 🆕 Sesi 2026-08-16 — dikerjakan oleh: agus khoci (via Freebuff)

### Fase 3 langkah 13 (TERAKHIR) — file dimuat halaman standalone jadi ESM (8 file) + HTML type=module

- **`js/upload-guard.js` → ESM** (1 + helper PRIVATE): `cekUploadFile` — `export` + alias window.* (pemakai classic/bundel & HTML onchange semua halaman). Helper internal (extDariAccept/formatBoleh/pesan) PRIVATE modul.
- **`js/apply-docs.js` → ESM** (1): `applyDocsPlan` — `export` + alias window.* (dipakai apply_full.js).
- **`pwa.js` → ESM** (2): `cobaInstallApp`/`bersihkanDraftLamaBase64` — `export` + alias window.* + migrasi `bersihkanDraftLamaBase64()` jalan di evaluasi modul (semua halaman). Listener SW/beforeinstallprompt/appinstalled tetap top-level.
- **`js/pages/siswa_baru.js` → ESM** (2 + konteks URL): `export` + alias window.* (HTML onclick/onload).
- **`js/pages/share.js` → ESM**: fungsi share + lightbox — `export` + alias window.*; bare global (tr/callAPI/esc) di-window-kan.
- **`js/pages/apply_full.js` → ESM**: alur lamaran lengkap — `export` + alias window.*; `window.applyDocsPlan` (apply-docs ESM).
- **`js/pages/master_full.js` → ESM**: form master wizard — `export` + alias window.*; `tr/callAPI/esc` via window.*.
- **`js/pages/ai_form.js` → ESM** (12 export): initApp/switchTab/handleEnter/sendMessage/updateFormUI/compressImage/handleDocUpload/saveToDatabase/updateArrayField/removeArrayItem/addArrayItem — alias window.* utk HTML onclick/onchange/onload + string onclick dinamis renderEditableArray. State chat (chatHistory/latestCandidateData/*Base64/*File/fieldPaths) PRIVATE modul. Bare global `tr/callAPI/CURRENT_LANG/renderLanguageLight/cekUploadFile` di-window-kan eksplisit.
- **HTML standalone → `type="module"`**: ai_form/apply-full/master-full/share/siswa-baru — tag upload-guard, pages/*, pwa.js (dan apply-docs di apply-full) jadi `<script type="module">` (urutan dokumen dipertahankan → eksekusi berurutan setelah parse; inline theme classic tetap jalan duluan).
- **Build**: ESM_CORE + `upload-guard.js` + `pwa.js` (keduanya juga masuk bundel admin/index — wajib di-IIFE, kalau tidak `export` bocor ke bundel classic) → bundel `app-cff3e89658.js` (419.5 KB, 45 file, **0 export bocor**, idempoten). check:globals **nol kolisi** (45 file / 405 simbol). Audit: HIGH=0 · MEDIUM=25 · LOW=382.
- Verifikasi: node --check ESM semua file ✓ · no-undef 0 error ✓ · lint 0/12 ✓ · test **81/81** ✓ · **E2E SEMUA LULUS**: login, upload, biodata ✓ + **smoke halaman standalone**: ai_form (initApp onload + sapaan chat + AI_FORM_CONTEXT dari URL + alias onclick), apply-full (applyDocsPlan), master-full (nama terisi dari URL), share & siswa-baru render, upload-guard & pwa ter-expose — **0 error JS** ✓.

---

## 🆕 Sesi 2026-08-16 — dikerjakan oleh: agus khoci (via Freebuff)

### Fase 3 langkah 12 — sisa file classic bundle-only jadi ESM (8 file)

- **`js/01_public.js` → ESM** (9): switchPublicTab/renderLanguage/setLanguage/parseRincianBiaya/renderRincianSections/lokerGenderBadge/jobTutupUntukLamar/bukaDetailLoker/tutupDetailLoker — `export` + 9 alias (HTML onclick + render/public.js + admin_modal/job.js + engine/api/i18n window.renderLanguage + 13_rincian_builder window.parseRincianBiaya). Onclick string bukaDetailLoker di-window-kan (`window.lamarJob`, `window.tutupDetailLoker`, `window.bukaPamflet`).
- **`js/03_candidate.js` → ESM** (22 deklarasi): CV mini, portal bridge, guard upload, pemberkasan — `export` + 18 alias (HTML onclick: bukaModalCvMini/bukaMasterEksternal/bukaMasterLengkapPortal/bukaFormSiswa/bukaModalPemberkasan/prosesUploadPemberkasan/tutupPreviewDokumen; lintas file: bukaFormBridge→admin_modal/job, isVipCatatan→ai_copilot/interview, cekUkuranFile/cekEkstensiFile/bacaFileBase64/normalizeGenderValue→api/candidates, bukaPreviewDokumen→admin_modal/cv, bukaMasterEksternalAdmin→render/candidate). State pemberkasan ditulis via accessor (`window.ACTIVE_PEMBERKASAN_WA/NAMA`).
- **`js/08_wa_pintar.js` → ESM** (15 + `_riwayatLokerAktif` PRIVATE): WA pintar + template + riwayat kandidat + lightbox — `export` + 15 alias (HTML onclick + render/admin+candidate+mail onclick string + init/boot injectModalWaPintar + engine/init renderRiwayatKandidat). `window.CURRENT_WA_KANDIDAT` via accessor.
- **`js/10_cv_rirekisho.js` → ESM** (5): bukaPreviewCV_Admin/bukaPreviewCV/prosesBukaRirekisho/renderCVAjaib/cetakCVRirekisho — `export` + 5 alias (HTML + render/candidate onclick). Helper CV via window.* (`window.makeV/mergeArrRiwayat/getPath` dari helpers_cv, `window.buildEduRows/dll` dari 10b).
- **`js/10b_cv_builders.js` → ESM** (5 builder murni): `export` + 5 alias; `isGood`/`fmtMonthYearJp` → `window.isGood`/`window.fmtMonthYearJp` (helpers_cv ESM).
- **`js/12_esign_match.js` → ESM** (16 + 6 state PRIVATE): e-sign canvas + student card + matchmaking — `export` + 16 alias (HTML onclick modals-shared: bukaModalTtd/bukaLayarCanvas/clearFsCanvas/saveFsCanvas/submitDataEsignFull/jalankanMatchmaking/kirimTawaranMassal; render/admin onclick bukaMatchmaking; engine/init renderStudentCard). State fsCanvas/activeDrawingType/signData/matchedCandidates/currentMatchJobCode tetap PRIVATE modul.
- **`js/13_rincian_builder.js` → ESM** (24 + 6 state): rincian biaya builder — semua `export` + alias window.* yang SUDAH ada di bawah file dilengkapi. `callAPI`/`tr`/`showToast`/`parseRincianBiaya` (yang bare + typeof guard) di-window-kan eksplisit — penting: guard `typeof callAPI` di modul scope selalu 'undefined' tanpa window prefix → koleksi DB preset tidak pernah dimuat (bug halus, dicegah).
- **`js/helpers_cv.js` → ESM** (6 helper + helpers_cv const): UMD IIFE → `export function` murni (vitest import tetap jalan — 24 test ✓) + alias window.* di dalam guard `typeof window !== 'undefined'` (node/vitest aman).
- 🐛 **Bugfix nyata (latent sejak langkah 2)**: `CURRENT_LANG` di i18n.js cuma alias data property satu arah — `setLanguage` (01_public) menulis `window.CURRENT_LANG` tapi binding modul i18n basi → tr()/trOption() tetap bahasa lama (toggle ID/JP diam-diam tidak jalan). Fix: `Object.defineProperty(window,'CURRENT_LANG',{get/set})` accessor → tulis via window.* men-delegate ke binding modul. **Diverifikasi di browser**: toggle id→jp membuat tr('ui.tab_loker') jadi '求人情報' + DOM ikut, balik ke id bersih, 0 error JS.
- Referensi global implisit di-window-kan eksplisit (scan no-undef **0 error** di 8 file + i18n). Build: ESM_CORE + 8 entri → bundel `app-5718b3d669.js` (419.5 KB, 45 file, **0 export bocor**, idempoten). check:globals **nol kolisi** (45 file / 401 simbol). Audit: 52 file · **403 simbol** · HIGH=0 · MEDIUM=24 · LOW=379.
- Verifikasi: node --check ESM 8 file + i18n ✓ · no-undef 0 error ✓ · lint 0/12 ✓ · test **81/81** ✓ (helpers_cv 24/24) · **E2E SEMUA LULUS**: login, upload, biodata, backend-fast-path ✓ + **cek terarah**: toggle bahasa (accessor CURRENT_LANG), Rincian Builder (21 chip preset), canvas e-sign, CV Rirekisho render (実習生経歴書) + cetak, WA Pintar inject, Modal Pemberkasan — 0 error JS.

---

### Fase 3 langkah 11 — init sisanya: js/init/{theme,preview,nav,boot} ESM

- **`js/init/theme.js` → ESM** (8 + THEMES/DEFAULT_ASSETS const): renderThemeToggle/toggleTheme/buatPartikelSakura/setSakuraParticles/applyInterMilanVibe/applyTheme — `export` + 8 alias + **`window.THEMES`/`window.DEFAULT_ASSETS`** (lihat bugfix di bawah). State writes via accessor (`window.CURRENT_THEME = theme`), `window.ASSETS` (accessor), `window.setBg` (util ESM), `window.renderPublicFilterUI/Filtered` (render ESM).
- **`js/init/preview.js` → ESM** (6 + VENDOR_V/_vendorPromises PRIVATE): muatVendorLib/renderExcelKeFrame/_pasangTimerPreviewFallback/previewFileInFrame/pesanLoadingPreview/pesanPreviewTidakTersedia — `export` + 6 alias. `VENDOR_V` & `_vendorPromises` tetap internal (tanpa pemakai eksternal, §5 rule 2). `window.XLSX` (vendor), `window.isPreviewableFile/previewFinalUrl` (util ESM), `window.tr`.
- **`js/init/nav.js` → ESM** (4): changePage/closeMobileMenu/toggleMobileMenu/logoutApp — `export` + 4 alias (HTML onclick + engine/04_auth window.changePage). State writes via accessor (isAdmin/isKandidat/current*/AUTO_REFRESH_TIMER/PREV_MAIL_COUNT), `window.callAPI`, `window.renderPublicFilter*`.
- **`js/init/boot.js` → ESM** (0 deklarasi — murni 2 listener top-level): `window.injectModalWaPintar` (08_wa_pintar classic), `window.applyTheme`, `window.refreshDataDinamis`, `window.showLoginAdminMaster` (04_auth ESM). Listener tetap terdaftar di posisi bundel yang sama (IIFE per file).
- 🐛 **Bugfix nyata (ketahuan E2E login-check)**: `render/public.js:217` memakai `window.THEMES[window.CURRENT_THEME]` — sebelum langkah ini `var THEMES` global → window.THEMES ada; setelah ESM, THEMES jadi scoped modul → `window.THEMES` undefined → `Cannot read properties of undefined (reading 'INTER_VIP')` di dashboard admin KHOCI. Fix: alias `window.THEMES` + `window.DEFAULT_ASSETS` di bridge theme.js. Pelajaran: setelah ESM-kan modul dengan konstanta yang dipakai lintas file, cek SEMUA pemakai `window.<konstanta>` (bukan hanya fungsi) — E2E menangkapnya.
- Referensi global implisit di-window-kan eksplisit (scan no-undef **0 error**; 2 `DEFAULT_window` dari blanket `ASSETS.BANNER` kena `DEFAULT_ASSETS.BANNER` diperbaiki). Build: ESM_CORE + 4 entri → bundel `app-ad18b34535.js` (418.6 KB, 45 file, **0 export bocor**, idempoten). check:globals **nol kolisi** (45 file / 394 simbol). Audit: 52 file · **396 simbol** · HIGH=0 · MEDIUM=24 · LOW=372.
- Verifikasi: node --check ESM 4 file ✓ · no-undef 0 error ✓ · lint 0/12 ✓ · test **81/81** ✓ · **E2E SEMUA LULUS**: login (dashboard admin KHOCI tanpa error JS — bugfix window.THEMES), upload, biodata ✓.

---

## 🆕 Sesi 2026-08-16 — dikerjakan oleh: agus khoci (via Freebuff)

### Fase 3 langkah 10 — ai_copilot: js/ai_copilot/* (4 file) ESM

- **`js/ai_copilot/admin.js` → ESM** (7 + 3 state): bukaAdminAiCopilot/tutupAdminAi/kirimPesanAdminAi/autoFillFormDariAi/simpanKandidatDariAi/tambahPesanAdminAi/tampilkanSaranAdminAi + `adminAiHistory`/`currentAiCandidateId`/`urlFotoJeklin` — `export` + 6 alias. **`currentAiCandidateId` memakai ACCESSOR bridge** (di-reassign bare di bukaAdminAiCopilot; dibaca parse.js & results.js — alias biasa akan basi, pola state.js §3.2). `urlFotoJeklin` const → alias biasa (dibaca interview.js). `pastikanBarParseAdminAi()` → `window.pastikanBarParseAdminAi()` (lintas modul, §3.3).
- **`js/ai_copilot/interview.js` → ESM** (8 + `interviewHistory`): bukaSimulatorInterview (window assignment lama jadi `export` + alias), pastikanTombolSelesaiInterview, selesaikanWawancaraInterview, mulaiWawancaraInterview, appendInterviewChat, sendInterviewMessage, cobaParseJsonLoose, kirimHasilWawancaraKeAdmin — `export` + 2 alias (bukaSimulatorInterview + sendInterviewMessage utk HTML). `window.urlFotoJeklin`, `window.isVipCatatan` (03_candidate classic), `window.ALL_CANDIDATES/normalizePhone/currentKandidatWa/currentKandidatName` (accessor).
- **`js/ai_copilot/parse.js` → ESM** (3): pastikanBarParseAdminAi/bacaFileBase64Front/uploadDokumenBiodataAdmin — `export` + 3 alias (onclick HTML di bar yang di-inject + admin.js). `window.tambahPesanAdminAi`, `window.currentAiCandidateId` (accessor).
- **`js/ai_copilot/results.js` → ESM** (3 + `lastAdminHasil`): generateWawancaraModelAdmin/lihatHasilWawancaraAdmin/updateBiodataDariHasilAdmin — `export` + 3 alias (onclick HTML di bar parse). `window.tambahPesanAdminAi`, `window.currentAiCandidateId` (accessor).
- Referensi global implisit di-window-kan eksplisit (scan no-undef **0 error**); 4 double-prefix `window.window` dari blanket order diperbaiki. Build: ESM_CORE + 4 entri → bundel `app-5b7f5a3192.js` (418.4 KB, 45 file, **0 export bocor**, accessor utuh, idempoten). check:globals **nol kolisi** (45 file / 394 simbol). Audit: 52 file · **396 simbol** · HIGH=0 · MEDIUM=24 · LOW=372.
- Verifikasi: node --check ESM 4 file ✓ · no-undef 0 error ✓ · lint 0/12 ✓ · test **81/81** ✓ · **E2E SEMUA LULUS**: login, upload, biodata ✓ + **cek ai_copilot terarah**: modal AI copilot terbuka (admin.js), bar parse ter-inject (parse.js), saran AI tampil, `window.currentAiCandidateId` accessor live, klik tombol Hasil Wawancara (results.js) tanpa error JS ✓.

---

## 🆕 Sesi 2026-08-16 — dikerjakan oleh: agus khoci (via Freebuff)

### Fase 3 langkah 9 — admin_ops: js/admin_ops/* (6 file) ESM

- **`js/admin_ops/loading.js` → ESM** (2): setSkeletonLoading/jalankanSemuaSkeleton — `export` + 2 alias (engine/init.js `window.jalankanSemuaSkeleton`); `window.isAdmin/isKandidat` (accessor).
- **`js/admin_ops/schedule.js` → ESM** (3): getStatusWaktu/renderDashboardAgenda/renderJadwal — `export` + 3 alias (render/admin.js + api/wa.js via window); `window.ALL_SCHEDULES` (accessor), `window.limitJad` (accessor, di-reassign bare di inline onclick `limitJad+=10`).
- **`js/admin_ops/candidates.js` → ESM** (4): bukaModalListKandidat/keluarkanKandidatDariJob/mulaiKirimUndanganGrup/bukaModalCekDataSiswa — `export` + 4 alias; `window.currentCopyListTxt` (accessor state.js), `window.upsertCandidateMemory/patchFormMail` (api/forms.js ESM), `window.renderAdminFull`.
- **`js/admin_ops/sysconfig.js` → ESM** (7 + `CONFIG_CATEGORIES` const): renderSysConfig/tambahConfigItem/hapusConfigItem/pindahConfigItem/simpanConfigKeServer/simpanPengumuman — `export` + 6 alias; `window.DROPDOWNS` (accessor, mutasi array via referensi), `window.CURRENT_LANG` (i18n ESM, disinkron ulang saat toggle bahasa), `event.currentTarget` → **`window.event.currentTarget`** (strict mode ESM + no-undef).
- **`js/admin_ops/migration.js` → ESM** (3): jalankanMigrasi/renderMigrasiResults/salinSqlMigrasi — `export` + 3 alias.
- **`js/admin_ops/drive.js` → ESM** (8 + `DRIVE_CANDIDATES`): muatMigrasiDrive/bukaModalMigrasiDrive/tutupModalMigrasiDrive/renderMigrasiDriveList/migrasiDriveFieldHtml/driveSetStatus/driveBacaFileBase64/uploadDriveField — `export` + 8 alias; `DRIVE_CANDIDATES` var internal (reassign lokal, tanpa pemakai eksternal → tidak di-alias); `window.cekEkstensiFile` (03_candidate classic).
- Referensi global implisit di-window-kan eksplisit (scan no-undef **0 error**). Build: ESM_CORE + 6 entri → bundel `app-079a607684.js` (418.5 KB, 45 file, **0 export bocor**, idempoten). check:globals **nol kolisi** (45 file / 394 simbol). Audit: 52 file · **396 simbol** · HIGH=0 · MEDIUM=24 · LOW=372 · module-map 461 simbol.
- Verifikasi: node --check ESM 6 file ✓ · no-undef 0 error ✓ · lint 0/12 ✓ · test **81/81** ✓ · **E2E SEMUA LULUS**: login, upload, biodata ✓ + **cek admin_ops terarah**: tab Pengaturan render (11 kategori dropdown via accessor), tabel Jadwal render, modal list kandidat terbuka + terisi, 0 error JS ✓.

---

## 🆕 Sesi 2026-08-16 — dikerjakan oleh: agus khoci (via Freebuff)

### Fase 3 langkah 8 — admin_modal: js/admin_modal/* (dbfilter, cv, job) ESM

- **`js/admin_modal/dbfilter.js` → ESM** (4): setFilterBidang/setFilterTahapan/setSortDb/renderDbFilters — `export` + 4 alias window.*. State writes via accessor (`window.dbFilterBidang/dbFilterTahapan/dbSortType = ...`), `window.DROPDOWNS` (accessor), `window.filterDbJob` (render/admin.js ESM).
- **`js/admin_modal/job.js` → ESM** (2): lamarJob/copyInfoLoker — `export` + 2 alias. Pemakai classic (`window.jobTutupUntukLamar` dari 01_public.js, `window.bukaFormBridge` dari 03_candidate.js) di-window-kan; `window.currentKandidatWa/Name`, `window.salinTeksDecode`.
- **`js/admin_modal/cv.js` → ESM** (8): bukaDigitalCV, isiEditCepatCv, **toDateInputValue** (dipakai api/candidates.js via `window.toDateInputValue` — alias WAJIB), toggleEditCepatCv, simpanEditCepatCv, bukaInlinePreview, bukaPdfPreview (onclick HTML render/mail.js + candidate.js), simpanCatatanCv — `export` + 8 alias. Referensi global di-window-kan eksplisit (no-undef **0 error**): `window.ALL_CANDIDATES/ALL_DB_JOBS/ASSETS/isAdmin` (accessor), `window.ensureAllCandidates` (sudah), util (`safeSet/formatPendidikanTingkat/getHighResImage/getDirectDownloadUrl/normalizePhone`), helper classic (`normalizeGenderValue` 03_candidate, `bukaPreviewDokumen` 03_candidate, `previewFileInFrame` init/preview), core (`tr/esc/callAPI/showToast`). `toDateInputValue` DEFINISI di cv.js, dipakai internal bare + eksternal via alias.
- Build: ESM_CORE + 3 entri → bundel `app-1057be7ccc.js` (417.7 KB, 45 file, **0 export bocor**, idempoten). check:globals **nol kolisi** (45 file / 394 simbol). Audit: 52 file · **396 simbol** · HIGH=0 · MEDIUM=24 · LOW=372.
- Verifikasi: node --check ESM 3 file ✓ · no-undef 0 error ✓ · lint 0/12 ✓ · test **81/81** ✓ · **E2E SEMUA LULUS**: login-check, upload-check, biodata-check ✓ + **cek modal CV terarah**: admin login → `window.bukaDigitalCV` (ESM) → modal CV render (nama SATRIA PUTRA DEWANGG, tombol Edit Cepat tampil) · 0 error JS ✓.
- Catatan infrastruktur: preview platform (freebuff-preview) beberapa kali mati/502 di sesi ini — E2E dijalankan pakai pola resmi repo (server hidup dalam 1 perintah bersama test, `kill $!` di akhir).

---

## 🆕 Sesi 2026-08-16 — dikerjakan oleh: agus khoci (via Freebuff)

### Fase 3 langkah 7 — api: js/api/* (forms, jobs, candidates, wa) ESM

- **`js/api/forms.js` → ESM** (12 deklarasi): patchFormMail/upsertCandidateMemory/removeFormMail, prosesReviewForm/Approve/RejectForm, submitRejectForm, tandaiDibacaForm, toggleMailSelect, mailSelectAll, hapusFormMailTerpilih, hapusFormMail — `export` + 12 alias window.*. `window.submitRejectForm = async function(){}` diubah jadi `export async function submitRejectForm()` + alias (HTML partials/modals-shared.html onclick).
- **`js/api/jobs.js` → ESM** (11): upsertJobMemory/removeJobMemory, aksiAdmin, hapusLoker, downscaleImageFile, uploadFilesDirectly, submitFormAdmin, bukaEditFullLoker, submitEditFullLoker, bukaModalEditDbJob, simpanUpdateDbJob — `export` + 11 alias window.* (pemakai: render/admin.js + HTML onclick).
- **`js/api/candidates.js` → ESM** (32 deklarasi: modal Input Manual, upload kandidat + baris dokumen lain, Super Edit, revisi CV, QR lokal, filterCbx, pagination) — `export` + 30 alias window.*. `window.ensureAllCandidates`/`window.muatLebihKandidat` jadi `export async function` + alias (7 pemakai lintas file tetap jalan).
- **`js/api/wa.js` → ESM** (10): renderTugas + helper memori ALL_TUGAS/ALL_SCHEDULES + tambahTugasAdmin/updateStatusTugas/hapusTugasAdmin/prosesHapusJadwal/submitJadwal — `export` + 6 alias window.* (HTML onclick papan tugas/jadwal).
- Referensi global implisit di-window-kan eksplisit (scan no-undef **0 error**): state via accessor (`window.ALL_FORM/ALL_CANDIDATES/ALL_JOBS/ALL_DB_JOBS/ALL_TUGAS/ALL_SCHEDULES`), `window.MAIL_SELECTED` (accessor bridge render/mail.js), core (`window.tr/callAPI/esc/escJs`), util (`window.showToast/safeSet/setImg/getDirectDownloadUrl/normalizePhone`), render lintas domain (`window.renderFormInbox/updateMailBadge/renderAdminFull/renderLanguage`), helper classic (`window.cekUkuranFile/cekEkstensiFile/bacaFileBase64/normalizeGenderValue/toDateInputValue`), vendor (`window.qrcode`), engine (`window.refreshDataDinamis`).
- ⚠️ Blanket replace `ALL_CANDIDATES` berbahaya: `window.ALL_CANDIDATES_TOTAL` (sudah ber-prefiks) akan jadi `window.window...` — dipakai pola terarah `(ALL_CANDIDATES` + `ALL_CANDIDATES.find`, bukan blanket. Dicatat untuk langkah berikutnya.
- Build: ESM_CORE + 4 entri → bundel `app-ee4db83e37.js` (416.8 KB, 45 file, **0 export bocor**, idempoten). check:globals **nol kolisi** (45 file / 394 simbol top-level). Audit: 52 file · **396 simbol** · HIGH=0 · MEDIUM=24 · LOW=372.
- Verifikasi: node --check ESM 4 file ✓ · no-undef 0 error ✓ · lint 0/12 ✓ · test **81/81** ✓ · **E2E SEMUA LULUS**: login-check, upload-check, biodata-check + backend-fast-path ✓.

### 🐛 Fix artefak `<window.tr>` (blanket replace langkah 6, ketahuan saat cek tabel)

- **Gejala**: 4 file render (public/admin/candidate/mail) punya string HTML `'<window.tr class="rt-row...'` + `'</window.tr>'` — blanket replace `tr(` → `window.tr(` di langkah 6 ikut mengubah literal `<tr` di template tabel → tabel admin/publik render elemen unknown `<window.tr>` (style `rt-row`/border hilang, render tetap "jalan" karena td dibiarkan browser).
- **Fix**: `js/render/{public,admin,candidate,mail}.js` — `<window.tr` → `<tr`, `</window.tr>` → `</tr>` (14 titik). **Verifikasi DOM di browser** (script Playwright sekali pakai): login admin → tab Mail (baris `tr.rt-row` ada, 0 elemen `window.tr`) ✓ · tab DB Job ✓ · landing publik ✓ · 0 error JS ✓.

---

## 🆕 Sesi 2026-08-16 — dikerjakan oleh: agus khoci (via Freebuff)

### Fase 3 langkah 6 — render: js/render/* (5 file) ESM (commit `5afe39b`)

- **`js/render/*.js` → ESM** — domain render terbesar: public.js (4 fn: filter/tab
  publik + filter kelola loker), admin.js (6: renderAdminFull/switchTab/table
  DB job/badgeTahapanDb), candidate.js (tabel daftar kandidat + jobDilamarCell),
  share.js (modal share loker + template WA), mail.js (MAIL_SELECTED + status/
  bucket + filter UI + renderFormInbox) → `export` + alias window.* (15 total).
- **`MAIL_SELECTED`** di-reassign bare oleh `js/api/forms.js` → **accessor
  bridge** (pola state.js §3.2) supaya binding modul tidak basi.
- Referensi global implisit di-window-kan eksplisit — scan no-undef **0 error**
  (44 nama lintas-file; `var esc` lokal di mail.js dipertahankan lokal — blanket
  replacement sempat menimpa 4 alias jadi self-reference `window.x =
  window.x` → ketahuan E2E & diperbaiki manual).
- **`ALL_CANDIDATES_TOTAL`** (phantom global dari langkah 5) kini var resmi di
  state.js + accessor bridge.
- Build: ESM_CORE + 5 entri → `app-4c1c681c7c.js` (415.3 KB, 0 export bocor,
  nol kolisi 391 simbol). Verifikasi: node --check ESM 5 file ✓ · no-undef
  0 error ✓ · lint 0/12 ✓ · test **81/81** ✓ · audit HIGH=0 ✓.

### 🐛 Fix backend (ditemukan E2E langkah 6): `nextCandidateId()` bentrok antar-tabel

- **Gejala**: biodata-check GAGAL — modal pemberkasan tidak tertutup setelah
  Simpan, tanpa error JS. Diagnostik fetch menangkap: `simpanBiodataLengkap` →
  **HTTP 409 duplicate key** `uq_master_id_kandidat` `(id_kandidat)=(ASJ00226)`.
- **Akar masalah (bukan regresi frontend)**: `nextCandidateId()` hanya membaca
  max `id_kandidat` dari `database_candidate`; `master_database_candidate`
  sudah punya `ASJ00226` (leftover E2E dari run yang mati sebelum cleanup,
  wa 6281201154027) → INSERT master berikutnya untuk kandidat baru tanpa baris
  master 409 permanen. Ini bug laten produksi: begitu master memakai id ≥ max
  kandidat, simpan biodata kandidat baru rusak total.
- **Fix** (`netlify/functions/_lib/db/candidates.js` + `candidate-helpers.js`):
  `maxCandidateIdNumber()` kini mengambil max dari **KEDUA** tabel
  (`database_candidate` + `master_database_candidate`), fallback scan penuh
  ikut master. Read-only, aman untuk skema apa pun (kolom tidak ada → skip).
- **Bersihkan data**: 2 baris leftover E2E (database_candidate `E2E1786880030`
  + master `ASJ00226`, wa 6281201154027, nama KANDIDAT, dibuat 11:33 UTC oleh
  run yang di-kill) dihapus via REST (semantik cleanup test yang sama).
- **Verifikasi**: biodata-check **🎉 SEMUA LULUS** (modal tertutup + data
  tersinkron + persist), login-check ✓, upload-check ✓. Test 81/81 ✓.

### Fase 3 langkah 5 — engine: js/engine/* (pipeline, dashboard, guards, init) ESM (commit `4ea3e32`)

- **`js/engine/pipeline.js` → ESM** (4 fn): tahapanPipeline, tahapanMatchIdx,
  getTahapanProgress, tahapanStepIndex — export + alias window.*; referensi
  DROPDOWNS di-window-kan.
- **`js/engine/dashboard.js` → ESM** (6): evaluasiTahapanKandidat,
  renderJobDilamar, **BERKAS_17 / BIO_FIELDS_19** (konstanta),
  renderProgresPemberkasan, kalkulasiProgress — export + alias; esc/tr/ASSETS
  → window.*.
- **`js/engine/guards.js` → ESM** (3): adaModalTerbuka, sedangDiscrollTabel,
  updateMailBadge — export + alias; ALL_FORM/PREV_MAIL_COUNT/showToast/tr →
  window.*.
- **`js/engine/init.js` → ESM** (2): **refreshDataDinamis (10 pemakai) +
  initApp (6 pemakai)** — export + alias; seluruh referensi lintas file
  di-window-kan eksplisit (state via accessor, tr/callAPI/showToast/esc/safeSet,
  render lintas domain, changePage/applyTheme/renderLanguage, dll).
- 🐛 **Phantom global difix**: `ALL_CANDIDATES_TOTAL` (dulu di-assign bare di
  initApp tanpa deklarasi — di strict mode ESM akan ReferenceError) kini
  dideklarasikan resmi di `js/init/state.js` + accessor bridge (candidates.js
  sudah memakainya via `window.ALL_CANDIDATES_TOTAL`).
- ⚠️ Catatan arsitektur: antar-file ESM belum boleh `import` (build masih
  concat + IIFE per file) → panggilan lintas modul engine memakai `window.*`
  eksplisit — dicatat di ESM_BRIDGE.md §3.3.
- Build: `build-js.mjs` ESM_CORE + 4 entri → bundel `app-a32c94c192.js`
  (413.5 KB, 45 file, 0 export bocor). check:globals nol kolisi (391 simbol).
- Audit: 52 file · **396 simbol** · HIGH=0 · MEDIUM=24 · LOW=372.
- **Verifikasi**: node --check ESM 4 file ✓ · no-undef 0 error ✓ · lint 0/12 ✓
  · test **81/81** ✓ · uji import Node (tahapanPipeline 9 langkah, initApp
  DOM-safe, refreshDataDinamis via stub window.callAPI) ✓ · **E2E SEMUA
  LULUS**: login-check, upload-check, biodata-check.

---

## 🆕 Sesi 2026-08-16 — dikerjakan oleh: agus khoci (via Freebuff)

### Fase 3 langkah 4 — domain auth: js/04_auth.js ESM (commit `2463b5a`)

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

## ⏳ BELUM SELESAI — todo yang masih terbuka (update 2026-08-17)

> Daftar lengkap + konteks ada di `REFACTOR_TODO.md` → "📋 SISA PEKERJAAN".

1. **Fase 3.5 (Kandidat 1) — selesaikan jembatan `window.*` → import nyata**: Langkah 1 ✅ (core → util/state, 19 referensi, commit `4fa4114`). Sisa Langkah 2–6: state accessor (pembaca → import binding), render lintas domain, api lintas domain, helper classic, fasad PortalBridge. Kriteria: scan `window\.\w+\s*=` menurun, no-undef 0 error, check:globals nol kolisi, E2E SEMUA LULUS.
2. **Fase 4 lanjutan — i18n split per domain**: sekarang 1 file data per bahasa (`i18n/locales/{id,jp}.js`); pecah per domain (`common`, `auth`, `public`, …) + verifikasi lint key duplikat lintas file.
3. **Fase 5 — HTML & partial (belum dimulai)**: ekstrak head/header/footer/bottom-nav/social ke `partials/`, normalisasi stack `<script>` halaman standalone → `scripts-shared.html`, pindahkan `<style>` inline → `src/`, verifikasi `build:html` byte-compatible + visual.
4. **Fase 6 — build/tooling**: `build-js.mjs` daftar entry/modul eksplisit (hapus STACK concat), sourcemap opsional, CI perluas job lint+test+build+e2e:share, update AGENTS/WORKFLOW per fase.
5. **Backend & keputusan terbuka**: pastikan semua modul pakai `supabase.*` helper (bukan fetch mentah) · keputusan entry per halaman standalone (entry ESM vs classic) · hapus alias `window.*` per-simbol (tercakup Fase 3.5 L6).
6. **Performa opsional (prioritas rendah)**: cache admin TTL pendek · cek region Supabase.
7. **Infra E2E**: butuh runtime Node.js asli — playwright-core macet di Bun/Windows (root cause 2026-08-17); developer/CI pakai Node ≥22, bukan bun.

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

