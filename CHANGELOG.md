# Changelog

## 2.1.7 - 28/02/2026
- Docs: criado `PROJECT_RULES.md` como fonte canonica de regras do projeto.
- Docs: criado `AGENTS.md` apontando para `PROJECT_RULES.md`.
- Docs: limpeza de arquivos `.md` obsoletos e redundantes.

## 2.1.6 - 24/02/2026
- Docs: consolidacao completa das regras funcionais e de UX em `CALCULATOR_RULES.md`.
- Docs: inclusao de `README.md` com guia rapido, arquitetura e mapa de documentacao.
- Docs: normalizacao do `CHANGELOG.md` (estrutura, versoes e texto sem encoding quebrado).

## 2.1.5 - 24/02/2026
- Refactor: melhoria de robustez no fluxo de calculo (protecao contra resposta assincrona obsoleta e tratamento de erro).
- Refactor: exportacao em lazy load para reduzir impacto no bundle inicial.
- Security/Tech: remocao de avaliacao dinamica por `Function(...)` na calculadora de campo.
- UX: `Resumo calculado` dos cards com visual mais discreto e integrado ao layout.
- UX: blocos informativos de diarias com destaque visual reduzido (tons neutros).
- Feat: detalhamento separado em:
  - Holerite (sem diarias)
  - Diarias (pagamento separado)
- Feat: separacao de diarias no detalhamento:
  - `DIARIAS (SEM ADICIONAL DE EMBARQUE)`
  - `ADICIONAL DE EMBARQUE (DIARIAS)`
- Feat: validacao no card de diarias:
  - `Data de fim` deve ser igual ou maior que `Data de inicio`.
- Perf: cache de dados por periodo em calculos base da JMU.
- Tech: ids estaveis em UI e rubricas (`useId` / `crypto.randomUUID` com fallback).

## 2.1.4 - 24/02/2026
- Fix: calculadora de campo nao fecha mais ao focar/clicar no proprio painel.
- Feat: diarias com calendario oficial STM/JMU 2026 exibido no card e detalhamento de dias nao descontados.
- Feat: exibicao da diaria do ministro no card de diarias.
- Feat: resumo de diarias com detalhamento de adicional de embarque e descontos de auxilio separados por diaria inteira/meia diaria.
- Feat: regras de diarias movidas para configuracao data-driven com metadados de calendario e flags de retorno:
  - `return_day_half_diem_business_day`
  - `return_day_half_discount_business_day`
- Fix: regra de retorno ajustada:
  - meia diaria mantida tambem em retorno em fim de semana/feriado;
  - meio desconto de auxilios aplicado apenas em retorno em dia util.
- Data: correcao da configuracao ativa de feriados no banco para garantir reconhecimento de feriados.
- Data: migracoes adicionadas:
  - `009_fix_jmu_holidays_source_and_dailies_rules.sql`
  - `010_add_jmu_holiday_calendar_metadata.sql`
  - `011_enable_jmu_return_half_day_rules.sql`

## 2.1.3 - 24/02/2026
- Feat: calculadora simples abre ancorada ao campo focado, com controle de mostrar/ocultar.
- Feat: referencia de mes/ano limitada dinamicamente ao intervalo com dados completos (IR, PSS, beneficios e referencia salarial).
- Feat: regra proporcional do STM para mes de transicao do auxilio-alimentacao.
- UX: barra mobile inferior simplificada para exportacao.

## 2.1.2 - 23/02/2026
- UX: card de `Adicional de Qualificacao` movido para ficar entre `Base obrigatoria` e `Configuracoes tributarias`.
- UX: rubricas pre-definidas adicionadas no topo da lista.

## 2.1.1 - 23/02/2026
- Feat: exibicao de resumo calculado dentro de cada card de rubrica pre-definida.
- Feat: detalhamento de substituicao por funcao no proprio card.
- Fix: `PSS em competencia anterior` clicavel e com marcacao automatica de `Incluir na base do PSS`.

## 2.1.0 - 23/02/2026
- Fix: calculo de EA ajustado para Substituicao, Hora Extra e rubricas manuais.
- Feat: rubrica manual com suporte a `Exercicio Anterior (EA)`.
- Feat: separacao de contribuicao previdenciaria retro (`RPPS-EA`) para rubricas manuais.
- Data: `global_config.pss_tables.2026` atualizado conforme Portaria Interministerial MPS/MF no 13/2026.
- Refactor: consolidacao de ajustes visuais e alinhamento de cards da calculadora.

## 2.0.0 - 25/01/2026
- Feat: arquitetura data-driven completa (JmuService + ConfigService).
- Refactor: atomizacao da interface (substituicao de Sections por Cards).
- Chore: remocao de codigo morto e isolamento de scripts de build.
- Fix: correcao de tipagem estrita no TypeScript.
