'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { generateBeritaAcaraPdf } from '@/lib/pdf/berita-acara';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { ToastStack, useToasts } from '@/components/Toast';
import { ReportsSkeleton } from '@/components/skeletons/ReportsSkeleton';
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

  useEffect(() => {
    load();
    const sb = supabaseBrowser();
    const ch = sb
      .channel('reports')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'candidates' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'election_settings' }, () => load())
      .subscribe((s) => setLive(s === 'SUBSCRIBED'));
    const t = setInterval(load, 5000);
    return () => {
      sb.removeChannel(ch);
      clearInterval(t);
    };
  }, [load]);

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
    <main className="min-h-screen bg-slate-950 text-slate-50 p-4 pb-24 md:pb-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-sky-600/20 flex items-center justify-center">
            <FileText className="h-5 w-5 text-sky-400" aria-hidden />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-none">Laporan &amp; Berita Acara</h1>
            <p className="text-xs text-slate-500 mt-0.5">Rekap hasil, cetak berita acara &amp; export data</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge tone={live ? 'emerald' : 'amber'} pulse={live}>
            {live ? 'LIVE' : 'CONNECTING'}
          </Badge>
          {election && (
            <Badge tone={STATUS_META[election].tone} pulse={election === 'start'}>
              {STATUS_META[election].label}
            </Badge>
          )}
          <span className="text-xs text-slate-400 font-mono" aria-live="polite">
            {total} suara
          </span>
        </div>
      </div>

      <div className="animate-fade-in">
        {/* Rekap suara */}
        <section className="mt-6 rounded-xl bg-slate-800 border border-slate-700/60 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-7 w-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
              <Trophy className="h-4 w-4 text-amber-400" aria-hidden />
            </div>
            <h2 className="font-bold text-base">Rekap Suara</h2>
            {updatedAt && (
              <span className="ml-auto text-[11px] text-slate-500 font-mono">
                diperbarui {updatedAt.toLocaleTimeString('id-ID')}
              </span>
            )}
          </div>

          {!hasVotes ? (
            <div className="mt-2 text-sm text-slate-400 text-center py-8 border border-dashed border-slate-700 rounded-lg">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 text-slate-600" aria-hidden />
              <p>Belum ada suara masuk.</p>
              <p className="text-xs text-slate-500 mt-1">Rekap, berita acara &amp; export aktif setelah minimal 1 suara masuk.</p>
            </div>
          ) : (
            <>
              <ol className="space-y-2 stagger-fade">
                {ranked.map((c, i) => {
                  const pct = total ? (c.vote_count / total) * 100 : 0;
                  const isWinner = i === 0;
                  return (
                    <li
                      key={c.candidate_number}
                      style={{ '--i': Math.min(i, 8) } as React.CSSProperties}
                      className={cn(
                        'rounded-lg border bg-slate-900/60 p-3',
                        isWinner ? 'border-amber-400/50' : 'border-slate-700/40'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                            isWinner ? 'bg-amber-400 text-slate-900' : 'bg-slate-700 text-slate-200'
                          )}
                          aria-label={isWinner ? 'Peringkat 1' : `Peringkat ${i + 1}`}
                        >
                          {isWinner ? <Trophy className="h-4 w-4" aria-hidden /> : i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <span className="line-clamp-2 font-bold">
                              No.{c.candidate_number} {c.name}
                              {c.class_name && (
                                <span className="ml-1.5 text-xs font-medium text-slate-400">Kelas {c.class_name}</span>
                              )}
                            </span>
                            <span className="shrink-0 font-mono text-sm">
                              {c.vote_count}
                              <span className="text-slate-400"> ({pct.toFixed(1)}%)</span>
                            </span>
                          </div>
                          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-700/60" aria-hidden>
                            <div
                              className={cn('h-full rounded-full transition-all', isWinner ? 'bg-amber-400' : 'bg-sky-500')}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
              <div className="mt-3 flex items-center justify-between border-t border-slate-700/60 pt-3 text-sm">
                <span className="text-slate-400">Total suara masuk</span>
                <span className="font-mono font-bold">{total}</span>
              </div>
            </>
          )}
        </section>

        {/* Dokumen & export */}
        <section className="mt-4 rounded-xl bg-slate-800 border border-slate-700/60 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-7 w-7 rounded-lg bg-sky-500/15 flex items-center justify-center">
              <FileDown className="h-4 w-4 text-sky-400" aria-hidden />
            </div>
            <h2 className="font-bold text-base">Dokumen &amp; Export</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Berita acara */}
            <div className="flex flex-col rounded-lg bg-slate-900/80 p-3 border border-slate-700/40">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Printer className="h-3 w-3" aria-hidden /> Berita Acara
              </p>
              <p className="text-sm text-slate-400 flex-1">
                Dokumen PDF hasil final + hash verifikasi. Aktif setelah pemilihan <b className="text-slate-300">di-stop</b> dari Dashboard.
              </p>
              <div className="mt-3 flex items-center justify-between gap-2">
                <Badge tone={stopped && hasVotes ? 'emerald' : 'gray'} className="text-xs">
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

            {/* Export CSV */}
            <div className="flex flex-col rounded-lg bg-slate-900/80 p-3 border border-slate-700/40">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Download className="h-3 w-3" aria-hidden /> Export Hasil (CSV)
              </p>
              <p className="text-sm text-slate-400 flex-1">
                Rekap suara per kandidat dalam format CSV — bisa dibuka di Excel / Google Sheets.
              </p>
              <div className="mt-3 flex items-center justify-between gap-2">
                <Badge tone="sky" className="text-xs">
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
        </section>
      </div>

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </main>
  );
}
