# Changelog

## Não publicado - 29/10/2026
- Fix (Achado 1 da Auditoria): isolamento estrito dos componentes de 13º salário (vencimento e FC/CJ). O abatimento da 1ª parcela e a recomposição da base tributável passam a ser vinculados exclusivamente à existência da 2ª parcela do respectivo componente, impedindo abatimento indevido de FC quando apenas o vencimento for selecionado e tributação indevida de PSS de vencimento quando apenas FC for selecionada.
- Fix: card de diarias passa a exibir a norma local quando configurada; migration 015 completa a referencia normativa da JMU/STM, preservando a norma setorial consumida pelo calculo e os demais valores e configuracoes.
- Docs: tornado obrigatorio o relatorio final de agente principal e subagentes por tarefa, com modelos e esforcos, distincao entre configuracao e execucao confirmada e registro explicito de ausencia de delegacao.
- Config: definidos modelos e esforcos por especialista no Codex do projeto, com politica de delegacao proporcional ao risco e revisao especializada de calculos preservada.
- Docs: atualizados o catalogo operacional e a governanca de modelos; configuracao pessoal permanece independente.

## Correção do Adicional de Deslocamento e nomenclatura na Justiça Federal (CJF e TRFs) — 28/10/2026
- Nomenclatura oficial dinâmica no Detalhamento, PDF e Excel: o termo "Adicional de Embarque" estava fixo em useCalculatorResults.ts e foi tornado 100% dinâmico conforme a configuração de cada órgão (courtConfig.dailies.embarkationLabel). Para a Justiça Federal (CJF e TRFs 1 a 6), passa a exibir corretamente **"ADICIONAL DE DESLOCAMENTO (DIÁRIAS)"** e **"DIÁRIAS (SEM ADICIONAL DE DESLOCAMENTO)"**, enquanto para a JMU/STM mantém "Adicional de embarque e desembarque".
- Sincronização nos cards (accordion de diárias): o preset de demonstrativo de proventos brutos (presetGrossLines.ts) também passa a utilizar o embarkationLabel dinâmico do órgão.
- Calibração legal dos valores do Adicional de Deslocamento (art. 17 da Resolução CJF Nº 340/2015):
  - A norma prevê acréscimo de 80% sobre o valor básico da diária de Analista Judiciário (55% de Ministro do STF).
  - Portanto, o Adicional de Deslocamento Completo (ida e volta) equivale a 44% da diária de Ministro do STF (80% * 55% = 44%), totalizando **R$ 645,46** (corrigindo o valor anterior de R$ 586,78, que correspondia aos 40% da JMU).
  - A forma Metade (ida ou volta) decorre expressamente do § 2º do art. 17 c/c o Anexo da Resolução CJF Nº 340/2015 (25% por trecho de uso de veículo oficial ou não), correspondendo a 50% do adicional integral (22% de Ministro do STF), totalizando **R$ 322,73** (corrigindo o valor anterior de R$ 293,39).
- Nova migration 014_fix_cjf_trf_dailies_rules.sql e atualização do fallback em ConfigService.ts para CJF e TRF1 a TRF6.
- Validação: 12 testes em test:dailies, 24 testes em test:pension, 21 testes em test:payslip, 4 testes em test:sorting e checagem de tipos TypeScript 100% aprovados.

## Reatividade do resumo calculado e detalhamento em diárias de assessoramento — 28/10/2026
- Reatividade imediata: corrigido o hook `useCalculatorResults` adicionando `state.diariasAssessoramentoMagistrado`, `state.diariasAutoridadeAssistida` e `state.diariasFeriados` ao array de dependências de cálculo (`inputToken`).
- Sincronização de interface: ao marcar ou desmarcar a opção "Viagem em assessoramento direto / segurança a magistrado" ou alterar a autoridade assistida, os valores de "RESUMO CALCULADO" e "DETALHAMENTO" são recalculados e atualizados instantaneamente em tela.
- Resolução segura de autoridade: alinhamento dos fallbacks de autoridade assistida em `presetGrossLines.ts` e `stateToParams.ts` para garantir consistência entre o card de diárias, o resumo e o motor de cálculo da agência.
- Validação: 11 testes em `test:dailies`, 21 testes em `test:payslip` e checagem de tipos TypeScript 100% aprovados.

