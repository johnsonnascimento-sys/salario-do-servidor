-- =====================================================
-- Migration 016: Cadastro canônico de payroll_rules do PJU e Justiça Federal
-- =====================================================
-- Fundamentação Legal:
-- 1. Resolução CJF Nº 4/2008 consolidada (Resolução CJF Nº 186/2012):
--    - Art. 46, caput e § 1º: Divisor da hora extraordinária fixado em 200 (40h semanais / 6 * 30 = 200).
--    - Art. 46, I e II: 50% para dias úteis/sábados e 100% para domingos/feriados.
-- 2. Lei Federal Nº 11.416/2006 (Carreiras do PJU):
--    - GAJ de 140% (art. 13);
--    - GAE e GAS de 35% (arts. 16 e 17);
--    - Divisor mensal geral de 30 dias.
-- =====================================================

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
