'use client';

import type { ReactNode } from 'react';
import { ToastProvider } from '@/context/ToastContext';
import { ExpenseProvider } from '@/context/ExpenseContext';
import { ExpenseEditorProvider } from '@/context/ExpenseEditorContext';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ExpenseProvider>
        <ExpenseEditorProvider>{children}</ExpenseEditorProvider>
      </ExpenseProvider>
    </ToastProvider>
  );
}
