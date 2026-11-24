# PROJECT_RULES

Atualizado em: 24/11/2026 18:42

Este documento é o ponto de entrada para as regras do projeto. As páginas do índice são a fonte canônica das regras detalhadas de cada módulo.

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

### Índice de regras por módulo

O documento principal é obrigatório em toda tarefa. Para alterações de cálculo, configuração, comportamento funcional ou documentação de regra, leia cada página dos módulos afetados. Ajustes de layout ou de texto da interface sem efeito funcional exigem apenas este documento entre os documentos de regras. Se o escopo mudar, leia as páginas adicionais antes de editar. Páginas de módulo têm força normativa para seu escopo e cada regra detalhada possui um único local canônico.

| Módulo | Leitura obrigatória quando a tarefa afetar |
| --- | --- |
| [Vantagens pessoais](src/docs/regras/VANTAGENS_PESSOAIS.md) | Cards VPNI/ATS e cálculo do ATS. |
| [Rubricas manuais](src/docs/regras/RUBRICAS_MANUAIS.md) | Campos, incidências, resumos e créditos/descontos manuais. |
| [Previdência](src/docs/regras/PREVIDENCIA.md) | PSS, Funpresp, catálogo previdenciário e competências originais. |
| [13º salário](src/docs/regras/DECIMO_TERCEIRO.md) | Parcelas, referência, adiantamentos e fechamento do 13º. |
| [Férias](src/docs/regras/FERIAS.md) | Terço constitucional e antecipações. |
| [GAE/GAS](src/docs/regras/GAE_GAS.md) | Gratificação específica e incidências. |
| [Diárias](src/docs/regras/DIARIAS.md) | Diárias, viagens, embarque e desconto de auxílio-transporte em viagem. |
| [Substituição de função](src/docs/regras/SUBSTITUICAO_DE_FUNCAO.md) | Lançamentos e cálculo de substituição. |
| [IR-EA/RRA](src/docs/regras/IR_RRA.md) | Imposto sobre rendimentos de exercícios anteriores. |
| [Horas extras](src/docs/regras/HORAS_EXTRAS.md) | Serviço extraordinário e sua base remuneratória. |
| [GAACTA e licença compensatória](src/docs/regras/GAACTA_E_LICENCA_COMPENSATORIA.md) | Elegibilidade, cálculo e seleção dessas verbas. |
| [Indenização de transporte](src/docs/regras/INDENIZACAO_DE_TRANSPORTE.md) | Indenização por diligência externa. |
| [Teto remuneratório](src/docs/regras/TETO_REMUNERATORIO.md) | Referência federal, vigências, subtetos e apuração de abate-teto. |

### 4.0 Navegação por páginas

1. A calculadora apresenta, nesta ordem, Competência (mês, ano e enquadramento normativo), Dados básicos, Adicional de Qualificação (AQ), Vantagens pessoais, Benefícios, Previdência e abono, Imposto de Renda, Créditos Eventuais, Descontos, Observações/Notas e Resultado.
2. As páginas organizam a coleta dos dados; não duplicam nem alteram os valores e regras do motor oficial.

### 4.2 Descontos e entradas

1. Descontos devem ter estilo visual proprio (sem prefixo textual `(-)`).
2. Campos numericos nao aceitam valor negativo.

### 4.5 Detalhamento final

1. Ordem de exibicao em cada bloco: creditos antes, debitos depois.
2. Totais de cada bloco devem refletir apenas o proprio bloco.

### 4.6 Mobile

1. No rodapé mobile (`MobileResultsBar`), o valor líquido permanece fixo e visível, com CTA `Exportar` e seta colapsável (accordion) para expandir as ações (Limpar, Holerites, PDF, Excel e Salvar), mantendo a tela compacta e sem transbordo horizontal.
2. A versão (`VersionBadge`) pode aparecer no layout interno do rodapé, mas não no texto do CTA.

### 4.7 Regra de compatibilidade

1. Nao manter gatilhos fixos hardcoded (incluindo `Johnson*`) para alterar calculos automaticamente.

### 4.8 Catálogo visual de verbas, adicionais e benefícios (cards pré-definidos)

