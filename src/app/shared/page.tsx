'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Download, EyeOff, LinkIcon, LoaderCircle, Lock, MessageSquareQuote, TimerOff } from 'lucide-react';
import { decodeSharePayload, type SharePayload } from '@/lib/cloud/shareLink';
import { datasetToCSV, slugify, triggerDownload } from '@/lib/cloud/serialize';
import { DatasetTable } from '@/components/cloud/DatasetTable';

type State = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'expired'; payload: SharePayload } | { kind: 'ok'; payload: SharePayload };

/** Read-only viewer for self-contained share links (/shared#z.<data>). */
export default function SharedSnapshotPage() {
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    const load = async () => {
      const hash = window.location.hash;
      if (hash.length < 3) return setState({ kind: 'error', message: 'This link is missing its data.' });
      try {
        const payload = await decodeSharePayload(hash);
        if (payload.expiresAt && new Date(payload.expiresAt) < new Date()) setState({ kind: 'expired', payload });
        else setState({ kind: 'ok', payload });
      } catch (err) {
        setState({ kind: 'error', message: err instanceof Error ? err.message : 'This link could not be read.' });
      }
    };
    void load();
    window.addEventListener('hashchange', load);
    return () => window.removeEventListener('hashchange', load);
  }, []);

  if (state.kind === 'loading') {
    return (
      <div className="flex justify-center py-24" role="status">
        <LoaderCircle className="h-6 w-6 animate-spin text-indigo-600" aria-label="Opening snapshot" />
      </div>
    );
  }

  if (state.kind !== 'ok') {
    const expired = state.kind === 'expired';
    return (
      <div className="card mx-auto mt-10 flex max-w-md flex-col items-center px-6 py-12 text-center">
        {expired ? <TimerOff className="h-10 w-10 text-slate-300" aria-hidden /> : <LinkIcon className="h-10 w-10 text-slate-300" aria-hidden />}
        <h1 className="mt-4 text-lg font-semibold text-slate-900">{expired ? 'This link has expired' : "This link doesn't work"}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {expired
            ? `It stopped working on ${new Date(state.payload.expiresAt!).toLocaleDateString('en-US', { dateStyle: 'medium' })}. Ask the sender for a new one.`
            : state.message}
        </p>
        <Link href="/" className="btn-secondary mt-6">
          Go to Spendwise
        </Link>
      </div>
    );
  }

  const p = state.payload;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-2.5 text-sm text-indigo-800">
        <Lock className="h-4 w-4" aria-hidden />
        <span className="font-medium">Read-only snapshot</span>
        <span className="text-indigo-600/80">
          · shared {new Date(p.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
          {p.expiresAt && ` · expires ${new Date(p.expiresAt).toLocaleDateString('en-US', { dateStyle: 'medium' })}`}
        </span>
        {p.redacted && (
          <span className="ml-auto inline-flex items-center gap-1 text-xs text-indigo-600">
            <EyeOff className="h-3.5 w-3.5" aria-hidden /> Descriptions hidden by sender
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{p.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{p.subtitle}</p>
        </div>
        <button
          type="button"
          className="btn-secondary"
          onClick={() =>
            triggerDownload(
              new Blob(['﻿', datasetToCSV({ ...p, rows: p.rows })], { type: 'text/csv;charset=utf-8' }),
              `${slugify(p.title)}.csv`,
            )
          }
        >
          <Download className="h-4 w-4" aria-hidden /> Download CSV
        </button>
      </div>

      {p.note && (
        <blockquote className="flex gap-3 rounded-xl border-l-4 border-fuchsia-400 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
          <MessageSquareQuote className="h-5 w-5 shrink-0 text-fuchsia-400" aria-hidden />
          {p.note}
        </blockquote>
      )}

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {p.highlights.map((h) => (
          <div key={h.label} className="card px-4 py-3">
            <dt className="text-xs font-medium text-slate-500">{h.label}</dt>
            <dd className="mt-0.5 truncate text-xl font-semibold tabular-nums text-slate-900">{h.value}</dd>
          </div>
        ))}
      </dl>

      <DatasetTable columns={p.columns} rows={p.rows} currencyColumns={p.currencyColumns} className="card max-h-[70vh]" />

      <p className="text-center text-xs text-slate-400">
        This snapshot is stored entirely inside the link. Nothing was uploaded to a server.
      </p>
    </div>
  );
}
