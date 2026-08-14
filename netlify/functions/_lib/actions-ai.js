// actions-ai.js — action AI & penyimpanan data AI form (ai_form.html) untuk
// backend rebuild. Modul terpisah dari actions-extra.js supaya tiap file
// tetap ringkas.
"use strict";

const supabase = require("./supabase");
const session = require("./session");
const { env } = require("./env");

function requireRole(sessionToken, role) {
  const t = session.verifyToken(sessionToken);
  if (!t || t.role !== role) {
    return { error: { success: false, sessionInvalid: true, message: "Sesi " + role + " tidak valid" } };
  }
  return { token: t };
}

const APPLY_WA_COLS = ["no_wa", "wa", "whatsapp"];

async function findMasterByWa(wa) {
  const want = supabase.normalizeWa(wa);
  const rows = await supabase.supabaseJson("GET", "master_database_candidate", {
    query: { select: "*", limit: 500 },
  });
  if (!Array.isArray(rows)) return null;
  return rows.find((r) => supabase.normalizeWa(String(r.no_wa || "")) === want) || null;
}

function buildMasterNested(row) {
  const v = (col, fallback) => {
    const x = row[col];
    return x !== undefined && x !== null && x !== "" ? supabase.toText(x) : (fallback !== undefined ? fallback : "");
  };
  return {
    identitas: {
      nama_lengkap: v("nama_lengkap"), katakana: v("furigana"), panggilan: v("namapanggilan"),
      panggilan_katakana: v("panggilan_katakana"), tempat_lahir: v("tempat_lahir"),
      tempat_lahir_jp: v("tempatlahirjp"), tgl_lahir: v("tgl_lahir"), umur: v("usia"),
      gender: v("gender"), agama: v("agama"), agamajp: v("agamajp"),
      golongan_darah: v("golongan_darah"), status_nikah: v("status_pernikahan"),
      statusnikahjp: v("statusnikahjp"), anak: v("jumlah_anak"), email: v("email"),
      alamat: v("alamat_lengkap"), alamatjp: v("alamatjp"), hp: v("no_wa"),
      hp_darurat: v("kontak_darurat_wa"), ktp: v("nik"), paspor: v("no_paspor"),
      sim: v("driver_license"), status_eks_jepang: v("status_eks_jepang"),
    },
    fisik: {
      tb: v("tb"), bb: v("bb"), topi: v("ukuran_topi"), baju: v("ukuranbaju"),
      sepatu: v("ukuransepatu"), tangan_dominan: v("tangandominan"), tahan_ac: v("tahan_ac"),
    },
    medis: {
      mata_kiri: v("mata_kiri"), mata_kanan: v("mata_kanan"), kacamata: v("kacamata"),
      buta_warna: v("buta_warna"), tato: v("tato"), tindik: v("tindik"),
      rokok: v("merokok"), alkohol: v("minum_alkohol"), alergi_id: v("alergi"),
      alergi_jp: v("alergijp"), riwayat_medis_id: v("riwayat_penyakit"),
      riwayat_medis_jp: v("riwayat_medis_jp"), riwayat_kecelakaan_id: v("riwayat_kecelakaan"),
      riwayat_kecelakaan_jp: v("riwayat_kecelakaan_jp"),
    },
    wawancara: {
      keinginan_id: v("keinginan_pribadi"), keinginan_jp: v("keinginan_pribadi_jp"),
      tujuan_ke_jepang: v("tujuan_ke_jepang"), tujuan_ke_jepang_jp: v("tujuan_ke_jepang_jp"),
      riwayat_jepang: v("status_eks_jepang"), promosi_id: v("promosi_diri"),
      promosi_jp: v("promosi_diri_jp"), kelebihan_id: v("kelebihan"), kelebihan_jp: v("kelebihan_jp"),
      kekurangan_id: v("kekurangan"), kekurangan_jp: v("kekurangan_jp"),
      hobi_id: v("hobi_dan_keterampilan"), hobi_jp: v("hobi_jp"),
      keahlian_khusus: v("keahlian_khusus"), keahlian_khusus_jp: v("keahlian_khusus_jp"),
      motivasi_ke_jepang: v("motivasi_ke_jepang"), motivasi_ke_jepang_jp: v("motivasi_ke_jepang_jp"),
      alasan_memilih_bidang: v("alasan_memilih_bidang"), alasan_memilih_bidang_jp: v("alasan_memilih_bidang_jp"),
      rencana_setelah_pulang: v("rencana_setelah_pulang"), rencana_setelah_pulang_jp: v("rencana_setelah_pulang_jp"),
      gaji_yen: v("harapan_gaji_yen"), tabungan: v("harapan_tabungan"),
    },
    sertifikasi: {
      bahasa: v("bahasa"), jft: v("jft"), ssw: v("ssw"), bidang: v("bidangssw") || v("bidang"),
    },
    pendidikan: (function () {
      const arr = [];
      for (let i = 1; i <= 5; i++) {
        const tingkat = row["pendidikan_" + i + "_tingkat"];
        if (tingkat === undefined || tingkat === null) continue;
        arr.push({
          tingkat: supabase.toText(tingkat),
          nama_sekolah: v("pendidikan_" + i + "_nama_sekolah"),
          sekolah_jp: v("pendidikan_" + i + "_sekolah_jp"),
          jurusan: v("pendidikan_" + i + "_jurusan_id"),
          jurusan_jp: v("pendidikan_" + i + "_jurusan_jp"),
          tahun_masuk: v("pendidikan_" + i + "_tahun_masuk"),
          tahun_lulus: v("pendidikan_" + i + "_tahun_lulus"),
        });
      }
      return arr;
    })(),
    pekerjaan: (function () {
      const arr = [];
      for (let i = 1; i <= 3; i++) {
        const nm = row["pekerjaan_" + i + "_nama_perusahaan"];
        if (nm === undefined || nm === null) continue;
        arr.push({
          nama_perusahaan: supabase.toText(nm),
          perusahaan_jp: v("pekerjaan_" + i + "_perusahaan_jp"),
          jabatan: v("pekerjaan_" + i + "_jabatan"),
          jabatan_jp: v("pekerjaan_" + i + "_jabatan_jp"),
          tahun_masuk: v("pekerjaan_" + i + "_tahun_masuk"),
          tahun_keluar: v("pekerjaan_" + i + "_tahun_keluar"),
          gaji: v("pekerjaan_" + i + "_gaji"),
        });
      }
      return arr;
    })(),
    keluarga: (function () {
      const arr = [];
      for (let i = 1; i <= 5; i++) {
        const nm = row["keluarga_" + i + "_nama"];
        if (nm === undefined || nm === null) continue;
        arr.push({
          nama: supabase.toText(nm),
          usia: v("keluarga_" + i + "_usia"),
          hubungan: v("keluarga_" + i + "_hubungan"),
          hubungan_jp: v("keluarga_" + i + "_hubungan_jp"),
          pekerjaan: v("keluarga_" + i + "_pekerjaan"),
          pekerjaan_jp: v("keluarga_" + i + "_pekerjaan_jp"),
        });
      }
      return arr;
    })(),
    uploads: {
      photo: row.pas_photo || "", cv: row.file_cv || "",
      jft: row.jft_url || "", ssw: row.ssw_url || "",
    },
  };
}

