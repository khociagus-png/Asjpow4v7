// MODUL BARU (Fase 2 REFACTOR_TODO.md): js/06_admin_modal.js dipecah per domain →
// js/admin_modal/{dbfilter,cv,job}.js. Body fungsi byte-identik dari
// 06_admin_modal.js — perilaku tidak berubah.
// ==========================================
// AKSI LAMAR LOKER — submit lamaran via form bridge + salin info loker
// ==========================================

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
