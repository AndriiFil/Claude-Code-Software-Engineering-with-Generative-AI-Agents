import { CATEGORIES, type Category, type Expense } from '../types';
import { formatCurrency, formatDate, parseISODate, toISODate } from '../format';
import type { Cell, Dataset, FileFormat, PeriodId, TemplateId } from './types';

/* ----------------------------------------------------------------------------
 * Periods
 * ------------------------------------------------------------------------- */

export const PERIODS: { id: PeriodId; label: string }[] = [
  { id: 'this-month', label: 'This month' },
  { id: 'last-month', label: 'Last month' },
  { id: 'this-year', label: 'This year' },
  { id: 'last-year', label: 'Last year' },
  { id: 'last-12-months', label: 'Last 12 months' },
  { id: 'all', label: 'All time' },
];

export function periodRange(period: PeriodId, now = new Date()): { start: string | null; end: string | null; label: string } {
  const y = now.getFullYear();
  const m = now.getMonth();
  const monthName = (d: Date) => d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  switch (period) {
    case 'this-month':
      return { start: toISODate(new Date(y, m, 1)), end: toISODate(new Date(y, m + 1, 0)), label: monthName(new Date(y, m, 1)) };
    case 'last-month':
      return { start: toISODate(new Date(y, m - 1, 1)), end: toISODate(new Date(y, m, 0)), label: monthName(new Date(y, m - 1, 1)) };
    case 'this-year':
      return { start: `${y}-01-01`, end: `${y}-12-31`, label: `${y}` };
    case 'last-year':
      return { start: `${y - 1}-01-01`, end: `${y - 1}-12-31`, label: `${y - 1}` };
    case 'last-12-months':
      return { start: toISODate(new Date(y, m - 11, 1)), end: toISODate(new Date(y, m + 1, 0)), label: 'Last 12 months' };
    case 'all':
      return { start: null, end: null, label: 'All time' };
  }
}

export function filterByPeriod(expenses: Expense[], period: PeriodId, now = new Date()): Expense[] {
  const { start, end } = periodRange(period, now);
  return expenses.filter((e) => (!start || e.date >= start) && (!end || e.date <= end));
}

/* ----------------------------------------------------------------------------
 * Templates
 * ------------------------------------------------------------------------- */