1. O seletor de verbas e adicionais apresenta as opções divididas visualmente por categorias conceituais (Trabalho Extraordinário & Funções, Direitos Periódicos, Indenizações & Viagens, Descontos), com campo de busca instantânea e botões de ação rápida em substituição a dropdowns fechados que ocultam as opções do usuário.
2. Cada chip informa claramente o estado da verba: se não adicionada, inclusão em 1 clique; se já adicionada, rolagem suave (*scroll into view*) com destaque visual temporário até o card na tela.
3. Cards que permitem repetição (como Hora Extra e Substituição de Função) informam a quantidade ativa no chip e oferecem botão rápido para inclusão de nova instância, mantendo configurações e cálculos estritamente isolados.
4. No detalhamento final, rubricas repetidas devem ser apresentadas sem consolidar incidências distintas de forma ambígua.

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
5. Manter cada regra detalhada no módulo responsável e apontar para ele por link quando necessário.
6. No cadastro de um órgão, reutilizar as regras compartilhadas e configurar somente as diferenças locais. Para mudanças específicas, consultar a configuração e as normas do órgão ou ramo nas competências afetadas. Documentar peculiaridades de implementação no módulo correspondente, com seção própria se necessário.

### 6.1 Consulta obrigatória ao catálogo de normas

1. Antes de alterar valores, fórmulas, critérios de elegibilidade ou períodos de aplicação de regras de cálculo regidas por norma específica de órgão ou ramo, consultar **Normas e vigências** no Painel Administrativo (`/admin/normas`). Identificar o ato, o dispositivo e o período de efeitos para os órgãos e competências afetados e conferir esses dados na fonte oficial. Ajustes visuais e correções técnicas sem impacto nessas regras ficam fora desta exigência.
2. Cadastrar ou atualizar a ficha se estiver ausente ou desatualizada. Distinguir a vigência formal do ato dos efeitos no cálculo, vincular atos alteradores ou revogadores quando aplicável e registrar como **A conferir** os dados ainda não confirmados. Marcar como **Requer atualização** os vínculos já conferidos que precisem de mudança no simulador.
3. Marcar o vínculo como **Implementado** após validar o comportamento do simulador e registrar no catálogo a evidência correspondente, como a configuração versionada ou o trecho do motor. Citar no `CHANGELOG.md` o ato, os dispositivos aplicáveis e as competências afetadas pela mudança de cálculo.

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
2. O catálogo de especialistas orienta a seleção e a coordenação dos agentes.
3. Toda tarefa que altere calculo oficial, schema, seeds, RLS ou configuracao administrativa deve respeitar este documento antes de qualquer delegacao para subagente.
4. Tarefas com impacto em calculo oficial devem, no minimo, passar pelo especialista de regras/calculo correspondente antes de conclusao ou merge.
5. Os modelos e esforcos registrados no catalogo sao preferencias operacionais, sujeitos a disponibilidade, configuracao e capacidade do runtime.
6. Quando o runtime do Codex nao expuser selecao explicita de modelo, deve-se usar o papel mais proximo disponivel (`default`, `explorer` ou `worker`) e manter a especializacao pelas instrucoes do catalogo.
7. Novos especialistas ou mudancas de escopo/modelo preferencial exigem atualizacao conjunta de `src/docs/CODEX_SPECIALISTS.md` e `CHANGELOG.md`.
8. A coordenacao operacional entre especialistas deve ser atribuida ao `Codex Orchestrator`, quando esse papel estiver em uso.
9. O `Codex Orchestrator` deve classificar a complexidade da tarefa e definir o nivel de raciocinio recomendado entre `Baixa`, `Media`, `Alta` e `Altissima` antes da execucao, sempre que essa informacao for util para a operacao.
10. Se o runtime nao permitir alterar programaticamente o nivel de raciocinio, a classificacao continua obrigatoria como recomendacao operacional documentada.
11. GPT-6 Luna e o modelo preferencial para o agente principal em tarefas cotidianas de baixo risco, consultas ao repositorio, ajustes localizados e documentacao simples, usando esforco baixo ou medio conforme a tarefa.
12. Antes de iniciar cada solicitacao, avaliar caso a caso o modelo e o esforco adequados, considerando complexidade, risco, incerteza, escopo e economia de recursos. Explicar brevemente a razao da escolha de ambos, sem associar automaticamente um modelo ou esforco a uma categoria de tarefa.
13. Antes de executar uma solicitacao, classificar sua complexidade e recomendar brevemente o modelo e o esforco de raciocinio adequados, conforme os itens anteriores.
14. Se a recomendacao diferir do modelo selecionado no runtime, interromper antes de iniciar a tarefa e perguntar ao usuario se deseja trocar para o modelo recomendado. A pergunta deve identificar modelo e esforco recomendados.
15. Se o runtime nao expuser o modelo selecionado ou nao permitir sua troca pelo agente, explicar essa limitacao e aguardar a escolha do usuario antes de iniciar a tarefa. Nao presumir que a recomendacao foi aceita nem prosseguir automaticamente no modelo atual.
16. Se o modelo selecionado ja corresponder a recomendacao, ou se o usuario optar explicitamente por permanecer no modelo atual, prosseguir e registrar a recomendacao e eventual limitacao do runtime de forma concisa. A recomendacao nao altera o modelo automaticamente.

