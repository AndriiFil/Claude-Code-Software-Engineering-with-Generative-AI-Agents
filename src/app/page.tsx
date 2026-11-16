'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { CloudUpload } from 'lucide-react';
import { useExpenses } from '@/context/ExpenseContext';
import { getSummary, monthlyTotals } from '@/lib/analytics';
import { sortExpenses } from '@/lib/filters';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { MonthlyTrendChart } from '@/components/dashboard/MonthlyTrendChart';
import { CategoryBreakdown } from '@/components/dashboard/CategoryBreakdown';
import { RecentExpenses } from '@/components/dashboard/RecentExpenses';

export default function DashboardPage() {
  const { expenses, isLoading } = useExpenses();

  const summary = useMemo(() => getSummary(expenses), [expenses]);
  const monthly = useMemo(() => monthlyTotals(expenses, 6), [expenses]);
  const recent = useMemo(
    () => sortExpenses(expenses, { field: 'date', direction: 'desc' }).slice(0, 5),
    [expenses],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">An overview of your spending habits.</p>
        </div>
        {!isLoading && expenses.length > 0 && (
          <Link href="/exports" className="btn-secondary">
            <CloudUpload className="h-4 w-4" aria-hidden /> Export &amp; share
          </Link>
        )}
      </div>

      {isLoading ? (
        <DashboardSkeleton />
      ) : expenses.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <SummaryCards summary={summary} />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <MonthlyTrendChart data={monthly} />
              <RecentExpenses expenses={recent} />
            </div>
            <div>
              <CategoryBreakdown data={summary.byCategory} total={summary.total} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
