-- JMU transport indemnity: preserve the current rule and record its predecessor.
-- ATN STM 596/2022, arts. 1-3: R$ 2.075,88; publication 21/10/2022,
-- BJM n. 41, p. 2942. Signature on 18/10/2022 is not its effective date.
-- Official record: https://www2.stm.jus.br/sislegis/index.php/ctrl_publico_extranet/link_detalhar/31413
-- PDF: https://www2.stm.jus.br/sislegis/index.php/ctrl_publico_pdf/visualizar/31413-ATN-000596_18-10-2022_STM_0.pdf
-- Repealed by ATN STM 935/2026 on its publication, 13/02/2026:
-- https://www2.stm.jus.br/sislegis/index.php/ctrl_publico_extranet/link_detalhar/36484
-- Both amounts use the divisor established by ATN STM 212/2017, art. 2.
-- Each version now owns its divisor and incidences. Deprecated top-level values
-- are retained only for compatibility while the reviewed frontend is deployed.
-- Never edit a historical version to introduce a future rule: append a version.
-- October 2022 and February 2026 remain unavailable with monthly day counts:
-- a partial or changing validity cannot be allocated safely without date data.
DO $transport_indemnity_history$
DECLARE
  current_rule jsonb;
  current_version jsonb;
  historical_version jsonb := $json$
  {
    "validFrom": "2022-10-21",
    "validTo": "2026-02-12",
    "fullAmount": 2075.88,
    "divisor": 20,
    "incidences": { "ir": false, "pss": false, "funpresp": false },
    "normativeLabel": "ATN STM nº 212/2017 • nº 596/2022",
    "reference": "ATN STM nº 596/2022, arts. 1º a 3º; BJM nº 41, de 21/10/2022, p. 2942"
  }
  $json$::jsonb;
  proposed_rule jsonb;
  target_org text;
  version_count integer;
BEGIN
  LOCK TABLE public.org_config IN SHARE ROW EXCLUSIVE MODE;
  IF NOT EXISTS (SELECT 1 FROM public.org_config WHERE org_slug = 'jmu') THEN
    RAISE EXCEPTION 'Missing JMU org_config: register organ before transport history';
  END IF;
  FOR target_org IN
    SELECT org_slug FROM public.org_config WHERE org_slug IN ('jmu', 'stm')
  LOOP
    SELECT configuration -> 'transport_indemnity' INTO current_rule
      FROM public.org_config WHERE org_slug = target_org;
    IF current_rule IS NULL OR jsonb_typeof(current_rule -> 'versions') IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION 'Missing transport indemnity rule for %; apply and review its initial registration first', target_org;
    END IF;
    IF current_rule -> 'divisor' IS DISTINCT FROM '20'::jsonb
       OR current_rule -> 'incidences' IS DISTINCT FROM '{"ir":false,"pss":false,"funpresp":false}'::jsonb THEN
      RAISE EXCEPTION 'Transport parameters for % differ from reviewed JMU baseline', target_org;
    END IF;
    version_count := jsonb_array_length(current_rule -> 'versions');
    IF version_count = 1 THEN
      current_version := current_rule -> 'versions' -> 0;
    ELSIF version_count = 2 AND current_rule -> 'versions' -> 0 = historical_version THEN
      current_version := current_rule -> 'versions' -> 1;
    ELSE
      RAISE EXCEPTION 'Unexpected transport history for %; preserve and review it before migration', target_org;
    END IF;
    IF NOT current_version @> '{"validFrom":"2026-02-13","validTo":null,"fullAmount":2168.46}'::jsonb
       OR coalesce(current_version ->> 'reference', '') = ''
       OR (current_version ? 'divisor' AND current_version -> 'divisor' IS DISTINCT FROM '20'::jsonb)
       OR (current_version ? 'incidences' AND current_version -> 'incidences' IS DISTINCT FROM '{"ir":false,"pss":false,"funpresp":false}'::jsonb)
       OR (current_version ? 'normativeLabel' AND current_version ->> 'normativeLabel' IS DISTINCT FROM 'ATN STM nº 212/2017 • nº 935/2026') THEN
      RAISE EXCEPTION 'Current transport version for % differs from reviewed baseline', target_org;
    END IF;
    current_version := current_version || '{"divisor":20,"incidences":{"ir":false,"pss":false,"funpresp":false},"normativeLabel":"ATN STM nº 212/2017 • nº 935/2026"}'::jsonb;
    -- Preserve enabled state, existing notes and all unrelated configuration.
    proposed_rule := jsonb_set(current_rule, '{versions}', jsonb_build_array(historical_version, current_version), false);
    IF proposed_rule IS DISTINCT FROM current_rule THEN
      UPDATE public.org_config
        SET configuration = jsonb_set(configuration, '{transport_indemnity}', proposed_rule, false)
        WHERE org_slug = target_org;
    END IF;
  END LOOP;
END
$transport_indemnity_history$;
