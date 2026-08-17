// i18n.js — AGREGAT re-export (Fase 4). Logika: i18n/core.js, data bahasa:
// i18n/locales/{id,jp}.js. File ini mempertahankan alias window.* untuk pemakai
// classic (bundel admin/index + halaman standalone type=module) — jangan hapus.
export * from './i18n/core.js';
import {
  LANG,
  OPTION_TRANSLATIONS,
  trOption,
  trOptionId,
  tr,
  renderLanguageLight,
  toggleFormLanguage,
} from './i18n/core.js';

// Accessor window.CURRENT_LANG (Fase 3 langkah 12) ada di i18n/core.js —
// di sana CURRENT_LANG adalah binding modul (agregat tidak bisa men-assign
// binding import).
window.trOption = trOption;
window.trOptionId = trOptionId;
window.tr = tr;
window.renderLanguageLight = renderLanguageLight;
window.toggleFormLanguage = toggleFormLanguage;

window.LANG = LANG;
