# ESM_BRIDGE.md — Migrasi Global Script → ES Modules (Hybrid Coexistence)

> **Status: Fase 3 TUNTAS (langkah 13) + bundel bundle-mode (langkah 14) +
> no-undef aktif (langkah 15)** —
> SEMUA file frontend kini ES Modules: core (i18n/api-client) + init (state/util + theme/preview/nav/boot)
> + auth + engine + render + api (`js/api/*`) + admin_modal (`js/admin_modal/*`)
> + admin_ops (`js/admin_ops/*`) + ai_copilot (`js/ai_copilot/*`) + sisa
> bundle-only (`01_public`, `03_candidate`, `08_wa_pintar`, `10_cv_rirekisho`,
> `10b_cv_builders`, `12_esign_match`, `13_rincian_builder`, `helpers_cv`) +
> **file halaman standalone (`upload-guard`, `apply-docs`, `pwa`,
> `js/pages/*`) — halaman standalone kini memuat via `<script
> type="module">`**. Tidak ada lagi file classic di frontend.
> Dokumen ini = hasil **audit global pollution** + pola **bridge** yang dipakai
> supaya konversi bertahap TANPA regresi. Update di sini setiap kali modul baru
> di-ESM-kan (lihat urutan konversi di bagian 6).
>
> Baseline audit otomatis: `.freebuff/audit-globals.json` (dihasilkan
> `node scripts/audit-globals.mjs --json`) · `.freebuff/module-map-frontend.json`
> (`node scripts/module-map.mjs --json`).

---

## 1. Audit Global Pollution & Collision Risk

### 1.1 Angka besar (baseline 2026-08-16, setelah core di-ESM)

