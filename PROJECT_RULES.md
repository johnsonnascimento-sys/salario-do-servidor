# PROJECT_RULES

Atualizado em: 13/11/2026 15:55

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
8. Resumo calculado (`PresetGrossSummary`) com Bruto e detalhamento disponível de IR/PSS. A Funpresp deve ser apresentada em resumo compartilhado por folha mensal, 13º e competência histórica, usando a memória do motor, sem rateio individual. O PSS por competência original também deve aparecer no grupo histórico, sem estimativa individual pela taxa mensal. Quando a rubrica participar dessas apurações compartilhadas, não apresentar líquido individual definitivo.
9. No resumo individual da rubrica de crédito com incidência em IR mensal, o desconto exibido reflete o rateio proporcional do imposto total; quando a inclusão da rubrica acarretar acréscimo marginal distinto por faixas/alíquotas efetivas, exibir informativamente o acréscimo efetivo na folha sem descontar ambos do valor líquido individual.
10. Não exibir descontos ou líquidos provenientes de cálculo anterior enquanto a simulação atual não estiver concluída. Patrocínio e pagamentos externos são informativos e não reduzem o líquido da folha.
11. Rubricas com valor positivo, inclusão na Funpresp e competência original exigem distribuição integral em vínculos históricos verificáveis. No novo fluxo, a distribuição também deve cobrir as rubricas com PSS por competência original; cada incidência permanece independente. Ajustes legados sem vínculo não resolvem essa pendência. A marcação de competência original sozinha não cria incidência complementar.
12. Pendências preservam as entradas e impedem a apresentação, exportação e salvamento de um resultado definitivo. Snapshots já salvos permanecem preservados; não preencher automaticamente o regime ou a participação histórica dos novos lançamentos a partir da seleção mensal.
13. A apuração vinculada consolida as rubricas por competência e espécie (mensal ou 13º), deriva as bases corrigidas das bases originais e dos valores distribuídos e calcula a contribuição devida menos a já recolhida. Distribuição incompleta, divergências, duplicações e restituições a tratar permanecem pendentes, sem omissão ou compensação automática.
14. Novas apurações exigem regra histórica cadastrada com identificador, fonte, tabela PSS e vigência aplicáveis à competência original. Não substituir lacunas pela configuração complementar atual. Créditos positivos com PSS por competência original exigem vínculos mesmo sem participação complementar atual; ajustes legados isolados não liberam essas rubricas.
15. A natureza previdenciária da rubrica manual vem de catálogo com fonte e vigência, distinguindo inclusão obrigatória, facultativa, exclusão e enquadramento pendente. Créditos positivos de participantes exigem classificação mesmo com o checkbox desmarcado. No histórico, aplicar o catálogo próprio da competência; PSS histórico não dispensa a validação da Funpresp mensal quando selecionada.
16. Inclusão facultativa exige data real e referência da opção expressa. Se a opção começa após o primeiro dia da competência, exigir confirmação do valor elegível desde o protocolo, sem prorrata automática. Alterações em valor, natureza, data ou distribuição histórica invalidam essa confirmação. Memória e exportação registram classificação, fonte, competência e dados da opção, sem rateio previdenciário individual.
17. Ausência de catálogo, regra, enquadramento ou parâmetro oficial impede resultado definitivo quando necessário à apuração. O candidato local da etapa 3 cobre catálogo de 2026 e regras históricas de abril a dezembro/2026; períodos e verbas não comprovados continuam pendentes. Cadastro preparado não significa aplicação em produção.

### 4.2 Descontos e entradas

1. Descontos devem ter estilo visual proprio (sem prefixo textual `(-)`).
2. Campos numericos nao aceitam valor negativo.
3. Em horas extras, nao exibir opcao de incidencia de PSS que nao se aplica.

### 4.3 Gratificacao natalina (13o)

