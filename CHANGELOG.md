# Changelog

## 2.1.4 - 24/02/2026
- Fix: Calculadora de campo não fecha mais ao focar/clicar no próprio painel.
- UX: Regra visual de desconto padronizada no "Resumo bruto calculado" de todos os cards (`(-)` + cor de desconto).
- Feat: Diárias com calendário oficial STM/JMU 2026 exibido no card e detalhamento de dias não descontados.
- Feat: Exibição da diária do ministro no card de diárias.
- Feat: Resumo de diárias com detalhamento de adicional de embarque e descontos de auxílio separados por diária inteira/meia diária.
- Feat: Regras de diárias movidas para configuração data-driven com metadados de calendário e flags de retorno:
  - `return_day_half_diem_business_day`
  - `return_day_half_discount_business_day`
- Fix: Regra de retorno ajustada:
  - meia diária mantida também em retorno em fim de semana/feriado;
  - meio desconto de auxílios aplicado apenas em retorno em dia útil.
- Data: Correção da configuração ativa de feriados no banco para garantir reconhecimento de feriados (ex.: 07/09/2026).
- Data: Migrações adicionadas:
  - `009_fix_jmu_holidays_source_and_dailies_rules.sql`
  - `010_add_jmu_holiday_calendar_metadata.sql`
  - `011_enable_jmu_return_half_day_rules.sql`

## 2.1.3 - 24/02/2026
- Feat: Calculadora simples agora abre ancorada ao campo focado, com controle de mostrar/ocultar.
- Feat: Referência de mês/ano passou a ser limitada dinamicamente ao intervalo em que há dados completos (IR, PSS, benefícios e referência salarial), sem hardcode de data.
- Feat: Aplicada regra proporcional do STM para mês de transição do auxílio-alimentação (com detalhamento explícito na rubrica).
- UX: Barra mobile inferior simplificada para exibir apenas ações de exportação e versão.

## 2.1.2 - 23/02/2026
- UX: Card de `Adicional de Qualificacao` movido para ficar entre `Base obrigatoria` e `Configuracoes tributarias`.
- UX: Rubricas pre-definidas adicionadas agora entram no topo da lista (primeiro card), em vez de no final.

## 2.1.1 - 23/02/2026
- Feat: Exibir resumo bruto calculado dentro de cada card de rubrica pre-definida.
- Feat: Detalhamento de substituicao por funcao (ex.: CJ1, CJ3) no proprio card.
- Fix: `PSS em competencia anterior` clicavel e com marcacao automatica de `Incluir na base do PSS`.

## 2.1.0 - 23/02/2026
- Fix: Calculo de EA ajustado para Substituicao/Hora Extra e rubricas manuais.
- Feat: Rubrica manual com suporte a `Exercicio Anterior (EA)`.
- Feat: Separacao de contribuicao previdenciaria retro (`RPPS-EA`) para rubricas manuais.
- Data: `global_config.pss_tables.2026` atualizado conforme Portaria Interministerial MPS/MF no 13/2026.
- Refactor: Consolidacao de ajustes visuais e alinhamento de cards da calculadora.

## 2.0.0 - 25/01/2026
- Feat: Arquitetura Data-Driven completa (JmuService + ConfigService).
- Refactor: Atomizacao da interface (substituicao de Sections por Cards).
- Chore: Remocao de codigo morto e isolamento de scripts de build.
- Fix: Correcao de tipagem estrita no TypeScript.

