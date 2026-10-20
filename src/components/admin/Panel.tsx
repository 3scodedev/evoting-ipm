import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tone = 'sky' | 'yellow' | 'red';

const toneClass: Record<Tone, string> = {
  sky: 'bg-brand-sky',
  yellow: 'bg-brand-yellow',
  red: 'bg-brand-red text-white',
};

/** Header standar halaman Command Center — konsisten dengan gaya landing page. */
export function PageHeader({
  icon: Icon,
  kicker,
  title,
  description,
  tone = 'sky',
  children,
}: {
  icon: LucideIcon;
  kicker: string;
  title: string;
  description: string;
  tone?: Tone;
  children?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3.5">
        <span className={cn('app-icon h-11 w-11 rounded-2xl', toneClass[tone])}>
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="app-kicker">{kicker}</p>
          <h1 className="app-h1 mt-0.5">{title}</h1>
          <p className="mt-1 max-w-xl text-sm font-medium leading-relaxed text-ink/55">
            {description}
          </p>
        </div>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  );
}

/** Kartu panel dengan judul berikon — dipakai di seluruh halaman admin. */
export function Panel({
  icon: Icon,
  title,
  aside,
  tone = 'sky',
  children,
  className,
  bodyClassName,
  id,
}: {
  icon: LucideIcon;
  title: string;
  aside?: React.ReactNode;
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn('app-card overflow-hidden', className)}>
      <div className="app-panel-head">
        <span className={cn('app-icon', toneClass[tone])}>
          <Icon className="h-[18px] w-[18px]" aria-hidden />
        </span>
        <h2 className="app-h2">{title}</h2>
        {aside && <div className="ml-auto flex flex-wrap items-center justify-end gap-2">{aside}</div>}
      </div>
      <div className={cn('app-panel-body', bodyClassName)}>{children}</div>
    </section>
  );
}