### 10.1 Relatorio obrigatorio ao final de cada tarefa

1. Toda resposta final de tarefa no projeto deve terminar com um relatorio conciso de agentes utilizados, inclusive em tarefas somente de leitura, sem alteracoes ou sem delegacao.
2. Informar o agente principal e cada subagente efetivamente acionado na tarefa, com papel/nome, modelo e nivel de esforco de raciocinio. Incluir tentativas que falharam ou foram interrompidas, identificando esse resultado; nao listar especialistas apenas por estarem cadastrados.
3. Usar metadados confiaveis do runtime quando disponiveis. Quando houver apenas configuracao declarada, identificar modelo e esforco como configurados, sem afirmar que foram efetivamente executados. Se a informacao nao estiver disponivel, registrar `nao informado pelo runtime`; nao inferir o modelo pela identidade textual do agente.
4. Quando nenhum subagente for acionado, registrar explicitamente `Subagentes: nenhum`. Considerar somente a tarefa relatada, sem reutilizar a lista de tarefas anteriores do chat.
5. O relatorio pode ser uma tabela ou linhas curtas ao final da resposta, depois do resultado e da validacao da tarefa. Sua apresentacao nao exige criar subagentes nem mudar modelos ou esforcos.

## 15. Automação de versionamento e sincronização com Git

1. Ao concluir qualquer tarefa que envolva criação, edição ou exclusão de arquivos de código, schema, seeds, regras ou documentação, o agente (Antigravity) deve executar de forma automatizada e sem necessidade de solicitação adicional do usuário:
   - Sincronização prévia com o remoto (`git pull --rebase origin main`).
   - Adição das alterações preparadas (`git add -A`).
   - Criação de commit semântico com mensagem clara e objetiva no padrão Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, etc.).
   - Envio imediato ao repositório remoto (`git push origin main`).
2. O agente não deve encerrar seu turno com alterações pendentes não commitadas ou não enviadas, exceto em caso explícito de bloqueio técnico ou erro de autenticação remota que requeira ação do usuário.
3. Manter a árvore de trabalho limpa e o branch local alinhado ao branch remoto após cada entrega.
4. Ferramentas locais de automação disponíveis para desenvolvedores e agentes:
   - Script npm: `npm run sync` (sincroniza, commita e envia) e `npm run sync:watch` (monitoramento contínuo em background).
   - Script PowerShell: `.\git-sync.ps1` (ou `.\git-sync.ps1 "mensagem"` / `.\git-sync.ps1 -Watch`).
   - Git aliases: `git sync` e `git autopush`.
   - Git Hook (`.git/hooks/post-commit`): envio automático para `origin/main` após qualquer commit local.
   - Extensão IDE (GitDoc - `vsls-contrib.gitdoc`): configurada e ativada no workspace e no perfil do usuário (`gitdoc.enabled: true`, `gitdoc.autoPush: "onCommit"`, `gitdoc.pushMode: "push"`), executando commit e push automáticos no GitHub ao salvar ou concluir edições locais.
