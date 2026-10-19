-- Candidato local: aplicar somente após revisão de impacto pelo fluxo administrativo.
-- Sem DDL/RLS; conserva o valor e a vigência dos registros anteriores.
-- 2026-10-19 é a versão do cadastro, não o início de vigência das leis citadas.
begin;
do $$
declare
  previous public.power_config%rowtype;
  candidate jsonb;
  urps jsonb := '{"2024-11":188.19,"2025-11":197.00,"2026-01":198.00,"2026-02":198.66,"2026-03":200.05,"2026-04":201.81,"2026-05":203.16,"2026-06":204.34,"2026-07":204.66,"2026-08":204.81,"2026-09":204.15,"2026-10":205.83}'::jsonb;
  sources jsonb;
begin
  perform pg_advisory_xact_lock(hashtext('PJU:previdencia_complementar'));
  if exists (select 1 from public.power_config where power_name='PJU'
    and config_key='previdencia_complementar' and valid_from='2026-10-19') then
    return; -- reaplicação não altera histórico nem substitui revisão administrativa
  end if;
  if (select count(*) from public.power_config where power_name='PJU'
    and config_key='previdencia_complementar' and valid_to is null) > 1 then
    raise exception 'Mais de uma configuração previdenciária PJU ativa; revisar antes de versionar';
  end if;
  select * into previous from public.power_config where power_name='PJU'
    and config_key='previdencia_complementar' and valid_to is null for update;
  if found and previous.valid_from >= date '2026-10-19' then
    raise exception 'A versão ativa é posterior ao candidato; revisar vigências';
  end if;
  select jsonb_object_agg(key, 'https://www.funprespjud.com.br/urp/index.php#' || key)
    into sources from jsonb_each(urps);
  candidate := coalesce(previous.config_value, '{}'::jsonb) || jsonb_build_object(
    'enabled', true, 'scope', 'patrocinado_vinculado',
    'sponsored_rate', '{"min":0.065,"max":0.085,"step":0.005,"default_rpc":0.085}'::jsonb,
    'linked_rate', '{"min":0.065,"max":0.22,"step":0.005}'::jsonb,
    'facultative_rate', '{"min_if_positive":0.025,"default":0}'::jsonb,
    'minimum_urp_units', 10,
    'urp_by_competence', coalesce(previous.config_value->'urp_by_competence','{}'::jsonb) || urps,
    'urp_sources_by_competence', coalesce(previous.config_value->'urp_sources_by_competence','{}'::jsonb) || sources,
    'incidence_rules', '{"fc":true,"gas":true,"gae":true,"aqTreino":true}'::jsonb,
    'base_rule', 'excedente_teto_rgps', 'include_thirteenth', true,
    'references', coalesce(previous.config_value->'references','{}'::jsonb) || jsonb_build_object(
      'regulamento_version','2018; arts. 14 e 15; conferência 2026-10-19',
      'regulamento_url','https://www.funprespjud.com.br/wp-content/uploads/2021/09/Plano-de-Beneficios-FunprespJud_2018.pdf',
      'base_legal_url','https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2012/lei/l12618.htm',
      'minimum_annual_url','https://www.trt2.jus.br/geral/tribunal2/Trib_Sup/STF/Resol/1_15.html',
      'reviewed_at','2026-10-19'));
  -- incidence_rules permite opções expressas independentes. Não inclui nenhuma rubrica automaticamente.
  -- Aportes facultativos não herdam o teto de 22% nem o passo de 0,5% da contribuição vinculada.
  if previous.id is not null then
    update public.power_config set valid_to=date '2026-10-18' where id=previous.id;
  end if;
  insert into public.power_config(power_name,config_key,config_value,valid_from,valid_to)
    values ('PJU','previdencia_complementar',candidate,date '2026-10-19',null);
end $$;
commit;
