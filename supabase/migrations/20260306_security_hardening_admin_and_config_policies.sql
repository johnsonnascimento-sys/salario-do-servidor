-- 20260306_security_hardening_admin_and_config_policies.sql
-- Security hardening for config/admin tables
-- 1) remove permissive dev policies
-- 2) restrict writes to admin users only
-- 3) add explicit deny policies to tables with RLS but no policy
-- 4) set fixed search_path on utility functions

create or replace function public.normalize_cpf(input text)
returns text
language sql
immutable
set search_path = public
as $$
  select regexp_replace(coalesce(input, ''), '[^0-9]', '', 'g');
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter table public.courts enable row level security;
alter table public.global_config enable row level security;
alter table public.power_config enable row level security;
alter table public.org_config enable row level security;
alter table public.admin_allowlist enable row level security;
alter table public.signup_allowlist enable row level security;

drop policy if exists "Dev Anon Insert" on public.courts;
drop policy if exists "Dev Anon Update" on public.courts;
drop policy if exists "Enable insert for authenticated users only" on public.courts;
drop policy if exists "Enable update for authenticated users only" on public.courts;
drop policy if exists "Enable read access for all users" on public.courts;
drop policy if exists "Public Read" on public.courts;

drop policy if exists "Dev Insert Global" on public.global_config;
drop policy if exists "Dev Update Global" on public.global_config;
drop policy if exists "Public Read Global" on public.global_config;

drop policy if exists "Dev Insert Power" on public.power_config;
drop policy if exists "Dev Update Power" on public.power_config;
drop policy if exists "Public Read Power" on public.power_config;

drop policy if exists "Dev Insert Org" on public.org_config;
drop policy if exists "Dev Update Org" on public.org_config;
drop policy if exists "Public Read Org" on public.org_config;

revoke all on table public.courts from anon, authenticated;
revoke all on table public.global_config from anon, authenticated;
revoke all on table public.power_config from anon, authenticated;
revoke all on table public.org_config from anon, authenticated;

grant select on table public.courts to anon, authenticated;
grant select on table public.global_config to anon, authenticated;
grant select on table public.power_config to anon, authenticated;
grant select on table public.org_config to anon, authenticated;

grant insert, update, delete on table public.courts to authenticated;
grant insert, update, delete on table public.global_config to authenticated;
grant insert, update, delete on table public.power_config to authenticated;
grant insert, update, delete on table public.org_config to authenticated;

create policy courts_read_all on public.courts
for select to anon, authenticated
using (true);

create policy courts_write_admin on public.courts
for all to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

create policy global_config_read_all on public.global_config
for select to anon, authenticated
using (true);

create policy global_config_write_admin on public.global_config
for all to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

create policy power_config_read_all on public.power_config
for select to anon, authenticated
using (true);

create policy power_config_write_admin on public.power_config
for all to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

create policy org_config_read_all on public.org_config
for select to anon, authenticated
using (true);

create policy org_config_write_admin on public.org_config
for all to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists admin_allowlist_deny_all on public.admin_allowlist;
create policy admin_allowlist_deny_all on public.admin_allowlist
for all to anon, authenticated
using (false)
with check (false);

drop policy if exists signup_allowlist_deny_all on public.signup_allowlist;
create policy signup_allowlist_deny_all on public.signup_allowlist
for all to anon, authenticated
using (false)
with check (false);
