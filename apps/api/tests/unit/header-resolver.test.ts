import { describe, expect, it } from 'vitest';
import { rowsToRawRecords } from '../../src/modules/normalization/header-resolver.js';

describe('header resolver', () => {
  it('mencocokkan header berdasarkan nama, bukan posisi', () => {
    const headers = ['Email PML', 'Kode Subsls', 'No', 'Nama SLS', 'Nama PPL', 'Email PPL', 'Nama PML', 'Status PPL Sobat', 'Jenis Mitra', 'Capaian', 'Target Prelist Awal', 'Link Assignment PPL'];
    const [row] = rowsToRawRecords([headers, ['pml@example.com', '001', '1', 'SLS', 'PPL', 'ppl@example.com', 'PML', 'Aktif', 'Mitra', '2', '3', '-']]);
    expect(row?.kodeSubSls).toBe('001');
    expect(row?.emailPml).toBe('pml@example.com');
  });

  it('menerima alias target dengan tanda kurung dari DATA_MENTAH aktual', () => {
    const headers = ['No', 'Kode SubSLS', 'Nama SLS', 'Nama PPL', 'Email PPL', 'Nama PML', 'Email PML', 'Status PPL Sobat', 'Jenis Mitra', 'Capaian', 'Target (Prelist Awal)', 'Link Assignment PPL'];
    const [row] = rowsToRawRecords([headers, ['1', '001', 'SLS', 'PPL', 'ppl@example.com', 'PML', 'pml@example.com', 'Aktif', 'Mitra', '2', '3', '-']]);
    expect(row?.targetPrelistAwal).toBe('3');
  });
});
