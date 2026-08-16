// ai/cv.js — domain AI master/CV: auto-fill data kandidat (buildMasterNested /
// buildRingkasData), konteks admin AI copilot, & penyimpanan data AI form
// (ai_form_submissions + master_database_candidate). MODUL BARU (Fase 1.4
// REFACTOR_TODO.md) — dipindah dari actions-ai.js, body fungsi byte-identik.
'use strict';

const { normalizeWa, pick, supabaseJson, toText } = require('../db/client');
const { findCandidateByIdFiltered, findCandidateByWaFiltered, findCandidates } = require('../db/candidates');
const { requireRole } = require('../actions-auth');

const APPLY_WA_COLS = ['no_wa', 'wa', 'whatsapp'];

async function findMasterByWa(wa) {
  const want = normalizeWa(wa);
  const rows = await supabaseJson('GET', 'master_database_candidate', {
    query: { select: '*', limit: 500 },
  });
  if (!Array.isArray(rows)) return null;
  return rows.find((r) => normalizeWa(String(r.no_wa || '')) === want) || null;
}

function buildMasterNested(row) {
  const v = (col, fallback) => {
    const x = row[col];
    return x !== undefined && x !== null && x !== ''
      ? toText(x)
      : fallback !== undefined
        ? fallback
        : '';
  };
  return {
    identitas: {
      nama_lengkap: v('nama_lengkap'),
      katakana: v('furigana'),
      panggilan: v('namapanggilan'),
      panggilan_katakana: v('panggilan_katakana'),
      tempat_lahir: v('tempat_lahir'),
      tempat_lahir_jp: v('tempatlahirjp'),
      tgl_lahir: v('tgl_lahir'),
      umur: v('usia'),
      gender: v('gender'),
      agama: v('agama'),
      agamajp: v('agamajp'),
      golongan_darah: v('golongan_darah'),
      status_nikah: v('status_pernikahan'),
      statusnikahjp: v('statusnikahjp'),
      anak: v('jumlah_anak'),
      email: v('email'),
      alamat: v('alamat_lengkap'),
      alamatjp: v('alamatjp'),
      hp: v('no_wa'),
      hp_darurat: v('kontak_darurat_wa'),
      ktp: v('nik'),
      paspor: v('no_paspor'),
      sim: v('driver_license'),
      status_eks_jepang: v('status_eks_jepang'),
    },
    fisik: {
      tb: v('tb'),
      bb: v('bb'),
      topi: v('ukuran_topi'),
      baju: v('ukuranbaju'),
      sepatu: v('ukuransepatu'),
      tangan_dominan: v('tangandominan'),
      tahan_ac: v('tahan_ac'),
    },
    medis: {
      mata_kiri: v('mata_kiri'),
      mata_kanan: v('mata_kanan'),
      kacamata: v('kacamata'),
      buta_warna: v('buta_warna'),
      tato: v('tato'),
      tindik: v('tindik'),
      rokok: v('merokok'),
      alkohol: v('minum_alkohol'),
      alergi_id: v('alergi'),
      alergi_jp: v('alergijp'),
      riwayat_medis_id: v('riwayat_penyakit'),
      riwayat_medis_jp: v('riwayat_medis_jp'),
      riwayat_kecelakaan_id: v('riwayat_kecelakaan'),
      riwayat_kecelakaan_jp: v('riwayat_kecelakaan_jp'),
    },
    wawancara: {
      keinginan_id: v('keinginan_pribadi'),
      keinginan_jp: v('keinginan_pribadi_jp'),
      tujuan_ke_jepang: v('tujuan_ke_jepang'),
      tujuan_ke_jepang_jp: v('tujuan_ke_jepang_jp'),
      riwayat_jepang: v('status_eks_jepang'),
      promosi_id: v('promosi_diri'),
      promosi_jp: v('promosi_diri_jp'),
      kelebihan_id: v('kelebihan'),
      kelebihan_jp: v('kelebihan_jp'),
      kekurangan_id: v('kekurangan'),
      kekurangan_jp: v('kekurangan_jp'),
      hobi_id: v('hobi_dan_keterampilan'),
      hobi_jp: v('hobi_jp'),
      keahlian_khusus: v('keahlian_khusus'),
      keahlian_khusus_jp: v('keahlian_khusus_jp'),
      motivasi_ke_jepang: v('motivasi_ke_jepang'),
      motivasi_ke_jepang_jp: v('motivasi_ke_jepang_jp'),
      alasan_memilih_bidang: v('alasan_memilih_bidang'),
      alasan_memilih_bidang_jp: v('alasan_memilih_bidang_jp'),
      rencana_setelah_pulang: v('rencana_setelah_pulang'),
      rencana_setelah_pulang_jp: v('rencana_setelah_pulang_jp'),
      // Alias yang dibaca builder CV (10b_cv_builders.js).
      rencana_pulang_id: v('rencana_setelah_pulang'),
      rencana_pulang_jp: v('rencana_setelah_pulang_jp'),
      gaji_yen: v('harapan_gaji_yen'),
      tabungan: v('harapan_tabungan'),
    },
    sertifikasi: {
      bahasa: v('bahasa'),
      jft: v('jft'),
      ssw: v('ssw'),
      bidang: v('bidangssw') || v('bidang'),
      // Alias yang dibaca builder CV (10b_cv_builders.js): JLPT row & Lain-lain row.
      bahasa_jepang: v('jft'),
      nilai: v('jft'),
      lisensi: v('ssw'),
    },
    pendidikan: (function () {
      const arr = [];
      for (let i = 1; i <= 5; i++) {
        const tingkat = row['pendidikan_' + i + '_tingkat'];
        if (tingkat === undefined || tingkat === null) continue;
        // Kunci yang dibaca builder CV: sekolah/masuk/lulus/jurusan_id (nama_sekolah/
        // tahun_masuk/dll dipertahankan sebagai alias untuk kompatibilitas).
        arr.push({
          tingkat: toText(tingkat),
          sekolah: v('pendidikan_' + i + '_nama_sekolah'),
          nama_sekolah: v('pendidikan_' + i + '_nama_sekolah'),
          sekolah_jp: v('pendidikan_' + i + '_sekolah_jp'),
          jurusan_id: v('pendidikan_' + i + '_jurusan_id'),
          jurusan: v('pendidikan_' + i + '_jurusan_id'),
          jurusan_jp: v('pendidikan_' + i + '_jurusan_jp'),
          masuk: v('pendidikan_' + i + '_tahun_masuk'),
          tahun_masuk: v('pendidikan_' + i + '_tahun_masuk'),
          lulus: v('pendidikan_' + i + '_tahun_lulus'),
          tahun_lulus: v('pendidikan_' + i + '_tahun_lulus'),
        });
      }
      return arr;
    })(),
    pekerjaan: (function () {
      const arr = [];
      for (let i = 1; i <= 3; i++) {
        const nm = row['pekerjaan_' + i + '_nama_perusahaan'];
        if (nm === undefined || nm === null) continue;
        arr.push({
          perusahaan: toText(nm),
          nama_perusahaan: toText(nm),
          perusahaan_jp: v('pekerjaan_' + i + '_perusahaan_jp'),
          jabatan: v('pekerjaan_' + i + '_jabatan'),
          jabatan_jp: v('pekerjaan_' + i + '_jabatan_jp'),
          masuk: v('pekerjaan_' + i + '_tahun_masuk'),
          tahun_masuk: v('pekerjaan_' + i + '_tahun_masuk'),
          keluar: v('pekerjaan_' + i + '_tahun_keluar'),
          tahun_keluar: v('pekerjaan_' + i + '_tahun_keluar'),
          gaji: v('pekerjaan_' + i + '_gaji'),
        });
      }
      return arr;
    })(),
    keluarga: (function () {
      const arr = [];
      for (let i = 1; i <= 5; i++) {
        const nm = row['keluarga_' + i + '_nama'];
        if (nm === undefined || nm === null) continue;
        arr.push({
          nama: toText(nm),
          umur: v('keluarga_' + i + '_usia'),
          usia: v('keluarga_' + i + '_usia'),
          hubungan: v('keluarga_' + i + '_hubungan'),
          hubungan_jp: v('keluarga_' + i + '_hubungan_jp'),
          pekerjaan: v('keluarga_' + i + '_pekerjaan'),
          pekerjaan_jp: v('keluarga_' + i + '_pekerjaan_jp'),
        });
      }
      return arr;
    })(),
    kenalan_jepang: {
      nama_id: v('kenalan_di_jepang_nama'),
      nama_jp: v('kenalan_di_jepang_nama_jp'),
      hubungan_id: v('kenalan_di_jepang_hubungan'),
      hubungan_jp: v('kenalan_di_jepang_hubungan_jp'),
      pekerjaan_id: v('kenalan_di_jepang_pekerjaan'),
      pekerjaan_jp: v('kenalan_di_jepang_pekerjaan_jp'),
      usia: v('kenalan_di_jepang_usia'),
      alamat_id: v('kenalan_di_jepang_alamat'),
      alamat_jp: v('kenalan_di_jepang_alamat_jp'),
    },
    uploads: {
      photo: row.pas_photo || '',
      cv: row.file_cv || '',
      jft: row.jft_url || '',
      ssw: row.ssw_url || '',
    },
  };
}