## Segregação de autoridades assistidas por ramo judiciário (JMU vs CJF) — 28/10/2026
- Segregação de catálogo: eliminada a sobreposição de autoridades no seletor de assessoramento direto de diárias.
- Justiça Militar da União (JMU / STM): o seletor exibe estritamente as autoridades da carreira militar federal (Ministro do STM e Juiz Federal da JMU / Substituto), com fundamentação no Ato Normativo STM Nº 799/2024 art. 9º c/c Res. CNJ 73/2009. Desembargador de TRF e referências ao CJF foram removidos desse simulador.
- Justiça Federal (CJF e TRFs): o seletor exibe estritamente as autoridades da Justiça Federal (Desembargador Federal / Membro do TRF, Juiz Federal / Juiz Federal Substituto e Membro do CJF), com fundamentação na Resolução CJF Nº 340/2015 art. 10, § 3º c/c Res. CNJ 73/2009. Menção a Ministro do STM foi removida desse simulador.
- Motor de cálculo e tipos: atualização de `CourtConfig`, `mapEffectiveConfig`, tipos do motor e resolução de diárias com fallback seguro dependendo do órgão ativo.
- Validação: 11 testes em `test:dailies`, 21 testes em `test:payslip` e checagem de tipos TypeScript 100% aprovados.

## Escalonamento de diárias em assessoramento direto (80% da autoridade assistida) — 27/10/2026
- Adequação legal ao art. 6º, § 4º da Resolução CNJ Nº 73/2009 (incluído pela Res. CNJ 564/2024), art. 10 da Resolução CJF Nº 340/2015 e art. 9º do Ato Normativo STM Nº 799/2024.
- Escalonamento da base de cálculo: o servidor recebe até 80% do valor da autoridade para a qual presta assistência direta ou segurança pessoal:
  - Ministro / Membro do CJF (100% STF = R$ 1.466,95) → diária do servidor a 80%: R$ 1.173,56.
  - Desembargador Federal / Membro de TRF (95% STF = R$ 1.393,60) → diária do servidor a 80%: R$ 1.114,88.
  - Juiz Federal ou Substituto no CJF (95% do TRF = 90,25% STF = R$ 1.323,92) → diária do servidor a 80%: R$ 1.059,14 (na JMU: 80% de 95% = R$ 1.114,88).
- Calibração das diárias ordinárias do CJF (art. 10 da Res. CJF 340/2015): Cargos em Comissão (CJ-1 a CJ-4) e Analistas fixados em 55% da diária do Ministro do STF (R$ 806,82); Técnicos, FCs e Auxiliares em 45% (R$ 660,13).
- Interface contextual: ao selecionar "Viagem em assessoramento direto / segurança a magistrado", dropdown exibe a escolha da autoridade assistida com valores e bases explicitados em tempo real no card de diárias.
- Persistência e motor: campo `diariasAutoridadeAssistida` integrado ao `CalculatorState`, adaptador `stateToParams`, motor de cálculo e rotinas de salvamento/carregamento.
- Validação: 11 testes automatizados em `test:dailies`, 21 testes de estado/holerite em `test:payslip` e checagem de tipos TypeScript 100% aprovados.

## Opção de assessoramento direto a magistrado (diárias a 80%) no PJU — 27/10/2026
- Adequação legal ao art. 6º, § 1º, da Resolução CNJ Nº 73/2009 (c/c Resolução CNJ Nº 564/2024): implementada a opção explícita "Viagem em assessoramento direto a magistrado" para servidores do Poder Judiciário da União.
- Calibração de percentuais: servidores em viagem regular com CJ-4 passam a ter o teto geral do CNJ de 60% da diária de Ministro do STF (R$ 880,17). Ao marcar a opção de assessoramento direto, a diária sobe automaticamente para 80% (R$ 1.173,56).
- Não-aplicabilidade a magistrados: juízes e desembargadores mantêm seus percentuais normativos de autoridade (95% e 90%), ocultando a opção irrelevante para a magistratura.
- Transparência no card: exibição de aviso informativo contextual destacando a majoração legal a 80% por assessoramento direto.
- Validação: suíte de testes de diárias expandida para 10 testes automatizados com 100% de aprovação, typecheck e testes de holerite mantidos.

