-- Candidato revisável; não aplicar automaticamente em produção.
-- Versiona as regras comuns; preenche órgãos sem substituir overrides locais.
begin;

create or replace function pg_temp.config_defaults(existing jsonb, defaults jsonb)
returns jsonb language plpgsql as $$
declare result jsonb := coalesce(existing, '{}'::jsonb); item record;
begin
  for item in select key, value from jsonb_each(defaults) loop
    if not result ? item.key or result->item.key = 'null'::jsonb then
      result := jsonb_set(result, array[item.key], item.value);
    elsif jsonb_typeof(item.value)='object' and jsonb_typeof(result->item.key)='object' then
      result := jsonb_set(result, array[item.key], pg_temp.config_defaults(result->item.key,item.value));
    end if;
  end loop;
  return result;
end $$;

do $$
declare
  previous public.power_config%rowtype;
  candidate jsonb;
  common_defaults jsonb := '{
    "rates":{"analista":806.82,"tecnico":660.13,"auxiliar":660.13},
    "normative_info":{"general_rule_label":"Resolução CNJ Nº 73/2009"},
    "derived_from_minister":{"enabled":true,"minister_per_diem":1466.95,
      "rates_percentages":{"analista":0.55,"tecnico":0.45,"auxiliar":0.45},"assistance_percentage":0.8},
    "ldo_cap":{"enabled":true,"per_diem_limit":1153.37},
    "discount_rules":{"food_divisor":22,"transport_divisor":22,"exclude_weekends_and_holidays":true,
      "holidays":[],"return_day_half_diem_business_day":true,"return_day_half_discount_business_day":true}
  }'::jsonb;
  jmu_defaults jsonb;
  jf_defaults jsonb;
  org record;
  org_rules jsonb;
  new_configuration jsonb;
  migration_date date := date '2026-10-29';