// ---------------------------------------------------------------------------
// Gemini
// ---------------------------------------------------------------------------
async function geminiGenerate(systemPrompt, history) {
  const key = env("GEMINI_API_KEY");
  if (!key) {
    return { reply: "Maaf, asisten AI belum dikonfigurasi (GEMINI_API_KEY belum diisi). Data kamu tetap aman tersimpan ya!" };
  }
  const contents = [{ role: "user", parts: [{ text: systemPrompt }] }];
  for (const h of Array.isArray(history) ? history : []) {
    const role = h && h.role === "assistant" ? "model" : "user";
    if (h && h.content) contents.push({ role, parts: [{ text: String(h.content) }] });
  }
  const models = ["gemini-2.0-flash", "gemini-1.5-flash"];
  let lastErr = null;
  for (const model of models) {
    try {
      const res = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + key,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents }),
        }
      );
      if (!res.ok) {
        lastErr = new Error("Gemini HTTP " + res.status + " " + (await res.text()).slice(0, 120));
        continue;
      }
      const j = await res.json();
      const text =
        j && j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts
          ? j.candidates[0].content.parts.map((p) => p.text || "").join("")
          : "";
      if (text) return { reply: text };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("Gemini tidak tersedia");
}

async function handleProcessAIChat(payload) {
  const p = payload || {};
  const flow = String(p.flow || "master");
  const history = Array.isArray(p.history) ? p.history : [];
  const lang = String(p.lang || "id");
  const system =
    "Kamu adalah Qween Jeklin, HRD Virtual LPK ASJ (PT Amanah Sakura Japan), perusahaan penyalur kerja ke Jepang. " +
    "Tugasmu membantu kandidat melengkapi data Master (identitas, fisik, medis, pendidikan, pekerjaan, keluarga, " +
    "sertifikasi, wawancara) untuk CV kerja Jepang. Balas ramah & singkat dalam bahasa " +
    (lang === "jp" ? "Jepang" : "Indonesia") + ". Jika kandidat memberi data baru, konfirmasi dan minta data berikutnya yang kurang. " +
    "Jangan meminta data yang sudah lengkap. Flow aktif: " + flow + ".";
  try {
    return await geminiGenerate(system, history);
  } catch (e) {
    return { reply: "Maaf, jaringan AI sedang sibuk. Silakan coba lagi ya! (" + e.message + ")" };
  }
}

