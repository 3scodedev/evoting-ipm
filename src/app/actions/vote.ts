'use server';

import { z } from 'zod';
import { cookies } from 'next/headers';
import { supabaseService } from '@/lib/supabase/server';
import { ok, fail } from '@/lib/api-response';

const voteSchema = z.object({
  candidate_id: z.string().uuid(),
});

/**
 * Satu-satunya jalur tulis suara. Sengaja hanya 1 round trip:
 * `cast_vote` sendiri yang memvalidasi sesi bilik, status pemilihan, dan
 * menyimpan suara — tanpa SELECT sesi terpisah dari Node.
 * Target Active CPU: < 150 ms per suara.
 */
export async function castVote(input: { candidate_id: string }) {
  const parsed = voteSchema.safeParse(input);
  if (!parsed.success) return fail('VALIDATION_ERROR', 'Pilih kandidat dulu sebelum kirim.');

  const jar = await cookies();
  const sessionToken = jar.get('kiosk-session')?.value;
  if (!sessionToken) return fail('UNAUTHORIZED', 'Sesi bilik tidak valid. Ulangi dari awal.');

  const db = supabaseService();
  const { data, error } = await db.rpc('cast_vote', {
    p_session_token: sessionToken,
    p_candidate_id: parsed.data.candidate_id,
  });
  if (error) return fail('INTERNAL_ERROR', error.message);

  const d = data as { success: boolean; code: string };
  if (!d.success) {
    if (d.code === 'ELECTION_CLOSED') return fail('ELECTION_CLOSED', 'Pemilihan sedang jeda/ditutup.');
    if (d.code === 'UNAUTHORIZED') return fail('UNAUTHORIZED', 'Sesi bilik tidak valid. Ulangi dari awal.');
    return fail('NOT_FOUND', d.code);
  }
  return ok({ success: true });
}
