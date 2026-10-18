'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { LockedSkeleton } from '@/components/skeletons/LockedSkeleton';

export default function LockedPage() {
  const r = useRouter();
  const [status, setStatus] = useState<'pause' | 'stop' | null>(null);

  useEffect(() => {
    let alive = true;
    async function check() {
      try {
        const x = await fetch('/api/election-status');
        const j = x.ok ? await x.json() : null;
        if (!alive) return;
        if (j?.data?.status === 'start') r.push('/kiosk/ballot');
        else if (j?.data?.status) setStatus(j.data.status);
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

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center animate-fade-in">
      <div className="text-6xl">🔒</div>
      <h1 className="mt-4 text-2xl font-bold">{status === 'pause' ? 'Bilik Istirahat' : 'Pemilihan Selesai'}</h1>
      <p className="text-slate-600 mt-2 max-w-sm">
        {status === 'pause' ? 'Jeda — tunggu instruksi panitia.' : 'Pemilihan ditutup — terima kasih atas partisipasinya.'}
      </p>
      <div className="mt-3">
        <Badge tone={status === 'pause' ? 'amber' : 'gray'}>{status}</Badge>
      </div>
      <Button variant="ghost" className="mt-6" onClick={() => window.location.reload()}>
        Muat Ulang Status
      </Button>
    </main>
  );
}
