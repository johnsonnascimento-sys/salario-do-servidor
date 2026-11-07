# Changelog

## Inicialização Automática da Competência de EA ao Habilitar Opção — 07/11/2026
- Inicializa automaticamente a competência com dezembro do ano anterior (`anoMaximoEa-12`) no exato momento em que o servidor clica em "Incluir na base do IR (Exercício Anterior - EA)" nos cards de Horas Extras, Substituição e Rubricas Manuais.
- Elimina a mensagem de "Cálculo indisponível" decorrente de competências vazias imediatamente após habilitar EA, garantindo que o cálculo de RRA e o resumo líquido do card apareçam instantaneamente e sem atrito.
- Preserva a flexibilidade de o servidor alterar o mês ou adicionar novas competências sem exigir preenchimento do zero.

## Blindagem de Usabilidade e Orientação Temporal nas Competências de IR-EA — 07/11/2026
- Adiciona trava inteligente no seletor de competências originais (`IrEaCompetencias.tsx`), restringindo a data máxima (`max`) a dezembro do ano anterior ao pagamento (`anoMaximoEa-12`), orientando o servidor que o RRA é restrito a parcelas de anos anteriores.
- Define sugestão automática inteligente ao clicar em "+ Adicionar mês trabalhado", pré-preenchendo dezembro do ano anterior (`anoMaximoEa-12`) em vez de abrir em branco ou induzir à seleção do mês corrente.
- Inclui alerta visual reativo imediato no card caso uma competência do ano corrente seja informada, esclarecendo com base no art. 12-A da Lei nº 7.713/88 que parcelas do mesmo exercício financeiro integram a remuneração mensal normal e são tributadas pela folha corrente.
- Aprimora a legenda e o rótulo de desconto no resumo calculado (`presetGrossLines.ts`), identificando explicitamente quando uma parcela marcada com EA é tributada na base mensal por pertencer ao mesmo ano do holerite (`Desconto IR mensal (mesmo ano da folha — sem RRA)`).
- Conecta a passagem da `competenciaReferencia` através de `OvertimeCard`, `SubstitutionCard` e `ManualRubricasSection`, garantindo coerência temporal em todos os módulos.

## Atualização do Texto Didático de RRA nas Competências de EA — 07/11/2026
- Atualiza a redação explicativa do callout de RRA (`IrEaCompetencias.tsx`) com texto detalhado sobre a retenção de valores acumulados e a diluição das alíquotas de imposto.
- Apresenta as faixas de isenção de 2026 proporcionais aos meses informados (1 mês: até R$ 2.428,80; 2 meses: até R$ 4.857,60; 3 meses: até R$ 7.286,40).
- Orienta o servidor a indicar os meses correspondentes aos comprovantes de pagamento e preserva a dica contextual por tipo de parcela.

## Migração do Card de IR-EA para o Rodapé e Ajustes Avançados Colapsáveis — 07/11/2026
- Elimina o card invasivo de "Apuração do IR-EA" do meio do formulário (`DynamicPayrollForm.tsx`), despoluindo a tela principal e deixando a apuração de atrasados (RRA) 100% fluida e automática a partir dos meses informados nas parcelas.
- Reposiciona a seção de auditoria e ajustes avançados de IR-EA (`IrEaContextSection.tsx`) para o rodapé (`ResultsSummary.tsx`), integrada à "Memória do IR-EA" (`IrEaMemory.tsx`), sob a seção "Auditoria e Memória de Cálculo".
- Transforma os campos de override (NM do demonstrativo, deduções documentadas e opção de dependentes) em um acordeão colapsado por padrão (`<details>`), que só é expandido se houver ajuste ativo ou se o usuário clicar para configurar.
- Adiciona o botão de restauração rápida `↺ Voltar para contagem automática`, permitindo ao usuário desfazer overrides manuais de NM instantaneamente com um clique.
- Mantém o fallback de recuperação em caso de erro na tela de simulação e preserva o smooth scroll do atalho "Ver Apuração do IR-EA ↓" apontando para a auditoria no rodapé.

## Contextualização do Callout Didático do IR-EA por Tipo de Parcela — 07/11/2026
- Adiciona a propriedade contextual `tipo?: 'horas_extras' | 'substituicao' | 'rubrica'` ao componente `IrEaCompetencias.tsx`.
- Restringe a menção a "teto mensal de horas" exclusivamente ao card de Horas Extras (`OvertimeCard.tsx`).
- Adapta a mensagem nos cards de Substituição de Função (`SubstitutionCard.tsx`) e Rubricas Manuais de Crédito (`ManualRubricasSection.tsx`) para textos próprios da natureza da parcela (período de substituição ou competência de origem da rubrica).

## Inclusão de Painel Didático sobre RRA no Módulo de Competências de IR-EA — 07/11/2026
- Adiciona callout explicativo e didático (`Info`) dentro do componente `IrEaCompetencias.tsx` exibido ao marcar uma parcela como Exercício Anterior (EA).
- Esclarece para o servidor público a regra de multiplicação das faixas de isenção pelo número de meses (RRA - Lei nº 7.713/88, art. 12-A), com exemplos numéricos claros (1 mês até R$ 2.259,20; 2 meses até R$ 4.518,40; 3 meses até R$ 6.777,60).
- Orienta sobre a flexibilidade de cadastrar múltiplos meses no mesmo card ou segregar em cards individuais por mês (para fins de controle do teto mensal de horas).

