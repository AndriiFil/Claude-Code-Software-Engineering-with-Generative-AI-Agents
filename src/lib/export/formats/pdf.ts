import type { Expense } from '../../types';
import { CATEGORY_META } from '../../categories';
import { formatCurrency, formatDate } from '../../format';
import type { ExportContext, ExportFormat } from '../types';
import { SORT_OPTIONS } from '../query';
import { A4, PdfDocument, PdfPage, hexToRgb, truncateText, type RGB } from '../pdf/PdfDocument';

const INK: RGB = [15, 23, 42]; // slate-900
const MUTED: RGB = [100, 116, 139]; // slate-500
const SUBTLE: RGB = [71, 85, 105]; // slate-600
const RULE: RGB = [226, 232, 240]; // slate-200
const PANEL: RGB = [248, 250, 252]; // slate-50
const HEAD: RGB = [241, 245, 249]; // slate-100
const ACCENT: RGB = [79, 70, 229]; // indigo-600

const M = 40; // page margin
const RIGHT = A4.width - M;
const BOTTOM = A4.height - 56; // last usable baseline before the footer
const ROW_H = 18;

/** Table columns, in the required order: Date, Category, Amount, Description. */
const COL = {
  date: M + 8,
  category: M + 92,
  amountRight: M + 270,
  description: M + 286,
};

function describePeriod(ctx: ExportContext): string {
  const { startDate, endDate } = ctx.query;
  if (!startDate && !endDate) return 'All time';
  if (startDate && endDate) return `${formatDate(startDate)} – ${formatDate(endDate)}`;
  return startDate ? `From ${formatDate(startDate)}` : `Through ${formatDate(endDate)}`;
}

function drawTableHeader(page: PdfPage, y: number): number {
  page.rect(M, y, RIGHT - M, 20, HEAD);
  const opts = { font: 'bold' as const, size: 8, color: SUBTLE };
  page.text(COL.date, y + 13, 'DATE', opts);
  page.text(COL.category, y + 13, 'CATEGORY', opts);
  page.text(COL.amountRight, y + 13, 'AMOUNT', { ...opts, align: 'right' });
  page.text(COL.description, y + 13, 'DESCRIPTION', opts);
  return y + 20;
}

function drawRow(page: PdfPage, y: number, e: Expense, zebra: boolean) {
  if (zebra) page.rect(M, y, RIGHT - M, ROW_H, PANEL);
  const base = y + 12.5;
  page.text(COL.date, base, formatDate(e.date), { size: 9, color: SUBTLE });
  page.circle(COL.category + 3, base - 3, 2.6, hexToRgb(CATEGORY_META[e.category].color));
  page.text(COL.category + 10, base, e.category, { size: 9 });
  page.text(COL.amountRight, base, formatCurrency(e.amount), { size: 9, font: 'bold', align: 'right' });
  page.text(COL.description, base, truncateText(e.description, RIGHT - COL.description - 8, 'regular', 9), {
    size: 9,
    color: INK,
  });
}

