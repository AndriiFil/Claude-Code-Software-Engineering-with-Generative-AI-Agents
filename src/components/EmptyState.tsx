'use client';

import { Plus, Sparkles, Wallet } from 'lucide-react';
import { useExpenses } from '@/context/ExpenseContext';
import { useExpenseEditor } from '@/context/ExpenseEditorContext';
import { useToast } from '@/context/ToastContext';

export function EmptyState() {
  const { loadSampleData } = useExpenses();
  const { openEditor } = useExpenseEditor();
  const { showToast } = useToast();

  return (
    <div className="card flex flex-col items-center px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50">
        <Wallet className="h-7 w-7 text-indigo-600" aria-hidden />
      </div>
      <h2 className="mt-5 text-lg font-semibold text-slate-900">No expenses yet</h2>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        Start tracking where your money goes. Add your first expense, or load some sample data to explore the dashboard.
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <button type="button" className="btn-primary" onClick={() => openEditor()}>
          <Plus className="h-4 w-4" aria-hidden /> Add your first expense
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            loadSampleData();
            showToast({ message: 'Sample data loaded. Explore away!' });
          }}
        >
          <Sparkles className="h-4 w-4" aria-hidden /> Load sample data
        </button>
      </div>
    </div>
  );
}
