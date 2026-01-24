-- =====================================================
-- MANUAL MIGRATION SCRIPT (COMBINED)
-- =====================================================
-- Description: Runs migrations 002 and 003 in a single step.
-- 1. Populates Global Config (IR, PSS)
-- 2. Populates Power Config (PJU Bases, Benefits)
-- 3. Populates Org Config (Org -> Power links)
-- date: 2026-01-23
-- =====================================================

BEGIN;

-- =====================================================
-- PART 0: RESET AND CREATE TABLES
-- =====================================================

DROP TABLE IF EXISTS global_config CASCADE;
DROP TABLE IF EXISTS power_config CASCADE;
DROP TABLE IF EXISTS org_config CASCADE;

CREATE TABLE IF NOT EXISTS global_config (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    config_key text NOT NULL,
    config_value jsonb NOT NULL,
    valid_from date NOT NULL,
    valid_to date,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT global_config_key_valid_from_key UNIQUE (config_key, valid_from)
);

CREATE TABLE IF NOT EXISTS power_config (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    power_name text NOT NULL,
    config_key text NOT NULL,
    config_value jsonb NOT NULL,
    valid_from date NOT NULL,
    valid_to date,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT power_config_power_key_valid_from_key UNIQUE (power_name, config_key, valid_from)
);

