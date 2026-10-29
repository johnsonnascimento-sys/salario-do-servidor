# PROJECT_RULES

Atualizado em: 29/10/2026 14:54

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
3. Adicional de embarque / deslocamento deve aparecer em linha propria com nomenclatura dinamica orientada pelo orgao (`embarkationLabel`).
4. Exibir total de diarias liquidas.
5. No PJU, os valores de diarias e adicionais sao data-driven e podem ser derivados percentualmente da diaria de Ministro do STF (Res. CNJ 73/2009) com regras e percentuais setoriais por ramo/orgao (Ato STM 799/2024, Res. CJF 340/2015, etc.).
6. No modo por datas, fins de semana sao deduzidos automaticamente por calendario, e feriados/pontos facultativos locais podem ser marcados interativamente pelo usuario para a viagem, evitando acoplamento a calendarios fixos de orgaos especificos.
7. Para servidores do PJU, disponibilizar opcao de viagem em assessoramento direto a magistrado com diaria a 80% do Ministro do STF (art. 6º, § 1º, da Res. CNJ 73/2009 c/c Res. CNJ 564/2024), mantendo a diaria comum no percentual regular do cargo/funcao (como CJ-4 a 60%).

### 4.5 Detalhamento final

1. Separar blocos: `Holerite` e `Diarias`.
2. Ordem de exibicao em cada bloco: creditos antes, debitos depois.
3. Totais de cada bloco devem refletir apenas o proprio bloco.

### 4.6 Mobile

1. No CTA mobile do rodape, usar apenas `Exportar`.
2. A versao pode aparecer no layout, mas nao no texto do CTA.

### 4.7 Regra de compatibilidade

1. Nao manter gatilhos fixos hardcoded (incluindo `Johnson*`) para alterar calculos automaticamente.

### 4.8 Rubricas pre-definidas com multiplas instancias

1. Cards pre-definidos devem informar ao usuario quando uma rubrica pode ser adicionada mais de uma vez.
2. Quando uma rubrica permitir repeticao (ex.: Hora Extra), cada instancia deve manter configuracoes e calculos isolados.
3. No detalhamento final, rubricas repetidas devem ser apresentadas sem consolidar incidencias distintas de forma ambigua.

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

## 7. Wiki descontinuada

1. O modulo de Wiki foi removido do produto e nao possui rotas ativas.
2. Nao adicionar links para `/wiki` em layout, calculadora ou painel admin.
3. Se a Wiki for retomada no futuro, as regras editoriais devem ser definidas novamente em nova secao deste documento.

## 8. Governanca do PROJECT_RULES.md

1. Toda alteracao neste arquivo deve atualizar obrigatoriamente o campo `Atualizado em:`.
2. O campo `Atualizado em:` deve conter sempre data e hora no formato `dd/MM/yyyy HH:mm`.

## 9. Area de usuario e holerites

1. A autenticacao de usuario final deve ficar separada da autenticacao administrativa.
2. Rotas `/admin*` exigem autorizacao explicita de admin (allowlist), nao apenas usuario autenticado.
3. Persistencia de holerites salvos deve usar snapshot completo (`calculator_state` + `result_rows`) para preservar historico.
4. CRUD de holerites deve ser isolado por usuario com RLS em `auth.uid()`.
5. Cadastro de usuarios pode operar em beta fechado via allowlist (`cpf + email`) sem abrir acesso geral.

## 10. Governanca de subagentes Codex

1. A definicao versionada dos especialistas do Codex deve ficar em `src/docs/CODEX_SPECIALISTS.md`.
2. O catalogo de especialistas e operacional; este `PROJECT_RULES.md` continua sendo a unica fonte canonica de regras do projeto.
3. Toda tarefa que altere calculo oficial, schema, seeds, RLS ou configuracao administrativa deve respeitar este documento antes de qualquer delegacao para subagente.
4. Tarefas com impacto em calculo oficial devem, no minimo, passar pelo especialista de regras/calculo correspondente antes de conclusao ou merge.
5. Os modelos e esforcos registrados no catalogo sao preferencias operacionais, sujeitos a disponibilidade, configuracao e capacidade do runtime.
6. Quando o runtime do Codex nao expuser selecao explicita de modelo, deve-se usar o papel mais proximo disponivel (`default`, `explorer` ou `worker`) e manter a especializacao pelas instrucoes do catalogo.
7. Novos especialistas ou mudancas de escopo/modelo preferencial exigem atualizacao conjunta de `src/docs/CODEX_SPECIALISTS.md` e `CHANGELOG.md`.
8. A coordenacao operacional entre especialistas deve ser atribuida ao `Codex Orchestrator`, quando esse papel estiver em uso.
9. O `Codex Orchestrator` deve classificar a complexidade da tarefa e definir o nivel de raciocinio recomendado entre `Baixa`, `Media`, `Alta` e `Altissima` antes da execucao, sempre que essa informacao for util para a operacao.
10. Se o runtime nao permitir alterar programaticamente o nivel de raciocinio, a classificacao continua obrigatoria como recomendacao operacional documentada.

