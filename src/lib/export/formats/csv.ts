import type { Expense } from '../../types';
import type { ExportFormat } from '../types';

export const CSV_COLUMNS = ['Date', 'Category', 'Amount', 'Description'] as const;

function escapeCell(value: string): string {
  let v = value;
  // Neutralise spreadsheet formula injection (cells starting with = + - @ or tab/CR).
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`;
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function toCSV(rows: Expense[]): string {
  const body = rows.map((e) => [e.date, e.category, e.amount.toFixed(2), e.description]);
  return [[...CSV_COLUMNS], ...body].map((r) => r.map(escapeCell).join(',')).join('\r\n');
}

export const csvFormat: ExportFormat = {
  id: 'csv',
  label: 'CSV',
  extension: 'csv',
  mimeType: 'text/csv;charset=utf-8',
  description: 'Spreadsheets — Excel, Numbers, Google Sheets',
  hasTextPreview: true,
  serializeText: (rows) => toCSV(rows),
  // BOM so Excel detects UTF-8 correctly.
  serialize: (rows) => new Blob(['﻿', toCSV(rows)], { type: 'text/csv;charset=utf-8' }),
};
