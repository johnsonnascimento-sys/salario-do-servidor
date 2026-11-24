-- Global series for the informational federal ceiling. Article 1 of Law 14.520/2023.
do $migration$
declare
  ceiling_key constant text := 'constitutional_ceiling_reference';
  candidate constant jsonb := $ceiling$
  {
    "versions": [
      {
        "valid_from": "2023-04-01", "valid_to": "2024-01-31", "amount": 41650.92,
        "source": "https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/lei/l14520.htm"
      },
      {
        "valid_from": "2024-02-01", "valid_to": "2025-01-31", "amount": 44008.52,
        "source": "https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/lei/l14520.htm"
      },
      {
        "valid_from": "2025-02-01", "valid_to": null, "amount": 46366.19,
        "source": "https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/lei/l14520.htm"
      }
    ]
  }
  $ceiling$::jsonb;
  active_count integer;
  existing jsonb;
begin
  lock table public.global_config in share row exclusive mode;

  select count(*) into active_count from public.global_config
    where config_key = ceiling_key and valid_to is null;

  if active_count > 1 then
    raise exception 'Há mais de uma série ativa para o teto federal de referência';
  elsif active_count = 1 then
    select config_value into strict existing from public.global_config
      where config_key = ceiling_key and valid_to is null;
    if existing is distinct from candidate then
      raise exception 'A série existente do teto federal de referência diverge do cadastro preparado';
    end if;
  else
    if exists (select 1 from public.global_config where config_key = ceiling_key) then
      raise exception 'Há histórico do teto federal de referência sem versão ativa';
    end if;
    insert into public.global_config (config_key, config_value, valid_from, valid_to)
      values (ceiling_key, candidate, date '2026-11-24', null);
  end if;

  -- Preserve any previous review of this federal law. The panel handles subsequent revisions.
  insert into public.normative_acts (document)
  select $act$
  {
    "issuer": "União", "kind": "Lei", "number": "14.520", "year": "2023",
    "summary": "Fixa o subsídio mensal dos Ministros do Supremo Tribunal Federal.",
    "source": "https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/lei/l14520.htm",
    "publication": "2023-01-10", "validFrom": "2023-01-10", "validTo": "", "checkedOn": "2026-11-24",
    "notes": "Vigência formal na publicação (art. 4º). A série configura os efeitos financeiros sucessivos previstos no art. 1º.",
    "archived": false,
    "applications": [{
      "id": "7127a421-6912-4fe1-8e60-9c7b77754c94",
      "org": "pju", "subject": "Teto remuneratório", "rule": "Subsídio do STF como referência federal",
      "provision": "Art. 1º, incisos I a III", "from": "2023-04-01", "to": "",
      "impact": "Exibe o subsídio de referência vigente na competência selecionada.",
      "status": "update",
      "evidence": "global_config.constitutional_ceiling_reference e passo Competência"
    }],
    "relations": []
  }
  $act$::jsonb
  where not exists (
    select 1 from public.normative_acts
    where lower(btrim(document->>'kind')) = 'lei'
      and replace(btrim(document->>'number'), '.', '') = '14520'
      and document->>'year' = '2023'
      and (document->>'source' = candidate->'versions'->0->>'source'
        or lower(btrim(document->>'issuer')) in ('união', 'presidência da república', 'congresso nacional'))
  )
  on conflict do nothing;
end
$migration$;
