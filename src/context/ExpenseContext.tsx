'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Expense, ExpenseInput } from '@/lib/types';
import { generateId, loadExpenses, parseExpenses, saveExpenses, STORAGE_KEY } from '@/lib/storage';
import { generateSampleExpenses } from '@/lib/sampleData';
import { useToast } from './ToastContext';

interface ExpenseContextValue {
  expenses: Expense[];
  isLoading: boolean;
  addExpense: (input: ExpenseInput) => Expense;
  updateExpense: (id: string, input: ExpenseInput) => void;
  deleteExpense: (id: string) => Expense | undefined;
  restoreExpense: (expense: Expense) => void;
  loadSampleData: () => void;
  clearAll: () => void;
}

const ExpenseContext = createContext<ExpenseContextValue | null>(null);

function normalizeInput(input: ExpenseInput): ExpenseInput {
  return {
    date: input.date,
    amount: Math.round(input.amount * 100) / 100,
    category: input.category,
    description: input.description.trim(),
  };
}

export function ExpenseProvider({ children }: { children: ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();
  // Skip the save that would otherwise fire for the initial empty state / external sync.
  const skipNextSave = useRef(true);

  // Hydrate from localStorage on the client only.
  useEffect(() => {
    setExpenses(loadExpenses());
    setIsLoading(false);
  }, []);

  // Persist on every change after hydration.
  useEffect(() => {
    if (isLoading) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    if (!saveExpenses(expenses)) {
      showToast({
        type: 'error',
        message: 'Could not save to browser storage. Your latest changes may be lost on reload.',
      });
    }
  }, [expenses, isLoading, showToast]);

  // Keep multiple open tabs in sync.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      skipNextSave.current = true;
      setExpenses(parseExpenses(event.newValue));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const addExpense = useCallback((input: ExpenseInput) => {
    const now = new Date().toISOString();
    const expense: Expense = { ...normalizeInput(input), id: generateId(), createdAt: now, updatedAt: now };
    setExpenses((prev) => [expense, ...prev]);
    return expense;
  }, []);

  const updateExpense = useCallback((id: string, input: ExpenseInput) => {
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...normalizeInput(input), updatedAt: new Date().toISOString() } : e)),
    );
  }, []);

  const deleteExpense = useCallback(
    (id: string) => {
      const target = expenses.find((e) => e.id === id);
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      return target;
    },
    [expenses],
  );

  const restoreExpense = useCallback((expense: Expense) => {
    setExpenses((prev) => (prev.some((e) => e.id === expense.id) ? prev : [expense, ...prev]));
  }, []);

  const loadSampleData = useCallback(() => {
    const now = Date.now();
    const samples: Expense[] = generateSampleExpenses().map((input, i) => {
      const ts = new Date(now - i * 1000).toISOString();
      return { ...input, id: generateId(), createdAt: ts, updatedAt: ts };
    });
    setExpenses((prev) => [...samples, ...prev]);
  }, []);

  const clearAll = useCallback(() => setExpenses([]), []);

  const value = useMemo(
    () => ({
      expenses,
      isLoading,
      addExpense,
      updateExpense,
      deleteExpense,
      restoreExpense,
      loadSampleData,
      clearAll,
    }),
    [expenses, isLoading, addExpense, updateExpense, deleteExpense, restoreExpense, loadSampleData, clearAll],
  );

  return <ExpenseContext.Provider value={value}>{children}</ExpenseContext.Provider>;
}

export function useExpenses(): ExpenseContextValue {
  const ctx = useContext(ExpenseContext);
  if (!ctx) throw new Error('useExpenses must be used within an ExpenseProvider');
  return ctx;
}
