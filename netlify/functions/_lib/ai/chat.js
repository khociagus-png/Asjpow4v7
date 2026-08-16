// ai/chat.js — domain AI chat & wawancara: Qween Jeklin (chat kandidat master),
// Jeklin copilot admin, Dede Jeklin (siswa baru), wawancara kerja (mensetsu)
// per bidang SSW + hasil wawancara. MODUL BARU (Fase 1.4 REFACTOR_TODO.md) —
// dipindah dari actions-ai.js, body fungsi byte-identik.
'use strict';

const { normalizeWa, pick, supabaseJson } = require('../db/client');
const { findCandidateByIdFiltered, findCandidateByWaFiltered, findCandidates } = require('../db/candidates');
const { requireRole } = require('../actions-auth');
const { buildRingkasData, findMasterByWa, APPLY_WA_COLS } = require('./cv');
const { geminiGenerate, parseJsonLoose } = require('./providers');

async function handleProcessAIChat(payload) {
  const p = payload || {};
  const flow = String(p.flow || 'master');
  const history = Array.isArray(p.history) ? p.history : [];
  const lang = String(p.lang || 'id');
  const ringkas = buildRingkasData(p.currentData);
  const system =
    'Kamu adalah Qween Jeklin, HRD Virtual LPK ASJ (PT Amanah Sakura Japan), perusahaan penyalur kerja ke Jepang. ' +
    'Tugasmu membantu kandidat melengkapi data Master (identitas, fisik, medis, pendidikan, pekerjaan, keluarga, ' +
    'sertifikasi, wawancara) untuk CV kerja Jepang. Balas ramah & singkat dalam bahasa ' +
    (lang === 'jp' ? 'Jepang' : 'Indonesia') +
    '. Jika kandidat memberi data baru, konfirmasi dan minta data berikutnya yang kurang. Flow aktif: ' +
    flow +
    '.' +
    (ringkas
      ? '\n\nDATA KANDIDAT SAAT INI (sudah terisi di database):\n' +
        ringkas +
        '\n\nAturan: JANGAN menanyakan ulang data yang sudah terisi di atas, dan jangan mengaku data itu kosong. ' +
        'Kalau kandidat bertanya tentang data yang sudah ada, jawab pakai data tersebut. ' +
        'Tanyakan hanya data yang TIDAK tercantum di atas.'
      : '');
  try {
    return await geminiGenerate(system, history);
  } catch (e) {
    // Jangan bocorkan detail error mentah ke user — log detailnya di server saja.
    console.error('[AI] processAIChat error:', e && e.message ? e.message : e);
    return { reply: 'Maaf, asisten AI sedang sibuk. Coba lagi beberapa saat ya!' };
  }
}

async function handleProcessAdminAIChat(payload, sessionToken) {
  const guard = requireRole(sessionToken, 'admin');
  if (guard.error) return guard.error;
  const d = (payload && payload[0]) || {};
  const history = (d.history || []).concat([{ role: 'user', content: d.message || '' }]);
  const system =
    'Kamu adalah Jeklin, asisten HRD admin ASJ (PT Amanah Sakura Japan). Admin: ' +
    String(d.adminName || '') +
    '. ' +
    'Kandidat yang sedang dibahas ID: ' +
    String(d.candidateId || '-') +
    '. ' +
    'Bantu analisis data kandidat, saran rekrutmen, dan jawaban profesional. Balas singkat & jelas dalam Bahasa Indonesia.';
  try {
    const r = await geminiGenerate(system, history);
    return { success: true, reply: r.reply, suggestedActions: [], analysis: null };
  } catch (e) {
    // Jangan bocorkan detail error mentah ke admin — log detailnya di server saja.
    console.error('[AI] processAdminAIChat error:', e && e.message ? e.message : e);
    return { success: false, error: 'Asisten AI sedang sibuk. Coba lagi beberapa saat ya!' };
  }
}

async function handleProcessSiswaAIChat(payload) {
  const p = payload || {};
  const system =
    'Kamu adalah Dede Jeklin, asisten pendaftaran siswa baru LPK ASJ. Bantu siswa/orang tua melengkapi form ' +
    '(nama, TTL, gender, agama, alamat, email, pendidikan, WA siswa, WA ortu). Balas ramah dan singkat dalam Bahasa Indonesia.';
  try {
    return await geminiGenerate(system, Array.isArray(p.history) ? p.history : []);
  } catch (e) {
    return { reply: 'Maaf, jaringan AI sedang sibuk. Coba lagi ya!' };
  }
}