1. Nao cobrar PSS sobre FC/CJ no 13o.
2. Na 2a parcela, considerar base total aplicavel, aplicar abatimento da 1a parcela e concentrar desconto no resumo da 2a.
3. Se marcar 2a parcela, marcar automaticamente a 1a correspondente para evitar base incompleta.
4. Exibir totais brutos e liquidos por parcela.
5. No modo de ajuste manual do adiantamento recebido anteriormente (1ª parcela), a 2ª parcela apura automaticamente o saldo complementar necessário para integralizar a remuneração de referência e assegurar a retenção tributária legal completa sem exigir cálculo manual do usuário, preservando a possibilidade de edição avulsa.
6. A base de cálculo da remuneração de referência do 13º salário suporta composição dinâmica por checkboxes com valores em tempo real (similar ao GAACTA): as parcelas regulares (Vencimento, GAJ, FC/CJ, AQ Títulos, AQ Treinamento, VPNI, ATS e GAE/GAS) permanecem selecionadas por padrão, e parcelas complementares (Abono de Permanência, rubricas manuais de crédito criadas pelo usuário e ajustes avulsos) podem ser incluídas/excluídas interativamente, recalculando instantaneamente a base apurada e seus reflexos nas parcelas e retenções. O Abono de Permanência permanece selecionado por padrão (`decimoIncideAbono: true`), incidindo na composição do 13º quando o servidor tiver abono ativo (`recebeAbono`), e sendo marcado automaticamente no card do 13º salário sempre que o usuário adicionar o abono.

### 4.3.1 Férias (1/3 Constitucional)

1. O adicional de 1/3 de férias (art. 7º, XVII, da CF/88 c/c art. 76 da Lei nº 8.112/1990) incide sobre a remuneração de referência apurada no período de usufruto.
2. A base de cálculo da remuneração de referência das férias suporta composição dinâmica por checkboxes com valores em tempo real (mesmo comportamento da Gratificação Natalina e da GAACTA): parcelas regulares (Vencimento, GAJ, FC/CJ, AQ Títulos, AQ Treinamento, VPNI, ATS e GAE/GAS) permanecem selecionadas por padrão, e parcelas complementares (Abono de Permanência, rubricas manuais de crédito criadas pelo usuário e ajustes avulsos) podem ser incluídas/excluídas interativamente, recalculando instantaneamente o 1/3 apurado e suas retenções de IRRF.
3. O Abono de Permanência permanece selecionado por padrão (`feriasIncideAbono: true`), incidindo na composição quando o servidor tiver abono ativo (`recebeAbono`), e sendo marcado automaticamente no card de Férias sempre que o usuário adicionar o abono.
4. Suporte a férias antecipadas (`feriasAntecipadas` e `feriasDescManual`) para dedução integral ou personalizada no contracheque posterior.

### 4.3.2 Gratificação Específica (GAE / GAS - Lei nº 11.416/2006)

1. Conforme os arts. 16, § 1º (GAE) e 17, § 1º (GAS) da Lei nº 11.416/2006, as gratificações específicas de atividade externa e segurança correspondem a 35% do vencimento básico do servidor.
2. A base de cálculo da GAE/GAS suporta composição dinâmica por checkboxes com valores em tempo real: por padrão legal estrito, apenas o Vencimento Básico permanece selecionado (`gratIncideVencimento: true`).
3. Outros créditos (GAJ, FC/CJ, AQ Títulos, AQ Treinamento, VPNI, ATS, Abono de Permanência, rubricas manuais de crédito e ajustes avulsos) são exibidos para permitir seleção pelo usuário em caso de peculiaridades administrativas ou judiciais, mas **não devem ficar selecionados por padrão** (todos os demais permanecem `false` por padrão).
4. Suporte a opção de inclusão ou exclusão da gratificação na base de cálculo da contribuição previdenciária (`incidirPSSGrat`).

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

1. No rodapé mobile (`MobileResultsBar`), o valor líquido permanece fixo e visível, com CTA `Exportar` e seta colapsável (accordion) para expandir as ações (Limpar, Holerites, PDF, Excel e Salvar), mantendo a tela compacta e sem transbordo horizontal.
2. A versão (`VersionBadge`) pode aparecer no layout interno do rodapé, mas não no texto do CTA.

