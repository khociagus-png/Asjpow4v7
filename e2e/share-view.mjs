// =============================================================
// E2E — share.html (Secure Candidate Viewer) + endpoint /api/share-data
// -----------------------------------------------------------------
// 1. API check (selalu jalan): GET /api/share-data?job=KODE → 200, job terisi,
//    candidates ada, dan sebagian punya dokumen ekstra (KK/KTP/dll).
// 2. Browser check (best-effort): buka share.html, pastikan kartu kandidat
//    dirender tanpa error JS. Dilewati otomatis kalau playwright tidak bisa
//    launch (mis. runtime bun) — jangan sampai menggantung.
// Jalankan: bun e2e/share-view.mjs   (BASE_URL & SHARE_JOB bisa di-override)
// =============================================================
import { check, waitFor, launchBrowser, finish } from './harness.mjs';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000';
const JOB = process.env.SHARE_JOB || 'TG633ASJ';

// ---- 1. API check ----------------------------------------------------------
const api = await fetch(`${BASE}/api/share-data?job=${encodeURIComponent(JOB)}`);
let apiJson = null;
try {
  apiJson = await api.json();
} catch {
  /* non-JSON */
}
check(`GET /api/share-data?job=${JOB} → HTTP ${api.status}`, api.ok, 'endpoint harus 200');
check(
  'job.name terisi',
  !!apiJson && !!apiJson.job && !!apiJson.job.name,
  JSON.stringify(apiJson && apiJson.job),
);
const apiCandidates = (apiJson && apiJson.candidates) || [];
check('candidates array ada', Array.isArray(apiCandidates), 'harus array');
check('setidaknya 1 kandidat', apiCandidates.length > 0, `n=${apiCandidates.length}`);
const withExtra = apiCandidates.filter((c) => c.extraDocs && c.extraDocs.length).length;
console.log(`  (info) ${apiCandidates.length} kandidat, ${withExtra} punya dokumen ekstra (KK/KTP/dll)`);
check(
  'kandidat punya field inti (nama_lengkap, pas_photo, file_cv)',
  apiCandidates.every((c) => c && c.nama_lengkap !== undefined),
  'field share-data harus lengkap',
);

// ---- 2. Browser check (best-effort) ----------------------------------------
let browser = null;
try {
  browser = await launchBrowser();
} catch (e) {
  console.log(`  ⚠ browser check dilewati (playwright tidak bisa launch di runtime ini): ${String(e.message || e).slice(0, 100)}`);
}
if (browser) {
  const page = await browser.newPage();
  const jsErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') jsErrors.push(m.text().slice(0, 150));
  });
  page.on('pageerror', (e) => jsErrors.push(String(e).slice(0, 150)));

  await page.goto(`${BASE}/share.html?job=${encodeURIComponent(JOB)}`, {
    waitUntil: 'domcontentloaded',
  });
  // Endpoint share-data menarik dokumen Storage per kandidat — pada cold start
  // bisa butuh ±15 dtk. Tunggu sampai render selesai (kartu muncul) ATAU error
  // tampil, bukan pakai jeda tetap yang terlalu pendek.
  const startWait = Date.now();
  while (Date.now() - startWait < 30000) {
    const done = await page.evaluate(() => {
      const errEl = document.getElementById('error-message');
      const errVisible = errEl
        ? !errEl.classList.contains('hidden') && errEl.offsetParent !== null
        : false;
      const cards = document.querySelectorAll('#candidates-grid .glass-card').length;
      return errVisible || cards > 0;
    });
    if (done) break;
    await page.waitForTimeout(1500);
  }

  const errorVisible = await page.evaluate(() => {
    const el = document.getElementById('error-message');
    return el ? !el.classList.contains('hidden') && el.offsetParent !== null : false;
  });
  const cardCount = await page.evaluate(
    () => document.querySelectorAll('#candidates-grid .glass-card').length,
  );
  const title = await page.evaluate(() => (document.getElementById('job-title') || {}).innerText);

  check('tidak menampilkan error state', !errorVisible, 'halaman menampilkan Akses Ditolak');
  check('judul job terisi', !!title && title !== 'Loading Job…', `title=${title}`);
  check(`kandidat dirender di grid (${cardCount})`, cardCount > 0, `cards=${cardCount}`);
  check('tidak ada error JS', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));
  await browser.close();
}

finish();
