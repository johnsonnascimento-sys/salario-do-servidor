-- =====================================================
-- Migration: Update PJU benefits history by reference date
-- =====================================================
-- Date: 2026-02-24
-- Description:
--   Ajusta os valores historicos de auxilio-alimentacao e
--   assistencia pre-escolar para selecao por mes/ano de referencia.
-- =====================================================

INSERT INTO power_config (power_name, config_key, config_value, valid_from, valid_to)
VALUES (
  'PJU',
  'benefits',
  '{
    "auxilio_alimentacao": {
      "2024_jan26": 1393.10,
      "2025_jan29": 1460.40,
      "2025_mar17": 1784.42,
      "2026_fev03": 1860.51
    },
    "auxilio_preescolar": {
      "2024_jan26": 1178.82,
      "2025_jan29": 1235.77,
      "2026_fev03": 1288.47
    }
  }'::jsonb,
  '2024-01-01',
  NULL
)
ON CONFLICT (power_name, config_key, valid_from) DO UPDATE
SET config_value = EXCLUDED.config_value;

