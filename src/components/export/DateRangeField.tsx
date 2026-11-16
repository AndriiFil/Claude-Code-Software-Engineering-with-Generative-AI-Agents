'use client';

import { useId } from 'react';
import { QUICK_RANGES, quickRangeDates } from '@/lib/filters';
import { formatDate } from '@/lib/format';

interface Props {
  startDate: string;
  endDate: string;
  onChange: (range: { startDate: string; endDate: string }) => void;
  invalid: boolean;
  /** Earliest / latest dates in the whole dataset, shown as a hint. */
  dataBounds: { min: string; max: string } | null;
}

export function DateRangeField({ startDate, endDate, onChange, invalid, dataBounds }: Props) {
  const startId = useId();
  const endId = useId();
  const errorId = useId();

  const presets = [
    { id: 'all', label: 'All time', range: { startDate: '', endDate: '' } },
    ...QUICK_RANGES.map((r) => ({ id: r.id, label: r.label, range: quickRangeDates(r.id) })),
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick date ranges">
        {presets.map((p) => {
          const active = p.range.startDate === startDate && p.range.endDate === endDate;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onChange(p.range)}
              aria-pressed={active}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                active
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor={startId} className="mb-1 block text-xs font-medium text-slate-600">
            Start date
          </label>
          <input
            id={startId}
            type="date"
            className="input"
            value={startDate}
            max={endDate || undefined}
            onChange={(e) => onChange({ startDate: e.target.value, endDate })}
            aria-invalid={invalid}
            aria-describedby={invalid ? errorId : undefined}
          />
        </div>
        <div>
          <label htmlFor={endId} className="mb-1 block text-xs font-medium text-slate-600">
            End date
          </label>
          <input
            id={endId}
            type="date"
            className="input"
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => onChange({ startDate, endDate: e.target.value })}
            aria-invalid={invalid}
            aria-describedby={invalid ? errorId : undefined}
          />
        </div>
      </div>

      {invalid ? (
        <p id={errorId} className="text-xs font-medium text-rose-600" role="alert">
          Start date must be on or before the end date.
        </p>
      ) : (
        dataBounds && (
          <p className="text-xs text-slate-500">
            Your data spans {formatDate(dataBounds.min)} – {formatDate(dataBounds.max)}. Leave blank for no limit.
          </p>
        )
      )}
    </div>
  );
}
