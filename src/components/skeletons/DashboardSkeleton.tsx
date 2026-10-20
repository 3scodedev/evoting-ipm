import { Skeleton } from '@/components/Skeleton';

/** Replika /admin/dashboard saat data pertama masih dimuat. */
export function DashboardSkeleton() {
  return (
    <main className="app-page" aria-busy="true">
      <p role="status" className="sr-only">
        Memuat dashboard…
      </p>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <Skeleton className="h-11 w-11 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-48 max-w-full" />
            <Skeleton className="h-3.5 w-64 max-w-full" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-28 rounded-full" />
        </div>
      </header>

      <div className="mt-5 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-[22px] border-2 border-ink/15 bg-white/50 p-5">
            <div className="flex items-start justify-between">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-9 w-9 rounded-full" />
            </div>
            <Skeleton className="mt-4 h-9 w-24" />
            <Skeleton className="mt-2.5 h-3 w-40" />
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className="app-card overflow-hidden xl:col-span-2">
          <div className="app-panel-head">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <Skeleton className="h-5 w-44" />
          </div>
          <div className="flex h-72 flex-col justify-center gap-5 p-4">
            {[
              ['w-24', 'w-3/4'],
              ['w-32', 'w-1/2'],
              ['w-20', 'w-2/3'],
              ['w-28', 'w-1/3'],
            ].map(([label, bar], i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className={`h-4 ${label}`} />
                <Skeleton className={`h-7 ${bar}`} />
              </div>
            ))}
          </div>
        </div>

        <div className="app-card overflow-hidden">
          <div className="app-panel-head">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <Skeleton className="h-5 w-28" />
          </div>
          <div className="space-y-3 p-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
