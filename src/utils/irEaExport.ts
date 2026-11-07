import type { IrEaMemory } from '../types/irEa';
import { formatCurrency } from './calculations';

/** Presentation of engine memory, shared by screen and exports. */
export const buildIrEaAuditRows = (memory?: IrEaMemory): Array<[string, string]> => {
    if (!memory || memory.status !== 'ready') return [];
    return [
        ['Mês do pagamento', memory.mesPagamento],
        ['Competências originais', memory.competencias.join(', ')],
        ['Número de meses (NM)', String(memory.meses)],
        ['Tabela vigente no pagamento', memory.tabela],
        ['Créditos tributáveis EA', formatCurrency(memory.baseBruta)],
        ['Deduções da base EA', formatCurrency(memory.deducoes)],
        ['Base de cálculo EA', formatCurrency(memory.baseCalculo)],
        ['Imposto antes da redução', formatCurrency(memory.impostoAntesReducao)],
        ['Redução do imposto', formatCurrency(memory.reducao)],
        ['IR-EA', formatCurrency(memory.imposto)],
        ...(memory.ajustesBaseDocumentados ?? []).map((item): [string, string] => [`Dedução: ${item.descricao}`, `${formatCurrency(item.valor)} — ${item.fundamento}`]),
        ...memory.avisos.map((notice): [string, string] => ['Observação', notice]),
    ];
};
