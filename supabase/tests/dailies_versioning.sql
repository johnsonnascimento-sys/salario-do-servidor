\set ON_ERROR_STOP on
-- DESTRUCTIVE ONLY TO A FRESH DISPOSABLE DATABASE: prerequisite fixture, never production.
-- psql -h 127.0.0.1 -p 55436 -U postgres -f supabase/tests/dailies_versioning.sql
do $$ begin
  if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
end $$;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
create function public.is_admin_user() returns boolean language sql stable security definer as $$ select coalesce(auth.jwt()->>'email','')='admin@test.invalid' $$;
create table public.org_config(org_slug text unique,org_name text,power_name text,configuration jsonb);
create table public.power_config(power_name text,config_key text,config_value jsonb,valid_to date);
insert into public.org_config values ('jmu','JMU','PJU','{"dailies_rules":{"legacy":true}}'),('jf','JF','PJU','{}');
insert into public.power_config values('PJU','dailies_rules','{"legacy_jmu":true}',null);
grant usage on schema auth to anon,authenticated;
grant select on public.org_config to anon,authenticated;
\ir ../migrations/20261026190000_dailies_versioning.sql

create function pg_temp.expect_failure(statement text, expected text) returns void language plpgsql as $$
declare failed boolean := false;
begin
  begin execute statement; exception when others then
    if position(expected in sqlerrm)=0 then raise exception 'Unexpected error: % (expected %)',sqlerrm,expected; end if;
    failed := true;
  end;
  if not failed then raise exception 'Expected failure: %',statement; end if;
end $$;

select set_config('request.jwt.claims','{"email":"admin@test.invalid"}',false);
select (public.admin_save_dailies_draft(null,(select id from public.dailies_scopes where scope_key='*'),
 '{"sources":{"test":{"title":"Synthetic test only","url":"https://example.invalid/test"}},"rules":{"deduction_divisor":22},"rule_sources":{"deduction_divisor":["test"]},"locked_rules":["deduction_divisor"],"references":{"base":{"value":1000,"currency":"BRL","source_ids":["test"]}},"rates":{"employee":{"kind":"reference_percent","reference":"base","percent":10,"currency":"BRL","source_ids":["test"]}},"limits":{"national":{"value":1000,"currency":"BRL","mandatory":true,"applies_to":"daily_rate","source_ids":["test"]}}}',
 '2026-01-01',null,'Synthetic fixture','normative')->>'id') as initial_id \gset
select public.admin_publish_dailies_version(:'initial_id');

do $$ begin
  if (select count(*) from public.dailies_versions where status='published')<>1 then raise exception 'Unexpected publication count'; end if;
  if (select count(*) from public.dailies_versions where legacy_snapshot is not null and valid_from is null)<>1 then raise exception 'Legacy must remain undated draft'; end if;
end $$;

-- Inclusive bounds, future/closed versions, context revision and independent scopes.
select (public.admin_save_dailies_draft(null,(select id from public.dailies_scopes where scope_type='org' and scope_key='jmu'),
 '{"references":{"base":{"value":2000,"currency":"BRL","source_ids":["test"]}}}',
 '2026-02-01','2026-02-28','Synthetic org fixture','normative')->>'id') as jmu_id \gset
select public.admin_publish_dailies_version(:'jmu_id');
do $$ begin
  if jsonb_array_length(public.get_dailies_versions('jmu','2026-02-28','2026-02-28')->'versions')<>2 then raise exception 'Final date not inclusive'; end if;
  if jsonb_array_length(public.get_dailies_versions('jmu','2026-03-01','2026-03-01')->'versions')<>1 then raise exception 'Expired org still selected'; end if;
  if jsonb_array_length(public.get_dailies_versions('jf','2026-02-01','2026-02-01')->'versions')<>1 then raise exception 'JMU leaked into JF'; end if;
end $$;

