-- =====================================================
-- Migration: Fix holiday source for dailies discounts (JMU/PJU)
-- =====================================================
-- Root cause:
--   discount_rules.holidays was null in production for both:
--   - org_config (jmu)
--   - power_config (PJU, dailies_rules)
-- Impact:
--   date-based dailies mode did not exclude 07/09/2026 as holiday.
-- =====================================================

-- 1) Ensure active power_config has full dailies rules including discount_rules
UPDATE power_config
SET config_value = COALESCE(config_value, '{}'::jsonb) || '{
  "rates": {
    "tecnico": 660.13,
    "analista": 806.82,
    "cj": 880.17
  },
  "embarkation_additional": {
    "completo": 586.78,
    "metade": 293.39
  },
  "derived_from_minister": {
    "enabled": true,
    "minister_per_diem": 1466.95,
    "rates_percentages": {
      "juiz": 0.95,
      "cj": 0.60,
      "analista": 0.55,
      "tecnico": 0.45
    },
    "embarkation_percentage_full": 0.40,
    "embarkation_percentage_half": 0.20
  },
  "external_gloss": {
    "hospedagem": 0.55,
    "alimentacao": 0.25,
    "transporte": 0.20
  },
  "ldo_cap": {
    "enabled": true,
    "per_diem_limit": 1153.37
  },
  "discount_rules": {
    "food_divisor": 22,
    "transport_divisor": 22,
    "exclude_weekends_and_holidays": true,
    "holidays": [
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
    ]
  }
}'::jsonb
WHERE power_name = 'PJU'
  AND config_key = 'dailies_rules'
  AND valid_to IS NULL;

-- 2) Ensure org_config(jmu) override also has discount_rules.holidays
UPDATE org_config
SET configuration = jsonb_set(
    COALESCE(configuration, '{}'::jsonb),
    '{dailies_rules}',
    COALESCE(configuration->'dailies_rules', '{}'::jsonb) || '{
      "discount_rules": {
        "food_divisor": 22,
        "transport_divisor": 22,
        "exclude_weekends_and_holidays": true,
        "holidays": [
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
        ]
      }
    }'::jsonb,
    true
)
WHERE org_slug = 'jmu';

