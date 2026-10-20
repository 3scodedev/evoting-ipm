'use server';

import { z } from 'zod';
import sharp from 'sharp';
import { supabaseService, supabaseServer } from '@/lib/supabase/server';
import { getDashboardUser, requireAdminUser } from '@/lib/auth-admin';
import { ok, fail } from '@/lib/api-response';

const MAX_MB = Number(process.env.MAX_UPLOAD_MB ?? 2);
const SIGNED_TTL = Number(process.env.SIGNED_URL_TTL ?? 3600);
const BUCKET = process.env.STORAGE_BUCKET ?? 'candidates';

// Foto kandidat dikompres di server supaya egress Supabase hemat saat ribuan pemilih buka surat suara.
const PHOTO_MAX_PX = 800;
const PHOTO_QUALITY = 72;
const PHOTO_CACHE_CONTROL = '31536000'; // 1 tahun — browser tidak download ulang foto yang sama

export type AdminCandidate = {
  id: string;
  candidate_number: number;
  name: string;
  class_name: string;
  vision_mission: string;
  photo_path: string | null;
  photo_url: string | null; // signed URL siap tampil
  vote_count: number;
};

async function requireUser() {
  const user = await getDashboardUser();
  return user ? null : fail('UNAUTHORIZED', 'Login dulu untuk membuka data kandidat');
}

async function requireAdmin() {
  const user = await requireAdminUser();
  return user ? null : fail('FORBIDDEN', 'Hanya admin yang bisa mengubah data kandidat');
}

/** Daftar kandidat untuk dashboard admin/panitia — lengkap dengan signed URL foto + jumlah suara. */
export async function listCandidatesAdmin() {
  const denied = await requireUser();
  if (denied) return denied;
  const db = supabaseService();
  const { data, error } = await db
    .from('candidates')
    .select('id, candidate_number, name, class_name, vision_mission, photo_url, vote_count')
    .order('candidate_number');
  if (error) return fail('INTERNAL_ERROR', error.message);

  const paths = (data ?? []).map((c) => c.photo_url).filter((p): p is string => !!p);
  const signed = new Map<string, string>();
  if (paths.length > 0) {
    const { data: urls } = await db.storage.from(BUCKET).createSignedUrls(paths, SIGNED_TTL);
    for (const u of urls ?? []) {
      if (u.path && u.signedUrl) signed.set(u.path, u.signedUrl);
    }
  }
  const rows: AdminCandidate[] = (data ?? []).map((c) => ({
    id: c.id,
    candidate_number: c.candidate_number,
    name: c.name,
    class_name: c.class_name,
    vision_mission: c.vision_mission,
    photo_path: c.photo_url,
    photo_url: c.photo_url ? signed.get(c.photo_url) ?? null : null,
    vote_count: c.vote_count,
  }));
  return ok({ rows });
}

