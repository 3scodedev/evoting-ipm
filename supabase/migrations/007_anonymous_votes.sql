-- Allow anonymous votes: voter_id becomes nullable, drop unique (was per-voter enforcement)
alter table public.votes alter column voter_id drop not null;
alter table public.votes drop constraint votes_voter_id_key;
