-- Official monetary evidence recovered on 2026-10-27. REVIEW DRAFTS ONLY.
-- A published table is not a complete legal regime: calendars, applicability,
-- temporal trigger, boarding caps and rounding remain unconfigured. The verified
-- CJF benefit divisors/full-day deductions are documented separately; a partial
-- monetary draft must not be mistaken for their complete implementation.
begin;

insert into public.dailies_versions(scope_id,payload,reason,status,valid_from,valid_to)
select id, $cjf596${
  "sources": {
    "cjf596_dou": {
      "title": "CJF Portaria 596/2023 — DOU 181, 21/09/2023, seção 1, p.254",
      "url": "https://www.cjf.jus.br/publico/biblioteca/PPR%20596-2023%20publ%20DOU.pdf",
      "article": "Arts.1º e 3º: valores fixos; art.5º: publicação. Revogada pela CJF315/2026, art.3º.",
      "published_on": "2023-09-21", "effective_from": "2023-09-21", "effective_to": "2026-06-09"
    }
  },
  "rates": {
    "analista": {"kind":"fixed","value":763.60,"currency":"BRL","source_ids":["cjf596_dou"]},
    "cj": {"kind":"fixed","value":763.60,"currency":"BRL","source_ids":["cjf596_dou"]},
    "tecnico": {"kind":"fixed","value":624.76,"currency":"BRL","source_ids":["cjf596_dou"]},
    "fc": {"kind":"fixed","value":624.76,"currency":"BRL","source_ids":["cjf596_dou"]}
  },
  "references": {
    "indenizacao_deslocamento_documentada": {"value":610.88,"currency":"BRL","source_ids":["cjf596_dou"]}
  }
}$cjf596$::jsonb,
  'EVIDÊNCIA MONETÁRIA PARA REVISÃO: tabela fixa nacional CJF596, efeitos21/09/2023, revogação10/06/2026. Somente servidores ordinários. Deslocamento armazenado como referência: não é categoria nem regra de adicional. Faltam regras completas, condições de aplicação, calendário e validação das parcelas/limites. Não publicar isoladamente.',
  'draft','2023-09-21','2026-06-09'
from public.dailies_scopes where scope_type='branch' and scope_key='CJF';

insert into public.dailies_versions(scope_id,payload,reason,status,valid_from,valid_to)
select id, $cjf315${
  "sources": {
    "cjf315_dou": {
      "title": "CJF Portaria315/2026 — DOU106, 10/06/2026, seção1, p.343",
      "url": "https://www.in.gov.br/web/dou/-/portaria-cjf-n-315-de-22-de-maio-de-2026-711403859",
      "article": "Art.1º: tabela e parágrafo único: teto. Art.2º: deslocamento. Arts.3º/4º: revogação596 e efeitos na publicação.",
      "published_on": "2026-06-10", "effective_from": "2026-06-10"
    }
  },
  "rates": {
    "analista": {"kind":"fixed","value":850.04,"currency":"BRL","source_ids":["cjf315_dou"]},
    "cj": {"kind":"fixed","value":850.04,"currency":"BRL","source_ids":["cjf315_dou"]},
    "tecnico": {"kind":"fixed","value":695.49,"currency":"BRL","source_ids":["cjf315_dou"]},
    "fc": {"kind":"fixed","value":695.49,"currency":"BRL","source_ids":["cjf315_dou"]}
  },
  "references": {
    "indenizacao_deslocamento_documentada": {"value":680.00,"currency":"BRL","source_ids":["cjf315_dou"]},
    "teto_nacional_documentado": {"value":1165.27,"currency":"BRL","source_ids":["cjf315_dou"]}
  }
}$cjf315$::jsonb,
  'EVIDÊNCIA MONETÁRIA PARA REVISÃO: tabela fixa nacional CJF315, efeitos10/06/2026. Teto documental1165,27 e deslocamento680,00 mantidos em references até definir alcance/ordem normativos de aplicação. Não importar teto JMU1153,37. Sem magistrados, internacional, condições especiais ou regras completas. Não publicar isoladamente.',
  'draft','2026-06-10',null
from public.dailies_scopes where scope_type='branch' and scope_key='CJF';

insert into public.dailies_versions(scope_id,payload,reason,status,valid_from,valid_to)
select id, $jmu799${
  "sources": {
    "stm799_original": {
      "title": "STM ATN799/2024 original — BJM45, 14/11/2024, p.3513; anexoI",
      "url": "https://www2.stm.jus.br/sislegis/index.php/ctrl_publico_pdf/visualizar/34428-ATN-000799_13-11-2024_STM_0.pdf",
      "article": "AnexoI: valores correntes impressos. Art.27 e nota1: desprezo de frações; conciliação pendente. Art.31: publicação.",
      "published_on": "2024-11-14", "effective_from": "2024-11-14"
    }
  },
  "rates": {
    "analista": {"kind":"fixed","value":806.82,"currency":"BRL","source_ids":["stm799_original"]},
    "cj": {"kind":"fixed","value":880.17,"currency":"BRL","source_ids":["stm799_original"]},
    "tecnico": {"kind":"fixed","value":660.13,"currency":"BRL","source_ids":["stm799_original"]}
  },
  "references": {
    "adicional_embarque_impresso": {"value":586.78,"currency":"BRL","source_ids":["stm799_original"]},
    "teto_nacional_impresso_2024": {"value":1055.22,"currency":"BRL","source_ids":["stm799_original"]}
  }
}$jmu799$::jsonb,
  'TRANSCRIÇÃO PARA REVISÃO, SEM EFICÁCIA DE CÁLCULO: valores impressos no anexoI original799/2024. Inicio corresponde à publicação do documento, NÃO comprova continuidade monetária posterior. Não definida solução para centavos da tabela versus art27. CJ apenas demais cargos em comissão; FC/equipes/magistrados não cobertos. Não publicar sem fechar período/tabelas DILEO e regras.',
  'draft','2024-11-14',null
from public.dailies_scopes where scope_type='branch' and scope_key='JMU';

insert into public.dailies_versions(scope_id,payload,reason,status,valid_from,valid_to)
select id, $jmu926${
  "sources": {
    "stm926_original": {
      "title": "STM ATN926/2026 — BJM03, 23/01/2026, pp.172–173",
      "url": "https://www2.stm.jus.br/sislegis/index.php/ctrl_publico_pdf/visualizar/36340-ATN-000926_15-01-2026_STM_0.pdf",
      "article": "Art.3º: teto1153,37 para2026. Art.10: efeitos na publicação; não retroagir a15/01 nem01/01. ATN947 altera cotas, não art.3º.",
      "published_on": "2026-01-23", "effective_from": "2026-01-23", "effective_to": "2026-12-31"
    }
  },
  "references": {
    "teto_ldo_nacional_documentado_2026": {"value":1153.37,"currency":"BRL","source_ids":["stm926_original"]}
  }
}$jmu926$::jsonb,
  'EVIDÊNCIA DE TETO PARA REVISÃO: ATN926art3 e publicação23/01/2026 comprovados. Exercício2026. ATN947/2026 altera somente cotas dos anexos. Teto em references até definir alcance e ordem normativos; sem tabela monetária JMU2026 confirmada e sem regras completas. Não publicar isoladamente.',
  'draft','2026-01-23','2026-12-31'
from public.dailies_scopes where scope_type='branch' and scope_key='JMU';

commit;
