import type { IAgencyCalculationParams } from '../types';
import type { PensionRetroEntry } from '../../../../types/pension';
import { buildPensionContext, calculateMonthlyPensionContext, type PensionContext } from './pensionContext';

export const historicalPensionParams = (params: IAgencyCalculationParams, entry: PensionRetroEntry): IAgencyCalculationParams => ({
    ...params, competencia: entry.competencia, tabelaPSS: entry.tabelaPSS || '',
    regimePrev: entry.regimePrev ?? params.regimePrev,
    funprespParticipacao: entry.participacao ?? params.funprespParticipacao,
    funprespAliq: entry.aliquotaNormal ?? 0, funprespFacul: entry.aliquotaFacultativa ?? 0,
    funprespBaseIntegral: entry.salarioParticipacaoVinculado, funprespVinculadaInicio: entry.inicioVinculado,
    funprespFaculValor: 0, funprespFaculForma: 'folha',
});

export const resolveHistoricalPensionContext = (params: IAgencyCalculationParams, entry: PensionRetroEntry) => {
    if (entry.modo === 'manual') return { context: null, error: null };
    if (!entry.tabelaPSS || !/^\d{4}-(0[1-9]|1[0-2])$/.test(entry.competencia) ||
        typeof entry.baseComplementarDevida !== 'number' || !Number.isFinite(entry.baseComplementarDevida) || entry.baseComplementarDevida < 0) {
        return { context: null, error: 'Informe a competência, a tabela PSS e a remuneração integral elegível corrigida para escolher a participação.' };
    }
    try {
        return { context: buildPensionContext(historicalPensionParams(params, entry), entry.baseComplementarDevida, {}, entry.tipo ?? 'mensal'), error: null };
    } catch (error) {
        return { context: null, error: error instanceof Error ? error.message : 'Contexto histórico indisponível.' };
    }
};

export interface PensionSelectionContexts {
    monthly: PensionContext;
    retro: Record<string, ReturnType<typeof resolveHistoricalPensionContext>>;
    requiresChoice: boolean;
}

export const resolvePensionSelectionContexts = async (params: IAgencyCalculationParams): Promise<PensionSelectionContexts> => {
    const monthly = await calculateMonthlyPensionContext(params);
    const retro: PensionSelectionContexts['retro'] = {};
    let requiresChoice = !monthly.allowed.includes(params.funprespParticipacao);
    for (const entry of params.pensionRetroEntries ?? []) {
        retro[entry.id] = resolveHistoricalPensionContext(params, entry);
        if (retro[entry.id].context && !retro[entry.id].context.allowed.includes(entry.participacao ?? params.funprespParticipacao)) requiresChoice = true;
    }
    return { monthly, retro, requiresChoice };
};
