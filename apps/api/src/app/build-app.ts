import path from 'node:path';
import { createReadStream } from 'node:fs';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import type { AppConfig } from '../config/env.js';
import { AppError } from '../shared/errors/app-error.js';
import type { CanonicalRow, ProcessingMode } from '../shared/types/domain.js';
import { aggregateRows } from '../modules/aggregation/aggregation-engine.js';
import { ImportService } from '../modules/imports/import-service.js';
import { ReportService } from '../modules/reports/report-service.js';
import { success } from './response.js';

const modeSchema = z.enum(['strict', 'permissive']);
const importBodySchema = z.object({ mode: modeSchema.optional(), period: z.string().min(1).max(80).optional() });
const reportBodySchema = z.object({ importId: z.string().min(1), mode: modeSchema.optional() });

export function buildApp(config: AppConfig, prisma: PrismaClient) {
  const app = Fastify({ logger: { level: config.NODE_ENV === 'test' ? 'silent' : 'info', redact: ['req.headers.authorization', 'GOOGLE_PRIVATE_KEY'] }, bodyLimit: 1_000_000 });
  const imports = new ImportService(prisma, config);
  const reports = new ReportService(prisma, config);

  app.register(cors, { origin: config.WEB_ORIGIN });
  app.register(helmet);
  app.register(rateLimit, { max: 60, timeWindow: '1 minute' });

  app.setErrorHandler((error, request, reply) => {
    const appError = error instanceof AppError ? error : new AppError('INTERNAL_ERROR', 'Terjadi kesalahan internal yang tidak terduga.', 500);
    request.log.error({ err: error, code: appError.code, details: appError.details }, appError.message);
    void reply.status(appError.statusCode).send({ success: false, data: null, error: { code: appError.code, message: appError.message, details: appError.details } });
  });

  app.get('/api/health', async () => {
    await prisma.$queryRaw`SELECT 1`;
    return success({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
  });

  app.post('/api/imports/google-sheets', async (request, reply) => {
    const parsed = importBodySchema.parse(request.body ?? {});
    const mode: ProcessingMode = parsed.mode ?? config.DEFAULT_PROCESSING_MODE;
    const result = await imports.importFromGoogleSheets(mode, parsed.period ?? config.REPORT_PERIOD);
    return reply.status(201).send(success({ importId: result.importId, snapshotId: result.snapshotId, stats: {
      rows: result.pipeline.rows.length, pml: result.pipeline.aggregation.pmls.length,
      ppl: result.pipeline.aggregation.pmls.reduce((total, pml) => total + pml.ppls.length, 0),
      subsls: result.pipeline.aggregation.subsls.length, target: result.pipeline.aggregation.totalTarget,
      capaian: result.pipeline.aggregation.totalCapaian, percentage: result.pipeline.aggregation.percentage,
      anomalies: result.pipeline.anomalies.length,
    } }));
  });

  app.get('/api/imports/:id', async (request) => {
    const { id } = request.params as { id: string };
    return success(await imports.get(id));
  });

  app.post('/api/imports/:id/validate', async (request) => {
    const { id } = request.params as { id: string };
    const imported = await imports.get(id);
    return success({ importId: id, valid: imported !== null && !imported.anomalies.some((item) => ['critical', 'error'].includes(item.severity)), anomalies: imported?.anomalies ?? [] });
  });

  app.get('/api/imports/:id/anomalies', async (request) => {
    const { id } = request.params as { id: string };
    return success(await prisma.anomaly.findMany({ where: { importId: id }, orderBy: [{ severity: 'asc' }, { code: 'asc' }] }));
  });

  app.get('/api/dashboard', async () => {
    const latest = await imports.latest();
    if (!latest) return success({ latestImport: null, stats: null, rawPreview: [], template1Preview: [], template2Preview: [], anomalies: [], reports: [] });
    const rows = latest.normalizedRows.map((item) => item.canonical as unknown as CanonicalRow);
    const aggregation = aggregateRows(rows);
    const template1Preview = aggregation.pmls.flatMap((pml) => pml.ppls.flatMap((ppl) => ppl.subsls.map((subsls) => ({ pml: pml.namaPml, ppl: ppl.namaPpl, kodeSubSls: subsls.kodeSubSls, namaSls: subsls.namaSls, target: subsls.target, capaian: subsls.capaian, percentage: subsls.percentage, status: subsls.status })))).slice(0, 100);
    const template2Preview = aggregation.pmls.flatMap((pml) => pml.ppls.map((ppl) => ({ pml: pml.namaPml, ppl: ppl.namaPpl, jumlahSubSls: ppl.subsls.length, target: ppl.assignedTarget, capaian: ppl.totalCapaian, percentage: ppl.percentage, targetMissing: ppl.targetMissing, targetZero: ppl.targetZero, missingLink: ppl.missingLink }))).slice(0, 100);
    return success({
      latestImport: { id: latest.id, snapshotId: latest.snapshotId, importedAt: latest.importedAt, period: latest.period, source: latest.dataSource },
      stats: { pml: aggregation.pmls.length, ppl: aggregation.pmls.reduce((total, pml) => total + pml.ppls.length, 0), subsls: aggregation.subsls.length, target: aggregation.totalTarget, capaian: aggregation.totalCapaian, percentage: aggregation.percentage, anomalies: latest.anomalies.length },
      rawPreview: rows.slice(0, 100).map((row) => ({ sourceRowNumber: row.sourceRowNumber, ...row.raw })),
      template1Preview, template2Preview, anomalies: latest.anomalies.slice(0, 100), reports: latest.reports,
    });
  });

  app.post('/api/reports/generate', async (request, reply) => {
    const parsed = reportBodySchema.parse(request.body);
    const report = await reports.generate(parsed.importId, parsed.mode ?? config.DEFAULT_PROCESSING_MODE);
    return reply.status(201).send(success(report));
  });
  app.get('/api/reports', async () => success(await reports.list()));
  app.get('/api/reports/:id', async (request) => success(await reports.get((request.params as { id: string }).id)));
  app.get('/api/reports/:id/download', async (request, reply) => {
    const report = await reports.get((request.params as { id: string }).id);
    if (!report || report.status !== 'completed') throw new AppError('REPORT_NOT_FOUND', 'File laporan tidak ditemukan atau belum selesai.', 404);
    const resolved = path.resolve(report.filePath);
    const allowed = path.resolve(config.REPORT_OUTPUT_DIR);
    if (!resolved.startsWith(`${allowed}${path.sep}`)) throw new AppError('INVALID_REPORT_PATH', 'Path file laporan tidak valid.', 400);
    reply.header('Content-Disposition', `attachment; filename="${report.filename.replace(/["\r\n]/g, '')}"`);
    reply.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return reply.send(createReadStream(resolved));
  });

  app.get('/api/snapshots', async () => success(await prisma.snapshot.findMany({ orderBy: { importedAt: 'desc' }, take: 50 })));
  app.get('/api/snapshots/:id/diff', async (request) => {
    const { id } = request.params as { id: string };
    const current = await prisma.snapshot.findUnique({ where: { id } });
    const previous = current ? await prisma.snapshot.findFirst({ where: { importedAt: { lt: current.importedAt } }, orderBy: { importedAt: 'desc' } }) : null;
    return success({ current, previous, sourceChanged: Boolean(current && previous && current.sourceHash !== previous.sourceHash), rowCountDelta: current && previous ? current.rowCount - previous.rowCount : null });
  });
  app.get('/api/audit-log', async () => success(await prisma.auditLog.findMany({ orderBy: { timestamp: 'desc' }, take: 100 })));

  return app;
}
