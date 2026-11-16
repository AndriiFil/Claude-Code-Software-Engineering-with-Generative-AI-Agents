'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarClock, Download, History, Link2, Mail, Plug, Plus, Sparkles } from 'lucide-react';
import { useExpenses } from '@/context/ExpenseContext';
import { useCloud } from '@/context/CloudContext';
import { TEMPLATES, TEMPLATE_ORDER } from '@/lib/cloud/templates';
import { CLOUD_PROVIDERS } from '@/lib/cloud/providers';
import type { DestinationId, TemplateId } from '@/lib/cloud/types';
import { ExportComposer } from '@/components/cloud/ExportComposer';
import { ActivityPanel } from '@/components/cloud/ActivityPanel';
import { SchedulesPanel } from '@/components/cloud/SchedulesPanel';
import { IntegrationsPanel } from '@/components/cloud/IntegrationsPanel';
import { ServiceTile } from '@/components/cloud/ServiceTile';
import { EmptyState } from '@/components/EmptyState';

type Tab = 'activity' | 'schedules' | 'integrations';
const TABS: { id: Tab; label: string; icon: typeof History }[] = [
  { id: 'activity', label: 'Activity', icon: History },
  { id: 'schedules', label: 'Schedules', icon: CalendarClock },
  { id: 'integrations', label: 'Integrations', icon: Plug },
];

export default function ExportsPage() {
  const { expenses, isLoading } = useExpenses();
  const { jobs, schedules, connections, activeJobs } = useCloud();
  const [tab, setTab] = useState<Tab>('activity');
  const [composer, setComposer] = useState<{ template?: TemplateId; destination?: DestinationId } | null>(null);

  // Deep links: /exports#schedules etc. (used by the header menu and activity tray).
  useEffect(() => {
    const sync = () => {
      const h = window.location.hash.slice(1) as Tab;
      if (TABS.some((t) => t.id === h)) setTab(h);
    };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  const selectTab = (t: Tab) => {
    setTab(t);
    history.replaceState(null, '', `#${t}`);
  };

  const previews = useMemo(
    () => Object.fromEntries(TEMPLATE_ORDER.map((id) => [id, TEMPLATES[id].build(expenses, TEMPLATES[id].defaultPeriod)])),
    [expenses],
  );

  const connectedCount = CLOUD_PROVIDERS.filter((p) => connections[p].status !== 'disconnected').length;
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const thisMonth = jobs.filter((j) => j.status === 'completed' && j.createdAt >= monthStart).length;
  const activeSchedules = schedules.filter((s) => s.enabled).length;

  if (!isLoading && expenses.length === 0) return <EmptyState />;

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-6 text-white shadow-lg sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-24 right-24 h-56 w-56 rounded-full bg-fuchsia-300/20 blur-2xl" aria-hidden />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" aria-hidden /> Export Hub
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Your numbers, wherever you need them</h1>
            <p className="mt-2 text-sm text-indigo-100">
              Send reports to your accountant, sync to the cloud, share a live snapshot with a QR code, or put backups on autopilot.
            </p>
          </div>
          <button type="button" className="btn bg-white text-indigo-700 shadow-sm hover:bg-indigo-50" onClick={() => setComposer({})}>
            <Plus className="h-4 w-4" aria-hidden /> New export
          </button>
        </div>
        <dl className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['Connected apps', `${connectedCount} / ${CLOUD_PROVIDERS.length}`],
            ['Active schedules', String(activeSchedules)],
            ['Exports this month', String(thisMonth)],
            ['Running now', String(activeJobs.length)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur">
              <dt className="text-xs text-indigo-100">{label}</dt>
              <dd className="mt-0.5 text-xl font-semibold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Templates */}
      <section aria-labelledby="templates-heading">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 id="templates-heading" className="text-lg font-semibold text-slate-900">
              Templates
            </h2>
            <p className="text-sm text-slate-500">Ready-made reports for common jobs. Numbers below are live from your data.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {TEMPLATE_ORDER.map((id) => {
            const t = TEMPLATES[id];
            const ds = previews[id];
            return (
              <article key={id} className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md">
                <div className={`relative h-20 bg-gradient-to-br ${t.gradient} p-4 text-white`}>
                  <p className="text-xs font-medium text-white/80">{t.useCase}</p>
                  <span className="absolute bottom-3 right-4 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide backdrop-blur">
                    {t.defaultFormat}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="font-semibold text-slate-900">{t.name}</h3>
                  <p className="text-xs text-slate-500">{t.tagline}</p>
                  <dl className="mt-3 space-y-1">
                    {ds.highlights.map((h) => (
                      <div key={h.label} className="flex justify-between gap-2 text-xs">
                        <dt className="text-slate-500">{h.label}</dt>
                        <dd className="truncate font-medium tabular-nums text-slate-900">{h.value}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-4 flex items-center gap-1 border-t border-slate-100 pt-3">
                    <button type="button" className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-800" onClick={() => setComposer({ template: id })}>
                      Use template <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" aria-hidden />
                    </button>
                    <span className="ml-auto flex gap-0.5">
                      {(
                        [
                          ['download', Download, 'Download'],
                          ['email', Mail, 'Email'],
                          ['link', Link2, 'Share link'],
                        ] as const
                      ).map(([d, Icon, label]) => (
                        <button
                          key={d}
                          type="button"
                          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          aria-label={`${label}: ${t.name}`}
                          title={label}
                          onClick={() => setComposer({ template: id, destination: d })}
                        >
                          <Icon className="h-4 w-4" aria-hidden />
                        </button>
                      ))}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Connected strip */}
      <section className="card flex flex-wrap items-center gap-4 p-4">
        <div className="flex -space-x-2">
          {CLOUD_PROVIDERS.map((p) => (
            <span key={p} className={`rounded-xl ring-2 ring-white ${connections[p].status === 'disconnected' ? 'opacity-40 grayscale' : ''}`}>
              <ServiceTile id={p} />
            </span>
          ))}
        </div>
        <p className="flex-1 text-sm text-slate-600">
          {connectedCount === 0
            ? 'Connect Google Sheets, Drive, Dropbox or OneDrive to send exports straight to the cloud.'
            : `${connectedCount} app${connectedCount === 1 ? '' : 's'} connected. Exports and scheduled backups sync automatically.`}
        </p>
        <button type="button" className="btn-secondary" onClick={() => selectTab('integrations')}>
          <Plug className="h-4 w-4" aria-hidden /> Manage
        </button>
      </section>

      {/* Tabs */}
      <section>
        <div role="tablist" aria-label="Export hub sections" className="mb-4 flex gap-1 border-b border-slate-200">
          {TABS.map(({ id, label, icon: Icon }) => {
            const count = id === 'activity' ? jobs.length : id === 'schedules' ? schedules.length : connectedCount;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                id={`tab-${id}`}
                aria-selected={tab === id}
                aria-controls={`panel-${id}`}
                onClick={() => selectTab(id)}
                className={`-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition ${
                  tab === id ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
                {count > 0 && <span className="rounded-full bg-slate-100 px-1.5 text-[11px] font-semibold text-slate-600">{count}</span>}
              </button>
            );
          })}
        </div>
        <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
          {tab === 'activity' && <ActivityPanel onNewExport={() => setComposer({})} />}
          {tab === 'schedules' && <SchedulesPanel />}
          {tab === 'integrations' && <IntegrationsPanel />}
        </div>
      </section>

      <ExportComposer
        open={!!composer}
        onClose={() => setComposer(null)}
        initialTemplate={composer?.template}
        initialDestination={composer?.destination}
      />
    </div>
  );
}
