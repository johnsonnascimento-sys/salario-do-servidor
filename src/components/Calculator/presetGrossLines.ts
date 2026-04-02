import { CalculatorState, CourtConfig, OvertimeEntry, SubstitutionEntry } from '../../types';
import {
    resolveDailiesDailyRate,
    resolveDailiesDiscountRules,
    resolveDailiesEmbarkationAdditional,
    summarizeDailiesPeriodMode
} from '../../utils/dailiesRules';
import {
    buildCardTaxSummary,
    PresetGrossLine,
    PresetInstance,
    roundCurrency
} from './dynamicPayrollForm.helpers';

interface BuildPresetGrossLinesParams {
    instance: PresetInstance;
    state: CalculatorState;
    courtConfig: CourtConfig;
    currentTables: {
        valorVR?: number;
        funcoes: Record<string, number>;
    };
    isNovoAQ: boolean;
    noFunctionCode: string;
    currentFunctionValue: number;
    gratificacaoEspecificaCalculada: number;
}

const buildSubstitutionBreakdown = (
    diasMap: Record<string, number>,
    payrollRules: CourtConfig['payrollRules'],
    currentTables: BuildPresetGrossLinesParams['currentTables'],
    currentFunctionValue: number,
    gratificacaoEspecificaCalculada: number
) => {
    const divisor = payrollRules?.monthDayDivisor ?? 30;
    const baseAbatimento = currentFunctionValue + gratificacaoEspecificaCalculada;

    const linhas = Object.entries(diasMap || {})
        .filter(([, days]) => Number(days) > 0)
        .map(([funcKey, days]) => {
            const destino = currentTables.funcoes[funcKey] || 0;
            const bruto = destino > baseAbatimento
                ? roundCurrency(((destino - baseAbatimento) / divisor) * Number(days))
                : 0;

            return {
                key: funcKey,
                days: Number(days),
                value: bruto
            };
        })
        .filter((linha) => linha.value > 0);

    return {
        linhas,
        total: roundCurrency(linhas.reduce((acc, linha) => acc + linha.value, 0))
    };
};

