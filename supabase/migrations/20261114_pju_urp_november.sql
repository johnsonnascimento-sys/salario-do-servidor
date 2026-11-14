-- Candidato local; NÃO aplicado em produção nesta entrega.
-- Fonte conferida em 14/11/2026: https://www.funprespjud.com.br/urp/index.php
-- Publicação: 12/11/2026. A versão cadastral não altera a regra temporal da URP.
-- Preserva JSON e snapshots históricos; não modifica DDL ou RLS.
BEGIN;
DO $migration$
DECLARE
  previous public.power_config%rowtype;
  urps jsonb := '{"2026-11":206.11}'::jsonb;
  sources jsonb := '{"2026-11":"https://www.funprespjud.com.br/urp/index.php"}'::jsonb;
  version_date date := '2026-11-14';
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('PJU:previdencia_complementar'));
  IF (SELECT count(*) FROM public.power_config WHERE power_name='PJU'
      AND config_key='previdencia_complementar' AND valid_to IS NULL) <> 1 THEN
    RAISE EXCEPTION 'Esperada uma única configuração previdenciária PJU ativa';
  END IF;
  SELECT * INTO STRICT previous FROM public.power_config WHERE power_name='PJU'
    AND config_key='previdencia_complementar' AND valid_to IS NULL FOR UPDATE;
  IF previous.config_value #> '{urp_by_competence,2026-11}' IS NOT NULL
      AND previous.config_value #> '{urp_by_competence,2026-11}' <> urps->'2026-11' THEN
    RAISE EXCEPTION 'Conflito na URP de novembro/2026; revisar administrativamente';
  END IF;
  IF previous.config_value #> '{urp_sources_by_competence,2026-11}' IS NOT NULL
      AND previous.config_value #> '{urp_sources_by_competence,2026-11}' <> sources->'2026-11' THEN
    RAISE EXCEPTION 'Conflito na fonte da URP de novembro/2026; revisar administrativamente';
  END IF;
  IF previous.config_value #> '{urp_by_competence,2026-11}' = urps->'2026-11'
      AND previous.config_value #> '{urp_sources_by_competence,2026-11}' = sources->'2026-11' THEN
    RETURN;
  END IF;
  IF previous.valid_from >= version_date OR EXISTS (SELECT 1 FROM public.power_config
      WHERE power_name='PJU' AND config_key='previdencia_complementar' AND valid_from=version_date) THEN
    RAISE EXCEPTION 'Vigência incompatível; preservar a configuração existente';
  END IF;
  UPDATE public.power_config SET valid_to=version_date-1 WHERE id=previous.id;
  INSERT INTO public.power_config(power_name,config_key,config_value,valid_from,valid_to)
    VALUES ('PJU','previdencia_complementar',previous.config_value || jsonb_build_object(
      'urp_by_competence',coalesce(previous.config_value->'urp_by_competence','{}'::jsonb) || urps,
      'urp_sources_by_competence',coalesce(previous.config_value->'urp_sources_by_competence','{}'::jsonb) || sources
    ), version_date, NULL);
END
$migration$;
COMMIT;
