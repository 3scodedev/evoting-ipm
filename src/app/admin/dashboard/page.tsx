'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  Clock3,
  LayoutDashboard,
  LogOut,
  MonitorSmartphone,
  Play,
  RotateCcw,
  Square,
  Trash2,
  Vote,
} from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { ToastStack, useToasts } from '@/components/Toast';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageHeader, Panel } from '@/components/admin/Panel';
import { useAdminRole } from '@/components/admin/AdminRole';
import { resetVotes, setElectionStatus } from '@/app/actions/admin';
import { listCandidatesAdmin } from '@/app/actions/candidates';
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton';
import { useDebouncedCallback } from '@/lib/use-debounced-callback';
import { isKioskLive } from '@/lib/realtime-channels';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts';

type Row = { candidate_number: number; name: string; vote_count: number };
type ElectionStatus = 'start' | 'pause' | 'stop';

const BAR_COLORS = ['#28a8e4', '#ffe81a', '#62c7f3', '#ee3d2e', '#131313'];

const STATUS_META: Record<ElectionStatus, { label: string; tone: 'emerald' | 'amber' | 'gray' }> = {
  start: { label: 'Berjalan', tone: 'emerald' },
  pause: { label: 'Jeda', tone: 'amber' },
  stop: { label: 'Selesai', tone: 'gray' },
};

/** Label sumbu X: nomor kandidat + nama lengkap, dipecah maksimal 2 baris. */
function CandidateAxisTick({
  x = 0,
  y = 0,
  payload,
  photos,
}: {
  x?: number;
  y?: number;
  payload?: { value?: string | number };
  photos?: Record<number, string>;
}) {
  const [number, ...rest] = String(payload?.value ?? '').split(' ');
  const name = rest.join(' ');
  const candidateNumber = Number(number.replace(/\D/g, ''));
  const photo = photos?.[candidateNumber];
  const lines: string[] = [];
  let current = '';
  for (const word of name.split(' ')) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > 20 && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  const visible = lines.slice(0, 2);
  if (lines.length > 2 && visible[1]) visible[1] = `${visible[1].slice(0, 18)}…`;
  const photoY = 15 + visible.length * 15 + 4;
  const clipId = `chart-photo-clip-${candidateNumber}`;

  return (
    <g transform={`translate(${x},${y})`}>
      <text textAnchor="middle" fill="#131313">
        <tspan x={0} dy={15} fontSize={10} fontWeight={800} letterSpacing="0.08em" fill="rgba(19,19,19,0.45)">
          {number}
        </tspan>
        {visible.map((line, i) => (
          <tspan key={`${line}-${i}`} x={0} dy={15} fontSize={12} fontWeight={700}>
            {line}
          </tspan>
        ))}
      </text>
      {photo ? (
        <>
          <defs>
            <clipPath id={clipId}>
              <rect x={-22} y={photoY} width={44} height={44} rx={11} />
            </clipPath>
          </defs>
          <image
            href={photo}
            x={-22}
            y={photoY}
            width={44}
            height={44}
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#${clipId})`}
          />
          <rect x={-22} y={photoY} width={44} height={44} rx={11} fill="none" stroke="#131313" strokeWidth={2} />
        </>
      ) : (
        <>
          <rect x={-22} y={photoY} width={44} height={44} rx={11} fill="#e8f5fb" stroke="#131313" strokeWidth={2} />
          <text x={0} y={photoY + 29} textAnchor="middle" fontSize={18} fontWeight={800} fill="rgba(19,19,19,0.35)">
            {name.charAt(0)}
          </text>
        </>
      )}
    </g>
  );
}

