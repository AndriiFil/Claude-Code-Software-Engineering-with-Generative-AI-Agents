'use client';

import { useState } from 'react';
import { Check, Copy, ExternalLink, EyeOff, QrCode, Share2, Timer } from 'lucide-react';
import type { LinkDetails } from '@/lib/cloud/types';
import { QR_MAX_URL_LENGTH } from '@/lib/cloud/shareLink';
import { formatBytes } from '@/lib/cloud/serialize';
import { QRCode } from './QRCode';

export function ShareResult({ link, title }: { link: LinkDetails; title: string }) {
  const [copied, setCopied] = useState(false);
  const qrOk = link.url.length <= QR_MAX_URL_LENGTH;
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — the field is selectable as a fallback */
    }
  };

  return (
    <div className="grid gap-5 sm:grid-cols-[1fr_auto]">
      <div className="min-w-0 space-y-3">
        <div className="flex rounded-lg border border-slate-300 bg-slate-50 shadow-sm">
          <input
            readOnly
            value={link.url}
            onFocus={(e) => e.currentTarget.select()}
            className="min-w-0 flex-1 truncate rounded-l-lg bg-transparent px-3 py-2 font-mono text-xs text-slate-700 outline-none"
            aria-label="Share link"
          />
          <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 border-l border-slate-300 px-3 text-sm font-semibold text-indigo-600 hover:bg-indigo-50">
            {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={link.url} target="_blank" rel="noopener noreferrer" className="btn-secondary px-3 py-1.5 text-xs">
            <ExternalLink className="h-3.5 w-3.5" aria-hidden /> Open preview
          </a>
          {canNativeShare && (
            <button
              type="button"
              className="btn-secondary px-3 py-1.5 text-xs"
              onClick={() => navigator.share({ title, url: link.url }).catch(() => undefined)}
            >
              <Share2 className="h-3.5 w-3.5" aria-hidden /> Share…
            </button>
          )}
        </div>
        <ul className="space-y-1.5 text-xs text-slate-600">
          <li className="flex items-center gap-1.5">
            <Timer className="h-3.5 w-3.5 text-slate-400" aria-hidden />
            {link.expiresAt ? `Expires ${new Date(link.expiresAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}` : 'Never expires'}
          </li>
          {link.redacted && (
            <li className="flex items-center gap-1.5">
              <EyeOff className="h-3.5 w-3.5 text-slate-400" aria-hidden /> Descriptions hidden
            </li>
          )}
          <li className="text-slate-500">
            The data lives inside the link itself ({formatBytes(link.url.length)}), after the <code>#</code>, which browsers never send to a
            server. Anyone with the link can view it, and it can&apos;t be revoked, only expire.
          </li>
        </ul>
      </div>
      <div className="flex flex-col items-center gap-1.5">
        {qrOk ? (
          <>
            <div className="rounded-2xl border border-slate-200 p-1.5 shadow-sm">
              <QRCode value={link.url} size={168} label={`QR code for ${title}`} />
            </div>
            <p className="flex items-center gap-1 text-[11px] text-slate-500">
              <QrCode className="h-3 w-3" aria-hidden /> Scan to open on a phone
            </p>
          </>
        ) : (
          <div className="flex h-[180px] w-[180px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500">
            <QrCode className="mb-2 h-6 w-6 text-slate-300" aria-hidden />
            Too much data for a scannable QR code. Try a summary template or a shorter period.
          </div>
        )}
      </div>
    </div>
  );
}
