import { normalizeWa, pick, supabaseUrl, toText } from './db/client.js';
import { findJobByCodeFiltered, findJobs } from './db/jobs.js';
import { findForms, findFormsByWaList, parseDocs } from './db/forms.js';
import { findCandidates, findCandidatesByJobFiltered, mapCandidate } from './db/candidates.js';
import { listStorageFolder } from './db/berkas.js';
// actions-share.js — viewer TSK publik (share.html?job=KODE). Dipanggil
// LANGSUNG via GET dari netlify/functions/share-data.js (redirect /api/
// share-data), bukan lewat dispatch POST. MODUL BARU (Fase 1.1d
// REFACTOR_TODO.md) — kode dipindah dari handlers.js, perilaku TIDAK berubah.

async function handleShareData(jobCode) {
  const code = String(jobCode || '').trim();
  if (!code) return { error: 'Kode job tidak ditemukan.' };
  try {
    // Jalur cepat: cari baris job via query server-side (filter code_job).
    let jobRow = await findJobByCodeFiltered(code);
    if (jobRow === undefined) {
      const found = await findJobs();
      jobRow = found.rows.find((r) => String(pick(r, ['code_job', 'code']) || '') === code) || null;
    }
    if (!jobRow) return { error: 'Kode job tidak ditemukan: ' + code };
    const name = toText(pick(jobRow, ['pekerjaan', 'nama_pekerjaan', 'judul', 'title']));
    // Kandidat yang ter-approve untuk job ini (id_loker_pilihan berisi kode).
    // Jalur cepat: filter server-side via ilike, lalu verifikasi token eksak di
    // JS (kode bisa banyak dipisah koma) supaya tidak salah tangkap.
    let candRows = await findCandidatesByJobFiltered(code);
    if (candRows === undefined) {
      const cands = await findCandidates();
      candRows = cands.rows;
    }
    const rows = (Array.isArray(candRows) ? candRows : []).filter((r) =>
      String(pick(r, ['id_loker_pilihan', 'id_loker']) || '')
        .split(',')
        .map((s) => s.trim())
        .includes(code),
    );
    const mapped = rows.map(mapCandidate);
    // extraDocs: SEMUA file folder master kandidat (KK/KTP/ijazah/dll) KECUALI
    // yang sudah jadi tombol utama (pas_photo, file_cv, jft, ssw) — persis
    // perilaku backend lama (produksi). Folder = master/<NAMA_HURUF_KAPITAL>/
    // (spasi → underscore), didaftarkan via Supabase Storage list API.
    const storageBase = supabaseUrl().replace(/\/$/, '');
    const pubBase = storageBase + '/storage/v1/object/public/asj-files/';
    // Jalur cepat: tarik lamaran hanya untuk WA kandidat job ini (in-filter),
    // bukan scan 500 baris inbox — cukup untuk membangun byWa extra docs.
    const waList = mapped.map((c) => normalizeWa(String(c.wa || ''))).filter(Boolean);
    let forms = await findFormsByWaList(waList);
    if (forms === undefined) forms = await findForms();
    const byWa = new Map();
    for (const f of forms) {
      const w = normalizeWa(String(f.no_wa || f.wa || f.whatsapp || ''));
      if (!w) continue;
      if (!byWa.has(w)) byWa.set(w, []);
      for (const d of parseDocs(toText(f.keterangan))) byWa.get(w).push(d);
    }
    const candidates = [];
    for (const c of mapped) {
      const folder =
        'master/' +
        String(c.nama || '')
          .toUpperCase()
          .replace(/\s+/g, '_') +
        '/';
      let names = [];
      try {
        names = await listStorageFolder(folder);
      } catch {
        /* non-fatal: tanpa folder → tanpa tombol ekstra */
      }
      // Tombol utama (pas_photo/file_cv/jft/ssw) sudah tampil — file folder
      // yang TIPENYA sama tidak boleh dobel (mis. CVFILE lama vs baru, atau
      // "1. X_CV.xlsx" lawas vs CVFILE_… baru). CV/JFT/SSW/foto SELALU
      // dianggap tipe utama (punya tombol sendiri), sisanya (KK/KTP/ijazah/
      // passport/dll) jadi tombol ekstra.
      const mainBasenames = [c.pasPhoto, c.fileCv, c.jft, c.ssw]
        .map((u) => {
          try {
            return decodeURIComponent(
              String(u || '')
                .split('/')
                .pop(),
            );
          } catch {
            return String(u || '')
              .split('/')
              .pop();
          }
        })
        .filter(Boolean);
      const mainTypes = new Set(['CV', 'JFT', 'SSW', 'PHOTO']);
      for (const b of mainBasenames) {
        const t = docTypeOf(b);
        if (t) mainTypes.add(t);
      }
      // Dedupe per tipe dokumen: upload lama tidak boleh menimbulkan tombol
      // dobel — cukup file TERBARU per tipe (KK/KTP/CV dst).
      const byType = new Map();
      for (const n of names) {
        if (mainBasenames.indexOf(n) !== -1) continue;
        const t = docTypeOf(n);
        if (mainTypes.has(t)) continue;
        const prev = byType.get(t);
        if (!prev || docAge(n) > docAge(prev.name)) {
          byType.set(t, { name: n, url: pubBase + folder + encodeURIComponent(n) });
        }
      }
      const extraDocs = [...byType.values()];
      // Gabungkan juga dokumen dari keterangan form (NAMA:URL;...) — dedupe
      // per URL biar tidak dobel dengan folder master.
      const formDocs = byWa.get(normalizeWa(String(c.wa || ''))) || [];
      const seenUrl = new Set(extraDocs.map((d) => d.url));
      for (const d of formDocs) {
        if (!seenUrl.has(String(d.url))) {
          seenUrl.add(String(d.url));
          extraDocs.push(d);
        }
      }
      // Foto: kalau pas_photo kandidat kosong/basi (404), pakai file foto dari
      // folder master (PHOTOFILE/PAS_PHOTO/FOTO) — folder di-list di atas.
      let pasPhoto = c.pasPhoto;
      if (!pasPhoto || pasPhoto === '-') {
        const photoFile = names.find((n) => docTypeOf(n) === 'PHOTO');
        if (photoFile) pasPhoto = pubBase + folder + encodeURIComponent(photoFile);
      }

      let finalCv = c.fileCv;
      let finalJft = c.jft;
      let finalSsw = c.ssw;

      // Extract newest CV/JFT/SSW dari extraDocs (folder master & history)
      // jika kandidat melamar tanpa dokumen tersebut di loker baru.
      for (let i = extraDocs.length - 1; i >= 0; i--) {
        const doc = extraDocs[i];
        const t = docTypeOf(doc.name);
        if (t === 'CV' && (!finalCv || finalCv === '-')) {
          finalCv = doc.url;
          extraDocs.splice(i, 1);
        } else if (t === 'JFT' && (!finalJft || finalJft === '-')) {
          finalJft = doc.url;
          extraDocs.splice(i, 1);
        } else if (t === 'SSW' && (!finalSsw || finalSsw === '-')) {
          finalSsw = doc.url;
          extraDocs.splice(i, 1);
        }
      }

      candidates.push({
        id_kandidat: c.idKandidat,
        no_wa: c.wa,
        nama_lengkap: c.nama,
        gender: c.gender,
        usia: c.usia,
        tb: c.tb,
        bb: c.bb,
        pas_photo: pasPhoto,
        file_cv: finalCv,
        jft: finalJft,
        ssw: finalSsw,
        nilai_jft_text: c.jftText,
        bidang_ssw_text: c.sswText,
        extraDocs,
      });
    }
    const tsk = toText(pick(jobRow, ['tsk', 'pengurus']));
    return { job: { code, name, tsk }, candidates };
  } catch (e) {
    return { error: 'Gagal memuat data share: ' + e.message };
  }
}

