import { CalculatorState, CourtConfig, OvertimeEntry } from '../../types';
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
            const memory = state.calculationMemory?.thirteenth;
            if (!memory) return [];
            const { first, second } = memory;
            return [
                { label: memory.components.vencimento.second > 0 ? '1ª parcela vencimento já adiantada (informativo)' : '1ª parcela vencimento Bruto', value: first.vencimento },
                { label: memory.components.fc.second > 0 ? '1ª parcela FC/CJ já adiantada (informativo)' : '1ª parcela FC/CJ Bruto', value: first.fc },
                { label: 'Base integral da 2ª parcela - vencimento', value: second.vencimento },
                { label: 'Base integral da 2ª parcela - FC/CJ', value: second.fc },
                { label: 'Abono 13º Bruto', value: second.abono },
                { label: 'Abatimento 1ª parcela', value: second.firstInstallmentDeduction, isDiscount: true },
                { label: 'Desconto IR (13º salário)', value: second.ir, isDiscount: true },
                { label: 'Desconto PSS (13º salário)', value: second.pss, isDiscount: true },
                { label: 'Desconto Funpresp (13º salário)', value: second.funpresp, isDiscount: true },
                { label: 'Total 13º salário Bruto 1ª Parcela', value: first.gross },
                { label: 'Total 13º salário Líquido 1ª Parcela', value: first.net },
                { label: 'Base bruta da 2ª parcela (inclui adiantamento)', value: second.gross },
                { label: 'Total 13º salário Líquido 2ª Parcela', value: second.net },
                { label: 'Total 13º salário nesta folha Bruto', value: memory.payroll.gross },
                { label: 'Total 13º salário nesta folha Líquido', value: memory.payroll.net },
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
            const entries = state.calculationMemory?.substitutions || [];
            const entry = instance.substitutionEntryId
                ? entries.find(item => item.id === instance.substitutionEntryId)
                : entries[0];
            if (!entry) return [];
            return [{ label: 'Total substituição Bruto', value: entry.total }];
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
            const memory = state.calculationMemory?.dailies;
            if (!memory) return [];
            const embarkationLabel = courtConfig?.dailies?.embarkationLabel?.trim() || 'Adicional de embarque';
            return [
                { label: `Diárias sem ${embarkationLabel.toLowerCase()}`, value: roundCurrency(memory.gross - memory.embarkationAdditional) },
                { label: embarkationLabel, value: memory.embarkationAdditional },
                { label: 'Diárias brutas', value: memory.gross },
                { label: 'Corte teto LDO', value: memory.ldoCut, isDiscount: true },
                { label: 'Abatimento benef. externo', value: memory.externalGloss, isDiscount: true },
                { label: 'Desconto aux. alimentação (diária inteira)', value: memory.foodDiscountFull, isDiscount: true },
                { label: 'Desconto aux. alimentação (meia diária)', value: memory.foodDiscountHalf, isDiscount: true },
                { label: 'Desconto aux. transporte (diária inteira)', value: memory.transportDiscountFull, isDiscount: true },
                { label: 'Desconto aux. transporte (meia diária)', value: memory.transportDiscountHalf, isDiscount: true },
                ...(memory.unappliedDeductions > 0 ? [{ label: 'Descontos calculados não aplicados por falta de saldo (informativo)', value: memory.unappliedDeductions }] : []),
                { label: 'Total diárias líquidas', value: memory.net }
            ];
        }
        default:
            return [];
    }
};
