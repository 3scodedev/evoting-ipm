'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LayoutDashboard, MonitorSmartphone, UserSquare2, FileText, LogOut, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabaseBrowser } from '@/lib/supabase/client';
import { parseDashboardRole, type DashboardRole } from '@/lib/roles';
import { AdminRoleContext } from '@/components/admin/AdminRole';

const MENU = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/kiosks', label: 'Bilik', icon: MonitorSmartphone },
  { href: '/admin/candidates', label: 'Kandidat', icon: UserSquare2 },
  { href: '/admin/reports', label: 'Laporan', icon: FileText },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();

  // Halaman bare tanpa sidebar: login & preview cetak token bilik
  if (path === '/admin/login' || path === '/admin/kiosks/print') return <>{children}</>;

  return <AdminShell path={path}>{children}</AdminShell>;
}

function AdminShell({ path, children }: { path: string; children: React.ReactNode }) {
  const router = useRouter();
  const [role, setRole] = useState<DashboardRole | null>(null);

  useEffect(() => {
    let alive = true;
    supabaseBrowser()
      .auth.getUser()
      .then(({ data }) => {
        if (!alive) return;
        if (!data.user) {
          router.replace('/admin/login');
          return;
        }
        setRole(parseDashboardRole(data.user.app_metadata) ?? 'panitia');
      })
      .catch(() => {
        if (alive) setRole('panitia');
      });
    return () => {
      alive = false;
    };
  }, [router]);

  const allowed = role === 'admin' || path === '/admin/dashboard';

  useEffect(() => {
    if (role && !allowed) router.replace('/admin/dashboard');
  }, [role, allowed, router]);

  if (!role || !allowed) return <CheckingAccess />;

  // Panitia tidak butuh sidebar/navigasi admin — tampilkan konten penuh.
  if (role === 'panitia') {
    return (
      <AdminRoleContext.Provider value={role}>
        <div className="min-h-screen">{children}</div>
      </AdminRoleContext.Provider>
    );
  }

  const menu = MENU;

  async function logout() {
    try {
      await supabaseBrowser().auth.signOut();
    } catch {
      /* lanjut redirect */
    }
    router.push('/admin/login');
  }

  return (
    <AdminRoleContext.Provider value={role}>
      <div className="min-h-screen md:flex">
        {/* Sidebar desktop */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r-2 border-ink bg-white/75 p-4 backdrop-blur-md md:flex">
          <Link href="/" className="group flex items-center gap-3 px-1" aria-label="Kembali ke beranda">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-ink bg-white shadow-hard-sm transition group-hover:-rotate-6 group-hover:shadow-hard-yellow">
              <Image
                src="/images/logo-ipm.png"
                alt="Logo IPM"
                width={165}
                height={320}
                priority
                className="h-7 w-auto"
              />
            </span>
            <span className="min-w-0">
              <span className="app-kicker block text-[9px]">SMK Muhammadiyah</span>
              <span className="block truncate font-[family-name:var(--font-display)] text-base font-extrabold leading-tight tracking-tight">
                Command Center
              </span>
            </span>
          </Link>

          <div className="mt-7 flex items-center gap-2 px-2">
            <span className="app-kicker">Menu admin</span>
            <span className="h-px flex-1 bg-ink/15" aria-hidden />
          </div>

          <nav className="mt-3 flex flex-col gap-2" aria-label="Navigasi admin">
            {menu.map((m) => {
              const active = path === m.href;
              return (
                <Link
                  key={m.href}
                  href={m.href}
                  className={cn(
                    'flex items-center gap-3 rounded-full border-2 px-4 py-2.5 text-sm font-bold transition duration-200',
                    active
                      ? 'border-ink bg-ink text-white shadow-hard-yellow'
                      : 'border-transparent text-ink/65 hover:border-ink hover:bg-white hover:text-ink'
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  <m.icon size={18} aria-hidden />
                  {m.label}
                  {active && <span className="ml-auto h-2 w-2 rounded-full bg-brand-red" aria-hidden />}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto">
            <div className="mb-3 rounded-2xl border-2 border-ink bg-brand-yellow p-3 shadow-hard-sm">
              <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em]">
                <Zap className="h-3.5 w-3.5" fill="currentColor" aria-hidden />
                Bilik aman
              </p>
              <p className="mt-1 text-xs font-semibold leading-snug text-ink/70">
                Satu suara, satu arah untuk IPM yang lebih baik.
              </p>
            </div>
            <button
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-full border-2 border-transparent px-4 py-2.5 text-sm font-bold text-ink/60 transition hover:border-ink hover:bg-white hover:text-brand-red"
            >
              <LogOut size={18} aria-hidden /> Keluar
            </button>
          </div>
        </aside>

        {/* Konten */}
        <div className="min-w-0 flex-1 pb-20 md:pb-0">{children}</div>

        {/* Bottom nav mobile */}
        <nav
          className="fixed inset-x-0 bottom-0 z-20 flex border-t-2 border-ink bg-white/95 backdrop-blur-md md:hidden"
          aria-label="Navigasi admin"
        >
          {menu.map((m) => {
            const active = path === m.href;
            return (
              <Link
                key={m.href}
                href={m.href}
                className={cn(
                  'flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-extrabold uppercase tracking-wide transition-colors',
                  active ? 'text-ink' : 'text-ink/45'
                )}
                aria-current={active ? 'page' : undefined}
              >
                <span
                  className={cn(
                    'grid h-8 w-11 place-items-center rounded-full border-2 transition',
                    active
                      ? 'border-ink bg-brand-yellow shadow-[2px_2px_0_#131313]'
                      : 'border-transparent'
                  )}
                >
                  <m.icon size={18} aria-hidden />
                </span>
                {m.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </AdminRoleContext.Provider>
  );
}

function CheckingAccess() {
  return (
    <div className="grid min-h-screen place-items-center bg-paper px-6" aria-busy="true" role="status">
      <div className="app-card-sm px-5 py-4 text-center">
        <p className="app-kicker">Command Center</p>
        <p className="mt-1 text-sm font-bold">Memeriksa akses…</p>
      </div>
    </div>
  );
}
