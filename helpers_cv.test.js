// ==========================================
// TESTS: public/js/helpers_cv.js (pure logic CV)
// ==========================================
// fmtMonthYearJp: konversi tanggal -> format Jepang (tanpa timezone shift).
// makeV (v()): pencari data dengan prioritas d -> ai -> '-', plus fallback flat
// uppercase legacy.
import { describe, it, expect } from 'vitest';
import { getPath, isGood, makeV, fmtMonthYearJp } from './helpers_cv.js';

describe('fmtMonthYearJp', () => {
  it('tahun polos -> 2012年', () => {
    expect(fmtMonthYearJp('2012')).toBe('2012年');
  });

  it('YYYY-MM -> 2012年7月', () => {
    expect(fmtMonthYearJp('2012-07')).toBe('2012年7月');
  });

  it('YYYY/M -> 2012年7月', () => {
    expect(fmtMonthYearJp('2012/7')).toBe('2012年7月');
  });

  it('timestamp ISO -> 2001年6月 (TANPA pergeseran timezone)', () => {
    // 2001-06-30T17:00:00.000Z harus tetap Juni, bukan Juli (bug timezone lama)
    expect(fmtMonthYearJp('2001-06-30T17:00:00.000Z')).toBe('2001年6月');
  });

  it('kosong / dash -> string kosong', () => {
    expect(fmtMonthYearJp('')).toBe('');
    expect(fmtMonthYearJp('-')).toBe('');
    expect(fmtMonthYearJp(null)).toBe('');
    expect(fmtMonthYearJp(undefined)).toBe('');
  });

  it('nilai bukan tanggal -> dikembalikan apa adanya', () => {
    expect(fmtMonthYearJp('SEKARANG')).toBe('SEKARANG');
    expect(fmtMonthYearJp('2024A')).toBe('2024A');
  });

  it('bulan tanpa padding (single digit) tetap benar', () => {
    expect(fmtMonthYearJp('2019-09')).toBe('2019年9月');
    expect(fmtMonthYearJp('2020-12')).toBe('2020年12月');
  });
});

describe('makeV (v) — prioritas d -> ai -> flat uppercase', () => {
  const d = {
    identitas: { nama_lengkap: 'AGUS KHOCI', tempat_lahir_jp: 'ポノロゴ' },
    wawancara: { hobi_id: 'Membaca', hobi_jp: '読書と水泳' },
    NAMALENGKAP: 'LEGACY NAME',   // key flat uppercase legacy
    GENDER: 'PRIA'
  };
  const ai = {
    wawancara: { hobi_id: 'AI HOBI' },
    identitas: { nama_lengkap: 'AI NAMA' }
  };
  const v = makeV(d, ai);

  it('membaca nilai dari d (path bertitik)', () => {
    expect(v('identitas.nama_lengkap')).toBe('AGUS KHOCI');
    expect(v('wawancara.hobi_jp')).toBe('読書と水泳');
  });

  it('fallback ke ai (AIDATAJSON) jika d kosong', () => {
    const d2 = { identitas: {}, wawancara: {} };
    const v2 = makeV(d2, ai);
    expect(v2('identitas.nama_lengkap')).toBe('AI NAMA'); // dari ai
    expect(v2('wawancara.hobi_id')).toBe('AI HOBI');      // dari ai
  });

  it('key flat uppercase dibaca langsung dari d', () => {
    expect(v('NAMALENGKAP')).toBe('LEGACY NAME');  // d['NAMALENGKAP'] ada -> langsung
  });

  it('key flat tanpa pasangan di d -> cek uppercase clean', () => {
    // GENDER ada di d['GENDER'] -> 'PRIA'
    expect(v('GENDER')).toBe('PRIA');
  });

  it('mengembalikan "-" jika tidak ditemukan di mana pun', () => {
    expect(v('tidak.ada')).toBe('-');
    expect(v('GAKADAKOLOM')).toBe('-');
  });

  it('beberapa key: memakai key pertama yang ketemu', () => {
    expect(v('identitas.tempat_lahir_jp', 'identitas.tempat_lahir')).toBe('ポノロゴ');
    const v2 = makeV({ identitas: {} }, {});
    expect(v2('identitas.tempat_lahir_jp', 'identitas.tempat_lahir')).toBe('-');
  });

  it('nilai "-" dianggap tidak ada (isGood false)', () => {
    const v2 = makeV({ kolom: '-' }, {});
    expect(v2('kolom')).toBe('-');
  });
});

describe('getPath & isGood', () => {
  it('getPath membaca path bertitik dan mengembalikan undefined bila tidak ada', () => {
    expect(getPath({ a: { b: 1 } }, 'a.b')).toBe(1);
    expect(getPath({ a: {} }, 'a.b.c')).toBeUndefined();
  });

  it('isGood menolak kosong, null, undefined, dan "-"', () => {
    expect(isGood('x')).toBe(true);
    expect(isGood(0)).toBe(true);           // 0 valid
    expect(isGood('')).toBe(false);
    expect(isGood(null)).toBe(false);
    expect(isGood(undefined)).toBe(false);
    expect(isGood('-')).toBe(false);
  });
});
