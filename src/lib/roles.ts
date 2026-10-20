/** Role dashboard disimpan di Supabase `app_metadata` (hanya bisa diubah service role). */
export type DashboardRole = 'admin' | 'panitia';

export function parseDashboardRole(appMetadata: unknown): DashboardRole | null {
  if (!appMetadata || typeof appMetadata !== 'object') return null;
  const role = (appMetadata as { role?: unknown }).role;
  return role === 'admin' || role === 'panitia' ? role : null;
}
