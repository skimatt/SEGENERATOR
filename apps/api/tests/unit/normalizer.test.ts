import { describe, expect, it } from 'vitest';
import { normalizeEmail, normalizeKodeSubSls, normalizeRow, parseCapaian, parseTarget } from '../../src/modules/normalization/normalizer.js';

describe('normalizer', () => {
  it('menormalisasi email tanpa mengubah titik Gmail', () => {
    expect(normalizeEmail(' Test.Name@GMAIL.COM ')).toBe('test.name@gmail.com');
  });

  it('mempertahankan nol di depan kode SubSLS dan hanya membuang .0 dari number', () => {
    expect(normalizeKodeSubSls('001234')).toBe('001234');
    expect(normalizeKodeSubSls(1234.0)).toBe('1234');
    expect(normalizeKodeSubSls('1234.0')).toBe('1234.0');
  });

  it('menerapkan aturan capaian dan target kosong', () => {
    expect(parseCapaian('-').value).toBe(0);
    expect(parseTarget('-').value).toBeNull();
    expect(parseCapaian('-2').warning?.code).toBe('NUMBER_PARSE_ERROR');
    expect(parseTarget('1.5').warning?.code).toBe('NUMBER_PARSE_ERROR');
  });

  it('membangun identity dan assignment key berbasis email', () => {
    const row = normalizeRow({ kodeSubSls: '001', namaPpl: 'Ani', emailPpl: 'ANI@EXAMPLE.COM', namaPml: 'Budi', emailPml: 'BUDI@EXAMPLE.COM', capaian: 1, targetPrelistAwal: 2 }, 2, '2026_T1');
    expect(row.pplKey).toBe('ani@example.com');
    expect(row.pmlKey).toBe('budi@example.com');
    expect(row.assignmentKey).toBe('2026_T1::001::ani@example.com');
    expect(row.subslsKey).toBe('2026_T1::001');
  });

  it('memberi warning saat fallback identitas digunakan', () => {
    const row = normalizeRow({ kodeSubSls: '001', namaPpl: 'Ani', namaPml: 'Budi', capaian: 0, targetPrelistAwal: 2 }, 2, '2026_T1');
    expect(row.warnings.map((item) => item.code)).toEqual(expect.arrayContaining(['PPL_EMAIL_MISSING', 'PML_EMAIL_MISSING']));
    expect(row.pplKey).toContain('ani::pml-fallback-');
  });
});
