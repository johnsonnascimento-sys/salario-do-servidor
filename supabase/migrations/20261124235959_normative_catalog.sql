create table public.normative_acts (
  id uuid primary key default gen_random_uuid(),
  revision integer not null default 1 check (revision > 0),
  document jsonb not null,
  updated_at timestamptz not null default now()
);

create unique index normative_acts_identity on public.normative_acts (
  lower(btrim(document->>'issuer')), lower(btrim(document->>'kind')),
  lower(btrim(document->>'number')), (document->>'year')
);

create table public.normative_act_revisions (
  act_id uuid not null references public.normative_acts(id),
  revision integer not null,
  previous_document jsonb not null,
  changed_by uuid not null,
  changed_at timestamptz not null default now(),
  primary key (act_id, revision)
);

alter table public.normative_acts enable row level security;
alter table public.normative_act_revisions enable row level security;
revoke all on public.normative_acts, public.normative_act_revisions from public, anon, authenticated;
grant select on public.normative_acts, public.normative_act_revisions to authenticated;
create policy normative_acts_admin_read on public.normative_acts
  for select to authenticated using ((select auth.uid()) is not null and (select public.is_admin_user()));
create policy normative_act_revisions_admin_read on public.normative_act_revisions
  for select to authenticated using ((select auth.uid()) is not null and (select public.is_admin_user()));

create function public.admin_save_normative_act(p_id uuid, p_revision integer, p_document jsonb)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  previous public.normative_acts%rowtype;
  application jsonb;
  relation jsonb;
  field text;
  date_value text;
  target_id uuid;
  saved_id uuid;
begin
  if auth.uid() is null or not public.is_admin_user() then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  if jsonb_typeof(p_document) is distinct from 'object'
     or jsonb_typeof(p_document->'applications') is distinct from 'array'
     or jsonb_typeof(p_document->'relations') is distinct from 'array'
     or jsonb_typeof(p_document->'archived') is distinct from 'boolean'
     or coalesce(p_document->>'year', '') !~ '^[0-9]{4}$' then
    raise exception 'Cadastro inválido.' using errcode = '22023';
  end if;
  foreach field in array array['issuer', 'kind', 'number', 'summary'] loop
    if coalesce(btrim(p_document->>field), '') = '' then
      raise exception 'Preencha emissor, tipo, número e ementa.' using errcode = '22023';
    end if;
  end loop;
  if coalesce(p_document->>'source', '') <> '' and p_document->>'source' !~* '^https://[^[:space:]]+$' then
    raise exception 'Informe um endereço HTTPS para a fonte.' using errcode = '22023';
  end if;
  foreach field in array array['publication', 'checkedOn', 'validFrom', 'validTo'] loop
    date_value := nullif(p_document->>field, '');
    if date_value is not null and date_value !~ '^\d{4}-\d{2}-\d{2}$' then
      raise exception 'Use datas no formato AAAA-MM-DD.' using errcode = '22023';
    end if;
    perform date_value::date;
  end loop;
  if nullif(p_document->>'validFrom', '')::date > nullif(p_document->>'validTo', '')::date then
    raise exception 'O fim da vigência antecede o início.' using errcode = '22023';
  end if;

  for application in select value from jsonb_array_elements(p_document->'applications') loop
    foreach field in array array['id', 'org', 'subject', 'rule', 'provision', 'impact'] loop
      if coalesce(btrim(application->>field), '') = '' then
        raise exception 'Preencha órgão, assunto, regra, dispositivo e impacto de cada vínculo.' using errcode = '22023';
      end if;
    end loop;
    perform (application->>'id')::uuid;
    foreach field in array array['from', 'to'] loop
      date_value := nullif(application->>field, '');
      if date_value is not null and date_value !~ '^\d{4}-\d{2}-\d{2}$' then
        raise exception 'Use datas no formato AAAA-MM-DD.' using errcode = '22023';
      end if;
      perform date_value::date;
    end loop;
    if application->>'org' not in ('jmu', 'pju', 'cjf', 'trf1', 'trf2', 'trf3', 'trf4', 'trf5', 'trf6')
       or coalesce(application->>'status', '') not in ('review', 'implemented', 'update')
       or (application->>'status' = 'implemented' and coalesce(btrim(application->>'evidence'), '') = '')
       or nullif(application->>'from', '')::date > nullif(application->>'to', '')::date then
      raise exception 'Confira a situação, evidência e datas de efeito do vínculo.' using errcode = '22023';
    end if;
  end loop;
  if (select count(*) <> count(distinct (value->>'id')::uuid) from jsonb_array_elements(p_document->'applications')) then
    raise exception 'Há vínculos de aplicação duplicados.' using errcode = '22023';
  end if;

  for relation in select value from jsonb_array_elements(p_document->'relations') loop
    target_id := nullif(relation->>'targetId', '')::uuid;
    date_value := nullif(relation->>'from', '');
    if date_value is not null and date_value !~ '^\d{4}-\d{2}-\d{2}$' then
      raise exception 'Use datas no formato AAAA-MM-DD.' using errcode = '22023';
    end if;
    perform date_value::date;
    if target_id is null or target_id = p_id
       or coalesce(relation->>'kind', '') not in ('amends', 'repeals')
       or coalesce(btrim(relation->>'provision'), '') = ''
       or (coalesce(relation->>'from', '') <> '' and coalesce(btrim(p_document->>'source'), '') = '')
       or not exists (
         select 1 from public.normative_acts a where a.id = target_id
           and (coalesce(relation->>'applicationId', '') = ''
             or (relation->>'applicationId' = '*' and relation->>'kind' = 'repeals')
             or exists (
             select 1 from jsonb_array_elements(a.document->'applications') item
             where item->>'id' = relation->>'applicationId'
           ))
       ) then
      raise exception 'Confira o ato anterior, o dispositivo e a fonte da data de efeito.' using errcode = '22023';
    end if;
  end loop;

  if p_id is null then
    insert into public.normative_acts(document) values (p_document) returning id into saved_id;
    return saved_id;
  end if;

  select * into previous from public.normative_acts where id = p_id for update;
  if not found or previous.revision is distinct from p_revision then
    raise exception 'Este cadastro mudou. Recarregue antes de salvar.' using errcode = '40001';
  end if;
  if exists (
    select 1 from jsonb_array_elements(previous.document->'applications') old_item
    where not exists (
      select 1 from jsonb_array_elements(p_document->'applications') new_item
      where new_item->>'id' = old_item->>'id'
    )
  ) then
    raise exception 'Preserve os vínculos salvos e registre o fim dos efeitos quando comprovado.' using errcode = '22023';
  end if;

  insert into public.normative_act_revisions(act_id, revision, previous_document, changed_by)
    values (p_id, previous.revision, previous.document, auth.uid());
  update public.normative_acts set document = p_document, revision = revision + 1, updated_at = now()
    where id = p_id;
  return p_id;