### 4.7 Regra de compatibilidade

1. Nao manter gatilhos fixos hardcoded (incluindo `Johnson*`) para alterar calculos automaticamente.

### 4.8 Catálogo visual de verbas, adicionais e benefícios (cards pré-definidos)

1. O seletor de verbas e adicionais apresenta as opções divididas visualmente por categorias conceituais (Trabalho Extraordinário & Funções, Direitos Periódicos & Afastamentos, Indenizações & Viagens, Benefícios & Vantagens), com campo de busca instantânea e botões de ação rápida em substituição a dropdowns fechados que ocultam as opções do usuário.
2. Cada chip informa claramente o estado da verba: se não adicionada, inclusão em 1 clique; se já adicionada, rolagem suave (*scroll into view*) com destaque visual temporário até o card na tela.
3. Cards que permitem repetição (como Hora Extra e Substituição de Função) informam a quantidade ativa no chip e oferecem botão rápido para inclusão de nova instância, mantendo configurações e cálculos estritamente isolados.
4. No detalhamento final, rubricas repetidas devem ser apresentadas sem consolidar incidências distintas de forma ambígua.

### 4.9 Imposto de Renda de Exercícios Anteriores (IR-EA / RRA)

1. Apuração progressiva acumulada por competências distintas conforme o art. 12-A da Lei nº 7.713/1988 e Instrução Normativa RFB nº 1.500/2014.
2. O número de meses ($NM$) corresponde à quantidade de competências distintas informadas entre todos os créditos em EA da folha; competências repetidas entre rubricas distintas decorrem do mesmo período e não duplicam $NM$. Informação documental explícita de $NM$ prevalece.
3. A tabela progressiva mensal tem suas faixas e deduções escalonadas pela multiplicação direta por $NM$.
4. A redução do imposto introduzida para o ano-calendário de 2026 (Lei nº 9.250/1995, art. 3º-A incluído pela Lei nº 15.270/2025 c/c Anexo X da IN RFB nº 1.500/2014) incide sobre o montante consolidado de rendimentos tributáveis recebidos no mês do pagamento, sem multiplicação das faixas nominais do redutor por $NM$ nem divisão por média mensal.
5. O imposto apurado de RRA é rateado entre as entradas em EA pelo método dos maiores restos (Hare-Niemeyer), preservando a exatidão em centavos. Descontos dedutíveis abatem a base sem diminuir o denominador dos créditos no rateio.
6. Quando o servidor informar dependentes de IR no cabeçalho da folha, a dedução legal correspondente é vinculada e aplicada por padrão na apuração do IR-EA (RRA), com controle reativo por checkbox para permitir desmarcar caso a fonte pagadora não tenha abatido dependentes na origem, eliminando a exigência de cálculo manual ou lançamento burocrático de ajustes documentados para dependentes já cadastrados.

### 4.10 Serviço Extraordinário (Horas Extras - Resolução STM nº 374/2025 e Resolução CJF nº 4/2008)

1. O valor da hora extraordinária é apurado dividindo-se a remuneração mensal pelo divisor correspondente à jornada de trabalho semanal do servidor, excluídos o adicional de 1/3 de férias e a gratificação natalina (art. 7º da Resolução STM nº 374/2025 e art. 46 da Resolução CJF nº 4/2008).
2. Divisores padrão: 175 para a jornada ordinária da JMU de 35h semanais (art. 7º, § 1º, I) e 200 para a jornada ordinária da JF de 40h semanais (art. 46, § 1º).
3. Jornadas especiais: 30h semanais aplicam divisor 150 (art. 7º, § 1º, II) e 20h semanais aplicam divisor 100 (art. 7º, § 1º, III). Para jornadas diversas, aplica-se a fórmula legal $(\text{Jornada Semanal} \div 6) \times 30$ (art. 7º, § 2º).
4. O divisor mensal é parametrizado e editável por instância (`OvertimeEntry.divisor`), garantindo isolamento entre cards e permitindo override direto pelo usuário.
5. Em conformidade com o art. 6º, § 1º da Resolução STM nº 374/2025 (redação da Resolução STM nº 399/2026), no período de recesso forense / plantão o teto informativo da JMU eleva-se de 30 para 50 horas mensais.
6. A memória de cálculo unitária informa os valores da Hora Normal (com identificação do divisor aplicado), Hora Extra (+50%) e Hora Extra (+100%) integrada organicamente ao Resumo Calculado (`PresetGrossSummary`) do card de Serviço Extraordinário, preservando o padrão visual e a consistência arquitetural do sistema.