## Correção da Seleção de "Outra Jornada Personalizada" no Card de Horas Extras — 07/11/2026
- Corrige o comportamento onde a opção "Outra jornada personalizada" no seletor de Carga Horária Semanal retrocedia instantaneamente para o padrão anterior (35h na JMU ou 40h na JF) devido à inferência reversa baseada na jornada semanal em branco ou padrão.
- Adiciona a propriedade explícita `jornadaPersonalizada?: boolean` ao modelo `OvertimeEntry` e à hidratação em `calculatorState.ts`.
- Garante a abertura e estabilidade imediata do painel de configuração personalizada com o campo "Jornada semanal (h):" e a memória da fórmula legal `(Jornada ÷ 6) × 30`.
- Melhora a usabilidade permitindo apagar e redigitar valores nos campos de jornada semanal e divisor sem travar no valor mínimo de 1.
- Adiciona teste automatizado em `tests/overtimeFederal.test.ts` validando a retenção do modo personalizado, cálculo do divisor para 25h (divisor 125) e reversão para jornada padrão.

## Simplificação de Linguagem e UX Writing nas Competências do IR-EA — 07/11/2026
- Adequa os textos da seção de competências originais do IR-EA para linguagem acessível e compreensível ao servidor público leigo.
- Substitui termos excessivamente burocráticos ("Competências originais do IR-EA", "Adicionar competência original", "competência X") por termos intuitivos e práticos ("Meses em que o serviço foi prestado (Ano Anterior)", "Adicionar mês trabalhado", "Mês trabalhado X").
- Substitui mensagens técnicas por orientações claras, explicando de forma didática o benefício do cálculo por RRA (Lei nº 7.713/88) na apuração mensal para evitar retenção excessiva de imposto.

## Padronização Visual da Seção de Competências Originais do IR-EA — 07/11/2026
- Substitui o link textual sublinhado por um botão de ação estilizado com ícone `Plus` (`Adicionar competência original`), com cantos arredondados, borda suave e tipografia em harmonia com o restante do site.
- Substitui o texto corrido sublinhado `Remover mês X` por um botão de ação compacto com ícone de lixeira (`Trash2`) e hover em tom de erro.
- Transforma a mensagem de competências pendentes em um badge estruturado com ícone `AlertCircle`, eliminando qualquer elemento textual cru fora do design system.

## Integração da Memória de Cálculo Unitária ao Resumo Calculado da Hora Extra — 07/11/2026
- Move as linhas da memória de cálculo unitária (Valor da Hora Normal com indicação do divisor ativo, Valor unitário da Hora +50% e +100%) para dentro do acordeão oficial de "Resumo calculado" (`PresetGrossSummary` via `presetGrossLines.ts`).
- Remove o bloco avulso do interior do `OvertimeCard.tsx`, garantindo total consistência visual e arquitetural com os demais cards do produto.
- Adiciona teste de integração em `tests/overtimeFederal.test.ts` assegurando a presença das linhas unitárias e a fidelidade dos valores no resumo calculado.

## Parametrização Dinâmica de Jornada e Divisor Mensal de Horas Extras — 07/11/2026
- Adequação completa do módulo de Serviço Extraordinário ao art. 7º da Resolução STM nº 374/2025 (c/c Resolução STM nº 399/2026) e art. 46 da Resolução CJF nº 4/2008 (redação das Resoluções CJF nº 186/2012 e 973/2025).
- Adiciona seletor inteligente de carga horária semanal nos cards de horas extras com atalhos legais para 35h (divisor 175 - padrão JMU), 40h (divisor 200 - padrão JF), 30h (divisor 150 - jornadas especiais/redução legal), 20h (divisor 100 - médicos e odontólogos) e jornada personalizada via fórmula matemática oficial: (Jornada Semanal ÷ 6) × 30.
- Disponibiliza campo editável do divisor mensal por instância (`OvertimeEntry.divisor`), permitindo override numérico direto pelo usuário com isolamento estrito entre cards distintos na mesma folha.
- Inclui checkbox para serviço prestado durante o recesso forense / plantão, elevando dinamicamente o teto mensal informativo da JMU de 30h para 50h (art. 6º, § 1º da Res. STM 374/2025).
- Adiciona painel de Memória de Cálculo Unitária no card, exibindo em tempo real os valores apurados da Hora Normal, Hora Extra a 50% e Hora Extra a 100% para conferência direta com o contracheque.
- Torna o badge normativo do card (`PresetInstanceCard`) reativo ao divisor da respectiva instância (ex.: "Res. STM Nº 374/2025 • Divisor 150").
- Adiciona 4 novos testes unitários em `tests/overtimeFederal.test.ts` cobrindo divisor 150, divisor 100, fórmula proporcional e isolamento entre múltiplas instâncias na mesma folha.

## Neutralização dos Descontos Fantasmas e Unificação em Rubricas Manuais — 07/11/2026
- Neutraliza definitivamente os campos legados `emprestimos`, `planoSaude` e `pensao` na hidratação de rascunhos (`hydrateCalculatorState`), impedindo que valores residuais salvos no `localStorage` por testes antigos ou simulações anteriores poluam o Detalhamento do contracheque como "descontos fantasmas".
- Mantém a arquitetura limpa e unificada do sistema, onde todos os descontos facultativos ou avulsos (como planos de saúde, coparticipações, consignações e pensões) são gerenciados exclusivamente pelo card oficial de **Rubricas Manuais**.
- Remove qualquer seção ou card redundante no formulário dinâmico.

