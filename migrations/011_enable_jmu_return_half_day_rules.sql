-- =====================================================
-- Migration: Enable return-day half rules for JMU dailies
-- =====================================================
-- Regras:
-- 1) No dia do retorno em dia útil (não fim de semana/feriado), pagar meia diária.
-- 2) No dia do retorno em dia útil, aplicar meio desconto de auxílio-alimentação
--    e meio desconto de auxílio-transporte.
-- =====================================================

UPDATE power_config
SET config_value = COALESCE(config_value, '{}'::jsonb) || jsonb_build_object(
  'discount_rules',
  COALESCE(config_value->'discount_rules', '{}'::jsonb) || jsonb_build_object(
    'return_day_half_diem_business_day', true,
    'return_day_half_discount_business_day', true
  )
)
WHERE power_name = 'PJU'
  AND config_key = 'dailies_rules'
  AND valid_to IS NULL;

UPDATE org_config
SET configuration = jsonb_set(
    COALESCE(configuration, '{}'::jsonb),
    '{dailies_rules}',
    COALESCE(configuration->'dailies_rules', '{}'::jsonb) || jsonb_build_object(
      'discount_rules',
      COALESCE(configuration->'dailies_rules'->'discount_rules', '{}'::jsonb) || jsonb_build_object(
        'return_day_half_diem_business_day', true,
        'return_day_half_discount_business_day', true
      )
    ),
    true
)
WHERE org_slug = 'jmu';