## Feriados manuais e interativos no lançamento por datas de diárias — 27/10/2026
- Desacoplamento de calendários fixos: eliminada a dependência de tabelas estáticas de feriados no banco de dados e removida a mensagem fixa do STM da interface de outros órgãos (como a Justiça Federal - CJF e TRFs).
- Seleção interativa por chips: ao informar as datas de início e término no modo "Lançar por datas", o sistema enumera os dias úteis da viagem e permite marcar/desmarcar feriados e pontos facultativos com 1 clique.
- Exclusão automática de fins de semana: sábados e domingos continuam sendo deduzidos automaticamente por calendário universal.
- Regra de retorno inteligente: o dia de retorno da viagem, se marcado como feriado, isenta automaticamente o desconto proporcional de auxílios (alimentação/transporte) no retorno.
- Persistência e hidratação: adicionado campo `diariasFeriados` ao `CalculatorState`, com suporte a snapshots e parâmetros do motor de cálculo.
- Validação: suíte de testes de diárias expandida para 9 testes automatizados com 100% de aprovação, juntamente com typecheck e testes de holerite.

## Ativação da Justiça Federal (CJF e TRFs 1 a 6) e Módulo de Diárias PJU — 27/10/2026
- Estruturação direta na página inicial (`Home.tsx`): o grupo "Justiça da União" agora abre diretamente os simuladores de primeiro nível sem subdivisões redundantes: "Justiça Militar da União (STM e Auditorias)" (`/simulador/jmu`) e "Justiça Federal (CJF e TRFs)" (`/simulador/cjf`).
- Liberação das rotas `/simulador/cjf` e `/simulador/jmu` com identificação e nomes oficiais completos no hook `useCalculatorConfig`.
- Arquitetura data-driven e hierárquica aprimorada: diária de referência máxima do Ministro do STF vinculada no modelo PJU, com herança nos ramos do Judiciário e overrides locais de tribunais.
- CJF (Resolução CJF Nº 340/2015) integrado: suporte a percentuais específicos para Cargos em Comissão (CJ-4 a CJ-1), Magistratura Federal (Desembargador, Juiz Titular e Juiz Substituto) e Cargos Efetivos (Analista, Técnico e Auxiliar).
- Suporte a múltiplos conselhos e órgãos: padronização sem valores hardcoded, mantendo 100% das regras da JMU (Ato Normativo STM Nº 799/2024).
- Interface transparente: adição de badge normativo automático exibindo a regulamentação setorial em vigor (ex.: CJF c/c CNJ ou STM c/c CNJ), rótulo contextualizado para Adicional de Deslocamento / Embarque e valor unitário da diária resolvido.
- Normalização de chaves de cargos e funções com remoção de acentos/diacríticos e fallback em cascata.
- Nova migration: `013_cjf_dailies_rules_and_pju_unification.sql` (inclui cadastro de agencies e org_config para CJF e TRFs 1 a 6).
- Validação: nova suíte de testes unitários `test:dailies` (7 testes), 21 testes de estado/holerite, 4 de ordenação e TypeScript aprovados sem regressões.

## Inclusão do TRT-2 (SP) — 20/10/2026
- Cadastro e ativação do TRT da 2ª Região (`trt2`) no banco Supabase (tabelas `agencies` e `org_config`), herdando 100% das regras e tabelas do Poder Judiciário da União (`PJU`).
- Liberação da rota `/simulador/trt2` no hook `useCalculatorConfig`.
- Ativação do card do TRT-2 na página inicial (`Home.tsx`) sob a categoria Justiça do Trabalho.
- Validação: 21 testes de estado/holerite e typecheck aprovados.

