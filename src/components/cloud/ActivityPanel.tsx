'use client';

import { useState } from 'react';
import { CalendarClock, Check, CircleAlert, Download, History, Link2, RotateCcw, ShieldCheck, Trash2 } from 'lucide-react';
import { useCloud, STATUS_LABEL, isActive } from '@/context/CloudContext';
import { TEMPLATES, periodRange } from '@/lib/cloud/templates';
import { DESTINATIONS } from '@/lib/cloud/providers';
import { formatBytes } from '@/lib/cloud/serialize';
import { relativeTime } from '@/lib/cloud/schedule';
import type { ExportJob } from '@/lib/cloud/types';
import { Modal } from '@/components/ui/Modal';
import { ServiceTile } from './ServiceTile';
import { ShareResult } from './ShareResult';

const BADGE: Record<string, string> = {
  completed: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  failed: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  active: 'bg-sky-50 text-sky-700 ring-sky-600/20',
};

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

export function ActivityPanel({ onNewExport }: { onNewExport: () => void }) {
  const { jobs, retryJob, redownload, removeJob, clearHistory, schedules } = useCloud();
  const [linkJob, setLinkJob] = useState<ExportJob | null>(null);
  const [copiedSum, setCopiedSum] = useState<string | null>(null);

  if (jobs.length === 0) {
    return (
      <div className="card flex flex-col items-center px-6 py-14 text-center">
        <History className="h-10 w-10 text-slate-300" aria-hidden />
        <h3 className="mt-4 text-base font-semibold text-slate-900">No exports yet</h3>
        <p className="mt-1 max-w-sm text-sm text-slate-500">Every export, scheduled backup and share link shows up here with its status, size and checksum.</p>
        <button type="button" className="btn-primary mt-5" onClick={onNewExport}>
          Create your first export
        </button>
      </div>
    );
  }

  // Group by day for a timeline feel.
  const groups: { label: string; items: ExportJob[] }[] = [];
  for (const j of jobs) {
    const label = dayLabel(j.createdAt);
    const g = groups[groups.length - 1];
    if (g && g.label === label) g.items.push(j);
    else groups.push({ label, items: [j] });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {jobs.length} export{jobs.length === 1 ? '' : 's'} · stored in this browser
        </p>
        <button type="button" className="text-xs font-medium text-slate-500 hover:text-rose-600" onClick={clearHistory}>
          Clear history
        </button>
      </div>

      {groups.map((g) => (
        <section key={g.label}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{g.label}</h3>
          <ul className="card divide-y divide-slate-100">
            {g.items.map((j) => {
              const active = isActive(j);
              const schedule = j.scheduleId ? schedules.find((s) => s.id === j.scheduleId) : null;
              return (
                <li key={j.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:flex-nowrap">
                  <ServiceTile id={j.destination} />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2 text-sm font-medium text-slate-900">
                      {TEMPLATES[j.templateId].name}
                      <span className="text-slate-400">→</span>
                      <span className="truncate">{j.destination === 'email' ? j.target : DESTINATIONS[j.destination].name}</span>
                      {j.trigger === 'schedule' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">
                          <CalendarClock className="h-3 w-3" aria-hidden /> {schedule?.name ?? 'Scheduled'}
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-slate-500">
                      <time dateTime={j.createdAt} title={new Date(j.createdAt).toLocaleString()}>
                        {relativeTime(j.createdAt)}
                      </time>
                      <span>· {periodRange(j.period).label}</span>
                      <span>· {j.format.toUpperCase()}</span>
                      {j.bytes != null && <span>· {formatBytes(j.bytes)}</span>}
                      {j.rowCount != null && <span>· {j.rowCount} records</span>}
                      {j.destination !== 'email' && j.destination !== 'download' && j.destination !== 'link' && j.target && <span className="font-mono">· {j.target}</span>}
                    </p>
                    {active && (
                      <div className="mt-1.5 h-1 w-full max-w-xs overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-sky-500 transition-all duration-300" style={{ width: `${j.progress}%` }} />
                      </div>
                    )}
                    {j.status === 'failed' && <p className="mt-0.5 text-xs text-rose-600">{j.error}</p>}
                  </div>

                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${BADGE[active ? 'active' : j.status]}`}>
                    {STATUS_LABEL[j.status]}
                  </span>

                  <div className="flex items-center gap-0.5">
                    {j.checksum && (
                      <button
                        type="button"
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        title={`SHA-256 ${j.checksum}\nClick to copy — recipients can verify the file wasn't altered.`}
                        aria-label="Copy SHA-256 checksum"
                        onClick={() => {
                          void navigator.clipboard?.writeText(j.checksum!).then(() => {
                            setCopiedSum(j.id);
                            setTimeout(() => setCopiedSum(null), 1500);
                          });
                        }}
                      >
                        {copiedSum === j.id ? <Check className="h-4 w-4 text-emerald-600" aria-hidden /> : <ShieldCheck className="h-4 w-4" aria-hidden />}
                      </button>
                    )}
                    {j.link && j.status === 'completed' && (
                      <button type="button" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Show share link" title="Link & QR code" onClick={() => setLinkJob(j)}>
                        <Link2 className="h-4 w-4" aria-hidden />
                      </button>
                    )}
                    {j.status === 'completed' && j.destination !== 'link' && (
                      <button type="button" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Download again" title="Download again (regenerated from current data)" onClick={() => redownload(j.id)}>
                        <Download className="h-4 w-4" aria-hidden />
                      </button>
                    )}
                    {j.status === 'failed' && (
                      <button type="button" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Retry" title="Retry" onClick={() => retryJob(j.id)}>
                        <RotateCcw className="h-4 w-4" aria-hidden />
                      </button>
                    )}
                    {!active && (
                      <button type="button" className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Remove from history" title="Remove from history" onClick={() => removeJob(j.id)}>
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <Modal open={!!linkJob} onClose={() => setLinkJob(null)} title="Share link" description={linkJob ? TEMPLATES[linkJob.templateId].name : ''} size="lg">
        {linkJob?.link && <ShareResult link={linkJob.link} title={TEMPLATES[linkJob.templateId].name} />}
        {linkJob?.link?.expiresAt && new Date(linkJob.link.expiresAt) < new Date() && (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-amber-700">
            <CircleAlert className="h-4 w-4" aria-hidden /> This link has expired; viewers will see an expiry notice.
          </p>
        )}
      </Modal>
    </div>
  );
}
