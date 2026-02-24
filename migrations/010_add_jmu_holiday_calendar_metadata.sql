-- =====================================================
-- Migration: Add holiday calendar metadata for JMU dailies
-- =====================================================
-- Goal:
--   Keep holiday calendar communication data-driven in the UI.
--   The card will read label/reference/version from config instead of hardcoding.
-- =====================================================

-- 1) Active power_config (PJU) metadata
UPDATE power_config
SET config_value = COALESCE(config_value, '{}'::jsonb) || jsonb_build_object(
  'discount_rules',
  COALESCE(config_value->'discount_rules', '{}'::jsonb) || jsonb_build_object(
    'holiday_calendar_label', 'Calendário oficial do STM de 2026',
    'holiday_calendar_reference', 'calendario_2026_STM.pdf',
    'holiday_calendar_version', 'versão de 06/11/2025'
  )
)
WHERE power_name = 'PJU'
  AND config_key = 'dailies_rules'
  AND valid_to IS NULL;

-- 2) Org override (jmu) metadata
UPDATE org_config
SET configuration = jsonb_set(
    COALESCE(configuration, '{}'::jsonb),
    '{dailies_rules}',
    COALESCE(configuration->'dailies_rules', '{}'::jsonb) || jsonb_build_object(
      'discount_rules',
      COALESCE(configuration->'dailies_rules'->'discount_rules', '{}'::jsonb) || jsonb_build_object(
        'holiday_calendar_label', 'Calendário oficial do STM de 2026',
        'holiday_calendar_reference', 'calendario_2026_STM.pdf',
        'holiday_calendar_version', 'versão de 06/11/2025'
      )
    ),
    true
)
WHERE org_slug = 'jmu';
