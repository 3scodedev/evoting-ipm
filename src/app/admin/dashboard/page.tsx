'use client';

import { useCallback, useEffect, useState } from 'react';
import { Play, RotateCcw, Square } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { ToastStack, useToasts } from '@/components/Toast';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { setElectionStatus } from '@/app/actions/admin';
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton';
import { isKioskLive } from '@/lib/realtime-channels';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts';

type Row = { candidate_number: number; name: string; vote_count: number };
type ElectionStatus = 'start' | 'pause' | 'stop';

const BAR_COLORS = ['#0ea5e9', '#fbbf24', '#38bdf8', '#a78bfa', '#f87171'];

const STATUS_META: Record<ElectionStatus, { label: string; tone: 'emerald' | 'amber' | 'gray' }> = {
  start: { label: 'Berjalan', tone: 'emerald' },
  pause: { label: 'Jeda', tone: 'amber' },
  stop: { label: 'Selesai', tone: 'gray' },
};

export default function DashboardPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [stats, setStats] = useState<{ votes: number; lastVote: string | null }>({ votes: 0, lastVote: null });
  const [kiosks, setKiosks] = useState<Array<{ id: string; device_name: string; last_ping: string | null }>>([]);
  const [now, setNow] = useState(() => Date.now());
  const [election, setElection] = useState<ElectionStatus | null>(null);
  const [switching, setSwitching] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const [confirmReopen, setConfirmReopen] = useState(false);
  const [ready, setReady] = useState(false);
  const { toasts, push, dismiss } = useToasts();

  const load = useCallback(async () => {
    try {
      const sb = supabaseBrowser();
      const [{ data: c }, { count: votes }, { data: last }, { data: k }, { data: e }] = await Promise.all([
        sb.from('candidates').select('candidate_number, name, vote_count').order('candidate_number'),
        sb.from('votes').select('id', { count: 'exact', head: true }),
        sb.from('votes').select('created_at').order('created_at', { ascending: false }).limit(1),
        sb.from('kiosk_sessions').select('id, device_name, last_ping').eq('is_active', true).order('last_ping', { ascending: false }),
        sb.from('election_settings').select('status').eq('id', 1).single(),
      ]);
      setRows((c as Row[]) ?? []);
      setStats({ votes: votes ?? 0, lastVote: last?.[0]?.created_at ?? null });
      setKiosks((k as typeof kiosks) ?? []);
      if (e?.status) setElection(e.status as ElectionStatus);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    load();
    const sb = supabaseBrowser();
    const ch = sb
      .channel('dash')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'candidates' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kiosks' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kiosk_sessions' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'election_settings' }, (p) => {
        const s = (p.new as { status?: ElectionStatus } | null)?.status;
        if (s) setElection(s);
        else load();
      })
      .subscribe();
    const t = setInterval(load, 5000);
    const tick = setInterval(() => setNow(Date.now()), 5000);
    return () => {
      sb.removeChannel(ch);
      clearInterval(t);
      clearInterval(tick);
    };
  }, [load]);

  async function handleToggleElection() {
    if (!election || switching) return;
    if (election === 'start') {
      setConfirmStop(true);
      return;
    }
    if (election === 'stop') {
      setConfirmReopen(true);
      return;
    }
    // pause -> start
    setSwitching(true);
    const res = await setElectionStatus({ status: 'start' });
    setSwitching(false);
    if (!res.success) { push('error', res.error.message); return; }
    setElection('start');
    push('success', 'Pemilihan dimulai — semua bilik dibuka.');
  }

  async function confirmStopElection() {
    setSwitching(true);
    const res = await setElectionStatus({ status: 'stop' });
    setSwitching(false);
    setConfirmStop(false);
    if (!res.success) { push('error', res.error.message); return; }
    setElection('stop');
    push('success', 'Pemilihan di-stop dan hasil difinalkan.');
  }

  async function confirmReopenElection() {
    setSwitching(true);
    const res = await setElectionStatus({ status: 'start' });
    setSwitching(false);
    setConfirmReopen(false);
    if (!res.success) { push('error', res.error.message); return; }
    setElection('start');
    push('success', 'Pemilihan dibuka lagi — finalisasi sebelumnya dibatalkan.');
  }

  if (!ready) return <DashboardSkeleton />;

  const liveCount = kiosks.filter((k) => isKioskLive(k.last_ping, now)).length;
  const lastVoteLabel = stats.lastVote ? new Date(stats.lastVote).toLocaleTimeString('id-ID') : '—';

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 animate-fade-in">
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <strong>Command Center</strong>
        <div className="flex items-center gap-2">
          {election && (
            <Badge tone={STATUS_META[election].tone} pulse={election === 'start'}>
              {STATUS_META[election].label}
            </Badge>
          )}
          {election === 'start' ? (
            <Button size="sm" variant="danger" loading={switching} onClick={handleToggleElection} aria-label="Stop pemilihan" title="Stop — kunci semua bilik" className="inline-flex items-center gap-1.5">
              <Square className="h-4 w-4" aria-hidden="true" />
              Stop
            </Button>
          ) : election === 'pause' ? (
            <Button size="sm" loading={switching} onClick={handleToggleElection} aria-label="Start pemilihan" title="Start — buka semua bilik" className="inline-flex items-center gap-1.5">
              <Play className="h-4 w-4" aria-hidden="true" />
              Start
            </Button>
          ) : election === 'stop' ? (
            <Button size="sm" variant="accent" loading={switching} onClick={handleToggleElection} aria-label="Buka lagi pemilihan" title="Buka lagi — finalisasi dibatalkan" className="inline-flex items-center gap-1.5">
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Start
            </Button>
          ) : (
            <Button size="sm" disabled aria-label="Memuat status pemilihan">…</Button>
          )}
        </div>
      </header>
      <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 stagger-fade">
        {[
          ['Total Suara Masuk', stats.votes],
          ['Bilik Live', liveCount],
          ['Suara Terakhir', lastVoteLabel],
        ].map(([t, v], i) => (
          <div key={t as string} style={{ '--i': i } as React.CSSProperties} className="rounded-xl bg-slate-800 p-4">
            <p className="text-slate-400 text-sm">{t}</p>
            <p className="text-3xl font-bold font-mono">{String(v)}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-3 p-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl bg-slate-800 p-4">
          <h2 className="font-bold">Perolehan Suara — Diagram Batang</h2>
          {rows.length === 0 ? (
            <p className="text-slate-400 mt-2">Belum ada suara masuk.</p>
          ) : (
            <>
              <div className="mt-3 h-72" role="img" aria-label={`Diagram batang perolehan suara: ${rows.map((c) => `No.${c.candidate_number} ${c.name} ${c.vote_count} suara`).join(', ')}`}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rows.map((c) => ({ ...c, label: `No.${c.candidate_number} ${c.name}` }))} layout="vertical" margin={{ top: 0, right: 50, left: 16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                    <XAxis type="number" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 13 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="label" stroke="#94a3b8" tick={{ fill: '#f8fafc', fontSize: 13 }} width={170} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f8fafc' }}
                      formatter={(value) => {
                        const total = rows.reduce((a, c) => a + c.vote_count, 0);
                        const pct = total ? ((Number(value) / total) * 100).toFixed(1) : '0.0';
                        return [`${value} suara (${pct}%)`, 'Perolehan'];
                      }}
                    />
                    <Bar dataKey="vote_count" radius={[0, 8, 8, 0]} isAnimationActive>
                      {rows.map((c, i) => (
                        <Cell key={c.candidate_number} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                      ))}
                      <LabelList dataKey="vote_count" position="right" fill="#f8fafc" fontSize={14} fontWeight={700} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <table className="sr-only">
                <caption>Perolehan suara per kandidat</caption>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.candidate_number}><td>No.{c.candidate_number} {c.name}</td><td>{c.vote_count} suara</td></tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
        <div className="rounded-xl bg-slate-800 p-4">
          <h2 className="font-bold">Bilik Live</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {kiosks.map((k) => {
              const liveK = isKioskLive(k.last_ping, now);
              return <li key={k.id} className="flex justify-between"><span>{k.device_name ?? 'Device'}</span><Badge tone={liveK ? 'emerald' : 'gray'} pulse={liveK}>{liveK ? 'Live' : 'Offline'}</Badge></li>;
            })}
            {kiosks.length === 0 && <li className="text-slate-400">Belum ada device aktif.</li>}
          </ul>
        </div>
      </div>
      <ConfirmDialog
        open={confirmStop}
        title="Stop pemilihan?"
        message="Semua bilik dikunci dan hasil difinalkan. Tidak bisa dibuka lagi."
        confirmLabel="Ya, Stop"
        danger
        busy={switching}
        onCancel={() => { if (!switching) setConfirmStop(false); }}
        onConfirm={confirmStopElection}
      />
      <ConfirmDialog
        open={confirmReopen}
        title="Buka lagi pemilihan?"
        message="Finalisasi hasil sebelumnya dibatalkan dan bilik dibuka kembali."
        confirmLabel="Ya, Start"
        busy={switching}
        onCancel={() => { if (!switching) setConfirmReopen(false); }}
        onConfirm={confirmReopenElection}
      />
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </main>
  );
}
