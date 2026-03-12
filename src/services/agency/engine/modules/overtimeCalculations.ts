/**
 * Calculos de Hora Extra - JMU
 * 
 * Responsavel por calcular:
 * - Hora Extra 50%
 * - Hora Extra 100%
 * - Total de Hora Extra
 */

import { CourtConfig } from '../../../../types';
import { IAgencyCalculationParams } from '../types';
import { calculateResolvedOvertimeEntries } from '../../../../utils/overtimeEntries';

export interface OvertimeResult {
    heVal50: number;
    heVal100: number;
    heTotal: number;
    entries: Array<{
        id: string;
        heVal50: number;
        heVal100: number;
        heTotal: number;
        isEA: boolean;
        excluirIR: boolean;
        competenciaRef?: string;
        resolvedPeriod?: number;
        usedManualGross?: boolean;
    }>;
}

const requireAgencyConfig = (params: IAgencyCalculationParams): CourtConfig => {
    if (!params.agencyConfig) {
        throw new Error('agencyConfig is required for JMU calculations.');
    }
    return params.agencyConfig;
};

/**
 * Calcula Hora Extra (50% e 100%)
 */
export async function calculateOvertime(params: IAgencyCalculationParams): Promise<OvertimeResult> {
    const config = requireAgencyConfig(params);
    const overtimeEntries = (params.overtimeEntries?.length || 0) > 0
        ? params.overtimeEntries || []
        : [
            {
                id: 'legacy-he',
                qtd50: params.heQtd50 || 0,
                qtd100: params.heQtd100 || 0,
                isEA: Boolean(params.heIsEA),
                excluirIR: Boolean(params.heExcluirIR),
                competenciaRef: '',
                valorBrutoManual: 0
            }
        ];
    const resolvedEntries = calculateResolvedOvertimeEntries(params, config, overtimeEntries);
    const heVal50 = resolvedEntries.reduce((acc, item) => acc + item.heVal50, 0);
    const heVal100 = resolvedEntries.reduce((acc, item) => acc + item.heVal100, 0);
    const heTotal = resolvedEntries.reduce((acc, item) => acc + item.heTotal, 0);

    return {
        heVal50,
        heVal100,
        heTotal,
        entries: resolvedEntries.map((entry) => ({
            id: entry.id,
            heVal50: entry.heVal50,
            heVal100: entry.heVal100,
            heTotal: entry.heTotal,
            isEA: Boolean(entry.isEA),
            excluirIR: Boolean(entry.excluirIR),
            competenciaRef: entry.competenciaRef,
            resolvedPeriod: entry.resolvedPeriod,
            usedManualGross: entry.usedManualGross
        }))
    };
}
