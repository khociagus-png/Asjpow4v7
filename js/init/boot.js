// MODUL BARU (Fase 2 REFACTOR_TODO.md): js/02_init.js dipecah per domain →
// js/init/{state,theme,util,preview,nav,boot}.js. Body listener byte-identik
// dari 02_init.js — perilaku tidak berubah.
// ==========================================
// BOOT — urutan inisialisasi saat DOM siap + listener global
// ==========================================

document.addEventListener('DOMContentLoaded', function () {
  injectModalWaPintar();
  // Terapkan tema SEKARANG (banner/footer/panel sinkron sejak awal, tidak
  // menunggu respons backend yang bisa lambat/gagal). initApp akan
  // memanggil applyTheme lagi dengan data backend kalau berhasil dimuat.
  var savedTheme = null;
  try {
    savedTheme = localStorage.getItem('asj_theme');
  } catch (e) {}
  applyTheme(savedTheme || 'TOKYO');
  refreshDataDinamis(false);

  // admin.html (window.IS_ADMIN_PORTAL) = portal admin khusus.
  // Kalau belum login admin, langsung buka modal login admin supaya
  // halaman benar-benar berfungsi sebagai gerbang panel admin. Kalau
  // sudah login, initApp() sudah otomatis masuk mode admin.
  if (window.IS_ADMIN_PORTAL && localStorage.getItem('asj_admin_login') !== 'sukses') {
    setTimeout(function () {
      if (typeof showLoginAdminMaster === 'function') showLoginAdminMaster();
    }, 500);
  }
});

document.addEventListener('click', function (e) {
  if (e.target.classList.contains('fixed') && e.target.classList.contains('inset-0')) {
    e.target.classList.add('hidden');
  }
});
