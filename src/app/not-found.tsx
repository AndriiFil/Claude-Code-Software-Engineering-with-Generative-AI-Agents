import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="card mx-auto mt-10 flex max-w-md flex-col items-center px-6 py-12 text-center">
      <p className="text-sm font-semibold text-indigo-600">404</p>
      <h1 className="mt-2 text-lg font-semibold text-slate-900">Page not found</h1>
      <p className="mt-1 text-sm text-slate-500">The page you’re looking for doesn’t exist.</p>
      <Link href="/" className="btn-primary mt-6">
        Back to dashboard
      </Link>
    </div>
  );
}