## Preservação do Estado de Abertura do Resumo Calculado nos Cards — 07/11/2026
- Corrige o recolhimento indesejado da seção "Resumo calculado" (`PresetGrossSummary`) dentro dos cards enquanto o usuário digita valores nos campos.
- Implementa controle de estado reativo (`open={isOpen}`) e retenção das últimas linhas apuradas (`lastLinesRef`) durante os recálculos assíncronos do motor, impedindo que o componente desmonte (`return null`) e seja recriado fechado quando as entradas calculadas ficam transitoriamente vazias.
- Adiciona teste automatizado de regressão em `tests/presetGrossSummary.test.ts` validando a retenção de abertura e integridade dos valores durante a digitação.

## Padronização e Reposicionamento das Memórias de Cálculo no Detalhamento — 07/11/2026
- Padronização visual completa da Memória Previdenciária (`PensionMemory`) e da Memória do IR-EA (`IrEaMemory`) com classes de tipografia do design system (`text-body-xs font-semibold`, `font-mono font-medium tabular-nums`, container neutro `bg-neutral-50/60 dark:bg-neutral-800/40` com bordas suaves e descrição explicativa de suporte).
- Reposicionamento das memórias de cálculo do topo do Detalhamento para o rodapé (abaixo das tabelas do Holerite e de Diárias), sob a seção agrupada "Auditoria e Memória de Cálculo", garantindo leitura prioritária e direta do contracheque sem poluição visual no topo da tabela.

## Dedução Automática de Dependentes no IR-EA e Simplificação da Usabilidade — 07/11/2026
- Inclusão de atalho contextual e explicativo ("Ver Apuração do IR-EA ↓") dentro de cada card onde uma parcela de Exercício Anterior (EA) for marcada, com rolagem suave (smooth scroll) e realce visual temporário no card de apuração consolidada.
- Reposicionamento do card "Apuração do IR-EA" para após as "Rubricas Manuais", imediatamente antes do Detalhamento da folha e observações, garantindo uma hierarquia visual limpa e impedindo que o card se perca entre múltiplos cards de parcelas.
- Inclusão de badge normativo padronizado no cabeçalho do card de "Apuração do IR-EA" ("Lei 7.713/88, art. 12-A • RRA"), alinhado ao padrão visual dos demais cards da calculadora.
- Integração direta dos dependentes informados no cabeçalho na apuração do IR-EA (RRA): quando o servidor informa dependentes, a dedução legal (R$ 189,59 por dependente) é calculada e aplicada automaticamente na base dos atrasados, sem exigir que o usuário abra seções avançadas ou calcule valores manualmente.
- Controle reativo por checkbox transparente na seção de apuração do IR-EA ("Deduzir dependentes na base do IR-EA"), ativo por padrão quando há dependentes informados, com opção de desmarcar com um clique caso a fonte pagadora não tenha abatido dependentes na competência de origem.
- Proteção do motor de cálculo contra bloqueios indevidos causados por itens de ajuste documental adicionados e deixados em branco no formulário.
- Registro detalhado na memória de cálculo e nas exportações (PDF/Excel) identificando a quantidade de dependentes e o valor exato abatido na base do RRA.

## Expansão do IR-EA/RRA para múltiplas competências e distinção do impacto marginal — 07/11/2026
- Desbloqueia a apuração progressiva de IR-EA / RRA para qualquer número de meses ($NM \ge 1$), permitindo simulações com competências distintas (ex.: outubro e novembro) em horas extras, substituições e rubricas manuais.
- Aplica a redução tributária de 2026 (Lei nº 15.270/2025 e Anexo X da IN RFB nº 1.500/2014) sobre o montante tributável acumulado recebido no mês, conforme a fundamentação oficial estrita, sem multiplicação ou divisão indevida dos limites de R$ 5.000,00 e R$ 7.350,00 pelo número de meses.
- Migração administrativa versionada `20261107_expand_ir_ea_rra_reduction.sql` encerrando a vigência da regra temporária anterior (`2026-11-06`) e instituindo a revisão ativa `ir-ea-20261107-v1` com `valid_to = NULL`, preservando integralmente o histórico de migrações aplicadas.
- Diferencia o rateio proporcional do acréscimo efetivo na folha no card de rubricas manuais de crédito com IR mensal: o resumo calculado passa a exibir o desconto proporcional rateado no líquido e uma linha informativa de acréscimo efetivo na folha quando houver diferença marginal, sem dupla dedução.
- Cobertura completa de testes automatizados com 100% de aprovação (reprodução CJF jan/2027 com nov/nov e nov/out, $NM$ documental, acréscimo marginal, integridade das migrações e TypeScript).

