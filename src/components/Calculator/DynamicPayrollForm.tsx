import React, { useEffect } from 'react';
import { GripVertical, Plus, Settings, Trash2 } from 'lucide-react';
import { CalculatorState, CourtConfig, OvertimeEntry, Rubrica, SubstitutionEntry } from '../../types';
import { formatCurrency, getTablesForPeriod } from '../../utils/calculations';
import { ManualRubricasSection } from './ManualRubricasSection';
import { PresetCardContent } from './PresetCardContent';
import { PresetGrossSummary } from './PresetGrossSummary';
import { useFunprespForm } from './hooks/useFunprespForm';
import { useDynamicPresetInstances } from './hooks/useDynamicPresetInstances';
import { buildPresetGrossLines } from './presetGrossLines';
import { pickBestKeyByReference, toReferenceMonthIndex } from './referenceDateUtils';
import {
    PredefinedRubricId,
    PresetGrossLine,
    PresetInstance,
    PREDEFINED_OPTIONS,
    MULTI_INSTANCE_PRESETS,
    MULTI_INSTANCE_HINT_LABEL,
    toPositiveNumber,
    roundCurrency,
    toPercentLabel,
    toDecimalRateFromPercentInput,
    createUniqueId,
    formatReferenciaMesAno,
    buildCardTaxSummary,
    getPresetPickerLabel
} from './dynamicPayrollForm.helpers';
import {
    resolveDailiesDailyRate,
    resolveDailiesDiscountRules,
    resolveDailiesEmbarkationAdditional,
    summarizeDailiesPeriodMode
} from '../../utils/dailiesRules';

interface DynamicPayrollFormProps {
    state: CalculatorState;
    update: (field: keyof CalculatorState, value: any) => void;
    updateSubstDays: (key: string, days: number) => void;
    courtConfig: CourtConfig;
    addRubrica: (tipo?: Rubrica['tipo']) => void;
    removeRubrica: (id: string) => void;
    updateRubrica: (id: string, field: keyof Rubrica, value: any) => void;
    styles: any;
}

