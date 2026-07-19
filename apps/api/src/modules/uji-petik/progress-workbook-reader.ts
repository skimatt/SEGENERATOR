import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { progressWorkbookMapping, type ProgressSheetFieldMapping, type ProgressSheetMapping } from '../../config/progress-workbook-mapping.js';
import { ProgressWorkbookError } from '../../shared/errors/app-error.js';
import type { ProgressSubSlsMetrics, ProgressWorkbookSource } from '../../shared/types/domain.js';
import { sha256 } from '../../shared/utils/hash.js';

type NumericSourceRow = {
  kodeSubSls: string;
  values: Record<string, number>;
};

function normalizeHeader(value: string): string {
  return value
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('id-ID');
}

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Date) return value.toISOString();
  if ('richText' in value) return value.richText.map((item) => item.text).join('');
  if ('text' in value) return value.text;
  if ('result' in value) return cellText(value.result);
  return '';
}

function resolveColumn(sheet: ExcelJS.Worksheet, field: string, mapping: ProgressSheetFieldMapping): number {
  const aliases = new Set(mapping.aliases.map(normalizeHeader));
  const matches = new Set<number>();
  const columnCount = sheet.actualColumnCount;
  for (const rowNumber of mapping.headerRows) {
    for (let columnNumber = 1; columnNumber <= columnCount; columnNumber += 1) {
      if (aliases.has(normalizeHeader(cellText(sheet.getCell(rowNumber, columnNumber).value)))) matches.add(columnNumber);
    }
  }
  if (matches.size !== 1) {
    throw new ProgressWorkbookError(`Header ${field} pada sheet ${sheet.name} harus ditemukan tepat satu kali.`, {
      field,
      sheetName: sheet.name,
      aliases: mapping.aliases,
      matchedColumns: [...matches],
    });
  }
  const [columnNumber] = matches;
  if (columnNumber === undefined) throw new ProgressWorkbookError(`Kolom ${field} pada sheet ${sheet.name} tidak dapat ditentukan.`);
  return columnNumber;
}

function parseRequiredInteger(value: ExcelJS.CellValue, context: Record<string, unknown>): number {
  const raw = cellText(value).trim();
  if (raw === '' || raw === '-') throw new ProgressWorkbookError('Nilai angka wajib pada workbook progres kosong.', context);
  const parsed = typeof value === 'number' ? value : Number(raw.replace(/\s/g, '').replace(',', '.'));
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new ProgressWorkbookError('Nilai workbook progres harus berupa bilangan bulat nonnegatif.', { ...context, value: raw });
  }
  return parsed;
}

function readSheetRows(workbook: ExcelJS.Workbook, mapping: ProgressSheetMapping): Map<string, NumericSourceRow> {
  const sheet = workbook.getWorksheet(mapping.sheetName);
  if (!sheet) throw new ProgressWorkbookError(`Sheet wajib tidak ditemukan: ${mapping.sheetName}`);
  const columns = Object.fromEntries(Object.entries(mapping.fields).map(([field, fieldMapping]) => [field, resolveColumn(sheet, field, fieldMapping)]));
  const codeColumn = columns.kodeSubSls;
  if (codeColumn === undefined) throw new ProgressWorkbookError(`Mapping kode SubSLS tidak tersedia untuk sheet ${mapping.sheetName}.`);

  const rows = new Map<string, NumericSourceRow>();
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    const codeValue = row.getCell(codeColumn).value;
    if (typeof codeValue !== 'string') return;
    const kodeSubSls = codeValue.trim();
    if (!/^\d{16}$/.test(kodeSubSls)) return;
    if (rows.has(kodeSubSls)) {
      throw new ProgressWorkbookError(`Kode SubSLS duplikat pada sheet ${mapping.sheetName}.`, { kodeSubSls, rowNumber });
    }
    const result: NumericSourceRow = { kodeSubSls, values: {} };
    for (const [field, columnNumber] of Object.entries(columns)) {
      if (field === 'kodeSubSls') continue;
      result.values[field] = parseRequiredInteger(row.getCell(columnNumber).value, { sheetName: mapping.sheetName, rowNumber, field, kodeSubSls });
    }
    rows.set(kodeSubSls, result);
  });
  if (rows.size === 0) throw new ProgressWorkbookError(`Tidak ada kode SubSLS 16 digit pada sheet ${mapping.sheetName}.`);
  return rows;
}

