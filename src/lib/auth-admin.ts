import { supabaseServer } from './supabase/server';
import { parseDashboardRole } from './roles';

/** User Supabase yang sedang login di dashboard (admin maupun panitia). */
export async function getDashboardUser() {
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  return data.user;
}

/** Hanya role `admin` yang boleh mengubah data/konfigurasi. */
export async function requireAdminUser() {
  const user = await getDashboardUser();
  if (!user || parseDashboardRole(user.app_metadata) !== 'admin') return null;
  return user;
}
