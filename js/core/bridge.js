// =============================================================================
// js/core/bridge.js — Bridge ESM → legacy (Fase 3 ESM migration)
// -----------------------------------------------------------------------------
// Memuat core ESM (i18n.js + api-client.js) lewat `import`, lalu mengekspos
// namespace TUNGGAL `window.PortalBridge` untuk kode legacy:
//   - HTML inline `onclick="PortalBridge.xxx(...)"` / `onclick="xxx(...)"`
//   - file classic js/*.js yang belum di-ESM (bundel admin/index)
//   - halaman standalone (ai_form, apply-full, master-full, share, siswa-baru)
//
// Efek samping import: i18n.js & api-client.js MENGEKSEKUSI alias window.*
// klasik mereka sendiri (window.tr, window.LANG, window.CURRENT_LANG,
// window.callAPI, window.esc, window.escJs, window.resolveSelfUrl, ...), jadi
// SEMUA pemakai lama tetap jalan tanpa perubahan — window.PortalBridge hanya
// tambahan namespaced yang rapi untuk kode baru / migrasi bertahap.
//
// CARA LOAD:
//   - Halaman standalone: js/pages/* adalah ENTRY ESM — tiap halaman
//     meng-import modul ini sendiri (`import { registerSeamAliases } from
//     '../core/bridge.js'`), jadi TIDAK perlu lagi tag <script> core terpisah.
//   - Bundel admin/index: bridge.js masuk STACK + di-import js/main.js
//     (hanya core — api-client/i18n, di-dedupe esbuild) → window.PortalBridge
//     tersedia di SEMUA halaman.
// (module = deferred → jalan setelah parse, SEBELUM DOMContentLoaded; kode
// classic yang butuh callAPI/tr dipanggil runtime/event, bukan saat parse.)
//
// PEMANGGILAN AMAN dari kode legacy (kalau urutan muat tidak dijamin):
//   function callApiAman(action, payload) {
//     const fn = (window.PortalBridge && window.PortalBridge.callAPI) || window.callAPI;
//     if (typeof fn !== 'function') {
//       console.error('[portal] core belum dimuat');
//       return Promise.reject(new Error('PortalBridge belum siap'));
//     }
//     return fn(action, payload);
//   }
// =============================================================================
import * as api from '../../api-client.js';
import * as i18n from '../../i18n.js';

// Namespace tunggal untuk kode legacy. Property CURRENT_LANG memakai getter
// supaya SELALU membaca nilai terbaru (toggleFormLanguage me-reassign
// binding modul — snapshot value di awal akan basi).
export const PortalBridge = {
  // --- API backend (api-client.js) ---
  callAPI: api.callAPI,
  esc: api.esc,
  escJs: api.escJs,
  resolveSelfUrl: api.resolveSelfUrl,

  // --- i18n (i18n.js) ---
  LANG: i18n.LANG,
  get CURRENT_LANG() {
    return i18n.CURRENT_LANG;
  },
  tr: i18n.tr,
  trOption: i18n.trOption,
  trOptionId: i18n.trOptionId,
  renderLanguageLight: i18n.renderLanguageLight,
  toggleFormLanguage: i18n.toggleFormLanguage,

  // Pemanggilan aman: fallback ke alias classic kalau PortalBridge belum ada.
  safeCallAPI(action, payload) {
    const fn =
      (window.PortalBridge && window.PortalBridge.callAPI) || window.callAPI;
    if (typeof fn !== 'function') {
      console.error('[portal] callAPI belum dimuat');
      return Promise.reject(new Error('PortalBridge belum siap'));
    }
    return fn(action, payload);
  },

  // --- Registrasi alias seam HTML↔JS (sentralisasi, Fase 3.5 Langkah 6) ---
  registerSeamAliases,
  getSeamAliases,
};

// =============================================================================
// Registrasi alias seam HTML↔JS — TERPUSAT di sini (Fase 3.5 Langkah 6)
// -----------------------------------------------------------------------------
// Fungsi yang dipanggil dari atribut HTML (onclick/onchange/onload) atau dari
// string onclick yang di-generate runtime DIEVAL di global scope → harus punya
// alias `window.*`. Sebelumnya tiap modul halaman menulis `window.X = X`
// sendiri-sendiri di bagian bawah file. Sekarang diregistrasikan terpusat:
//   - js/pages/* (entry ESM halaman standalone) memanggil
//     `registerSeamAliases({ namaFn, ... })` — peta ekspor handler-nya.
//   - Modul bundel admin/index juga bisa memakai mekanisme ini (bridge.js ada
//     di STACK/main.js) — alias per-simbol lama tetap jalan sampai semua
//     pemakainya pindah ke sini.
// Registry (SEAM_ALIASES) disimpan supaya bisa diaudit via getSeamAliases()
// dan re-registrasi idempotent (nilai sama → tidak ada efek ganda).
// =============================================================================

// Registry pusat: nama alias → fungsi. Private modul (tidak bocor ke window).
const SEAM_ALIASES = new Map();

/**
 * Daftarkan peta alias seam HTML↔JS ke window secara terpusat.
 * @param {Record<string, Function>} aliases Nama alias → fungsi handler.
 * @returns {Record<string, Function>} Peta yang sama (untuk chaining/tes).
 */
export function registerSeamAliases(aliases) {
  for (const [name, value] of Object.entries(aliases || {})) {
    if (typeof value !== 'function') {
      console.warn(`[bridge] registerSeamAliases: "${name}" bukan fungsi — dilewati.`);
      continue;
    }
    SEAM_ALIASES.set(name, value);
    window[name] = value;
  }
  return aliases;
}

/**
 * Snapshot registry alias seam (untuk audit/debug).
 * @returns {Record<string, Function>}
 */
export function getSeamAliases() {
  return Object.fromEntries(SEAM_ALIASES);
}

// Pasang ke window untuk pemakai classic.
window.PortalBridge = PortalBridge;

// ESM-only: modul lain bisa `import { PortalBridge, registerSeamAliases } from './bridge.js'`.
export default PortalBridge;