// ---------------------------------------------------------------------------
// Model wawancara per bidang SSW (Tokutei Ginou) — gaya dokumen isian
// wawancara tim (14 pertanyaan: ID + romaji + panduan jawaban).
// ---------------------------------------------------------------------------
const BIDANG_INTERVIEW = {
  kaigo: {
    label: 'Kaigo (介護)',
    extra: [
      'Apa saja tugas utama seorang kaigo / caregiver? Jelaskan dengan contoh.',
      'Bagaimana cara menghadapi lansia yang sedang marah, bingung, atau susah diatur?',
      'Apa yang kamu ketahui tentang sertifikat Kaigo Fukushishi / ujian Kouka Shiken di Jepang?',
      'Apakah kamu punya pengalaman merawat anggota keluarga yang lanjut usia? Ceritakan.',
    ],
  },
  shokuhin: {
    label: 'Shokuhin Seizou (食品製造)',
    extra: [
      'Pernahkah kamu bekerja di produksi/pengolahan makanan? Ceritakan pengalamanmu.',
      'Apa yang kamu ketahui tentang kebersihan dan keamanan pangan (food safety)?',
      'Bagaimana perasaanmu bekerja shift malam atau lembur?',
      'Apakah kamu bisa bekerja cepat, teliti, dan mengikuti SOP dengan disiplin?',
    ],
  },
  nougyou: {
    label: 'Nougyou (農業)',
    extra: [
      'Apakah kamu pernah bekerja di sawah/ladang? Ceritakan pengalamanmu.',
      'Bagaimana perasaanmu bekerja di luar ruangan dengan cuaca panas/dingin?',
      'Apakah fisikmu kuat untuk kerja lapangan yang berat?',
      'Apa yang kamu ketahui tentang teknologi pertanian Jepang?',
    ],
  },
  kensetsu: {
    label: 'Kensetsu (建設)',
    extra: [
      'Apakah kamu pernah bekerja di proyek bangunan? Ceritakan pengalamanmu.',
      'Apa yang kamu ketahui tentang keselamatan kerja (anzen) di lokasi konstruksi?',
      'Bagaimana perasaanmu bekerja di ketinggian atau di luar ruangan?',
      'Apakah kamu bisa bekerja dengan alat berat / mesin?',
    ],
  },
  jidousha: {
    label: 'Jidousha Seibi (自動車整備)',
    extra: [
      'Apakah kamu punya pengalaman di bengkel atau perawatan kendaraan? Ceritakan.',
      'Apa yang kamu ketahui tentang alat-alat bengkel dan keselamatan kerjanya?',
      'Apakah kamu teliti dan sabar mengerjakan detail mekanik?',
      'Apakah kamu bisa membaca manual / mengikuti instruksi teknis?',
    ],
  },
  binbou: {
    label: 'Binbou (ビルクリーニング)',
    extra: [
      'Apakah kamu pernah bekerja cleaning service? Ceritakan pengalamanmu.',
      'Apa yang kamu ketahui tentang cara membersihkan bangunan/gedung secara profesional?',
      'Apakah kamu teliti dan bertanggung jawab dengan detail kecil?',
      'Bagaimana perasaanmu bekerja sendiri di malam hari?',
    ],
  },
  sougou: {
    label: 'Sougou Service (総合サービス)',
    extra: [
      'Apakah kamu punya pengalaman melayani pelanggan? Ceritakan.',
      'Bagaimana cara kamu menghadapi pelanggan yang sedang komplain?',
      'Apa itu omotenashi? Bagaimana kamu menerapkannya?',
      'Apakah kamu bisa ramah dan sopan dalam bahasa Jepang?',
    ],
  },
};
const BIDANG_DEFAULT = {
  label: 'SSW (Tokutei Ginou)',
  extra: [
    'Apakah kamu punya pengalaman kerja di bidang ini? Ceritakan secara detail.',
    'Apa yang kamu ketahui tentang pekerjaan SSW yang kamu lamar?',
    'Menurutmu apa yang paling berat dari bidang ini? Bagaimana kamu mengatasinya?',
    'Kenapa kamu memilih bidang pekerjaan ini?',
  ],
};

