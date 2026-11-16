import type { Expense } from './types';
import { todayISO } from './format';

function escapeCell(value: string): string {
  let v = value;
  // Neutralise spreadsheet formula injection (cells starting with = + - @ or tab/CR).
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`;
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function expensesToCSV(expenses: Expense[]): string {
  const header = ['Date', 'Category', 'Description', 'Amount (USD)'];
  const rows = expenses.map((e) => [e.date, e.category, e.description, e.amount.toFixed(2)]);
  return [header, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n');
}

export function downloadCSV(expenses: Expense[], filenamePrefix = 'expenses'): void {
  const csv = expensesToCSV(expenses);
  // BOM so Excel detects UTF-8 correctly.
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filenamePrefix}-${todayISO()}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