-- Complete merged references and numeric constraints are validated server side.
select pg_temp.expect_failure($q$select public.admin_save_dailies_draft(null,(select id from public.dailies_scopes where scope_key='*'),'{}','2026-04-30','2026-04-01','invalid','normative')$q$,'check constraint');
select pg_temp.expect_failure($q$select public.admin_save_dailies_draft(null,(select id from public.dailies_scopes where scope_key='*'),'{"rules":{"deduction_divisor":0}}','2026-04-01',null,'invalid','normative')$q$,'Divisor');
select pg_temp.expect_failure($q$select public.admin_save_dailies_draft(null,(select id from public.dailies_scopes where scope_key='*'),'{"rules":{"rounding":"unexpected"}}','2026-04-01',null,'invalid','normative')$q$,'Arredondamento');
select pg_temp.expect_failure($q$select public.admin_save_dailies_draft(null,(select id from public.dailies_scopes where scope_key='*'),'{"rules":{"rounding":null}}','2026-04-01',null,'invalid','normative')$q$,'Arredondamento');
select pg_temp.expect_failure($q$select public.admin_save_dailies_draft(null,(select id from public.dailies_scopes where scope_key='*'),'{"rules":{"deduction_divisor":"22"}}','2026-04-01',null,'invalid','normative')$q$,'Divisor');
select pg_temp.expect_failure($q$select public.admin_save_dailies_draft(null,(select id from public.dailies_scopes where scope_key='*'),'{"rates":{"x":{"kind":"fixed","value":-1,"currency":"BRL"}}}','2026-04-01',null,'invalid','normative')$q$,'Valor inválido');
select pg_temp.expect_failure($q$select public.admin_save_dailies_draft(null,(select id from public.dailies_scopes where scope_key='*'),'{"unknown":{}}','2026-04-01',null,'invalid','normative')$q$,'Estrutura');
select pg_temp.expect_failure($q$select public.admin_save_dailies_draft(null,(select id from public.dailies_scopes where scope_key='*'),'{"rules":{"unknown":0}}','2026-04-01',null,'invalid','normative')$q$,'Regra desconhecida');
select pg_temp.expect_failure($q$select public.admin_save_dailies_draft(null,(select id from public.dailies_scopes where scope_key='*'),'{"auxiliary":{"weekend_days":[7]}}','2026-04-01',null,'invalid','normative')$q$,'Dia da semana');
select pg_temp.expect_failure($q$select public.admin_save_dailies_draft(null,(select id from public.dailies_scopes where scope_key='*'),'{}','2026-04-01',null,'invalid','unexpected')$q$,'check constraint');
select (public.admin_save_dailies_draft(null,(select id from public.dailies_scopes where scope_type='org' and scope_key='jf'),
 '{"rates":{"a":{"kind":"category_percent","category":"b","percent":50,"currency":"BRL","source_ids":["test"]},"b":{"kind":"category_percent","category":"a","percent":50,"currency":"BRL","source_ids":["test"]}}}',
 '2026-01-01',null,'cycle','normative')->>'id') as cycle_id \gset
select pg_temp.expect_failure(format('select public.admin_publish_dailies_version(%L)',:'cycle_id'),'Ciclo');
select (public.admin_save_dailies_draft(null,(select id from public.dailies_scopes where scope_type='org' and scope_key='jf'),
 '{"rates":{"a":{"kind":"reference_percent","reference":"missing","percent":50,"currency":"BRL","source_ids":["test"]}}}',
 '2026-01-01',null,'missing','normative')->>'id') as missing_id \gset
select pg_temp.expect_failure(format('select public.admin_publish_dailies_version(%L)',:'missing_id'),'Referência inexistente');
select (public.admin_save_dailies_draft(null,(select id from public.dailies_scopes where scope_type='org' and scope_key='jf'),
 '{"references":{"base":{"value":1000,"currency":"USD","source_ids":["test"]}}}',
 '2026-01-01',null,'currency','normative')->>'id') as currency_id \gset