### 10.1 Relatorio obrigatorio ao final de cada tarefa

1. Toda resposta final de tarefa no projeto deve terminar com um relatorio conciso de agentes utilizados, inclusive em tarefas somente de leitura, sem alteracoes ou sem delegacao.
2. Informar o agente principal e cada subagente efetivamente acionado na tarefa, com papel/nome, modelo e nivel de esforco de raciocinio. Incluir tentativas que falharam ou foram interrompidas, identificando esse resultado; nao listar especialistas apenas por estarem cadastrados.
3. Usar metadados confiaveis do runtime quando disponiveis. Quando houver apenas configuracao declarada, identificar modelo e esforco como configurados, sem afirmar que foram efetivamente executados. Se a informacao nao estiver disponivel, registrar `nao informado pelo runtime`; nao inferir o modelo pela identidade textual do agente.
4. Quando nenhum subagente for acionado, registrar explicitamente `Subagentes: nenhum`. Considerar somente a tarefa relatada, sem reutilizar a lista de tarefas anteriores do chat.
5. O relatorio pode ser uma tabela ou linhas curtas ao final da resposta, depois do resultado e da validacao da tarefa. Sua apresentacao nao exige criar subagentes nem mudar modelos ou esforcos.

## 11. Regras de Diárias no Poder Judiciário da União (PJU)

1. A referência máxima de valor é a diária de Ministro do Supremo Tribunal Federal (STF), conforme Resolução CNJ Nº 73/2009 e normas setoriais.
2. Escalonamento na Justiça Federal (Resolução CJF Nº 340/2015, art. 10):
   - Membro do CJF: 100% da diária de Ministro do STF (R$ 1.466,95).
   - Membro de TRF (Desembargador Federal): 95% da diária de Ministro do STF (R$ 1.393,60).
   - Juiz Federal ou Juiz Federal Substituto: 95% da diária do membro do TRF = 90,25% da diária de Ministro do STF (R$ 1.323,92).
   - Analista Judiciário ou Cargo em Comissão (CJ-1 a CJ-4): 55% da diária de Ministro do STF (R$ 806,82).
   - Técnico Judiciário ou Função Comissionada (FC-1 a FC-6): 45% da diária de Ministro do STF (R$ 660,13).
   - Auxiliar Judiciário: equipara-se ao Técnico Judiciário (45%, conforme art. 10, § 7º).
3. Escalonamento no Superior Tribunal Militar (Ato Normativo STM Nº 799/2024):
   - Ministro do STM: 100% da diária de Ministro do STF (R$ 1.466,95).
   - Juiz Federal da JMU / Diretor-Geral e Secretário-Geral: 95% do Ministro do STM (R$ 1.393,60).
   - Demais Cargos em Comissão: 60% do Ministro do STM (R$ 880,17).
   - Analista Judiciário: 55% do Ministro do STM (R$ 806,82).
   - Técnico Judiciário: 45% do Ministro do STM (R$ 660,13).
4. Assessoramento direto ou segurança a magistrado (art. 6º, § 4º da Resolução CNJ Nº 73/2009, art. 10, § 3º da Resolução CJF Nº 340/2015 e art. 9º do Ato Normativo STM Nº 799/2024):
   - O servidor que se afastar em assistência direta a magistrado faz jus a diária correspondente a **80% do valor da diária atribuído à autoridade assistida**.
   - As opções de autoridades assistidas e suas fundamentações são estritamente segregadas por ramo judiciário:
     - **Na Justiça Militar da União (JMU / STM)**:
       - Ministro do STM (100% STF) -> 80% de R$ 1.466,95 = **R$ 1.173,56**.
       - Juiz Federal da JMU / Substituto (95% do STM) -> 80% de R$ 1.393,60 = **R$ 1.114,88**.
       - Não exibir opções da Justiça Federal (como Desembargador de TRF ou Membro do CJF).
     - **Na Justiça Federal (CJF e TRFs)**:
       - Desembargador Federal / Membro de TRF (95% STF) -> 80% de R$ 1.393,60 = **R$ 1.114,88**.
       - Juiz Federal / Substituto (95% do TRF = 90,25% STF) -> 80% de R$ 1.323,92 = **R$ 1.059,14**.
       - Ministro / Membro do CJF (100% STF) -> 80% de R$ 1.466,95 = **R$ 1.173,56**.
       - Não exibir opções da JMU (como Ministro do STM).
   - A opção não se aplica a magistrados em deslocamento institucional.

