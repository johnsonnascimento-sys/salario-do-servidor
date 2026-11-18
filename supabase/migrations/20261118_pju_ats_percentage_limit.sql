-- Art. 67 da Lei nº 8.112/1990 na redação da Lei nº 9.527/1997.
-- A vigência abaixo versiona a configuração do simulador.
DO $migration$
DECLARE
  previous public.power_config%rowtype;
  version_date date := '2026-11-18';
  ats_rule jsonb := jsonb_build_object(
    'ats_percentage_limit', 35,
    'ats_percentage_source', 'https://www.planalto.gov.br/ccivil_03/leis/l8112cons.htm#art67'
  );
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('PJU:payroll_rules'));
  SELECT * INTO STRICT previous FROM public.power_config
    WHERE power_name='PJU' AND config_key='payroll_rules' AND valid_to IS NULL FOR UPDATE;
  IF previous.config_value @> ats_rule THEN
    RETURN;
  END IF;
  IF previous.config_value ?| ARRAY['ats_percentage_limit', 'ats_percentage_source'] THEN
    RAISE EXCEPTION 'Regra de ATS já configurada com conteúdo diferente';
  END IF;
  IF previous.valid_from >= version_date THEN
    RAISE EXCEPTION 'Vigência incompatível com a versão ativa de payroll_rules';
  END IF;
  UPDATE public.power_config SET valid_to=version_date-1 WHERE id=previous.id;
  INSERT INTO public.power_config(power_name, config_key, config_value, valid_from, valid_to)
    VALUES ('PJU', 'payroll_rules', previous.config_value || ats_rule, version_date, NULL);
END
$migration$;