## 5. Admin e seguranca operacional

1. Rotas admin: `/admin`, `/admin/global`, `/admin/power`, `/admin/org`.
2. Escrita em configuracao deve passar por fluxo admin e confirmacao de impacto.
3. Politica esperada de acesso:
   - leitura de `*_config` para simulacao
   - escrita restrita a admin/service role
4. No serviço administrativo, configurações previdenciárias publicadas exigem versionamento, preservando conteúdo das regras anteriores. Regra aberta só pode ser encerrada na fronteira mensal da nova vigência com sucessora explícita. Não permitir versão futura ou originada de registro encerrado. Catálogo e histórico são governados em `power_config`; o editor de órgão não pode criar, remover ou reescrever esses arrays locais. Estas validações do serviço não substituem restrições de acesso do banco.

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
    - **Acompanhamento de autoridade em tempo integral e hospedagem no mesmo local** (art. 9º, § 1º do Ato Normativo STM Nº 799/2024 e art. 6º, § 5º da Resolução CNJ Nº 73/2009):
      - O servidor que prestar assistência com exigência de acompanhamento em tempo integral e hospedagem no mesmo local faz jus a diária correspondente a **90% do valor da diária atribuído à autoridade assistida**.
      - **Na Justiça Militar da União (JMU / STM)**:
        - Ministro do STM (100% STF) -> 90% de R$ 1.466,95 = **R$ 1.320,26**.
        - Juiz Federal da JMU / Substituto (95% do STM) -> 90% de R$ 1.393,60 = **R$ 1.254,24**.
      - **Na Justiça Federal (CJF e TRFs)**:
        - Desembargador Federal / Membro de TRF (95% STF) -> 90% de R$ 1.393,60 = **R$ 1.254,24**.
        - Juiz Federal / Substituto (90,25% STF) -> 90% de R$ 1.323,92 = **R$ 1.191,53**.
        - Ministro / Membro do CJF (100% STF) -> 90% de R$ 1.466,95 = **R$ 1.320,26**.
5. Adicional de Transporte / Embarque no PJU:
   - **Na Justiça Militar da União (JMU / STM - Ato Normativo STM Nº 799/2024, art. 8º):** Denominado "Adicional de embarque e desembarque", correspondente a 40% da diária de Ministro do STM para ida e volta (R$ 586,78) e 20% para ida ou volta (R$ 293,39).
   - **Na Justiça Federal (CJF e TRFs - Resolução CJF Nº 340/2015, art. 17 e Anexo / Art. 19):** Denominado "Adicional de transporte" (para cobrir despesas de deslocamento até os locais de embarque e desembarque), correspondente a 80% sobre o valor básico da diária de Analista Judiciário (equivalente a 44% da diária de Ministro do STF para percurso completo).
     - Conforme o Anexo da Res. CJF 340/2015 ("Uso de Veículo Oficial") e art. 17, § 2º, a viagem padrão é dividida em **4 trechos autônomos de 25% cada**:
       1. Afastamento: residência ou trabalho até o local de embarque (25%);
       2. Afastamento: local de desembarque até o trabalho ou hospedagem (25%);
       3. Retorno: trabalho ou hospedagem até o local de embarque (25%);
       4. Retorno: local de desembarque até a residência ou trabalho (25%).
     - O adicional não é devido nos trechos realizados com utilização de veículo oficial. A calculadora permite seleção granular via checkboxes de cada trecho realizado sem veículo oficial (0%, 25%, 50%, 75% ou 100%), calculados de forma 100% dinâmica sobre a base do percurso integral derivado da diária de Ministro do STF, sem valores nominais hardcoded.

