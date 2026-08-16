// actions-wa.js — template WA (wa_templates) + pengiriman WhatsApp via Fonnte.
// MODUL BARU (Fase 1.2 REFACTOR_TODO.md) — kode dipindah dari actions-extra.js,
// perilaku TIDAK berubah.
'use strict';

const { normalizeWa, supabaseJson } = require('./db/client');
const { env } = require('./env');
const { requireRole } = require('./actions-auth');

async function handleSimpanWaTemplate(payload, sessionToken) {
  const guard = requireRole(sessionToken, 'admin');
  if (guard.error) return guard.error;
  const id = String((payload && payload[0]) || '');
  const nama = String((payload && payload[1]) || '').trim();
  const isi = String((payload && payload[2]) || '');
  if (!nama) return { success: false, error: 'Nama template wajib diisi.' };
  try {
    if (id && id !== '') {
      await supabaseJson('PATCH', 'wa_templates', {
        query: { id: 'eq.' + id },
        body: { nama, isi, updated_at: new Date().toISOString() },
        headers: { Prefer: 'return=minimal' },
      });
    } else {
      await supabaseJson('POST', 'wa_templates', {
        body: {
          id: 'WA' + Date.now(),
          nama,
          isi,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        headers: { Prefer: 'return=minimal' },
      });
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: 'Gagal simpan template: ' + e.message };
  }
}

async function handleHapusWaTemplate(payload, sessionToken) {
  const guard = requireRole(sessionToken, 'admin');
  if (guard.error) return guard.error;
  const id = String((payload && payload[0]) || '');
  if (!id) return { success: false, error: 'ID template tidak ditemukan.' };
  try {
    await supabaseJson('DELETE', 'wa_templates', {
      query: { id: 'eq.' + id },
      headers: { Prefer: 'return=minimal' },
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: 'Gagal hapus template: ' + e.message };
  }
}

async function fonnteSend(target, message) {
  const token = env('FONNTE_TOKEN') || env('FONNTE_API_KEY');
  if (!token) throw new Error('FONNTE_TOKEN belum dikonfigurasi');
  const params = new URLSearchParams();
  params.set('target', String(target));
  params.set('message', String(message));
  const res = await fetch('https://api.fonnte.com/send', {
    method: 'POST',
    headers: {
      Authorization: token,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  const text = await res.text();
  if (!res.ok) throw new Error('Fonnte HTTP ' + res.status + ' ' + text.slice(0, 200));
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function handleKirimSatuPesanFonnte(payload, sessionToken) {
  const guard = requireRole(sessionToken, 'admin');
  if (guard.error) return guard.error;
  const wa = String((payload && payload[0]) || '');
  const message = String((payload && payload[1]) || '');
  if (!wa || !message) return { success: false, error: 'Nomor WA dan pesan wajib diisi.' };
  try {
    const result = await fonnteSend(normalizeWa(wa), message);
    return { success: true, result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// kirimTawaranMassal([{candidates, jobCode, linkGrup, interval, customMessage}])
async function handleKirimTawaranMassal(payload, sessionToken) {
  const guard = requireRole(sessionToken, 'admin');
  if (guard.error) return guard.error;
  const d = (payload && payload[0]) || {};
  const cands = Array.isArray(d.candidates) ? d.candidates : [];
  if (cands.length === 0) return { success: false, error: 'Tidak ada kandidat.' };
  const jobCode = String(d.jobCode || '');
  const linkGrup = String(d.linkGrup || '');
  const interval = Math.max(Number(d.interval) || 5, 1);
  const results = [];
  try {
    let templateIsi = null;
    try {
      const rows = await supabaseJson('GET', 'wa_templates', {
        query: { select: '*', limit: 100 },
      });
      const tpl = (Array.isArray(rows) ? rows : []).find(
        (r) =>
          String(r.nama || '')
            .toLowerCase()
            .includes('grup') ||
          String(r.nama || '')
            .toLowerCase()
            .includes('undang'),
      );
      if (tpl) templateIsi = String(tpl.isi || '');
    } catch (e) {
      /* template opsional */
    }
    for (const c of cands) {
      const wa = normalizeWa(String(c.wa || ''));
      const nama = String(c.nama || 'Kandidat');
      let message =
        d.customMessage ||
        templateIsi ||
        'Halo ' +
          nama +
          '! Anda terpilih untuk Lowongan ' +
          jobCode +
          '. Silakan bergabung ke grup resmi kami: ' +
          linkGrup;
      if (templateIsi && !d.customMessage) {
        message = templateIsi
          .replace(/\{nama\}/g, nama)
          .replace(/\{job\}/g, jobCode)
          .replace(/\{link\}/g, linkGrup);
      }
      try {
        await fonnteSend(wa, message);
        results.push({ wa: c.wa, nama, success: true });
      } catch (e) {
        results.push({ wa: c.wa, nama, success: false, error: e.message });
      }
      if (interval > 0) await new Promise((r) => setTimeout(r, interval * 1000));
    }
    return { success: true, results };
  } catch (e) {
    return { success: false, error: e.message, results };
  }
}

module.exports = {
  handleSimpanWaTemplate,
  handleHapusWaTemplate,
  handleKirimSatuPesanFonnte,
  handleKirimTawaranMassal,
};
