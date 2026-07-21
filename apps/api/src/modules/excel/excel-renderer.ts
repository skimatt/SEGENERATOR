import ExcelJS from 'exceljs';
import type { Anomaly, CanonicalRow, PipelineResult, PplAggregate, SubSlsAggregate, UjiPetikPplMetrics } from '../../shared/types/domain.js';
import { TemplateError } from '../../shared/errors/app-error.js';
import { buildCellRef, buildRange } from '../../shared/utils/excel-ref.js';
import { manualTemplate2Fields, sourceBackedManualFields, template1Mapping, template2Mapping } from '../../config/template-mapping.js';
import type { ManualValues } from './manual-preservation.js';

type CellStyleSnapshot = {
  column: number;
  style: Partial<ExcelJS.Style>;
};

type RowStyleSnapshot = {
  height: number | undefined;
  cells: CellStyleSnapshot[];
};

const officialNoteFallback = 'Catatan Penting:\n[1] Realisasi bersumber dari Fasih yang berstatus selain Open dan Draf.\n[2] Assignment baru (temuan baru) dihitung sebagai realisasi.\n[3] Periksa seluruh anomali pada dashboard sebelum laporan digunakan.';

function set(sheet: ExcelJS.Worksheet, column: string, row: number, value: ExcelJS.CellValue): void {
  sheet.getCell(buildCellRef(column, row)).value = value;
}

function mapped(columns: Record<string, string>, field: string): string {
  const value = columns[field];
  if (!value) throw new TemplateError(`Mapping kolom tidak ditemukan: ${field}`);
  return value;
}

function snapshotRowStyle(sheet: ExcelJS.Worksheet, rowNumber: number, firstColumn: number, lastColumn: number): RowStyleSnapshot {
  const row = sheet.getRow(rowNumber);
  const cells: CellStyleSnapshot[] = [];
  for (let column = firstColumn; column <= lastColumn; column += 1) {
    cells.push({ column, style: structuredClone(row.getCell(column).style) });
  }
  return { height: row.height, cells };
}

function applyRowStyle(sheet: ExcelJS.Worksheet, rowNumber: number, snapshot: RowStyleSnapshot): void {
  const row = sheet.getRow(rowNumber);
  if (snapshot.height !== undefined) row.height = snapshot.height;
  for (const cellSnapshot of snapshot.cells) row.getCell(cellSnapshot.column).style = structuredClone(cellSnapshot.style);
}

function clearRowsFrom(sheet: ExcelJS.Worksheet, startRow: number): void {
  for (const range of [...sheet.model.merges]) {
    const rowNumbers = range.match(/\d+/g)?.map(Number) ?? [];
    if (rowNumbers.some((rowNumber) => rowNumber >= startRow)) sheet.unMergeCells(range);
  }
  if (sheet.rowCount >= startRow) sheet.spliceRows(startRow, sheet.rowCount - startRow + 1);
}

function detectionFor(ppl: PplAggregate, anomalies: Anomaly[]): string {
  const sourceRows = new Set(ppl.subsls.flatMap((sub) => sub.contributors.map((contributor) => contributor.sourceRowNumber)));
  const codes = [...new Set(anomalies
    .filter((item) => item.entityKey === ppl.pplKey || item.sourceRows.some((sourceRow) => sourceRows.has(sourceRow)))
    .map((item) => item.code))];
  return codes.length === 0 ? 'Tidak ada anomali terdeteksi' : codes.join(', ');
}

function splitSubSlsCode(code: string): { kecamatan: string; desa: string; sls: string } {
  if (/^\d{16}$/.test(code)) return { kecamatan: code.slice(4, 7), desa: code.slice(7, 10), sls: code.slice(10, 14) };
  return { kecamatan: '', desa: '', sls: code };
}

function contributionFor(subsls: SubSlsAggregate, pplKey: string, pmlKey: string, sourceRows: Map<number, CanonicalRow>): number {
  return subsls.contributors.reduce((total, contributor) => {
    const source = sourceRows.get(contributor.sourceRowNumber);
    return source?.pplKey === pplKey && source.pmlKey === pmlKey ? total + contributor.capaian : total;
  }, 0);
}

function mergeVertical(sheet: ExcelJS.Worksheet, column: string, startRow: number, endRow: number): void {
  if (endRow > startRow) sheet.mergeCells(buildRange(column, startRow, column, endRow));
}

