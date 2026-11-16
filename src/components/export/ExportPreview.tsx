'use client';

import { useEffect, useMemo, useState } from 'react';
import { Eye, FileSearch, SearchX, Table2 } from 'lucide-react';
import type { Expense } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/format';
import { CategoryBadge } from '@/components/ui/CategoryBadge';
import { CATEGORY_META } from '@/lib/categories';
import type { ExportContext, ExportFormat } from '@/lib/export';

const TABLE_LIMIT = 100;
const RAW_LIMIT = 25;

type Tab = 'table' | 'file';

interface Props {
  rows: Expense[];
  ctx: ExportContext;
  format: ExportFormat;
  onResetFilters: () => void;
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 truncate text-base font-semibold tabular-nums text-slate-900">{value}</p>
      {sub && <p className="truncate text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

/** Live PDF preview: renders the real generated document in an iframe. */
function PdfFrame({ rows, ctx, format }: Omit<Props, 'onResetFilters'>) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    // Debounce so dragging through options doesn't regenerate on every change.
    const t = setTimeout(() => {
      const blob = format.serialize(rows, ctx);
      setUrl(URL.createObjectURL(blob));
    }, 300);
    return () => clearTimeout(t);
  }, [rows, ctx, format]);

  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);

  if (!url) return <div className="h-[560px] animate-pulse rounded-xl bg-slate-100" aria-label="Rendering PDF preview" />;
  return (
    <iframe
      src={`${url}#toolbar=0&navpanes=0&view=FitH`}
      title="PDF preview"
      className="h-[560px] w-full rounded-xl border border-slate-200 bg-slate-100"
    />
  );
}

function RawPreview({ rows, ctx, format }: Omit<Props, 'onResetFilters'>) {
  const text = useMemo(() => format.serializeText?.(rows.slice(0, RAW_LIMIT), ctx) ?? '', [rows, ctx, format]);
  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-700/70 px-3 py-1.5 text-[11px] text-slate-400">
        <span className="font-mono">{format.mimeType.split(';')[0]}</span>
        {rows.length > RAW_LIMIT && <span>First {RAW_LIMIT} of {rows.length} records</span>}
      </div>
      <pre className="max-h-[520px] overflow-auto p-3 font-mono text-xs leading-relaxed text-slate-100">{text}</pre>
    </div>
  );
}

export function ExportPreview({ rows, ctx, format, onResetFilters }: Props) {
  const [tab, setTab] = useState<Tab>('table');
  const { summary } = ctx;

  // Compact span ("May 25 – Nov 16") with the year(s) underneath so it fits narrow stat tiles.
  let span = '—';
  let spanSub: string | undefined;
  if (summary.firstDate && summary.lastDate) {
    const md = { month: 'short', day: 'numeric' } as const;
    const y1 = summary.firstDate.slice(0, 4);
    const y2 = summary.lastDate.slice(0, 4);
    span =
      summary.firstDate === summary.lastDate
        ? formatDate(summary.firstDate, md)
        : `${formatDate(summary.firstDate, md)} – ${formatDate(summary.lastDate, md)}`;
    spanSub = y1 === y2 ? y1 : `${y1} – ${y2}`;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 2xl:grid-cols-4" aria-live="polite">
        <Stat label="Records" value={summary.count.toLocaleString('en-US')} sub={`${summary.byCategory.length} ${summary.byCategory.length === 1 ? 'category' : 'categories'}`} />
        <Stat label="Total" value={formatCurrency(summary.total)} />
        <Stat label="Average" value={formatCurrency(summary.average)} sub="per expense" />
        <Stat label="Date span" value={span} sub={spanSub} />
      </div>

      {summary.byCategory.length > 0 && (
        <div>
          <div className="flex h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden>
            {summary.byCategory.map((c) => (
              <div
                key={c.category}
                className="h-full"
                style={{
                  width: `${summary.total > 0 ? (c.total / summary.total) * 100 : 0}%`,
                  backgroundColor: CATEGORY_META[c.category].color,
                }}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <div role="tablist" aria-label="Preview mode" className="inline-flex rounded-lg bg-slate-100 p-0.5">
          {(
            [
              ['table', 'Data', Table2],
              ['file', format.hasTextPreview ? `${format.label} source` : `${format.label} document`, Eye],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition ${
                tab === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {label}
            </button>
          ))}
        </div>
        {tab === 'table' && rows.length > TABLE_LIMIT && (
          <p className="text-xs text-slate-500">
            Showing first {TABLE_LIMIT} — all {rows.length.toLocaleString('en-US')} will be exported
          </p>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 px-6 py-14 text-center">
          <SearchX className="h-9 w-9 text-slate-300" aria-hidden />
          <p className="mt-3 text-sm font-semibold text-slate-900">Nothing to export</p>
          <p className="mt-1 text-sm text-slate-500">No expenses match these filters.</p>
          <button type="button" className="btn-secondary mt-4" onClick={onResetFilters}>
            Reset filters
          </button>
        </div>
      ) : tab === 'table' ? (
        <div className="max-h-[520px] overflow-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500 shadow-[0_1px_0_theme(colors.slate.200)]">
              <tr>
                <th scope="col" className="px-3 py-2">Date</th>
                <th scope="col" className="px-3 py-2">Category</th>
                <th scope="col" className="px-3 py-2 text-right">Amount</th>
                <th scope="col" className="px-3 py-2">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.slice(0, TABLE_LIMIT).map((e) => (
                <tr key={e.id} className="hover:bg-slate-50/70">
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-600">{formatDate(e.date)}</td>
                  <td className="px-3 py-2">
                    <CategoryBadge category={e.category} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right font-medium tabular-nums text-slate-900">
                    {formatCurrency(e.amount)}
                  </td>
                  <td className="max-w-[280px] truncate px-3 py-2 text-slate-700" title={e.description}>
                    {e.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : format.hasTextPreview ? (
        <RawPreview rows={rows} ctx={ctx} format={format} />
      ) : (
        <PdfFrame rows={rows} ctx={ctx} format={format} />
      )}

      {tab === 'file' && !format.hasTextPreview && rows.length > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-slate-500">
          <FileSearch className="h-3.5 w-3.5" aria-hidden /> This is the actual PDF that will be downloaded.
        </p>
      )}
    </div>
  );
}