/** Cover section on page 1: title, KPI panel, filter description and category breakdown. Returns next y. */
function drawCover(page: PdfPage, ctx: ExportContext): number {
  const { summary } = ctx;
  page.rect(0, 0, A4.width, 6, ACCENT);
  page.text(M, 56, 'Expense Report', { font: 'bold', size: 22 });
  page.text(
    M,
    74,
    `Spendwise  •  Generated ${ctx.generatedAt.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}`,
    { size: 9, color: MUTED },
  );

  // KPI panel
  const panelY = 92;
  page.rect(M, panelY, RIGHT - M, 58, PANEL);
  page.line(M, panelY, RIGHT, panelY, RULE);
  page.line(M, panelY + 58, RIGHT, panelY + 58, RULE);
  const kpis: [string, string][] = [
    ['RECORDS', summary.count.toLocaleString('en-US')],
    ['TOTAL', formatCurrency(summary.total)],
    ['AVERAGE', formatCurrency(summary.average)],
    ['PERIOD', describePeriod(ctx)],
  ];
  const colW = (RIGHT - M) / kpis.length;
  kpis.forEach(([label, value], i) => {
    const x = M + 14 + i * colW;
    page.text(x, panelY + 22, label, { font: 'bold', size: 7.5, color: MUTED });
    page.text(x, panelY + 42, truncateText(value, colW - 20, 'bold', 12), { font: 'bold', size: 12 });
  });

  let y = panelY + 78;
  const categories = ctx.allCategories ? 'All categories' : ctx.query.categories.join(', ');
  const sortLabel = SORT_OPTIONS.find((s) => s.id === ctx.query.sort)?.label ?? '';
  page.text(M, y, truncateText(`Categories: ${categories}   •   Sorted by ${sortLabel.toLowerCase()}`, RIGHT - M, 'regular', 9), {
    size: 9,
    color: SUBTLE,
  });

  // Category breakdown with proportional bars
  if (summary.byCategory.length > 0) {
    y += 24;
    page.text(M, y, 'Breakdown by category', { font: 'bold', size: 11 });
    y += 10;
    const max = Math.max(...summary.byCategory.map((c) => c.total), 0.01);
    const barX = M + 190;
    const barMax = RIGHT - barX - 90;
    for (const c of summary.byCategory) {
      y += 17;
      const color = hexToRgb(CATEGORY_META[c.category].color);
      page.circle(M + 4, y - 3, 3, color);
      page.text(M + 14, y, c.category, { size: 9 });
      page.text(M + 110, y, `${c.count} ${c.count === 1 ? 'item' : 'items'}`, { size: 9, color: MUTED });
      page.rect(barX, y - 8, barMax, 7, HEAD);
      page.rect(barX, y - 8, Math.max(1.5, (c.total / max) * barMax), 7, color);
      const pct = summary.total > 0 ? Math.round((c.total / summary.total) * 100) : 0;
      page.text(RIGHT, y, `${formatCurrency(c.total)}  (${pct}%)`, { size: 9, font: 'bold', align: 'right' });
    }
  }
  return y + 28;
}

export function buildPdfReport(rows: Expense[], ctx: ExportContext): PdfDocument {
  const doc = new PdfDocument({ title: 'Spendwise Expense Report', createdAt: ctx.generatedAt });
  let page = doc.addPage();
  let y = drawCover(page, ctx);

  page.text(M, y, 'Transactions', { font: 'bold', size: 11 });
  y = drawTableHeader(page, y + 8);

  if (rows.length === 0) {
    page.text(A4.width / 2, y + 30, 'No expenses match the selected filters.', { size: 10, color: MUTED, align: 'center' });
  }

  rows.forEach((e, i) => {
    if (y + ROW_H > BOTTOM) {
      page = doc.addPage();
      page.text(M, 40, 'Expense Report (continued)', { font: 'bold', size: 10, color: SUBTLE });
      y = drawTableHeader(page, 52);
    }
    drawRow(page, y, e, i % 2 === 1);
    y += ROW_H;
  });

  // Grand total row
  if (rows.length > 0) {
    if (y + 26 > BOTTOM) {
      page = doc.addPage();
      y = 52;
    }
    page.line(M, y + 1, RIGHT, y + 1, INK, 0.8);
    page.text(COL.date, y + 16, 'Total', { font: 'bold', size: 9.5 });
    page.text(COL.amountRight, y + 16, formatCurrency(ctx.summary.total), { font: 'bold', size: 9.5, align: 'right' });
    page.text(COL.description, y + 16, `${ctx.summary.count} ${ctx.summary.count === 1 ? 'expense' : 'expenses'}`, {
      size: 9,
      color: MUTED,
    });
  }

  // Footers (need the final page count)
  doc.pages.forEach((p, i) => {
    p.line(M, A4.height - 38, RIGHT, A4.height - 38, RULE);
    p.text(M, A4.height - 24, 'Spendwise expense report', { size: 8, color: MUTED });
    p.text(RIGHT, A4.height - 24, `Page ${i + 1} of ${doc.pages.length}`, { size: 8, color: MUTED, align: 'right' });
  });

  return doc;
}

export const pdfFormat: ExportFormat = {
  id: 'pdf',
  label: 'PDF',
  extension: 'pdf',
  mimeType: 'application/pdf',
  description: 'Print-ready report with summary & category breakdown',
  hasTextPreview: false,
  serialize: (rows, ctx) => buildPdfReport(rows, ctx).toBlob(),
};
