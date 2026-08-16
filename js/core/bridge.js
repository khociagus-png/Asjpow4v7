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
// CARA LOAD di halaman standalone (ganti 1-2 tag classic):
//   <script type="module" src="/js/core/bridge.js?v=esm1"></script>
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
};

// Pasang ke window untuk pemakai classic.
window.PortalBridge = PortalBridge;

// ESM-only: modul lain bisa `import { PortalBridge } from './bridge.js'`.
export default PortalBridge;
