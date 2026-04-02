-- 20260402_admin_config_versioning_rpc.sql
-- Versionamento transacional de global_config e power_config

create or replace function public.admin_version_global_config(
  p_previous_id uuid,
  p_config_key text,
  p_config_value jsonb,
  p_valid_from date,
  p_valid_to date default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_previous global_config%rowtype;
begin
  if not public.is_admin_user() then
    raise exception 'acesso negado';
  end if;

  select *
    into v_previous
  from public.global_config
  where id = p_previous_id;

  if not found then
    raise exception 'registro global anterior não encontrado';
  end if;

  if trim(coalesce(p_config_key, '')) = '' then
    raise exception 'config_key obrigatorio';
  end if;

  if p_valid_from is null then
    raise exception 'valid_from obrigatorio';
  end if;

  update public.global_config
     set valid_to = (p_valid_from - interval '1 day')::date
   where id = p_previous_id;

  insert into public.global_config (config_key, config_value, valid_from, valid_to)
  values (trim(p_config_key), p_config_value, p_valid_from, p_valid_to);
end;
$$;

create or replace function public.admin_version_power_config(
  p_previous_id uuid,
  p_power_name text,
  p_config_key text,
  p_config_value jsonb,
  p_valid_from date,
  p_valid_to date default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_previous power_config%rowtype;
begin
  if not public.is_admin_user() then
    raise exception 'acesso negado';
  end if;

  select *
    into v_previous
  from public.power_config
  where id = p_previous_id;

  if not found then
    raise exception 'registro power anterior não encontrado';
  end if;

  if trim(coalesce(p_power_name, '')) = '' then
    raise exception 'power_name obrigatorio';
  end if;

  if trim(coalesce(p_config_key, '')) = '' then
    raise exception 'config_key obrigatorio';
  end if;

  if p_valid_from is null then
    raise exception 'valid_from obrigatorio';
  end if;

  update public.power_config
     set valid_to = (p_valid_from - interval '1 day')::date
   where id = p_previous_id;

  insert into public.power_config (power_name, config_key, config_value, valid_from, valid_to)
  values (trim(p_power_name), trim(p_config_key), p_config_value, p_valid_from, p_valid_to);
end;
$$;

grant execute on function public.admin_version_global_config(uuid, text, jsonb, date, date) to authenticated;
grant execute on function public.admin_version_power_config(uuid, text, text, jsonb, date, date) to authenticated;