6. Equipe de Trabalho no PJU (art. 8º do Ato Normativo STM Nº 799/2024, art. 10, § 1º da Resolução CJF Nº 340/2015 e art. 6º, § 2º da Resolução CNJ Nº 73/2009):
   - Os servidores que se afastarem em equipe de trabalho recebem diárias em valores equivalentes, correspondentes ao **maior valor da diária atribuído entre os servidores membros da equipe**.
   - **Na Justiça Militar da União (JMU / STM - art. 8º do Ato Normativo STM Nº 799/2024)**:
     - Se um Técnico Judiciário (45% STM = R$ 660,13) se deslocar em equipe com um Analista Judiciário (55% STM = R$ 806,82), recebe a diária de Analista (**R$ 806,82**).
     - Se o Técnico Judiciário se deslocar com um ocupante de Cargo em Comissão (CJ-1 a CJ-4, 60% STM = R$ 880,17), recebe a diária de CJ (**R$ 880,17**).
     - Se um Analista Judiciário se deslocar com ocupante de CJ, recebe a diária de CJ (**R$ 880,17**).
     - O servidor nunca recebe valor inferior ao do seu próprio cargo/função (`Math.max(regularRate, teamRate)`).
   - **Na Justiça Federal (CJF e TRFs - art. 10, § 1º da Resolução CJF Nº 340/2015 c/c art. 6º, § 2º da Resolução CNJ Nº 73/2009)**:
     - Se um Técnico Judiciário (45% STF = R$ 660,13) se deslocar em equipe com um Analista Judiciário ou com um ocupante de Cargo em Comissão (CJ-1 a CJ-4, ambos a 55% STF = R$ 806,82), recebe a diária correspondente (**R$ 806,82**).
     - Se um Analista Judiciário se deslocar com ocupante de CJ, mantém a diária de 55% (**R$ 806,82**).
     - Se um Auxiliar Judiciário se deslocar com Técnico, recebe a diária de Técnico (**R$ 660,13**).
     - O servidor nunca recebe valor inferior ao do seu próprio cargo/função (`Math.max(regularRate, teamRate)`).
   - A opção não se aplica a magistrados em deslocamento institucional.

## 12. Gratificação por Atuação de Alta Complexidade (GAACTA - Resolução STM nº 397/2026 e JF)