export async function upsertCandidate(formData: FormData) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const schema = z.object({
    id: z.string().uuid().optional(),
    candidate_number: z.coerce.number().int({ message: 'Nomor urut harus angka.' }).min(1, 'Nomor urut minimal 1.').max(20, 'Nomor urut maksimal 20.'),
    name: z.string().trim().min(3, 'Nama minimal 3 karakter.').max(120, 'Nama maksimal 120 karakter.'),
    class_name: z.string().trim().max(60, 'Kelas maksimal 60 karakter.'),
    vision_mission: z.string().trim().max(2000, 'Visi misi maksimal 2000 karakter.'),
  });
  const parsed = schema.safeParse({
    id: formData.get('id') || undefined,
    candidate_number: formData.get('candidate_number'),
    name: formData.get('name'),
    class_name: formData.get('class_name') ?? '',
    vision_mission: formData.get('vision_mission'),
  });
  if (!parsed.success) {
    return fail('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Form kandidat tidak valid');
  }

  const db = supabaseService();
  const { id, candidate_number, name, class_name } = parsed.data;
  // Visi misi selalu dirender sebagai text node (React otomatis escape), jadi tidak
  // perlu jsdom/DOMPurify. Tag HTML dibuang supaya teks lama tidak tampil mentah.
  const cleanVision = parsed.data.vision_mission.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  // Foto lama (kalau mode edit) — dipakai untuk cleanup setelah sukses
  let oldPhotoPath: string | null = null;
  if (id) {
    const { data: existing } = await db.from('candidates').select('photo_url').eq('id', id).single();
    oldPhotoPath = existing?.photo_url ?? null;
  }

  let photoPath: string | undefined;
  const file = formData.get('photo');
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_MB * 1024 * 1024) return fail('VALIDATION_ERROR', `Foto maksimal ${MAX_MB}MB.`);
    const allowed = file.type === 'image/png' || file.type === 'image/webp' || file.type === 'image/jpeg';
    if (!allowed) return fail('VALIDATION_ERROR', 'Foto harus JPG, PNG, atau WebP.');

    // Resize ≤800px + WebP q72 → foto kecil otomatis, panitia tidak perlu kompres manual.
    // Kalau sharp gagal (format aneh), unggah apa adanya biar tidak menghambat.
    let uploadBody: File | Buffer = file;
    let ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    let contentType = file.type;
    try {
      uploadBody = await sharp(Buffer.from(await file.arrayBuffer()))
        .rotate()
        .resize({ width: PHOTO_MAX_PX, height: PHOTO_MAX_PX, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: PHOTO_QUALITY })
        .toBuffer();
      ext = 'webp';
      contentType = 'image/webp';
    } catch {
      uploadBody = file;
    }

    photoPath = `candidates/${candidate_number}-${Date.now()}.${ext}`;
    const { error: upErr } = await db.storage.from(BUCKET).upload(photoPath, uploadBody, {
      upsert: true,
      contentType,
      cacheControl: PHOTO_CACHE_CONTROL,
    });
    if (upErr) return fail('INTERNAL_ERROR', `Upload foto gagal: ${upErr.message}`);
  }

  const payload: Record<string, unknown> = { candidate_number, name, class_name, vision_mission: cleanVision };
  if (photoPath) payload.photo_url = photoPath;

  const query = id
    ? db.from('candidates').update(payload).eq('id', id).select('id').single()
    : db.from('candidates').insert(payload).select('id').single();
  const { data, error } = await query;
  if (error) {
    if (photoPath) await db.storage.from(BUCKET).remove([photoPath]);
    if (error.code === '23505') return fail('VALIDATION_ERROR', `Nomor urut ${candidate_number} sudah dipakai kandidat lain.`);
    return fail('INTERNAL_ERROR', error.message);
  }

  // Foto tergantikan → hapus file lama biar storage bersih
  if (photoPath && oldPhotoPath && oldPhotoPath !== photoPath) {
    await db.storage.from(BUCKET).remove([oldPhotoPath]);
  }
  return ok(data);
}

export async function deleteCandidate(input: { id: string }) {
  const parsed = z.object({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return fail('VALIDATION_ERROR', 'Input tidak valid');
  const denied = await requireAdmin();
  if (denied) return denied;

  const db = supabaseService();
  const { data: cand } = await db
    .from('candidates')
    .select('id, name, photo_url, vote_count')
    .eq('id', parsed.data.id)
    .single();
  if (!cand) return fail('NOT_FOUND', 'Kandidat tidak ditemukan.');

  // Coba hapus kandidat. Kalau masih terhubung suara, FK `on delete restrict` akan menahan
  // → hapus dulu suara milik kandidat ini (user sudah dikonfirmasi di UI), lalu ulangi.
  const attemptDelete = () => db.from('candidates').delete().eq('id', parsed.data.id);
  let votesRemoved = 0;
  let { error } = await attemptDelete();
  if (error && error.code === '23503') {
    const { count, error: votesError } = await db
      .from('votes')
      .delete({ count: 'exact' })
      .eq('candidate_id', parsed.data.id);
    if (votesError) return fail('INTERNAL_ERROR', votesError.message);
    votesRemoved = count ?? cand.vote_count;
    ({ error } = await attemptDelete());
  }
  if (error) return fail('INTERNAL_ERROR', error.message);

  if (cand.photo_url) await db.storage.from(BUCKET).remove([cand.photo_url]);

  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  const { error: logError } = await db.from('audit_logs').insert({
    actor: auth.user?.email ?? auth.user?.id ?? 'admin',
    action: 'candidate_delete',
    meta: { candidate_id: cand.id, name: cand.name, votes_removed: votesRemoved },
  });
  if (logError) console.error('audit_logs insert gagal:', logError.message);

  return ok({ deleted: true, votes_removed: votesRemoved });
}
