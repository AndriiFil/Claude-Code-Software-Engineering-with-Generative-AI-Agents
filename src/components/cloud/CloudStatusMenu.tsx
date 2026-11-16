'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Cloud, CloudAlert, CloudOff, CloudUpload } from 'lucide-react';
import { useCloud } from '@/context/CloudContext';
import { CLOUD_PROVIDERS, DESTINATIONS } from '@/lib/cloud/providers';
import { relativeTime } from '@/lib/cloud/schedule';
import { ServiceTile, StatusDot } from './ServiceTile';

/** Header indicator summarising connection / sync health, with a popover of every integration. */
export function CloudStatusMenu() {
  const { connections, activeJobs, jobs, hydrated } = useCloud();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!hydrated) return null;

  const list = CLOUD_PROVIDERS.map((p) => connections[p]);
  const connected = list.filter((c) => c.status !== 'disconnected');
  // Flag an issue only while the most recent finished export (within the last hour) is a failure.
  const lastFinished = jobs.find((j) => j.status === 'completed' || j.status === 'failed');
  const recentFailure = lastFinished?.status === 'failed' && Date.now() - new Date(lastFinished.finishedAt ?? 0).getTime() < 3600_000;
  const syncing = activeJobs.length > 0;
  const state = syncing ? 'syncing' : recentFailure ? 'error' : connected.length ? 'ok' : 'none';

  const Icon = state === 'syncing' ? CloudUpload : state === 'error' ? CloudAlert : state === 'ok' ? Cloud : CloudOff;
  const label =
    state === 'syncing' ? `Syncing ${activeJobs.length}…` : state === 'error' ? 'Sync issue' : state === 'ok' ? 'All synced' : 'Not connected';
  const tone =
    state === 'syncing' ? 'text-sky-600 bg-sky-50' : state === 'error' ? 'text-rose-600 bg-rose-50' : state === 'ok' ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500 bg-slate-100';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold transition hover:brightness-95 ${tone}`}
      >
        <Icon className={`h-4 w-4 ${state === 'syncing' ? 'animate-pulse' : ''}`} aria-hidden />
        <span className="hidden md:inline">{label}</span>
        <span className="sr-only md:hidden">{label}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl animate-slide-up">
          <p className="px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Integrations</p>
          <ul>
            {list.map((c) => (
              <li key={c.provider} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
                <ServiceTile id={c.provider} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900">{DESTINATIONS[c.provider].name}</p>
                  <p className="truncate text-xs text-slate-500">
                    {c.status === 'disconnected' ? 'Not connected' : c.lastSyncAt ? `Last sync ${relativeTime(c.lastSyncAt)}` : 'Connected · never synced'}
                  </p>
                </div>
                <StatusDot status={c.status} />
              </li>
            ))}
          </ul>
          <Link
            href="/exports#integrations"
            onClick={() => setOpen(false)}
            className="mt-1 block rounded-lg bg-slate-50 px-2 py-2 text-center text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
          >
            Manage integrations
          </Link>
        </div>
      )}
    </div>
  );
}