begin
  perform pg_advisory_xact_lock(hashtext('PJU:dailies_rules'));
  if exists(select 1 from public.power_config where power_name='PJU' and config_key='dailies_rules' and valid_from=migration_date) then
    if not exists(select 1 from public.power_config where power_name='PJU' and config_key='dailies_rules'
      and valid_from=migration_date and config_value->>'_calculator_compliance_version'='2026-10-29-v1') then
      raise exception 'Data da migração já ocupada por versão não identificada; revisar vigência sem sobrescrever';
    end if;
    if (select count(*) from public.org_config where org_slug in ('jmu','cjf','trf1','trf2','trf3','trf4','trf5','trf6')
      and power_name='PJU' and configuration#>>'{dailies_rules,branch_id}'=case when org_slug='jmu' then 'jmu' else 'jf' end
      and jsonb_typeof(configuration#>'{dailies_rules,assisted_authorities}')='array'
      and jsonb_array_length(configuration#>'{dailies_rules,assisted_authorities}')>0) <> 8 then
      raise exception 'Marcador da migração presente, mas cadastro dos órgãos está incompleto; revisar aplicação';
    end if;
    return; -- reaplicação identificada não substitui revisões administrativas
  end if;
  if (select count(*) from public.power_config where power_name='PJU' and config_key='dailies_rules' and valid_to is null)>1 then
    raise exception 'Mais de uma regra de diárias PJU ativa; revisar antes de versionar';
  end if;
  select * into previous from public.power_config where power_name='PJU' and config_key='dailies_rules' and valid_to is null for update;
  if previous.id is not null and previous.valid_from>=migration_date then
    raise exception 'Versão ativa não precede a data da correção';
  end if;

  -- Os parâmetros STM anteriormente compartilhados tornam-se overrides JMU.
  jmu_defaults := '{
    "branch_id":"jmu","embarkation_label":"Adicional de embarque e desembarque",
    "assisted_authorities":[
      {"code":"ministro_stm","label":"Ministro do STM","percentage":1},
      {"code":"juiz_militar","label":"Juiz Federal da Justiça Militar / Substituto","rate_key":"juiz_titular"}],
    "normative_info":{"branch_rule_label":"Ato Normativo STM Nº 799/2024"},
    "derived_from_minister":{"rates_percentages":{"juiz":0.95,"juiz_titular":0.95,"juiz_substituto":0.95,"cj":0.6,"cj1":0.6,"cj2":0.6,"cj3":0.6,"cj4":0.6},
      "embarkation_percentage_full":0.4,"embarkation_percentage_half":0.2},
    "embarkation_additional":{"completo":586.78,"metade":293.39},
    "external_gloss":{"hospedagem":0.55,"alimentacao":0.25,"transporte":0.2}
  }'::jsonb;
  -- Preserva adicionais/glosas e percentuais locais que estavam indevidamente na camada comum.
  jmu_defaults := pg_temp.config_defaults(jsonb_strip_nulls(jsonb_build_object(
    'embarkation_label', previous.config_value->'embarkation_label',
    'embarkation_additional', previous.config_value->'embarkation_additional',
    'external_gloss', previous.config_value->'external_gloss',
    'normative_info', jsonb_strip_nulls(jsonb_build_object('branch_rule_label', previous.config_value#>'{normative_info,branch_rule_label}')),
    'derived_from_minister', jsonb_strip_nulls(jsonb_build_object(
      'embarkation_percentage_full', previous.config_value#>'{derived_from_minister,embarkation_percentage_full}',
      'embarkation_percentage_half', previous.config_value#>'{derived_from_minister,embarkation_percentage_half}',
      'rates_percentages', (select jsonb_object_agg(key,value) from jsonb_each(coalesce(previous.config_value#>'{derived_from_minister,rates_percentages}','{}'))
        where key in ('cj','cj1','cj2','cj3','cj4','juiz','juiz_titular','juiz_substituto'))
    ))
  )),jmu_defaults);
  jf_defaults := '{
    "branch_id":"jf","embarkation_label":"Adicional de deslocamento",
    "assisted_authorities":[
      {"code":"ministro_cjf","label":"Ministro / Membro do CJF","percentage":1},
      {"code":"desembargador_trf","label":"Desembargador Federal / Membro do TRF","rate_key":"desembargador"},
      {"code":"juiz_federal","label":"Juiz Federal / Juiz Federal Substituto","rate_key":"juiz_titular"}],
    "normative_info":{"branch_rule_label":"Resolução CJF Nº 340/2015"},
    "derived_from_minister":{"rates_percentages":{"desembargador":0.95,"juiz":0.9025,"juiz_titular":0.9025,"juiz_substituto":0.9025,"cj":0.55,"cj1":0.55,"cj2":0.55,"cj3":0.55,"cj4":0.55},
      "embarkation_percentage_full":0.44,"embarkation_percentage_half":0.22},
    "embarkation_additional":{"completo":645.46,"metade":322.73},
    "external_gloss":{"hospedagem":0.5,"alimentacao":0.25,"transporte":0.25}
  }'::jsonb;

  insert into public.org_config(org_slug,org_name,power_name,configuration)
    values ('jmu','Justiça Militar da União','PJU','{}'),('cjf','Conselho da Justiça Federal','PJU','{}'),
      ('trf1','Tribunal Regional Federal da 1ª Região','PJU','{}'),('trf2','Tribunal Regional Federal da 2ª Região','PJU','{}'),
      ('trf3','Tribunal Regional Federal da 3ª Região','PJU','{}'),('trf4','Tribunal Regional Federal da 4ª Região','PJU','{}'),
      ('trf5','Tribunal Regional Federal da 5ª Região','PJU','{}'),('trf6','Tribunal Regional Federal da 6ª Região','PJU','{}')
    on conflict(org_slug) do nothing;
  if exists(select 1 from public.org_config where org_slug in ('jmu','stm','cjf','trf1','trf2','trf3','trf4','trf5','trf6') and power_name<>'PJU') then
    raise exception 'Órgão cadastrado em poder incompatível; revisar sem substituir o cadastro';
  end if;
  if exists(select 1 from public.org_config where org_slug in ('jmu','stm','cjf','trf1','trf2','trf3','trf4','trf5','trf6')
    and configuration#>>'{dailies_rules,branch_id}' is not null
    and configuration#>>'{dailies_rules,branch_id}' <> case when org_slug in ('jmu','stm') then 'jmu' else 'jf' end) then
    raise exception 'Identificação do ramo incompatível com órgão; revisar sem substituir override';
  end if;
  for org in select * from public.org_config where org_slug in ('jmu','stm','cjf','trf1','trf2','trf3','trf4','trf5','trf6') for update loop
    org_rules := pg_temp.config_defaults(org.configuration->'dailies_rules', case when org.org_slug in ('jmu','stm') then jmu_defaults else jf_defaults end);
    if org.org_slug in ('jmu','stm') then
      -- Correção explícita prevista na seção 11; não manter o escalonamento CJF herdado por engano.
      org_rules := jsonb_set(org_rules,'{derived_from_minister,rates_percentages}',
        coalesce(org_rules#>'{derived_from_minister,rates_percentages}','{}') || '{"juiz":0.95,"juiz_titular":0.95,"juiz_substituto":0.95}');
    end if;
    new_configuration := jsonb_set(coalesce(org.configuration,'{}'),'{dailies_rules}',org_rules);
    update public.org_config set configuration=new_configuration where id=org.id;
  end loop;

  candidate := pg_temp.config_defaults(previous.config_value,common_defaults);
  -- Ramo, autoridades, adicionais e glosas não são comuns ao PJU.
  candidate := candidate - 'branch_id' - 'assisted_authorities' - 'embarkation_label' - 'embarkation_additional' - 'external_gloss';
  candidate := jsonb_set(candidate,'{normative_info}',coalesce(candidate->'normative_info','{}') - 'branch_rule_label' - 'local_rule_label' - 'notes');
  candidate := jsonb_set(candidate,'{discount_rules}',(coalesce(candidate->'discount_rules','{}') - 'holiday_calendar_label' - 'holiday_calendar_reference' - 'holiday_calendar_version') || '{"holidays":[]}');
  candidate := jsonb_set(candidate,'{derived_from_minister}',(candidate->'derived_from_minister') - 'embarkation_percentage_full' - 'embarkation_percentage_half');
  candidate := jsonb_set(candidate,'{derived_from_minister,rates_percentages}',(candidate#>'{derived_from_minister,rates_percentages}') - array['juiz','juiz_titular','juiz_substituto','desembargador','cj','cj1','cj2','cj3','cj4']);
  candidate := jsonb_set(candidate,'{rates}',(candidate->'rates') - array['juiz','juiz_titular','juiz_substituto','desembargador','cj','cj1','cj2','cj3','cj4']);
  candidate := candidate || '{"_calculator_compliance_version":"2026-10-29-v1"}'::jsonb;
  if previous.id is not null then
    update public.power_config set valid_to=migration_date-1 where id=previous.id;
  end if;
  insert into public.power_config(power_name,config_key,config_value,valid_from,valid_to)
    values ('PJU','dailies_rules',candidate,migration_date,null);
end $$;

create or replace function public.admin_version_global_config(
  p_previous_id uuid,
  p_config_key text,
  p_config_value jsonb,
  p_valid_from date,
  p_valid_to date default null
) returns void language plpgsql security definer set search_path=public as $$
declare previous public.global_config%rowtype;
begin
  if not public.is_admin_user() then raise exception 'acesso negado'; end if;
  select * into previous from public.global_config where id=p_previous_id for update;
  if not found then raise exception 'registro anterior não encontrado'; end if;
  if previous.valid_to is not null then raise exception 'versão já encerrada; atualize o formulário'; end if;
  if trim(coalesce(p_config_key,'')) <> previous.config_key then
    raise exception 'a chave e o poder da versão não podem mudar';
  end if;
  perform pg_advisory_xact_lock(hashtext('global:' || previous.config_key));
  if p_valid_from is null or p_valid_from <= previous.valid_from then
    raise exception 'nova vigência deve ser posterior à anterior, sem repetir o dia';
  end if;
  if p_valid_from > (current_timestamp at time zone 'America/Sao_Paulo')::date or p_valid_to is not null then
    raise exception 'agendamento futuro e vigência final não são suportados';
  end if;
  if p_config_value is null then raise exception 'config_value obrigatório'; end if;
  if exists(select 1 from public.global_config where config_key=previous.config_key
    and id<>previous.id and (valid_to is null or valid_to>=p_valid_from)) then
    raise exception 'há outra versão ativa ou sobreposição de vigências';
  end if;
  update public.global_config set valid_to=p_valid_from-1 where id=previous.id;
  insert into public.global_config(config_key,config_value,valid_from,valid_to) values (previous.config_key,p_config_value,p_valid_from,null);
end $$;
revoke all on function public.admin_version_global_config(uuid,text,jsonb,date,date) from public,anon;
grant execute on function public.admin_version_global_config(uuid,text,jsonb,date,date) to authenticated;

create or replace function public.admin_version_power_config(
  p_previous_id uuid,
  p_power_name text,
  p_config_key text,
  p_config_value jsonb,
  p_valid_from date,
  p_valid_to date default null
) returns void language plpgsql security definer set search_path=public as $$
declare previous public.power_config%rowtype;
begin
  if not public.is_admin_user() then raise exception 'acesso negado'; end if;
  select * into previous from public.power_config where id=p_previous_id for update;
  if not found then raise exception 'registro anterior não encontrado'; end if;
  if previous.valid_to is not null then raise exception 'versão já encerrada; atualize o formulário'; end if;
  if trim(coalesce(p_config_key,'')) <> previous.config_key or trim(coalesce(p_power_name,'')) <> previous.power_name then
    raise exception 'a chave e o poder da versão não podem mudar';
  end if;
  perform pg_advisory_xact_lock(hashtext(previous.power_name || ':' || previous.config_key));
  if p_valid_from is null or p_valid_from <= previous.valid_from then
    raise exception 'nova vigência deve ser posterior à anterior, sem repetir o dia';
  end if;
  if p_valid_from > (current_timestamp at time zone 'America/Sao_Paulo')::date or p_valid_to is not null then
    raise exception 'agendamento futuro e vigência final não são suportados';
  end if;
  if p_config_value is null then raise exception 'config_value obrigatório'; end if;
  if exists(select 1 from public.power_config where config_key=previous.config_key and power_name=previous.power_name
    and id<>previous.id and (valid_to is null or valid_to>=p_valid_from)) then
    raise exception 'há outra versão ativa ou sobreposição de vigências';
  end if;
  update public.power_config set valid_to=p_valid_from-1 where id=previous.id;
  insert into public.power_config(power_name,config_key,config_value,valid_from,valid_to) values (previous.power_name,previous.config_key,p_config_value,p_valid_from,null);
end $$;
revoke all on function public.admin_version_power_config(uuid,text,text,jsonb,date,date) from public,anon;
grant execute on function public.admin_version_power_config(uuid,text,text,jsonb,date,date) to authenticated;

commit;
