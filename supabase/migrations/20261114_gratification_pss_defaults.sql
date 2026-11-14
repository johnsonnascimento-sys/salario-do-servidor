-- Padrões de seleção RPPS, independentes da incidência Funpresp.
-- GAE: STJ, AgInt no REsp 1.849.491/SP (DJe 24/09/2020).
-- GAS: TNU, Tema 257; ressalvadas opção e situação previdenciária aplicáveis.
DO $migration$
DECLARE
  previous public.power_config%rowtype;
  defaults jsonb := '{"gae":true,"gas":false}'::jsonb;
  effective_date date := '2026-11-14';
BEGIN
  IF (SELECT count(*) FROM public.power_config WHERE power_name='PJU'
      AND config_key='payroll_rules' AND valid_to IS NULL) <> 1 THEN
    RAISE EXCEPTION 'Esperada uma única regra ativa payroll_rules do PJU';
  END IF;
  SELECT * INTO STRICT previous FROM public.power_config WHERE power_name='PJU'
    AND config_key='payroll_rules' AND valid_to IS NULL FOR UPDATE;
  IF previous.config_value->'specific_gratification_pss_defaults' = defaults THEN
    RETURN;
  END IF;
  IF previous.config_value ? 'specific_gratification_pss_defaults' THEN
    RAISE EXCEPTION 'Padrão já configurado com conteúdo diferente; revisar antes de alterar';
  END IF;
  IF previous.valid_from >= effective_date THEN
    RAISE EXCEPTION 'Vigência incompatível: preservar a versão existente e revisar a nova data';
  END IF;
  UPDATE public.power_config SET valid_to=effective_date-1 WHERE id=previous.id;
  INSERT INTO public.power_config(power_name,config_key,config_value,valid_from,valid_to)
    VALUES ('PJU','payroll_rules', previous.config_value || jsonb_build_object(
      'specific_gratification_pss_defaults', defaults,
      'specific_gratification_pss_sources', jsonb_build_object(
        'gae','https://scon.stj.jus.br/SCON/GetInteiroTeorDoAcordao?dt_publicacao=24%2F09%2F2020&num_registro=201903436453',
        'gas','https://www.cjf.jus.br/cjf/noticias/2020/11-novembro/gratificacao-de-atividade-de-seguranca-nao-incorpora-aos-proventos-de-aposentadoria-do-servidor-publico'
      )), effective_date, NULL);
END
$migration$;