function alignTemplate1Detail(sheet: ExcelJS.Worksheet, rowNumber: number): void {
  for (const column of ['B', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N']) {
    sheet.getCell(`${column}${rowNumber}`).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  }
  for (const column of ['C', 'D', 'E', 'F']) {
    sheet.getCell(`${column}${rowNumber}`).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
  }
  sheet.getCell(`O${rowNumber}`).alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
}

function stylePmlSubtotal(sheet: ExcelJS.Worksheet, rowNumber: number): void {
  for (let column = 2; column <= 14; column += 1) {
    const cell = sheet.getRow(rowNumber).getCell(column);
    cell.font = { ...cell.font, bold: true, color: { argb: 'FF1F2937' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: column >= 11 ? 'FFD9EAD3' : 'FFF2F2F2' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  }
}

function styleGrandTotal(sheet: ExcelJS.Worksheet, rowNumber: number): void {
  for (let column = 2; column <= 15; column += 1) {
    const cell = sheet.getRow(rowNumber).getCell(column);
    cell.font = { ...cell.font, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  }
  sheet.getRow(rowNumber).height = 24;
}

function styleCountSummaryRow(sheet: ExcelJS.Worksheet, rowNumber: number, emphasized: boolean): void {
  const fillColor = emphasized ? 'FFD9EAD3' : 'FFF2F2F2';
  for (let column = 2; column <= 15; column += 1) {
    const cell = sheet.getRow(rowNumber).getCell(column);
    cell.font = { ...cell.font, bold: true, color: { argb: 'FF1F2937' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
    cell.alignment = { horizontal: column <= 10 ? 'left' : 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF64748B' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FF64748B' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  }
  sheet.getRow(rowNumber).height = 22;
}

function renderCountSummaryRow(sheet: ExcelJS.Worksheet, rowNumber: number, label: string, formula: string, emphasized = false): void {
  set(sheet, 'B', rowNumber, label);
  sheet.mergeCells(buildRange('B', rowNumber, 'J', rowNumber));
  set(sheet, 'K', rowNumber, { formula });
  sheet.mergeCells(buildRange('K', rowNumber, 'O', rowNumber));
  sheet.getCell(`K${rowNumber}`).numFmt = '#,##0';
  styleCountSummaryRow(sheet, rowNumber, emphasized);
}

function percentageFormula(numerator: string, denominator: string): ExcelJS.CellFormulaValue {
  return { formula: `IF(OR(${denominator}="",${denominator}=0),"",${numerator}/${denominator}*100)` };
}

function optionalPercentageFormula(numerator: string, denominator: string): ExcelJS.CellFormulaValue {
  return { formula: `IF(OR(${numerator}="",${denominator}="",${denominator}=0),"",${numerator}/${denominator}*100)` };
}

function uniqueTargetSumFormula(startRow: number, endRow: number, flagColumn: string): ExcelJS.CellFormulaValue {
  return { formula: `IF(COUNT(K${startRow}:K${endRow})=0,"",SUMIF(${flagColumn}${startRow}:${flagColumn}${endRow},1,K${startRow}:K${endRow}))` };
}

function flaggedCapaianSumFormula(startRow: number, endRow: number): ExcelJS.CellFormulaValue {
  return { formula: `SUMIF(R${startRow}:R${endRow},1,L${startRow}:L${endRow})` };
}

function styleTemplate2DataRow(sheet: ExcelJS.Worksheet, rowNumber: number): void {
  for (let column = 1; column <= 23; column += 1) {
    const cell = sheet.getRow(rowNumber).getCell(column);
    const columnLetter = sheet.getColumn(column).letter;
    cell.font = { ...cell.font, name: 'Calibri', size: 10, color: { argb: 'FF1F2937' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    };
    cell.alignment = { horizontal: ['B', 'C', 'P', 'Q', 'W'].includes(columnLetter) ? 'left' : 'center', vertical: 'middle', wrapText: true };
  }
  sheet.getRow(rowNumber).height = 30;
}

function styleTemplate2Header(sheet: ExcelJS.Worksheet, permissive: boolean): void {
  sheet.getCell('A1').value = permissive ? 'SE2026 — RINGKASAN UJI PETIK PER PPL — PERLU VERIFIKASI' : 'SE2026 — RINGKASAN UJI PETIK PER PPL';
  sheet.getCell('A1').font = { name: 'Calibri', size: 14, bold: true, color: { argb: permissive ? 'FF991B1B' : 'FF111827' } };
  sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
  sheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 26;

  for (let row = 2; row <= 3; row += 1) {
    for (let column = 1; column <= 23; column += 1) {
      const cell = sheet.getRow(row).getCell(column);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: row === 2 ? 'FFE5E7EB' : 'FFF3F4F6' } };
      cell.font = { name: 'Calibri', size: row === 2 ? 10 : 9, bold: true, color: { argb: 'FF111827' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF9CA3AF' } },
        left: { style: 'thin', color: { argb: 'FF9CA3AF' } },
        bottom: { style: 'thin', color: { argb: 'FF9CA3AF' } },
        right: { style: 'thin', color: { argb: 'FF9CA3AF' } },
      };
    }
  }
  sheet.getRow(2).height = 28;
  sheet.getRow(3).height = 24;
}

function styleTemplate2Summary(sheet: ExcelJS.Worksheet, rowNumber: number): void {
  for (let column = 1; column <= 23; column += 1) {
    const cell = sheet.getRow(rowNumber).getCell(column);
    const columnLetter = sheet.getColumn(column).letter;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF111827' } };
    cell.alignment = { horizontal: ['B', 'P', 'W'].includes(columnLetter) ? 'left' : 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF6B7280' } },
      left: { style: 'thin', color: { argb: 'FF9CA3AF' } },
      bottom: { style: 'medium', color: { argb: 'FF6B7280' } },
      right: { style: 'thin', color: { argb: 'FF9CA3AF' } },
    };
  }
  sheet.getRow(rowNumber).height = 32;
}

function hasManualValue(value: ExcelJS.CellValue | undefined): boolean {
  if (value === null || value === undefined) return false;
  return typeof value !== 'string' || value.trim() !== '';
}

function sameScalarValue(left: ExcelJS.CellValue | undefined, right: ExcelJS.CellValue | undefined): boolean {
  if (left === null || left === undefined || right === null || right === undefined) return false;
  if ((typeof left === 'string' || typeof left === 'number' || typeof left === 'boolean') && (typeof right === 'string' || typeof right === 'number' || typeof right === 'boolean')) {
    return String(left).trim() === String(right).trim();
  }
  return false;
}

function setSemanticFill(cell: ExcelJS.Cell, automatic: boolean): void {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
  if (!automatic) cell.font = { ...cell.font, italic: true };
}

function validIdentitiesFirst<T>(items: T[], identity: (item: T) => string | null): T[] {
  const isValid = (item: T): boolean => {
    const value = identity(item)?.trim();
    return value !== undefined && value !== '' && value !== '-';
  };
  return [...items.filter(isValid), ...items.filter((item) => !isValid(item))];
}

function renderTemplate1(sheet: ExcelJS.Worksheet, pipeline: PipelineResult, permissive: boolean): void {
  const detailStyle = snapshotRowStyle(sheet, 8, 2, 22);
  const subtotalStyle = snapshotRowStyle(sheet, 402, 2, 22);
  const officialNote = structuredClone(sheet.getCell('O8').value ?? officialNoteFallback);
  clearRowsFrom(sheet, template1Mapping.dataStartRow);

  const sourceRows = new Map(pipeline.rows.map((row) => [row.sourceRowNumber, row]));
  const countedTargetKeys = new Set<string>();
  const countedPplKeys = new Set<string>();
  const detailRows: number[] = [];
  let rowNumber = template1Mapping.dataStartRow;
  let pplSequence = 1;

  for (const pml of validIdentitiesFirst(pipeline.aggregation.pmls, (item) => item.namaPml)) {
    const pmlStart = rowNumber;
    const countedPmlTargetKeys = new Set<string>();
    let isFirstPmlDetail = true;
    for (const ppl of validIdentitiesFirst(pml.ppls, (item) => item.namaPpl)) {
      const pplStart = rowNumber;
      const isUniquePpl = !countedPplKeys.has(ppl.pplKey);
      countedPplKeys.add(ppl.pplKey);
      let isFirstPplDetail = true;
      for (const subsls of ppl.subsls) {
        applyRowStyle(sheet, rowNumber, detailStyle);
        const code = splitSubSlsCode(subsls.kodeSubSls);
        const uniqueTargetFlag = countedTargetKeys.has(subsls.subslsKey) ? 0 : 1;
        countedTargetKeys.add(subsls.subslsKey);
        const pmlUniqueTargetFlag = countedPmlTargetKeys.has(subsls.subslsKey) ? 0 : 1;
        countedPmlTargetKeys.add(subsls.subslsKey);
        set(sheet, mapped(template1Mapping.columns, 'no'), rowNumber, rowNumber === pplStart ? pplSequence : null);
        set(sheet, mapped(template1Mapping.columns, 'namaPml'), rowNumber, pml.namaPml);
        set(sheet, mapped(template1Mapping.columns, 'emailPml'), rowNumber, pml.emailPml);
        set(sheet, mapped(template1Mapping.columns, 'namaPpl'), rowNumber, ppl.namaPpl);
        set(sheet, mapped(template1Mapping.columns, 'emailPpl'), rowNumber, ppl.emailPpl);
        set(sheet, mapped(template1Mapping.columns, 'kodeKecamatan'), rowNumber, code.kecamatan);
        set(sheet, mapped(template1Mapping.columns, 'kodeDesa'), rowNumber, code.desa);
        set(sheet, mapped(template1Mapping.columns, 'kodeSls'), rowNumber, code.sls);
        set(sheet, mapped(template1Mapping.columns, 'target'), rowNumber, subsls.target);
        set(sheet, mapped(template1Mapping.columns, 'capaian'), rowNumber, contributionFor(subsls, ppl.pplKey, pml.pmlKey, sourceRows));
        set(sheet, mapped(template1Mapping.columns, 'percentage'), rowNumber, percentageFormula(`L${rowNumber}`, `K${rowNumber}`));
        set(sheet, mapped(template1Mapping.columns, 'subslsKey'), rowNumber, subsls.subslsKey);
        set(sheet, mapped(template1Mapping.columns, 'uniqueTargetFlag'), rowNumber, uniqueTargetFlag);
        set(sheet, mapped(template1Mapping.columns, 'detailFlag'), rowNumber, 1);
        set(sheet, mapped(template1Mapping.columns, 'pmlUniqueTargetFlag'), rowNumber, pmlUniqueTargetFlag);
        set(sheet, mapped(template1Mapping.columns, 'uniquePplFlag'), rowNumber, isFirstPplDetail && isUniquePpl ? 1 : 0);
        set(sheet, mapped(template1Mapping.columns, 'pplGroupFlag'), rowNumber, isFirstPplDetail ? 1 : 0);
        set(sheet, mapped(template1Mapping.columns, 'pmlGroupFlag'), rowNumber, isFirstPmlDetail ? 1 : 0);
        for (const column of ['G', 'H', 'I', 'P']) sheet.getCell(`${column}${rowNumber}`).numFmt = '@';
        sheet.getCell(`M${rowNumber}`).numFmt = '0.00';
        alignTemplate1Detail(sheet, rowNumber);
        detailRows.push(rowNumber);
        isFirstPplDetail = false;
        isFirstPmlDetail = false;
        rowNumber += 1;
      }

      const pplEnd = rowNumber - 1;
      if (pplEnd >= pplStart) {
        set(sheet, mapped(template1Mapping.columns, 'percentageSls'), pplStart, { formula: `IFERROR(COUNTIF(L${pplStart}:L${pplEnd},">0")/ROWS(L${pplStart}:L${pplEnd})*100,0)` });
        set(sheet, mapped(template1Mapping.columns, 'percentagePpl'), pplStart, percentageFormula(`SUM(L${pplStart}:L${pplEnd})`, `SUM(K${pplStart}:K${pplEnd})`));
        sheet.getCell(`J${pplStart}`).numFmt = '0.00';
        sheet.getCell(`N${pplStart}`).numFmt = '0.00';
        for (const column of ['B', 'E', 'F', 'J', 'N']) mergeVertical(sheet, column, pplStart, pplEnd);
        pplSequence += 1;
      }
    }

    const pmlDetailEnd = rowNumber - 1;
    if (pmlDetailEnd >= pmlStart) {
      mergeVertical(sheet, 'C', pmlStart, pmlDetailEnd);
      mergeVertical(sheet, 'D', pmlStart, pmlDetailEnd);
      applyRowStyle(sheet, rowNumber, subtotalStyle);
      set(sheet, 'B', rowNumber, `Subtotal PML: ${pml.namaPml ?? pml.pmlKey}`);
      sheet.mergeCells(buildRange('B', rowNumber, 'J', rowNumber));
      set(sheet, 'K', rowNumber, uniqueTargetSumFormula(pmlStart, pmlDetailEnd, 'S'));
      set(sheet, 'L', rowNumber, flaggedCapaianSumFormula(pmlStart, pmlDetailEnd));
      set(sheet, 'M', rowNumber, percentageFormula(`L${rowNumber}`, `K${rowNumber}`));
      sheet.getCell(`M${rowNumber}`).numFmt = '0.00';
      set(sheet, 'R', rowNumber, 0);
      set(sheet, 'S', rowNumber, 0);
      stylePmlSubtotal(sheet, rowNumber);
      rowNumber += 1;
    }
  }

  const lastBodyRow = rowNumber - 1;
  applyRowStyle(sheet, rowNumber, subtotalStyle);
  set(sheet, 'B', rowNumber, 'Jumlah');
  sheet.mergeCells(buildRange('B', rowNumber, 'J', rowNumber));
  set(sheet, 'K', rowNumber, uniqueTargetSumFormula(template1Mapping.dataStartRow, lastBodyRow, 'Q'));
  set(sheet, 'L', rowNumber, flaggedCapaianSumFormula(template1Mapping.dataStartRow, lastBodyRow));
  set(sheet, 'M', rowNumber, percentageFormula(`L${rowNumber}`, `K${rowNumber}`));
  set(sheet, 'N', rowNumber, { formula: `IFERROR(COUNTIF(L${template1Mapping.dataStartRow}:L${lastBodyRow},">0")/${detailRows.length}*100,0)` });
  set(sheet, 'O', rowNumber, { formula: `IF(M${rowNumber}="","Perlu verifikasi target",IF(M${rowNumber}>=40,"Bisa Dibayar karena lebih dari 40%","Belum memenuhi 40%"))` });
  sheet.getCell(`M${rowNumber}`).numFmt = '0.00';
  sheet.getCell(`N${rowNumber}`).numFmt = '0.00';
  styleGrandTotal(sheet, rowNumber);
  const totalRow = rowNumber;
  const totalPmlRow = totalRow + 1;
  const totalUniquePplRow = totalRow + 2;
  const totalPplGroupRow = totalRow + 3;
  renderCountSummaryRow(sheet, totalPmlRow, 'Total PML', `SUM(V${template1Mapping.dataStartRow}:V${lastBodyRow})`);
  renderCountSummaryRow(sheet, totalUniquePplRow, 'Total PPL Unik (berdasarkan identity key)', `SUM(T${template1Mapping.dataStartRow}:T${lastBodyRow})`);
  renderCountSummaryRow(sheet, totalPplGroupRow, 'Total Kelompok PPL–PML (sesuai nomor terakhir)', `SUM(U${template1Mapping.dataStartRow}:U${lastBodyRow})`, true);
  sheet.getRow(totalRow).addPageBreak(2, 15);
  const finalRow = totalPplGroupRow;

  if (detailRows.length > 0) {
    const noteEnd = Math.min(25, lastBodyRow);
    set(sheet, 'O', template1Mapping.dataStartRow, permissive ? `PERLU VERIFIKASI\n\n${officialNoteFallback}` : officialNote);
    mergeVertical(sheet, 'O', template1Mapping.dataStartRow, noteEnd);
  }

  for (const column of ['P', 'Q', 'R', 'S', 'T', 'U', 'V']) {
    sheet.getColumn(column).hidden = true;
    sheet.getColumn(column).width = column === 'P' ? 32 : 4;
  }
  sheet.pageSetup.printArea = buildRange('B', 2, 'O', finalRow);
  sheet.pageSetup.printTitlesRow = '5:7';
  sheet.pageSetup.orientation = 'landscape';
  sheet.pageSetup.fitToPage = true;
  sheet.pageSetup.fitToWidth = 1;
  sheet.pageSetup.fitToHeight = 0;
  // ExcelJS menulis pageSetUpPr sebelum outlinePr. Urutan itu ditolak Microsoft
  // Excel, jadi metadata outline bawaan template dihapus karena sheet ini tidak
  // memakai row/column grouping. Fit-to-page tetap dipertahankan.
  delete (sheet.properties as { outlineProperties?: { summaryBelow: boolean; summaryRight: boolean } }).outlineProperties;
  sheet.views = [{ state: 'normal', showGridLines: true, zoomScale: 65 }];
  sheet.headerFooter = { ...sheet.headerFooter, oddFooter: '&L LK PPK BPS Bireuen&C Halaman &P dari &N&R &D' };
  if (sheet.rowCount > finalRow) sheet.spliceRows(finalRow + 1, sheet.rowCount - finalRow);
}

function renderTemplate2(sheet: ExcelJS.Worksheet, pipeline: PipelineResult, manual: Map<string, ManualValues>, permissive: boolean, ujiPetikByPpl: Map<string, UjiPetikPplMetrics>): void {
  const detailStyle = snapshotRowStyle(sheet, 4, 1, 23);
  clearRowsFrom(sheet, template2Mapping.dataStartRow);
  styleTemplate2Header(sheet, permissive);
  sheet.getCell('P2').value = 'KETERANGAN HASIL UJI PETIK';
  sheet.mergeCells('P2:P3');
  sheet.getCell('P2').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  sheet.getCell('S2').value = 'REALISASI OTOMATIS';
  sheet.getCell('U2').value = 'REALISASI MANUAL';
  sheet.getCell('D3').note = 'Target U&K bersumber dari PROGRES PENDATAAN agar konsisten dengan Target Usaha dan Target Keluarga. Perbedaan dengan DATA_MENTAH2 tetap dicatat sebagai anomali audit.';
  sheet.getCell('E3').note = 'Target Usaha bersumber dari sheet USAHA PERUSAHAAN dan dijumlahkan berdasarkan SubSLS milik PPL.';
  sheet.getCell('F3').note = 'Target Keluarga dihitung sebagai Target U&K dikurangi Target Usaha per SubSLS.';
  sheet.getCell('G3').note = 'Definisi UMKM ditemukan belum dapat dipetakan secara pasti dari workbook progres; tetap input manual.';
  sheet.getCell('H3').note = 'Workbook progres tidak menyediakan UMKM tak ditemukan secara eksplisit; tetap input manual.';
  sheet.getCell('J3').note = 'Usaha Keluarga ditemukan bersumber dari sheet USAHA KELUARGA.';
  sheet.getCell('K3').note = 'Usaha Keluarga tak ditemukan bersumber dari sheet USAHA KELUARGA.';
  sheet.getCell('M3').note = 'Keluarga ditemukan/tak ditemukan tidak tersedia eksplisit pada workbook progres; tetap input manual.';
  sheet.getCell('P2').note = 'Isi penjelasan hasil uji petik secara bebas. Nilai dipertahankan berdasarkan stable key saat laporan dibuat ulang.';
  sheet.getCell('U3').note = 'Kolom realisasi kategori kedua bersifat manual dan dipertahankan saat generate ulang.';
  const hiddenHeaders = Object.entries(template2Mapping.columns).filter(([, column]) => column.length > 1 || ['X', 'Y', 'Z'].includes(column));
  for (const [field, column] of hiddenHeaders) set(sheet, column, template2Mapping.headerRow, field);

  let rowNumber = template2Mapping.dataStartRow;
  let sequence = 1;
  for (const ppl of validIdentitiesFirst(pipeline.aggregation.ppls, (item) => item.namaPpl)) {
    applyRowStyle(sheet, rowNumber, detailStyle);
    const stableKey = `${pipeline.period}::${ppl.pplKey}`;
    const progressMetrics = ujiPetikByPpl.get(ppl.pplKey);
    const autoValues: Record<string, ExcelJS.CellValue> = {
      no: sequence,
      namaPpl: ppl.namaPpl,
      namaPml: ppl.namaPml,
      target: progressMetrics?.targetCombined ?? null,
      umkmTotal: { formula: `IF(COUNTA(G${rowNumber}:H${rowNumber})=0,"",SUM(G${rowNumber}:H${rowNumber}))` },
      usahaKeluargaTotal: { formula: `IF(COUNTA(J${rowNumber}:K${rowNumber})=0,"",SUM(J${rowNumber}:K${rowNumber}))` },
      keluargaTotal: { formula: `IF(COUNTA(M${rowNumber}:N${rowNumber})=0,"",SUM(M${rowNumber}:N${rowNumber}))` },
      capaian: ppl.totalCapaian,
      percentage: percentageFormula(`S${rowNumber}`, `D${rowNumber}`),
      percentageKategoriLain: optionalPercentageFormula(`U${rowNumber}`, `D${rowNumber}`),
      stableKey,
      emailPpl: ppl.emailPpl,
      emailPml: ppl.emailPml,
      jumlahSubSls: ppl.subsls.length,
      targetMissing: ppl.targetMissing,
      targetZero: ppl.targetZero,
      noProgress: ppl.noProgress,
      belowTarget: ppl.belowTarget,
      onTarget: ppl.onTarget,
      aboveTarget: ppl.aboveTarget,
      missingLink: ppl.missingLink,
      reassignments: ppl.reassignments,
      multiPml: ppl.multiPml,
      multiPpl: ppl.multiPpl,
      detection: detectionFor(ppl, pipeline.anomalies),
      progressSourceHash: progressMetrics?.sourceHash ?? null,
      progressMatchedSubSls: progressMetrics?.matchedSubSls ?? 0,
    };
    for (const [field, value] of Object.entries(autoValues)) set(sheet, mapped(template2Mapping.columns, field), rowNumber, value);
    const prior = manual.get(stableKey);
    const sourceBackedValues: Partial<Record<(typeof manualTemplate2Fields)[number], ExcelJS.CellValue>> = progressMetrics ? {
      targetUsaha: progressMetrics.targetUsaha,
      targetKeluarga: progressMetrics.targetKeluarga,
      usahaKeluargaDitemukan: progressMetrics.usahaKeluargaDitemukan,
      usahaKeluargaTidakDitemukan: progressMetrics.usahaKeluargaTidakDitemukan,
    } : {};
    for (const [field, auditField] of Object.entries(sourceBackedManualFields)) {
      set(sheet, mapped(template2Mapping.columns, auditField), rowNumber, sourceBackedValues[field as keyof typeof sourceBackedManualFields] ?? null);
    }
    for (const field of manualTemplate2Fields) {
      const preserved = prior?.[field];
      const sourceValue = sourceBackedValues[field];
      const usePreserved = hasManualValue(preserved) && !sameScalarValue(preserved, sourceValue);
      set(sheet, mapped(template2Mapping.columns, field), rowNumber, usePreserved ? preserved ?? null : sourceValue ?? null);
    }
    sheet.getCell(`A${rowNumber}`).numFmt = '0';
    for (const column of ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'S', 'U']) sheet.getCell(`${column}${rowNumber}`).numFmt = '0';
    for (const column of ['T', 'V']) sheet.getCell(`${column}${rowNumber}`).numFmt = '0.00';
    for (const column of ['G', 'H', 'M', 'N', 'U']) {
      sheet.getCell(`${column}${rowNumber}`).dataValidation = {
        type: 'whole',
        operator: 'greaterThanOrEqual',
        allowBlank: true,
        showErrorMessage: true,
        errorTitle: 'Nilai tidak valid',
        error: 'Masukkan bilangan bulat nol atau lebih besar.',
        formulae: [0],
      };
    }
    sheet.getCell(`R${rowNumber}`).numFmt = 'dd/mm/yyyy';
    styleTemplate2DataRow(sheet, rowNumber);
    for (const field of ['targetUsaha', 'targetKeluarga', 'usahaKeluargaDitemukan', 'usahaKeluargaTidakDitemukan'] as const) {
      const preserved = prior?.[field];
      const sourceValue = sourceBackedValues[field];
      const usePreserved = hasManualValue(preserved) && !sameScalarValue(preserved, sourceValue);
      setSemanticFill(sheet.getCell(`${mapped(template2Mapping.columns, field)}${rowNumber}`), !usePreserved && sourceValue !== undefined);
    }
    rowNumber += 1;
    sequence += 1;
  }

  const lastDataRow = rowNumber - 1;
  const summaryRow = rowNumber + 1;
  set(sheet, 'A', summaryRow, 'TOTAL');
  set(sheet, 'B', summaryRow, { formula: `COUNTA(B${template2Mapping.dataStartRow}:B${lastDataRow})&" PPL"` });
  for (const column of ['D', 'E', 'F', 'J', 'K', 'L', 'S']) {
    set(sheet, column, summaryRow, { formula: `SUM(${column}${template2Mapping.dataStartRow}:${column}${lastDataRow})` });
    sheet.getCell(`${column}${summaryRow}`).numFmt = '#,##0';
  }
  for (const column of ['G', 'H', 'I', 'M', 'N', 'O', 'U']) {
    set(sheet, column, summaryRow, { formula: `IF(COUNT(${column}${template2Mapping.dataStartRow}:${column}${lastDataRow})=0,"",SUM(${column}${template2Mapping.dataStartRow}:${column}${lastDataRow}))` });
    sheet.getCell(`${column}${summaryRow}`).numFmt = '#,##0';
  }
  set(sheet, 'P', summaryRow, { formula: `COUNTA(P${template2Mapping.dataStartRow}:P${lastDataRow})&" terisi"` });
  set(sheet, 'T', summaryRow, percentageFormula(`S${summaryRow}`, `D${summaryRow}`));
  set(sheet, 'V', summaryRow, { formula: `IF(COUNT(U${template2Mapping.dataStartRow}:U${lastDataRow})=0,"",IF(OR(D${summaryRow}="",D${summaryRow}=0),"",U${summaryRow}/D${summaryRow}*100))` });
  sheet.getCell(`T${summaryRow}`).numFmt = '0.00';
  sheet.getCell(`V${summaryRow}`).numFmt = '0.00';
  set(sheet, 'W', summaryRow, 'Kolom tanpa sumber terverifikasi disembunyikan');
  styleTemplate2Summary(sheet, summaryRow);
  for (let column = 24; column <= 49; column += 1) {
    sheet.getColumn(column).hidden = true;
    sheet.getColumn(column).width = column === 24 ? 34 : 16;
  }
  sheet.getColumn('A').width = 5.5;
  for (const [column, width] of [
    ['B', 24], ['C', 22], ['D', 11], ['E', 11], ['F', 11],
    ['J', 13], ['K', 14], ['L', 11], ['P', 38], ['S', 12], ['T', 11],
  ] as const) {
    sheet.getColumn(column).hidden = false;
    sheet.getColumn(column).width = width;
  }
  for (const column of ['G', 'H', 'I', 'M', 'N', 'O', 'Q', 'R', 'U', 'V', 'W']) sheet.getColumn(column).hidden = true;
  sheet.views = [{ state: 'frozen', ySplit: 3, showGridLines: false, activeCell: 'A4' }];
  sheet.pageSetup.printArea = buildRange('A', 1, 'T', summaryRow);
  sheet.pageSetup.printTitlesRow = '1:3';
  sheet.pageSetup.orientation = 'landscape';
  sheet.pageSetup.paperSize = 9;
  sheet.pageSetup.fitToPage = true;
  sheet.pageSetup.fitToWidth = 1;
  sheet.pageSetup.fitToHeight = 0;
  sheet.headerFooter = { ...sheet.headerFooter, oddFooter: '&L Uji Petik SE2026&C Halaman &P dari &N&R &D' };
  if (sheet.rowCount > summaryRow) sheet.spliceRows(summaryRow + 1, sheet.rowCount - summaryRow);
}

export async function renderWorkbook(templatePath: string, outputPath: string, pipeline: PipelineResult, manual: Map<string, ManualValues>, permissive: boolean, ujiPetikByPpl: Map<string, UjiPetikPplMetrics> = new Map()): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.readFile(templatePath);
  } catch (error) {
    throw new TemplateError(`Template Excel tidak dapat dibaca: ${templatePath}`, error instanceof Error ? error.message : error);
  }
  const sheet1 = workbook.getWorksheet(template1Mapping.sheetName);
  const sheet2 = workbook.getWorksheet(template2Mapping.sheetName);
  if (!sheet1 || !sheet2) throw new TemplateError('Template wajib memiliki sheet "LK Termin 1" dan "Uji Petik".');
  for (const sheet of [...workbook.worksheets]) if (![template1Mapping.sheetName, template2Mapping.sheetName].includes(sheet.name)) workbook.removeWorksheet(sheet.id);
  renderTemplate1(sheet1, pipeline, permissive);
  renderTemplate2(sheet2, pipeline, manual, permissive, ujiPetikByPpl);
  workbook.calcProperties.fullCalcOnLoad = true;
  await workbook.xlsx.writeFile(outputPath);
}
