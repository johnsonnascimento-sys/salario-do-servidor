# Changelog

## 2.1.14 - 05/03/2026
- Feat(Admin): configuracao de `Doacao/Pix` (chave Pix + upload de QR Code) migrada para o painel novo (`/admin`).
- Refactor: removido atalho para painel legado e extinta rota `/admin/legacy`.
- Cleanup: removidos arquivos e rotas do painel antigo de administracao de doacao.
- Cleanup: removidas paginas/rotas da Wiki (`/wiki` e `/wiki/:scope/:articleSlug`) e respectivos links no layout e cabecalho da calculadora.
- Docs: `PROJECT_RULES.md` atualizado para marcar Wiki como descontinuada.

## 2.1.13 - 05/03/2026
- Fix: `Resumo calculado` da Hora Extra passa a ratear IR por card usando a base correta (`heIrMensal` para mensal e `heIrEA` para EA), sem reaproveitar IR de outra incidencia.
- Fix: desconto de IR por card de Hora Extra agora e limitado ao proprio bruto da instancia, evitando liquido negativo por extrapolacao.
- UX: linha de resumo da Hora Extra marcada como EA passa a exibir `Desconto IR-EA (Hora extra)` para evitar ambiguidade.

## 2.1.12 - 05/03/2026
- Fix: detalhamento mobile agora preserva a coluna de valores sem corte, com ajustes responsivos de largura/padding e quebra de texto na rubrica.
- Fix: modal/pagina de apoio tratam QR Code Pix com fallback quando a imagem configurada falha ao carregar.
- Tech: `settingsService.getPixQrCode` passa a normalizar valores legados (URL absoluta, data URL ou caminho no bucket `assets`).
- UX/Admin: painel principal recebe atalho `Doacao/Pix` para abrir rapidamente o painel legado de configuracao de chave e QR.

## 2.1.11 - 05/03/2026
- Fix: detalhamento de `IMPOSTO DE RENDA-EA` deixa de exibir linha generica e passa a separar por rubrica (Hora Extra, Substituicao e rubricas manuais EA).
- Fix: motor de deducoes passa a expor `substitutionIrMensal` e `substitutionIrEA` para composicao correta do detalhamento.

## 2.1.10 - 05/03/2026
- UX: campo de inclusao de rubricas pre-definidas agora sinaliza explicitamente quais cards permitem repeticao.
- UX: badge visual `Multiplo` adicionado nos cards repetiveis para reforcar a regra em tela.
- Docs: `PROJECT_RULES.md` atualizado com secao de governanca para rubricas pre-definidas com multiplas instancias.

## 2.1.9 - 05/03/2026
- Feat: rubrica pre-definida de Hora Extra agora suporta multiplos cards independentes no formulario.
- Feat: cada card de Hora Extra passa a ter incidencia de IR isolada (mensal, EA ou excluida), sem interferencia entre cards.
- Tech: motor de calculo adaptado para processar `overtimeEntries` e consolidar total/IR por entradas separadas.
- UX: resumo calculado de Hora Extra exibido por card, com bruto/liquido por instancia.

## 2.1.8 - 28/02/2026
- Feat: Funpresp no fluxo ativo da calculadora (`DynamicPayrollForm`) com participacao patrocinada, aliquota normal e facultativa.
- Feat: nova chave data-driven `previdencia_complementar` mapeada de `power_config` para `CourtConfig`.
- Fix: normalizacao de unidade de aliquota Funpresp (decimal interno para normal e facultativa) no motor mensal e 13o.
- Tech: novo campo `funprespParticipacao` no estado e contrato interno do motor.
- Data: migracao adicionada `012_add_previdencia_complementar_config.sql`.

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
