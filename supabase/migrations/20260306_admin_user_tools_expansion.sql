-- 20260306_admin_user_tools_expansion.sql
-- Expande ferramentas administrativas de usuarios:
-- - leitura e manutencao da allowlist de admins
-- - leitura da allowlist de cadastro (beta fechado)

create or replace function public.admin_list_signup_allowlist()
returns table (
  full_name text,
  cpf text,
  email text,
  enabled boolean,
  notes text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_user() then
    raise exception 'acesso negado';
  end if;

  return query
  select
    s.full_name,
    s.cpf,
    lower(s.email) as email,
    s.enabled,
    s.notes,
    s.created_at,
    s.updated_at
  from public.signup_allowlist s
  order by s.created_at desc;
end;
$$;

create or replace function public.admin_list_admin_allowlist()
returns table (
  email text,
  enabled boolean,
  notes text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_user() then
    raise exception 'acesso negado';
  end if;

  return query
  select
    lower(a.email) as email,
    a.enabled,
    a.notes,
    a.created_at,
    a.updated_at
  from public.admin_allowlist a
  order by a.created_at desc;
end;
$$;

create or replace function public.admin_upsert_admin_allowlist(
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
begin
  if not public.is_admin_user() then
    raise exception 'acesso negado';
  end if;

  if v_email = '' then
    raise exception 'email obrigatorio';
  end if;

  insert into public.admin_allowlist (email, enabled, notes)
  values (v_email, coalesce(p_enabled, true), p_notes)
  on conflict (email)
  do update set
    enabled = excluded.enabled,
    notes = excluded.notes,
    updated_at = now();
end;
$$;

create or replace function public.admin_delete_admin_allowlist(
  p_email text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
begin
  if not public.is_admin_user() then
    raise exception 'acesso negado';
  end if;

  if v_email = '' then
    raise exception 'email obrigatorio';
  end if;

  delete from public.admin_allowlist where lower(email) = v_email;
end;
$$;

grant execute on function public.admin_list_signup_allowlist() to authenticated;
grant execute on function public.admin_list_admin_allowlist() to authenticated;
grant execute on function public.admin_upsert_admin_allowlist(text, boolean, text) to authenticated;
grant execute on function public.admin_delete_admin_allowlist(text) to authenticated;

