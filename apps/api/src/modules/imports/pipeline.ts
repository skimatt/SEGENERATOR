import type { PipelineResult } from '../../shared/types/domain.js';
import { normalizeRows } from '../normalization/normalizer.js';
import { detectAnomalies } from '../anomalies/anomaly-detector.js';
import { aggregateRows } from '../aggregation/aggregation-engine.js';

export function processRawRows(rawRows: Record<string, unknown>[], period: string): PipelineResult {
  const rows = normalizeRows(rawRows, period);
  const anomalies = detectAnomalies(rows);
  const aggregation = aggregateRows(rows);
  return { period, rawRows, rows, aggregation, anomalies };
}