## Competência única ("Mês e ano da folha") e tratamento do Veto nº 45/2025 — 20/10/2026
- Interface unificada: "Mês e ano da folha" passa a ser o seletor mestre único de competência, eliminando a seleção manual de "Ref. Salarial" e garantindo sincronização automática de tabelas salariais, PSS, IR e benefícios da época.
- Vigência legal: incorporado o status da Lei nº 15.293/2025 sancionada (parcela de julho/2026, +8%). Competências para 2027 em diante mantêm oficialmente o teto legal sancionado, refletindo com rigor o Veto Presidencial nº 45/2025.
- Modo de projeção: para competências a partir de 2027, adicionado toggle explícito e aviso informativo sobre o Veto 45/2025 para permitir simular o cenário de eventual derrubada do veto sem comprometer a exatidão do cálculo oficial.
- Badge informativo: exibição contextual da norma legal aplicável (Lei nº 15.293/2025, Lei nº 11.416/2006 ou Cenário Projetado).
- Validação: 21 testes de estado/holerite, 28 previdenciários, 4 de ordenação, typecheck e build aprovados.

## Simplificação dos retroativos — 20/10/2026
- Retirada a ferramenta de previdência de retroativos do fluxo de novas simulações; lançamentos com valor conhecido continuam nas rubricas manuais.
- Removida a inclusão de novas competências. Apenas simulações que já possuem ajustes exibem um editor de compatibilidade recolhido, chamado “Ajustes previdenciários salvos”, evitando descontos ocultos e permitindo sua revisão ou remoção.
- Dados, resultados históricos, memória e motor de cálculo preservados; sem migração ou conversão automática em rubricas.
- Validação: 35 testes de formulário, 19 de snapshots e TypeScript aprovados.

## Previdência sem diálogos — 20/10/2026
- Removidos o diálogo de escolha guiada, sua abertura no carregamento e os botões de resolução. Modalidades incompatíveis continuam desabilitadas e rejeitadas pelos eventos.
- Trocas de regime mantêm participação compatível; caso contrário, aplicam o regime e “Não participa” juntos. Mudanças salariais e rascunhos incompatíveis também limpam somente a participação da simulação, sem inscrição automática em outra modalidade.
- Dados obrigatórios da vinculada são preenchidos diretamente no formulário. Retroativos são normalizados em lote, por sua própria competência, sem modificar resultados históricos salvos ou opções adicionais.
- Contexto e validações defensivas do motor preservados; nenhuma alteração de fórmulas, tabelas ou banco.
- Validação: 86 testes (28 previdenciários, 35 de formulário, 19 de snapshots e 4 de carregamento), TypeScript e build aprovados. Revisão do especialista de cálculo sem bloqueadores.

## Escolha previdenciária guiada — 20/10/2026
- Modalidades incompatíveis ficam indisponíveis no seletor mensal e nos retroativos completos, com motivos fornecidos pelo mesmo contexto do motor.
- Troca de RPPS incompatível aguarda escolha explícita antes de aplicar regime e participação juntos; vinculada exige dados válidos e alíquota da grade, sem adesão ou cancelamento automático.
- Mudanças de base e restaurações incompatíveis pausam cálculo, salvamento e exportação até resolução. Contextos assíncronos antigos são descartados; dados históricos salvos permanecem preservados.
- Atualização mensal materializa enquadramento/participação herdados dos retroativos legados antes da troca. Configurações de incidência salvas não autorizadas podem ser revisadas explicitamente.
- Base mensal extraída para serviço compartilhado, sem alteração dos resultados dos cenários válidos; revisão do especialista de cálculo sem bloqueadores. Sem migração de banco.
- Validação: 83 testes aprovados (28 previdenciários, 32 de formulário/escolha guiada, 19 de snapshots e 4 de carregamento), TypeScript e build Vite. Conferência desktop/mobile com dados sintéticos, Escape/cancelamento, foco e confirmação conjunta; configuração integrada do órgão não alterada.


## Legendas de previdência — 20/10/2026
- Regime RPPS e participação na Funpresp exibem explicação breve da opção selecionada, compartilhada entre folha mensal e cada competência retroativa.
- Legendas com associação acessível por identificadores únicos, texto normal e substituição de orientações repetidas; alertas e cálculos preservados.
- Validação: 19 testes de formulário, TypeScript e build aprovados; conferência visual desktop/mobile dos cinco textos no componente isolado com dados sintéticos.

