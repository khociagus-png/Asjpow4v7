# ESM_BRIDGE.md — Konvensi ESM & Bridge `window.*` (LEGACY, ringkas)

> ⚠️ Diringkas 2026-08-17. Analisis & riwayat lengkap: git history file ini
> (`git show <old-hash>:ESM_BRIDGE.md`). Di bawah hanya ATURAN yang masih wajib
> diikuti saat menyentuh frontend.

## Arsitektur sekarang

- **Semua JS = ES Modules.** Bundel admin/index: `js/main.js` (side-effect import semua domain) → esbuild → `assets/app-<hash>.js` (IIFE, export di-strip).
- **Halaman standalone** (`apply-full.html`, `master-full.html`, `ai_form.html`, `share.html`, `siswa-baru.html`): ENTRY ESM sendiri, `<script type="module" src="/js/pages/*.js">`, meng-import `js/core/bridge.js` — **tidak ada** tag core terpisah.
- **`js/core/bridge.js`**: import `api-client.js` + `i18n.js`, expose `window.PortalBridge`, registrasi alias seam terpusat `registerSeamAliases({ fn })`, dispatcher delegasi `data-action` (HTML tidak butuh `window.fn` untuk handler polos).

## Aturan wajib saat patch frontend

1. **Modul ESM baru**: export publik + daftarkan alias via `registerSeamAliases` (jangan `window.X = X` manual). Referensi global (DOM, `window.*`, `document`, `fetch`) → eksplisit `window.*` atau via import. Scan wajib: `bunx eslint --no-warn-ignored --rule 'no-undef: error' --rule 'no-unused-vars: off' <file>` → **0 error**.
2. **State yang di-reassign** (mis. `CURRENT_LANG`, `ALL_JOBS`): tulis tetap lewat `window.*` accessor; baca bisa `import` binding (live binding ESM). Jangan snapshot value.
3. **HTML onclick/onchange**: nama fungsi harus ada di registry seam (`registerSeamAliases`) — bukan jaminan window global.
4. **i18n**: semua teks UI lewat `tr('ui.key')`; key ID wajib punya pasangan JP (test paritas); key duplikat = error lint.
5. **Jangan** menulis `window.X = X` baru, jangan menambah tag `<script>` core di halaman standalone, jangan sentuh `vite.config.ts` (bukan proyek Vite).
6. **Build setelah ubah JS**: `bun run build` → cek hash bundel baru + `sw.js` SHELL ikut ter-update.

## Peta modul

- Core: `api-client.js` (`callAPI`), `i18n.js` (`tr`/`LANG`), `js/init/{state,util}.js`, `js/04_auth.js`, `js/engine/*`, `js/core/bridge.js`.
- Render: `js/render/*` · API client: `js/api/*` · Admin: `js/admin_ops/*`, `js/admin_modal/*` · AI: `js/ai_copilot/*` · Halaman: `js/pages/*`.
