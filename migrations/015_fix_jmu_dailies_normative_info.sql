-- Completa os metadados exibidos no card de diarias da JMU/STM.
-- Nao altera valores, percentuais, descontos ou regras de calculo.
-- Preserva metadados ja configurados; pode ser executada novamente.
-- Usa local_rule_label: branch_rule_label tambem e consumido pelo calculo
-- de assessoramento e nao deve ser modificado por uma correcao visual.
BEGIN;

UPDATE org_config
SET configuration = jsonb_set(
    COALESCE(configuration, '{}'::jsonb),
    '{dailies_rules}',
    COALESCE(configuration->'dailies_rules', '{}'::jsonb) || jsonb_build_object(
        'normative_info',
        jsonb_build_object(
            'general_rule_label', 'Resolução CNJ Nº 73/2009',
            'local_rule_label', 'Ato Normativo STM Nº 799/2024'
        ) || COALESCE(NULLIF(configuration->'dailies_rules'->'normative_info', 'null'::jsonb), '{}'::jsonb)
    ),
    true
)
WHERE org_slug IN ('jmu', 'stm');

COMMIT;
