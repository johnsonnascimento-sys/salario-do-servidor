-- =====================================================
-- Seed: PJU 2025 Data (Global + Power + Orgs)
-- =====================================================
-- Objetivo: popular global_config, power_config e vincular orgs ao PJU.
-- Uso: rodar no SQL Editor do Supabase.
-- =====================================================

-- =====================================================
-- GLOBAL CONFIG
-- =====================================================

-- 1) Deducao por dependente (IRRF)
INSERT INTO global_config (config_key, config_value, valid_from, valid_to)
VALUES (
  'dependent_deduction',
  '189.59',
  '2024-01-01',
  NULL
)
ON CONFLICT (config_key, valid_from) DO UPDATE
SET config_value = EXCLUDED.config_value;

-- 2) Tabelas de PSS
INSERT INTO global_config (config_key, config_value, valid_from, valid_to)
VALUES (
  'pss_tables',
  '{
    "2026": {
      "ceiling": 8475.55,
      "rates": [
        {"min": 0.00, "max": 1621.00, "rate": 0.075},
        {"min": 1621.01, "max": 2902.84, "rate": 0.090},
        {"min": 2902.85, "max": 4354.27, "rate": 0.120},
        {"min": 4354.28, "max": 8475.55, "rate": 0.140},
        {"min": 8475.56, "max": 14514.30, "rate": 0.145},
        {"min": 14514.31, "max": 29028.58, "rate": 0.165},
        {"min": 29028.59, "max": 56605.73, "rate": 0.190},
        {"min": 56605.74, "max": 999999999, "rate": 0.220}
      ]
    },
    "2025": {
      "ceiling": 8157.41,
      "rates": [
        {"min": 0.00, "max": 1518.00, "rate": 0.075},
        {"min": 1518.01, "max": 2793.88, "rate": 0.090},
        {"min": 2793.89, "max": 4190.83, "rate": 0.120},
        {"min": 4190.84, "max": 8157.41, "rate": 0.140},
        {"min": 8157.42, "max": 13969.49, "rate": 0.145},
        {"min": 13969.50, "max": 27938.96, "rate": 0.165},
        {"min": 27938.97, "max": 54480.97, "rate": 0.190},
        {"min": 54480.98, "max": 999999999, "rate": 0.220}
      ]
    },
    "2024": {
      "ceiling": 7786.02,
      "rates": [
        {"min": 0.00, "max": 1412.00, "rate": 0.075},
        {"min": 1412.01, "max": 2666.68, "rate": 0.090},
        {"min": 2666.69, "max": 4000.03, "rate": 0.120},
        {"min": 4000.04, "max": 7786.02, "rate": 0.140},
        {"min": 7786.03, "max": 13333.48, "rate": 0.145},
        {"min": 13333.49, "max": 26666.94, "rate": 0.165},
        {"min": 26666.95, "max": 52000.54, "rate": 0.190},
        {"min": 52000.55, "max": 999999999, "rate": 0.220}
      ]
    }
  }'::jsonb,
  '2024-01-01',
  NULL
)
ON CONFLICT (config_key, valid_from) DO UPDATE
SET config_value = EXCLUDED.config_value;

-- 3) Tabelas de IR (2025)
INSERT INTO global_config (config_key, config_value, valid_from, valid_to)
VALUES (
  'ir_deduction',
  '{
    "2025_maio": {
      "deduction": 908.73,
      "brackets": [
        {"min": 0, "max": 2259.20, "rate": 0, "deduction": 0},
        {"min": 2259.21, "max": 2826.65, "rate": 0.075, "deduction": 169.44},
        {"min": 2826.66, "max": 3751.05, "rate": 0.150, "deduction": 381.44},
        {"min": 3751.06, "max": 4664.68, "rate": 0.225, "deduction": 662.77},
        {"min": 4664.69, "max": null, "rate": 0.275, "deduction": 908.73}
      ]
    },
    "2024_fev": {
      "deduction": 896.00,
      "brackets": [
        {"min": 0, "max": 2112.00, "rate": 0, "deduction": 0},
        {"min": 2112.01, "max": 2826.65, "rate": 0.075, "deduction": 158.40},
        {"min": 2826.66, "max": 3751.05, "rate": 0.150, "deduction": 370.40},
        {"min": 3751.06, "max": 4664.68, "rate": 0.225, "deduction": 651.73},
        {"min": 4664.69, "max": null, "rate": 0.275, "deduction": 896.00}
      ]
    }
  }'::jsonb,
  '2024-01-01',
  NULL
)
ON CONFLICT (config_key, valid_from) DO UPDATE
SET config_value = EXCLUDED.config_value;

