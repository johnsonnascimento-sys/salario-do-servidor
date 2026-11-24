# Vantagens pessoais

Regras funcionais canônicas do módulo. Leia também [PROJECT_RULES.md](../../../../PROJECT_RULES.md) e os módulos relacionados quando a mudança os afetar.

### 4.0 Navegação por páginas

1. A calculadora apresenta, nesta ordem, Competência (mês, ano e enquadramento normativo), Dados básicos, Adicional de Qualificação (AQ), Vantagens pessoais, Benefícios, Previdência e abono, Imposto de Renda, Créditos Eventuais, Descontos, Observações/Notas e Resultado.
2. As páginas organizam a coleta dos dados; não duplicam nem alteram os valores e regras do motor oficial.
3. A página Vantagens pessoais exibe cards fixos e independentes de VPNI e ATS, usando o fluxo de rubricas manuais e preservando os lançamentos existentes.
4. O ATS aceita valor fixo ou percentual adquirido informado pelo usuário. O motor oficial aplica o percentual exclusivamente ao vencimento básico do cargo efetivo no período, arredonda em centavos e usa o resultado na própria rubrica. O limite vem da configuração de folha do poder, com fonte normativa. Percentual inválido ou ausência de parâmetro ou vencimento impede resultado definitivo no modo percentual. Snapshots sem percentual usam o valor fixo.
