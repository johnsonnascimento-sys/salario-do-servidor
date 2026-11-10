-- Indenizacao de Transporte: JMU only. Run through the reviewed admin migration flow.
-- ATN STM 935/2026, arts. 1-3: R$ 2.168,46; revokes ATN 596/2022;
-- effective on PUBLICATION, not signature (06/02/2026).
-- Official Sisleg record: BJM n. 006, 13/02/2026, p. 407:
-- https://www2.stm.jus.br/sislegis/index.php/ctrl_publico_extranet/link_detalhar/36484
-- Original: https://www2.stm.jus.br/sislegis/index.php/ctrl_publico_pdf/visualizar/36484-ATN-000935_06-02-2026_STM_0.pdf
-- Formula/exclusions/ad hoc: ATN 212/2017, arts. 1-5 (ATN 536/2022):
-- https://www2.stm.jus.br/sislegis/index.php/ctrl_publico_pdf/visualizar/23968-ATN-000212_03-01-2017_STM_1.pdf
-- IR: Decreto 9.580/2018, art. 35, I, e:
-- https://www2.camara.leg.br/legin/fed/decret/2018/decreto-9580-22-novembro-2018-787360-normaatualizada-pe.html
-- PSS: Lei 10.887/2004, art. 4, par. 1, III:
-- https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2004/lei/l10.887.htm
-- Funpresp-Jud: salario de participacao excludes art. 4, par. 1, Lei 10.887:
-- https://www.funprespjud.com.br/adesao/
-- History lives in versions[] because org_config has one row per organ.
-- No previous amounts or dates are inferred. The engine rejects months not
-- fully covered by one version, including the February 2026 transition month.
-- Future changes must append versions and close validTo; never replace history.
DO $transport_indemnity$
DECLARE
  proposed_rule jsonb := $json$
  {
    "enabled": true,
    "divisor": 20,
    "versions": [{
      "validFrom": "2026-02-13",
      "validTo": null,
      "fullAmount": 2168.46,
      "reference": "ATN STM nº 935/2026, arts. 1º a 3º; BJM nº 006, de 13/02/2026, p. 407"
    }],
    "normativeLabel": "ATN STM nº 212/2017 • nº 935/2026",
    "info": "Ressarcimento das despesas com veículo particular utilizado em diligências externas pelo Oficial de Justiça Avaliador Federal ou por servidor designado como oficial de justiça ad hoc. O pagamento é integral a partir de 20 dias de serviço externo no mês e proporcional abaixo desse número.",
    "notes": [
      "Considere somente dias elegíveis, já excluídos férias, licenças e demais afastamentos, ainda que considerados de efetivo exercício (art. 3º, § 2º, do ATN STM nº 212/2017).",
      "Exclua os dias impedidos pelo recebimento de diárias, nos termos do art. 4º, § 2º, do ATN STM nº 212/2017, incluído pelo ATN nº 536/2022. Havendo diárias no mês, confira as datas; a coincidência mensal não elimina o direito dos demais dias.",
      "Não são elegíveis a remessa de autos à DPU ou ao MPM para intimação (art. 1º, § 4º), nem o uso de veículo oficial ou suprimento de fundos para essa finalidade (art. 4º).",
      "A simulação não substitui formulário, diligências, certidões e atestação pelo juiz ou diretor exigidos pelo art. 3º do ATN STM nº 212/2017.",
      "IR isento: Decreto nº 9.580/2018, art. 35, I, e. PSS excluído: Lei nº 10.887/2004, art. 4º, § 1º, III. Fora do salário de participação ordinário da Funpresp-Jud.",
      "O valor vigente desde 13/02/2026 não é aplicado automaticamente a competências anteriores ou ao mês de transição sem dados suficientes."
    ],
    "incidences": { "ir": false, "pss": false, "funpresp": false }
  }
  $json$::jsonb;
  current_rule jsonb;
  target_org text;
BEGIN
  LOCK TABLE public.org_config IN SHARE ROW EXCLUSIVE MODE;
  IF NOT EXISTS (SELECT 1 FROM public.org_config WHERE org_slug = 'jmu') THEN
    RAISE EXCEPTION 'Missing JMU org_config: register organ before transport indemnity';
  END IF;
  FOR target_org IN
    SELECT org_slug FROM public.org_config WHERE org_slug IN ('jmu', 'stm')
  LOOP
    SELECT configuration -> 'transport_indemnity' INTO current_rule
      FROM public.org_config WHERE org_slug = target_org;
    IF current_rule IS NOT NULL AND current_rule IS DISTINCT FROM proposed_rule THEN
      RAISE EXCEPTION 'Existing transport indemnity rule for % differs; preserve and review its history', target_org;
    END IF;
    UPDATE public.org_config
      SET configuration = jsonb_set(coalesce(configuration, '{}'::jsonb), '{transport_indemnity}', proposed_rule, true)
      WHERE org_slug = target_org AND current_rule IS NULL;
  END LOOP;
END
$transport_indemnity$;