## Sincronização do pagamento do IR-EA com o cabeçalho — 06/11/2026
- O adaptador deriva o mês de pagamento do mês/ano da folha em cada cálculo, preservando competências originais, NM e documentos. Elimina a data separada desatualizada ao projetar holerites futuros ou reabrir rascunhos.
- O campo do pagamento passa a ser informativo e acompanha o cabeçalho automaticamente. O motor mantém a validação de consistência para chamadas diretas. Sem alterações em alíquotas ou configuração do banco.
- Regressão do caso janeiro/2027 com EA de novembro/2026 e contexto antigo outubro/2026; cobertura de atualização do mês, restauração e preservação do snapshot.

## Correção auditada do IR-EA, competências e memória de cálculo — 06/11/2026
- Corrige a seleção dos limites das faixas, exige tabela vigente e contexto documental, e remove o fallback silencioso para a alíquota máxima no IR-EA.
- Vincula HE, substituição e rubricas manuais às competências de origem e ao mês de pagamento. Conta meses distintos dos créditos, permite NM documental e encaminha rendimentos do próprio ano ao IR mensal.
- Restaura o abatimento de GAE/GAS na substituição e remove a reutilização implícita de resultados antigos como entradas manuais.
- Rateia o imposto conjunto em centavos por entrada, pelo método dos maiores restos; descontos dedutíveis reduzem a base sem diminuir o denominador dos créditos.
- Acrescenta memória única para cards, holerite e exportações. Holerites salvos preservam o snapshot; recálculo de EA sem competências exige conferência.
- Versiona a configuração global de IR de 2024/2025/2026, preservando o JSON anterior e as regras específicas dos órgãos. Deduções de dependentes e previdência complementar não são transportadas automaticamente para RRA.
- Aplica o redutor de 2026 ao RRA com NM=1; combinações sem validação normativa suficiente ficam pendentes. Fontes e alcance estão na migração administrativa versionada.
- Retifica o alcance da entrada anterior: a coincidência com o holerite de fevereiro/2025 depende de um ajuste documental explícito de base; não comprova dedução universal por dependentes. Os novos testes distinguem imposto observado de apuração normativa.
- Inclui verificação administrativa com TLS validado, ensaio transacional com rollback, preservação do histórico e teste de idempotência antes da aplicação.

## Apuração Progressiva Oficial do IR de Exercícios Anteriores (RRA) e Reconciliação dos Cards — 06/11/2026
- Adota a apuração estritamente progressiva de Imposto de Renda sobre Exercícios Anteriores (IR-EA / RRA - art. 12-A da Lei nº 7.713/1988) no motor de deduções (`deductionsCalculations.ts`), substituindo a aplicação simplificada da alíquota fixa máxima (27,5%) por `calculateIrrfProgressive` alimentada data-driven por `historico_ir_brackets`.
- Suporte a multiplicador de meses ($NM$) no cálculo do RRA em `taxUtils.ts`, escalonando faixas e deduções conforme o período acumulado.
- Reconciliação proporcional do `irEA` consolidado entre múltiplos cards ativos em EA (Horas Extras, Substituição e Rubricas Manuais), garantindo que a soma dos descontos exibidos nos cards (`PresetGrossSummary`) coincida exatamente ao centavo com a folha de pagamento.
- Suporte a `fallbackManual` nos módulos de Hora Extra e Substituição para preservar valores importados ou manuais em instâncias preexistentes e testes.
- Validação e reconciliação com 100% de precisão dos dois holerites reais da JMU:
  - Fev/2025: HE-EA de R$ 9.291,22 com 2 dependentes gerando IR-EA de R$ 1.554,81 exato.
  - Jan/2026: HE-EA de R$ 942,87 com 2 dependentes gerando IR-EA de R$ 0,00 (isenção na 1ª faixa).
  - Casos intermediários (faixas de 7,5% e 15%) e múltiplos cards em EA testados com suite de regressão dedicada (`tests/irEaProgressive.test.ts` e `scripts/test-ir-ea-progressive.mjs`).

## Restauração do card de diárias e verificação de exportações — 06/11/2026
- Corrige a detecção de viagens preenchidas por datas e de trechos de transporte ao restaurar o rascunho ou abrir um holerite salvo: o card volta a exibir os dados que compõem o resultado.
- Ao remover diárias, limpa também os trechos de transporte para impedir adicional residual no cálculo.
- Regressões de persistência/restauração/remoção e validação dos arquivos produzidos pelos geradores reais PDF e Excel, incluindo créditos, descontos e totais. Não altera tabelas ou percentuais oficiais.

## Regularização do cadastro do CJF — 06/11/2026
- Migração administrativa específica para criar `org_config.cjf` ausente, com overrides mínimos equivalentes ao fallback da versão publicada `5114567`.
- Preserva integralmente a configuração efetiva e os resultados atuais, incluindo divisor de HE 200, VR de 5% e regras específicas de diárias; não altera JMU, TRFs ou registros históricos globais/PJU.
- Verificador administrativo com TLS validado, backup local, guardas contra concorrência, ensaio com rollback e comparação integral de configuração e de 66 cenários do motor. Procedimento e evidências em `src/docs/CJF_CONFIG_REPAIR_2026-11-06.md`.

