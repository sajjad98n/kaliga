-- ============================================================
-- کالیگا | زیرساخت امن ثبت‌نام مسابقات گل کوچک
-- این فایل را یک‌بار در Supabase > SQL Editor اجرا کنید.
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- تنظیمات عمومی مسابقات ----------
create table if not exists public.gol_settings (
  id smallint primary key default 1 check (id = 1),
  registration_open boolean not null default true,
  registration_deadline timestamptz not null default '2026-07-28 23:59:59+03:30',
  deadline_label text not null default '۶ مرداد ۱۴۰۵',
  min_age smallint not null default 15 check (min_age between 1 and 99),
  age_reference_year smallint not null default 1405,
  age_reference_month smallint not null default 5 check (age_reference_month between 1 and 12),
  age_reference_day smallint not null default 6 check (age_reference_day between 1 and 31),
  team_size smallint not null default 5 check (team_size = 5),
  fee_toman bigint not null default 1500000 check (fee_toman >= 0),
  bank_account text not null default '',
  account_holder text not null default '',
  updated_at timestamptz not null default now()
);

insert into public.gol_settings (
  id, registration_open, registration_deadline, deadline_label, min_age,
  age_reference_year, age_reference_month, age_reference_day,
  team_size, fee_toman, bank_account, account_holder
)
values (1, true, '2026-07-28 23:59:59+03:30', '۶ مرداد ۱۴۰۵', 15, 1405, 5, 6, 5, 1500000, '', '')
on conflict (id) do update set
  registration_deadline = excluded.registration_deadline,
  deadline_label = excluded.deadline_label,
  min_age = excluded.min_age,
  age_reference_year = excluded.age_reference_year,
  age_reference_month = excluded.age_reference_month,
  age_reference_day = excluded.age_reference_day,
  team_size = excluded.team_size,
  fee_toman = excluded.fee_toman;

-- ---------- مدیران ----------
create table if not exists public.gol_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  created_at timestamptz not null default now()
);

create or replace function public.gol_is_admin(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.gol_admins where user_id = p_user_id);
$$;

-- ---------- تیم‌ها ----------
create table if not exists public.gol_teams (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  team_name text not null,
  team_key text not null unique,
  captain_phone text not null,
  status text not null default 'incomplete' check (status in (
    'incomplete','awaiting_payment','payment_submitted','approved','needs_correction','rejected'
  )),
  admin_note text,
  payment_receipt_path text,
  registration_report_path text,
  payment_submitted_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(team_name) between 2 and 60),
  check (char_length(team_key) between 2 and 80),
  check (captain_phone ~ '^09[0-9]{9}$')
);

create table if not exists public.gol_players (
  id bigint generated always as identity primary key,
  team_id uuid not null references public.gol_teams(id) on delete cascade,
  player_order smallint not null check (player_order between 1 and 5),
  is_captain boolean not null default false,
  full_name text not null check (char_length(full_name) between 3 and 100),
  father_name text not null check (char_length(father_name) between 2 and 80),
  national_id text not null unique check (national_id ~ '^[0-9]{10}$'),
  birth_year smallint not null,
  birth_month smallint not null check (birth_month between 1 and 12),
  birth_day smallint not null check (birth_day between 1 and 31),
  insurance_path text not null,
  created_at timestamptz not null default now(),
  unique(team_id, player_order)
);

create index if not exists gol_teams_status_idx on public.gol_teams(status);
create index if not exists gol_players_team_idx on public.gol_players(team_id);

-- ---------- اعتبارسنجی سروری ----------
create or replace function public.gol_prepare_team()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  s public.gol_settings;
begin
  select * into s from public.gol_settings where id = 1;
  if not s.registration_open or now() > s.registration_deadline then
    raise exception 'مهلت ثبت‌نام پایان یافته است.';
  end if;
  new.status := 'incomplete';
  new.admin_note := null;
  new.payment_receipt_path := null;
  new.registration_report_path := null;
  new.payment_submitted_at := null;
  new.approved_at := null;
  new.created_at := coalesce(new.created_at, now());
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists gol_prepare_team_trigger on public.gol_teams;
create trigger gol_prepare_team_trigger
before insert on public.gol_teams
for each row execute function public.gol_prepare_team();

create or replace function public.gol_validate_player()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  s public.gol_settings;
  team_status text;
  latest_birth_year integer;
  max_day integer;
begin
  select * into s from public.gol_settings where id = 1;
  select status into team_status from public.gol_teams where id = new.team_id;

  if team_status not in ('incomplete','needs_correction') then
    raise exception 'اطلاعات بازیکنان در این وضعیت قابل تغییر نیست.';
  end if;

  if team_status = 'incomplete' and (not s.registration_open or now() > s.registration_deadline) then
    raise exception 'مهلت ثبت‌نام پایان یافته است.';
  end if;

  if new.player_order = 1 and not new.is_captain then
    raise exception 'بازیکن شماره یک باید کاپیتان باشد.';
  end if;
  if new.player_order > 1 and new.is_captain then
    raise exception 'فقط بازیکن شماره یک می‌تواند کاپیتان باشد.';
  end if;

  max_day := case when new.birth_month <= 6 then 31 when new.birth_month <= 11 then 30 else 30 end;
  if new.birth_day > max_day then
    raise exception 'تاریخ تولد معتبر نیست.';
  end if;

  latest_birth_year := s.age_reference_year - s.min_age;
  if (new.birth_year, new.birth_month, new.birth_day) >
     (latest_birth_year, s.age_reference_month, s.age_reference_day) then
    raise exception 'شرایط حداقل سن رعایت نشده است.';
  end if;

  if new.insurance_path not like auth.uid()::text || '/insurance/%' then
    raise exception 'مسیر فایل بیمه معتبر نیست.';
  end if;

  return new;
