-- Review of the existing, explicitly identified PJU schedule. No salary amounts,
-- percentages or effective dates are changed. Keep the previous JSON as history.
-- Sources verified on 29/10/2026:
-- https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15293.htm
-- https://www.congressonacional.leg.br/materias/vetos/-/veto/detalhe/17869
-- Periods 0 and 1 are existing zero-adjustment reference periods; they do not
-- introduce a new salary increase or change the existing AQ implementation.
begin;
do $$
declare
  previous public.power_config%rowtype;
  candidate jsonb;
  expected jsonb := '{
    "0":{"date":"2025-02-01","percentage":0,"status":"promulgated"},
    "1":{"date":"2026-01-01","percentage":0,"status":"promulgated"},
    "2":{"date":"2026-07-01","percentage":0.08,"status":"promulgated"},
    "3":{"date":"2027-07-01","percentage":0.08,"status":"vetoed"},
    "4":{"date":"2028-07-01","percentage":0.08,"status":"vetoed"}
  }';
  item record;
  entry jsonb;
  marker text := '2026-10-29-status-v1';
  migration_date date := date '2026-10-29';
begin
  perform pg_advisory_xact_lock(hashtext('PJU:adjustment_schedule'));
  if (select count(*) from public.power_config where power_name='PJU'
      and config_key='adjustment_schedule' and valid_to is null) <> 1 then
    raise exception 'O cronograma PJU deve ter exatamente uma versão ativa';
  end if;
  select * into previous from public.power_config where power_name='PJU'
    and config_key='adjustment_schedule' and valid_to is null for update;
  candidate := previous.config_value;
  if jsonb_typeof(candidate) <> 'object' or
      (select array_agg(key order by key) from jsonb_object_keys(candidate) as key) <> array['0','1','2','3','4'] then
    raise exception 'Cronograma diferente das cinco parcelas revisadas; nenhuma alteração aplicada';
  end if;
  for item in select key,value from jsonb_each(expected) loop
    entry := candidate->item.key;
    if jsonb_typeof(entry) <> 'object' or entry->>'date' is distinct from item.value->>'date'
       or entry->'percentage' is distinct from item.value->'percentage' then
      raise exception 'Parcela % difere da data ou percentual revisado', item.key;
    end if;
    if (entry ? 'status' and entry->>'status' is distinct from item.value->>'status')
       or (entry ? 'vetoed' and entry->'vetoed' is distinct from to_jsonb(item.value->>'status' = 'vetoed')) then
      raise exception 'Parcela % possui status explícito divergente; revisar sem sobrescrever', item.key;
    end if;
  end loop;
  if not exists(select 1 from jsonb_each(candidate) where value->>'status_review_version' is distinct from marker
      or value->>'status' is distinct from expected->key->>'status') then
    return;
  end if;
  if previous.valid_from >= migration_date or exists(select 1 from public.power_config
      where power_name='PJU' and config_key='adjustment_schedule' and valid_from=migration_date) then
    raise exception 'Colisão de vigência em 29/10/2026; não substituir versão existente';
  end if;
  for item in select key,value from jsonb_each(expected) loop
    entry := (candidate->item.key) || jsonb_build_object(
      'status', item.value->>'status', 'vetoed', item.value->>'status' = 'vetoed',
      'reviewRequired', false, 'status_review_version', marker,
      'status_source', case when item.key in ('3','4') then
        'https://www.congressonacional.leg.br/materias/vetos/-/veto/detalhe/17869'
        when item.key='2' then 'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15293.htm'
        else 'Referência existente preservada, sem parcela de reajuste salarial' end);
    if item.key in ('3','4') then
      entry := entry || jsonb_build_object('veto_reference','Veto nº 45/2025 — dispositivos 45.25.001 e 45.25.002 não apreciados');
    end if;
    candidate := jsonb_set(candidate,array[item.key],entry);
  end loop;
  update public.power_config set valid_to=migration_date-1 where id=previous.id;
  insert into public.power_config(power_name,config_key,config_value,valid_from,valid_to)
    values('PJU','adjustment_schedule',candidate,migration_date,null);
end $$;
commit;