/** Grafik perolehan suara yang dipakai admin & panitia. */
function VotesChart({ rows, photos }: { rows: Row[]; photos: Record<number, string> }) {
  if (rows.length === 0) {
    return (
      <div className="app-empty">
        <BarChart3 className="mx-auto mb-2 h-8 w-8 text-ink/25" aria-hidden />
        <p className="font-semibold">Belum ada suara masuk.</p>
        <p className="mt-1 text-xs">Diagram akan muncul otomatis saat pemilih mengirim suara.</p>
      </div>
    );
  }

  return (
    <>
      <div className="h-96" role="img" aria-label={`Diagram batang perolehan suara: ${rows.map((c) => `No.${c.candidate_number} ${c.name} ${c.vote_count} suara`).join(', ')}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows.map((c) => ({ ...c, label: `No.${c.candidate_number} ${c.name}` }))}
            layout="horizontal"
            margin={{ top: 28, right: 16, left: 0, bottom: 0 }}
            barCategoryGap="24%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(19,19,19,0.12)" vertical={false} />
            <XAxis
              type="category"
              dataKey="label"
              tick={<CandidateAxisTick photos={photos} />}
              stroke="#131313"
              axisLine={{ stroke: '#131313' }}
              tickLine={false}
              interval={0}
              height={104}
              tickMargin={4}
            />
            <YAxis
              type="number"
              stroke="#131313"
              tick={{ fill: 'rgba(19,19,19,0.55)', fontSize: 12, fontWeight: 600 }}
              axisLine={{ stroke: '#131313' }}
              tickLine={false}
              allowDecimals={false}
              width={32}
              domain={[0, (dataMax: number) => Math.max(1, Math.ceil(dataMax * 1.15))]}
            />
            <Tooltip
              cursor={{ fill: 'rgba(98,199,243,0.14)' }}
              contentStyle={{
                backgroundColor: '#fffdf7',
                border: '2px solid #131313',
                borderRadius: 14,
                color: '#131313',
                boxShadow: '4px 4px 0 #131313',
                fontWeight: 600,
              }}
              formatter={(value) => {
                const total = rows.reduce((a, c) => a + c.vote_count, 0);
                const pct = total ? ((Number(value) / total) * 100).toFixed(1) : '0.0';
                return [`${value} suara (${pct}%)`, 'Perolehan'];
              }}
            />
            <Bar dataKey="vote_count" radius={[10, 10, 0, 0]} maxBarSize={84} isAnimationActive>
              {rows.map((c, i) => (
                <Cell key={c.candidate_number} fill={BAR_COLORS[i % BAR_COLORS.length]} />
              ))}
              <LabelList dataKey="vote_count" position="top" fill="#131313" fontSize={14} fontWeight={800} />
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
  );
}

/** Tampilan terbatas panitia: hanya total suara masuk + perolehan per kandidat. */
function PanitiaDashboard({ rows, photos }: { rows: Row[]; photos: Record<number, string> }) {
  const router = useRouter();
  const totalVotes = rows.reduce((sum, c) => sum + c.vote_count, 0);

  async function logout() {
    try {
      await supabaseBrowser().auth.signOut();
    } catch {
      /* lanjut redirect */
    }
    router.push('/admin/login');
  }

  return (
    <main className="app-page animate-fade-in">
      <PageHeader
        icon={BarChart3}
        kicker="Pantauan panitia"
        title="Hasil Pemilihan"
        description="Total suara masuk dan perolehan tiap kandidat, diperbarui otomatis."
      >
        <span className="app-chip bg-brand-sky-light text-[10px]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-red" aria-hidden />
          Real-time
        </span>
        <Button size="sm" variant="ghost" onClick={logout} aria-label="Keluar dari dashboard">
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Keluar
        </Button>
      </PageHeader>

      <div className="relative mt-5 overflow-hidden rounded-[22px] border-2 border-ink bg-ink p-5 text-white shadow-hard-sky">
        <div className="absolute -right-7 -top-7 h-28 w-28 rounded-full border-2 border-white/15" aria-hidden />
        <div className="flex items-start justify-between gap-3">
          <p className="app-kicker !text-white/55">Total suara masuk</p>
          <span className="grid h-9 w-9 place-items-center rounded-full border-2 border-white/25 text-brand-yellow" aria-hidden>
            <Vote className="h-4 w-4" />
          </span>
        </div>
        <p className="mt-3 font-[family-name:var(--font-mono)] text-4xl font-bold tracking-tight">
          {totalVotes}
        </p>
        <p className="mt-1 text-xs font-semibold text-white/45">Suara tercatat di seluruh bilik</p>
      </div>

      <div className="mt-4">
        <Panel icon={BarChart3} title="Perolehan Suara" tone="yellow">
          <VotesChart rows={rows} photos={photos} />
        </Panel>
      </div>
    </main>
  );
}

export default function DashboardPage() {
  const role = useAdminRole();
  const isAdmin = role === 'admin';
  const [rows, setRows] = useState<Row[]>([]);
  const [stats, setStats] = useState<{ votes: number; lastVote: string | null }>({ votes: 0, lastVote: null });
  const [kiosks, setKiosks] = useState<Array<{ id: string; device_name: string; last_ping: string | null }>>([]);
  const [now, setNow] = useState(() => Date.now());
  const [election, setElection] = useState<ElectionStatus | null>(null);
  const [switching, setSwitching] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const [confirmReopen, setConfirmReopen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetting, setResetting] = useState(false);
  const [ready, setReady] = useState(false);
  const [photos, setPhotos] = useState<Record<number, string>>({});
  const { toasts, push, dismiss } = useToasts();

  const load = useCallback(async () => {
    try {
      const sb = supabaseBrowser();
      if (!isAdmin) {
        const { data: c } = await sb
          .from('candidates')
          .select('candidate_number, name, vote_count')
          .order('candidate_number');
        const list = (c as Row[]) ?? [];
        setRows(list);
        setStats({ votes: list.reduce((sum, row) => sum + row.vote_count, 0), lastVote: null });
        return;
      }
      // Total suara diturunkan dari `candidates.vote_count` (sumber yang sama
      // dipakai Berita Acara & export). Query `count: 'exact'` di tabel votes
      // dihapus: di 18k baris itu sequential scan yang makin mahal tiap reload.
      // `last_vote` tetap di-query karena murah (index idx_votes_created, LIMIT 1)
      // dan dibutuhkan untuk mengisi "Suara terakhir" saat halaman pertama dibuka.
      const [{ data: c }, { data: last }, { data: k }, { data: e }] = await Promise.all([
        sb.from('candidates').select('candidate_number, name, vote_count').order('candidate_number'),
        sb.from('votes').select('created_at').order('created_at', { ascending: false }).limit(1),
        sb.from('kiosk_sessions').select('id, device_name, last_ping').eq('is_active', true).order('last_ping', { ascending: false }),
        sb.from('election_settings').select('status').eq('id', 1).single(),
      ]);
      const list = (c as Row[]) ?? [];
      setRows(list);
      setStats({ votes: list.reduce((sum, row) => sum + row.vote_count, 0), lastVote: last?.[0]?.created_at ?? null });
      setKiosks((k as typeof kiosks) ?? []);
      if (e?.status) setElection(e.status as ElectionStatus);
    } finally {
      setReady(true);
    }
  }, [isAdmin]);

  // Event realtime yang tidak bisa dipatch langsung dari payload digabung di
  // sini, supaya burst (mis. 5 bilik ping bersamaan) jadi satu reload.
  const debouncedLoad = useDebouncedCallback(load, 500);

  const loadPhotos = useCallback(async () => {
    try {
      const res = await listCandidatesAdmin();
      if (!res.success) return;
      const next: Record<number, string> = {};
      for (const c of res.data.rows) {
        if (c.photo_url) next[c.candidate_number] = c.photo_url;
      }
      setPhotos(next);
    } catch {
      // Grafik tetap tampil tanpa foto kalau signed URL gagal dimuat.
    }
  }, []);

  useEffect(() => {
    load();
    loadPhotos();
    const photoTimer = setInterval(loadPhotos, 30 * 60 * 1000);
    const sb = supabaseBrowser();
    const ch = sb
      .channel('dash')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'candidates' }, (p) => {
        // UPDATE/INSERT membawa seluruh kolom (replica identity DEFAULT), jadi
        // vote_count terbaru bisa langsung dipakai tanpa query sama sekali.
        const next = p.new as Partial<Row> | null;
        const num = next?.candidate_number;
        const count = next?.vote_count;
        if (typeof num === 'number' && typeof count === 'number') {
          setRows((cur) => {
            const idx = cur.findIndex((r) => r.candidate_number === num);
            if (idx === -1) return cur; // kandidat baru → biar load() yang urus urutan
            const copy = [...cur];
            copy[idx] = { ...copy[idx], name: next?.name ?? copy[idx].name, vote_count: count };
            return copy;
          });
          return;
        }
        // DELETE atau payload tak lengkap → refetch teredam.
        debouncedLoad();
      });
    if (isAdmin) {
      ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'votes' }, (p) => {
        // Satu suara masuk: cukup tambah counter lokal + catat waktunya.
        // Tanpa query — inilah yang memangkas ~180k query jadi nol.
        const created = (p.new as { created_at?: string } | null)?.created_at;
        setStats((s) => ({ votes: s.votes + 1, lastVote: created ?? s.lastVote }));
      })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'votes' }, () => {
          // Hanya terjadi saat Reset Suara — jarang, jadi refetch penuh aman.
          load();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'kiosks' }, () => debouncedLoad())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'kiosk_sessions' }, () => debouncedLoad())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'election_settings' }, (p) => {
          const s = (p.new as { status?: ElectionStatus } | null)?.status;
          if (s) setElection(s);
          else load();
        });
    }
    ch.subscribe();
    // Realtime adalah jalur utama. Polling 30 dtk hanya resync otoritatif:
    // menangkap event yang terlewat saat WebSocket putus dan mengoreksi drift.
    const t = setInterval(load, 30_000);
    const tick = setInterval(() => setNow(Date.now()), 5000);
    return () => {
      sb.removeChannel(ch);
      clearInterval(photoTimer);
      clearInterval(t);
      clearInterval(tick);
    };
  }, [load, loadPhotos, isAdmin, debouncedLoad]);

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

  function handleResetVotes() {
    if (!election || resetting) return;
    if (election === 'start') {
      push('error', 'Stop atau jeda pemilihan dulu sebelum reset suara.');
      return;
    }
    setResetError('');
    setConfirmReset(true);
  }

  async function confirmResetVotes(password?: string) {
    if (!password) return;
    setResetting(true);
    setResetError('');
    const res = await resetVotes({ password });
    setResetting(false);
    if (!res.success) {
      setResetError(res.error.message);
      push('error', res.error.message);
      return;
    }
    setConfirmReset(false);
    await load();
    const deleted = res.data.deleted;
    push(
      'success',
      deleted > 0
        ? `${deleted} suara dihapus. Perolehan semua kandidat kembali ke 0.`
        : 'Data suara sudah bersih. Semua perolehan berada di 0.'
    );
  }

  if (!ready) return <DashboardSkeleton />;
  if (!isAdmin) return <PanitiaDashboard rows={rows} photos={photos} />;

  const liveCount = kiosks.filter((k) => isKioskLive(k.last_ping, now)).length;
  const lastVoteLabel = stats.lastVote ? new Date(stats.lastVote).toLocaleTimeString('id-ID') : '—';

  return (
    <main className="app-page animate-fade-in">
      <PageHeader
        icon={LayoutDashboard}
        kicker="Command Center"
        title="Dashboard Live"
        description="Pantau perolehan suara, status pemilihan, dan bilik yang aktif secara real-time."
      >
        {election && (
          <Badge tone={STATUS_META[election].tone} pulse={election === 'start'}>
            {STATUS_META[election].label}
          </Badge>
        )}
        <Button
          size="sm"
          variant="ghost"
          loading={resetting}
          disabled={!election}
          onClick={handleResetVotes}
          aria-label="Reset semua suara"
          title={election === 'start' ? 'Stop atau jeda pemilihan dulu' : 'Hapus semua suara dan reset perolehan'}
          className="border-brand-red/35 bg-brand-red/5 text-brand-red hover:border-brand-red hover:bg-brand-red/10"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Reset Suara
        </Button>
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
      </PageHeader>

      <div className="stagger-fade mt-5 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
        <div
          style={{ '--i': 0 } as React.CSSProperties}
          className="relative overflow-hidden rounded-[22px] border-2 border-ink bg-ink p-5 text-white shadow-hard-sky"
        >
          <div className="absolute -right-7 -top-7 h-28 w-28 rounded-full border-2 border-white/15" aria-hidden />
          <div className="flex items-start justify-between gap-3">
            <p className="app-kicker !text-white/55">Total suara masuk</p>
            <span className="grid h-9 w-9 place-items-center rounded-full border-2 border-white/25 text-brand-yellow" aria-hidden>
              <Vote className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 font-[family-name:var(--font-mono)] text-4xl font-bold tracking-tight">
            {stats.votes}
          </p>
          <p className="mt-1 text-xs font-semibold text-white/45">Suara tercatat di seluruh bilik</p>
        </div>

        <div
          style={{ '--i': 1 } as React.CSSProperties}
          className="relative overflow-hidden rounded-[22px] border-2 border-ink bg-brand-sky-light p-5 shadow-hard-yellow"
        >
          <div className="absolute -right-6 -top-8 h-28 w-28 rounded-full bg-white/30" aria-hidden />
          <div className="flex items-start justify-between gap-3">
            <p className="app-kicker">Bilik live</p>
            <span className="grid h-9 w-9 place-items-center rounded-full border-2 border-ink bg-brand-yellow shadow-[2px_2px_0_#131313]" aria-hidden>
              <MonitorSmartphone className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 font-[family-name:var(--font-mono)] text-4xl font-bold tracking-tight">
            {liveCount}
          </p>
          <p className="mt-1 text-xs font-semibold text-ink/55">
            {kiosks.length ? `dari ${kiosks.length} device aktif` : 'Belum ada device aktif'}
          </p>
        </div>

        <div
          style={{ '--i': 2 } as React.CSSProperties}
          className="relative overflow-hidden rounded-[22px] border-2 border-ink bg-white p-5 shadow-hard-sm sm:col-span-2 xl:col-span-1"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="app-kicker">Suara terakhir</p>
            <span className="grid h-9 w-9 place-items-center rounded-full border-2 border-ink bg-brand-red text-white shadow-[2px_2px_0_#131313]" aria-hidden>
              <Clock3 className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 font-[family-name:var(--font-mono)] text-4xl font-bold tracking-tight">
            {lastVoteLabel}
          </p>
          <p className="mt-1 text-xs font-semibold text-ink/50">Waktu suara terbaru masuk</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel
          icon={BarChart3}
          title="Perolehan Suara"
          tone="yellow"
          className="xl:col-span-2"
          aside={
            <span className="app-chip bg-brand-sky-light text-[10px]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-red" aria-hidden />
              Real-time
            </span>
          }
        >
          <VotesChart rows={rows} photos={photos} />
        </Panel>

        <Panel
          icon={MonitorSmartphone}
          title="Bilik Live"
          aside={<Badge tone={liveCount ? 'emerald' : 'gray'}>{liveCount}/{kiosks.length}</Badge>}
        >
          <ul className="space-y-2 text-sm">
            {kiosks.map((k) => {
              const liveK = isKioskLive(k.last_ping, now);
              return (
                <li key={k.id} className="flex items-center justify-between gap-3 rounded-full border-2 border-ink/10 bg-white/70 px-3 py-2 font-semibold">
                  <span className="truncate">{k.device_name ?? 'Device'}</span>
                  <Badge tone={liveK ? 'emerald' : 'gray'} pulse={liveK}>{liveK ? 'Live' : 'Offline'}</Badge>
                </li>
              );
            })}
            {kiosks.length === 0 && (
              <li className="app-empty !py-7">
                <MonitorSmartphone className="mx-auto mb-2 h-7 w-7 text-ink/25" aria-hidden />
                <span className="text-xs font-semibold">Belum ada device aktif.</span>
              </li>
            )}
          </ul>
        </Panel>
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Reset semua suara?"
        message={`${stats.votes} suara akan dihapus permanen. Perolehan semua kandidat di-reset ke 0, status pemilihan kembali ke Jeda, dan tindakan ini tidak bisa dibatalkan.`}
        confirmLabel="Ya, Reset Suara"
        danger
        busy={resetting}
        requirePassword
        passwordLabel="Password reset"
        passwordPlaceholder="Masukkan password reset"
        passwordHint="Bukan password login admin — ini RESET_VOTES_PASSWORD yang diatur panitia di env server."
        error={resetError}
        onCancel={() => { if (!resetting) { setConfirmReset(false); setResetError(''); } }}
        onConfirm={confirmResetVotes}
      />
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
