# Sessão de Trabalho - 23 de Janeiro de 2026

## Resumo Executivo

Trabalhamos na correção de bugs críticos na calculadora de salários após a migração para multi-agência. O problema principal era que os cálculos retornavam R$ 0,00 devido a slugs de agência hardcoded no código e, posteriormente, falta de dados na tabela `org_config`.

## Problemas Identificados e Resolvidos

### 1. ✅ Async/Await Bug (CRÍTICO)
**Problema:** O hook `useCalculatorResults.ts` chamava o serviço `async` sem `await`.
**Solução:** Implementada chamada com IIFE async.

### 2. ✅ Slug Hardcoded em Todos os Módulos (CRÍTICO)
**Problema:** Módulos de cálculo tinham o slug `'jmu'` hardcoded.
**Solução:** Propagação dinâmica do `orgSlug` em toda a cadeia de serviços.

### 3. ✅ Dados Faltando no Banco (PARCIAL)
**Problema:** Tabelas `agencies` e `courts` estavam vazias.
**Solução:** Inserção manual de dados para PJU.

### 4. ✅ Tabela `org_config` Vazia (CRÍTICO - RESOLVIDO EM CODE)
**Problema:** O sistema retornava R$ 0,00 porque não encontrava configuração na tabela `org_config`.
**Diagnóstico:** O script de migração anterior (002) populava `power_config` mas esquecia de criar o vínculo em `org_config`.
**Ação:**
- Criado `migrations/003_populate_org_config.sql`.
- Criado **`MANUAL_MIGRATE.sql`** consolidando tudo para fácil execução.

## Estado Final da Sessão
O código está pronto e corrigido. O banco de dados DEV precisa apenas da execução do script `MANUAL_MIGRATE.sql` para alinhar os dados com a nova arquitetura.

## Próximos Passos (Para Reinício)
1. Executar `MANUAL_MIGRATE.sql` no Supabase DEV.
2. Validar que o cálculo para "Analista A1" retorna valores corretos (~R$ 15k+).
3. Replicar migração para PROD.
