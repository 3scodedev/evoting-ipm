import { redirect } from 'next/navigation';
import { requireAdminUser } from '@/lib/auth-admin';

/** Halaman operasional hanya untuk role admin. */
export default async function AdminOnlyLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdminUser();
  if (!user) redirect('/admin/dashboard');
  return <>{children}</>;
}
