'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, SearchX, Trash2 } from 'lucide-react';
import { useExpenses } from '@/context/ExpenseContext';
import { useExpenseEditor } from '@/context/ExpenseEditorContext';
import { useToast } from '@/context/ToastContext';
import { isCategory, type ExpenseFilters, type SortField, type SortState } from '@/lib/types';
import { applyFilters, DEFAULT_FILTERS, hasActiveFilters, sortExpenses } from '@/lib/filters';
import { sumAmounts } from '@/lib/analytics';
import { formatCurrency } from '@/lib/format';
import { downloadCSV } from '@/lib/csv';
import { ExpenseFiltersBar } from '@/components/expenses/ExpenseFiltersBar';
import { ExpenseList } from '@/components/expenses/ExpenseList';
import { EmptyState } from '@/components/EmptyState';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export default function ExpensesPage() {
  const { expenses, isLoading, clearAll } = useExpenses();
  const { openEditor, requestDelete } = useExpenseEditor();
  const { showToast } = useToast();

  const [filters, setFilters] = useState<ExpenseFilters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<SortState>({ field: 'date', direction: 'desc' });
  const [confirmClear, setConfirmClear] = useState(false);

  // Allow deep links like /expenses?category=Food (used by the dashboard legend).
  useEffect(() => {
    const category = new URLSearchParams(window.location.search).get('category');
    if (isCategory(category)) setFilters((f) => ({ ...f, category }));
  }, []);

  const visible = useMemo(() => sortExpenses(applyFilters(expenses, filters), sort), [expenses, filters, sort]);
  const visibleTotal = useMemo(() => sumAmounts(visible), [visible]);
  const filtered = hasActiveFilters(filters);

  const handleSort = (field: SortField) =>
    setSort((prev) =>
      prev.field === field
        ? { field, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { field, direction: field === 'date' || field === 'amount' ? 'desc' : 'asc' },
    );

  const handleExport = () => {
    try {
      downloadCSV(visible, filtered ? 'expenses-filtered' : 'expenses');
      showToast({ message: `Exported ${visible.length} ${visible.length === 1 ? 'expense' : 'expenses'} to CSV.` });
    } catch {
      showToast({ type: 'error', message: 'Export failed. Please try again.' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Expenses</h1>
          <p className="mt-1 text-sm text-slate-500">Search, filter, edit and export your expenses.</p>
        </div>
        {!isLoading && expenses.length > 0 && (
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={handleExport} disabled={visible.length === 0}>
              <Download className="h-4 w-4" aria-hidden />
              Export {filtered ? 'filtered' : 'all'}
            </button>
            <button
              type="button"
              className="btn-secondary text-rose-600 hover:bg-rose-50"
              onClick={() => setConfirmClear(true)}
              aria-label="Delete all expenses"
              title="Delete all expenses"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <ListSkeleton />
      ) : expenses.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <ExpenseFiltersBar filters={filters} onChange={setFilters} />

          <div className="flex flex-wrap items-baseline justify-between gap-2 px-1 text-sm" aria-live="polite">
            <p className="text-slate-500">
              Showing <span className="font-medium text-slate-900">{visible.length}</span> of {expenses.length}{' '}
              {expenses.length === 1 ? 'expense' : 'expenses'}
            </p>
            <p className="text-slate-500">
              {filtered ? 'Filtered total' : 'Total'}:{' '}
              <span className="font-semibold text-slate-900 tabular-nums">{formatCurrency(visibleTotal)}</span>
            </p>
          </div>

          {visible.length > 0 ? (
            <ExpenseList expenses={visible} sort={sort} onSort={handleSort} onEdit={openEditor} onDelete={requestDelete} />
          ) : (
            <div className="card flex flex-col items-center px-6 py-14 text-center">
              <SearchX className="h-10 w-10 text-slate-300" aria-hidden />
              <h2 className="mt-4 text-base font-semibold text-slate-900">No matching expenses</h2>
              <p className="mt-1 text-sm text-slate-500">Try adjusting your search or filters.</p>
              <button type="button" className="btn-secondary mt-5" onClick={() => setFilters(DEFAULT_FILTERS)}>
                Reset filters
              </button>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={confirmClear}
        title="Delete all expenses?"
        message={`This permanently removes all ${expenses.length} expenses from this browser. Consider exporting a CSV backup first. This can't be undone.`}
        confirmLabel="Delete all"
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => {
          clearAll();
          setConfirmClear(false);
          setFilters(DEFAULT_FILTERS);
          showToast({ type: 'info', message: 'All expenses deleted.' });
        }}
      />
    </div>
  );
}
