-- GAACTA: preserve its statutory start date as organization configuration.
-- Resolução STM nº 397/2026, com efeitos financeiros desde 01/06/2026.
-- The version is intentionally stored at org level: this STM rule must not
-- become a PJU-wide default. Historical months before 2026-06 have no version.
DO $gaacta_validity$
DECLARE
  proposed_rule jsonb := $json$
  {
    "enabled": true,
    "versions": [{
      "validFrom": "2026-06",
      "validTo": null,
      "percentage": 0.15,
      "reference": "Resolução STM nº 397/2026; efeitos financeiros a partir de 01/06/2026"
    }]
  }
  $json$::jsonb;
  current_rule jsonb;
  target_org text;
BEGIN
  LOCK TABLE public.org_config IN SHARE ROW EXCLUSIVE MODE;
  IF NOT EXISTS (SELECT 1 FROM public.org_config WHERE org_slug = 'jmu') THEN
    RAISE EXCEPTION 'Missing JMU org_config: register the organ before GAACTA rules';
  END IF;
  FOR target_org IN
    SELECT org_slug FROM public.org_config WHERE org_slug IN ('jmu', 'stm')
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
$gaacta_validity$;
