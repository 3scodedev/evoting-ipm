'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';

export default function SuccessPage() {
  const r = useRouter();
  const [left, setLeft] = useState(3);

  useEffect(() => {
    if (left <= 0) {
      // Bilik tetap terbuka untuk pemilih berikutnya — tanpa input token ulang
      r.push('/kiosk/ballot');
      return;
    }
    const t = setTimeout(() => setLeft((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [left, r]);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-6 text-center">
      <div
        className="pointer-events-none absolute -right-40 -top-44 h-[460px] w-[460px] rounded-full border-2 border-ink/10 bg-brand-sky/25"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-52 -left-36 h-[440px] w-[440px] rounded-full border-2 border-ink/10 bg-brand-yellow/30"
        aria-hidden
      />

      <div className="relative z-10 w-full max-w-md">
        <div className="app-card overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-brand-sky via-brand-yellow to-brand-red" aria-hidden />
          <div className="p-8" aria-live="assertive">
            <span className="mx-auto grid h-24 w-24 place-items-center rounded-full border-2 border-ink bg-brand-yellow shadow-hard">
              <span className="grid h-16 w-16 place-items-center rounded-full border-2 border-ink bg-white">
                <Check className="h-9 w-9" strokeWidth={3} aria-hidden />
              </span>
            </span>

            <p className="app-kicker mt-5">Suara tercatat</p>
            <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">
              Terima kasih!
            </h1>
            <p className="mt-2 text-sm font-semibold text-ink/55">
              Suara Anda aman tersimpan • {new Date().toLocaleString('id-ID')}
            </p>

            <div className="mt-7 text-left">
              <div className="flex items-center justify-between">
                <span className="app-kicker text-[9px]">Menyiapkan bilik berikutnya</span>
                <span className="font-mono text-xs font-bold text-ink/45">{left}s</span>
              </div>
              <div className="mt-2 h-3 w-full overflow-hidden rounded-full border-2 border-ink bg-white">
                <div
                  className="h-full rounded-full bg-brand-sky transition-all duration-500"
                  style={{ width: `${(left / 3) * 100}%` }}
                />
              </div>
            </div>

            <p className="mt-5 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-ink/40">
              <span className="h-2 w-2 animate-pulse rounded-full bg-brand-red" aria-hidden />
              Jangan tinggalkan bilik sebelum layar berganti
            </p>
          </div>
        </div>

        <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-ink/35">
          Pemilihan Ketua IPM · SMK Muhammadiyah Kandanghaur
        </p>
      </div>
    </main>
  );
}
