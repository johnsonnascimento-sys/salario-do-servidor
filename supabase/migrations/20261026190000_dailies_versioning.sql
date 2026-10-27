-- Dedicated dailies history. No legacy monetary value is published by this migration.
begin;

create extension if not exists btree_gist;

create sequence public.dailies_revision_seq;
create table public.dailies_scopes (
  id uuid primary key default gen_random_uuid(),
  scope_type text not null check (scope_type in ('global','power','branch','org')),
  scope_key text not null check (length(trim(scope_key)) > 0),
  label text not null,
  unique(scope_type, scope_key),
  check (scope_type <> 'global' or scope_key = '*')
);
create table public.dailies_org_memberships (
  org_slug text primary key references public.org_config(org_slug),
  branch_key text not null
);
create table public.dailies_versions (
  id uuid primary key default gen_random_uuid(),
  scope_id uuid not null references public.dailies_scopes(id),
  payload jsonb not null default '{}' check (jsonb_typeof(payload) = 'object'),
  legacy_snapshot jsonb,
  valid_from date,
  valid_to date,
  status text not null default 'draft' check (status in ('draft','published')),
  revision bigint not null default nextval('public.dailies_revision_seq'),
  change_kind text not null default 'normative' check (change_kind in ('normative','correction')),
  reason text not null check (length(trim(reason)) > 0),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  published_at timestamptz,
  published_by uuid references auth.users(id),
  superseded_by uuid references public.dailies_versions(id),
  check (valid_to is null or (valid_from is not null and valid_to >= valid_from)),
  check (status <> 'published' or (valid_from is not null and published_at is not null))
);
create index dailies_versions_period on public.dailies_versions(scope_id, valid_from, valid_to)
  where status = 'published' and superseded_by is null;
alter table public.dailies_versions add constraint dailies_published_no_overlap
  exclude using gist(scope_id with =, daterange(valid_from,valid_to,'[]') with &&)
  where (status='published' and superseded_by is null);
create table public.dailies_audit (
  id bigint generated always as identity primary key,
  version_id uuid not null references public.dailies_versions(id),
  actor_id uuid references auth.users(id),
  occurred_at timestamptz not null default now(),
  action text not null,
  before_record jsonb,
  after_record jsonb not null
);
create table public.dailies_membership_audit (
  id bigint generated always as identity primary key,
  org_slug text not null,
  previous_branch text,
  new_branch text not null,
  actor_id uuid references auth.users(id),
  occurred_at timestamptz not null default now(),
  reason text not null default 'Vínculo administrativo explícito antes de publicação'
);

insert into public.dailies_scopes(scope_type,scope_key,label) values ('global','*','Geral');
insert into public.dailies_scopes(scope_type,scope_key,label)
select distinct 'power',power_name,power_name from public.org_config;
insert into public.dailies_scopes(scope_type,scope_key,label)
select 'org',org_slug,org_name from public.org_config;
insert into public.dailies_scopes(scope_type,scope_key,label) values
  ('branch','JMU','Justiça Militar da União'), ('branch','CJF','Conselho da Justiça Federal');
insert into public.dailies_org_memberships(org_slug,branch_key)
select org_slug,'JMU' from public.org_config where org_slug in ('jmu','stm');
-- Unknown legacy CJF/JF slugs deliberately require explicit administrative membership.
insert into public.dailies_versions(scope_id,payload,legacy_snapshot,reason)
select s.id, '{}', jsonb_build_object('org',o.configuration,'power_dailies',
  coalesce((select jsonb_object_agg(p.config_key,p.config_value) from public.power_config p
    where p.power_name=o.power_name and p.config_key like 'dailies%' and p.valid_to is null),'{}'::jsonb)),
  'Legado não validado: revisar fontes e datas antes de converter e publicar'
from public.org_config o join public.dailies_scopes s on s.scope_type='org' and s.scope_key=o.org_slug
where o.org_slug in ('jmu','stm');

