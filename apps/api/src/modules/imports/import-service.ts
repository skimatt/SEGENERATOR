import type { PrismaClient, Prisma } from '@prisma/client';
import type { AppConfig } from '../../config/env.js';
import type { PipelineResult, ProcessingMode } from '../../shared/types/domain.js';
import { sha256 } from '../../shared/utils/hash.js';
import { GoogleSheetsReader } from '../sheets/google-sheets-reader.js';
import { SnapshotService } from '../snapshots/snapshot-service.js';
import { processRawRows } from './pipeline.js';
import { detectSnapshotChanges } from '../anomalies/anomaly-detector.js';
import type { CanonicalRow } from '../../shared/types/domain.js';

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export class ImportService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly config: AppConfig,
    private readonly sheetsReader = new GoogleSheetsReader(config),
    private readonly snapshotService = new SnapshotService(config),
  ) {}

  async importFromGoogleSheets(mode: ProcessingMode, period: string): Promise<{ importId: string; snapshotId: string; pipeline: PipelineResult }> {
    const source = await this.sheetsReader.read();
    const pipeline = processRawRows(source.rawRows, period);
    const previous = await this.prisma.import.findFirst({
      where: { dataSource: { spreadsheetId: source.spreadsheetId, sheetName: source.sheetName } },
      orderBy: { importedAt: 'desc' }, include: { normalizedRows: { orderBy: { sourceRowNumber: 'asc' } } },
    });
    if (previous) pipeline.anomalies.push(...detectSnapshotChanges(pipeline.rows, previous.normalizedRows.map((item) => item.canonical as unknown as CanonicalRow)));
    const snapshot = await this.snapshotService.save(source.spreadsheetId, source.sheetName, pipeline, mode);
    const persisted = await this.prisma.$transaction(async (transaction) => {
      const dataSource = await transaction.dataSource.upsert({
        where: { spreadsheetId_sheetName: { spreadsheetId: source.spreadsheetId, sheetName: source.sheetName } },
        update: {}, create: { spreadsheetId: source.spreadsheetId, sheetName: source.sheetName },
      });
      const imported = await transaction.import.create({
        data: { dataSourceId: dataSource.id, snapshotId: snapshot.snapshotId, period, sourceHash: snapshot.sourceHash, rowCount: pipeline.rawRows.length, mode, status: 'validated' },
      });
      await transaction.rawRow.createMany({ data: pipeline.rawRows.map((raw, index) => ({ importId: imported.id, sourceRowNumber: index + 2, raw: json(raw) })) });
      await transaction.normalizedRow.createMany({ data: pipeline.rows.map((row) => ({ importId: imported.id, sourceRowNumber: row.sourceRowNumber, fingerprint: row.fingerprint, canonical: json(row) })) });
      await transaction.anomaly.createMany({ data: pipeline.anomalies.map((item) => ({ importId: imported.id, code: item.code, severity: item.severity, message: item.message, entityType: item.entityType, entityKey: item.entityKey, sourceRows: item.sourceRows, metadata: json(item.metadata) })) });
      await transaction.snapshot.create({ data: { id: snapshot.snapshotId, spreadsheetId: snapshot.spreadsheetId, sheetName: snapshot.sheetName, importedAt: new Date(snapshot.importedAt), rowCount: snapshot.rowCount, sourceHash: snapshot.sourceHash, templateHash: snapshot.templateHash, generatedBy: snapshot.generatedBy, appVersion: snapshot.applicationVersion, processingMode: snapshot.processingMode, filePath: snapshot.filePath } });
      await transaction.auditLog.create({ data: { level: 'info', module: 'imports', action: 'google-sheets-import', message: 'Import Google Sheets berhasil.', metadata: json({ importId: imported.id, snapshotId: snapshot.snapshotId, rowCount: pipeline.rawRows.length, anomalyCount: pipeline.anomalies.length, sourceHash: sha256(JSON.stringify(pipeline.rawRows)) }) } });
      return imported;
    }, { maxWait: 10_000, timeout: 60_000 });
    return { importId: persisted.id, snapshotId: snapshot.snapshotId, pipeline };
  }

  async get(importId: string) {
    return this.prisma.import.findUnique({ where: { id: importId }, include: { dataSource: true, anomalies: true, normalizedRows: { orderBy: { sourceRowNumber: 'asc' } }, reports: true } });
  }

  async latest() {
    return this.prisma.import.findFirst({ orderBy: { importedAt: 'desc' }, include: { dataSource: true, anomalies: true, normalizedRows: { orderBy: { sourceRowNumber: 'asc' } }, reports: { orderBy: { generatedAt: 'desc' } } } });
  }
}
