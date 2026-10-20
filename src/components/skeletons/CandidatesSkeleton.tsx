import { Skeleton, SkeletonText } from '@/components/Skeleton';

/** Replika /admin/candidates saat daftar paslon masih dimuat. */
export function CandidatesSkeleton() {
  return (
    <main className="app-page" aria-busy="true">
      <p role="status" className="sr-only">
        Memuat kandidat…
      </p>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <Skeleton className="h-11 w-11 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-56 max-w-full" />
            <Skeleton className="h-3.5 w-72 max-w-full" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-32 rounded-full" />
        </div>
      </div>

      {/* Form */}
      <div className="app-card mt-4 overflow-hidden">
        <div className="app-panel-head">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="p-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="grid gap-3.5 sm:grid-cols-[9rem_minmax(0,1fr)]">
              <Skeleton className="h-[70px] w-full" />
              <Skeleton className="h-[70px] w-full" />
              <Skeleton className="h-[70px] w-full sm:col-span-2" />
            </div>
            <Skeleton className="h-[154px] w-full" />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t-2 border-ink/10 pt-4">
            <Skeleton className="h-16 w-16 rounded-xl" />
            <Skeleton className="h-8 w-28 rounded-full" />
            <Skeleton className="ml-auto h-9 w-44 rounded-full" />
          </div>
        </div>
      </div>

      {/* Daftar */}
      <div className="app-card mt-4 overflow-hidden">
        <div className="app-panel-head">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-2 2xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-3 rounded-2xl border-2 border-ink/15 bg-white/50 p-3">
              <Skeleton className="h-24 w-24 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-5 w-2/3" />
                <SkeletonText lines={2} />
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-8 w-24 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
