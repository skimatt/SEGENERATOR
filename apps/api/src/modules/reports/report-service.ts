import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Prisma, PrismaClient } from '@prisma/client';
import type { AppConfig } from '../../config/env.js';
import type { Anomaly, CanonicalRow, PipelineResult, ProcessingMode } from '../../shared/types/domain.js';
import { DataConflictError, ReportGenerationError } from '../../shared/errors/app-error.js';
import { sha256 } from '../../shared/utils/hash.js';
import { aggregateRows } from '../aggregation/aggregation-engine.js';
import { detectAnomalies } from '../anomalies/anomaly-detector.js';
import { readManualEntries } from '../excel/manual-preservation.js';
import { renderWorkbook } from '../excel/excel-renderer.js';
import { ProgressWorkbookReader } from '../uji-petik/progress-workbook-reader.js';
import { aggregateUjiPetikByPpl } from '../uji-petik/uji-petik-aggregator.js';

const strictBlockingCodes = new Set(['SUBSLS_CODE_MISSING', 'TARGET_CONFLICT', 'NUMBER_PARSE_ERROR', 'IDENTITY_UNRESOLVED']);

export function isStrictBlockingCode(code: string): boolean {
  return strictBlockingCodes.has(code);
}

function json(value: unknown): Prisma.InputJsonValue { return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue; }

function filename(period: string, now = new Date()): string {
  const timestamp = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(now).replace(/[-: ]/g, '');
  return `LK_PPK_BIREUEN_${period.replace(/[^A-Za-z0-9_-]/g, '_')}_${timestamp}.xlsx`;
}

export class ReportService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly config: AppConfig,
    private readonly progressWorkbookReader = new ProgressWorkbookReader(),
  ) {}

  async generate(importId: string, mode: ProcessingMode) {
    const imported = await this.prisma.import.findUnique({ where: { id: importId }, include: { normalizedRows: { orderBy: { sourceRowNumber: 'asc' } }, rawRows: { orderBy: { sourceRowNumber: 'asc' } }, anomalies: true } });
    if (!imported) throw new ReportGenerationError('Import tidak ditemukan.');
    const rows = imported.normalizedRows.map((item) => item.canonical as unknown as CanonicalRow);
    const currentAnomalies = detectAnomalies(rows);
    const persistedAnomalies = imported.anomalies as unknown as Anomaly[];
    const anomalyKeys = new Set(currentAnomalies.map((item) => `${item.code}:${item.entityKey}:${item.sourceRows.join(',')}`));
    const anomalies = [...currentAnomalies, ...persistedAnomalies.filter((item) => !anomalyKeys.has(`${item.code}:${item.entityKey}:${item.sourceRows.join(',')}`))];
    const progressSource = await this.progressWorkbookReader.read(this.config.PROGRESS_WORKBOOK_PATH);
    const ujiPetik = aggregateUjiPetikByPpl(rows, progressSource);
    anomalies.push(...ujiPetik.anomalies);
    const blocking = anomalies.filter((item) => isStrictBlockingCode(item.code));
    if (mode === 'strict' && blocking.length > 0) throw new DataConflictError('Laporan strict tidak dibuat karena terdapat anomali pemblokir.', { anomalies: blocking });
    const pipeline: PipelineResult = { period: imported.period, rawRows: imported.rawRows.map((item) => item.raw as Record<string, unknown>), rows, aggregation: aggregateRows(rows), anomalies };
    const previous = await this.prisma.report.findFirst({ where: { status: 'completed' }, orderBy: { generatedAt: 'desc' } });
    const manual = await readManualEntries(previous?.filePath ?? null);
    await mkdir(this.config.REPORT_OUTPUT_DIR, { recursive: true });
    const reportFilename = filename(imported.period);
    const outputPath = path.resolve(this.config.REPORT_OUTPUT_DIR, reportFilename);
    const report = await this.prisma.report.create({ data: { importId, filename: reportFilename, filePath: outputPath, warningCount: anomalies.filter((item) => item.severity === 'warning').length, errorCount: anomalies.filter((item) => item.severity === 'error' || item.severity === 'critical').length, status: 'generating' } });
    try {
      await renderWorkbook(path.resolve(this.config.REPORT_TEMPLATE_PATH), outputPath, pipeline, manual, mode === 'permissive', ujiPetik.byPpl);
      const fileHash = sha256(await readFile(outputPath));
      const completed = await this.prisma.report.update({ where: { id: report.id }, data: { status: 'completed', fileHash } });
      if (manual.size > 0) await this.prisma.reportManualEntry.createMany({ data: [...manual.entries()].map(([stableKey, values]) => ({ reportId: report.id, stableKey, values: json(values) })) });
      await this.prisma.auditLog.create({ data: { level: 'info', module: 'reports', action: 'generate', message: 'Laporan Excel berhasil dibuat.', metadata: json({ reportId: report.id, importId, mode, filename: reportFilename, fileHash, preservedManualEntries: manual.size, progressWorkbookHash: ujiPetik.sourceHash, progressWorkbookUpdatedLabel: ujiPetik.updatedLabel, ujiPetikMatchedPpl: ujiPetik.byPpl.size, ujiPetikAnomalyCount: ujiPetik.anomalies.length }) } });
      return completed;
    } catch (error) {
      await this.prisma.report.update({ where: { id: report.id }, data: { status: 'failed' } });
      await this.prisma.auditLog.create({ data: { level: 'error', module: 'reports', action: 'generate', message: 'Pembuatan laporan Excel gagal.', metadata: json({ reportId: report.id, importId, error: error instanceof Error ? error.message : String(error) }) } });
      throw error;
    }
  }

  async list() { return this.prisma.report.findMany({ orderBy: { generatedAt: 'desc' }, take: 50 }); }
  async get(reportId: string) { return this.prisma.report.findUnique({ where: { id: reportId } }); }
}
