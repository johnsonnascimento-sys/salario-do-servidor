-- Shared PJU classifications for the monthly ceiling pilot.
-- Organ activation starts disabled and is preserved on retries.
do $migration$
declare
  rule_key constant text := 'abate_teto_rules';
  candidate constant jsonb := $rules$
{
  "versions": [
    {
      "valid_from": "2026-11-01",
      "valid_to": null,
      "rubrics": {
        "vencimento": {
          "kind": "monthly",
          "provision": "Art. 2º, I, a"
        },
        "gaj": {
          "kind": "monthly",
          "provision": "Art. 2º, I, g"
        },
        "aqTitulo": {
          "kind": "monthly",
          "provision": "Art. 2º, I, f e g"
        },
        "aqTreino": {
          "kind": "monthly",
          "provision": "Art. 2º, I, f e g"
        },
        "fc": {
          "kind": "monthly",
          "provision": "Art. 2º, II, f"
        },
        "gratificacao": {
          "kind": "monthly",
          "provision": "Art. 2º, I, g"
        },
        "vpni": {
          "kind": "monthly",
          "provision": "Art. 2º, I, h, 5"
        },
        "ats": {
          "kind": "monthly",
          "provision": "Art. 2º, I, f"
        },
        "substituicao": {
          "kind": "monthly",
          "provision": "Art. 2º, II, c"
        },
        "abono": {
          "kind": "excluded",
          "provision": "Art. 4º, IV"
        },
        "auxAlimentacao": {
          "kind": "excluded",
          "provision": "Art. 4º, I, b"
        },
        "auxPreEscolar": {
          "kind": "excluded",
          "provision": "Art. 4º, III, a"
        },
        "auxTransporte": {
          "kind": "excluded",
          "provision": "Art. 4º, I, g"
        },
        "diarias": {
          "kind": "excluded",
          "provision": "Art. 4º, I, d"
        },
        "indenizacaoTransporte": {
          "kind": "excluded",
          "provision": "Art. 4º, I, i"
        },
        "ferias": {
          "kind": "separate",
          "provision": "Art. 3º, I e III"
        },
        "decimoTerceiro": {
          "kind": "separate",
          "provision": "Art. 3º, II"
        },
        "horasExtras": {
          "kind": "separate",
          "provision": "Art. 3º, IV"
        }
      },
      "source": "https://atos.cnj.jus.br/atos/detalhar/178"
    }
  ]
}
  $rules$::jsonb;
  organ_candidate constant jsonb := '{"versions":[{"enabled":false,"valid_from":"2026-11-01","valid_to":null}]}'::jsonb;
  active_count integer;
  existing jsonb;
  act jsonb;
