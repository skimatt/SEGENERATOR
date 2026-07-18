import { access } from 'node:fs/promises';
import ExcelJS from 'exceljs';
import { buildCellRef } from '../../shared/utils/excel-ref.js';
import { manualTemplate2Fields, template2Mapping } from '../../config/template-mapping.js';

export type ManualValues = Record<(typeof manualTemplate2Fields)[number], ExcelJS.CellValue>;

function column(field: string): string {
  const value = template2Mapping.columns[field];
  if (!value) throw new Error(`Mapping kolom Template 2 tidak ditemukan: ${field}`);
  return value;
}

function stableKeyValue(value: ExcelJS.CellValue): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}

export async function readManualEntries(filePath: string | null): Promise<Map<string, ManualValues>> {
  const entries = new Map<string, ManualValues>();
  if (filePath === null) return entries;
  try { await access(filePath); } catch { return entries; }
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.getWorksheet(template2Mapping.sheetName);
  if (!sheet) return entries;
  for (let rowNumber = template2Mapping.dataStartRow; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const stableKey = stableKeyValue(sheet.getCell(buildCellRef(column('stableKey'), rowNumber)).value);
    if (!stableKey) continue;
    const values = {} as ManualValues;
    for (const field of manualTemplate2Fields) values[field] = sheet.getCell(buildCellRef(column(field), rowNumber)).value;
    entries.set(stableKey, values);
  }
  if (entries.size === 0) {
    const legacyColumns: Partial<Record<(typeof manualTemplate2Fields)[number], string>> = {
      hasilUjiPetik: 'U',
      penyebab: 'V',
      dataPindah: 'W',
      dataGanda: 'X',
      pemeriksa: 'Y',
      tanggalPemeriksaan: 'Z',
      tindakLanjut: 'AA',
      dokumentasi: 'AB',
      keteranganLapangan: 'AC',
    };
    for (let rowNumber = 5; rowNumber <= sheet.rowCount; rowNumber += 1) {
      const stableKey = stableKeyValue(sheet.getCell(`A${rowNumber}`).value);
      if (!stableKey.includes('::')) continue;
      const values = {} as ManualValues;
      for (const field of manualTemplate2Fields) {
        const legacyColumn = legacyColumns[field];
        values[field] = legacyColumn ? sheet.getCell(`${legacyColumn}${rowNumber}`).value : null;
      }
      entries.set(stableKey, values);
    }
  }
  return entries;
}
