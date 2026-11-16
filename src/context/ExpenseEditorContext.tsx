'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Expense, ExpenseInput } from '@/lib/types';
import { formatCurrency } from '@/lib/format';
import { Modal } from '@/components/ui/Modal';
import { ExpenseForm } from '@/components/ExpenseForm';
import { useExpenses } from './ExpenseContext';
import { useToast } from './ToastContext';

interface ExpenseEditorContextValue {
  /** Opens the add form, or the edit form when an expense is passed. */
  openEditor: (expense?: Expense) => void;
  /** Deletes with an "Undo" toast. */
  requestDelete: (expense: Expense) => void;
}

const ExpenseEditorContext = createContext<ExpenseEditorContextValue | null>(null);

type EditorState = { open: false } | { open: true; expense?: Expense; key: number };

export function ExpenseEditorProvider({ children }: { children: ReactNode }) {
  const { addExpense, updateExpense, deleteExpense, restoreExpense } = useExpenses();
  const { showToast } = useToast();
  const [state, setState] = useState<EditorState>({ open: false });

  const openEditor = useCallback((expense?: Expense) => {
    // A fresh key remounts the form so it never shows stale values.
    setState({ open: true, expense, key: Date.now() });
  }, []);

  const close = useCallback(() => setState({ open: false }), []);

  const handleSubmit = (input: ExpenseInput) => {
    if (state.open && state.expense) {
      updateExpense(state.expense.id, input);
      showToast({ message: 'Expense updated.' });
    } else {
      addExpense(input);
      showToast({ message: `Added ${formatCurrency(input.amount)} for ${input.description}.` });
    }
    close();
  };

  const requestDelete = useCallback(
    (expense: Expense) => {
      const removed = deleteExpense(expense.id);
      if (!removed) return;
      showToast({
        type: 'info',
        message: `Deleted "${removed.description}".`,
        action: { label: 'Undo', onClick: () => restoreExpense(removed) },
      });
    },
    [deleteExpense, restoreExpense, showToast],
  );

  const value = useMemo(() => ({ openEditor, requestDelete }), [openEditor, requestDelete]);

  return (
    <ExpenseEditorContext.Provider value={value}>
      {children}
      <Modal
        open={state.open}
        onClose={close}
        title={state.open && state.expense ? 'Edit expense' : 'Add expense'}
        description={state.open && state.expense ? 'Update the details of this expense.' : 'Record a new purchase or bill.'}
      >
        {state.open && (
          <ExpenseForm key={state.key} initial={state.expense} onSubmit={handleSubmit} onCancel={close} />
        )}
      </Modal>
    </ExpenseEditorContext.Provider>
  );
}

export function useExpenseEditor(): ExpenseEditorContextValue {
  const ctx = useContext(ExpenseEditorContext);
  if (!ctx) throw new Error('useExpenseEditor must be used within an ExpenseEditorProvider');
  return ctx;
}
