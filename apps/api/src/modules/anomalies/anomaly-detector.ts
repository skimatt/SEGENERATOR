import type { Anomaly, CanonicalRow } from '../../shared/types/domain.js';

function anomaly(code: string, severity: Anomaly['severity'], message: string, rows: CanonicalRow[], entityType: Anomaly['entityType'], entityKey: string, metadata: Record<string, unknown> = {}): Anomaly {
  return { code, severity, message, sourceRows: rows.map((row) => row.sourceRowNumber), entityType, entityKey, metadata };
}

function groupBy(rows: CanonicalRow[], key: (row: CanonicalRow) => string): Map<string, CanonicalRow[]> {
  const groups = new Map<string, CanonicalRow[]>();
  for (const row of rows) groups.set(key(row), [...(groups.get(key(row)) ?? []), row]);
  return groups;
}

function distinct<T>(items: T[]): T[] { return [...new Set(items)]; }

export function detectAnomalies(rows: CanonicalRow[]): Anomaly[] {
  const anomalies: Anomaly[] = [];
  for (const row of rows) {
    for (const warning of row.warnings) anomalies.push(anomaly(warning.code, warning.severity, warning.message, [row], 'row', String(row.sourceRowNumber)));
    if (row.targetPrelistAwal !== null && row.capaian > row.targetPrelistAwal) anomalies.push(anomaly('CAPAIAN_EXCEEDS_TARGET', 'warning', 'Capaian melebihi target.', [row], 'assignment', row.assignmentKey, { capaian: row.capaian, target: row.targetPrelistAwal }));
    if ((row.targetPrelistAwal === null || row.targetPrelistAwal === 0) && row.capaian > 0) anomalies.push(anomaly('CAPAIAN_WITHOUT_TARGET', 'error', 'Terdapat capaian tanpa target valid.', [row], 'assignment', row.assignmentKey));
  }
  for (const [fingerprint, group] of groupBy(rows, (row) => row.fingerprint)) {
    if (group.length > 1) anomalies.push(anomaly('EXACT_DUPLICATE', 'warning', 'Baris duplikat persis dikeluarkan dari agregasi.', group, 'assignment', fingerprint));
  }
  for (const [key, group] of groupBy(rows, (row) => row.assignmentKey)) {
    const fingerprints = distinct(group.map((row) => row.fingerprint));
    if (fingerprints.length > 1) anomalies.push(anomaly('POSSIBLE_DUPLICATE', 'warning', 'Assignment yang sama muncul dengan nilai berbeda; baris sumber terakhir digunakan dalam agregasi.', group, 'assignment', key));
  }
  for (const [key, group] of groupBy(rows, (row) => row.subslsKey)) {
    const targets = distinct(group.map((row) => row.targetPrelistAwal).filter((value): value is number => value !== null));
    const ppls = distinct(group.map((row) => row.pplKey));
    const pmls = distinct(group.map((row) => row.pmlKey));
    if (targets.length > 1) anomalies.push(anomaly('TARGET_CONFLICT', 'critical', 'Target berbeda ditemukan untuk SubSLS yang sama.', group, 'subsls', key, { targets }));
    if (ppls.length > 1) anomalies.push(anomaly('MULTI_PPL', 'warning', 'Satu SubSLS memiliki beberapa PPL.', group, 'subsls', key, { pplKeys: ppls }));
    if (pmls.length > 1) anomalies.push(anomaly('MULTI_PML', 'error', 'Satu SubSLS berada pada beberapa PML.', group, 'subsls', key, { pmlKeys: pmls }));
    if (ppls.length > 1 && group.length > ppls.length) anomalies.push(anomaly('REASSIGNMENT', 'warning', 'Riwayat assignment berubah pada SubSLS.', group, 'subsls', key));
  }
  for (const [key, group] of groupBy(rows, (row) => row.pplKey)) {
    const pmls = distinct(group.map((row) => row.pmlKey));
    const names = distinct(group.map((row) => row.namaPpl?.toLowerCase()).filter((value): value is string => Boolean(value)));
    if (pmls.length > 1) anomalies.push(anomaly('PPL_MULTI_PML', 'error', 'Satu PPL terhubung ke beberapa PML.', group, 'ppl', key, { pmlKeys: pmls }));
    if (names.length > 1 && key.includes('@')) anomalies.push(anomaly('IDENTITY_CONFLICT', 'error', 'Email PPL yang sama memiliki nama berbeda.', group, 'ppl', key, { names }));
  }
  for (const [name, group] of groupBy(rows.filter((row) => row.namaPpl !== null), (row) => (row.namaPpl ?? '').toLowerCase())) {
    const emails = distinct(group.map((row) => row.emailPpl).filter((value): value is string => value !== null));
    if (emails.length > 1) anomalies.push(anomaly('IDENTITY_CONFLICT', 'warning', 'Nama PPL yang sama memiliki email berbeda dan tidak digabung.', group, 'ppl', name, { emails }));
  }
  for (const [key, group] of groupBy(rows, (row) => row.pmlKey)) {
    const names = distinct(group.map((row) => row.namaPml?.toLowerCase()).filter((value): value is string => Boolean(value)));
    if (names.length > 1 && key.includes('@')) anomalies.push(anomaly('IDENTITY_CONFLICT', 'error', 'Email PML yang sama memiliki nama berbeda.', group, 'pml', key, { names }));
  }
  for (const [name, group] of groupBy(rows.filter((row) => row.namaPml !== null), (row) => (row.namaPml ?? '').toLowerCase())) {
    const emails = distinct(group.map((row) => row.emailPml).filter((value): value is string => value !== null));
    if (emails.length > 1) anomalies.push(anomaly('IDENTITY_CONFLICT', 'warning', 'Nama PML yang sama memiliki email berbeda dan tidak digabung.', group, 'pml', name, { emails }));
  }
  return anomalies.sort((a, b) => (a.sourceRows[0] ?? 0) - (b.sourceRows[0] ?? 0) || a.code.localeCompare(b.code));
}

