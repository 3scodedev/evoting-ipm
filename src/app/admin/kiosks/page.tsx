'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { ToastStack, useToasts } from '@/components/Toast';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageHeader, Panel } from '@/components/admin/Panel';
import { KiosksSkeleton } from '@/components/skeletons/KiosksSkeleton';
import {
  generateKioskToken,
  setKioskMaxSessions,
  forceLogoutSession,
  clearInactiveSessions,
  getKioskSessions,
} from '@/app/actions/admin';
import { REALTIME_CHANNELS, isKioskLive } from '@/lib/realtime-channels';
import {
  MonitorSmartphone,
  Key,
  Users,
  Shield,
  Copy,
  Clock,
  CheckCircle2,
  Printer,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type MasterKiosk = { id: string; kiosk_name: string; last_ping: string | null; token: string | null };
type Session = {
  id: string; device_name: string; user_agent: string; ip_address: string;
  logged_in_at: string; last_ping: string | null; is_active: boolean;
};

function timeAgo(lastPing: string | null, now: number) {
  if (!lastPing) return '—';
  const s = Math.max(0, Math.floor((now - new Date(lastPing).getTime()) / 1000));
  if (s < 5) return 'baru saja';
  if (s < 60) return `${s} dtk lalu`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} mnt lalu`;
  return `${Math.floor(m / 60)} jam lalu`;
}

function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="flex items-center gap-2">
      <code className="min-w-0 flex-1 truncate font-mono text-xl font-bold tracking-[0.22em] text-ink">
        {value}
      </code>
      <button
        onClick={handleCopy}
        className={cn(
          'grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-ink bg-white text-ink shadow-[2px_2px_0_#131313] transition hover:bg-brand-yellow active:translate-x-[1px] active:translate-y-[1px] active:shadow-none',
          copied && 'bg-brand-sky'
        )}
        aria-label="Salin token"
        title="Salin token"
      >
        {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}

export default function KiosksPage() {
  const [master, setMaster] = useState<MasterKiosk | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [maxSessions, setMaxSessions] = useState<number | null>(null);
  const [live, setLive] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const { toasts, push, dismiss } = useToasts();

  // Token state
  const [pendingGenerate, setPendingGenerate] = useState(false);

  // Max sessions state — null until loaded to avoid flash
  const [maxInput, setMaxInput] = useState<string>('');
  const [savingMax, setSavingMax] = useState(false);

  // Force logout
  const [pendingLogout, setPendingLogout] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await getKioskSessions();
      if (!res.success) { push('error', res.error.message); return; }
      setMaster(res.data.master);
      setSessions(res.data.sessions);
      setMaxSessions(res.data.maxSessions);
      setMaxInput(String(res.data.maxSessions));
    } finally {
      setReady(true);
    }
  }, [push]);

  useEffect(() => {
    load();
    const sb = supabaseBrowser();
    const ch = sb
      .channel(REALTIME_CHANNELS.kioskSessions)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kiosk_sessions' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kiosks' }, () => load())
      .subscribe((s) => setLive(s === 'SUBSCRIBED'));
    const tick = setInterval(() => setNow(Date.now()), 5_000);
    // Fallback kalau WebSocket putus / publication realtime belum aktif:
    // session tetap ter-update tanpa harus reload halaman.
    const poll = setInterval(load, 10_000);
    const refreshOnVisible = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', refreshOnVisible);
    window.addEventListener('focus', refreshOnVisible);
    return () => {
      sb.removeChannel(ch);
      clearInterval(tick);
      clearInterval(poll);
      document.removeEventListener('visibilitychange', refreshOnVisible);
      window.removeEventListener('focus', refreshOnVisible);
    };
  }, [load]);

  async function confirmGenerateToken() {
    setPendingGenerate(false);
    setBusy(true);
    const res = await generateKioskToken();
    setBusy(false);
    if (!res.success) { push('error', res.error.message); return; }
    push('success', 'Token bilik baru berhasil dibuat. Semua device harus login ulang.');
    load();
  }

  async function handleSaveMax() {
    if (maxInput === '' || maxSessions === null) return;
    const n = parseInt(maxInput, 10);
    if (isNaN(n) || n < 1 || n > 100) { push('error', 'Masukkan angka 1–100'); return; }
    setSavingMax(true);
    const res = await setKioskMaxSessions({ maxSessions: n });
    setSavingMax(false);
    if (!res.success) { push('error', res.error.message); return; }
    setMaxSessions(n);
    push('success', `Max session diatur ke ${n}.`);
  }

  async function handleForceLogout(sessionId: string) {
    setPendingLogout(sessionId);
  }

  async function confirmForceLogout() {
    if (!pendingLogout) return;
    setBusy(true);
    const res = await forceLogoutSession({ sessionId: pendingLogout });
    setBusy(false);
    setPendingLogout(null);
    if (!res.success) { push('error', res.error.message); return; }
    push('success', 'Session dikeluarkan.');
    load();
  }

  async function handleClearInactive() {
    setBusy(true);
    const res = await clearInactiveSessions();
    setBusy(false);
    if (!res.success) { push('error', res.error.message); return; }
    push('success', `${res.data.cleared} sesi inactive dibersihkan.`);
    load();
  }

  if (!ready) return <KiosksSkeleton />;

  const activeCount = sessions.filter((s) => s.is_active).length;
  const liveCount = sessions.filter((s) => s.is_active && isKioskLive(s.last_ping, now)).length;

  return (
    <main className="app-page animate-fade-in">
      <PageHeader
        icon={MonitorSmartphone}
        kicker="Command Center"
        title="Manajemen Bilik"
        description="Kelola kredensial, batas device, dan sesi bilik suara dari satu tempat."
      >
        <Badge tone={live ? 'emerald' : 'amber'} pulse={live}>
          {live ? 'Realtime' : 'Menghubungkan'}
        </Badge>
        <span className="app-chip font-mono text-[10px]" aria-live="polite">
          {activeCount} sesi ({liveCount} live){maxSessions !== null && ` / ${maxSessions}`}
        </span>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleClearInactive}
          disabled={busy}
          aria-label="Bersihkan sesi inactive"
        >
          Bersihkan Inactive
        </Button>
      </PageHeader>

      <Panel
        icon={Key}
        title="Kredensial Master Bilik"
        tone="yellow"
        className="mt-4"
        aside={master && <span className="app-chip font-mono text-[10px]">{master.kiosk_name}</span>}
      >
        {!master ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-medium text-ink/55">
              Belum ada master bilik. Generate token untuk membuatnya.
            </p>
            <Button size="sm" onClick={() => setPendingGenerate(true)} disabled={busy}>
              Generate Token
            </Button>
          </div>
        ) : (
          <div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border-2 border-ink bg-brand-sky-light/45 p-4">
                <p className="app-kicker mb-2 flex items-center gap-1.5">
                  <Shield className="h-3 w-3" aria-hidden /> Token Bilik
                </p>
                {master.token ? (
                  <CopyField value={master.token} />
                ) : (
                  <p className="text-sm font-medium text-ink/50">
                    Belum ada token. Klik Generate Token untuk membuatnya.
                  </p>
                )}
              </div>
              <div className="rounded-2xl border-2 border-ink bg-white p-4">
                <p className="app-kicker mb-2 flex items-center gap-1.5">
                  <Clock className="h-3 w-3" aria-hidden /> Last Ping
                </p>
                <p className="font-mono text-xl font-bold text-ink">
                  {master.last_ping ? timeAgo(master.last_ping, now) : '—'}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t-2 border-dashed border-ink/15 pt-4">
              <p className="max-w-md text-xs font-semibold leading-relaxed text-ink/45">
                Token 8 huruf kapital dipakai semua device bilik untuk login &amp; validasi.
                Tetap sama sampai kamu generate ulang.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => window.open('/admin/kiosks/print', '_blank', 'noopener')}
                  disabled={busy || !master.token}
                  title={master.token ? 'Cetak kartu token untuk ditempel di bilik' : 'Belum ada token'}
                  className="inline-flex items-center gap-1.5"
                >
                  <Printer className="h-4 w-4" /> Print Token
                </Button>
                <Button
                  size="sm"
                  variant="accent"
                  onClick={() => setPendingGenerate(true)}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5"
                >
                  <Key className="h-4 w-4" /> Generate Token
                </Button>
              </div>
            </div>
          </div>
        )}
      </Panel>

      <Panel icon={Users} title="Pengaturan Session" className="mt-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-semibold text-ink/65" htmlFor="max-sessions">
            Jumlah device maksimum login bersamaan
          </label>
          <input
            id="max-sessions"
            type="number"
            min={1}
            max={100}
            value={maxInput}
            onChange={(e) => setMaxInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveMax(); }}
            className="app-input w-24 text-center font-mono font-bold"
          />
          <Button
            size="sm"
            onClick={handleSaveMax}
            loading={savingMax}
            disabled={maxInput === '' || maxSessions === null || parseInt(maxInput, 10) === maxSessions}
            className="inline-flex items-center gap-1.5"
          >
            Simpan
          </Button>
        </div>
      </Panel>

      <Panel
        icon={MonitorSmartphone}
        title="Session Aktif"
        tone="yellow"
        className="mt-4"
        bodyClassName="p-3 sm:p-4"
        aside={sessions.length > 0 && <Badge tone="sky">{sessions.length} total</Badge>}
      >
        {sessions.length === 0 ? (
          <div className="app-empty">
            <MonitorSmartphone className="mx-auto mb-2 h-8 w-8 text-ink/25" aria-hidden />
            <p className="font-semibold">Belum ada session aktif.</p>
            <p className="mt-1 text-xs">Session muncul saat bilik login.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border-2 border-ink">
            <table className="app-table">
              <thead>
                <tr>
                  <th>Device</th>
                  <th>IP</th>
                  <th className="hidden md:table-cell">User Agent</th>
                  <th>Login</th>
                  <th>Last Ping</th>
                  <th>Status</th>
                  <th><span className="sr-only">Aksi</span></th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => {
                  const isLive = s.is_active && isKioskLive(s.last_ping, now);
                  return (
                    <tr key={s.id}>
                      <td className="font-mono font-bold text-ink">
                        {s.device_name ?? '—'}
                      </td>
                      <td className="font-mono text-xs text-ink/55">
                        {s.ip_address ?? '—'}
                      </td>
                      <td className="hidden max-w-[220px] truncate text-xs text-ink/55 md:table-cell" title={s.user_agent ?? ''}>
                        {s.user_agent ?? '—'}
                      </td>
                      <td className="text-xs font-medium text-ink/65">
                        {new Date(s.logged_in_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="text-xs font-medium text-ink/65">
                        {s.last_ping ? timeAgo(s.last_ping, now) : '—'}
                      </td>
                      <td>
                        <Badge tone={isLive ? 'emerald' : 'gray'} pulse={isLive}>
                          {isLive ? 'Live' : 'Offline'}
                        </Badge>
                      </td>
                      <td className="text-right">
                        {s.is_active && (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleForceLogout(s.id)}
                            className="inline-flex h-7 items-center gap-1 px-2.5 text-[11px]"
                          >
                            Keluarkan
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <ConfirmDialog
        open={!!pendingLogout}
        title="Keluarkan session?"
        message="Session ini akan dinonaktifkan. Pemakai harus login ulang."
        confirmLabel="Ya, Keluarkan"
        danger
        busy={busy}
        onCancel={() => { if (!busy) setPendingLogout(null); }}
        onConfirm={confirmForceLogout}
      />

      <ConfirmDialog
        open={pendingGenerate}
        title={master ? 'Generate token baru?' : 'Buat master bilik?'}
        message="Token baru 8 huruf kapital akan dibuat. Semua session aktif dipaksa logout dan token lama tidak berlaku — device bilik harus login ulang dengan token baru."
        confirmLabel="Generate Token"
        danger
        busy={busy}
        onCancel={() => { if (!busy) setPendingGenerate(false); }}
        onConfirm={confirmGenerateToken}
      />

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </main>
  );
}