begin
  lock table public.power_config, public.org_config, public.normative_acts in share row exclusive mode;
  select count(*) into active_count from public.power_config
    where power_name = 'PJU' and config_key = rule_key and valid_to is null;
  if active_count > 1 then
    raise exception 'Há mais de uma configuração PJU ativa de abate-teto';
  elsif active_count = 1 then
    select config_value into strict existing from public.power_config
      where power_name = 'PJU' and config_key = rule_key and valid_to is null;
    if existing is distinct from candidate then
      raise exception 'A matriz PJU de abate-teto diverge do cadastro preparado';
    end if;
  else
    if exists (select 1 from public.power_config where power_name = 'PJU' and config_key = rule_key) then
      raise exception 'Há histórico PJU de abate-teto sem versão ativa';
    end if;
    insert into public.power_config (power_name, config_key, config_value, valid_from, valid_to)
      values ('PJU', rule_key, candidate, date '2026-11-26', null);
  end if;

  if (select count(*) from public.org_config where org_slug in ('jmu', 'cjf') and power_name = 'PJU') <> 2 then
    raise exception 'JMU e CJF devem estar cadastrados e vinculados ao PJU antes de preparar o piloto';
  end if;

  update public.org_config
    set configuration = jsonb_set(coalesce(configuration, '{}'::jsonb),
      '{abate_teto_activation}', organ_candidate),
      updated_at = now()
    where org_slug in ('jmu', 'cjf')
      and not (coalesce(configuration, '{}'::jsonb) ? 'abate_teto_activation');

  -- Preserve reviewed fichas. Existing acts are revised through the administrative panel.
  for act in select value from jsonb_array_elements($acts$
[
  {
    "issuer": "CNJ",
    "kind": "Resolução",
    "number": "14",
    "year": "2006",
    "summary": "Dispõe sobre a aplicação do teto remuneratório constitucional para os servidores do Poder Judiciário e para a magistratura dos Estados que não adotam o subsídio.",
    "source": "https://atos.cnj.jus.br/atos/detalhar/178",
    "publication": "2006-03-30",
    "validFrom": "2006-03-30",
    "validTo": "",
    "checkedOn": "2026-11-26",
    "archived": false,
    "notes": "Fonte compilada com alterações das Resoluções 42/2007, 326/2020, 517/2023 e 607/2024. Efeitos do piloto em 11/2026 identificam a cobertura implementada, sem redefinir a vigência da norma.",
    "applications": [
      {
        "subject": "Abate-teto mensal",
        "rule": "Base mensal do abate-teto no piloto",
        "provision": "Arts. 1º a 4º",
        "from": "2026-11-01",
        "to": "",
        "impact": "Classifica a base mensal, exclusões e apurações separadas. Ativação posterior por órgão e competência.",
        "status": "update",
        "evidence": "power_config(PJU).abate_teto_rules e org_config.configuration.abate_teto_activation",
        "id": "17d6caa6-3720-4f18-bc17-f4e1f7ab6301",
        "org": "jmu"
      },
      {
        "subject": "Abate-teto mensal",
        "rule": "Base mensal do abate-teto no piloto",
        "provision": "Arts. 1º a 4º",
        "from": "2026-11-01",
        "to": "",
        "impact": "Classifica a base mensal, exclusões e apurações separadas. Ativação posterior por órgão e competência.",
        "status": "update",
        "evidence": "power_config(PJU).abate_teto_rules e org_config.configuration.abate_teto_activation",
        "id": "17d6caa6-3720-4f18-bc17-f4e1f7ab6302",
        "org": "cjf"
      }
    ],
    "relations": []
  },
  {
    "issuer": "STF",
    "kind": "Tema de repercussão geral",
    "number": "639",
    "year": "2015",
    "summary": "Definição do montante remuneratório recebido por servidores públicos, para fins de incidência do teto constitucional.",
    "source": "https://portal.stf.jus.br/jurisprudenciaRepercussao/tema.asp?num=639",
    "publication": "2015-06-29",
    "validFrom": "",
    "validTo": "",
    "checkedOn": "2026-11-26",
    "archived": false,
    "notes": "RE 675978. Publicação do acórdão em 29/06/2015 e trânsito em julgado em 14/08/2015. Publicação de acórdão não é nova vigência legislativa.",
    "applications": [
      {
        "subject": "Abate-teto mensal",
        "rule": "Retenções após o abate-teto",
        "provision": "Tese do Tema 639",
        "from": "2026-11-01",
        "to": "",
        "impact": "Apura o excesso sobre a base bruta antes da incidência de IRRF e RPPS.",
        "status": "update",
        "evidence": "power_config(PJU).abate_teto_rules e org_config.configuration.abate_teto_activation",
        "id": "17d6caa6-3720-4f18-bc17-f4e1f7ab6303",
        "org": "jmu"
      },
      {
        "subject": "Abate-teto mensal",
        "rule": "Retenções após o abate-teto",
        "provision": "Tese do Tema 639",
        "from": "2026-11-01",
        "to": "",
        "impact": "Apura o excesso sobre a base bruta antes da incidência de IRRF e RPPS.",
        "status": "update",
        "evidence": "power_config(PJU).abate_teto_rules e org_config.configuration.abate_teto_activation",
        "id": "17d6caa6-3720-4f18-bc17-f4e1f7ab6304",
        "org": "cjf"
      }
    ],
    "relations": []
  },
  {
    "issuer": "STM",
    "kind": "Ato Normativo",
    "number": "863",
    "year": "2025",
    "summary": "Fixa diretrizes para o controle da acumulação de subsídio, remuneração, proventos e pensões na Justiça Militar da União.",
    "source": "https://www2.stm.jus.br/sislegis/index.php/ctrl_publico_pdf/visualizar/35441-ATN-000863_16-06-2025_STM_1.pdf",
    "publication": "2025-06-18",
    "validFrom": "2025-06-18",
    "validTo": "",
    "checkedOn": "2026-11-26",
    "archived": false,
    "notes": "Publicação comprovada pela ficha SISLEGIS 35441: BJM n. 23, p. 1821–1825, 18/06/2025. Alterado pelo ATN 936/2026 nos arts. 5º a 7º, fora do recorte de vínculo único. Art. 9º preservado no consolidado. Ficha: https://www2.stm.jus.br/sislegis/index.php/ctrl_publico_extranet/link_detalhar_textual/35441",
    "applications": [
      {
        "subject": "Abate-teto mensal",
        "rule": "Ordem local dos descontos obrigatórios",
        "provision": "Arts. 2º, parágrafo único, 9º e 18",
        "from": "2026-11-01",
        "to": "",
        "impact": "Apura os descontos obrigatórios após retirar o excesso ao teto; cobertura implementada desde 11/2026.",
        "status": "update",
        "evidence": "power_config(PJU).abate_teto_rules e org_config.configuration.abate_teto_activation",
        "id": "17d6caa6-3720-4f18-bc17-f4e1f7ab6305",
        "org": "jmu"
      }
    ],
    "relations": []
  }
]
  $acts$::jsonb) loop
    insert into public.normative_acts (document)
    select act
    where not exists (
      select 1 from public.normative_acts n
      where lower(btrim(n.document->>'issuer')) = lower(btrim(act->>'issuer'))
        and lower(btrim(n.document->>'kind')) = lower(btrim(act->>'kind'))
        and replace(btrim(n.document->>'number'), '.', '') = replace(btrim(act->>'number'), '.', '')
        and n.document->>'year' = act->>'year'
    )
    on conflict do nothing;
  end loop;

  -- Record the modifying act without changing previously reviewed records.
  insert into public.normative_acts (document)
  select jsonb_set($amendment$
{
  "issuer": "STM",
  "kind": "Ato Normativo",
  "number": "936",
  "year": "2026",
  "summary": "Altera o Ato Normativo nº 863/2025 sobre a aplicação do teto em casos de acumulação de subsídio, remuneração, proventos e pensões.",
  "source": "https://www2.stm.jus.br/sislegis/index.php/ctrl_publico_extranet/link_detalhar/36535",
  "publication": "2026-02-27",
  "validFrom": "2026-02-27",
  "validTo": "",
  "checkedOn": "2026-11-26",
  "archived": false,
  "notes": "BJM n. 8, p. 554–556, 27/02/2026. A alteração dos arts. 5º a 7º do ATN 863/2025 afeta acumulações e fontes pagadoras, fora do piloto mensal de vínculo único. Art. 9º preservado.",
  "applications": [],
  "relations": []
}
  $amendment$::jsonb, '{relations}', jsonb_build_array(jsonb_build_object(
    'targetId', predecessor.id::text, 'applicationId', '', 'kind', 'amends',
    'provision', 'Arts. 5º a 7º do ATN STM nº 863/2025', 'from', '2026-02-27'
  )))
  from public.normative_acts predecessor
  where lower(btrim(predecessor.document->>'issuer')) = 'stm'
    and lower(btrim(predecessor.document->>'kind')) = 'ato normativo'
    and predecessor.document->>'number' = '863' and predecessor.document->>'year' = '2025'
    and not exists (
      select 1 from public.normative_acts
      where lower(btrim(document->>'issuer')) = 'stm'
        and lower(btrim(document->>'kind')) = 'ato normativo'
        and document->>'number' = '936' and document->>'year' = '2026'
    )
  on conflict do nothing;
end
$migration$;
