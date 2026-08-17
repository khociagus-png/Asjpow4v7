// =============================================================================
// module-registry.mjs — SATU-SATUNYA sumber kebenaran struktur modul build.
// -----------------------------------------------------------------------------
// Dipakai oleh:
//   - scripts/build-js.mjs   (STACK bundel + halaman standalone)
//   - scripts/check-globals.mjs (STACK — dulu di-parse dari build-js via regex)
//   - scripts/build-html.mjs (halaman bundel + partial modal)
//   - scripts/module-map.mjs (daftar halaman untuk deteksi pemanggil HTML)
// Tambah/ubah struktur modul DI SINI, bukan di tiap skrip.
// =============================================================================

// Urutan canonical bundel admin/index (sumber kebenaran — sama dengan urutan
// tag asli di admin.html/index.html: 00 → 09, lalu 11,12,13, helpers_cv,
// 10b, 10_cv, pwa).
export const STACK = [
  '/api-client.js',
  '/i18n.js',
  '/js/upload-guard.js',
  '/js/01_public.js',
  // Fase 2: js/02_init.js dipecah per domain (state/theme/util/preview/nav/boot).
  '/js/init/state.js',
  '/js/init/theme.js',
  '/js/init/util.js',
  '/js/init/preview.js',
  '/js/init/nav.js',
  '/js/init/boot.js',
  '/js/03_candidate.js',
  // Fase 2: js/03_engine.js dipecah per domain (pipeline/dashboard/guards/init).
  '/js/engine/pipeline.js',
  '/js/engine/dashboard.js',
  '/js/engine/guards.js',
  '/js/engine/init.js',
  '/js/04_auth.js',
  // Fase 2: js/05_render.js dipecah per domain (public/admin/candidate/share/mail).
  '/js/render/public.js',
  '/js/render/admin.js',
  '/js/render/candidate.js',
  '/js/render/share.js',
  '/js/render/mail.js',
  // Fase 2: js/06_admin_modal.js dipecah per domain (dbfilter/cv/job).
  '/js/admin_modal/dbfilter.js',
  '/js/admin_modal/cv.js',
  '/js/admin_modal/job.js',
  // Fase 2: js/07_api.js dipecah per domain (forms/jobs/candidates/wa).
  // Urutan antar-modul bebas (fungsi global di-hoist), dipakai runtime.
  '/js/api/forms.js',
  '/js/api/jobs.js',
  '/js/api/candidates.js',
  '/js/api/wa.js',
  '/js/08_wa_pintar.js',
  // Fase 2: js/09_ai_copilot.js dipecah per domain (admin/interview/parse/results).
  '/js/ai_copilot/admin.js',
  '/js/ai_copilot/interview.js',
  '/js/ai_copilot/parse.js',
  '/js/ai_copilot/results.js',
  // Fase 2: js/11_admin_ops.js dipecah per domain (schedule/candidates/sysconfig/loading/migration/drive).
  '/js/admin_ops/schedule.js',
  '/js/admin_ops/candidates.js',
  '/js/admin_ops/sysconfig.js',
  '/js/admin_ops/loading.js',
  '/js/admin_ops/migration.js',
  '/js/admin_ops/drive.js',
  '/js/12_esign_match.js',
  '/js/13_rincian_builder.js',
  '/js/helpers_cv.js',
  '/js/10b_cv_builders.js',
  '/js/10_cv_rirekisho.js',
  '/pwa.js',
];

// Halaman yang memuat bundel (loader modal shared + tag <script> bundel).
export const BUNDLE_PAGES = ['admin.html', 'index.html'];

// Halaman standalone (type=module, tanpa bundel).
export const STANDALONE_PAGES = [
  'ai_form.html',
  'apply-full.html',
  'master-full.html',
  'share.html',
  'siswa-baru.html',
];

// Semua halaman (untuk deteksi pemanggil HTML di module-map / audit).
export const ALL_PAGES = [...BUNDLE_PAGES, ...STANDALONE_PAGES];

// Partial modal bersama (satu-satunya sumber semua modal).
export const MODAL_PARTIAL = 'partials/modals-shared.html';

// File halaman JS standalone (js/pages/*) — dipakai check-globals utk warning.
export const PAGE_JS = [
  '/js/pages/ai_form.js',
  '/js/pages/master_full.js',
  '/js/pages/apply_full.js',
  '/js/pages/share.js',
  '/js/pages/siswa_baru.js',
];
