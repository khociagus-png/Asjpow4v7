// ESLint flat config (ESLint 9).
// Fase 3 tuntas (langkah 13): SEMUA file frontend sudah ES Modules dan
// referensi global implisit sudah di-window-kan eksplisit — jadi `no-undef`
// kini AMAN diaktifkan utk file frontend (blok khusus di bawah) dan menangkap
// referensi yang terlewat (contoh nyata: `tr`/`callAPI`/`cekUploadFile` bare
// di js/pages/master_full.js yang bakal ReferenceError saat render langkah
// 2-3 — ketahuan langkah 15). no-unused-vars tetap nonaktif (banyak helper
// di-export utk alias window.* dan dipakai lintas halaman). .mjs (scripts/,
// e2e/) & netlify functions (CommonJS require/module.exports) tetap tanpa
// no-undef — mereka memakai global node sendiri. Prettier yang menangani
// gaya; ESLint di sini menangkap error sintaks/logika murni (contoh nyata:
// 4 key duplikat di i18n.js yang ditemukan no-dupe-keys).
import globals from 'globals';

export default [
  {
    ignores: ['assets/**', 'vendor/**', 'node_modules/**', 'dist/**', '*.html'],
  },
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      // .mjs (scripts/, e2e/) dan test memakai import/export — parse sebagai
      // module. File classic-script (js/*.js) tetap lint-able karena
      // no-undef/no-unused-vars nonaktif (lihat komentar atas).
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      // Error sintaks / struktur yang jelas-jelas bug
      'no-dupe-keys': 'error',
      'no-dupe-args': 'error',
      'no-duplicate-case': 'error',
      'no-unreachable': 'error',
      'no-constant-condition': ['error', { checkLoops: false }],
      // Kesetaraan longgar sering jadi sumber bug (== vs ===)
      eqeqeq: 'warn',
    },
  },
  {
    // Frontend ESM (Fase 3 langkah 15): aktifkan no-undef utk deteksi
    // referensi global yang terlewat — semuanya sudah di-window-kan eksplisit.
    files: ['js/**/*.js', 'api-client.js', 'i18n.js', 'pwa.js'],
    rules: {
      'no-undef': 'error',
    },
  },
];
