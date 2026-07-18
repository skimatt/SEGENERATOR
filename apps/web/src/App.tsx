import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from './lib/api';

type IconName = 'database' | 'users' | 'map' | 'target' | 'chart' | 'alert' | 'sheet' | 'download' | 'refresh';
const paths: Record<IconName, string> = {
  database: 'M4 6c0 1.1 3.6 2 8 2s8-.9 8-2-3.6-2-8-2-8 .9-8 2Zm0 0v6c0 1.1 3.6 2 8 2s8-.9 8-2V6M4 12v6c0 1.1 3.6 2 8 2s8-.9 8-2v-6',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  map: 'm3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15',
  target: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-4a6 6 0 1 0 0-12 6 6 0 0 0 0 12Zm0-4a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  chart: 'M3 3v18h18M7 16l4-5 3 3 5-7',
  alert: 'M10.3 2.9 1.8 17a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 2.9a2 2 0 0 0-3.4 0ZM12 9v4m0 4h.01',
  sheet: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm0 0v6h6M8 13h8m-8 4h8',
  download: 'M12 3v12m0 0 5-5m-5 5-5-5M5 21h14',
  refresh: 'M20 12a8 8 0 1 1-2.34-5.66L20 8M20 3v5h-5',
};

function Icon({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d={paths[name]} /></svg>;
}

const formSchema = z.object({ mode: z.enum(['strict', 'permissive']) });
type FormValues = z.infer<typeof formSchema>;
type Tab = 'raw' | 'template1' | 'template2' | 'anomalies';

function number(value: unknown): string {
  return typeof value === 'number' ? new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(value) : '—';
}

function date(value: string): string {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(value));
}

function DataTable({ rows }: { rows: Array<Record<string, unknown>> }) {
  const columns = useMemo(() => rows[0] ? Object.keys(rows[0]).slice(0, 12) : [], [rows]);
  if (rows.length === 0) return <div className="grid min-h-56 place-items-center text-sm text-slate-500">Belum ada data untuk ditampilkan.</div>;
  return <div className="table-scroll max-h-[430px] overflow-auto">
    <table className="w-full border-separate border-spacing-0 text-left text-sm">
      <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur"><tr>{columns.map((column) => <th key={column} className="whitespace-nowrap border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">{column.replace(/([A-Z])/g, ' $1')}</th>)}</tr></thead>
      <tbody>{rows.map((row, index) => <tr key={String(row.sourceRowNumber ?? row.kodeSubSls ?? index)} className="even:bg-slate-50/70 hover:bg-teal-50/60">{columns.map((column) => <td key={column} className="max-w-72 border-b border-slate-100 px-4 py-3 align-top text-slate-700"><span className="line-clamp-2">{typeof row[column] === 'number' ? number(row[column]) : String(row[column] ?? '—')}</span></td>)}</tr>)}</tbody>
    </table>
  </div>;
}

