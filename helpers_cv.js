// ==========================================
// HELPERS CV RIREKISHO (pure logic — tanpa DOM)
// ==========================================
// Dipisah dari renderCVAjaib (10_cv_rirekisho.js) supaya bisa di-unit-test
// tanpa jsdom/global. Memuat di window sebagai global (helpers_cv, getPath,
// isGood, makeV, fmtMonthYearJp) dan dipakai renderCVAjaib.

(function () {
  'use strict';

  function getPath(obj, path) {
    return path.split('.').reduce((o, k) => (o || {})[k], obj);
  }

  function isGood(val) {
    return val !== undefined && val !== null && String(val).trim() !== '' && String(val).trim() !== '-';
  }

  // Pencari data dengan prioritas: (a) objek utama d (nested + flat), (b) ai
  // (AIDATAJSON), lalu '-'. Dibuat lewat factory supaya test bisa injeksi d & ai.
  function makeV(d, ai) {
    ai = ai || {};
    const getAi = (path) => {
      let val = getPath(ai, path);
      return (val && String(val).trim() !== '') ? String(val).trim() : null;
    };
    return function v(...keys) {
      for (let k of keys) {
        if (k.includes('.')) {
          let val = getPath(d, k);
          if (isGood(val)) return String(val).trim();
          let aiVal = getAi(k);
          if (aiVal) return aiVal;
        } else {
          // coba langsung (lowercase di d), lalu uppercase, lalu ai
          if (d[k] !== undefined && isGood(d[k])) return String(d[k]).trim();
          let cleanKey = String(k).toUpperCase().replace(/[^A-Z0-9]/g, '');
          if (d[cleanKey] !== undefined && isGood(d[cleanKey])) return String(d[cleanKey]).trim();
          let aiVal = getAi(k);
          if (aiVal) return aiVal;
        }
      }
      return '-';
    };
  }

  // Format Tahun & Bulan ala Jepang (2012年7月)
  // Regex dulu supaya akurat (tanpa pergeseran timezone):
  //   "2012"               -> 2012年
  //   "2012-07"/"2012/7"   -> 2012年7月
  //   "2001-06-30T17:00:00.000Z" -> 2001年6月
  function fmtMonthYearJp(str) {
    if (!str || str === '-') return '';
    let s = String(str).trim();
    if (/^\d{4}$/.test(s)) return s + '年';
    let m = s.match(/^(\d{4})[-/](\d{1,2})/);
    if (m) return m[1] + '年' + parseInt(m[2], 10) + '月';
    let dt = new Date(s);
    if (isNaN(dt)) return s;
    return dt.getFullYear() + '年' + (dt.getMonth() + 1) + '月';
  }

  // Ekspos global (gaya modul plain script yang dipakai proyek)
  if (typeof window !== 'undefined') {
    window.getPath = getPath;
    window.isGood = isGood;
    window.makeV = makeV;
    window.fmtMonthYearJp = fmtMonthYearJp;
    window.helpers_cv = { getPath, isGood, makeV, fmtMonthYearJp };
  }
  // Ekspor CommonJS untuk vitest (test meng-import modul ini)
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getPath, isGood, makeV, fmtMonthYearJp };
  }
})();
