# Teto remuneratório

As regras comuns do projeto estão em [PROJECT_RULES.md](../../../PROJECT_RULES.md).

## Referência federal

O art. 37, XI, da Constituição usa o subsídio mensal dos Ministros do STF como referência do teto remuneratório e prevê limites específicos conforme o ente e o Poder. O § 11, com redação da EC nº 135/2024, trata das parcelas de caráter indenizatório para fins dos limites, observadas as disposições aplicáveis. [Constituição Federal](https://www4.planalto.gov.br/legislacao/legis-federal/constituicao) · [EC nº 135/2024](https://www.planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc135.htm)

A série em `global_config.constitutional_ceiling_reference` registra o valor, a fonte e o intervalo de efeitos de cada versão. A Lei nº 14.520/2023 entrou em vigor na publicação em 10/01/2023. Os efeitos financeiros dos incisos I a III do art. 1º começam em 01/04/2023, 01/02/2024 e 01/02/2025. O catálogo **Normas e vigências** vincula a aplicação ao PJU. [Lei nº 14.520/2023](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/lei/l14520.htm)

## Exibição e aplicação

O passo **Competência** mostra a referência federal que corresponde ao mês e ano da folha e vincula sua fonte. Para períodos sem cobertura ou com configuração indisponível, exibe um aviso informativo. O piloto de abate-teto segue o recorte e as condições abaixo. Registrar futuros subtetos na camada do ramo ou órgão correspondente, preservando a série global como referência comum.

## Piloto mensal de abate-teto

As novas simulações de servidores efetivos ativos da JMU e do CJF usam o marcador de versão do piloto. A cobertura inicial começa em novembro de 2026 e considera um vínculo por vez. Cada órgão tem ativação versionada em `org_config.configuration.abate_teto_activation`. A migration prepara a ativação como desabilitada. A homologação e a habilitação administrativa de cada órgão são registradas em **Normas e vigências**.

A matriz comum fica em `power_config`, chave `abate_teto_rules`, no PJU, com código de rubrica, enquadramento, dispositivo e intervalo de cobertura. Os valores do teto continuam na série global. O recorte inicial considera os arts. 1º a 4º da Resolução CNJ nº 14/2006, em seu texto compilado, e a ordem de retenções do Tema 639 do STF. [Resolução CNJ nº 14/2006](https://atos.cnj.jus.br/atos/detalhar/178) · [STF, Tema 639](https://portal.stf.jus.br/jurisprudenciaRepercussao/tema.asp?num=639)

| Enquadramento | Códigos da matriz | Fundamento |
| --- | --- | --- |
| Base mensal | `vencimento`, `gaj`, `aqTitulo`, `aqTreino`, `fc`, `gratificacao`, `vpni`, `ats`, `substituicao` | Art. 2º, I e II, conforme o dispositivo de cada código |
| Exclusões | `abono`, `auxAlimentacao`, `auxPreEscolar`, `auxTransporte`, `diarias`, `indenizacaoTransporte` | Art. 4º, I, III e IV, conforme o dispositivo de cada código |
| Apuração própria | `ferias`, `decimoTerceiro`, `horasExtras` | Art. 3º, I a IV |

O valor do abate é o excesso da soma mensal classificada sobre o teto da competência, calculado em centavos. O motor retira o excesso das bases de IRRF e RPPS antes das retenções quando todas as parcelas atingidas integram essas duas bases. O limite do RGPS, quando aplicável ao RPPS, é observado na etapa previdenciária. O abono de permanência acompanha a contribuição previdenciária apurada. Excesso com incidências distintas mantém a apuração pendente até existir critério documentado de distribuição da redução.

Rubricas manuais avulsas, retroativos, parcelas com apuração própria, participação ativa na Funpresp, vínculos externos, GAACTA e licença compensatória ficam fora do recorte inicial. ATS e VPNI somente entram quando identificados como os cards fixos de vantagens pessoais e sem competência histórica. A interface informa os casos fora do recorte. Pendências preservam as entradas e impedem conclusão, salvamento e exportação de resultado definitivo.

O holerite mostra o desconto **Abate-teto constitucional** uma única vez. Memória, PDF e Excel registram competência, fonte, teto, componentes, excesso e bases antes e depois da redução. Holerites anteriores preservam o fluxo de cálculo identificado pelo marcador de versão.

## Conferência normativa por órgão

A Resolução CNJ nº 14/2006 tem publicação indicada no DJ nº 62/2006, de 30/03/2006, páginas 145–146. Suas alterações relevantes devem ser examinadas no texto compilado. A Resolução nº 607/2024 trata da aferição por vínculo na acumulação constitucionalmente admitida. O piloto cobre um vínculo, com extensão futura condicionada à modelagem própria das acumulações. [CNJ nº 14/2006](https://atos.cnj.jus.br/atos/detalhar/178) · [CNJ nº 607/2024](https://atos.cnj.jus.br/atos/detalhar/5926)

Na JMU, o art. 9º do ATN STM nº 863/2025 prevê os descontos obrigatórios sobre o valor após a exclusão do excesso. O ato foi publicado no BJM nº 23, páginas 1821–1825, em 18/06/2025, segundo a ficha oficial. O ATN nº 936/2026, publicado no BJM nº 8, páginas 554–556, em 27/02/2026, alterou os arts. 5º a 7º, relativos a acumulações e fontes pagadoras. O art. 9º consta preservado no texto consolidado. [Ficha oficial do ATN nº 863](https://www2.stm.jus.br/sislegis/index.php/ctrl_publico_extranet/link_detalhar_textual/35441) · [Texto consolidado](https://www2.stm.jus.br/sislegis/index.php/ctrl_publico_pdf/visualizar/35441-ATN-000863_16-06-2025_STM_1.pdf) · [Ficha oficial do ATN nº 936](https://www2.stm.jus.br/sislegis/index.php/ctrl_publico_extranet/link_detalhar/36535)

Para o CJF, o piloto usa a regra nacional aplicável aos servidores do PJU e o Tema 639. A Resolução CJF nº 465/2005 foi expressamente revogada pela Resolução nº 582/2007. Regras locais posteriores que alterem a execução da folha exigem conferência específica antes de ampliar o recorte. [CJF nº 465/2005, com anotação de revogação](https://www.cjf.jus.br/publico/biblioteca/Res%20465-2005.pdf)

## Homologação sintética

As duas calculadoras usam o teto de R$ 46.366,19 para novembro de 2026. O ensaio do motor fixa o RPPS em 10% e o IRRF em 20% após o RPPS, com dedução de R$ 100,00. Essas alíquotas são apenas dados sintéticos.

| Base mensal | Abate esperado | Base de RPPS e rendimentos tributáveis de IRRF após o abate |
| ---: | ---: | ---: |
| R$ 45.600,00 | R$ 0,00 | R$ 45.600,00 |
| R$ 46.366,19 | R$ 0,00 | R$ 46.366,19 |
| R$ 46.366,20 | R$ 0,01 | R$ 46.366,19 |
| R$ 48.000,00 | R$ 1.633,81 | R$ 46.366,19 |

Para R$ 48.000,00, o RPPS é R$ 4.636,62, o IRRF é R$ 8.245,91 e o líquido é R$ 33.483,66. Com abono de permanência e R$ 100,00 de auxílio-alimentação, a base do teto segue em R$ 48.000,00, o abono é R$ 4.636,62, o IRRF é R$ 9.173,24 e o líquido é R$ 37.292,95. No teste com RPPS limitado ao teto sintético do RGPS de R$ 8.000,00, o RPPS é R$ 800,00 e o IRRF é R$ 9.013,24.

A verificação automatizada `npm run test:abate-teto` cobre o desconto único, a memória, PDF e Excel, a preservação de holerites anteriores, a ausência de cobertura e o bloqueio por incidência mista, inclusive no AQ de treinamento. Os casos fora do recorte incluem Funpresp ativa, rubrica manual avulsa, retroativo, GAACTA, licença compensatória e ativação desabilitada.
