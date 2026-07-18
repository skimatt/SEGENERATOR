import { mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { template1Mapping, template2Mapping } from '../src/config/template-mapping.js';

const outputPath = path.resolve(process.cwd(), '../../templates/LK_PPK.xlsx');
try {
  await access(outputPath);
  process.stdout.write(`Template sudah ada, tidak ditimpa: ${outputPath}\n`);
  process.exit(0);
} catch { /* create bootstrap template */ }

await mkdir(path.dirname(outputPath), { recursive: true });
const workbook = new ExcelJS.Workbook();
workbook.creator = 'Sistem Generator Laporan LK PPK BPS Bireuen';
workbook.created = new Date('2026-01-01T00:00:00.000Z');

const dark = 'FF0F172A';
const teal = 'FF0F766E';
const white = 'FFFFFFFF';
const border: Partial<ExcelJS.Borders> = { top: { style: 'thin', color: { argb: 'FFCBD5E1' } }, bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } }, left: { style: 'thin', color: { argb: 'FFCBD5E1' } }, right: { style: 'thin', color: { argb: 'FFCBD5E1' } } };

function prepare(sheet: ExcelJS.Worksheet, title: string, lastColumn: string, headers: string[]): void {
  sheet.mergeCells(`A1:${lastColumn}1`);
  sheet.getCell('A1').value = title;
  sheet.getCell('A1').font = { name: 'Aptos Display', size: 20, bold: true, color: { argb: white } };
  sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: dark } };
  sheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'left' };
  sheet.getRow(1).height = 38;
  sheet.mergeCells(`A2:${lastColumn}2`);
  sheet.getCell('A2').value = 'Beban Kerja Petugas Lapangan SE2026 • Kabupaten Bireuen, Aceh';
  sheet.getCell('A2').font = { name: 'Aptos', size: 11, color: { argb: 'FF475569' } };
  sheet.getRow(2).height = 24;
  const header = sheet.getRow(4);
  headers.forEach((label, index) => {
    const cell = header.getCell(index + 1);
    cell.value = label;
    cell.font = { name: 'Aptos', size: 10, bold: true, color: { argb: white } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: teal } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = border;
  });
  header.height = 48;
  sheet.properties.defaultRowHeight = 22;
  sheet.pageSetup.paperSize = 9;
  sheet.pageSetup.margins = { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 };
}

const sheet1 = workbook.addWorksheet(template1Mapping.sheetName, { properties: { tabColor: { argb: teal } } });
prepare(sheet1, 'LAPORAN LK TERMIN 1', 'L', ['No', 'Nama PML', 'Email PML', 'Nama PPL', 'Email PPL', 'Kode SubSLS', 'Nama SLS', 'Target', 'Capaian', 'Persentase', 'Status', 'Keterangan']);
[7, 22, 28, 22, 28, 18, 32, 12, 12, 14, 22, 24].forEach((width, index) => { sheet1.getColumn(index + 1).width = width; });

const sheet2 = workbook.addWorksheet(template2Mapping.sheetName, { properties: { tabColor: { argb: 'FFF59E0B' } } });
prepare(sheet2, 'RINGKASAN UJI PETIK', 'AC', ['Stable Key', 'Nama PPL', 'Email PPL', 'Nama PML', 'Email PML', 'Jumlah SubSLS', 'Total Target', 'Total Capaian', 'Persentase', 'Target Kosong', 'Target Nol', 'Belum Ada Capaian', 'Di Bawah Target', 'Sesuai Target', 'Melebihi Target', 'Tanpa Link', 'Reassignment', 'Multi-PML', 'Multi-PPL', 'Hasil Deteksi Sistem', 'Hasil Uji Petik', 'Penyebab', 'Data Pindah', 'Data Ganda', 'Pemeriksa', 'Tanggal Pemeriksaan', 'Tindak Lanjut', 'Dokumentasi', 'Keterangan Lapangan']);
[18, 22, 28, 22, 28, 14, 14, 14, 14, 14, 12, 18, 16, 16, 18, 14, 14, 12, 12, 34, 22, 24, 16, 16, 22, 20, 26, 26, 30].forEach((width, index) => { sheet2.getColumn(index + 1).width = width; });
sheet2.getColumn(1).hidden = true;

await workbook.xlsx.writeFile(outputPath);
process.stdout.write(`Template bootstrap dibuat: ${outputPath}\n`);
