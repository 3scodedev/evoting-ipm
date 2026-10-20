'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  LayoutDashboard,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/Button';
import { parseDashboardRole } from '@/lib/roles';
import s from './login.module.css';

export default function AdminLoginPage() {
  const r = useRouter();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr('');
    try {
      const { supabaseBrowser } = await import('@/lib/supabase/client');
      const sb = supabaseBrowser();
      const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
      if (error) {
        setErr(`Gagal login: ${error.message} (cek koneksi + env SUPABASE_URL)`);
        return;
      }
      if (!parseDashboardRole(data.user?.app_metadata)) {
        await sb.auth.signOut();
        setErr('Akun ini belum diberi akses dashboard. Hubungi admin.');
        return;
      }
      r.push('/admin/dashboard');
      r.refresh();
    } catch {
      setErr('Gagal login. Cek koneksi.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={s.page}>
      <div className={s.shell}>
        <section className={s.stage} aria-label="Command Center IPM">
          <div className={s.rays} aria-hidden="true" />
          <div className={s.ring} aria-hidden="true" />

          <div className={s.stageTop}>
            <span className={s.kicker}>
              <Zap className="h-3 w-3" fill="currentColor" aria-hidden />
              Pemilihan 2026/2027
            </span>
            <span className={s.sticker} aria-hidden="true">
              <span>
                <strong>01</strong>
                <span>Suara</span>
              </span>
            </span>
          </div>

          <div className={s.plate} aria-hidden="true">
            <Image
              src="/images/logo-ipm.png"
              alt=""
              width={330}
              height={639}
              priority
            />
          </div>

          <div className={s.stageCopy}>
            <p className={s.kicker} style={{ background: '#fff' }}>
              Command Center
            </p>
            <h1 className={s.stageTitle}>
              Satu suara,
              <br />
              <span className={s.highlight}>arah baru</span>
              <br />
              untuk IPM.
            </h1>
            <p className={s.stageText}>
              Pantau bilik, perolehan suara, dan berita acara dalam satu ruang
              kendali yang aman dan real-time.
            </p>
            <div className={s.chips}>
              <span className={s.chip}>
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                Bilik aman
              </span>
              <span className={s.chip}>
                <Activity className="h-3.5 w-3.5" aria-hidden />
                Hasil live
              </span>
            </div>
          </div>
        </section>

        <section className={s.formSide}>
          <Link href="/" className={s.brand} aria-label="E-Voting IPM — beranda">
            <span className={s.brandMark}>
              <Image
                src="/images/logo-smk.png"
                alt="Logo SMK Muhammadiyah Kandanghaur"
                width={264}
                height={384}
                priority
              />
            </span>
            <span>
              <span className={s.brandKicker}>SMK Muhammadiyah Kandanghaur</span>
              <span className={s.brandName}>E-Voting IPM</span>
            </span>
          </Link>

          <div className={`app-card ${s.formCard}`}>
            <p className="app-kicker">Akses petugas</p>
            <h2 className={s.formTitle}>Masuk Dashboard</h2>
            <p className={s.formSub}>
              Gunakan akun admin atau panitia. Admin bisa mengelola pemilihan;
              panitia hanya memantau hasil.
            </p>

            <form onSubmit={submit} autoComplete="off">
              <div className={s.field}>
                <label className="app-label" htmlFor="e">
                  Email
                </label>
                <input
                  id="e"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="app-input mt-1.5"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                />
              </div>
              <div className={s.field}>
                <label className="app-label" htmlFor="pw">
                  Password
                </label>
                <input
                  id="pw"
                  type="password"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  className="app-input mt-1.5"
                  autoComplete="current-password"
                  required
                />
              </div>

              {err && (
                <p role="alert" className={s.error}>
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  {err}
                </p>
              )}

              <Button
                type="submit"
                loading={loading}
                size="lg"
                className={s.submit}
              >
                <LayoutDashboard className="h-5 w-5" aria-hidden="true" />
                Masuk Dashboard
              </Button>

              <p className={s.note}>
                Sesi akan berakhir otomatis saat kamu menekan Keluar. Jika lupa
                password, hubungi ketua panitia.
              </p>
            </form>
          </div>

          <Link href="/" className={s.back}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Kembali ke Beranda
          </Link>
        </section>
      </div>
    </main>
  );
}
