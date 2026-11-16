'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CATEGORIES, type Category } from '@/lib/types';
import type { CategoryTotal } from '@/lib/analytics';
import { CATEGORY_META } from '@/lib/categories';
import { formatCurrency, formatPercent } from '@/lib/format';

const RADIUS = 15.9155; // circumference ≈ 100, so dash lengths read as percentages
const GAP = 0.8; // surface gap between segments

export function CategoryBreakdown({ data, total }: { data: CategoryTotal[]; total: number }) {
  const [active, setActive] = useState<Category | null>(null);

  // Segments are drawn in fixed category order (colors were validated for adjacency in that order).
  const byCategory = new Map(data.map((d) => [d.category, d]));
  const segments = CATEGORIES.map((c) => byCategory.get(c)).filter((d): d is CategoryTotal => !!d && d.total > 0);
  const single = segments.length === 1;

  let offset = 0;
  const arcs = segments.map((d) => {
    const length = Math.max(d.percent - (single ? 0 : GAP), 0.3);
    const arc = { ...d, dash: `${length} ${100 - length}`, offset: 25 - offset };
    offset += d.percent;
    return arc;
  });

  const activeItem = active ? byCategory.get(active) : undefined;

  return (
    <div className="card flex flex-col p-5 sm:p-6">
      <h2 className="text-base font-semibold text-slate-900">Spending by category</h2>
      <p className="text-sm text-slate-500">All time</p>

      <div className="relative mx-auto mt-5 h-44 w-44">
        <svg viewBox="0 0 42 42" className="h-full w-full" role="img" aria-label="Spending by category donut chart">
          <circle cx="21" cy="21" r={RADIUS} fill="none" stroke="#f1f5f9" strokeWidth="5" />
          {arcs.map((a) => (
            <circle
              key={a.category}
              cx="21"
              cy="21"
              r={RADIUS}
              fill="none"
              stroke={CATEGORY_META[a.category].color}
              strokeWidth={active === a.category ? 6.5 : 5}
              strokeDasharray={a.dash}
              strokeDashoffset={a.offset}
              opacity={active && active !== a.category ? 0.35 : 1}
              className="cursor-pointer transition-all duration-200"
              onMouseEnter={() => setActive(a.category)}
              onMouseLeave={() => setActive(null)}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xs font-medium text-slate-500">{activeItem ? activeItem.category : 'Total'}</span>
          <span className="text-lg font-semibold text-slate-900 tabular-nums">
            {formatCurrency(activeItem ? activeItem.total : total)}
          </span>
          {activeItem && <span className="text-xs text-slate-500">{formatPercent(activeItem.percent, 1)}</span>}
        </div>
      </div>

      {/* Legend doubles as the data table: name, amount and share are always visible as text. */}
      <ul className="mt-6 space-y-1">
        {data.map((d) => (
          <li key={d.category}>
            <Link
              href={`/expenses?category=${encodeURIComponent(d.category)}`}
              onMouseEnter={() => setActive(d.category)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(d.category)}
              onBlur={() => setActive(null)}
              className={`flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm transition ${
                active === d.category ? 'bg-slate-50' : ''
              }`}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: CATEGORY_META[d.category].color }} />
              <span className="flex-1 truncate text-slate-700">{d.category}</span>
              <span className="text-slate-500 tabular-nums">{formatPercent(d.percent)}</span>
              <span className="w-24 text-right font-medium text-slate-900 tabular-nums">{formatCurrency(d.total)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
