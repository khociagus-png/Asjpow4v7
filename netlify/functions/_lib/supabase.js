// supabase.js — klien REST Supabase (PostgREST) untuk backend rebuild.
// Fase 1.3: isi dipindah ke _lib/db/* (client + repositori per tabel); file ini
// tinggal re-export agregat supaya semua pemakai (actions-*, storage.js, e2e)
// tetap jalan tanpa perubahan. Setelah seluruh pemakai migrasi ke db/*
// langsung, file ini bisa dihapus (lihat REFACTOR_TODO.md Fase 1.3).
'use strict';

module.exports = {
  ...require('./db/client'),
  ...require('./db/jobs'),
  ...require('./db/forms'),
  ...require('./db/master'),
  ...require('./db/berkas'),
  ...require('./db/candidates'),
  ...require('./db/misc'),
};
