'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, MonitorSmartphone, UserSquare2, FileText, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

const MENU = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/kiosks', label: 'Bilik', icon: MonitorSmartphone },
  { href: '/admin/candidates', label: 'Kandidat', icon: UserSquare2 },
  { href: '/admin/reports', label: 'Laporan', icon: FileText },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();

  // Halaman bare tanpa sidebar: login & preview cetak token bilik
  if (path === '/admin/login' || path === '/admin/kiosks/print') return <>{children}</>;

  async function logout() {
    try {
      const { supabaseBrowser } = await import('@/lib/supabase/client');
      const sb = supabaseBrowser();
      await sb.auth.signOut();
    } catch {
      /* lanjut redirect */
    }
    router.push('/admin/login');
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 md:flex">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-slate-800 p-4">
        <div className="flex items-center gap-3 px-2">
          <Image
            src="/images/logo-ipm.png"
            alt="Logo IPM"
            width={165}
            height={320}
            priority
            className="h-11 w-auto shrink-0"
          />
          <div className="min-w-0">
            <p
              className="truncate text-base font-bold leading-tight tracking-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Command Center
            </p>
            <p className="mt-1 truncate text-xs font-medium leading-none text-slate-400">
              SMK Muh Kandanghaur
            </p>
          </div>
        </div>
        <nav className="mt-6 flex flex-col gap-1" aria-label="Navigasi admin">
          {MENU.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                path === m.href ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              )}
              aria-current={path === m.href ? 'page' : undefined}
            >
              <m.icon size={18} aria-hidden />
              {m.label}
            </Link>
          ))}
        </nav>
        <button
          onClick={logout}
          className="mt-auto flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-800"
        >
          <LogOut size={18} aria-hidden /> Keluar
        </button>
      </aside>

      {/* Konten */}
      <div className="flex-1 min-w-0 pb-20 md:pb-0">{children}</div>

      {/* Bottom nav mobile */}
      <nav className="fixed bottom-0 inset-x-0 z-10 flex md:hidden border-t border-slate-800 bg-slate-900" aria-label="Navigasi admin">
        {MENU.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className={cn(
              'flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors',
              path === m.href ? 'text-sky-400' : 'text-slate-400'
            )}
            aria-current={path === m.href ? 'page' : undefined}
          >
            <m.icon size={20} aria-hidden />
            {m.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
