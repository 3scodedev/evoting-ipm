import { cn } from '@/lib/utils';

/**
 * Blok skeleton shimmer. Ukuran & bentuk diatur lewat `className`
 * (`h-*`, `w-*`, `rounded-*`).
 */
export function Skeleton({ className, dark }: { className?: string; dark?: boolean }) {
  return <div aria-hidden className={cn('skeleton rounded-md', dark && 'skeleton-dark', className)} />;
}

/** Beberapa baris teks shimmer — baris terakhir lebih pendek seperti paragraf asli. */
export function SkeletonText({
  lines = 3,
  dark,
  className,
}: {
  lines?: number;
  dark?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} dark={dark} className={cn('h-4', i === lines - 1 ? 'w-3/5' : 'w-full')} />
      ))}
    </div>
  );
}
