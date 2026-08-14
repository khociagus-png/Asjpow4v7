// === FUNGSI BUKA PREVIEW DRAF CV RIREKISHO ===
// FUNGSI 1: Dipanggil saat Admin mengklik tombol "CV" di tabel
async function bukaPreviewCV_Admin(waTarget) {
  if (typeof window.ensureAllCandidates === 'function') {
    try {
      await window.ensureAllCandidates();
    } catch (e) {}
  }
  if (!waTarget) return showToast(tr('ui.toast_wa_invalid'), 'error');

  document.getElementById('global-loader').style.display = 'flex';

  try {
    const fullData = await callAPI('getDrafCvMaster', [waTarget]);
    if (!fullData || fullData.error) {
      // Tampilkan pesan asli dari backend (mis. "Data Master belum ada untuk …")
      // agar admin/kandidat tahu persis kenapa preview gagal.
      showToast((fullData && fullData.error) || tr('ui.toast_master_incomplete'), 'error');
      return;
    }

    let c = ALL_CANDIDATES.find((k) => normalizePhone(k.wa) === normalizePhone(waTarget));
    let photoUrl = c && c.pasPhoto !== '-' ? getHighResImage(c.pasPhoto) : '';
    // Fallback foto dari getDrafCvMaster (uploads.photo)
    if (!photoUrl && fullData && fullData.uploads && fullData.uploads.photo) {
      photoUrl = getHighResImage(fullData.uploads.photo);
    }

    try {
      renderCVAjaib(fullData, photoUrl, waTarget);
    } catch (e) {
      showToast(tr('ui.toast_cv_build_failed') + e.message, 'error');
    }
  } catch (err) {
    showToast(tr('ui.toast_server_conn_failed'), 'error');
  } finally {
    document.getElementById('global-loader').style.display = 'none';
  }
}

// FUNGSI 2: Dipanggil saat Kandidat mengklik "Preview Desain CV" di dashboardnya
function bukaPreviewCV() {
  let waTarget = currentKandidatWa;
  if (!waTarget) return showToast(tr('ui.toast_session_invalid'), 'error');
  prosesBukaRirekisho(waTarget);
}

// MESIN UTAMA PENARIK DATA KE SERVER
async function prosesBukaRirekisho(waTarget) {
  document.getElementById('global-loader').style.display = 'flex';

  try {
    const fullData = await callAPI('getDrafCvMaster', [waTarget]);
    if (!fullData || fullData.error) {
      // Tampilkan pesan asli dari backend (mis. "Data Master belum ada untuk …")
      // agar admin/kandidat tahu persis kenapa preview gagal.
      showToast((fullData && fullData.error) || tr('ui.toast_master_incomplete'), 'error');
      return;
    }

    let c = ALL_CANDIDATES.find((k) => normalizePhone(k.wa) === normalizePhone(waTarget));
    let photoUrl = c && c.pasPhoto !== '-' ? getHighResImage(c.pasPhoto) : '';
    // Fallback foto dari getDrafCvMaster (uploads.photo)
    if (!photoUrl && fullData && fullData.uploads && fullData.uploads.photo) {
      photoUrl = getHighResImage(fullData.uploads.photo);
    }

    try {
      // Panggil fungsi renderCVAjaib yang sudah Kakak pasang sebelumnya
      renderCVAjaib(fullData, photoUrl, waTarget);
    } catch (e) {
      showToast(tr('ui.toast_cv_build_failed') + e.message, 'error');
    }
  } catch (err) {
    showToast(tr('ui.toast_server_conn_failed'), 'error');
  } finally {
    document.getElementById('global-loader').style.display = 'none';
  } // Panggil fungsi server getDrafCvMaster()
}

