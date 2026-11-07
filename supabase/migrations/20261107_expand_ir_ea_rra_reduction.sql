-- IR-EA: reviewed administrative configuration version, 2026-11-07.
-- IMPACT: expands RRA reduction verification under IN RFB 1.500/2014, art. 37,
-- and Annex X (as amended by IN RFB 2.299/2025) across all positive month counts (NM >= 1).
-- The reduction operates directly on the gross taxable RRA amount paid in the month
-- (up to R$ 5,000.00 max reduction R$ 312.89; R$ 5,000.01 to R$ 7,350.00 linear slope
-- 0.133145 with intercept 978.62; above R$ 7,350.00 reduction is zero).
-- No method multiplying/dividing the Annex X thresholds by NM is presumed or applied.
-- Historical brackets (2024_fev, 2025_jan, 2025_maio) and previous version are fully preserved.
--
-- Sources verified 2026-11-07:
-- Lei 7.713/1988, art. 12-A and 12-B.
-- Lei 9.250/1995, art. 3º-A (Lei 15.270/2025).
-- IN RFB 1500/2014, arts. 37-39, Annex IV and Annex X (IN RFB 2299/2025):
-- https://normasinternet2.receita.fazenda.gov.br/#/consulta/externa/57670
-- https://normasinternet2.receita.fazenda.gov.br/#/consulta/externa/148383
-- https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2026
--
-- ADMIN FLOW: prepare/review the JSON candidate below, confirm impact in
-- /admin/global, then version ir_deduction via admin_version_global_config.
-- Rehearse with BEGIN/ROLLBACK.
DO $ir_ea$
DECLARE
    previous_row public.global_config%ROWTYPE;
    current_value jsonb;
    reviewed_tables jsonb := $json$
    {
      "2024_fev": {
        "deduction": 896.00,
        "valid_from": "2024-02-01", "valid_to": "2024-12-31",
        "reference": "https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/copy_of_2024; IN RFB 1500/2014 arts. 37-39: https://normasinternet2.receita.fazenda.gov.br/#/consulta/externa/57670",
        "revision": "ir-ea-20261107-v1",
        "rra": {"deductDependents": false, "deductComplementaryPension": false, "reductionApplicable": false},
        "brackets": [
          {"min": 0, "max": 2259.20, "rate": 0, "deduction": 0},
          {"min": 2259.21, "max": 2826.65, "rate": 0.075, "deduction": 169.44},
          {"min": 2826.66, "max": 3751.05, "rate": 0.15, "deduction": 381.44},
          {"min": 3751.06, "max": 4664.68, "rate": 0.225, "deduction": 662.77},
          {"min": 4664.69, "max": null, "rate": 0.275, "deduction": 896.00}
        ]
      },
      "2025_jan": {
        "deduction": 896.00,
        "valid_from": "2025-01-01", "valid_to": "2025-04-30",
        "reference": "https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2025; IN RFB 1500/2014 arts. 37-39: https://normasinternet2.receita.fazenda.gov.br/#/consulta/externa/57670",
        "revision": "ir-ea-20261107-v1",
        "rra": {"deductDependents": false, "deductComplementaryPension": false, "reductionApplicable": false},
        "brackets": [
          {"min": 0, "max": 2259.20, "rate": 0, "deduction": 0},
          {"min": 2259.21, "max": 2826.65, "rate": 0.075, "deduction": 169.44},
          {"min": 2826.66, "max": 3751.05, "rate": 0.15, "deduction": 381.44},
          {"min": 3751.06, "max": 4664.68, "rate": 0.225, "deduction": 662.77},
          {"min": 4664.69, "max": null, "rate": 0.275, "deduction": 896.00}
        ]
      },
      "2025_maio": {
        "deduction": 908.73,
        "valid_from": "2025-05-01", "valid_to": "2025-12-31",
        "reference": "https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2025; IN RFB 1500/2014 arts. 37-39: https://normasinternet2.receita.fazenda.gov.br/#/consulta/externa/57670",
        "revision": "ir-ea-20261107-v1",
        "rra": {"deductDependents": false, "deductComplementaryPension": false, "reductionApplicable": false},
        "brackets": [
          {"min": 0, "max": 2428.80, "rate": 0, "deduction": 0},
          {"min": 2428.81, "max": 2826.65, "rate": 0.075, "deduction": 182.16},
          {"min": 2826.66, "max": 3751.05, "rate": 0.15, "deduction": 394.16},
          {"min": 3751.06, "max": 4664.68, "rate": 0.225, "deduction": 675.49},
          {"min": 4664.69, "max": null, "rate": 0.275, "deduction": 908.73}
        ]
      },
      "2026_jan": {
        "deduction": 908.73,
        "valid_from": "2026-01-01",
        "reference": "https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2026; IN RFB 1500/2014 arts. 37-39 e Anexo X (IN 2299/2025)",
        "revision": "ir-ea-20261107-v1",
        "rra": {
          "deductDependents": false,
          "deductComplementaryPension": false,
          "reductionApplicable": true,
          "reduction": {
            "status": "verified", "mode": "total",
            "exemptIncome": 5000.00, "partialIncome": 7350.00,
            "maxReduction": 312.89, "intercept": 978.62, "slope": 0.133145,
            "reference": "IN RFB 1500/2014 art. 37 e Anexo X, redação IN 2299/2025 c/c art. 3º-A da Lei 9.250/1995 (Lei 15.270/2025); https://normasinternet2.receita.fazenda.gov.br/#/consulta/externa/148383; apuração da redução sobre o montante tributável recebido no mês (até R$ 5.000,00 redução até R$ 312,89; R$ 5.000,01 a R$ 7.350,00 redução linear decrescente; superior a R$ 7.350,00 redução zero), sem multiplicação dos limites por NM, aplicável a qualquer NM >= 1"
          }
        },
        "brackets": [
          {"min": 0, "max": 2428.80, "rate": 0, "deduction": 0},
          {"min": 2428.81, "max": 2826.65, "rate": 0.075, "deduction": 182.16},
          {"min": 2826.66, "max": 3751.05, "rate": 0.15, "deduction": 394.16},
          {"min": 3751.06, "max": 4664.68, "rate": 0.225, "deduction": 675.49},
          {"min": 4664.69, "max": null, "rate": 0.275, "deduction": 908.73}
        ]
      }
    }
    $json$::jsonb;
