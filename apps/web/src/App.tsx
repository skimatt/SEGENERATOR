import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from './lib/api';

type IconName = 'alert' | 'chart' | 'check' | 'database' | 'download' | 'file' | 'map' | 'refresh' | 'sheet' | 'shield' | 'target' | 'users';

const paths: Record<IconName, string> = {
  alert: 'M10.3 2.9 1.8 17a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 2.9a2 2 0 0 0-3.4 0ZM12 9v4m0 4h.01',
  chart: 'M3 3v18h18M7 16l4-5 3 3 5-7',
  check: 'm5 12 4 4L19 6',
  database: 'M4 6c0 1.1 3.6 2 8 2s8-.9 8-2-3.6-2-8-2-8 .9-8 2Zm0 0v6c0 1.1 3.6 2 8 2s8-.9 8-2V6M4 12v6c0 1.1 3.6 2 8 2s8-.9 8-2v-6',
  download: 'M12 3v12m0 0 5-5m-5 5-5-5M5 21h14',
  file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm0 0v6h6',
  map: 'm3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15',
  refresh: 'M20 12a8 8 0 1 1-2.34-5.66L20 8M20 3v5h-5',
  sheet: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm0 0v6h6M8 13h8m-8 4h8',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Zm-3-10 2 2 4-4',
  target: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-4a6 6 0 1 0 0-12 6 6 0 0 0 0 12Zm0-4a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
};

function Icon({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d={paths[name]} /></svg>;
}

const formSchema = z.object({ mode: z.enum(['strict', 'permissive']) });
type FormValues = z.infer<typeof formSchema>;
type Tab = 'raw' | 'template1' | 'template2' | 'anomalies';

const tabOptions: Array<{ key: Tab; label: string }> = [
  { key: 'raw', label: 'Data Mentah' },
  { key: 'template1', label: 'LK Termin 1' },
  { key: 'template2', label: 'Uji Petik' },
  { key: 'anomalies', label: 'Anomali' },
];

const rawPreviewColumns = [
  'sourceRowNumber', 'no', 'kodeSubSls', 'namaSls', 'namaPpl', 'emailPpl', 'idPpl',
  'namaPml', 'emailPml', 'statusPplSobat', 'jenisMitra', 'capaian', 'capaianPml',
  'targetPrelistAwal', 'linkAssignmentPpl',
];

function number(value: unknown): string {
  return typeof value === 'number' ? new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(value) : '—';
}

function date(value: string): string {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(value));
}

function cellValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') return number(value);
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function columnLabel(value: string): string {
  return value.replace(/([A-Z])/g, ' $1').replace(/^./, (character) => character.toUpperCase());
}

function DataTable({ rows, preferredColumns }: { rows: Array<Record<string, unknown>>; preferredColumns?: string[] }) {
  const columns = useMemo(() => {
    if (!rows[0]) return [];
    if (preferredColumns) return preferredColumns.filter((column) => Object.prototype.hasOwnProperty.call(rows[0], column));
    return Object.keys(rows[0]).slice(0, 14);
  }, [preferredColumns, rows]);
  if (rows.length === 0) {
    return <div className="grid min-h-72 place-items-center px-6 text-center"><div><div className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-slate-100 text-slate-500"><Icon name="database" /></div><p className="mt-3 text-sm font-semibold text-slate-700">Belum ada data</p><p className="mt-1 text-xs text-slate-500">Jalankan import untuk menampilkan preview.</p></div></div>;
  }
  return <div className="table-scroll max-h-[520px] overflow-auto">
    <table className="w-full border-separate border-spacing-0 text-left text-sm">
      <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur"><tr>{columns.map((column) => <th key={column} className="whitespace-nowrap border-b border-slate-200 px-4 py-3 text-[11px] font-bold uppercase tracking-[.08em] text-slate-500">{columnLabel(column)}</th>)}</tr></thead>
      <tbody>{rows.map((row, index) => <tr key={String(row.id ?? row.sourceRowNumber ?? row.kodeSubSls ?? index)} className="group even:bg-slate-50/50 hover:bg-teal-50/60">{columns.map((column) => <td key={column} className="max-w-80 border-b border-slate-100 px-4 py-3 align-top text-slate-700"><span className="line-clamp-2" title={cellValue(row[column])}>{cellValue(row[column])}</span></td>)}</tr>)}</tbody>
    </table>
  </div>;
}

