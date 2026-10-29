# Especialistas Codex

Catalogo operacional de especialistas. Leia `PROJECT_RULES.md` antes de alterar codigo, schema, seeds ou documentacao. As regras do projeto prevalecem e os modelos e esforcos abaixo dependem da disponibilidade e do runtime.

| Especialista | Modelo e esforco | Finalidade |
| --- | --- | --- |
| Codex Orchestrator | GPT-6.1 Sol, medio | Coordenacao, complexidade, integracao e revisao final. Aumentar o esforco conforme a tarefa. |
| Repo Explorer | GPT-6 Luna, baixo ou medio | Localizar referencias, mapear e resumir codigo, sem decidir regras de negocio. |
| Frontend Calculator Specialist | GPT-6.1 Terra, medio | UI e manutencao localizada; usar Sol para estado complexo ou impacto em regra de negocio. |
| Calc Engine Specialist | GPT-6.1 Sol, alto para calculo oficial | Motor em `src/services/agency/**`, incidencias, configuracao e calculos. Ajustar esforco ao risco. |
| Rules Guardian | GPT-6.1 Sol, alto para calculo e revisao normativa | Revisar aderencia a `PROJECT_RULES.md`, regras e rastreabilidade. Luna pode atender verificacoes textuais simples. |
| Supabase and Data Specialist | GPT-6.1 Sol, alto | Migrations, seeds, RLS, autenticacao, configuracao administrativa e estrutura de dados. |
| QA and Review Specialist | GPT-6.1 Terra, medio | Verificacoes localizadas de baixo risco; usar Sol e esforco alto para mudancas criticas. |

## Uso e selecao

1. O agente principal usa preferencialmente Sol com esforco medio para implementacao, bugs e integracao. Usar esforco alto para calculo oficial, diarias, incidencias, admin sensivel, banco, migrations, seeds, RLS, autenticacao e seguranca. Esforcos superiores dependem da complexidade.
2. Luna atende tarefas simples com esforco baixo ou medio. Terra atende programacao moderada e localizada. Reservar Astra para dificuldades arquiteturais excepcionais, grande impacto ou quando tentativa adequada com Sol nao resolver; nao usa-lo como padrao.
3. Delegar quando houver beneficio concreto, especialmente em trabalhos independentes. Evitar varios subagentes para tarefas pequenas e evitar ownership sobreposto. Instrucoes do runtime prevalecem sobre este catalogo.
4. Mudancas em calculo oficial exigem revisao pelo especialista de regras/calculo antes da conclusao ou merge. Se nao houver delegacao, registrar a limitacao e realizar revisao especializada independente; quando a revisao por subagente for obrigatoria e indisponivel, informar a pendencia antes de concluir ou integrar.
5. Os arquivos `.codex/config.toml` e `.codex/agents/*.toml` definem padroes para runtimes compativeis e projetos confiaveis. A escolha condicional de Sol para frontend complexo ou QA critico, e de Luna para revisao textual simples, exige selecao adequada no runtime. Configuracao do cliente e selecoes explicitas podem prevalecer.
6. Se o runtime nao permitir selecionar modelo ou esforco por subagente, preservar a especializacao no prompt e registrar a limitacao; a revisao exigida continua necessaria.
7. Preferir velocidade Standard quando disponivel. Nao ativar Fast ou Ultra por padrao. O consumo real da franquia Plus depende da tarefa e das regras de uso, e nao pode ser inferido diretamente de precos de API.
8. O orquestrador classifica a complexidade e recomenda esforco baixo, medio, alto ou superior quando util. Regra oficial e configuracao sensivel exigem no minimo alto; registrar a recomendacao se nao houver seletor.
