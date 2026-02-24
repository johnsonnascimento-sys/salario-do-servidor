# Regras da Calculadora

Atualizado em: 24/02/2026

Este documento consolida as regras funcionais e de UX da calculadora.
Qualquer alteracao que mude calculo oficial deve ser feita com rastreabilidade (changelog + commit).

## 1. Principios tecnicos

1. Nenhuma aliquota, faixa, deducao, teto ou percentual legal pode ficar hardcoded na UI.
2. O motor oficial de calculo e o service da agencia (`JmuService` + modulos).
3. A UI so exibe resultados e envia parametros; nao deve recalcular tributos paralelamente.
4. Configuracoes de negocio devem vir de fonte data-driven (configuracao da agencia).

## 2. Rubricas manuais

Cada rubrica manual deve suportar:
1. Tipo (`C` credito, `D` desconto)
2. Descricao
3. Valor
4. `Incluir na base do IR`
5. `Incluir na base do IR (Exercicio Anterior - EA)`
6. `Incluir na base do PSS`
7. `Incluir na base do PSS (Exercicio Anterior - EA)`

## 3. Rubricas pre-definidas e resumo por card

1. Cada card pode exibir `Resumo calculado` em modo recolhido (accordion).
2. O resumo por card deve priorizar leitura financeira:
   - linhas brutas
   - descontos (IR/PSS quando aplicavel)
   - linhas liquidas
   - totais (quando houver multiplas linhas)
3. O destaque visual do resumo deve ser discreto e alinhado ao restante do layout.

## 4. Convencao visual de descontos

1. Descontos devem ser diferenciados por cor de desconto.
2. Nao usar prefixo textual `(-)` para descontos.

## 5. Horas extras

1. Nao exibir checkbox `Incluir na base do PSS...` em horas extras.
2. Campos numericos nao devem aceitar valores negativos.

## 6. Gratificacao Natalina (13o)

1. Nao cobrar PSS sobre FC/CJ na Gratificacao Natalina.
2. Ao selecionar 2a parcela, o sistema deve considerar o contexto completo para tributacao:
   - calcular IR e PSS sobre a base total aplicavel;
   - aplicar abatimento da 1a parcela;
   - manter a apresentacao do desconto concentrada na 2a parcela no resumo.
3. Se 2a parcela for marcada, a 1a parcela correspondente deve ser marcada automaticamente para evitar base incompleta.
4. Exibir totais finais por bloco:
   - Total 13o salario Bruto 1a Parcela
   - Total 13o salario Liquido 1a Parcela
   - Total 13o salario Bruto 2a Parcela
   - Total 13o salario Liquido 2a Parcela

## 7. Diarias

1. Modo por datas:
   - `Data de fim` deve ser sempre igual ou maior que `Data de inicio`.
2. As diarias devem aparecer separadas no detalhamento, pois o pagamento e separado do holerite.
3. Dentro de diarias, o adicional de embarque deve aparecer em linha propria.
4. Exibir tambem `Diarias Liquidas` no bloco de diarias.

## 8. Detalhamento final

1. Separar blocos:
   - Holerite (sem diarias)
   - Diarias (pagamento separado)
2. Manter ordem:
   - creditos primeiro
   - debitos por ultimo
3. Em cada bloco, exibir totais coerentes com o proprio bloco.

## 9. Mobile e rodape

1. No mobile, usar apenas o texto `Exportar` no rodape (sem `e versao`).
2. A versao continua visivel no layout, mas sem compor o texto do CTA.

## 10. Intencoes preservadas

1. O gatilho `Johnson*` e intencional e nao deve ser removido por refatoracao automatica.
