// db/misc.js — repo misc: admins, settings/assets, pengumuman, query paginated.
// MODUL BARU (Fase 1.3 REFACTOR_TODO.md) — dipindah dari supabase.js.
'use strict';

const { supabaseJson, pick, toText, findTable, supabaseUrl, supabaseKey } = require('./client');

// Query paginated dengan Range header + total dari Content-Range.
async function queryPaged(table, { page = 1, pageSize = 50, q = '' } = {}) {
  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;
  const params = { select: '*' };
  if (q && q.trim()) {
    const needle = q.trim().replace(/'/g, "''");
    // PostgREST or= wajib dibungkus kurung, kalau tidak gagal (HTTP 400).
    params.or = `(nama_lengkap.ilike.*${needle}*,no_wa.ilike.*${needle}*)`;
  }
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(supabaseUrl().replace(/\/$/, '') + '/rest/v1/' + table + '?' + qs, {
    method: 'GET',
    headers: {
      apikey: supabaseKey(),
      Authorization: 'Bearer ' + supabaseKey(),
      Range: start + '-' + end,
      Prefer: 'count=exact',
    },
  });
  if (!res.ok) {
    throw new Error(table + ' → HTTP ' + res.status + ' ' + (await res.text()).slice(0, 150));
  }
  const rows = await res.json();
  const cr = res.headers.get('content-range') || '';
  const total = parseInt(String(cr).split('/')[1] || '0', 10) || rows.length;
  return { rows, total };
}

async function findAdmins() {
  return findTable([
    'user_sessions',
    'admin_users',
    'admins',
    'admin',
    'staff',
    'users',
    'pengguna',
  ]);
}

async function findSettings() {
  return findTable([
    'sys_config',
    'assets',
    'settings',
    'app_config',
    'config',
    'system_config',
    'pengaturan',
    'site_config',
  ]);
}

async function findAnnouncements() {
  return findTable(['pengumuman', 'announcements', 'announcement', 'marquee']);
}

// Bangun objek assets ({LOGO, BANNER, FOOTER, SOCIAL}) dari tabel settings jika ada.
async function findAssets() {
  const found = await findSettings();
  for (const row of found.rows) {
    const logo =
      pick(row, ['logo', 'LOGO', 'logo_url', 'logoUrl', 'assets_logo']) ||
      (row.assets && typeof row.assets === 'object' && row.assets.LOGO);
    if (logo) {
      const nested = (k) => (row.assets && typeof row.assets === 'object' && row.assets[k]) || null;
      return {
        LOGO: logo,
        BANNER: {
          TOKYO:
            pick(row, ['banner_tokyo', 'banner', 'BANNER_TOKYO']) ||
            nested('BANNER')?.TOKYO ||
            null,
          SAKURA:
            pick(row, ['banner_sakura', 'banner_sakura_url']) || nested('BANNER')?.SAKURA || null,
        },
        FOOTER: {
          TOKYO:
            pick(row, ['footer_tokyo', 'footer', 'footer_momiji']) ||
            nested('FOOTER')?.TOKYO ||
            null,
          SAKURA: pick(row, ['footer_sakura']) || nested('FOOTER')?.SAKURA || null,
        },
        SOCIAL: {
          whatsapp:
            pick(row, ['wa_admin', 'whatsapp_admin', 'social_wa']) ||
            nested('SOCIAL')?.whatsapp ||
            null,
          instagram:
            pick(row, ['ig', 'instagram', 'social_ig']) || nested('SOCIAL')?.instagram || null,
          tiktok: pick(row, ['tiktok', 'social_tiktok']) || nested('SOCIAL')?.tiktok || null,
          maps: pick(row, ['maps', 'maps_link', 'lokasi_maps']) || nested('SOCIAL')?.maps || null,
        },
      };
    }
  }
  return null;
}

async function findPengumuman() {
  const ann = await findAnnouncements();
  for (const row of ann.rows) {
    const txt = pick(row, ['pengumuman', 'teks', 'isi', 'text', 'message', 'marquee']);
    if (txt) return toText(txt);
  }
  const settings = await findSettings();
  for (const row of settings.rows) {
    const txt = pick(row, ['pengumuman', 'marquee', 'announcement', 'teks_pengumuman']);
    if (txt) return toText(txt);
  }
  return '';
}

module.exports = {
  queryPaged,
  findAdmins,
  findSettings,
  findAnnouncements,
  findAssets,
  findPengumuman,
};