## Resumo Calculado em Rubricas Manuais e Remoção Definitiva de Resíduos de VPNI/ATS — 05/11/2026
- Feat & Fix (ManualRubricasSection e GaactaCard):
  - Integração do componente oficial `PresetGrossSummary` ("Resumo calculado") a cada card individual criado em "Rubricas Manuais", detalhando Bruto, descontos tributários (IRRF, PSS, Funpresp) com base nas incidências marcadas e Líquido individual da rubrica.
  - Implementação do cálculo de detalhamento tributário individual de rubricas (`rubricasTax`) diretamente no motor de agência (`deductionsCalculations.ts` e `AgencyCalculationEngine.ts`), alimentado de forma data-driven e reativa.
  - Remoção completa de checkboxes e referências legadas a VPNI e ATS do card `GaactaCard.tsx`, garantindo que a base da gratificação utilize exclusivamente as parcelas legais padronizadas e as rubricas manuais de crédito ativamente criadas e selecionadas.
  - Normalização e limpeza automática de valores legados residuais (`state.vpni_lei`, `state.vpni_decisao`, `state.ats`) em `usePayrollFormNormalization.ts`.

## Remoção do Card Vantagens Pessoais e Integração Dinâmica na GAACTA — 05/11/2026
- Feat & Architecture (Preset e Cálculo Dinâmico):
  - Remoção do card pré-definido estático "Vantagens Pessoais" (`PREDEFINED_OPTIONS`), migrando o lançamento de parcelas variáveis ou decorrentes de leis históricas (ex.: VPNI e ATS) para o módulo flexível de "Rubricas Manuais" (créditos dinâmicos).
  - Suporte completo no motor de cálculo (`calculateGaacta` e `AgencyCalculationEngine`) para identificar e somar na base de 15% da GAACTA as rubricas manuais dinâmicas de crédito (`rubricasExtras` com `tipo: 'C'`), ignorando rubricas de débito.
  - Implementação de seleção dinâmica granular por checkbox no card da GAACTA (`GaactaCard.tsx`), permitindo ao usuário marcar ou desmarcar individualmente cada crédito manual adicionado.
  - Adição da propriedade reativa `gaactaRubricasInclusas` em `CalculatorState`, `INITIAL_STATE`, `IAgencyCalculationParams` e no hook `useCalculatorResults.ts` para disparar recálculo instantâneo ao alternar checkboxes.
  - Preservação da retrocompatibilidade com holerites e snapshots antigos que contenham campos legados `state.ats`, `state.vpni_lei` e `state.vpni_decisao` com valores positivos.
  - Cobertura de testes unitários automatizados em `tests/gaacta.test.ts` validando adição dinâmica de créditos manuais, exclusão por desmarcação de checkbox e rejeição de débitos na base da gratificação.

## Correção da Exibição do Cargo em Comissão (CJ) na Base da GAACTA — 05/11/2026
- Fix & UI (GaactaCard e State Management):
  - Inclusão do campo `funcaoValor` no `CalculatorState`, `CalculatedPayrollState` e na lista `CALCULATED_STATE_KEYS`.
  - Mapeamento e propagação de `funcaoValor` a partir de `result.breakdown.funcaoValor` no hook `useCalculatorResults.ts`.
  - Atualização do componente `GaactaCard.tsx` para resolver `valorFuncao` priorizando o valor calculado pelo motor com fallback reativo imediato para as tabelas do período (`getTablesForPeriod(state.periodo, courtConfig)`), corrigindo a exibição de R$ 0,00 no checkbox de Cargo em Comissão (CJ).

## Harmonização Visual de Todas as Rubricas Pré-definidas com o Design System — 05/11/2026
- Style & UX (PresetInstanceCard e Cards de Rubricas Pré-definidas):
  - Extensão da arquitetura e harmonização visual para todos os cards de rubricas pré-definidas da calculadora (`PresetInstanceCard.tsx`, `LicenseCard.tsx`, `SubstitutionCard.tsx`, `VacationCard.tsx`, `ThirteenthCard.tsx`, `OvertimeCard.tsx`, `DailiesCard.tsx`):
    - Cabeçalho padronizado e unificado no container pai `PresetInstanceCard.tsx`: título em caixa alta tracking-widest, badge normativo regulamentar (quando aplicável: Diárias PJU, Horas Extras, Férias, 13º, GAACTA, Abono, Substituição), badge de múltiplas instâncias e botão de exclusão alinhados em uma única linha elegante.
    - Remoção definitiva de todos os wrappers redundantes `<div className={styles.card}>` e de todos os títulos duplicados internos nos cards filhos, eliminando o efeito de caixa dentro de caixa e espaçamentos duplos.
    - Padronização completa com a escala Slate oficial `neutral-*`, tokens semânticos (`warning`, `error`, `primary`) e controles do Design System (`styles.label`, `styles.checkboxLabel`, `styles.checkbox`, `styles.input`).
    - Auditoria de Design System aprovada: redução de violações para 69 e elevação do Health Score geral para 98.0/100.
    - Validação plena: 100% de aprovação em todos os testes unitários e de integração (`test:gaacta`, `test:payslip`, `test:pension`, `test:thirteenth`, `test:dailies`, `test:config`).