CREATE TABLE IF NOT EXISTS org_config (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    org_slug text NOT NULL UNIQUE,
    org_name text NOT NULL,
    power_name text NOT NULL,
    configuration jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies (Basic)
ALTER TABLE global_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE power_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read Global" ON global_config FOR SELECT USING (true);
CREATE POLICY "Public Read Power" ON power_config FOR SELECT USING (true);
CREATE POLICY "Public Read Org" ON org_config FOR SELECT USING (true);

-- Allow Anon Insert for Development Migration
CREATE POLICY "Dev Insert Global" ON global_config FOR INSERT WITH CHECK (true);
CREATE POLICY "Dev Update Global" ON global_config FOR UPDATE USING (true);
CREATE POLICY "Dev Insert Power" ON power_config FOR INSERT WITH CHECK (true);
CREATE POLICY "Dev Update Power" ON power_config FOR UPDATE USING (true);
CREATE POLICY "Dev Insert Org" ON org_config FOR INSERT WITH CHECK (true);
CREATE POLICY "Dev Update Org" ON org_config FOR UPDATE USING (true);

-- =====================================================
-- PART 1: GLOBAL CONFIG
-- =====================================================

-- 1.1. Dedução por Dependente (IRRF)
INSERT INTO global_config (config_key, config_value, valid_from, valid_to)
VALUES ('dependent_deduction', '189.59', '2024-01-01', NULL)
ON CONFLICT (config_key, valid_from) DO UPDATE SET config_value = EXCLUDED.config_value;

-- 1.2. Tabelas de PSS
INSERT INTO global_config (config_key, config_value, valid_from, valid_to)
VALUES ('pss_tables', '{
    "2026": { "ceiling": 8475.55, "rates": [ {"min": 0.00, "max": 1621.00, "rate": 0.075}, {"min": 1621.01, "max": 2902.84, "rate": 0.090}, {"min": 2902.85, "max": 4354.27, "rate": 0.120}, {"min": 4354.28, "max": 8475.55, "rate": 0.140}, {"min": 8475.56, "max": 14514.30, "rate": 0.145}, {"min": 14514.31, "max": 29028.58, "rate": 0.165}, {"min": 29028.59, "max": 56605.73, "rate": 0.190}, {"min": 56605.74, "max": 999999999, "rate": 0.220} ] },
    "2025": { "ceiling": 8157.41, "rates": [ {"min": 0.00, "max": 1518.00, "rate": 0.075}, {"min": 1518.01, "max": 2793.88, "rate": 0.090}, {"min": 2793.89, "max": 4190.83, "rate": 0.120}, {"min": 4190.84, "max": 8157.41, "rate": 0.140}, {"min": 8157.42, "max": 13969.49, "rate": 0.145}, {"min": 13969.50, "max": 27938.96, "rate": 0.165}, {"min": 27938.97, "max": 54480.97, "rate": 0.190}, {"min": 54480.98, "max": 999999999, "rate": 0.220} ] }
}'::jsonb, '2024-01-01', NULL)
ON CONFLICT (config_key, valid_from) DO UPDATE SET config_value = EXCLUDED.config_value;

-- 1.3. Tabelas de IR
INSERT INTO global_config (config_key, config_value, valid_from, valid_to)
VALUES ('ir_deduction', '{
    "2025_maio": { "deduction": 908.73, "brackets": [ {"min": 0, "max": 2259.20, "rate": 0, "deduction": 0}, {"min": 2259.21, "max": 2826.65, "rate": 0.075, "deduction": 169.44}, {"min": 2826.66, "max": 3751.05, "rate": 0.150, "deduction": 381.44}, {"min": 3751.06, "max": 4664.68, "rate": 0.225, "deduction": 662.77}, {"min": 4664.69, "max": null, "rate": 0.275, "deduction": 908.73} ] }
}'::jsonb, '2024-01-01', NULL)
ON CONFLICT (config_key, valid_from) DO UPDATE SET config_value = EXCLUDED.config_value;

-- =====================================================
-- PART 2: POWER CONFIG (PJU)
-- =====================================================

-- 2.1. CJ1 Integral Base
INSERT INTO power_config (power_name, config_key, config_value, valid_from, valid_to)
VALUES ('PJU', 'cj1_integral_base', '10990.74', '2025-01-01', NULL)
ON CONFLICT (power_name, config_key, valid_from) DO UPDATE SET config_value = EXCLUDED.config_value;

-- 2.2. Bases Salariais
INSERT INTO power_config (power_name, config_key, config_value, valid_from, valid_to)
VALUES ('PJU', 'salary_bases', '{
    "analista": { "C13": 9292.14, "C12": 9021.50, "C11": 8758.73, "B10": 8503.62, "B9": 8255.95, "B8": 7810.73, "B7": 7583.23, "B6": 7362.37, "A5": 7147.92, "A4": 6939.75, "A3": 6565.50, "A2": 6374.26, "A1": 6188.61 },
    "tecnico": { "C13": 5663.47, "C12": 5498.51, "C11": 5338.36, "B10": 5182.88, "B9": 5031.90, "B8": 4760.56, "B7": 4621.90, "B6": 4487.29, "A5": 4356.59, "A4": 4229.69, "A3": 4001.60, "A2": 3885.06, "A1": 3771.88 },
    "funcoes": { "fc1": 1215.34, "fc2": 1413.14, "fc3": 1644.51, "fc4": 2313.27, "fc5": 2662.06, "fc6": 3663.71, "cj1": 7143.98, "cj2": 8822.98, "cj3": 10029.94, "cj4": 11322.60 }
}'::jsonb, '2025-01-01', NULL)
ON CONFLICT (power_name, config_key, valid_from) DO UPDATE SET config_value = EXCLUDED.config_value;

-- 2.3. AQ Rules
INSERT INTO power_config (power_name, config_key, config_value, valid_from, valid_to)
VALUES ('PJU', 'aq_rules', '{ "old_system": { "doutorado": 0.50, "mestrado": 0.35, "especializacao": 0.10, "nenhum": 0 }, "new_system": { "doutorado": 5.0, "mestrado": 3.5, "especializacao": 1.0, "nenhum": 0, "treinamento_120h": 0.2, "treinamento_240h": 0.4, "treinamento_360h": 0.6 } }'::jsonb, '2025-01-01', NULL)
ON CONFLICT (power_name, config_key, valid_from) DO UPDATE SET config_value = EXCLUDED.config_value;

-- 2.4. Gratificações
INSERT INTO power_config (power_name, config_key, config_value, valid_from, valid_to)
VALUES ('PJU', 'gratification_percentages', '{ "gaj": 1.40, "gae": 0.35, "gas": 0.35 }'::jsonb, '2025-01-01', NULL)
ON CONFLICT (power_name, config_key, valid_from) DO UPDATE SET config_value = EXCLUDED.config_value;

-- 2.5. Benefícios
INSERT INTO power_config (power_name, config_key, config_value, valid_from, valid_to)
VALUES ('PJU', 'benefits', '{ "auxilio_alimentacao": { "2025": 1235.77, "2024": 1200.00 }, "auxilio_preescolar": { "2025": 1235.77, "2024": 1200.00 } }'::jsonb, '2024-01-01', NULL)
ON CONFLICT (power_name, config_key, valid_from) DO UPDATE SET config_value = EXCLUDED.config_value;

-- =====================================================
-- PART 3: ORG CONFIG (Links Org -> Power)
-- =====================================================

-- 3.1 PJU
INSERT INTO org_config (org_slug, org_name, power_name, configuration)
VALUES ('pju', 'Poder Judiciário da União', 'PJU', '{}'::jsonb)
ON CONFLICT (org_slug) DO UPDATE SET org_name = EXCLUDED.org_name, power_name = EXCLUDED.power_name;

-- 3.2 JMU
INSERT INTO org_config (org_slug, org_name, power_name, configuration)
VALUES ('jmu', 'Justiça Militar da União', 'PJU', '{}'::jsonb)
ON CONFLICT (org_slug) DO UPDATE SET org_name = EXCLUDED.org_name, power_name = EXCLUDED.power_name;

-- 3.3 STM
INSERT INTO org_config (org_slug, org_name, power_name, configuration)
VALUES ('stm', 'Superior Tribunal Militar', 'PJU', '{}'::jsonb)
ON CONFLICT (org_slug) DO UPDATE SET org_name = EXCLUDED.org_name, power_name = EXCLUDED.power_name;

COMMIT;

-- VERIFICATION
SELECT count(*) as global_count FROM global_config;
SELECT count(*) as power_count FROM power_config;
SELECT count(*) as org_count FROM org_config;
