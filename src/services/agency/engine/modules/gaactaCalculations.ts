/**
 * Calculo da Gratificacao por Atuacao de Alta Complexidade, Tecnica e Administrativa (GAACTA)
 * Regulamentada pela Resolucao STM nº 397, de 19 de junho de 2026.
 * 
 * Principais regras:
 * - Privativa de servidores ocupantes de cargo em comissao (CJ-1, CJ-2, CJ-3 e CJ-4)
 * - Percentual aplicado sobre a remuneracao, conforme regra versionada do órgão
 * - Natureza indenizatoria (isencao total de PSS/Previdencia e IRPF)
 * - Incompativel com servico extraordinario (salvo no recesso judiciario)
 */

import { CourtConfig } from '../../../../types';
import { IAgencyCalculationParams } from '../types';
import { getDataForPeriod, normalizeAQPercent } from './baseCalculations';
import { getPayrollRules, isNoFunction } from './configRules';

export interface IGaactaResult {
    baseCalculo: number;
    percentual: number;
    valor: number;
    isElegivel: boolean;
}

export const resolveGaactaRule = (config: CourtConfig | undefined, competence: string) => {
    if (!config?.gaactaRules?.enabled || !/^\d{4}-(0[1-9]|1[0-2])$/.test(competence)) return null;
    const versions = config.gaactaRules.versions;
    if (!Array.isArray(versions)) return null;
    const matches = versions.filter(version => version && typeof version === 'object' &&
        /^\d{4}-(0[1-9]|1[0-2])$/.test(version.validFrom) &&
        (version.validTo == null || /^\d{4}-(0[1-9]|1[0-2])$/.test(version.validTo)) &&
        version.validFrom <= competence && (version.validTo == null || competence < version.validTo) &&
        Number.isFinite(version.percentage) && version.percentage > 0 && version.percentage <= 1 &&
        typeof version.reference === 'string' && version.reference.trim().length > 0
    );
    return matches.length === 1 ? matches[0] : null;
};

const requireAgencyConfig = (params: IAgencyCalculationParams): CourtConfig => {
    if (!params.agencyConfig) {
        throw new Error('agencyConfig is required for JMU calculations.');
    }
    return params.agencyConfig;
};

export async function calculateGaacta(params: IAgencyCalculationParams): Promise<IGaactaResult> {
    const funcaoStr = (params.funcao || '').toLowerCase();
    const isElegivel = funcaoStr.startsWith('cj');

    // Se nao for elegivel (nao for CJ), nao faz jus a GAACTA conf. arts. 2º e 3º
    if (!isElegivel) {
        return {
            baseCalculo: 0,
            percentual: 0,
            valor: 0,
            isElegivel: false
        };
    }

    if (!params.gaactaAtivo) {
        return {
            baseCalculo: 0,
            percentual: 0,
            valor: 0,
            isElegivel
        };
    }

    const config = requireAgencyConfig(params);
    const rule = resolveGaactaRule(config, params.competencia || '');
    if (!rule) return { baseCalculo: 0, percentual: 0, valor: 0, isElegivel };
    const percentual = rule.percentage;

    // Se o usuario travou uma base manual
    if (params.gaactaManualBase && Number(params.gaactaBaseManualValor) > 0) {
        const baseManual = Math.max(0, Number(params.gaactaBaseManualValor) || 0);
        const valorManual = Math.round(baseManual * percentual * 100) / 100;
        return {
            baseCalculo: baseManual,
            percentual,
            valor: valorManual,
            isElegivel
        };
    }

    const payrollRules = getPayrollRules(config);
    const { salario, funcoes, valorVR } = await getDataForPeriod(params.periodo, config);

    // 1. Vencimento e GAJ
    const baseVencimento = salario[params.cargo]?.[params.padrao] || 0;
    const gaj = baseVencimento * payrollRules.gajRate;

    // 2. Parcela de Funcao / CJ
    const funcaoValor = isNoFunction(params.funcao, config) ? 0 : (funcoes[params.funcao] || 0);

    // 3. Adicional de Qualificacao (AQ)
    let aqTituloVal = 0;
    let aqTreinoVal = 0;
    if (params.periodo >= 1) {
        aqTituloVal = valorVR * (params.aqTituloVR || 0);
        aqTreinoVal = valorVR * (params.aqTreinoVR || 0);
    } else {
        aqTituloVal = baseVencimento * normalizeAQPercent(params.aqTituloPerc);
        aqTreinoVal = baseVencimento * normalizeAQPercent(params.aqTreinoPerc);
    }

    // 4. Gratificacao especifica (GAE/GAS)
    let gratVal = 0;
    if (params.gratEspecificaTipo === 'gae' || params.gratEspecificaTipo === 'gas') {
        gratVal = baseVencimento * payrollRules.specificGratificationRate;
    }

    // 5. Composicao da Base com base nos checkboxes
    let base = 0;

    if (params.gaactaIncideVencimento !== false) {
        base += baseVencimento;
    }
    if (params.gaactaIncideGAJ !== false) {
        base += gaj;
    }
    if (params.gaactaIncideFuncao !== false) {
        base += funcaoValor;
    }
    if (params.gaactaIncideAQTitulo !== false) {
        base += aqTituloVal;
    }
    if (params.gaactaIncideAQTreino !== false) {
        base += aqTreinoVal;
    }
    // Rubricas Manuais Dinâmicas (Créditos selecionados)
    if (Array.isArray(params.rubricasExtras)) {
        for (const rubrica of params.rubricasExtras) {
            if (rubrica.tipo === 'C') {
                const isChecked = params.gaactaRubricasInclusas
                    ? params.gaactaRubricasInclusas[rubrica.id] !== false
                    : true;
                if (isChecked) {
                    base += Number(rubrica.valor) || 0;
                }
            }
        }
    }
    if (params.gaactaIncideGrat === true && (params.gratEspecificaTipo === 'gae' || params.gratEspecificaTipo === 'gas')) {
        base += gratVal;
    }
    // Abono de Permanencia so incide se o servidor efetivamente receber abono (modulo ativo)
    if (params.gaactaIncideAbono !== false && params.recebeAbono) {
        const abonoVal = Number(params.abonoPermanencia) || 0;
        base += abonoVal;
    }
    if (Number(params.gaactaOutrasParcelas) > 0) {
        base += Number(params.gaactaOutrasParcelas);
    }

    const baseFinal = Math.max(0, Math.round(base * 100) / 100);
    const valor = Math.max(0, Math.round(baseFinal * percentual * 100) / 100);

    return {
        baseCalculo: baseFinal,
        percentual,
        valor,
        isElegivel
    };
}
