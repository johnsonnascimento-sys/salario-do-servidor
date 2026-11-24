-- Shared catalogues with explicit opt-in for the reviewed JMU and CJF configurations.
-- January-June/2026: official CJF payroll table, effective 01/01/2026.
-- July/2026 onward: Law 15.293/2025, Annexes II and III.
-- CJ remuneration option: Law 11.416/2006, art. 18, paragraph 2.
-- RGPS: Interministerial Ordinance MPS/MF 13/2026, effective January/2026.
DO $migration$
DECLARE
  commission_candidate jsonb := $commission${
    "enabled": false,
    "versions": [
      {
        "valid_from": "2026-01-01",
        "valid_to": "2026-06-30",
        "cj_integral": {"cj1": 10990.74, "cj2": 13573.81, "cj3": 15430.68, "cj4": 17419.38},
        "fc": {"fc1": 1215.34, "fc2": 1413.14, "fc3": 1644.51, "fc4": 2313.27, "fc5": 2662.06, "fc6": 3663.71},
        "cj_option_rate": 0.65,
        "source": "https://www.cjf.jus.br/cjf/unidades/gestao-de-pessoas/tabelas-de-remuneracao/servidores/2026-7/tabela-de-remuneracao-de-servidores/view/%2B%2Bwidget%2B%2Bform.widgets.arquivo/%40%40download/TABELA_REMUNERAT%C3%93RIA_SERVIDORES_%2BJANEIRO%2B2026.pdf"
      },
      {
        "valid_from": "2026-07-01",
        "valid_to": null,
        "cj_integral": {"cj1": 11870.00, "cj2": 14659.71, "cj3": 16665.13, "cj4": 18812.93},
        "fc": {"fc1": 1312.57, "fc2": 1526.19, "fc3": 1776.07, "fc4": 2498.33, "fc5": 2875.02, "fc6": 3956.81},
        "cj_option_rate": 0.65,
        "source": "https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15293.htm"
      }
    ]
  }$commission$::jsonb;
  rgps_candidate jsonb := $rgps${
    "versions": [
      {
        "valid_from": "2026-01-01",
        "valid_to": "2026-12-31",
        "teto": 8475.55,
        "faixas": [
          {"ate": 1621.00, "aliq": 0.075},
          {"ate": 2902.84, "aliq": 0.09},
          {"ate": 4354.27, "aliq": 0.12},
          {"ate": 8475.55, "aliq": 0.14}
        ],
        "source": "https://www.gov.br/inss/pt-br/direitos-e-deveres/inscricao-e-contribuicao/tabela-de-contribuicao-mensal"
      }
    ]
  }$rgps$::jsonb;
  organ_candidates jsonb := $organs${
    "jmu": {
      "enabled": true,
      "gaacta_source": {
        "label": "Resolução STM nº 397/2026, arts. 2º e 3º; SEI 5007438, CRC 1F6E37C4",
        "url": "https://sei.stm.jus.br/controlador_externo.php?acao=documento_conferir&id_orgao_acesso_externo=0"
      },
      "compensatory_leave": {
        "valid_from": "2025-07-01",
        "valid_to": "2026-06-01",
        "source": "Resolução STM nº 376/2025, art. 6º (SEI 4472695, CRC AFC45321); ATN STM nº 899/2025, arts. 4º e 8º (SEI 4587045, CRC 4CD235A3); Resolução STM nº 397/2026, arts. 7º e 8º. Conferência em https://sei.stm.jus.br/controlador_externo.php?acao=documento_conferir&id_orgao_acesso_externo=0"
      }
    },
    "cjf": {
      "enabled": true,
      "dailies_fc": {
        "valid_from": "2026-06-10",
        "amount": 695.49,
        "source": "Portaria CJF nº 315/2026, art. 1º. https://pesquisa.in.gov.br/imprensa/servlet/INPDFViewer?jornal=515&pagina=343&data=10/06/2026&captchafield=firstAccess"
      },
      "gaacta_source": {
        "label": "Resolução CJF nº 986/2026, arts. 2º e 3º; limitada às estruturas do Conselho da Justiça Federal",
        "url": "https://www.cjf.jus.br/publico/biblioteca/Res_986-2026.pdf"
      },
      "compensatory_leave": {
        "valid_from": "2026-01-01",
        "valid_to": "2026-06-01",
        "documented_gross": true,
        "max_days": 4,
        "eligible_functions": ["cj2", "cj3", "cj4"],
        "source": "Resoluções CJF nº 965/2025 e nº 971/2025, arts. 1º a 3º. https://www.cjf.jus.br/publico/biblioteca/Res_965-2025.pdf e https://www.cjf.jus.br/publico/biblioteca/Res_971-2025_publ_DOU.pdf"
      }
    }
  }$organs$::jsonb;
  active_count integer;
  existing jsonb;
  organ record;
  rule record;
  organ_rules jsonb;
  organ_candidate jsonb;
  registration_date date := '2026-11-24';
