'use client';

import { useEffect, useState } from 'react';
import { ArrowLeftRight, Check, LoaderCircle, Lock, ShieldCheck } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useCloud } from '@/context/CloudContext';
import { DESTINATIONS } from '@/lib/cloud/providers';
import type { CloudProviderId } from '@/lib/cloud/types';
import { ServiceTile } from './ServiceTile';

type Step = 'redirect' | 'consent' | 'connecting' | 'done';

/**
 * Simulated OAuth flow: redirect → consent screen → token exchange → connected.
 * No real account is contacted; the "account" is whatever label the user types.
 */
export function ConnectDialog({ provider, onClose, onConnected }: { provider: CloudProviderId | null; onClose: () => void; onConnected?: () => void }) {
  const { connect } = useCloud();
  const [step, setStep] = useState<Step>('redirect');
  const [account, setAccount] = useState('demo@example.com');

  useEffect(() => {
    if (!provider) return;
    setStep('redirect');
    const t = setTimeout(() => setStep('consent'), 900);
    return () => clearTimeout(t);
  }, [provider]);

  if (!provider) return null;
  const meta = DESTINATIONS[provider];

  const allow = async () => {
    setStep('connecting');
    await new Promise((r) => setTimeout(r, 1100));
    connect(provider, account.trim() || 'demo@example.com');
    setStep('done');
    await new Promise((r) => setTimeout(r, 700));
    onConnected?.();
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={`Connect ${meta.name}`} size="sm">
      <div className="flex items-center justify-center gap-3 py-2">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-lg font-bold text-white shadow-sm" aria-hidden>
          S
        </span>
        <ArrowLeftRight className="h-5 w-5 text-slate-300" aria-hidden />
        <ServiceTile id={provider} size="lg" />
      </div>

      {step === 'redirect' && (
        <div className="flex flex-col items-center py-8 text-center" role="status">
          <LoaderCircle className="h-6 w-6 animate-spin text-indigo-600" aria-hidden />
          <p className="mt-3 text-sm font-medium text-slate-900">Opening secure sign-in…</p>
          <p className="mt-1 flex items-center gap-1 font-mono text-xs text-slate-400">
            <Lock className="h-3 w-3" aria-hidden /> auth.{provider.replace('google-', 'google.')}.example/oauth
          </p>
        </div>
      )}

      {step === 'consent' && (
        <div className="mt-2 space-y-4">
          <p className="text-center text-sm text-slate-600">
            <span className="font-semibold text-slate-900">Spendwise</span> wants to access your {meta.name} account
          </p>
          <div>
            <label htmlFor="connect-account" className="label">
              Account
            </label>
            <input id="connect-account" className="input" value={account} onChange={(e) => setAccount(e.target.value)} data-autofocus />
          </div>
          <ul className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
            {meta.scopes.map((s) => (
              <li key={s} className="flex items-start gap-2 text-sm text-slate-700">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                {s}
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-500">
            Demo mode: this is a simulated sign-in. No real {meta.name} account is contacted and nothing is uploaded.
          </p>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn-primary" onClick={allow}>
              Allow access
            </button>
          </div>
        </div>
      )}

      {(step === 'connecting' || step === 'done') && (
        <div className="flex flex-col items-center py-8 text-center" role="status">
          {step === 'connecting' ? (
            <LoaderCircle className="h-6 w-6 animate-spin text-indigo-600" aria-hidden />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <Check className="h-5 w-5" strokeWidth={3} aria-hidden />
            </span>
          )}
          <p className="mt-3 text-sm font-medium text-slate-900">
            {step === 'connecting' ? 'Exchanging tokens…' : `${meta.name} connected`}
          </p>
        </div>
      )}
    </Modal>
  );
}
