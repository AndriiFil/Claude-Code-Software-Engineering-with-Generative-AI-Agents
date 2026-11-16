'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { Expense } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/format';
import { CategoryIcon } from '@/components/ui/CategoryBadge';
import { useExpenseEditor } from '@/context/ExpenseEditorContext';

export function RecentExpenses({ expenses }: { expenses: Expense[] }) {
  const { openEditor } = useExpenseEditor();

  return (
    <div className="card">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
        <h2 className="text-base font-semibold text-slate-900">Recent expenses</h2>
        <Link href="/expenses" className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700">
          View all <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
      <ul className="divide-y divide-slate-100">
        {expenses.map((e) => (
          <li key={e.id}>
            <button
              type="button"
              onClick={() => openEditor(e)}
              className="flex w-full items-center gap-4 px-5 py-3.5 text-left transition hover:bg-slate-50 sm:px-6"
              aria-label={`Edit ${e.description}`}
            >
              <CategoryIcon category={e.category} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{e.description}</p>
                <p className="text-xs text-slate-500">
                  {e.category} · {formatDate(e.date)}
                </p>
              </div>
              <span className="text-sm font-semibold text-slate-900 tabular-nums">{formatCurrency(e.amount)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
