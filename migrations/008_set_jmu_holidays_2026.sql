-- =====================================================
-- Migration: Set JMU holidays (2026) for dailies discounts
-- =====================================================
-- Source: calendario_2026_STM.pdf (versao de 06/11/2025)
-- Rule: dias de feriado nao entram no desconto de auxilios
-- (auxilio-alimentacao e auxilio-transporte) no calculo de diarias.
-- =====================================================

UPDATE org_config
SET configuration = jsonb_set(
    jsonb_set(
        COALESCE(configuration, '{}'::jsonb),
        '{dailies_rules,discount_rules,exclude_weekends_and_holidays}',
        'true'::jsonb,
        true
    ),
    '{dailies_rules,discount_rules,holidays}',
    '[
      "2026-01-01",
      "2026-02-16",
      "2026-02-17",
      "2026-04-01",
      "2026-04-02",
      "2026-04-03",
      "2026-04-21",
      "2026-05-01",
      "2026-08-11",
      "2026-09-07",
      "2026-10-12",
      "2026-11-01",
      "2026-11-02",
      "2026-11-15",
      "2026-11-20",
      "2026-12-08",
      "2026-12-25"
    ]'::jsonb,
    true
)
WHERE org_slug = 'jmu';

