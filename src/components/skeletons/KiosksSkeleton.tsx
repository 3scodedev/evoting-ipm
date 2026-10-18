import { Skeleton } from '@/components/Skeleton';

const SESSION_COLS = ['w-24', 'w-28', 'w-40 hidden md:block', 'w-28', 'w-20', 'w-16', 'w-16'];

/** Replika /admin/kiosks saat data pertama masih dimuat. */
export function KiosksSkeleton() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 p-4 pb-24 md:pb-4" aria-busy="true">
      <p role="status" className="sr-only">
        Memuat manajemen bilik…
      </p>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Skeleton dark className="h-9 w-9 rounded-xl" />
          <div className="space-y-2">
            <Skeleton dark className="h-5 w-40" />
            <Skeleton dark className="h-3.5 w-56 max-w-full" />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Skeleton dark className="h-7 w-20 rounded-full" />
          <Skeleton dark className="h-4 w-32" />
          <Skeleton dark className="h-8 w-36" />
        </div>
      </div>

      {/* Kredensial master */}
      <section className="mt-6 rounded-xl bg-slate-800 border border-slate-700/60 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Skeleton dark className="h-7 w-7 rounded-lg" />
          <Skeleton dark className="h-5 w-52 max-w-full" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-lg bg-slate-900/80 p-3 border border-slate-700/40">
              <Skeleton dark className="h-3 w-24" />
              <Skeleton dark className="mt-2.5 h-5 w-40 max-w-full" />
            </div>
          ))}
        </div>
      </section>

      {/* Pengaturan session */}
      <section className="mt-4 rounded-xl bg-slate-800 border border-slate-700/60 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Skeleton dark className="h-7 w-7 rounded-lg" />
          <Skeleton dark className="h-5 w-44 max-w-full" />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton dark className="h-4 w-72 max-w-full" />
          <Skeleton dark className="h-9 w-20" />
          <Skeleton dark className="h-8 w-20" />
        </div>
      </section>

      {/* Session aktif */}
      <section className="mt-4 rounded-xl bg-slate-800 border border-slate-700/60 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Skeleton dark className="h-7 w-7 rounded-lg" />
          <Skeleton dark className="h-5 w-36" />
        </div>
        <div className="mt-3 overflow-hidden rounded-lg border border-slate-700/50">
          <div className="flex items-center gap-4 bg-slate-900/50 p-3">
            {SESSION_COLS.map((w, i) => (
              <Skeleton key={i} dark className={`h-4 ${w}`} />
            ))}
          </div>
          {[0, 1, 2].map((r) => (
            <div key={r} className="flex items-center gap-4 border-t border-slate-700/50 p-3">
              {SESSION_COLS.map((w, i) => (
                <Skeleton key={i} dark className={`h-4 ${w}`} />
              ))}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
