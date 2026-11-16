'use client';

import { Braces, Check, FileSpreadsheet, FileText, type LucideIcon } from 'lucide-react';
import { EXPORT_FORMATS, FORMAT_ORDER, type ExportFormatId } from '@/lib/export';

const ICONS: Record<ExportFormatId, LucideIcon> = {
  csv: FileSpreadsheet,
  json: Braces,
  pdf: FileText,
};

const TINT: Record<ExportFormatId, string> = {
  csv: 'bg-emerald-100 text-emerald-700',
  json: 'bg-amber-100 text-amber-700',
  pdf: 'bg-rose-100 text-rose-700',
};

interface Props {
  value: ExportFormatId;
  onChange: (id: ExportFormatId) => void;
  disabled?: boolean;
}

export function FormatPicker({ value, onChange, disabled }: Props) {
  return (
    <fieldset disabled={disabled}>
      <legend className="sr-only">File format</legend>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-1">
        {FORMAT_ORDER.map((id) => {
          const format = EXPORT_FORMATS[id];
          const Icon = ICONS[id];
          const selected = value === id;
          return (
            <label
              key={id}
              className={`relative flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition focus-within:ring-4 focus-within:ring-indigo-500/20 ${
                selected
                  ? 'border-indigo-500 bg-indigo-50/60 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="export-format"
                value={id}
                checked={selected}
                onChange={() => onChange(id)}
                className="sr-only"
                data-autofocus={selected ? '' : undefined}
              />
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${TINT[id]}`} aria-hidden>
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-900">{format.label}</span>
                <span className="mt-0.5 block text-xs leading-snug text-slate-500">{format.description}</span>
              </span>
              {selected && (
                <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-white">
                  <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                </span>
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
