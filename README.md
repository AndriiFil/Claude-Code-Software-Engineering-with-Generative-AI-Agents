# Spendwise — Expense Tracker

A personal expense tracker built with **Next.js 14 (App Router)**, **TypeScript** and **Tailwind CSS**.
Data is stored in your browser's `localStorage` — no account or backend needed.

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

Production build:

```bash
npm run build
npm start            # http://localhost:3000
```

Other scripts: `npm run lint`, `npm run typecheck`.

## Features

| Area | What you get |
| --- | --- |
| **Add / edit** | Modal form (header "Add expense" button, or click any expense). Amount, date picker, category picker, description. |
| **Validation** | Required fields, amount > 0 and < $1M with ≤ 2 decimals, no future dates, description ≤ 100 chars. Errors show on blur/submit, focus jumps to the first invalid field. |
| **Delete** | Instant delete with an **Undo** toast. "Delete all" (trash icon on the Expenses page) asks for confirmation. |
| **List** | Sortable table on desktop (date, description, category, amount); card list on mobile. |
| **Search & filter** | Free-text search (description/category/amount), category, from/to dates, quick ranges (this month, last month, last 30 days, this year). Shows the filtered count and total. |
| **Dashboard** | Total spending, this month vs last month, daily average, top category, 6-month bar chart with hover tooltips, category donut with legend (click a category to open a filtered list), recent expenses. |
| **Export** | CSV export of all expenses (dashboard) or the currently filtered set (Expenses page). Opens cleanly in Excel. |
| **Persistence** | `localStorage` with validation of stored data, error toast if saving fails, sync between open tabs. |
| **UX** | Loading skeletons, empty states, toasts, keyboard-accessible modal (Esc, focus trap), responsive down to phone width. |

## Project structure

```
src/
  app/                 # Routes: / (dashboard), /expenses, error + 404 pages
  components/
    dashboard/         # SummaryCards, MonthlyTrendChart, CategoryBreakdown, RecentExpenses
    expenses/          # ExpenseList, ExpenseFiltersBar
    ui/                # Modal, ConfirmDialog, CategoryBadge, Skeleton
    ExpenseForm.tsx    # Form + validation
  context/             # ExpenseContext (data + localStorage), ExpenseEditorContext (add/edit modal), ToastContext
  lib/                 # types, analytics, filters, csv, storage, formatting, sample data
```

## Manual test checklist

1. **Empty state**: open the app for the first time and you see "No expenses yet".
2. **Validation**: click **Add expense** and submit the empty form; three errors appear. Enter `12.345` and you get the decimals error. Pick a future date and it's rejected.
3. **Add**: fill in a valid expense and submit. A success toast appears and the dashboard updates.
4. **Persistence**: reload the page and the expense is still there.
5. **Sample data**: on a fresh browser profile (or after "Delete all"), click **Load sample data** to get 75 expenses spread over 6 months.
6. **Dashboard**: hover the bars and donut segments. Click a category in the legend to open the Expenses page filtered to it.
7. **Filter/search**: on Expenses, try the category dropdown, the date range, the quick-range chips, and search (e.g. `coffee`). Check that the count and total update. Use **Reset filters** to clear them.
8. **Sort**: click the column headers. Clicking again flips the direction.
9. **Edit**: click the pencil icon (shown on row hover on desktop) and change something, then **Save changes**.
10. **Delete + undo**: click the trash icon on a row, then **Undo** in the toast.
11. **Export**: click **Export filtered/all** and open the downloaded CSV.
12. **Mobile**: resize to phone width (or use DevTools device mode). The list switches to cards and the form opens as a bottom sheet.

To reset the app completely, run `localStorage.removeItem('expense-tracker:expenses:v1')` in the browser console, or use **Delete all**.
