import { CATEGORIES, type Category, type Expense } from './types';

export interface CategoryTotal {
  category: Category;
  total: number;
  count: number;
  percent: number;
}

export interface MonthTotal {
  key: string;
  label: string;
  fullLabel: string;
  total: number;
  count: number;
}

export interface Summary {
  total: number;
  count: number;
  thisMonth: number;
  thisMonthCount: number;
  lastMonth: number;
  /** Percent change vs last month, or null when there is no prior data. */
  monthChange: number | null;
  dailyAverage: number;
  topCategory: CategoryTotal | null;
  byCategory: CategoryTotal[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function sumAmounts(expenses: Expense[]): number {
  return round2(expenses.reduce((sum, e) => sum + e.amount, 0));
}

export function monthKeyOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function totalsByCategory(expenses: Expense[]): CategoryTotal[] {
  const grandTotal = sumAmounts(expenses);
  return CATEGORIES.map((category) => {
    const items = expenses.filter((e) => e.category === category);
    const total = sumAmounts(items);
    return {
      category,
      total,
      count: items.length,
      percent: grandTotal > 0 ? (total / grandTotal) * 100 : 0,
    };
  })
    .filter((c) => c.count > 0)
    .sort((a, b) => b.total - a.total);
}

export function monthlyTotals(expenses: Expense[], months = 6, now = new Date()): MonthTotal[] {
  const buckets: MonthTotal[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      key: monthKeyOf(d),
      label: d.toLocaleDateString('en-US', { month: 'short' }),
      fullLabel: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      total: 0,
      count: 0,
    });
  }
  const byKey = new Map(buckets.map((b) => [b.key, b]));
  for (const e of expenses) {
    const bucket = byKey.get(e.date.slice(0, 7));
    if (bucket) {
      bucket.total += e.amount;
      bucket.count += 1;
    }
  }
  buckets.forEach((b) => (b.total = round2(b.total)));
  return buckets;
}

export function getSummary(expenses: Expense[], now = new Date()): Summary {
  const thisKey = monthKeyOf(now);
  const lastKey = monthKeyOf(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  const thisMonthItems = expenses.filter((e) => e.date.startsWith(thisKey));
  const thisMonth = sumAmounts(thisMonthItems);
  const lastMonth = sumAmounts(expenses.filter((e) => e.date.startsWith(lastKey)));
  const byCategory = totalsByCategory(expenses);

  return {
    total: sumAmounts(expenses),
    count: expenses.length,
    thisMonth,
    thisMonthCount: thisMonthItems.length,
    lastMonth,
    monthChange: lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : null,
    dailyAverage: round2(thisMonth / now.getDate()),
    topCategory: byCategory[0] ?? null,
    byCategory,
  };
}
