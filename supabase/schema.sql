-- =====================================================================
-- SOP Sayang (Faid & Della) — skema database Supabase
-- Jalankan sekali di Supabase: SQL Editor > New query > tempel > Run
-- =====================================================================

-- Anggota aplikasi (hanya Faid & Della). Diisi manual setelah akun dibuat.
create table if not exists public.profiles (
  id       uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  nama     text not null
);

-- Fungsi bantu: apakah user yang login adalah anggota
create or replace function public.is_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid());
$$;

-- Tanggal hari ini dalam WITA
create or replace function public.hari_ini_wita()
returns date
language sql
stable
as $$
  select (now() at time zone 'Asia/Makassar')::date;
$$;

-- Checklist harian (sholat 5 waktu + komunikasi)
create table if not exists public.harian (
  id      bigint generated always as identity primary key,
  tanggal date not null default public.hari_ini_wita(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  item    text not null,
  waktu   timestamptz not null default now(),
  unique (tanggal, user_id, item)
);

-- Checklist mingguan, minggu = kunci ISO, contoh 2026-W44
create table if not exists public.mingguan (
  id      bigint generated always as identity primary key,
  minggu  text not null,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  item    text not null,
  waktu   timestamptz not null default now(),
  unique (minggu, user_id, item)
);

-- Evaluasi bulanan, bulan = yyyy-MM
create table if not exists public.bulanan (
  bulan            text not null,
  user_id          uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  hal_baik         text not null default '',
  perlu_diperbaiki text not null default '',
  catatan          text not null default '',
  waktu            timestamptz not null default now(),
  primary key (bulan, user_id)
);

-- Setoran tabungan nikah
create table if not exists public.tabungan (
  id         bigint generated always as identity primary key,
  tanggal    date not null default public.hari_ini_wita(),
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  nominal    bigint not null check (nominal > 0),
  keterangan text not null default '',
  created_at timestamptz not null default now()
);

-- Roadmap menuju pernikahan
create table if not exists public.roadmap (
  id         int primary key,
  langkah    text not null,
  target     text not null default '',
  status     text not null default 'Belum' check (status in ('Belum', 'Proses', 'Selesai')),
  diubah_oleh uuid references public.profiles (id),
  diubah     timestamptz
);

-- Pengaturan bersama (target tabungan, mode)
create table if not exists public.pengaturan (
  kunci text primary key,
  nilai text not null
);

-- ---------------------------------------------------------------------
-- Data awal
-- ---------------------------------------------------------------------
insert into public.roadmap (id, langkah) values
  (1, 'SOP disahkan'),
  (2, 'Perkenalan kedua keluarga'),
  (3, 'Lamaran'),
  (4, 'Akad nikah 2027')
on conflict (id) do nothing;

insert into public.pengaturan (kunci, nilai) values
  ('target_tabungan', '0'),
  ('mode', 'Satu Kota')
on conflict (kunci) do nothing;

-- ---------------------------------------------------------------------
-- Keamanan (RLS): hanya Faid & Della yang bisa membaca.
-- Masing-masing hanya bisa menulis / menghapus datanya sendiri.
-- ---------------------------------------------------------------------
alter table public.profiles   enable row level security;
alter table public.harian     enable row level security;
alter table public.mingguan   enable row level security;
alter table public.bulanan    enable row level security;
alter table public.tabungan   enable row level security;
alter table public.roadmap    enable row level security;
alter table public.pengaturan enable row level security;

drop policy if exists "anggota baca" on public.profiles;
create policy "anggota baca" on public.profiles
  for select to authenticated using (public.is_member());

-- harian, mingguan, bulanan, tabungan: baca bersama, tulis milik sendiri
do $$
declare t text;
begin
  foreach t in array array['harian', 'mingguan', 'bulanan', 'tabungan'] loop
    execute format('drop policy if exists "anggota baca" on public.%I', t);
    execute format('drop policy if exists "tambah sendiri" on public.%I', t);
    execute format('drop policy if exists "ubah sendiri" on public.%I', t);
    execute format('drop policy if exists "hapus sendiri" on public.%I', t);
    execute format('create policy "anggota baca" on public.%I for select to authenticated using (public.is_member())', t);
    execute format('create policy "tambah sendiri" on public.%I for insert to authenticated with check (public.is_member() and user_id = auth.uid())', t);
    execute format('create policy "ubah sendiri" on public.%I for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('create policy "hapus sendiri" on public.%I for delete to authenticated using (user_id = auth.uid())', t);
  end loop;
end $$;

-- roadmap & pengaturan: dibaca dan diubah berdua
drop policy if exists "anggota baca" on public.roadmap;
drop policy if exists "anggota ubah" on public.roadmap;
create policy "anggota baca" on public.roadmap for select to authenticated using (public.is_member());
create policy "anggota ubah" on public.roadmap for update to authenticated
  using (public.is_member()) with check (public.is_member());

drop policy if exists "anggota baca" on public.pengaturan;
drop policy if exists "anggota ubah" on public.pengaturan;
create policy "anggota baca" on public.pengaturan for select to authenticated using (public.is_member());
create policy "anggota ubah" on public.pengaturan for update to authenticated
  using (public.is_member()) with check (public.is_member() and kunci in ('target_tabungan', 'mode'));

-- Realtime: centang pasangan langsung muncul tanpa refresh
do $$
begin
  begin alter publication supabase_realtime add table public.harian;     exception when others then null; end;
  begin alter publication supabase_realtime add table public.mingguan;   exception when others then null; end;
  begin alter publication supabase_realtime add table public.pengaturan; exception when others then null; end;
end $$;

-- =====================================================================
-- SETELAH membuat 2 akun di Authentication > Users (Add user, centang
-- Auto Confirm, password = PIN 6 angka):
--   faid@sopsayang.app  dan  della@sopsayang.app
-- jalankan ini:
--
-- insert into public.profiles (id, username, nama)
--   select id, 'faid', 'Faid' from auth.users where email = 'faid@sopsayang.app';
-- insert into public.profiles (id, username, nama)
--   select id, 'della', 'Della' from auth.users where email = 'della@sopsayang.app';
-- =====================================================================
