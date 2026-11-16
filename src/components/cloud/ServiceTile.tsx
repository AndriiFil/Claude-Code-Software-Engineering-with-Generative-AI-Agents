import type { ConnectionStatus, DestinationId } from '@/lib/cloud/types';
import { DESTINATIONS } from '@/lib/cloud/providers';

/** Brand-neutral monogram tile for a destination (no third-party logos). */
export function ServiceTile({ id, size = 'md' }: { id: DestinationId; size?: 'sm' | 'md' | 'lg' }) {
  const meta = DESTINATIONS[id];
  const box = size === 'sm' ? 'h-7 w-7 text-[11px] rounded-lg' : size === 'lg' ? 'h-12 w-12 text-base rounded-2xl' : 'h-9 w-9 text-xs rounded-xl';
  return (
    <span className={`flex shrink-0 items-center justify-center font-bold shadow-sm ${box} ${meta.tile}`} aria-hidden>
      {meta.mark}
    </span>
  );
}

const DOT: Record<ConnectionStatus, string> = {
  connected: 'bg-emerald-500',
  syncing: 'bg-sky-500 animate-pulse',
  error: 'bg-rose-500',
  disconnected: 'bg-slate-300',
};

const LABEL: Record<ConnectionStatus, string> = {
  connected: 'Connected',
  syncing: 'Syncing…',
  error: 'Needs attention',
  disconnected: 'Not connected',
};

export function StatusDot({ status, withLabel }: { status: ConnectionStatus; withLabel?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
      <span className={`h-2 w-2 rounded-full ${DOT[status]}`} aria-hidden />
      {withLabel ? LABEL[status] : <span className="sr-only">{LABEL[status]}</span>}
    </span>
  );
}
