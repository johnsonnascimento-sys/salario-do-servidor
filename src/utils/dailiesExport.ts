import type { DailiesCalculationResult } from '../services/agency/dailies';

export type DailiesMemory = DailiesCalculationResult['memory'];
export const isDailiesRow = (label: string) => /DIARIA|ABATIMENTO BENEF\. EXTERNO/.test(label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase());

/** Export the original resolved data; never consult live configuration to explain a saved result. */
export function buildDailiesAuditRows(memory?: DailiesMemory): Array<Array<string | number>> {
    if (!memory) return [];
    const rows: Array<Array<string | number>> = [
        ['Órgão', memory.input.org_slug], ['Competência', memory.input.competence],
        ['Categoria', memory.input.category], ['Modo', memory.input.mode],
        ['Viagem', `${memory.input.start_date || ''} / ${memory.input.end_date || ''}`],
        ['Referência normativa informada', memory.input.normative_date || 'Resolução por período'],
        ['Motor / memória', `${memory.engine_version} / ${memory.schema_version}`],
    ];
    for (const [currency, total] of Object.entries(memory.totals)) {
        rows.push([`Moeda ${currency}: diárias`, total.gross], [`Moeda ${currency}: embarque`, total.boarding],
            [`Moeda ${currency}: adicionais`, total.additions], [`Moeda ${currency}: reduções`, total.reductions],
            [`Moeda ${currency}: corte por limite`, total.limit_cut], [`Moeda ${currency}: alimentação`, total.food_deduction],
            [`Moeda ${currency}: transporte`, total.transport_deduction], [`Moeda ${currency}: líquido`, total.net]);
    }
    for (const parcel of memory.parcels) {
        rows.push([`${parcel.date} / referência ${parcel.configuration_date} / ${parcel.currency}`, `Unitário ${parcel.daily_rate}; quantidade ${parcel.quantity}; fração ${parcel.fraction}; líquido ${parcel.net}`]);
        for (const [parameter, origin] of Object.entries(parcel.config.provenance)) {
            rows.push([`${parcel.date}: ${parameter}`, `${origin.scope_type}/${origin.scope_key}; ${origin.version_id}@${origin.revision}; ${origin.valid_from} a ${origin.valid_to || 'sem término'}`]);
        }
    }
    for (const version of memory.versions) {
        for (const source of Object.values(version.payload.sources || {})) {
            rows.push([`${source.title} ${source.article || ''}`, source.url],
                ['Publicação / efeitos', `${source.published_on || 'Não informada'} / ${source.effective_from || 'Não informados'} a ${source.effective_to || 'sem término informado'}`]);
        }
    }
    const flatten = (value: unknown, path: string) => {
        if (value !== null && typeof value === 'object') {
            for (const [key, child] of Object.entries(value)) flatten(child, `${path}.${key}`);
        } else rows.push([path, typeof value === 'number' ? value : String(value ?? '')]);
    };
    flatten(memory.input, 'Entradas');
    memory.versions.forEach(version => flatten(version.payload, `Parâmetros.${version.id}`));
    return rows;
}

export function dailiesResultRows(memory: DailiesMemory, currency: string) {
    const t = memory.totals[currency];
    if (!t) throw new Error(`Snapshot sem total em ${currency}`);
    const rows: Array<{ label: string; value: number; type: 'C' | 'D' }> = [
        { label: 'DIÁRIAS (SEM ADICIONAL DE EMBARQUE)', value: t.gross, type: 'C' },
        { label: 'ADICIONAL DE EMBARQUE (DIÁRIAS)', value: t.boarding, type: 'C' },
        { label: 'OUTROS ADICIONAIS (DIÁRIAS)', value: t.additions, type: 'C' },
        { label: 'REDUÇÕES (DIÁRIAS)', value: t.reductions, type: 'D' },
        { label: 'CORTE POR LIMITE (DIÁRIAS)', value: t.limit_cut, type: 'D' },
        { label: 'RESTITUIÇÃO AUX. ALIMENTAÇÃO (DIÁRIAS)', value: t.food_deduction, type: 'D' },
        { label: 'RESTITUIÇÃO AUX. TRANSPORTE (DIÁRIAS)', value: t.transport_deduction, type: 'D' },
    ];
    return rows.filter(row => row.value !== 0);
}
