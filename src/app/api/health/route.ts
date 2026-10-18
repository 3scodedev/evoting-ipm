import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase/server';

/**
 * Health check + keep-alive.
 *
 * Query dilakukan ke tabel asli (bukan cuma endpoint auth) supaya request
 * dari cron harian / monitor eksternal benar-benar terhitung sebagai
 * aktivitas project oleh Supabase — mencegah project free tier di-pause
 * otomatis setelah 7 hari tanpa aktivitas.
 */
export async function GET() {
  const started = Date.now();
  let dbOk = false;
  try {
    const db = supabaseService();
    const { error } = await db.from('election_settings').select('status').eq('id', 1).maybeSingle();
    dbOk = !error;
  } catch {
    dbOk = false;
  }
  const dbMs = Date.now() - started;
  return NextResponse.json({ success: true, data: { ok: true, db_reachable: dbOk, db_ms: dbMs }, error: null });
}
