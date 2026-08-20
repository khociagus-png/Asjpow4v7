// =============================================================================
// js/main.js — Entry bundel admin.html & index.html (Fase 3 langkah 14)
// -----------------------------------------------------------------------------
// Semua file frontend sudah ES Modules (Fase 3 tuntas di langkah 13). Entry ini
// meng-import SEMUA modul domain secara side-effect — dan import eksplisit DI
// SINI adalah satu-satunya sumber kebenaran daftar modul bundel (Fase 6:
// bundleModules() di scripts/module-registry.mjs mem-parse file ini; STACK
// concat sudah dihapus). Setiap modul mengekspos window.* sendiri (bridge
// §3.2/§5 ESM_BRIDGE.md), jadi tidak ada exposure tambahan di sini.
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

// Bridge (Fase 3.5 langkah 6): window.PortalBridge + registerSeamAliases
// (registrasi alias seam HTML↔JS terpusat) tersedia di SEMUA halaman, bundel
// admin/index sekalipun. Hanya import core (api-client + i18n — di-dedupe
// esbuild), tidak meng-import modul halaman → aman di bundel.
import { registerSeamAliases } from './core/bridge.js';

// Guard upload + publik (langkah 13 + 12)
import './upload-guard.js';
import './01_public.js';

// Cloudinary direct unsigned upload (2026-08-17): window.uploadToCloudinary
// dipakai alur pemberkasan / tambah kandidat / revisi CV.
import './cloudinary.js';

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

// E-sign + rincian builder (langkah 12)
import './12_esign_match.js';
import './13_rincian_builder.js';

// CV helpers + builders + rirekisho (langkah 12)
import { getPath, isGood, makeV, fmtMonthYearJp, mergeArrRiwayat } from './helpers_cv.js';
import './10b_cv_builders.js';
import './10_cv_rirekisho.js';

// Fase 3.5 Langkah 6 — alias helpers CV lewat registry seam terpusat
// (bukan window.X = X per-simbol di helpers_cv.js). Bundel admin/index
// SAJA: halaman standalone tidak butuh helper CV; helpers_cv tetap murni
// sehingga unit-test node (vitest) tidak perlu stub window.
registerSeamAliases(
  { getPath, isGood, makeV, fmtMonthYearJp, mergeArrRiwayat },
  { source: 'main:helpers_cv' },
);

// PWA helper (langkah 13)
import '../pwa.js';
