-- Candidato local revisável; não executar automaticamente em produção.
-- Fonte canônica: supabase/seeds/pju_pension_catalog_2026.json (ver teste de igualdade).
-- Catálogo/regras internas usam fim exclusivo; power_config conserva fim inclusivo.
begin;
do $migration$
declare
  seed jsonb := $pension_seed$
{
  "seed_id": "pju-funpresp-catalog-2026-11-05",
  "power_name": "PJU",
  "config_key": "previdencia_complementar",
  "valid_from": "2026-11-05",
  "reviewed_at": "2026-11-05",
  "coverage": {
    "catalog_from": "2026-01",
    "catalog_to": "2027-01",
    "historical_from": "2026-04",
    "historical_to": "2027-01",
    "pss_table": "2026"
  },
  "limitations": [
    "Candidato local para revisão administrativa; não aplicar automaticamente em produção.",
    "O catálogo inicial cobre apenas competências de 2026. GAS, GAE, AQ de treinamento e verbas não classificadas exigem enquadramento específico.",
    "Não há regra histórica nova para janeiro a março de 2026 nem para outros exercícios; não usar parâmetros atuais como fallback.",
    "A tabela URP consultada em 05/11/2026 ainda não publica novembro/2026. Não inferir valores ausentes.",
    "A tabela específica de URP prevalece sobre exemplos comerciais desatualizados: julho/2026 é 204.66, não 202.98.",
    "Incidências gerais mensais já configuradas pelo órgão não são alteradas por este candidato; o novo catálogo trata rubricas manuais.",
    "Custos de carregamento e FCBE são destinação interna, não um segundo desconto do servidor."
  ],
  "source_documents": [
    {
      "id": "lei_12618",
      "url": "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2012/lei/l12618.htm",
      "provision": "art. 16, caput e §§ 1º a 4º"
    },
    {
      "id": "lei_10887",
      "url": "https://www2.camara.leg.br/legin/fed/lei/2004/lei-10887-18-junho-2004-532688-normaatualizada-pl.html",
      "provision": "art. 4º, § 1º, caput e incisos I e V"
    },
    {
      "id": "lei_11416",
      "url": "https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2006/lei/l11416.htm",
      "provision": "arts. 11 e 13"
    },
    {
      "id": "regulamento",
      "url": "https://www.funprespjud.com.br/wp-content/uploads/2021/09/Plano-de-Beneficios-FunprespJud_2018.pdf",
      "provision": "arts. 14 e 15"
    },
    {
      "id": "resolucao_conjunta_1_2015",
      "url": "https://www.trt2.jus.br/geral/tribunal2/Trib_Sup/STF/Resol/1_15.html",
      "provision": "arts. 6º e 8º"
    },
    {
      "id": "custeio_2026",
      "url": "https://www.funprespjud.com.br/wp-content/uploads/2026/03/parecer-atuarial-2025-130226.pdf",
      "provision": "item 10, tabela 9, página 8"
    },
    {
      "id": "urp",
      "url": "https://www.funprespjud.com.br/urp/index.php",
      "provision": "tabela publicada; consulta em 05/11/2026"
    }
  ],
  "urp_publication_dates": {
    "2024-11": "2024-11-08",
    "2025-11": "2025-11-11",
    "2026-01": "2026-01-09",
    "2026-02": "2026-02-10",
    "2026-03": "2026-03-12",
    "2026-04": "2026-04-10",
    "2026-05": "2026-05-12",
    "2026-06": "2026-06-12",
    "2026-07": "2026-07-10",
    "2026-08": "2026-08-11",
    "2026-09": "2026-09-11",
    "2026-10": "2026-10-09"
  },
  "config_value": {
    "enabled": true,
    "scope": "patrocinado_vinculado",
    "sponsored_rate": {
      "min": 0.065,
      "max": 0.085,
      "step": 0.005,
      "default_rpc": 0.085
    },
    "linked_rate": {
      "min": 0.065,
      "max": 0.22,
      "step": 0.005
    },
    "facultative_rate": {
      "min_if_positive": 0.025,
      "default": 0
    },
    "minimum_urp_units": 10,
    "urp_by_competence": {
      "2024-11": 188.19,
      "2025-11": 197,
      "2026-01": 198,
      "2026-02": 198.66,
      "2026-03": 200.05,
      "2026-04": 201.81,
      "2026-05": 203.16,
      "2026-06": 204.34,
      "2026-07": 204.66,
      "2026-08": 204.81,
      "2026-09": 204.15,
      "2026-10": 205.83
    },
    "urp_sources_by_competence": {
      "2024-11": "https://www.funprespjud.com.br/urp/index.php",
      "2025-11": "https://www.funprespjud.com.br/urp/index.php",
      "2026-01": "https://www.funprespjud.com.br/urp/index.php",
      "2026-02": "https://www.funprespjud.com.br/urp/index.php",
      "2026-03": "https://www.funprespjud.com.br/urp/index.php",
      "2026-04": "https://www.funprespjud.com.br/urp/index.php",
      "2026-05": "https://www.funprespjud.com.br/urp/index.php",
      "2026-06": "https://www.funprespjud.com.br/urp/index.php",
      "2026-07": "https://www.funprespjud.com.br/urp/index.php",
      "2026-08": "https://www.funprespjud.com.br/urp/index.php",
      "2026-09": "https://www.funprespjud.com.br/urp/index.php",
      "2026-10": "https://www.funprespjud.com.br/urp/index.php"
    },
    "base_rule": "excedente_teto_rgps",
    "include_thirteenth": true,
    "rubric_catalog": [
      {
        "id": "vencimento_basico",
        "label": "Vencimento básico",
        "classification": "obrigatoria",
        "valid_from": "2026-01",
        "valid_to": "2027-01",
        "source": "https://www2.camara.leg.br/legin/fed/lei/2004/lei-10887-18-junho-2004-532688-normaatualizada-pl.html"
      },
      {
        "id": "gaj",
        "label": "Gratificação Judiciária (GAJ)",
        "classification": "obrigatoria",
        "valid_from": "2026-01",
        "valid_to": "2027-01",
        "source": "https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2006/lei/l11416.htm"
      },
      {
        "id": "fc_cj",
        "label": "Função de confiança / cargo em comissão (FC/CJ)",
        "classification": "facultativa",
        "valid_from": "2026-01",
        "valid_to": "2027-01",
        "source": "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2012/lei/l12618.htm"
      },
      {
        "id": "local_trabalho",
        "label": "Parcela remuneratória decorrente do local de trabalho",
        "classification": "facultativa",
        "valid_from": "2026-01",
        "valid_to": "2027-01",
        "source": "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2012/lei/l12618.htm"
      },
      {
        "id": "auxilio_alimentacao",
        "label": "Auxílio-alimentação",
        "classification": "excluida",
        "valid_from": "2026-01",
        "valid_to": "2027-01",
        "source": "https://www2.camara.leg.br/legin/fed/lei/2004/lei-10887-18-junho-2004-532688-normaatualizada-pl.html"
      },
      {
        "id": "diarias",
        "label": "Diárias de viagem",
        "classification": "excluida",
        "valid_from": "2026-01",
        "valid_to": "2027-01",
        "source": "https://www2.camara.leg.br/legin/fed/lei/2004/lei-10887-18-junho-2004-532688-normaatualizada-pl.html"
      },
      {
        "id": "gas",
        "label": "GAS — exige enquadramento específico",
        "classification": "pendente",
        "valid_from": "2026-01",
        "valid_to": "2027-01",
        "source": "https://www.trt2.jus.br/geral/tribunal2/Trib_Sup/STF/Resol/1_15.html"
      },
      {
        "id": "gae",
        "label": "GAE — exige enquadramento específico",
        "classification": "pendente",
        "valid_from": "2026-01",
        "valid_to": "2027-01",
        "source": "https://www.trt2.jus.br/geral/tribunal2/Trib_Sup/STF/Resol/1_15.html"
      },
      {
        "id": "aq_treinamento",
        "label": "AQ de treinamento — exige enquadramento específico",
        "classification": "pendente",
        "valid_from": "2026-01",
        "valid_to": "2027-01",
        "source": "https://www.trt2.jus.br/geral/tribunal2/Trib_Sup/STF/Resol/1_15.html"
      },
      {
        "id": "outra_nao_classificada",
        "label": "Outra verba — enquadramento ainda não cadastrado",
        "classification": "pendente",
        "valid_from": "2026-01",
        "valid_to": "2027-01",
        "source": "https://www.trt2.jus.br/geral/tribunal2/Trib_Sup/STF/Resol/1_15.html"
      }
    ],
    "costing_disclosure": {
      "loading_normal": 0.0325,
      "loading_facultative": 0,
      "fcbe_share_of_normal": 0.1348,
      "admin_remido_assistido": 0.0028,
      "effective_from": "2026-04-01"
    },
    "references": {
      "regulamento_version": "2018; arts. 14 e 15",
      "regulamento_url": "https://www.funprespjud.com.br/wp-content/uploads/2021/09/Plano-de-Beneficios-FunprespJud_2018.pdf",
      "base_legal_url": "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2012/lei/l12618.htm",
      "minimum_annual_url": "https://www.trt2.jus.br/geral/tribunal2/Trib_Sup/STF/Resol/1_15.html",
      "plano_custeio_ref": "2026; vigência 01/04/2026 a 31/03/2027",
      "plano_custeio_url": "https://www.funprespjud.com.br/wp-content/uploads/2026/03/parecer-atuarial-2025-130226.pdf",
      "reviewed_at": "2026-11-05",
      "seed_id": "pju-funpresp-catalog-2026-11-05"
    },
    "historical_rules": [
      {
        "id": "pju-jud-2026-04",
        "valid_from": "2026-04",
        "valid_to": "2027-01",
        "source": "https://www.funprespjud.com.br/wp-content/uploads/2026/03/parecer-atuarial-2025-130226.pdf",
        "tabela_pss": "2026",
        "configuration": {
          "enabled": true,
          "scope": "patrocinado_vinculado",
          "sponsored_rate": {
            "min": 0.065,
            "max": 0.085,
            "step": 0.005,
            "default_rpc": 0.085
          },
          "linked_rate": {
            "min": 0.065,
            "max": 0.22,
            "step": 0.005
          },
          "facultative_rate": {
            "min_if_positive": 0.025,
            "default": 0
          },
          "minimum_urp_units": 10,
          "urp_by_competence": {
            "2024-11": 188.19,
            "2025-11": 197,
            "2026-01": 198,
            "2026-02": 198.66,
            "2026-03": 200.05,
            "2026-04": 201.81,
            "2026-05": 203.16,
            "2026-06": 204.34,
            "2026-07": 204.66,
            "2026-08": 204.81,
            "2026-09": 204.15,
            "2026-10": 205.83
          },
          "urp_sources_by_competence": {
            "2024-11": "https://www.funprespjud.com.br/urp/index.php",
            "2025-11": "https://www.funprespjud.com.br/urp/index.php",
            "2026-01": "https://www.funprespjud.com.br/urp/index.php",
            "2026-02": "https://www.funprespjud.com.br/urp/index.php",
            "2026-03": "https://www.funprespjud.com.br/urp/index.php",
            "2026-04": "https://www.funprespjud.com.br/urp/index.php",
            "2026-05": "https://www.funprespjud.com.br/urp/index.php",
            "2026-06": "https://www.funprespjud.com.br/urp/index.php",
            "2026-07": "https://www.funprespjud.com.br/urp/index.php",
            "2026-08": "https://www.funprespjud.com.br/urp/index.php",
            "2026-09": "https://www.funprespjud.com.br/urp/index.php",
            "2026-10": "https://www.funprespjud.com.br/urp/index.php"
          },
          "base_rule": "excedente_teto_rgps",
          "include_thirteenth": true,
          "rubric_catalog": [
            {
              "id": "vencimento_basico",
              "label": "Vencimento básico",
              "classification": "obrigatoria",
              "valid_from": "2026-01",
              "valid_to": "2027-01",
              "source": "https://www2.camara.leg.br/legin/fed/lei/2004/lei-10887-18-junho-2004-532688-normaatualizada-pl.html"
            },
            {
              "id": "gaj",
              "label": "Gratificação Judiciária (GAJ)",
              "classification": "obrigatoria",
              "valid_from": "2026-01",
              "valid_to": "2027-01",
              "source": "https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2006/lei/l11416.htm"
            },
            {
              "id": "fc_cj",
              "label": "Função de confiança / cargo em comissão (FC/CJ)",
              "classification": "facultativa",
              "valid_from": "2026-01",
              "valid_to": "2027-01",
              "source": "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2012/lei/l12618.htm"
            },
            {
              "id": "local_trabalho",
              "label": "Parcela remuneratória decorrente do local de trabalho",
              "classification": "facultativa",
              "valid_from": "2026-01",
              "valid_to": "2027-01",
              "source": "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2012/lei/l12618.htm"
            },
            {
              "id": "auxilio_alimentacao",
              "label": "Auxílio-alimentação",
              "classification": "excluida",
              "valid_from": "2026-01",
              "valid_to": "2027-01",
              "source": "https://www2.camara.leg.br/legin/fed/lei/2004/lei-10887-18-junho-2004-532688-normaatualizada-pl.html"
            },
            {
              "id": "diarias",
              "label": "Diárias de viagem",
              "classification": "excluida",
              "valid_from": "2026-01",
              "valid_to": "2027-01",
              "source": "https://www2.camara.leg.br/legin/fed/lei/2004/lei-10887-18-junho-2004-532688-normaatualizada-pl.html"
            },
            {
              "id": "gas",
              "label": "GAS — exige enquadramento específico",
              "classification": "pendente",
              "valid_from": "2026-01",
              "valid_to": "2027-01",
              "source": "https://www.trt2.jus.br/geral/tribunal2/Trib_Sup/STF/Resol/1_15.html"
            },
            {
              "id": "gae",
              "label": "GAE — exige enquadramento específico",
              "classification": "pendente",
              "valid_from": "2026-01",
              "valid_to": "2027-01",
              "source": "https://www.trt2.jus.br/geral/tribunal2/Trib_Sup/STF/Resol/1_15.html"
            },
            {
              "id": "aq_treinamento",
              "label": "AQ de treinamento — exige enquadramento específico",
              "classification": "pendente",
              "valid_from": "2026-01",
              "valid_to": "2027-01",
              "source": "https://www.trt2.jus.br/geral/tribunal2/Trib_Sup/STF/Resol/1_15.html"
            },
            {
              "id": "outra_nao_classificada",
              "label": "Outra verba — enquadramento ainda não cadastrado",
              "classification": "pendente",
              "valid_from": "2026-01",
              "valid_to": "2027-01",
              "source": "https://www.trt2.jus.br/geral/tribunal2/Trib_Sup/STF/Resol/1_15.html"
            }
          ],
          "costing_disclosure": {
            "loading_normal": 0.0325,
            "loading_facultative": 0,
            "fcbe_share_of_normal": 0.1348,
            "admin_remido_assistido": 0.0028,
            "effective_from": "2026-04-01"
          },
          "references": {
            "regulamento_version": "2018; arts. 14 e 15",
            "regulamento_url": "https://www.funprespjud.com.br/wp-content/uploads/2021/09/Plano-de-Beneficios-FunprespJud_2018.pdf",
            "base_legal_url": "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2012/lei/l12618.htm",
            "minimum_annual_url": "https://www.trt2.jus.br/geral/tribunal2/Trib_Sup/STF/Resol/1_15.html",
            "plano_custeio_ref": "2026; vigência 01/04/2026 a 31/03/2027",
            "plano_custeio_url": "https://www.funprespjud.com.br/wp-content/uploads/2026/03/parecer-atuarial-2025-130226.pdf",
            "reviewed_at": "2026-11-05",
            "seed_id": "pju-funpresp-catalog-2026-11-05"
          },
          "incidence_rules": {
            "fc": true,
            "gas": false,
            "gae": false,
            "aqTreino": false
          }
        }
      }
    ]
  }
}
$pension_seed$::jsonb;
  previous public.power_config%rowtype;
  existing public.power_config%rowtype;
  candidate jsonb;
  catalog jsonb;
  history jsonb;
  incoming jsonb;
  saved jsonb;
  entry record;
  pss jsonb;
  effective_date date := (seed->>'valid_from')::date;
