'use client';

import { useState } from 'react';
import { FolderOpen, Unplug } from 'lucide-react';
import { useCloud } from '@/context/CloudContext';
import { CLOUD_PROVIDERS, DESTINATIONS } from '@/lib/cloud/providers';
import { formatBytes } from '@/lib/cloud/serialize';
import { relativeTime } from '@/lib/cloud/schedule';
import type { CloudProviderId } from '@/lib/cloud/types';
import { ServiceTile, StatusDot } from './ServiceTile';
import { ConnectDialog } from './ConnectDialog';

export function IntegrationsPanel() {
  const { connections, disconnect, setTarget } = useCloud();
  const [connecting, setConnecting] = useState<CloudProviderId | null>(null);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        {CLOUD_PROVIDERS.map((p) => {
          const c = connections[p];
          const meta = DESTINATIONS[p];
          const on = c.status !== 'disconnected';
          const pct = meta.quota ? Math.max(c.bytesStored ? 0.5 : 0, (c.bytesStored / meta.quota) * 100) : 0;
          return (
            <div key={p} className="card flex flex-col p-4">
              <div className="flex items-start gap-3">
                <ServiceTile id={p} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold text-slate-900">{meta.name}</p>
                  <p className="text-xs text-slate-500">{meta.description}</p>
                  <div className="mt-1.5">
                    <StatusDot status={c.status} withLabel />
                  </div>
                </div>
              </div>

              {on ? (
                <div className="mt-4 flex-1 space-y-3">
                  <dl className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <dt className="text-slate-500">Account</dt>
                      <dd className="truncate font-medium text-slate-900">{c.account}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Last sync</dt>
                      <dd className="font-medium text-slate-900">{c.lastSyncAt ? relativeTime(c.lastSyncAt) : 'Never'}</dd>
                    </div>
                  </dl>
                  <div>
                    <label htmlFor={`target-${p}`} className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-600">
                      <FolderOpen className="h-3.5 w-3.5" aria-hidden /> {p === 'google-sheets' ? 'Default spreadsheet' : 'Default folder'}
                    </label>
                    <input id={`target-${p}`} className="input py-1.5 font-mono text-xs" value={c.target} onChange={(e) => setTarget(p, e.target.value)} />
                  </div>
                  {meta.quota && (
                    <div>
                      <div className="mb-1 flex justify-between text-[11px] text-slate-500">
                        <span>
                          {c.filesStored} file{c.filesStored === 1 ? '' : 's'} · {formatBytes(c.bytesStored)}
                        </span>
                        <span>{formatBytes(meta.quota)} plan</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min(100, pct)}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <ul className="mt-4 flex-1 space-y-1 text-xs text-slate-500">
                  {meta.scopes.map((s) => (
                    <li key={s}>• {s}</li>
                  ))}
                </ul>
              )}

              <div className="mt-4 border-t border-slate-100 pt-3">
                {on ? (
                  <button type="button" className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-rose-600" onClick={() => disconnect(p)} disabled={c.status === 'syncing'}>
                    <Unplug className="h-3.5 w-3.5" aria-hidden /> Disconnect
                  </button>
                ) : (
                  <button type="button" className="btn-primary w-full" onClick={() => setConnecting(p)}>
                    Connect {meta.short}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-slate-500">
        Demo mode: connections are simulated and stored only in this browser. Storage figures reflect files Spendwise would have uploaded.
      </p>
      <ConnectDialog provider={connecting} onClose={() => setConnecting(null)} />
    </div>
  );
}
