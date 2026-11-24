import type { IAgencyCalculationParams } from '../types';
import { resolveCommissionPay } from './commissionCalculations';

export function applyCommissionProfile(params: IAgencyCalculationParams): IAgencyCalculationParams {
    if (!params.commissionProfile) return params;
    return {
        ...params,
        cargo: '',
        padrao: '',
        aqTituloPerc: 0,
        aqTreinoPerc: 0,
        aqTituloVR: 0,
        aqTreinoVR: 0,
        vpni_lei: 0,
        vpni_decisao: 0,
        ats: 0,
        gratEspecificaTipo: '0',
        gratEspecificaValor: 0,
        recebeAbono: false,
        abonoPermanencia: 0,
        pssSobreFC: false,
        incidirPSSGrat: false,
        incluirAbonoLicenca: false,
        funprespParticipacao: 'nao',
        pensionRetroEntries: undefined,
        transporteIndenizacaoAtivo: ['jmu', 'stm'].includes(params.agencyConfig?.orgSlug ?? params.orgSlug) && params.transporteIndenizacaoAtivo,
    };
}

export function requireCommissionOriginIncluded(params: IAgencyCalculationParams, benefit: 'vacation' | 'thirteenth') {
    const profile = params.commissionProfile;
    if (profile?.kind !== 'external' || profile.payment !== 'judiciary' ||
        (params.funcao.toLowerCase().startsWith('cj') && profile.cjOption === 'full')) return false;
    const label = benefit === 'vacation' ? 'Férias' : '13º salário';
    const confirmed = benefit === 'vacation' ? profile.vacationPaysOriginRemuneration : profile.thirteenthPaysOriginRemuneration;
    if (typeof confirmed !== 'boolean') {
        throw new Error(`${label} pendente: informe se a remuneração de origem compõe esta verba na folha do Judiciário.`);
    }
    return confirmed;
}

export function resolveCommissionAlternativePay(params: IAgencyCalculationParams, funcao: string, competencia = params.competencia) {
    const code = funcao.toLowerCase();
    if (!/^(cj[1-4]|fc[1-6])$/.test(code) || code.slice(0, 2) !== params.funcao.toLowerCase().slice(0, 2)) return undefined;
    return resolveCommissionPay({ ...params, funcao: code, competencia });
}