begin
  perform pg_advisory_xact_lock(hashtext('PJU:previdencia_complementar'));
  if (select count(*) from public.power_config where power_name='PJU'
    and config_key='previdencia_complementar' and valid_to is null) > 1 then
    raise exception 'Mais de uma configuração previdenciária PJU ativa; revisar antes de versionar';
  end if;
  select * into existing from public.power_config where power_name='PJU'
    and config_key='previdencia_complementar' and valid_from=effective_date for update;
  if found then
    if existing.config_value #>> '{references,seed_id}' = seed->>'seed_id' then
      return; -- idempotência: nunca reescrever versão posteriormente revisada no admin
    end if;
    raise exception 'Já existe versão PJU na data do candidato; revisar conflito sem sobrescrever';
  end if;
  select * into previous from public.power_config where power_name='PJU'
    and config_key='previdencia_complementar' and valid_to is null for update;
  if found and previous.valid_from >= effective_date then
    raise exception 'A versão ativa é posterior ao candidato; revisar vigências';
  end if;

  -- O histórico referencia a chave efetivamente consumida por CourtConfig.historico_pss.
  if (select count(*) from public.global_config where config_key='pss_tables'
    and valid_to is null) <> 1 then
    raise exception 'Tabela global de PSS ausente ou ambígua; revisar antes de versionar';
  end if;
  select config_value into pss from public.global_config
    where config_key='pss_tables' and valid_to is null;
  if not (pss ? (seed #>> '{coverage,pss_table}')) or
    jsonb_typeof(pss #> array[seed #>> '{coverage,pss_table}', 'rates']) is distinct from 'array' then
    raise exception 'Tabela PSS referenciada no histórico não está cadastrada';
  end if;
  if previous.id is not null and jsonb_typeof(previous.config_value) is distinct from 'object' then
    raise exception 'Configuração anterior inválida; revisar sem sobrescrever';
  end if;
  candidate := coalesce(previous.config_value, '{}'::jsonb);
  if jsonb_typeof(coalesce(candidate->'rubric_catalog','[]'::jsonb)) <> 'array' or
    jsonb_typeof(coalesce(candidate->'historical_rules','[]'::jsonb)) <> 'array' or
    jsonb_typeof(coalesce(candidate->'urp_by_competence','{}'::jsonb)) <> 'object' then
    raise exception 'Catálogo, histórico ou URPs anteriores inválidos; revisar sem sobrescrever';
  end if;
  catalog := coalesce(candidate->'rubric_catalog','[]'::jsonb);
  history := coalesce(candidate->'historical_rules','[]'::jsonb);

  -- Mesmo ID pode ser versionado em períodos distintos; sobreposição divergente exige revisão.
  for incoming in select value from jsonb_array_elements(seed #> '{config_value,rubric_catalog}') loop
    for saved in select value from jsonb_array_elements(catalog) loop
      if saved->>'id' = incoming->>'id' and saved <> incoming and
        saved->>'valid_from' < coalesce(incoming->>'valid_to','9999-12') and
        incoming->>'valid_from' < coalesce(saved->>'valid_to','9999-12') then
        raise exception 'Conflito de catálogo na rubrica %; revisar sem sobrescrever', incoming->>'id';
      end if;
    end loop;
    if not catalog @> jsonb_build_array(incoming) then
      catalog := catalog || jsonb_build_array(incoming);
    end if;
  end loop;
  -- Uma competência deve resolver uma única regra histórica completa.
  for incoming in select value from jsonb_array_elements(seed #> '{config_value,historical_rules}') loop
    for saved in select value from jsonb_array_elements(history) loop
      if saved <> incoming and (saved->>'id' = incoming->>'id' or
        (saved->>'valid_from' < coalesce(incoming->>'valid_to','9999-12') and
         incoming->>'valid_from' < coalesce(saved->>'valid_to','9999-12'))) then
        raise exception 'Conflito de regra histórica %; revisar sem sobrescrever', incoming->>'id';
      end if;
    end loop;
    if not history @> jsonb_build_array(incoming) then
      history := history || jsonb_build_array(incoming);
    end if;
  end loop;
  for entry in select key,value from jsonb_each(seed #> '{config_value,urp_by_competence}') loop
    if candidate->'urp_by_competence' ? entry.key and
      candidate->'urp_by_competence'->entry.key <> entry.value then
      raise exception 'Conflito na URP %; revisar sem sobrescrever', entry.key;
    end if;
  end loop;

  -- O patch omite incidence_rules: preserva as opções gerais do cadastro anterior.
  candidate := candidate || (seed->'config_value') || jsonb_build_object(
    'rubric_catalog',catalog,
    'historical_rules',history,
    'urp_by_competence',coalesce(candidate->'urp_by_competence','{}'::jsonb) ||
      (seed #> '{config_value,urp_by_competence}'),
    'urp_sources_by_competence',coalesce(candidate->'urp_sources_by_competence','{}'::jsonb) ||
      (seed #> '{config_value,urp_sources_by_competence}'),
    'references',coalesce(candidate->'references','{}'::jsonb) || (seed #> '{config_value,references}'));
  if previous.id is not null then
    update public.power_config set valid_to=effective_date-1 where id=previous.id;
  end if;
  insert into public.power_config(power_name,config_key,config_value,valid_from,valid_to)
    values (seed->>'power_name',seed->>'config_key',candidate,effective_date,null);
end $migration$;
commit;
