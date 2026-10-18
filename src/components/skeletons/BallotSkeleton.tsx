import { Skeleton, SkeletonText } from '@/components/Skeleton';

/** Replika /kiosk/ballot saat daftar kandidat masih dimuat. */
export function BallotSkeleton() {
  return (
    <main className="flex min-h-screen flex-col bg-green-50" aria-busy="true">
      <p role="status" className="sr-only">
        Memuat surat suara…
      </p>

      {/* Header hijau IPM */}
      <header className="bg-green-700">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 xl:max-w-7xl">
          <Skeleton dark className="h-10 w-10 shrink-0 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton dark className="h-4 w-40 max-w-full" />
            <Skeleton dark className="h-3 w-52 max-w-full" />
          </div>
          <Skeleton dark className="ml-auto h-6 w-20 shrink-0 rounded-full" />
        </div>
        <div className="h-1 bg-amber-400" />
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col p-4 xl:max-w-7xl">
        <div className="my-auto">
          <Skeleton className="h-8 w-64 max-w-full" />

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden"
              >
                <div className="aspect-[4/3]">
                  <Skeleton className="h-full w-full rounded-none" />
                </div>
                <div className="p-4">
                  <Skeleton className="h-7 w-16 rounded-full" />
                  <Skeleton className="mt-3 h-6 w-3/4" />
                  <SkeletonText lines={2} className="mt-3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 z-10 border-t border-green-100 bg-white/95 shadow-[0_-4px_16px_rgba(21,128,61,0.06)] backdrop-blur">
        <div className="mx-auto w-full max-w-5xl px-4 py-3 xl:max-w-7xl">
          <div className="flex justify-center">
            <Skeleton className="h-20 w-20 rounded-full" />
          </div>
        </div>
      </div>
    </main>
  );
}
