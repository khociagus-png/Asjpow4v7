// ==========================================
// TESTS: isVarianOf & stemAliases (actions-extra.js)
// Alur upload harus MENIMPA file lama per tipe dokumen: varian bertimestamp
// (KK_1786683312223.pdf) maupun polos (KK.jpg) ikut dihapus sebelum upload
// baru, supaya tombol KK/KTP/CV di share view tidak pernah dobel.
// ==========================================
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { isVarianOf, stemAliases } = require('./actions-extra.js');

describe('isVarianOf', () => {
  it('varian bertimestamp terdeteksi (KK_1786….pdf milik stem KK)', () => {
    expect(isVarianOf('KK_1786683312223.pdf', 'KK')).toBe(true);
    expect(isVarianOf('KTP_1786700397069.pdf', 'KTP')).toBe(true);
    expect(isVarianOf('CVFILE_1786683307401.xlsx', 'CVFILE')).toBe(true);
  });

  it('varian polos terdeteksi (KK.jpg, KTP.png)', () => {
    expect(isVarianOf('KK.jpg', 'KK')).toBe(true);
    expect(isVarianOf('KTP.png', 'KTP')).toBe(true);
  });

  it('stem berbeda tidak tertabrak (KTP bukan varian KK)', () => {
    expect(isVarianOf('KTP_1786683311216.pdf', 'KK')).toBe(false);
    expect(isVarianOf('KK_1786683312223.pdf', 'KTP')).toBe(false);
    expect(isVarianOf('CVFILE_1786.pdf', 'CV')).toBe(false);
  });

  it('alias ikut tertabrak via stemAliases (KARTU_KELUARGA = KK)', () => {
    const stems = ['KK'].concat(stemAliases('KK'));
    expect(stems.some((s) => isVarianOf('KARTU_KELUARGA_123.pdf', s))).toBe(true);
  });

  it('nama kosong / stem kosong aman', () => {
    expect(isVarianOf('', 'KK')).toBe(false);
    expect(isVarianOf('KK.pdf', '')).toBe(false);
  });
});

describe('stemAliases', () => {
  it('KK <-> KARTU_KELUARGA, PHOTOFILE <-> PAS_PHOTO/FOTO', () => {
    expect(stemAliases('KK')).toContain('KARTU_KELUARGA');
    expect(stemAliases('KARTU_KELUARGA')).toContain('KK');
    expect(stemAliases('PHOTOFILE')).toContain('PAS_PHOTO');
    expect(stemAliases('PAS_PHOTO')).toContain('PHOTOFILE');
  });

  it('CV / CVFILE / CV_REVISI saling alias', () => {
    expect(stemAliases('CV')).toContain('CVFILE');
    expect(stemAliases('CVFILE')).toContain('CV');
    expect(stemAliases('CV_REVISI')).toContain('CV');
  });

  it('stem tanpa alias mengembalikan array kosong', () => {
    expect(stemAliases('KTP')).toEqual([]);
  });
});
