'use client';

import type { ReactNode } from 'react';
import { ToastProvider } from '@/context/ToastContext';
import { ExpenseProvider } from '@/context/ExpenseContext';
import { ExpenseEditorProvider } from '@/context/ExpenseEditorContext';
import { CloudProvider } from '@/context/CloudContext';
import { ActivityTray } from '@/components/cloud/ActivityTray';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ExpenseProvider>
        <CloudProvider>
          <ExpenseEditorProvider>{children}</ExpenseEditorProvider>
          <ActivityTray />
        </CloudProvider>
      </ExpenseProvider>
    </ToastProvider>
  );
}
