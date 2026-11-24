# Substituição de função

Regras funcionais canônicas do módulo. Leia também [PROJECT_RULES.md](../../../../PROJECT_RULES.md) e os módulos relacionados quando a mudança os afetar.

### 4.4.1 Substituição de função

1. Cada função de cada card aceita três modos independentes: quantidade, períodos contínuos ou dias avulsos no calendário. Apenas o modo ativo entra no cálculo. Preservar as entradas ao alternar e reabrir a simulação. Registros antigos por data correspondem a um intervalo único. Períodos podem atravessar meses, incluem as duas extremidades e contam cada data uma só vez por função e card.
2. Para datas de exercício em mês anterior ao pagamento, o motor agrupa os dias por mês e vigência da tabela remuneratória do órgão. Usa os dados funcionais do holerite, o divisor configurado e o arredondamento existente, com datas, dias, tabela e subtotal de cada segmento na memória. Datas no mês do pagamento e entradas por quantidade usam a tabela da folha.
3. Seleção inválida, incompleta, invertida, posterior ao mês do pagamento ou sem tabela ou parâmetro necessário impede resultado definitivo quando o bruto depender das datas. O bruto documentado prevalece em qualquer regime de IR, inclusive zero. Usá-lo também se os dados funcionais da época eram diferentes dos informados na folha. Subtotais calculáveis são referência quando houver bruto documentado. Datas não alteram automaticamente IR, RRA ou PSS. Usar cards separados quando os lançamentos tiverem tratamentos tributários distintos.
