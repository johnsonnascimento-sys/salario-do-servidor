-- Review templates, NOT current/historical legal configurations. No publication.
begin;

-- Metadata-only onboarding: independent dailies capability; no salary configuration.
insert into public.org_config(org_slug,org_name,power_name,configuration)
values('jf','Justiça Federal','PJU','{}') on conflict(org_slug) do nothing;
insert into public.dailies_scopes(scope_type,scope_key,label)
values('org','jf','Justiça Federal') on conflict(scope_type,scope_key) do nothing;
insert into public.dailies_org_memberships(org_slug,branch_key)
values('jf','CJF') on conflict(org_slug) do nothing;

insert into public.dailies_versions(scope_id,payload,reason,status,valid_from,valid_to)
select id, '{
  "sources": {
    "stm_799_annex": {
      "title": "ATN STM 799/2024 consolidado: anexos I e II; revisão de alterações e vigência pendente",
      "url": "https://www2.stm.jus.br/sislegis/index.php/ctrl_publico_pdf/visualizar/34428-ATN-000799_13-11-2024_STM_1.pdf",
      "article": "Anexo I (percentuais nacionais); parâmetro monetário STF e datas ainda pendentes"
    }
  },
  "rates": {
    "ministro": {"kind":"reference_percent","reference":"stf_nacional","percent":100,"currency":"BRL","source_ids":["stm_799_annex"]},
    "juiz": {"kind":"category_percent","category":"ministro","percent":95,"currency":"BRL","source_ids":["stm_799_annex"]},
    "cj": {"kind":"category_percent","category":"ministro","percent":60,"currency":"BRL","source_ids":["stm_799_annex"]},
    "analista": {"kind":"category_percent","category":"ministro","percent":55,"currency":"BRL","source_ids":["stm_799_annex"]},
    "tecnico": {"kind":"category_percent","category":"ministro","percent":45,"currency":"BRL","source_ids":["stm_799_annex"]}
  }
}'::jsonb,
  'MODELO PARA REVISÃO: percentuais do Anexo I do ATN 799; CJ corresponde somente aos demais cargos em comissão. Completar enquadramentos especiais/FC, referência STF, limites orçamentários, regras e vigências comprovadas. Não representa versão vigente.',
  'draft',null,null
from public.dailies_scopes where scope_type='branch' and scope_key='JMU';

insert into public.dailies_versions(scope_id,payload,reason,status,valid_from,valid_to)
select id, '{
  "sources": {
    "cjf_340_art10": {
      "title": "Resolução CJF 340/2015 consolidada: art. 10; revisão de alterações e vigência pendente",
      "url": "https://www.cjf.jus.br/publico/biblioteca/Res%20340-2015%20alt.pdf",
      "article": "Art. 10, I a V; referência monetária STF e datas ainda pendentes"
    }
  },
  "rates": {
    "membro_cjf": {"kind":"reference_percent","reference":"stf_nacional","percent":100,"currency":"BRL","source_ids":["cjf_340_art10"]},
    "desembargador": {"kind":"reference_percent","reference":"stf_nacional","percent":95,"currency":"BRL","source_ids":["cjf_340_art10"]},
    "juiz": {"kind":"category_percent","category":"desembargador","percent":95,"currency":"BRL","source_ids":["cjf_340_art10"]},
    "cj": {"kind":"reference_percent","reference":"stf_nacional","percent":55,"currency":"BRL","source_ids":["cjf_340_art10"]},
    "analista": {"kind":"reference_percent","reference":"stf_nacional","percent":55,"currency":"BRL","source_ids":["cjf_340_art10"]},
    "fc": {"kind":"reference_percent","reference":"stf_nacional","percent":45,"currency":"BRL","source_ids":["cjf_340_art10"]},
    "tecnico": {"kind":"reference_percent","reference":"stf_nacional","percent":45,"currency":"BRL","source_ids":["cjf_340_art10"]}
  }
}'::jsonb,
  'MODELO PARA REVISÃO: percentuais art.10 CJF340. Juiz corresponde a 95% da diária do membro de TRF (95% STF), não a 95% direto do STF. Completar hipóteses especiais, referência STF, limites, regras e vigências comprovadas. Não representa versão vigente.',
  'draft',null,null
from public.dailies_scopes where scope_type='branch' and scope_key='CJF';

commit;
