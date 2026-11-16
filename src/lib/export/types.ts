import type { Category, Expense } from '../types';

export type ExportFormatId = 'csv' | 'json' | 'pdf';

export type ExportSortOrder = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';

/** Everything the user can configure in the export dialog. */
export interface ExportQuery {
  /** Inclusive YYYY-MM-DD bounds; empty string = unbounded. */
  startDate: string;
  endDate: string;
  categories: Category[];
  sort: ExportSortOrder;
}

export interface ExportSummary {
  count: number;
  total: number;
  average: number;
  /** Earliest / latest expense date actually present in the selection. */
  firstDate: string | null;
  lastDate: string | null;
  byCategory: { category: Category; count: number; total: number }[];
}

/** Context passed to every serializer, so file headers/metadata can describe the export. */
export interface ExportContext {
  query: ExportQuery;
  summary: ExportSummary;
  generatedAt: Date;
  /** Whether every category is selected (used to print "All categories"). */
  allCategories: boolean;
}

export interface ExportFormat {
  id: ExportFormatId;
  label: string;
  extension: string;
  mimeType: string;
  /** One-line description shown on the format card. */
  description: string;
  /** Whether a text preview of the generated file makes sense. */
  hasTextPreview: boolean;
  serialize: (rows: Expense[], ctx: ExportContext) => Blob;
  /** Text serialization used for the "raw" preview (only for text formats). */
  serializeText?: (rows: Expense[], ctx: ExportContext) => string;
}