function normalizeBidang(raw) {
  const s = String(raw || '').toLowerCase();
  if (!s) return null;
  if (/kaigo|kaig|caregiver|perawat.?lansia|care.?giving/.test(s)) return BIDANG_INTERVIEW.kaigo;
  if (/shokuhin|syokuhin|food|makanan|ryouri|seizou/.test(s)) return BIDANG_INTERVIEW.shokuhin;
  if (/nougyou|noukou|agricultur|pertanian|sawah|farming/.test(s)) return BIDANG_INTERVIEW.nougyou;
  if (/kensetsu|konstruksi|construction|bangunan/.test(s)) return BIDANG_INTERVIEW.kensetsu;
  if (/jidousha|seibi|otomotif|automotif|auto.?maint/.test(s)) return BIDANG_INTERVIEW.jidousha;
  if (/binbou|cleaning|kebersihan|sapu|bencah/.test(s)) return BIDANG_INTERVIEW.binbou;
  if (/sougou|service|pelayanan|omotenashi|restoran|hotel/.test(s)) return BIDANG_INTERVIEW.sougou;
  return null;
}

// Resolve bidang + nama kandidat dari WA (master dulu, fallback kandidat).
async function resolveProfilKandidat(wa) {
  const want = normalizeWa(String(wa || ''));
  if (!want) return null;
  let nama = '';
  let bidangRaw = '';
  try {
    const m = await findMasterByWa(want);
    if (m) {
      nama = String(m.nama_lengkap || '');
      bidangRaw = String(m.bidangssw || m.ssw || m.bidang || m.lisensi || '');
    }
  } catch (e) {
    /* opsional */
  }
  if (!nama || !bidangRaw) {
    try {
      let c = await findCandidateByWaFiltered(want);
      if (c === undefined) {
        const found = await findCandidates();
        c =
          (found.rows || []).find((r) =>
            normalizeWa(String(pick(r, APPLY_WA_COLS) || '')) === want,
          ) || null;
      }
      if (c) {
        if (!nama) nama = String(c.nama || c.nama_lengkap || '');
        if (!bidangRaw) bidangRaw = String(c.bidang || c.ssw || c.bidangssw || '');
      }
    } catch (e2) {
      /* opsional */
    }
  }
  return { wa: want, nama, bidang: normalizeBidang(bidangRaw) || BIDANG_DEFAULT, bidangRaw };
}

function buildInterviewSystem(profil, kota) {
  const b = profil.bidang || BIDANG_DEFAULT;
  const lines = [
    'Kamu adalah Jeklin Sensei, pewawancara kerja (mensetsu) Jepang untuk LPK ASJ (PT Amanah Sakura Japan).',
    'Kandidat: ' + (profil.nama || 'Kandidat') + '-san. Bidang SSW: ' + b.label + '.',
    'Kota penempatan: ' + (kota || 'belum ditentukan') + '.',
    'LAKUKAN WAWANCARA SEPERTI PEWAWANCARA ASLI (bukan kuesioner, bukan dokumen isian):',
    '- Buka dengan sapaan hangat singkat, lalu minta perkenalan singkat (jikoshoukai).',
    '- Tanyakan SATU pertanyaan per pesan dengan bahasa alami; untuk kalimat kunci, tambahkan romaji singkat dalam kurung (mis. "Hobi kamu apa? (shumi wa nandesu ka?)").',
    '- DENGARKAN jawaban kandidat, beri reaksi natural (puji/klarifikasi), lalu follow-up untuk menggali lebih dalam bila perlu.',
    '- JANGAN PERNAH menampilkan nomor pertanyaan, daftar/urutan, atau format "1. 2. 3.".',
    '- Wajib gali topik berikut secara alami bila belum terjawab (dalam urutan wajar seperti pewawancara sungguhan):',
    '  • Perkenalan & alasan melamar (kenapa bidang ' + b.label + ').',
    '  • Hobi / aktivitas fisik.',
    '  • Pengalaman kerja terkait bidang (detail!).',
    '  • Kelebihan & kekurangan.',
    '  • Motivasi ke Jepang, berapa lama ingin bekerja (target 5 tahun+, sertifikat/bahasa).',
    '  • Pengetahuan tentang kota penempatan.',
    '  • Pengetahuan tentang pekerjaan ' + b.label + ' dan hal terberatnya.',
    '  • Rencana setelah pulang ke Indonesia.',
    '  • Pertanyaan balik untuk perusahaan.',
    'Topik khas bidang ' + b.label + ' (tanyakan dengan santai):',
  ];
  lines.push.apply(lines, b.extra.map((q, i) => '  • ' + (i + 1) + ') ' + q));
  lines.push(
    'TUTUP wawancara dengan sopan (doumo arigatou gozaimasu + semangat) ketika semua topik inti sudah terjawab ATAU kandidat menutup pembicaraan.',
    'Di pesan PENUTUP, setelah teks terima kasih, tambahkan baris persis "===HASIL===" lalu JSON TUNGGAL tanpa teks lain:',
    '{ "score": 0-10, "nilai": "A/B/C", "rekomendasi": "...", "biodata": { kunci camelCase — hanya field yang KANDIDAT sebutkan: nama, furigana, tempatLahir, tglLahir, alamat, email, gender, hobi, kelebihan, kekurangan, motivasiJepang, tujuanJepang, keinginan, rencanaPulang, promosi, keahlianKhusus, eksJepang, gajiYen, tabungan, bhsJepang, nilai, lisensi, ssw, noPaspor, noCoe, daruratNama, daruratWa, pendidikan: [{tingkat, namaSekolah, jurusan, tahunMasuk, tahunLulus}], pekerjaan: [{namaPerusahaan, jabatan, tahunMasuk, tahunKeluar}] }, "catatan": "..." }',
    'Balas dalam Bahasa Indonesia, ramah dan profesional seperti sensei asli.',
  );
  return lines.join('\n');
}

