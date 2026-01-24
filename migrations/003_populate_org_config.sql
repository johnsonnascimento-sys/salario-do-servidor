-- =====================================================
-- Migration: Populate Org Config
-- =====================================================
-- Description: Populates org_config table to link Orgs to Powers
-- Hierarchy: org_config -> power_config -> global_config
-- Date: 2026-01-23
-- =====================================================

-- 1. Populate org_config for PJU (Poder Judiciário da União)
-- This entry links 'pju' org to 'PJU' power config.
-- It defaults to inheriting everything from Power Config.
INSERT INTO org_config (org_slug, org_name, power_name, configuration)
VALUES (
  'pju',
  'Poder Judiciário da União',
  'PJU',
  '{}'::jsonb
)
ON CONFLICT (org_slug) DO UPDATE
SET 
  org_name = EXCLUDED.org_name,
  power_name = EXCLUDED.power_name;

-- 2. Populate org_config for JMU (Justiça Militar da União)
-- Inherits from PJU Power Config
INSERT INTO org_config (org_slug, org_name, power_name, configuration)
VALUES (
  'jmu',
  'Justiça Militar da União',
  'PJU',
  '{}'::jsonb
)
ON CONFLICT (org_slug) DO UPDATE
SET 
  org_name = EXCLUDED.org_name,
  power_name = EXCLUDED.power_name;

-- 3. Populate org_config for STM (Superior Tribunal Militar)
-- Inherits from PJU Power Config
INSERT INTO org_config (org_slug, org_name, power_name, configuration)
VALUES (
  'stm',
  'Superior Tribunal Militar',
  'PJU',
  '{}'::jsonb
)
ON CONFLICT (org_slug) DO UPDATE
SET 
  org_name = EXCLUDED.org_name,
  power_name = EXCLUDED.power_name;

-- =====================================================
-- VERIFICATION
-- =====================================================
-- SELECT * FROM org_config;