export function detectSnapshotChanges(current: CanonicalRow[], previous: CanonicalRow[]): Anomaly[] {
  const changes: Anomaly[] = [];
  const previousBySubSls = groupBy(previous, (row) => row.subslsKey);
  for (const [subslsKey, rows] of groupBy(current, (row) => row.subslsKey)) {
    const oldRows = previousBySubSls.get(subslsKey);
    if (!oldRows) continue;
    const oldTargets = distinct(oldRows.map((row) => row.targetPrelistAwal).filter((value): value is number => value !== null));
    const newTargets = distinct(rows.map((row) => row.targetPrelistAwal).filter((value): value is number => value !== null));
    if (JSON.stringify(oldTargets.sort()) !== JSON.stringify(newTargets.sort())) changes.push(anomaly('TARGET_CHANGED_SNAPSHOT', 'warning', 'Target SubSLS berubah dibanding snapshot sebelumnya.', rows, 'subsls', subslsKey, { previous: oldTargets, current: newTargets }));
    const oldPpl = distinct(oldRows.map((row) => row.pplKey)).sort();
    const newPpl = distinct(rows.map((row) => row.pplKey)).sort();
    const oldPml = distinct(oldRows.map((row) => row.pmlKey)).sort();
    const newPml = distinct(rows.map((row) => row.pmlKey)).sort();
    if (JSON.stringify(oldPpl) !== JSON.stringify(newPpl) || JSON.stringify(oldPml) !== JSON.stringify(newPml)) changes.push(anomaly('OFFICER_CHANGED_SNAPSHOT', 'warning', 'Petugas SubSLS berubah dibanding snapshot sebelumnya.', rows, 'subsls', subslsKey, { previousPpl: oldPpl, currentPpl: newPpl, previousPml: oldPml, currentPml: newPml }));
  }
  return changes;
}
