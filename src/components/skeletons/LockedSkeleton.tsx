import { Skeleton } from '@/components/Skeleton';

/** Replika /kiosk/locked saat status pemilihan pertama masih dicek. */
export function LockedSkeleton() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
      aria-busy="true"
    >
      <p role="status" className="sr-only">
        Memuat status bilik…
      </p>

      <Skeleton className="h-16 w-16 rounded-full" />
      <Skeleton className="mt-5 h-7 w-56 max-w-full" />
      <Skeleton className="mt-3 h-4 w-72 max-w-full" />
      <Skeleton className="mt-2 h-4 w-48 max-w-full" />
      <Skeleton className="mt-4 h-7 w-24 rounded-full" />
      <Skeleton className="mt-6 h-10 w-40" />
    </main>
  );
}
