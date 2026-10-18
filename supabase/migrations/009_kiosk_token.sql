-- 009 kiosk token: token 8 huruf kapital yang stabil, tampil di panel admin.
-- Disimpan plaintext khusus untuk display/salin; verifikasi login tetap via password_hash (bcrypt).
alter table public.kiosks
  add column if not exists token text;
