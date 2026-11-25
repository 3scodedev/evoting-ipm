'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Check, Vote, X } from 'lucide-react';
import { BallotHeader } from '@/components/kiosk/BallotHeader';
import { CandidateCard, type Candidate } from '@/components/kiosk/CandidateCard';
import { BallotSkeleton } from '@/components/skeletons/BallotSkeleton';
import { Button } from '@/components/Button';
import { castVote } from '@/app/actions/vote';
import { logoutKiosk } from '@/app/actions/kiosk';

/** Layar terima kasih tampil singkat, lalu bilik reset tanpa navigasi/reload. */
const THANKS_MS = 3000;
/**
 * Cek status pemilihan cukup tiap 30 dtk: castVote sudah menolak suara saat
 * jeda/stop, jadi polling ini hanya mempercepat tampilan layar kunci.
 */
const STATUS_POLL_MS = 30_000;

export default function BallotPage() {
  const r = useRouter();
  const [list, setList] = useState<Candidate[] | null>(null);
  const [loadErr, setLoadErr] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [thanks, setThanks] = useState(false);
  const [err, setErr] = useState('');

  // Kunci sinkron: dua klik dalam tick yang sama tetap hanya mengirim satu suara.
  const inFlight = useRef(false);
  // true selama request kirim + layar terima kasih → blokir semua interaksi.
  const lockedRef = useRef(false);

  useEffect(() => {
    lockedRef.current = sending || thanks;
  }, [sending, thanks]);

  const loadCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/candidates');
      const j = res.ok ? await res.json() : null;
      if (j?.success && Array.isArray(j.data)) {
        setList(j.data as Candidate[]);
        setLoadErr(false);
      } else {
        setLoadErr(true);
      }
    } catch {
      // Tanpa fallback kandidat palsu: pemilih tidak boleh melihat paslon demo.
      setLoadErr(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Dimuat sekali per sesi bilik. Reset setelah vote TIDAK memanggil ini lagi.
  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  // Kalau panitia menjeda/menutup pemilihan, bilik langsung keluar dari surat suara.
  useEffect(() => {
    let alive = true;
    async function checkStatus() {
      if (document.visibilityState !== 'visible' || lockedRef.current) return;
      try {
        // Tanpa `no-store`: response boleh diambil dari cache edge (s-maxage 5 dtk).
        const res = await fetch('/api/election-status');
        if (!res.ok) return;
        const j = await res.json();
        const status = j?.data?.status;
        if (alive && !lockedRef.current && status && status !== 'start') r.replace('/kiosk/locked');
      } catch {
        // Offline / API gagal → tetap di halaman; castVote jadi pengaman terakhir.
      }
    }
    checkStatus();
    const t = setInterval(checkStatus, STATUS_POLL_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [r]);

  // Setelah suara tersimpan: tampilkan terima kasih, lalu reset state bilik.
  useEffect(() => {
    if (!thanks) return;
    const t = setTimeout(() => {
      setThanks(false);
      setConfirm(false);
      setSel(null);
      setErr('');
    }, THANKS_MS);
    return () => clearTimeout(t);
  }, [thanks]);

  const chosen = list?.find((c) => c.id === sel);

  async function kirim() {
    if (!sel || inFlight.current || thanks) return;
    inFlight.current = true;
    setSending(true);
    setErr('');
    try {
      const res = await castVote({ candidate_id: sel });
      if (!res.success) {
        if (res.error.code === 'FORBIDDEN' || res.error.code === 'UNAUTHORIZED') {
          setConfirm(false);
          setErr(`${res.error.message} Mengalihkan ke halaman login...`);
          setTimeout(() => r.replace('/kiosk/login'), 1500);
          return;
        }
        if (res.error.code === 'ELECTION_CLOSED') {
          setConfirm(false);
          r.replace('/kiosk/locked');
          return;
        }
        // Error biasa: biarkan dialog terbuka supaya pemilih bisa langsung coba lagi.
        setErr(
          res.error.code === 'NOT_FOUND'
            ? 'Kandidat tidak tersedia. Tutup dialog lalu pilih ulang kandidat.'
            : res.error.code === 'INTERNAL_ERROR'
              ? 'Gagal mengirim suara. Coba lagi sebentar lagi.'
              : res.error.message
        );
        return;
      }
      setConfirm(false);
      setThanks(true);
    } finally {
      setSending(false);
      inFlight.current = false;
    }
  }

  async function kunciBilik() {
    await logoutKiosk();
    r.push('/kiosk/login');
  }

  if (list === null && !loadErr) return <BallotSkeleton />;

  if (list === null || list.length === 0) {
    return (
      <main className="flex min-h-screen flex-col animate-fade-in">
        <BallotHeader />
        <div className="flex flex-1 items-center justify-center p-6 text-center">
          <div className="app-card w-full max-w-md p-8">
            <span className="app-icon mx-auto h-14 w-14 rounded-full">
              <Vote className="h-6 w-6" aria-hidden />
            </span>
            <h1 className="app-h1 mt-4">{loadErr ? 'Gagal memuat surat suara' : 'Belum ada kandidat'}</h1>
            <p className="mt-2 text-sm font-medium text-ink/55">
              {loadErr ? 'Periksa koneksi bilik lalu coba lagi.' : 'Panitia belum input paslon.'}
            </p>
            <div className="mt-5 flex justify-center gap-2.5">
              {loadErr && (
                <Button variant="primary" loading={loading} onClick={loadCandidates}>
                  Coba Lagi
                </Button>
              )}
              <Button variant="secondary" onClick={kunciBilik}>
                Kunci Bilik
              </Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col animate-fade-in">
      <BallotHeader />

      <div className="mx-auto flex w-full max-w-[1760px] flex-1 flex-col px-4 py-6">
        <div className="my-auto">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="app-kicker">Surat suara digital</p>
              <h1 className="app-h1 mt-1 text-3xl sm:text-4xl">Pilih Satu Kandidat</h1>
              <div className="mt-2 flex items-center gap-2.5">
                <span className="h-1.5 w-16 rounded-full border border-ink bg-brand-yellow" aria-hidden />
                <p className="text-sm font-semibold text-ink/50">
                  Ketuk kartu kandidat, lalu tekan tombol kirim di bawah.
                </p>
              </div>
            </div>
            <span className="app-chip bg-brand-sky-light text-[10px]">
              <Vote className="h-3.5 w-3.5" aria-hidden />
              {list.length} kandidat
            </span>
          </div>

          <div
            role="radiogroup"
            aria-label="Kandidat"
            aria-busy={sending || thanks}
            className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4 stagger-fade"
          >
            {list.map((c, i) => (
              <CandidateCard
                key={c.id}
                c={c}
                selected={sel === c.id}
                disabled={sending || thanks}
                onSelect={() => setSel(c.id)}
                style={{ '--i': Math.min(i, 8) } as React.CSSProperties}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Bar aksi — tombol kirim besar di tengah */}
      <div className="sticky bottom-0 z-10 border-t-2 border-ink bg-paper/95 backdrop-blur-md">
        <div className="mx-auto w-full max-w-[1760px] px-4 py-4">
          {err && !confirm && (
            <div
              role="alert"
              className="mx-auto mb-3 flex w-full max-w-xl items-start gap-2.5 rounded-xl border-2 border-ink bg-brand-red/10 px-4 py-2.5 text-left text-sm font-semibold text-[#b91c12]"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <p className="flex-1">{err}</p>
              <button
                type="button"
                onClick={() => setErr('')}
                aria-label="Tutup pesan error"
                className="rounded-full p-0.5 transition hover:bg-brand-red/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          )}
          <div className="flex justify-center">
            <Button
              variant="primary"
              size="lg"
              disabled={!sel || sending || thanks}
              onClick={() => {
                setErr('');
                setConfirm(true);
              }}
              aria-label={chosen ? `Kirim suara untuk kandidat ${chosen.candidate_number} ${chosen.name}` : 'Pilih kandidat dulu'}
              className="h-16 w-full max-w-md rounded-full px-10 text-lg sm:w-auto sm:min-w-[360px] sm:text-xl"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-ink bg-brand-yellow">
                <Image
                  src="/images/paku-coblos.webp"
                  alt=""
                  width={128}
                  height={128}
                  aria-hidden
                  draggable={false}
                  unoptimized
                  className={`h-8 w-8 transition ${sel ? '' : 'grayscale opacity-40'}`}
                />
              </span>
              Kirim Suara
            </Button>
          </div>
        </div>
      </div>

      {confirm && chosen && !thanks && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-ink/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-[24px] border-2 border-ink bg-white shadow-hard-lg">
            <div className="h-2 bg-brand-sky" aria-hidden />
            <div className="h-1 bg-brand-yellow" aria-hidden />
            <div className="p-6">
              <span className="app-chip bg-brand-yellow text-[10px]">Konfirmasi pilihan</span>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-xl font-extrabold leading-tight tracking-tight">
                Yakin memilih kandidat {chosen.candidate_number} — {chosen.name}?
              </h2>
              {chosen.class_name && <p className="mt-1 text-sm font-semibold text-brand-sky-deep">Kelas {chosen.class_name}</p>}
              <p className="mt-2 text-sm font-medium leading-relaxed text-ink/55">
                Suara tidak dapat diubah setelah dikirim.
              </p>
              {err && (
                <div
                  role="alert"
                  className="mt-4 flex items-start gap-2 rounded-xl border-2 border-ink bg-brand-red/10 px-3 py-2.5 text-left text-sm font-semibold text-[#b91c12]"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <p>{err}</p>
                </div>
              )}
              <div className="mt-6 grid grid-cols-2 gap-2.5">
                <Button
                  variant="secondary"
                  disabled={sending}
                  onClick={() => {
                    setConfirm(false);
                    setErr('');
                  }}
                >
                  Cek Lagi
                </Button>
                <Button variant="primary" loading={sending} onClick={kirim}>
                  Ya, Kirim Suara
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Layar terima kasih — state React, bukan navigasi, jadi foto & halaman tidak dimuat ulang. */}
      {thanks && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Suara tercatat"
          className="fixed inset-0 z-50 flex items-center justify-center bg-paper/95 p-6 text-center backdrop-blur-sm"
        >
          <div className="app-card w-full max-w-sm overflow-hidden animate-fade-in">
            <div className="h-2 bg-gradient-to-r from-brand-sky via-brand-yellow to-brand-red" aria-hidden />
            <div className="p-8" aria-live="assertive">
              <span className="mx-auto grid h-20 w-20 place-items-center rounded-full border-2 border-ink bg-brand-yellow shadow-hard">
                <span className="grid h-14 w-14 place-items-center rounded-full border-2 border-ink bg-white">
                  <Check className="h-8 w-8" strokeWidth={3} aria-hidden />
                </span>
              </span>
              <p className="app-kicker mt-4">Suara tercatat</p>
              <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-tight">
                Terima kasih!
              </h2>
              <p className="mt-2 text-sm font-semibold text-ink/55">
                Bilik kembali ke layar pilihan untuk pemilih berikutnya.
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
