// =============================================================
// E2E MODAL RUNTIME CHECK — ASJ Portal
// Memvalidasi loader modal runtime (assets/modals-shared.html):
// buka modal SHARED dari sisi admin (modal-cv, modal-edit-kandidat)
// lalu periksa foto yang BENAR-BENAR gagal (img visible + src
// non-kosong + naturalWidth=0). Test photo-check lama memilih
// fungsi yang salah (bukaModalKandidat = modal login) dan menghitung
// img hidden/src-kosong sebagai "gagal".
// =============================================================
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN_MASTER_PIN = process.env.E2E_MASTER_PIN || '123456';
const ADMIN_NAME = process.env.E2E_ADMIN_NAME || 'KHOCI';
const ADMIN_PIN = process.env.E2E_ADMIN_PIN || '4444';

let failures = 0;
function check(name, cond, extra = '') {
  if (cond) console.log(`  ✅ ${name}`);
  else {
    console.log(`  ❌ ${name} ${extra}`);
    failures++;
  }
}
async function waitFor(condition, timeoutMs = 20000, intervalMs = 300) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await condition()) return true;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}

// Foto yang benar-benar gagal: img yang VISIBLE, src non-kosong, dan
// naturalWidth=0 setelah complete (atau timeout kecil).
async function realFailedImages(page) {
  return page.evaluate(async () => {
    const out = [];
    const imgs = [...document.querySelectorAll('img')];
    for (const i of imgs) {
      const src = i.currentSrc || i.src || '';
      if (!src || src === location.href) continue;
      const visible =
        !!(i.offsetWidth || i.offsetHeight) && getComputedStyle(i).visibility !== 'hidden';
      if (!visible) continue;
      if (i.complete && i.naturalWidth === 0) {
        out.push(src.slice(0, 150));
        continue;
      }
      if (!i.complete) {
        await new Promise((r) => {
          i.addEventListener('load', r, { once: true });
          i.addEventListener('error', r, { once: true });
          setTimeout(r, 4000);
        });
        if (i.naturalWidth === 0) out.push(src.slice(0, 150));
      }
    }
    return out;
  });
}

const browser = await chromium.launch();
console.log(`\nTarget: ${BASE}\n`);

// -------------------------------------------------------------
// Login admin
// -------------------------------------------------------------
const page = await browser.newPage();
const jsErrors = [];
page.on('pageerror', (e) => jsErrors.push(String(e)));

await page.goto(BASE + '/admin.html', { waitUntil: 'domcontentloaded' });
await waitFor(async () => await page.locator('#modal-admin').isVisible());
check(
  'Modal login admin terbuka (modal shared, runtime)',
  await page.locator('#modal-admin').isVisible(),
);

await page.fill('#admin-pin-master', ADMIN_MASTER_PIN);
await page.click('#btn-login-master');
await waitFor(async () => await page.locator('#login-step-2').isVisible());
await page.click(`[onclick*="showLoginPersonal('${ADMIN_NAME}')"]`);
await waitFor(async () => await page.locator('#login-step-3').isVisible());
await page.fill('#admin-pin-personal', ADMIN_PIN);
await page.click('#btn-login-personal');
const adminMode = await waitFor(async () => await page.locator('#page-admin').isVisible());
check('Login admin sukses', adminMode);

// -------------------------------------------------------------
// Buka modal CV (bukaPreviewCV_Admin) — modal SHARED
// -------------------------------------------------------------
await waitFor(async () => (await page.locator('#admin-kandidat-body tr').count()) > 0);
const cvBtn = await page.locator('[onclick*="bukaPreviewCV_Admin"]').first();
const hasCvBtn = (await cvBtn.count()) > 0;
if (hasCvBtn) {
  await cvBtn.click();
  const cvOpen = await waitFor(async () => await page.locator('#modal-cv').isVisible());
  check('Modal CV (shared) terbuka via runtime', cvOpen);
  if (cvOpen) {
    await new Promise((r) => setTimeout(r, 1500));
    const failed = await realFailedImages(page);
    check(
      'Foto di modal CV semua termuat',
      failed.length === 0,
      JSON.stringify(failed.slice(0, 3)),
    );
    // Tutup modal CV
    await page.locator('#modal-cv').evaluate((el) => el.classList.add('hidden'));
  }
} else {
  console.log('  (tidak ada tombol bukaPreviewCV_Admin di baris kandidat pertama)');
}

// -------------------------------------------------------------
// Buka modal edit kandidat (bukaSuperEditKandidat) — modal SHARED
// -------------------------------------------------------------
const editBtn = await page.locator('[onclick*="bukaSuperEditKandidat"]').first();
if ((await editBtn.count()) > 0) {
  await editBtn.click();
  const editOpen = await waitFor(
    async () => await page.locator('#modal-edit-kandidat').isVisible(),
  );
  check('Modal Edit Kandidat (shared) terbuka via runtime', editOpen);
  if (editOpen) {
    await new Promise((r) => setTimeout(r, 1200));
    const failed = await realFailedImages(page);
    check(
      'Foto di modal Edit Kandidat semua termuat',
      failed.length === 0,
      JSON.stringify(failed.slice(0, 3)),
    );
  }
} else {
  console.log('  (tidak ada tombol bukaSuperEditKandidat)');
}

check('Tidak ada error JS selama tes modal', jsErrors.length === 0, jsErrors[0] || '');

await browser.close();
console.log(`\n${failures === 0 ? '🎉 SEMUA LULUS' : `💥 ${failures} GAGAL`}\n`);
process.exit(failures === 0 ? 0 : 1);