function StatCard({ label, value, note, icon, tone }: { label: string; value: string; note: string; icon: IconName; tone: string }) {
  return <article className="card group p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-[.1em] text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{value}</p><p className="mt-1 text-xs text-slate-500">{note}</p></div><div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${tone}`}><Icon name={icon} className="h-4 w-4" /></div></div></article>;
}

function QualityRow({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <div className="flex items-center justify-between border-b border-slate-100 py-3 last:border-0"><span className="text-sm text-slate-600">{label}</span><span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${tone}`}>{number(value)}</span></div>;
}

export function App() {
  const [tab, setTab] = useState<Tab>('raw');
  const [notice, setNotice] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { register, getValues, setValue, watch } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: { mode: 'strict' } });
  const mode = watch('mode');
  const dashboard = useQuery({ queryKey: ['dashboard'], queryFn: api.dashboard });
  const importMutation = useMutation({
    mutationFn: () => api.importSheets(getValues('mode')),
    onMutate: () => setNotice(null),
    onSuccess: async () => { setNotice('Import terbaru berhasil disimpan dan dashboard sudah diperbarui.'); await queryClient.invalidateQueries({ queryKey: ['dashboard'] }); },
  });
  const generateMutation = useMutation({
    mutationFn: () => {
      if (!dashboard.data?.latestImport) throw new Error('Lakukan import terlebih dahulu.');
      return api.generateReport(dashboard.data.latestImport.id, getValues('mode'));
    },
    onMutate: () => setNotice(null),
    onSuccess: async () => { setNotice('Laporan Excel berhasil dibuat dan siap diunduh.'); await queryClient.invalidateQueries({ queryKey: ['dashboard'] }); },
  });

  const data = dashboard.data;
  const stats = data?.stats;
  const quality = data?.quality;
  const blocking = quality?.blocking ?? 0;
  const strictBlocked = mode === 'strict' && blocking > 0;
  const error = dashboard.error ?? importMutation.error ?? generateMutation.error;
  const spreadsheetUrl = data?.configuredSource.spreadsheetId
    ? `https://docs.google.com/spreadsheets/d/${encodeURIComponent(data.configuredSource.spreadsheetId)}/edit`
    : null;
  const currentRows: Array<Record<string, unknown>> = tab === 'raw' ? (data?.rawPreview ?? []) : tab === 'template1' ? (data?.template1Preview ?? []) : tab === 'template2' ? (data?.template2Preview ?? []) : (data?.anomalies ?? []);
  const cards = [
    { label: 'PML', value: number(stats?.pml), note: 'petugas pengawas', icon: 'users' as const, tone: 'bg-blue-50 text-blue-700' },
    { label: 'PPL', value: number(stats?.ppl), note: 'petugas lapangan', icon: 'users' as const, tone: 'bg-violet-50 text-violet-700' },
    { label: 'SubSLS', value: number(stats?.subsls), note: 'wilayah unik', icon: 'map' as const, tone: 'bg-cyan-50 text-cyan-700' },
    { label: 'Target', value: number(stats?.target), note: 'target unik', icon: 'target' as const, tone: 'bg-amber-50 text-amber-700' },
    { label: 'Capaian', value: number(stats?.capaian), note: 'assignment unik', icon: 'chart' as const, tone: 'bg-emerald-50 text-emerald-700' },
    { label: 'Persentase', value: stats?.percentage == null ? '—' : `${number(stats.percentage * 100)}%`, note: 'capaian ÷ target', icon: 'chart' as const, tone: 'bg-teal-50 text-teal-700' },
    { label: 'Anomali', value: number(stats?.anomalies), note: 'tercatat untuk audit', icon: 'alert' as const, tone: 'bg-rose-50 text-rose-700' },
  ];

  return <div className="min-h-screen bg-slate-50">
    <header className="border-b border-slate-800 bg-slate-950 text-white">
      <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-5 px-5 py-4 lg:px-8">
        <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-teal-400 text-slate-950"><Icon name="sheet" /></div><div><p className="text-sm font-bold tracking-[.08em]">SEGENERATOR</p><p className="text-xs text-slate-400">BPS Kabupaten Bireuen</p></div></div>
        <div className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-300"><span className={`h-2 w-2 rounded-full ${dashboard.isError ? 'bg-rose-400' : 'bg-emerald-400'}`} /><span className="hidden sm:inline">Google Sheets</span><span className="text-slate-600">•</span><strong className="font-semibold text-white">{data?.configuredSource.sheetName ?? 'DATA_MENTAH2'}</strong></div>
      </div>
    </header>

    <main className="mx-auto max-w-[1480px] px-5 py-7 lg:px-8 lg:py-9">
      <section className="mb-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_520px]">
        <div className="rounded-3xl bg-slate-900 p-6 text-white shadow-xl shadow-slate-200 md:p-8">
          <div className="flex h-full flex-col justify-between gap-8"><div><div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-teal-200"><Icon name="shield" className="h-4 w-4" />Laporan dapat ditelusuri dan diaudit</div><h1 className="max-w-3xl text-3xl font-bold tracking-tight md:text-4xl">Dashboard Laporan LK PPK</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Impor assignment terbaru, periksa kualitas data, lalu hasilkan workbook resmi LK Termin 1 dan Uji Petik.</p></div>{data?.latestImport && <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-400"><span>Periode <strong className="ml-1 text-slate-200">{data.latestImport.period}</strong></span><span>Import terakhir <strong className="ml-1 text-slate-200">{date(data.latestImport.importedAt)}</strong></span></div>}</div>
        </div>

        <div className="card p-5 md:p-6">
          <p className="text-[11px] font-bold uppercase tracking-[.12em] text-slate-500">Proses laporan</p>
          <h2 className="mt-2 text-xl font-bold text-slate-950">Pilih mode pemrosesan</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">Strict menjaga laporan dari konflik pemblokir. Permissive tetap mengekspor dengan catatan verifikasi.</p>
          <input type="hidden" {...register('mode')} />
          <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
            {(['strict', 'permissive'] as const).map((option) => <button key={option} type="button" onClick={() => setValue('mode', option, { shouldValidate: true })} className={`rounded-lg px-3 py-2.5 text-sm font-semibold ${mode === option ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{option === 'strict' ? 'Strict' : 'Permissive'}</button>)}
          </div>
          {strictBlocked && <div className="mt-4 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"><Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" /><span><strong>{number(blocking)} anomali pemblokir.</strong> Tinjau data atau pilih Permissive agar ekspor tetap dibuat dengan catatan.</span></div>}
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button onClick={() => importMutation.mutate()} disabled={importMutation.isPending} className="button-secondary"><Icon name="refresh" className={`h-4 w-4 ${importMutation.isPending ? 'animate-spin' : ''}`} />{importMutation.isPending ? 'Mengimpor…' : 'Import data terbaru'}</button>
            <button onClick={() => generateMutation.mutate()} disabled={!data?.latestImport || generateMutation.isPending || strictBlocked} className="button-primary" title={strictBlocked ? 'Pilih Permissive atau selesaikan anomali pemblokir.' : undefined}><Icon name="file" className="h-4 w-4" />{generateMutation.isPending ? 'Membuat Excel…' : 'Generate Excel'}</button>
          </div>
        </div>
      </section>

      {error && <div className="mb-5 flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900"><Icon name="alert" className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-bold">Proses belum berhasil</p><p className="mt-1 leading-6 text-rose-800">{error instanceof Error ? error.message : 'Terjadi kesalahan yang tidak terduga.'}</p></div></div>}
      {notice && !error && <div className="mb-5 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-900"><span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-100"><Icon name="check" className="h-4 w-4" /></span>{notice}</div>}

      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {cards.map((card) => <StatCard key={card.label} {...card} value={dashboard.isLoading ? '···' : card.value} />)}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_350px]">
        <div className="card overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4 lg:flex lg:items-center lg:justify-between lg:gap-5"><div><h2 className="font-bold text-slate-950">Preview data dan laporan</h2><p className="mt-1 text-xs text-slate-500">Menampilkan maksimal 100 baris dari snapshot terbaru</p></div><div className="mt-4 flex overflow-x-auto rounded-xl bg-slate-100 p-1 text-xs font-semibold lg:mt-0">{tabOptions.map((option) => <button key={option.key} onClick={() => setTab(option.key)} className={`whitespace-nowrap rounded-lg px-3 py-2 ${tab === option.key ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{option.label}{option.key === 'anomalies' && stats ? ` (${number(stats.anomalies)})` : ''}</button>)}</div></div>
          <DataTable rows={currentRows} preferredColumns={tab === 'raw' ? rawPreviewColumns : undefined} />
        </div>

        <aside className="space-y-5">
          <div className="card p-5">
            <div className="flex items-center justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[.1em] text-slate-500">Kesiapan laporan</p><h2 className="mt-1 font-bold text-slate-950">Kualitas data</h2></div><div className={`grid h-10 w-10 place-items-center rounded-xl ${blocking === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}><Icon name={blocking === 0 ? 'shield' : 'alert'} /></div></div>
            <div className="mt-4"><QualityRow label="Pemblokir strict" value={blocking} tone={blocking === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'} /><QualityRow label="Error & critical" value={quality?.errors ?? 0} tone="bg-rose-50 text-rose-700" /><QualityRow label="Warning" value={quality?.warnings ?? 0} tone="bg-blue-50 text-blue-700" /></div>
            <button onClick={() => setTab('anomalies')} className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50">Lihat rincian anomali</button>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between"><h2 className="font-bold text-slate-950">Sumber data</h2><Icon name="database" className="h-5 w-5 text-teal-600" /></div>
            {data?.latestImport ? <dl className="mt-4 space-y-3 text-sm"><div><dt className="text-xs text-slate-500">Sheet assignment</dt><dd className="mt-1 font-bold text-slate-900">{data.latestImport.source.sheetName}</dd></div><div className="border-t border-slate-100 pt-3"><dt className="text-xs text-slate-500">Spreadsheet ID</dt><dd className="mt-1 truncate font-medium text-slate-700" title={data.latestImport.source.spreadsheetId}>{data.latestImport.source.spreadsheetId}</dd></div>{data.progressSource && <><div className="border-t border-slate-100 pt-3"><dt className="text-xs text-slate-500">Workbook Uji Petik</dt><dd className="mt-1 break-words font-medium text-slate-700">{data.progressSource.filename}</dd></div><div className="flex justify-between gap-4"><dt className="text-slate-500">SubSLS terbaca</dt><dd className="font-bold text-slate-900">{number(data.progressSource.subsls)}</dd></div><div className="flex justify-between gap-4"><dt className="text-slate-500">PPL terpetakan</dt><dd className="font-bold text-slate-900">{number(data.progressSource.matchedPpl)}</dd></div></>}</dl> : <p className="mt-4 text-sm leading-6 text-slate-500">Belum ada snapshot. Jalankan import data terbaru.</p>}
            {spreadsheetUrl && <a href={spreadsheetUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"><Icon name="sheet" className="h-4 w-4" />Buka Google Spreadsheet</a>}
          </div>

          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><h2 className="font-bold text-slate-950">Riwayat laporan</h2><p className="mt-1 text-xs text-slate-500">Workbook terbaru</p></div><Icon name="file" className="h-5 w-5 text-slate-400" /></div>
            {data?.reports.length ? <div className="table-scroll max-h-72 divide-y divide-slate-100 overflow-y-auto">{data.reports.map((report) => <div key={report.id} className="flex items-center gap-3 px-4 py-3"><div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${report.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : report.status === 'failed' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}><Icon name="file" className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-slate-800" title={report.filename}>{report.filename}</p><p className="mt-1 text-[11px] text-slate-500">{date(report.generatedAt)} · {number(report.warningCount)} warning</p></div>{report.status === 'completed' && <a href={api.downloadUrl(report.id)} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700 hover:bg-teal-100" aria-label={`Unduh ${report.filename}`}><Icon name="download" className="h-4 w-4" /></a>}</div>)}</div> : <p className="px-5 py-6 text-center text-sm text-slate-500">Belum ada laporan.</p>}
          </div>
        </aside>
      </section>
    </main>
  </div>;
}
