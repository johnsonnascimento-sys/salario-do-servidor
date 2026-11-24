import type { CalculatorState } from '../types';
import { formatCurrency } from './calculations';

export function commissionAuditRows(state: Pick<CalculatorState,
    'commissionMemory' | 'rgpsMemory' | 'rgpsThirteenthMemory' | 'commissionIncomeTax'>): string[][] {
    const commission = state.commissionMemory;
    if (!commission) return [];
    const option = commission.option === 'full' ? 'CJ integral'
        : commission.option === 'fc' ? 'Função comissionada' : 'Opção pela remuneração de origem';
    const rows = [
        ['Vínculo funcional', commission.profile === 'exclusive_cj' ? 'CJ sem vínculo efetivo' : 'Vínculo público fora das carreiras do PJU'],
        ['Cargo ou função', commission.functionCode.toUpperCase()],
        ['Modalidade', option],
        ['Competência', commission.competence],
        ['Valor de tabela', formatCurrency(commission.tableAmount)],
        ['Retribuição paga na folha do Judiciário', formatCurrency(commission.paidAmount)],
        ['Regime previdenciário', commission.regime.toUpperCase()],
        ['Fonte da tabela de CJ/FC', commission.source],
    ];
    if (commission.rate !== undefined && commission.option === 'effective_plus_65') {
        rows.push(['Percentual da opção', new Intl.NumberFormat('pt-BR', { style: 'percent' }).format(commission.rate)]);
    }
    if (commission.payment) rows.push(['Pagador da remuneração de origem', commission.payment === 'origin' ? 'Órgão de origem' : 'Judiciário']);
    if (commission.originRemuneration > 0) rows.push(['Remuneração de origem incluída nesta folha', formatCurrency(commission.originRemuneration)]);
    for (const memory of [state.rgpsMemory, state.rgpsThirteenthMemory]) {
        if (!memory) continue;
        const label = memory.tipo === '13' ? 'INSS do 13º' : 'INSS mensal';
        rows.push([`${label} — base desta folha`, formatCurrency(memory.base)],
            [`${label} — base de outros vínculos`, formatCurrency(memory.otherBase)],
            [`${label} — base conjunta limitada ao teto`, formatCurrency(memory.totalBase)],
            [`${label} — retenção`, formatCurrency(memory.amount)], [`${label} — fonte`, memory.source]);
    }
    for (const memory of state.commissionIncomeTax ?? []) {
        const label = memory.tipo === '13' ? 'IRRF do 13º' : memory.tipo === 'ferias' ? 'IRRF de férias' : 'IRRF mensal';
        rows.push([`${label} — base`, formatCurrency(memory.base)],
            [`${label} — ${memory.simplified ? 'desconto simplificado' : 'deduções legais'}`, formatCurrency(memory.deduction)],
            [`${label} — redução`, formatCurrency(memory.reduction)], [`${label} — retenção`, formatCurrency(memory.amount)],
            [`${label} — fonte`, memory.source]);
    }
    return rows;
}
