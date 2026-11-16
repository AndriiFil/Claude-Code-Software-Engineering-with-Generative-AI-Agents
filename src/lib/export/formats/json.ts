import type { Expense } from '../../types';
import type { ExportContext, ExportFormat } from '../types';

export function toJSONDocument(rows: Expense[], ctx: ExportContext) {
  return {
    meta: {
      app: 'Spendwise',
      schemaVersion: 1,
      generatedAt: ctx.generatedAt.toISOString(),
      currency: 'USD',
      filters: {
        startDate: ctx.query.startDate || null,
        endDate: ctx.query.endDate || null,
        categories: ctx.allCategories ? 'all' : ctx.query.categories,
        sort: ctx.query.sort,
      },
      summary: {
        count: ctx.summary.count,
        total: ctx.summary.total,
        average: ctx.summary.average,
        firstDate: ctx.summary.firstDate,
        lastDate: ctx.summary.lastDate,
        byCategory: ctx.summary.byCategory,
      },
    },
    expenses: rows.map((e) => ({
      date: e.date,
      category: e.category,
      amount: e.amount,
      description: e.description,
    })),
  };
}

export const jsonFormat: ExportFormat = {
  id: 'json',
  label: 'JSON',
  extension: 'json',
  mimeType: 'application/json',
  description: 'Structured data with metadata — for developers & backups',
  hasTextPreview: true,
  serializeText: (rows, ctx) => JSON.stringify(toJSONDocument(rows, ctx), null, 2),
  serialize: (rows, ctx) =>
    new Blob([JSON.stringify(toJSONDocument(rows, ctx), null, 2)], { type: 'application/json' }),
};
