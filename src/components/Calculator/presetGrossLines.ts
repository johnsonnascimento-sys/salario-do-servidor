import { CalculatorState, CourtConfig } from '../../types';
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
            const funpresp13 = roundCurrency(Math.max(0, state.valFunpresp13 || 0));
            const totalDescontos13 = roundCurrency(ir13 + pss13 + funpresp13);
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
                { label: 'Desconto Funpresp (Total 13º salário)', value: funpresp13, isDiscount: true },
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
            const entries = state.overtimeCalculatedEntries ?? [];
            const entry = instance.overtimeEntryId ? entries.find(item => item.id === instance.overtimeEntryId) : entries[0];
            if (!entry) return [];
            const he50Bruto = entry.heVal50;
            const he100Bruto = entry.heVal100;
            const heTotalBruto = entry.heTotal;
            const orgSlug = (courtConfig?.orgSlug || '').toLowerCase();
            const isJMU = orgSlug === 'jmu' || orgSlug === 'stm';
            const defaultDivisor = courtConfig?.payrollRules?.overtimeMonthHours || (isJMU ? 175 : 200);
            const divisor = entry.divisor && entry.divisor > 0 ? entry.divisor : defaultDivisor;

            const mensalBase = entries.filter(item => !item.isEA && !item.excluirIR).reduce((sum, item) => sum + item.heTotal, 0);
            const heIr = entry.excluirIR ? 0 : entry.isEA
                ? (state.irEaEntryTax?.[`he:${entry.id}`] ?? 0)
                : roundCurrency(mensalBase > 0 ? (state.heIrMensal || 0) * heTotalBruto / mensalBase : 0);
            const isCurrentYearEa = state.irEaCurrentYearKeys?.includes(`he:${entry.id}`);
            const irLabel = entry.isEA
                ? 'Desconto IR-EA (Hora extra)'
                : isCurrentYearEa
                    ? 'Desconto IR mensal (mesmo ano da folha — sem RRA)'
                    : 'Desconto IR (Hora extra)';
            if (Math.abs(roundCurrency(he50Bruto + he100Bruto) - heTotalBruto) > 0.001) {
                return [
                    { label: 'Valor bruto manual/importado', value: heTotalBruto },
                    { label: irLabel, value: heIr, isDiscount: true },
                    { label: 'Total hora extra Líquido', value: roundCurrency(Math.max(0, heTotalBruto - heIr)) },
                ];
            }

            const unitLines: PresetGrossLine[] = [];
            if (entry.valorHoraNormal !== undefined && entry.valorHoraNormal > 0) {
                const vNormal = entry.valorHoraNormal;
                const v50 = entry.valorHora50 || roundCurrency(vNormal * 1.5);
                const v100 = entry.valorHora100 || roundCurrency(vNormal * 2.0);
                unitLines.push(
                    { label: `Valor da Hora Normal (divisor ${divisor})`, value: vNormal },
                    { label: 'Valor unitário da Hora (+50%)', value: v50 },
                    { label: 'Valor unitário da Hora (+100%)', value: v100 }
                );
            }

            const desconto50 = roundCurrency(heTotalBruto > 0 ? heIr * he50Bruto / heTotalBruto : 0);
            return [
                ...unitLines,
                { label: 'Hora extra 50% Bruto', value: he50Bruto },
                { label: 'Hora extra 100% Bruto', value: he100Bruto },
                { label: irLabel, value: heIr, isDiscount: true },
                { label: 'Desconto PSS (Hora extra)', value: 0, isDiscount: true },
                { label: 'Hora extra 50% Líquido', value: roundCurrency(Math.max(0, he50Bruto - desconto50)) },
                { label: 'Hora extra 100% Líquido', value: roundCurrency(Math.max(0, he100Bruto - (heIr - desconto50))) },
                { label: 'Total hora extra Bruto', value: heTotalBruto },
                { label: 'Total hora extra Líquido', value: roundCurrency(Math.max(0, heTotalBruto - heIr)) },
            ];
        }
        case 'substituicao': {
            const entries = state.substitutionCalculatedEntries ?? [];
            const entry = instance.substitutionEntryId ? entries.find(item => item.id === instance.substitutionEntryId) : entries[0];
            if (!entry) return [];
            const mensalBase = entries.filter(item => !item.isEA && !item.excluirIR).reduce((sum, item) => sum + item.total, 0);
            const pssBase = entries.filter(item => item.pssIsEA).reduce((sum, item) => sum + item.total, 0);
            const ir = entry.excluirIR ? 0 : entry.isEA
                ? (state.irEaEntryTax?.[`subst:${entry.id}`] ?? 0)
                : roundCurrency(mensalBase > 0 ? (state.substIrMensal || 0) * entry.total / mensalBase : 0);
            const pss = roundCurrency(entry.pssIsEA && pssBase > 0 ? (state.substPss || 0) * entry.total / pssBase : 0);
            const isCurrentYearEa = state.irEaCurrentYearKeys?.includes(`subst:${entry.id}`);
            const irLabel = entry.isEA
                ? 'Desconto IR-EA (Substituição)'
                : isCurrentYearEa
                    ? 'Desconto IR mensal (mesmo ano da folha — sem RRA)'
                    : 'Desconto IR (Substituição)';
            return [
                { label: 'Total substituição Bruto', value: entry.total },
                { label: irLabel, value: ir, isDiscount: true },
                { label: 'Desconto PSS (Substituição)', value: pss, isDiscount: true },
                { label: 'Total substituição Líquido', value: roundCurrency(Math.max(0, entry.total - ir - pss)) },
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
        case 'indenizacao_transporte': {
            const memory = state.transporteIndenizacaoMemory;
            if (!memory || memory.status === 'unavailable' || memory.status === 'invalid') return [{ label: 'Valor indisponível para esta competência', value: 0, displayValue: '—' }];
            return [
                { label: 'Valor integral de referência', value: memory.fullAmount },
                { label: 'Dias informados', value: memory.days, displayValue: String(memory.days) },
                { label: 'Divisor', value: memory.divisor, displayValue: String(memory.divisor) },
                { label: `Cálculo: valor integral × ${memory.eligibleDays} ÷ ${memory.divisor}`, value: memory.amount },
                { label: 'Valor a receber', value: memory.amount }
            ];
        }
        case 'diarias': {
            const transportWorkdays = Number(courtConfig?.payrollRules?.transportWorkdays || 22);
            const discountRules = resolveDailiesDiscountRules(courtConfig?.dailies, transportWorkdays);
            const manualHolidays = Array.isArray(state.diariasFeriados) ? state.diariasFeriados : null;
            const effectiveHolidays = manualHolidays !== null
                ? manualHolidays
                : (discountRules.holidays || []);
            const periodDiscountRules = {
                ...discountRules,
                excludeWeekendsAndHolidays: true,
                holidays: effectiveHolidays
            };
            const periodSummary = state.diariasModoDesconto === 'periodo'
                ? summarizeDailiesPeriodMode(state.diariasDataInicio, state.diariasDataFim, periodDiscountRules)
                : null;
            const isJmu = Boolean(
                courtConfig?.orgSlug === 'jmu' ||
                courtConfig?.orgSlug === 'stm' ||
                courtConfig?.dailies?.branchId === 'jmu' ||
                courtConfig?.dailies?.branchId === 'stm' ||
                courtConfig?.dailies?.orgSlug === 'jmu' ||
                courtConfig?.dailies?.orgSlug === 'stm' ||
                courtConfig?.dailies?.normativeInfo?.localRuleLabel?.includes('STM') ||
                courtConfig?.dailies?.normativeInfo?.localRuleLabel?.includes('JMU') ||
                courtConfig?.dailies?.normativeInfo?.branchRuleLabel?.includes('STM') ||
                courtConfig?.dailies?.normativeInfo?.branchRuleLabel?.includes('JMU')
            );
            const autoridadeAssistida = isJmu
                ? (state.diariasAutoridadeAssistida === 'juiz_federal' || state.diariasAutoridadeAssistida === 'juiz_militar' ? 'juiz_federal' : 'ministro_stm')
                : (state.diariasAutoridadeAssistida === 'ministro_cjf' || state.diariasAutoridadeAssistida === 'ministro_stm' ? 'ministro_cjf' : state.diariasAutoridadeAssistida === 'juiz_federal' || state.diariasAutoridadeAssistida === 'juiz_militar' ? 'juiz_federal' : 'desembargador_trf');

            const dailyRate = roundCurrency(resolveDailiesDailyRate({
                dailiesConfig: courtConfig?.dailies,
                cargo: state.cargo,
                funcao: state.funcao,
                hasCommissionRole: Boolean(state.funcao && state.funcao.toLowerCase().startsWith('cj')),
                assessoramentoMagistrado: Boolean(state.diariasAssessoramentoMagistrado),
                acompanhamentoIntegral: Boolean(state.diariasAcompanhamentoIntegral),
                autoridadeAssistida,
                equipeTrabalho: Boolean(state.diariasEquipeTrabalho),
                equipeTrabalhoMaiorCargo: state.diariasEquipeTrabalhoMaiorCargo
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
            const embarkationLabel = courtConfig?.dailies?.embarkationLabel?.trim() || 'Adicional de embarque';
            const lines: PresetGrossLine[] = [
                { label: `Diárias sem ${embarkationLabel.toLowerCase()}`, value: diariasSemEmbarque },
                { label: embarkationLabel, value: adicionalEmbarque },
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
        case 'gaacta': {
            return [
                { label: 'Base apurada da GAACTA', value: roundCurrency(state.gaactaBaseCalculo || 0) },
                { label: 'GAACTA (15% indenizatória)', value: roundCurrency(state.gaactaValor || 0) }
            ];
        }
        default:
            return [];
    }
};