end;
$$;

drop trigger if exists gol_validate_player_trigger on public.gol_players;
create trigger gol_validate_player_trigger
before insert or update on public.gol_players
for each row execute function public.gol_validate_player();

-- ---------- دسترسی ردیفی ----------
alter table public.gol_settings enable row level security;
alter table public.gol_admins enable row level security;
alter table public.gol_teams enable row level security;
alter table public.gol_players enable row level security;

revoke all on public.gol_settings from anon, authenticated;
revoke all on public.gol_admins from anon, authenticated;
revoke all on public.gol_teams from anon, authenticated;
revoke all on public.gol_players from anon, authenticated;

grant select on public.gol_settings to anon, authenticated;
grant select on public.gol_admins to authenticated;
grant select, insert on public.gol_teams to authenticated;
grant select, insert, delete on public.gol_players to authenticated;
grant usage, select on sequence public.gol_players_id_seq to authenticated;

drop policy if exists gol_settings_public_read on public.gol_settings;
create policy gol_settings_public_read on public.gol_settings
for select to anon, authenticated using (true);

drop policy if exists gol_admins_read_self on public.gol_admins;
create policy gol_admins_read_self on public.gol_admins
for select to authenticated using (user_id = auth.uid());

drop policy if exists gol_teams_read_own_or_admin on public.gol_teams;
create policy gol_teams_read_own_or_admin on public.gol_teams
for select to authenticated using (owner_id = auth.uid() or public.gol_is_admin());

drop policy if exists gol_teams_insert_own on public.gol_teams;
create policy gol_teams_insert_own on public.gol_teams
for insert to authenticated with check (owner_id = auth.uid());

drop policy if exists gol_players_read_own_or_admin on public.gol_players;
create policy gol_players_read_own_or_admin on public.gol_players
for select to authenticated using (
  exists(select 1 from public.gol_teams t where t.id = team_id and (t.owner_id = auth.uid() or public.gol_is_admin()))
);

drop policy if exists gol_players_insert_own on public.gol_players;
create policy gol_players_insert_own on public.gol_players
for insert to authenticated with check (
  exists(select 1 from public.gol_teams t where t.id = team_id and t.owner_id = auth.uid() and t.status in ('incomplete','needs_correction'))
);

drop policy if exists gol_players_delete_own on public.gol_players;
create policy gol_players_delete_own on public.gol_players
for delete to authenticated using (
  exists(select 1 from public.gol_teams t where t.id = team_id and t.owner_id = auth.uid() and t.status in ('incomplete','needs_correction'))
);

