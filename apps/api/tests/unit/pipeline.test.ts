import { describe, expect, it } from 'vitest';
import { processRawRows } from '../../src/modules/imports/pipeline.js';
import { baseRawRows, duplicateRawRows, targetConflictRows } from '../fixtures/raw-rows.js';

describe('pipeline bisnis', () => {
  it('menghitung target wilayah satu kali per SubSLS dan capaian multi-PPL', () => {
    const result = processRawRows(baseRawRows, '2026_T1');
    expect(result.aggregation.subsls).toHaveLength(2);
    expect(result.aggregation.totalTarget).toBe(10);
    expect(result.aggregation.totalCapaian).toBe(7);
    expect(result.aggregation.percentage).toBe(0.7);
    expect(result.anomalies.some((item) => item.code === 'MULTI_PPL')).toBe(true);
  });

  it('tidak menghitung exact duplicate dua kali', () => {
    const result = processRawRows(duplicateRawRows, '2026_T1');
    expect(result.aggregation.totalCapaian).toBe(7);
    expect(result.anomalies.find((item) => item.code === 'EXACT_DUPLICATE')?.sourceRows).toHaveLength(2);
  });

  it('mendeteksi target conflict tanpa menutupinya', () => {
    const result = processRawRows(targetConflictRows, '2026_T1');
    const conflict = result.anomalies.find((item) => item.code === 'TARGET_CONFLICT');
    expect(conflict?.severity).toBe('critical');
    expect(conflict?.metadata.targets).toEqual([10, 12]);
  });

  it('tidak menghasilkan Infinity untuk target nol', () => {
    const result = processRawRows([{ ...baseRawRows[0], targetPrelistAwal: 0, capaian: 3 }], '2026_T1');
    expect(result.aggregation.percentage).toBeNull();
    expect(result.aggregation.subsls[0]?.status).toBe('CAPAIAN_WITHOUT_TARGET');
  });

  it('menyediakan satu agregat Uji Petik per pplKey meskipun PPL berada di beberapa PML', () => {
    const first = baseRawRows[0];
    if (!first) throw new Error('Fixture kosong.');
    const result = processRawRows([
      first,
      { ...first, no: '2', kodeSubSls: '001002', namaPml: 'PML Kedua', emailPml: 'pml-kedua@example.com', targetPrelistAwal: '5', capaian: '2' },
    ], '2026_T1');
    expect(result.aggregation.pmls).toHaveLength(2);
    expect(result.aggregation.ppls).toHaveLength(1);
    expect(result.aggregation.ppls[0]?.assignedTarget).toBe(15);
    expect(result.aggregation.ppls[0]?.multiPml).toBe(1);
  });
});
