-- =====================================================
-- Migration 013: Unificação de Diárias PJU (CNJ 73/2009, CJF 340/2015 e STM 799/2024)
-- =====================================================
-- Objetivo:
-- 1. Enriquecer power_config (PJU) com metadados normativos da Resolução CNJ 73/2009,
--    rótulo dinâmico de deslocamento/embarque e catálogo granular de percentuais
--    (Desembargador, Juiz Titular, Juiz Substituto, CJ-4, CJ-1..3, Analista, Técnico).
-- 2. Atualizar org_config (jmu, stm) com Ato Normativo STM 799/2024.
-- 3. Adicionar registros de org_config para CJF (Conselho da Justiça Federal)
--    e TRF1, regidos pela Resolução CJF 340/2015.
-- =====================================================

-- 1) Atualiza power_config (PJU) com modelo unificado e metadados normativos
UPDATE power_config
SET config_value = jsonb_set(
  jsonb_set(
    jsonb_set(
      COALESCE(config_value, '{}'::jsonb),
      '{embarkation_label}',
      '"Adicional de deslocamento"'::jsonb,
      true
    ),
    '{normative_info}',
    '{
      "general_rule_label": "Resolução CNJ Nº 73/2009",
      "branch_rule_label": "Regulamento Setorial PJU",
      "notes": [
        "Diretrizes gerais da Resolução CNJ Nº 73/2009",
        "Referência máxima: diária do Ministro do STF",
        "Adicional de deslocamento para trechos com transporte intermunicipal/aéreo"
      ]
    }'::jsonb,
    true
  ),
  '{derived_from_minister,rates_percentages}',
  COALESCE(config_value->'derived_from_minister'->'rates_percentages', '{}'::jsonb) || '{
    "desembargador": 0.95,
    "juiz": 0.95,
    "juiz_titular": 0.95,
    "juiz_substituto": 0.90,
    "cj4": 0.80,
    "cj3": 0.60,
    "cj2": 0.60,
    "cj1": 0.60,
    "cj": 0.60,
    "analista": 0.55,
    "tecnico": 0.45,
    "auxiliar": 0.35
  }'::jsonb,
  true
)
WHERE power_name = 'PJU'
  AND config_key = 'dailies_rules'
  AND valid_to IS NULL;

-- 2) Atualiza org_config (JMU e STM) com Ato Normativo STM 799/2024
UPDATE org_config
SET configuration = jsonb_set(
  jsonb_set(
    COALESCE(configuration, '{}'::jsonb),
    '{dailies_rules,embarkation_label}',
    '"Adicional de embarque e desembarque"'::jsonb,
    true
  ),
  '{dailies_rules,normative_info}',
  '{
    "general_rule_label": "Resolução CNJ Nº 73/2009",
    "branch_rule_label": "Ato Normativo STM Nº 799/2024",
    "notes": [
      "Ato Normativo STM Nº 799/2024 c/c Resolução CNJ Nº 73/2009",
      "Valores fixados como percentuais da diária de Ministro do STF",
      "Retorno em dia útil: 50% da diária e 50% de desconto de auxílios"
    ]
  }'::jsonb,
  true
)
WHERE org_slug IN ('jmu', 'stm');

-- 3) Insere org_config para o CJF (Conselho da Justiça Federal)
INSERT INTO org_config (org_slug, org_name, power_name, configuration)
VALUES (
  'cjf',
  'Conselho da Justiça Federal',
  'PJU',
  jsonb_build_object(
    'dailies_rules', jsonb_build_object(
      'embarkation_label', 'Adicional de deslocamento',
      'normative_info', jsonb_build_object(
        'general_rule_label', 'Resolução CNJ Nº 73/2009',
        'branch_rule_label', 'Resolução CJF Nº 340/2015',
        'notes', jsonb_build_array(
          'Regulamentado pela Resolução CJF Nº 340/2015 e Resolução CNJ Nº 73/2009',
          'Valores unitários vinculados à diária de Ministro do STF',
          'Adicional de deslocamento destinado a cobrir despesas de traslado aos locais de embarque/desembarque'
        )
      ),
      'derived_from_minister', jsonb_build_object(
        'enabled', true,
        'minister_per_diem', 1466.95,
        'rates_percentages', jsonb_build_object(
          'desembargador', 0.95,
          'juiz', 0.95,
          'juiz_titular', 0.95,
          'juiz_substituto', 0.90,
          'cj4', 0.80,
          'cj3', 0.60,
          'cj2', 0.60,
          'cj1', 0.60,
          'cj', 0.60,
          'analista', 0.55,
          'tecnico', 0.45,
          'auxiliar', 0.35
        ),
        'embarkation_percentage_full', 0.40,
        'embarkation_percentage_half', 0.20
      ),
      'external_gloss', jsonb_build_object(
        'hospedagem', 0.50,
        'alimentacao', 0.25,
        'transporte', 0.25
      ),
      'ldo_cap', jsonb_build_object(
        'enabled', true,
        'per_diem_limit', 1153.37
      ),
      'discount_rules', jsonb_build_object(
        'food_divisor', 22,
        'transport_divisor', 22,
        'exclude_weekends_and_holidays', true,
        'return_day_half_diem_business_day', true,
        'return_day_half_discount_business_day', true
      )
    )
  )
)
ON CONFLICT (org_slug) DO UPDATE
SET
  org_name = EXCLUDED.org_name,
  power_name = EXCLUDED.power_name,
  configuration = EXCLUDED.configuration;

