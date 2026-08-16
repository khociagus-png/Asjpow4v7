// actions-ai.js — action AI & penyimpanan data AI form (ai_form.html) untuk
// backend rebuild. Modul terpisah dari actions-extra.js supaya tiap file
// tetap ringkas.
'use strict';

const { normalizeWa, pick, supabaseJson, toText } = require('./db/client');
const { findCandidateByIdFiltered, findCandidateByWaFiltered, findCandidates } = require('./db/candidates');
const session = require('./session');
const { env } = require('./env');

function requireRole(sessionToken, role) {
  const t = session.verifyToken(sessionToken);
  if (!t || t.role !== role) {
    return {
      error: { success: false, sessionInvalid: true, message: 'Sesi ' + role + ' tidak valid' },
    };
  }
  return { token: t };
}

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

// ---------------------------------------------------------------------------
// Gemini
// ---------------------------------------------------------------------------
async function geminiGenerate(systemPrompt, history) {
  const key = env('GEMINI_API_KEY');
  if (!key) {
    return {
      reply:
        'Maaf, asisten AI belum dikonfigurasi (GEMINI_API_KEY belum diisi). Data kamu tetap aman tersimpan ya!',
    };
  }
  const contents = [{ role: 'user', parts: [{ text: systemPrompt }] }];
  for (const h of Array.isArray(history) ? history : []) {
    const role = h && h.role === 'assistant' ? 'model' : 'user';
    if (h && h.content) contents.push({ role, parts: [{ text: String(h.content) }] });
  }
  // Model saat ini (Agt 2026): gemini-1.5-flash & 2.0-flash sudah dihapus Google (404),
  // gemini-2.5-flash sudah tidak tersedia untuk key baru. Urutan = prioritas;
  // fallback otomatis ke model berikutnya. gemini-flash-latest selalu menunjuk ke
  // model flash stabil terbaru, sehingga tidak perlu update manual tiap migrasi.
  const models = ['gemini-flash-latest', 'gemini-3.5-flash', 'gemini-2.5-flash'];
  let lastErr = null;
  for (const model of models) {
    try {
      const res = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/' +
          model +
          ':generateContent?key=' +
          key,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents }),
        },
      );
      if (!res.ok) {
        lastErr = new Error('Gemini HTTP ' + res.status + ' ' + (await res.text()).slice(0, 120));
        continue;
      }
      const j = await res.json();
      const text =
        j &&
        j.candidates &&
        j.candidates[0] &&
        j.candidates[0].content &&
        j.candidates[0].content.parts
          ? j.candidates[0].content.parts.map((p) => p.text || '').join('')
          : '';
      if (text) return { reply: text };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('Gemini tidak tersedia');
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

// ---------------------------------------------------------------------------
// parseDokumenBiodata — admin upload file CV (PDF/Excel/Word/CSV/TXT/gambar)
// → Gemini parse → JSON biodata (kunci MASTER_COLUMN_MAP camelCase, sama
// dengan payload submitMasterForm) → frontend bisa langsung update master.
// ---------------------------------------------------------------------------
const PARSE_MAX_BYTES = 8 * 1024 * 1024;
const PARSE_ALLOWED_MIME = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.ms-excel', // xls
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'application/msword', // doc
  'text/csv',
  'text/plain',
  'text/html',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif', // hasil scan foto CV
]);

const PARSE_SYSTEM_PROMPT = [
  'Kamu adalah asisten HRD ASJ (PT Amanah Sakura Japan).',
  'Admin mengupload dokumen biodata/CV kandidat kerja ke Jepang.',
  'Ekstrak semua data yang bisa kamu baca ke JSON MURNI (tanpa teks lain, tanpa markdown fence).',
  'Hanya isi field yang benar-benar ada di dokumen — yang tidak ada, OMIT (jangan null/string kosong).',
  'Normalisasi: nama dalam HURUF KAPITAL, tanggal lahir format YYYY-MM-DD, nomor HP/WA tanpa spasi.',
  'Kunci yang diizinkan (persis, camelCase):',
  'nama, furigana, panggilan, panggilanKatakana, gender, tempatLahir, tglLahir, usia, agama, statusNikah,',
  'anak, ktp, sim, alamat, email, tb, bb, goldar, tangan, baju, sepatu, topi, tahanAc,',
  'mataKiri, mataKanan, kacamata, butaWarna, tato, tindik, merokok, alkohol, penyakit, alergi, laka,',
  'promosi, kelebihan, kekurangan, keahlianKhusus, hobi, alasanBidang, motivasiJepang, keinginan,',
  'rencanaPulang, tujuanJepang, eksJepang, daruratNama, daruratHubungan, daruratWa,',
  'kenalanNama, kenalanHubungan, kenalanPekerjaan, kenalanUsia, kenalanAlamat, lamaJepang,',
  'gajiYen, tabungan, bhsJepang, nilai, lisensi, ssw, noPaspor, tglTerbitPaspor, expPaspor, kotaPaspor, noCoe.',
  'gender: Laki-laki/L/P/MALE → "L", Perempuan/P/FEMALE → "P".',
  'Riwayat sebagai ARRAY (maks 5 pendidikan, 3 pekerjaan, 5 keluarga):',
  'pendidikan: [{ tingkat, namaSekolah, jurusan, tahunMasuk, tahunLulus }]',
  'pekerjaan: [{ namaPerusahaan, jabatan, tahunMasuk, tahunKeluar, gaji }]',
  'keluarga: [{ nama, usia, hubungan, pekerjaan }]',
  'Bahasa Jepang pada dokumen (nama katakana, alamat jp, dll) tetap disalin apa adanya.',
  'Kembalikan HANYA objek JSON valid.',
].join(' ');

