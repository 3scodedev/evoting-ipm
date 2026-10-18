'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { ToastStack, useToasts } from '@/components/Toast';
import { ConfirmDialog } from '@/components/ConfirmDialog';
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
    <div className="flex items-center gap-1">
      <code className="font-mono text-sm text-slate-200">{value}</code>
      <button
        onClick={handleCopy}
        className="ml-1 p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
        aria-label="Salin"
        title="Salin"
      >
        {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
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
    return () => {
      sb.removeChannel(ch);
      clearInterval(tick);
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
    <main className="min-h-screen bg-slate-950 text-slate-50 p-4 pb-24 md:pb-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-sky-600/20 flex items-center justify-center">
            <MonitorSmartphone className="h-5 w-5 text-sky-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-none">Manajemen Bilik</h1>
            <p className="text-xs text-slate-500 mt-0.5">Kelola kredensial & session bilik suara</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge tone={live ? 'emerald' : 'amber'} pulse={live}>{live ? 'LIVE' : 'CONNECTING'}</Badge>
          {master && (
            <span className="text-xs text-slate-400 font-mono hidden sm:inline">
              {master.kiosk_name}
            </span>
          )}
          <span className="text-xs text-slate-400 font-mono" aria-live="polite">
            {activeCount} aktif ({liveCount} live)
            {maxSessions !== null && ` / ${maxSessions}`}
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
        </div>
      </div>

      <div className="animate-fade-in">
          {/* Master Credential Section */}
          <section className="mt-6 rounded-xl bg-slate-800 border border-slate-700/60 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-7 w-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
                <Key className="h-4 w-4 text-amber-400" />
              </div>
              <h2 className="font-bold text-base">Kredensial Master Bilik</h2>
            </div>
            {!master ? (
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm text-slate-400">Belum ada master bilik. Generate token untuk membuatnya.</p>
                <Button
                  size="sm"
                  onClick={() => setPendingGenerate(true)}
                  disabled={busy}
                >
                  Generate Token
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-lg bg-slate-900/80 p-3 border border-slate-700/40">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Shield className="h-3 w-3" /> Token Bilik
                    </p>
                    {master.token ? (
                      <CopyField value={master.token} />
                    ) : (
                      <p className="text-sm text-slate-500">
                        Belum ada token. Klik Generate Token untuk membuatnya.
                      </p>
                    )}
                  </div>
                  <div className="rounded-lg bg-slate-900/80 p-3 border border-slate-700/40">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Clock className="h-3 w-3" /> Last Ping
                    </p>
                    <p className="font-mono text-sm text-slate-300">
                      {master.last_ping ? timeAgo(master.last_ping, now) : '—'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-700/60">
                  <p className="text-xs text-slate-500 max-w-md">
                    Token 8 huruf kapital dipakai semua device bilik untuk login &amp; validasi.
                    Tetap sama sampai kamu generate ulang.
                  </p>
                  <div className="flex items-center gap-2">
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
          </section>

          {/* Max Sessions Section */}
          <section className="mt-4 rounded-xl bg-slate-800 border border-slate-700/60 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-7 w-7 rounded-lg bg-sky-500/15 flex items-center justify-center">
                <Users className="h-4 w-4 text-sky-400" />
              </div>
              <h2 className="font-bold text-base">Pengaturan Session</h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm text-slate-300" htmlFor="max-sessions">
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
                className="w-20 rounded-md border border-slate-600 bg-slate-900 px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
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
          </section>

          {/* Active Sessions Section */}
          <section className="mt-4 rounded-xl bg-slate-800 border border-slate-700/60 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-7 w-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <MonitorSmartphone className="h-4 w-4 text-emerald-400" />
              </div>
              <h2 className="font-bold text-base">Session Aktif</h2>
              {sessions.length > 0 && (
                <Badge tone="sky" className="ml-auto text-xs">{sessions.length} total</Badge>
              )}
            </div>
            {sessions.length === 0 ? (
              <div className="mt-2 text-sm text-slate-400 text-center py-8 border border-dashed border-slate-700 rounded-lg">
                <MonitorSmartphone className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                <p>Belum ada session aktif.</p>
                <p className="text-xs text-slate-500 mt-1">Session muncul saat bilik login.</p>
              </div>
            ) : (
              <div className="mt-3 overflow-x-auto rounded-lg border border-slate-700/50">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-left text-slate-400 bg-slate-900/50">
                      <th className="pb-2.5 pt-2 pr-4 pl-4 font-medium">Device</th>
                      <th className="pb-2.5 pt-2 pr-4 font-medium">IP</th>
                      <th className="pb-2.5 pt-2 pr-4 font-medium hidden md:table-cell">User Agent</th>
                      <th className="pb-2.5 pt-2 pr-4 font-medium">Login</th>
                      <th className="pb-2.5 pt-2 pr-4 font-medium">Last Ping</th>
                      <th className="pb-2.5 pt-2 pr-4 font-medium">Status</th>
                      <th className="pb-2.5 pt-2 pr-2 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s, idx) => {
                      const isLive = s.is_active && isKioskLive(s.last_ping, now);
                      return (
                        <tr
                          key={s.id}
                          className={cn(
                            "border-b border-slate-700/30 hover:bg-slate-700/20 transition",
                            idx !== sessions.length - 1 && "border-b border-slate-700/50"
                          )}
                        >
                          <td className="py-2.5 pr-4 pl-4 font-mono text-slate-200 font-medium">
                            {s.device_name ?? '—'}
                          </td>
                          <td className="py-2.5 pr-4 font-mono text-slate-400 text-xs">
                            {s.ip_address ?? '—'}
                          </td>
                          <td className="py-2.5 pr-4 text-slate-400 hidden md:table-cell max-w-[220px] truncate" title={s.user_agent ?? ''}>
                            {s.user_agent ?? '—'}
                          </td>
                          <td className="py-2.5 pr-4 text-slate-300 text-xs">
                            {new Date(s.logged_in_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                          <td className="py-2.5 pr-4 text-slate-300 text-xs">
                            {s.last_ping ? timeAgo(s.last_ping, now) : '—'}
                          </td>
                          <td className="py-2.5 pr-4">
                            <Badge tone={isLive ? 'emerald' : s.is_active ? 'amber' : 'gray'} pulse={isLive}>
                              {isLive ? 'Live' : s.is_active ? 'Aktif' : 'Offline'}
                            </Badge>
                          </td>
                          <td className="py-2.5 pr-2 pl-4">
                            {s.is_active && (
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => handleForceLogout(s.id)}
                                className="inline-flex items-center gap-1 px-2 text-xs h-7"
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
          </section>
      </div>

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
