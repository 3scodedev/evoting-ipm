import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Backup manual semua tabel penting ke backups/<timestamp>/*.json.
 *
 * Supabase free plan tidak punya backup otomatis — jalankan sebelum & sesudah
 * hari-H: `bun run backup` (env NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY,
 * bun otomatis membaca .env.local).
 *
 * Isi folder `backups/` mengandung data sensitif (mis. hash password bilik)
 * → jangan commit; sudah masuk .gitignore.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const args = process.argv.slice(2);

const TABLES = [
  'election_settings',
  'candidates',
  'voters',
  'kiosks',
  'kiosk_sessions',
  'votes',
  'audit_logs',
] as const;

const PAGE_SIZE = 1000; // batas default PostgREST = 1000 baris per request

async function fetchAll(db: SupabaseClient, table: string) {
  const rows: unknown[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await db.from(table).select('*').range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}

async function main() {
  if (!url || !service) {
    console.error('Set NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY dulu (bun otomatis membaca .env.local).');
    process.exit(1);
  }
  const db = createClient(url, service, { auth: { persistSession: false } });

  const outIdx = args.indexOf('--out');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outDir = outIdx >= 0 ? args[outIdx + 1] : join('backups', stamp);
  await mkdir(outDir, { recursive: true });

  const manifest = {
    created_at: new Date().toISOString(),
    source: url,
    tables: {} as Record<string, number>,
  };

  for (const table of TABLES) {
    const rows = await fetchAll(db, table);
    await writeFile(join(outDir, `${table}.json`), JSON.stringify(rows, null, 2));
    manifest.tables[table] = rows.length;
    console.log(`✓ ${table}: ${rows.length} baris`);
  }

  await writeFile(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`\nBackup selesai → ${outDir}`);
}

main().catch((e) => {
  console.error('Backup gagal:', e instanceof Error ? e.message : e);
  process.exit(1);
});
