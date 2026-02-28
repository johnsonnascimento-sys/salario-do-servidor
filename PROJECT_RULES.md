# PROJECT_RULES

Atualizado em: 28/02/2026

Este e o documento canonico de regras do projeto `salario-do-servidor`.

## 1. Fonte de verdade e escopo

1. Nenhuma aliquota legal, faixa, deducao, teto ou percentual oficial pode ficar hardcoded na UI.
2. Regras de negocio devem vir de configuracao data-driven no banco.
3. O motor oficial de calculo e o **Motor de Calculo por Agencia** (`src/services/agency`).
4. A implementacao de referencia atual em producao e a JMU (`AgencyCalculationEngine` + modulos em `src/services/agency/engine/modules`), sem limitar a arquitetura a esse orgao.
5. A UI apenas coleta entradas, dispara calculo e exibe resultado.
6. Mudancas com impacto em calculo oficial exigem rastreabilidade (`CHANGELOG.md` + commit claro).

## 2. Arquitetura data-driven obrigatoria

### 2.1 Hierarquia de configuracao

Prioridade de merge (menor para maior):

1. `global_config` (regras universais)
2. `power_config` (regras por poder/carreira)
3. `org_config.configuration` (overrides do orgao)

Regra de precedencia: `org > power > global`.

### 2.2 Fluxo oficial em runtime

1. `ConfigService.getEffectiveConfig(orgSlug)` busca:
   - `org_config` (inclui `power_name`)
   - `global_config` ativo (`valid_to IS NULL`)
   - `power_config` ativo por `power_name`
2. O merge e feito por `deepMergeMultiple(global, power, org.configuration)`.
3. O resultado vira `EffectiveConfig` com metadados (`org_slug`, `org_name`, `power_name`).
4. A UI consome o formato adaptado por `mapEffectiveConfigToCourtConfig`.

### 2.3 Vigencia temporal

1. Regras com historico devem usar `valid_from` e `valid_to`.
2. Regra ativa e aquela com `valid_to = NULL`.
3. Mudanca historica deve entrar como novo registro/versionamento, sem destruir historico.

### 2.4 Fallback legado

1. `courts.config` e legado e deve ser usado apenas como fallback tecnico.
2. Nova regra deve ser cadastrada nas tabelas hierarquicas (`*_config`), nao em `courts`.

## 3. Governanca por camada de configuracao

1. `global_config`: impostos e deducoes universais (IR, PSS, deducao por dependente, teto RGPS).
2. `power_config`: bases salariais, beneficios, regras de diaria, regras de folha e catalogos por poder.
3. `org_config`: somente excecoes e overrides locais do orgao.
4. Nao duplicar em `org_config` o que ja e comum ao poder, exceto quando houver diferenca real.

## 4. Regras funcionais da calculadora

### 4.1 Rubricas manuais

Cada rubrica manual deve suportar:

1. Tipo (`C` credito, `D` desconto)
2. Descricao
3. Valor
4. Incidencia em IR
5. Incidencia em IR (EA)
6. Incidencia em PSS
7. Incidencia em PSS (EA)

### 4.2 Descontos e entradas

1. Descontos devem ter estilo visual proprio (sem prefixo textual `(-)`).
2. Campos numericos nao aceitam valor negativo.
3. Em horas extras, nao exibir opcao de incidencia de PSS que nao se aplica.

### 4.3 Gratificacao natalina (13o)

1. Nao cobrar PSS sobre FC/CJ no 13o.
2. Na 2a parcela, considerar base total aplicavel, aplicar abatimento da 1a parcela e concentrar desconto no resumo da 2a.
3. Se marcar 2a parcela, marcar automaticamente a 1a correspondente para evitar base incompleta.
4. Exibir totais brutos e liquidos por parcela.

### 4.4 Diarias

1. Em modo por datas, `data_fim >= data_inicio`.
2. Diarias devem aparecer separadas do bloco de holerite.
3. Adicional de embarque deve aparecer em linha propria.
4. Exibir total de diarias liquidas.

### 4.5 Detalhamento final

1. Separar blocos: `Holerite` e `Diarias`.
2. Ordem de exibicao em cada bloco: creditos antes, debitos depois.
3. Totais de cada bloco devem refletir apenas o proprio bloco.

### 4.6 Mobile

1. No CTA mobile do rodape, usar apenas `Exportar`.
2. A versao pode aparecer no layout, mas nao no texto do CTA.

### 4.7 Regra de compatibilidade

1. O gatilho `Johnson*` e intencional e nao deve ser removido por refatoracao automatica.

## 5. Admin e seguranca operacional

1. Rotas admin: `/admin`, `/admin/global`, `/admin/power`, `/admin/org`.
2. Escrita em configuracao deve passar por fluxo admin e confirmacao de impacto.
3. Politica esperada de acesso:
   - leitura de `*_config` para simulacao
   - escrita restrita a admin/service role

## 6. Regras de manutencao e extensao

1. Novo orgao: criar em `org_config` com `power_name` correto e overrides minimos.
2. Novo poder/carreira: adicionar chaves necessarias em `power_config`.
3. Nova regra global: adicionar em `global_config`.
4. Antes de codar regra nova, verificar se ela ja pode ser resolvida por configuracao.
5. Evitar duplicacao de documentacao: este arquivo e a referencia principal de regras.

## 7. Regras da Wiki do Usuario

### 7.1 Estrutura obrigatoria

1. O menu principal deve exibir apenas `Wiki` (sem sufixo de poder).
2. A entrada da wiki deve ser em `/wiki`.
3. Em `/wiki`, o usuario deve escolher entre:
   - `Wiki Global` (IR e regras gerais de previdencia)
   - `Wiki por Poder` (PJU, Executivo Federal, etc.)
4. A navegacao deve seguir logica de selecao em niveis, semelhante ao fluxo de escolha dos simuladores.

### 7.2 Modelo de conteudo (data-driven)

1. Conteudo da wiki deve ser cadastrado em catalogo estruturado (objetos/arrays versionados no codigo), sem texto hardcoded diretamente em componentes de pagina.
2. Cada artigo deve ter no minimo:
   - `scope`
   - `slug`
   - `title`
   - `subtitle`
   - `audience`
   - `updatedAt`
   - `sections`
   - `legalRefs`
3. O componente de renderizacao deve consumir apenas esse modelo de dados.

### 7.3 Padrao editorial

1. Texto deve usar portugues completo com acentuacao correta.
2. Conteudo deve ser didatico para usuario iniciante no inicio do artigo.
3. Cada artigo tecnico deve terminar com uma secao de fundamentos normativos e de calculo (formulas, premissas e fontes oficiais).
4. Fontes devem privilegiar origem primaria (Constituicao, leis, LC, regulamentos e planos oficiais).

### 7.4 Padrao visual e UX da Wiki

1. Tipografia deve ser consistente entre titulos, paragrafos, listas e links.
2. Evitar misturar tamanhos de fonte sem criterio visual.
3. Toda pagina de artigo deve oferecer:
   - link de retorno para `/wiki`
   - link util para simulacao relacionada (quando aplicavel)

### 7.5 Governanca de atualizacao

1. Toda alteracao relevante de regra da wiki deve atualizar a data `updatedAt` do artigo.
2. Se houver mudanca normativa que altere entendimento de calculo, atualizar tambem o `CHANGELOG.md`.
3. Conteudos marcados como `Em breve` devem ficar explicitos no catalogo da wiki e nao devem gerar rota quebrada.
