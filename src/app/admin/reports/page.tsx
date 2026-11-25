'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { generateBeritaAcaraPdf } from '@/lib/pdf/berita-acara';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { ToastStack, useToasts } from '@/components/Toast';
import { PageHeader, Panel } from '@/components/admin/Panel';
import { ReportsSkeleton } from '@/components/skeletons/ReportsSkeleton';
import { useDebouncedCallback } from '@/lib/use-debounced-callback';
import { cn } from '@/lib/utils';
import { BarChart3, Download, FileDown, FileText, Printer, Trophy } from 'lucide-react';

type Row = { candidate_number: number; name: string; class_name: string; vote_count: number };
type ElectionStatus = 'start' | 'pause' | 'stop';

const STATUS_META: Record<ElectionStatus, { label: string; tone: 'emerald' | 'amber' | 'gray' }> = {
  start: { label: 'Berjalan', tone: 'emerald' },
  pause: { label: 'Jeda', tone: 'amber' },
  stop: { label: 'Selesai', tone: 'gray' },
};

export default function ReportsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [election, setElection] = useState<ElectionStatus | null>(null);
  const [live, setLive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const { toasts, push, dismiss } = useToasts();

  const load = useCallback(async () => {
    const sb = supabaseBrowser();
    try {
      const [{ data: c }, { data: e }] = await Promise.all([
        sb.from('candidates').select('candidate_number, name, class_name, vote_count'),
        sb.from('election_settings').select('status').eq('id', 1).single(),
      ]);
      setRows((c as Row[]) ?? []);
      if (e?.status) setElection(e.status as ElectionStatus);
      setUpdatedAt(new Date());
    } finally {
      setReady(true);
    }
  }, []);

  // Event kandidat dipatch langsung dari payload (vote_count ikut terkirim),
  // election_settings jarang berubah jadi boleh langsung load().
  const debouncedLoad = useDebouncedCallback(load, 500);

  useEffect(() => {
    load();
    const sb = supabaseBrowser();
    const ch = sb
      .channel('reports')
      // Subscription `votes` dihapus: total & ranking diturunkan dari
      // candidates.vote_count (baris `total`/`ranked`), jadi event votes
      // hanya duplikat beban tanpa menambah informasi apa pun.
      .on('postgres_changes', { event: '*', schema: 'public', table: 'candidates' }, (p) => {
        const next = p.new as Partial<Row> | null;
        const num = next?.candidate_number;
        const count = next?.vote_count;
        if (typeof num === 'number' && typeof count === 'number') {
          setRows((cur) => {
            const idx = cur.findIndex((r) => r.candidate_number === num);
            if (idx === -1) return cur;
            const copy = [...cur];
            copy[idx] = {
              ...copy[idx],
              name: next?.name ?? copy[idx].name,
              class_name: next?.class_name ?? copy[idx].class_name,
              vote_count: count,
            };
            return copy;
          });
          setUpdatedAt(new Date());
          return;
        }
        debouncedLoad();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'election_settings' }, () => load())
      .subscribe((s) => setLive(s === 'SUBSCRIBED'));
    // Realtime jalur utama; polling 30 dtk hanya resync (dulu 5 dtk).
    const t = setInterval(load, 30_000);
    return () => {
      sb.removeChannel(ch);
      clearInterval(t);
    };
  }, [load, debouncedLoad]);

  async function handlePrint() {
    if (busy) return;
    setBusy(true);
    try {
      const sb = supabaseBrowser();
      const [{ data: c, error: ce }, { data: e, error: ee }] = await Promise.all([
        sb.from('candidates').select('candidate_number, name, class_name, vote_count').order('candidate_number'),
        sb.from('election_settings').select('status, stopped_at, results_hash').eq('id', 1).single(),
      ]);
      if (ce || ee) throw new Error((ce ?? ee)?.message ?? 'Gagal memuat data');
      if (e?.status !== 'stop') {
        push('error', 'Berita acara hanya bisa dicetak setelah pemilihan di-stop.');
        return;
      }
      const candidates = (c ?? []) as Row[];
      if (!candidates.length) {
        push('error', 'Belum ada data kandidat.');
        return;
      }
      if (!candidates.some((x) => x.vote_count > 0)) {
        push('error', 'Belum ada suara masuk.');
        return;
      }
      await generateBeritaAcaraPdf({
        candidates,
        stoppedAt: e.stopped_at,
        resultsHash: e.results_hash,
        printedAt: new Date(),
      });
      push('success', 'Berita acara PDF berhasil diunduh.');
    } catch (err) {
      push('error', err instanceof Error ? err.message : 'Gagal membuat berita acara.');
    } finally {
      setBusy(false);
    }
  }

  function handleExport() {
    window.location.href = '/api/export/results';
    push('success', 'Export hasil (CSV) sedang diunduh.');
  }

  if (!ready) return <ReportsSkeleton />;

  const total = rows.reduce((a, c) => a + c.vote_count, 0);
  const ranked = [...rows].sort((a, b) => b.vote_count - a.vote_count || a.candidate_number - b.candidate_number);
  const stopped = election === 'stop';
  const hasVotes = total > 0;

  return (
    <main className="app-page animate-fade-in">
      <PageHeader
        icon={FileText}
        kicker="Command Center"
        title="Laporan & Berita Acara"
        description="Rekap hasil, cetak dokumen final, dan export data pemilihan."
        tone="yellow"
      >
        <Badge tone={live ? 'emerald' : 'amber'} pulse={live}>
          {live ? 'Realtime' : 'Menghubungkan'}
        </Badge>
        {election && (
          <Badge tone={STATUS_META[election].tone} pulse={election === 'start'}>
            {STATUS_META[election].label}
          </Badge>
        )}
        <span className="app-chip font-mono text-[10px]" aria-live="polite">
          {total} suara
        </span>
      </PageHeader>

      <Panel
        icon={Trophy}
        title="Rekap Suara"
        tone="yellow"
        className="mt-4"
        aside={
          updatedAt && (
            <span className="app-chip font-mono text-[10px] text-ink/55">
              {updatedAt.toLocaleTimeString('id-ID')}
            </span>
          )
        }
      >
        {!hasVotes ? (
          <div className="app-empty">
            <BarChart3 className="mx-auto mb-2 h-8 w-8 text-ink/25" aria-hidden />
            <p className="font-semibold">Belum ada suara masuk.</p>
            <p className="mt-1 text-xs">Rekap, berita acara &amp; export aktif setelah minimal 1 suara masuk.</p>
          </div>
        ) : (
          <>
            <ol className="stagger-fade space-y-2.5">
              {ranked.map((c, i) => {
                const pct = total ? (c.vote_count / total) * 100 : 0;
                const isWinner = i === 0;
                return (
                  <li
                    key={c.candidate_number}
                    style={{ '--i': Math.min(i, 8) } as React.CSSProperties}
                    className={cn(
                      'rounded-2xl border-2 border-ink p-3 shadow-hard-sm',
                      isWinner ? 'bg-brand-yellow/25' : 'bg-white'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          'grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-ink font-mono text-sm font-extrabold shadow-[2px_2px_0_#131313]',
                          isWinner ? 'bg-brand-yellow' : 'bg-white text-ink/50'
                        )}
                        aria-label={isWinner ? 'Peringkat 1' : `Peringkat ${i + 1}`}
                      >
                        {isWinner ? <Trophy className="h-4 w-4" aria-hidden /> : i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                          <span className="line-clamp-2 font-bold">
                            No.{c.candidate_number} {c.name}
                            {c.class_name && (
                              <span className="ml-1.5 text-xs font-bold text-brand-sky-deep">Kelas {c.class_name}</span>
                            )}
                          </span>
                          <span className="shrink-0 font-mono text-sm font-bold">
                            {c.vote_count}
                            <span className="font-medium text-ink/45"> ({pct.toFixed(1)}%)</span>
                          </span>
                        </div>
                        <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full border border-ink bg-white" aria-hidden>
                          <div
                            className={cn('h-full rounded-full transition-all', isWinner ? 'bg-brand-yellow' : 'bg-brand-sky')}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
            <div className="mt-3.5 flex items-center justify-between border-t-2 border-dashed border-ink/15 pt-3.5 text-sm">
              <span className="font-semibold text-ink/55">Total suara masuk</span>
              <span className="font-mono text-lg font-bold">{total}</span>
            </div>
          </>
        )}
      </Panel>

      <Panel icon={FileDown} title="Dokumen & Export" className="mt-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col rounded-2xl border-2 border-ink bg-brand-sky-light/35 p-4">
            <p className="app-kicker mb-2 flex items-center gap-1.5">
              <Printer className="h-3 w-3" aria-hidden /> Berita Acara
            </p>
            <p className="flex-1 text-sm font-medium leading-relaxed text-ink/60">
              Dokumen PDF hasil final + hash verifikasi dalam <b className="text-ink">1 halaman A4</b>. Aktif setelah pemilihan{' '}
              <b className="text-ink">di-stop</b> dari Dashboard.
            </p>
            <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2">
              <Badge tone={stopped && hasVotes ? 'emerald' : 'gray'} className="text-[10px]">
                {stopped && hasVotes ? 'Siap cetak' : 'Menunggu stop'}
              </Badge>
              <Button
                size="sm"
                disabled={!stopped || !hasVotes || busy}
                loading={busy}
                onClick={handlePrint}
                title={
                  !stopped
                    ? 'Stop pemilihan dulu di Dashboard'
                    : !hasVotes
                      ? 'Belum ada suara masuk'
                      : 'Unduh berita acara (PDF)'
                }
                className="inline-flex items-center gap-1.5"
              >
                <Printer className="h-4 w-4" aria-hidden /> Cetak PDF
              </Button>
            </div>
          </div>

          <div className="flex flex-col rounded-2xl border-2 border-ink bg-brand-yellow/20 p-4">
            <p className="app-kicker mb-2 flex items-center gap-1.5">
              <Download className="h-3 w-3" aria-hidden /> Export Hasil (CSV)
            </p>
            <p className="flex-1 text-sm font-medium leading-relaxed text-ink/60">
              Rekap suara per kandidat dalam format CSV — bisa dibuka di Excel / Google Sheets.
            </p>
            <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2">
              <Badge tone="amber" className="text-[10px]">
                {rows.length} kandidat
              </Badge>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleExport}
                title="Unduh hasil.csv"
                className="inline-flex items-center gap-1.5"
              >
                <Download className="h-4 w-4" aria-hidden /> Download CSV
              </Button>
            </div>
          </div>
        </div>
      </Panel>

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </main>
  );
}
