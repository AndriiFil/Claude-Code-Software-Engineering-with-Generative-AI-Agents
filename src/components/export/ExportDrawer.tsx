'use client';

import { useCallback, useEffect, useId, useMemo, useReducer } from 'react';
import { ArrowUpDown, CalendarRange, Check, CircleAlert, FileDown, FileType, LoaderCircle, RotateCcw, Tags } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Category, Expense } from '@/lib/types';
import { formatCurrency } from '@/lib/format';
import { useExportJob, PHASE_LABEL, type ExportPhase } from '@/hooks/useExportJob';
import {
  EXPORT_FORMATS,
  SORT_OPTIONS,
  buildContext,
  countByCategoryInRange,
  defaultExportQuery,
  formatBytes,
  isDateRangeValid,
  sanitizeFilename,
  selectExpenses,
  suggestFilename,
  type ExportFormatId,
  type ExportQuery,
  type ExportSortOrder,
} from '@/lib/export';
import { Drawer } from '@/components/ui/Drawer';
import { FormatPicker } from './FormatPicker';
import { DateRangeField } from './DateRangeField';
import { CategoryPicker } from './CategoryPicker';
import { ExportPreview } from './ExportPreview';

/* ----------------------------------------------------------------------------
 * State
 * ------------------------------------------------------------------------- */

interface State {
  format: ExportFormatId;
  query: ExportQuery;
  /** User-typed filename; null means "follow the suggestion". */
  customFilename: string | null;
}

type Action =
  | { type: 'format'; format: ExportFormatId }
  | { type: 'dates'; startDate: string; endDate: string }
  | { type: 'categories'; categories: Category[] }
  | { type: 'sort'; sort: ExportSortOrder }
  | { type: 'filename'; value: string | null }
  | { type: 'resetFilters' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'format':
      return { ...state, format: action.format };
    case 'dates':
      return { ...state, query: { ...state.query, startDate: action.startDate, endDate: action.endDate } };
    case 'categories':
      return { ...state, query: { ...state.query, categories: action.categories } };
    case 'sort':
      return { ...state, query: { ...state.query, sort: action.sort } };
    case 'filename':
      return { ...state, customFilename: action.value };
    case 'resetFilters':
      return { ...state, query: { ...defaultExportQuery(), sort: state.query.sort } };
  }
}

/* ----------------------------------------------------------------------------
 * Small presentational pieces
 * ------------------------------------------------------------------------- */

function Section({ icon, title, step, children }: { icon: ReactNode; title: string; step: number; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
          {step}
        </span>
        <span className="text-slate-400" aria-hidden>
          {icon}
        </span>
        {title}
      </h3>
      {children}
    </section>
  );
}

const PHASES: ExportPhase[] = ['preparing', 'generating', 'downloading'];

