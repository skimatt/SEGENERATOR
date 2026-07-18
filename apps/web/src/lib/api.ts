const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

type ApiEnvelope<T> = { success: boolean; data: T | null; error: { code: string; message: string; details?: unknown } | null };

export type DashboardData = {
  latestImport: { id: string; snapshotId: string; importedAt: string; period: string; source: { spreadsheetId: string; sheetName: string } } | null;
  stats: { pml: number; ppl: number; subsls: number; target: number; capaian: number; percentage: number | null; anomalies: number } | null;
  rawPreview: Record<string, unknown>[];
  template1Preview: Array<Record<string, unknown>>;
  template2Preview: Array<Record<string, unknown>>;
  anomalies: Array<{ id: string; code: string; severity: string; message: string; sourceRows: number[] }>;
  reports: Array<{ id: string; filename: string; status: string; generatedAt: string; warningCount: number; errorCount: number }>;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } });
  const envelope = await response.json() as ApiEnvelope<T>;
  if (!response.ok || !envelope.success || envelope.data === null) throw new Error(envelope.error?.message ?? 'Permintaan gagal.');
  return envelope.data;
}

export const api = {
  dashboard: () => request<DashboardData>('/dashboard'),
  importSheets: (mode: 'strict' | 'permissive') => request<{ importId: string }>('/imports/google-sheets', { method: 'POST', body: JSON.stringify({ mode }) }),
  generateReport: (importId: string, mode: 'strict' | 'permissive') => request<{ id: string }>('/reports/generate', { method: 'POST', body: JSON.stringify({ importId, mode }) }),
  downloadUrl: (reportId: string) => `${API_URL}/reports/${encodeURIComponent(reportId)}/download`,
};
