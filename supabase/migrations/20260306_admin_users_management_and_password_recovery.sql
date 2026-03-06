-- 20260306_admin_users_management_and_password_recovery.sql
-- Admin: gestao de usuarios (lista/edicao/exclusao) + suporte a reset de senha

create extension if not exists pgcrypto;

create table if not exists public.admin_allowlist (
  email text primary key,
  enabled boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_admin_allowlist_updated_at on public.admin_allowlist;
create trigger trg_admin_allowlist_updated_at
before update on public.admin_allowlist
for each row execute function public.set_updated_at();

insert into public.admin_allowlist (email, enabled, notes)
values
  (lower('johnson.nascimento@gmail.com'), true, 'Administrador principal'),
  (lower('admin@salariodoservidor.com.br'), true, 'Conta administrativa')
on conflict (email)
do update set
  enabled = excluded.enabled,
  notes = excluded.notes,
  updated_at = now();

alter table public.admin_allowlist enable row level security;
revoke all on public.admin_allowlist from anon, authenticated;

create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_allowlist a
    where a.enabled = true
      and lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

create or replace function public.admin_list_users()
returns table (
  user_id uuid,
  email text,
  full_name text,
  cpf text,
  is_beta_enabled boolean,
  allowlist_enabled boolean,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin_user() then
    raise exception 'acesso negado';
  end if;

  return query
  select
    u.id as user_id,
    lower(coalesce(u.email, '')) as email,
    p.full_name,
    p.cpf,
    coalesce(p.is_beta_enabled, false) as is_beta_enabled,
    coalesce(sa.enabled, false) as allowlist_enabled,
    u.created_at,
    u.last_sign_in_at
  from auth.users u
  left join public.user_profiles p on p.id = u.id
  left join public.signup_allowlist sa on lower(sa.email) = lower(u.email)
  order by u.created_at desc;
end;
$$;

create or replace function public.admin_upsert_allowlist_user(
  p_full_name text,
  p_cpf text,
  p_email text,
  p_enabled boolean default true,
  p_notes text default null
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
begin
  if not public.is_admin_user() then
    raise exception 'acesso negado';
  end if;

  if v_email = '' then
    raise exception 'email obrigatorio';
  end if;

  if v_cpf = '' then
    raise exception 'cpf obrigatorio';
  end if;

  if v_name = '' then
    raise exception 'nome obrigatorio';
  end if;

  insert into public.signup_allowlist (full_name, cpf, email, enabled, notes)
  values (v_name, v_cpf, v_email, coalesce(p_enabled, true), p_notes)
  on conflict (cpf)
  do update set
    full_name = excluded.full_name,
    email = excluded.email,
    enabled = excluded.enabled,
    notes = excluded.notes,
    updated_at = now();
end;
$$;

create or replace function public.admin_update_user_profile(
  p_user_id uuid,
  p_full_name text,
  p_cpf text,
  p_email text,
  p_is_beta_enabled boolean,
  p_allowlist_enabled boolean default true
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_cpf text := public.normalize_cpf(p_cpf);
  v_name text := trim(coalesce(p_full_name, ''));
begin
  if not public.is_admin_user() then
    raise exception 'acesso negado';
  end if;

  if p_user_id is null then
    raise exception 'user_id obrigatorio';
  end if;

  if v_email = '' or v_cpf = '' or v_name = '' then
    raise exception 'nome/email/cpf obrigatorios';
  end if;

  update auth.users
  set email = v_email,
      raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('full_name', v_name)
  where id = p_user_id;

  insert into public.user_profiles (id, full_name, cpf, email, is_beta_enabled)
  values (p_user_id, v_name, v_cpf, v_email, coalesce(p_is_beta_enabled, true))
  on conflict (id)
  do update set
    full_name = excluded.full_name,
    cpf = excluded.cpf,
    email = excluded.email,
    is_beta_enabled = excluded.is_beta_enabled,
    updated_at = now();

  insert into public.signup_allowlist (full_name, cpf, email, enabled, notes)
  values (v_name, v_cpf, v_email, coalesce(p_allowlist_enabled, true), 'Gerenciado pelo painel admin')
  on conflict (cpf)
  do update set
    full_name = excluded.full_name,
    email = excluded.email,
    enabled = excluded.enabled,
    updated_at = now();
end;
$$;

create or replace function public.admin_delete_user(
  p_user_id uuid,
  p_email text default null
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
begin
  if not public.is_admin_user() then
    raise exception 'acesso negado';
  end if;

  if p_user_id is not null then
    delete from auth.users where id = p_user_id;
  end if;

  if v_email <> '' then
    delete from public.signup_allowlist where lower(email) = v_email;
  end if;
end;
$$;

grant execute on function public.is_admin_user() to authenticated;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_upsert_allowlist_user(text, text, text, boolean, text) to authenticated;
grant execute on function public.admin_update_user_profile(uuid, text, text, text, boolean, boolean) to authenticated;
grant execute on function public.admin_delete_user(uuid, text) to authenticated;
