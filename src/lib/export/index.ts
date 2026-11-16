import { CATEGORIES, type Expense } from '../types';
import { csvFormat } from './formats/csv';
import { jsonFormat } from './formats/json';
import { pdfFormat } from './formats/pdf';
import { selectExpenses, summarize } from './query';
import type { ExportContext, ExportFormat, ExportFormatId, ExportQuery } from './types';

export * from './types';
export * from './query';

/** Format registry — add a new format by implementing ExportFormat and listing it here. */
export const EXPORT_FORMATS: Record<ExportFormatId, ExportFormat> = {
  csv: csvFormat,
  json: jsonFormat,
  pdf: pdfFormat,
};

export const FORMAT_ORDER: ExportFormatId[] = ['csv', 'json', 'pdf'];

export function buildContext(rows: Expense[], query: ExportQuery, generatedAt = new Date()): ExportContext {
  return {
    query,
    summary: summarize(rows),
    generatedAt,
    allCategories: CATEGORIES.every((c) => query.categories.includes(c)),
  };
}

const INVALID_FILENAME_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g;

/** Strips characters that are illegal in file names on Windows/macOS/Linux, plus any extension the user typed. */
export function sanitizeFilename(name: string, extension: string): string {
  const withoutExt = name.trim().replace(new RegExp(`\\.${extension}$`, 'i'), '');
  return withoutExt
    .replace(INVALID_FILENAME_CHARS, '-')
    .replace(/\s+/g, ' ')
    .replace(/ ?-[- ]*/g, '-') // collapse "a - -b" style runs left by replaced characters
    .replace(/^[.\s_-]+|[.\s_-]+$/g, '')
    .slice(0, 120);
}

/** Suggested filename derived from the current options, e.g. "expenses_2026-01-01_to_2026-03-31_food-bills". */
export function suggestFilename(query: ExportQuery): string {
  const parts = ['expenses'];
  if (query.startDate || query.endDate) {
    parts.push(`${query.startDate || 'start'}_to_${query.endDate || 'today'}`);
  }
  const all = CATEGORIES.every((c) => query.categories.includes(c));
  if (!all && query.categories.length > 0 && query.categories.length <= 2) {
    parts.push(query.categories.map((c) => c.toLowerCase()).join('-'));
  }
  return parts.join('_');
}

export interface ExportResult {
  filename: string;
  bytes: number;
  count: number;
}

/** Runs the export end-to-end and returns the blob + metadata (no DOM side effects). */
export function generateExport(
  expenses: Expense[],
  query: ExportQuery,
  formatId: ExportFormatId,
  filename: string,
): { blob: Blob; result: ExportResult } {
  const format = EXPORT_FORMATS[formatId];
  const rows = selectExpenses(expenses, query);
  const blob = format.serialize(rows, buildContext(rows, query));
  const base = sanitizeFilename(filename, format.extension) || suggestFilename(query);
  return { blob, result: { filename: `${base}.${format.extension}`, bytes: blob.size, count: rows.length } };
}

/** Triggers a browser download for a blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
