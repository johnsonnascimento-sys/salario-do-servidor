# GAE / GAS

Regras funcionais canônicas do módulo. Leia também [PROJECT_RULES.md](../../../PROJECT_RULES.md) e os módulos relacionados quando a mudança os afetar.

### 4.3.2 Gratificação Específica (GAE / GAS - Lei nº 11.416/2006)

1. Conforme os arts. 16, § 1º (GAE) e 17, § 1º (GAS) da Lei nº 11.416/2006, as gratificações específicas de atividade externa e segurança correspondem a 35% do vencimento básico do servidor.
2. A base de cálculo da GAE/GAS suporta composição dinâmica por checkboxes com valores em tempo real: por padrão legal estrito, apenas o Vencimento Básico permanece selecionado (`gratIncideVencimento: true`).
3. Outros créditos (GAJ, FC/CJ, AQ Títulos, AQ Treinamento, VPNI, ATS, Abono de Permanência, rubricas manuais de crédito e ajustes avulsos) são exibidos para permitir seleção pelo usuário em caso de peculiaridades administrativas ou judiciais, mas **não devem ficar selecionados por padrão** (todos os demais permanecem `false` por padrão).
4. Suporte a opção de inclusão ou exclusão da gratificação na base de cálculo da contribuição previdenciária (`incidirPSSGrat`).
5. Na troca explícita de GAE/GAS, o padrão de PSS vem de `power_config.payroll_rules.specific_gratification_pss_defaults` (GAE incluída; GAS excluída por padrão, ressalvados opção e enquadramento aplicáveis). Manter ajustes manuais e snapshots ao abrir o card; não confundir estes padrões RPPS com regras de Funpresp. A migration preparada exige aplicação no banco para ativar os padrões.
