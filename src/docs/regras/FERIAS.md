# Férias

Regras funcionais canônicas do módulo. Leia também [PROJECT_RULES.md](../../../../PROJECT_RULES.md) e os módulos relacionados quando a mudança os afetar.

### 4.3.1 Férias (1/3 Constitucional)

1. O adicional de 1/3 de férias (art. 7º, XVII, da CF/88 c/c art. 76 da Lei nº 8.112/1990) incide sobre a remuneração de referência apurada no período de usufruto.
2. A base de cálculo da remuneração de referência das férias suporta composição dinâmica por checkboxes com valores em tempo real (mesmo comportamento da Gratificação Natalina e da GAACTA): parcelas regulares (Vencimento, GAJ, FC/CJ, AQ Títulos, AQ Treinamento, VPNI, ATS e GAE/GAS) permanecem selecionadas por padrão, e parcelas complementares (Abono de Permanência, rubricas manuais de crédito criadas pelo usuário e ajustes avulsos) podem ser incluídas/excluídas interativamente, recalculando instantaneamente o 1/3 apurado e suas retenções de IRRF.
3. O Abono de Permanência permanece selecionado por padrão (`feriasIncideAbono: true`), incidindo na composição quando o servidor tiver abono ativo (`recebeAbono`), e sendo marcado automaticamente no card de Férias sempre que o usuário adicionar o abono.
4. Suporte a férias antecipadas (`feriasAntecipadas` e `feriasDescManual`) para dedução integral ou personalizada no contracheque posterior.