select pg_temp.expect_failure(format('select public.admin_publish_dailies_version(%L)',:'currency_id'),'Moedas incompatíveis');
select (public.admin_save_dailies_draft(null,(select id from public.dailies_scopes where scope_type='org' and scope_key='jf'),
 '{"limits":{"national":{"value":2000,"currency":"BRL","mandatory":true,"applies_to":"daily_rate","source_ids":["test"]}}}',
 '2026-01-01',null,'override','normative')->>'id') as override_id \gset
select pg_temp.expect_failure(format('select public.admin_publish_dailies_version(%L)',:'override_id'),'Override de limite');
select (public.admin_save_dailies_draft(null,(select id from public.dailies_scopes where scope_type='org' and scope_key='jf'),
 '{"rules":{"deduction_divisor":30}}',
 '2026-01-01',null,'locked rule','normative')->>'id') as rule_id \gset
select pg_temp.expect_failure(format('select public.admin_publish_dailies_version(%L)',:'rule_id'),'Override de regra obrigatória');
select (public.admin_save_dailies_draft(null,(select id from public.dailies_scopes where scope_type='org' and scope_key='jf'),
 '{"sources":{"test":{"title":"Synthetic future source","url":"https://example.invalid/test","effective_from":"2030-01-01"}}}',
 '2026-01-01',null,'source validity','normative')->>'id') as source_id \gset
select pg_temp.expect_failure(format('select public.admin_publish_dailies_version(%L)',:'source_id'),'fora da vigência');

-- Explicit replacement closes the previous inclusive interval transactionally.
select (public.admin_save_dailies_draft(null,(select id from public.dailies_scopes where scope_key='*'),
 '{"sources":{"test":{"title":"Synthetic test only","url":"https://example.invalid/test"}},"references":{"base":{"value":1500,"currency":"BRL","source_ids":["test"]}},"rates":{"employee":{"kind":"reference_percent","reference":"base","percent":10,"currency":"BRL","source_ids":["test"]}}}',
 '2026-03-01',null,'Synthetic replacement','normative')->>'id') as replacement_id \gset
select pg_temp.expect_failure(format('select public.admin_publish_dailies_version(%L)',:'replacement_id'),'Sobreposição');
select public.admin_publish_dailies_version(:'replacement_id',:'initial_id');
do $$ begin
  if (public.get_dailies_versions('jf','2026-02-28','2026-02-28')->'versions'->0->>'valid_to')<>'2026-02-28' then raise exception 'Closure not inclusive'; end if;
end $$;

-- Same-period correction preserves original payload and excludes it from new resolutions.
select (public.admin_save_dailies_draft(null,(select id from public.dailies_scopes where scope_key='*'),
 '{"sources":{"test":{"title":"Synthetic test only","url":"https://example.invalid/test"}},"references":{"base":{"value":1600,"currency":"BRL","source_ids":["test"]}},"rates":{"employee":{"kind":"reference_percent","reference":"base","percent":10,"currency":"BRL","source_ids":["test"]}}}',
 '2026-03-01',null,'Synthetic correction','correction')->>'id') as correction_id \gset
select public.admin_publish_dailies_version(:'correction_id',:'replacement_id');
select pg_temp.expect_failure(format('update public.dailies_versions set payload=%L where id=%L','{}',:'correction_id'),'imutável');
select pg_temp.expect_failure(format('delete from public.dailies_versions where id=%L',:'correction_id'),'não pode ser excluído');
do $$ begin
  if (select count(*) from public.dailies_versions where status='published')<>4 then raise exception 'History discarded'; end if;
  if jsonb_array_length(public.get_dailies_versions('jf','2026-03-01','2026-03-01')->'versions')<>1 then raise exception 'Correction selected twice'; end if;
  if (select count(*) from public.dailies_audit where action='supersede_or_close')<>2 then raise exception 'Missing closure/correction audit'; end if;
