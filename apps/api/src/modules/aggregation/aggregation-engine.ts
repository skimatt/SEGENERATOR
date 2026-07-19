import type { AggregationResult, CanonicalRow, PmlAggregate, PplAggregate, SubSlsAggregate } from '../../shared/types/domain.js';
import { removeExactDuplicates } from '../assignments/deduplicator.js';

function unique<T>(values: T[]): T[] { return [...new Set(values)]; }

function calculatePercentage(capaian: number, target: number | null): number | null {
  return target === null || target === 0 ? null : capaian / target;
}

export function calculateStatus(capaian: number, target: number | null): string {
  if (target === null) return capaian > 0 ? 'CAPAIAN_WITHOUT_TARGET' : 'TARGET_MISSING';
  if (target === 0) return capaian > 0 ? 'CAPAIAN_WITHOUT_TARGET' : 'TARGET_ZERO';
  if (capaian === 0) return 'BELUM_ADA_CAPAIAN';
  if (capaian < target) return 'DALAM_PROSES';
  if (capaian === target) return 'SELESAI';
  return 'MELEBIHI_TARGET';
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) groups.set(key(item), [...(groups.get(key(item)) ?? []), item]);
  return groups;
}

function resolveTarget(rows: CanonicalRow[]): number | null {
  const values = rows.map((row) => row.targetPrelistAwal).filter((value): value is number => value !== null);
  return values.length === 0 ? null : Math.max(...values);
}

function latestUniqueAssignments(rows: CanonicalRow[]): CanonicalRow[] {
  const assignments = new Map<string, CanonicalRow>();
  for (const row of removeExactDuplicates(rows)) {
    const current = assignments.get(row.assignmentKey);
    if (!current || current.sourceRowNumber < row.sourceRowNumber) assignments.set(row.assignmentKey, row);
  }
  return [...assignments.values()];
}

function buildSubSls(rows: CanonicalRow[]): SubSlsAggregate {
  const assignments = latestUniqueAssignments(rows);
  const latest = rows.reduce((current, row) => row.sourceRowNumber > current.sourceRowNumber ? row : current);
  const target = resolveTarget(rows);
  const capaian = assignments.reduce((total, row) => total + row.capaian, 0);
  return {
    subslsKey: latest.subslsKey, kodeSubSls: latest.kodeSubSls, namaSls: latest.namaSls,
    target, capaian, percentage: calculatePercentage(capaian, target), status: calculateStatus(capaian, target),
    contributors: assignments.map((row) => ({ assignmentKey: row.assignmentKey, sourceRowNumber: row.sourceRowNumber, capaian: row.capaian })),
    pplKeys: unique(rows.map((row) => row.pplKey)), pmlKeys: unique(rows.map((row) => row.pmlKey)),
  };
}

function buildPpl(pplKey: string, rows: CanonicalRow[], allRows: CanonicalRow[]): PplAggregate {
  const latest = rows.reduce((current, row) => row.sourceRowNumber > current.sourceRowNumber ? row : current);
  const subsls = [...groupBy(rows, (row) => row.subslsKey).values()].map(buildSubSls).sort((a, b) => a.kodeSubSls.localeCompare(b.kodeSubSls));
  const assignmentRows = latestUniqueAssignments(rows);
  const regionalSubSls = [...groupBy(allRows.filter((row) => subsls.some((item) => item.subslsKey === row.subslsKey)), (row) => row.subslsKey).values()].map(buildSubSls);
  const assignedTarget = subsls.reduce((total, item) => total + (item.target ?? 0), 0);
  const totalCapaian = assignmentRows.reduce((total, row) => total + row.capaian, 0);
  const uniqueRegionalTarget = regionalSubSls.reduce((total, item) => total + (item.target ?? 0), 0);
  const allForAssignments = allRows.filter((row) => assignmentRows.some((assigned) => assigned.assignmentKey === row.assignmentKey));
  return {
    pplKey, namaPpl: latest.namaPpl, emailPpl: latest.emailPpl, pmlKey: latest.pmlKey,
    namaPml: latest.namaPml, emailPml: latest.emailPml, subsls, assignedTarget, uniqueRegionalTarget,
    totalCapaian, percentage: calculatePercentage(totalCapaian, assignedTarget),
    targetMissing: subsls.filter((item) => item.target === null).length,
    targetZero: subsls.filter((item) => item.target === 0).length,
    noProgress: subsls.filter((item) => item.capaian === 0).length,
    belowTarget: subsls.filter((item) => item.target !== null && item.target > 0 && item.capaian < item.target).length,
    onTarget: subsls.filter((item) => item.target !== null && item.capaian === item.target).length,
    aboveTarget: subsls.filter((item) => item.target !== null && item.capaian > item.target).length,
    missingLink: assignmentRows.filter((row) => row.linkAssignmentPpl === null).length,
    reassignments: unique(allForAssignments.map((row) => row.pplKey)).length > 1 ? 1 : 0,
    multiPml: unique(rows.map((row) => row.pmlKey)).length > 1 ? 1 : 0,
    multiPpl: subsls.filter((item) => item.pplKeys.length > 1).length,
  };
}

function buildPml(pmlKey: string, rows: CanonicalRow[], allRows: CanonicalRow[]): PmlAggregate {
  const latest = rows.reduce((current, row) => row.sourceRowNumber > current.sourceRowNumber ? row : current);
  const ppls = [...groupBy(rows, (row) => row.pplKey).entries()].map(([key, group]) => buildPpl(key, group, allRows)).sort((a, b) => (a.namaPpl ?? a.pplKey).localeCompare(b.namaPpl ?? b.pplKey));
  const subsls = [...groupBy(rows, (row) => row.subslsKey).values()].map(buildSubSls);
  const totalTarget = subsls.reduce((total, item) => total + (item.target ?? 0), 0);
  const totalCapaian = latestUniqueAssignments(rows).reduce((total, row) => total + row.capaian, 0);
  return { pmlKey, namaPml: latest.namaPml, emailPml: latest.emailPml, ppls, totalTarget, totalCapaian, percentage: calculatePercentage(totalCapaian, totalTarget) };
}

export function aggregateRows(rows: CanonicalRow[]): AggregationResult {
  const uniqueRows = latestUniqueAssignments(rows);
  const subsls = [...groupBy(uniqueRows, (row) => row.subslsKey).values()].map(buildSubSls).sort((a, b) => a.kodeSubSls.localeCompare(b.kodeSubSls));
  const ppls = [...groupBy(uniqueRows, (row) => row.pplKey).entries()].map(([key, group]) => buildPpl(key, group, uniqueRows)).sort((a, b) => (a.namaPpl ?? a.pplKey).localeCompare(b.namaPpl ?? b.pplKey));
  const pmls = [...groupBy(uniqueRows, (row) => row.pmlKey).entries()].map(([key, group]) => buildPml(key, group, uniqueRows)).sort((a, b) => (a.namaPml ?? a.pmlKey).localeCompare(b.namaPml ?? b.pmlKey));
  const totalTarget = subsls.reduce((total, item) => total + (item.target ?? 0), 0);
  const totalCapaian = uniqueRows.reduce((total, row) => total + row.capaian, 0);
  return { pmls, ppls, subsls, uniqueRows, totalTarget, totalCapaian, percentage: calculatePercentage(totalCapaian, totalTarget) };
}
