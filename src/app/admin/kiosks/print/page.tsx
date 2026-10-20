import type { Metadata } from 'next';
import Image from 'next/image';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireAdminUser } from '@/lib/auth-admin';
import { supabaseService } from '@/lib/supabase/server';
import { PrintToolbar } from './PrintToolbar';

export const metadata: Metadata = { title: 'Cetak Token Bilik — E-Voting IPM' };

type Master = { kiosk_name: string; token: string | null };

const PRINT_CSS = `
.print-sheet { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
@media print {
  @page { size: A4 portrait; margin: 0; }
  body > :not(.print-page) { display: none !important; }
  .no-print { display: none !important; }
  .print-page { background: #fff !important; padding: 0 !important; min-height: 0 !important; }
  .print-sheet {
    width: 210mm !important; max-width: none !important; margin: 0 !important; min-height: 285mm !important;
    border-radius: 0 !important; box-shadow: none !important;
  }
}
`;

export default async function PrintKioskTokenPage() {
  const user = await requireAdminUser();
  if (!user) redirect('/admin/dashboard');

  const db = supabaseService();
  const { data } = await db
    .from('kiosks')
    .select('kiosk_name, token')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .limit(1)
    .single();
  const master = data as Master | null;
  const token = master?.token ?? null;
  const kioskName = master?.kiosk_name ?? 'Master Bilik';

  const h = await headers();
  const host = h.get('host') ?? 'localhost:3000';
  const printed = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeStyle: 'short' }).format(new Date());

  return (
    <main className="print-page min-h-screen px-4 py-6">
      <PrintToolbar canPrint={!!token} />

      <div className="print-sheet mx-auto mt-4 min-h-[290mm] w-[210mm] bg-white p-[10mm] text-ink shadow-hard-lg ring-2 ring-ink/10">
        {token ? (
          <>
            <div className="grid w-fit grid-cols-2 gap-[7mm]">
              {[0, 1, 2, 3].map((i) => (
                <TokenCard key={i} token={token} kioskName={kioskName} hostUrl={host} />
              ))}
            </div>
            <p className="mt-[6mm] text-[10px] font-medium text-ink/40">
              Gunting mengikuti garis putus-putus • Dicetak {printed} • Jaga kerahasiaan token ini
            </p>
          </>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-ink/25 p-10 text-center">
            <p className="font-bold text-ink">Belum ada token bilik</p>
            <p className="mt-1 text-sm font-medium text-ink/50">
              Buat token dulu di halaman Manajemen Bilik, lalu kembali ke sini untuk mencetak.
            </p>
          </div>
        )}
      </div>

      <style>{PRINT_CSS}</style>
    </main>
  );
}

/** Kartu token ukuran KTP (85,6 × 54 mm) — siap digunting & ditempel di bilik. */
function TokenCard({ token, kioskName, hostUrl }: { token: string; kioskName: string; hostUrl: string }) {
  return (
    <div className="relative flex h-[54mm] w-[85.6mm] flex-col justify-between overflow-hidden rounded-lg border border-dashed border-ink/50 px-[5mm] py-[4mm]">
      <div className="absolute inset-x-0 top-0 h-[2mm] bg-brand-yellow" aria-hidden />
      {/* Kop kartu */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Image src="/images/logo-ipm.png" alt="Logo IPM" width={330} height={639} className="h-[6mm] w-auto" />
          <Image src="/images/logo-smk.png" alt="Logo SMK" width={264} height={384} className="h-[6mm] w-auto" />
        </div>
        <div className="text-right leading-[1.25]">
          <p className="text-[8px] font-extrabold uppercase tracking-[0.15em] text-ink">E-Voting IPM</p>
          <p className="text-[8px] font-medium text-ink/50">SMK Muhammadiyah Kandanghaur</p>
        </div>
      </div>

      {/* Token */}
      <div className="text-center">
        <p className="text-[8px] font-extrabold uppercase tracking-[0.22em] text-ink/60">Token Bilik — {kioskName}</p>
        <p className="mt-[1.5mm] select-all font-mono text-[34px] font-bold leading-none tracking-[0.18em] text-ink">
          {token}
        </p>
      </div>

      {/* Footer kartu */}
      <div className="flex items-center justify-between gap-2 text-[8px] font-medium text-ink/40">
        <span className="font-mono">{hostUrl}/kiosk/login</span>
        <span>8 huruf kapital</span>
      </div>
    </div>
  );
}
