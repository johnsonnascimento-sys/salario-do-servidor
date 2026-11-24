# Rubricas manuais

Regras funcionais canônicas do módulo. Leia também [PROJECT_RULES.md](../../../PROJECT_RULES.md) e os módulos relacionados quando a mudança os afetar.

### 4.1 Rubricas manuais

Cada rubrica manual deve suportar:

1. Tipo (`C` credito, `D` desconto)
2. Descricao
3. Valor
4. Incidencia em IR
5. Incidencia em IR (EA)
6. Incidencia em PSS
7. Incidencia em PSS (EA)
8. Resumo calculado (`PresetGrossSummary`) com Bruto e detalhamento disponível de IR/PSS. Consulte [Apurações compartilhadas de Funpresp e PSS](PREVIDENCIA.md#apurações-compartilhadas-de-funpresp-e-pss) para a apresentação dos grupos previdenciários.
9. No resumo individual da rubrica de crédito com incidência em IR mensal, o desconto exibido reflete o rateio proporcional do imposto total; quando a inclusão da rubrica acarretar acréscimo marginal distinto por faixas/alíquotas efetivas, exibir informativamente o acréscimo efetivo na folha sem descontar ambos do valor líquido individual.
10. Não exibir descontos ou líquidos provenientes de cálculo anterior enquanto a simulação atual não estiver concluída. Patrocínio e pagamentos externos são informativos e não reduzem o líquido da folha.
