'use client';

import { useState } from 'react';
import type { MonthTotal } from '@/lib/analytics';
import { formatCompactCurrency, formatCurrency } from '@/lib/format';

const BAR_COLOR = '#2a78d6';
const BAR_COLOR_MUTED = '#9ec5f4';

/** Rounds the axis max up to a "nice" number so gridlines land on clean values. */
function niceMax(value: number): number {
  if (value <= 0) return 100;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

export function MonthlyTrendChart({ data }: { data: MonthTotal[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = niceMax(Math.max(...data.map((d) => d.total)));
  const ticks = [max, max / 2, 0];
  const average = data.reduce((s, d) => s + d.total, 0) / (data.length || 1);

  return (
    <div className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Monthly spending</h2>
          <p className="text-sm text-slate-500">Last {data.length} months</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Monthly average</p>
          <p className="text-lg font-semibold text-slate-900 tabular-nums">{formatCurrency(average)}</p>
        </div>
      </div>

      <div className="mt-6 flex h-60 gap-3" aria-hidden>
        {/* Y axis */}
        <div className="flex w-12 flex-col justify-between pb-6 text-right text-xs leading-none text-slate-400 tabular-nums">
          {ticks.map((t) => (
            <span key={t}>
              {formatCompactCurrency(t)}
            </span>
          ))}
        </div>

        {/* Plot */}
        <div className="relative flex-1">
          <div className="absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between">
            {ticks.map((t) => (
              <div key={t} className="border-t border-dashed border-slate-200 last:border-solid last:border-slate-300" />
            ))}
          </div>

          <div className="absolute inset-x-0 top-0 bottom-0 flex gap-1 sm:gap-2" onMouseLeave={() => setActive(null)}>
            {data.map((d, i) => {
              const height = max > 0 ? (d.total / max) * 100 : 0;
              const isCurrent = i === data.length - 1;
              const isActive = active === i;
              return (
                <div
                  key={d.key}
                  className="group relative flex flex-1 cursor-default flex-col items-center"
                  onMouseEnter={() => setActive(i)}
                  onTouchStart={() => setActive(i)}
                >
                  <div className="relative flex w-full flex-1 items-end justify-center pb-0">
                    {/* Hover column highlight (larger hit target than the bar) */}
                    <div className={`absolute inset-0 rounded-md transition ${isActive ? 'bg-slate-100/70' : ''}`} />
                    <div
                      className="relative w-full max-w-[44px] rounded-t transition-all duration-500"
                      style={{
                        height: `${Math.max(height, d.total > 0 ? 1.5 : 0)}%`,
                        backgroundColor: isCurrent || isActive ? BAR_COLOR : BAR_COLOR_MUTED,
                      }}
                    />
                    {isActive && (
                      <div
                        className="pointer-events-none absolute z-10 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-lg"
                        style={{ bottom: `calc(${Math.min(height, 70)}% + 8px)` }}
                      >
                        <p className="font-medium text-slate-300">{d.fullLabel}</p>
                        <p className="mt-0.5 text-sm font-semibold tabular-nums">{formatCurrency(d.total)}</p>
                        <p className="text-slate-400">
                          {d.count} {d.count === 1 ? 'expense' : 'expenses'}
                        </p>
                      </div>
                    )}
                  </div>
                  <span className={`mt-2 h-4 text-xs ${isCurrent ? 'font-semibold text-slate-700' : 'text-slate-500'}`}>
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Accessible data table for screen readers */}
      <table className="sr-only">
        <caption>Monthly spending, last {data.length} months</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Total</th>
            <th scope="col">Expenses</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}>
              <td>{d.fullLabel}</td>
              <td>{formatCurrency(d.total)}</td>
              <td>{d.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
