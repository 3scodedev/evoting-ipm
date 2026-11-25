-- 014 fast anonymous vote (BACKWARD COMPATIBLE)
--
-- PENTING — kenapa migrasi ini tidak men-drop fungsi lama:
-- kode yang sedang live di production masih memanggil signature lama
-- cast_vote(p_voter_id, p_candidate_id, p_kiosk_id). Kalau fungsi itu di-drop
-- sekarang, setiap suara langsung gagal. Jadi migrasi ini bersifat ADDITIVE:
-- dua signature hidup berdampingan, dan signature lama baru dihapus setelah
-- kode baru ter-deploy (lihat bagian CLEANUP di akhir file).
--
-- Isi migrasi:
--   1. Tutup lubang keamanan: cast_vote tidak boleh dipanggil role anon.
--      Anon key ada di bundle browser, jadi tanpa ini siapa pun bisa menyebar
--      suara lewat DevTools tanpa melewati bilik.
--   2. Tambah cast_vote(text, uuid): validasi sesi bilik di dalam DB sehingga
--      Server Action cukup 1 round trip. Jalur sukses = 1 statement SQL.
--   3. Tambah kiosk_ping(text): heartbeat 3 query -> 1 call.
--   4. Naikkan kiosk_max_sessions agar 5 bilik punya headroom reconnect.
--
-- Aman dijalankan berulang (idempotent).

-- ---------------------------------------------------------------------------
-- 1. Tutup akses anon ke signature LAMA (yang sedang dipakai production).
--    service_role tetap punya akses, jadi kode production sekarang tidak
--    terpengaruh — tapi browser/anon key tidak bisa lagi memanggilnya.
-- ---------------------------------------------------------------------------
revoke execute on function public.cast_vote(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.cast_vote(uuid, uuid, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 2. cast_vote versi baru: sesi bilik divalidasi di dalam DB.
-- ---------------------------------------------------------------------------
create or replace function public.cast_vote(p_session_token text, p_candidate_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status election_status;
  v_kiosk_id uuid;
begin
  -- Jalur sukses = satu statement. CTE `valid` hanya menghasilkan baris jika
  -- sesi bilik aktif DAN pemilihan berstatus 'start'; vote_count hanya naik
  -- jika kandidat ada; suara hanya masuk jika counter benar-benar naik.
  with valid as (
    select s.kiosk_id
    from kiosk_sessions s
    join election_settings e on e.id = 1
    where s.session_token = p_session_token
      and s.is_active = true
      and e.status = 'start'
  ),
  bumped as (
    update candidates c
    set vote_count = c.vote_count + 1
    where c.id = p_candidate_id
      and exists (select 1 from valid)
    returning c.id
  )
  insert into votes(candidate_id, kiosk_id)
  select p_candidate_id, v.kiosk_id
  from bumped, valid v;

  if found then
    return jsonb_build_object('success', true, 'code', 'OK');
  end if;

  -- Jalur error saja: satu query diagnosa supaya UI tahu harus redirect ke
  -- login, ke layar terkunci, atau menyuruh pemilih memilih ulang.
  select s.kiosk_id, e.status
    into v_kiosk_id, v_status
  from kiosk_sessions s
  join election_settings e on e.id = 1
  where s.session_token = p_session_token
    and s.is_active = true;

  if v_kiosk_id is null then
    return jsonb_build_object('success', false, 'code', 'UNAUTHORIZED');
  end if;

  if v_status is distinct from 'start' then
    return jsonb_build_object('success', false, 'code', 'ELECTION_CLOSED');
  end if;

  return jsonb_build_object('success', false, 'code', 'CANDIDATE_NOT_FOUND');
end;
$$;

revoke execute on function public.cast_vote(text, uuid) from public, anon, authenticated;
grant execute on function public.cast_vote(text, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 3. kiosk_ping: heartbeat bilik dalam SATU round trip.
--    Sebelumnya 3 query berurutan (update session, select session, update
--    kiosks) setiap 30 dtk per bilik.
-- ---------------------------------------------------------------------------
create or replace function public.kiosk_ping(p_session_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kiosk_id uuid;
  v_now timestamptz := now();
begin
  update kiosk_sessions
  set last_ping = v_now
  where session_token = p_session_token
    and is_active = true
  returning kiosk_id into v_kiosk_id;

  if v_kiosk_id is null then
    return jsonb_build_object('success', false, 'code', 'UNAUTHORIZED');
  end if;

  update kiosks set last_ping = v_now where id = v_kiosk_id;

  return jsonb_build_object('success', true, 'code', 'OK', 'server_time', v_now);
end;
$$;

revoke execute on function public.kiosk_ping(text) from public, anon, authenticated;
grant execute on function public.kiosk_ping(text) to service_role;

-- ---------------------------------------------------------------------------
-- 4. Headroom sesi bilik.
--    5 bilik + laptop yang reconnect membuat sesi lama tetap aktif sampai TTL
--    12 jam. Dengan cap = 5, login ke-6 meng-evict bilik yang masih live
--    (eviction memilih last_ping paling lama). 8 memberi ruang reconnect.
-- ---------------------------------------------------------------------------
update public.election_settings
set kiosk_max_sessions = 8
where id = 1
  and kiosk_max_sessions < 8;

-- CLEANUP (jalankan HANYA setelah kode baru ter-deploy dan terbukti jalan):
--   drop function if exists public.cast_vote(uuid, uuid, uuid);
--
-- DOWN (mengembalikan ke kondisi sebelum 014):
--   drop function if exists public.cast_vote(text, uuid);
--   drop function if exists public.kiosk_ping(text);
