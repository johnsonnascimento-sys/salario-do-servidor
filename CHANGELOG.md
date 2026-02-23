# Changelog

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

