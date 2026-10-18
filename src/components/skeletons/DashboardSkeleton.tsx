import { Skeleton } from '@/components/Skeleton';

/** Replika /admin/dashboard saat data pertama masih dimuat. */
export function DashboardSkeleton() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50" aria-busy="true">
      <p role="status" className="sr-only">
        Memuat dashboard…
      </p>

      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <Skeleton dark className="h-6 w-40" />
        <div className="flex items-center gap-2">
          <Skeleton dark className="h-7 w-24 rounded-full" />
          <Skeleton dark className="h-8 w-20" />
        </div>
      </header>

      <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl bg-slate-800 p-4">
            <Skeleton dark className="h-4 w-24" />
            <Skeleton dark className="mt-3 h-8 w-16" />
          </div>
        ))}
      </div>

      <div className="grid gap-3 p-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl bg-slate-800 p-4">
          <Skeleton dark className="h-5 w-64 max-w-full" />
          <div className="mt-3 flex h-72 flex-col justify-center gap-5">
            {[
              ['w-24', 'w-3/4'],
              ['w-32', 'w-1/2'],
              ['w-20', 'w-2/3'],
              ['w-28', 'w-1/3'],
            ].map(([label, bar], i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton dark className={`h-4 ${label}`} />
                <Skeleton dark className={`h-7 ${bar}`} />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-slate-800 p-4">
          <Skeleton dark className="h-5 w-28" />
          <div className="mt-4 space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <Skeleton dark className="h-4 w-32" />
                <Skeleton dark className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
