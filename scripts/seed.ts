import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const args = process.argv.slice(2);

async function main() {
  if (!url || !service) {
    console.log('Set NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY dulu. Mode dry-run: cetak rencana.');
  }
  const db = createClient(url, service, { auth: { persistSession: false } });
  if (args.includes('--reset-votes')) {
    console.log('Reset votes: TRUNCATE votes + reset vote_count (jalankan di dashboard SQL).');
    console.log('TRUNCATE votes; UPDATE candidates SET vote_count=0;');
    return;
  }
  console.log('Seed plan: 3 kiosks + 3 candidates.');
  if (args.includes('--references') || args.length === 0) {
    const booths = ['Bilik Lab 1', 'Bilik Lab 2', 'Bilik Aula'];
    for (let i = 0; i < booths.length; i++) {
      const n = booths[i];
      const username = n.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      await db.from('kiosks').upsert(
        { kiosk_name: n, username, password_hash: await bcrypt.hash('Bilik#123', 10) },
        { onConflict: 'username', ignoreDuplicates: true }
      );
    }
    for (const c of [
      { candidate_number: 1, name: 'Ananda Pratama', vision_mission: 'IPM Berkemajuan.' },
      { candidate_number: 2, name: 'Bemby Ghulam', vision_mission: 'Aktif dan kolaboratif.' },
      { candidate_number: 3, name: 'Citra Lestari', vision_mission: 'Transparan dan bermanfaat.' },
    ]) {
      await db.from('candidates').upsert(c, { onConflict: 'candidate_number', ignoreDuplicates: true });
    }
    console.log('references ok');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