// Tipe dokumen dari nama file. Kenali pola baru (KK_1786…pdf → KK,
// CVFILE_1786…xlsx → CVFILE) DAN pola lawas (1. X_CV.xlsx → CV,
// 1._X_JFT.pdf → JFT, nama_jft.pdf → JFT, X_PAS_PHOTO.jpg → PHOTO)
// lalu normalisasi alias ke tipe kanonik (CVFILE→CV, PHOTOFILE→PHOTO, …).
// Dipakai dedupe extraDocs supaya 1 loker = 1 CV/JFT/SSW/foto (tidak dobel).
const TYPE_ALIAS = {
  CVFILE: 'CV',
  FILE_CV: 'CV',
  CV_REVISI: 'CV',
  PHOTOFILE: 'PHOTO',
  PAS_PHOTO: 'PHOTO',
  PASSPHOTO: 'PHOTO',
  FOTO: 'PHOTO',
  PHOTO: 'PHOTO',
  JFTFILE: 'JFT',
  SSWFILE: 'SSW',
  KARTU_KELUARGA: 'KK',
};
// Token tipe yang dicari di nama lawas (lebih panjang dulu agar tidak
// salah tangkap: PAS_PHOTO sebelum PHOTO/FOTO, KARTU_KELUARGA sebelum KK).
const TYPE_TOKENS = [
  'PAS_PHOTO',
  'PHOTOFILE',
  'KARTU_KELUARGA',
  'CVFILE',
  'FILE_CV',
  'CV_REVISI',
  'JFTFILE',
  'SSWFILE',
  'PASSPHOTO',
  'PASSPORT',
  'IJAZAH',
  'KTP',
  'KK',
  'CV',
  'JFT',
  'SSW',
  'FOTO',
  'PHOTO',
];
function docTypeOf(name) {
  const base = String(name || '').replace(/\.[a-z0-9]+$/i, '');
  const m = base.match(/^[A-Z]+/);
  const raw = m ? m[0] : null;
  let t = raw;
  if (!t) {
    const up = base.toUpperCase();
    const hit = TYPE_TOKENS.find((tk) => up.includes(tk));
    t = hit || up;
  }
  return TYPE_ALIAS[t] || t;
}

// Usia file dari suffix numerik nama (ms epoch) — makin besar makin baru.
function docAge(name) {
  const m = String(name || '').match(/_(\d{10,})/);
  return m ? Number(m[1]) : 0;
}

export { handleShareData, docTypeOf };
