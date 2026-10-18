-- 010 deterministic master kiosk
-- Kiosks table needs a stable timestamp so "the master" is always the same row
-- (queries pick is_active = true order by created_at asc, id asc limit 1).
alter table public.kiosks
  add column if not exists created_at timestamptz not null default now();

-- Shared credential design (008) expects exactly ONE active master kiosk.
-- Deactivate every other row; the oldest active master stays.
update public.kiosks k
set is_active = false
where k.is_active = true
  and k.id <> (
    select k2.id from public.kiosks k2
    where k2.is_active = true
    order by k2.created_at asc, k2.id asc
    limit 1
  );

-- tokens on deactivated rows are no longer meaningful; blank them
update public.kiosks set token = null where is_active = false;