// Ringkasan data kandidat (bentuk nested dari buildMasterNested) yang disuntikkan
// ke system prompt processAIChat — supaya Jeklin TAHU data yang sudah terisi
// (TB/BB, NIK, paspor, dll) dan tidak menanyakan ulang data yang ada di database.
function buildRingkasData(cur) {
  const id = (cur && cur.identitas) || {};
  const fs = (cur && cur.fisik) || {};
  const md = (cur && cur.medis) || {};
  const st = (cur && cur.sertifikasi) || {};
  const ww = (cur && cur.wawancara) || {};
  const lines = [];
  const add = (label, val) => {
    const s = val === undefined || val === null ? '' : String(val).trim();
    if (s && s !== '' && s !== '-') lines.push(label + ': ' + s);
  };
  add('Nama lengkap', id.nama_lengkap);
  add('Nama panggilan', id.panggilan);
  add('Katakana', id.katakana);
  add('Tempat lahir', id.tempat_lahir);
  add('Tanggal lahir', id.tgl_lahir);
  add('Umur', id.umur);
  add('Gender', id.gender);
  add('Agama', id.agama);
  add('Golongan darah', id.golongan_darah);
  add('Status pernikahan', id.status_nikah);
  add('No HP', id.hp);
  add('No HP darurat', id.hp_darurat);
  add('Alamat', id.alamat);
  add('Email', id.email);
  add('Tinggi badan', fs.tb ? fs.tb + ' cm' : '');
  add('Berat badan', fs.bb ? fs.bb + ' kg' : '');
  add('Ukuran topi', fs.topi);
  add('Ukuran baju', fs.baju);
  add('Ukuran sepatu', fs.sepatu);
  add('Tangan dominan', fs.tangan_dominan);
  add('Tahan AC', fs.tahan_ac);
  add('Kacamata', md.kacamata);
  add('Buta warna', md.buta_warna);
  add('Tato', md.tato);
  add('Tindik', md.tindik);
  add('Rokok', md.rokok);
  add('Alkohol', md.alkohol);
  add('Alergi', md.alergi_id);
  add('Riwayat penyakit', md.riwayat_medis_id);
  add('Riwayat kecelakaan', md.riwayat_kecelakaan_id);
  add('NIK KTP', id.ktp);
  add('No. Paspor', id.paspor);
  add('SIM', id.sim);
  add('Pernah ke Jepang', id.status_eks_jepang);
  add('Bahasa Jepang (JLPT/JFT)', st.bahasa_jepang || st.jft || st.bahasa);
  add('SSW/Lisensi', st.lisensi || st.ssw);
  add('Bidang SSW', st.bidang);
  add('Hobi', ww.hobi_id);
  add('Kelebihan', ww.kelebihan_id);
  add('Kekurangan', ww.kekurangan_id);
  add('Motivasi ke Jepang', ww.motivasi_ke_jepang || ww.tujuan_ke_jepang);
  const pend = Array.isArray(cur && cur.pendidikan) ? cur.pendidikan : [];
  if (pend.length) {
    add(
      'Pendidikan',
      pend
        .map((p) =>
          [p.tingkat, p.sekolah || p.nama_sekolah, p.jurusan_id || p.jurusan, p.tahun_lulus ? p.tahun_lulus + ' lulus' : ''].filter(Boolean).join(' - '),
        )
        .join('; '),
    );
  }
  const pek = Array.isArray(cur && cur.pekerjaan) ? cur.pekerjaan : [];
  if (pek.length) {
    add(
      'Pengalaman kerja',
      pek
        .map((p) =>
          [p.perusahaan || p.nama_perusahaan, p.jabatan, p.tahun_masuk ? p.tahun_masuk + '-' + (p.tahun_keluar || 'sekarang') : ''].filter(Boolean).join(' - '),
        )
        .join('; '),
    );
  }
  const klg = Array.isArray(cur && cur.keluarga) ? cur.keluarga : [];
  if (klg.length) {
    add(
      'Keluarga',
      klg.map((k) => [k.hubungan, k.nama, k.usia ? k.usia + ' th' : '', k.pekerjaan].filter(Boolean).join(' - ')).join('; '),
    );
  }
  return lines.join('\n');
}

