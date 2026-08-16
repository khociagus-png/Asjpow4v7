// =============================================================================
// build-js.mjs — Bundel JS aplikasi (ASJ Portal)
// -----------------------------------------------------------------------------
// admin.html & index.html memuat 20 file JS klasik (api-client, i18n, js/*,
// pwa) secara berurutan. Skrip ini:
//   1. Menggabung + minify (esbuild) menjadi assets/app-<hash>.js
//   2. Mengganti stack 20 tag <script> di admin.html & index.html dengan 1 tag
//      bundel (atau mengganti bundel lama kalau hash berubah)
//   3. Menghapus stub Vite mati (assets/*-DONYcaRI.js) dari SEMUA halaman
//   4. Memperbarui sw.js (SHELL + VERSION) supaya service worker ikut bundel
//   5. Membersihkan assets/app-*.js lama (hanya bundel terbaru yang bertahan)
//
// Idempotent: aman dijalankan berkali-kali.
// Jalankan: bun run build:js   (wajib setelah mengubah file di js/, api-client,
// i18n, atau pwa — lihat WORKFLOW.md)
// =============================================================================

import { readFileSync, writeFileSync, readdirSync, unlinkSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { transform } from 'esbuild';

const ROOT = process.cwd();
const PAGES = [
  'admin.html',
  'index.html',
  'ai_form.html',
  'apply-full.html',
  'master-full.html',
  'share.html',
  'siswa-baru.html',
];

// Urutan canonical stack (sumber kebenaran — sama dengan urutan tag asli di
// admin.html/index.html: 00 → 09, lalu 11,12,13, helpers_cv, 10b, 10_cv, pwa).
const STACK = [
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

// 1. Gabung + minify + hash.
const sources = STACK.map((src) => {
  const path = ROOT + src;
  if (!existsSync(path)) {
    console.error(`[build-js] File tidak ada: ${src}`);
    process.exit(1);
  }
  return readFileSync(path, 'utf8');
});
const min = await transform(sources.join('\n'), { minify: true });
const hash = createHash('sha1').update(min.code).digest('hex').slice(0, 10);
const bundleName = `app-${hash}.js`;
const bundlePath = `${ROOT}/assets/${bundleName}`;
writeFileSync(bundlePath, min.code);
console.log(
  `[build-js] Bundel: assets/${bundleName} (${(min.code.length / 1024).toFixed(1)} KB, ${STACK.length} file)`,
);

// 2. admin.html & index.html: stack 20 tag -> 1 tag bundel (idempotent, dan
//    mengganti bundel lama kalau hash berubah).
const stackRe =
  /<script src="\/api-client\.js[^"]*"><\/script>[\s\S]*?<script src="\/pwa\.js[^"]*"><\/script>\s*/;
const bundleTag = `<script src="/assets/${bundleName}"></script>\n`;
const oldBundleRe = /<script src="\/assets\/app-[a-f0-9]+\.js"><\/script>\s*/;
const stubRe = /<script type="module"[^>]*src="\/assets\/[^"]*DONYcaRI\.js"[^>]*><\/script>\s*/g;
const preloadRe = /<link rel="modulepreload"[^>]*href="\/assets\/main-DEfa6N4x\.js"[^>]*>\s*/g;
for (const page of ['admin.html', 'index.html']) {
  const path = `${ROOT}/${page}`;
  let html = readFileSync(path, 'utf8');
  if (stackRe.test(html)) {
    // Belum pernah di-bundle: ganti stack 20 tag -> 1 bundel.
    html = html.replace(stackRe, bundleTag);
    console.log(`[build-js] ${page}: 20 tag -> 1 bundel`);
  } else if (oldBundleRe.test(html)) {
    // Sudah di-bundle dengan hash lama: ganti ke hash terbaru.
    html = html.replace(oldBundleRe, bundleTag);
    console.log(`[build-js] ${page}: bundel lama -> ${bundleName}`);
  } else if (html.includes(`/assets/${bundleName}`)) {
    console.log(`[build-js] ${page}: sudah pakai bundel ini (idempotent)`);
  } else {
    console.error(`[build-js] Gagal: ${page} tidak punya stack 20-tag maupun bundel.`);
    process.exit(1);
  }
  const cleaned = html.replace(stubRe, '').replace(preloadRe, '');
  if (cleaned !== html) {
    writeFileSync(path, cleaned);
    console.log(`[build-js] ${page}: artefak Vite mati dihapus`);
  } else {
    writeFileSync(path, html);
  }
}

// 3. Hapus stub Vite mati (script + modulepreload) dari halaman lain + bersihkan file-nya.
for (const page of PAGES) {
  const path = `${ROOT}/${page}`;
  const html = readFileSync(path, 'utf8');
  const cleaned = html.replace(stubRe, '').replace(preloadRe, '');
  if (cleaned !== html) {
    writeFileSync(path, cleaned);
    console.log(`[build-js] ${page}: artefak Vite mati dihapus`);
  }
}
for (const f of readdirSync(`${ROOT}/assets`)) {
  if (f.endsWith('-DONYcaRI.js') || f === 'main-DEfa6N4x.js') {
    unlinkSync(`${ROOT}/assets/${f}`);
    console.log(`[build-js] Hapus artefak mati: assets/${f}`);
  }
}

// 4. sw.js: SHELL pakai bundel + VERSION baru + bersihkan path mati (idempotent).
const swPath = `${ROOT}/sw.js`;
let sw = readFileSync(swPath, 'utf8');
sw = sw.replace(/^\s*'\/(api-client|i18n|js\/)[^']*',\n/gm, '');
sw = sw.replace(/^\s*'\/assets\/app-[a-f0-9]+\.js',\n/gm, '');
sw = sw.replace(/^\s*'\/src\/main\.js',\n/gm, '');
sw = sw.replace(/^\s*'\/src\/styles\/main\.css',\n/gm, '');
if (!sw.includes(`'/assets/${bundleName}',`)) {
  sw = sw.replace("  '/siswa-baru.html',\n", `  '/siswa-baru.html',\n  '/assets/${bundleName}',\n`);
  console.log(`[build-js] sw.js: SHELL -> /assets/${bundleName}`);
}
// Modal shared dimuat runtime dari assets/modals-shared.html (lihat build-html).
if (!sw.includes(`'/assets/modals-shared.html',`)) {
  sw = sw.replace(
    `  '/assets/${bundleName}',\n`,
    `  '/assets/${bundleName}',\n  '/assets/modals-shared.html',\n`,
  );
  console.log('[build-js] sw.js: SHELL -> /assets/modals-shared.html');
}
// VERSION ikut hash modals supaya SW refresh saat partial berubah (tanpa ubah JS).
let modHash = '';
const modPath = `${ROOT}/assets/modals-shared.html`;
if (existsSync(modPath)) {
  modHash = '-m' + createHash('sha1').update(readFileSync(modPath)).digest('hex').slice(0, 8);
}
sw = sw.replace(/const VERSION = '[^']*';/, `const VERSION = 'asj-portal-app-${hash}${modHash}';`);
writeFileSync(swPath, sw);
console.log(`[build-js] sw.js: VERSION asj-portal-app-${hash}${modHash}`);

// 5. Hapus bundel lama (assets/app-*.js selain yang baru).
for (const f of readdirSync(`${ROOT}/assets`)) {
  if (/^app-[a-f0-9]+\.js$/.test(f) && f !== bundleName) {
    unlinkSync(`${ROOT}/assets/${f}`);
    console.log(`[build-js] Hapus bundel lama: assets/${f}`);
  }
}

console.log('[build-js] Selesai ✅');