## Harmonização Visual do Card da GAACTA com o Design System — 05/11/2026
- Style & UX (GaactaCard e OvertimeCard):
  - Refatoração completa da estilização do `GaactaCard.tsx` para aderência estrita aos tokens oficiais do Design System do projeto:
    - Remoção do container duplicado `<div className={styles.card}>` interno, eliminando bordas duplas e espaçamento redundante dentro do `PresetInstanceCard`.
    - Substituição de cores fora do padrão (`gray-*`, `amber-*`, `rose-*`, `emerald-*`, `blue-*`) pela paleta canônica `neutral-*` e tokens semânticos (`warning`, `error`, `primary`).
    - Padronização de tipografia e controles com `styles.label`, `styles.checkboxLabel`, `styles.checkbox` e `styles.input`.
    - Alinhamento de valores monetários com a fonte monoespacial canônica (`font-mono`).
    - Integração do card ao collapsible oficial do sistema `PresetGrossSummary` através da adição do preset `case 'gaacta'` em `presetGrossLines.ts`.
    - Harmonização dos alertas de incompatibilidade legal cruzada entre GAACTA e Serviço Extraordinário (`OvertimeCard.tsx`).
    - Eliminação do badge verde duplicado (`presetLabel`) no topo do card da GAACTA, consolidando a identificação visual diretamente no cabeçalho unificado com o badge normativo `Res. STM Nº 397/2026 • 15%` e o botão de exclusão.
    - Auditoria de Design System aprovada: eliminação de 32 violações, elevando o Health Score geral para 97.8/100 (0 violações em `GaactaCard.tsx`).

## Módulo GAACTA e Deploy de Produção (Resolução STM nº 397/2026) — 04/11/2026
- Feat (GAACTA - Resolução STM nº 397, de 19 de junho de 2026):
  - Implementação do novo módulo de Gratificação por Atuação de Alta Complexidade, Técnica e Administrativa (GAACTA), que revogou a Resolução STM nº 376/2025 (licença compensatória na JMU), com vigência financeira desde 1º de junho de 2026.
  - Alíquota regulamentar de 15% (quinze por cento) incidente sobre a remuneração legal do servidor.
  - Elegibilidade exclusiva a servidores ocupantes de cargo em comissão (CJ-1 a CJ-4), com validação automática e alertas informativos nos dados funcionais.
  - Natureza estritamente indenizatória (art. 4º): 100% isenta de incidência de Previdência (PSS/RPPS) e Imposto de Renda (IRRF), sem compor base de outros adicionais.
  - Seleção flexível da base de cálculo via checkboxes dinâmicos (Vencimento Básico, GAJ, Parcela de Opção de CJ, Adicionais de Qualificação por Títulos e Treinamento, ATS, VPNI Lei 9.527/97 ou Judicial, e opcionalmente Abono de Permanência ou parcelas complementares ajustáveis), adaptando-se com precisão à realidade individual de cada servidor da JMU e da JF.
  - Fix (Isolamento estrito do Abono de Permanência na GAACTA): quando o módulo de Abono de Permanência é excluído ou desativado (`recebeAbono = false`), o valor é imediatamente zerado (R$ 0,00) no módulo de GAACTA e o checkbox é desmarcado/desabilitado com indicação explicativa, impedindo a injeção indevida da contribuição de PSS na base de cálculo para quem não recebe o abono.
  - Fix (Abono de Permanência na GAACTA): correção do fluxo de cálculo dinâmico da incidência do Abono de Permanência na GAACTA. A orquestração no `AgencyCalculationEngine` foi ajustada para que o valor da contribuição previdenciária calculada (`deductions.pss`) seja repassado ao módulo da GAACTA mesmo quando o servidor não tiver adicionado o card global de abono no simulador. A interface do `GaactaCard.tsx` agora exibe dinamicamente o valor real do abono/PSS ao lado do checkbox, recalculando instantaneamente a base (+ R$ 988,09) e a gratificação (+ 15%).
  - Incompatibilidade legal com horas extras (art. 6º): alertas cruzados informativos no card da GAACTA e no card de Serviço Extraordinário, com checkbox de "Período de recesso judiciário" para a exceção expressa.
  - Reprodução exata do contracheque de referência oficial do STM (Folha Out/2026 - Ana Cristina Pimentel Carneiro, CJ-03), gerando a base de R$ 43.516,33 e o valor de R$ 6.527,45 na rubrica `INDENIZAÇÃO- GRAT AT ALTA COMPLEX TEC ADM (GAACTA) - EC`.
- Architecture & Engine:
  - Novo módulo de cálculo `gaactaCalculations.ts` integrado ao `AgencyCalculationEngine` e tipado em `src/types.ts`.
  - Componente de interface interativo `GaactaCard.tsx` com estilo moderno, responsivo e suporte a temas claro/escuro.
  - Suíte de 5 testes unitários e de integração em `tests/gaacta.test.ts` e runner `scripts/test-gaacta.mjs` (`npm run test:gaacta`).
  - Atualização do `PROJECT_RULES.md` na Seção 12 e governança de regras.

## Regras de Equipe de Trabalho e Acompanhamento Integral de Diárias (JMU e JF) — 04/11/2026
- Feat (Equipe de Trabalho - Ato STM 799/2024 art. 8º / Res. CJF 340/2015 art. 10, § 1º / Res. CNJ 73/2009 art. 6º, § 2º):
  - Implementação da opção de deslocamento em equipe de trabalho para servidores (`!isMagistrate`).
  - Equiparação da diária do servidor ao maior valor atribuído entre os servidores membros da equipe (ex.: Técnico viajando com Analista recebe diária de Analista [R$ 806,82 no STM]; viajando com ocupante de CJ recebe diária de CJ [R$ 880,17 no STM]).
  - Garantia de que o servidor nunca receba valor inferior ao do seu próprio cargo (`Math.max(regularRate, teamRate)`).
  - Interface no `DailiesCard.tsx` com select dinâmico cujas opções e valores são calculados em tempo real a partir de `derivedFromMinister` no banco de dados, sem qualquer valor hardcoded.
