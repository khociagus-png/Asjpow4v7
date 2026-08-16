// ==========================================
// TESTS: actions-mail — transisi status mail inbox + appendFeedback.
// MENUNGGU = lamaran baru; UPDATE = kandidat mengubah data setelah pernah
// diproses (progres LULUS/GAGAL tidak di-reset) — ini alur inti mail sync.
// ==========================================
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { mailStatusUntukUpdate, appendFeedback } = require('./actions-mail.js');

describe('mailStatusUntukUpdate — transisi status saat biodata/berkas diubah', () => {
  it('baris belum diproses (MENUNGGU/MAIL/BARU/PENDING) tetap MENUNGGU', () => {
    expect(mailStatusUntukUpdate('MENUNGGU')).toBe('MENUNGGU');
    expect(mailStatusUntukUpdate('MAIL')).toBe('MENUNGGU');
    expect(mailStatusUntukUpdate('BARU')).toBe('MENUNGGU');
    expect(mailStatusUntukUpdate('PENDING')).toBe('MENUNGGU');
    expect(mailStatusUntukUpdate('')).toBe('MENUNGGU');
  });

  it('baris sudah diproses admin → UPDATE (progres tidak di-reset)', () => {
    expect(mailStatusUntukUpdate('LULUS')).toBe('UPDATE');
    expect(mailStatusUntukUpdate('GAGAL')).toBe('UPDATE');
    expect(mailStatusUntukUpdate('REVIEW')).toBe('UPDATE');
    expect(mailStatusUntukUpdate('APPROVED')).toBe('UPDATE');
    expect(mailStatusUntukUpdate('REJECTED')).toBe('UPDATE');
  });

  it('case-insensitive (input bebas huruf besar/kecil)', () => {
    expect(mailStatusUntukUpdate('lulus')).toBe('UPDATE');
    expect(mailStatusUntukUpdate('menunggu')).toBe('MENUNGGU');
  });
});

describe('appendFeedback — riwayat aktivitas terakhir (maks 3 entri)', () => {
  it('entri baru ditaruh paling depan', () => {
    expect(appendFeedback('', '[BIODATA] email diubah')).toBe('[BIODATA] email diubah');
    expect(appendFeedback('[BIODATA] email diubah', '[UPLOAD KTP]')).toBe(
      '[UPLOAD KTP] · [BIODATA] email diubah',
    );
  });

  it('maks 3 entri — yang paling lama dibuang', () => {
    expect(appendFeedback('[A] · [B] · [C]', '[D]')).toBe('[D] · [A] · [B]');
  });

  it('spasi ganda / pemisah kosong dibersihkan', () => {
    expect(appendFeedback('[A]  ·  ', '[B]')).toBe('[B] · [A]');
  });
});
