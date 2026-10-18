'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CandidateCard, type Candidate } from '@/components/kiosk/CandidateCard';
import { ScreenLock } from '@/components/kiosk/ScreenLock';
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

  const chosen = list?.find((c) => c.id === sel);

  async function kirim() {
    if (!sel) return;
    setSending(true);
    setErr('');
    const res = await castVote({ candidate_id: sel });
    setSending(false);
    setConfirm(false);
    if (!res.success) {
      if (res.error.code === 'FORBIDDEN' || res.error.code === 'UNAUTHORIZED') {
        setErr(`${res.error.message} Mengalihkan...`);
        setTimeout(() => r.push('/kiosk/login'), 1500);
        return;
      }
      setErr(res.error.message);
      return;
    }
    r.push('/kiosk/success');
  }

  async function kunciBilik() {
    await logoutKiosk();
    r.push('/kiosk/login');
  }

  if (list === null) return <BallotSkeleton />;

  if (list.length === 0) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        <h1 className="text-2xl font-bold">Belum ada kandidat</h1>
        <p className="text-slate-600 mt-2">Panitia belum input paslon.</p>
        <Button className="mt-4" variant="ghost" onClick={kunciBilik}>
          Kunci Bilik
        </Button>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-green-50 animate-fade-in">
      {/* Header IPM: hijau + garis emas (senada kop berita acara) */}
      <header className="bg-green-700 text-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 xl:max-w-7xl">
          <Image
            src="/images/logo-ipm.png"
            alt="Logo IPM"
            width={165}
            height={320}
            priority
            className="h-10 w-auto shrink-0"
          />
          <div className="min-w-0">
            <p className="font-bold leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Pemilihan Ketua IPM
            </p>
            <p className="text-xs text-green-100">SMK Muhammadiyah Kandanghaur</p>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-green-900">Bilik Suara</span>
            <ScreenLock />
          </div>
        </div>
        <div className="h-1 bg-amber-400" aria-hidden />
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col p-4 xl:max-w-7xl">
        <div className="my-auto">
          <h1 className="text-2xl font-bold text-slate-900">Pilih Satu Kandidat</h1>
          <div className="mt-1.5 h-1 w-14 rounded-full bg-amber-400" aria-hidden />
          <p className="mt-2 text-sm text-slate-500">Ketuk kartu kandidat, lalu tekan tombol hijau di bawah.</p>

          <div role="radiogroup" aria-label="Kandidat" className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 stagger-fade">
            {list.map((c, i) => (
              <CandidateCard key={c.id} c={c} selected={sel === c.id} onSelect={() => setSel(c.id)} style={{ '--i': Math.min(i, 8) } as React.CSSProperties} />
            ))}
          </div>
        </div>

      </div>

      {/* Bar aksi — tombol kirim icon besar, center */}
      <div className="sticky bottom-0 z-10 border-t border-green-100 bg-white/95 shadow-[0_-4px_16px_rgba(21,128,61,0.06)] backdrop-blur">
        <div className="mx-auto w-full max-w-5xl px-4 py-3 xl:max-w-7xl">
          {err && (
            <p role="alert" className="mb-2 rounded-xl border border-red-200 bg-red-50 p-3 text-center text-sm text-red-700">
              {err} Pilihanmu tidak hilang, coba lagi.
            </p>
          )}
          <div className="flex justify-center">
            <Button
              variant="success"
              size="lg"
              disabled={!sel}
              onClick={() => setConfirm(true)}
              aria-label={chosen ? `Pilih kandidat ${chosen.candidate_number} ${chosen.name}` : 'Pilih kandidat dulu'}
              className="inline-flex h-20 w-20 items-center justify-center rounded-full p-0 shadow-lg shadow-green-900/25 focus-visible:ring-green-600 disabled:bg-slate-200 disabled:text-slate-400 disabled:opacity-100 disabled:shadow-none"
            >
              <Image
                src="/images/paku-logam.png"
                alt=""
                width={1254}
                height={1254}
                aria-hidden
                draggable={false}
                className={`h-16 w-16 transition ${sel ? '' : 'grayscale opacity-40'}`}
              />
            </Button>
          </div>
        </div>
      </div>

      {confirm && chosen && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="h-1.5 bg-green-700" aria-hidden />
            <div className="h-0.5 bg-amber-400" aria-hidden />
            <div className="p-6">
              <h2 className="text-xl font-bold">
                Yakin memilih kandidat {chosen.candidate_number} — {chosen.name}?
              </h2>
              {chosen.class_name && <p className="mt-1 text-sm text-slate-500">Kelas {chosen.class_name}</p>}
              <p className="mt-2 text-sm text-slate-600">Suara tidak dapat diubah setelah dikirim.</p>
              <div className="mt-6 grid grid-cols-2 gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setConfirm(false)}
                  className="border-green-300 text-green-800 hover:bg-green-100"
                >
                  Cek Lagi
                </Button>
                <Button variant="success" loading={sending} onClick={kirim}>
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
