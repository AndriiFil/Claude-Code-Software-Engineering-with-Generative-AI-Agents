import type { Cell } from '@/lib/cloud/types';
import { formatCurrency } from '@/lib/format';

interface Props {
  columns: string[];
  rows: Cell[][];
  currencyColumns: number[];
  limit?: number;
  /** Spreadsheet look: A/B/C headers and row numbers. */
  sheet?: boolean;
  className?: string;
}

const isSummaryRow = (row: Cell[]) => row.some((c) => typeof c === 'string' && /subtotal$|^TOTAL$/.test(c));

export function DatasetTable({ columns, rows, currencyColumns, limit, sheet, className = '' }: Props) {
  const shown = limit ? rows.slice(0, limit) : rows;
  const fmt = (c: Cell, i: number) => (typeof c === 'number' && currencyColumns.includes(i) ? formatCurrency(c) : String(c));

  if (sheet) {
    return (
      <div className={`overflow-auto rounded-lg border border-slate-300 bg-white font-sans text-[11px] ${className}`}>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-500">
              <th className="w-8 border border-slate-200" />
              {columns.map((_, i) => (
                <th key={i} className="border border-slate-200 px-2 py-0.5 font-normal">
                  {String.fromCharCode(65 + i)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-slate-200 bg-slate-100 text-center text-slate-500">1</td>
              {columns.map((c) => (
                <td key={c} className="whitespace-nowrap border border-slate-200 bg-emerald-50 px-2 py-0.5 font-semibold text-slate-800">
                  {c}
                </td>
              ))}
            </tr>
            {shown.map((row, r) => (
              <tr key={r}>
                <td className="border border-slate-200 bg-slate-100 text-center text-slate-500">{r + 2}</td>
                {row.map((c, i) => (
                  <td key={i} className={`max-w-[180px] truncate whitespace-nowrap border border-slate-200 px-2 py-0.5 ${typeof c === 'number' ? 'text-right tabular-nums' : ''}`}>
                    {typeof c === 'number' ? c.toFixed(2) : c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className={`overflow-auto rounded-xl border border-slate-200 ${className}`}>
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            {columns.map((c, i) => (
              <th key={c} scope="col" className={`whitespace-nowrap px-3 py-2 ${currencyColumns.includes(i) ? 'text-right' : ''}`}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {shown.map((row, r) => (
            <tr key={r} className={isSummaryRow(row) ? 'bg-slate-50 font-semibold' : ''}>
              {row.map((c, i) => (
                <td
                  key={i}
                  className={`max-w-[260px] truncate whitespace-nowrap px-3 py-2 ${currencyColumns.includes(i) ? 'text-right tabular-nums text-slate-900' : 'text-slate-700'}`}
                  title={String(c)}
                >
                  {fmt(c, i)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {limit && rows.length > limit && (
        <p className="border-t border-slate-100 bg-slate-50 px-3 py-1.5 text-xs text-slate-500">+ {rows.length - limit} more rows</p>
      )}
    </div>
  );
}
