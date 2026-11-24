# PROJECT_RULES

Atualizado em: 24/11/2026 18:30

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

### 4.0 Índice de regras por módulo

O documento principal é obrigatório em toda tarefa. Para alterações de cálculo, configuração, comportamento funcional ou documentação de regra, leia cada página dos módulos afetados. Alterações exclusivamente visuais ou textuais sem efeito funcional exigem apenas este documento. Se o escopo mudar, leia as páginas adicionais antes de editar. Páginas de módulo têm força normativa para seu escopo e cada regra detalhada possui um único local canônico.

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

### 4.1 Regras compartilhadas de apresentação

1. A calculadora apresenta, nesta ordem, Competência (mês, ano e enquadramento normativo), Dados básicos, Adicional de Qualificação (AQ), Vantagens pessoais, Benefícios, Previdência e abono, Imposto de Renda, Créditos Eventuais, Descontos, Observações/Notas e Resultado.
2. As páginas organizam a coleta dos dados; não duplicam nem alteram os valores e regras do motor oficial.
3. Descontos devem ter estilo visual próprio, sem prefixo textual `(-)`. Campos numéricos não aceitam valor negativo.
4. O detalhamento separa `Holerite` e `Diárias`, exibe créditos antes dos débitos em cada bloco e calcula totais apenas com os valores daquele bloco. A verba de indenização de transporte integra Holerite.
5. No rodapé mobile (`MobileResultsBar`), o valor líquido permanece fixo e visível, com CTA `Exportar` e seta colapsável para ações Limpar, Holerites, PDF, Excel e Salvar. `VersionBadge` pode aparecer no layout interno, mas não no texto do CTA.
6. Não manter gatilhos fixos hardcoded (incluindo `Johnson*`) para alterar cálculos automaticamente.
7. O seletor apresenta categorias Trabalho Extraordinário & Funções, Direitos Periódicos, Indenizações & Viagens e Descontos, busca instantânea e ações rápidas. Chips permitem inclusão em um clique ou navegação ao card existente. Cards repetíveis indicam quantidade e preservam configurações isoladas. Rubricas repetidas não consolidam incidências distintas de forma ambígua.

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
2. O catalogo de especialistas e operacional; o `PROJECT_RULES.md` concentra regras comuns e o índice de módulos; páginas indicadas são canônicas para regras detalhadas de seus módulos.
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
2. Escalonamento na Justiça Federal (Resolução CJF nº 340/2015, art. 10). A calculadora usa os valores nacionais nominais da tabela ativa em `dailies_rules.tariff_versions`, independentemente da competência da folha. A Portaria CJF nº 315/2026 vigora desde 10/06/2026 e fixa o limite nacional de R$ 1.165,27.
   - Membro do CJF: 100% da diária de Ministro do STF (R$ 1.545,53).
   - Membro de TRF (Desembargador Federal): 95% da diária de Ministro do STF (R$ 1.468,25).
   - Juiz Federal ou Juiz Federal Substituto: 95% da diária do membro do TRF (R$ 1.394,84).
   - Analista Judiciário ou Cargo em Comissão (CJ-1 a CJ-4): 55% da diária de Ministro do STF (R$ 850,04).
   - Técnico Judiciário ou Função Comissionada (FC-1 a FC-6): 45% da diária de Ministro do STF (R$ 695,49).
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
       - Desembargador Federal / Membro de TRF (95% STF) -> 80% de R$ 1.468,25 = **R$ 1.174,60**.
       - Juiz Federal / Substituto (95% do TRF) -> 80% de R$ 1.394,84 = **R$ 1.115,87**.
       - Ministro / Membro do CJF (100% STF) -> 80% de R$ 1.545,53 = **R$ 1.236,42**.
       - Não exibir opções da JMU (como Ministro do STM).
   - A opção não se aplica a magistrados em deslocamento institucional.
    - **Acompanhamento de autoridade em tempo integral e hospedagem no mesmo local** (art. 9º, § 1º do Ato Normativo STM Nº 799/2024 e art. 6º, § 5º da Resolução CNJ Nº 73/2009):
      - O servidor que prestar assistência com exigência de acompanhamento em tempo integral e hospedagem no mesmo local faz jus a diária correspondente a **90% do valor da diária atribuído à autoridade assistida**.
      - **Na Justiça Militar da União (JMU / STM)**:
        - Ministro do STM (100% STF) -> 90% de R$ 1.466,95 = **R$ 1.320,26**.
        - Juiz Federal da JMU / Substituto (95% do STM) -> 90% de R$ 1.393,60 = **R$ 1.254,24**.
      - **Na Justiça Federal (CJF e TRFs)**:
        - Desembargador Federal / Membro de TRF (95% STF) -> 90% de R$ 1.468,25 = **R$ 1.321,43**.
        - Juiz Federal / Substituto (95% do TRF) -> 90% de R$ 1.394,84 = **R$ 1.255,36**.
        - Ministro / Membro do CJF (100% STF) -> 90% de R$ 1.545,53 = **R$ 1.390,98**.