1. **Origem e revogação:** A Resolução STM nº 376, de 7 de agosto de 2025 (licença compensatória na JMU), foi revogada pela Resolução STM nº 397, de 19 de junho de 2026, com efeitos financeiros a partir de 1º de junho de 2026, instituindo a Gratificação por Atuação de Alta Complexidade, Técnica e Administrativa (GAACTA).
2. **Beneficiários exclusivos:** A GAACTA é devida privativamente a servidores ocupantes de cargo em comissão (**CJ-1, CJ-2, CJ-3 e CJ-4**) nas estruturas previstas no art. 2º da Resolução STM nº 397/2026 (Gabinetes de Ministros, estruturas vinculadas à Presidência, Secretaria-Geral, Secretaria do Tribunal, Auditoria Interna, Vice-Presidência, Corregedoria, ENFAM, Ouvidoria e Diretores de Secretaria CJ-3 das Auditorias da JMU). Servidores sem função ou com função de confiança (FC-1 a FC-6) não são elegíveis.
3. **Alíquota e base de cálculo:** O valor da GAACTA corresponde a **15% (quinze por cento)** aplicado sobre o valor da respectiva **remuneração** do servidor comissionado. A composição da base de cálculo é configurável interativamente por checkboxes dinâmicos (Vencimento Básico, GAJ, Parcela de Cargo em Comissão / Opção de CJ, Adicionais de Qualificação por Títulos e Treinamento, e parcelas variáveis de vantagens pessoais como VPNI e ATS lançadas por meio das Rubricas Manuais de crédito, além de Abono de Permanência ou parcelas complementares ajustáveis), adaptando-se às decisões administrativas e à realidade de cada servidor da JMU e da JF. As rubricas manuais de crédito criadas pelo usuário são refletidas dinamicamente como checkboxes independentes no módulo da GAACTA. O Abono de Permanência permanece selecionado por padrão (`gaactaIncideAbono`), incidindo automaticamente sempre que o servidor receber abono (`recebeAbono`), e sendo ativado na GAACTA quando o usuário adicionar o abono.
4. **Natureza indenizatória e isenção:** A gratificação possui natureza estritamente indenizatória (art. 4º), não integrando a remuneração nem compondo base de cálculo para contribuição previdenciária (PSS/RPPS) nem incidência de imposto de renda (IRRF), nem servindo de base para outros adicionais.
5. **Incompatibilidade com serviço extraordinário:** O acúmulo da GAACTA é incompatível com a prestação de serviço extraordinário, exceto no período do recesso judiciário (art. 6º). Havendo concomitância, o servidor deverá optar entre a GAACTA e as Horas Extras. A calculadora emite alertas cruzados em ambos os módulos (GAACTA e Horas Extras), mantendo a ressalva ativável para o período de recesso forense.
6. **Módulo base para a Justiça Federal:** A arquitetura do módulo GAACTA serve de base unificada e parametrizada para a expansão e aplicação na Justiça Federal (JF) e demais órgãos do Poder Judiciário da União.
7. **Exibição nas Rubricas Pré-definidas:** A gratificação figura no seletor de Rubricas Pré-definidas sob a nomenclatura canônica "Gratificação por Atividades de Alta Complexidade (GAACTA)", alinhando a opção do seletor ao título do card e garantindo localização alfabética imediata no grupo de gratificações. A parametrização versionada (`gaacta_rules`) contempla a JMU e a Justiça Federal (CJF e TRFs) desde 06/2026, com suporte a fallback transitório em `ConfigService` para assegurar disponibilidade operacional contínua na UI.

## 13. Indenização de Transporte na JMU

1. A indenização do ATN STM nº 212/2017 alcança o Oficial de Justiça Avaliador Federal e o servidor designado ad hoc, inclusive de cargo diverso. O usuário informa os dias elegíveis de diligência externa, excluídos afastamentos e impedimentos; diversas diligências no mesmo dia contam uma vez.
2. Valor integral e divisor são configurados por órgão e vigência. O cálculo usa o valor integral multiplicado pelos dias elegíveis limitados ao divisor, dividido pelo divisor, com arredondamento apenas no resultado. O ATN STM nº 596/2022 fixou R$ 2.075,88 desde sua publicação em 21/10/2022; o ATN STM nº 935/2026 fixou R$ 2.168,46 desde sua publicação em 13/02/2026. Não se presume valor para período anterior ao cadastro. Na JMU, quando a vigência de novo valor começar durante a competência, a simulação usa o valor atualizado para o mês todo, com alerta informando a data efetiva e que o tratamento é uma convenção de simulação, sem afirmar retroatividade legal. A política é configurada por órgão; meses sem versão vigente ao final permanecem indisponíveis.
3. A simulação não substitui a comprovação e atestação exigidas pelo art. 3º do ATN nº 212/2017. Diárias no mesmo mês não excluem automaticamente toda a indenização: o usuário exclui os dias impedidos. Não se aplicam desconto de auxílio-alimentação, incidências de IR, PSS e Funpresp, nem inclusão em bases remuneratórias. O crédito integra o Holerite e não o bloco de Diárias.
4. Em `org_config.configuration.transport_indemnity.versions`, `validFrom` e `validTo` representam os limites históricos de vigência; valor integral, divisor e incidências integram cada versão. Novas versões preservam as anteriores. A ausência de configuração ou de vigência aplicável não presume regras da JMU para outro órgão.

