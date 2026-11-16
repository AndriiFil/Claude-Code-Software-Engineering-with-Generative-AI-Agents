'use client';

import { useState } from 'react';
import { CalendarClock, Pencil, Play, Plus, Trash2 } from 'lucide-react';
import { useCloud } from '@/context/CloudContext';
import { Modal } from '@/components/ui/Modal';
import { TEMPLATES, TEMPLATE_ORDER, periodRange } from '@/lib/cloud/templates';
import { DESTINATIONS, isCloudProvider } from '@/lib/cloud/providers';
import { WEEKDAYS, describeSchedule, periodForFrequency, relativeTime, upcomingRuns } from '@/lib/cloud/schedule';
import type { Frequency, Schedule } from '@/lib/cloud/types';
import { generateId } from '@/lib/storage';
import { ServiceTile, StatusDot } from './ServiceTile';

const SCHEDULE_DESTINATIONS: Schedule['destination'][] = ['email', 'google-drive', 'dropbox', 'onedrive', 'google-sheets'];

function blankSchedule(): Schedule {
  return {
    id: generateId(),
    name: 'Monthly backup',
    templateId: 'full-backup',
    format: 'json',
    destination: 'dropbox',
    frequency: 'monthly',
    weekday: 1,
    dayOfMonth: 1,
    time: '08:00',
    enabled: true,
    createdAt: new Date().toISOString(),
    lastRunAt: null,
    recipients: [],
  };
}