async function geminiParseFile(systemPrompt, file) {
  const key = env('GEMINI_API_KEY');
  if (!key) {
    throw new Error('GEMINI_API_KEY belum dikonfigurasi');
  }
  const contents = [
    {
      role: 'user',
      parts: [
        { inlineData: { mimeType: file.mimeType, data: file.data } },
        { text: systemPrompt },
      ],
    },
  ];
  const models = ['gemini-flash-latest', 'gemini-3.5-flash', 'gemini-2.5-flash'];
  let lastErr = null;
  for (const model of models) {
    try {
      const res = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/' +
          model +
          ':generateContent?key=' +
          key,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents }),
        },
      );
      if (!res.ok) {
        lastErr = new Error('Gemini HTTP ' + res.status + ' ' + (await res.text()).slice(0, 120));
        continue;
      }
      const j = await res.json();
      const text =
        j &&
        j.candidates &&
        j.candidates[0] &&
        j.candidates[0].content &&
        j.candidates[0].content.parts
          ? j.candidates[0].content.parts.map((p) => p.text || '').join('')
          : '';
      if (text) return text;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('Gemini tidak tersedia');
}

function parseJsonLoose(text) {
  let t = String(text || '').trim();
  t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  try {
    return JSON.parse(t);
  } catch (e) {
    const start = t.indexOf('{');
    const end = t.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(t.slice(start, end + 1));
      } catch (e2) {
        /* fallthrough */
      }
    }
    throw e;
  }
}

async function handleParseDokumenBiodata(payload, sessionToken) {
  const guard = requireRole(sessionToken, 'admin');
  if (guard.error) return guard.error;
  const d = (payload && payload[0]) || {};
  const file = d.file || {};
  const name = String(file.name || '').trim();
  const mimeType = String(file.mimeType || file.type || '').trim();
  const data = String(file.data || '').trim();
  if (!name || !data) return { success: false, error: 'File belum dipilih.' };
  let buf;
  try {
    buf = Buffer.from(data, 'base64');
  } catch (e) {
    return { success: false, error: 'File tidak bisa dibaca.' };
  }
  if (buf.length > PARSE_MAX_BYTES) {
    return { success: false, error: 'File terlalu besar (maks 8 MB).' };
  }
  if (!PARSE_ALLOWED_MIME.has(mimeType)) {
    return {
      success: false,
      error: 'Format tidak didukung: ' + (name.split('.').pop() || mimeType || '?') + '. Gunakan PDF/Excel/Word/CSV/TXT/gambar.',
    };
  }

  // Target kandidat: dari WA eksplisit, atau resolve dari candidateId (admin
  // membuka AI copilot dari baris kandidat → cukup klik upload).
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

  let namaSekarang = '';
  try {
    const m = await findMasterByWa(wa);
    if (m) namaSekarang = String(m.nama_lengkap || '');
  } catch (e) {
    /* opsional */
  }

  try {
    const reply = await geminiParseFile(PARSE_SYSTEM_PROMPT, { mimeType, data });
    const parsed = parseJsonLoose(reply);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { success: false, error: 'AI tidak bisa mengekstrak data dari file ini. Coba file lain.' };
    }
    const fields = Object.keys(parsed).filter((k) => k !== 'pendidikan' && k !== 'pekerjaan' && k !== 'keluarga');
    return {
      success: true,
      wa,
      namaSekarang,
      fileName: name,
      data: parsed,
      fieldCount: fields.length,
      riwayat: {
        pendidikan: Array.isArray(parsed.pendidikan) ? parsed.pendidikan.length : 0,
        pekerjaan: Array.isArray(parsed.pekerjaan) ? parsed.pekerjaan.length : 0,
        keluarga: Array.isArray(parsed.keluarga) ? parsed.keluarga.length : 0,
      },
    };
  } catch (e) {
    console.error('[AI] parseDokumenBiodata error:', e && e.message ? e.message : e);
    return { success: false, error: 'Gagal parse dokumen: ' + (e && e.message ? e.message : 'AI sibuk') };
  }
}

module.exports = {
  buildRingkasData,
  handleProcessAIChat,
  handleProcessAdminAIChat,
  handleProcessSiswaAIChat,
  handleProcessAiInterview,
  handleGetAdminAiContext,
  handleBuildAdminAiCandidateSummary,
  handleParseDokumenBiodata,
  handleGenerateWawancaraModel,
  handleSelesaikanWawancara,
  handleSimpanHasilWawancara,
  handleGetHasilWawancara,
  handleSubmitDataAsj,
  handleSimpanDataTtdNaitei,
};
