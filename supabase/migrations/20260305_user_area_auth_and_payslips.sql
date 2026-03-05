-- 20260305_user_area_auth_and_payslips.sql
-- Area de usuario com cadastro beta fechado + CRUD de holerites

create extension if not exists pgcrypto;

create or replace function public.normalize_cpf(input text)
returns text
language sql
immutable
as $$
  select regexp_replace(coalesce(input, ''), '[^0-9]', '', 'g');
$$;

create table if not exists public.signup_allowlist (
  id uuid primary key default gen_random_uuid(),
  full_name text,
  cpf text not null unique,
  email text not null unique,
  enabled boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  cpf text not null unique,
  email text not null unique,
  is_beta_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_payslips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  agency_slug text not null,
  agency_name text not null,
  month_ref text not null,
  year_ref integer not null,
  tags text[] not null default '{}',
  notes text not null default '',
  calculator_state jsonb not null,
  result_rows jsonb not null,
  liquido numeric(14,2) not null default 0,
  total_bruto numeric(14,2) not null default 0,
  total_descontos numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_payslips_user_period on public.user_payslips (user_id, year_ref desc, month_ref);
create index if not exists idx_user_payslips_user_updated on public.user_payslips (user_id, updated_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_signup_allowlist_updated_at on public.signup_allowlist;
create trigger trg_signup_allowlist_updated_at
before update on public.signup_allowlist
for each row execute function public.set_updated_at();

drop trigger if exists trg_user_profiles_updated_at on public.user_profiles;
create trigger trg_user_profiles_updated_at
before update on public.user_profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_user_payslips_updated_at on public.user_payslips;
create trigger trg_user_payslips_updated_at
before update on public.user_payslips
for each row execute function public.set_updated_at();

create or replace function public.can_signup(p_email text, p_cpf text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_cpf text := public.normalize_cpf(p_cpf);
begin
  return exists (
    select 1
    from public.signup_allowlist sa
    where sa.enabled = true
      and lower(sa.email) = v_email
      and sa.cpf = v_cpf
  );
end;
$$;

create or replace function public.upsert_profile_on_signup(
  p_user_id uuid,
  p_full_name text,
  p_email text,
  p_cpf text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_cpf text := public.normalize_cpf(p_cpf);
  v_name text := trim(coalesce(p_full_name, ''));
  v_allowed boolean;
begin
  if p_user_id is null then
    raise exception 'user_id obrigatorio';
  end if;

  if v_name = '' then
    raise exception 'nome obrigatorio';
  end if;

  if v_email = '' or v_cpf = '' then
    raise exception 'email/cpf obrigatorios';
  end if;

  select public.can_signup(v_email, v_cpf) into v_allowed;
  if not v_allowed then
    raise exception 'cadastro nao autorizado para este email/cpf';
  end if;

  if not exists (
    select 1 from auth.users u where u.id = p_user_id and lower(u.email) = v_email
  ) then
    raise exception 'usuario auth nao encontrado para email informado';
  end if;

  insert into public.user_profiles (id, full_name, cpf, email, is_beta_enabled)
  values (p_user_id, v_name, v_cpf, v_email, true)
  on conflict (id)
  do update set
    full_name = excluded.full_name,
    cpf = excluded.cpf,
    email = excluded.email,
    is_beta_enabled = true,
    updated_at = now();
end;
$$;

alter table public.signup_allowlist enable row level security;
alter table public.user_profiles enable row level security;
alter table public.user_payslips enable row level security;

-- signup_allowlist: sem leitura publica
revoke all on public.signup_allowlist from anon, authenticated;

-- user_profiles
drop policy if exists "profiles_select_own" on public.user_profiles;
create policy "profiles_select_own" on public.user_profiles
for select using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.user_profiles;
create policy "profiles_update_own" on public.user_profiles
for update using (id = auth.uid()) with check (id = auth.uid());

-- user_payslips
drop policy if exists "payslips_select_own" on public.user_payslips;
create policy "payslips_select_own" on public.user_payslips
for select using (user_id = auth.uid());

drop policy if exists "payslips_insert_own" on public.user_payslips;
create policy "payslips_insert_own" on public.user_payslips
for insert with check (user_id = auth.uid());

drop policy if exists "payslips_update_own" on public.user_payslips;
create policy "payslips_update_own" on public.user_payslips
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "payslips_delete_own" on public.user_payslips;
create policy "payslips_delete_own" on public.user_payslips
for delete using (user_id = auth.uid());

grant execute on function public.normalize_cpf(text) to anon, authenticated;
grant execute on function public.can_signup(text, text) to anon, authenticated;
grant execute on function public.upsert_profile_on_signup(uuid, text, text, text) to anon, authenticated;

insert into public.signup_allowlist (full_name, cpf, email, enabled, notes)
values (
  'Johnson Teixeira do Nascimento',
  public.normalize_cpf('33338309813'),
  lower('johnson.nascimento@gmail.com'),
  true,
  'Beta fechado inicial'
)
on conflict (cpf)
do update set
  full_name = excluded.full_name,
  email = excluded.email,
  enabled = excluded.enabled,
  notes = excluded.notes,
  updated_at = now();