5. Adicional de Transporte / Embarque no PJU:
   - **Na Justiça Militar da União (JMU / STM - Ato Normativo STM Nº 799/2024, art. 8º):** Denominado "Adicional de embarque e desembarque", correspondente a 40% da diária de Ministro do STM para ida e volta (R$ 586,78) e 20% para ida ou volta (R$ 293,39).
   - **Na Justiça Federal (CJF e TRFs, Resolução CJF nº 340/2015, art. 17 e Anexo / art. 19):** O “Adicional de transporte” cobre as despesas de deslocamento até os locais de embarque e desembarque. O valor do percurso integral é o nominal da Portaria CJF nº 315/2026, **R$ 680,00**.
     - Conforme o Anexo da Res. CJF 340/2015 ("Uso de Veículo Oficial") e art. 17, § 2º, a viagem padrão é dividida em **4 trechos autônomos de 25% cada**:
       1. Afastamento: residência ou trabalho até o local de embarque (25%);
       2. Afastamento: local de desembarque até o trabalho ou hospedagem (25%);
       3. Retorno: trabalho ou hospedagem até o local de embarque (25%);
       4. Retorno: local de desembarque até a residência ou trabalho (25%).
     - O adicional não é devido nos trechos realizados com utilização de veículo oficial. A calculadora permite selecionar cada trecho sem veículo oficial e aplica a proporção correspondente sobre o valor nominal configurado.

6. Equipe de Trabalho no PJU (art. 8º do Ato Normativo STM Nº 799/2024, art. 10, § 1º da Resolução CJF Nº 340/2015 e art. 6º, § 2º da Resolução CNJ Nº 73/2009):
   - Os servidores que se afastarem em equipe de trabalho recebem diárias em valores equivalentes, correspondentes ao **maior valor da diária atribuído entre os servidores membros da equipe**.
   - **Na Justiça Militar da União (JMU / STM - art. 8º do Ato Normativo STM Nº 799/2024)**:
     - Se um Técnico Judiciário (45% STM = R$ 660,13) se deslocar em equipe com um Analista Judiciário (55% STM = R$ 806,82), recebe a diária de Analista (**R$ 806,82**).
     - Se o Técnico Judiciário se deslocar com um ocupante de Cargo em Comissão (CJ-1 a CJ-4, 60% STM = R$ 880,17), recebe a diária de CJ (**R$ 880,17**).
     - Se um Analista Judiciário se deslocar com ocupante de CJ, recebe a diária de CJ (**R$ 880,17**).
     - O servidor nunca recebe valor inferior ao do seu próprio cargo/função (`Math.max(regularRate, teamRate)`).
   - **Na Justiça Federal (CJF e TRFs - art. 10, § 1º da Resolução CJF Nº 340/2015 c/c art. 6º, § 2º da Resolução CNJ Nº 73/2009)**:
     - Se um Técnico Judiciário (R$ 695,49) se deslocar em equipe com um Analista Judiciário ou com um ocupante de Cargo em Comissão (CJ-1 a CJ-4), recebe a diária correspondente (**R$ 850,04**).
     - Se um Analista Judiciário se deslocar com ocupante de CJ, mantém a diária de 55% (**R$ 850,04**).
     - Se um Auxiliar Judiciário se deslocar com Técnico, recebe a diária de Técnico (**R$ 695,49**).
     - O servidor nunca recebe valor inferior ao do seu próprio cargo/função (`Math.max(regularRate, teamRate)`).
   - A opção não se aplica a magistrados em deslocamento institucional.

## 12. Gratificação por Atuação de Alta Complexidade (GAACTA - Resolução STM nº 397/2026 e JF)

