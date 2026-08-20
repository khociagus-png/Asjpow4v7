import { supabaseJson, toText } from './db/client.ts';
import { requireRole } from './actions-auth.ts';
// actions-schedule.js — jadwal (database_schedule) & tugas (database_tugas).
// MODUL BARU (Fase 1.2 REFACTOR_TODO.md) — kode dipindah dari actions-extra.js
// (2.549 baris), perilaku TIDAK berubah.

async function handleSimpanJadwalBaru(payload, sessionToken) {
  const guard = requireRole(sessionToken, 'admin');
  if (guard.error) return guard.error;
  const d = (payload && payload[0]) || {};
  if (!d.nama) return { success: false, error: 'Nama agenda wajib diisi.' };
  const idJadwal = 'JDW' + Date.now();
  try {
    await supabaseJson('POST', 'database_schedule', {
      body: {
        id_jadwal: idJadwal,
        nama_agenda: String(d.nama),
        id_loker_terkait: String(d.loker || '-'),
        tanggal_waktu: String(d.waktu || ''),
        lokasi_link: String(d.link || d.lokasi || '-'),
        daftar_kandidat: String(d.kandidat || '-'),
        tsk: String(d.tsk || ''),
        status_jadwal: 'AKTIF',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      headers: { Prefer: 'return=minimal' },
    });
    // PATCH-IN-PLACE: kembalikan baris jadwal baru (bentuk loadSchedules) supaya
    // frontend cukup push ke memori + render tabel tanpa tarik ulang getAppData.
    return {
      success: true,
      schedule: {
        idJadwal,
        namaAgenda: String(d.nama),
        idLoker: String(d.loker || '-'),
        waktu: String(d.waktu || ''),
        link: String(d.link || d.lokasi || '-'),
        kandidat: String(d.kandidat || '-'),
        tsk: String(d.tsk || ''),
      },
    };
  } catch (e) {
    return { success: false, error: 'Gagal simpan jadwal: ' + e.message };
  }
}

async function handleHapusJadwal(payload, sessionToken) {
  const guard = requireRole(sessionToken, 'admin');
  if (guard.error) return guard.error;
  const id = String((payload && payload[0]) || '');
  if (!id) return { success: false, error: 'ID jadwal tidak ditemukan.' };
  try {
    // FIX: jadwal legacy (sebelum rebuild) hanya punya kolom `id`, tanpa
    // `id_jadwal` — DELETE dengan filter id_jadwal yang tidak cocok diam-diam
    // menghapus 0 baris (kenapa dulu "gak bisa hapus jadwal"). Cari barisnya
    // dulu (id_jadwal ATAU id), lalu hapus berdasarkan primary key `id`.
    const rows = await supabaseJson('GET', 'database_schedule', {
      query: { select: '*', limit: 500 },
    });
    const row = (Array.isArray(rows) ? rows : []).find(
      (r) => String(r.id_jadwal || '') === id || String(r.id || '') === id,
    );
    if (!row || row.id === undefined || row.id === null) {
      return { success: false, error: 'Jadwal tidak ditemukan.' };
    }
    await supabaseJson('DELETE', 'database_schedule', {
      query: { id: 'eq.' + row.id },
      headers: { Prefer: 'return=minimal' },
    });
    return { success: true, id };
  } catch (e) {
    return { success: false, error: 'Gagal hapus jadwal: ' + e.message };
  }
}

async function handleTambahTugasBaru(payload, sessionToken) {
  const guard = requireRole(sessionToken, 'admin');
  if (guard.error) return guard.error;
  const nama = String((payload && payload[0]) || '').trim();
  const admin = String((payload && payload[1]) || '');
  if (!nama) return { success: false, error: 'Nama tugas wajib diisi.' };
  const idTugas = 'TGS' + Date.now();
  const waktuDibuat = new Date().toISOString();
  try {
    await supabaseJson('POST', 'database_tugas', {
      body: {
        id_tugas: idTugas,
        nama_tugas: nama,
        dibuat_oleh: admin,
        waktu_dibuat: waktuDibuat,
        status: 'BARU',
        created_at: waktuDibuat,
        updated_at: waktuDibuat,
      },
      headers: { Prefer: 'return=minimal' },
    });
    return {
      success: true,
      tugas: { id: idTugas, task: nama, status: 'BARU', dibuatOleh: admin, waktuDibuat },
    };
  } catch (e) {
    return { success: false, error: 'Gagal tambah tugas: ' + e.message };
  }
}

async function handleSetTugasStatus(payload, sessionToken) {
  const guard = requireRole(sessionToken, 'admin');
  if (guard.error) return guard.error;
  const id = String((payload && payload[0]) || '');
  const st = String((payload && payload[1]) || '');
  if (!id || !st) return { success: false, error: 'Data tidak lengkap.' };
  try {
    // FIX sama seperti hapus jadwal: tugas legacy hanya punya `id`, bukan
    // `id_tugas` — cari barisnya dulu, update berdasarkan primary key `id`.
    const rows = await supabaseJson('GET', 'database_tugas', {
      query: { select: '*', limit: 500 },
    });
    const row = (Array.isArray(rows) ? rows : []).find(
      (r) => String(r.id_tugas || '') === id || String(r.id || '') === id,
    );
    if (!row || row.id === undefined || row.id === null) {
      return { success: false, error: 'Tugas tidak ditemukan.' };
    }
    const body = { status: st, updated_at: new Date().toISOString() };
    // @ts-expect-error JS→TS migration
    if (st === 'SELESAI') body.waktu_selesai = new Date().toISOString();
    await supabaseJson('PATCH', 'database_tugas', {
      query: { id: 'eq.' + row.id },
      body,
      headers: { Prefer: 'return=minimal' },
    });
    return {
      success: true,
      tugas: {
        id: String(row.id_tugas || row.id || ''),
        task: toText(row.nama_tugas || ''),
        status: st,
        dibuatOleh: toText(row.dibuat_oleh || ''),
        waktuDibuat: toText(row.waktu_dibuat || ''),
      },
    };
  } catch (e) {
    return { success: false, error: 'Gagal update status tugas: ' + e.message };
  }
}

async function handleHapusTugas(payload, sessionToken) {
  const guard = requireRole(sessionToken, 'admin');
  if (guard.error) return guard.error;
  const id = String((payload && payload[0]) || '');
  if (!id) return { success: false, error: 'ID tugas tidak ditemukan.' };
  try {
    const rows = await supabaseJson('GET', 'database_tugas', {
      query: { select: '*', limit: 500 },
    });
    const row = (Array.isArray(rows) ? rows : []).find(
      (r) => String(r.id_tugas || '') === id || String(r.id || '') === id,
    );
    if (!row || row.id === undefined || row.id === null) {
      return { success: false, error: 'Tugas tidak ditemukan.' };
    }
    await supabaseJson('DELETE', 'database_tugas', {
      query: { id: 'eq.' + row.id },
      headers: { Prefer: 'return=minimal' },
    });
    return { success: true, id };
  } catch (e) {
    return { success: false, error: 'Gagal hapus tugas: ' + e.message };
  }
}

export {
  handleSimpanJadwalBaru,
  handleHapusJadwal,
  handleTambahTugasBaru,
  handleSetTugasStatus,
  handleHapusTugas,
};
