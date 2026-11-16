const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const compactCurrencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});

export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}

/** Short axis-style labels: $0, $250, $1.5K, $2M. */
export function formatCompactCurrency(amount: number): string {
  return compactCurrencyFormatter.format(amount);
}

/** Parses YYYY-MM-DD as a *local* date (avoids the UTC off-by-one-day bug). */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Formats a Date as local YYYY-MM-DD. */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function formatDate(iso: string, options?: Intl.DateTimeFormatOptions): string {
  return parseISODate(iso).toLocaleDateString(
    'en-US',
    options ?? { month: 'short', day: 'numeric', year: 'numeric' },
  );
}

export function formatPercent(value: number, digits = 0): string {
  return `${value.toFixed(digits)}%`;
}
