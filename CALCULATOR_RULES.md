# Regras Imutaveis da Calculadora

Atualizado em: 24/02/2026

Este arquivo define as regras que **nao podem ser alteradas** sem ADR aprovado.
Baseado em `MANUAL_DO_PROJETO.md`, `PROJECT_ARCHITECTURE.md` e `DATA_DRIVEN_MIGRATION.md`.

## 1. Proibicao de calculos hardcoded

1. Nenhuma aliquota, faixa, deducao, teto ou percentual tributario pode ser fixado no codigo de produto.
2. Nenhuma regra de calculo especifica de orgao pode ficar embutida em componente React.
3. Qualquer valor legal deve vir de `agencyConfig` (ConfigService) ou input explicito do usuario.
4. Excecoes temporarias so sao permitidas com comentario `TODO` + prazo + issue referenciada.

## 2. Fonte unica de verdade

1. O motor oficial de calculo e o `JmuService` + modulos em `src/services/agency/implementations/jmu/modules/`.
2. A UI nao pode recalcular imposto/previdencia por conta propria.
3. O adaptador `mapStateToJmuParams` deve transportar todos os campos necessarios ao motor.

## 3. Formulario dinamico de rubricas

1. Novas rubricas nao devem gerar novos cards fixos.
2. Qualquer rubrica manual deve suportar:
- tipo (`C` credito / `D` desconto)
- descricao
- valor
- `incideIR`
- `incidePSS`
3. A incidencia em base de IR/PSS deve ser dirigida por esses flags, nunca por nome de rubrica.

## 4. Data-driven obrigatorio

1. Configuracoes seguem hierarquia: Global -> Power -> Org.
2. Regras de diarias devem viver em `power_config.config_key = dailies_rules` (com override opcional via `org_config`).
3. Qualquer ajuste de valor/percentual de diaria deve ser feito no banco (admin/seed/migracao), nunca no codigo.
4. Regras de formula (GAJ, VR, divisores, transporte, IR) devem viver em `power_config.config_key = payroll_rules`.
5. Catalogo de carreira (cargo labels, codigo sem funcao) deve viver em `power_config.config_key = career_catalog`.
6. Referencia salarial (periodos/reajustes exibidos na UI) deve viver em `power_config.config_key = adjustment_schedule`.
7. O sistema nao pode depender de `data.ts` legado.
8. Se faltar dado remoto, fallback permitido apenas para `courts.config` conforme fluxo atual.
9. Seletores de referencia temporal (mes/ano) devem respeitar o intervalo efetivamente coberto pelos dados ativos (IR, PSS, beneficios e referencia salarial), calculado em runtime.
10. Mes com mudanca de valor de beneficio no proprio periodo deve permitir regra proporcional apenas quando houver metadado suficiente na configuracao para compor o calculo.

## 5. Qualidade minima para merge

1. Mudancas de calculo exigem validacao de build e smoke manual da calculadora.
2. Toda mudanca de regra tributaria deve citar origem (portaria/lei ou config admin).
3. PR sem evidencia de que evitou hardcode deve ser bloqueado.

## 6. Regras obrigatorias de Diarias (JMU)

1. O valor da diaria por cargo deve ser derivado da diaria do ministro quando `derived_from_minister.enabled = true`.
2. As porcentagens de cargos (juiz, CJ, analista, tecnico) e do adicional de embarque devem vir de configuracao.
3. O modo de entrada deve ser exclusivo: ou por datas, ou por quantidade de diarias.
4. Em modo por datas, o sistema deve:
- contar dias corridos para periodo;
- aplicar meia diaria no dia de retorno (inclusive retorno em fim de semana/feriado);
- aplicar meio desconto de auxilios no retorno apenas se o retorno for dia util.
5. Finais de semana e feriados oficiais devem ser usados para excluir desconto de auxilios, nunca para remover o direito a meia diaria de retorno.
6. O teto LDO por diaria deve ser parametrico (`dailies_rules.ldo_cap`) e o corte exibido separadamente.
7. O calendario de feriados deve ser data-driven (lista de datas + metadados) em `discount_rules`.
8. A UI deve explicitar datas consideradas (fins de semana/feriados), meia diaria e meios descontos no resumo.

## 7. Regra visual obrigatoria para resumo por card

1. Linhas de desconto no "Resumo bruto calculado" devem usar o padrao visual de desconto.
2. Esse padrao inclui marcador `(-)` e cor de desconto pre-definida.
3. O padrao deve valer para todos os cards, nao apenas para Diarias.

## 8. Regra de UX da calculadora de campo

1. A calculadora flutuante nao pode fechar ao clicar ou focar em elementos internos dela.
2. Deve fechar ao perder contexto (clique fora e fora de campo elegivel).
3. Deve manter ancoragem ao campo de valor em foco e reposicionar com scroll/resize.
