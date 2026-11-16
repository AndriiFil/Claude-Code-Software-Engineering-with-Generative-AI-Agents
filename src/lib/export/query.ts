import { CATEGORIES, type Category, type Expense } from '../types';
import type { ExportQuery, ExportSortOrder, ExportSummary } from './types';

export const SORT_OPTIONS: { id: ExportSortOrder; label: string }[] = [
  { id: 'date-desc', label: 'Date (newest first)' },
  { id: 'date-asc', label: 'Date (oldest first)' },
  { id: 'amount-desc', label: 'Amount (highest first)' },
  { id: 'amount-asc', label: 'Amount (lowest first)' },
];

export function defaultExportQuery(): ExportQuery {
  return { startDate: '', endDate: '', categories: [...CATEGORIES], sort: 'date-desc' };
}

export function isDateRangeValid(query: Pick<ExportQuery, 'startDate' | 'endDate'>): boolean {
  return !query.startDate || !query.endDate || query.startDate <= query.endDate;
}

function inDateRange(e: Expense, query: ExportQuery): boolean {
  if (query.startDate && e.date < query.startDate) return false;
  if (query.endDate && e.date > query.endDate) return false;
  return true;
}

const COMPARATORS: Record<ExportSortOrder, (a: Expense, b: Expense) => number> = {
  'date-desc': (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
  'date-asc': (a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt),
  'amount-desc': (a, b) => b.amount - a.amount || b.date.localeCompare(a.date),
  'amount-asc': (a, b) => a.amount - b.amount || b.date.localeCompare(a.date),
};

/** Applies date range + category filters and the chosen sort order. */
export function selectExpenses(expenses: Expense[], query: ExportQuery): Expense[] {
  if (!isDateRangeValid(query)) return [];
  const allowed = new Set<Category>(query.categories);
  return expenses
    .filter((e) => allowed.has(e.category) && inDateRange(e, query))
    .sort(COMPARATORS[query.sort]);
}

/** Per-category record counts inside the date range (ignores the category filter), for the chip badges. */
export function countByCategoryInRange(expenses: Expense[], query: ExportQuery): Record<Category, number> {
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
  if (!isDateRangeValid(query)) return counts;
  for (const e of expenses) if (inDateRange(e, query)) counts[e.category] += 1;
  return counts;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function summarize(rows: Expense[]): ExportSummary {
  let total = 0;
  let firstDate: string | null = null;
  let lastDate: string | null = null;
  const perCat = new Map<Category, { count: number; total: number }>();

  for (const e of rows) {
    total += e.amount;
    if (!firstDate || e.date < firstDate) firstDate = e.date;
    if (!lastDate || e.date > lastDate) lastDate = e.date;
    const entry = perCat.get(e.category) ?? { count: 0, total: 0 };
    entry.count += 1;
    entry.total += e.amount;
    perCat.set(e.category, entry);
  }

  return {
    count: rows.length,
    total: round2(total),
    average: rows.length ? round2(total / rows.length) : 0,
    firstDate,
    lastDate,
    byCategory: CATEGORIES.filter((c) => perCat.has(c)).map((c) => ({
      category: c,
      count: perCat.get(c)!.count,
      total: round2(perCat.get(c)!.total),
    })),
  };
}
