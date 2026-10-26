import type { IAgencyCalculationParams } from '../types';
import { calculateDailies as calculateVersionedDailies, type DailiesCalculationResult } from '../../dailies';
import { legacyDailiesInput } from '../../adapters/dailiesInput';
import { dailiesService } from '../../../dailies/DailiesService';

export interface DailiesResult {
    valor: number; bruto: number; glosa: number; corteLdo: number; deducoes: number;
    descAlim: number; descTransp: number; diasDescontoAlim: number; diasDescontoTransp: number;
    memory?: DailiesCalculationResult['memory'];
}

/** Payroll adapter for the same engine used by /diarias. No legacy configuration fallback. */
export async function calculateDailies(params: IAgencyCalculationParams,
    benefits: { auxAlimentacao: number; auxTransporte: number }): Promise<DailiesResult> {
    const empty: DailiesResult = { valor: 0, bruto: 0, glosa: 0, corteLdo: 0, deducoes: 0,
        descAlim: 0, descTransp: 0, diasDescontoAlim: 0, diasDescontoTransp: 0 };
    const requested = params.dailiesInput || params.diariasQtd > 0 || ['completo', 'metade'].includes(params.diariasEmbarque) ||
        (params.diariasModoDesconto === 'periodo' && (params.diariasDataInicio || params.diariasDataFim));
    if (!requested) return empty;
    const input = legacyDailiesInput(params, benefits);
    const loaded = await dailiesService.getForInput(input);
    const result = calculateVersionedDailies(input, loaded.versions, loaded.context);
    if (!result.available) throw new Error(`Diárias indisponíveis: ${result.issues.map(issue => issue.message).join('; ')}`);
    if (Object.keys(result.totals).some(currency => currency !== 'BRL')) {
        throw new Error('Diárias em moeda estrangeira devem ser simuladas e salvas separadamente em /diarias; não podem ser somadas ao holerite em reais.');
    }
    const total = result.totals.BRL;
    if (!total) throw new Error('Diárias sem parcelas em reais.');
    return { ...empty, valor: total.net, bruto: total.gross + total.boarding + total.additions,
        glosa: total.reductions, corteLdo: total.limit_cut, deducoes: total.deductions,
        descAlim: total.food_deduction, descTransp: total.transport_deduction,
        diasDescontoAlim: result.parcels.reduce((sum, parcel) => sum + parcel.food_deduction_days, 0),
        diasDescontoTransp: result.parcels.reduce((sum, parcel) => sum + parcel.transport_deduction_days, 0), memory: result.memory };
}
