'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import { useExpenses } from './ExpenseContext';
import { useToast } from './ToastContext';
import type {
  CloudProviderId,
  CloudState,
  Connection,
  DestinationId,
  EmailDetails,
  ExportJob,
  FileFormat,
  JobStatus,
  PeriodId,
  Schedule,
  TemplateId,
} from '@/lib/cloud/types';
import { CLOUD_PROVIDERS, DESTINATIONS, emptyConnection, isCloudProvider } from '@/lib/cloud/providers';
import { TEMPLATES, periodRange, recordCount } from '@/lib/cloud/templates';
import { serializeDataset, sha256, slugify, triggerDownload } from '@/lib/cloud/serialize';
import { buildShareUrl, encodeSharePayload, redactDataset } from '@/lib/cloud/shareLink';
import { isDue, periodForFrequency } from '@/lib/cloud/schedule';
import { generateId } from '@/lib/storage';

const STORAGE_KEY = 'spendwise.cloud.v1';
const MAX_JOBS = 60;

/* ----------------------------------------------------------------------------
 * Requests
 * ------------------------------------------------------------------------- */

export interface ExportRequest {
  templateId: TemplateId;
  period: PeriodId;
  format: FileFormat;
  destination: DestinationId;
  /** Folder / spreadsheet name for cloud destinations. */
  target?: string;
  email?: EmailDetails;
  link?: { expiresInDays: number | null; redacted: boolean; note?: string };
  trigger?: 'manual' | 'schedule';
  scheduleId?: string;
}

export const STATUS_LABEL: Record<JobStatus, string> = {
  queued: 'Queued',
  preparing: 'Generating file',
  uploading: 'Uploading',
  delivering: 'Delivering',
  completed: 'Completed',
  failed: 'Failed',
};

export function isActive(job: ExportJob): boolean {
  return job.status !== 'completed' && job.status !== 'failed';
}

/* ----------------------------------------------------------------------------
 * State
 * ------------------------------------------------------------------------- */

type Action =
  | { type: 'hydrate'; state: CloudState }
  | { type: 'connection'; provider: CloudProviderId; patch: Partial<Connection> }
  | { type: 'addJob'; job: ExportJob }
  | { type: 'job'; id: string; patch: Partial<ExportJob> }
  | { type: 'removeJob'; id: string }
  | { type: 'clearJobs' }
  | { type: 'upsertSchedule'; schedule: Schedule }
  | { type: 'removeSchedule'; id: string };

function initialState(): CloudState {
  return {
    connections: Object.fromEntries(CLOUD_PROVIDERS.map((p) => [p, emptyConnection(p)])) as CloudState['connections'],
    jobs: [],
    schedules: [],
  };
}

function reducer(state: CloudState, action: Action): CloudState {
  switch (action.type) {
    case 'hydrate':
      return action.state;
    case 'connection':
      return {
        ...state,
        connections: { ...state.connections, [action.provider]: { ...state.connections[action.provider], ...action.patch } },
      };
    case 'addJob':
      return { ...state, jobs: [action.job, ...state.jobs].slice(0, MAX_JOBS) };
    case 'job':
      return { ...state, jobs: state.jobs.map((j) => (j.id === action.id ? { ...j, ...action.patch } : j)) };
    case 'removeJob':
      return { ...state, jobs: state.jobs.filter((j) => j.id !== action.id) };
    case 'clearJobs':
      return { ...state, jobs: state.jobs.filter(isActive) };
    case 'upsertSchedule': {
      const exists = state.schedules.some((s) => s.id === action.schedule.id);
      return {
        ...state,
        schedules: exists
          ? state.schedules.map((s) => (s.id === action.schedule.id ? action.schedule : s))
          : [...state.schedules, action.schedule],
      };
    }
    case 'removeSchedule':
      return { ...state, schedules: state.schedules.filter((s) => s.id !== action.id) };
  }
}

function load(): CloudState {
  const base = initialState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return base;
    const saved = JSON.parse(raw) as Partial<CloudState>;
    const connections = { ...base.connections };
    for (const p of CLOUD_PROVIDERS) {
      const c = saved.connections?.[p];
      // A sync can't survive a page reload.
      if (c) connections[p] = { ...base.connections[p], ...c, status: c.status === 'syncing' ? 'connected' : c.status };
    }
    const jobs = (saved.jobs ?? []).map((j) =>
      isActive(j)
        ? { ...j, status: 'failed' as const, error: 'Interrupted — the page was closed before the job finished.', finishedAt: new Date().toISOString() }
        : j,
    );
    return { connections, jobs, schedules: saved.schedules ?? [] };
  } catch {
    return base;
  }
}

/* ----------------------------------------------------------------------------
 * Context
 * ------------------------------------------------------------------------- */

