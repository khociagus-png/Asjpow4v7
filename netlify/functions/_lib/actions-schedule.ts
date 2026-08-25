import { supabaseJson, toText } from './db/client';
import { requireRole } from './actions-auth';
import * as fcm from './fcm-server';
// actions-schedule.js — jadwal (database_schedule) & tugas (database_tugas).
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

// === CHECK & SEND AGENDA REMINDERS ===
// Cek jadwal aktif yang akan dimulai dalam 1 jam ke depan, kirim FCM push
// ke kandidat yang terdaftar. Dipanggil saat kandidat login (frontend).
// Dedup: gunakan field `reminder_sent` di database_schedule untuk cegah
// kirim ulang (set true setelah berhasil kirim).
async function handleCheckAndSendAgendaReminders(payload, sessionToken) {
  // Bisa dipanggil kandidat (login trigger) atau admin (manual test)
  let sent = 0;
  let errors = 0;
  try {
    const now = Date.now();
    const oneHourMs = 60 * 60 * 1000;
    const { rows: schedules } = await supabaseJson('GET', 'database_schedule', {
      query: {
        select: '*',
        status_jadwal: 'eq.AKTIF',
        limit: 100,
      },
    });
    if (!Array.isArray(schedules) || schedules.length === 0) {
      return { success: true, sent: 0, checked: 0 };
    }
    for (const s of schedules) {
      const waktu = String(s.tanggal_waktu || '');
      if (!waktu) continue;
      // Parse waktu — support format ISO dan "DD/MM/YYYY HH:mm"
      let schedTime = 0;
      try {
        if (waktu.includes('/')) {
          const [datePart, timePart] = waktu.split(' ');
          const [dd, mm, yyyy] = datePart.split('/');
          const [hh, mi] = (timePart || '00:00').split(':');
          schedTime = new Date(
            Number(yyyy),
            Number(mm) - 1,
            Number(dd),
            Number(hh),
            Number(mi),
          ).getTime();
        } else {
          schedTime = new Date(waktu).getTime();
        }
      } catch {
        continue;
      }
      if (!schedTime || isNaN(schedTime)) continue;
      // Cek apakah dalam window H-1 (sekarang sampai +1 jam)
      const diffMs = schedTime - now;
      if (diffMs < 0 || diffMs > oneHourMs) continue;
      // Cek dedup
      if (s.reminder_sent === true || s.reminder_sent === 'true') continue;
      // Parse daftar kandidat (WA dari comma/newline separated list)
      const daftarRaw = String(s.daftar_kandidat || '');
      const waList = daftarRaw
        .split(/[\n,;]+/)
        .map((x) => {
          const digits = x.replace(/\D/g, '');
          if (digits.startsWith('628') && digits.length >= 13) return digits;
          if (digits.startsWith('08') && digits.length >= 10) return '62' + digits.slice(1);
          return '';
        })
        .filter(Boolean);
      if (waList.length === 0) continue;
      // Kirim FCM ke setiap kandidat
      const agenda = s.nama_agenda || 'Jadwal';
      const lokasi = s.lokasi_link || '-';
      const timeLeft = Math.round(diffMs / 60000);
      const title = '⏰ Pengingat: ' + agenda;
      const body =
        agenda +
        (timeLeft > 0 ? ' dalam ' + timeLeft + ' menit' : ' dimulai sekarang') +
        (lokasi && lokasi !== '-' ? ' di ' + lokasi : '');
      for (const wa of waList) {
        try {
          const { rows: tokens } = await supabaseJson('GET', 'fcm_tokens', {
            query: { select: 'token', wa: 'eq.' + wa, limit: 5 },
          });
          if (Array.isArray(tokens) && tokens.length > 0) {
            const tokenList = tokens.map((t) => t.token).filter(Boolean);
            if (tokenList.length > 0) {
              await fcm.sendMulticast(tokenList, title, body, '/');
              sent++;
            }
          }
        } catch {
          errors++;
        }
      }
      // Tandai sudah dikirim
      try {
        const schedId = s.id || s.id_jadwal;
        if (schedId) {
          await supabaseJson('PATCH', 'database_schedule', {
            query: { id: 'eq.' + schedId },
            body: { reminder_sent: true, updated_at: new Date().toISOString() },
            headers: { Prefer: 'return=minimal' },
          });
        }
      } catch {
        // best-effort
      }
    }
    return { success: true, sent, errors, checked: schedules.length };
  } catch (e) {
    return { success: false, error: e.message || 'Gagal check reminders' };
  }
}

export {
  handleSimpanJadwalBaru,
  handleHapusJadwal,
  handleTambahTugasBaru,
  handleSetTugasStatus,
  handleHapusTugas,
  handleCheckAndSendAgendaReminders,
};
