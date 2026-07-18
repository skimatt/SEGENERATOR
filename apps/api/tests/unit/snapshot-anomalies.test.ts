import { describe, expect, it } from 'vitest';
import { normalizeRows } from '../../src/modules/normalization/normalizer.js';
import { detectSnapshotChanges } from '../../src/modules/anomalies/anomaly-detector.js';
import { baseRawRows } from '../fixtures/raw-rows.js';

describe('anomali antar-snapshot', () => {
  it('mendeteksi perubahan target dan petugas', () => {
    const base = baseRawRows[0];
    if (!base) throw new Error('Fixture kosong.');
    const previous = normalizeRows([base], '2026_T1');
    const current = normalizeRows([{ ...base, targetPrelistAwal: 12, namaPpl: 'Dedi', emailPpl: 'dedi@example.com' }], '2026_T1');
    const codes = detectSnapshotChanges(current, previous).map((item) => item.code);
    expect(codes).toEqual(expect.arrayContaining(['TARGET_CHANGED_SNAPSHOT', 'OFFICER_CHANGED_SNAPSHOT']));
  });
});