end $$;

-- Closing an unbounded parent with a bounded successor must validate children AFTER its end.
begin;
select (public.admin_save_dailies_draft(null,(select id from public.dailies_scopes where scope_type='org' and scope_key='jmu'),
 '{"rates":{"child":{"kind":"reference_percent","reference":"base","percent":50,"currency":"BRL","source_ids":["test"]}}}',
 '2027-01-01',null,'Future dependent fixture','normative')->>'id') as child_id \gset
select public.admin_publish_dailies_version(:'child_id');
select (public.admin_save_dailies_draft(null,(select id from public.dailies_scopes where scope_key='*'),
 '{"sources":{"test":{"title":"Synthetic bounded source","url":"https://example.invalid/test"}},"references":{"base":{"value":1600,"currency":"BRL","source_ids":["test"]}}}',
 '2026-06-01','2026-06-30','Bounded parent fixture','normative')->>'id') as bounded_id \gset
select pg_temp.expect_failure(format('select public.admin_publish_dailies_version(%L,%L)',:'bounded_id',:'correction_id'),'Referência inexistente');
do $$ begin
  if exists(select 1 from public.dailies_versions where reason='Synthetic correction' and valid_to is not null) then raise exception 'Failed publication changed previous end'; end if;
end $$;
rollback;

-- Anonymous/non-admin permissions, including direct table writes and guarded RPCs.
set role anon;
select set_config('request.jwt.claims','{}',false);
do $$ begin
  if exists(select 1 from public.dailies_versions where status='draft') then raise exception 'Draft disclosed'; end if;
end $$;
select pg_temp.expect_failure($q$insert into public.dailies_scopes(scope_type,scope_key,label) values('org','hacked','hacked')$q$,'permission denied');
select public.get_dailies_versions('jf','2026-03-01','2026-03-31');
reset role;
set role authenticated;
select pg_temp.expect_failure(format('select public.admin_publish_dailies_version(%L)',:'cycle_id'),'acesso negado');
select pg_temp.expect_failure($q$update public.dailies_versions set reason='hacked'$q$,'permission denied');
reset role;
-- Real authenticated admin role can clone/save/publish through RPC, but not write tables.
begin;
set local role authenticated;
select set_config('request.jwt.claims','{"email":"admin@test.invalid"}',true);
select pg_temp.expect_failure($q$update public.dailies_versions set reason='hacked'$q$,'permission denied');
select (public.admin_clone_dailies_version(:'jmu_id')->>'id') as cloned_id \gset
select public.admin_save_dailies_draft(:'cloned_id',(select id from public.dailies_scopes where scope_type='org' and scope_key='jmu'),
 '{"references":{"base":{"value":1800,"currency":"BRL","source_ids":["test"]}}}','2026-06-01','2026-06-30','Authenticated admin acceptance','normative');
select public.admin_publish_dailies_version(:'cloned_id');
do $$ begin
  if not exists(select 1 from public.dailies_versions where reason='Authenticated admin acceptance' and status='published') then raise exception 'Admin RPC publication failed'; end if;
  if not exists(select 1 from public.dailies_audit where action='publish') then raise exception 'Admin cannot inspect audit'; end if;
end $$;
rollback;
\ir ../migrations/20261026190100_dailies_review_drafts.sql
do $$ begin
  if (select count(*) from public.dailies_versions where status='draft' and reason like 'MODELO PARA REVISÃO:%' and valid_from is null and valid_to is null)<>2 then raise exception 'Review templates missing/dated'; end if;
  if (select count(*) from public.dailies_versions where status='published')<>4 then raise exception 'Review migration published data'; end if;
  if (select branch_key from public.dailies_org_memberships where org_slug='jf')<>'CJF' then raise exception 'JF onboarding failed'; end if;
end $$;
select 'Dailies migration: RLS, immutability, periods, hierarchy and validation passed' as result;
