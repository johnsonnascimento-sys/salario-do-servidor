-- =====================================================
-- Migration: Update IRRF history with Jan-Apr/2025 range
-- =====================================================
-- Date: 2026-02-24
-- Description:
--   Ajusta o historico do IRRF para explicitar a vigencia
--   de janeiro a abril de 2025, conforme tabela oficial da RFB.
--   Referencia:
--   https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2025
-- =====================================================

INSERT INTO global_config (config_key, config_value, valid_from, valid_to)
VALUES (
  'ir_deduction',
  '{
    "2024_fev": {
      "deduction": 896.00,
      "brackets": [
        {"min": 0, "max": 2259.20, "rate": 0, "deduction": 0},
        {"min": 2259.21, "max": 2826.65, "rate": 0.075, "deduction": 169.44},
        {"min": 2826.66, "max": 3751.05, "rate": 0.150, "deduction": 381.44},
        {"min": 3751.06, "max": 4664.68, "rate": 0.225, "deduction": 662.77},
        {"min": 4664.69, "max": null, "rate": 0.275, "deduction": 896.00}
      ]
    },
    "2025_jan": {
      "deduction": 896.00,
      "brackets": [
        {"min": 0, "max": 2259.20, "rate": 0, "deduction": 0},
        {"min": 2259.21, "max": 2826.65, "rate": 0.075, "deduction": 169.44},
        {"min": 2826.66, "max": 3751.05, "rate": 0.150, "deduction": 381.44},
        {"min": 3751.06, "max": 4664.68, "rate": 0.225, "deduction": 662.77},
        {"min": 4664.69, "max": null, "rate": 0.275, "deduction": 896.00}
      ]
    },
    "2025_maio": {
      "deduction": 908.73,
      "brackets": [
        {"min": 0, "max": 2428.80, "rate": 0, "deduction": 0},
        {"min": 2428.81, "max": 2826.65, "rate": 0.075, "deduction": 182.16},
        {"min": 2826.66, "max": 3751.05, "rate": 0.150, "deduction": 394.16},
        {"min": 3751.06, "max": 4664.68, "rate": 0.225, "deduction": 675.49},
        {"min": 4664.69, "max": null, "rate": 0.275, "deduction": 908.73}
      ]
    }
  }'::jsonb,
  '2024-01-01',
  NULL
)
ON CONFLICT (config_key, valid_from) DO UPDATE
SET config_value = EXCLUDED.config_value;
