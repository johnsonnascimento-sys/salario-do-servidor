-- =====================================================
-- Migration 018: Adição de Regras de Equipe de Trabalho e Acompanhamento Integral de Diárias
-- =====================================================
-- Normas de referência:
-- - Ato Normativo STM Nº 799/2024:
--     * Art. 8º: Diária por Equipe de Trabalho (maior valor entre os servidores membros da equipe)
--     * Art. 9º, § 1º: Acompanhamento em tempo integral e hospedagem no mesmo local (90% da diária da autoridade assistida)
-- - Resolução CNJ Nº 73/2009 (com redação da Resolução CNJ Nº 564/2024):
--     * Art. 6º, § 2º: Diária de equipe de trabalho equivalente ao maior valor pago entre servidores membros
--     * Art. 6º, § 5º: Diária de 90% da autoridade assistida para acompanhamento integral e mesma hospedagem
-- =====================================================

-- 1) Atualiza power_config (PJU) com o percentual de acompanhamento em tempo integral (90%) e notas normativas
UPDATE power_config
SET config_value = jsonb_set(
  jsonb_set(
    COALESCE(config_value, '{}'::jsonb),
    '{derived_from_minister,full_time_accompaniment_percentage}',
    '0.90'::jsonb,
    true
  ),
  '{normative_info,notes}',
  COALESCE(config_value->'normative_info'->'notes', '[]'::jsonb) || jsonb_build_array(
    'Equipe de trabalho: diária equivalente ao maior valor entre os servidores membros da equipe (art. 6º, § 2º da Res. CNJ 73/2009)',
    'Acompanhamento de autoridade em tempo integral com mesma hospedagem: diária a 90% da autoridade assistida (art. 6º, § 5º da Res. CNJ 73/2009)'
  ),
  true
)
WHERE power_name = 'PJU'
  AND config_key = 'dailies_rules'
  AND valid_to IS NULL;

-- 2) Atualiza org_config (JMU e STM) com Ato Normativo STM 799/2024 (Art. 8º e Art. 9º, § 1º)
UPDATE org_config
SET configuration = jsonb_set(
  jsonb_set(
    COALESCE(configuration, '{}'::jsonb),
    '{dailies_rules,derived_from_minister,full_time_accompaniment_percentage}',
    '0.90'::jsonb,
    true
  ),
  '{dailies_rules,normative_info,notes}',
  COALESCE(configuration->'dailies_rules'->'normative_info'->'notes', '[]'::jsonb) || jsonb_build_array(
    'Equipe de trabalho: diária correspondente ao maior valor entre os servidores membros (art. 8º do Ato Normativo STM Nº 799/2024)',
    'Acompanhamento em tempo integral e mesma hospedagem: 90% da diária da autoridade assistida (art. 9º, § 1º do Ato Normativo STM Nº 799/2024)'
  ),
  true
)
WHERE org_slug IN ('jmu', 'stm');

-- 3) Atualiza org_config (CJF e TRF1) com o percentual de acompanhamento integral (90%) da Res. CNJ 73/2009 c/c Res. CJF 340/2015
UPDATE org_config
SET configuration = jsonb_set(
  COALESCE(configuration, '{}'::jsonb),
  '{dailies_rules,derived_from_minister,full_time_accompaniment_percentage}',
  '0.90'::jsonb,
  true
)
WHERE org_slug IN ('cjf', 'trf1');

