-- =====================================================
-- Migration 016: Cadastro canônico de payroll_rules do PJU, Justiça Federal e JMU
-- =====================================================
-- Fundamentação Legal:
-- 1. Resolução CJF Nº 4/2008 consolidada (Resolução CJF Nº 186/2012):
--    - Art. 46, caput e § 1º: Divisor da hora extraordinária fixado em 200 (40h semanais / 6 * 30 = 200).
--    - Art. 46, I e II: 50% para dias úteis/sábados e 100% para domingos/feriados.
--    - Art. 45, § 3º (Res. CJF 973/2025): Teto mensal de 44 horas de serviço extraordinário.
-- 2. Resolução STM Nº 374/2025 consolidada com Resolução STM Nº 399/2026 (Justiça Militar da União):
--    - Art. 7º, § 1º, inciso I: Divisor 175 para jornada padrão de 35 horas semanais (35h / 6 * 30 = 175).
--    - Art. 7º, I e II: 50% para dias úteis/sábados e 100% para domingos/feriados.
--    - Art. 6º, caput: Limite mensal de 30 horas de serviço extraordinário (50h no recesso forense).
-- 3. Lei Federal Nº 11.416/2006 (Carreiras do PJU):
--    - GAJ de 140% (art. 13);
--    - GAE e GAS de 35% (arts. 16 e 17);
--    - Divisor mensal geral de 30 dias.
-- =====================================================

-- 1) Configuração canônica padrão do Poder (PJU / Justiça Federal)
INSERT INTO power_config (power_name, config_key, config_value, valid_from, valid_to)
VALUES (
  'PJU',
  'payroll_rules',
  '{
    "gaj_rate": 1.40,
    "specific_gratification_rate": 0.35,
    "vr_rate_on_cj1": 0.05,
    "month_day_divisor": 30,
    "overtime_month_hours": 200,
    "transport_workdays": 22,
    "transport_discount_rate": 0.06,
    "irrf_top_rate": 0.275
  }'::jsonb,
  '2024-01-01',
  NULL
)
ON CONFLICT (power_name, config_key, valid_from) DO UPDATE
SET config_value = EXCLUDED.config_value;

-- 2) Configuração específica do Órgão JMU e STM (Divisor 175 para jornada de 35h semanais)
UPDATE org_config
SET configuration = jsonb_set(
  COALESCE(configuration, '{}'::jsonb),
  '{payroll_rules}',
  COALESCE(configuration->'payroll_rules', '{}'::jsonb) || '{
    "overtime_month_hours": 175
  }'::jsonb,
  true
)
WHERE org_slug IN ('jmu', 'stm');
