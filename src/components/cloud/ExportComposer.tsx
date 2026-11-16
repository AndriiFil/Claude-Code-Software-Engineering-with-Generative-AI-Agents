'use client';

import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { ArrowLeft, ArrowRight, Check, ClipboardCopy, FileJson, FileSpreadsheet, LoaderCircle, Mail, Paperclip, Rocket, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useExpenses } from '@/context/ExpenseContext';
import { useCloud, STATUS_LABEL, isActive } from '@/context/CloudContext';
import { PERIODS, TEMPLATES, TEMPLATE_ORDER, periodRange } from '@/lib/cloud/templates';
import { DESTINATIONS, DESTINATION_ORDER, isCloudProvider } from '@/lib/cloud/providers';
import { datasetToTSV, slugify } from '@/lib/cloud/serialize';
import type { CloudProviderId, DestinationId, FileFormat, PeriodId, TemplateId } from '@/lib/cloud/types';
import { DatasetTable } from './DatasetTable';
import { ServiceTile, StatusDot } from './ServiceTile';
import { ConnectDialog } from './ConnectDialog';
import { ShareResult } from './ShareResult';

type Step = 'what' | 'where' | 'configure' | 'running';
const STEPS: { id: Step; label: string }[] = [
  { id: 'what', label: 'Template' },
  { id: 'where', label: 'Destination' },
  { id: 'configure', label: 'Details' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Props {
  open: boolean;
  onClose: () => void;
  initialTemplate?: TemplateId;
  initialDestination?: DestinationId;
}

export function ExportComposer(props: Props) {
  if (!props.open) return null;
  return <Composer {...props} />;
}

function Composer({ onClose, initialTemplate = 'monthly-summary', initialDestination }: Props) {
  const { expenses } = useExpenses();
  const cloud = useCloud();

  const [step, setStep] = useState<Step>(initialDestination ? 'configure' : 'what');
  const [templateId, setTemplateId] = useState<TemplateId>(initialTemplate);
  const [period, setPeriod] = useState<PeriodId>(TEMPLATES[initialTemplate].defaultPeriod);
  const [format, setFormat] = useState<FileFormat>(TEMPLATES[initialTemplate].defaultFormat);
  const [destination, setDestination] = useState<DestinationId>(initialDestination ?? 'download');
  const [connecting, setConnecting] = useState<CloudProviderId | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  // Destination-specific settings
  const [recipients, setRecipients] = useState<string[]>([]);
  const [recipientDraft, setRecipientDraft] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('Hi,\n\nHere is the latest expense export from Spendwise.\n');
  const [expiresInDays, setExpiresInDays] = useState<number | null>(7);
  const [redacted, setRedacted] = useState(false);
  const [note, setNote] = useState('');
  const [target, setTarget] = useState('');
  const [tsvCopied, setTsvCopied] = useState(false);

  const template = TEMPLATES[templateId];
  const dataset = useMemo(() => template.build(expenses, period), [template, expenses, period]);
  const fileName = `${slugify(dataset.title)}_${new Date().toISOString().slice(0, 10)}.${format}`;
  const dest = DESTINATIONS[destination];
  const connection = isCloudProvider(destination) ? cloud.connections[destination] : null;
  const job = cloud.jobs.find((j) => j.id === jobId) ?? null;

  useEffect(() => setSubject(`${dataset.title}`), [dataset.title]);
  useEffect(() => {
    if (connection) setTarget(destination === 'google-sheets' ? dataset.title : connection.target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination, connection?.target]);

  const pickTemplate = (id: TemplateId) => {
    setTemplateId(id);
    setPeriod(TEMPLATES[id].defaultPeriod);
    setFormat(TEMPLATES[id].defaultFormat);
  };

  const addRecipient = () => {
    const parts = recipientDraft.split(/[\s,;]+/).filter(Boolean);
    const valid = parts.filter((p) => EMAIL_RE.test(p) && !recipients.includes(p));
    if (valid.length) setRecipients([...recipients, ...valid]);
    setRecipientDraft(parts.filter((p) => !EMAIL_RE.test(p)).join(' '));
  };
  const onRecipientKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (['Enter', ',', ';', ' ', 'Tab'].includes(e.key) && recipientDraft.trim()) {
      if (e.key !== 'Tab') e.preventDefault();
      addRecipient();
    } else if (e.key === 'Backspace' && !recipientDraft && recipients.length) {
      setRecipients(recipients.slice(0, -1));
    }
  };

  const blocker =
    dataset.rows.length === 0
      ? 'No expenses in this period'
      : destination === 'email' && recipients.length === 0
        ? 'Add at least one recipient'
        : connection && connection.status === 'disconnected'
          ? `Connect ${dest.name} first`
          : null;

  const start = () => {
    const id = cloud.startExport({
      templateId,
      period,
      format: destination === 'google-sheets' ? 'csv' : format,
      destination,
      target: connection ? target : undefined,
      email: destination === 'email' ? { to: recipients, subject, message } : undefined,
      link: destination === 'link' ? { expiresInDays, redacted, note } : undefined,
    });
    // Link exports finish here so the user can grab the link/QR; everything else runs in the background tray.
    if (destination === 'link') {
      setJobId(id);
      setStep('running');
    } else onClose();
  };

  const mailto = `mailto:${recipients.join(',')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
    `${message}\n${dataset.highlights.map((h) => `${h.label}: ${h.value}`).join('\n')}\n\n(Attach ${fileName} before sending.)`,
  )}`;

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <>
    <Modal open onClose={() => !connecting && onClose()} title="New export" description="Pick a template, choose where it goes, and we'll handle the rest in the background." size="lg">
      {/* Stepper */}
      {step !== 'running' && (
        <ol className="mb-5 flex items-center gap-2 text-xs font-medium">
          {STEPS.map((s, i) => (
            <li key={s.id} className="flex items-center gap-2">
              <button
                type="button"
                disabled={i > stepIndex}
                onClick={() => setStep(s.id)}
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 transition ${
                  i === stepIndex ? 'bg-indigo-600 text-white' : i < stepIndex ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100' : 'bg-slate-100 text-slate-400'
                }`}
                aria-current={i === stepIndex ? 'step' : undefined}
              >
                {i < stepIndex ? <Check className="h-3 w-3" strokeWidth={3} aria-hidden /> : <span>{i + 1}</span>}
                {s.label}
              </button>
              {i < STEPS.length - 1 && <span className="h-px w-6 bg-slate-200" aria-hidden />}
            </li>
          ))}
        </ol>
      )}

      {step === 'what' && (
        <div className="space-y-5">
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Template">
            {TEMPLATE_ORDER.map((id) => {
              const t = TEMPLATES[id];
              const on = id === templateId;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => pickTemplate(id)}
                  className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${on ? 'border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-500' : 'border-slate-200 hover:border-slate-300'}`}
                >
                  <span className={`h-9 w-9 shrink-0 rounded-lg bg-gradient-to-br ${t.gradient}`} aria-hidden />
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">{t.name}</span>
                    <span className="block text-xs text-slate-500">{t.tagline}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="composer-period" className="label">
                Period
              </label>
              <select id="composer-period" className="input" value={period} onChange={(e) => setPeriod(e.target.value as PeriodId)}>
                {PERIODS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className="label">Format</span>
              <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1" role="radiogroup" aria-label="Format">
                {(['csv', 'json'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    role="radio"
                    aria-checked={format === f}
                    onClick={() => setFormat(f)}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium ${format === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                  >
                    {f === 'csv' ? <FileSpreadsheet className="h-4 w-4" aria-hidden /> : <FileJson className="h-4 w-4" aria-hidden />}
                    {f.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <div className="mb-2 flex flex-wrap gap-x-5 gap-y-1">
              {dataset.highlights.map((h) => (
                <p key={h.label} className="text-xs text-slate-500">
                  {h.label} <span className="ml-1 font-semibold text-slate-900">{h.value}</span>
                </p>
              ))}
            </div>
            <DatasetTable columns={dataset.columns} rows={dataset.rows} currencyColumns={dataset.currencyColumns} limit={4} className="bg-white" />
          </div>
        </div>
      )}

      {step === 'where' && (
        <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Destination">
          {DESTINATION_ORDER.map((id) => {
            const m = DESTINATIONS[id];
            const conn = isCloudProvider(id) ? cloud.connections[id] : null;
            const on = id === destination;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setDestination(id)}
                className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${on ? 'border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-500' : 'border-slate-200 hover:border-slate-300'}`}
              >
                <ServiceTile id={id} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    {m.name}
                    {conn && <StatusDot status={conn.status} />}
                  </span>
                  <span className="block truncate text-xs text-slate-500">{conn?.account ?? m.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {step === 'configure' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <ServiceTile id={destination} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">
                {template.name} → {dest.name}
              </p>
              <p className="truncate font-mono text-xs text-slate-500">{destination === 'google-sheets' ? target || dataset.title : fileName}</p>
            </div>
            <span className="text-xs text-slate-500">{periodRange(period).label}</span>
          </div>

          {destination === 'download' && <p className="text-sm text-slate-600">The file is generated in your browser and saved to this device. Nothing is uploaded.</p>}

          {destination === 'email' && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3">
                <div>
                  <label htmlFor="composer-to" className="label">
                    To
                  </label>
                  <div className="input flex min-h-[40px] flex-wrap items-center gap-1.5 py-1.5">
                    {recipients.map((r) => (
                      <span key={r} className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                        {r}
                        <button type="button" onClick={() => setRecipients(recipients.filter((x) => x !== r))} aria-label={`Remove ${r}`}>
                          <X className="h-3 w-3" aria-hidden />
                        </button>
                      </span>
                    ))}
                    <input
                      id="composer-to"
                      className="min-w-[120px] flex-1 bg-transparent text-sm outline-none"
                      placeholder={recipients.length ? '' : 'accountant@example.com'}
                      value={recipientDraft}
                      onChange={(e) => setRecipientDraft(e.target.value)}
                      onKeyDown={onRecipientKey}
                      onBlur={() => recipientDraft && addRecipient()}
                      data-autofocus
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="composer-subject" className="label">
                    Subject
                  </label>
                  <input id="composer-subject" className="input" value={subject} onChange={(e) => setSubject(e.target.value)} />
                </div>
                <div>
                  <label htmlFor="composer-message" className="label">
                    Message
                  </label>
                  <textarea id="composer-message" rows={4} className="input resize-none" value={message} onChange={(e) => setMessage(e.target.value)} />
                </div>
              </div>
              {/* Live inbox preview */}
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Preview</p>
                  <p className="mt-1 truncate text-sm font-semibold text-slate-900">{subject || '(no subject)'}</p>
                  <p className="truncate text-xs text-slate-500">Spendwise &lt;exports@spendwise.example&gt; → {recipients.join(', ') || '…'}</p>
                </div>
                <div className="space-y-3 px-4 py-3 text-sm text-slate-700">
                  <p className="whitespace-pre-line">{message}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {dataset.highlights.map((h) => (
                      <div key={h.label} className="rounded-lg bg-slate-50 px-2 py-1.5">
                        <p className="text-[10px] uppercase tracking-wide text-slate-500">{h.label}</p>
                        <p className="truncate text-xs font-semibold text-slate-900">{h.value}</p>
                      </div>
                    ))}
                  </div>
                  <p className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1 font-mono text-xs text-slate-600">
                    <Paperclip className="h-3 w-3" aria-hidden /> {fileName}
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-500 lg:col-span-2">
                Demo mode: sending is simulated.{' '}
                <a href={mailto} className="inline-flex items-center gap-1 font-medium text-indigo-600 hover:underline">
                  <Mail className="h-3 w-3" aria-hidden /> Open in your mail app instead
                </a>{' '}
                (you&apos;ll need to attach the file yourself).
              </p>
            </div>
          )}

          {destination === 'link' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="composer-expiry" className="label">
                  Link expires
                </label>
                <select
                  id="composer-expiry"
                  className="input"
                  value={expiresInDays ?? 'never'}
                  onChange={(e) => setExpiresInDays(e.target.value === 'never' ? null : Number(e.target.value))}
                >
                  <option value={1}>In 24 hours</option>
                  <option value={7}>In 7 days</option>
                  <option value={30}>In 30 days</option>
                  <option value="never">Never</option>
                </select>
              </div>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3">
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-indigo-600" checked={redacted} onChange={(e) => setRedacted(e.target.checked)} />
                <span>
                  <span className="block text-sm font-medium text-slate-900">Hide descriptions</span>
                  <span className="block text-xs text-slate-500">Share amounts and categories without personal details</span>
                </span>
              </label>
              <div className="sm:col-span-2">
                <label htmlFor="composer-note" className="label">
                  Note for viewers <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <input id="composer-note" className="input" maxLength={140} placeholder="e.g. Q3 numbers for our budget chat" value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
            </div>
          )}

          {connection && (
            <div className="space-y-3">
              {connection.status === 'disconnected' ? (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="text-sm text-amber-800">{dest.name} isn&apos;t connected yet.</p>
                  <button type="button" className="btn-primary px-3 py-1.5" onClick={() => setConnecting(destination as CloudProviderId)}>
                    Connect {dest.short}
                  </button>
                </div>
              ) : (
                <p className="flex items-center gap-2 text-sm text-slate-600">
                  <StatusDot status={connection.status} /> Signed in as <span className="font-medium text-slate-900">{connection.account}</span>
                </p>
              )}
              <div>
                <label htmlFor="composer-target" className="label">
                  {destination === 'google-sheets' ? 'Spreadsheet name' : 'Folder'}
                </label>
                <input id="composer-target" className="input font-mono text-xs" value={target} onChange={(e) => setTarget(e.target.value)} />
              </div>
              {destination === 'google-sheets' && (
                <>
                  <DatasetTable sheet columns={dataset.columns} rows={dataset.rows} currencyColumns={dataset.currencyColumns} limit={6} className="max-h-56" />
                  <button
                    type="button"
                    className="btn-secondary px-3 py-1.5 text-xs"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(datasetToTSV(dataset));
                        setTsvCopied(true);
                        setTimeout(() => setTsvCopied(false), 1800);
                      } catch {
                        /* clipboard blocked */
                      }
                    }}
                  >
                    {tsvCopied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <ClipboardCopy className="h-3.5 w-3.5" aria-hidden />}
                    {tsvCopied ? 'Copied — paste into any sheet' : 'Copy as table (works today: paste into Sheets or Excel)'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {step === 'running' && job && (
        <div className="space-y-4">
          {isActive(job) ? (
            <div className="flex flex-col items-center py-10 text-center" role="status">
              <LoaderCircle className="h-7 w-7 animate-spin text-indigo-600" aria-hidden />
              <p className="mt-3 text-sm font-medium text-slate-900">{STATUS_LABEL[job.status]}…</p>
              <div className="mt-3 h-1.5 w-56 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-indigo-600 transition-all duration-300" style={{ width: `${job.progress}%` }} />
              </div>
            </div>
          ) : job.status === 'completed' && job.link ? (
            <>
              <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                <Check className="h-4 w-4" strokeWidth={3} aria-hidden /> Your link is ready
              </p>
              <ShareResult link={job.link} title={dataset.title} />
            </>
          ) : (
            <p className="text-sm text-rose-600" role="alert">
              {job.error ?? 'Something went wrong.'}
            </p>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
        {step === 'running' ? (
          <span />
        ) : step !== 'what' ? (
          <button type="button" className="btn-secondary" onClick={() => setStep(step === 'configure' ? 'where' : 'what')}>
            <ArrowLeft className="h-4 w-4" aria-hidden /> Back
          </button>
        ) : (
          <p className="text-xs text-slate-500">{dataset.rows.length} rows in this template</p>
        )}
        {step === 'running' ? (
          <button type="button" className="btn-primary" onClick={onClose} disabled={!!job && isActive(job)}>
            Done
          </button>
        ) : step === 'configure' ? (
          <div className="flex items-center gap-3">
            {blocker && <span className="hidden text-xs text-amber-700 sm:inline">{blocker}</span>}
            <button type="button" className="btn-primary" onClick={start} disabled={!!blocker}>
              <Rocket className="h-4 w-4" aria-hidden />
              {destination === 'email' ? 'Send' : destination === 'link' ? 'Create link' : destination === 'download' ? 'Export' : `Export to ${dest.short}`}
            </button>
          </div>
        ) : (
          <button type="button" className="btn-primary" onClick={() => setStep(step === 'what' ? 'where' : 'configure')} disabled={step === 'what' && dataset.rows.length === 0}>
            Continue <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>

    </Modal>
    <ConnectDialog provider={connecting} onClose={() => setConnecting(null)} />
    </>
  );
}
