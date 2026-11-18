import type { CalculatorState } from '../types';
import type { PresetGrossLine } from '../components/Calculator/dynamicPayrollForm.helpers';
import type { PayslipResultRow } from '../types/user';

/** Same entries feed screen, PDF/Excel and persisted payroll rows. No monthly credits are created. */
export const thirteenthPaymentRows = (state: CalculatorState): PayslipResultRow[] => {
    const memory = state.thirteenthMemory;
    if (!memory) return [];
    return [
        ...memory.advances.map(entry => ({ label: `GRATIFICAÇÃO NATALINA — 1ª PARCELA — ${entry.description}`, value: entry.amount, type: 'C' as const, displayGroup: 'thirteenth-credit' as const })),
        ...memory.secondEntries.map(entry => ({ label: `GRATIFICAÇÃO NATALINA — 2ª PARCELA — ${entry.description}`, value: entry.amount, type: 'C' as const, displayGroup: 'thirteenth-credit' as const })),
        ...(memory.secondSelected ? memory.advances.map(entry => ({ label: `ABATIMENTO DO ADIANTAMENTO DO 13º — ${entry.description}`, value: entry.amount, type: 'D' as const, displayGroup: 'thirteenth-advance' as const })) : [])
    ].filter(row => row.value > 0);
};

export const unifiedThirteenthLines = (state: CalculatorState): PresetGrossLine[] => {
    const memory = state.thirteenthMemory;
    if (!memory) return [];
    const round = (value: number) => Math.round(value * 100) / 100;
    const abono = state.abonoPerm13 || 0;
    const deductions = (state.ir13 || 0) + (state.pss13 || 0) + (state.valFunpresp13 || 0);
    const secondGross = round(memory.secondTotal + abono);
    return [
        ...memory.components.map(item => ({ label: `Referência — ${item.label}`, value: item.amount })),
        { label: 'Remuneração de referência do 13º', value: memory.referenceTotal },
        ...memory.advances.map(entry => ({ label: `1ª parcela — ${entry.description}`, value: entry.amount })),
        ...memory.secondEntries.map(entry => ({ label: `Saldo da 2ª parcela — ${entry.description}`, value: entry.amount })),
        ...(abono ? [{ label: 'Abono próprio do 13º (crédito separado)', value: abono }] : []),
        { label: 'Adiantamento considerado no fechamento (abatido uma vez no holerite)', value: memory.secondSelected ? memory.firstTotal : 0 },
        { label: 'Desconto IR (Total 13º salário)', value: state.ir13 || 0, isDiscount: true },
        { label: 'Desconto PSS (Total 13º salário)', value: state.pss13 || 0, isDiscount: true },
        { label: 'Desconto Funpresp (Total 13º salário)', value: state.valFunpresp13 || 0, isDiscount: true },
        { label: 'Total 13º salário Bruto', value: round(memory.firstTotal + secondGross), cardAmount: 'gross' },
        { label: 'Total 13º salário Líquido', value: round(memory.firstTotal + secondGross - deductions) },
        { label: 'Total 13º salário Bruto 1ª Parcela', value: memory.firstTotal },
        { label: 'Total 13º salário Líquido 1ª Parcela', value: memory.firstTotal },
        { label: 'Total 13º salário Bruto 2ª Parcela', value: secondGross },
        { label: 'Total 13º salário Líquido 2ª Parcela', value: round(secondGross - deductions) }
    ];
};

/** Audit table only; these values must not be appended as additional payroll credits. */
export const thirteenthAuditRows = (state: CalculatorState): Array<[string, string | number]> => {
    const memory = state.thirteenthMemory;
    if (!memory) return [];
    const rows: Array<[string, string | number]> = [
        ['Versão do recebimento', memory.version], ['1ª parcela selecionada', memory.firstSelected ? 'Sim' : 'Não'],
        ['2ª parcela selecionada', memory.secondSelected ? 'Sim' : 'Não'],
        ['Modo do adiantamento', memory.firstMode], ['Modo do fechamento', memory.secondMode],
        ['Remuneração de referência', memory.referenceTotal]
    ];
    for (const item of memory.components) rows.push([`Referência: ${item.label} (${item.id})`, item.amount]);
    for (const [label, entries] of [['Adiantamento', memory.advances], ['Saldo da segunda parcela', memory.secondEntries]] as const) {
        for (const entry of entries) rows.push([`${label}: ${entry.description}`, entry.amount],
            ['Identificador / vínculo', `${entry.id} / ${entry.target}`], ['Origem do lançamento', entry.origin === 'legacy' ? 'Configuração anterior' : 'Recebimento unificado']);
    }
    rows.push(['Total da primeira parcela', memory.firstTotal], ['Total do saldo bruto da segunda parcela', memory.secondTotal],
        ['Adiantamento abatido no fechamento', memory.secondSelected ? memory.firstTotal : 0],
        ['Abono próprio do 13º (separado da referência)', state.abonoPerm13 || 0],
        ['IR do 13º', state.ir13 || 0], ['PSS do 13º', state.pss13 || 0], ['Funpresp do 13º', state.valFunpresp13 || 0],
        ['Observação', 'A composição e os vínculos são informativos nesta memória. Adiantamentos são abatidos uma única vez no holerite.']);
    return rows;
};
