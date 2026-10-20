import { cn } from '@/lib/utils';
import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger' | 'success';
type Size = 'sm' | 'md' | 'lg' | 'xl-kiosk';

const variants: Record<Variant, string> = {
  primary:
    'border-ink bg-ink text-white shadow-hard-sm hover:-translate-y-0.5 hover:shadow-hard-sky',
  secondary:
    'border-ink bg-white text-ink shadow-hard-sm hover:-translate-y-0.5 hover:bg-brand-yellow/30',
  accent:
    'border-ink bg-brand-yellow text-ink shadow-hard-sm hover:-translate-y-0.5 hover:bg-brand-yellow-deep',
  ghost:
    'border-ink/25 bg-transparent text-ink hover:border-ink hover:bg-white',
  danger:
    'border-ink bg-brand-red text-white shadow-hard-sm hover:-translate-y-0.5 hover:bg-[#d93224]',
  success:
    'border-ink bg-brand-sky text-ink shadow-hard-sm hover:-translate-y-0.5 hover:bg-brand-sky-deep',
};

const sizes: Record<Size, string> = {
  sm: 'px-3.5 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
  'xl-kiosk': 'min-h-[52px] px-8 py-4 text-lg',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  className,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full border-2 font-bold tracking-tight transition duration-200 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? 'Memproses…' : children}
    </button>
  );
}