BEGIN
  LOCK TABLE public.global_config, public.power_config, public.org_config IN SHARE ROW EXCLUSIVE MODE;

  SELECT count(*) INTO active_count FROM public.power_config
    WHERE power_name='PJU' AND config_key='commission_rules' AND valid_to IS NULL;
  IF active_count > 1 THEN
    RAISE EXCEPTION 'Mais de uma configuração ativa de CJ/FC para o PJU';
  END IF;
  IF active_count = 1 THEN
    SELECT config_value INTO STRICT existing FROM public.power_config
      WHERE power_name='PJU' AND config_key='commission_rules' AND valid_to IS NULL;
    IF existing IS DISTINCT FROM commission_candidate THEN
      RAISE EXCEPTION 'Configuração CJ/FC existente diverge do cadastro preparado';
    END IF;
  ELSE
    IF EXISTS (SELECT 1 FROM public.power_config WHERE power_name='PJU' AND config_key='commission_rules') THEN
      RAISE EXCEPTION 'Há histórico de CJ/FC sem versão ativa; revisar sucessão de vigências';
    END IF;
    INSERT INTO public.power_config(power_name,config_key,config_value,valid_from,valid_to)
      VALUES ('PJU','commission_rules',commission_candidate,registration_date,NULL);
  END IF;

  SELECT count(*) INTO active_count FROM public.global_config
    WHERE config_key='rgps_tables' AND valid_to IS NULL;
  IF active_count > 1 THEN
    RAISE EXCEPTION 'Mais de uma configuração global ativa de RGPS';
  END IF;
  IF active_count = 1 THEN
    SELECT config_value INTO STRICT existing FROM public.global_config
      WHERE config_key='rgps_tables' AND valid_to IS NULL;
    IF existing IS DISTINCT FROM rgps_candidate THEN
      RAISE EXCEPTION 'Configuração RGPS existente diverge do cadastro preparado';
    END IF;
  ELSE
    IF EXISTS (SELECT 1 FROM public.global_config WHERE config_key='rgps_tables') THEN
      RAISE EXCEPTION 'Há histórico de RGPS sem versão ativa; revisar sucessão de vigências';
    END IF;
    INSERT INTO public.global_config(config_key,config_value,valid_from,valid_to)
      VALUES ('rgps_tables',rgps_candidate,registration_date,NULL);
  END IF;

  -- Enable only the reviewed local candidates. The power-level activation remains disabled.
  -- JMU has no generic tariff for an external FC in ATN 799/2024: require documented input.
  FOR organ IN SELECT org_slug, configuration FROM public.org_config
      WHERE org_slug IN ('jmu','cjf') AND power_name='PJU' FOR UPDATE LOOP
    organ_rules := COALESCE(organ.configuration->'commission_rules', '{}'::jsonb);
    organ_candidate := organ_candidates->organ.org_slug;
    IF jsonb_typeof(organ_rules) IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION 'Configuração local de CJ/FC inválida para %', organ.org_slug;
    END IF;
    FOR rule IN SELECT key, value FROM jsonb_each(organ_candidate) LOOP
      IF organ_rules ? rule.key AND organ_rules->rule.key IS DISTINCT FROM rule.value THEN
        RAISE EXCEPTION 'Regra local % de % diverge do cadastro preparado', rule.key, organ.org_slug;
      END IF;
    END LOOP;
    IF organ_rules @> organ_candidate THEN CONTINUE; END IF;
    UPDATE public.org_config SET configuration=jsonb_set(
      COALESCE(configuration,'{}'::jsonb), '{commission_rules}', organ_rules || organ_candidate, true)
      WHERE org_slug=organ.org_slug;
  END LOOP;
END
$migration$;