end;
$$;

revoke all on function public.admin_save_normative_act(uuid, integer, jsonb) from public, anon, authenticated;
grant execute on function public.admin_save_normative_act(uuid, integer, jsonb) to authenticated;

insert into public.normative_acts (document) values (
  '{
    "issuer":"STM", "kind":"Resolução", "number":"374", "year":"2025",
    "summary":"Dispõe sobre a prestação de serviço extraordinário no âmbito da Justiça Militar da União.",
    "source":"https://www2.stm.jus.br/sislegis/index.php/ctrl_publico_pdf/visualizar/35654-RES-000374_06-08-2025_STM_0.pdf",
    "publication":"", "validFrom":"", "validTo":"", "checkedOn":"2026-11-24",
    "archived":false, "notes":"O art. 13 vincula a vigência à publicação. Confirmar a data no veículo oficial.",
    "applications":[
      {"id":"c92c7e33-3d83-4ae7-bcb8-0c31701267e1","org":"jmu","subject":"Serviço extraordinário","rule":"Divisor da hora extra","provision":"Art. 7º, §§ 1º e 2º","from":"","to":"","impact":"Divisor conforme a jornada semanal. A data de início dos efeitos ainda precisa ser confirmada.","status":"implemented","evidence":"payroll_rules.overtime_month_hours e card de Serviço Extraordinário"},
      {"id":"c92c7e33-3d83-4ae7-bcb8-0c31701267e2","org":"jmu","subject":"Serviço extraordinário","rule":"Limites informativos de horas","provision":"Art. 6º, caput e § 3º (texto original)","from":"","to":"","impact":"O texto original indica o § 3º para o recesso. O simulador cita o § 1º e menciona a Resolução STM nº 399/2026. Conferir o ato posterior e a redação aplicável.","status":"review","evidence":"src/components/Calculator/cards/OvertimeCard.tsx"}
    ], "relations":[]
  }'::jsonb
);
