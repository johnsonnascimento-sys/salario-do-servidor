# Serviço extraordinário

Regras funcionais canônicas do módulo. Leia também [PROJECT_RULES.md](../../../PROJECT_RULES.md) e os módulos relacionados quando a mudança os afetar.

## Serviço Extraordinário (Horas Extras - Resolução STM nº 374/2025 e Resolução CJF nº 4/2008)

1. O valor da hora extraordinária é apurado dividindo-se a remuneração mensal pelo divisor correspondente à jornada de trabalho semanal do servidor, excluídos o adicional de 1/3 de férias e a gratificação natalina (art. 7º da Resolução STM nº 374/2025 e art. 46 da Resolução CJF nº 4/2008).
2. Divisores padrão: 175 para a jornada ordinária da JMU de 35h semanais (art. 7º, § 1º, I) e 200 para a jornada ordinária da JF de 40h semanais (art. 46, § 1º).
3. Jornadas especiais: 30h semanais aplicam divisor 150 (art. 7º, § 1º, II) e 20h semanais aplicam divisor 100 (art. 7º, § 1º, III). Para jornadas diversas, aplica-se a fórmula legal $(\text{Jornada Semanal} \div 6) \times 30$ (art. 7º, § 2º).
4. O divisor mensal é parametrizado e editável por instância (`OvertimeEntry.divisor`), garantindo isolamento entre cards e permitindo override direto pelo usuário.
5. Em conformidade com o art. 6º, § 1º da Resolução STM nº 374/2025 (redação da Resolução STM nº 399/2026), no período de recesso forense / plantão o teto informativo da JMU eleva-se de 30 para 50 horas mensais.
6. A memória de cálculo unitária informa os valores da Hora Normal (com identificação do divisor aplicado), Hora Extra (+50%) e Hora Extra (+100%) integrada organicamente ao Resumo Calculado (`PresetGrossSummary`) do card de Serviço Extraordinário, preservando o padrão visual e a consistência arquitetural do sistema.
7. No modo de cálculo por função substituída, as horas são remuneradas apenas quando o valor da função de destino supera a função atual acrescida da gratificação específica, seguindo o limite do card de [Substituição de Função](SUBSTITUICAO_DE_FUNCAO.md). Destinos menores ou iguais não geram valor nesse modo e seus campos ficam desabilitados conforme a elegibilidade devolvida pelo motor. Entradas antigas inelegíveis, horas globais residuais e valores brutos manuais são ignorados nesse modo. Para HE pela função atual ou valor bruto documentado, usar o modo comum; servidor sem função pode usar a remuneração de função superior efetivamente substituída.

## Composição da base

1. Cada card de HE permite selecionar a composição da base remuneratória, persistida em `OvertimeEntry.composicaoBase`. O motor devolve parcelas, valores, seleções e subtotal; a UI apenas exibe e coleta escolhas. Vencimento, GAJ, FC/CJ, AQ, gratificação específica e abono iniciam selecionados; créditos dinâmicos por ID iniciam desmarcados. A VPNI e o ATS são oferecidos pelas rubricas dos cards fixos da página [Vantagens pessoais](VANTAGENS_PESSOAIS.md); os campos legados VPNI — Lei, VPNI — Decisão e ATS não são oferecidos nem somados diretamente à base de HE. O abono utiliza o PSS mensal atual, inclusive rubricas contributivas, independentemente da seleção de HE e da função substituída. A seleção não altera as incidências das parcelas originais nem o critério de elegibilidade da substituição. Férias e gratificação natalina não são oferecidas na composição.
2. Por solicitação expressa do usuário, a composição configurável de HE oferece inclusão opcional da [GAACTA](GAACTA_E_LICENCA_COMPENSATORIA.md) na simulação, desmarcada por padrão, sem apresentá-la como incidência legal automática.
3. Em horas extras, não exibir opção de incidência de PSS que não se aplica.