export interface ExportTemplate {
  id: TemplateId;
  name: string;
  tagline: string;
  /** Who it's for / what it's good at. */
  useCase: string;
  defaultPeriod: PeriodId;
  defaultFormat: FileFormat;
  /** Tailwind gradient for the card art (literal strings for JIT). */
  gradient: string;
  build: (expenses: Expense[], period: PeriodId, now?: Date) => Dataset;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const sum = (xs: Expense[]) => r2(xs.reduce((s, e) => s + e.amount, 0));

function groupBy<K extends string>(xs: Expense[], key: (e: Expense) => K): Map<K, Expense[]> {
  const map = new Map<K, Expense[]>();
  for (const x of xs) {
    const k = key(x);
    const list = map.get(k);
    if (list) list.push(x);
    else map.set(k, [x]);
  }
  return map;
}

const taxReport: ExportTemplate = {
  id: 'tax-report',
  name: 'Tax Report',
  tagline: 'Itemized ledger with category subtotals',
  useCase: 'Hand to your accountant at year end',
  defaultPeriod: 'this-year',
  defaultFormat: 'csv',
  gradient: 'from-emerald-500 to-teal-600',
  build(expenses, period, now) {
    const range = periodRange(period, now);
    const rows: Cell[][] = [];
    const inPeriod = filterByPeriod(expenses, period, now);
    const byCat = groupBy(inPeriod, (e) => e.category);
    for (const cat of CATEGORIES) {
      const list = byCat.get(cat);
      if (!list) continue;
      list.sort((a, b) => a.date.localeCompare(b.date));
      for (const e of list) rows.push([e.date, cat, e.description, e.amount, `SW-${e.id.slice(0, 8).toUpperCase()}`]);
      rows.push(['', `${cat} subtotal`, `${list.length} item${list.length === 1 ? '' : 's'}`, sum(list), '']);
    }
    rows.push(['', 'TOTAL', `${inPeriod.length} items`, sum(inPeriod), '']);
    return {
      title: `Tax Report — ${range.label}`,
      subtitle: 'Itemized expenses grouped by category, with subtotals and reference IDs.',
      columns: ['Date', 'Category', 'Description', 'Amount (USD)', 'Reference'],
      currencyColumns: [3],
      rows,
      highlights: [
        { label: 'Total', value: formatCurrency(sum(inPeriod)) },
        { label: 'Line items', value: String(inPeriod.length) },
        { label: 'Categories', value: String(byCat.size) },
      ],
    };
  },
};

const monthlySummary: ExportTemplate = {
  id: 'monthly-summary',
  name: 'Monthly Summary',
  tagline: 'Month-by-month totals and trends',
  useCase: 'Budget reviews and household check-ins',
  defaultPeriod: 'last-12-months',
  defaultFormat: 'csv',
  gradient: 'from-indigo-500 to-violet-600',
  build(expenses, period, now) {
    const range = periodRange(period, now);
    const inPeriod = filterByPeriod(expenses, period, now);
    const byMonth = groupBy(inPeriod, (e) => e.date.slice(0, 7));
    const keys = Array.from(byMonth.keys()).sort();
    let prev: number | null = null;
    const rows: Cell[][] = keys.map((key) => {
      const list = byMonth.get(key)!;
      const total = sum(list);
      const [y, m] = key.split('-').map(Number);
      const days = new Date(y, m, 0).getDate();
      const cats = groupBy(list, (e) => e.category);
      const top = Array.from(cats.entries()).sort((a, b) => sum(b[1]) - sum(a[1]))[0];
      const change = prev && prev > 0 ? `${total >= prev ? '+' : ''}${Math.round(((total - prev) / prev) * 100)}%` : '—';
      prev = total;
      return [
        parseISODate(`${key}-01`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        list.length,
        total,
        r2(total / days),
        top ? top[0] : '—',
        change,
      ];
    });
    const totals = rows.map((r) => r[2] as number);
    const best = keys.length ? rows[totals.indexOf(Math.max(...totals))][0] : '—';
    return {
      title: `Monthly Summary — ${range.label}`,
      subtitle: 'One row per month with totals, daily average, top category and month-over-month change.',
      columns: ['Month', 'Expenses', 'Total (USD)', 'Daily avg (USD)', 'Top category', 'vs prev. month'],
      currencyColumns: [2, 3],
      rows,
      highlights: [
        { label: 'Months', value: String(keys.length) },
        { label: 'Avg / month', value: formatCurrency(keys.length ? sum(inPeriod) / keys.length : 0) },
        { label: 'Highest month', value: String(best) },
      ],
    };
  },
};

const categoryAnalysis: ExportTemplate = {
  id: 'category-analysis',
  name: 'Category Analysis',
  tagline: 'Where the money goes, ranked',
  useCase: 'Spot overspending and set category budgets',
  defaultPeriod: 'this-year',
  defaultFormat: 'csv',
  gradient: 'from-amber-500 to-orange-600',
  build(expenses, period, now) {
    const range = periodRange(period, now);
    const inPeriod = filterByPeriod(expenses, period, now);
    const total = sum(inPeriod);
    const byCat = groupBy(inPeriod, (e) => e.category);
    const rows: Cell[][] = Array.from(byCat.entries())
      .map(([cat, list]) => {
        const t = sum(list);
        const largest = list.reduce((a, b) => (b.amount > a.amount ? b : a));
        return [cat, list.length, t, total ? `${Math.round((t / total) * 1000) / 10}%` : '0%', r2(t / list.length), `${largest.description} (${formatCurrency(largest.amount)})`] as Cell[];
      })
      .sort((a, b) => (b[2] as number) - (a[2] as number));
    const top = rows[0];
    return {
      title: `Category Analysis — ${range.label}`,
      subtitle: 'Categories ranked by spend, with share of total, average ticket and largest purchase.',
      columns: ['Category', 'Expenses', 'Total (USD)', 'Share', 'Average (USD)', 'Largest expense'],
      currencyColumns: [2, 4],
      rows,
      highlights: [
        { label: 'Top category', value: top ? String(top[0]) : '—' },
        { label: 'Top share', value: top ? String(top[3]) : '—' },
        { label: 'Total', value: formatCurrency(total) },
      ],
    };
  },
};

const fullBackup: ExportTemplate = {
  id: 'full-backup',
  name: 'Full Backup',
  tagline: 'Every field, machine-readable',
  useCase: 'Archive or move your data to another device',
  defaultPeriod: 'all',
  defaultFormat: 'json',
  gradient: 'from-slate-600 to-slate-900',
  build(expenses, period, now) {
    const range = periodRange(period, now);
    const inPeriod = filterByPeriod(expenses, period, now).sort((a, b) => a.date.localeCompare(b.date));
    return {
      title: `Full Backup — ${range.label}`,
      subtitle: 'Raw records including IDs and timestamps.',
      columns: ['id', 'date', 'category', 'amount', 'description', 'createdAt', 'updatedAt'],
      currencyColumns: [3],
      rows: inPeriod.map((e) => [e.id, e.date, e.category, e.amount, e.description, e.createdAt, e.updatedAt]),
      highlights: [
        { label: 'Records', value: String(inPeriod.length) },
        { label: 'Span', value: inPeriod.length ? `${formatDate(inPeriod[0].date)} – ${formatDate(inPeriod[inPeriod.length - 1].date)}` : '—' },
        { label: 'Total', value: formatCurrency(sum(inPeriod)) },
      ],
    };
  },
};

export const TEMPLATES: Record<TemplateId, ExportTemplate> = {
  'tax-report': taxReport,
  'monthly-summary': monthlySummary,
  'category-analysis': categoryAnalysis,
  'full-backup': fullBackup,
};

export const TEMPLATE_ORDER: TemplateId[] = ['tax-report', 'monthly-summary', 'category-analysis', 'full-backup'];

/** Number of data rows in a dataset, excluding subtotal/total rows. */
export function recordCount(expenses: Expense[], period: PeriodId, now?: Date): number {
  return filterByPeriod(expenses, period, now).length;
}

export type { Category };
