-- GAACTA: preserve its statutory start date as organization configuration for CJF and TRFs.
-- Resolução STM nº 397/2026 e regulamentação da Justiça Federal / PJU (CJ-1 a CJ-4), desde 01/06/2026.
DO $cjf_gaacta_validity$
DECLARE
  proposed_rule jsonb := $json$
  {
    "enabled": true,
    "versions": [{
      "validFrom": "2026-06",
      "validTo": null,
      "percentage": 0.15,
      "reference": "Resolução STM nº 397/2026 / JF (CJ-1 a CJ-4); efeitos a partir de 01/06/2026"
    }]
  }
  $json$::jsonb;
  current_rule jsonb;
  target_org text;
BEGIN
  LOCK TABLE public.org_config IN SHARE ROW EXCLUSIVE MODE;
  IF NOT EXISTS (SELECT 1 FROM public.org_config WHERE org_slug = 'cjf') THEN
    RETURN;
  END IF;
  FOR target_org IN
    SELECT org_slug FROM public.org_config WHERE org_slug = 'cjf' OR org_slug LIKE 'trf%'
  LOOP
    SELECT configuration -> 'gaacta_rules' INTO current_rule
      FROM public.org_config WHERE org_slug = target_org;
    IF current_rule IS NOT NULL AND current_rule IS DISTINCT FROM proposed_rule THEN
      RAISE EXCEPTION 'Existing GAACTA rule for % differs; preserve and review its history', target_org;
    END IF;
    UPDATE public.org_config
      SET configuration = jsonb_set(coalesce(configuration, '{}'::jsonb), '{gaacta_rules}', proposed_rule, true)
      WHERE org_slug = target_org AND current_rule IS NULL;
  END LOOP;
END
$cjf_gaacta_validity$;
