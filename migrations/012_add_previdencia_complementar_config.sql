-- =====================================================
-- Migration 012: Add previdencia_complementar config (PJU)
-- =====================================================
-- Objetivo: habilitar regras data-driven de Funpresp (patrocinado)
-- Vigencia de referencia: 2025-04-01

INSERT INTO power_config (power_name, config_key, config_value, valid_from, valid_to)
VALUES (
  'PJU',
  'previdencia_complementar',
  '{
    "enabled": true,
    "scope": "patrocinado",
    "sponsored_rate": {
      "min": 0.065,
      "max": 0.085,
      "step": 0.005,
      "default_rpc": 0.085
    },
    "facultative_rate": {
      "min_if_positive": 0.025,
      "max": 0.22,
      "step": 0.005,
      "default": 0.0
    },
    "base_rule": "excedente_teto_rgps",
    "include_thirteenth": true,
    "costing_disclosure": {
      "loading_normal": 0.035,
      "loading_facultative": 0.0,
      "fcbe_share_of_normal": 0.1324,
      "admin_remido_assistido": 0.003,
      "effective_from": "2025-04-01"
    },
    "references": {
      "regulamento_version": "2018",
      "plano_custeio_ref": "2025"
    }
  }'::jsonb,
  '2025-04-01',
  NULL
)
ON CONFLICT (power_name, config_key, valid_from) DO UPDATE
SET
  config_value = EXCLUDED.config_value,
  valid_to = EXCLUDED.valid_to;
