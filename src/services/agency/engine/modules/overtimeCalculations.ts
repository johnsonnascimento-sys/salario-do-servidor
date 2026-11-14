/**
 * Calculos de Hora Extra - JMU
 * 
 * Responsavel por calcular:
 * - Hora Extra 50%
 * - Hora Extra 100%
 * - Total de Hora Extra
 */

import { CourtConfig, OvertimeEntry } from '../../../../types';
import { calculateGaacta } from './gaactaCalculations';
import { calculateMonthlyPensionContext } from './pensionContext';
import { hasPensionCeiling, roundPension } from './pensionCalculations';
import { calculatePss } from '../../../../core/calculations/taxUtils';
import { IAgencyCalculationParams } from '../types';
import { getDataForPeriod, normalizeAQPercent } from './baseCalculations';
import { getPayrollRules, isNoFunction } from './configRules';

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
        usarSubstituicaoFuncao: boolean;
        divisor?: number;
        valorHoraNormal?: number;
        valorHora50?: number;
        valorHora100?: number;
        funcoesSubstituicaoElegiveis?: string[];
        composicaoBase?: Array<{ key: string; label: string; valor: number; selecionado: boolean }>;
        baseRemuneracao?: number;
    }>;
}

const requireAgencyConfig = (params: IAgencyCalculationParams): CourtConfig => {
    if (!params.agencyConfig) {
        throw new Error('agencyConfig is required for JMU calculations.');
    }
    return params.agencyConfig;
};

const roundCurrency = (value: number) => Math.round(value * 100) / 100;
const sumCurrency = (values: number[]) => values.reduce((cents, value) => cents + Math.round(value * 100), 0) / 100;

/**
 * Calcula Hora Extra (50% e 100%)
 */
