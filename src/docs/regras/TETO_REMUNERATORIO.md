# Teto remuneratório

As regras comuns do projeto estão em [PROJECT_RULES.md](../../../PROJECT_RULES.md).

## Referência federal

O art. 37, XI, da Constituição usa o subsídio mensal dos Ministros do STF como referência do teto remuneratório e prevê limites específicos conforme o ente e o Poder. O § 11, com redação da EC nº 135/2024, trata das parcelas de caráter indenizatório para fins dos limites, observadas as disposições aplicáveis. [Constituição Federal](https://www4.planalto.gov.br/legislacao/legis-federal/constituicao) · [EC nº 135/2024](https://www.planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc135.htm)

A série em `global_config.constitutional_ceiling_reference` registra o valor, a fonte e o intervalo de efeitos de cada versão. A Lei nº 14.520/2023 entrou em vigor na publicação em 10/01/2023. Os efeitos financeiros dos incisos I a III do art. 1º começam em 01/04/2023, 01/02/2024 e 01/02/2025. O catálogo **Normas e vigências** vincula a aplicação ao PJU. [Lei nº 14.520/2023](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/lei/l14520.htm)

## Exibição e aplicação

O passo **Competência** mostra a referência federal que corresponde ao mês e ano da folha e vincula sua fonte. Para períodos sem cobertura ou com configuração indisponível, exibe um aviso informativo. A apuração do abate-teto, a classificação de rubricas e a determinação de subtetos aplicáveis são etapas próprias de cálculo. Registrar futuros subtetos na camada do ramo ou órgão correspondente, preservando a série global como referência comum.