function renderCVAjaib(d, fotoUrl, waTarget) {
  // 1. TARIK MEMORI JSON AI JEKLIN
  let ai = {};
  try {
    if (d.AIDATAJSON && d.AIDATAJSON !== '-') ai = JSON.parse(d.AIDATAJSON);
  } catch (e) {}

  // 2. MESIN PENCARI DATA — helper pure logic dari helpers_cv.js
  // Prioritas: (a) d nested hasil getDrafCvMaster (identitas.nama_lengkap,
  // wawancara.kelebihan_jp, dst), (b) ai_data_json (AIDATAJSON), (c) key flat
  // uppercase lama (NAMALENGKAP, GENDER, dst) agar kompatibel data legacy.
  const v = makeV(d, ai);
  // Baca array riwayat dari d (hasil getDrafCvMaster) atau ai — kolom flat
  // legacy tidak dipakai lagi karena backend sudah menormalkan ke array.
  const getArr = (key) => {
    let arr = getPath(d, key);
    if (Array.isArray(arr) && arr.length) return arr;
    let aiArr = getPath(ai, key);
    if (aiArr) {
      try {
        let p = JSON.parse(aiArr);
        if (Array.isArray(p) && p.length) return p;
      } catch (e) {
        if (Array.isArray(aiArr)) return aiArr;
      }
    }
    return [];
  };
  let eduList = getArr('pendidikan');
  let jobList = getArr('pekerjaan');
  let famList = getArr('keluarga');

  let tglAsli = v('TGLLAHIR', 'TANGGALLAHIR', 'identitas.tgl_lahir');
  let tglFormat = '-';
  if (tglAsli !== '-') {
    let dt = new Date(tglAsli);
    if (!isNaN(dt)) {
      tglFormat =
        dt.getFullYear() +
        '年' +
        String(dt.getMonth() + 1).padStart(2, '0') +
        '月' +
        String(dt.getDate()).padStart(2, '0') +
        '日';
    } else {
      tglFormat = tglAsli;
    }
  }

  // --- PERBAIKAN FOTO DI SINI ---
  // Menggunakan min-height: 195px (seukuran 11 baris tabel) & object-fit cover agar pas kotak tanpa gepeng
  let fotoHtml = fotoUrl
    ? `<img src="${fotoUrl}" style="width: 100%; height: 100%; min-height: 195px; object-fit: cover; object-position: top center; display: block; margin: 0; padding: 0;">`
    : `<div style="width: 100%; min-height: 195px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: gray;">FOTO</div>`;

  let btnPrintHtml = isAdmin
    ? `
            <div class="flex flex-wrap items-center gap-2 mb-3 print:hidden z-50 relative">
                <button onclick="cetakCVRirekisho()" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-lg flex items-center font-sans text-sm transition-all hover:scale-105 border border-emerald-500">
                    <i class="fas fa-print mr-2"></i> Cetak Rirekisho
                </button>
                <button onclick="cetakCVRirekisho()" class="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg shadow-lg flex items-center font-sans text-sm transition-all hover:scale-105 border border-sky-500">
                    <i class="fas fa-file-pdf mr-2"></i> Simpan PDF
                </button>
            </div>
        `
    : `
            <div class="text-center mb-3 print:hidden z-50 relative">
                <span class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-700/80 text-slate-300 text-[10px] font-bold rounded-full border border-slate-500/50">
                    <i class="fas fa-eye mr-1"></i> MODE PREVIEW — Hanya bisa dicetak oleh Admin
                </span>
            </div>
        `;

  // Bangun tiap blok lewat builder murni (10b_cv_builders.js)
  let eduHtml = buildEduRows(eduList, v);
  let jobHtml = buildJobRows(jobList, v);
  let famHtml = buildFamRows(famList, v);
  let idn = buildCvIdentitas(v);

  // Rakit template A4 (10b_cv_builders.js)
  let html = buildCvKertasA4({
    v,
    fotoHtml,
    btnPrintHtml,
    tglFormat,
    waTarget,
    ...idn,
    eduHtml,
    jobHtml,
    famHtml,
  });

  document.getElementById('cv-kertas-a4').innerHTML = html;
  document.getElementById('modal-preview-cv').classList.remove('hidden');
}

// Cetak / Simpan PDF Rirekisho: hanya tersedia untuk Admin (tombolnya tidak
// dirender untuk kandidat). "Simpan PDF" membuka dialog print yang sama,
// browser menyediakan opsi "Save as PDF".
function cetakCVRirekisho() {
  if (!isAdmin) {
    showToast(tr('ui.toast_rireki_admin_only'), 'error');
    return;
  }
  window.print();
}
