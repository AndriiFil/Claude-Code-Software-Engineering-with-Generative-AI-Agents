'use client';

import { Check } from 'lucide-react';
import { CATEGORIES, type Category } from '@/lib/types';
import { CATEGORY_META } from '@/lib/categories';

interface Props {
  selected: Category[];
  counts: Record<Category, number>;
  onChange: (next: Category[]) => void;
}

export function CategoryPicker({ selected, counts, onChange }: Props) {
  const set = new Set(selected);
  const toggle = (c: Category) =>
    // Keep canonical category order regardless of click order.
    onChange(CATEGORIES.filter((x) => (x === c ? !set.has(c) : set.has(x))));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          {selected.length === CATEGORIES.length ? 'All categories' : `${selected.length} of ${CATEGORIES.length} selected`}
        </p>
        <div className="flex gap-1 text-xs font-medium">
          <button
            type="button"
            className="rounded px-1.5 py-0.5 text-indigo-600 hover:bg-indigo-50 disabled:text-slate-300 disabled:hover:bg-transparent"
            onClick={() => onChange([...CATEGORIES])}
            disabled={selected.length === CATEGORIES.length}
          >
            Select all
          </button>
          <button
            type="button"
            className="rounded px-1.5 py-0.5 text-indigo-600 hover:bg-indigo-50 disabled:text-slate-300 disabled:hover:bg-transparent"
            onClick={() => onChange([])}
            disabled={selected.length === 0}
          >
            Clear
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5" role="group" aria-label="Categories to export">
        {CATEGORIES.map((c) => {
          const on = set.has(c);
          const count = counts[c];
          return (
            <button
              key={c}
              type="button"
              onClick={() => toggle(c)}
              aria-pressed={on}
              title={`${c} — ${count} in range`}
              className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-sm transition ${
                on
                  ? 'border-indigo-300 bg-white text-slate-900 shadow-sm'
                  : 'border-transparent bg-slate-100/70 text-slate-500 hover:bg-slate-100'
              } ${count === 0 && !on ? 'opacity-60' : ''}`}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: on ? CATEGORY_META[c].color : '#cbd5e1' }} aria-hidden />
              <span className="min-w-0 flex-1 truncate font-medium">{c}</span>
              <span className="tabular-nums text-xs text-slate-400">{count}</span>
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                  on ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white'
                }`}
                aria-hidden
              >
                {on && <Check className="h-3 w-3" strokeWidth={3} />}
              </span>
            </button>
          );
        })}
      </div>

      {selected.length === 0 && (
        <p className="text-xs font-medium text-rose-600" role="alert">
          Select at least one category.
        </p>
      )}
    </div>
  );
}
