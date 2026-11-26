import type { AbateTetoMemory, AbateTetoRubricKind } from '../types/constitutionalCeiling';
import { formatCurrency } from './calculations';

const classificationLabels: Record<AbateTetoRubricKind, string> = {
    monthly: 'Base mensal',
    excluded: 'Parcela excluída',
    separate: 'Apuração separada',
};

export function abateTetoAuditRows(memory?: AbateTetoMemory): [string, string][] {
    if (!memory) return [];
    const rows: [string, string][] = [['Competência', memory.competence]];
    if (memory.status !== 'ready') {
        rows.push(['Abate-teto não apurado', memory.reason ?? 'Apuração fora do recorte mensal.']);
        return rows;
    }
    const amounts: [string, number | undefined][] = [
        ['Teto aplicável', memory.limit],
        ['Base mensal sujeita ao teto', memory.monthlyGross],
        ['Abate-teto constitucional', memory.amount],
        ['Rendimentos tributáveis de IRRF antes do abate', memory.irBefore],
        ['Rendimentos tributáveis de IRRF após o abate', memory.irAfter],
        ['Base de RPPS antes do abate', memory.rppsBefore],
        ['Base de RPPS após o abate', memory.rppsAfter],
    ];
    for (const [label, value] of amounts) {
        if (value !== undefined) rows.push([label, formatCurrency(value)]);
    }
    for (const component of memory.components ?? []) {
        rows.push([component.label, formatCurrency(component.amount) + ' · ' +
            classificationLabels[component.kind] + ' · ' + component.provision]);
    }
    if (memory.source) rows.push(['Fonte da classificação', memory.source]);
    return rows;
}