## Não publicado — 20/10/2026
- Previdência: seletor mensal e por competência reduzido a RPPS sem teto do RGPS e RPPS limitado ao teto do RGPS; os quatro códigos salvos continuam compatíveis, sem alteração de fórmulas ou tabelas.
- Interface: Funpresp-Jud independente, alíquota apenas para participantes e dados obrigatórios da vinculada visíveis; incidências, facultativas e aportes reunidos em opções adicionais com contador e abertura em pendências locais ou do motor.
- Histórico: preservar alias ao reabrir/salvar sem mudança de grupo e manter enquadramento próprio dos retroativos. Sem migração de banco.
- Validação: 60 testes aprovados, TypeScript e build Vite; equivalência dos aliases no motor, snapshots, seletor, retroativos e expansão. Revisão final de cálculo sem bloqueadores. QA desktop/mobile e teclado no componente isolado com estilos reais e dados sintéticos; conferência integrada pendente porque org_config/JMU não carregou no ambiente local.


## Visibilidade de falhas - 19/10/2026
- A causa retornada pelo cálculo passa a aparecer também no rodapé desktop e em um alerta antes do formulário, preservando as entradas e mantendo exportação/salvamento bloqueados até um cálculo válido.
- Domínio principal conferido com RPC + patrocinada em simulação nova; falha específica do estado informado ainda depende do diagnóstico completo.


## Correção de interface - 19/10/2026
- Funpresp: modalidade patrocinada indisponível no seletor enquanto RPPS sem teto; simulações incompatíveis restauradas oferecem ações explícitas para corrigir o enquadramento ou a participação.
- Interface: controles não herdam negrito, caixa alta e espaçamento dos rótulos; títulos previdenciários seguem o padrão da calculadora e mensagem de cálculo indisponível usa tamanho de texto normal.
- Orientação: aporte adicional distinguido do desconto normal calculado. Badge consulta versão sem cache antigo.

## Não publicado - 19/10/2026
- Previdência: enquadramento RPPS separado da adesão complementar; bases e opções de parcelas independentes, participação vinculada e facultativas com distinção entre folha e aporte externo.
- Cálculo: correção do desconto complementar do 13º no demonstrativo/líquido, validação de parâmetros e apuração identificada de retroativos, com memória previdenciária.
- Configuração: parâmetros de vinculada e URP com fonte por competência; migration candidata `20261019_pju_pension_config_v2.sql` preserva versões anteriores e retira teto/passo sem fundamento da facultativa. Banco de produção não alterado.
- Evidências: relatório `src/docs/PREVIDENCIA_PJU.md` registra fontes legais, distinção do mínimo anual vinculado e conciliação anonimizada de agosto/setembro (R$ 1.563,15 / R$ 1.557,88). Julho permanece parcialmente conciliado.
- Validação local: 55 testes aprovados, incluindo PDF/XLSX em memória, TypeScript e build Vite. Sem publicação ou homologação em produção. Retroativos legados sem teto preservados com aviso; opções de base de snapshots patrocinados antigos exigem revisão.

## 18/10/2026
- Feat: Meus Holerites permite ordenar por Título, Referência, Órgão e Líquido, com indicadores acessíveis e preservação dos filtros e da ordenação na paginação e nas recargas.
- Data: migration `20261018_user_payslips_reference_order.sql` adiciona mês numérico gerado para ordenação cronológica; aplicar antes de publicar o frontend.
- Validation: 27 testes, TypeScript, build e preflight aprovados; migration aplicada em produção com os 15 snapshots e políticas RLS preservados.