export const DynamicPayrollForm: React.FC<DynamicPayrollFormProps> = ({
    state,
    update,
    updateSubstDays,
    courtConfig,
    addRubrica,
    removeRubrica,
    updateRubrica,
    styles
}) => {
    const currentTables = getTablesForPeriod(state.periodo, courtConfig);
    const payrollRules = courtConfig.payrollRules;
    const careerCatalog = courtConfig.careerCatalog;
    const noFunctionCode = careerCatalog?.noFunctionCode ?? '';
    const noFunctionLabel = careerCatalog?.noFunctionLabel ?? 'Sem função';
    const cargoOptions = Object.keys(currentTables.salario || {});
    const salaryByCargo = currentTables.salario[state.cargo] || {};
    const padroes = Object.keys(salaryByCargo);
    const baseVencimento = salaryByCargo[state.padrao] || 0;
    const gaj = baseVencimento * (payrollRules?.gajRate ?? 0);
    const isNovoAQ = state.periodo >= 1;
    const functionKeys = Object.keys(currentTables.funcoes || {});
    const pssOptions = Object.keys(courtConfig.historico_pss || {});
    const irOptions = Object.keys(courtConfig.historico_ir || {});
    const previdenciaComplementar = courtConfig.previdenciaComplementar;
    const competenciaReferencia = formatReferenciaMesAno(state.mesRef, state.anoRef);
    const {
        showFunprespSection,
        funprespNormalOptions,
        handleRegimePrevChange,
        handleFunprespParticipacaoChange,
        funprespValidationError
    } = useFunprespForm({
        state,
        update,
        previdenciaComplementar
    });
    const {
        enabledPresets,
        availablePresets,
        selectedPreset,
        setSelectedPreset,
        reorderMode,
        setReorderMode,
        draggingPreset,
        includePreset,
        removePreset,
        handlePresetDragStart,
        handlePresetDragOver,
        handlePresetDrop,
        handlePresetDragEnd
    } = useDynamicPresetInstances({
        state,
        update,
        updateSubstDays,
        functionKeys
    });

    const totalCreditos = state.rubricasExtras
        .filter(rubrica => rubrica.tipo === 'C')
        .reduce((total, rubrica) => total + (rubrica.valor || 0), 0);

    const totalDescontos = state.rubricasExtras
        .filter(rubrica => rubrica.tipo === 'D')
        .reduce((total, rubrica) => total + (rubrica.valor || 0), 0);

    const gratificacaoEspecificaCalculada =
        state.gratEspecificaTipo === 'gae' || state.gratEspecificaTipo === 'gas'
            ? baseVencimento * (payrollRules?.specificGratificationRate ?? 0)
            : 0;

    const funcaoAtualValor =
        state.funcao && state.funcao !== noFunctionCode
            ? (currentTables.funcoes[state.funcao] || 0)
            : 0;

    const getSubstitutionBreakdown = (diasMap: Record<string, number>) => {
        const divisor = payrollRules?.monthDayDivisor ?? 30;
        const baseAbatimento = funcaoAtualValor + gratificacaoEspecificaCalculada;

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

        const total = roundCurrency(linhas.reduce((acc, linha) => acc + linha.value, 0));
        return { linhas, total };
    };

    const handleCargoChange = (nextCargo: CalculatorState['cargo']) => {
        const nextPadroes = Object.keys(currentTables.salario[nextCargo] || {});
        const fallbackPadrao = nextPadroes[0] || state.padrao;

        update('cargo', nextCargo);
        update('padrao', fallbackPadrao);
    };

    useEffect(() => {
        if (cargoOptions.length === 0) return;
        if (!state.cargo || !cargoOptions.includes(state.cargo)) {
            update('cargo', cargoOptions[0]);
        }
    }, [cargoOptions, state.cargo, update]);

    useEffect(() => {
        if (padroes.length === 0) return;
        if (!state.padrao || !padroes.includes(state.padrao)) {
            update('padrao', padroes[0]);
        }
    }, [padroes, state.padrao, update]);

    useEffect(() => {
        if (!noFunctionCode) return;
        const validFunctions = new Set([noFunctionCode, ...functionKeys]);
        if (!state.funcao) {
            update('funcao', noFunctionCode);
            return;
        }

        // Evita sobrescrever snapshot restaurado enquanto as funções ainda não carregaram.
        if (functionKeys.length === 0) {
            return;
        }

        if (!validFunctions.has(state.funcao)) {
            const normalizedCurrent = String(state.funcao).trim().toLowerCase();
            const matchedFunction = functionKeys.find(
                key => key.trim().toLowerCase() === normalizedCurrent
            );

            if (matchedFunction) {
                update('funcao', matchedFunction);
                return;
            }

            const sanitizedCurrent = normalizedCurrent.replace(/[^a-z0-9]/g, '');
            const matchedByToken = functionKeys.find(
                key => key.trim().toLowerCase().replace(/[^a-z0-9]/g, '') === sanitizedCurrent
            );

            if (matchedByToken) {
                update('funcao', matchedByToken);
                return;
            }

            // Fallback para snapshots legados em formato de texto/label
            // Ex.: "Funcao Comissionada (Opcao) - FC4" ou "CJ-2"
            const tokenMatch = normalizedCurrent.match(/(fc|cj)\s*[-_ ]?\s*(\d+)/i);
            if (tokenMatch) {
                const token = `${tokenMatch[1]}${tokenMatch[2]}`.toLowerCase();
                const matchedByEmbeddedToken = functionKeys.find((key) => {
                    const normalizedKey = key.trim().toLowerCase();
                    const keyToken = normalizedKey.replace(/[^a-z0-9]/g, '');
                    return normalizedKey.includes(token) || keyToken.includes(token);
                });

                if (matchedByEmbeddedToken) {
                    update('funcao', matchedByEmbeddedToken);
                    return;
                }
            }

            update('funcao', noFunctionCode);
        }
    }, [noFunctionCode, functionKeys, state.funcao, update]);

    useEffect(() => {
        if (pssOptions.length === 0) return;
        const referenceMonth = toReferenceMonthIndex(state.mesRef) || 12;
        const nextTabelaPSS = pickBestKeyByReference(pssOptions, state.anoRef, referenceMonth);
        if (nextTabelaPSS && state.tabelaPSS !== nextTabelaPSS) {
            update('tabelaPSS', nextTabelaPSS);
        }
    }, [pssOptions, state.tabelaPSS, state.anoRef, state.mesRef, update]);

    useEffect(() => {
        if (irOptions.length === 0) return;
        const referenceMonth = toReferenceMonthIndex(state.mesRef) || 12;
        const nextTabelaIR = pickBestKeyByReference(irOptions, state.anoRef, referenceMonth);
        if (nextTabelaIR && state.tabelaIR !== nextTabelaIR) {
            update('tabelaIR', nextTabelaIR);
        }
    }, [irOptions, state.tabelaIR, state.anoRef, state.mesRef, update]);

    const updateOvertimeEntry = (id: string, patch: Partial<OvertimeEntry>) => {
        update(
            'overtimeEntries',
            state.overtimeEntries.map((entry) => (
                entry.id === id ? { ...entry, ...patch } : entry
            ))
        );
    };

    const updateSubstitutionEntry = (id: string, patch: Partial<SubstitutionEntry>) => {
        update(
            'substitutionEntries',
            state.substitutionEntries.map((entry) => (
                entry.id === id ? { ...entry, ...patch } : entry
            ))
        );
    };

    const getPresetGrossLines = (instance: PresetInstance): PresetGrossLine[] => {
        return buildPresetGrossLines({
            instance,
            state,
            courtConfig,
            currentTables,
            isNovoAQ,
            noFunctionCode,
            currentFunctionValue: funcaoAtualValor,
            gratificacaoEspecificaCalculada
        });

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
                if (isNovoAQ) {
                    return [{ label: 'Valor de referencia (VR)', value: roundCurrency(currentTables.valorVR || 0) }, ...lines];
                }
                return lines;
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
                        { label: 'VPNI (Decisao)', value: state.vpni_decisao || 0 },
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
            case 'decimo':
                {
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
            case 'hora_extra':
                {
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

                        return {
                            he50,
                            he100,
                            total: he50 + he100
                        };
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
                    const irLabel = overtimeEntry.isEA
                        ? 'Desconto IR-EA (Hora extra)'
                        : 'Desconto IR (Hora extra)';

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

                const substitutionBreakdown = getSubstitutionBreakdown(currentEntry.dias || {});
                const substTotalBruto = roundCurrency(substitutionBreakdown.total);
                const mensalBaseTotal = substitutionEntries
                    .filter(item => !item.isEA && !item.excluirIR)
                    .reduce((acc, item) => acc + getSubstitutionBreakdown(item.dias || {}).total, 0);
                const eaBaseTotal = substitutionEntries
                    .filter(item => item.isEA && !item.excluirIR)
                    .reduce((acc, item) => acc + getSubstitutionBreakdown(item.dias || {}).total, 0);
                const pssEaBaseTotal = substitutionEntries
                    .filter(item => item.pssIsEA)
                    .reduce((acc, item) => acc + getSubstitutionBreakdown(item.dias || {}).total, 0);

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

                const substTotalLiquido = roundCurrency(Math.max(0, substTotalBruto - substTotalDescontos));
                const substIrLabel = currentEntry.isEA ? 'Desconto IR-EA (Substituição)' : 'Desconto IR (Substituição)';

                return [
                    ...porFuncaoBruto,
                    { label: substIrLabel, value: substIr, isDiscount: true },
                    { label: 'Desconto PSS (Substituição)', value: substPss, isDiscount: true },
                    ...porFuncaoLiquido,
                    { label: 'Total substituição Bruto', value: substTotalBruto },
                    { label: 'Total substituição Líquido', value: substTotalLiquido }
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
            case 'aux_transporte':
                {
                    const transporteBruto = roundCurrency(state.auxTransporteValor || 0);
                    const cotaParte = roundCurrency(state.auxTransporteDesc || 0);
                    const transporteLiquido = roundCurrency(Math.max(0, transporteBruto - cotaParte));
                    return [
                        { label: 'Auxílio-transporte Bruto', value: transporteBruto },
                        { label: 'Cota-parte transporte', value: cotaParte, isDiscount: true },
                        { label: 'Desconto IR (Auxílio-transporte)', value: 0, isDiscount: true },
                        { label: 'Desconto PSS (Auxílio-transporte)', value: 0, isDiscount: true },
                        { label: 'Auxílio-transporte Líquido', value: transporteLiquido }
                    ];
                }
            case 'diarias':
                {
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
                    const meiaDiariaRetorno = periodSummary?.halfDailyApplied
                        ? roundCurrency(dailyRate * 0.5)
                        : 0;
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

    const renderPreset = (instance: PresetInstance) => (
        <PresetCardContent
            instance={instance}
            state={state}
            update={update}
            styles={styles}
            isNovoAQ={isNovoAQ}
            competenciaReferencia={competenciaReferencia}
            functionKeys={functionKeys}
            updateOvertimeEntry={updateOvertimeEntry}
            updateSubstitutionEntry={updateSubstitutionEntry}
            courtConfig={courtConfig}
        />
    );

    return (
        <>
            <div className={styles.card}>
            <h3 className={styles.sectionTitle}>
                <Settings className="w-4 h-4" />
                Formulário dinâmico do holerite
            </h3>

            <div className={styles.innerBox}>
                <h4 className={styles.innerBoxTitle}>Base obrigatória</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className={styles.label}>Cargo</label>
                        <select className={styles.input} value={state.cargo} onChange={e => handleCargoChange(e.target.value)}>
                            {cargoOptions.map(cargo => (
                                <option key={cargo} value={cargo}>
                                    {careerCatalog?.cargoLabels?.[cargo] || cargo.toUpperCase()}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className={styles.label}>Classe/Padrão</label>
                        <select className={styles.input} value={state.padrao} onChange={e => update('padrao', e.target.value)}>
                            {padroes.map(padrao => (
                                <option key={padrao} value={padrao}>{padrao}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className={styles.label}>Função (FC/CJ)</label>
                        <select className={styles.input} value={state.funcao} onChange={e => update('funcao', e.target.value)}>
                            {noFunctionCode && <option value={noFunctionCode}>{noFunctionLabel}</option>}
                            {functionKeys.map(funcao => (
                                <option key={funcao} value={funcao}>
                                    {funcao.toUpperCase()} - {formatCurrency(currentTables.funcoes[funcao])}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 px-4 py-3">
                        <p className={styles.label}>Salário Base</p>
                        <p className="text-body font-bold text-neutral-800 dark:text-neutral-100 font-mono">{formatCurrency(baseVencimento)}</p>
                    </div>
                    <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 px-4 py-3">
                        <p className="text-label font-bold text-neutral-500 uppercase tracking-widest">GAJ (140%)</p>
                        <p className="text-body font-bold text-neutral-800 dark:text-neutral-100 font-mono">{formatCurrency(gaj)}</p>
                    </div>
                    <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 px-4 py-3">
                        <p className="text-label font-bold text-neutral-500 uppercase tracking-widest">Auxílio Alimentação</p>
                        <p className="text-body font-bold text-neutral-800 dark:text-neutral-100 font-mono">{formatCurrency(state.auxAlimentacao || 0)}</p>
                    </div>
                </div>

            </div>

            <div className={styles.innerBox}>
                <h4 className={styles.innerBoxTitle}>Adicional de Qualificação</h4>
                {renderPreset({ key: 'aq-fixed', presetId: 'aq' })}
                <PresetGrossSummary lines={getPresetGrossLines({ key: 'aq-fixed', presetId: 'aq' })} />
            </div>

            <div className={styles.innerBox}>
                <h4 className={styles.innerBoxTitle}>Configurações tributárias</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className={styles.label}>Regime previdenciário</label>
                        <select className={styles.input} value={state.regimePrev} onChange={e => handleRegimePrevChange(e.target.value)}>
                            <option value="antigo">RPPS - sem teto</option>
                            <option value="novo_antigo">RPPS - novo sem migração</option>
                            <option value="migrado">RPPS migrado (com teto)</option>
                            <option value="rpc">RPC (com teto)</option>
                        </select>
                    </div>
                    <div>
                        <label className={styles.label}>Dependentes (IR)</label>
                        <input type="number" className={styles.input} value={state.dependentes} onChange={e => update('dependentes', toPositiveNumber(e.target.value))} />
                    </div>
                    <div className="flex flex-col justify-end gap-3">
                        <label className={styles.checkboxLabel}>
                            <input type="checkbox" className={styles.checkbox} checked={state.pssSobreFC} onChange={e => update('pssSobreFC', e.target.checked)} />
                            <span>PSS sobre FC/CJ</span>
                        </label>
                    </div>
                </div>

                {showFunprespSection && previdenciaComplementar && (
                    <div className="mt-4 space-y-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 p-4">
                        <h5 className="text-label font-bold uppercase tracking-widest text-neutral-600 dark:text-neutral-300">
                            Previdência Complementar (Funpresp)
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className={styles.label}>Participa Funpresp</label>
                                <select
                                    className={styles.input}
                                    value={state.funprespParticipacao}
                                    onChange={e => handleFunprespParticipacaoChange(e.target.value as 'nao' | 'patrocinado')}
                                >
                                    <option value="nao">Não</option>
                                    <option value="patrocinado">Sim (Patrocinado)</option>
                                </select>
                            </div>
                            <div>
                                <label className={styles.label}>Contribuição normal patrocinada</label>
                                <select
                                    className={styles.input}
                                    value={state.funprespAliq}
                                    onChange={e => update('funprespAliq', Number(e.target.value))}
                                    disabled={state.funprespParticipacao !== 'patrocinado'}
                                >
                                    {funprespNormalOptions.map(rate => (
                                        <option key={rate} value={rate}>{toPercentLabel(rate)}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className={styles.label}>Contribuição facultativa (%)</label>
                                <input
                                    type="number"
                                    className={styles.input}
                                    min={0}
                                    max={previdenciaComplementar.facultativeRate.max * 100}
                                    step={previdenciaComplementar.facultativeRate.step * 100}
                                    value={Number((state.funprespFacul * 100).toFixed(1))}
                                    onChange={e => update('funprespFacul', toDecimalRateFromPercentInput(e.target.value))}
                                    disabled={state.funprespParticipacao !== 'patrocinado'}
                                />
                            </div>
                        </div>
                        {funprespValidationError && (
                            <p className="text-body-xs text-error-600 dark:text-error-400">{funprespValidationError}</p>
                        )}
                    </div>
                )}
            </div>
        </div>

            <div className={styles.card}>
                <h3 className={styles.sectionTitle}>
                    <Settings className="w-4 h-4" />
                    Rubricas Pré-definidas
                </h3>

                <div className="space-y-3">
                    <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
                        <select
                            className={`${styles.input} w-full min-w-0 sm:flex-1 sm:min-w-[20rem]`}
                            value={selectedPreset}
                            onChange={e => setSelectedPreset(e.target.value as PredefinedRubricId | '')}
                            disabled={availablePresets.length === 0}
                        >
                            {availablePresets.length === 0 && <option value="">Todas adicionadas</option>}
                            {availablePresets.map(option => (
                                <option key={option.id} value={option.id}>{getPresetPickerLabel(option.id, option.label)}</option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={includePreset}
                            disabled={!selectedPreset}
                            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors text-body-xs font-bold uppercase tracking-wider disabled:opacity-50 shrink-0"
                        >
                            <Plus className="w-4 h-4" />
                            Incluir
                        </button>
                        <button
                            type="button"
                            onClick={() => setReorderMode(prev => !prev)}
                            disabled={enabledPresets.length < 2 && !reorderMode}
                            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-neutral-100 text-neutral-700 border border-neutral-200 hover:bg-neutral-200 transition-colors text-body-xs font-bold uppercase tracking-wider disabled:opacity-50 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-700 shrink-0"
                        >
                            <GripVertical className="w-4 h-4" />
                            {reorderMode ? 'Concluir ordem' : 'Reordenar cards'}
                        </button>
                    </div>
                    <p className="text-body-xs text-neutral-500 dark:text-neutral-400">
                        Cards que podem ser adicionados mais de uma vez: {MULTI_INSTANCE_HINT_LABEL}.
                    </p>
                </div>

                {reorderMode && (
                    <p className="text-body-xs text-neutral-500 dark:text-neutral-400 mb-3">
                        Arraste os cards para reorganizar a ordem de exibição.
                    </p>
                )}

                {enabledPresets.length === 0 && (
                    <p className="text-body text-neutral-400 italic pt-1">
                        Nenhuma rubrica pré-definida adicionada.
                    </p>
                )}
            </div>

            {enabledPresets.map(instance => {
                const preset = PREDEFINED_OPTIONS.find(option => option.id === instance.presetId);
                if (!preset) return null;

                return (
                    <div
                        key={instance.key}
                        draggable={reorderMode}
                        onDragStart={() => handlePresetDragStart(instance.key)}
                        onDragOver={handlePresetDragOver}
                        onDrop={() => handlePresetDrop(instance.key)}
                        onDragEnd={handlePresetDragEnd}
                        className={`${styles.card} space-y-4 transition-shadow ${draggingPreset === instance.key ? 'border-primary/60 shadow-lg' : ''} ${reorderMode ? 'cursor-grab active:cursor-grabbing' : ''}`}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2">
                                {reorderMode && <GripVertical className="w-4 h-4 text-neutral-400" />}
                                <span className="px-2.5 py-1 rounded-full text-body-xs font-bold bg-primary/10 text-primary">{preset.label}</span>
                                {MULTI_INSTANCE_PRESETS.has(instance.presetId) && (
                                    <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-neutral-100 text-neutral-600 border border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700">
                                        Múltiplo
                                    </span>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => removePreset(instance)}
                                className="text-neutral-400 hover:text-error-500 p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                                aria-label={`Remover ${preset.label}`}
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                        {renderPreset(instance)}
                        <PresetGrossSummary lines={getPresetGrossLines(instance)} />
                    </div>
                );
            })}

            <ManualRubricasSection
                rubricas={state.rubricasExtras}
                totalCreditos={totalCreditos}
                totalDescontos={totalDescontos}
                styles={styles}
                addRubrica={addRubrica}
                removeRubrica={removeRubrica}
                updateRubrica={updateRubrica}
                toPositiveNumber={toPositiveNumber}
            />
        </>
    );
};
