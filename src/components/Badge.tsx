import { cn } from '@/lib/utils';

export function Badge({
  tone = 'gray',
  pulse,
  children,
  className,
}: {
  tone?: 'emerald' | 'amber' | 'gray' | 'sky' | 'red' | 'green';
  pulse?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const map: Record<string, string> = {
    emerald: 'bg-brand-sky-light text-ink',
    green: 'bg-brand-sky-light text-ink',
    amber: 'bg-brand-yellow text-ink',
    gray: 'bg-white text-ink/60',
    sky: 'bg-brand-sky text-ink',
    red: 'bg-brand-red text-white',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border-2 border-ink px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide shadow-[1.5px_1.5px_0_#131313]',
        map[tone],
        className
      )}
    >
      {pulse && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}