function assertSameCodes(reference: Map<string, NumericSourceRow>, candidate: Map<string, NumericSourceRow>, sheetName: string): void {
  const missing = [...reference.keys()].filter((code) => !candidate.has(code));
  const extra = [...candidate.keys()].filter((code) => !reference.has(code));
  if (missing.length > 0 || extra.length > 0) {
    throw new ProgressWorkbookError(`Daftar SubSLS pada sheet ${sheetName} tidak konsisten dengan PROGRES PENDATAAN.`, {
      missingCount: missing.length,
      extraCount: extra.length,
      missingSample: missing.slice(0, 10),
      extraSample: extra.slice(0, 10),
    });
  }
}

export class ProgressWorkbookReader {
  private cache: { filePath: string; modifiedMs: number; size: number; source: ProgressWorkbookSource } | null = null;

  async read(filePath: string): Promise<ProgressWorkbookSource> {
    const resolvedPath = path.resolve(filePath);
    let fileStat;
    try {
      fileStat = await stat(resolvedPath);
    } catch (error) {
      throw new ProgressWorkbookError(`Workbook progres tidak dapat dibaca: ${resolvedPath}`, error instanceof Error ? error.message : error);
    }
    if (this.cache?.filePath === resolvedPath && this.cache.modifiedMs === fileStat.mtimeMs && this.cache.size === fileStat.size) return this.cache.source;
    let buffer: Buffer;
    try {
      buffer = await readFile(resolvedPath);
    } catch (error) {
      throw new ProgressWorkbookError(`Workbook progres tidak dapat dibaca: ${resolvedPath}`, error instanceof Error ? error.message : error);
    }

    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.readFile(resolvedPath);
    } catch (error) {
      throw new ProgressWorkbookError(`Workbook progres rusak atau bukan XLSX valid: ${resolvedPath}`, error instanceof Error ? error.message : error);
    }

    const progress = readSheetRows(workbook, progressWorkbookMapping.progress);
    const company = readSheetRows(workbook, progressWorkbookMapping.company);
    const familyBusiness = readSheetRows(workbook, progressWorkbookMapping.familyBusiness);
    assertSameCodes(progress, company, progressWorkbookMapping.company.sheetName);
    assertSameCodes(progress, familyBusiness, progressWorkbookMapping.familyBusiness.sheetName);

    const bySubSls = new Map<string, ProgressSubSlsMetrics>();
    for (const [kodeSubSls, progressRow] of progress) {
      const companyRow = company.get(kodeSubSls);
      const familyRow = familyBusiness.get(kodeSubSls);
      if (!companyRow || !familyRow) continue;
      const targetCombined = progressRow.values.targetCombined;
      const targetUsaha = companyRow.values.targetUsaha;
      const usahaKeluargaDitemukan = familyRow.values.usahaKeluargaDitemukan;
      const usahaKeluargaTidakDitemukan = familyRow.values.usahaKeluargaTidakDitemukan;
      if (targetCombined === undefined || targetUsaha === undefined || usahaKeluargaDitemukan === undefined || usahaKeluargaTidakDitemukan === undefined) {
        throw new ProgressWorkbookError('Mapping nilai workbook progres tidak lengkap.', { kodeSubSls });
      }
      if (targetUsaha > targetCombined) {
        throw new ProgressWorkbookError('Target Usaha melebihi Target U&K.', { kodeSubSls, targetCombined, targetUsaha });
      }
      bySubSls.set(kodeSubSls, { kodeSubSls, targetCombined, targetUsaha, usahaKeluargaDitemukan, usahaKeluargaTidakDitemukan });
    }

    const progressSheet = workbook.getWorksheet(progressWorkbookMapping.progress.sheetName);
    const subtitle = progressSheet ? cellText(progressSheet.getCell('A2').value) : '';
    const updatedMatch = subtitle.match(/Diperbarui:\s*([^|]+)/i);
    const source: ProgressWorkbookSource = {
      filePath: resolvedPath,
      sourceHash: sha256(buffer),
      updatedLabel: updatedMatch?.[1]?.trim() ?? null,
      bySubSls,
    };
    this.cache = { filePath: resolvedPath, modifiedMs: fileStat.mtimeMs, size: fileStat.size, source };
    return source;
  }
}