export const buildPresetGrossLines = ({
    instance,
    state,
    courtConfig,
    currentTables,
    isNovoAQ,
    noFunctionCode,
    currentFunctionValue,
    gratificacaoEspecificaCalculada
}: BuildPresetGrossLinesParams): PresetGrossLine[] => {
    switch (instance.presetId) {
        case 'aq': {
            const tituloLabel = isNovoAQ ? 'AQ Títulos (Lei 15.292)' : 'AQ Títulos';
            const treinoLabel = isNovoAQ ? 'AQ Treinamento (Lei 15.292)' : 'AQ Treinamento';
            const lines = buildCardTaxSummary(
                [
                    { label: tituloLabel, value: state.aqTituloValor || 0 },
                    { label: treinoLabel, value: state.aqTreinoValor || 0 }
                ],
                'Total AQ',
                state.aqIr || 0,
                state.aqPss || 0
            );
            return isNovoAQ
                ? [{ label: 'Valor de referência (VR)', value: roundCurrency(currentTables.valorVR || 0) }, ...lines]
                : lines;
        }
        case 'gratificacao':
            return buildCardTaxSummary(
                [{ label: 'Gratificação específica', value: gratificacaoEspecificaCalculada }],
                'Gratificação específica',
                state.gratIr || 0,
                state.gratPss || 0
            );
        case 'vantagens':
            return buildCardTaxSummary(
                [
                    { label: 'VPNI (Lei)', value: state.vpni_lei || 0 },
                    { label: 'VPNI (Decisão)', value: state.vpni_decisao || 0 },
                    { label: 'ATS', value: state.ats || 0 }
                ],
                'Total vantagens',
                state.vantagensIr || 0,
                state.vantagensPss || 0
            );
        case 'abono':
            return buildCardTaxSummary(
                [{ label: 'Abono de permanência', value: state.abonoPermanencia || 0 }],
                'Abono de permanência',
                state.abonoIr || 0,
                0
            );
        case 'ferias':
            return buildCardTaxSummary(
                [{ label: 'Adicional 1/3 férias', value: state.ferias1_3 || 0 }],
                'Adicional 1/3 férias',
                state.irFerias || 0,
                0
            );
        case 'decimo': {
            const primeira13VencBruto = roundCurrency(state.adiant13Venc || 0);
            const primeira13FcBruto = roundCurrency(state.adiant13FC || 0);
            const segunda13VencBruto = roundCurrency(state.segunda13Venc || 0);
            const segunda13FcBruto = roundCurrency(state.segunda13FC || 0);
            const abono13Bruto = roundCurrency(state.abonoPerm13 || 0);
            const ir13 = roundCurrency(Math.max(0, state.ir13 || 0));
            const pss13 = roundCurrency(Math.max(0, state.pss13 || 0));
            const totalDescontos13 = roundCurrency(ir13 + pss13);
            const baseSegundaParcela = roundCurrency(segunda13VencBruto + segunda13FcBruto);
            const proporcaoSegundaVenc = baseSegundaParcela > 0 ? segunda13VencBruto / baseSegundaParcela : 0;
            const descontoSegundaVenc = roundCurrency(totalDescontos13 * proporcaoSegundaVenc);
            const descontoSegundaFc = roundCurrency(Math.max(0, totalDescontos13 - descontoSegundaVenc));
            const primeira13VencLiquido = primeira13VencBruto;
            const primeira13FcLiquido = primeira13FcBruto;
            const segunda13VencLiquido = roundCurrency(Math.max(0, segunda13VencBruto - descontoSegundaVenc));
            const segunda13FcLiquido = roundCurrency(Math.max(0, segunda13FcBruto - descontoSegundaFc));
            const abono13Liquido = abono13Bruto;
            const totalPrimeiraParcelaBruto = roundCurrency(primeira13VencBruto + primeira13FcBruto);
            const totalPrimeiraParcelaLiquido = roundCurrency(primeira13VencLiquido + primeira13FcLiquido);
            const totalSegundaParcelaBruto = roundCurrency(segunda13VencBruto + segunda13FcBruto);
            const totalSegundaParcelaLiquido = roundCurrency(segunda13VencLiquido + segunda13FcLiquido);
            const total13Bruto = roundCurrency(
                primeira13VencBruto + primeira13FcBruto + segunda13VencBruto + segunda13FcBruto + abono13Bruto
            );
            const total13Liquido = roundCurrency(
                primeira13VencLiquido + primeira13FcLiquido + segunda13VencLiquido + segunda13FcLiquido + abono13Liquido
            );

            return [
                { label: '1ª parcela vencimento Bruto', value: primeira13VencBruto },
                { label: '1ª parcela FC/CJ Bruto', value: primeira13FcBruto },
                { label: '2ª parcela vencimento Bruto', value: segunda13VencBruto },
                { label: '2ª parcela FC/CJ Bruto', value: segunda13FcBruto },
                { label: 'Abono 13º Bruto', value: abono13Bruto },
                { label: 'Desconto IR (Total 13º salário)', value: ir13, isDiscount: true },
                { label: 'Desconto PSS (Total 13º salário)', value: pss13, isDiscount: true },
                { label: '1ª parcela vencimento Líquido', value: primeira13VencLiquido },
                { label: '1ª parcela FC/CJ Líquido', value: primeira13FcLiquido },
                { label: '2ª parcela vencimento Líquido', value: segunda13VencLiquido },
                { label: '2ª parcela FC/CJ Líquido', value: segunda13FcLiquido },
                { label: 'Abono 13º Líquido', value: abono13Liquido },
                { label: 'Total 13º salário Bruto', value: total13Bruto },
                { label: 'Total 13º salário Líquido', value: total13Liquido },
                { label: 'Total 13º salário Bruto 1ª Parcela', value: totalPrimeiraParcelaBruto },
                { label: 'Total 13º salário Líquido 1ª Parcela', value: totalPrimeiraParcelaLiquido },
                { label: 'Total 13º salário Bruto 2ª Parcela', value: totalSegundaParcelaBruto },
                { label: 'Total 13º salário Líquido 2ª Parcela', value: totalSegundaParcelaLiquido }
            ];
        }
        case 'hora_extra': {
            const entry = instance.overtimeEntryId
                ? state.overtimeEntries.find(item => item.id === instance.overtimeEntryId)
                : state.overtimeEntries[0];
            const fallbackEntry: OvertimeEntry = {
                id: 'legacy-he',
                qtd50: state.heQtd50 || 0,
                qtd100: state.heQtd100 || 0,
                isEA: state.heIsEA,
                excluirIR: state.heExcluirIR,
                usarSubstituicaoFuncao: false
            };
            const overtimeEntry = entry || fallbackEntry;
            const overtimeBaseEntries = state.overtimeEntries.length > 0 ? state.overtimeEntries : [fallbackEntry];
            const overtimeDivisor = courtConfig.payrollRules?.overtimeMonthHours || 175;
            const baseOvertime = state.vencimento + state.gaj + state.aqTituloValor + state.aqTreinoValor +
                state.gratEspecificaValor + state.vpni_lei + state.vpni_decisao + state.ats + state.abonoPermanencia;
            const resolveFuncValue = (funcKey?: string) => {
                if (!funcKey || funcKey === noFunctionCode) return 0;
                return currentTables.funcoes[funcKey] || 0;
            };
            const calcSegment = (funcKey: string | undefined, qtd50: number, qtd100: number) => {
                const valorHora = overtimeDivisor > 0 ? (baseOvertime + resolveFuncValue(funcKey)) / overtimeDivisor : 0;
                return {
                    he50: valorHora * 1.5 * Math.max(0, qtd50 || 0),
                    he100: valorHora * 2.0 * Math.max(0, qtd100 || 0)
                };
            };
            const calcEntryTotals = (item: OvertimeEntry) => {
                const titular = calcSegment(state.funcao, item.qtd50 || 0, item.qtd100 || 0);
                let he50 = titular.he50;
                let he100 = titular.he100;

                if (item.usarSubstituicaoFuncao && item.horasPorFuncao) {
                    Object.entries(item.horasPorFuncao).forEach(([funcKey, horas]) => {
                        const segmento = calcSegment(funcKey, horas?.qtd50 || 0, horas?.qtd100 || 0);
                        he50 += segmento.he50;
                        he100 += segmento.he100;
                    });
                }

                return { he50, he100, total: he50 + he100 };
            };

            const currentHe = calcEntryTotals(overtimeEntry);
            const he50Bruto = roundCurrency(currentHe.he50);
            const he100Bruto = roundCurrency(currentHe.he100);
            const heTotalBruto = roundCurrency(he50Bruto + he100Bruto);
            const mensalBaseTotal = overtimeBaseEntries
                .filter(item => !item.isEA && !item.excluirIR)
                .reduce((acc, item) => acc + calcEntryTotals(item).total, 0);
            const eaBaseTotal = overtimeBaseEntries
                .filter(item => item.isEA && !item.excluirIR)
                .reduce((acc, item) => acc + calcEntryTotals(item).total, 0);
            const heIrMensalTotal = Math.max(0, state.heIrMensal || 0);
            const heIrEATotal = Math.max(0, state.heIrEA || 0);

            let heIr = 0;
            if (!overtimeEntry.excluirIR && !overtimeEntry.isEA && mensalBaseTotal > 0) {
                heIr += heIrMensalTotal * (heTotalBruto / mensalBaseTotal);
            }
            if (!overtimeEntry.excluirIR && overtimeEntry.isEA && eaBaseTotal > 0) {
                heIr += heIrEATotal * (heTotalBruto / eaBaseTotal);
            }
            heIr = roundCurrency(Math.min(Math.max(0, heIr), heTotalBruto));

            const hePss = 0;
            const heTotalDescontos = roundCurrency(heIr + hePss);
            const proporcaoHe50 = heTotalBruto > 0 ? he50Bruto / heTotalBruto : 0;
            const descontoHe50 = roundCurrency(heTotalDescontos * proporcaoHe50);
            const descontoHe100 = roundCurrency(Math.max(0, heTotalDescontos - descontoHe50));
            const he50Liquido = roundCurrency(Math.max(0, he50Bruto - descontoHe50));
            const he100Liquido = roundCurrency(Math.max(0, he100Bruto - descontoHe100));
            const heTotalLiquido = roundCurrency(Math.max(0, heTotalBruto - heTotalDescontos));
            const irLabel = overtimeEntry.isEA ? 'Desconto IR-EA (Hora extra)' : 'Desconto IR (Hora extra)';

            return [
                { label: 'Hora extra 50% Bruto', value: he50Bruto },
                { label: 'Hora extra 100% Bruto', value: he100Bruto },
                { label: irLabel, value: heIr, isDiscount: true },
                { label: 'Desconto PSS (Hora extra)', value: hePss, isDiscount: true },
                { label: 'Hora extra 50% Líquido', value: he50Liquido },
                { label: 'Hora extra 100% Líquido', value: he100Liquido },
                { label: 'Total hora extra Bruto', value: heTotalBruto },
                { label: 'Total hora extra Líquido', value: heTotalLiquido }
            ];
        }
        case 'substituicao': {
            const substitutionEntry = instance.substitutionEntryId
                ? state.substitutionEntries.find(item => item.id === instance.substitutionEntryId)
                : state.substitutionEntries[0];
            const fallbackEntry: SubstitutionEntry = {
                id: 'legacy-subst',
                dias: { ...(state.substDias || {}) },
                isEA: state.substIsEA,
                excluirIR: false,
                pssIsEA: state.substPssIsEA
            };
            const currentEntry = substitutionEntry || fallbackEntry;
            const substitutionEntries = state.substitutionEntries.length > 0 ? state.substitutionEntries : [fallbackEntry];

            const substitutionBreakdown = buildSubstitutionBreakdown(
                currentEntry.dias || {},
                courtConfig.payrollRules,
                currentTables,
                currentFunctionValue,
                gratificacaoEspecificaCalculada
            );
            const substTotalBruto = roundCurrency(substitutionBreakdown.total);
            const sumBreakdownTotal = (entry: SubstitutionEntry) => buildSubstitutionBreakdown(
                entry.dias || {},
                courtConfig.payrollRules,
                currentTables,
                currentFunctionValue,
                gratificacaoEspecificaCalculada
            ).total;
            const mensalBaseTotal = substitutionEntries
                .filter(item => !item.isEA && !item.excluirIR)
                .reduce((acc, item) => acc + sumBreakdownTotal(item), 0);
            const eaBaseTotal = substitutionEntries
                .filter(item => item.isEA && !item.excluirIR)
                .reduce((acc, item) => acc + sumBreakdownTotal(item), 0);
            const pssEaBaseTotal = substitutionEntries
                .filter(item => item.pssIsEA)
                .reduce((acc, item) => acc + sumBreakdownTotal(item), 0);

            let substIr = 0;
            if (!currentEntry.excluirIR && currentEntry.isEA && eaBaseTotal > 0) {
                substIr = (state.substIrEA || 0) * (substTotalBruto / eaBaseTotal);
            } else if (!currentEntry.excluirIR && !currentEntry.isEA && mensalBaseTotal > 0) {
                substIr = (state.substIrMensal || 0) * (substTotalBruto / mensalBaseTotal);
            }
            let substPss = 0;
            if (currentEntry.pssIsEA && pssEaBaseTotal > 0) {
                substPss = (state.substPss || 0) * (substTotalBruto / pssEaBaseTotal);
            }
            substIr = roundCurrency(Math.max(0, substIr));
            substPss = roundCurrency(Math.max(0, substPss));
            const substTotalCap = roundCurrency(Math.min(substTotalBruto, substIr + substPss));
            if (substIr + substPss > substTotalCap && substIr > 0) {
                substIr = roundCurrency(Math.max(0, substTotalCap - substPss));
            }
            const substTotalDescontos = roundCurrency(substIr + substPss);
            let descontoSubstAcumulado = 0;

            const porFuncaoBruto = substitutionBreakdown.linhas.map((linha) => ({
                label: `Substituição ${linha.key.toUpperCase()} (${linha.days} dia(s)) Bruto`,
                value: linha.value
            }));
            const porFuncaoLiquido = substitutionBreakdown.linhas.map((linha, index) => {
                const isLast = index === substitutionBreakdown.linhas.length - 1;
                const proporcao = substTotalBruto > 0 ? linha.value / substTotalBruto : 0;
                const desconto = isLast
                    ? roundCurrency(Math.max(0, substTotalDescontos - descontoSubstAcumulado))
                    : roundCurrency(substTotalDescontos * proporcao);
                descontoSubstAcumulado += desconto;
                return {
                    label: `Substituição ${linha.key.toUpperCase()} (${linha.days} dia(s)) Líquido`,
                    value: roundCurrency(Math.max(0, linha.value - desconto))
                };
            });

            return [
                ...porFuncaoBruto,
                {
                    label: currentEntry.isEA ? 'Desconto IR-EA (Substituição)' : 'Desconto IR (Substituição)',
                    value: substIr,
                    isDiscount: true
                },
                { label: 'Desconto PSS (Substituição)', value: substPss, isDiscount: true },
                ...porFuncaoLiquido,
                { label: 'Total substituição Bruto', value: substTotalBruto },
                { label: 'Total substituição Líquido', value: roundCurrency(Math.max(0, substTotalBruto - substTotalDescontos)) }
            ];
        }
        case 'licenca':
            return buildCardTaxSummary(
                [{ label: 'Licença compensatória', value: state.licencaValor || 0 }],
                'Licença compensatória',
                0,
                0
            );
        case 'pre_escolar':
            return buildCardTaxSummary(
                [{ label: 'Auxílio pré-escolar', value: state.auxPreEscolarValor || 0 }],
                'Auxílio pré-escolar',
                0,
                0
            );
        case 'aux_transporte': {
            const transporteBruto = roundCurrency(state.auxTransporteValor || 0);
            const cotaParte = roundCurrency(state.auxTransporteDesc || 0);
            return [
                { label: 'Auxílio-transporte Bruto', value: transporteBruto },
                { label: 'Cota-parte transporte', value: cotaParte, isDiscount: true },
                { label: 'Desconto IR (Auxílio-transporte)', value: 0, isDiscount: true },
                { label: 'Desconto PSS (Auxílio-transporte)', value: 0, isDiscount: true },
                { label: 'Auxílio-transporte Líquido', value: roundCurrency(Math.max(0, transporteBruto - cotaParte)) }
            ];
        }
        case 'diarias': {
            const transportWorkdays = Number(courtConfig?.payrollRules?.transportWorkdays || 22);
            const discountRules = resolveDailiesDiscountRules(courtConfig?.dailies, transportWorkdays);
            const periodDiscountRules = { ...discountRules, excludeWeekendsAndHolidays: true };
            const periodSummary = state.diariasModoDesconto === 'periodo'
                ? summarizeDailiesPeriodMode(state.diariasDataInicio, state.diariasDataFim, periodDiscountRules)
                : null;
            const dailyRate = roundCurrency(resolveDailiesDailyRate({
                dailiesConfig: courtConfig?.dailies,
                cargo: state.cargo,
                hasCommissionRole: Boolean(state.funcao && state.funcao.toLowerCase().startsWith('cj'))
            }));
            const adicionalEmbarque = roundCurrency(resolveDailiesEmbarkationAdditional({
                dailiesConfig: courtConfig?.dailies,
                embarkationType: state.diariasEmbarque
            }));
            const diariasSemEmbarque = roundCurrency(Math.max(0, (state.diariasBruto || 0) - adicionalEmbarque));
            const meiaDiariaRetorno = periodSummary?.halfDailyApplied ? roundCurrency(dailyRate * 0.5) : 0;
            const meioDescAuxAlimRetorno = periodSummary?.halfDiscountApplied && state.diariasDescontarAlimentacao
                ? roundCurrency((state.auxAlimentacao / discountRules.foodDivisor) * 0.5)
                : 0;
            const meioDescAuxTranspRetorno = periodSummary?.halfDiscountApplied && state.diariasDescontarTransporte
                ? roundCurrency((state.auxTransporteValor / discountRules.transportDivisor) * 0.5)
                : 0;
            const totalDescAuxAlim = roundCurrency(state.diariasDescAlim || 0);
            const totalDescAuxTransp = roundCurrency(state.diariasDescTransp || 0);
            const descAuxAlimDiariaInteira = roundCurrency(Math.max(0, totalDescAuxAlim - meioDescAuxAlimRetorno));
            const descAuxTranspDiariaInteira = roundCurrency(Math.max(0, totalDescAuxTransp - meioDescAuxTranspRetorno));
            const lines: PresetGrossLine[] = [
                { label: 'Diárias sem adicional de embarque', value: diariasSemEmbarque },
                { label: 'Adicional de embarque', value: adicionalEmbarque },
                { label: 'Diárias brutas', value: roundCurrency(state.diariasBruto || 0) }
            ];

            if (meiaDiariaRetorno > 0) {
                lines.push({ label: 'Meia diária no retorno', value: meiaDiariaRetorno });
            }

            const ldoEnabled = Boolean(courtConfig?.dailies?.ldoCap?.enabled);
            const ldoLimit = roundCurrency(Number(courtConfig?.dailies?.ldoCap?.perDiemLimit || 0));
            if (ldoEnabled && ldoLimit > 0) {
                lines.push({ label: 'Limite LDO vigente (por diária)', value: ldoLimit });
                lines.push({
                    label: 'Valor enquadrado no limite LDO',
                    value: roundCurrency(Math.max(0, (state.diariasBruto || 0) - (state.diariasCorteLdo || 0)))
                });
            }

            lines.push(
                { label: 'Corte teto LDO', value: roundCurrency(state.diariasCorteLdo || 0), isDiscount: true },
                { label: 'Abatimento benef. externo', value: roundCurrency(state.diariasGlosa || 0), isDiscount: true },
                { label: 'Desconto aux. alimentação (diária inteira)', value: descAuxAlimDiariaInteira, isDiscount: true },
                { label: 'Desconto aux. alimentação (meia diária)', value: meioDescAuxAlimRetorno, isDiscount: true },
                { label: 'Desconto aux. transporte (diária inteira)', value: descAuxTranspDiariaInteira, isDiscount: true },
                { label: 'Desconto aux. transporte (meia diária)', value: meioDescAuxTranspRetorno, isDiscount: true },
                { label: 'Desconto IR (Diárias)', value: 0, isDiscount: true },
                { label: 'Desconto PSS (Diárias)', value: 0, isDiscount: true }
            );
            lines.push({ label: 'Total diárias líquidas', value: roundCurrency(state.diariasValorTotal || 0) });

            return lines;
        }
        default:
            return [];
    }
};
