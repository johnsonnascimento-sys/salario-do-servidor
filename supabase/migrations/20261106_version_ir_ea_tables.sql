-- IR-EA: reviewed administrative configuration version, 2026-11-06.
-- IMPACT: all agencies inheriting global IR receive corrected historical brackets
-- and explicit RRA validity/deduction metadata. No salary, PSS, organ overrides,
-- saved payslips, RLS or user data is modified. Ordinary top-bracket deductions
-- remain 896.00 (Jan-Apr/2025) and 908.73 (May/2025 onward).
--
-- Sources verified 2026-11-06:
-- https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2025
-- https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2026
-- IN RFB 1500/2014, arts. 37-39 and Annexes IV/X, as amended by IN 2299/2025:
-- https://normasinternet2.receita.fazenda.gov.br/#/consulta/externa/57670
-- https://normasinternet2.receita.fazenda.gov.br/#/consulta/externa/148383
-- Primary machine-readable publication: /api/consulta-externa/ato/148383/visao/vigente
--
-- RRA: dependents and complementary pension are NOT automatically deductible.
-- 2026 redutor is verified for NM=1 only. No method multiplying/reducing/averaging
-- its thresholds by NM>1 is assumed; the engine must mark those cases pending.
--
-- ADMIN FLOW: prepare/review the JSON candidate below, confirm this impact in
-- /admin/global, then version ir_deduction via admin_version_global_config.
-- This guarded SQL is the equivalent privileged migration for a reviewed admin
-- deployment. It never overwrites the previous JSON. Rehearse with BEGIN/ROLLBACK.
-- Rollback: version the preserved predecessor JSON through the same admin flow;
-- never erase the new version or reopen a historical row silently.
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
        "revision": "ir-ea-20261106-v1",
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
        "revision": "ir-ea-20261106-v1",
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
        "revision": "ir-ea-20261106-v1",
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
        "revision": "ir-ea-20261106-v1",
        "rra": {
          "deductDependents": false,
          "deductComplementaryPension": false,
          "reductionApplicable": true,
          "reduction": {
            "status": "verified", "mode": "total", "verifiedMonths": [1],
            "exemptIncome": 5000.00, "partialIncome": 7350.00,
            "maxReduction": 312.89, "intercept": 978.62, "slope": 0.133145,
            "reference": "IN RFB 1500/2014 art. 37 e Anexo X, redação IN 2299/2025; https://normasinternet2.receita.fazenda.gov.br/#/consulta/externa/148383; NM=1: montante tributável recebido, sem média ou multiplicação dos limites do redutor; NM diferente de 1 requer validação específica"
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
    IF previous_row.valid_from >= DATE '2026-11-06' THEN
        RAISE EXCEPTION 'IR-EA: newer/current-day configuration requires a fresh admin review';
    END IF;
    IF EXISTS (SELECT 1 FROM public.global_config WHERE config_key = 'ir_deduction' AND valid_from = DATE '2026-11-06') THEN
        RAISE EXCEPTION 'IR-EA: reviewed version date is already occupied';
    END IF;
    UPDATE public.global_config SET valid_to = DATE '2026-11-05' WHERE id = previous_row.id;
    INSERT INTO public.global_config (config_key, config_value, valid_from, valid_to)
      VALUES ('ir_deduction', current_value || reviewed_tables, DATE '2026-11-06', NULL);
END
$ir_ea$;
