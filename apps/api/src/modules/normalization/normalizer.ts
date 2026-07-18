import { sha256 } from '../../shared/utils/hash.js';
import type { CanonicalRow, DataWarning } from '../../shared/types/domain.js';
import { scalarToString } from '../../shared/utils/scalar.js';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const normalized = scalarToString(value).replace(/[\u200B-\u200D\uFEFF]/g, '').trim().replace(/\s+/g, ' ');
  return normalized === '' ? null : normalized;
}

export function normalizeEmail(value: unknown): string | null {
  const normalized = normalizeString(value)?.replace(/\s/g, '').toLowerCase() ?? null;
  return normalized;
}

export function isValidEmail(value: string | null): boolean {
  return value === null || emailPattern.test(value);
}

export function normalizeKodeSubSls(value: unknown): string {
  if (value === null || value === undefined) return '';
  const normalized = scalarToString(value).replace(/\s/g, '');
  return typeof value === 'number' && normalized.endsWith('.0') ? normalized.slice(0, -2) : normalized;
}

type NumericResult = { value: number | null; warning: DataWarning | null };

function parseNonNegativeInteger(value: unknown, emptyValue: number | null, field: string): NumericResult {
  const text = normalizeString(value);
  if (text === null || text === '-') return { value: emptyValue, warning: null };
  const parsed = typeof value === 'number' ? value : Number(text.replace(',', '.'));
  if (!Number.isFinite(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
    return {
      value: emptyValue,
      warning: { code: 'NUMBER_PARSE_ERROR', severity: 'error', message: `${field} harus berupa bilangan bulat nonnegatif.` },
    };
  }
  return { value: parsed, warning: null };
}

export function parseCapaian(value: unknown): NumericResult {
  return parseNonNegativeInteger(value, 0, 'Capaian');
}

export function parseTarget(value: unknown): NumericResult {
  return parseNonNegativeInteger(value, null, 'Target Prelist Awal');
}

export function normalizeLink(value: unknown): string | null {
  const normalized = normalizeString(value);
  if (normalized === null || ['-', 'null', 'undefined'].includes(normalized.toLowerCase())) return null;
  return normalized;
}

function validUrl(value: string | null): boolean {
  if (value === null) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function identityKeys(emailPpl: string | null, namaPpl: string | null, emailPml: string | null, namaPml: string | null, warnings: DataWarning[]): { pplKey: string; pmlKey: string } {
  let pmlKey = emailPml;
  if (pmlKey === null) {
    warnings.push({ code: 'PML_EMAIL_MISSING', severity: 'warning', message: 'Email PML kosong; identitas fallback berbasis hash nama digunakan.' });
    pmlKey = namaPml === null ? '' : `pml-fallback-${sha256(namaPml.toLowerCase()).slice(0, 16)}`;
  }
  let pplKey = emailPpl;
  if (pplKey === null) {
    warnings.push({ code: 'PPL_EMAIL_MISSING', severity: 'warning', message: 'Email PPL kosong; identitas fallback nama dan PML digunakan.' });
    pplKey = namaPpl === null ? '' : `${namaPpl.toLowerCase()}::${pmlKey}`;
  }
  return { pplKey, pmlKey };
}

export function normalizeRow(raw: Record<string, unknown>, sourceRowNumber: number, period: string): CanonicalRow {
  const warnings: DataWarning[] = [];
  const emailPpl = normalizeEmail(raw.emailPpl);
  const emailPml = normalizeEmail(raw.emailPml);
  const namaPpl = normalizeString(raw.namaPpl);
  const namaPml = normalizeString(raw.namaPml);
  const kodeSubSls = normalizeKodeSubSls(raw.kodeSubSls);
  const capaianResult = parseCapaian(raw.capaian);
  const targetResult = parseTarget(raw.targetPrelistAwal);
  const linkAssignmentPpl = normalizeLink(raw.linkAssignmentPpl);
  if (capaianResult.warning) warnings.push(capaianResult.warning);
  if (targetResult.warning) warnings.push(targetResult.warning);
  if (!isValidEmail(emailPpl)) warnings.push({ code: 'PPL_EMAIL_INVALID', severity: 'error', message: 'Format email PPL tidak valid.' });
  if (!isValidEmail(emailPml)) warnings.push({ code: 'PML_EMAIL_INVALID', severity: 'error', message: 'Format email PML tidak valid.' });
  if (kodeSubSls === '') warnings.push({ code: 'SUBSLS_CODE_MISSING', severity: 'critical', message: 'Kode SubSLS wajib diisi.' });
  if (namaPpl === null) warnings.push({ code: 'PPL_NAME_MISSING', severity: 'error', message: 'Nama PPL kosong.' });
  if (namaPml === null) warnings.push({ code: 'PML_NAME_MISSING', severity: 'error', message: 'Nama PML kosong.' });
  if (targetResult.value === null) warnings.push({ code: 'TARGET_MISSING', severity: 'warning', message: 'Target kosong.' });
  if (targetResult.value === 0) warnings.push({ code: 'TARGET_ZERO', severity: 'warning', message: 'Target bernilai nol.' });
  if (linkAssignmentPpl === null) warnings.push({ code: 'ASSIGNMENT_LINK_MISSING', severity: 'warning', message: 'Link assignment kosong.' });
  if (!validUrl(linkAssignmentPpl)) warnings.push({ code: 'ASSIGNMENT_LINK_INVALID', severity: 'warning', message: 'Link assignment bukan URL HTTP/HTTPS yang valid.' });
  const { pplKey, pmlKey } = identityKeys(emailPpl, namaPpl, emailPml, namaPml, warnings);
  if (pplKey === '' || pmlKey === '') warnings.push({ code: 'IDENTITY_UNRESOLVED', severity: 'critical', message: 'Identitas utama petugas tidak dapat ditentukan.' });
  const assignmentKey = `${period}::${kodeSubSls}::${pplKey}`;
  const subslsKey = `${period}::${kodeSubSls}`;
  const capaian = capaianResult.value ?? 0;
  const fingerprint = sha256([period, kodeSubSls, pplKey, pmlKey, capaian, targetResult.value ?? 'null', linkAssignmentPpl ?? 'null'].join('|'));
  return {
    sourceRowNumber, no: normalizeString(raw.no), kodeSubSls, namaSls: normalizeString(raw.namaSls),
    namaPpl, emailPpl, namaPml, emailPml, statusPplSobat: normalizeString(raw.statusPplSobat),
    jenisMitra: normalizeString(raw.jenisMitra), capaian, targetPrelistAwal: targetResult.value,
    linkAssignmentPpl, pplKey, pmlKey, assignmentKey, subslsKey, fingerprint, raw, warnings,
  };
}

export function normalizeRows(rawRows: Record<string, unknown>[], period: string): CanonicalRow[] {
  return rawRows.map((raw, index) => normalizeRow(raw, index + 2, period));
}
