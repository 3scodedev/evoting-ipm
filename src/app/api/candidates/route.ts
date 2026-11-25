import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase/server';

const SIGNED_TTL = Number(process.env.SIGNED_URL_TTL ?? 3600);
const BUCKET = process.env.STORAGE_BUCKET ?? 'candidates';

/**
 * Cache signed URL foto per instance server.
 *
 * Tanpa cache, tiap pemilih dapat token URL baru → browser selalu download
 * ulang foto kandidat (cache miss). URL yang stabil membuat browser cukup
 * menyimpan foto sekali per device, sehingga egress Supabase tetap kecil
 * meski ribuan pemilih membuka surat suara.
 */
const signedCache = new Map<string, { url: string; expiresAt: number }>();

function signedTtlMs() {
  // Selalu lebih pendek dari masa berlaku token supaya URL yang dikirim tidak kedaluwarsa.
  return Math.max(60_000, (SIGNED_TTL - 300) * 1000);
}

export async function GET() {
  const db = supabaseService();
  const { data } = await db
    .from('candidates')
    .select('id, candidate_number, name, class_name, vision_mission, photo_url')
    .eq('is_active', true)
    .order('candidate_number');

  const rows = data ?? [];
  const now = Date.now();
  const missing: string[] = [];
  const signed = new Map<string, string>();

  for (const p of rows.map((c) => c.photo_url).filter((p): p is string => !!p)) {
    const hit = signedCache.get(p);
    if (hit && hit.expiresAt > now) signed.set(p, hit.url);
    else missing.push(p);
  }

  if (missing.length > 0) {
    const { data: urls } = await db.storage.from(BUCKET).createSignedUrls(missing, SIGNED_TTL);
    const expiresAt = now + signedTtlMs();
    for (const u of urls ?? []) {
      if (u.path && u.signedUrl) {
        signed.set(u.path, u.signedUrl);
        signedCache.set(u.path, { url: u.signedUrl, expiresAt });
      }
    }
  }

  return NextResponse.json(
    {
      success: true,
      data: rows.map((c) => ({
        ...c,
        photo_url: c.photo_url ? signed.get(c.photo_url) ?? null : null,
      })),
      error: null,
    },
    {
      // 6 bilik memuat daftar yang sama saat hari-H dimulai: biarkan edge
      // menyajikannya dari cache supaya hanya 1 invocation yang tetap bayar CPU.
      headers: { 'Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=60' },
    }
  );
}
