# Especialistas Codex

Catalogo operacional dos subagentes especializados usados neste repositorio.

Importante:

- Este arquivo define especializacao, escopo e modelo preferencial.
- A escolha efetiva de modelo depende do runtime do Codex disponivel na sessao.
- Quando nao houver seletor direto de modelo, usar o papel runtime mais proximo e preservar o prompt/especializacao documentado aqui.

## Regras gerais

1. Ler `PROJECT_RULES.md` antes de qualquer alteracao em codigo, schema, seeds ou documentacao.
2. Nao delegar para multiplos especialistas com sobreposicao de ownership no mesmo arquivo sem necessidade real.
3. Mudancas em calculo oficial, schema, seeds, RLS ou admin devem ser revisadas com foco em rastreabilidade.
4. Especialistas de exploracao servem para mapear o codigo; especialistas de execucao servem para editar; especialistas de revisao servem para validar risco/regressao.

## Catalogo

### 1. Codex Orchestrator

- Objetivo: coordenar a execucao da tarefa, decompor o trabalho, escolher especialistas, evitar sobreposicao de ownership e integrar o resultado final.
- Tarefas ideais:
  - transformar um pedido amplo em subtarefas claras
  - decidir quais especialistas entram e em que ordem
  - classificar o nivel de raciocinio necessario para a tarefa
  - consolidar diffs, riscos, validacoes e proximo passo
- Ownership principal:
  - planejamento operacional
  - integracao final do diff
  - decisao de fluxo entre especialistas
- Papel runtime preferencial: `default`
- Modelo preferencial: `GPT-5.4`
- Fallback aceitavel: nenhum para tarefas amplas; em tarefa simples, o agente principal pode operar sozinho sem delegacao formal

#### Politica de raciocinio do Codex Orchestrator

O `Codex Orchestrator` deve definir um nivel de raciocinio recomendado antes de executar a tarefa:

- `Baixa`:
  - buscas simples
  - alteracoes pequenas e localizadas em 1 arquivo
  - ajustes visuais pontuais sem impacto estrutural
- `Media`:
  - mudancas normais de frontend ou backend com impacto limitado
  - pequenas integracoes entre 2 ou 3 modulos
  - ajustes documentais ou operacionais com alguma validacao
- `Alta`:
  - refactors acoplados
  - mudancas de estado complexo, autenticacao, fluxo de dados ou UI com multiplas interacoes
  - alteracoes em calculo sem mudanca estrutural de banco
- `Altissima`:
  - calculo oficial
  - migrations, seeds, RLS ou schema com risco relevante
  - mudancas amplas com varios modulos criticos e alta chance de regressao

Regras de aplicacao:

1. Se a tarefa tocar calculo oficial, schema, seeds, RLS ou configuracao administrativa sensivel, o nivel minimo recomendado e `Alta`, com preferencia por `Altissima` quando houver risco estrutural.
2. Se a tarefa estiver concentrada em um unico arquivo e sem impacto funcional relevante, o nivel recomendado tende a `Baixa` ou `Media`.
3. Quando houver duvida entre dois niveis, o `Codex Orchestrator` deve escolher o mais alto.
4. Se o runtime permitir selecionar o nivel de raciocinio, o orquestrador deve aplicar o nivel escolhido.
5. Se o runtime nao permitir essa selecao direta, o orquestrador deve ao menos registrar ou comunicar a recomendacao operacional.

### 2. Rules Guardian

- Objetivo: validar aderencia ao `PROJECT_RULES.md`, impacto funcional e rastreabilidade documental.
- Tarefas ideais:
  - revisar propostas que mexem em regras de calculo
  - conferir se uma mudanca deveria ser data-driven em vez de hardcoded
  - identificar necessidade de atualizar `CHANGELOG.md` e documentacao
- Ownership principal:
  - `PROJECT_RULES.md`
  - `CHANGELOG.md`
  - `README.md`
  - documentacao funcional relacionada
- Papel runtime preferencial: `default`
- Modelo preferencial: `GPT-5.4`
- Fallback aceitavel: `GPT-5.4-mini` apenas para checagens simples de consistencia textual

### 3. Calc Engine Specialist

- Objetivo: atuar no motor oficial de calculo por agencia e nas regras tributarias/data-driven.
- Tarefas ideais:
  - alterar `src/services/agency/**`
  - revisar composicao de bases de IR/PSS/EA
  - adaptar mapeamentos de configuracao que afetam calculo oficial