async function handleProcessAdminAIChat(payload, sessionToken) {
  const guard = requireRole(sessionToken, "admin");
  if (guard.error) return guard.error;
  const d = (payload && payload[0]) || {};
  const history = (d.history || []).concat([{ role: "user", content: d.message || "" }]);
  const system =
    "Kamu adalah Jeklin, asisten HRD admin ASJ (PT Amanah Sakura Japan). Admin: " + String(d.adminName || "") + ". " +
    "Kandidat yang sedang dibahas ID: " + String(d.candidateId || "-") + ". " +
    "Bantu analisis data kandidat, saran rekrutmen, dan jawaban profesional. Balas singkat & jelas dalam Bahasa Indonesia.";
  try {
    const r = await geminiGenerate(system, history);
    return { success: true, reply: r.reply, suggestedActions: [], analysis: null };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function handleProcessSiswaAIChat(payload) {
  const p = payload || {};
  const system =
    "Kamu adalah Dede Jeklin, asisten pendaftaran siswa baru LPK ASJ. Bantu siswa/orang tua melengkapi form " +
    "(nama, TTL, gender, agama, alamat, email, pendidikan, WA siswa, WA ortu). Balas ramah dan singkat dalam Bahasa Indonesia.";
  try {
    return await geminiGenerate(system, Array.isArray(p.history) ? p.history : []);
  } catch (e) {
    return { reply: "Maaf, jaringan AI sedang sibuk. Coba lagi ya!" };
  }
}

async function handleProcessAiInterview(payload, sessionToken) {
  const guard = requireRole(sessionToken, "kandidat");
  if (guard.error) return guard.error;
  const p = payload || {};
  const system =
    "Kamu adalah Jeklin Sensei, pewawancara kerja Jepang untuk LPK ASJ. Lakukan simulasi wawancara (Mentsetsu) " +
    "dengan pertanyaan bertahap (perkenalan → motivasi → pengalaman → bahasa Jepang). Beri evaluasi singkat setelah jawaban.";
  try {
    return await geminiGenerate(system, Array.isArray(p.history) ? p.history : []);
  } catch (e) {
    return { reply: "Maaf, jaringan AI sedang sibuk. Coba lagi ya!" };
  }
}

async function handleGetAdminAiContext(payload, sessionToken) {
  const guard = requireRole(sessionToken, "admin");
  if (guard.error) return guard.error;
  const d = (payload && payload[0]) || {};
  const wa = String(d.wa || d.waTarget || "");
  try {
    let row = null;
    if (wa) row = await findMasterByWa(wa);
    if (!row) {
      const found = await supabase.findCandidates();
      const id = String(d.candidateId || d.idKandidat || "");
      const cand = found.rows.find((r) =>
        id
          ? String(supabase.pick(r, ["id_kandidat", "id"]) || "") === id
          : supabase.normalizeWa(String(supabase.pick(r, APPLY_WA_COLS) || "")) === supabase.normalizeWa(d.wa)
      );
      if (cand) row = await findMasterByWa(String(cand.no_wa || ""));
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
    ? data.identitas.nama_lengkap + " | " + (data.identitas.umur || "-") + " th | " +
      (data.fisik.tb || "-") + "cm/" + (data.fisik.bb || "-") + "kg | JFT: " + (data.sertifikasi.jft || "-")
    : "Data kandidat belum lengkap.";
  return { success: true, summary, data };
}

// ---------------------------------------------------------------------------
// submitDataAsj — simpan data AI form (ai_form.html) ke ai_form_submissions
// ---------------------------------------------------------------------------
async function handleSubmitDataAsj(payload, sessionToken) {
  const d = payload || {};
  const ctx = d.context || {};
  const identitas = d.identitas || {};
  const wa = supabase.normalizeWa(String(ctx.wa || identitas.hp || ""));
  if (!wa) return { success: false, message: "Nomor WA tidak ditemukan." };
  const guard = requireRole(sessionToken, "kandidat");
  if (guard.error) return guard.error;
  try {
    const aiData = {
      identitas: d.identitas || {}, fisik: d.fisik || {}, medis: d.medis || {},
      pendidikan: d.pendidikan || {}, pekerjaan: d.pekerjaan || {}, sertifikasi: d.sertifikasi || {},
      keluarga: d.keluarga || {}, wawancara: d.wawancara || {},
    };
    const nama = String(identitas.nama_lengkap || "").trim();
    const mode = String(ctx.flow || "ai").toLowerCase();
    const jobCode = String(ctx.job || ctx.jobCode || "");
    const body = {
      wa,
      nama_lengkap: nama,
      mode,
      job_code: jobCode,
      status: "SUBMITTED",
      ai_data_json: JSON.stringify(aiData),
      ai_updated_at: new Date().toISOString(),
      photo_url: d.fotoFile || "",
      jft_url: d.jftFile || "",
      ssw_url: d.sswFile || "",
      submitted_via: "ai_form",
      updated_at: new Date().toISOString(),
    };
    const existingRows = await supabase.supabaseJson("GET", "ai_form_submissions", {
      query: { select: "*", limit: 100 },
    });
    const existing = (Array.isArray(existingRows) ? existingRows : []).find(
      (r) => supabase.normalizeWa(String(r.wa || "")) === wa
    );
    if (existing && existing.id !== undefined) {
      await supabase.supabaseJson("PATCH", "ai_form_submissions", {
        query: { id: "eq." + existing.id },
        body,
        headers: { Prefer: "return=minimal" },
      });
    } else {
      await supabase.supabaseJson("POST", "ai_form_submissions", {
        body: Object.assign({ created_at: new Date().toISOString() }, body),
        headers: { Prefer: "return=minimal" },
      });
    }
    try {
      const m = await findMasterByWa(wa);
      if (m && m.id !== undefined) {
        await supabase.supabaseJson("PATCH", "master_database_candidate", {
          query: { id: "eq." + m.id },
          body: { ai_data_json: JSON.stringify(aiData), ai_updated_at: new Date().toISOString() },
          headers: { Prefer: "return=minimal" },
        });
      }
    } catch (e) {
      /* opsional */
    }
    return { success: true };
  } catch (e) {
    return { success: false, message: "Gagal simpan data: " + e.message };
  }
}

// ---------------------------------------------------------------------------
// simpanDataTtdNaitei — simpan tanda tangan / esignature kandidat
// ---------------------------------------------------------------------------
async function handleSimpanDataTtdNaitei(payload, sessionToken) {
  const guard = requireRole(sessionToken, "kandidat");
  if (guard.error) return guard.error;
  const d = payload || {};
  const wa = supabase.normalizeWa(String(d.wa || ""));
  if (!wa) return { success: false, error: "Nomor WA tidak ditemukan." };
  try {
    const data = { wa, ttd1: d.ttd1 || "", nama1: d.nama1 || "", ttd2: d.ttd2 || "", nama2: d.nama2 || "" };
    try {
      const rows = await supabase.supabaseJson("GET", "esignatures", { query: { select: "*", limit: 100 } });
      const existing = (Array.isArray(rows) ? rows : []).find((r) => supabase.normalizeWa(String(r.wa || "")) === wa);
      if (existing && existing.id !== undefined) {
        await supabase.supabaseJson("PATCH", "esignatures", {
          query: { id: "eq." + existing.id },
          body: Object.assign(data, { updated_at: new Date().toISOString() }),
          headers: { Prefer: "return=minimal" },
        });
      } else {
        await supabase.supabaseJson("POST", "esignatures", {
          body: Object.assign(data, { created_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
          headers: { Prefer: "return=minimal" },
        });
      }
    } catch (e) {
      /* tabel esignatures mungkin kosong/tanpa kolom wa — fallback ke ai_form_submissions */
      await supabase.supabaseJson("POST", "ai_form_submissions", {
        body: { wa, mode: "ttd", status: "TTD", ai_data_json: JSON.stringify(data), submitted_via: "esign" },
        headers: { Prefer: "return=minimal" },
      });
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

module.exports = {
  handleProcessAIChat,
  handleProcessAdminAIChat,
  handleProcessSiswaAIChat,
  handleProcessAiInterview,
  handleGetAdminAiContext,
  handleBuildAdminAiCandidateSummary,
  handleSubmitDataAsj,
  handleSimpanDataTtdNaitei,
};
