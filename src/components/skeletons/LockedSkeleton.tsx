import { Skeleton } from '@/components/Skeleton';

/** Replika /kiosk/locked saat status pemilihan pertama masih dicek. */
export function LockedSkeleton() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center p-6" aria-busy="true">
      <p role="status" className="sr-only">
        Memuat status bilik…
      </p>

      <div className="app-card w-full max-w-md overflow-hidden">
        <div className="h-2 bg-brand-yellow" />
        <div className="p-8">
          <Skeleton className="mx-auto h-24 w-24 rounded-full" />
          <Skeleton className="mx-auto mt-5 h-3 w-20" />
          <Skeleton className="mx-auto mt-3 h-7 w-52 max-w-full" />
          <Skeleton className="mx-auto mt-3 h-4 w-64 max-w-full" />
          <Skeleton className="mx-auto mt-3 h-7 w-20 rounded-full" />
          <Skeleton className="mx-auto mt-4 h-3 w-full max-w-[280px]" />
          <Skeleton className="mx-auto mt-1.5 h-3 w-3/5" />
          <Skeleton className="mx-auto mt-6 h-11 w-full rounded-full" />
        </div>
      </div>

      <Skeleton className="mt-6 h-3 w-64 max-w-full" />
    </main>
  );
}