function ScheduleDialog({ initial, onClose }: { initial: Schedule; onClose: () => void }) {
  const { saveSchedule, connections, schedules } = useCloud();
  const [s, setS] = useState<Schedule>(initial);
  const [recipientText, setRecipientText] = useState(initial.recipients.join(', '));
  const set = <K extends keyof Schedule>(k: K, v: Schedule[K]) => setS((prev) => ({ ...prev, [k]: v }));

  const recipients = recipientText.split(/[\s,;]+/).filter((r) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r));
  const conn = isCloudProvider(s.destination) ? connections[s.destination] : null;
  const invalid = !s.name.trim() || (s.destination === 'email' && recipients.length === 0);
  const runs = upcomingRuns({ ...s, enabled: true }, 3);

  return (
    <Modal open onClose={onClose} title={schedules.some((x) => x.id === initial.id) ? 'Edit schedule' : 'New schedule'} description="Recurring exports run automatically and appear in Activity." size="lg">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="sch-name" className="label">
            Name
          </label>
          <input id="sch-name" className="input" value={s.name} onChange={(e) => set('name', e.target.value)} data-autofocus />
        </div>
        <div>
          <label htmlFor="sch-template" className="label">
            Template
          </label>
          <select
            id="sch-template"
            className="input"
            value={s.templateId}
            onChange={(e) => {
              const t = TEMPLATES[e.target.value as Schedule['templateId']];
              setS((prev) => ({ ...prev, templateId: t.id, format: t.defaultFormat }));
            }}
          >
            {TEMPLATE_ORDER.map((id) => (
              <option key={id} value={id}>
                {TEMPLATES[id].name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="sch-format" className="label">
            Format
          </label>
          <select id="sch-format" className="input" value={s.format} onChange={(e) => set('format', e.target.value as Schedule['format'])}>
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
          </select>
        </div>

        <fieldset className="sm:col-span-2">
          <legend className="label">Frequency</legend>
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
            {(['daily', 'weekly', 'monthly'] as Frequency[]).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={s.frequency === f}
                onClick={() => set('frequency', f)}
                className={`rounded-md py-1.5 text-sm font-medium capitalize ${s.frequency === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </fieldset>

        {s.frequency === 'weekly' && (
          <div>
            <label htmlFor="sch-weekday" className="label">
              Day
            </label>
            <select id="sch-weekday" className="input" value={s.weekday} onChange={(e) => set('weekday', Number(e.target.value))}>
              {WEEKDAYS.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        )}
        {s.frequency === 'monthly' && (
          <div>
            <label htmlFor="sch-dom" className="label">
              Day of month
            </label>
            <select id="sch-dom" className="input" value={s.dayOfMonth} onChange={(e) => set('dayOfMonth', Number(e.target.value))}>
              {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label htmlFor="sch-time" className="label">
            Time
          </label>
          <input id="sch-time" type="time" className="input" value={s.time} onChange={(e) => set('time', e.target.value || '08:00')} />
        </div>

        <fieldset className="sm:col-span-2">
          <legend className="label">Deliver to</legend>
          <div className="flex flex-wrap gap-2">
            {SCHEDULE_DESTINATIONS.map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={s.destination === d}
                onClick={() => set('destination', d)}
                className={`inline-flex items-center gap-2 rounded-xl border py-1.5 pl-1.5 pr-3 text-sm font-medium transition ${
                  s.destination === d ? 'border-indigo-500 bg-indigo-50/60 text-slate-900 ring-1 ring-indigo-500' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <ServiceTile id={d} size="sm" />
                {DESTINATIONS[d].short}
              </button>
            ))}
          </div>
          {conn?.status === 'disconnected' && (
            <p className="mt-2 text-xs text-amber-700">{DESTINATIONS[s.destination].name} isn&apos;t connected — runs will fail until you connect it under Integrations.</p>
          )}
        </fieldset>

        {s.destination === 'email' && (
          <div className="sm:col-span-2">
            <label htmlFor="sch-to" className="label">
              Recipients
            </label>
            <input id="sch-to" className="input" placeholder="me@example.com, accountant@example.com" value={recipientText} onChange={(e) => setRecipientText(e.target.value)} />
          </div>
        )}

        <div className="rounded-xl bg-slate-50 p-3 sm:col-span-2">
          <p className="text-sm font-medium text-slate-900">{describeSchedule(s)}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Each run exports <span className="font-medium">{periodRange(periodForFrequency(s)).label.toLowerCase()}</span>
            {s.templateId !== 'full-backup' && (s.frequency === 'monthly' ? ' (the month that just ended)' : ' (month to date)')}.
          </p>
          <ol className="mt-2 flex flex-wrap gap-1.5">
            {runs.map((r) => (
              <li key={r.toISOString()} className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-600 ring-1 ring-slate-200">
                {r.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
        <button type="button" className="btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="btn-primary"
          disabled={invalid}
          onClick={() => {
            saveSchedule({ ...s, name: s.name.trim(), recipients });
            onClose();
          }}
        >
          Save schedule
        </button>
      </div>
    </Modal>
  );
}

export function SchedulesPanel() {
  const { schedules, saveSchedule, removeSchedule, runScheduleNow, connections } = useCloud();
  const [editing, setEditing] = useState<Schedule | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-slate-500">
          Automatic backups run while Spendwise is open in a tab, and catch up the next time you open it if a run was missed.
        </p>
        <button type="button" className="btn-primary" onClick={() => setEditing(blankSchedule())}>
          <Plus className="h-4 w-4" aria-hidden /> New schedule
        </button>
      </div>

      {schedules.length === 0 ? (
        <div className="card flex flex-col items-center px-6 py-12 text-center">
          <CalendarClock className="h-10 w-10 text-slate-300" aria-hidden />
          <h3 className="mt-4 text-base font-semibold text-slate-900">Set it and forget it</h3>
          <p className="mt-1 max-w-sm text-sm text-slate-500">Send your accountant a monthly tax report, or back up everything to Dropbox every week.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button type="button" className="btn-secondary" onClick={() => setEditing(blankSchedule())}>
              Monthly backup to Dropbox
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setEditing({ ...blankSchedule(), name: 'Weekly summary email', templateId: 'monthly-summary', format: 'csv', destination: 'email', frequency: 'weekly', weekday: 1 })}
            >
              Weekly summary email
            </button>
          </div>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {schedules.map((s) => {
            const next = upcomingRuns(s, 1)[0];
            const conn = isCloudProvider(s.destination) ? connections[s.destination] : null;
            return (
              <li key={s.id} className={`card p-4 transition ${s.enabled ? '' : 'opacity-60'}`}>
                <div className="flex items-start gap-3">
                  <ServiceTile id={s.destination} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{s.name}</p>
                    <p className="text-xs text-slate-500">
                      {TEMPLATES[s.templateId].name} · {s.format.toUpperCase()} → {s.destination === 'email' ? s.recipients.join(', ') : DESTINATIONS[s.destination].name}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={s.enabled}
                    aria-label={`${s.enabled ? 'Pause' : 'Resume'} ${s.name}`}
                    onClick={() => saveSchedule({ ...s, enabled: !s.enabled, lastRunAt: s.enabled ? s.lastRunAt : new Date().toISOString() })}
                    className={`relative h-5 w-9 shrink-0 rounded-full transition ${s.enabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
                  >
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${s.enabled ? 'left-[18px]' : 'left-0.5'}`} />
                  </button>
                </div>
                <div className="mt-3 space-y-1 text-xs text-slate-600">
                  <p className="font-medium text-slate-800">{describeSchedule(s)}</p>
                  <p>
                    {s.enabled ? (
                      <>
                        Next run <span className="font-medium">{relativeTime(next)}</span> ·{' '}
                        {next.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </>
                    ) : (
                      'Paused'
                    )}
                  </p>
                  <p className="text-slate-500">Last run: {s.lastRunAt ? relativeTime(s.lastRunAt) : 'never'}</p>
                  {conn && conn.status === 'disconnected' && (
                    <p className="flex items-center gap-1.5 text-amber-700">
                      <StatusDot status="error" /> {DESTINATIONS[s.destination].name} not connected
                    </p>
                  )}
                </div>
                <div className="mt-3 flex gap-1 border-t border-slate-100 pt-3">
                  <button type="button" className="btn-secondary px-2.5 py-1 text-xs" onClick={() => runScheduleNow(s.id)}>
                    <Play className="h-3.5 w-3.5" aria-hidden /> Run now
                  </button>
                  <button type="button" className="btn-secondary px-2.5 py-1 text-xs" onClick={() => setEditing(s)}>
                    <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
                  </button>
                  <button type="button" className="ml-auto rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label={`Delete ${s.name}`} onClick={() => removeSchedule(s.id)}>
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editing && <ScheduleDialog initial={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
