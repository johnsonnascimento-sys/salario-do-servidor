-- Portaria CJF nº 315, de 22/05/2026, arts. 1º, 2º e 4º.
-- DOU de 10/06/2026, Seção 1, p. 343. Republicada em 12/06/2026, p. 124.
-- Preserva as regras de diárias preexistentes. O motor usa a tabela nominal ativa.
DO $cjf_dailies_tariff$
DECLARE
  tariff jsonb := $json$
  {
    "valid_from": "2026-06-10",
    "valid_to": null,
    "source": "Portaria CJF nº 315/2026, vigente desde 10/06/2026",
    "minister_per_diem": 1545.53,
    "rates": {
      "ministro": 1545.53, "membro_cjf": 1545.53,
      "desembargador": 1468.25,
      "juiz": 1394.84, "juiz_titular": 1394.84, "juiz_substituto": 1394.84,
      "analista": 850.04, "cj": 850.04,
      "tecnico": 695.49, "auxiliar": 695.49,
      "fc1": 695.49, "fc2": 695.49, "fc3": 695.49,
      "fc4": 695.49, "fc5": 695.49, "fc6": 695.49
    },
    "embarkation_additional": { "completo": 680.00, "metade": 340.00 },
    "per_diem_limit": 1165.27,
    "embarkation_description": "A Portaria CJF nº 315/2026 fixa R$ 680,00 para o percurso integral. Os quatro trechos têm o mesmo valor e são considerados quando realizados sem veículo oficial."
  }
  $json$::jsonb;
  federal_org record;
  rules jsonb;
  versions jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.org_config WHERE org_slug = 'cjf' AND power_name = 'PJU') THEN
    RAISE EXCEPTION 'Configuração do CJF deve estar cadastrada no PJU';
  END IF;

  FOR federal_org IN
    SELECT org_slug, configuration
    FROM public.org_config
    WHERE org_slug ~ '^(cjf|trf[1-6])$' AND power_name = 'PJU'
    ORDER BY org_slug
    FOR UPDATE
  LOOP
    rules := coalesce(federal_org.configuration -> 'dailies_rules', '{}'::jsonb);
    versions := coalesce(rules -> 'tariff_versions', '[]'::jsonb);
    IF versions @> jsonb_build_array(tariff) THEN
      CONTINUE;
    END IF;
    IF jsonb_typeof(versions) <> 'array' OR EXISTS (
      SELECT 1 FROM jsonb_array_elements(versions) AS prior(version)
      WHERE prior.version ->> 'valid_to' IS NULL
         OR prior.version ->> 'valid_to' >= tariff ->> 'valid_from'
    ) THEN
      RAISE EXCEPTION 'Vigência conflitante nas diárias de %', federal_org.org_slug;
    END IF;

    UPDATE public.org_config
    SET configuration = jsonb_set(
      coalesce(configuration, '{}'::jsonb),
      '{dailies_rules}',
      jsonb_set(rules, '{tariff_versions}', versions || jsonb_build_array(tariff))
    )
    WHERE org_slug = federal_org.org_slug;
  END LOOP;
END
$cjf_dailies_tariff$;
