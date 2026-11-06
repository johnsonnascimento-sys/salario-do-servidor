-- CJF only: move the published 5114567 fallback to minimal database overrides.
-- No changes to legal rates or engine. Preserve global/PJU history and all other organs.
-- Prepared against project govzmfpwrbsmqgzjtfmt; verified with scripts/repair-cjf-config.mjs.
-- Run in an administrative transaction; the verifier rehearses with ROLLBACK.
DO $repair$
DECLARE
  expected_power jsonb := '{"dailies_rules":{"rates":{"cj":880.17,"tecnico":660.13,"analista":806.82},"ldo_cap":{"enabled":true,"per_diem_limit":1153.37},"discount_rules":{"holidays":["2026-01-01","2026-02-16","2026-02-17","2026-04-01","2026-04-02","2026-04-03","2026-04-21","2026-05-01","2026-08-11","2026-09-07","2026-10-12","2026-11-01","2026-11-02","2026-11-15","2026-11-20","2026-12-08","2026-12-25"],"food_divisor":22,"transport_divisor":22,"holiday_calendar_label":"Calendário oficial do STM de 2026","holiday_calendar_version":"versão de 06/11/2025","holiday_calendar_reference":"calendario_2026_STM.pdf","exclude_weekends_and_holidays":true,"return_day_half_diem_business_day":true,"return_day_half_discount_business_day":true},"external_gloss":{"hospedagem":0.55,"transporte":0.2,"alimentacao":0.25},"derived_from_minister":{"enabled":true,"minister_per_diem":1466.95,"rates_percentages":{"cj":0.6,"juiz":0.95,"tecnico":0.45,"analista":0.55},"embarkation_percentage_full":0.4,"embarkation_percentage_half":0.2},"embarkation_additional":{"metade":293.39,"completo":586.78}},"payroll_rules":{"gaj_rate":1.4,"irrf_top_rate":0.275,"vr_rate_on_cj1":0.065,"month_day_divisor":30,"transport_workdays":22,"overtime_month_hours":175,"transport_discount_rate":0.06,"specific_gratification_rate":0.35}}'::jsonb;
  proposed_config jsonb := '{"dailies_rules":{"discount_rules":{"holidays":[]},"external_gloss":{"hospedagem":0.5,"transporte":0.25},"derived_from_minister":{"rates_percentages":{"cj":0.55,"juiz":0.9025,"desembargador":0.95,"juiz_titular":0.9025,"juiz_substituto":0.9025,"cj4":0.55,"cj3":0.55,"cj2":0.55,"cj1":0.55,"auxiliar":0.45},"embarkation_percentage_full":0.44,"embarkation_percentage_half":0.22,"assistance_percentage":0.8,"full_time_accompaniment_percentage":0.9},"embarkation_additional":{"metade":322.73,"completo":645.46},"embarkation_label":"Adicional de transporte","embarkation_description":"Resolução CJF nº 340/2015 (art. 17): adicional de transporte para cobrir despesas de deslocamento de 80% sobre a diária básica de Analista Judiciário (equivalente a 44% da diária de Ministro do STF) para percurso completo e metade (22%) para apenas ida ou volta.","normative_info":{"general_rule_label":"Resolução CNJ Nº 73/2009","branch_rule_label":"Resolução CJF Nº 340/2015","notes":["Regulamentado pela Resolução CJF Nº 340/2015 e Resolução CNJ Nº 73/2009","Valores unitários vinculados à diária de Ministro do STF","Adicional de transporte de 80% sobre a diária de Analista Judiciário para cobrir despesas de deslocamento (art. 17 da Res. CJF 340/2015)","Equipe de trabalho: diária correspondente ao maior valor da diária entre os membros da equipe (art. 10, § 1º da Res. CJF 340/2015 c/c art. 6º, § 2º da Res. CNJ 73/2009)","Acompanhamento de magistrado em tempo integral e mesma hospedagem: diária a 90% da autoridade assistida (art. 6º, § 5º da Res. CNJ 73/2009)"]}},"payroll_rules":{"vr_rate_on_cj1":0.05,"overtime_month_hours":200}}'::jsonb;
  actual_power jsonb;
  current_config jsonb;
  current_power text;
BEGIN
  LOCK TABLE global_config, power_config, org_config IN SHARE ROW EXCLUSIVE MODE;
  SELECT configuration, power_name INTO current_config, current_power FROM org_config WHERE org_slug = 'cjf';
  IF FOUND THEN
    IF current_config IS DISTINCT FROM proposed_config OR current_power IS DISTINCT FROM 'PJU' THEN
      RAISE EXCEPTION 'Existing CJF configuration differs: refusing to overwrite';
    END IF;
    RETURN;
  END IF;
  IF (SELECT count(*) FROM power_config WHERE power_name = 'PJU' AND valid_to IS NULL AND config_key IN ('dailies_rules','payroll_rules')) <> 2 THEN
    RAISE EXCEPTION 'Missing or duplicate active PJU rules';
  END IF;
  SELECT jsonb_object_agg(config_key,config_value) INTO actual_power FROM power_config
    WHERE power_name = 'PJU' AND valid_to IS NULL AND config_key IN ('dailies_rules','payroll_rules');
  IF actual_power IS DISTINCT FROM expected_power THEN
    RAISE EXCEPTION 'PJU configuration changed: recalculate and review the minimal override';
  END IF;
  INSERT INTO org_config (org_slug, org_name, power_name, configuration)
    VALUES ('cjf', 'Justiça Federal (CJF e TRFs)', 'PJU', proposed_config);
END
$repair$;
