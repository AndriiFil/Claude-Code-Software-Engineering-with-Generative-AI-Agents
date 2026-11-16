import { isCategory, type Expense } from './types';

const STORAGE_KEY = 'expense-tracker:expenses:v1';

export { STORAGE_KEY };

function isValidExpense(value: unknown): value is Expense {
  if (!value || typeof value !== 'object') return false;
  const e = value as Record<string, unknown>;
  return (
    typeof e.id === 'string' &&
    typeof e.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(e.date) &&
    typeof e.amount === 'number' &&
    Number.isFinite(e.amount) &&
    isCategory(e.category) &&
    typeof e.description === 'string'
  );
}

export function parseExpenses(raw: string | null): Expense[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.filter(isValidExpense).map((e) => ({
      ...e,
      createdAt: typeof e.createdAt === 'string' ? e.createdAt : new Date().toISOString(),
      updatedAt: typeof e.updatedAt === 'string' ? e.updatedAt : new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

export function loadExpenses(): Expense[] {
  if (typeof window === 'undefined') return [];
  try {
    return parseExpenses(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return [];
  }
}

/** Returns false if the write failed (quota exceeded, storage disabled, etc). */
export function saveExpenses(expenses: Expense[]): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
    return true;
  } catch {
    return false;
  }
}

export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for non-secure contexts (e.g. opening the dev server over a LAN IP).
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
