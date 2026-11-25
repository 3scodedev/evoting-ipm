'use server';

import { z } from 'zod';
import { cookies, headers } from 'next/headers';
import { supabaseService } from '@/lib/supabase/server';
import { hashPassword, verifyPassword } from '@/lib/auth-kiosk';
import { rateLimit } from '@/lib/rate-limit';
import { ok, fail } from '@/lib/api-response';

/** Cookie sesi bilik berumur 12 jam sejak login dan tidak diperbarui. */
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

/**
 * Token bilik selalu 8 huruf kapital, tapi input di layar memakai `uppercase`
 * CSS & keyboard HP bisa mengirim huruf kecil. Verifikasi mencoba bentuk
 * ternormalisasi supaya token yang diketik tetap cocok dengan hash bcrypt.
 */
function normalizeToken(value: string) {
  return value.replace(/\s+/g, '').toUpperCase();
}

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
      password_hash: await hashPassword(parsed.data.password),
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

  // Coba input apa adanya dulu (master lama bisa punya password bebas),
  // lalu versi ternormalisasi untuk token 8 huruf kapital.
  const raw = parsed.data.password;
  const normalized = normalizeToken(raw);
  const valid =
    (await verifyPassword(raw, master.password_hash)) ||
    (normalized !== raw && (await verifyPassword(normalized, master.password_hash)));
  if (!valid) return fail('INVALID_CREDENTIALS', 'Token salah. Pastikan 8 huruf kapital tanpa spasi.');

  // Check session limit + cari nomor device kosong terkecil (1..max).
  // Sesi yang cookie-nya sudah kedaluwarsa (> 12 jam sejak login) dianggap
  // mati: tanpa ini slot aktif bisa tertahan sesi hantu dan device baru
  // mem-evict device yang sebenarnya masih hidup.
  const { data: sessions } = await db
    .from('kiosk_sessions')
    .select('id, device_name, logged_in_at')
    .eq('kiosk_id', master.id)
    .eq('is_active', true);

  const now = Date.now();
  const expiredIds = (sessions ?? [])
    .filter((s) => now - new Date(s.logged_in_at).getTime() > SESSION_TTL_MS)
    .map((s) => s.id);
  if (expiredIds.length > 0) {
    await db.from('kiosk_sessions').update({ is_active: false }).in('id', expiredIds);
  }
  const activeSessions = (sessions ?? []).filter((s) => !expiredIds.includes(s.id));

  const activeCount = activeSessions.length;

  const { data: settings } = await db
    .from('election_settings')
    .select('kiosk_max_sessions')
    .eq('id', 1)
    .single();
  const maxSessions = settings?.kiosk_max_sessions ?? 10;

  const evictedIds: string[] = [];
  if (activeCount >= maxSessions) {
    // Evict oldest session supaya device baru tetap bisa masuk
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
      evictedIds.push(oldest.id);
    }
  }

  // Nomor device: pakai slot kosong terkecil supaya label tetap 1..max
  const usedNames = new Set(
    activeSessions.filter((s) => !evictedIds.includes(s.id)).map((s) => s.device_name)
  );
  let nextDeviceNo = 1;
  while (usedNames.has(`Device ${nextDeviceNo}`)) nextDeviceNo++;

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
  // Satu RPC = satu round trip (sebelumnya 3 query berurutan tiap 30 dtk/bilik).
  const { data, error } = await db.rpc('kiosk_ping', { p_session_token: sessionToken });
  if (error) return fail('INTERNAL_ERROR', error.message);
  const d = data as { success: boolean; code: string; server_time?: string };
  if (!d.success) return fail('UNAUTHORIZED', 'Sesi bilik tidak valid');
  return ok({ server_time: d.server_time });
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
