import { Skeleton } from '@/components/Skeleton';

const SESSION_COLS = ['w-24', 'w-28', 'w-40 hidden md:block', 'w-28', 'w-20', 'w-16', 'w-16'];

/** Replika /admin/kiosks saat data pertama masih dimuat. */
export function KiosksSkeleton() {
  return (
    <main className="app-page" aria-busy="true">
      <p role="status" className="sr-only">
        Memuat manajemen bilik…
      </p>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <Skeleton className="h-11 w-11 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-52 max-w-full" />
            <Skeleton className="h-3.5 w-72 max-w-full" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-36 rounded-full" />
          <Skeleton className="h-8 w-36 rounded-full" />
        </div>
      </div>

      {/* Kredensial master */}
      <div className="app-card mt-4 overflow-hidden">
        <div className="app-panel-head">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <Skeleton className="h-5 w-52 max-w-full" />
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className="rounded-2xl border-2 border-ink/15 bg-white/50 p-4">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-3 h-6 w-40 max-w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pengaturan session */}
      <div className="app-card mt-4 overflow-hidden">
        <div className="app-panel-head">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <Skeleton className="h-5 w-44 max-w-full" />
        </div>
        <div className="flex flex-wrap items-center gap-3 p-4">
          <Skeleton className="h-4 w-72 max-w-full" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24 rounded-full" />
        </div>
      </div>

      {/* Session aktif */}
      <div className="app-card mt-4 overflow-hidden">
        <div className="app-panel-head">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <Skeleton className="h-5 w-36" />
        </div>
        <div className="p-3 sm:p-4">
          <div className="overflow-hidden rounded-2xl border-2 border-ink/15">
            <div className="flex items-center gap-4 bg-paper-deep p-3">
              {SESSION_COLS.map((w, i) => (
                <Skeleton key={i} className={`h-4 ${w}`} />
              ))}
            </div>
            {[0, 1, 2].map((r) => (
              <div key={r} className="flex items-center gap-4 border-t border-ink/10 p-3">
                {SESSION_COLS.map((w, i) => (
                  <Skeleton key={i} className={`h-4 ${w}`} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
