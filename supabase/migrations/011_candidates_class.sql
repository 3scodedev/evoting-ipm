-- 011 kolom kelas kandidat
-- Kelas asal kandidat (opsional), cth: "XI RPL 1". Tampil di admin, kartu bilik, rekap & berita acara.
alter table public.candidates
  add column if not exists class_name text not null default '' check (char_length(class_name) <= 60);

-- DOWN: alter table public.candidates drop column class_name;
