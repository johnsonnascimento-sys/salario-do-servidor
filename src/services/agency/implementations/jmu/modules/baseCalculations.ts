/**
 * Cálculos de Base Salarial - JMU
 * 
 * Responsável por calcular:
 * - Vencimento base
 * - GAJ (Gratificação de Atividade Judiciária)
 * - Função Comissionada
 * - AQ (Adicional de Qualificação) - Sistema antigo e novo
 * - Gratificações Específicas (GAE/GAS)
 * - VPNI e ATS
 * 
 * REFATORADO: Agora usa ConfigService para buscar dados do banco
 * ao invés de valores hardcoded.
 */

import { configService, type EffectiveConfig } from '../../../../config';
import { calcReajuste } from '../../../../../utils/calculations';
import { IJmuCalculationParams } from '../types';

/**
 * Obtém dados ajustados para o período (bases salariais e VR)
 * Busca do banco de dados via ConfigService
 */
export async function getDataForPeriod(periodo: number, orgSlug: string = 'jmu') {
    // Buscar configuração efetiva do banco
    // Buscar configuração efetiva do banco
    const config = await configService.getEffectiveConfig(orgSlug);

    const steps = periodo >= 2 ? periodo - 1 : 0;

    // Deep copy and adjust bases from config
    const sal = JSON.parse(JSON.stringify(config.salary_bases?.analista || {}));
    const salTecnico = JSON.parse(JSON.stringify(config.salary_bases?.tecnico || {}));

    // Aplicar reajustes
    const salario: any = { analista: {}, tecnico: {} };
    for (let padrao in sal) {
        salario.analista[padrao] = calcReajuste(sal[padrao], steps);
    }
    for (let padrao in salTecnico) {
        salario.tecnico[padrao] = calcReajuste(salTecnico[padrao], steps);
    }

    const func = JSON.parse(JSON.stringify(config.salary_bases?.funcoes || {}));
    const funcoes: any = {};
    for (let key in func) {
        funcoes[key] = calcReajuste(func[key], steps);
    }

    // CJ1 base do banco
    const cj1Base = config.cj1_integral_base || 0;
    const cj1Adjusted = calcReajuste(cj1Base, steps);
    const valorVR = Math.round(cj1Adjusted * 0.065 * 100) / 100;

    return { salario, funcoes, valorVR };
}

/**
 * Calcula a remuneração base total
 */
export async function calculateBase(params: IJmuCalculationParams): Promise<number> {
    const { salario, funcoes, valorVR } = await getDataForPeriod(params.periodo, params.orgSlug);

    const baseVencimento = salario[params.cargo]?.[params.padrao] || 0;
    const gaj = baseVencimento * 1.40; // JMU Rule: GAJ is 140%
    const funcaoValor = params.funcao === '0' ? 0 : (funcoes[params.funcao] || 0);

    // AQ - Adicional de Qualificação (Lei 15.292/2025)
    let aqTituloVal = 0;
    let aqTreinoVal = 0;

    if (params.periodo >= 1) {
        // Novo AQ: VR × Multiplicador
        // VALIDAÇÃO: Detectar valores incorretos (cache antigo)
        if (params.aqTituloVR > 10 || params.aqTreinoVR > 10) {
            console.error('⚠️ ERRO: Multiplicadores AQ incorretos!', {
                aqTituloVR: params.aqTituloVR,
                aqTreinoVR: params.aqTreinoVR,
                valorVR,
                periodo: params.periodo
            });
            console.warn('🔄 Possível cache antigo detectado. Por favor, atualize a página e selecione novamente os valores de AQ.');
        }

        aqTituloVal = valorVR * params.aqTituloVR;
        aqTreinoVal = valorVR * params.aqTreinoVR;
    } else {
        // Antigo AQ: Percentual direto do vencimento
        aqTituloVal = baseVencimento * params.aqTituloPerc;
        aqTreinoVal = baseVencimento * params.aqTreinoPerc;
    }

    // Gratificação Específica
    let gratVal = 0;
    if (params.gratEspecificaTipo === 'gae' || params.gratEspecificaTipo === 'gas') {
        gratVal = baseVencimento * 0.35; // JMU Rule: 35%
    } else {
        gratVal = params.gratEspecificaValor || 0;
    }

    // VPNI + ATS
    const extras = (params.vpni_lei || 0) + (params.vpni_decisao || 0) + (params.ats || 0);

    return baseVencimento + gaj + funcaoValor + aqTituloVal + aqTreinoVal + gratVal + extras;
}

/**
 * Calcula componentes individuais da base para breakdown detalhado
 * IMPORTANTE: Usado para mapear de volta para o React state
 */
export async function calculateBaseComponents(params: IJmuCalculationParams) {
    const { salario, funcoes, valorVR } = await getDataForPeriod(params.periodo, params.orgSlug);

    const baseVencimento = salario[params.cargo]?.[params.padrao] || 0;
    const gaj = baseVencimento * 1.40;
    const funcaoValor = params.funcao === '0' ? 0 : (funcoes[params.funcao] || 0);

    let aqTituloVal = 0;
    let aqTreinoVal = 0;
    if (params.periodo >= 1) {
        // Novo AQ: VR × Multiplicador (Lei 15.292)
        aqTituloVal = valorVR * params.aqTituloVR;
        aqTreinoVal = valorVR * params.aqTreinoVR;
    } else {
        // Antigo AQ: Percentual do vencimento
        aqTituloVal = baseVencimento * params.aqTituloPerc;
        aqTreinoVal = baseVencimento * params.aqTreinoPerc;
    }

    let gratVal = 0;
    if (params.gratEspecificaTipo === 'gae' || params.gratEspecificaTipo === 'gas') {
        gratVal = baseVencimento * 0.35;
    } else {
        gratVal = params.gratEspecificaValor || 0;
    }

    return {
        vencimento: baseVencimento,
        gaj,
        funcaoValor,
        aqTitulo: aqTituloVal,
        aqTreino: aqTreinoVal,
        gratEspecifica: gratVal,
        vpniLei: params.vpni_lei || 0,
        vpniDecisao: params.vpni_decisao || 0,
        ats: params.ats || 0
    };
}