| Metrik | Nilai |
| --- | --- |
| File frontend diaudit | **52** (js/** rekursif + api-client.js + i18n.js + pwa.js) |
| Simbol global (deklarasi top-level + `window.*`) | **405** |
| Kolisi (1 nama dideklarasikan 2+ file) | **0** ✓ (guard `check:globals` juga memastikan 0 per build) |
| Shadowing API bawaan browser (`window.name`, `window.status`, `window.open`, …) | **0** ✓ |
| Risk HIGH | **0** |
| Risk MEDIUM (kontrak lintas-file berat) | **25** |
| Risk LOW (spesifik / privat-able) | **382** |

### 1.2 Inventaris risk MEDIUM (kontrak global yang WAJIB diekspor saat ESM)

Nama-nama ini dipakai lintas file — ketika modulnya di-ESM-kan, identifier ini
harus `export` + alias `window.*` (lihat bagian 5), kalau tidak pemakai classic
langsung patah (ReferenceError).

| Simbol | Pemakai (file) | Modul asal | Catatan |
| --- | --- | --- | --- |
| `tr` | 42 | i18n.js | ✅ sudah ESM |
| `callAPI` | 28 | api-client.js | ✅ sudah ESM |
| `esc` | 26 | api-client.js | ✅ sudah ESM |
| `showToast` | 24 | js/init/util.js | ✅ sudah ESM (langkah 3) |
| `escJs` | 12 | api-client.js | ✅ sudah ESM |
| `trOption` | 12 | i18n.js | ✅ sudah ESM |
| `ALL_CANDIDATES` | 12 | js/init/state.js | ✅ sudah ESM (langkah 3, accessor bridge) |
| `isAdmin` | 12 | js/init/state.js | var global state |
| `currentAdminName` | 12 | js/init/state.js | var global state |
| `refreshDataDinamis` | 10 | js/engine/init.js | |
| `ALL_JOBS` | 9 | js/init/state.js | |
| `currentKandidatWa` | 9 | js/init/state.js | |
| `normalizePhone` | 8 | js/init/util.js | ✅ sudah ESM (langkah 3) |
| `ensureAllCandidates` | 7 | js/api/candidates.js | |
| `safeSet` | 7 | js/init/util.js | ✅ sudah ESM (langkah 3) |
| `CURRENT_LANG` | 6 | i18n.js | ✅ sudah ESM |
| `initApp` | 6 | js/engine/init.js | |
| `ALL_DB_JOBS` | 6 | js/init/state.js | |
| `ASSETS` | 6 | js/init/state.js | |
| `currentKandidatName` | 6 | js/init/state.js | |
| `DROPDOWNS` | 5 | js/init/state.js | |
| `isKandidat` | 5 | js/init/state.js | |
| `AUTO_REFRESH_TIMER` | 5 | js/init/state.js | |
| `renderAdminFull` | 5 | js/render/admin.js | |

Daftar LENGKAP (394 simbol + file asal + pemakai): `node scripts/audit-globals.mjs`
atau `.freebuff/audit-globals.json`.

### 1.3 Shadowing & bentrok API browser — METODOLOGI

`scripts/audit-globals.mjs` memeriksa setiap deklarasi top-level terhadap
**~110 property `window` bawaan** (`name`, `status`, `close`, `open`, `length`,
`top`, `parent`, `frames`, `self`, `location`, `navigator`, `screen`,
`localStorage`, `fetch`, `alert`, `confirm`, `print`, `find`, `stop`, …).
Hasil saat ini: **tidak ada** deklarasi yang menimpa API browser — semua nama
sudah ber-prefiks domain (`ALL_*`, `render*`, `current*`, `buka*`, …), jadi
risiko bentrok dengan library pihak ketiga **rendah** dan tidak ada identifier
yang butuh rename darurat.

> ⚠️ Yang perlu dijaga: file baru (modul ESM maupun classic) JANGAN membuat
> deklarasi top-level bernama `tr`, `callAPI`, `LANG`, `showToast`, dsb —
> nanti kena guard `bun run check:globals` (kolisi) + risk audit.

---

## 2. Refactored Module — core layer (ESM murni)

### 2.1 `i18n.js` (2.631 baris → ESM)

Deklarasi publik kini `export`; **window alias dipertahankan** di bagian bawah
(bridge untuk pemakai classic). Internal tetap satu sumber kebenaran.

```js
export var CURRENT_LANG = localStorage.getItem('asj_lang') || 'id';
export const LANG = { ... };                    // kamus id + jp
export const OPTION_TRANSLATIONS = { ... };     // kamus nilai DB → label
export function trOption(value) { ... }
export function trOptionId(value) { ... }
export function tr(path) { ... }                // fallback ke path kalau key hilang
export function renderLanguageLight() { ... }
export function toggleFormLanguage() { ... }
// --- bridge (tetap ada) ---
window.tr = tr;  window.LANG = LANG;  window.CURRENT_LANG = CURRENT_LANG;
window.OPTION_TRANSLATIONS = OPTION_TRANSLATIONS;
window.trOption = trOption;  window.trOptionId = trOptionId;
window.renderLanguageLight = renderLanguageLight;  window.toggleFormLanguage = toggleFormLanguage;
```

### 2.2 `api-client.js` (→ ESM) — PLUS isolasi scope yang ketat

Hanya **API publik** yang diekspor; **6 internal jadi PRIVATE modul** (sebelumnya
bocor jadi global di bundel concat):

```js
export async function callAPI(action, payload) { ... }   // + window.callAPI = callAPI
export function esc(x) { ... }                            // + window.esc = esc
export function escJs(x) { ... }                          // + window.escJs = escJs
export function resolveSelfUrl(url) { ... }               // + window.resolveSelfUrl = resolveSelfUrl

// PRIVATE sekarang (TIDAK lagi global):
const NETLIFY_API_BASE = '/.netlify/functions';
const CANDIDATE_ACTIONS = new Set([...]);
const ADMIN_ACTIONS = new Set([...]);
const NETLIFY_FUNCTIONS = { ... };   // legacy table (tidak dipakai runtime)
function getApiUrl(action) { ... }   // dead code (warisan GAS)
function callNetlify(action, payload) { ... } // dead code (warisan GAS)
```

### 2.3 Isolasi scope — yang berubah & yang dijamin SAMA

| Aspek | Sebelum (classic) | Sesudah (ESM + build IIFE per file) |
| --- | --- | --- |
| `callAPI`, `tr`, `LANG`, `esc`, … | global `window.*` | `export` + alias `window.*` (sama) |
| `NETLIFY_API_BASE`, `CANDIDATE_ACTIONS`, `ADMIN_ACTIONS`, `getApiUrl`, `callNetlify`, `NETLIFY_FUNCTIONS` | global (bocor) | **private modul** (tidak bocor) ✓ |
| Perilaku runtime | — | byte-identik (uji: node import, lint, test 81/81, build) |
| Strict mode | sloppy (bundel) | modul = strict — referensi global tersisa **diubah ke `window.*` eksplisit** (bagian 2.4) |

### 2.4 Fix yang WAJIB saat file jadi ESM (ditemukan oleh scan `no-undef`)

Modul ESM **tidak** fallback ke global scope untuk identifier tak dikenal
(berbeda dari script sloppy). Referensi global implisit di dalam modul harus
ditulis `window.*` eksplisit. Yang diperbaiki di turn ini:

- `api-client.js` (jalur error sesi basi): `tr(...)` → `window.tr(...)`,
  `showToast(...)` → `window.showToast(...)` (guard `typeof` ikut di-window-kan).
- `i18n.js` (`toggleFormLanguage`): `renderLanguage()`, `renderSysConfig()`,
  `rePopulateDropdowns()` → `window.render*` (guard `typeof` ikut).

Cara scan (jangan dilewati setelah konversi file baru):

```bash
bunx eslint --no-warn-ignored --rule 'no-undef: error' --rule 'no-unused-vars: off' <file>.js
```

---

## 3. Hybrid Interop / Bridge Layer — `window.PortalBridge`

File **`js/core/bridge.js`** (modul ESM) memuat i18n + api-client via `import`
lalu mengekspos **satu namespace** untuk kode legacy:

```js
import * as api from '../../api-client.js';
import * as i18n from '../../i18n.js';

export const PortalBridge = {
  // API backend
  callAPI: api.callAPI,
  esc: api.esc,
  escJs: api.escJs,
  resolveSelfUrl: api.resolveSelfUrl,
  // i18n
  LANG: i18n.LANG,
  get CURRENT_LANG() { return i18n.CURRENT_LANG; },  // getter LIVE (tidak basi)
  tr: i18n.tr,
  trOption: i18n.trOption,
  trOptionId: i18n.trOptionId,
  renderLanguageLight: i18n.renderLanguageLight,
  toggleFormLanguage: i18n.toggleFormLanguage,
  safeCallAPI(action, payload) { /* fallback window.callAPI + guard */ },
};
window.PortalBridge = PortalBridge;
export default PortalBridge;
```

Efek samping `import` di bridge: i18n & api-client **mengeksekusi alias
`window.*` klasiknya sendiri** — jadi pemakai lama (`js/*.js`, inline
`onclick="callAPI(...)"`) tetap jalan tanpa disentuh.

### 3.1 Pemanggilan aman dari kode legacy

Urutan muat antara modul (deferred) dan script classic tidak selalu dijamin —
pakai helper ini di kode legacy yang dipanggil saat parse:

```js
// Pola aman #1 — lewat bridge (kalau halaman memuat bridge.js):
function callApiAman(action, payload) {
  const fn = (window.PortalBridge && window.PortalBridge.callAPI) || window.callAPI;
  if (typeof fn !== 'function') {
    console.error('[portal] core belum dimuat');
    return Promise.reject(new Error('PortalBridge belum siap'));
  }
  return fn(action, payload);
}

// Pola aman #2 — guard jenis fungsi untuk akses langsung ke window alias:
if (typeof window.tr === 'function') el.textContent = window.tr('ui.key');
```

Kode ESM baru yang butuh core cukup `import { callAPI } from '/api-client.js'`
atau `import { tr } from '/i18n.js'` — tidak perlu window sama sekali.

### 3.2 Pola khusus untuk STATE global yang di-REASSIGN (accessor bridge)

Fungsi tidak pernah di-reassign → alias `window.X = X` biasa cukup. Tapi state
MUTABLE (`ALL_JOBS`, `isAdmin`, `CURRENT_THEME`, …) SERING di-reassign oleh
pemakai classic dengan bare assignment:

```js
// classic (bundel, sloppy):
ALL_JOBS = res.jobs || [];
isAdmin = true;
CURRENT_THEME = theme;
```

Alias data property biasa hanya meng-update `window.X` — binding modul jadi
BASI, dan `import { ALL_JOBS } from './state.js'` di modul lain membaca nilai
lama. Solusi (dipakai di `js/init/state.js`): **accessor get/set di window**
yang mendelegasikan langsung ke binding modul — satu sumber kebenaran:

```js
export var ALL_JOBS = [];
// ...
function bridgeState(name, get, set) {
  Object.defineProperty(window, name, { configurable: true, get, set });
}
bridgeState('ALL_JOBS', () => ALL_JOBS, (v) => { ALL_JOBS = v; });
```

Bare `ALL_JOBS = [...]` di classic → setter → binding modul ikut berubah;
bare baca `ALL_JOBS` → getter → nilai modul. Tidak ada jalur yang bisa basi.
Catatan: import namespace bersifat read-only — modul ESM lain yang mau
MENULIS state harus lewat fungsi setter/action (belum ada), bukan assignment.

### 3.3 Panggilan lintas-file ESM — pakai `window.*`, BELUM `import`

Build saat ini masih concat + IIFE per file (export di-strip per file, bundel
classic). Konsekuensi: **file ESM tidak boleh saling `import`** — statement
import tidak di-resolve oleh transform dan akan bocor ke bundel classic
(SyntaxError). Sampai bundle jadi ESM (langkah 6 roadmap), panggilan lintas
modul ESM memakai `window.*` eksplisit, mis. init.js (ESM) memanggil
renderJobDilamar dari dashboard.js (ESM) via `window.renderJobDilamar(...)`.
Ekspor tiap modul tetap ada (untuk import ESM masa depan) — hanya pemakaian
lintas modul saat ini yang lewat window alias.

---

## 4. Petunjuk Integrasi (HTML Load)

### 4.1 Halaman standalone (ai_form, apply-full, master-full, share, siswa-baru)

Tag `i18n.js`/`api-client.js` yang dulu classic (`<script src>`) diganti
**`<script type="module">`** — satu tag per halaman, di posisi yang sama:

```html
<!-- ai_form.html & master-full.html: core lengkap lewat bridge -->
<script type="module" src="/js/core/bridge.js?v=esm1"></script>

<!-- apply-full.html & siswa-baru.html: hanya api-client (tidak butuh i18n) -->
<script type="module" src="/api-client.js?v=esm1"></script>

<!-- share.html: hanya i18n -->
<script type="module" src="/i18n.js?v=esm1"></script>
```

**Aturan urutan (penting, karena modul SELALU deferred):**

```html
<script type="module" src="...core..."></script>   <!-- 1. ESM core (deferred) -->
<script src="/js/upload-guard.js"></script>        <!-- 2. classic: jalan saat parse -->
<script src="/js/pages/xxx.js"></script>           <!-- 3. classic: jalan saat parse -->
<script src="/pwa.js"></script>
```

1. Script **classic** dieksekusi saat parsing dokumen (sebelum modul).
2. Script **module** dieksekusi setelah parse selesai, **sebelum
   `DOMContentLoaded`**.
3. Syarat aman: kode top-level classic di `js/pages/*.js`, `upload-guard.js`,
   `apply-docs.js` **tidak boleh memanggil `callAPI`/`tr`/`LANG` saat parse**
   (sudah diaudit — semua pemakaian ada di fungsi/event runtime).
4. Inline `onclick="callAPI(...)"` aman: pasti terjadi setelah modul jalan.

### 4.2 admin.html & index.html (bundel)

Tidak berubah — bundel tetap `<script src="/assets/app-*.js">` (classic).
`scripts/build-js.mjs` sekarang memproses file ESM di STACK per-file dengan
esbuild `format:'iife'` (export di-strip, alias `window.*` jalan), file classic
lain tetap concat apa adanya. Bukti di bundel `assets/app-7f821ddf7c.js`:
`window.callAPI`, `window.tr`, `window.LANG` ada; **0 statement `export`** bocor.

### 4.3 Cache-busting

`?v=` di tag module dibump ke `esm1` saat konten file berubah (i18n.js,
api-client.js, bridge.js). Service worker TIDAK meng-cache file `/i18n.js`,
`/api-client.js`, `/js/**` (lihat SHELL sw.js) — halaman standalone selalu fresh.

---

## 5. Kontrak untuk modul ESM berikutnya (WAJIB baca sebelum konversi)

1. **Export API publik** + **`window.<nama> = <nama>`** untuk tiap simbol yang
   masih dipakai lintas file (lihat tabel MEDIUM di bagian 1.2).
2. **Jangan export internal** — kesempatan memperkecil jejak global
   (contoh: api-client.js, 6 internal jadi privat).
3. **Ganti referensi global implisit ke `window.*` eksplisit** di dalam modul
   (scan `no-undef`, bagian 2.4).
4. **Jangan sentuh urutan STACK** build-js.mjs kalau hanya menambah `export` —
   per-file IIFE otomatis menangani; kalau file keluar dari STACK, perbarui juga
   tag halaman standalone yang memuatnya langsung.
5. **Verifikasi minimum:** `node --check --input-type=module < file` →
   `bunx eslint ... --rule 'no-undef: error'` → `bun run lint` → `bun run test`
   → `bun run build` (check:globals wajib hijau).

---

## 6. Urutan konversi berikutnya (roadmap Fase 3)

1. ✅ **Core: `i18n.js` + `api-client.js`** — SELESAI (langkah 2, turn lalu).
2. ✅ **`js/init/state.js` + `js/init/util.js`** — SELESAI (langkah 3, turn ini).
   State global (33 var, termasuk yang di-REASSIGN oleh classic) memakai
   **accessor get/set bridge** (bukan alias biasa) supaya binding modul selalu
   sinkron — lihat §3.2. Util (19 fungsi) memakai alias window biasa + referensi
   global eksplisit `window.*` (`tr`, `trOption`, `trOptionId`, `esc`,
   `DROPDOWNS`, `toastWaFormat`). `js/init/*` tidak dimuat halaman standalone →
   bridge hanya untuk pemakai bundel.
3. ⏭️ Domain per domain (auth → engine → render → api → admin_* → ai_copilot →
   sisanya) — tiap langkah: export + import di pemakainya + alias window sampai
   semua pemakai di-import. **`04_auth.js` ✅ (langkah 4) + `engine/*` ✅
   (langkah 5) + `render/*` ✅ (langkah 6) + `js/api/*` ✅ (langkah 7) +
   `js/admin_modal/*` ✅ (langkah 8) + `js/admin_ops/*` ✅ (langkah 9) +
   `js/ai_copilot/*` ✅ (langkah 10) + `js/init/{theme,preview,nav,boot}` ✅
   (langkah 11) + sisa classic bundle-only ✅ (langkah 12): `01_public`,
   `03_candidate`, `08_wa_pintar`, `10_cv_rirekisho`, `10b_cv_builders`,
   `12_esign_match`, `13_rincian_builder`, `helpers_cv` — **✅ (langkah 13,
   TERAKHIR): `upload-guard`, `apply-docs`, `pwa`, `js/pages/*` jadi ESM;
   halaman standalone memuat via `<script type="module">`. Konversi Fase 3
   TUNTAS — tidak ada file classic tersisa.**
   Bundel admin/index kini **bundle mode**: entry `js/main.js` (side-effect
   import semua modul sesuai STACK) → `esbuild.build` 1 IIFE
   (`treeShaking:false`, `minify:true`) — langkah 14. Concatenation & ESM_CORE
   dihapus dari build-js.mjs; STACK dipertahankan untuk check-globals.
   — catatan: fungsi yang dipanggil HTML inline
   `onclick` WAJIB dapat alias window; referensi global implisit di dalam
   modul di-window-kan eksplisit; **antar-file ESM belum boleh `import`
   (build masih concat + IIFE per file) — panggilan lintas modul ESM
   memakai `window.*` eksplisit sampai bundle jadi ESM (lihat §3.3)**.
   `render/mail.js` punya `var esc` LOKAL (hoisting mencakup renderFormInbox)
   — jangan di-window-kan; blanket replace lintas file harus dicek
   self-reference alias (`window.x = window.x`) DAN literal template (`<tr`
   → `<window.tr` — ketahuan langkah 7) setelah jalan. Catatan langkah 9:
   `event.currentTarget` → `window.event.currentTarget`; catatan langkah 10:
   state lintas-modul yang di-reassign (`currentAiCandidateId`) pakai
   accessor bridge; **catatan langkah 11: konstanta lintas-file yang dipakai
   via `window.X` (mis. `window.THEMES` di render/public.js) WAJIB dapat
   alias window juga — bukan cuma fungsi** (regresi ini ketahuan E2E,
   `Cannot read properties of undefined (reading 'INTER_VIP')`). Catatan
   langkah 12: (a) **typeof-guard di modul scope selalu 'undefined'** untuk
   bare identifier — `typeof callAPI` di 13_rincian_builder tanpa `window.`
   prefix membuat fallback koleksi DB tidak pernah dimuat; (b) **state murni
   internal jadikan PRIVATE modul** (`_riwayatLokerAktif`, `fsCanvas`,
   `signData`, `matchedCandidates`, `RB_*` dll) — tidak perlu alias window
   kalau tak ada pemakai luar; (c) **CURRENT_LANG accessor** — binding modul
   i18n basi kalau cuma alias data property (toggle bahasa diam-diam mati);
   (d) alias window utk onclick string yang DI-GENERATE modul itu sendiri
   (`window.bukaPreviewDokumen` di setStatusBerkas, `window.tutupDetailLoker`
   di bukaDetailLoker) — string dieval di global scope, bukan scope modul.
   Catatan langkah 13: (a) **file yang juga masuk bundel admin/index
   (`upload-guard`, `pwa`) wajib ditambah ke ESM_CORE** — tanpa IIFE,
   `export` bocor jadi SyntaxError di bundel classic; (b) **halaman
   standalone → `type="module"`**: urutan dokumen tag dipertahankan (modul
   dieksekusi berurutan setelah parse), inline classic (theme) tetap jalan
   duluan, `onload`/`onclick` HTML tetap aman karena modul selesai sebelum
   event; (c) **state UI halaman (chatHistory/latestCandidateData/*Base64)
   PRIVATE modul** — tidak ada pemakai lintas file, jangan di-alias.
4. ✅ **Entry `js/main.js` + `esbuild bundle` (ganti concat)** — SELESAI
   (langkah 14, turn ini). `js/main.js` side-effect import semua modul sesuai
   STACK; `build-js.mjs` memakai `esbuild.build({ entryPoints: ['js/main.js'],
   bundle: true, format: 'iife', treeShaking: false, minify: true })`.
   `treeShaking: false` WAJIB — import side-effect + alias window.* harus
   dipertahankan (pengalaman empiris langkah 1: bundle mode RENAME/tree-shake
   simbol dan mematahkan referensi global).
5. ⏭️ Halaman standalone jadi entry ESM per halaman (esbuild `entryPoints`
   array / `--splitting`) ATAU tetap `<script type="module">` per halaman —
   keputusan dicatat di PROGRESS.md. Sekarang tidak mendesak: halaman
   standalone tetap jalan tanpa bundel.
6. ✅ **Aktifkan `no-undef` per file ESM** — SELESAI (langkah 15, turn ini).
   `eslint.config.js` memakai `no-undef: error` utk `js/**/*.js` +
   `api-client.js` + `i18n.js` + `pwa.js`. Scan awal: **39 pelanggaran di
   `js/pages/master_full.js`** (file lain 0) — (a) `tr`/`callAPI`/
   `cekUploadFile` bare → window-ified; (b) **bridge alias HILANG TOTAL**
   (`changeStep`/`submitMaster`/`handleFile` tidak di-export, 0 alias window)
   → HTML onclick/onchange page itu bakal ReferenceError. Pelajaran: **no-undef
   tidak menangkap alias yang hilang** — verifikasi tiap halaman standalone
   dengan mengklik handler HTML-nya (smoke langkah 15 membuktikan).
   `no-unused-vars` sengaja tetap nonaktif (banyak export utk alias window.*
   yang dipakai lintas halaman).

---

### Langkah 12 — sisa file classic bundle-only ESM (commit `3af237a`, turn ini)

8 file terakhir yang TIDAK dimuat halaman standalone → aman di-IIFE tanpa
ubah HTML: `01_public`, `03_candidate`, `08_wa_pintar`, `10_cv_rirekisho`,
`10b_cv_builders`, `12_esign_match`, `13_rincian_builder`, `helpers_cv`.
±119 deklarasi → `export` + ±100 alias `window.*` (HTML onclick + onclick
string lintas file + window.* eksplisit dari modul ESM lain).

- **State yang di-reassign tetap accessor** (§3.2): `window.CURRENT_WA_KANDIDAT`
  (ditulis bare di bukaModalWaPintar), `window.ACTIVE_PEMBERKASAN_WA/NAMA`
  (ditulis bare di bukaModalPemberkasan). State murni internal dijadikan
  PRIVATE modul (tak ada pemakai luar): `_riwayatLokerAktif`, `fsCanvas`/
  `activeDrawingType`/`isLandscapeMode`/`signData`/`matchedCandidates`/
  `currentMatchJobCode`, `RB_*`, `MAX_FILE_BYTES`/`ALLOWED_FILE_EXT`/
  `ekstensiDariAccept`/`compressImage`/`setStatusBerkas` (hanya dipakai file
  sendiri; apply_full.js punya salinan lokal sendiri).
- **helpers_cv jadi `export function` murni** (bukan UMD): vitest meng-import
  langsung (`js/helpers_cv.test.js`), alias window.* dibungkus guard
  `typeof window !== 'undefined'` supaya aman di node.
- **Hati-hati typeof-guard di modul scope**: `typeof callAPI` di file ESM
  SELALU 'undefined' (tidak fallback ke global) — 13_rincian_builder punya
  guard `typeof callAPI !== 'function'` → tanpa `window.` prefix, koleksi DB
  preset tidak pernah dimuat. Semua bare `callAPI`/`tr`/`showToast`/`parseRincianBiaya`
  di-window-kan eksplisit.
- 🐛 **CURRENT_LANG accessor (latent sejak langkah 2)**: i18n.js cuma
  `window.CURRENT_LANG = CURRENT_LANG` (alias data property satu arah).
  `setLanguage` (01_public) menulis `window.CURRENT_LANG` tapi binding modul
  i18n basi → tr()/trOption() tetap bahasa lama. Fix: `Object.defineProperty`
  get/set mendelegasikan ke binding modul (pola §3.2). Diverifikasi browser:
  id→jp→id, tr('ui.tab_loker')='求人情報', 0 error JS.

### Langkah 11 — init sisanya (theme/preview/nav/boot) ESM (commit `6ca9d05`, turn ini)

- `node --check --input-type=module` 4 file js/init/* ✓ · scan `no-undef` **0
  error** ✓ (state accessor CURRENT_THEME/ASSETS/isAdmin/current*/
  AUTO_REFRESH_TIMER/PREV_MAIL_COUNT; util ESM setBg/isPreviewableFile/
  previewFinalUrl; render ESM renderPublicFilter*; classic
  injectModalWaPintar; 04_auth ESM showLoginAdminMaster; vendor XLSX) ·
  `bun run lint` 0/12 ✓ · `bun run test` **81/81** ✓.
- `bun run build`: check:globals **nol kolisi** (45 file / **394 simbol**) ·
  bundel `app-ad18b34535.js` (418.6 KB) · 0 export bocor ✓ · idempoten ✓.
- 22 alias window.* total (4 file); `VENDOR_V`/`_vendorPromises` PRIVATE
  modul (tanpa pemakai eksternal). Audit: 52 file · **396 simbol** · HIGH=0
  · MEDIUM=24 · LOW=372 (`.freebuff/audit-globals.json` diperbarui).
- 🐛 **Bugfix window.THEMES** (ketahuan E2E login-check): render/public.js
  memakai `window.THEMES[window.CURRENT_THEME]` → setelah THEMES scoped
  modul, `window.THEMES` undefined → crash dashboard admin KHOCI. Fix: alias
  `window.THEMES` + `window.DEFAULT_ASSETS` di bridge theme.js.
- **E2E SEMUA LULUS**: login-check (dashboard admin KHOCI 0 error JS),
  upload-check, biodata-check ✓.

### Langkah 10 — ai_copilot/* ESM (commit `01e3f81`, turn ini)

- `node --check --input-type=module` 4 file js/ai_copilot/* ✓ · scan `no-undef`
  **0 error** ✓ (state accessor ALL_CANDIDATES/currentKandidatWa/Name;
  classic isVipCatatan; core/util via window; lintas modul via window.*
  §3.3) · `bun run lint` 0/12 ✓ · `bun run test` **81/81** ✓.
- `bun run build`: check:globals **nol kolisi** (45 file / **394 simbol**) ·
  bundel `app-5b7f5a3192.js` (418.4 KB) · 0 export bocor ✓ · accessor
  `currentAiCandidateId` utuh ✓ · idempoten ✓.
- **`currentAiCandidateId` = accessor bridge** (di-reassign bare di
  bukaAdminAiCopilot, dibaca parse.js/results.js); `urlFotoJeklin` const
  alias biasa (dibaca interview.js). 14 alias window.* total (4 file).
  Audit: 52 file · **396 simbol** · HIGH=0 · MEDIUM=24 · LOW=372
  (`.freebuff/audit-globals.json` diperbarui).
- **E2E SEMUA LULUS**: login-check, upload-check, biodata-check ✓ + cek
  ai_copilot terarah: modal AI copilot terbuka (admin.js ESM), bar parse
  ter-inject (parse.js ESM), saran AI tampil, `window.currentAiCandidateId`
  live, klik tombol Hasil Wawancara (results.js ESM) tanpa error JS ✓.

### Langkah 9 — admin_ops/* ESM (commit `eee8f5f`, turn ini)

- `node --check --input-type=module` 6 file js/admin_ops/* ✓ · scan `no-undef`
  **0 error** ✓ (state via accessor isAdmin/isKandidat/ALL_SCHEDULES/limitJad/
  currentCopyListTxt/DROPDOWNS; api/forms.js ESM upsertCandidateMemory/
  patchFormMail; render ESM renderAdminFull; helper classic cekEkstensiFile;
  `event` → `window.event`) · `bun run lint` 0/12 ✓ · `bun run test` **81/81**
  ✓.
- `bun run build`: check:globals **nol kolisi** (45 file / **394 simbol**) ·
  bundel `app-079a607684.js` (418.5 KB) · 0 export bocor ✓ · idempoten ✓.
- 26 alias window.* total (6 file). `DRIVE_CANDIDATES` var internal tanpa
  pemakai eksternal → di-export tapi tidak di-alias. Audit: 52 file ·
  **396 simbol** · HIGH=0 · MEDIUM=24 · LOW=372 (`.freebuff/audit-globals.json`
  + module-map 461 simbol diperbarui).
- **E2E SEMUA LULUS**: login-check, upload-check, biodata-check ✓ + cek
  admin_ops terarah: tab Pengaturan render (11 kategori dropdown via
  accessor), tabel Jadwal render, modal list kandidat terbuka + terisi,
  0 error JS ✓.

### Langkah 8 — admin_modal/* ESM (commit `720e28e`, turn ini)

- `node --check --input-type=module` 3 file js/admin_modal/* ✓ · scan
  `no-undef` **0 error** ✓ (state via accessor dbFilter*/DROPDOWNS/
  ALL_CANDIDATES/ALL_DB_JOBS/ASSETS/isAdmin; helper classic
  jobTutupUntukLamar/bukaFormBridge/bukaPreviewDokumen/normalizeGenderValue/
  previewFileInFrame; util/core via window) · `bun run lint` 0/12 ✓ ·
  `bun run test` **81/81** ✓.
- `bun run build`: check:globals **nol kolisi** (45 file / **394 simbol**) ·
  bundel `app-1057be7ccc.js` (417.7 KB) · 0 export bocor ✓ · idempoten ✓.
- `toDateInputValue` DEFINISI di cv.js, dipakai api/candidates.js via
  `window.toDateInputValue` — alias wajib (pemakai ESM yang sudah konversi
  memakai window.* eksplisit, jadi kontrak tidak patah). 14 alias window.*
  total (3 file). Audit: 52 file · **396 simbol** · HIGH=0 · MEDIUM=24 ·
  LOW=372 (`.freebuff/audit-globals.json` + module-map diperbarui).
- **E2E SEMUA LULUS**: login-check, upload-check, biodata-check ✓ + cek modal
  CV terarah: admin login → `window.bukaDigitalCV` (ESM) → modal CV render
  (nama SATRIA PUTRA DEWANGG, tombol Edit Cepat tampil) · 0 error JS ✓.

### Langkah 7 — api/* ESM (commit `fca83b6`, turn ini)

- `node --check --input-type=module` 4 file js/api/* ✓ · scan `no-undef` **0
  error** ✓ (state via accessor, MAIL_SELECTED via accessor, core/util/render/
  engine, helper classic cekUkuranFile/bacaFileBase64/normalizeGenderValue/
  toDateInputValue, vendor window.qrcode) · `bun run lint` 0/12 ✓ · `bun run
  test` **81/81** ✓.
- `bun run build`: check:globals **nol kolisi** (45 file / **394 simbol**) ·
  bundel `app-ee4db83e37.js` (416.8 KB) · 0 export bocor ✓ · idempoten ✓.
- `window.X = async function(){}` → `export async function` + alias
  (submitRejectForm, ensureAllCandidates, muatLebihKandidat). 59 alias window.*
  total (4 file). Audit: 52 file · **396 simbol** · HIGH=0 · MEDIUM=24 ·
  LOW=372 (`.freebuff/audit-globals.json` + module-map diperbarui).
- ⚠️ Blanket `ALL_CANDIDATES` merusak `window.ALL_CANDIDATES_TOTAL` (jadi
  `window.window...`) → ganti pola terarah. Cek ini di langkah selanjutnya
  yang punya prefix kolisi serupa.
- 🐛 **Fix artefak langkah 6**: `<window.tr` → `<tr` di render/{public,admin,
  candidate,mail}.js (blanket `tr(` ikut mengubah literal `<tr` template
  tabel). Diverifikasi DOM di browser: tab Mail & DB Job (admin) + landing
  publik render `tr.rt-row` asli, **0 elemen `window.tr`**, 0 error JS ✓.
- **E2E SEMUA LULUS**: login-check, upload-check, biodata-check,
  backend-fast-path ✓.

### Langkah 6 — render/* ESM (turn ini, commit `5afe39b`)

- `node --check --input-type=module` 5 file js/render/* ✓ · scan `no-undef`
  **0 error** ✓ (44 nama lintas-file di-window-kan eksplisit) · `bun run
  lint` 0/12 ✓ · `bun run test` **81/81** ✓.
- `bun run build`: check:globals **nol kolisi** (45 file / **391 simbol**) ·
  bundel `app-4c1c681c7c.js` (415.3 KB) · 0 export bocor ✓.
- Temuan proses: blanket replace sempat menimpa 4 alias jadi self-reference
  (`window.badgeTahapanDb = window.badgeTahapanDb`, `filterKandidat`,
  `renderFormInbox`, `renderJobDilamar`) → E2E menangkapnya; `var esc` lokal
  mail.js dipertahankan lokal (12 call-site).
- 🐛 **Fix backend lintas-domain** (ditemukan E2E): `nextCandidateId()` hanya
  scan `database_candidate` → bentrok id dengan `master_database_candidate`
  (409 `uq_master_id_kandidat` ASJ00226) → `maxCandidateIdNumber()` + fallback
  kini scan KEDUA tabel. Leftover E2E dibersihkan. **E2E SEMUA LULUS**: login,
  upload, biodata (modal tertutup + data tersinkron + persist) ✓.

## 7. Verifikasi turn ini (2026-08-16)

- `node --check --input-type=module` api-client.js / i18n.js / js/core/bridge.js ✓
- Scan `no-undef` strict: **0 error** (referensi global implisit sudah di-window-kan) ✓
- `bun run lint`: 0 error / 12 warn (baseline) ✓
- `bun run test`: **81/81** ✓
- `bun run build`: check:globals **nol kolisi** (45 file / 389 simbol) ·
  bundel `app-7f821ddf7c.js` (410.6 KB) · build idempoten (hash sama saat
  diulang) ✓
- Bundel: 8 alias `window.*` core hadir, **0 export bocor** ✓
- Uji impor ESM di Node (shim browser): `PortalBridge` + semua alias + `tr()`
  + `toggleFormLanguage` (live CURRENT_LANG) + internal privat — **13/14 OK**
  (1 gagal karena key test salah, bukan bug — `tr('public.filter')` = 'Filter') ✓
- E2E Playwright (preview :3000): **SEMUA LULUS** — `login-check` (landing +
  login kandidat + admin, 0 JS error), `upload-check` (guard + upload KTP/KK
  end-to-end + Storage + sinkron DB + cleanup), `biodata-check`
  (simpanBiodataLengkap + cleanup), plus smoke 5 halaman standalone
  (ai_form/master-full via bridge; apply-full/siswa-baru api-client; share
  i18n) — core ESM load via `<script type="module">` **0 JS error**.

### Langkah 3 — state.js + util.js ESM (turn ini, commit `6478be9`)

- `node --check --input-type=module` js/init/state.js + js/init/util.js ✓
- Scan `no-undef` strict: **0 error** ✓ (referensi eksplisit `window.*`:
  `tr`, `trOption`, `trOptionId`, `esc`, `DROPDOWNS`, `toastWaFormat`)
- `bun run lint`: 0 error / 12 warn ✓ · `bun run test`: **81/81** ✓
- `bun run build`: check:globals **nol kolisi** (45 file / **390 simbol**) ·
  bundel `app-c06313605c.js` (411.8 KB) · 0 export bocor · accessor
  `defineProperty(window, name, {get,set})` ter-minify utuh di bundel ✓
- Uji impor ESM di Node (shim browser): round-trip accessor `window.ALL_JOBS
  = [...]` → binding modul ikut; getter baca binding; `CURRENT_THEME` setter
  (pola theme.js); `ACTIVE_PEMBERKASAN_WA` (export let) live; 19 alias util
  + export konsisten; `populate`/`rePopulateDropdowns`/`salinTeksDecode`
  jalan pakai `window.*` ✓
- E2E Playwright: `login-check`, `upload-check`, `biodata-check` **SEMUA
  LULUS** (bundle classic tetap jalan dengan state/util ESM via accessor) ✓
- Audit diperbarui: 52 file · **395 simbol** · HIGH=0 · MEDIUM=24 · LOW=371
  (`.freebuff/audit-globals.json` + `module-map-frontend.json`).

### Langkah 5 — engine/* ESM (turn ini, commit `4ea3e32`)

- `node --check --input-type=module` 4 file js/engine/* ✓
- Scan `no-undef` strict: **0 error** (referensi eksplisit `window.*`:
  state via accessor, tr/callAPI/showToast/esc/safeSet/trOption,
  render lintas domain, changePage/applyTheme/renderLanguage, dll) ✓
- `bun run lint`: 0 / 12 ✓ · `bun run test`: **81/81** ✓
- `bun run build`: check:globals **nol kolisi** (45 file / **391 simbol**) ·
  bundel `app-a32c94c192.js` (413.5 KB) · 0 export bocor · alias
  `window.refreshDataDinamis/initApp/updateMailBadge/tahapanPipeline/`
  `kalkulasiProgress/renderJobDilamar` hadir ✓
- Uji impor ESM di Node: tahapanPipeline fallback 9 langkah; getTahapanProgress
  FLIGHT=100; BERKAS_17 = 17; initApp(isSilent) DOM-safe; refreshDataDinamis
  jalan via stub `window.callAPI` ✓
- 🐛 Phantom global `ALL_CANDIDATES_TOTAL` kini dideklarasikan resmi di
  state.js (sebelumnya di-assign bare tanpa deklarasi — strict mode ESM akan
  ReferenceError) ✓
- E2E Playwright: `login-check`, `upload-check`, `biodata-check` **SEMUA
  LULUS** ✓
- Audit: 52 file · **396 simbol** · HIGH=0 · MEDIUM=24 · LOW=372.
