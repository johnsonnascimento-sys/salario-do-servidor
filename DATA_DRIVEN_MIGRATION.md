# Data-Driven Migration - Guia

**Data:** 25/01/2026 15:32
**Status:** COMPLETO
**Versao:** 1.0.0

---

## Resumo

- ConfigService ativo e usado no carregamento da calculadora
- data.ts removido
- Adapter mapEffectiveConfig -> CourtConfig para compatibilidade
- Migration SQL aplicada (global_config, power_config, org_config)
- Modulos JMU usam params.agencyConfig (sem ConfigService nos calculos)
- Reajustes via adjustment_schedule aplicados no service e na UI

---

## Fluxo Atual

1) UI chama ConfigService.getEffectiveConfig(orgSlug)
2) mapEffectiveConfigToCourtConfig adapta para CourtConfig
3) UI/Calculos usam CourtConfig (agencyConfig + adjustment_schedule)

---

## Arquivos-chave

- src/services/config/ConfigService.ts
- src/services/config/types.ts
- src/services/config/mapEffectiveConfig.ts
- scripts/audit-project.cjs (fase 3.3 agora automatica)
- src/services/agency/implementations/jmu/modules/baseCalculations.ts

---

## Observacoes

- Sem fallback para data.ts
- Se ConfigService falhar, fallback para courts table (useCalculatorConfig)

---

## Proximos passos (opcional)

- Validacao de config (schema)
- Admin UI para configs
- Testes unitarios do merge