async function handleProcessAiInterview(payload, sessionToken) {
  const guard = requireRole(sessionToken, 'kandidat');
  if (guard.error) return guard.error;
  const p = payload || {};
  const profil = await resolveProfilKandidat(p.wa || p.waTarget || '');
  const system = buildInterviewSystem(
    profil || { nama: p.candidateName, bidang: normalizeBidang(p.bidang) || BIDANG_DEFAULT },
    p.kota || p.jobKota,
  );
  try {
    return await geminiGenerate(system, Array.isArray(p.history) ? p.history : []);
  } catch (e) {
    return { reply: 'Maaf, jaringan AI sedang sibuk. Coba lagi ya!' };
  }
}

// ---------------------------------------------------------------------------
// generateWawancaraModel — admin: hasilkan DOKUMEN model wawancara lengkap
// (14 pertanyaan: ID + romaji + panduan jawaban ID/romaji/kanji) per kandidat
// sesuai bidang SSW-nya — bisa langsung disalin ke Google Sheet kandidat.
// ---------------------------------------------------------------------------
async function handleGenerateWawancaraModel(payload, sessionToken) {
  const guard = requireRole(sessionToken, 'admin');
  if (guard.error) return guard.error;
  const d = (payload && payload[0]) || {};
  // Resolve WA dari candidateId (sama seperti parseDokumenBiodata) atau wa eksplisit.
  let wa = normalizeWa(String(d.wa || ''));
  if (!wa && d.candidateId) {
    let cand = await findCandidateByIdFiltered(String(d.candidateId));
    if (cand === undefined) {
      const found = await findCandidates();
      cand =
        (found.rows || []).find((r) =>
          String(pick(r, ['id_kandidat', 'id']) || '') === String(d.candidateId),
        ) || null;
    }
    if (cand) wa = normalizeWa(String(cand.no_wa || ''));
  }
  if (!wa) {
    return { success: false, error: 'Nomor WA kandidat tidak ditemukan — pilih kandidat dulu atau isi nomor WA.' };
  }
  const profil = await resolveProfilKandidat(wa);
  // Bidang bisa di-override admin (berguna untuk kandidat yang belum terdaftar
  // di DB — mis. Herlina belum daftar, admin tinggal ketik bidangnya).
  const b = normalizeBidang(d.bidang) || (profil && profil.bidang) || BIDANG_DEFAULT;
  const kota = String(d.kota || d.jobKota || '');
  const system =
    'Kamu adalah Jeklin, asisten HRD LPK ASJ (PT Amanah Sakura Japan).' +
    'Buatkan MODEL WAWANCARA KERJA JEPANG untuk kandidat ' +
    ((profil && profil.nama) || 'kandidat') +
    ' (bidang SSW: ' +
    b.label +
    (kota ? ', kota penempatan: ' + kota : '') +
    '), format PERSIS seperti dokumen isian yang dibagikan tim ke kandidat:' +
    '\n- 14 pertanyaan bernomor 1-14.' +
    '\n- Setiap pertanyaan: judul Bahasa Indonesia + pertanyaan romaji dalam kurung (contoh: "Hobi kamu apa? (shumi wa nandesu ka?)").' +
    '\n- Di bawahnya: "jawaban translate kanji alfabet (watashiwa):" lalu panduan jawaban romaji, kemudian arti Indonesia.' +
    '\n- Untuk kalimat kunci sertakan kanji di akhir sebagai catatan "kanji wajib di isi boleh menyusul".' +
    '\n- Masukkan pertanyaan khusus bidang ' +
    b.label +
    ' (pengalaman kerja bidang, hal terberat, pengetahuan pekerjaan, kenapa memilih bidang ini).' +
    '\n- Nomor 14: pertanyaan ke perusahaan (2 pertanyaan) + penutup (doumo arigatou gozaimasu + ojigi).' +
    '\n- Tambahkan juga instruksi di awal dokumen: "SILAHKAN ISI DI DRIVE INI (TANPA DOWNLOAD FILE)" dan catatan bahwa jawaban akan diperbaiki sensei.' +
    '\nKembalikan HANYA teks dokumen lengkap siap salin, tanpa penjelasan tambahan.';
  try {
    const r = await geminiGenerate(system, []);
    return { success: true, model: r.reply, bidang: b.label, nama: (profil && profil.nama) || '', wa };
  } catch (e) {
    console.error('[AI] generateWawancaraModel error:', e && e.message ? e.message : e);
    return { success: false, error: 'Gagal membuat model wawancara: ' + (e && e.message ? e.message : 'AI sibuk') };
  }
}

