'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ScreenLock } from '@/components/kiosk/ScreenLock';

/** Header branding bilik — dipakai halaman ballot dan skeleton loading-nya. */
export function BallotHeader() {
  return (
    <header className="border-b-2 border-ink bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1760px] items-center gap-3 px-4 py-3">
        <Link
          href="/"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-ink bg-white shadow-[2px_2px_0_#131313] transition hover:-rotate-6 hover:bg-brand-yellow"
          aria-label="E-Voting IPM — beranda"
        >
          <Image
            src="/images/logo-ipm.png"
            alt="Logo IPM"
            width={165}
            height={320}
            priority
            className="h-7 w-auto"
          />
        </Link>
        <div className="min-w-0">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-ink/45">
            SMK Muhammadiyah Kandanghaur
          </p>
          <p className="truncate font-[family-name:var(--font-display)] font-extrabold leading-tight tracking-tight">
            Pemilihan Ketua IPM
          </p>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <span className="hidden rounded-full border-2 border-ink bg-brand-yellow px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider shadow-[2px_2px_0_#131313] sm:inline-flex">
            Bilik Suara
          </span>
          <ScreenLock />
        </div>
      </div>
      <div className="h-1.5 bg-gradient-to-r from-brand-sky via-brand-yellow to-brand-red" aria-hidden />
    </header>
  );
}
