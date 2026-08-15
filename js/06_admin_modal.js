// 8. FUNGSI LOGIKA LANJUTAN & MODAL
// ==========================================
function setFilterBidang(v) {
  dbFilterBidang = v;
  renderDbFilters();
  filterDbJob();
}
function setFilterTahapan(v) {
  dbFilterTahapan = v;
  renderDbFilters();
  filterDbJob();
}
function setSortDb(t) {
  dbSortType = t;
  ['terbaru', 'terlama', 'terbanyak'].forEach((x) => {
    var b = document.getElementById('btn-sort-' + x);
    if (b)
      b.className =
        'px-4 py-1.5 rounded-full font-bold transition ' +
        (t === x.toUpperCase()
          ? 'bg-purple-600 text-white shadow-lg'
          : 'bg-slate-700 text-slate-300 hover:bg-slate-600');
  });
  filterDbJob();
}

function renderDbFilters() {
  var bContainer = document.getElementById('filter-bidang-container');
  var tContainer = document.getElementById('filter-tahapan-container');
  if (DROPDOWNS.kategori && bContainer) {
    var bHtml =
      '<button onclick="setFilterBidang(\'ALL\')" class="px-3 py-1 rounded-full ' +
      (dbFilterBidang === 'ALL' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400') +
      '">' +
      tr('public.all') +
      '</button>';
    // Label chip dwi bahasa (trOption); onclick tetap ID asli (trOptionId)
    // supaya filter cocok dengan data yang tersimpan.
    DROPDOWNS.kategori.forEach((kat) => {
      bHtml +=
        '<button onclick="setFilterBidang(\'' +
        escJs(trOptionId(kat)) +
        '\')" class="px-3 py-1 rounded-full ' +
        (dbFilterBidang === trOptionId(kat)
          ? 'bg-purple-600 text-white'
          : 'bg-slate-800 text-slate-400') +
        '">' +
        esc(trOption(kat)) +
        '</button>';
    });
    bContainer.innerHTML = bHtml;
  }
  if (DROPDOWNS.tahapan && tContainer) {
    var tHtml =
      '<button onclick="setFilterTahapan(\'ALL\')" class="px-3 py-1 rounded-full ' +
      (dbFilterTahapan === 'ALL' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400') +
      '">' +
      tr('public.all') +
      '</button>';
    DROPDOWNS.tahapan.forEach((thp) => {
      tHtml +=
        '<button onclick="setFilterTahapan(\'' +
        escJs(trOptionId(thp)) +
        '\')" class="px-3 py-1 rounded-full ' +
        (dbFilterTahapan === trOptionId(thp)
          ? 'bg-purple-600 text-white'
          : 'bg-slate-800 text-slate-400') +
        '">' +
        esc(trOption(thp)) +
        '</button>';
    });
    tContainer.innerHTML = tHtml;
  }
}

async function bukaDigitalCV(id) {
  if (typeof window.ensureAllCandidates === 'function') {
    try {
      await window.ensureAllCandidates();
    } catch (e) {}
  }
  try {
    var c = ALL_CANDIDATES.find((kan) => String(kan.idKandidat).trim() === String(id).trim());
    if (!c) {
      showToast(tr('ui.toast_profile_not_found2'), 'error');
      return;
    }
    // Simpan kandidat aktif untuk form Edit Data Cepat (tanpa buka CV AI).
    window.__cvKandidatAktif = c;
    isiEditCepatCv(c);

    let logoCv = document.getElementById('cv-logo-asj');
    if (logoCv && ASSETS.LOGO) logoCv.src = ASSETS.LOGO;

    safeSet('cv-id', c.idKandidat || '-');

    let htmlNama = (c.nama || '-').toUpperCase();

    let miniFields = [c.nama, c.wa, c.gender, c.usia, c.tb, c.bb, c.pendidikan, c.pasPhoto];
    let miniFilled = 0;
    miniFields.forEach((f) => {
      if (f && String(f).trim() !== '' && String(f).trim() !== '-') miniFilled++;
    });
    let pMini = Math.round((miniFilled / miniFields.length) * 100);

    let masterFields = [c.email, c.tempatLahir, c.tglLahir, c.alamat, c.jftText, c.sswText];
    let masterFilled = 0;
    masterFields.forEach((f) => {
      if (f && String(f).trim() !== '' && String(f).trim() !== '-') masterFilled++;
    });
    let pMaster = Math.round((masterFilled / masterFields.length) * 100);

    let cvBadges = '<span class="inline-flex items-center gap-1.5 ml-3 align-middle">';
    cvBadges +=
      '<i class="fas fa-medal text-orange-500 text-lg drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]" title="' +
      tr('ui.badge_bronze') +
      '"></i>';
    if (pMini === 100)
      cvBadges +=
        '<i class="fas fa-award text-slate-300 text-lg drop-shadow-[0_0_8px_rgba(203,213,225,0.8)]" title="' +
        tr('ui.badge_silver') +
        '"></i>';
    if (pMaster === 100)
      cvBadges +=
        '<i class="fas fa-crown text-yellow-400 text-xl drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]" title="' +
        tr('ui.badge_gold') +
        '"></i>';

    let catatanIntStr = c.catatanInt || '';
    if (catatanIntStr.includes('[VIP]')) {
      let logoSrc =
        ASSETS.LOGO ||
        'https://gdwvffmevwtwnzrapjwy.supabase.co/storage/v1/object/public/asj-files/assets/logo_asj.png';
      cvBadges +=
        '<img src="' +
        logoSrc +
        '" class="w-6 h-6 object-contain drop-shadow-[0_0_10px_rgba(52,211,153,0.8)] rounded-full border border-emerald-500/50" title="' +
        tr('ui.badge_official') +
        '">';
    }

    // PERBAIKAN 1: Support deteksi [KELAS G] maupun tulisan [G]
    let kelasMatch = catatanIntStr.match(/\[(?:KELAS\s*([A-Z0-9]+)|([A-Z0-9]+))\]/i);
    if (kelasMatch) {
      let namaKelas = kelasMatch[1] || kelasMatch[2];
      cvBadges += `<span class="px-2 py-0.5 ml-1 bg-indigo-900/60 text-indigo-300 border border-indigo-500/50 rounded text-[9px] font-bold shadow-sm whitespace-nowrap align-middle"><i class="fas fa-users mr-1"></i>${namaKelas.toUpperCase()}</span>`;
    }
    cvBadges += '</span>';

    safeSet('cv-nama', htmlNama + cvBadges);
    safeSet('cv-wa', c.wa || '-');
    safeSet('cv-gender', c.gender || '-');

    let umurLive = '-';
    if (c.tglLahir && c.tglLahir !== '-' && c.tglLahir.trim() !== '') {
      let dob = new Date(c.tglLahir);
      if (!isNaN(dob)) {
        let today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        let m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
          age--;
        }
        umurLive = age + tr('ui.age_years_suffix');
      }
    }
    if (umurLive === '-' && c.usia && c.usia !== '-') umurLive = c.usia + tr('ui.age_years_suffix');
    safeSet('cv-usia', umurLive);

    // TB/BB & TTL digabung di backend (mapCandidate: field tbBb/ttl) supaya
    // modal CV selalu menampilkan data fisik meski baris lamaran kosong
    // (data sebenarnya ada di master_database_candidate).
    safeSet('cv-tbbb', c.tbBb || c.tb_bb || '-');
    // riwayatpendidikan kini JSON array 5-baris — tampilkan tingkat terakhir terbaca
    safeSet('cv-pendidikan', formatPendidikanTingkat(c.pendidikan) || '-');
    safeSet('cv-jft-nilai', c.jftText && c.jftText !== '-' ? c.jftText : '-');
    safeSet('cv-ssw', c.sswText && c.sswText !== '-' ? c.sswText : '-');

    safeSet('cv-ttl-lengkap', c.ttl || '-');
    safeSet('cv-email', c.email || '-');
    safeSet('cv-alamat', c.alamat || '-');

    let statusText = trOption(c.tahapan || 'Baru') + ' \n(' + trOption(c.status || 'Aktif') + ')';
    safeSet('cv-status', statusText);

    var waLink = document.getElementById('cv-wa-link');
    if (waLink) waLink.href = 'https://wa.me/' + String(c.wa).replace(/\D/g, '');

    // Password kandidat: default 4 digit terakhir No. WA. Sejak fitur
    // Ganti Password (2026-08-12) kandidat bisa mengganti sendiri — kalau
    // passwordDiubah=true, tampilkan peringatan (admin tidak bisa tahu),
    // bukan 4 digit WA yang sudah tidak berlaku.
    var passRow = document.getElementById('cv-pass-row');
    var passEl = document.getElementById('cv-pass');
    if (passRow && passEl) {
      if (isAdmin) {
        if (c.passwordDiubah) {
          passEl.textContent = tr('ui.pass_changed_admin') + ' — ' + tr('ui.pass_changed_hint');
          passRow.classList.remove('hidden');
        } else {
          var pass4 = String(c.wa || '')
            .replace(/\D/g, '')
            .slice(-4);
          if (pass4) {
            passEl.textContent = pass4 + ' (' + tr('ui.cand_pass_hint') + ')';
            passRow.classList.remove('hidden');
          } else {
            passRow.classList.add('hidden');
          }
        }
      } else {
        passRow.classList.add('hidden');
      }
    }

    let jobTagsContainer = document.getElementById('cv-job-tags');
    if (jobTagsContainer) {
      // DOM OPT: kumpulkan ke SATU string dulu, injeksikan sekali
      // (dulu innerHTML += per job = tulis DOM berulang dalam loop).
      let jobString = c.idLoker || '';
      if (jobString && jobString !== '-') {
        const jobHtml = jobString
          .split(',')
          .map((job) => {
            let cleanJob = job.trim();
            return cleanJob
              ? '<span class="px-3 py-1 bg-pink-900/30 text-pink-300 border border-pink-700/50 rounded-lg text-[10px] font-bold shadow-sm"><i class="fas fa-briefcase mr-1"></i> ' +
                  esc(cleanJob) +
                  '</span>'
              : '';
          })
          .join('');
        jobTagsContainer.innerHTML = jobHtml;
      } else {
        jobTagsContainer.innerHTML =
          '<span class="text-xs text-slate-500 italic">' + tr('ui.not_applied_general') + '</span>';
      }
    }

    var img = document.getElementById('cv-foto');
    var icn = document.getElementById('cv-no-foto');
    if (img && icn) {
      img.classList.add('hidden');
      icn.classList.remove('hidden');
      if (c.pasPhoto && c.pasPhoto !== '-' && c.pasPhoto.length > 5) {
        var finalUrl = getHighResImage(c.pasPhoto);
        img.onload = function () {
          img.classList.remove('hidden');
          icn.classList.add('hidden');
        };
        // FIX 2026-08-12: onerror fallback — URL lh3/Drive yang 403/404
        // tidak boleh diam-diam menampilkan foto kosong: coba unduhan
        // alternatif (Drive), lalu tampilkan ikon no-foto.
        img.onerror = function () {
          var alt = getDirectDownloadUrl(c.pasPhoto);
          if (alt && alt !== finalUrl && !img._fotoRetry) {
            img._fotoRetry = true;
            img.src = alt;
          } else {
            img.classList.add('hidden');
            icn.classList.remove('hidden');
          }
        };
        img.src = finalUrl;
      }
    }

    var btnJft = document.getElementById('btn-cv-jft');
    var btnSsw = document.getElementById('btn-cv-ssw');
    var btnCv = document.getElementById('btn-cv-dokumen');

    if (isAdmin) {
      if (c.jftUrl && c.jftUrl !== '-' && c.jftUrl.toLowerCase().startsWith('http')) {
        btnJft.onclick = function () {
          bukaInlinePreview(c.jftUrl);
        };
        btnJft.classList.remove('hidden');
      } else {
        if (btnJft) btnJft.classList.add('hidden');
      }
      if (c.sswUrl && c.sswUrl !== '-' && c.sswUrl.toLowerCase().startsWith('http')) {
        btnSsw.onclick = function () {
          bukaInlinePreview(c.sswUrl);
        };
        btnSsw.classList.remove('hidden');
      } else {
        if (btnSsw) btnSsw.classList.add('hidden');
      }
      if (c.cvUrl && c.cvUrl !== '-' && c.cvUrl.toLowerCase().startsWith('http')) {
        btnCv.onclick = function () {
          bukaInlinePreview(c.cvUrl);
        };
        btnCv.classList.remove('hidden');
      } else {
        if (btnCv) btnCv.classList.add('hidden');
      }
    } else {
      if (btnJft) btnJft.classList.add('hidden');
      if (btnSsw) btnSsw.classList.add('hidden');
      if (btnCv) btnCv.classList.add('hidden');
    }

    let notesArea = document.getElementById('cv-admin-notes-area');
    if (notesArea) {
      if (isAdmin) {
        notesArea.classList.remove('hidden');
        // Biar kalau disave ulang, tulisan Kelasnya tidak terhapus berantakan
        document.getElementById('cv-catatan-int').value = catatanIntStr
          .replace(/\[VIP\]/gi, '')
          .replace(/\[(?:KELAS\s*[A-Z0-9]+|[A-Z0-9]+)\]/gi, '')
          .trim();
        document.getElementById('cv-catatan-ext').value = c.catatanExt || '';
      } else {
        notesArea.classList.add('hidden');
      }
    }

    // PERBAIKAN 2: Regex ini sekarang mencakup kata "MCU", "PARPOR", "MATCH", dll (sama persis dengan dashboard kandidat)
    let isLolos =
      /LOLOS|PEMBERKASAN|MCU|MEDICAL|MEDIKAL|PARPOR|PASPOR|PASPORT|MATCH|TERIMA|SIAP|TTD|KONTRAK|VISA|COE|KTKLN|SISKOP|FLIGHT|BERANGKAT|TERBANG|TIKET|E-ID/i.test(
        c.tahapan || '',
      );

    let areaBerkas = document.getElementById('cv-pemberkasan-area');
    let btnFolder = document.getElementById('btn-cv-folder');

    if (areaBerkas) {
      if (isAdmin && isLolos) {
        areaBerkas.classList.remove('hidden');

        var bFolder = document.getElementById('btn-cv-folder');
        if (bFolder) {
          var jd = ALL_DB_JOBS.find((j) => j.code === c.idLoker);
          var jobFolder = jd && jd.folderUrl && jd.folderUrl !== '-' ? jd.folderUrl : c.folderUrl;
          if (jobFolder && jobFolder !== '-') {
            bFolder.href = jobFolder;
            bFolder.classList.remove('hidden');
          } else {
            bFolder.classList.add('hidden');
          }
        }

        var bCv = document.getElementById('btn-cv-file-cv');
        if (bCv) {
          if (c.cvUrl && c.cvUrl !== '-') {
            bCv.onclick = function () {
              bukaPreviewDokumen(c.cvUrl);
            };
            bCv.classList.remove('hidden');
          } else bCv.classList.add('hidden');
        }

        var bJft = document.getElementById('btn-cv-file-jft');
        if (bJft) {
          if (c.jftUrl && c.jftUrl !== '-') {
            bJft.onclick = function () {
              bukaPreviewDokumen(c.jftUrl);
            };
            bJft.classList.remove('hidden');
          } else bJft.classList.add('hidden');
        }

        var bSsw = document.getElementById('btn-cv-file-ssw');
        if (bSsw) {
          if (c.sswUrl && c.sswUrl !== '-') {
            bSsw.onclick = function () {
              bukaPreviewDokumen(c.sswUrl);
            };
            bSsw.classList.remove('hidden');
          } else bSsw.classList.add('hidden');
        }

        var bPhoto = document.getElementById('btn-cv-file-photo');
        if (bPhoto) {
          if (c.pasPhoto && c.pasPhoto !== '-') {
            bPhoto.onclick = function () {
              bukaPreviewDokumen(c.pasPhoto);
            };
            bPhoto.classList.remove('hidden');
          } else bPhoto.classList.add('hidden');
        }
      } else {
        areaBerkas.classList.add('hidden');
      }
    }

    document.getElementById('modal-cv').classList.remove('hidden');
  } catch (err) {
    showToast(tr('ui.toast_load_profile_failed'), 'error');
  }
}

// ==========================================
// EDIT DATA CEPAT di Modal CV (dossier) — gender/usia/TTL/TB/JFT/SSW
// tanpa harus buka CV AI. Hanya untuk admin.
// ==========================================
function isiEditCepatCv(c) {
  var btn = document.getElementById('btn-cv-edit-cepat');
  var form = document.getElementById('cv-edit-cepat-form');
  if (!btn || !form) return;
  if (!isAdmin) {
    btn.classList.add('hidden');
    form.classList.add('hidden');
    return;
  }
  btn.classList.remove('hidden');
  // isi nilai awal (jangan reset form kalau sudah kebuka — biar tidak
  // menghapus ketikan admin saat modal dibuka ulang)
  var gen = document.getElementById('cv-edit-gender');
  // Normalisasi gender (DB campur kapital) supaya select Edit Cepat terisi.
  if (gen && !gen.dataset.touched) gen.value = normalizeGenderValue(c.gender);
  var usia = document.getElementById('cv-edit-usia');
  if (usia && !usia.dataset.touched)
    usia.value = c.usia && c.usia !== '-' && c.usia !== '' ? c.usia : '';
  var tmp = document.getElementById('cv-edit-tempat-lahir');
  if (tmp && !tmp.dataset.touched)
    tmp.value = c.tempatLahir && c.tempatLahir !== '-' ? c.tempatLahir : '';
  var tgl = document.getElementById('cv-edit-tgl-lahir');
  if (tgl && !tgl.dataset.touched) tgl.value = toDateInputValue(c.tglLahir);
  var tb = document.getElementById('cv-edit-tb');
  if (tb && !tb.dataset.touched)
    tb.value = c.tb && c.tb !== '-' && c.tb !== '' ? String(c.tb).replace(/\D/g, '') : '';
  var bb = document.getElementById('cv-edit-bb');
  if (bb && !bb.dataset.touched)
    bb.value = c.bb && c.bb !== '-' && c.bb !== '' ? String(c.bb).replace(/\D/g, '') : '';
  var jft = document.getElementById('cv-edit-jft');
  if (jft && !jft.dataset.touched) jft.value = c.jftText && c.jftText !== '-' ? c.jftText : '';
  var ssw = document.getElementById('cv-edit-ssw');
  if (ssw && !ssw.dataset.touched) ssw.value = c.sswText && c.sswText !== '-' ? c.sswText : '';
  // tutup form setiap buka modal (biar bersih)
  form.classList.add('hidden');
}

function toDateInputValue(tgl) {
  if (!tgl || tgl === '-' || String(tgl).trim() === '') return '';
  var d = new Date(tgl);
  if (isNaN(d)) return '';
  var mm = String(d.getMonth() + 1).padStart(2, '0');
  var dd = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + mm + '-' + dd;
}

function toggleEditCepatCv() {
  var form = document.getElementById('cv-edit-cepat-form');
  if (form) form.classList.toggle('hidden');
}

async function simpanEditCepatCv() {
  var c = window.__cvKandidatAktif;
  if (!c) {
    showToast(tr('ui.toast_data_not_found'), 'error');
    return;
  }
  var wa = normalizePhone(c.wa);
  if (!wa) {
    showToast(tr('ui.toast_data_not_found'), 'error');
    return;
  }
  var payload = {
    wa: wa,
    admin: currentAdminName,
    // Normalisasi ke format kanonikal supaya DB konvergen.
    gender: normalizeGenderValue(document.getElementById('cv-edit-gender').value),
    usia: document.getElementById('cv-edit-usia').value,
    tempatLahir: document.getElementById('cv-edit-tempat-lahir').value.trim(),
    tglLahir: document.getElementById('cv-edit-tgl-lahir').value,
    tb: document.getElementById('cv-edit-tb').value,
    bb: document.getElementById('cv-edit-bb').value,
    jftText: document.getElementById('cv-edit-jft').value.trim(),
    sswText: document.getElementById('cv-edit-ssw').value.trim(),
  };
  document.getElementById('global-loader').style.display = 'flex';
  try {
    const res = await callAPI('updateKandidatSuper', [payload]);
    if (res && res.success) {
      showToast(tr('ui.toast_sync3_success'), 'success');
      // reset flag touched biar form terisi ulang data baru
      [
        'cv-edit-gender',
        'cv-edit-usia',
        'cv-edit-tempat-lahir',
        'cv-edit-tgl-lahir',
        'cv-edit-tb',
        'cv-edit-bb',
        'cv-edit-jft',
        'cv-edit-ssw',
      ].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) delete el.dataset.touched;
      });
      refreshDataDinamis('pelamar');
    } else {
      showToast(tr('ui.toast_error_prefix') + (res && res.error ? res.error : ''), 'error');
    }
  } catch (err) {
    showToast(tr('alert.network') + (err && err.message ? err.message : err), 'error');
  } finally {
    document.getElementById('global-loader').style.display = 'none';
  }
}