## Não publicado - 09/10/2026
- Fix: motor aguarda agência e configuração; respostas antigas de configuração/cálculo são descartadas, inclusive na troca de órgão.
- Fix: cálculo expõe estados de carregamento e erro; salvar/exportar ficam bloqueados até os resultados corresponderem às entradas atuais, preservando valores manuais e holerites históricos.
- Deploy: configuração pública Supabase validada no build e por leitura/cálculo antes da publicação; arquivo de ambiente deixa de ser versionado (cópia local preservada).
- Deploy: releases com fingerprint de código, candidato por túnel SSH, validação no navegador, backup e reversão automática se a validação final não for concluída.
- Test: regressões de carregamento, concorrência, erros/recuperação e fixture anonimizada de novembro; integração revisada pelo especialista de cálculo, sem alteração de fórmulas ou banco.
- Validation: 23 testes, TypeScript, build e preflight aprovados; reversão exercitada. Downloads conferidos pelo candidato; limitação de download pelo IP HTTP reproduzida também na versão anterior e documentada em `scripts/DEPLOY.md`.
- Fix: persistência de holerites e rascunhos preserva entradas de férias e parcelas do 13º, inclusive valores manuais e seleções automáticas.
- Fix: edição recupera campos ausentes em snapshots antigos a partir do detalhamento salvo, sem sobrescrever valores explícitos.
- Fix: cards restaurados usam as entradas originais antes do cálculo assíncrono; instâncias vazias de hora extra/substituição são preservadas.
- Fix: carregamento de edição suporta a repetição de efeitos no StrictMode e exibe erros sem abrir um formulário vazio para atualização.
- Fix: restauração preserva competência e tabelas PSS/IR válidas salvas até alteração da competência pelo usuário.

## 2.1.18 - 02/04/2026
- Docs: adicionada secao de governanca de subagentes Codex em `PROJECT_RULES.md`.
- Docs: criado `src/docs/CODEX_SPECIALISTS.md` com catalogo versionado de especialistas por tarefa, ownership, papel runtime e modelo preferencial.
- Docs: adicionado papel de coordenacao `Codex Orchestrator` para orquestrar especialistas e integrar diffs.
- Docs: adicionada politica de nivel de raciocinio (`Baixa`, `Media`, `Alta`, `Altissima`) para uso do `Codex Orchestrator`.
- Docs: `AGENTS.md` e `README.md` atualizados para apontar para o catalogo de especialistas.

## 2.1.17 - 13/03/2026
- Fix: grade de Hora Extra por funcao substituida foi desacoplada do checkbox `Excluir da base do IR`, permitindo combinacoes independentes de incidencia e base.
- Fix: motor de Hora Extra passa a ignorar `horasPorFuncao` quando o card nao estiver marcado para calcular por funcao substituida, evitando uso oculto da grade.
- Fix: detalhamento final de Hora Extra deixa de ratear por `valor-hora medio` quando ha grade por funcao e passa a refletir a composicao real da instancia.
- Fix: detalhamento deixa de duplicar `IR da Substituicao` dentro de `IMPOSTO DE RENDA-EC (DEMAIS RUBRICAS)`.
- Feat: card de `Substituicao de Funcao` agora suporta `Excluir da base do IR` por instancia, com reflexo no motor e no resumo calculado.

## 2.1.16 - 05/03/2026
- Feat(Auth): nova area de usuario com login/senha em `/acesso` e dashboard em `/minha-area`.
- Feat(Auth): cadastro em beta fechado com allowlist (`cpf + email`) e mensagem de desenvolvimento para nao autorizados.
- Feat(Data): migracao `20260305_user_area_auth_and_payslips.sql` com tabelas `user_profiles`, `signup_allowlist` e `user_payslips` + RLS por `auth.uid()`.
- Feat(CRUD): CRUD completo de holerites salvos por usuario, permitindo multiplos registros no mesmo mes/ano.
- Feat(Export): exportacao PDF/Excel para holerites salvos reaproveitando `exportService`.
- Security: rotas `/admin*` agora usam guard administrativo por allowlist de email, bloqueando usuario comum autenticado.
- UX: calculadora ganhou acoes `Salvar na Minha Area` e `Meus Holerites` no cabecalho e no rodape.

## 2.1.15 - 05/03/2026
- Feat: rubrica pre-definida de `Substituicao de Funcao` agora aceita multiplas instancias no formulario, assim como `Horas Extras`.
- Tech: novo estado `substitutionEntries` com calculo isolado por card (dias, incidencia IR EA e PSS EA por instancia).
- Fix: motor de deducoes passa a ratear Substituicao por base mensal/EA/PSS-EA a partir das instancias, evitando interferencia entre cards.
- UX: resumo calculado do card de Substituicao agora usa somente os descontos proporcionais da propria instancia.

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