alter table public.dailies_scopes enable row level security;
alter table public.dailies_org_memberships enable row level security;
alter table public.dailies_versions enable row level security;
alter table public.dailies_audit enable row level security;
alter table public.dailies_membership_audit enable row level security;
create policy dailies_scopes_read on public.dailies_scopes for select to anon,authenticated using (true);
create policy dailies_memberships_read on public.dailies_org_memberships for select to anon,authenticated using (true);
create policy dailies_versions_read on public.dailies_versions for select to anon,authenticated
  using (status='published' or public.is_admin_user());
create policy dailies_audit_admin_read on public.dailies_audit for select to authenticated
  using (public.is_admin_user());
create policy dailies_membership_audit_admin_read on public.dailies_membership_audit for select to authenticated
  using (public.is_admin_user());
-- Mutations are only available via the guarded RPCs, including for administrators.
revoke all on public.dailies_scopes,public.dailies_org_memberships,public.dailies_versions,public.dailies_audit from anon,authenticated;
revoke all on public.dailies_membership_audit from anon,authenticated;
grant select on public.dailies_scopes,public.dailies_org_memberships,public.dailies_versions to anon,authenticated;
grant select on public.dailies_audit to authenticated;
grant select on public.dailies_membership_audit to authenticated;

create function public.dailies_audit_change() returns trigger language plpgsql security definer
set search_path=public,pg_temp as $$
begin
  insert into public.dailies_audit(version_id,actor_id,action,before_record,after_record)
  values(new.id,auth.uid(),case when tg_op='INSERT' then 'create' when old.status='draft' and new.status='published' then 'publish'
    when old.status='published' then 'supersede_or_close' else 'edit_draft' end,
    case when tg_op='UPDATE' then to_jsonb(old) end,to_jsonb(new));
  return new;
end $$;
create trigger dailies_version_audit after insert or update on public.dailies_versions
for each row execute function public.dailies_audit_change();

create function public.dailies_guard_published() returns trigger language plpgsql
set search_path=public,pg_temp as $$
begin
  if tg_op='DELETE' then raise exception 'Histórico de diárias não pode ser excluído'; end if;
  if old.status='published' then
    if (to_jsonb(old)-'valid_to'-'superseded_by') is distinct from (to_jsonb(new)-'valid_to'-'superseded_by') then
      raise exception 'Conteúdo publicado é imutável'; end if;
    if new.valid_to is distinct from old.valid_to and (new.valid_to is null or new.valid_to<old.valid_from or (old.valid_to is not null and new.valid_to>old.valid_to)) then
      raise exception 'Encerramento inválido'; end if;
    if old.superseded_by is not null and new.superseded_by is distinct from old.superseded_by then raise exception 'Substituição já registrada'; end if;
  end if;
  return new;
end $$;
create trigger dailies_published_guard before update or delete on public.dailies_versions
for each row execute function public.dailies_guard_published();

-- Matches the engine: merge sections, replace each parameter atomically.
create function public.dailies_merge(a jsonb,b jsonb) returns jsonb language plpgsql immutable
set search_path=public,pg_temp as $$
declare k text; v jsonb; r jsonb := coalesce(a,'{}');
begin
  for k,v in select * from jsonb_each(coalesce(b,'{}')) loop
    if k='locked_rules' then
      r := jsonb_set(r,array[k],(select coalesce(jsonb_agg(distinct value),'[]') from jsonb_array_elements(coalesce(r->k,'[]')||v)));
    elsif jsonb_typeof(v)='object' and jsonb_typeof(r->k)='object' then
      r := jsonb_set(r,array[k],(r->k)||v);
    else r := jsonb_set(r,array[k],v); end if;
  end loop;
  return r;
end $$;

