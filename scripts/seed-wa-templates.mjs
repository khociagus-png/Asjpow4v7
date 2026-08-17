// =============================================================================
// seed-wa-templates.mjs — Seed template WA (tabel wa_templates).
// -----------------------------------------------------------------------------
// Latar: template WA adalah DATA di Supabase (bukan kode) — panel admin WA
// template membacanya dari tabel `wa_templates`. Template "Undangan Wali"
// (keluhan pemilik 2026-08-17) tidak ada karena belum pernah dibuat di DB.
//
// Pemakaian:
//   bun scripts/seed-wa-templates.mjs            # dry-run (hanya laporan)
//   bun scripts/seed-wa-templates.mjs --apply    # insert template yang belum ada
//
// Aman: HANYA menambah template yang belum ada (match by nama), tidak pernah
// menimpa/menghapus. Placeholder didukung: {nama}, {job_code}, {link_grup}
// (lihat applyTemplatePlaceholders di netlify/functions/_lib/actions-wa.js).
// =============================================================================
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { supabaseJson } = require('../netlify/functions/_lib/db/client');

const APPLY = process.argv.includes('--apply');

// Template default (isi bisa disunting bebas — lalu di-update via panel admin).
const DEFAULT_TEMPLATES = [
  {
    nama: 'Undangan Wali',
    isi: [
      "Assalamu'alaikum Warahmatullahi Wabarakatuh.",
      '',
      'Kepada Bapak/Ibu Wali dari *{nama}*,',
      '',
      'Dengan hormat, kami mengundang Bapak/Ibu untuk hadir dalam pertemuan ' +
        'orang tua/wali terkait proses pemberangkatan *{nama}* ke Jepang ' +
        'melalui PT Amanah Sakura Japan.',
      '',
      'Mohon konfirmasi kehadiran dengan membalas pesan ini. Terima kasih.',
      '',
      'PT Amanah Sakura Japan',
    ].join('\n'),
  },
];

// List nama yang sudah ada di DB.
async function existingNames() {
  const rows = await supabaseJson('GET', 'wa_templates', {
    query: { select: 'id,nama' },
  });
  const arr = Array.isArray(rows) ? rows : (rows && rows.rows) || [];
  return new Set(arr.map((r) => String(r.nama || '').trim()));
}

async function main() {
  const names = await existingNames();
  const missing = DEFAULT_TEMPLATES.filter((t) => !names.has(t.nama));
  console.log(
    `Template di DB: ${names.size}. Default: ${DEFAULT_TEMPLATES.length}. ` +
      `Belum ada: ${missing.length}.`,
  );
  for (const t of missing) {
    console.log(`  ➕ [${APPLY ? 'INSERT' : 'RENCANA'}] ${t.nama} (${t.isi.length} karakter)`);
  }
  if (missing.length === 0) {
    console.log('✅ Semua template default sudah ada — tidak ada yang perlu ditambah.');
    process.exit(0);
  }
  if (!APPLY) {
    console.log('\n⏸ DRY-RUN — jalankan dengan --apply untuk insert.');
    process.exit(0);
  }
  const now = new Date().toISOString();
  for (const t of missing) {
    await supabaseJson('POST', 'wa_templates', {
      body: {
        id: 'WA' + Date.now() + Math.floor(Math.random() * 1000),
        nama: t.nama,
        isi: t.isi,
        created_at: now,
        updated_at: now,
      },
      headers: { Prefer: 'return=minimal' },
    });
  }
  console.log(`✅ ${missing.length} template ditambahkan. Cek panel admin → WA Template.`);
}

main().catch((e) => {
  console.error('❌ Gagal:', e.message);
  process.exit(1);
});
