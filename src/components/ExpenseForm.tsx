'use client';

import { useState, type FormEvent } from 'react';
import { CalendarDays } from 'lucide-react';
import { CATEGORIES, type Category, type Expense, type ExpenseInput } from '@/lib/types';
import { CATEGORY_META } from '@/lib/categories';
import { parseISODate, todayISO } from '@/lib/format';

interface FormValues {
  date: string;
  amount: string;
  category: Category | '';
  description: string;
}

type FormErrors = Partial<Record<keyof FormValues, string>>;

const MAX_AMOUNT = 1_000_000;
const MAX_DESCRIPTION = 100;
const MIN_DATE = '2000-01-01';

export function validateExpense(values: FormValues): FormErrors {
  const errors: FormErrors = {};

  if (!values.date) {
    errors.date = 'Please choose a date.';
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(values.date) || Number.isNaN(parseISODate(values.date).getTime())) {
    errors.date = 'Please enter a valid date.';
  } else if (values.date > todayISO()) {
    errors.date = "Date can't be in the future.";
  } else if (values.date < MIN_DATE) {
    errors.date = 'Date must be in the year 2000 or later.';
  }

  const amount = values.amount.trim().replace(/[,$\s]/g, '');
  if (!amount) {
    errors.amount = 'Please enter an amount.';
  } else if (!/^(\d+(\.\d{0,2})?|\.\d{1,2})$/.test(amount)) {
    errors.amount = 'Enter a valid number with at most 2 decimal places.';
  } else {
    const n = parseFloat(amount);
    if (n <= 0) errors.amount = 'Amount must be greater than zero.';
    else if (n >= MAX_AMOUNT) errors.amount = 'Amount must be less than $1,000,000.';
  }

  if (!values.category) errors.category = 'Please select a category.';

  const description = values.description.trim();
  if (!description) errors.description = 'Please add a short description.';
  else if (description.length > MAX_DESCRIPTION) errors.description = `Keep it under ${MAX_DESCRIPTION} characters.`;

  return errors;
}

interface ExpenseFormProps {
  initial?: Expense;
  onSubmit: (input: ExpenseInput) => void;
  onCancel: () => void;
}

export function ExpenseForm({ initial, onSubmit, onCancel }: ExpenseFormProps) {
  const [values, setValues] = useState<FormValues>(() => ({
    date: initial?.date ?? todayISO(),
    amount: initial ? initial.amount.toFixed(2) : '',
    category: initial?.category ?? '',
    description: initial?.description ?? '',
  }));
  const [touched, setTouched] = useState<Partial<Record<keyof FormValues, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);

  const errors = validateExpense(values);
  const showError = (field: keyof FormValues) => (submitted || touched[field]) && errors[field];

  const set = <K extends keyof FormValues>(field: K, value: FormValues[K]) =>
    setValues((prev) => ({ ...prev, [field]: value }));
  const blur = (field: keyof FormValues) => setTouched((prev) => ({ ...prev, [field]: true }));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length > 0) {
      // Move focus to the first invalid field.
      const first = (['amount', 'date', 'category', 'description'] as const).find((f) => errors[f]);
      if (first) document.getElementById(`expense-${first}`)?.focus();
      return;
    }
    onSubmit({
      date: values.date,
      amount: parseFloat(values.amount.replace(/[,$\s]/g, '')),
      category: values.category as Category,
      description: values.description.trim(),
    });
  };

  const fieldClass = (field: keyof FormValues) =>
    `input ${showError(field) ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20' : ''}`;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="expense-amount" className="label">
            Amount
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">$</span>
            <input
              id="expense-amount"
              data-autofocus
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              value={values.amount}
              onChange={(e) => set('amount', e.target.value)}
              onBlur={() => blur('amount')}
              aria-invalid={!!showError('amount')}
              aria-describedby={showError('amount') ? 'expense-amount-error' : undefined}
              className={`${fieldClass('amount')} pl-7 tabular-nums`}
            />
          </div>
          {showError('amount') && (
            <p id="expense-amount-error" className="field-error">
              {errors.amount}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="expense-date" className="label">
            Date
          </label>
          <div className="relative">
            <input
              id="expense-date"
              type="date"
              min={MIN_DATE}
              max={todayISO()}
              value={values.date}
              onChange={(e) => set('date', e.target.value)}
              onBlur={() => blur('date')}
              aria-invalid={!!showError('date')}
              aria-describedby={showError('date') ? 'expense-date-error' : undefined}
              className={`${fieldClass('date')} date-overlay pr-10`}
            />
            <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          </div>
          {showError('date') && (
            <p id="expense-date-error" className="field-error">
              {errors.date}
            </p>
          )}
        </div>
      </div>

      <fieldset>
        <legend className="label">Category</legend>
        <div
          id="expense-category"
          tabIndex={-1}
          role="radiogroup"
          aria-invalid={!!showError('category')}
          className="grid grid-cols-2 gap-2 outline-none sm:grid-cols-3"
        >
          {CATEGORIES.map((c) => {
            const { icon: Icon, chip } = CATEGORY_META[c];
            const selected = values.category === c;
            return (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => {
                  set('category', c);
                  blur('category');
                }}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition ${
                  selected
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${chip}`}>
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="truncate">{c}</span>
              </button>
            );
          })}
        </div>
        {showError('category') && <p className="field-error">{errors.category}</p>}
      </fieldset>

      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor="expense-description" className="label">
            Description
          </label>
          <span
            className={`text-xs tabular-nums ${
              values.description.trim().length > MAX_DESCRIPTION ? 'text-rose-600' : 'text-slate-400'
            }`}
          >
            {values.description.trim().length}/{MAX_DESCRIPTION}
          </span>
        </div>
        <input
          id="expense-description"
          type="text"
          placeholder="e.g. Weekly groceries"
          value={values.description}
          onChange={(e) => set('description', e.target.value)}
          onBlur={() => blur('description')}
          aria-invalid={!!showError('description')}
          aria-describedby={showError('description') ? 'expense-description-error' : undefined}
          className={fieldClass('description')}
        />
        {showError('description') && (
          <p id="expense-description-error" className="field-error">
            {errors.description}
          </p>
        )}
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn-primary">
          {initial ? 'Save changes' : 'Add expense'}
        </button>
      </div>
    </form>
  );
}
