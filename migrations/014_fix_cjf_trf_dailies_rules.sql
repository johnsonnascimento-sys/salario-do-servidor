-- =====================================================
-- Migration 014: Correção do Adicional de Deslocamento e Regras de Diárias para Justiça Federal (CJF e TRFs)
-- =====================================================
-- Fundamentação Legal:
-- 1. Resolução CJF Nº 340/2015 (com alterações das Resoluções CJF 353/2015, 516/2019 e 568/2019):
--    - Art. 10: Diárias vinculadas à de Ministro do STF (Desembargador 95%, Juiz 90.25%, Analista e CJ 55%, Técnico 45%).
--    - Art. 17: Adicional de transporte/deslocamento de 80% sobre o valor básico da diária de Analista Judiciário (80% * 55% = 44% de Ministro do STF).
--    - § 2º do Art. 17 c/c Anexo (Proposta de Concessão de Diárias): 25% para cada percurso de ida/volta em embarque/desembarque.
--      Ida ou Volta (Metade): 50% do adicional = 22% de Ministro do STF (R$ 322,73).
--      Ida e Volta (Completo): 100% do adicional = 44% de Ministro do STF (R$ 645,46).
--    - Rótulo oficial: "Adicional de deslocamento".
-- =====================================================

DO $$
DECLARE
  v_org_slug text;
  v_org_name text;
  v_slugs text[] := ARRAY['cjf', 'trf1', 'trf2', 'trf3', 'trf4', 'trf5', 'trf6'];
  v_names text[] := ARRAY[
    'Conselho da Justiça Federal',
    'Tribunal Regional Federal da 1ª Região',
    'Tribunal Regional Federal da 2ª Região',
    'Tribunal Regional Federal da 3ª Região',
    'Tribunal Regional Federal da 4ª Região',
    'Tribunal Regional Federal da 5ª Região',
    'Tribunal Regional Federal da 6ª Região'
  ];
  v_config jsonb;
BEGIN
  v_config := jsonb_build_object(
    'dailies_rules', jsonb_build_object(
      'embarkation_label', 'Adicional de deslocamento',
      'embarkation_additional', jsonb_build_object(
        'completo', 645.46,
        'metade', 322.73
      ),
      'normative_info', jsonb_build_object(
        'general_rule_label', 'Resolução CNJ Nº 73/2009',
        'branch_rule_label', 'Resolução CJF Nº 340/2015',
        'notes', jsonb_build_array(
          'Regulamentado pela Resolução CJF Nº 340/2015 e Resolução CNJ Nº 73/2009',
          'Valores unitários vinculados à diária de Ministro do STF',
          'Adicional de deslocamento de 80% sobre a diária de Analista Judiciário (art. 17 da Res. CJF 340/2015)'
        )
      ),
      'derived_from_minister', jsonb_build_object(
        'enabled', true,
        'minister_per_diem', 1466.95,
        'rates_percentages', jsonb_build_object(
          'desembargador', 0.95,
          'juiz', 0.9025,
          'juiz_titular', 0.9025,
          'juiz_substituto', 0.9025,
          'cj4', 0.55,
          'cj3', 0.55,
          'cj2', 0.55,
          'cj1', 0.55,
          'cj', 0.55,
          'analista', 0.55,
          'tecnico', 0.45,
          'auxiliar', 0.45
        ),
        'embarkation_percentage_full', 0.44,
        'embarkation_percentage_half', 0.22,
        'assistance_percentage', 0.80
      ),
      'external_gloss', jsonb_build_object(
        'hospedagem', 0.50,
        'alimentacao', 0.25,
        'transporte', 0.25
      ),
      'ldo_cap', jsonb_build_object(
        'enabled', true,
        'per_diem_limit', 1153.37
      ),
      'discount_rules', jsonb_build_object(
        'food_divisor', 22,
        'transport_divisor', 22,
        'exclude_weekends_and_holidays', true,
        'return_day_half_diem_business_day', true,
        'return_day_half_discount_business_day', true
      )
    )
  );

  FOR i IN 1..array_length(v_slugs, 1) LOOP
    v_org_slug := v_slugs[i];
    v_org_name := v_names[i];

    INSERT INTO org_config (org_slug, org_name, power_name, configuration)
    VALUES (v_org_slug, v_org_name, 'PJU', v_config)
    ON CONFLICT (org_slug) DO UPDATE
    SET
      configuration = jsonb_set(
        jsonb_set(
          COALESCE(org_config.configuration, '{}'::jsonb),
          '{dailies_rules}',
          v_config->'dailies_rules',
          true
        ),
        '{dailies_rules,embarkation_label}',
        '"Adicional de deslocamento"'::jsonb,
        true
      );
  END LOOP;
END $$;

