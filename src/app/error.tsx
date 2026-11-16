'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="card mx-auto mt-10 flex max-w-md flex-col items-center px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100">
        <AlertTriangle className="h-6 w-6 text-rose-600" aria-hidden />
      </div>
      <h1 className="mt-4 text-lg font-semibold text-slate-900">Something went wrong</h1>
      <p className="mt-1 text-sm text-slate-500">An unexpected error occurred. Your saved data is safe in this browser.</p>
      <button type="button" className="btn-primary mt-6" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