- Feat (Acompanhamento em Tempo Integral - Ato STM 799/2024 art. 9º, § 1º / Res. CJF 340/2015 art. 10, § 3º / Res. CNJ 73/2009 art. 6º, § 5º):
  - Nova sub-opção em assessoramento direto a magistrado: "Exigido acompanhamento em tempo integral e hospedagem no mesmo local (diária a 90%)".
  - O percentual da autoridade assistida é elevado dinamicamente de 80% para 90% (Ministro do STM: de R$ 1.173,56 para R$ 1.320,26; Juiz Militar da JMU: de R$ 1.114,88 para R$ 1.254,24; na Justiça Federal: Desembargador de R$ 1.114,88 para R$ 1.254,24, Juiz Federal de R$ 1.059,14 para R$ 1.191,53, Ministro do CJF de R$ 1.173,56 para R$ 1.320,26).
  - Alerta informativo com cálculo discriminado (valor da autoridade e percentual aplicado ao servidor).
- Database & Data-Driven:
  - Criada a migração `migrations/018_add_dailies_team_and_fulltime_rules.sql` enriquecendo `power_config` (PJU) e `org_config` (`jmu`, `stm`, `cjf`, `trf1`) com `full_time_accompaniment_percentage: 0.90` e notas normativas.
  - Mapeamento em `mapEffectiveConfig.ts` e tipos em `src/services/config/types.ts` e `src/types.ts`.
- Rastreabilidade e Estado:
  - Campos tipados adicionados ao `CalculatorState` (`diariasEquipeTrabalho`, `diariasEquipeTrabalhoMaiorCargo`, `diariasAcompanhamentoIntegral`) com hidratação retrocompatível em `calculatorState.ts` e propagação nos adaptadores e no motor oficial de agência (`dailiesCalculations.ts`).
  - Presets de linhas (`presetGrossLines.ts`) e memo de recálculo (`useCalculatorResults.ts`) atualizados.
- Tests & Rules:
  - 15 testes automatizados aprovados em `tests/dailiesPju.test.ts` cobrindo todas as combinações de equipe de trabalho, acompanhamento a 90% e deduções de diárias.
  - `PROJECT_RULES.md` atualizado na Seção 11 com as normas do Ato Normativo STM Nº 799/2024 e Resoluções CNJ 73/2009 e 564/2024.

## Seleção por trechos do Adicional de Transporte da Justiça Federal (Res. CJF 340/2015, Anexo) — 04/11/2026
- Feat (Checkboxes do Anexo do CJF): implementação da seleção de Adicional de Transporte por checkboxes correspondentes aos 4 trechos de deslocamento (afastamento e retorno) previstos no Anexo oficial e no art. 17, § 2º da Resolução CJF Nº 340/2015:
  - 1. Afastamento: residência/trabalho até embarque (25%);
  - 2. Afastamento: desembarque até trabalho/hospedagem (25%);
  - 3. Retorno: trabalho/hospedagem até embarque (25%);
  - 4. Retorno: desembarque até residência/trabalho (25%).
- Ações rápidas de seleção ("Todos - 100%", "Apenas Ida - 50%", "Apenas Volta - 50%", "Nenhum - 0%") no card de diárias (`DailiesCard.tsx`).
- Totalmente dinâmico (sem hardcoded): cálculo unitário e acumulado de cada trecho (25% cada) derivado em tempo real da diária de Ministro do STF (`fullValue / 4` e `count / 4`), adaptando-se instantaneamente a qualquer reajuste de diária.
- Manutenção da compatibilidade na JMU/STM (que permanece com o select padrão de ida e volta conf. Ato STM 799/2024) e retrocompatibilidade estrita em `CalculatorState`, `useCalculatorResults.ts`, `presetGrossLines.ts` e `dailiesCalculations.ts`.
- Testes automatizados expandidos em `tests/dailiesPju.test.ts` validando granularidade fracionada (0%, 25%, 50%, 75%, 100%) e reajuste dinâmico.

## Descrição legal e nomenclatura do Adicional de Transporte / Embarque — 03/11/2026
- Adicionada descrição explicativa detalhada sobre o percentual e a base de cálculo diretamente no card de diárias:
  - JMU (Ato Normativo STM nº 799/2024, art. 8º): 40% da diária de Ministro do STM para o percurso de ida e volta e 20% para ida ou volta.
  - Justiça Federal (Resolução CJF nº 340/2015, art. 17): 80% sobre o valor básico da diária de Analista Judiciário (equivalente a 44% da diária de Ministro do STF) para percurso completo e metade (22%) para apenas ida ou volta.
- Exibição dinâmica dos valores calculados em reais diretamente nas opções do select (Nenhum, Metade e Completo), garantindo que atualizações futuras na diária de ministro reflitam imediatamente em todos os cálculos e na interface sem dependência de valores fixados em texto.
- Ajustada a nomenclatura oficial na Justiça Federal para "Adicional de transporte", em estrita conformidade com o Capítulo V e art. 17 da Resolução CJF nº 340/2015.
- Criada a migration 017 e atualizado o fallback em ConfigService.ts e nas suítes de teste (test:dailies e test:config).

