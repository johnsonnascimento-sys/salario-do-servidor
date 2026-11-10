-- Indenização de Transporte: Justiça Federal (CJF e TRFs 1 a 6).
-- Normas de regência:
-- 1. Resolução CJF nº 4, de 14/03/2008, Capítulo IV, arts. 54 a 58:
--    - Art. 54: indenização devida pelas despesas com locomoção própria para serviço externo.
--    - Art. 55: valor integral a partir de 20 dias no mês; 1/20 por dia quando inferior;
--      § 2º: indevida quanto aos dias que servirem de base a diárias.
--    - Art. 56: pagamento efetuado no mês seguinte ao da execução do serviço;
--      parágrafo único: exclusão de férias, licenças e afastamentos.
--    - Art. 57: vedação de suprimento de fundos e veículo oficial para a finalidade.
--    - Art. 58: valor único fixado em portaria do Presidente do CJF, com distribuição isonômica.
-- 2. Portaria CJF nº 43, de 22/01/2025 (DOU 13/02/2025, Seção 1, p. 119):
--    - Fixou R$ 2.289,21 para Oficial de Justiça Avaliador Federal, com efeitos a partir de 01/01/2025;
--    - Revogou a Portaria CJF nº 441/2016.
-- 3. Portaria CJF nº 182, de 06/04/2026 (DOU 08/04/2026, Seção 1, p. 177):
--    - Fixou R$ 2.391,30 para Oficial de Justiça Avaliador Federal, em vigor na publicação com efeitos a partir de 01/01/2026;
--    - Revogou a Portaria CJF nº 43/2025.
-- 4. Tributação e incidências:
--    - IR isento: Decreto nº 9.580/2018, art. 35, I, "e".
--    - PSS excluído: Lei nº 10.887/2004, art. 4º, § 1º, III.
--    - Fora do salário de participação ordinário da Funpresp-Jud (Lei nº 12.618/2012).
-- Não aplicar diretamente a produção sem revisão administrativa.
DO $cjf_transport_indemnity$
DECLARE
  proposed_rule jsonb := $json$
  {
    "enabled": true,
    "competenceMode": "previous_month",
    "divisor": 20,
    "versions": [
      {
        "validFrom": "2025-01-01",
        "validTo": "2025-12-31",
        "fullAmount": 2289.21,
        "divisor": 20,
        "incidences": { "ir": false, "pss": false, "funpresp": false },
        "publicationDate": "2025-02-13",
        "financialEffectsFrom": "2025-01-01",
        "normativeLabel": "Res. CJF nº 4/2008 • Portaria nº 43/2025",
        "reference": "Portaria CJF nº 43, de 22/01/2025 (DOU 13/02/2025, Seção 1, p. 119), com efeitos financeiros a partir de 01/01/2025"
      },
      {
        "validFrom": "2026-01-01",
        "validTo": null,
        "fullAmount": 2391.30,
        "divisor": 20,
        "incidences": { "ir": false, "pss": false, "funpresp": false },
        "publicationDate": "2026-04-08",
        "financialEffectsFrom": "2026-01-01",
        "normativeLabel": "Res. CJF nº 4/2008 • Portaria nº 182/2026",
        "reference": "Portaria CJF nº 182, de 06/04/2026 (DOU 08/04/2026, Seção 1, p. 177), com efeitos financeiros a partir de 01/01/2026"
      }
    ],
    "normativeLabel": "Res. CJF nº 4/2008 • Portaria nº 182/2026",
    "info": "Ressarcimento das despesas com veículo particular utilizado em serviço externo pelo Analista Judiciário, Área Judiciária, especialidade Oficial de Justiça Avaliador Federal. O pagamento é realizado no mês seguinte ao da execução do serviço, integral a partir de 20 dias e proporcional (1/20 por dia) abaixo desse número.",
    "notes": [
      "O pagamento é realizado no mês seguinte ao da execução do serviço externo (art. 56 da Resolução CJF nº 4/2008). Os dias informados referem-se ao mês de serviço.",
      "São devidos 20 dias para o valor integral, ou 1/20 por dia de efetiva realização de serviço externo quando inferior a 20 dias (art. 55, caput e § 1º).",
      "Considere apenas dias de efetivo serviço externo, excluindo férias, licenças e demais afastamentos, ainda que considerados em lei como de efetivo exercício (art. 56, parágrafo único).",
      "Não computar os dias que servirem de base para o cálculo de diárias (art. 55, § 2º). A existência de diárias no mês não exclui automaticamente a indenização dos demais dias elegíveis.",
      "É vedada a concessão de suprimento de fundos para tal finalidade, bem como a utilização de veículo oficial (art. 57).",
      "A prestação dos serviços deve ser atestada pelo titular da unidade (art. 56); este cálculo constitui uma simulação.",
      "Portaria CJF nº 182/2026 publicada no DOU em 08/04/2026, com efeitos financeiros a partir de 01/01/2026 (R$ 2.391,30). Período de 2025 regido pela Portaria CJF nº 43/2025 (R$ 2.289,21).",
      "Não incidem IR (Decreto nº 9.580/2018, art. 35, I, 'e'), PSS (Lei nº 10.887/2004, art. 4º, § 1º, III) nem contribuição Funpresp-Jud, nem há desconto sobre auxílio-alimentação."
    ],
    "incidences": { "ir": false, "pss": false, "funpresp": false }
  }
  $json$::jsonb;
  current_rule jsonb;
  target_org text;
  v_slugs text[] := ARRAY['cjf', 'trf1', 'trf2', 'trf3', 'trf4', 'trf5', 'trf6'];
BEGIN
  LOCK TABLE public.org_config IN SHARE ROW EXCLUSIVE MODE;
  FOREACH target_org IN ARRAY v_slugs
  LOOP
    SELECT configuration -> 'transport_indemnity' INTO current_rule
      FROM public.org_config WHERE org_slug = target_org;
    IF current_rule IS NOT NULL AND current_rule IS DISTINCT FROM proposed_rule THEN
      RAISE EXCEPTION 'Existing transport indemnity rule for % differs; preserve and review its history', target_org;
    END IF;
    UPDATE public.org_config
      SET configuration = jsonb_set(coalesce(configuration, '{}'::jsonb), '{transport_indemnity}', proposed_rule, true)
      WHERE org_slug = target_org AND (current_rule IS NULL OR current_rule IS DISTINCT FROM proposed_rule);
  END LOOP;
END
$cjf_transport_indemnity$;
