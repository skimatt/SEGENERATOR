import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { AppConfig } from '../../config/env.js';
import type { PipelineResult, ProcessingMode } from '../../shared/types/domain.js';
import { sha256 } from '../../shared/utils/hash.js';

export type SnapshotRecord = {
  snapshotId: string;
  spreadsheetId: string;
  sheetName: string;
  importedAt: string;
  rowCount: number;
  sourceHash: string;
  templateHash: string | null;
  generatedBy: string;
  applicationVersion: string;
  processingMode: ProcessingMode;
  filePath: string;
};

export class SnapshotService {
  constructor(private readonly config: AppConfig) {}

  async save(spreadsheetId: string, sheetName: string, pipeline: PipelineResult, mode: ProcessingMode): Promise<SnapshotRecord> {
    const snapshotId = randomUUID();
    const importedAt = new Date().toISOString();
    const sourceHash = sha256(JSON.stringify(pipeline.rawRows));
    await mkdir(this.config.SNAPSHOT_DIR, { recursive: true });
    const filePath = path.resolve(this.config.SNAPSHOT_DIR, `${snapshotId}.json`);
    const record: SnapshotRecord = {
      snapshotId, spreadsheetId, sheetName, importedAt, rowCount: pipeline.rawRows.length,
      sourceHash, templateHash: null, generatedBy: 'local-owner', applicationVersion: '0.1.0',
      processingMode: mode, filePath,
    };
    await writeFile(filePath, JSON.stringify({ metadata: record, rawRows: pipeline.rawRows, canonicalRows: pipeline.rows }, null, 2), 'utf8');
    return record;
  }
}
