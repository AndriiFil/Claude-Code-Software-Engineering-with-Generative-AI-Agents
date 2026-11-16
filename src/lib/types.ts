export const CATEGORIES = [
  'Food',
  'Transportation',
  'Entertainment',
  'Shopping',
  'Bills',
  'Other',
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface Expense {
  id: string;
  /** Local calendar date in YYYY-MM-DD format. */
  date: string;
  amount: number;
  category: Category;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export type ExpenseInput = Pick<Expense, 'date' | 'amount' | 'category' | 'description'>;

export interface ExpenseFilters {
  search: string;
  category: Category | 'All';
  startDate: string;
  endDate: string;
}

export type SortField = 'date' | 'amount' | 'category' | 'description';
export type SortDirection = 'asc' | 'desc';

export interface SortState {
  field: SortField;
  direction: SortDirection;
}

export function isCategory(value: unknown): value is Category {
  return typeof value === 'string' && (CATEGORIES as readonly string[]).includes(value);
}