1. **Origem e revogação:** A Resolução STM nº 376, de 6 de agosto de 2025, previu a licença compensatória na JMU com efeitos desde 1º de julho de 2025 (art. 6º). A Resolução STM nº 397, de 19 de junho de 2026, revogou a Resolução STM nº 376/2025 e instituiu a Gratificação por Atuação de Alta Complexidade, Técnica e Administrativa (GAACTA), com efeitos financeiros desde 1º de junho de 2026.
2. **Beneficiários exclusivos:** A GAACTA é devida privativamente a servidores ocupantes de cargo em comissão (**CJ-1, CJ-2, CJ-3 e CJ-4**) nas estruturas previstas no art. 2º da Resolução STM nº 397/2026 (Gabinetes de Ministros, estruturas vinculadas à Presidência, Secretaria-Geral, Secretaria do Tribunal, Auditoria Interna, Vice-Presidência, Corregedoria, ENFAM, Ouvidoria e Diretores de Secretaria CJ-3 das Auditorias da JMU). Servidores sem função ou com função de confiança (FC-1 a FC-6) não são elegíveis.
3. **Alíquota e base de cálculo:** O valor da GAACTA corresponde a **15% (quinze por cento)** aplicado sobre o valor da respectiva **remuneração** do servidor comissionado. A composição da base de cálculo é configurável interativamente por checkboxes dinâmicos (Vencimento Básico, GAJ, Parcela de Cargo em Comissão / Opção de CJ, Adicionais de Qualificação por Títulos e Treinamento, e parcelas variáveis de vantagens pessoais como VPNI e ATS lançadas por meio das Rubricas Manuais de crédito, além de Abono de Permanência ou parcelas complementares ajustáveis), adaptando-se às decisões administrativas e à realidade de cada servidor da JMU e da JF. As rubricas manuais de crédito criadas pelo usuário são refletidas dinamicamente como checkboxes independentes no módulo da GAACTA. O Abono de Permanência permanece selecionado por padrão (`gaactaIncideAbono`), incidindo automaticamente sempre que o servidor receber abono (`recebeAbono`), e sendo ativado na GAACTA quando o usuário adicionar o abono.
4. **Natureza indenizatória e isenção:** A gratificação possui natureza estritamente indenizatória (art. 4º), não integrando a remuneração nem compondo base de cálculo para contribuição previdenciária (PSS/RPPS) nem incidência de imposto de renda (IRRF), nem servindo de base para outros adicionais. Por solicitação expressa do usuário, a composição configurável de HE oferece inclusão opcional da GAACTA na simulação, desmarcada por padrão, sem apresentá-la como incidência legal automática.
5. **Incompatibilidade com serviço extraordinário:** O acúmulo da GAACTA é incompatível com a prestação de serviço extraordinário, exceto no período do recesso judiciário (art. 6º). Havendo concomitância, o servidor deverá optar entre a GAACTA e as Horas Extras. A calculadora emite alertas cruzados em ambos os módulos (GAACTA e Horas Extras), mantendo a ressalva ativável para o período de recesso forense.
6. **Módulo base para a Justiça Federal:** A arquitetura do módulo GAACTA serve de base unificada e parametrizada para a expansão e aplicação na Justiça Federal (JF) e demais órgãos do Poder Judiciário da União.
7. **Exibição em Dados básicos:** GAACTA e Licença Compensatória compartilham um card entre Dados principais e GAE/GAS, com seleção exclusiva, personalização da base e detalhamento. O ícone de interrogação reúne a explicação das rubricas, as normas e as informações sobre vigência e revogação aplicáveis ao órgão. O aviso de vigência aparece somente após a escolha de GAACTA sem regra vigente cadastrada ou de Licença Compensatória na JMU fora das competências de julho de 2025 a maio de 2026. A abertura de um holerite salvo com as duas rubricas preserva o registro até a escolha explícita do usuário. A parametrização versionada (`gaacta_rules`) contempla a JMU e a Justiça Federal (CJF e TRFs) desde 06/2026, com suporte a fallback transitório em `ConfigService`.
8. **Composição da Licença Compensatória na simulação:** O padrão reproduz a base anterior. A personalização permite excluir parcelas dessa base e incluir créditos avulsos mediante seleção explícita por rubrica. Os valores, parâmetros e cálculo permanecem no motor oficial.

## 13. Indenização de Transporte na JMU

