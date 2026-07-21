import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { afterEach, describe, expect, it } from 'vitest';
import { normalizeRows } from '../../src/modules/normalization/normalizer.js';
import { ProgressWorkbookReader } from '../../src/modules/uji-petik/progress-workbook-reader.js';
import { aggregateUjiPetikByPpl } from '../../src/modules/uji-petik/uji-petik-aggregator.js';
import type { ProgressWorkbookSource } from '../../src/shared/types/domain.js';
import { baseRawRows } from '../fixtures/raw-rows.js';

let temporaryDirectory: string | null = null;
afterEach(async () => {
  if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true });
  temporaryDirectory = null;
});

async function createProgressFixture(filePath: string): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const progress = workbook.addWorksheet('PROGRES PENDATAAN');
  progress.getCell('A2').value = 'Sumber: FASIH | Diperbarui: 18 Jul 2026';
  progress.getRow(4).values = ['Kode', 'SubSLS', 'Jumlah Prelist Usaha & Keluarga'];
  progress.getRow(6).values = ['1110010001000100', 'SLS A', 10];

  const company = workbook.addWorksheet('USAHA PERUSAHAAN');
  company.getRow(5).values = ['Kode', 'SubSLS', 'Jumlah Prelist Usaha'];
  company.getRow(7).values = ['1110010001000100', 'SLS A', 6];

  const family = workbook.addWorksheet('USAHA KELUARGA');
  family.getRow(5).values = ['Kode', 'SubSLS', 'Ditemukan', 'Tutup', 'Ganda', 'Tidak Ditemukan'];
  family.getRow(7).values = ['1110010001000100', 'SLS A', 2, 0, 0, 1];
  await workbook.xlsx.writeFile(filePath);
}

describe('progress workbook reader', () => {
  it('membaca field terverifikasi berdasarkan header dan mempertahankan kode sebagai teks', async () => {
    temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'segenerator-progress-'));
    const filePath = path.join(temporaryDirectory, 'progress.xlsx');
    await createProgressFixture(filePath);
    const source = await new ProgressWorkbookReader().read(filePath);
    expect(source.updatedLabel).toBe('18 Jul 2026');
    expect(source.sourceHash).toMatch(/^[a-f0-9]{64}$/);
    expect(source.bySubSls.get('1110010001000100')).toEqual({
      kodeSubSls: '1110010001000100',
      targetCombined: 10,
      targetUsaha: 6,
      usahaKeluargaDitemukan: 2,
      usahaKeluargaTidakDitemukan: 1,
    });
  });

  it('menolak workbook yang kehilangan sheet wajib', async () => {
    temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'segenerator-progress-invalid-'));
    const filePath = path.join(temporaryDirectory, 'invalid.xlsx');
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet('PROGRES PENDATAAN');
    await workbook.xlsx.writeFile(filePath);
    await expect(new ProgressWorkbookReader().read(filePath)).rejects.toMatchObject({ code: 'PROGRESS_WORKBOOK_ERROR' });
  });
});

describe('uji petik aggregator', () => {
  it('mengagregasi sumber per email PPL dan tidak menggandakan SubSLS multi-PPL', () => {
    const rows = normalizeRows(baseRawRows, '2026_T1');
    const source: ProgressWorkbookSource = {
      filePath: 'fixture.xlsx',
      sourceHash: 'a'.repeat(64),
      updatedLabel: '18 Jul 2026',
      bySubSls: new Map([
        ['001001', { kodeSubSls: '001001', targetCombined: 10, targetUsaha: 6, usahaKeluargaDitemukan: 2, usahaKeluargaTidakDitemukan: 1 }],
        ['001002', { kodeSubSls: '001002', targetCombined: 0, targetUsaha: 0, usahaKeluargaDitemukan: 0, usahaKeluargaTidakDitemukan: 0 }],
      ]),
    };
    const result = aggregateUjiPetikByPpl(rows, source);
    expect(result.byPpl.get('ani@example.com')).toMatchObject({ targetCombined: 0, targetUsaha: 0, targetKeluarga: 0, matchedSubSls: 1 });
    expect(result.byPpl.has('cici@example.com')).toBe(false);
    expect(result.anomalies.some((item) => item.code === 'UJI_PETIK_MULTI_PPL_UNALLOCATED')).toBe(true);
  });

  it('mendeteksi perbedaan target tetapi tetap memakai workbook progres untuk Uji Petik', () => {
    const [row] = normalizeRows([baseRawRows[0] as Record<string, unknown>], '2026_T1');
    if (!row) throw new Error('Fixture canonical kosong.');
    const source: ProgressWorkbookSource = {
      filePath: 'fixture.xlsx',
      sourceHash: 'b'.repeat(64),
      updatedLabel: null,
      bySubSls: new Map([['001001', { kodeSubSls: '001001', targetCombined: 11, targetUsaha: 6, usahaKeluargaDitemukan: 2, usahaKeluargaTidakDitemukan: 1 }]]),
    };
    const result = aggregateUjiPetikByPpl([row], source);
    expect(result.byPpl.get('ani@example.com')).toMatchObject({ targetCombined: 11, targetUsaha: 6, targetKeluarga: 5, matchedSubSls: 1 });
    expect(result.anomalies[0]?.code).toBe('UJI_PETIK_TARGET_MISMATCH');
    expect(result.anomalies[0]?.severity).toBe('warning');
  });
});
