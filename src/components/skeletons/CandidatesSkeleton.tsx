import { Skeleton, SkeletonText } from '@/components/Skeleton';

/** Replika /admin/candidates saat daftar paslon masih dimuat. */
export function CandidatesSkeleton() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 p-4 pb-24 md:pb-4" aria-busy="true">
      <p role="status" className="sr-only">
        Memuat kandidat…
      </p>

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Skeleton dark className="h-9 w-9 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton dark className="h-5 w-44 max-w-full" />
            <Skeleton dark className="h-3 w-56 max-w-full" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton dark className="h-7 w-24 rounded-full" />
          <Skeleton dark className="h-4 w-24" />
        </div>
      </div>

      {/* Form */}
      <div className="mt-6 rounded-xl bg-slate-800 p-4">
        <div className="flex items-center gap-2">
          <Skeleton dark className="h-7 w-7 rounded-lg" />
          <Skeleton dark className="h-5 w-36" />
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <div className="grid gap-3 sm:grid-cols-[9rem_minmax(0,1fr)]">
            <Skeleton dark className="h-16 w-full" />
            <Skeleton dark className="h-16 w-full" />
            <Skeleton dark className="h-16 w-full sm:col-span-2" />
          </div>
          <Skeleton dark className="h-16 w-full" />
        </div>
        <div className="mt-4 flex items-center gap-3 border-t border-slate-700/40 pt-3">
          <Skeleton dark className="h-14 w-14 rounded-lg" />
          <Skeleton dark className="h-9 w-28" />
          <Skeleton dark className="ml-auto h-9 w-40" />
        </div>
      </div>

      {/* Daftar */}
      <div className="mt-4 rounded-xl bg-slate-800 p-4">
        <div className="flex items-center gap-2">
          <Skeleton dark className="h-7 w-7 rounded-lg" />
          <Skeleton dark className="h-5 w-40" />
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-3 rounded-xl border border-slate-700/50 bg-slate-900/60 p-3">
              <Skeleton dark className="h-24 w-24 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton dark className="h-5 w-2/3" />
                <SkeletonText dark lines={2} />
                <div className="flex items-center justify-between">
                  <Skeleton dark className="h-6 w-20 rounded-full" />
                  <Skeleton dark className="h-7 w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