function bukaInlinePreview(url) {
  if (!url || url === '-') return;
  var previewContainer = document.getElementById('cv-inline-preview');
  var frame = document.getElementById('cv-inline-iframe');
  var btnExt = document.getElementById('cv-inline-external');

  if (previewContainer && frame) {
    // Satu pintu preview: gambar/PDF native, CSV -> render lokal,
    // Office (docx/pptx) -> MS Office Viewer, lain -> URL asli.
    previewFileInFrame(frame, url);
    if (btnExt) btnExt.href = url;
    previewContainer.classList.remove('hidden');
  } else {
    // Fallback to old modal if inline container is missing
    bukaPdfPreview(url);
  }
}

function bukaPdfPreview(url) {
  if (!url || url === '-') return;
  var frame = document.getElementById('pdf-frame');
  var btnExt = document.getElementById('btn-pdf-external');

  if (frame) {
    previewFileInFrame(frame, url);
  }
  if (btnExt) btnExt.href = url;

  var modal = document.getElementById('modal-pdf-viewer');
  if (modal) modal.classList.remove('hidden');
}

async function simpanCatatanCv() {
  if (typeof window.ensureAllCandidates === 'function') {
    try {
      await window.ensureAllCandidates();
    } catch (e) {}
  }
  var id = document.getElementById('cv-id').innerText;
  var intNote = document.getElementById('cv-catatan-int').value;
  var extNote = document.getElementById('cv-catatan-ext').value;

  if (!id || id === '-') return;

  var c = ALL_CANDIDATES.find((kan) => String(kan.idKandidat).trim() === String(id).trim());
  let kelasMatch = (c.catatanInt || '').match(/\[(?:KELAS\s*([A-Z0-9]+)|([A-Z0-9]+))\]/i);
  if (kelasMatch) {
    let namaKelas = kelasMatch[1] || kelasMatch[2];
    intNote += ` [${namaKelas.toUpperCase()}]`;
  }

  document.getElementById('global-loader').style.display = 'flex';
  try {
    const res = await callAPI('updateCatatanKandidat', [id, intNote, extNote, currentAdminName]);
    if (res.success) {
      showToast(tr('ui.toast_eval_note_saved'), 'success');
      document.getElementById('modal-cv').classList.add('hidden');
      refreshDataDinamis('pelamar');
    } else {
      showToast(tr('ui.toast_save_failed') + res.error, 'error');
    }
  } catch (err) {
    showToast(tr('ui.toast_conn_failed') + err.message, 'error');
  } finally {
    document.getElementById('global-loader').style.display = 'none';
  }
}

function lamarJob(jc, b, req) {
  // Guard: kalau tahapan job sudah berjalan (seleksi/pendokumenan), tolak
  // lamaran baru walau tombol sempat terklik (mis. halaman lama di-cache).
  var job = (window.ALL_JOBS || []).find(function (x) {
    return x.code === jc;
  });
  if (job && jobTutupUntukLamar(job)) {
    showToast(tr('ui.toast_job_closed_process'), 'error');
    return;
  }
  bukaFormBridge(
    'generateFormBridge',
    [jc, b, currentKandidatWa, currentKandidatName, req],
    tr('ui.toast_apply_form_url_missing'),
  );
}

function copyInfoLoker(c) {
  var j = ALL_JOBS.find((x) => x.code === c);
  if (!j) return;
  var txt =
    '*INFO LOKER ASJ*  Posisi: ' +
    j.pekerjaan +
    '  Lokasi: ' +
    j.lokasi +
    '  Gender: ' +
    j.gender +
    '  *Syarat:*  ' +
    j.syarat +
    '  *Ket:*  ' +
    j.keterangan +
    '  Daftar via portal resmi.';
  salinTeksDecode(encodeURIComponent(txt));
}

// ==========================================