async function handleGetAdminAiContext(payload, sessionToken) {
  const guard = requireRole(sessionToken, 'admin');
  if (guard.error) return guard.error;
  const d = (payload && payload[0]) || {};
  const wa = String(d.wa || d.waTarget || '');
  try {
    let row = null;
    if (wa) row = await findMasterByWa(wa);
    if (!row && (d.candidateId || d.idKandidat || d.wa)) {
      const id = String(d.candidateId || d.idKandidat || '');
      // Jalur cepat: cari baris kandidat via query server-side (by id / WA).
      let cand = id
        ? await findCandidateByIdFiltered(id)
        : await findCandidateByWaFiltered(d.wa);
      if (cand === undefined) {
        const found = await findCandidates();
        cand =
          (found.rows || []).find((r) =>
            id
              ? String(pick(r, ['id_kandidat', 'id']) || '') === id
              : normalizeWa(String(pick(r, APPLY_WA_COLS) || '')) ===
                normalizeWa(d.wa),
          ) || null;
      }
      if (cand) row = await findMasterByWa(String(cand.no_wa || ''));
    }
    if (!row) return { success: true, data: null };
    return { success: true, data: buildMasterNested(row) };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function handleBuildAdminAiCandidateSummary(payload, sessionToken) {
  const ctx = await handleGetAdminAiContext(payload, sessionToken);
  if (!ctx.success) return ctx;
  const data = ctx.data;
  const summary = data
    ? data.identitas.nama_lengkap +
      ' | ' +
      (data.identitas.umur || '-') +
      ' th | ' +
      (data.fisik.tb || '-') +
      'cm/' +
      (data.fisik.bb || '-') +
      'kg | JFT: ' +
      (data.sertifikasi.jft || '-')
    : 'Data kandidat belum lengkap.';
  return { success: true, summary, data };
}

// ---------------------------------------------------------------------------
// submitDataAsj — simpan data AI form (ai_form.html) ke ai_form_submissions
// ---------------------------------------------------------------------------
async function handleSubmitDataAsj(payload, sessionToken) {
  const d = payload || {};
  const ctx = d.context || {};
  const identitas = d.identitas || {};
  const wa = normalizeWa(String(ctx.wa || identitas.hp || ''));
  if (!wa) return { success: false, message: 'Nomor WA tidak ditemukan.' };
  const guard = requireRole(sessionToken, 'kandidat');
  if (guard.error) return guard.error;
  try {
    const aiData = {
      identitas: d.identitas || {},
      fisik: d.fisik || {},
      medis: d.medis || {},
      pendidikan: d.pendidikan || {},
      pekerjaan: d.pekerjaan || {},
      sertifikasi: d.sertifikasi || {},
      keluarga: d.keluarga || {},
      wawancara: d.wawancara || {},
    };
    const nama = String(identitas.nama_lengkap || '').trim();
    const jobCode = String(ctx.job || ctx.jobCode || '');
    // CHECK constraint tabel ini hanya izinkan mode='AI_MASTER' + status='MENUNGGU'
    // (discriminator sesi: submitted_via='ai_form' vs 'interview').
    const body = {
      wa,
      nama_lengkap: nama,
      mode: 'AI_MASTER',
      job_code: jobCode,
      status: 'MENUNGGU',
      ai_data_json: JSON.stringify(aiData),
      ai_updated_at: new Date().toISOString(),
      photo_url: d.fotoFile || '',
      jft_url: d.jftFile || '',
      ssw_url: d.sswFile || '',
      submitted_via: 'ai_form',
      updated_at: new Date().toISOString(),
    };
    const existingRows = await supabaseJson('GET', 'ai_form_submissions', {
      query: { select: '*', limit: 100 },
    });
    const existing = (Array.isArray(existingRows) ? existingRows : []).find(
      (r) =>
        normalizeWa(String(r.wa || '')) === wa &&
        String(r.submitted_via || '') === 'ai_form',
    );
    if (existing && existing.id !== undefined) {
      await supabaseJson('PATCH', 'ai_form_submissions', {
        query: { id: 'eq.' + existing.id },
        body,
        headers: { Prefer: 'return=minimal' },
      });
    } else {
      await supabaseJson('POST', 'ai_form_submissions', {
        body: Object.assign({ created_at: new Date().toISOString() }, body),
        headers: { Prefer: 'return=minimal' },
      });
    }
    try {
      const m = await findMasterByWa(wa);
      if (m && m.id !== undefined) {
        await supabaseJson('PATCH', 'master_database_candidate', {
          query: { id: 'eq.' + m.id },
          body: { ai_data_json: JSON.stringify(aiData), ai_updated_at: new Date().toISOString() },
          headers: { Prefer: 'return=minimal' },
        });
      }
    } catch (e) {
      /* opsional */
    }
    return { success: true };
  } catch (e) {
    return { success: false, message: 'Gagal simpan data: ' + e.message };
  }
}

// ---------------------------------------------------------------------------
// simpanDataTtdNaitei — simpan tanda tangan / esignature kandidat
// ---------------------------------------------------------------------------
async function handleSimpanDataTtdNaitei(payload, sessionToken) {
  const guard = requireRole(sessionToken, 'kandidat');
  if (guard.error) return guard.error;
  const d = payload || {};
  const wa = normalizeWa(String(d.wa || ''));
  if (!wa) return { success: false, error: 'Nomor WA tidak ditemukan.' };
  try {
    const data = {
      wa,
      ttd1: d.ttd1 || '',
      nama1: d.nama1 || '',
      ttd2: d.ttd2 || '',
      nama2: d.nama2 || '',
    };
    try {
      const rows = await supabaseJson('GET', 'esignatures', {
        query: { select: '*', limit: 100 },
      });
      const existing = (Array.isArray(rows) ? rows : []).find(
        (r) => normalizeWa(String(r.wa || '')) === wa,
      );
      if (existing && existing.id !== undefined) {
        await supabaseJson('PATCH', 'esignatures', {
          query: { id: 'eq.' + existing.id },
          body: Object.assign(data, { updated_at: new Date().toISOString() }),
          headers: { Prefer: 'return=minimal' },
        });
      } else {
        await supabaseJson('POST', 'esignatures', {
          body: Object.assign(data, {
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
          headers: { Prefer: 'return=minimal' },
        });
      }
    } catch (e) {
      /* tabel esignatures mungkin kosong/tanpa kolom wa — fallback ke ai_form_submissions */
      await supabaseJson('POST', 'ai_form_submissions', {
        body: {
          wa,
          mode: 'ttd',
          status: 'TTD',
          ai_data_json: JSON.stringify(data),
          submitted_via: 'esign',
        },
        headers: { Prefer: 'return=minimal' },
      });
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

module.exports = {
  APPLY_WA_COLS,
  buildMasterNested,
  buildRingkasData,
  findMasterByWa,
  handleGetAdminAiContext,
  handleBuildAdminAiCandidateSummary,
  handleSubmitDataAsj,
  handleSimpanDataTtdNaitei,
};
