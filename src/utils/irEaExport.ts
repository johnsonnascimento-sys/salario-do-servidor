import type { IrEaMemory } from '../types/irEa';
import { formatCurrency } from './calculations';

/** Presentation of engine memory, shared by screen and exports. */
export const buildIrEaAuditRows = (memory?: IrEaMemory): Array<[string, string]> => {
    if (!memory || memory.status !== 'ready') return [];
    const rows: Array<[string, string]> = [
        ['Mês do pagamento', memory.mesPagamento],
        ['Competências originais', memory.competencias.join(', ')],
        ['Número de meses (NM)', String(memory.meses)],
        ['Tabela vigente no pagamento', memory.tabela],
        ['Créditos tributáveis EA', formatCurrency(memory.baseBruta)],
        ['Deduções da base EA', formatCurrency(memory.deducoes)],
    ];
    if (memory.dependentesValor) {
        rows.push(['Dedução de dependentes (RRA)', `${formatCurrency(memory.dependentesValor)} (${memory.dependentesDeduzidos} dependente${(memory.dependentesDeduzidos ?? 0) > 1 ? 's' : ''})`]);
    }
    rows.push(
        ['Base de cálculo EA', formatCurrency(memory.baseCalculo)],
        ['Imposto antes da redução', formatCurrency(memory.impostoAntesReducao)],
        ['Redução do imposto', formatCurrency(memory.reducao)],
        ['IR-EA', formatCurrency(memory.imposto)]
    );
    for (const item of (memory.ajustesBaseDocumentados ?? [])) {
        rows.push([`Dedução: ${item.descricao}`, `${formatCurrency(item.valor)} — ${item.fundamento}`]);
    }
    for (const notice of memory.avisos) {
        rows.push(['Observação', notice]);
    }
    return rows;
};