interface CloudContextValue extends CloudState {
  hydrated: boolean;
  activeJobs: ExportJob[];
  startExport: (req: ExportRequest) => string;
  retryJob: (id: string) => void;
  redownload: (id: string) => void;
  removeJob: (id: string) => void;
  clearHistory: () => void;
  connect: (provider: CloudProviderId, account: string) => void;
  disconnect: (provider: CloudProviderId) => void;
  setTarget: (provider: CloudProviderId, target: string) => void;
  saveSchedule: (schedule: Schedule) => void;
  removeSchedule: (id: string) => void;
  runScheduleNow: (id: string) => void;
}

const CloudContext = createContext<CloudContextValue | null>(null);

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function CloudProvider({ children }: { children: ReactNode }) {
  const { expenses } = useExpenses();
  const { showToast } = useToast();
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [hydrated, setHydrated] = useState(false);

  // Refs so long-running async jobs always see the latest data.
  const stateRef = useRef(state);
  stateRef.current = state;
  const expensesRef = useRef(expenses);
  expensesRef.current = expenses;
  const requests = useRef(new Map<string, ExportRequest>());

  useEffect(() => {
    dispatch({ type: 'hydrate', state: load() });
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage full or unavailable — history just won't persist */
    }
  }, [state, hydrated]);

  const patchJob = useCallback((id: string, patch: Partial<ExportJob>) => dispatch({ type: 'job', id, patch }), []);

  /** The simulated background pipeline. Generation and download/link are real; uploads are not. */
  const runJob = useCallback(
    async (id: string, req: ExportRequest) => {
      const template = TEMPLATES[req.templateId];
      const dest = DESTINATIONS[req.destination];
      const fail = (error: string) => {
        patchJob(id, { status: 'failed', error, finishedAt: new Date().toISOString() });
        showToast({ type: 'error', message: `${template.name} → ${dest.name} failed: ${error}` });
      };

      try {
        await sleep(350);
        patchJob(id, { status: 'preparing', progress: 8 });

        const dataset = template.build(expensesRef.current, req.period);
        const meta = { app: 'Spendwise', template: template.id, period: periodRange(req.period).label, generatedAt: new Date().toISOString() };
        const blob = serializeDataset(dataset, req.format, meta);
        const checksum = await sha256(blob);
        const stamp = new Date().toISOString().slice(0, 10);
        const fileName = `${slugify(dataset.title)}_${stamp}.${req.format}`;
        await sleep(450);
        patchJob(id, { progress: 30, fileName, bytes: blob.size, rowCount: recordCount(expensesRef.current, req.period), checksum });

        // Validate the destination at run time (a schedule may target an account that was disconnected since).
        if (isCloudProvider(req.destination) && stateRef.current.connections[req.destination].status === 'disconnected') {
          return fail(`${dest.name} is not connected`);
        }
        if (req.destination === 'email' && !req.email?.to.length) return fail('No recipients');

        if (req.destination === 'download') {
          patchJob(id, { status: 'delivering', progress: 90 });
          triggerDownload(blob, fileName);
          await sleep(300);
        } else if (req.destination === 'link') {
          patchJob(id, { status: 'delivering', progress: 60 });
          const shared = req.link?.redacted ? redactDataset(dataset) : dataset;
          const expiresAt = req.link?.expiresInDays ? new Date(Date.now() + req.link.expiresInDays * 86400000).toISOString() : null;
          const encoded = await encodeSharePayload({
            v: 1,
            title: shared.title,
            subtitle: shared.subtitle,
            columns: shared.columns,
            currencyColumns: shared.currencyColumns,
            rows: shared.rows,
            highlights: shared.highlights,
            createdAt: new Date().toISOString(),
            expiresAt,
            redacted: !!req.link?.redacted,
            note: req.link?.note || undefined,
          });
          await sleep(400);
          patchJob(id, { link: { url: buildShareUrl(window.location.origin, encoded), expiresAt, redacted: !!req.link?.redacted } });
        } else {
          // Simulated upload: progress proportional to size, with the provider shown as syncing.
          const provider = isCloudProvider(req.destination) ? req.destination : null;
          if (provider) dispatch({ type: 'connection', provider, patch: { status: 'syncing' } });
          patchJob(id, { status: 'uploading' });
          const steps = Math.min(20, 10 + Math.ceil(blob.size / 2048));
          for (let i = 1; i <= steps; i++) {
            await sleep(200 + Math.random() * 150);
            patchJob(id, { progress: 30 + Math.round((i / steps) * 55) });
          }
          patchJob(id, { status: 'delivering', progress: 92 });
          await sleep(500);
          if (provider) {
            const c = stateRef.current.connections[provider];
            dispatch({
              type: 'connection',
              provider,
              patch: { status: 'connected', lastSyncAt: new Date().toISOString(), bytesStored: c.bytesStored + blob.size, filesStored: c.filesStored + 1 },
            });
          }
        }

        patchJob(id, { status: 'completed', progress: 100, finishedAt: new Date().toISOString() });
        const where =
          req.destination === 'email'
            ? `emailed to ${req.email!.to.length} recipient${req.email!.to.length === 1 ? '' : 's'}`
            : req.destination === 'link'
              ? 'share link ready'
              : req.destination === 'download'
                ? 'downloaded'
                : `saved to ${dest.name}`;
        showToast({ message: `${template.name} ${where}${req.trigger === 'schedule' ? ' (scheduled)' : ''}.` });
      } catch (err) {
        console.error(err);
        fail(err instanceof Error ? err.message : 'Unexpected error');
      }
    },
    [patchJob, showToast],
  );

  const startExport = useCallback(
    (req: ExportRequest) => {
      const id = generateId();
      const dest = DESTINATIONS[req.destination];
      const target =
        req.destination === 'email'
          ? req.email?.to.join(', ')
          : isCloudProvider(req.destination)
            ? req.target || stateRef.current.connections[req.destination].target
            : dest.defaultTarget;
      requests.current.set(id, req);
      dispatch({
        type: 'addJob',
        job: {
          id,
          templateId: req.templateId,
          period: req.period,
          format: req.format,
          destination: req.destination,
          status: 'queued',
          progress: 2,
          trigger: req.trigger ?? 'manual',
          scheduleId: req.scheduleId,
          createdAt: new Date().toISOString(),
          target,
          email: req.email,
        },
      });
      void runJob(id, req);
      return id;
    },
    [runJob],
  );

  const requestFromJob = (job: ExportJob): ExportRequest =>
    requests.current.get(job.id) ?? {
      templateId: job.templateId,
      period: job.period,
      format: job.format,
      destination: job.destination,
      target: job.target,
      email: job.email,
      link: job.link ? { expiresInDays: 7, redacted: job.link.redacted } : undefined,
      trigger: job.trigger,
      scheduleId: job.scheduleId,
    };

  const retryJob = useCallback(
    (id: string) => {
      const job = stateRef.current.jobs.find((j) => j.id === id);
      if (job) startExport({ ...requestFromJob(job), trigger: 'manual' });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [startExport],
  );

  const redownload = useCallback((id: string) => {
    const job = stateRef.current.jobs.find((j) => j.id === id);
    if (!job) return;
    const dataset = TEMPLATES[job.templateId].build(expensesRef.current, job.period);
    triggerDownload(serializeDataset(dataset, job.format, { app: 'Spendwise', regeneratedAt: new Date().toISOString() }), job.fileName ?? `export.${job.format}`);
  }, []);

  /* ---- schedules -------------------------------------------------------- */

  const runSchedule = useCallback(
    (s: Schedule) => {
      dispatch({ type: 'upsertSchedule', schedule: { ...s, lastRunAt: new Date().toISOString() } });
      startExport({
        templateId: s.templateId,
        period: periodForFrequency(s),
        format: s.format,
        destination: s.destination,
        email:
          s.destination === 'email'
            ? { to: s.recipients, subject: `${TEMPLATES[s.templateId].name} — scheduled export`, message: `Your scheduled ${s.name} export is attached.` }
            : undefined,
        trigger: 'schedule',
        scheduleId: s.id,
      });
    },
    [startExport],
  );

  // Scheduler: checks on load (catching up on missed runs once) and every 30s while the app is open.
  useEffect(() => {
    if (!hydrated) return;
    const tick = () => {
      for (const s of stateRef.current.schedules) if (isDue(s)) runSchedule(s);
    };
    const first = setTimeout(tick, 1500);
    const interval = setInterval(tick, 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [hydrated, runSchedule]);

  const value = useMemo<CloudContextValue>(
    () => ({
      ...state,
      hydrated,
      activeJobs: state.jobs.filter(isActive),
      startExport,
      retryJob,
      redownload,
      removeJob: (id) => dispatch({ type: 'removeJob', id }),
      clearHistory: () => dispatch({ type: 'clearJobs' }),
      connect: (provider, account) =>
        dispatch({
          type: 'connection',
          provider,
          patch: { status: 'connected', account, connectedAt: new Date().toISOString(), lastSyncAt: null },
        }),
      disconnect: (provider) => dispatch({ type: 'connection', provider, patch: { ...emptyConnection(provider) } }),
      setTarget: (provider, target) => dispatch({ type: 'connection', provider, patch: { target } }),
      saveSchedule: (schedule) => dispatch({ type: 'upsertSchedule', schedule }),
      removeSchedule: (id) => dispatch({ type: 'removeSchedule', id }),
      runScheduleNow: (id) => {
        const s = stateRef.current.schedules.find((x) => x.id === id);
        if (s) runSchedule(s);
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, startExport, retryJob, redownload, runSchedule, hydrated],
  );

  return <CloudContext.Provider value={value}>{children}</CloudContext.Provider>;
}

export function useCloud(): CloudContextValue {
  const ctx = useContext(CloudContext);
  if (!ctx) throw new Error('useCloud must be used within CloudProvider');
  return ctx;
}
