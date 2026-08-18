// ai/cv.js — domain AI master/CV: auto-fill data kandidat (buildMasterNested /
// buildRingkasData), konteks admin AI copilot, & penyimpanan data AI form
// (ai_form_submissions + master_database_candidate). MODUL BARU (Fase 1.4
// REFACTOR_TODO.md) — dipindah dari actions-ai.js, body fungsi byte-identik.
'use strict';

const { normalizeWa, pick, supabaseJson } = require('../db/client');
const {
  findCandidateByIdFiltered,
  findCandidateByWaFiltered,
  findCandidates,
} = require('../db/candidates');
const { requireRole } = require('../actions-auth');
// Satu sumber buildMasterNested (dari actions-master.js) supaya konteks AI
// admin tidak pakai salinan lama yang belum merge ai_data_json (kenalan JP/
// alamat & array riwayat tampil kosong di copilot admin).
const { buildMasterNested } = require('../actions-master');
const { syncBiodataKeMail } = require('../actions-mail');

// Label seksi AI form untuk ringkasan mail ("[BIODATA] fisik & ukuran, medis") —
// samakan dengan fix sync biodata (submitMasterForm/updateKandidatSuper) supaya
// admin tahu bagian mana yang di-update kandidat lewat ai_form.
const AI_SEKSI_LABEL = {
  identitas: 'identitas',
  fisik: 'fisik & ukuran',
  medis: 'medis',
  pendidikan: 'pendidikan',
  pekerjaan: 'pekerjaan',
  sertifikasi: 'sertifikasi',
  keluarga: 'keluarga',
  wawancara: 'wawancara',
};

const APPLY_WA_COLS = ['no_wa', 'wa', 'whatsapp'];

async function findMasterByWa(wa) {
  const want = normalizeWa(wa);
  const rows = await supabaseJson('GET', 'master_database_candidate', {
    query: { select: '*', limit: 500 },
  });
  if (!Array.isArray(rows)) return null;
  return rows.find((r) => normalizeWa(String(r.no_wa || '')) === want) || null;
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
          [
            p.tingkat,
            p.sekolah || p.nama_sekolah,
            p.jurusan_id || p.jurusan,
            p.tahun_lulus ? p.tahun_lulus + ' lulus' : '',
          ]
            .filter(Boolean)
            .join(' - '),
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
          [
            p.perusahaan || p.nama_perusahaan,
            p.jabatan,
            p.tahun_masuk ? p.tahun_masuk + '-' + (p.tahun_keluar || 'sekarang') : '',
          ]
            .filter(Boolean)
            .join(' - '),
        )
        .join('; '),
    );
  }
  const klg = Array.isArray(cur && cur.keluarga) ? cur.keluarga : [];
  if (klg.length) {
    add(
      'Keluarga',
      klg
        .map((k) =>
          [k.hubungan, k.nama, k.usia ? k.usia + ' th' : '', k.pekerjaan]
            .filter(Boolean)
            .join(' - '),
        )
        .join('; '),
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
      let cand = id ? await findCandidateByIdFiltered(id) : await findCandidateByWaFiltered(d.wa);
      if (cand === undefined) {
        const found = await findCandidates();
        cand =
          (found.rows || []).find((r) =>
            id
              ? String(pick(r, ['id_kandidat', 'id']) || '') === id
              : normalizeWa(String(pick(r, APPLY_WA_COLS) || '')) === normalizeWa(d.wa),
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
    // Seksi yang dikelola form AI. Kunci lain (kenalan_jepang, context,
    // fotoFile/jftFile/sswFile, dll) PERTAHANKAN dari ai_data_json lama —
    // tanpa ini simpan CV AI menghapus data kenalan & file lama dari
    // master_database_candidate.ai_data_json (bug: kenalan hilang setelah
    // save CV AI).
    const AI_MANAGED_KEYS = new Set([
      'identitas',
      'fisik',
      'medis',
      'pendidikan',
      'pekerjaan',
      'sertifikasi',
      'keluarga',
      'wawancara',
    ]);
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
      (r) => normalizeWa(String(r.wa || '')) === wa && String(r.submitted_via || '') === 'ai_form',
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
        let aiOut = aiData;
        let prev = null;
        try {
          const prevRaw = m.ai_data_json;
          prev =
            typeof prevRaw === 'string' && prevRaw.trim() && prevRaw !== '-'
              ? JSON.parse(prevRaw)
              : null;
          if (prev && typeof prev === 'object') {
            aiOut = {};
            for (const k of Object.keys(prev)) {
              if (!AI_MANAGED_KEYS.has(k)) aiOut[k] = prev[k];
            }
            for (const k of Object.keys(aiData)) aiOut[k] = aiData[k];
          }
        } catch (e) {
          prev = null;
        }
        await supabaseJson('PATCH', 'master_database_candidate', {
          query: { id: 'eq.' + m.id },
          body: { ai_data_json: JSON.stringify(aiOut), ai_updated_at: new Date().toISOString() },
          headers: { Prefer: 'return=minimal' },
        });
        // Ringkasan perubahan ke mail (badge UPDATE + "[BIODATA] …"): hanya
        // seksi yang BENAR-BENAR berubah dari ai_data_json lama, supaya simpan
        // AI form berulang (tanpa perubahan) tidak menulis feedback tiap kali.
        try {
          const labels = [];
          for (const [key, label] of Object.entries(AI_SEKSI_LABEL)) {
            const oldVal =
              prev && typeof prev === 'object' ? JSON.stringify(prev[key] || {}) : null;
            const newVal = JSON.stringify(aiData[key] || {});
            if (oldVal !== newVal) labels.push(label);
          }
          if (labels.length) {
            await syncBiodataKeMail(
              wa,
              String(identitas.nama_lengkap || identitas.nama || '').trim() || 'KANDIDAT',
              labels,
            );
          }
        } catch (e) {
          /* sync mail opsional — jangan gagalkan simpan AI form */
        }
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
  AI_SEKSI_LABEL,
  buildMasterNested,
  buildRingkasData,
  findMasterByWa,
  handleGetAdminAiContext,
  handleBuildAdminAiCandidateSummary,
  handleSubmitDataAsj,
  handleSimpanDataTtdNaitei,
};