export function App() {
  const [tab, setTab] = useState<Tab>('raw');
  const queryClient = useQueryClient();
  const { register, getValues } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: { mode: 'strict' } });
  const dashboard = useQuery({ queryKey: ['dashboard'], queryFn: api.dashboard });
  const importMutation = useMutation({ mutationFn: () => api.importSheets(getValues('mode')), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['dashboard'] }); } });
  const generateMutation = useMutation({ mutationFn: () => {
    if (!dashboard.data?.latestImport) throw new Error('Lakukan import terlebih dahulu.');
    return api.generateReport(dashboard.data.latestImport.id, getValues('mode'));
  }, onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['dashboard'] }); } });

  const stats = dashboard.data?.stats;
  const cards: Array<{ label: string; value: string; note: string; icon: IconName; tone: string }> = [
    { label: 'PML', value: number(stats?.pml), note: 'petugas pengawas', icon: 'users', tone: 'bg-blue-50 text-blue-700' },
    { label: 'PPL', value: number(stats?.ppl), note: 'petugas lapangan', icon: 'users', tone: 'bg-violet-50 text-violet-700' },
    { label: 'SubSLS', value: number(stats?.subsls), note: 'wilayah unik', icon: 'map', tone: 'bg-cyan-50 text-cyan-700' },
    { label: 'Target', value: number(stats?.target), note: 'target unik', icon: 'target', tone: 'bg-amber-50 text-amber-700' },
    { label: 'Capaian', value: number(stats?.capaian), note: 'assignment unik', icon: 'chart', tone: 'bg-emerald-50 text-emerald-700' },
    { label: 'Persentase', value: stats?.percentage == null ? '—' : `${number(stats.percentage * 100)}%`, note: 'capaian / target', icon: 'chart', tone: 'bg-teal-50 text-teal-700' },
    { label: 'Anomali', value: number(stats?.anomalies), note: 'perlu ditinjau', icon: 'alert', tone: 'bg-rose-50 text-rose-700' },
  ];
  const currentRows: Array<Record<string, unknown>> = tab === 'raw' ? (dashboard.data?.rawPreview ?? []) : tab === 'template1' ? (dashboard.data?.template1Preview ?? []) : tab === 'template2' ? (dashboard.data?.template2Preview ?? []) : (dashboard.data?.anomalies ?? []);
  const error = dashboard.error ?? importMutation.error ?? generateMutation.error;

  return <div className="min-h-screen">
    <header className="border-b border-slate-200 bg-slate-950 text-white">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-6 px-5 py-4 lg:px-8">
        <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-teal-500 text-slate-950"><Icon name="sheet" /></div><div><p className="text-sm font-bold tracking-wide">SEGENERATOR</p><p className="text-xs text-slate-400">BPS Kabupaten Bireuen</p></div></div>
        <div className="hidden items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 sm:flex"><span className={`h-2 w-2 rounded-full ${dashboard.isError ? 'bg-rose-400' : 'bg-emerald-400'}`} />Google Sheets • DATA_MENTAH</div>
      </div>
    </header>

    <main className="mx-auto max-w-[1500px] px-5 py-8 lg:px-8">
      <section className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div><p className="mb-2 text-xs font-semibold uppercase tracking-[.18em] text-teal-700">Pusat kendali laporan</p><h1 className="text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">Dashboard LK PPK</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Import, validasi, audit, dan ekspor laporan Excel dari satu alur yang dapat ditelusuri.</p></div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm">Mode <select {...register('mode')} className="ml-2 bg-transparent font-semibold text-slate-900 outline-none"><option value="strict">Strict</option><option value="permissive">Permissive</option></select></label>
          <button onClick={() => importMutation.mutate()} disabled={importMutation.isPending} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:border-teal-500 hover:text-teal-700 disabled:opacity-50"><Icon name="refresh" className={`h-4 w-4 ${importMutation.isPending ? 'animate-spin' : ''}`} />{importMutation.isPending ? 'Mengimpor…' : 'Import ulang'}</button>
          <button onClick={() => generateMutation.mutate()} disabled={!dashboard.data?.latestImport || generateMutation.isPending} className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"><Icon name="sheet" className="h-4 w-4" />{generateMutation.isPending ? 'Membuat…' : 'Generate Excel'}</button>
        </div>
      </section>

      {error && <div className="mb-6 flex gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><Icon name="alert" className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-semibold">Proses belum berhasil</p><p className="mt-1">{error instanceof Error ? error.message : 'Terjadi kesalahan.'}</p></div></div>}

      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {cards.map((card) => <article key={card.label} className="card p-4"><div className={`mb-4 grid h-9 w-9 place-items-center rounded-lg ${card.tone}`}><Icon name={card.icon} className="h-4 w-4" /></div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{card.label}</p><p className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{dashboard.isLoading ? '···' : card.value}</p><p className="mt-1 text-xs text-slate-500">{card.note}</p></article>)}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="card overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-bold text-slate-950">Preview data & laporan</h2><p className="mt-1 text-xs text-slate-500">Maksimal 100 baris terbaru</p></div><div className="flex overflow-x-auto rounded-xl bg-slate-100 p-1 text-xs font-semibold">{([['raw', 'Data Mentah'], ['template1', 'LK Termin 1'], ['template2', 'Uji Petik'], ['anomalies', 'Anomali']] as const).map(([key, label]) => <button key={key} onClick={() => setTab(key)} className={`whitespace-nowrap rounded-lg px-3 py-2 ${tab === key ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{label}</button>)}</div></div>
          <DataTable rows={currentRows} />
        </div>

        <aside className="space-y-6">
          <div className="card p-5"><div className="mb-4 flex items-center justify-between"><h2 className="font-bold text-slate-950">Sumber data</h2><Icon name="database" className="h-5 w-5 text-teal-600" /></div>{dashboard.data?.latestImport ? <dl className="space-y-3 text-sm"><div><dt className="text-xs text-slate-500">Spreadsheet ID</dt><dd className="mt-1 truncate font-medium text-slate-800" title={dashboard.data.latestImport.source.spreadsheetId}>{dashboard.data.latestImport.source.spreadsheetId}</dd></div><div className="flex justify-between border-t border-slate-100 pt-3"><dt className="text-slate-500">Sheet</dt><dd className="font-semibold">{dashboard.data.latestImport.source.sheetName}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Periode</dt><dd className="font-semibold">{dashboard.data.latestImport.period}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Import terakhir</dt><dd className="text-right font-medium">{date(dashboard.data.latestImport.importedAt)}</dd></div></dl> : <p className="text-sm leading-6 text-slate-500">Belum ada snapshot. Konfigurasikan credential service account lalu jalankan import.</p>}</div>

          <div className="card overflow-hidden"><div className="border-b border-slate-200 px-5 py-4"><h2 className="font-bold text-slate-950">Riwayat laporan</h2></div><div className="max-h-80 divide-y divide-slate-100 overflow-auto">{dashboard.data?.reports.length ? dashboard.data.reports.map((report) => <div key={report.id} className="p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800" title={report.filename}>{report.filename}</p><p className="mt-1 text-xs text-slate-500">{date(report.generatedAt)} • {report.warningCount} warning</p></div>{report.status === 'completed' && <a href={api.downloadUrl(report.id)} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100" aria-label={`Unduh ${report.filename}`}><Icon name="download" className="h-4 w-4" /></a>}</div></div>) : <p className="p-5 text-sm text-slate-500">Belum ada laporan yang dibuat.</p>}</div></div>
        </aside>
      </section>
    </main>
  </div>;
}
