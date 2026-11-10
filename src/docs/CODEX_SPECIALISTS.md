# Especialistas Codex

Catalogo operacional de especialistas. Leia `PROJECT_RULES.md` antes de alterar codigo, schema, seeds ou documentacao. As regras do projeto prevalecem e os modelos e esforcos abaixo dependem da disponibilidade e do runtime.

O relatorio de agentes ao final de cada tarefa segue a secao 10.1 de `PROJECT_RULES.md`, inclusive quando nao houver delegacao.

| Especialista | Modelo e esforco | Finalidade |
| --- | --- | --- |
| Codex Orchestrator | GPT-6 Luna, baixo ou medio | Coordenacao cotidiana, classificacao de complexidade, integracao e revisao final. Avaliar modelo e esforco caso a caso conforme `PROJECT_RULES.md`. |
| Repo Explorer | GPT-6 Luna, baixo ou medio | Localizar referencias, mapear e resumir codigo, sem decidir regras de negocio. |
| Frontend Calculator Specialist | Definidos caso a caso | UI e manutencao localizada. |
| Calc Engine Specialist | Definidos caso a caso | Motor em `src/services/agency/**`, incidencias, configuracao e calculos. Ajustar esforco ao risco. |
| Rules Guardian | Definidos caso a caso | Revisar aderencia a `PROJECT_RULES.md`, regras e rastreabilidade. Luna pode atender verificacoes textuais simples. |
| Supabase and Data Specialist | Definidos caso a caso | Migrations, seeds, RLS, autenticacao, configuracao administrativa e estrutura de dados. |
| QA and Review Specialist | Definidos caso a caso | Verificacoes e revisoes proporcionais ao risco. |

## Uso e selecao

1. O agente principal usa preferencialmente GPT-6 Luna com esforco baixo ou medio em tarefas cotidianas, consultas ao repositorio, ajustes localizados e documentacao simples.
2. Avaliar modelo e esforco caso a caso conforme complexidade, risco, incerteza, escopo e economia de recursos; explicar brevemente a escolha de ambos.
3. Delegar quando houver beneficio concreto, especialmente em trabalhos independentes. Evitar varios subagentes para tarefas pequenas e evitar ownership sobreposto. Instrucoes do runtime prevalecem sobre este catalogo.
4. Mudancas em calculo oficial exigem revisao pelo especialista de regras/calculo antes da conclusao ou merge. Se nao houver delegacao, registrar a limitacao e realizar revisao especializada independente; quando a revisao por subagente for obrigatoria e indisponivel, informar a pendencia antes de concluir ou integrar.
5. Os arquivos `.codex/config.toml` e `.codex/agents/*.toml` podem definir padroes para runtimes compativeis. A selecao efetiva depende do runtime; a recomendacao deve ser avaliada caso a caso.
6. Se o runtime nao permitir selecionar modelo ou esforco por subagente, preservar a especializacao no prompt e registrar a limitacao; a revisao exigida continua necessaria.
7. Preferir velocidade Standard quando disponivel. Nao ativar Fast ou Ultra por padrao. O consumo real da franquia Plus depende da tarefa e das regras de uso, e nao pode ser inferido diretamente de precos de API.
8. Antes de executar uma solicitacao, o orquestrador classifica a complexidade e recomenda modelo e esforco com breve justificativa para cada escolha. Se a recomendacao diferir do modelo selecionado, deve parar e perguntar ao usuario se deseja trocar para o recomendado. Se o runtime nao expuser modelo selecionado ou nao permitir a troca, informar isso e aguardar a escolha; nao iniciar a tarefa ate a resposta do usuario. Se o usuario escolher manter o modelo atual, prosseguir dentro das especializacoes e revisoes obrigatorias de `PROJECT_RULES.md`.
