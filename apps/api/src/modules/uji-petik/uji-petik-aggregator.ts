import type { Anomaly, CanonicalRow, ProgressWorkbookSource, UjiPetikAggregation, UjiPetikPplMetrics } from '../../shared/types/domain.js';

function groupRowsBySubSls(rows: CanonicalRow[]): Map<string, CanonicalRow[]> {
  const groups = new Map<string, CanonicalRow[]>();
  for (const row of rows) groups.set(row.kodeSubSls, [...(groups.get(row.kodeSubSls) ?? []), row]);
  return groups;
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function initialMetrics(pplKey: string, sourceHash: string): UjiPetikPplMetrics {
  return {
    pplKey,
    targetCombined: 0,
    targetUsaha: 0,
    targetKeluarga: 0,
    usahaKeluargaDitemukan: 0,
    usahaKeluargaTidakDitemukan: 0,
    matchedSubSls: 0,
    sourceHash,
  };
}

export function aggregateUjiPetikByPpl(rows: CanonicalRow[], source: ProgressWorkbookSource): UjiPetikAggregation {
  const byPpl = new Map<string, UjiPetikPplMetrics>();
  const anomalies: Anomaly[] = [];

  for (const [kodeSubSls, sourceRows] of groupRowsBySubSls(rows)) {
    const sourceRowNumbers = sourceRows.map((row) => row.sourceRowNumber);
    const pplKeys = unique(sourceRows.map((row) => row.pplKey));
    const metric = source.bySubSls.get(kodeSubSls);
    if (!metric) {
      anomalies.push({
        code: 'UJI_PETIK_SOURCE_MISSING',
        severity: 'warning',
        message: 'Kode SubSLS tidak ditemukan pada workbook progres Uji Petik.',
        sourceRows: sourceRowNumbers,
        entityType: 'subsls',
        entityKey: kodeSubSls,
        metadata: { kodeSubSls, progressWorkbookHash: source.sourceHash },
      });
      continue;
    }
    if (pplKeys.length !== 1) {
      anomalies.push({
        code: 'UJI_PETIK_MULTI_PPL_UNALLOCATED',
        severity: 'warning',
        message: 'Metrik Uji Petik tidak dialokasikan karena satu SubSLS memiliki beberapa PPL.',
        sourceRows: sourceRowNumbers,
        entityType: 'subsls',
        entityKey: kodeSubSls,
        metadata: { kodeSubSls, pplKeys, progressWorkbookHash: source.sourceHash },
      });
      continue;
    }

    const targets = unique(sourceRows.map((row) => row.targetPrelistAwal).filter((value): value is number => value !== null));
    if (targets.length === 1 && targets[0] !== metric.targetCombined) {
      anomalies.push({
        code: 'UJI_PETIK_TARGET_MISMATCH',
        severity: 'warning',
        message: 'Target U&K workbook progres berbeda dengan target sheet assignment aktif; Uji Petik menggunakan target workbook progres.',
        sourceRows: sourceRowNumbers,
        entityType: 'subsls',
        entityKey: kodeSubSls,
        metadata: { kodeSubSls, dataMentahTarget: targets[0], progressTarget: metric.targetCombined, progressWorkbookHash: source.sourceHash },
      });
    }

    const pplKey = pplKeys[0] as string;
    const current = byPpl.get(pplKey) ?? initialMetrics(pplKey, source.sourceHash);
    current.targetCombined += metric.targetCombined;
    current.targetUsaha += metric.targetUsaha;
    current.targetKeluarga += metric.targetCombined - metric.targetUsaha;
    current.usahaKeluargaDitemukan += metric.usahaKeluargaDitemukan;
    current.usahaKeluargaTidakDitemukan += metric.usahaKeluargaTidakDitemukan;
    current.matchedSubSls += 1;
    byPpl.set(pplKey, current);
  }

  return { byPpl, anomalies, sourceHash: source.sourceHash, updatedLabel: source.updatedLabel };
}