1. A indenização do ATN STM nº 212/2017 alcança o Oficial de Justiça Avaliador Federal e o servidor designado ad hoc, inclusive de cargo diverso. O usuário informa os dias elegíveis de diligência externa, excluídos afastamentos e impedimentos; diversas diligências no mesmo dia contam uma vez.
2. Valor integral e divisor são configurados por órgão e vigência. O cálculo usa o valor integral multiplicado pelos dias elegíveis limitados ao divisor, dividido pelo divisor, com arredondamento apenas no resultado. O ATN STM nº 596/2022 fixou R$ 2.075,88 desde sua publicação em 21/10/2022; o ATN STM nº 935/2026 fixou R$ 2.168,46 desde sua publicação em 13/02/2026. Não se presume valor para período anterior ao cadastro. Na JMU, quando a vigência de novo valor começar durante a competência, a simulação usa o valor atualizado para o mês todo, com alerta informando a data efetiva e que o tratamento é uma convenção de simulação, sem afirmar retroatividade legal. A política é configurada por órgão; meses sem versão vigente ao final permanecem indisponíveis.
3. A simulação não substitui a comprovação e atestação exigidas pelo art. 3º do ATN nº 212/2017. Diárias no mesmo mês não excluem automaticamente toda a indenização: o usuário exclui os dias impedidos. Não se aplicam desconto de auxílio-alimentação, incidências de IR, PSS e Funpresp, nem inclusão em bases remuneratórias. O crédito integra o Holerite e não o bloco de Diárias.
4. Em `org_config.configuration.transport_indemnity.versions`, `validFrom` e `validTo` representam os limites históricos de vigência; valor integral, divisor e incidências integram cada versão. Novas versões preservam as anteriores. A ausência de configuração ou de vigência aplicável não presume regras da JMU para outro órgão.
5. Na JMU e na Justiça Federal, o card aceita quantidade, períodos ou dias avulsos. Só o modo ativo entra no cálculo. Quantidade e períodos usam o mês de serviço previsto para a folha. Dias avulsos permitem lançar datas de vários meses, até esse mês de serviço, para simular o pagamento acumulado. O motor aplica o valor, o divisor, o limite e a política de vigência de cada mês, soma os valores mensais em centavos e mantém um único crédito. Os períodos incluem início e fim, e cada data conta uma vez. Datas inválidas ou incompletas impedem o resultado definitivo. No modo avulso, um mês selecionado sem regra disponível também bloqueia a apuração. Ao alternar o modo, navegar ou reabrir, preservar as seleções. Memória e exportações registram as datas e a apuração de cada mês.

## 14. Indenização de Transporte no CJF e na Justiça Federal

1. **Regência e Beneficiários:** A indenização de transporte na Justiça Federal é disciplinada pela Resolução CJF nº 4/2008 (Capítulo IV, arts. 54 a 58) e portarias de reajuste do Presidente do CJF (art. 58). É destinada exclusivamente a servidores ocupantes do cargo de Analista Judiciário, Área Judiciária, especialidade Oficial de Justiça Avaliador Federal (Portaria CJF nº 182/2026), não se aplicando a extensão a oficiais ad hoc da JMU.
2. **Competência do Serviço e Mês de Pagamento:** Conforme o art. 56 da Resolução CJF nº 4/2008, o pagamento é realizado no mês seguinte ao da execução do serviço externo. A folha define a competência de pagamento e o mês anterior é a referência padrão de serviço (inclusive na virada de ano, como serviço em 12/2025 pago na folha de 01/2026). Para simular pagamento acumulado no modo por dias avulsos, esse mês é o limite mais recente. Cada mês de serviço selecionado tem apuração própria e aparece na memória da folha, na visualização e na exportação.
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
4. Ferramentas locais de automação disponíveis para desenvolvedores e agentes:
   - Script npm: `npm run sync` (sincroniza, commita e envia) e `npm run sync:watch` (monitoramento contínuo em background).
   - Script PowerShell: `.\git-sync.ps1` (ou `.\git-sync.ps1 "mensagem"` / `.\git-sync.ps1 -Watch`).
   - Git aliases: `git sync` e `git autopush`.
   - Git Hook (`.git/hooks/post-commit`): envio automático para `origin/main` após qualquer commit local.
   - Extensão IDE (GitDoc - `vsls-contrib.gitdoc`): configurada e ativada no workspace e no perfil do usuário (`gitdoc.enabled: true`, `gitdoc.autoPush: "onCommit"`, `gitdoc.pushMode: "push"`), executando commit e push automáticos no GitHub ao salvar ou concluir edições locais.

