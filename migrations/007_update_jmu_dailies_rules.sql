-- =====================================================
-- Migration: Update JMU dailies rules (data-driven)
-- =====================================================
-- Date: 2026-02-24
-- Description:
--   Atualiza as regras de diarias no org_config (jmu) para:
--   - teto LDO por diaria (ATO NORMATIVO STM 926/2026)
--   - divisor de desconto de auxilios em 22 dias
--   - suporte a exclusao de finais de semana e feriados
--   - percentuais de abatimento e adicional de embarque
-- =====================================================

UPDATE org_config
SET configuration = jsonb_set(
    COALESCE(configuration, '{}'::jsonb),
    '{dailies_rules}',
    COALESCE(configuration->'dailies_rules', '{}'::jsonb) || '{
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
        "holidays": []
      }
    }'::jsonb,
    true
)
WHERE org_slug = 'jmu';
