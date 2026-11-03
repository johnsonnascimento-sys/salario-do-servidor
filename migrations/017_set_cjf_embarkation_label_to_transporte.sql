-- =====================================================
-- Migration 017: Ajuste de Rótulo e Descrição Legal do Adicional de Transporte na Justiça Federal (CJF e TRFs)
-- =====================================================
-- Fundamentação Legal:
-- 1. Resolução CJF Nº 340/2015:
--    - Capítulo V e Art. 2º, II denominam expressamente como "Adicional de transporte".
--    - Art. 17: fixa o adicional em 80% sobre o valor básico da diária de Analista Judiciário
--      (80% * 55% = 44% da diária de Ministro do STF) para cobrir despesas de deslocamento
--      até o local de embarque e do desembarque ao local de trabalho/hospedagem e vice-versa.
--    - § 2º do Art. 17 c/c Anexo: 25% por trecho de ida/volta sem veículo oficial.
--      Completo (ida e volta): 44% de Ministro do STF (R$ 645,46).
--      Metade (ida ou volta): 22% de Ministro do STF (R$ 322,73).
-- =====================================================

DO $$
DECLARE
  v_slug text;
  v_slugs text[] := ARRAY['cjf', 'trf1', 'trf2', 'trf3', 'trf4', 'trf5', 'trf6'];
BEGIN
  FOREACH v_slug IN ARRAY v_slugs LOOP
    UPDATE org_config
    SET configuration = jsonb_set(
      jsonb_set(
        COALESCE(configuration, '{}'::jsonb),
        '{dailies_rules,embarkation_label}',
        '"Adicional de transporte"'::jsonb,
        true
      ),
      '{dailies_rules,embarkation_description}',
      '"80% sobre a diária básica de Analista Judiciário (art. 17 da Resolução CJF nº 340/2015), equivalente a 44% da diária de Ministro do STF (R$ 645,46 no percurso completo e R$ 322,73 na metade)."'::jsonb,
      true
    )
    WHERE org_slug = v_slug;
  END LOOP;
END $$;

