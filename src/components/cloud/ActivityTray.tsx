'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, ChevronDown, CircleAlert, LoaderCircle } from 'lucide-react';
import { useCloud, STATUS_LABEL, isActive } from '@/context/CloudContext';
import { TEMPLATES } from '@/lib/cloud/templates';
import { DESTINATIONS } from '@/lib/cloud/providers';
import { ServiceTile } from './ServiceTile';

/**
 * Floating "background tasks" tray (bottom-left), like an upload manager.
 * Appears while jobs run and lingers briefly after they finish.
 */
export function ActivityTray() {
  const { jobs } = useCloud();
  const [collapsed, setCollapsed] = useState(false);
  const [visibleIds, setVisibleIds] = useState<string[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  // Track jobs that are running, or that finished in this session (shown for 6s).
  useEffect(() => {
    for (const j of jobs) {
      if (isActive(j)) {
        if (!visibleIds.includes(j.id)) setVisibleIds((ids) => [j.id, ...ids]);
      } else if (visibleIds.includes(j.id) && !timers.current.has(j.id)) {
        timers.current.set(
          j.id,
          setTimeout(() => {
            setVisibleIds((ids) => ids.filter((id) => id !== j.id));
            timers.current.delete(j.id);
          }, 6000),
        );
      }
    }
  }, [jobs, visibleIds]);

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach(clearTimeout);
  }, []);

  const shown = jobs.filter((j) => visibleIds.includes(j.id)).slice(0, 4);
  if (shown.length === 0) return null;
  const running = shown.filter(isActive).length;
  const failed = shown.filter((j) => j.status === 'failed').length;

  return (
    <div className="fixed bottom-4 left-4 z-40 w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/15 animate-slide-up">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center justify-between gap-2 bg-slate-900 px-4 py-2.5 text-left text-sm font-medium text-white"
        aria-expanded={!collapsed}
      >
        <span className="flex items-center gap-2">
          {running > 0 ? (
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
          ) : failed > 0 ? (
            <CircleAlert className="h-4 w-4 text-rose-400" aria-hidden />
          ) : (
            <Check className="h-4 w-4 text-emerald-400" aria-hidden />
          )}
          {running > 0
            ? `${running} export${running === 1 ? '' : 's'} in progress`
            : failed > 0
              ? `${failed} export${failed === 1 ? '' : 's'} failed`
              : 'All exports finished'}
        </span>
        <ChevronDown className={`h-4 w-4 transition ${collapsed ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {!collapsed && (
        <ul className="divide-y divide-slate-100" aria-live="polite">
          {shown.map((j) => (
            <li key={j.id} className="flex items-center gap-3 px-4 py-2.5">
              <ServiceTile id={j.destination} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">
                  {TEMPLATES[j.templateId].name} → {DESTINATIONS[j.destination].short}
                </p>
                {isActive(j) ? (
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-indigo-600 transition-all duration-300" style={{ width: `${j.progress}%` }} />
                    </div>
                    <span className="w-24 truncate text-[11px] text-slate-500">{STATUS_LABEL[j.status]}</span>
                  </div>
                ) : j.status === 'failed' ? (
                  <p className="flex items-center gap-1 truncate text-xs text-rose-600">
                    <CircleAlert className="h-3 w-3 shrink-0" aria-hidden /> {j.error}
                  </p>
                ) : (
                  <p className="truncate text-xs text-emerald-700">Done · {j.fileName}</p>
                )}
              </div>
            </li>
          ))}
          <li className="px-4 py-2 text-right">
            <Link href="/exports#activity" className="text-xs font-semibold text-indigo-600 hover:underline">
              View all activity
            </Link>
          </li>
        </ul>
      )}
    </div>
  );
}
