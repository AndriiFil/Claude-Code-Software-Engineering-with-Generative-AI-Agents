'use client';

import { CalendarDays, RotateCcw, Search, X } from 'lucide-react';
import { CATEGORIES, type Category, type ExpenseFilters } from '@/lib/types';
import { DEFAULT_FILTERS, hasActiveFilters, QUICK_RANGES, quickRangeDates } from '@/lib/filters';

interface Props {
  filters: ExpenseFilters;
  onChange: (filters: ExpenseFilters) => void;
}

export function ExpenseFiltersBar({ filters, onChange }: Props) {
  const update = (patch: Partial<ExpenseFilters>) => onChange({ ...filters, ...patch });
  const invalidRange = filters.startDate && filters.endDate && filters.startDate > filters.endDate;

  return (
    <div className="card space-y-4 p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
        <div className="relative md:col-span-12 lg:col-span-5">
          <label htmlFor="filter-search" className="sr-only">
            Search expenses
          </label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            id="filter-search"
            type="search"
            placeholder="Search description, category or amount…"
            value={filters.search}
            onChange={(e) => update({ search: e.target.value })}
            className="input pl-9 pr-9"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => update({ search: '' })}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="md:col-span-4 lg:col-span-3">
          <label htmlFor="filter-category" className="sr-only">
            Category
          </label>
          <select
            id="filter-category"
            value={filters.category}
            onChange={(e) => update({ category: e.target.value as Category | 'All' })}
            className="input"
          >
            <option value="All">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:col-span-8 lg:col-span-4">
          {(
            [
              { id: 'filter-start', key: 'startDate', label: 'From', min: undefined, max: filters.endDate },
              { id: 'filter-end', key: 'endDate', label: 'To', min: filters.startDate, max: undefined },
            ] as const
          ).map((f) => (
            <div key={f.id} className="relative">
              <label
                htmlFor={f.id}
                className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-xs font-medium text-slate-400"
              >
                {f.label}
              </label>
              <input
                id={f.id}
                type="date"
                value={filters[f.key]}
                min={f.min || undefined}
                max={f.max || undefined}
                onChange={(e) => update({ [f.key]: e.target.value })}
                className="input date-overlay pl-11 pr-8"
              />
              <CalendarDays
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-medium uppercase tracking-wide text-slate-400">Quick range</span>
        {QUICK_RANGES.map((r) => {
          const dates = quickRangeDates(r.id);
          const selected = filters.startDate === dates.startDate && filters.endDate === dates.endDate;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => update(selected ? { startDate: '', endDate: '' } : dates)}
              aria-pressed={selected}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                selected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {r.label}
            </button>
          );
        })}
        {hasActiveFilters(filters) && (
          <button
            type="button"
            onClick={() => onChange(DEFAULT_FILTERS)}
            className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reset filters
          </button>
        )}
      </div>

      {invalidRange && (
        <p className="field-error" role="alert">
          The start date is after the end date, so no expenses can match.
        </p>
      )}
    </div>
  );
}