-- 4) Insere org_config para o TRF1 (Tribunal Regional Federal da 1ª Região)
INSERT INTO org_config (org_slug, org_name, power_name, configuration)
VALUES (
  'trf1',
  'Tribunal Regional Federal da 1ª Região',
  'PJU',
  jsonb_build_object(
    'dailies_rules', jsonb_build_object(
      'embarkation_label', 'Adicional de deslocamento',
      'normative_info', jsonb_build_object(
        'general_rule_label', 'Resolução CNJ Nº 73/2009',
        'branch_rule_label', 'Resolução CJF Nº 340/2015',
        'notes', jsonb_build_array(
          'Regulamentado pela Resolução CJF Nº 340/2015 no âmbito da Justiça Federal de 1º e 2º graus',
          'Referência: Diária de Ministro do STF'
        )
      )
    )
  )
)
ON CONFLICT (org_slug) DO UPDATE
SET
  org_name = EXCLUDED.org_name,
  power_name = EXCLUDED.power_name,
  configuration = EXCLUDED.configuration;

-- 5) Insere as agências da Justiça Federal na tabela agencies
INSERT INTO agencies (slug, name, type, is_active)
VALUES
  ('cjf', 'Conselho da Justiça Federal', 'JUDICIARY', true),
  ('trf1', 'Tribunal Regional Federal da 1ª Região', 'JUDICIARY', true),
  ('trf2', 'Tribunal Regional Federal da 2ª Região', 'JUDICIARY', true),
  ('trf3', 'Tribunal Regional Federal da 3ª Região', 'JUDICIARY', true),
  ('trf4', 'Tribunal Regional Federal da 4ª Região', 'JUDICIARY', true),
  ('trf5', 'Tribunal Regional Federal da 5ª Região', 'JUDICIARY', true),
  ('trf6', 'Tribunal Regional Federal da 6ª Região', 'JUDICIARY', true)
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  is_active = EXCLUDED.is_active;

-- 6) Insere os org_configs para os TRFs 2 a 6 herdando PJU com regras da Res. CJF 340/2015
INSERT INTO org_config (org_slug, org_name, power_name, configuration)
VALUES
  ('trf2', 'Tribunal Regional Federal da 2ª Região', 'PJU', '{"dailies_rules": {"embarkation_label": "Adicional de deslocamento", "normative_info": {"general_rule_label": "Resolução CNJ Nº 73/2009", "branch_rule_label": "Resolução CJF Nº 340/2015"}}}'::jsonb),
  ('trf3', 'Tribunal Regional Federal da 3ª Região', 'PJU', '{"dailies_rules": {"embarkation_label": "Adicional de deslocamento", "normative_info": {"general_rule_label": "Resolução CNJ Nº 73/2009", "branch_rule_label": "Resolução CJF Nº 340/2015"}}}'::jsonb),
  ('trf4', 'Tribunal Regional Federal da 4ª Região', 'PJU', '{"dailies_rules": {"embarkation_label": "Adicional de deslocamento", "normative_info": {"general_rule_label": "Resolução CNJ Nº 73/2009", "branch_rule_label": "Resolução CJF Nº 340/2015"}}}'::jsonb),
  ('trf5', 'Tribunal Regional Federal da 5ª Região', 'PJU', '{"dailies_rules": {"embarkation_label": "Adicional de deslocamento", "normative_info": {"general_rule_label": "Resolução CNJ Nº 73/2009", "branch_rule_label": "Resolução CJF Nº 340/2015"}}}'::jsonb),
  ('trf6', 'Tribunal Regional Federal da 6ª Região', 'PJU', '{"dailies_rules": {"embarkation_label": "Adicional de deslocamento", "normative_info": {"general_rule_label": "Resolução CNJ Nº 73/2009", "branch_rule_label": "Resolução CJF Nº 340/2015"}}}'::jsonb)
ON CONFLICT (org_slug) DO UPDATE
SET
  org_name = EXCLUDED.org_name,
  power_name = EXCLUDED.power_name,
  configuration = EXCLUDED.configuration;