function PhaseProgress({ phase }: { phase: ExportPhase }) {
  const current = PHASES.indexOf(phase);
  return (
    <div className="flex items-center gap-3" role="status" aria-live="polite">
      <LoaderCircle className="h-4 w-4 animate-spin text-indigo-600" aria-hidden />
      <div>
        <p className="text-sm font-medium text-slate-900">{PHASE_LABEL[phase]}</p>
        <div className="mt-1 flex gap-1" aria-hidden>
          {PHASES.map((p, i) => (
            <span
              key={p}
              className={`h-1 w-8 rounded-full transition-colors duration-300 ${i <= current ? 'bg-indigo-600' : 'bg-slate-200'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * Panel
 * ------------------------------------------------------------------------- */

interface ExportDrawerProps {
  open: boolean;
  onClose: () => void;
  expenses: Expense[];
  /** Seed values, e.g. the filters currently applied on the Expenses page. */
  initialQuery?: Partial<ExportQuery>;
}

export function ExportDrawer(props: ExportDrawerProps) {
  // Mount the panel only while open so every opening starts from fresh state.
  if (!props.open) return null;
  return <ExportPanel {...props} />;
}

function ExportPanel({ onClose, expenses, initialQuery }: ExportDrawerProps) {
  const job = useExportJob();
  const filenameId = useId();
  const sortId = useId();

  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    format: 'csv' as ExportFormatId,
    query: { ...defaultExportQuery(), ...initialQuery },
    customFilename: null,
  }));
  const { query, format: formatId } = state;
  const format = EXPORT_FORMATS[formatId];

  const rangeValid = isDateRangeValid(query);
  const rows = useMemo(() => selectExpenses(expenses, query), [expenses, query]);
  const ctx = useMemo(() => buildContext(rows, query), [rows, query]);
  const counts = useMemo(() => countByCategoryInRange(expenses, query), [expenses, query]);
  const dataBounds = useMemo(() => {
    if (expenses.length === 0) return null;
    let min = expenses[0].date;
    let max = min;
    for (const e of expenses) {
      if (e.date < min) min = e.date;
      if (e.date > max) max = e.date;
    }
    return { min, max };
  }, [expenses]);

  const suggested = suggestFilename(query);
  const filenameInput = state.customFilename ?? suggested;
  const finalBase = sanitizeFilename(filenameInput, format.extension) || suggested;
  const finalName = `${finalBase}.${format.extension}`;
  const filenameAdjusted = state.customFilename !== null && finalBase !== filenameInput.trim();

  const blockers: string[] = [];
  if (!rangeValid) blockers.push('Fix the date range');
  else if (query.categories.length === 0) blockers.push('Select at least one category');
  else if (rows.length === 0) blockers.push('No records match');
  const canExport = blockers.length === 0 && !job.busy;

  // Any option change after a finished export returns the footer to its ready state.
  const { phase, reset } = job;
  useEffect(() => {
    if (phase === 'done' || phase === 'error') reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const handleExport = useCallback(async () => {
    if (!canExport) return;
    // Success / failure is reported inline in the footer (a toast would cover the action buttons).
    await job.run(expenses, query, formatId, filenameInput);
  }, [canExport, job, expenses, query, formatId, filenameInput]);

  // Ctrl/Cmd + Enter exports from anywhere in the panel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        void handleExport();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [handleExport]);

  const footer = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-h-[36px] min-w-0">
        {job.busy ? (
          <PhaseProgress phase={job.phase} />
        ) : job.phase === 'done' && job.result ? (
          <div className="flex items-center gap-2.5" role="status">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <Check className="h-4 w-4" strokeWidth={3} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">Downloaded {job.result.filename}</p>
              <p className="text-xs text-slate-500">
                {job.result.count.toLocaleString('en-US')} records · {formatBytes(job.result.bytes)}
              </p>
            </div>
          </div>
        ) : job.phase === 'error' ? (
          <p className="flex items-center gap-2 text-sm font-medium text-rose-600" role="alert">
            <CircleAlert className="h-4 w-4" aria-hidden /> Export failed{job.error ? `: ${job.error}` : ''}
          </p>
        ) : blockers.length > 0 ? (
          <p className="flex items-center gap-2 text-sm text-amber-700">
            <CircleAlert className="h-4 w-4" aria-hidden /> {blockers[0]}
          </p>
        ) : (
          <p className="text-sm text-slate-600">
            <span className="font-semibold text-slate-900">{rows.length.toLocaleString('en-US')}</span>{' '}
            {rows.length === 1 ? 'record' : 'records'} ·{' '}
            <span className="font-semibold tabular-nums text-slate-900">{formatCurrency(ctx.summary.total)}</span> →{' '}
            <span className="font-mono text-xs text-slate-700">{finalName}</span>
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span className="mr-1 hidden text-xs text-slate-400 lg:inline">
          <kbd className="rounded border border-slate-300 bg-white px-1 font-sans">Ctrl</kbd> +{' '}
          <kbd className="rounded border border-slate-300 bg-white px-1 font-sans">Enter</kbd>
        </span>
        <button type="button" className="btn-secondary" onClick={onClose} disabled={job.busy}>
          {job.phase === 'done' ? 'Close' : 'Cancel'}
        </button>
        <button type="button" className="btn-primary min-w-[150px]" onClick={handleExport} disabled={!canExport}>
          {job.busy ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> Exporting…
            </>
          ) : job.phase === 'done' ? (
            <>
              <RotateCcw className="h-4 w-4" aria-hidden /> Export again
            </>
          ) : (
            <>
              <FileDown className="h-4 w-4" aria-hidden /> Export {format.label}
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <Drawer
      open
      onClose={onClose}
      locked={job.busy}
      title="Export data"
      description="Choose a format, narrow down the records and preview exactly what you'll get."
      icon={
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700" aria-hidden>
          <FileDown className="h-5 w-5" />
        </span>
      }
      footer={footer}
    >
      <div className="grid lg:h-full lg:grid-cols-[minmax(340px,400px)_1fr]">
        {/* Options column */}
        <div className="space-y-7 border-slate-200 bg-slate-50/60 px-5 py-6 sm:px-6 lg:overflow-y-auto lg:border-r">
          <Section step={1} icon={<FileType className="h-4 w-4" />} title="Format">
            <FormatPicker value={formatId} onChange={(f) => dispatch({ type: 'format', format: f })} disabled={job.busy} />
          </Section>

          <Section step={2} icon={<CalendarRange className="h-4 w-4" />} title="Date range">
            <DateRangeField
              startDate={query.startDate}
              endDate={query.endDate}
              invalid={!rangeValid}
              dataBounds={dataBounds}
              onChange={(r) => dispatch({ type: 'dates', ...r })}
            />
          </Section>

          <Section step={3} icon={<Tags className="h-4 w-4" />} title="Categories">
            <CategoryPicker
              selected={query.categories}
              counts={counts}
              onChange={(categories) => dispatch({ type: 'categories', categories })}
            />
          </Section>

          <Section step={4} icon={<ArrowUpDown className="h-4 w-4" />} title="File options">
            <div className="space-y-3">
              <div>
                <label htmlFor={sortId} className="mb-1 block text-xs font-medium text-slate-600">
                  Sort order
                </label>
                <select
                  id={sortId}
                  className="input"
                  value={query.sort}
                  onChange={(e) => dispatch({ type: 'sort', sort: e.target.value as ExportSortOrder })}
                >
                  {SORT_OPTIONS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label htmlFor={filenameId} className="block text-xs font-medium text-slate-600">
                    File name
                  </label>
                  {state.customFilename !== null && (
                    <button
                      type="button"
                      className="text-xs font-medium text-indigo-600 hover:underline"
                      onClick={() => dispatch({ type: 'filename', value: null })}
                    >
                      Use suggested
                    </button>
                  )}
                </div>
                <div className="flex rounded-lg shadow-sm focus-within:ring-4 focus-within:ring-indigo-500/15">
                  <input
                    id={filenameId}
                    type="text"
                    spellCheck={false}
                    autoComplete="off"
                    className="input rounded-r-none font-mono text-xs shadow-none focus:ring-0"
                    value={filenameInput}
                    placeholder={suggested}
                    onChange={(e) => dispatch({ type: 'filename', value: e.target.value })}
                  />
                  <span className="inline-flex items-center rounded-r-lg border border-l-0 border-slate-300 bg-slate-100 px-2.5 font-mono text-xs text-slate-500">
                    .{format.extension}
                  </span>
                </div>
                {filenameAdjusted && (
                  <p className="mt-1 text-xs text-slate-500">
                    Will be saved as <span className="font-mono text-slate-700">{finalName}</span>
                  </p>
                )}
              </div>
            </div>
          </Section>
        </div>

        {/* Preview column */}
        <div className="min-w-0 px-5 py-6 sm:px-6 lg:overflow-y-auto">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Preview</h3>
          <ExportPreview rows={rows} ctx={ctx} format={format} onResetFilters={() => dispatch({ type: 'resetFilters' })} />
        </div>
      </div>
    </Drawer>
  );
}
