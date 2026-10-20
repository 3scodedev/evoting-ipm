'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, PauseCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { LockedSkeleton } from '@/components/skeletons/LockedSkeleton';
import { cn } from '@/lib/utils';

export default function LockedPage() {
  const r = useRouter();
  const [status, setStatus] = useState<'pause' | 'stop' | null>(null);

  useEffect(() => {
    let alive = true;
    async function check() {
      try {
        const x = await fetch('/api/election-status', { cache: 'no-store' });
        const j = x.ok ? await x.json() : null;
        if (!alive) return;
        if (j?.data?.status === 'start') r.replace('/kiosk/ballot');
        else if (j?.data?.status === 'pause' || j?.data?.status === 'stop') setStatus(j.data.status);
        else setStatus((s) => s ?? 'pause');
      } catch {
        // Offline → tetap tampilkan status terakhir (atau default jeda).
        if (alive) setStatus((s) => s ?? 'pause');
      }
    }
    check();
    const t = setInterval(check, 10_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [r]);

  if (status === null) return <LockedSkeleton />;

  const isPause = status === 'pause';
  const StatusIcon = isPause ? PauseCircle : CheckCircle2;
  const title = isPause ? 'Bilik Istirahat' : 'Pemilihan Selesai';
  const description = isPause
    ? 'Jeda — tunggu instruksi panitia.'
    : 'Pemilihan ditutup — terima kasih atas partisipasinya.';

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-6 text-center animate-fade-in">
      <div
        className={cn(
          'pointer-events-none absolute -right-40 -top-44 h-[460px] w-[460px] rounded-full border-2 border-ink/10',
          isPause ? 'bg-brand-yellow/30' : 'bg-brand-sky/25'
        )}
        aria-hidden
      />
      <div
        className={cn(
          'pointer-events-none absolute -bottom-52 -left-36 h-[440px] w-[440px] rounded-full border-2 border-ink/10',
          isPause ? 'bg-brand-sky/25' : 'bg-brand-yellow/30'
        )}
        aria-hidden
      />

      <div className="app-card relative z-10 w-full max-w-md overflow-hidden">
        <div className={cn('h-2', isPause ? 'bg-brand-yellow' : 'bg-brand-sky')} aria-hidden />
        <div className="p-8">
          <span
            className={cn(
              'mx-auto grid h-24 w-24 place-items-center rounded-full border-2 border-ink shadow-hard-sm',
              isPause ? 'bg-brand-yellow' : 'bg-brand-sky'
            )}
          >
            <StatusIcon className="h-11 w-11" strokeWidth={1.9} aria-hidden />
          </span>

          <p className="app-kicker mt-5">Status bilik</p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-tight">
            {title}
          </h1>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-ink/55">{description}</p>

          <div className="mt-4">
            <Badge tone={isPause ? 'amber' : 'gray'}>{isPause ? 'Jeda' : 'Selesai'}</Badge>
          </div>

          <p className="mt-4 text-xs font-medium leading-relaxed text-ink/40">
            Status dicek otomatis. Halaman kembali ke bilik saat panitia memulai pemilihan.
          </p>

          <Button
            variant="secondary"
            onClick={() => window.location.reload()}
            className="mt-6 w-full"
          >
            <RefreshCw className="h-4 w-4" aria-hidden /> Muat Ulang Status
          </Button>
        </div>
      </div>

      <p className="relative z-10 mt-6 text-[10px] font-bold uppercase tracking-[0.18em] text-ink/35">
        Pemilihan Ketua IPM · SMK Muhammadiyah Kandanghaur
      </p>
    </main>
  );
}
