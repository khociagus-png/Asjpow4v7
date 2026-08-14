// ESLint flat config (ESLint 9).
// Sengaja TIDAK mengaktifkan no-undef/no-unused-vars: project ini classic
// scripts dengan 383 fungsi global yang saling memanggil lintas file, jadi
// rule itu hanya akan menghasilkan ribuan false-positive. Prettier yang
// menangani gaya; ESLint di sini menangkap error sintaks/logika murni
// (contoh nyata: 4 key duplikat di i18n.js yang ditemukan no-dupe-keys).
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
];