create function public.dailies_validate_payload(p jsonb, complete boolean default false) returns void
language plpgsql set search_path=public,pg_temp as $$
declare k text; v jsonb; r jsonb; current_key text; seen text[]; target text; source_key text;
begin
  if jsonb_typeof(p)<>'object' or exists(select 1 from jsonb_object_keys(p) x
      where x not in ('rules','rates','references','limits','auxiliary','sources','rule_sources','locked_rules')) then
    raise exception 'Estrutura de configuração inválida'; end if;
  for k,v in select * from jsonb_each(p) loop
    if k='locked_rules' then
      if jsonb_typeof(v)<>'array' then raise exception 'locked_rules deve ser array'; end if;
    elsif jsonb_typeof(v)<>'object' then raise exception 'Seção % deve ser objeto',k; end if;
  end loop;
  if exists(select 1 from jsonb_object_keys(coalesce(p->'rules','{}')) x where x not in (
    'temporal_basis','return_fraction','no_overnight_fraction','supplied_lodging_fraction','supplied_meals_fraction','supplied_transport_fraction',
    'supplied_reduction_combination','supplied_lodging_basis','unit_rounding','unit_decimals','rounding','decimals','deduction_divisor','food_divisor','transport_divisor',
    'deduction_fraction','deduct_meals','deduct_transport','deduction_days','deduction_cap','boarding','additional_rates','allowed_reductions')) then raise exception 'Regra desconhecida'; end if;
  if exists(select 1 from jsonb_object_keys(coalesce(p->'auxiliary','{}')) x where x not in ('holidays','weekend_days','source_ids')) then raise exception 'Parâmetro auxiliar desconhecido'; end if;
  if p->'rules' ? 'deduction_divisor' and (p#>>'{rules,deduction_divisor}')::numeric <= 0 then raise exception 'Divisor deve ser positivo'; end if;
  foreach k in array array['deduction_divisor','food_divisor','transport_divisor'] loop
    if p->'rules' ? k and (jsonb_typeof(p->'rules'->k) is distinct from 'number' or (p->'rules'->>k)::numeric <= 0) then raise exception 'Divisor deve ser positivo: %',k; end if;
  end loop;
  foreach k in array array['return_fraction','no_overnight_fraction','supplied_lodging_fraction','supplied_meals_fraction','supplied_transport_fraction'] loop
    if p->'rules' ? k and (jsonb_typeof(p->'rules'->k) is distinct from 'number' or (p->'rules'->>k)::numeric < 0 or (p->'rules'->>k)::numeric > 1) then
      raise exception 'Fração inválida: %',k; end if;
  end loop;
  if p->'rules' ? 'rounding' and coalesce(p#>>'{rules,rounding}','') not in ('half_up','half_even','truncate') then raise exception 'Arredondamento inválido'; end if;
  if p->'rules' ? 'decimals' and ((p#>>'{rules,decimals}')::int < 0 or (p#>>'{rules,decimals}')::int > 6) then raise exception 'Casas decimais inválidas'; end if;
  if p->'rules' ? 'temporal_basis' and coalesce(p#>>'{rules,temporal_basis}','') not in ('daily','departure') then raise exception 'Marco temporal inválido'; end if;
  if p->'rules' ? 'deduction_days' and coalesce(p#>>'{rules,deduction_days}','') not in ('business','all') then raise exception 'Regra de dias de desconto inválida'; end if;
  if p->'rules' ? 'deduction_cap' and coalesce(p#>>'{rules,deduction_cap}','') not in ('daily_gross','none') then raise exception 'Teto de desconto inválido'; end if;
  if p->'rules' ? 'deduction_fraction' and coalesce(p#>>'{rules,deduction_fraction}','') not in ('full_day','payable_fraction') then raise exception 'Fração de desconto inválida'; end if;
  foreach k in array array['rounding','unit_rounding'] loop
    if p->'rules' ? k and coalesce(p->'rules'->>k,'') not in ('half_up','half_even','truncate') then raise exception 'Arredondamento inválido: %',k; end if;
  end loop;
  foreach k in array array['decimals','unit_decimals'] loop
    if p->'rules' ? k and (jsonb_typeof(p->'rules'->k) is distinct from 'number' or (p->'rules'->>k)::numeric<>trunc((p->'rules'->>k)::numeric) or (p->'rules'->>k)::numeric<0 or (p->'rules'->>k)::numeric>6) then raise exception 'Casas decimais inválidas: %',k; end if;
  end loop;
  if p->'rules' ? 'supplied_reduction_combination' and coalesce(p#>>'{rules,supplied_reduction_combination}','') not in ('multiply','add_reductions') then raise exception 'Combinação de reduções inválida'; end if;
  if p->'rules' ? 'supplied_lodging_basis' and coalesce(p#>>'{rules,supplied_lodging_basis}','') not in ('reduction','payable_fraction') then raise exception 'Base da hospedagem fornecida inválida'; end if;
  if p->'rules' ? 'boarding' then
    v := p#>'{rules,boarding}';
    if coalesce(v->>'count','') not in ('once','per_leg') or coalesce(v->>'rate','')='' or jsonb_typeof(v->'reduction_applies') is distinct from 'boolean' then raise exception 'Regra de embarque inválida'; end if;
    if complete and p->'rates'->(v->>'rate') is null then raise exception 'Tarifa de embarque inexistente'; end if;
  end if;
  foreach k in array array['deduct_meals','deduct_transport'] loop
    if p->'rules' ? k and jsonb_typeof(p->'rules'->k)<>'boolean' then raise exception 'Regra booleana inválida: %',k; end if;
  end loop;
  for k,v in select * from jsonb_each(coalesce(p#>'{rules,allowed_reductions}','{}')) loop
    if jsonb_typeof(v)<>'number' or v::numeric < 0 or v::numeric > 1 then raise exception 'Redução inválida: %',k; end if;
  end loop;
  if p->'auxiliary' ? 'holidays' then
    if jsonb_typeof(p#>'{auxiliary,holidays}') is distinct from 'array' then raise exception 'Calendário de feriados inválido'; end if;
    for k in select jsonb_array_elements_text(p#>'{auxiliary,holidays}') loop
      if k !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Data de feriado inválida'; end if;
      perform k::date;
    end loop;
  end if;
  if p->'auxiliary' ? 'weekend_days' then
    if jsonb_typeof(p#>'{auxiliary,weekend_days}') is distinct from 'array' then raise exception 'Calendário de semana inválido'; end if;
    for v in select jsonb_array_elements(p#>'{auxiliary,weekend_days}') loop
      if jsonb_typeof(v) is distinct from 'number' or v::numeric<>trunc(v::numeric) or v::numeric<0 or v::numeric>6 then raise exception 'Dia da semana inválido'; end if;
    end loop;
  end if;
  for k,v in select * from jsonb_each(coalesce(p->'sources','{}')) loop
    if exists(select 1 from jsonb_object_keys(v) x where x not in ('title','url','article','published_on','effective_from','effective_to')) then raise exception 'Campo de fonte desconhecido'; end if;
    if coalesce(v->>'title','')='' or coalesce(v->>'url','') !~ '^https://' then raise exception 'Fonte inválida: %',k; end if;
    foreach source_key in array array['published_on','effective_from','effective_to'] loop
      if v->>source_key is not null and v->>source_key !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Data de fonte inválida'; end if;
    end loop;
    if v->>'published_on' is not null then perform (v->>'published_on')::date; end if;
    if v->>'effective_from' is not null then perform (v->>'effective_from')::date; end if;
    if v->>'effective_to' is not null then perform (v->>'effective_to')::date; end if;
    if (v->>'effective_to')::date < (v->>'effective_from')::date then raise exception 'Vigência da fonte invertida: %',k; end if;
  end loop;
  for k,v in select * from jsonb_each(coalesce(p->'rates','{}')) loop
    if exists(select 1 from jsonb_object_keys(v) x where x not in ('kind','value','percent','reference','category','currency','source_ids')) then raise exception 'Campo de tarifa desconhecido'; end if;
    if coalesce(v->>'kind','') not in ('fixed','reference_percent','category_percent') or coalesce(v->>'currency','') !~ '^[A-Z]{3}$' then raise exception 'Tarifa inválida: %',k; end if;
    if v->>'kind'='fixed' then
      if jsonb_typeof(v->'value') is distinct from 'number' or (v->>'value')::numeric < 0 then raise exception 'Valor inválido: %',k; end if;
    else
      if jsonb_typeof(v->'percent') is distinct from 'number' or (v->>'percent')::numeric < 0 then raise exception 'Percentual inválido: %',k; end if;
    end if;
    if complete then
      seen := array[k]; current_key := k; r := v;
      while r->>'kind'='category_percent' loop
        target := r->>'category';
        if target is null or target=any(seen) then raise exception 'Ciclo ou categoria ausente: %',k; end if;
        seen := array_append(seen,target); r := p->'rates'->target;
        if r is null then raise exception 'Categoria inexistente: %',target; end if;
        if r->>'currency'<>v->>'currency' then raise exception 'Moedas incompatíveis: %',k; end if;
      end loop;
      if r->>'kind'='reference_percent' then
        target := r->>'reference';
        if target is null or p->'references'->target is null then raise exception 'Referência inexistente: %',target; end if;
        if p->'references'->target->>'currency'<>v->>'currency' then raise exception 'Moedas incompatíveis: %',k; end if;
      end if;
    end if;
  end loop;
  for k,v in select * from jsonb_each(coalesce(p->'references','{}')) union all select * from jsonb_each(coalesce(p->'limits','{}')) loop
    if jsonb_typeof(v->'value') is distinct from 'number' or (v->>'value')::numeric < 0 or coalesce(v->>'currency','') !~ '^[A-Z]{3}$' then raise exception 'Referência/limite inválido: %',k; end if;
  end loop;
  for k,v in select * from jsonb_each(coalesce(p->'references','{}')) loop
    if exists(select 1 from jsonb_object_keys(v) x where x not in ('value','currency','source_ids')) then raise exception 'Campo de referência desconhecido'; end if;
  end loop;
  for k,v in select * from jsonb_each(coalesce(p->'limits','{}')) loop
    if exists(select 1 from jsonb_object_keys(v) x where x not in ('value','currency','applies_to','mandatory','source_ids')) then raise exception 'Campo de limite desconhecido'; end if;
    if coalesce(v->>'applies_to','') not in ('daily_rate','daily_gross','trip_gross') then raise exception 'Aplicação do limite inválida: %',k; end if;
    if v ? 'mandatory' and jsonb_typeof(v->'mandatory')<>'boolean' then raise exception 'Restrição obrigatória inválida: %',k; end if;
  end loop;
  if complete then
    if (p->'auxiliary' ? 'holidays' or p->'auxiliary' ? 'weekend_days') and jsonb_array_length(coalesce(p#>'{auxiliary,source_ids}','[]'))=0 then raise exception 'Calendário sem fundamento'; end if;
    if (p->'rules' ? 'unit_decimals') <> (p->'rules' ? 'unit_rounding') then raise exception 'Informar modo e casas de arredondamento unitário'; end if;
    for k in select jsonb_array_elements_text(coalesce(p#>'{rules,additional_rates}','[]')) loop
      if p->'rates'->k is null then raise exception 'Tarifa adicional inexistente: %',k; end if;
    end loop;
    for k in select jsonb_object_keys(coalesce(p->'rules','{}')) loop
      if jsonb_array_length(coalesce(p->'rule_sources'->k,'[]'))=0 then raise exception 'Regra sem fundamento: %',k; end if;
    end loop;
    for k in select jsonb_array_elements_text(coalesce(p->'locked_rules','[]')) loop
      if not coalesce(p->'rules','{}') ? k then raise exception 'Regra obrigatória inexistente: %',k; end if;
    end loop;
    for v in select value from jsonb_each(coalesce(p->'rates','{}')) union all select value from jsonb_each(coalesce(p->'references','{}')) union all select value from jsonb_each(coalesce(p->'limits','{}'))
      union all select jsonb_build_object('source_ids',value) from jsonb_each(coalesce(p->'rule_sources','{}'))
      union all select jsonb_build_object('source_ids',p#>'{auxiliary,source_ids}') where p->'auxiliary' ? 'source_ids' loop
      for source_key in select jsonb_array_elements_text(coalesce(v->'source_ids','[]')) loop
        if not coalesce(p->'sources','{}') ? source_key then raise exception 'Fonte inexistente: %',source_key; end if;
      end loop;
      if jsonb_array_length(coalesce(v->'source_ids','[]'))=0 then raise exception 'Parâmetro monetário sem fundamento'; end if;
    end loop;
  end if;
end $$;

create function public.admin_save_dailies_draft(p_id uuid,p_scope_id uuid,p_payload jsonb,p_valid_from date,p_valid_to date,p_reason text,p_change_kind text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v public.dailies_versions%rowtype;
begin
  if not public.is_admin_user() then raise exception 'acesso negado'; end if;
  perform public.dailies_validate_payload(p_payload);
  if p_id is null then
    insert into public.dailies_versions(scope_id,payload,valid_from,valid_to,reason,change_kind,created_by)
    values(p_scope_id,p_payload,p_valid_from,p_valid_to,trim(p_reason),p_change_kind,auth.uid()) returning * into v;
  else
    update public.dailies_versions set payload=p_payload,legacy_snapshot=null,valid_from=p_valid_from,valid_to=p_valid_to,
      reason=trim(p_reason),change_kind=p_change_kind,revision=nextval('public.dailies_revision_seq')
      where id=p_id and scope_id=p_scope_id and status='draft' returning * into v;
    if not found then raise exception 'Rascunho inexistente ou versão já publicada'; end if;
  end if;
  return to_jsonb(v);
end $$;

create function public.admin_clone_dailies_version(p_id uuid) returns jsonb language plpgsql security definer
set search_path=public,pg_temp as $$
declare v public.dailies_versions%rowtype; c public.dailies_versions%rowtype;
begin
  if not public.is_admin_user() then raise exception 'acesso negado'; end if;
  select * into strict v from public.dailies_versions where id=p_id;
  insert into public.dailies_versions(scope_id,payload,legacy_snapshot,valid_from,valid_to,reason,change_kind,created_by)
  values(v.scope_id,v.payload,v.legacy_snapshot,v.valid_from,v.valid_to,'Clone de '||v.id,'normative',auth.uid()) returning * into c;
  return to_jsonb(c);
end $$;

-- A single consistent statement snapshot supplies context, period and revision to clients.
create function public.get_dailies_versions(p_org_slug text,p_from date,p_to date) returns jsonb
language plpgsql stable security invoker set search_path=public,pg_temp as $$
declare p text; b text; versions jsonb;
begin
  if p_from is null or p_to is null or p_to<p_from then raise exception 'Período inválido'; end if;
  select o.power_name,m.branch_key into p,b from public.org_config o left join public.dailies_org_memberships m using(org_slug) where o.org_slug=p_org_slug;
  if not found then raise exception 'Órgão não cadastrado'; end if;
  select coalesce(jsonb_agg(to_jsonb(v)||jsonb_build_object('scope_type',s.scope_type,'scope_key',s.scope_key) order by v.valid_from,v.revision),'[]') into versions
  from public.dailies_versions v join public.dailies_scopes s on s.id=v.scope_id
  where v.status='published' and v.superseded_by is null and v.valid_from<=p_to and (v.valid_to is null or v.valid_to>=p_from)
    and ((s.scope_type='global' and s.scope_key='*') or (s.scope_type='power' and s.scope_key=p) or (s.scope_type='branch' and s.scope_key=b) or (s.scope_type='org' and s.scope_key=p_org_slug));
  return jsonb_build_object('context',jsonb_build_object('org_slug',p_org_slug,'power',p,'branch',b),'versions',versions,
    'revision',md5((jsonb_build_object('power',p,'branch',b)||jsonb_build_object('versions',versions))::text));
end $$;

create function public.admin_publish_dailies_version(p_id uuid,p_previous_id uuid default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v public.dailies_versions%rowtype; prev public.dailies_versions%rowtype;
  org record; boundary date; layer record; effective jsonb; inherited jsonb; lk text; lv jsonb; nk text; source_id text; source_doc jsonb;
begin
  if not public.is_admin_user() then raise exception 'acesso negado'; end if;
  select * into strict v from public.dailies_versions where id=p_id;
  -- Serialize the full hierarchy, including concurrent parent/child publications.
  perform pg_advisory_xact_lock(hashtextextended('dailies-publication',0));
  select * into strict v from public.dailies_versions where id=p_id for update;
  if v.status<>'draft' or v.valid_from is null or v.legacy_snapshot is not null then
    raise exception 'Somente rascunho validado, com início comprovado, pode ser publicado'; end if;
  perform public.dailies_validate_payload(v.payload);
  if not exists(select 1 from public.org_config o left join public.dailies_org_memberships m using(org_slug)
    join public.dailies_scopes s on s.id=v.scope_id
    where s.scope_type='global' or (s.scope_type='power' and s.scope_key=o.power_name)
      or (s.scope_type='branch' and s.scope_key=m.branch_key) or (s.scope_type='org' and s.scope_key=o.org_slug)) then
    raise exception 'Âmbito sem órgão associado para validação'; end if;
  if p_previous_id is not null then
    select * into strict prev from public.dailies_versions where id=p_previous_id for update;
    if prev.scope_id<>v.scope_id or prev.status<>'published' or prev.superseded_by is not null then raise exception 'Versão anterior incompatível'; end if;
    if v.change_kind='correction' then
      if prev.valid_from<>v.valid_from or prev.valid_to is distinct from v.valid_to then raise exception 'Correção deve preservar intervalo; publique alteração normativa para outra vigência'; end if;
      update public.dailies_versions set superseded_by=v.id where id=prev.id;
    else
      if v.valid_from<=prev.valid_from or (prev.valid_to is not null and v.valid_from>prev.valid_to+1) then raise exception 'Encerramento anterior incompatível'; end if;
      update public.dailies_versions set valid_to=v.valid_from-1 where id=prev.id;
    end if;
  end if;
  if exists(select 1 from public.dailies_versions x where x.scope_id=v.scope_id and x.status='published' and x.superseded_by is null
    and daterange(x.valid_from,x.valid_to,'[]') && daterange(v.valid_from,v.valid_to,'[]')) then raise exception 'Sobreposição de vigências publicadas'; end if;
  update public.dailies_versions set status='published',published_at=now(),published_by=auth.uid(),revision=nextval('public.dailies_revision_seq') where id=v.id returning * into v;
  -- Validate every affected effective interval, including future descendant overrides.
  for org in select o.org_slug from public.org_config o loop
    for boundary in
      select distinct d from (
        select v.valid_from as d union all
        select x.valid_from from public.dailies_versions x where x.status='published' and x.superseded_by is null and x.valid_from>=v.valid_from
        union all select x.valid_to+1 from public.dailies_versions x where x.status='published' and x.superseded_by is null and x.valid_to>=v.valid_from
        union all select (src.value->>'effective_from')::date from public.dailies_versions x
          cross join lateral jsonb_each(coalesce(x.payload->'sources','{}')) src where x.status='published' and x.superseded_by is null
        union all select (src.value->>'effective_to')::date+1 from public.dailies_versions x
          cross join lateral jsonb_each(coalesce(x.payload->'sources','{}')) src where x.status='published' and x.superseded_by is null
      ) dates where d is not null and d>=v.valid_from
    loop
      effective := '{}';
      for layer in select value as version from jsonb_array_elements(public.get_dailies_versions(org.org_slug,boundary,boundary)->'versions')
        order by case value->>'scope_type' when 'global' then 0 when 'power' then 1 when 'branch' then 2 else 3 end
      loop
        inherited := effective;
        effective := public.dailies_merge(effective,layer.version->'payload');
        for nk in select jsonb_array_elements_text(coalesce(inherited->'locked_rules','[]')) loop
          if effective->'rules'->nk is distinct from inherited->'rules'->nk then raise exception 'Override de regra obrigatória: %',nk; end if;
        end loop;
        for lk,lv in select * from jsonb_each(coalesce(inherited->'limits','{}')) loop
          if coalesce((lv->>'mandatory')::boolean,false) and (
            effective->'limits'->lk->>'currency' is distinct from lv->>'currency'
            or effective->'limits'->lk->>'applies_to' is distinct from lv->>'applies_to'
            or (effective->'limits'->lk->>'value')::numeric > (lv->>'value')::numeric
            or not coalesce((effective->'limits'->lk->>'mandatory')::boolean,false)) then
            raise exception 'Override de limite obrigatório: %',lk; end if;
        end loop;
      end loop;
      perform public.dailies_validate_payload(effective,true);
      for source_id in select distinct jsonb_array_elements_text(coalesce(parameter->'source_ids','[]')) from (
        select value as parameter from jsonb_each(coalesce(effective->'rates','{}'))
        union all select value from jsonb_each(coalesce(effective->'references','{}'))
        union all select value from jsonb_each(coalesce(effective->'limits','{}'))
        union all select jsonb_build_object('source_ids',value) from jsonb_each(coalesce(effective->'rule_sources','{}'))
        union all select jsonb_build_object('source_ids',effective#>'{auxiliary,source_ids}') where effective->'auxiliary' ? 'source_ids'
      ) parameters loop
        source_doc := effective->'sources'->source_id;
        if (source_doc->>'effective_from')::date>boundary or (source_doc->>'effective_to')::date<boundary then
          raise exception 'Fonte % fora da vigência em %',source_id,boundary; end if;
      end loop;
    end loop;
  end loop;
  return to_jsonb(v);
end $$;

-- Explicit branch onboarding; never infer CJF membership from the legacy PJU payload.
create function public.admin_set_dailies_branch(p_org_slug text,p_branch_key text) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare previous_branch text;
begin
  if not public.is_admin_user() then raise exception 'acesso negado'; end if;
  perform pg_advisory_xact_lock(hashtextextended('dailies-publication',0));
  if not exists(select 1 from public.dailies_scopes where scope_type='branch' and scope_key=p_branch_key) then raise exception 'Ramo inexistente'; end if;
  select branch_key into previous_branch from public.dailies_org_memberships where org_slug=p_org_slug;
  if previous_branch=p_branch_key then return; end if;
  -- Historical memberships must not silently change past configuration resolution.
  if exists(select 1 from public.dailies_versions v join public.dailies_scopes s on s.id=v.scope_id
    where v.status='published' and ((s.scope_type='org' and s.scope_key=p_org_slug)
      or (s.scope_type='branch' and s.scope_key in (previous_branch,p_branch_key)))) then
    raise exception 'Vínculo com histórico publicado é imutável; cadastrar novo órgão/regime'; end if;
  insert into public.dailies_org_memberships values(p_org_slug,p_branch_key) on conflict(org_slug) do update set branch_key=excluded.branch_key;
  insert into public.dailies_membership_audit(org_slug,previous_branch,new_branch,actor_id)
    values(p_org_slug,previous_branch,p_branch_key,auth.uid());
end $$;

revoke execute on function public.dailies_audit_change(),public.dailies_guard_published(),public.dailies_merge(jsonb,jsonb),public.dailies_validate_payload(jsonb,boolean),
 public.admin_save_dailies_draft(uuid,uuid,jsonb,date,date,text,text),public.admin_clone_dailies_version(uuid),
 public.admin_publish_dailies_version(uuid,uuid),public.admin_set_dailies_branch(text,text),public.get_dailies_versions(text,date,date) from public;
grant execute on function public.admin_save_dailies_draft(uuid,uuid,jsonb,date,date,text,text),public.admin_clone_dailies_version(uuid),
 public.admin_publish_dailies_version(uuid,uuid),public.admin_set_dailies_branch(text,text) to authenticated;
grant execute on function public.get_dailies_versions(text,date,date) to anon,authenticated;
commit;
