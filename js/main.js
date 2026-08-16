// =============================================================================
// js/main.js — Entry bundel admin.html & index.html (Fase 3 langkah 14)
// -----------------------------------------------------------------------------
// Semua file frontend sudah ES Modules (Fase 3 tuntas di langkah 13). Entry ini
// meng-import SEMUA modul domain secara side-effect (urutan = STACK di
// scripts/build-js.mjs — sumber kebenaran urutan canonical). Setiap modul
// mengekspos window.* sendiri (bridge §3.2/§5 ESM_BRIDGE.md), jadi tidak ada
// exposure tambahan di sini.
//
// Boot aplikasi TIDAK dipicu dari sini: js/init/boot.js mendaftarkan listener
// DOMContentLoaded (di dalam bundel ikut jalan saat evaluasi), yang memanggil
// initApp (js/engine/init.js) — persis seperti dulu saat concat.
//
// Dipakai HANYA oleh build-js.mjs (esbuild bundle mode). Halaman standalone
// (ai_form/apply-full/master-full/share/siswa-baru) TIDAK memuat file ini —
// mereka tetap <script type="module"> per halaman.
// =============================================================================

// Core (langkah 2)
import '../api-client.js';
import '../i18n.js';

// Guard upload + publik (langkah 13 + 12)
import './upload-guard.js';
import './01_public.js';

// Init: state/theme/util/preview/nav/boot (langkah 3 + 11)
import './init/state.js';
import './init/theme.js';
import './init/util.js';
import './init/preview.js';
import './init/nav.js';
import './init/boot.js';

// Kandidat + engine (langkah 12 + 5)
import './03_candidate.js';
import './engine/pipeline.js';
import './engine/dashboard.js';
import './engine/guards.js';
import './engine/init.js';

// Auth (langkah 4)
import './04_auth.js';

// Render (langkah 6)
import './render/public.js';
import './render/admin.js';
import './render/candidate.js';
import './render/share.js';
import './render/mail.js';

// Admin modal (langkah 8)
import './admin_modal/dbfilter.js';
import './admin_modal/cv.js';
import './admin_modal/job.js';

// API domain (langkah 7)
import './api/forms.js';
import './api/jobs.js';
import './api/candidates.js';
import './api/wa.js';

// WA pintar (langkah 12)
import './08_wa_pintar.js';

// AI copilot (langkah 10)
import './ai_copilot/admin.js';
import './ai_copilot/interview.js';
import './ai_copilot/parse.js';
import './ai_copilot/results.js';

// Admin ops (langkah 9)
import './admin_ops/schedule.js';
import './admin_ops/candidates.js';
import './admin_ops/sysconfig.js';
import './admin_ops/loading.js';
import './admin_ops/migration.js';
import './admin_ops/drive.js';

// E-sign + rincian builder (langkah 12)
import './12_esign_match.js';
import './13_rincian_builder.js';

// CV helpers + builders + rirekisho (langkah 12)
import './helpers_cv.js';
import './10b_cv_builders.js';
import './10_cv_rirekisho.js';

// PWA helper (langkah 13)
import '../pwa.js';
