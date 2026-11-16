import type { Cell, Dataset, FileFormat } from './types';

function csvCell(value: Cell): string {
  let v = typeof value === 'number' ? value.toFixed(2) : value;
  // Neutralise spreadsheet formula injection.
  if (/^[=+\-@\t\r]/.test(v) && typeof value !== 'number') v = `'${v}`;
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function datasetToCSV(ds: Dataset): string {
  return [ds.columns, ...ds.rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
}

/** Tab-separated values: pastes straight into Google Sheets / Excel as a grid. */
export function datasetToTSV(ds: Dataset): string {
  const clean = (c: Cell) => (typeof c === 'number' ? c.toFixed(2) : c.replace(/[\t\r\n]+/g, ' '));
  return [ds.columns, ...ds.rows].map((row) => row.map(clean).join('\t')).join('\n');
}

export function datasetToJSON(ds: Dataset, meta: Record<string, unknown>): string {
  return JSON.stringify(
    {
      meta: { ...meta, title: ds.title, columns: ds.columns, highlights: ds.highlights },
      rows: ds.rows.map((row) => Object.fromEntries(ds.columns.map((c, i) => [c, row[i]]))),
    },
    null,
    2,
  );
}

export function serializeDataset(ds: Dataset, format: FileFormat, meta: Record<string, unknown> = {}): Blob {
  return format === 'csv'
    ? new Blob(['﻿', datasetToCSV(ds)], { type: 'text/csv;charset=utf-8' })
    : new Blob([datasetToJSON(ds, meta)], { type: 'application/json' });
}

export async function sha256(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[—–]/g, '-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Number((bytes / 1024 ** 3).toFixed(1))} GB`;
}
