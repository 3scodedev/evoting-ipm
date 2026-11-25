'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, PauseCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { LockedSkeleton } from '@/components/skeletons/LockedSkeleton';
import { cn } from '@/lib/utils';

export default function LockedPage() {
  const r = useRouter();
  const [status, setStatus] = useState<'pause' | 'stop' | null>(null);
  const [checking, setChecking] = useState(false);

  const applyStatus = useCallback(
    (j: { data?: { status?: string } } | null) => {
      const s = j?.data?.status;
      if (s === 'start') {
        r.replace('/kiosk/ballot');
        return;
      }
      if (s === 'pause' || s === 'stop') setStatus(s);
      else setStatus((prev) => prev ?? 'pause');
    },
    [r]
  );

  // Tombol "Muat Ulang Status" — fetch ulang saja, tanpa reload halaman.
  const checkNow = useCallback(async () => {
    setChecking(true);
    try {
      // Tanpa `no-store`: response boleh diambil dari cache edge (s-maxage 5 dtk).
      const x = await fetch('/api/election-status');
      applyStatus(x.ok ? await x.json() : null);
    } catch {
      setStatus((prev) => prev ?? 'pause');
    } finally {
      setChecking(false);
    }
  }, [applyStatus]);

  useEffect(() => {
    let alive = true;
    async function check() {
      try {
        const x = await fetch('/api/election-status');
        const j = x.ok ? await x.json() : null;
        if (alive) applyStatus(j);
      } catch {
        // Offline → tetap tampilkan status terakhir (atau default jeda).
        if (alive) setStatus((prev) => prev ?? 'pause');
      }
    }
    check();
    const t = setInterval(check, 10_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [applyStatus]);

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
            loading={checking}
            onClick={checkNow}
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
