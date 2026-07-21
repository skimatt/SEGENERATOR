import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { afterEach, describe, expect, it } from 'vitest';
import { processRawRows } from '../../src/modules/imports/pipeline.js';
import { renderWorkbook } from '../../src/modules/excel/excel-renderer.js';
import { readManualEntries } from '../../src/modules/excel/manual-preservation.js';
import { baseRawRows } from '../fixtures/raw-rows.js';
import type { UjiPetikPplMetrics } from '../../src/shared/types/domain.js';

let temporaryDirectory: string | null = null;
afterEach(async () => { if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true }); temporaryDirectory = null; });

describe('Excel renderer', () => {
  it('mempertahankan struktur resmi, formula aktif, print area, dan kode teks', async () => {
    temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'segenerator-'));
    const output = path.join(temporaryDirectory, 'report.xlsx');
    const template = path.resolve(process.cwd(), '../../templates/LK PPK  TEMPLATES.xlsx');
    const ujiPetikMetrics = new Map<string, UjiPetikPplMetrics>([['ani@example.com', { pplKey: 'ani@example.com', targetCombined: 10, targetUsaha: 6, targetKeluarga: 4, usahaKeluargaDitemukan: 2, usahaKeluargaTidakDitemukan: 1, matchedSubSls: 2, sourceHash: 'a'.repeat(64) }]]);
    await renderWorkbook(template, output, processRawRows(baseRawRows, '2026_T1'), new Map(), true, ujiPetikMetrics);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(output);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(['LK Termin 1', 'Uji Petik']);
    const termin = workbook.getWorksheet('LK Termin 1');
    const ujiPetik = workbook.getWorksheet('Uji Petik');
    expect(termin).toBeDefined();
    expect(ujiPetik).toBeDefined();
    if (!termin || !ujiPetik) throw new Error('Sheet hasil tidak lengkap.');
    expect(termin.getCell('M8').formula).toBe('IF(OR(K8="",K8=0),"",L8/K8*100)');
    expect(termin.getCell('I8').numFmt).toBe('@');
    expect(termin.pageSetup.printArea).toContain('B2:O');
    expect(termin.getColumn('C').width).toBe(22);
    expect(termin.getCell('B2').value).toBe('Beban Kerja Petugas Lapangan SE2026');
    expect(termin.getCell('B2').isMerged).toBe(true);
    expect(termin.getCell('B5').value).toBe('No');
    expect(termin.getCell('B8').value).toBe(1);
    expect(termin.getCell('B8').isMerged).toBe(true);
    expect(termin.getCell('B10').value).toBe(2);
    expect(termin.getCell('Q8').value).toBe(1);
    expect(termin.getCell('Q10').value).toBe(0);
    expect(termin.getCell('S8').value).toBe(1);
    expect(termin.getCell('S10').value).toBe(0);
    expect(termin.getCell('T8').value).toBe(1);
    expect(termin.getCell('T9').value).toBe(0);
    expect(termin.getCell('T10').value).toBe(1);
    expect(termin.getCell('U8').value).toBe(1);
    expect(termin.getCell('U9').value).toBe(0);
    expect(termin.getCell('U10').value).toBe(1);
    expect(termin.getCell('V8').value).toBe(1);
    expect(termin.getCell('V10').value).toBe(0);
    expect(termin.getCell('K11').formula).toBe('IF(COUNT(K8:K10)=0,"",SUMIF(S8:S10,1,K8:K10))');
    expect(termin.getCell('M11').formula).toBe('IF(OR(K11="",K11=0),"",L11/K11*100)');
    expect(termin.getColumn('S').hidden).toBe(true);
    expect(termin.getColumn('T').hidden).toBe(true);
    expect(termin.getColumn('U').hidden).toBe(true);
    expect(termin.getColumn('V').hidden).toBe(true);
    expect(termin.getCell('B13').value).toBe('Total PML');
    expect(termin.getCell('K13').formula).toBe('SUM(V8:V11)');
    expect(termin.getCell('B14').value).toBe('Total PPL Unik (berdasarkan identity key)');
    expect(termin.getCell('K14').formula).toBe('SUM(T8:T11)');
    expect(termin.getCell('B15').value).toBe('Total Kelompok PPL–PML (sesuai nomor terakhir)');
    expect(termin.getCell('K15').formula).toBe('SUM(U8:U11)');
    expect(termin.pageSetup.printArea).toBe('B2:O15');
    expect(termin.properties.outlineProperties).toBeUndefined();
    expect(termin.pageSetup.fitToPage).toBe(true);
    expect(termin.getCell('E8').alignment.vertical).toBe('middle');
    expect(ujiPetik.getCell('X4').value).toBe('2026_T1::ani@example.com');
    expect(ujiPetik.getCell('T4').formula).toBe('IF(OR(D4="",D4=0),"",S4/D4*100)');
    expect(ujiPetik.getCell('I4').formula).toContain('COUNTA');
    expect(ujiPetik.getColumn('X').hidden).toBe(true);
    expect(ujiPetik.getColumn('A').width).toBe(5.5);
    expect(ujiPetik.getColumn('S').hidden).toBe(false);
    expect(ujiPetik.getColumn('T').hidden).toBe(false);
    expect(ujiPetik.getColumn('G').hidden).toBe(true);
    expect(ujiPetik.getColumn('I').hidden).toBe(true);
    expect(ujiPetik.getColumn('M').hidden).toBe(true);
    expect(ujiPetik.getColumn('R').hidden).toBe(true);
    expect(ujiPetik.getColumn('P').hidden).toBe(false);
    expect(ujiPetik.getColumn('U').hidden).toBe(true);
    expect(ujiPetik.getColumn('W').hidden).toBe(true);
    expect(ujiPetik.getCell('S2').value).toBe('REALISASI OTOMATIS');
    expect(ujiPetik.getCell('P2').value).toBe('KETERANGAN HASIL UJI PETIK');
    expect(ujiPetik.getCell('P2').isMerged).toBe(true);
    expect(ujiPetik.getCell('P4').dataValidation).toBeUndefined();
    expect(ujiPetik.getCell('U2').value).toBe('REALISASI MANUAL');
    expect(ujiPetik.getCell('A1').value).toBe('SE2026 — RINGKASAN UJI PETIK PER PPL — PERLU VERIFIKASI');
    expect(ujiPetik.getCell('S4').fill).toMatchObject({ fgColor: { argb: 'FFFFFFFF' } });
    expect(ujiPetik.getCell('D4').value).toBe(10);
    expect(ujiPetik.getCell('E4').value).toBe(6);
    expect(ujiPetik.getCell('F4').value).toBe(4);
    expect(ujiPetik.getCell('J4').value).toBe(2);
    expect(ujiPetik.getCell('K4').value).toBe(1);
    expect(ujiPetik.getCell('E4').fill).toMatchObject({ fgColor: { argb: 'FFFFFFFF' } });
    expect(ujiPetik.getCell('AR4').value).toBe('a'.repeat(64));
    expect(ujiPetik.getCell('AT4').value).toBe(6);
    expect(ujiPetik.getColumn('AR').hidden).toBe(true);
    expect(ujiPetik.getColumn('AT').hidden).toBe(true);
    expect(ujiPetik.pageSetup.printArea).toContain('A1:T');
    expect(ujiPetik.getCell('E4').note).toBeUndefined();
    expect(ujiPetik.views[0]?.state).toBe('frozen');
    expect(termin.getTables()).toHaveLength(0);
    expect(ujiPetik.getTables()).toHaveLength(0);
  });

  it('mempertahankan input manual dengan stable key saat generate ulang', async () => {
    temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'segenerator-manual-'));
    const first = path.join(temporaryDirectory, 'first.xlsx');
    const second = path.join(temporaryDirectory, 'second.xlsx');
    const template = path.resolve(process.cwd(), '../../templates/LK PPK  TEMPLATES.xlsx');
    const pipeline = processRawRows(baseRawRows, '2026_T1');
    const ujiPetikMetrics = new Map<string, UjiPetikPplMetrics>([['ani@example.com', { pplKey: 'ani@example.com', targetCombined: 10, targetUsaha: 6, targetKeluarga: 4, usahaKeluargaDitemukan: 2, usahaKeluargaTidakDitemukan: 1, matchedSubSls: 2, sourceHash: 'a'.repeat(64) }]]);
    await renderWorkbook(template, first, pipeline, new Map(), false, ujiPetikMetrics);
    const edited = new ExcelJS.Workbook();
    await edited.xlsx.readFile(first);
    const editableSheet = edited.getWorksheet('Uji Petik');
    if (!editableSheet) throw new Error('Sheet Uji Petik tidak ditemukan.');
    editableSheet.getCell('P4').value = 'Data usaha sudah sesuai setelah pemeriksaan lapangan.';
    editableSheet.getCell('Q4').value = 'Rahmat Mulia';
    editableSheet.getCell('E4').value = 7;
    await edited.xlsx.writeFile(first);
    const manual = await readManualEntries(first);
    expect(manual.get('2026_T1::ani@example.com')?.targetUsaha).toBe(7);
    expect(manual.get('2026_T1::ani@example.com')?.targetKeluarga).toBeNull();
    await renderWorkbook(template, second, pipeline, manual, false, ujiPetikMetrics);
    const regenerated = new ExcelJS.Workbook();
    await regenerated.xlsx.readFile(second);
    expect(regenerated.getWorksheet('Uji Petik')?.getCell('P4').value).toBe('Data usaha sudah sesuai setelah pemeriksaan lapangan.');
    expect(regenerated.getWorksheet('Uji Petik')?.getCell('Q4').value).toBe('Rahmat Mulia');
    expect(regenerated.getWorksheet('Uji Petik')?.getCell('E4').value).toBe(7);
    expect(regenerated.getWorksheet('Uji Petik')?.getCell('E4').fill).toMatchObject({ fgColor: { argb: 'FFFFFFFF' } });
    expect(regenerated.getWorksheet('Uji Petik')?.getCell('E4').font.italic).toBe(true);
    expect(regenerated.getWorksheet('Uji Petik')?.getCell('F4').fill).toMatchObject({ fgColor: { argb: 'FFFFFFFF' } });
  });

  it('memisahkan target unik regional dari target unik per PML', async () => {
    temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'segenerator-pml-target-'));
    const output = path.join(temporaryDirectory, 'report.xlsx');
    const template = path.resolve(process.cwd(), '../../templates/LK PPK  TEMPLATES.xlsx');
    const first = baseRawRows[0];
    if (!first) throw new Error('Fixture kosong.');
    const secondPml = {
      ...first,
      no: '2',
      namaPpl: 'Cici',
      emailPpl: 'cici@example.com',
      namaPml: 'PML Kedua',
      emailPml: 'pml-kedua@example.com',
      capaian: '3',
    };
    const pipeline = processRawRows([first, secondPml], '2026_T1');

    await renderWorkbook(template, output, pipeline, new Map(), false);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(output);
    const termin = workbook.getWorksheet('LK Termin 1');
    if (!termin) throw new Error('Sheet LK Termin 1 tidak ditemukan.');
    expect(termin.getCell('Q8').value).toBe(1);
    expect(termin.getCell('Q10').value).toBe(0);
    expect(termin.getCell('S8').value).toBe(1);
    expect(termin.getCell('S10').value).toBe(1);
    expect(termin.getCell('K9').formula).toBe('IF(COUNT(K8:K8)=0,"",SUMIF(S8:S8,1,K8:K8))');
    expect(termin.getCell('K11').formula).toBe('IF(COUNT(K10:K10)=0,"",SUMIF(S10:S10,1,K10:K10))');
    expect(termin.getCell('K12').formula).toBe('IF(COUNT(K8:K11)=0,"",SUMIF(Q8:Q11,1,K8:K11))');
  });

  it('membedakan PPL unik dari kelompok penomoran lintas PML', async () => {
    temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'segenerator-ppl-count-'));
    const output = path.join(temporaryDirectory, 'report.xlsx');
    const template = path.resolve(process.cwd(), '../../templates/LK PPK  TEMPLATES.xlsx');
    const first = baseRawRows[0];
    if (!first) throw new Error('Fixture kosong.');
    const samePplSecondPml = {
      ...first,
      no: '2',
      kodeSubSls: '001002',
      namaPml: 'PML Kedua',
      emailPml: 'pml-kedua@example.com',
      targetPrelistAwal: '5',
      capaian: '2',
    };

    await renderWorkbook(template, output, processRawRows([first, samePplSecondPml], '2026_T1'), new Map(), false);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(output);
    const termin = workbook.getWorksheet('LK Termin 1');
    if (!termin) throw new Error('Sheet LK Termin 1 tidak ditemukan.');
    expect(termin.getCell('B8').value).toBe(1);
    expect(termin.getCell('B10').value).toBe(2);
    expect(termin.getCell('T8').value).toBe(1);
    expect(termin.getCell('T10').value).toBe(0);
    expect(termin.getCell('U8').value).toBe(1);
    expect(termin.getCell('U10').value).toBe(1);
    expect(termin.getCell('V8').value).toBe(1);
    expect(termin.getCell('V10').value).toBe(1);
    expect(workbook.getWorksheet('Uji Petik')?.getCell('D4').value).toBeNull();
  });
});
