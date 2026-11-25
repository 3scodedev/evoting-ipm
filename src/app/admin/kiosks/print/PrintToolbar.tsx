'use client';

import Link from 'next/link';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/components/Button';

export function PrintToolbar({ canPrint }: { canPrint: boolean }) {
  return (
    <div className="no-print mx-auto flex w-full max-w-[794px] items-center justify-between gap-3 pb-1">
      <Link
        href="/admin/kiosks"
        prefetch={false}
        className="inline-flex items-center gap-1.5 text-sm font-bold text-ink/55 transition hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Kembali ke Bilik
      </Link>
      <Button
        size="sm"
        onClick={() => window.print()}
        disabled={!canPrint}
        className="inline-flex items-center gap-1.5"
      >
        <Printer className="h-4 w-4" aria-hidden /> Cetak Sekarang
      </Button>
    </div>
  );
}
