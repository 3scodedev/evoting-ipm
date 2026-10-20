import { BallotHeader } from '@/components/kiosk/BallotHeader';
import { Skeleton } from '@/components/Skeleton';

/** Replika /kiosk/ballot saat daftar kandidat masih dimuat. */
export function BallotSkeleton() {
  return (
    <main className="flex min-h-screen flex-col" aria-busy="true">
      <p role="status" className="sr-only">
        Memuat surat suara…
      </p>

      <BallotHeader />

      <div className="mx-auto flex w-full max-w-[1760px] flex-1 flex-col px-4 py-6">
        <div className="my-auto">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-3 h-9 w-72 max-w-full" />
          <Skeleton className="mt-3 h-4 w-64 max-w-full" />

          <div
            aria-hidden
            className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
          >
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="overflow-hidden rounded-[22px] border-2 border-ink/15 bg-white/60"
              >
                <div className="aspect-[4/3] border-b-2 border-ink/10">
                  <Skeleton className="h-full w-full rounded-none" />
                </div>
                <div className="p-4 2xl:p-5">
                  <Skeleton className="h-7 w-3/4" />
                  <Skeleton className="mt-2 h-4 w-1/2" />
                  <Skeleton className="mt-3 h-4 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 z-10 border-t-2 border-ink bg-paper/95 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1760px] justify-center px-4 py-4">
          <Skeleton className="h-16 w-full max-w-md rounded-full sm:w-[360px]" />
        </div>
      </div>
    </main>
  );
}