// ---------------------------------------------------------------------------
// selesaikanWawancara — kandidat: dari TRANSCRIPT wawancara yang sudah jalan,
// buat JSON hasil wawancara {score, nilai, rekomendasi, biodata, catatan}.
// Dipanggil saat kandidat klik "Selesai & Kirim Hasil" (deterministik, tidak
// bergantung AI menulis marker di tengah chat).
// ---------------------------------------------------------------------------
async function handleSelesaikanWawancara(payload, sessionToken) {
  const guard = requireRole(sessionToken, 'kandidat');
  if (guard.error) return guard.error;
  const d = (payload && payload[0]) || {};
  const profil = await resolveProfilKandidat(d.wa || '');
  const b = (profil && profil.bidang) || BIDANG_DEFAULT;
  const history = Array.isArray(d.history) ? d.history : [];
  const transkrip = history
    .map((h) => {
      const role = h && h.role === 'assistant' ? 'Jeklin' : 'Kandidat';
      return role + ': ' + String((h && h.content) || '');
    })
    .join('\n');
  const system =
    'Kamu adalah Jeklin Sensei, pewawancara kerja Jepang untuk LPK ASJ. Kandidat: ' +
    (profil && profil.nama ? profil.nama + '-san' : 'kandidat') +
    ', bidang SSW: ' +
    b.label +
    '.\nDi bawah ini TRANSCRIPT wawancara:\n---\n' +
    (transkrip || '(kandidat belum menjawab apa pun)') +
    '\n---\nBuat RINGKASAN HASIL WAWANCARA dalam JSON TUNGGAL (tanpa teks lain):\n' +
    '{ "score": 0-10, "nilai": "A/B/C", "rekomendasi": "saran perbaikan singkat", "biodata": { kunci camelCase — HANYA data yang kandidat SEBUTKAN: nama, furigana, tempatLahir, tglLahir, alamat, email, gender, hobi, kelebihan, kekurangan, motivasiJepang, tujuanJepang, keinginan, rencanaPulang, promosi, keahlianKhusus, eksJepang, gajiYen, tabungan, bhsJepang, nilai, lisensi, ssw, noPaspor, noCoe, daruratNama, daruratWa, pendidikan: [{tingkat, namaSekolah, jurusan, tahunMasuk, tahunLulus}], pekerjaan: [{namaPerusahaan, jabatan, tahunMasuk, tahunKeluar}] }, "catatan": "hal yang perlu diperbaiki kandidat" }';
  try {
    const r = await geminiGenerate(system, []);
    const hasil = parseJsonLoose(r.reply);
    if (!hasil || typeof hasil !== 'object' || Array.isArray(hasil)) {
      return { success: false, error: 'AI gagal merangkum hasil wawancara. Coba lagi.' };
    }
    return { success: true, hasil };
  } catch (e) {
    console.error('[AI] selesaikanWawancara error:', e && e.message ? e.message : e);
    return { success: false, error: 'Gagal merangkum hasil: ' + (e && e.message ? e.message : 'AI sibuk') };
  }
}

