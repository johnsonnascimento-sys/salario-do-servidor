# Data-Driven Migration - Guia

**Data:** 25/01/2026
**Status:** COMPLETO
**Versao:** 1.2.0

---

## Resumo

- ConfigService ativo e usado no carregamento da calculadora
- data.ts removido
- Adapter mapEffectiveConfig -> CourtConfig para compatibilidade
- Migration SQL aplicada (global_config, power_config, org_config)

---

## Fluxo Atual

1) UI chama ConfigService.getEffectiveConfig(orgSlug)
2) mapEffectiveConfigToCourtConfig adapta para CourtConfig
3) UI/Calculos usam CourtConfig

---

## Arquivos-chave

- src/services/config/ConfigService.ts
- src/services/config/types.ts
- src/services/config/mapEffectiveConfig.ts
- scripts/audit-project.cjs (fase 3.3 agora automatica)

---

## Observacoes

- Sem fallback para data.ts
- Se ConfigService falhar, fallback para courts table (useCalculatorConfig)

---

## Proximos passos (opcional)

- Validacao de config (schema)
- Admin UI para configs
- Testes unitarios do merge
