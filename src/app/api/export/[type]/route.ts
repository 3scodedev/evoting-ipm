import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase/server';

export async function GET(_req: Request, { params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  if (type !== 'results') {
    return NextResponse.json({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'Tipe export tidak dikenal' } }, { status: 404 });
  }
  const db = supabaseService();
  const { data } = await db.from('candidates').select('candidate_number, name, class_name, vote_count').order('candidate_number');
  const total = (data ?? []).reduce((a, c) => a + (c.vote_count ?? 0), 0);
  const csv = ['no,nama,kelas,suara,persen', ...(data ?? []).map((c) => `${c.candidate_number},"${c.name}","${c.class_name}",${c.vote_count},${total ? ((c.vote_count / total) * 100).toFixed(1) : '0.0'}`)].join('\n');
  return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="hasil.csv"' } });
}
