import { Skeleton, SkeletonText } from '@/components/Skeleton';

const ROW_WIDTHS = ['w-40', 'w-32', 'w-36', 'w-28'];

/** Replika /admin/reports saat rekap suara masih dimuat. */
export function ReportsSkeleton() {
  return (
    <main className="app-page" aria-busy="true">
      <p role="status" className="sr-only">
        Memuat laporan…
      </p>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <Skeleton className="h-11 w-11 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-64 max-w-full" />
            <Skeleton className="h-3.5 w-72 max-w-full" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
      </div>

      {/* Rekap suara */}
      <div className="app-card mt-4 overflow-hidden">
        <div className="app-panel-head">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <Skeleton className="h-5 w-36" />
          <Skeleton className="ml-auto h-8 w-28 rounded-full" />
        </div>
        <div className="p-4">
          <div className="space-y-2.5">
            {ROW_WIDTHS.map((w, i) => (
              <div key={i} className="rounded-2xl border-2 border-ink/15 bg-white/50 p-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <Skeleton className={`h-4 ${w} max-w-full`} />
                      <Skeleton className="h-4 w-20 shrink-0" />
                    </div>
                    <Skeleton className="h-2.5 w-full rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3.5 flex items-center justify-between border-t-2 border-ink/10 pt-3.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-12" />
          </div>
        </div>
      </div>

      {/* Dokumen & export */}
      <div className="app-card mt-4 overflow-hidden">
        <div className="app-panel-head">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <Skeleton className="h-5 w-44" />
        </div>
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-2xl border-2 border-ink/15 bg-white/50 p-4">
              <Skeleton className="h-3 w-32" />
              <SkeletonText className="mt-3" lines={2} />
              <div className="mt-3.5 flex items-center justify-between">
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-9 w-32 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
