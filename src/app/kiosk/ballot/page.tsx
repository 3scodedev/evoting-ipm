'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Vote, X } from 'lucide-react';
import { BallotHeader } from '@/components/kiosk/BallotHeader';
import { CandidateCard, type Candidate } from '@/components/kiosk/CandidateCard';
import { BallotSkeleton } from '@/components/skeletons/BallotSkeleton';
import { Button } from '@/components/Button';
import { castVote } from '@/app/actions/vote';
import { logoutKiosk } from '@/app/actions/kiosk';

const DEMO: Candidate[] = [
  { id: '1', candidate_number: 1, name: 'Ananda Pratama', class_name: 'XI RPL 1', vision_mission: 'IPM Berkemajuan: literasi, tahfidz, dan kewirausahaan pelajar.', photo_url: null },
  { id: '2', candidate_number: 2, name: 'Bemby Ghulam', class_name: 'XI TKJ 2', vision_mission: 'Aktif, kreatif, dan kolaboratif untuk SMK yang unggul.', photo_url: null },
  { id: '3', candidate_number: 3, name: 'Citra Lestari', class_name: 'XII AKL 1', vision_mission: 'Sekolah bersih, organisasi transparan, kegiatan bermanfaat.', photo_url: null },
];

export default function BallotPage() {
  const r = useRouter();
  const [list, setList] = useState<Candidate[] | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    fetch('/api/candidates')
      .then((x) => (x.ok ? x.json() : null))
      .then((j) => {
        if (!alive) return;
        if (j?.success && Array.isArray(j.data)) setList(j.data as Candidate[]);
        else setList(DEMO); // server tidak terjangkau → mode demo
      })
      .catch(() => {
        if (alive) setList(DEMO);
      });
    return () => {
      alive = false;
    };
  }, []);

  // Kalau panitia menjeda/menutup pemilihan, bilik langsung keluar dari surat suara.
  useEffect(() => {
    let alive = true;
    async function checkStatus() {
      try {
        const res = await fetch('/api/election-status', { cache: 'no-store' });
        if (!res.ok) return;
        const j = await res.json();
        const status = j?.data?.status;
        if (alive && status && status !== 'start') r.replace('/kiosk/locked');
      } catch {
        // Offline / API gagal → tetap di halaman; castVote jadi pengaman terakhir.
      }
    }
    checkStatus();
    const t = setInterval(checkStatus, 10_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [r]);

  const chosen = list?.find((c) => c.id === sel);

  async function kirim() {
    if (!sel) return;
    setSending(true);
    setErr('');
    const res = await castVote({ candidate_id: sel });
    setSending(false);
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
          ? 'Kandidat tidak ditemukan. Tutup dialog lalu pilih ulang kandidat.'
          : res.error.code === 'INTERNAL_ERROR'
            ? 'Gagal mengirim suara. Coba lagi sebentar lagi.'
            : res.error.message
      );
      return;
    }
    setConfirm(false);
    r.push('/kiosk/success');
  }

  async function kunciBilik() {
    await logoutKiosk();
    r.push('/kiosk/login');
  }

  if (list === null) return <BallotSkeleton />;

  if (list.length === 0) {
    return (
      <main className="flex min-h-screen flex-col animate-fade-in">
        <BallotHeader />
        <div className="flex flex-1 items-center justify-center p-6 text-center">
          <div className="app-card w-full max-w-md p-8">
            <span className="app-icon mx-auto h-14 w-14 rounded-full">
              <Vote className="h-6 w-6" aria-hidden />
            </span>
            <h1 className="app-h1 mt-4">Belum ada kandidat</h1>
            <p className="mt-2 text-sm font-medium text-ink/55">Panitia belum input paslon.</p>
            <Button className="mt-5" variant="secondary" onClick={kunciBilik}>
              Kunci Bilik
            </Button>
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

          <div role="radiogroup" aria-label="Kandidat" className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4 stagger-fade">
            {list.map((c, i) => (
              <CandidateCard key={c.id} c={c} selected={sel === c.id} onSelect={() => setSel(c.id)} style={{ '--i': Math.min(i, 8) } as React.CSSProperties} />
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
              disabled={!sel}
              onClick={() => {
                setErr('');
                setConfirm(true);
              }}
              aria-label={chosen ? `Kirim suara untuk kandidat ${chosen.candidate_number} ${chosen.name}` : 'Pilih kandidat dulu'}
              className="h-16 w-full max-w-md rounded-full px-10 text-lg sm:w-auto sm:min-w-[360px] sm:text-xl"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-ink bg-brand-yellow">
                <Image
                  src="/images/paku-logam.png"
                  alt=""
                  width={1254}
                  height={1254}
                  aria-hidden
                  draggable={false}
                  className={`h-8 w-8 transition ${sel ? '' : 'grayscale opacity-40'}`}
                />
              </span>
              Kirim Suara
            </Button>
          </div>
        </div>
      </div>

      {confirm && chosen && (
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
    </main>
  );
}
