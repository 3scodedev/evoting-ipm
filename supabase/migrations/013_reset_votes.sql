-- 013 reset_votes: hapus semua suara + reset counter (admin only)
-- Dipakai tombol "Reset Suara" di Command Center. Hanya boleh saat pemilihan
-- tidak berjalan supaya tidak menghapus suara di tengah proses voting.
create or replace function public.reset_votes(p_actor text default 'system')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status election_status;
  v_deleted integer;
begin
  select status into v_status
  from election_settings
  where id = 1
  for update;

  if v_status = 'start' then
    return jsonb_build_object('success', false, 'code', 'ELECTION_RUNNING');
  end if;

  -- Supabase safeupdate menolak DELETE tanpa WHERE, jadi pakai kondisi eksplisit.
  delete from votes where id is not null;
  get diagnostics v_deleted = row_count;

  update candidates set vote_count = 0 where vote_count <> 0;
  update voters set has_voted = false, voted_at = null
  where has_voted = true or voted_at is not null;

  update election_settings
  set results_hash = null,
      stopped_at = null,
      status = case when status = 'stop' then 'pause'::election_status else status end
  where id = 1;

  insert into audit_logs(actor, action, meta)
  values (
    coalesce(nullif(p_actor, ''), 'system'),
    'votes_reset',
    jsonb_build_object('votes_deleted', v_deleted, 'previous_status', v_status)
  );

  return jsonb_build_object('success', true, 'code', 'OK', 'deleted', v_deleted);
end;
$$;

-- Jangan biarkan anon/authenticated memanggil fungsi destruktif ini.
revoke all on function public.reset_votes(text) from public, anon, authenticated;
grant execute on function public.reset_votes(text) to service_role;

-- DOWN: drop function if exists public.reset_votes(text);
