import { Skeleton, SkeletonText } from '@/components/Skeleton';

const ROW_WIDTHS = ['w-40', 'w-32', 'w-36', 'w-28'];

/** Replika /admin/reports saat rekap suara masih dimuat. */
export function ReportsSkeleton() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 p-4 pb-24 md:pb-4" aria-busy="true">
      <p role="status" className="sr-only">
        Memuat laporan…
      </p>

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Skeleton dark className="h-9 w-9 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton dark className="h-5 w-52 max-w-full" />
            <Skeleton dark className="h-3 w-64 max-w-full" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton dark className="h-7 w-20 rounded-full" />
          <Skeleton dark className="h-7 w-24 rounded-full" />
          <Skeleton dark className="h-4 w-16" />
        </div>
      </div>

      {/* Rekap suara */}
      <div className="mt-6 rounded-xl bg-slate-800 p-4">
        <div className="flex items-center gap-2">
          <Skeleton dark className="h-7 w-7 rounded-lg" />
          <Skeleton dark className="h-5 w-36" />
          <Skeleton dark className="ml-auto h-3 w-28" />
        </div>
        <div className="mt-3 space-y-2">
          {ROW_WIDTHS.map((w, i) => (
            <div key={i} className="rounded-lg border border-slate-700/40 bg-slate-900/60 p-3">
              <div className="flex items-center gap-3">
                <Skeleton dark className="h-8 w-8 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Skeleton dark className={`h-4 ${w} max-w-full`} />
                    <Skeleton dark className="h-4 w-20 shrink-0" />
                  </div>
                  <Skeleton dark className="h-1.5 w-full rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-slate-700/60 pt-3">
          <Skeleton dark className="h-4 w-28" />
          <Skeleton dark className="h-4 w-12" />
        </div>
      </div>

      {/* Dokumen & export */}
      <div className="mt-4 rounded-xl bg-slate-800 p-4">
        <div className="flex items-center gap-2">
          <Skeleton dark className="h-7 w-7 rounded-lg" />
          <Skeleton dark className="h-5 w-44" />
        </div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-lg border border-slate-700/40 bg-slate-900/80 p-3">
              <Skeleton dark className="h-3 w-32" />
              <SkeletonText dark className="mt-3" lines={2} />
              <div className="mt-3 flex items-center justify-between">
                <Skeleton dark className="h-7 w-24 rounded-full" />
                <Skeleton dark className="h-8 w-28" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