-- ---------- توابع عمومی و عملیاتی ----------
create or replace function public.gol_team_name_available(p_team_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists(select 1 from public.gol_teams where team_key = p_team_key);
$$;

create or replace function public.gol_complete_registration(p_report_path text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  t public.gol_teams;
  s public.gol_settings;
  player_count integer;
  captain_count integer;
begin
  if auth.uid() is null then raise exception 'ورود الزامی است.'; end if;
  select * into t from public.gol_teams where owner_id = auth.uid() for update;
  if t.id is null then raise exception 'تیم پیدا نشد.'; end if;
  if t.status not in ('incomplete','needs_correction') then raise exception 'ثبت‌نام قبلاً تکمیل شده است.'; end if;

  select * into s from public.gol_settings where id = 1;
  if t.status = 'incomplete' and (not s.registration_open or now() > s.registration_deadline) then
    raise exception 'مهلت ثبت‌نام پایان یافته است.';
  end if;

  select count(*), count(*) filter (where is_captain)
  into player_count, captain_count
  from public.gol_players where team_id = t.id;

  if player_count <> 5 then raise exception 'اطلاعات پنج بازیکن باید کامل باشد.'; end if;
  if captain_count <> 1 then raise exception 'تیم باید دقیقاً یک کاپیتان داشته باشد.'; end if;
  if p_report_path not like auth.uid()::text || '/reports/%' then raise exception 'مسیر گزارش معتبر نیست.'; end if;

  update public.gol_teams
  set status = 'awaiting_payment', registration_report_path = p_report_path,
      admin_note = null, updated_at = now()
  where id = t.id;
  return 'awaiting_payment';
end;
$$;

create or replace function public.gol_submit_receipt(p_receipt_path text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  t public.gol_teams;
begin
  if auth.uid() is null then raise exception 'ورود الزامی است.'; end if;
  select * into t from public.gol_teams where owner_id = auth.uid() for update;
  if t.id is null then raise exception 'تیم پیدا نشد.'; end if;
  if t.status not in ('awaiting_payment','payment_submitted','needs_correction') then
    raise exception 'ارسال فیش در وضعیت فعلی مجاز نیست.';
  end if;
  if p_receipt_path not like auth.uid()::text || '/payment/%' then raise exception 'مسیر فیش معتبر نیست.'; end if;

  update public.gol_teams
  set payment_receipt_path = p_receipt_path,
      payment_submitted_at = now(),
      status = 'payment_submitted',
      updated_at = now()
  where id = t.id;
  return 'payment_submitted';
end;
$$;

create or replace function public.gol_admin_set_status(p_team_id uuid, p_status text, p_note text default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.gol_is_admin() then raise exception 'دسترسی مدیر لازم است.'; end if;
  if p_status not in ('awaiting_payment','payment_submitted','approved','needs_correction','rejected') then
    raise exception 'وضعیت معتبر نیست.';
  end if;
  update public.gol_teams
  set status = p_status,
      admin_note = nullif(trim(p_note), ''),
      approved_at = case when p_status = 'approved' then now() else null end,
      updated_at = now()
  where id = p_team_id;
  if not found then raise exception 'تیم پیدا نشد.'; end if;
  return p_status;
end;
$$;

create or replace function public.gol_admin_update_settings(
  p_registration_open boolean,
  p_registration_deadline timestamptz,
  p_deadline_label text,
  p_min_age smallint,
  p_fee_toman bigint,
  p_bank_account text,
  p_account_holder text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.gol_is_admin() then raise exception 'دسترسی مدیر لازم است.'; end if;
  if p_min_age not between 1 and 99 then raise exception 'حداقل سن معتبر نیست.'; end if;
  if p_fee_toman < 0 then raise exception 'هزینه معتبر نیست.'; end if;
  update public.gol_settings set
    registration_open = p_registration_open,
    registration_deadline = p_registration_deadline,
    deadline_label = trim(p_deadline_label),
    min_age = p_min_age,
    fee_toman = p_fee_toman,
    bank_account = coalesce(trim(p_bank_account), ''),
    account_holder = coalesce(trim(p_account_holder), ''),
    updated_at = now()
  where id = 1;
  return true;
end;
$$;

revoke all on function public.gol_is_admin(uuid) from public;
revoke all on function public.gol_team_name_available(text) from public;
revoke all on function public.gol_complete_registration(text) from public;
revoke all on function public.gol_submit_receipt(text) from public;
revoke all on function public.gol_admin_set_status(uuid,text,text) from public;
revoke all on function public.gol_admin_update_settings(boolean,timestamptz,text,smallint,bigint,text,text) from public;

grant execute on function public.gol_is_admin(uuid) to authenticated;
grant execute on function public.gol_team_name_available(text) to anon, authenticated;
grant execute on function public.gol_complete_registration(text) to authenticated;
grant execute on function public.gol_submit_receipt(text) to authenticated;
grant execute on function public.gol_admin_set_status(uuid,text,text) to authenticated;
grant execute on function public.gol_admin_update_settings(boolean,timestamptz,text,smallint,bigint,text,text) to authenticated;

-- ---------- فضای خصوصی فایل‌ها ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'gol-registration-private',
  'gol-registration-private',
  false,
  8388608,
  array['image/jpeg','image/png','application/pdf']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists gol_storage_insert_own on storage.objects;
create policy gol_storage_insert_own on storage.objects
for insert to authenticated with check (
  bucket_id = 'gol-registration-private'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists gol_storage_read_own_or_admin on storage.objects;
create policy gol_storage_read_own_or_admin on storage.objects
for select to authenticated using (
  bucket_id = 'gol-registration-private'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.gol_is_admin())
);

drop policy if exists gol_storage_update_own_or_admin on storage.objects;
create policy gol_storage_update_own_or_admin on storage.objects
for update to authenticated using (
  bucket_id = 'gol-registration-private'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.gol_is_admin())
) with check (
  bucket_id = 'gol-registration-private'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.gol_is_admin())
);

drop policy if exists gol_storage_delete_own_or_admin on storage.objects;
create policy gol_storage_delete_own_or_admin on storage.objects
for delete to authenticated using (
  bucket_id = 'gol-registration-private'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.gol_is_admin())
);

-- ============================================================
-- ساخت دسترسی مدیر
-- ابتدا در Supabase > Authentication > Users یک کاربر با ایمیل زیر بسازید
-- و گزینه Auto Confirm را فعال کنید. رمز را همان‌جا تعیین کنید.
--
-- admin-44d60ee7f0d1fadcb41c228f3c60da8100da801e@accounts.kaliga.ir
--
-- سپس فقط دستور زیر را دوباره اجرا کنید:
-- ============================================================
insert into public.gol_admins(user_id, username)
select id, 'sajjad.n'
from auth.users
where email = 'admin-44d60ee7f0d1fadcb41c228f3c60da8100da801e@accounts.kaliga.ir'
on conflict (username) do update set user_id = excluded.user_id;
