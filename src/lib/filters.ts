import type { Expense, ExpenseFilters, SortState } from './types';
import { toISODate } from './format';

export const DEFAULT_FILTERS: ExpenseFilters = {
  search: '',
  category: 'All',
  startDate: '',
  endDate: '',
};

export function applyFilters(expenses: Expense[], filters: ExpenseFilters): Expense[] {
  const query = filters.search.trim().toLowerCase();
  return expenses.filter((e) => {
    if (filters.category !== 'All' && e.category !== filters.category) return false;
    if (filters.startDate && e.date < filters.startDate) return false;
    if (filters.endDate && e.date > filters.endDate) return false;
    if (query) {
      const haystack = `${e.description} ${e.category} ${e.amount.toFixed(2)}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

export function sortExpenses(expenses: Expense[], sort: SortState): Expense[] {
  const dir = sort.direction === 'asc' ? 1 : -1;
  return [...expenses].sort((a, b) => {
    let cmp = 0;
    switch (sort.field) {
      case 'amount':
        cmp = a.amount - b.amount;
        break;
      case 'category':
        cmp = a.category.localeCompare(b.category);
        break;
      case 'description':
        cmp = a.description.localeCompare(b.description);
        break;
      default:
        cmp = a.date.localeCompare(b.date);
    }
    // Stable tie-breaker: most recently created first.
    if (cmp === 0) cmp = a.createdAt.localeCompare(b.createdAt);
    return cmp * dir;
  });
}

export function hasActiveFilters(filters: ExpenseFilters): boolean {
  return (
    filters.search.trim() !== '' ||
    filters.category !== 'All' ||
    filters.startDate !== '' ||
    filters.endDate !== ''
  );
}

export type QuickRange = 'thisMonth' | 'lastMonth' | 'last30' | 'thisYear';

export const QUICK_RANGES: { id: QuickRange; label: string }[] = [
  { id: 'thisMonth', label: 'This month' },
  { id: 'lastMonth', label: 'Last month' },
  { id: 'last30', label: 'Last 30 days' },
  { id: 'thisYear', label: 'This year' },
];

export function quickRangeDates(range: QuickRange, now = new Date()): { startDate: string; endDate: string } {
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (range) {
    case 'thisMonth':
      return { startDate: toISODate(new Date(y, m, 1)), endDate: toISODate(new Date(y, m + 1, 0)) };
    case 'lastMonth':
      return { startDate: toISODate(new Date(y, m - 1, 1)), endDate: toISODate(new Date(y, m, 0)) };
    case 'last30':
      return { startDate: toISODate(new Date(y, m, now.getDate() - 29)), endDate: toISODate(now) };
    case 'thisYear':
      return { startDate: toISODate(new Date(y, 0, 1)), endDate: toISODate(new Date(y, 11, 31)) };
  }
}
