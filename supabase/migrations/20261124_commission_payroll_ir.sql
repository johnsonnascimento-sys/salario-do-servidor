-- Explicit monthly-payroll metadata consumed by the new CJ/FC profiles.
-- Preserve the previous global configuration and the RRA rules without changes.
-- Official reference: RFB 2026 monthly table and Law 15.270/2025.
DO $migration$
DECLARE
  previous public.global_config%rowtype;
  candidate jsonb;
  payroll_metadata jsonb := $payroll${
    "simplifiedDeduction": 607.20,
    "reductionApplicable": true,
    "reduction": {
      "status": "verified",
      "mode": "total",
      "exemptIncome": 5000,
      "partialIncome": 7350,
      "maxReduction": 312.89,
      "intercept": 978.62,
      "slope": 0.133145,
      "reference": "https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2026"
    }
  }$payroll$::jsonb;
  expected_brackets jsonb := $brackets$[
    {"min": 0, "max": 2428.80, "rate": 0, "deduction": 0},
    {"min": 2428.81, "max": 2826.65, "rate": 0.075, "deduction": 182.16},
    {"min": 2826.66, "max": 3751.05, "rate": 0.15, "deduction": 394.16},
    {"min": 3751.06, "max": 4664.68, "rate": 0.225, "deduction": 675.49},
    {"min": 4664.69, "max": null, "rate": 0.275, "deduction": 908.73}
  ]$brackets$::jsonb;
  registration_date date := '2026-11-24';
BEGIN
  LOCK TABLE public.global_config IN SHARE ROW EXCLUSIVE MODE;
  IF (SELECT count(*) FROM public.global_config
      WHERE config_key='ir_deduction' AND valid_to IS NULL) <> 1 THEN
    RAISE EXCEPTION 'Esperada uma configuração global ativa de IR';
  END IF;
  SELECT * INTO STRICT previous FROM public.global_config
    WHERE config_key='ir_deduction' AND valid_to IS NULL FOR UPDATE;
  IF previous.config_value->'2026_jan'->'payroll' = payroll_metadata THEN
    RETURN;
  END IF;
  IF previous.config_value->'2026_jan' ? 'payroll' THEN
    RAISE EXCEPTION 'Metadados mensais de IR já cadastrados com conteúdo divergente';
  END IF;
  IF previous.config_value->'2026_jan'->'brackets' IS DISTINCT FROM expected_brackets
      OR previous.config_value->'2026_jan'->>'valid_from' IS DISTINCT FROM '2026-01-01'
      OR NOT (previous.config_value->'2026_jan' ? 'reference')
      OR NOT (previous.config_value->'2026_jan' ? 'rra') THEN
    RAISE EXCEPTION 'Tabela progressiva de IR/2026 diverge da referência conferida';
  END IF;
  IF previous.valid_from >= registration_date THEN
    RAISE EXCEPTION 'A versão ativa de IR exige revisão da data de sucessão';
  END IF;
  candidate := jsonb_set(previous.config_value, '{2026_jan,payroll}', payroll_metadata, true);
  UPDATE public.global_config SET valid_to=registration_date-1 WHERE id=previous.id;
  INSERT INTO public.global_config(config_key,config_value,valid_from,valid_to)
    VALUES ('ir_deduction',candidate,registration_date,NULL);
END
$migration$;
