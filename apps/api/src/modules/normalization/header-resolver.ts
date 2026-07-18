import { ValidationError } from '../../shared/errors/app-error.js';
import { scalarToString } from '../../shared/utils/scalar.js';

const aliases: Record<string, string[]> = {
  no: ['no', 'nomor'],
  kodeSubSls: ['kode subsls', 'kode_subsls', 'kodesubsls'],
  namaSls: ['nama sls', 'nama_sls', 'namasls'],
  namaPpl: ['nama ppl', 'nama_ppl', 'namappl'],
  emailPpl: ['email ppl', 'email_ppl', 'emailppl'],
  namaPml: ['nama pml', 'nama_pml', 'namapml'],
  emailPml: ['email pml', 'email_pml', 'emailpml'],
  statusPplSobat: ['status ppl sobat', 'status_ppl_sobat'],
  jenisMitra: ['jenis mitra', 'jenis_mitra'],
  capaian: ['capaian'],
  targetPrelistAwal: ['target prelist awal', 'target (prelist awal)', 'target_prelist_awal'],
  linkAssignmentPpl: ['link assignment ppl', 'link_assignment_ppl'],
};

function normalizeHeader(value: unknown): string {
  return scalarToString(value).trim().toLowerCase().replace(/\s+/g, ' ');
}

export function resolveHeaders(headers: unknown[]): Record<string, number> {
  const normalized = headers.map(normalizeHeader);
  const result: Record<string, number> = {};
  const missing: string[] = [];
  for (const [canonical, accepted] of Object.entries(aliases)) {
    const index = normalized.findIndex((header) => accepted.includes(header));
    if (index < 0) missing.push(canonical);
    else result[canonical] = index;
  }
  if (missing.length > 0) {
    throw new ValidationError('Struktur header Google Sheets tidak lengkap.', { missing, received: headers });
  }
  return result;
}

export function rowsToRawRecords(values: unknown[][]): Record<string, unknown>[] {
  if (values.length === 0) throw new ValidationError('Sheet sumber kosong.');
  const headers = values[0] ?? [];
  const mapping = resolveHeaders(headers);
  return values.slice(1).filter((row) => row.some((value) => scalarToString(value).trim() !== '')).map((row) => {
    const record: Record<string, unknown> = {};
    for (const [canonical, index] of Object.entries(mapping)) record[canonical] = row[index] ?? null;
    return record;
  });
}
