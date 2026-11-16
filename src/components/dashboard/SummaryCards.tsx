import { CalendarDays, PieChart, TrendingDown, TrendingUp, Wallet, Activity, type LucideIcon } from 'lucide-react';
import type { Summary } from '@/lib/analytics';
import { formatCurrency, formatPercent } from '@/lib/format';
import { CATEGORY_META } from '@/lib/categories';

interface CardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  iconClass: string;
  children?: React.ReactNode;
}

function Card({ label, value, icon: Icon, iconClass, children }: CardProps) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconClass}`}>
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      </div>
      <p className="mt-3 truncate text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">{value}</p>
      <div className="mt-1 text-sm text-slate-500">{children}</div>
    </div>
  );
}

export function SummaryCards({ summary }: { summary: Summary }) {
  const { monthChange, topCategory } = summary;
  const up = monthChange !== null && monthChange > 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card label="Total spending" value={formatCurrency(summary.total)} icon={Wallet} iconClass="bg-indigo-50 text-indigo-600">
        {summary.count} {summary.count === 1 ? 'expense' : 'expenses'} recorded
      </Card>

      <Card label="This month" value={formatCurrency(summary.thisMonth)} icon={CalendarDays} iconClass="bg-sky-50 text-sky-600">
        {monthChange === null ? (
          <span>No data for last month</span>
        ) : (
          <span className="inline-flex items-center gap-1">
            <span
              className={`inline-flex items-center gap-0.5 font-medium ${up ? 'text-rose-600' : 'text-emerald-600'}`}
            >
              {up ? <TrendingUp className="h-4 w-4" aria-hidden /> : <TrendingDown className="h-4 w-4" aria-hidden />}
              {up ? '+' : ''}
              {formatPercent(monthChange)}
            </span>
            <span>vs last month</span>
          </span>
        )}
      </Card>

      <Card
        label="Daily average"
        value={formatCurrency(summary.dailyAverage)}
        icon={Activity}
        iconClass="bg-violet-50 text-violet-600"
      >
        Across {summary.thisMonthCount} {summary.thisMonthCount === 1 ? 'expense' : 'expenses'} this month
      </Card>

      <Card
        label="Top category"
        value={topCategory ? topCategory.category : '—'}
        icon={topCategory ? CATEGORY_META[topCategory.category].icon : PieChart}
        iconClass={topCategory ? CATEGORY_META[topCategory.category].chip : 'bg-slate-100 text-slate-500'}
      >
        {topCategory
          ? `${formatCurrency(topCategory.total)} · ${formatPercent(topCategory.percent)} of total`
          : 'No spending yet'}
      </Card>
    </div>
  );
}