## 14. Indenização de Transporte no CJF e na Justiça Federal

1. **Regência e Beneficiários:** A indenização de transporte na Justiça Federal é disciplinada pela Resolução CJF nº 4/2008 (Capítulo IV, arts. 54 a 58) e portarias de reajuste do Presidente do CJF (art. 58). É destinada exclusivamente a servidores ocupantes do cargo de Analista Judiciário, Área Judiciária, especialidade Oficial de Justiça Avaliador Federal (Portaria CJF nº 182/2026), não se aplicando a extensão a oficiais ad hoc da JMU.
2. **Competência do Serviço e Mês de Pagamento:** Conforme o art. 56 da Resolução CJF nº 4/2008, o pagamento é realizado no mês seguinte ao da execução do serviço externo. Na calculadora e na memória de cálculo, a folha de pagamento define a competência de pagamento e o serviço refere-se ao mês anterior (inclusive na virada de ano, como serviço em 12/2025 pago na folha de 01/2026). Os dias informados referem-se ao mês de serviço e respeitam o limite do calendário desse mês. Ambos os meses são preservados na visualização, salvamento e exportação.
3. **Cálculo e Parâmetros:** O valor integral é devido a partir de 20 dias de serviço externo no mês; abaixo de 20 dias, aplica-se 1/20 por dia elegível (art. 55, caput e § 1º). Dias além do divisor são limitados ao valor integral. A fração diária mantém precisão intermediária com arredondamento em centavos apenas no resultado final.
4. **Vigência e Efeitos Financeiros:** As portarias do CJF distinguem a data de publicação no DOU (vigência do ato formal) da data de efeitos financeiros retroativos a 1º de janeiro. A Portaria CJF nº 43/2025 fixou R$ 2.289,21 (DOU 13/02/2025, efeitos a 01/01/2025). A Portaria CJF nº 182/2026 fixou R$ 2.391,30 (DOU 08/04/2026, efeitos a 01/01/2026). Períodos sem regra cadastrada (como serviço em 2024) permanecem explicitamente indisponíveis, sem presunção de valores históricos. Competências simuladas antes da publicação informam a data de publicação e a retroatividade dos efeitos financeiros.
5. **Comprovação, Exclusões e Incidências:** Excluem-se férias, licenças e afastamentos, ainda que de efetivo exercício (art. 56, parágrafo único). Diárias no mês excluem apenas os dias coincidentes, sem zerar os demais dias elegíveis (art. 55, § 2º). É vedado suprimento de fundos ou uso de veículo oficial para a finalidade (art. 57). O pagamento depende de atestação pelo titular da unidade (art. 56). A verba é isenta de IR (Decreto nº 9.580/2018, art. 35, I, 'e'), PSS (Lei nº 10.887/2004, art. 4º, § 1º, III) e Funpresp-Jud, não sofre desconto de auxílio-alimentação e integra o Holerite como crédito único fora do bloco de Diárias.

## 15. Automação de versionamento e sincronização com Git

1. Ao concluir qualquer tarefa que envolva criação, edição ou exclusão de arquivos de código, schema, seeds, regras ou documentação, o agente (Antigravity) deve executar de forma automatizada e sem necessidade de solicitação adicional do usuário:
   - Sincronização prévia com o remoto (`git pull --rebase origin main`).
   - Adição das alterações preparadas (`git add -A`).
   - Criação de commit semântico com mensagem clara e objetiva no padrão Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, etc.).
   - Envio imediato ao repositório remoto (`git push origin main`).
2. O agente não deve encerrar seu turno com alterações pendentes não commitadas ou não enviadas, exceto em caso explícito de bloqueio técnico ou erro de autenticação remota que requeira ação do usuário.
3. Manter a árvore de trabalho limpa e o branch local alinhado ao branch remoto após cada entrega.