// ---------------------------------------------------------------------------
// simpanHasilWawancara — kandidat: simpan hasil wawancara AI (JSON dari
// penutup wawancara, format {score, nilai, rekomendasi, biodata, catatan})
// ke ai_form_submissions (submitted_via='interview') supaya admin bisa lihat
// & update biodata dari hasil wawancara.
// ---------------------------------------------------------------------------
async function handleSimpanHasilWawancara(payload, sessionToken) {
  const guard = requireRole(sessionToken, 'kandidat');
  if (guard.error) return guard.error;
  const d = (payload && payload[0]) || {};
  const wa = normalizeWa(String(d.wa || ''));
  if (!wa) return { success: false, error: 'Nomor WA tidak ditemukan.' };
  const hasil = d.hasil || {};
  if (!hasil || typeof hasil !== 'object' || Array.isArray(hasil)) {
    return { success: false, error: 'Hasil wawancara kosong/tidak valid.' };
  }
  try {
    const rows = await supabaseJson('GET', 'ai_form_submissions', {
      query: { select: '*', limit: 100 },
    });
    // Discriminator: submitted_via='interview' (mode/status tabel ini punya
    // CHECK constraint — pakai nilai yang diizinkan: AI_MASTER/MENUNGGU).
    const existing = (Array.isArray(rows) ? rows : []).find(
      (r) =>
        normalizeWa(String(r.wa || '')) === wa &&
        String(r.submitted_via || '') === 'interview',
    );
    const bio = (hasil.biodata || {}).nama || '';
    const body = {
      wa,
      mode: 'AI_MASTER',
      job_code: 'UMUM',
      bidang: '-',
      status: 'MENUNGGU',
      submitted_via: 'interview',
      ai_data_json: JSON.stringify(hasil),
      nama_lengkap: bio,
      updated_at: new Date().toISOString(),
    };
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
    return { success: true };
  } catch (e) {
    return { success: false, message: 'Gagal simpan hasil wawancara: ' + e.message };
  }
}

// ---------------------------------------------------------------------------
// getHasilWawancara — admin: ambil hasil wawancara terakhir kandidat
// (mode='wawancara' di ai_form_submissions) untuk dilihat / update biodata.
// ---------------------------------------------------------------------------
async function handleGetHasilWawancara(payload, sessionToken) {
  const guard = requireRole(sessionToken, 'admin');
  if (guard.error) return guard.error;
  const d = (payload && payload[0]) || {};
  let wa = normalizeWa(String(d.wa || ''));
  if (!wa && d.candidateId) {
    let cand = await findCandidateByIdFiltered(String(d.candidateId));
    if (cand === undefined) {
      const found = await findCandidates();
      cand =
        (found.rows || []).find((r) =>
          String(pick(r, ['id_kandidat', 'id']) || '') === String(d.candidateId),
        ) || null;
    }
    if (cand) wa = normalizeWa(String(cand.no_wa || ''));
  }
  if (!wa) {
    return { success: false, error: 'Nomor WA kandidat tidak ditemukan — pilih kandidat dulu atau isi nomor WA.' };
  }
  try {
    const rows = await supabaseJson('GET', 'ai_form_submissions', {
      query: { select: '*', limit: 100 },
    });
    const row = (Array.isArray(rows) ? rows : []).find(
      (r) =>
        normalizeWa(String(r.wa || '')) === wa &&
        String(r.submitted_via || '') === 'interview',
    );
    if (!row) return { success: true, hasil: null };
    let hasil = {};
    try {
      hasil = JSON.parse(row.ai_data_json || '{}');
    } catch (e) {
      hasil = { catatan: String(row.ai_data_json || '').slice(0, 2000) };
    }
    return {
      success: true,
      hasil,
      wa,
      updatedAt: String(row.updated_at || ''),
      nama: String(row.nama_lengkap || (hasil.biodata && hasil.biodata.nama) || ''),
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

module.exports = {
  buildInterviewSystem,
  normalizeBidang,
  resolveProfilKandidat,
  handleProcessAIChat,
  handleProcessAdminAIChat,
  handleProcessSiswaAIChat,
  handleProcessAiInterview,
  handleGenerateWawancaraModel,
  handleSelesaikanWawancara,
  handleSimpanHasilWawancara,
  handleGetHasilWawancara,
};
