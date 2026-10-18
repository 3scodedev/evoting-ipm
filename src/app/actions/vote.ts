'use server';

import { z } from 'zod';
import { supabaseService } from '@/lib/supabase/server';
import { ok, fail } from '@/lib/api-response';
import { resolveKioskSession } from './kiosk';

const voteSchema = z.object({
  candidate_id: z.string().uuid(),
});

export async function castVote(input: { candidate_id: string }) {
  const parsed = voteSchema.safeParse(input);
  if (!parsed.success) return fail('VALIDATION_ERROR', 'Pilih kandidat dulu sebelum kirim.');
  const session = await resolveKioskSession();
  if (!session) return fail('UNAUTHORIZED', 'Sesi bilik tidak valid. Ulangi dari awal.');
  const db = supabaseService();
  const { data, error } = await db.rpc('cast_vote', {
    p_voter_id: null,
    p_candidate_id: parsed.data.candidate_id,
    p_kiosk_id: session.kioskId,
  });
  if (error) return fail('INTERNAL_ERROR', error.message);
  const d = data as { success: boolean; code: string };
  if (!d.success) {
    if (d.code === 'ELECTION_CLOSED') return fail('ELECTION_CLOSED', 'Pemilihan sedang jeda/ditutup.');
    return fail('NOT_FOUND', d.code);
  }
  return ok(data);
}
