'use server';

import { z } from 'zod';
import { cookies } from 'next/headers';
import { supabaseService, supabaseServer } from '@/lib/supabase/server';
import { hashPassword, randomKioskPassword } from '@/lib/auth-kiosk';
import { ok, fail } from '@/lib/api-response';

async function requireAdmin() {
  const sb = await supabaseServer();
  const { data, error } = await sb.auth.getUser();
  if (data.user) return { user: data.user, debug: '' };
  const jar = await cookies();
  const names = jar.getAll().map((c) => c.name);
  const debug = `debug: ${names.length} cookies [${names.join(',') || 'kosong'}], getUserErr=${error?.message ?? 'none'}`;
  return { user: null as never, debug };
}

/** Token bilik: 8 huruf kapital, tetap sama sampai admin klik Generate Token. */
export async function generateKioskToken() {
  const adm = await requireAdmin();
  if (!adm.user) return fail('UNAUTHORIZED', 'Login admin dulu. ' + adm.debug);
  const admin = adm.user;
  const db = supabaseService();
  const token = randomKioskPassword(8);
  const password_hash = await hashPassword(token);
  // Deterministic: when the legacy seeding leaves multiple active rows, always choose the same master
  const { data: master } = await db
    .from('kiosks')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .limit(1)
    .single();
  let kioskId: string;
  if (!master) {
    const { data: created, error: createErr } = await db.from('kiosks').insert({
      kiosk_name: 'Master Bilik', username: 'bilik-ipm',
      token, password_hash, is_active: true,
    }).select('id').single();
    if (!created) return fail('INTERNAL_ERROR', createErr?.message ?? 'Gagal membuat kiosk');
    kioskId = created.id;
    await db.from('audit_logs').insert({ actor: admin.email ?? admin.id, action: 'kiosk_create_first', meta: { kiosk_id: kioskId } });
  } else {
    const { error } = await db.from('kiosks').update({ token, password_hash }).eq('id', master.id);
    if (error) return fail('INTERNAL_ERROR', error.message);
    kioskId = master.id;
  }
  // Invalidate all active sessions — device bilik harus login ulang dengan token baru
  await db.from('kiosk_sessions').update({ is_active: false }).eq('kiosk_id', kioskId).eq('is_active', true);
  await db.from('audit_logs').insert({ actor: admin.email ?? admin.id, action: 'kiosk_token_generated', meta: { kiosk_id: kioskId } });
  return ok({ token, kioskName: master?.kiosk_name ?? 'Master Bilik' });
}

export async function setKioskMaxSessions(input: { maxSessions: number }) {
  const parsed = z.object({ maxSessions: z.number().int().min(1).max(100) }).safeParse(input);
  if (!parsed.success) return fail('VALIDATION_ERROR', 'Max sessions 1–100');
  const adm = await requireAdmin();
  if (!adm.user) return fail('UNAUTHORIZED', 'Login admin dulu. ' + adm.debug);
  const db = supabaseService();
  const { error } = await db.from('election_settings').update({ kiosk_max_sessions: parsed.data.maxSessions }).eq('id', 1);
  if (error) return fail('INTERNAL_ERROR', error.message);
  return ok({ maxSessions: parsed.data.maxSessions });
}

export async function forceLogoutSession(input: { sessionId: string }) {
  const parsed = z.object({ sessionId: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return fail('VALIDATION_ERROR', 'Input tidak valid');
  const adm = await requireAdmin();
  if (!adm.user) return fail('UNAUTHORIZED', 'Login admin dulu. ' + adm.debug);
  const db = supabaseService();
  const { error } = await db.from('kiosk_sessions').update({ is_active: false }).eq('id', parsed.data.sessionId);
  if (error) return fail('INTERNAL_ERROR', error.message);
  return ok({ loggedOut: true });
}

export async function clearInactiveSessions() {
  const adm = await requireAdmin();
  if (!adm.user) return fail('UNAUTHORIZED', 'Login admin dulu. ' + adm.debug);
  const db = supabaseService();
  const { count, error: countErr } = await db.from('kiosk_sessions').select('id', { count: 'exact', head: true }).eq('is_active', false);
  if (countErr) return fail('INTERNAL_ERROR', countErr.message);
  const { error: deleteErr } = await db.from('kiosk_sessions').delete().eq('is_active', false);
  if (deleteErr) return fail('INTERNAL_ERROR', deleteErr.message);
  return ok({ cleared: count ?? 0 });
}

export async function getKioskSessions() {
  const adm = await requireAdmin();
  if (!adm.user) return fail('UNAUTHORIZED', 'Login admin dulu. ' + adm.debug);
  const db = supabaseService();
  const { data: master } = await db
    .from('kiosks')
    .select('id, kiosk_name, last_ping, token')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .limit(1)
    .single();
  if (!master) return ok({ master: null, sessions: [], maxSessions: 10 });
  const { data: settings } = await db.from('election_settings').select('kiosk_max_sessions').eq('id', 1).single();
  const { data: sessions } = await db
    .from('kiosk_sessions')
    .select('id, device_name, user_agent, ip_address, logged_in_at, last_ping, is_active')
    .eq('kiosk_id', master.id)
    .order('last_ping', { ascending: false, nullsFirst: false });
  return ok({ master, sessions: sessions ?? [], maxSessions: settings?.kiosk_max_sessions ?? 10 });
}

export async function setElectionStatus(input: { status: 'start' | 'pause' | 'stop' }) {
  const parsed = z.object({ status: z.enum(['start', 'pause', 'stop']) }).safeParse(input);
  if (!parsed.success) return fail('VALIDATION_ERROR', 'Status tidak valid');
  const adm = await requireAdmin();
  if (!adm.user) return fail('UNAUTHORIZED', 'Login admin dulu. ' + adm.debug);
  const admin = adm.user;
  const db = supabaseService();
  const patch: Record<string, unknown> = { status: parsed.data.status };
  if (parsed.data.status === 'stop') {
    patch.stopped_at = new Date().toISOString();
    const { data: rows } = await db.from('candidates').select('candidate_number, vote_count').order('candidate_number');
    const { resultsSnapshotHash } = await import('@/lib/hash');
    patch.results_hash = resultsSnapshotHash(rows ?? []);
  } else if (parsed.data.status === 'start') {
    patch.stopped_at = null;
    patch.results_hash = null;
  }
  const { error } = await db.from('election_settings').update(patch).eq('id', 1);
  if (error) return fail('INTERNAL_ERROR', error.message);
  await db.from('audit_logs').insert({ actor: admin.email ?? admin.id, action: `election_${parsed.data.status}`, meta: patch });
  await db.channel('election-broadcast').send({ type: 'broadcast', event: 'status', payload: patch });
  return ok({ status: parsed.data.status });
}