BEGIN
    LOCK TABLE public.global_config IN SHARE ROW EXCLUSIVE MODE;
    IF (SELECT count(*) FROM public.global_config WHERE config_key = 'ir_deduction' AND valid_to IS NULL) <> 1 THEN
        RAISE EXCEPTION 'IR-EA: expected exactly one active global ir_deduction version';
    END IF;
    SELECT * INTO STRICT previous_row FROM public.global_config
      WHERE config_key = 'ir_deduction' AND valid_to IS NULL FOR UPDATE;
    current_value := previous_row.config_value;
    IF jsonb_typeof(current_value) IS DISTINCT FROM 'object' THEN
        RAISE EXCEPTION 'IR-EA: active table set must be a JSON object';
    END IF;
    IF current_value @> reviewed_tables THEN
        RETURN; -- Already applied, including all reviewed metadata and tables.
    END IF;
    IF previous_row.valid_from >= DATE '2026-11-07' THEN
        RAISE EXCEPTION 'IR-EA: newer/current-day configuration requires a fresh admin review';
    END IF;
    IF EXISTS (SELECT 1 FROM public.global_config WHERE config_key = 'ir_deduction' AND valid_from = DATE '2026-11-07') THEN
        RAISE EXCEPTION 'IR-EA: reviewed version date is already occupied';
    END IF;
    UPDATE public.global_config SET valid_to = DATE '2026-11-06' WHERE id = previous_row.id;
    INSERT INTO public.global_config (config_key, config_value, valid_from, valid_to)
      VALUES ('ir_deduction', current_value || reviewed_tables, DATE '2026-11-07', NULL);
END
$ir_ea$;
