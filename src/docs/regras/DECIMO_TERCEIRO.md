# Gratificação natalina (13º)

Regras funcionais canônicas do módulo. Leia também [PROJECT_RULES.md](../../../PROJECT_RULES.md) e os módulos relacionados quando a mudança os afetar.

### 4.3 Gratificacao natalina (13o)

1. Nao cobrar PSS sobre FC/CJ no 13o.
2. Na 2a parcela, considerar base total aplicavel, aplicar abatimento da 1a parcela e concentrar desconto no resumo da 2a.
3. Se marcar 2a parcela, marcar automaticamente a 1a correspondente para evitar base incompleta.
4. Exibir totais brutos e liquidos por parcela.
5. No modo de ajuste manual do adiantamento recebido anteriormente (1ª parcela), a 2ª parcela apura automaticamente o saldo complementar necessário para integralizar a remuneração de referência e assegurar a retenção tributária legal completa sem exigir cálculo manual do usuário, preservando a possibilidade de edição avulsa.
6. A base de cálculo da remuneração de referência do 13º salário suporta composição dinâmica por checkboxes com valores em tempo real (similar ao GAACTA): as parcelas regulares (Vencimento, GAJ, FC/CJ, AQ Títulos, AQ Treinamento, VPNI, ATS e GAE/GAS) permanecem selecionadas por padrão, e parcelas complementares (Abono de Permanência, rubricas manuais de crédito criadas pelo usuário e ajustes avulsos) podem ser incluídas/excluídas interativamente, recalculando instantaneamente a base apurada e seus reflexos nas parcelas e retenções. O Abono de Permanência permanece selecionado por padrão (`decimoIncideAbono: true`), incidindo na composição do 13º quando o servidor tiver abono ativo (`recebeAbono`), e sendo marcado automaticamente no card do 13º salário sempre que o usuário adicionar o abono.

7. O recebimento do 13º oferece seleção unificada da 1ª e da 2ª parcelas. No fluxo versionado (`thirteenthPayroll`), composição da referência, adiantamentos e fechamento manual são entradas distintas; listas de lançamentos vinculados não criam créditos mensais nem duplicam as verbas da referência. A segunda parcela considera a primeira e abate o adiantamento uma única vez no holerite.
8. Adiantamentos e valores manuais podem ser individuais ou agrupados conforme o documento. A apuração mantém incidências por componente, distingue abono mensal de abono próprio do 13º e não inventa rateios para agrupamentos parciais de natureza desconhecida. Vínculos ausentes, sobreposição, divergências e adiantamentos acima da referência preservam entradas e impedem resultado definitivo até revisão.
9. Snapshots sem o fluxo versionado preservam o caminho anterior. Abrir ou cancelar a personalização não converte dados; seleções parciais antigas são sinalizadas e somente uma confirmação explícita aplica o recebimento unificado. A memória e as exportações preservam as listas e seus vínculos sem somá-los novamente aos créditos.