-- =====================================================
-- POWER CONFIG (PJU)
-- =====================================================

-- 1) CJ1 Integral Base (VR)
INSERT INTO power_config (power_name, config_key, config_value, valid_from, valid_to)
VALUES (
  'PJU',
  'cj1_integral_base',
  '10990.74',
  '2025-01-01',
  NULL
)
ON CONFLICT (power_name, config_key, valid_from) DO UPDATE
SET config_value = EXCLUDED.config_value;

-- 2) Bases Salariais (Analista, Tecnico, Auxiliar) + Funcoes
INSERT INTO power_config (power_name, config_key, config_value, valid_from, valid_to)
VALUES (
  'PJU',
  'salary_bases',
  '{
    "analista": {
      "C13": 9292.14,
      "C12": 9021.50,
      "C11": 8758.73,
      "B10": 8503.62,
      "B9": 8255.95,
      "B8": 7810.73,
      "B7": 7583.23,
      "B6": 7362.37,
      "A5": 7147.92,
      "A4": 6939.75,
      "A3": 6565.50,
      "A2": 6374.26,
      "A1": 6188.61
    },
    "tecnico": {
      "C13": 5663.47,
      "C12": 5498.51,
      "C11": 5338.36,
      "B10": 5182.88,
      "B9": 5031.90,
      "B8": 4760.56,
      "B7": 4621.90,
      "B6": 4487.29,
      "A5": 4356.59,
      "A4": 4229.69,
      "A3": 4001.60,
      "A2": 3885.06,
      "A1": 3771.88
    },
    "auxiliar": {
      "C13": 3394.11,
      "C12": 3295.25,
      "C11": 3199.27,
      "B10": 3106.09,
      "B9": 3015.62,
      "B8": 2852.84,
      "B7": 2769.75,
      "B6": 2689.08,
      "A5": 2610.76,
      "A4": 2534.72,
      "A3": 2398.07,
      "A2": 2328.22,
      "A1": 2260.41
    },
    "funcoes": {
      "fc1": 1215.34,
      "fc2": 1413.14,
      "fc3": 1644.51,
      "fc4": 2313.27,
      "fc5": 2662.06,
      "fc6": 3663.71,
      "cj1": 7143.98,
      "cj2": 8822.98,
      "cj3": 10029.94,
      "cj4": 11322.60
    }
  }'::jsonb,
  '2025-01-01',
  NULL
)
ON CONFLICT (power_name, config_key, valid_from) DO UPDATE
SET config_value = EXCLUDED.config_value;

-- 3) Percentuais (AQ/GAE/GAS)
INSERT INTO power_config (power_name, config_key, config_value, valid_from, valid_to)
VALUES (
  'PJU',
  'aq_rules',
  '{
    "old_system": {
      "graduacao": 0.05,
      "pos": 0.075,
      "especializacao": 0.075,
      "mestrado": 0.10,
      "doutorado": 0.125,
      "nenhum": 0
    },
    "new_system": {
      "doutorado": 5.0,
      "mestrado": 3.5,
      "especializacao": 1.0,
      "nenhum": 0,
      "treinamento_120h": 0.2,
      "treinamento_240h": 0.4,
      "treinamento_360h": 0.6
    }
  }'::jsonb,
  '2025-01-01',
  NULL
)
ON CONFLICT (power_name, config_key, valid_from) DO UPDATE
SET config_value = EXCLUDED.config_value;

INSERT INTO power_config (power_name, config_key, config_value, valid_from, valid_to)
VALUES (
  'PJU',
  'gratification_percentages',
  '{
    "gaj": 1.40,
    "gae": 0.35,
    "gas": 0.35
  }'::jsonb,
  '2025-01-01',
  NULL
)
ON CONFLICT (power_name, config_key, valid_from) DO UPDATE
SET config_value = EXCLUDED.config_value;

-- 4) Beneficios
INSERT INTO power_config (power_name, config_key, config_value, valid_from, valid_to)
VALUES (
  'PJU',
  'benefits',
  '{
    "auxilio_alimentacao": {
      "2025": 1784.42
    },
    "auxilio_preescolar": {
      "2025": 1235.77
    }
  }'::jsonb,
  '2025-01-01',
  NULL
)
ON CONFLICT (power_name, config_key, valid_from) DO UPDATE
SET config_value = EXCLUDED.config_value;

-- =====================================================
-- ORG CONFIG (Vinculo PJU -> JMU/STM)
-- =====================================================
UPDATE org_config
SET power_name = 'PJU'
WHERE org_slug IN ('stm', 'jmu');

-- =====================================================
-- FIM DO SEED
-- =====================================================
