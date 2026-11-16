import type { PeriodId, Schedule } from './types';

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function at(base: Date, time: string): Date {
  const [h, m] = time.split(':').map(Number);
  const d = new Date(base);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

/** First run strictly after `after`. */
export function nextRun(s: Pick<Schedule, 'frequency' | 'weekday' | 'dayOfMonth' | 'time'>, after: Date): Date {
  if (s.frequency === 'daily') {
    const d = at(after, s.time);
    if (d <= after) d.setDate(d.getDate() + 1);
    return d;
  }
  if (s.frequency === 'weekly') {
    const d = at(after, s.time);
    d.setDate(d.getDate() + ((s.weekday - d.getDay() + 7) % 7));
    if (d <= after) d.setDate(d.getDate() + 7);
    return d;
  }
  const d = at(new Date(after.getFullYear(), after.getMonth(), s.dayOfMonth), s.time);
  if (d <= after) d.setMonth(d.getMonth() + 1);
  return d;
}

export function upcomingRuns(s: Schedule, count: number, from = new Date()): Date[] {
  const out: Date[] = [];
  let cursor = from;
  for (let i = 0; i < count; i++) {
    cursor = nextRun(s, cursor);
    out.push(cursor);
  }
  return out;
}

/**
 * Whether a run was due between the last run (or creation) and now.
 * There is no server, so schedules run while the app is open and catch up on the next visit.
 */
export function isDue(s: Schedule, now = new Date()): boolean {
  if (!s.enabled) return false;
  const since = new Date(s.lastRunAt ?? s.createdAt);
  return nextRun(s, since) <= now;
}

/** Each run exports the period that just closed. */
export function periodForFrequency(s: Pick<Schedule, 'frequency' | 'templateId'>): PeriodId {
  if (s.templateId === 'full-backup') return 'all';
  if (s.frequency === 'monthly') return 'last-month';
  return 'this-month';
}

export function describeSchedule(s: Pick<Schedule, 'frequency' | 'weekday' | 'dayOfMonth' | 'time'>): string {
  const [h, m] = s.time.split(':').map(Number);
  const time = new Date(2000, 0, 1, h, m).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (s.frequency === 'daily') return `Every day at ${time}`;
  if (s.frequency === 'weekly') return `Every ${WEEKDAYS[s.weekday]} at ${time}`;
  const suffix = s.dayOfMonth === 1 ? 'st' : s.dayOfMonth === 2 ? 'nd' : s.dayOfMonth === 3 ? 'rd' : 'th';
  return `Monthly on the ${s.dayOfMonth}${suffix} at ${time}`;
}

export function relativeTime(iso: string | Date, now = new Date()): string {
  const t = typeof iso === 'string' ? new Date(iso) : iso;
  const diff = (t.getTime() - now.getTime()) / 1000;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  if (abs < 45) return diff < 0 ? 'just now' : 'in a few seconds';
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), 'day');
  return t.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
