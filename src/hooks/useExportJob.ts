'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Expense } from '@/lib/types';
import { downloadBlob, generateExport, type ExportFormatId, type ExportQuery, type ExportResult } from '@/lib/export';

export type ExportPhase = 'idle' | 'preparing' | 'generating' | 'downloading' | 'done' | 'error';

export const PHASE_LABEL: Record<ExportPhase, string> = {
  idle: '',
  preparing: 'Preparing records…',
  generating: 'Generating file…',
  downloading: 'Starting download…',
  done: 'Export complete',
  error: 'Export failed',
};

/** Yields to the browser so the phase change actually paints before heavy synchronous work. */
const nextPaint = () => new Promise<void>((r) => requestAnimationFrame(() => setTimeout(r, 0)));
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Drives an export through visible phases. Generation is synchronous and usually
 * fast, so each phase is held for a short minimum time to avoid a flickering UI.
 */
export function useExportJob() {
  const [phase, setPhase] = useState<ExportPhase>('idle');
  const [result, setResult] = useState<ExportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(
    async (expenses: Expense[], query: ExportQuery, format: ExportFormatId, filename: string) => {
      setError(null);
      setResult(null);
      try {
        setPhase('preparing');
        await Promise.all([nextPaint(), wait(250)]);

        if (!mounted.current) return null;
        setPhase('generating');
        await nextPaint();
        const started = performance.now();
        const { blob, result: res } = generateExport(expenses, query, format, filename);
        await wait(Math.max(0, 400 - (performance.now() - started)));

        if (!mounted.current) return null;
        setPhase('downloading');
        await nextPaint();
        downloadBlob(blob, res.filename);
        await wait(200);

        if (!mounted.current) return null;
        setResult(res);
        setPhase('done');
        return res;
      } catch (err) {
        console.error('Export failed', err);
        if (mounted.current) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setPhase('error');
        }
        return null;
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setPhase('idle');
    setResult(null);
    setError(null);
  }, []);

  const busy = phase === 'preparing' || phase === 'generating' || phase === 'downloading';
  return { phase, busy, result, error, run, reset };
}
