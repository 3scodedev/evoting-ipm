'use client';

import { createContext, useContext } from 'react';
import type { DashboardRole } from '@/lib/roles';

/** Default least-privilege: halaman yang tidak dibungkus provider dianggap panitia. */
export const AdminRoleContext = createContext<DashboardRole>('panitia');

export function useAdminRole() {
  return useContext(AdminRoleContext);
}
