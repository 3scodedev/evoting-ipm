'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff, LockKeyhole, LogIn, ShieldCheck, Zap } from 'lucide-react';
import { loginKiosk } from '@/app/actions/kiosk';
import { Button } from '@/components/Button';

export default function KioskLoginPage() {
  const r = useRouter();
  const [p, setP] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr('');
    const res = await loginKiosk({ password: p });
    setLoading(false);
    if (!res.success) {
      setErr(res.error.message);
      return;
    }
    r.push('/kiosk/ballot');
  }

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden p-4 sm:p-6">
      <div
        className="pointer-events-none absolute -right-36 -top-40 h-[440px] w-[440px] rounded-full border-2 border-ink/10 bg-brand-sky/25"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-48 -left-32 h-[420px] w-[420px] rounded-full border-2 border-ink/10 bg-brand-yellow/25"
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between gap-3 py-1">
        <Link href="/" className="flex items-center gap-2.5" aria-label="E-Voting IPM — beranda">
          <span className="grid h-10 w-10 place-items-center rounded-full border-2 border-ink bg-white shadow-[2px_2px_0_#131313]">
            <Image src="/images/logo-ipm.png" alt="Logo IPM" width={165} height={320} priority className="h-6 w-auto" />
          </span>
          <span>
            <span className="block text-[8px] font-extrabold uppercase tracking-[0.18em] text-ink/45">
              SMK Muhammadiyah Kandanghaur
            </span>
            <span className="block font-[family-name:var(--font-display)] text-sm font-extrabold tracking-tight">
              E-Voting IPM
            </span>
          </span>
        </Link>
        <span className="app-chip bg-brand-yellow text-[10px]">
          <Zap className="h-3 w-3" fill="currentColor" aria-hidden />
          Pemilihan 2026/2027
        </span>
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center py-8">
        <div className="w-full max-w-md">
          <div className="app-card overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-brand-sky via-brand-yellow to-brand-red" aria-hidden />
            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <span className="relative grid h-14 w-14 shrink-0 place-items-center rounded-full border-2 border-ink bg-brand-yellow shadow-hard-sm">
                  <Image
                    src="/images/logo-ipm.png"
                    alt="Logo IPM"
                    width={165}
                    height={320}
                    priority
                    className="h-9 w-auto"
                  />
                  <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border border-ink bg-brand-red" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="app-kicker">Bilik suara digital</p>
                  <h1 className="mt-0.5 font-[family-name:var(--font-display)] text-xl font-extrabold leading-tight tracking-tight">
                    Pemilihan Ketua IPM
                  </h1>
                  <p className="text-xs font-semibold text-ink/50">SMK Muhammadiyah Kandanghaur</p>
                </div>
              </div>

              <form onSubmit={submit} className="mt-6">
                <label className="app-label" htmlFor="p">
                  Token Bilik
                </label>
                <div className="relative mt-1.5">
                  <LockKeyhole
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/30"
                    aria-hidden
                  />
                  <input
                    id="p"
                    type={show ? 'text' : 'password'}
                    value={p}
                    onChange={(e) => setP(e.target.value)}
                    autoComplete="current-password"
                    placeholder="8 huruf kapital"
                    className="app-input px-11 text-center font-mono text-lg font-bold uppercase tracking-[0.2em]"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    aria-label={show ? 'Sembunyikan token' : 'Tampilkan token'}
                    className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-ink/45 transition hover:bg-brand-yellow hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red"
                  >
                    {show ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                  </button>
                </div>

                {err && (
                  <p role="alert" className="mt-3 rounded-xl border-2 border-ink bg-brand-red/10 p-2.5 text-sm font-semibold text-[#b91c12]">
                    {err}
                  </p>
                )}

                <Button type="submit" size="lg" loading={loading} className="mt-5 w-full">
                  <LogIn className="h-5 w-5" aria-hidden="true" />
                  Masuk ke Bilik
                </Button>

                <div className="mt-4 rounded-xl border-2 border-dashed border-ink/20 bg-brand-sky-light/25 p-3">
                  <p className="flex items-start gap-2 text-[11px] font-semibold leading-relaxed text-ink/55">
                    <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink" aria-hidden />
                    Token dipegang panitia. Hubungi admin command center jika bilik tidak bisa masuk.
                  </p>
                </div>
              </form>
            </div>
          </div>

          <Link
            href="/"
            className="mx-auto mt-5 flex w-fit items-center gap-2 text-sm font-bold text-ink/55 transition hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Kembali ke Beranda
          </Link>
        </div>
      </div>

      <p className="relative z-10 mx-auto pb-1 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-ink/35">
        Satu suara · satu arah · untuk IPM
      </p>
    </main>
  );
}
