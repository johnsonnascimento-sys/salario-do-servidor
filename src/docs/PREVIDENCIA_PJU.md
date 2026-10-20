# Previdência dos servidores ativos do PJU/JMU

Conferência normativa e conciliação: 19/10/2026. Complexidade operacional: altíssima. Este relatório registra os fundamentos da revisão; `PROJECT_RULES.md` permanece a referência canônica de arquitetura e governança.

## Fundamentos e vigência

| Fonte primária | Dispositivo e aplicação |
| --- | --- |
| [Lei 12.618/2012, texto compilado](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2012/lei/l12618.htm) | Arts. 1º e 3º: limitação ao teto e migração não se confundem com adesão. Art. 16, caput e §§ 1º a 4º: contribuição patrocinada sobre excedente, opção de parcelas, patrocínio limitado e facultativas sem contrapartida. |
| [Lei 10.887/2004, texto compilado](https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2004/lei/l10.887.htm) | Art. 4º, §§ 1º e 2º: composição, exclusões e opções da base RPPS; consultar a redação vigente na competência, inclusive alterações de 2024 e 2026. |
| [EC 103/2019](https://www.planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc103.htm) | Art. 11: alíquotas progressivas federais e atualização dos limites; tabela por competência. |
| [Portaria Interministerial MPS/MF 13/2026](https://www.gov.br/previdencia/pt-br/assuntos/rpps/documentos/PortariaInterministerialMPSMF13de9dejaneirode2026.pdf) | Valores a partir de janeiro/2026: teto RGPS de R$ 8.475,55 e faixas RPPS federais do anexo III. |
| [Regulamento JusMP-Prev disponibilizado no site da Funpresp-Jud](https://www.funprespjud.com.br/wp-content/uploads/2021/09/Plano-de-Beneficios-FunprespJud_2018.pdf) | Art. 14: bases patrocinada/vinculada, inclusão expressa e gratificação natalina. Art. 15, I a III: normal de 6,5% a 8,5%; vinculada de 6,5% a 22%, em passos de 0,5%; facultativa mínima de 2,5%, regular ou esporádica, sem patrocínio. |
| [Resolução Conjunta STF/MPU 1/2015](https://www.trt2.jus.br/geral/tribunal2/Trib_Sup/STF/Resol/1_15.html) | Art. 8º, §§ 2º e 3º: publicação da URP e atualização anual da remuneração escolhida no mínimo. |
| [Lei 9.250/1995](https://www.planalto.gov.br/ccivil_03/leis/l9250.htm) | Art. 4º, IV, V e VII: deduções mensais pertinentes; art. 8º: ajuste anual. |
| [Receita Federal — despesas dedutíveis](https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/preenchimento/manual-mir/pagamentos-ou-doacoes/despesas-dedutiveis) | No ajuste anual, parcela complementar excedente ao patrocínio integra limite de 12% dos rendimentos tributáveis sujeitos ao ajuste, com demais previdências/FAPI; o 13º tem tributação separada. |

Os percentuais normais não são percentuais de custo administrativo nem de saldo acumulado. Carregamento e FCBE compõem a destinação interna do recolhimento; não geram segundo desconto sobre o valor normal calculado. A informação de custeio preserva sua própria data de referência e não representa validação do plano de custeio de outro exercício.

## Apresentação simplificada — 20/10/2026

O formulário mensal e os retroativos apresentam apenas **RPPS sem teto do RGPS** e **RPPS limitado ao teto do RGPS**. São grupos visuais sobre os códigos existentes: antigo/novo_antigo e migrado/rpc, respectivamente. A interface preserva o código original quando não há mudança de grupo; mudanças efetivas usam antigo ou rpc como representantes técnicos, sem inferir ingresso novo ou migração. A distinção da origem pode importar para aposentadoria/benefício especial, que não são calculados nesta alteração.

Funpresp-Jud permanece independente, com não participação, patrocinada ou vinculada. Alíquota aparece para participantes; remuneração escolhida e competência da vinculada permanecem no bloco essencial. Dependentes do IR ficam no bloco tributário. Opções de incidência RPPS/FC, inclusões na Funpresp, facultativas e aportes ficam em expansor próprio com contador de opções aplicáveis ativas. A forma de pagamento qualifica a facultativa/aporte e não conta como opção adicional independente. Fechar o expansor não limpa campos. Confirmação legada, erros locais das opções e erros previdenciários retornados pelo motor abrem o bloco.

Retroativos conservam formulário próprio e enquadramento histórico explícito; mudar a folha mensal não substitui esses registros. Snapshots, memória, exportações, fórmulas e configuração data-driven permanecem compatíveis, sem migração ou regravação de holerites. Esta simplificação não certifica as limitações de cálculo já registradas neste relatório.

## Incidências e opções independentes

Os códigos `antigo` e `novo_antigo` mantêm RPPS sem teto; `migrado` e `rpc`, RPPS limitado. A participação complementar deve ser informada separadamente. Vinculada não muda o enquadramento previdenciário; patrocinada exige enquadramento limitado e base superior ao teto.

| Rubrica | Tratamento da revisão |
| --- | --- |
| Vencimento, GAJ, AQ de titulação e vantagens permanentes | Composição da base conforme natureza legal e competência. |
| FC/CJ | Inclusão na Funpresp por opção expressa própria, independente do RPPS; RPPS do 13º exclui FC/CJ conforme regra canônica do projeto. |
| GAS/GAE e AQ de treinamento | Entradas independentes para as duas bases, sem inferir escolha individual a partir de um holerite. Configuração autoriza a opção e o usuário declara o efetivo recolhimento; não afirma obrigatoriedade universal dessas parcelas. |
| Alimentação, pré-escolar, indenizações e terço de férias | Não compõem a base previdenciária dessas simulações. |
| Hora extra | Não incluída automaticamente nas bases previdenciárias. |
| Passivos/retroativos | Exigem identificar competência original, base e contribuição anterior ou informar expressamente ajuste; rubrica genérica não comprova incidência. |

A classificação individual de GAS/AQ e a autorização correspondente devem refletir o registro funcional e os normativos do órgão. Os anexos não permitem concluir que todos os demais servidores fizeram as mesmas escolhas. `incidence_rules: true` significa que o formulário permite uma opção expressa, não que a parcela incide automaticamente.

## URP e contribuição vinculada

Fonte: [tabela oficial da Funpresp-Jud](https://www.funprespjud.com.br/urp/index.php), consultada em 19/10/2026. Datas são as publicações da tabela; não interpolar períodos ausentes.

| Mês de publicação | URP (R$) |
| --- | ---: |
| Novembro/2024 | 188,19 |
| Novembro/2025 | 197,00 |
| Janeiro/2026 | 198,00 |
| Fevereiro/2026 | 198,66 |
| Março/2026 | 200,05 |
| Abril/2026 | 201,81 |
| Maio/2026 | 203,16 |
| Junho/2026 | 204,34 |
| Julho/2026 | 204,66 |
| Agosto/2026 | 204,81 |
| Setembro/2026 | 204,15 |
| Outubro/2026 | 205,83 |

Nova escolha usa a URP de referência da inscrição. Uma remuneração já eleita no mínimo não é reajustada a cada oscilação mensal: vigora até dezembro, e janeiro considera novembro anterior. Em 2026, o mínimo anual dessa situação é R$ 1.970,00. A distinção é confirmada no [comunicado oficial sobre atualização](https://www.funprespjud.com.br/atualizacao-a-partir-de-janeiro-de-2016-do-valor-da-remuneracao-de-participacao-escolhida-em-urp/). Sem referência e fonte suficientes, a simulação vinculada deve apresentar pendência, nunca inventar URP.

## Conciliação anonimizada dos anexos

As linhas individuais das imagens omitem centavos em alguns descontos, embora os totais os preservem. Assim, a comparação usa os totais e conserva os valores hipotéticos individuais como inferência, sem atribuí-los à leitura literal da imagem.

Base recorrente: R$ 4.846,27 + R$ 6.784,78 + R$ 1.696,19 + R$ 771,55 + R$ 308,62 + R$ 771,55 = **R$ 15.178,96**. Esta composição inclui GAS e AQ de treinamento; não inclui a FC de R$ 2.498,33 nem horas extras. Alíquota complementar testada: 8,5%.

| Competência | Base integral usada | RPPS ao teto | Funpresp normal | Soma | Total na imagem |
| --- | ---: | ---: | ---: | ---: | ---: |
| Agosto/2026 | R$ 15.240,95 | R$ 988,09 | R$ 575,06 | R$ 1.563,15 | R$ 1.563,15 |
| Setembro/2026 | R$ 15.178,96 | R$ 988,09 | R$ 569,79 | R$ 1.557,88 | R$ 1.557,88 |

Agosto inclui R$ 61,99 da rubrica passivos com previdência na base. A correspondência aritmética não identifica sua competência original: a fixture declara essa hipótese e não a transforma em regra para todos os passivos.

Fórmula complementar de setembro: `(15.178,96 − 8.475,55) × 8,5% = 569,78985`, arredondado a R$ 569,79. Em agosto: `(15.240,95 − 8.475,55) × 8,5% = 575,059`, arredondado a R$ 575,06. O RPPS aplica a tabela progressiva ao teto, não 14% sobre todo o teto.

**Julho: conciliação parcial.** Há passivos, exercícios anteriores, férias e gratificação natalina. Total previdenciário de R$ 1.990,66; linhas individuais visíveis sem precisão suficiente. Faltam a discriminação dos centavos, competências e memória dos ajustes. Nenhuma diferença residual deve ser criada para forçar igualdade. Agosto/setembro validam a hipótese mensal; não validam integralmente os três holerites, o IR ou todos os regimes.

## Integração, IR e publicação

As [orientações oficiais de adesão](https://www.funprespjud.com.br/aderir/) distinguem dedução mensal quando o recolhimento é descontado no contracheque. Aportes externos são informativos para ajuste anual; não reduzem o líquido da folha nem seu IRRF. O cálculo mensal não pretende fechar a declaração anual ou garantir dedutibilidade integral anual de todas as facultativas. Contribuição do 13º aparece em desconto e dedução exclusivos da própria apuração; a contrapartida patronal é informativa.

A migration `20261019_pju_pension_config_v2.sql` é candidata local, não aplicada nesta tarefa. Fecha apenas a vigência do cadastro anterior e insere uma versão; conserva o JSON anterior e não altera RLS, schema ou snapshots. A data da versão cadastral não substitui a vigência das normas. Confere ausência de versões ativas conflitantes e não sobrescreve versão já cadastrada na reaplicação.

Antes de aplicar: revisar o diff de impacto pelo fluxo admin e eventuais overrides `org_config`; verificar que `global_config.pss_tables` contém as faixas da competência; testar a configuração efetiva em homologação. A hierarquia permanece `global < power < org`, sem duplicação universal em órgão. Valores oficiais permanecem na configuração, não na UI.

## Verificação local e limites preservados

As suítes de previdência, integração/exportação, formulário, restauração, carregamento e ordenação passaram (55 testes), junto com TypeScript e compilação Vite. Os testes geram PDF e XLSX em memória e verificam descontos, líquido e separação da memória informativa. Não houve aplicação de migration nem publicação.

Por compatibilidade, o caminho legado de PSS de exercícios anteriores do RPPS sem teto ainda utiliza alíquota marginal atual quando não há apuração por competência; a memória exibe aviso explícito. Para conferência oficial, preencher os retroativos por competência. O PSS do 13º sem teto conserva a composição anterior; a correção de respeito à opção de gratificação no 13º foi limitada aos regimes com teto. Estes comportamentos preservados não são uma certificação normativa do regime sem teto.

As simulações patrocinadas antigas exigem confirmação das novas opções de base antes do recálculo. Os demonstrativos históricos já salvos conservam seus valores. Novos snapshots também guardam a memória previdenciária da data do salvamento.