## Não publicado - 30/10/2026
- Fix (Serviço Extraordinário da Justiça Federal): adequação do cálculo de horas extras à Resolução CJF Nº 4/2008 (redação da Res. CJF Nº 186/2012). O divisor mensal foi corrigido de 175 para 200 (jornada de 40h semanais / 6 * 30 = 200, art. 46, § 1º) nos fallbacks de cálculo (`useCalculatorResults.ts` e `presetGrossLines.ts`) e no `ConfigService` para o CJF e TRF1 a TRF6, eliminando distorção de +14,28% no valor da hora extra.
- Feat (Serviço Extraordinário da JMU): parametrização normativa do cálculo de horas extras na Justiça Militar da União com base na Resolução STM Nº 374/2025 (consolidada com a Resolução STM Nº 399/2026). Rótulo dinâmico "Res. STM Nº 374/2025 • Divisor 175" e monitoramento informativo do teto mensal de 30 horas (art. 6º, caput; 50h no recesso forense) no `OvertimeCard.tsx`.
- Feat (Alerta Regulamentar de Teto): adicionado aviso visual/informativo contextual no card de horas extras quando o quantitativo lançado exceder o limite regulamentar mensal de cada ramo (44h na Justiça Federal conf. Res. CJF 4/2008 art. 45, § 3º com redação da Res. 973/2025, e 30h na JMU conf. Res. STM 374/2025 art. 6º, caput), sem bloquear a digitação para acomodar acertos retroativos e passivos.
- Database: criada a migração `migrations/016_set_pju_and_cjf_payroll_rules.sql` para registro canônico de `payroll_rules` em `power_config` (PJU / Justiça Federal com divisor 200) e em `org_config` (JMU e STM com divisor 175).
- Style (Design System): unificada a identidade visual dos badges normativos dos cards de Diárias (`DailiesCard.tsx`) e Serviço Extraordinário (`OvertimeCard.tsx`), substituindo o fundo amarelado de diárias pelo padrão neutro em tons de cinza (`bg-gray-100 dark:bg-gray-800`), harmonizando a interface entre os módulos da JMU e da Justiça Federal.
- Tests: adicionada nova suíte de testes automatizados em `tests/overtimeFederal.test.ts` e runner `scripts/test-overtime-federal.mjs`, cobrindo divisor 200, divisor 175, base remuneratória com FC/CJ e herança via ConfigService.

## Não publicado - 29/10/2026
- Fix (Achado 8 da Auditoria): campo de quantidade de dias de licença compensatória passa a validar limite mínimo não negativo no card (`min="0"` e `Math.max(0, ...)`), no adaptador de parâmetros, na hidratação de estado e no módulo do motor (`leaveCalculations.ts`), impedindo resultados negativos de indenização.
- Fix (Achado 7 da Auditoria): páginas de administração (`AdminGlobal` e `AdminPower`) passam a acionar versionamento transacional (`versionGlobalConfig` e `versionPowerConfig`) com validação de vigência em vez de sobrescrever registros ativos em `upsert`, preservando o histórico integral de regras conforme Regra 2.3.3.
- Fix (Achado 6 da Auditoria): resumo financeiro de diárias (`presetGrossLines.ts`) sincronizado com feriados manuais informados pelo usuário (`state.diariasFeriados`), evitando desconto indevido de benefício de meia diária em retornos ocorridos em feriados ou pontos facultativos.
- Fix (Achado 5 da Auditoria): discriminação de substituições de função por incidência (IR Mensal, IR EA e Excluído de IR) em `useCalculatorResults.ts` passa a calcular cada instância isoladamente pelo valor de sua respectiva função destino e dias, eliminando distorção visual decorrente de rateio por valor médio diário global.
- Fix (Achado 4 da Auditoria): detalhamento do desconto de PSS do 13º salário (`buildThirteenthPssDetails` em `payslipRows.ts`) passa a concentrar 100% da dedução na 2ª parcela sobre o vencimento/cargo efetivo, eliminando qualquer rateio indevido com FC/CJ ou com a 1ª parcela de adiantamento, em estrita conformidade com as Regras 4.3.1 e 4.3.2.
- Fix (Achado 3 da Auditoria): ConfigService passa a distinguir ausência de cadastro de erro operacional de consulta (usando maybeSingle e classes de erro estruturadas ConfigLoadError e ConfigNotFoundError). Falhas operacionais de banco ou rede não são mais mascaradas como órgãos inexistentes. Para órgãos federais (cjf e trf1..trf6) pendentes de execução de migration no banco remoto, mantém-se fallback transitório com aviso explícito no console, priorizando imediatamente dados reais do banco quando cadastrados. useCalculatorConfig atualizado para propagar a mensagem de erro operacional em vez de falha genérica.
- Fix (Achado 2 da Auditoria): resolução de assessoramento a magistrado na JMU/STM corrigida para usar identificação estrutural de ramo (branchId e orgSlug) e suporte a localRuleLabel e chaves de percentuais reais ('juiz'), garantindo diária de R$ 1.393,60 da autoridade e R$ 1.114,88 do servidor (80%) conforme Seção 11.4 do PROJECT_RULES.md.
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