export async function calculateOvertime(params: IAgencyCalculationParams): Promise<OvertimeResult> {
    const config = requireAgencyConfig(params);
    const payrollRules = getPayrollRules(config);
    const { salario, funcoes, valorVR } = await getDataForPeriod(params.periodo, config);
    const baseVencimento = salario[params.cargo]?.[params.padrao] || 0;
    const gaj = baseVencimento * payrollRules.gajRate;

    let aqTituloVal = 0;
    let aqTreinoVal = 0;
    if (params.periodo >= 1) {
        aqTituloVal = valorVR * params.aqTituloVR;
        aqTreinoVal = valorVR * params.aqTreinoVR;
    } else {
        aqTituloVal = baseVencimento * normalizeAQPercent(params.aqTituloPerc);
        aqTreinoVal = baseVencimento * normalizeAQPercent(params.aqTreinoPerc);
    }

    let gratVal = 0;
    if (params.gratEspecificaTipo === 'gae' || params.gratEspecificaTipo === 'gas') {
        gratVal = baseVencimento * payrollRules.specificGratificationRate;
    }

    // Mantém o mesmo limite do card de Substituição: o valor do destino
    // precisa superar a função atual acrescida da gratificação específica.
    const baseAbatimentoSubstituicao =
        (isNoFunction(params.funcao, config) ? 0 : (funcoes[params.funcao] || 0)) + gratVal;
    const funcoesSubstituicaoElegiveis = Object.keys(funcoes).filter(key =>
        !isNoFunction(key, config) && funcoes[key] > baseAbatimentoSubstituicao
    );

    // Calculado pelas entradas atuais, sem consumir resultados de uma renderização anterior.
    let abonoMensal = 0;
    const pssTable = config.historico_pss?.[params.tabelaPSS];
    if (params.recebeAbono && pssTable) {
        const context = await calculateMonthlyPensionContext(params);
        abonoMensal = hasPensionCeiling(params.regimePrev)
            ? roundPension(calculatePss(Math.min(context.baseRppsIntegral, pssTable.teto_rgps), pssTable))
            : calculatePss(context.baseRppsIntegral, pssTable);
    }
    const gaacta = await calculateGaacta({ ...params, abonoPermanencia: abonoMensal });
    const buildBase = (funcKey: string, entry?: OvertimeEntry) => {
        const item = (key: string, label: string, valor: number, padrao = true) => ({
            key, label, valor: Number.isFinite(valor) ? Math.max(0, valor) : 0,
            selecionado: entry?.composicaoBase?.[key] ?? padrao
        });
        const items = [
            item('vencimento', 'Vencimento Básico', baseVencimento),
            item('gaj', 'GAJ', gaj),
            item('funcao', 'Função / Cargo em Comissão (FC/CJ)', isNoFunction(funcKey, config) ? 0 : (funcoes[funcKey] || 0)),
            item('aqTitulo', 'AQ Títulos', aqTituloVal),
            item('aqTreino', 'AQ Treinamento', aqTreinoVal),
            item('grat', 'GAE / GAS', gratVal),
            item('ats', 'ATS', params.ats || 0),
            item('abono', 'Abono de Permanência', abonoMensal),
            item('gaacta', 'GAACTA', gaacta.valor, false),
            ...(params.rubricasExtras || []).filter(r => r.tipo === 'C').map((r, index) =>
                item(`rubrica:${r.id}`, r.descricao?.trim() || `Crédito Dinâmico #${index + 1}`, Number(r.valor) || 0, false))
        ];
        return { items, total: items.reduce((sum, part) => sum + (part.selecionado ? part.valor : 0), 0) };
    };
    const calcHEForFunction = (funcKey: string, q50: number, q100: number, divisor: number, entry?: OvertimeEntry) => {
        const base = buildBase(funcKey, entry);
        const paramValorHora = divisor > 0 ? base.total / divisor : 0;
        return {
            base,
            v50: paramValorHora * 1.5 * q50,
            v100: paramValorHora * 2.0 * q100,
            valorHora: paramValorHora
        };
    };

    const overtimeEntries = params.overtimeEntries || [];
    const orgSlug = (config.orgSlug || '').toLowerCase();
    const isJMU = orgSlug === 'jmu' || orgSlug === 'stm';
    const fallbackDivisor = payrollRules.overtimeMonthHours > 0 ? payrollRules.overtimeMonthHours : (isJMU ? 175 : 200);

    if (overtimeEntries.length > 0) {
        const entries = overtimeEntries.map((entry, index) => {
            let heVal50 = 0;
            let heVal100 = 0;

            const entryDivisor = entry.divisor && entry.divisor > 0 ? Number(entry.divisor) : fallbackDivisor;

            const qtd50Global = Math.max(0, Number(entry.qtd50 || 0));
            const qtd100Global = Math.max(0, Number(entry.qtd100 || 0));
            
            // Calcula as horas inseridas no escopo "global" do card usando a função titular
            if (!entry.usarSubstituicaoFuncao && (qtd50Global > 0 || qtd100Global > 0)) {
                const res = calcHEForFunction(params.funcao, qtd50Global, qtd100Global, entryDivisor, entry);
                heVal50 += res.v50;
                heVal100 += res.v100;
            }

            // Se houver grid de horas por função, calcula dinamicamente para cada uma
            if (entry.usarSubstituicaoFuncao && entry.horasPorFuncao) {
                for (const [funcKey, horas] of Object.entries(entry.horasPorFuncao)) {
                    if (!funcoesSubstituicaoElegiveis.includes(funcKey)) continue;
                    const h50 = Math.max(0, Number(horas.qtd50 || 0));
                    const h100 = Math.max(0, Number(horas.qtd100 || 0));
                    if (h50 > 0 || h100 > 0) {
                        const res = calcHEForFunction(funcKey, h50, h100, entryDivisor, entry);
                        heVal50 += res.v50;
                        heVal100 += res.v100;
                    }
                }
            }

            heVal50 = roundCurrency(heVal50);
            heVal100 = roundCurrency(heVal100);
            let heTotal = sumCurrency([heVal50, heVal100]);
            if (entry.valorBrutoManual !== undefined && !entry.usarSubstituicaoFuncao) {
                if (!Number.isFinite(entry.valorBrutoManual) || entry.valorBrutoManual < 0) {
                    throw new Error('IR-EA: valor bruto manual de hora extra inválido.');
                }
                heTotal = roundCurrency(entry.valorBrutoManual);
                // An explicitly supplied gross has no inferred 50%/100% split.
                heVal50 = 0;
                heVal100 = 0;
            }

            const unitRes = calcHEForFunction(params.funcao, 1, 0, entryDivisor, entry);
            const valorHoraNormal = roundCurrency(unitRes.valorHora);
            const valorHora50 = roundCurrency(valorHoraNormal * 1.5);
            const valorHora100 = roundCurrency(valorHoraNormal * 2.0);

            return {
                id: entry.id || `he-${index}`,
                heVal50,
                heVal100,
                heTotal,
                isEA: Boolean(entry.isEA),
                excluirIR: Boolean(entry.excluirIR),
                usarSubstituicaoFuncao: Boolean(entry.usarSubstituicaoFuncao),
                divisor: entryDivisor,
                valorHoraNormal,
                valorHora50,
                valorHora100,
                funcoesSubstituicaoElegiveis,
                composicaoBase: unitRes.base.items,
                baseRemuneracao: unitRes.base.total
            };
        });

        const heVal50 = sumCurrency(entries.map(item => item.heVal50));
        const heVal100 = sumCurrency(entries.map(item => item.heVal100));
        const heTotal = sumCurrency(entries.map(item => item.heTotal));

        return { heVal50, heVal100, heTotal, entries };
    }

    // Calcula valor para o bloco legacy-he usando sua funcao titular
    const legacyDivisor = fallbackDivisor;
    const legacyHE = calcHEForFunction(params.funcao, params.heQtd50 || 0, params.heQtd100 || 0, legacyDivisor);
    const heVal50 = roundCurrency(legacyHE.v50);
    const heVal100 = roundCurrency(legacyHE.v100);
    const heTotal = sumCurrency([heVal50, heVal100]);
    const valorHoraNormal = roundCurrency(legacyHE.valorHora);

    return {
        heVal50,
        heVal100,
        heTotal,
        entries: [
            {
                id: 'legacy-he',
                heVal50,
                heVal100,
                heTotal,
                isEA: Boolean(params.heIsEA),
                excluirIR: Boolean(params.heExcluirIR),
                usarSubstituicaoFuncao: false,
                divisor: legacyDivisor,
                valorHoraNormal,
                valorHora50: roundCurrency(valorHoraNormal * 1.5),
                valorHora100: roundCurrency(valorHoraNormal * 2.0)
            }
        ]
    };
}
