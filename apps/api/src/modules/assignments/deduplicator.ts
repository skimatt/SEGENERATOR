import type { CanonicalRow } from '../../shared/types/domain.js';

export function removeExactDuplicates(rows: CanonicalRow[]): CanonicalRow[] {
  const fingerprints = new Set<string>();
  return rows.filter((row) => {
    if (fingerprints.has(row.fingerprint)) return false;
    fingerprints.add(row.fingerprint);
    return true;
  });
}
