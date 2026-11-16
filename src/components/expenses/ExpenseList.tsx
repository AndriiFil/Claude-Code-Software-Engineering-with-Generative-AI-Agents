'use client';

import { ArrowDown, ArrowUp, ArrowUpDown, Pencil, Trash2 } from 'lucide-react';
import type { Expense, SortField, SortState } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/format';
import { CategoryBadge, CategoryIcon } from '@/components/ui/CategoryBadge';

interface Props {
  expenses: Expense[];
  sort: SortState;
  onSort: (field: SortField) => void;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}

function SortHeader({
  field,
  label,
  sort,
  onSort,
  align = 'left',
}: {
  field: SortField;
  label: string;
  sort: SortState;
  onSort: (f: SortField) => void;
  align?: 'left' | 'right';
}) {
  const active = sort.field === field;
  const Icon = !active ? ArrowUpDown : sort.direction === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th
      scope="col"
      aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 ${align === 'right' ? 'text-right' : 'text-left'}`}
    >
      <button
        type="button"
        onClick={() => onSort(field)}
        className={`inline-flex items-center gap-1 rounded hover:text-slate-800 ${active ? 'text-slate-800' : ''}`}
      >
        {label}
        <Icon className={`h-3.5 w-3.5 ${active ? '' : 'opacity-40'}`} aria-hidden />
      </button>
    </th>
  );
}

function RowActions({ expense, onEdit, onDelete }: { expense: Expense; onEdit: Props['onEdit']; onDelete: Props['onDelete'] }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={() => onEdit(expense)}
        className="rounded-lg p-2 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
        aria-label={`Edit ${expense.description}`}
        title="Edit"
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onDelete(expense)}
        className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
        aria-label={`Delete ${expense.description}`}
        title="Delete"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ExpenseList({ expenses, sort, onSort, onEdit, onDelete }: Props) {
  return (
    <div className="card overflow-hidden">
      {/* Desktop table */}
      <table className="hidden w-full md:table">
        <thead className="border-b border-slate-200 bg-slate-50/60">
          <tr>
            <SortHeader field="date" label="Date" sort={sort} onSort={onSort} />
            <SortHeader field="description" label="Description" sort={sort} onSort={onSort} />
            <SortHeader field="category" label="Category" sort={sort} onSort={onSort} />
            <SortHeader field="amount" label="Amount" sort={sort} onSort={onSort} align="right" />
            <th scope="col" className="w-24 px-4 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {expenses.map((e) => (
            <tr key={e.id} className="group transition hover:bg-slate-50/70">
              <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{formatDate(e.date)}</td>
              <td className="max-w-xs truncate px-4 py-3 text-sm font-medium text-slate-900" title={e.description}>
                {e.description}
              </td>
              <td className="px-4 py-3">
                <CategoryBadge category={e.category} />
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-slate-900 tabular-nums">
                {formatCurrency(e.amount)}
              </td>
              <td className="px-4 py-2">
                <div className="opacity-100 transition md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                  <RowActions expense={e} onEdit={onEdit} onDelete={onDelete} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile cards */}
      <ul className="divide-y divide-slate-100 md:hidden">
        {expenses.map((e) => (
          <li key={e.id} className="flex items-center gap-3 px-4 py-3">
            <CategoryIcon category={e.category} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{e.description}</p>
              <p className="text-xs text-slate-500">
                {e.category} · {formatDate(e.date)}
              </p>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-sm font-semibold text-slate-900 tabular-nums">{formatCurrency(e.amount)}</span>
              <RowActions expense={e} onEdit={onEdit} onDelete={onDelete} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
