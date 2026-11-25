import Link from 'next/link';
import { ArrowLeft, Compass, LayoutDashboard, Vote } from 'lucide-react';

export default function NotFound() {
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

      <div className="app-card relative z-10 w-full max-w-md overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-brand-sky via-brand-yellow to-brand-red" aria-hidden />
        <div className="p-8">
          <span className="mx-auto grid h-24 w-24 place-items-center rounded-full border-2 border-ink bg-brand-yellow shadow-hard-sm">
            <Compass className="h-11 w-11" strokeWidth={1.9} aria-hidden />
          </span>
          <p className="app-kicker mt-5">Error 404</p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">
            Halaman tidak ditemukan
          </h1>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-ink/55">
            Alamat yang kamu tuju tidak ada atau sudah dipindahkan.
          </p>

          <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
            <Link
              href="/kiosk/ballot"
              className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-ink bg-ink px-5 py-3 text-sm font-bold text-white shadow-hard-sky transition hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
            >
              <Vote className="h-4 w-4" aria-hidden /> Ke Bilik
            </Link>
            <Link
              href="/admin/dashboard"
              prefetch={false}
              className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-ink bg-white px-5 py-3 text-sm font-bold text-ink shadow-hard-sm transition hover:-translate-y-0.5 hover:bg-brand-yellow/40 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
            >
              <LayoutDashboard className="h-4 w-4" aria-hidden /> Dashboard
            </Link>
          </div>

          <Link
            href="/"
            className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-ink/55 transition hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden /> Kembali ke Beranda
          </Link>
        </div>
      </div>
    </main>
  );
}
