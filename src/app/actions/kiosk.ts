'use server';

import { z } from 'zod';
import { cookies, headers } from 'next/headers';
import { supabaseService } from '@/lib/supabase/server';
import { hashPassword, verifyPassword } from '@/lib/auth-kiosk';
import { rateLimit } from '@/lib/rate-limit';
import { ok, fail } from '@/lib/api-response';

const loginSchema = z.object({
  password: z.string().min(8).max(100),
});

export async function loginKiosk(input: { password: string }) {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return fail('VALIDATION_ERROR', 'Token tidak valid');
  const hdrs = await headers();
  const ip = hdrs.get('x-forwarded-for') ?? 'local';
  const userAgent = hdrs.get('user-agent') ?? 'unknown';
  if (!rateLimit(`kiosk-login:${ip}`, 20, 5 * 60_000)) {
    return fail('RATE_LIMITED', 'Terlalu banyak percobaan. Tunggu 5 menit.');
  }
  const db = supabaseService();

  // Get or create master kiosk — deterministic: same master every call
  const { data: master } = await db
    .from('kiosks')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .limit(1)
    .single();

  if (!master) {
    // First-time setup: create master kiosk with the provided password
    const { data: created, error: createErr } = await db.from('kiosks').insert({
      kiosk_name: 'Master Bilik',
      username: 'bilik-ipm',
      password_hash: await hashPassword(input.password),
      is_active: true,
    }).select('id, kiosk_name, username').single();
    if (createErr) return fail('INTERNAL_ERROR', createErr.message);
    const jar = await cookies();
    const sessionToken = crypto.randomUUID();
    await db.from('kiosk_sessions').insert({
      kiosk_id: created.id,
      device_name: 'Device 1',
      user_agent: userAgent,
      ip_address: ip,
      session_token: sessionToken,
      last_ping: new Date().toISOString(),
      is_active: true,
    });
    jar.set('kiosk-session', sessionToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', maxAge: 12 * 3600, path: '/',
    });
    return ok({ kioskName: created.kiosk_name, sessionId: sessionToken, isNew: true });
  }

  const valid = await verifyPassword(parsed.data.password, master.password_hash);
  if (!valid) return fail('INVALID_CREDENTIALS', 'Token salah');

  // Check session limit + hitung nomor device berikutnya (mulai dari 1)
  const { data: activeSessions } = await db
    .from('kiosk_sessions')
    .select('id, device_name')
    .eq('kiosk_id', master.id)
    .eq('is_active', true);

  const activeCount = activeSessions?.length ?? 0;
  const nextDeviceNo = (activeSessions ?? []).reduce((max, s) => {
    const n = Number(/^Device (\d+)$/.exec(s.device_name ?? '')?.[1] ?? 0);
    return Math.max(max, n);
  }, 0) + 1;

  const { data: settings } = await db
    .from('election_settings')
    .select('kiosk_max_sessions')
    .eq('id', 1)
    .single();
  const maxSessions = settings?.kiosk_max_sessions ?? 10;

  if (activeCount >= maxSessions) {
    // Evict oldest session
    const { data: oldest } = await db
      .from('kiosk_sessions')
      .select('id')
      .eq('kiosk_id', master.id)
      .eq('is_active', true)
      .order('last_ping', { ascending: true, nullsFirst: true })
      .limit(1)
      .single();
    if (oldest) {
      await db.from('kiosk_sessions').update({ is_active: false }).eq('id', oldest.id);
    }
  }

  // Create new session
  const sessionToken = crypto.randomUUID();
  const { data: session } = await db
    .from('kiosk_sessions')
    .insert({
      kiosk_id: master.id,
      device_name: `Device ${nextDeviceNo}`,
      user_agent: userAgent,
      ip_address: ip,
      session_token: sessionToken,
      last_ping: new Date().toISOString(),
      is_active: true,
    })
    .select('id')
    .single();

  const jar = await cookies();
  jar.delete('kiosk-session');
  jar.set('kiosk-session', sessionToken, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', maxAge: 12 * 3600, path: '/',
  });
  await db.from('kiosks').update({ last_ping: new Date().toISOString() }).eq('id', master.id);
  await db.from('audit_logs').insert({
    actor: master.username,
    action: 'kiosk_login',
    meta: { kiosk_id: master.id, session_id: session?.id, ip, userAgent },
  });
  return ok({ kioskName: master.kiosk_name, sessionId: session?.id, sessionToken });
}

export async function kioskPing() {
  const jar = await cookies();
  const sessionToken = jar.get('kiosk-session')?.value;
  if (!sessionToken) return fail('UNAUTHORIZED', 'Sesi bilik tidak valid');
  const db = supabaseService();
  const now = new Date().toISOString();
  await db.from('kiosk_sessions').update({ last_ping: now }).eq('session_token', sessionToken);
  const { data: sess } = await db.from('kiosk_sessions').select('kiosk_id').eq('session_token', sessionToken).single();
  if (sess?.kiosk_id) {
    await db.from('kiosks').update({ last_ping: now }).eq('id', sess.kiosk_id);
  }
  return ok({ server_time: now });
}

export async function logoutKiosk() {
  const jar = await cookies();
  const sessionToken = jar.get('kiosk-session')?.value;
  if (sessionToken) {
    const db = supabaseService();
    await db.from('kiosk_sessions').update({ is_active: false }).eq('session_token', sessionToken);
  }
  jar.delete('kiosk-session');
  return ok({ loggedOut: true });
}

/** Resolve session_token cookie value → { kioskId, sessionId } or null. */
export async function resolveKioskSession() {
  const jar = await cookies();
  const sessionToken = jar.get('kiosk-session')?.value;
  if (!sessionToken) return null;
  const db = supabaseService();
  const { data } = await db
    .from('kiosk_sessions')
    .select('id, kiosk_id, is_active')
    .eq('session_token', sessionToken)
    .single();
  if (!data || !data.is_active) return null;
  return { kioskId: data.kiosk_id, sessionId: data.id };
}
