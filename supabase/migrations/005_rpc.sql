-- 005 RPC cast_vote — updated to support NULL voter_id for anonymous kiosk voting
create or replace function public.cast_vote(p_voter_id uuid, p_candidate_id uuid, p_kiosk_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_status election_status; v_voted bool;
begin
  select status into v_status from election_settings where id = 1;
  if v_status is distinct from 'start' then
    return jsonb_build_object('success', false, 'code', 'ELECTION_CLOSED');
  end if;

  -- Only check double-vote when voter_id is provided (identified voter mode)
  if p_voter_id is not null then
    select has_voted into v_voted from voters where id = p_voter_id for update;
    if not found then
      return jsonb_build_object('success', false, 'code', 'VOTER_NOT_FOUND');
    end if;
    if v_voted then
      return jsonb_build_object('success', false, 'code', 'ALREADY_VOTED');
    end if;
  end if;

  insert into votes(voter_id, candidate_id, kiosk_id) values (p_voter_id, p_candidate_id, p_kiosk_id);
  update candidates set vote_count = vote_count + 1 where id = p_candidate_id;

  if p_voter_id is not null then
    update voters set has_voted = true, voted_at = now() where id = p_voter_id;
  end if;

  insert into audit_logs(actor, action, meta)
  values (
    coalesce(p_voter_id::text, p_kiosk_id::text),
    'cast_vote',
    jsonb_build_object('candidate', p_candidate_id, 'kiosk', p_kiosk_id, 'voter_id', p_voter_id)
  );
  return jsonb_build_object('success', true, 'code', 'OK');
exception when unique_violation then
  return jsonb_build_object('success', false, 'code', 'ALREADY_VOTED');
end $$;
