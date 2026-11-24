# Vantagens pessoais

Regras funcionais canônicas do módulo. Leia também [PROJECT_RULES.md](../../../PROJECT_RULES.md) e os módulos relacionados quando a mudança os afetar.

## VPNI e ATS

1. A página Vantagens pessoais exibe cards fixos e independentes de VPNI e ATS, usando o fluxo de [rubricas manuais](RUBRICAS_MANUAIS.md) e preservando os lançamentos existentes.
2. O ATS aceita valor fixo ou percentual adquirido informado pelo usuário. O motor oficial aplica o percentual exclusivamente ao vencimento básico do cargo efetivo no período, arredonda em centavos e usa o resultado na própria rubrica. O limite vem da configuração de folha do poder, com fonte normativa. Percentual inválido ou ausência de parâmetro ou vencimento impede resultado definitivo no modo percentual. Snapshots sem percentual usam o valor fixo.
