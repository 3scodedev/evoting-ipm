-- 012 kiosk_sessions: policy read authenticated + publikasi realtime
-- Dashboard "Bilik Live" membaca kiosk_sessions langsung dari browser admin
-- (postgres_changes + polling 5 dtk). Policy read + publikasi realtime untuk
-- tabel ini belum ada saat tabelnya dibuat (lihat 007_auth_read & 008_realtime),
-- sehingga kartu selalu kosong walau ada device aktif.
drop policy if exists "authenticated read kiosk_sessions" on kiosk_sessions;
create policy "authenticated read kiosk_sessions" on kiosk_sessions for select to authenticated using (true);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'kiosk_sessions'
  ) then
    alter publication supabase_realtime add table public.kiosk_sessions;
  end if;
exception when duplicate_object then
  null;
end $$;
-- DOWN: drop policy "authenticated read kiosk_sessions" on kiosk_sessions; alter publication supabase_realtime drop table public.kiosk_sessions;