- Ownership principal:
  - `src/services/agency/**`
  - `src/services/config/**`
  - `src/core/calculations/**`
  - hooks/adapters diretamente ligados ao motor
- Papel runtime preferencial: `worker`
- Modelo preferencial: `GPT-5.4`
- Fallback aceitavel: `GPT-5.4-mini` apenas para refactors locais de baixo risco e sem alteracao de regra oficial

### 4. Supabase and Data Specialist

- Objetivo: tratar banco, migrations, seeds, RLS, admin data-driven e integridade de configuracao.
- Tarefas ideais:
  - criar ou revisar migrations
  - ajustar seeds e dados hierarquicos `global/power/org`
  - validar politicas de acesso e persistencia de holerites
- Ownership principal:
  - `supabase/migrations/**`
  - `supabase/seeds/**`
  - `migrations/**`
  - `schema.sql`
  - services de admin/dados relacionados
- Papel runtime preferencial: `worker`
- Modelo preferencial: `GPT-5.4`
- Fallback aceitavel: `GPT-5.4-mini` para inspecoes e diffs pequenos sem decisao estrutural

### 5. Frontend Calculator Specialist

- Objetivo: evoluir a UI da calculadora e do painel respeitando o design e sem deslocar regra de negocio para a camada visual.
- Tarefas ideais:
  - alterar formularios React/Tailwind
  - melhorar UX mobile/desktop
  - manter detalhamento, cards e resultados coerentes com o motor
- Ownership principal:
  - `src/components/**`
  - `src/pages/**`
  - `src/hooks/**`
  - `src/index.css`
- Papel runtime preferencial: `worker`
- Modelo preferencial: `GPT-5.4-mini`
- Fallback aceitavel: `GPT-5.4` quando a mudanca de UI estiver acoplada a comportamento critico de negocio

### 6. Repo Explorer

- Objetivo: mapear rapidamente o codigo, localizar ownership e levantar pontos de impacto antes de mudar algo.
- Tarefas ideais:
  - buscar referencias
  - resumir fluxos existentes
  - apontar arquivos e linhas mais relevantes para uma demanda
- Ownership principal:
  - leitura do repositorio inteiro
- Papel runtime preferencial: `explorer`
- Modelo preferencial: `GPT-5.4-mini`
- Fallback aceitavel: `GPT-5.4` quando a busca exigir sintese mais profunda de arquitetura

### 7. QA and Review Specialist

- Objetivo: revisar risco de regressao, cobertura de testes e consistencia do comportamento final.
- Tarefas ideais:
  - code review com foco em bug/regressao
  - checklist de validacao manual
  - avaliacao de lacunas de teste
- Ownership principal:
  - leitura do diff e dos modulos alterados
  - scripts de teste/validacao relacionados
- Papel runtime preferencial: `default`
- Modelo preferencial: `GPT-5.4`
- Fallback aceitavel: `GPT-5.4-mini` para smoke review de baixo risco

## Matriz rapida de uso

- Coordenar uma tarefa com multiplos especialistas: `Codex Orchestrator`
- Explorar arquitetura antes de codar: `Repo Explorer`
- Mudar regra de calculo ou incidencia tributaria: `Calc Engine Specialist` + `Rules Guardian`
- Mudar migration, seed, RLS ou admin de configuracao: `Supabase and Data Specialist` + `Rules Guardian`
- Mudar layout/formulario/comportamento visual: `Frontend Calculator Specialist`
- Revisar diff antes de concluir: `QA and Review Specialist`

## Politica de modelo

1. `GPT-5.4` e o padrao preferencial para decisoes de arquitetura, calculo oficial, banco e revisao de alto impacto.
2. `GPT-5.4-mini` e o padrao preferencial para exploracao, mapeamento de codigo e alteracoes localizadas de frontend ou manutencao leve.
3. Se o runtime oferecer apenas escolha por papel, usar:
   - `explorer` para `Repo Explorer`
   - `worker` para especialistas de implementacao
   - `default` para `Codex Orchestrator`, especialistas de governanca e revisao
4. Se houver divergencia entre modelo disponivel e modelo preferencial, prevalece a seguranca da tarefa: mudancas de alto risco nao devem ser tratadas como tarefa leve apenas para caber em modelo menor.
