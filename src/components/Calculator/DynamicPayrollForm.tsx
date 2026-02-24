import React, { useEffect, useMemo, useState } from 'react';
import { DollarSign, GripVertical, Minus, Plus, Settings, Trash2 } from 'lucide-react';
import { CalculatorState, CourtConfig, Rubrica } from '../../types';
import { formatCurrency, getTablesForPeriod } from '../../utils/calculations';
import { VacationCard } from './cards/VacationCard';
import { ThirteenthCard } from './cards/ThirteenthCard';
import { OvertimeCard } from './cards/OvertimeCard';
import { SubstitutionCard } from './cards/SubstitutionCard';
import { LicenseCard } from './cards/LicenseCard';
import { DailiesCard } from './cards/DailiesCard';
import { pickBestKeyByReference, toReferenceMonthIndex } from './referenceDateUtils';

type PredefinedRubricId =
    | 'aq'
    | 'gratificacao'
    | 'vantagens'
    | 'abono'
    | 'ferias'
    | 'decimo'
    | 'hora_extra'
    | 'substituicao'
    | 'licenca'
    | 'pre_escolar'
    | 'aux_transporte'
    | 'diarias';

interface PresetGrossLine {
    label: string;
    value: number;
}

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

const PREDEFINED_OPTIONS: Array<{ id: PredefinedRubricId; label: string }> = [
    { id: 'gratificacao', label: 'Gratificação Específica (GAE/GAS)' },
    { id: 'vantagens', label: 'Vantagens Pessoais' },
    { id: 'abono', label: 'Abono de Permanência' },
    { id: 'ferias', label: 'Férias' },
    { id: 'decimo', label: '13º Salário' },
    { id: 'hora_extra', label: 'Horas Extras' },
    { id: 'substituicao', label: 'Substituição' },
    { id: 'licenca', label: 'Licença Compensatória' },
    { id: 'pre_escolar', label: 'Auxílio Pré-Escolar' },
    { id: 'aux_transporte', label: 'Auxílio Transporte' },
    { id: 'diarias', label: 'Diárias de Viagem' }
];

const DEFAULT_PRESETS: PredefinedRubricId[] = [];

const toNumber = (value: string) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const toPositiveNumber = (value: string) => {
    return Math.max(0, toNumber(value));
};

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

const hasPresetValue = (presetId: PredefinedRubricId, state: CalculatorState) => {
    switch (presetId) {
        case 'aq':
            return state.aqTituloPerc > 0 || state.aqTreinoPerc > 0 || state.aqTituloVR > 0 || state.aqTreinoVR > 0;
        case 'gratificacao':
            return state.gratEspecificaTipo !== '0' || state.gratEspecificaValor > 0;
        case 'vantagens':
            return state.vpni_lei > 0 || state.vpni_decisao > 0 || state.ats > 0;
        case 'abono':
            return state.recebeAbono;
        case 'ferias':
            return state.manualFerias || state.ferias1_3 > 0 || state.feriasAntecipadas;
        case 'decimo':
            return (
                state.manualAdiant13 ||
                state.adiant13Venc > 0 ||
                state.adiant13FC > 0 ||
                state.segunda13Venc > 0 ||
                state.segunda13FC > 0
            );
        case 'hora_extra':
            return state.heQtd50 > 0 || state.heQtd100 > 0 || state.heIsEA;
        case 'substituicao':
            return Object.values(state.substDias).some(days => days > 0) || state.substIsEA;
        case 'licenca':
            return state.licencaDias > 0;
        case 'pre_escolar':
            return state.auxPreEscolarQtd > 0;
        case 'aux_transporte':
            return state.auxTransporteGasto > 0;
        case 'diarias':
            return state.diariasQtd > 0 || state.diariasEmbarque !== 'nenhum';
        default:
            return false;
    }
};

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
    const noFunctionLabel = careerCatalog?.noFunctionLabel ?? 'Sem funcao';
    const cargoOptions = Object.keys(currentTables.salario || {});
    const salaryByCargo = currentTables.salario[state.cargo] || {};
    const padroes = Object.keys(salaryByCargo);
    const baseVencimento = salaryByCargo[state.padrao] || 0;
    const gaj = baseVencimento * (payrollRules?.gajRate ?? 0);
    const isNovoAQ = state.periodo >= 1;
    const functionKeys = Object.keys(currentTables.funcoes || {});
    const pssOptions = Object.keys(courtConfig.historico_pss || {});
    const irOptions = Object.keys(courtConfig.historico_ir || {});

    const initialPresets = useMemo(() => {
        const fromState = PREDEFINED_OPTIONS
            .filter(option => hasPresetValue(option.id, state))
            .map(option => option.id);
        return Array.from(new Set([...DEFAULT_PRESETS, ...fromState]));
    }, [state]);

    const [enabledPresets, setEnabledPresets] = useState<PredefinedRubricId[]>(initialPresets);
    const availablePresets = PREDEFINED_OPTIONS.filter(option => !enabledPresets.includes(option.id));
    const [selectedPreset, setSelectedPreset] = useState<PredefinedRubricId | ''>(availablePresets[0]?.id || '');
    const [reorderMode, setReorderMode] = useState(false);
    const [draggingPreset, setDraggingPreset] = useState<PredefinedRubricId | null>(null);

    useEffect(() => {
        if (enabledPresets.length < 2 && reorderMode) {
            setReorderMode(false);
            setDraggingPreset(null);
        }
    }, [enabledPresets.length, reorderMode]);

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

    const substitutionBreakdown = useMemo(() => {
        const divisor = payrollRules?.monthDayDivisor ?? 30;
        const baseAbatimento = funcaoAtualValor + gratificacaoEspecificaCalculada;

        const linhas = Object.entries(state.substDias || {})
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
            });

        const total = roundCurrency(linhas.reduce((acc, linha) => acc + linha.value, 0));

        return { linhas, total };
    }, [
        state.substDias,
        currentTables.funcoes,
        payrollRules?.monthDayDivisor,
        funcaoAtualValor,
        gratificacaoEspecificaCalculada
    ]);

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
        if (!state.funcao || !validFunctions.has(state.funcao)) {
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

    const clearPreset = (presetId: PredefinedRubricId) => {
        switch (presetId) {
            case 'aq':
                update('aqTituloPerc', 0);
                update('aqTreinoPerc', 0);
                update('aqTituloVR', 0);
                update('aqTreinoVR', 0);
                break;
            case 'gratificacao':
                update('gratEspecificaTipo', '0');
                update('gratEspecificaValor', 0);
                break;
            case 'vantagens':
                update('vpni_lei', 0);
                update('vpni_decisao', 0);
                update('ats', 0);
                break;
            case 'abono':
                update('recebeAbono', false);
                break;
            case 'ferias':
                update('manualFerias', false);
                update('ferias1_3', 0);
                update('feriasDesc', 0);
                update('feriasDescManual', false);
                update('feriasAntecipadas', false);
                break;
            case 'decimo':
                update('manualAdiant13', false);
                update('adiant13Venc', 0);
                update('adiant13FC', 0);
                update('segunda13Venc', 0);
                update('segunda13FC', 0);
                break;
            case 'hora_extra':
                update('heQtd50', 0);
                update('heQtd100', 0);
                update('heIsEA', false);
                break;
            case 'substituicao':
                update('substIsEA', false);
                functionKeys.forEach(key => updateSubstDays(key, 0));
                break;
            case 'licenca':
                update('licencaDias', 0);
                update('baseLicenca', 'auto');
                update('incluirAbonoLicenca', true);
                break;
            case 'pre_escolar':
                update('auxPreEscolarQtd', 0);
                break;
            case 'aux_transporte':
                update('auxTransporteGasto', 0);
                break;
            case 'diarias':
                update('diariasQtd', 0);
                update('diariasEmbarque', 'nenhum');
                update('diariasDescontarAlimentacao', true);
                update('diariasDescontarTransporte', true);
                update('diariasExtHospedagem', false);
                update('diariasExtAlimentacao', false);
                update('diariasExtTransporte', false);
                break;
        }
    };

    const includePreset = () => {
        if (!selectedPreset || enabledPresets.includes(selectedPreset)) return;
        setEnabledPresets(prev => [selectedPreset, ...prev]);
        const nextAvailable = availablePresets.filter(option => option.id !== selectedPreset);
        setSelectedPreset(nextAvailable[0]?.id || '');
    };

    const removePreset = (presetId: PredefinedRubricId) => {
        setEnabledPresets(prev => prev.filter(id => id !== presetId));
        clearPreset(presetId);
        if (!selectedPreset) {
            setSelectedPreset(presetId);
        }
    };

    const handlePresetDragStart = (presetId: PredefinedRubricId) => {
        if (!reorderMode) return;
        setDraggingPreset(presetId);
    };

    const handlePresetDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        if (!reorderMode) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handlePresetDrop = (targetPresetId: PredefinedRubricId) => {
        if (!reorderMode || !draggingPreset || draggingPreset === targetPresetId) {
            return;
        }

        setEnabledPresets(prev => {
            const fromIndex = prev.indexOf(draggingPreset);
            const toIndex = prev.indexOf(targetPresetId);
            if (fromIndex < 0 || toIndex < 0) return prev;

            const next = [...prev];
            const [moved] = next.splice(fromIndex, 1);
            next.splice(toIndex, 0, moved);
            return next;
        });
    };

    const handlePresetDragEnd = () => {
        setDraggingPreset(null);
    };

    const getPresetGrossLines = (presetId: PredefinedRubricId): PresetGrossLine[] => {
        switch (presetId) {
            case 'aq': {
                const tituloLabel = isNovoAQ ? 'AQ Titulos (Lei 15.292)' : 'AQ Titulos';
                const treinoLabel = isNovoAQ ? 'AQ Treinamento (Lei 15.292)' : 'AQ Treinamento';
                const lines: PresetGrossLine[] = [];
                if (isNovoAQ) {
                    lines.push({ label: 'Valor de referencia (VR)', value: roundCurrency(currentTables.valorVR || 0) });
                }
                lines.push(
                    { label: tituloLabel, value: roundCurrency(state.aqTituloValor || 0) },
                    { label: treinoLabel, value: roundCurrency(state.aqTreinoValor || 0) },
                    { label: 'Total AQ', value: roundCurrency((state.aqTituloValor || 0) + (state.aqTreinoValor || 0)) }
                );
                return [
                    ...lines
                ];
            }
            case 'gratificacao':
                return [
                    { label: 'Gratificacao especifica', value: roundCurrency(gratificacaoEspecificaCalculada) }
                ];
            case 'vantagens':
                return [
                    { label: 'VPNI (Lei)', value: roundCurrency(state.vpni_lei || 0) },
                    { label: 'VPNI (Decisao)', value: roundCurrency(state.vpni_decisao || 0) },
                    { label: 'ATS', value: roundCurrency(state.ats || 0) },
                    { label: 'Total vantagens', value: roundCurrency((state.vpni_lei || 0) + (state.vpni_decisao || 0) + (state.ats || 0)) }
                ];
            case 'abono':
                return [
                    { label: 'Abono de permanencia', value: roundCurrency(state.abonoPermanencia || 0) }
                ];
            case 'ferias':
                return [
                    { label: 'Adicional 1/3 ferias', value: roundCurrency(state.ferias1_3 || 0) }
                ];
            case 'decimo':
                return [
                    { label: '1a parcela vencimento', value: roundCurrency(state.adiant13Venc || 0) },
                    { label: '1a parcela FC/CJ', value: roundCurrency(state.adiant13FC || 0) },
                    { label: '2a parcela vencimento', value: roundCurrency(state.segunda13Venc || 0) },
                    { label: '2a parcela FC/CJ', value: roundCurrency(state.segunda13FC || 0) },
                    { label: 'Gratificacao natalina', value: roundCurrency(state.gratNatalinaTotal || 0) },
                    { label: 'Abono 13o', value: roundCurrency(state.abonoPerm13 || 0) }
                ];
            case 'hora_extra':
                return [
                    { label: 'Hora extra 50%', value: roundCurrency(state.heVal50 || 0) },
                    { label: 'Hora extra 100%', value: roundCurrency(state.heVal100 || 0) },
                    { label: 'Total hora extra', value: roundCurrency(state.heTotal || 0) }
                ];
            case 'substituicao': {
                const porFuncao = substitutionBreakdown.linhas.map((linha) => ({
                    label: `Substituicao ${linha.key.toUpperCase()} (${linha.days} dia(s))`,
                    value: linha.value
                }));
                return [
                    ...porFuncao,
                    { label: 'Total substituicao', value: roundCurrency(substitutionBreakdown.total) }
                ];
            }
            case 'licenca':
                return [
                    { label: 'Licenca compensatoria', value: roundCurrency(state.licencaValor || 0) }
                ];
            case 'pre_escolar':
                return [
                    { label: 'Auxilio pre-escolar', value: roundCurrency(state.auxPreEscolarValor || 0) }
                ];
            case 'aux_transporte':
                return [
                    { label: 'Auxilio transporte (credito)', value: roundCurrency(state.auxTransporteValor || 0) },
                    { label: 'Cota-parte transporte (desconto)', value: roundCurrency(state.auxTransporteDesc || 0) }
                ];
            case 'diarias':
                return [
                    { label: 'Diarias brutas', value: roundCurrency(state.diariasBruto || 0) },
                    { label: 'Restituicao aux. alimentacao', value: roundCurrency(state.diariasDescAlim || 0) },
                    { label: 'Restituicao aux. transporte', value: roundCurrency(state.diariasDescTransp || 0) },
                    { label: 'Total diarias liquidas', value: roundCurrency(state.diariasValorTotal || 0) }
                ];
            default:
                return [];
        }
    };

    const renderPresetGrossSummary = (presetId: PredefinedRubricId) => {
        const lines = getPresetGrossLines(presetId);
        if (lines.length === 0) {
            return null;
        }

        return (
            <div className="rounded-xl border border-secondary/20 bg-secondary/5 px-4 py-3 space-y-2">
                <p className="text-label font-bold uppercase tracking-widest text-secondary-700 dark:text-secondary-400">
                    Resumo bruto calculado
                </p>
                <div className="space-y-1.5">
                    {lines.map((line) => (
                        <div key={line.label} className="flex items-center justify-between gap-3 text-body-xs">
                            <span className="text-neutral-600 dark:text-neutral-300">{line.label}</span>
                            <span className="font-mono font-bold text-neutral-800 dark:text-neutral-100">
                                {formatCurrency(line.value || 0)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderPreset = (presetId: PredefinedRubricId) => {
        if (presetId === 'aq') {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {isNovoAQ ? (
                        <>
                            <div>
                                <label className={styles.label}>Titulos (VR)</label>
                                <select className={styles.input} value={state.aqTituloVR} onChange={e => update('aqTituloVR', Number(e.target.value))}>
                                    <option value={0}>Nenhum</option>
                                    <option value={1.0}>Especializacao (1.0x VR)</option>
                                    <option value={2.0}>2x Especializacao (2.0x VR)</option>
                                    <option value={3.5}>Mestrado (3.5x VR)</option>
                                    <option value={5.0}>Doutorado (5.0x VR)</option>
                                </select>
                            </div>
                            <div>
                                <label className={styles.label}>Treinamento (VR)</label>
                                <select className={styles.input} value={state.aqTreinoVR} onChange={e => update('aqTreinoVR', Number(e.target.value))}>
                                    <option value={0}>Nenhum</option>
                                    <option value={0.2}>120h (0.2x VR)</option>
                                    <option value={0.4}>240h (0.4x VR)</option>
                                    <option value={0.6}>360h (0.6x VR)</option>
                                </select>
                            </div>
                        </>
                    ) : (
                        <>
                            <div>
                                <label className={styles.label}>Titulos (%)</label>
                                <select className={styles.input} value={state.aqTituloPerc} onChange={e => update('aqTituloPerc', Number(e.target.value))}>
                                    <option value={0}>0%</option>
                                    <option value={0.05}>5% (Graduacao)</option>
                                    <option value={0.075}>7.5% (Especializacao)</option>
                                    <option value={0.1}>10% (Mestrado)</option>
                                    <option value={0.125}>12.5% (Doutorado)</option>
                                </select>
                            </div>
                            <div>
                                <label className={styles.label}>Treinamento (%)</label>
                                <select className={styles.input} value={state.aqTreinoPerc} onChange={e => update('aqTreinoPerc', Number(e.target.value))}>
                                    <option value={0}>0%</option>
                                    <option value={0.01}>1% (120h)</option>
                                    <option value={0.02}>2% (240h)</option>
                                    <option value={0.03}>3% (360h)</option>
                                </select>
                            </div>
                        </>
                    )}
                </div>
            );
        }

        if (presetId === 'gratificacao') {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={styles.label}>Tipo</label>
                        <select className={styles.input} value={state.gratEspecificaTipo} onChange={e => update('gratEspecificaTipo', e.target.value)}>
                            <option value="0">Nenhuma</option>
                            <option value="gae">GAE (35%)</option>
                            <option value="gas">GAS (35%)</option>
                        </select>
                    </div>
                    <label className={`${styles.checkboxLabel} md:mt-8`}>
                        <input
                            type="checkbox"
                            className={styles.checkbox}
                            checked={state.incidirPSSGrat}
                            onChange={e => update('incidirPSSGrat', e.target.checked)}
                        />
                        <span>Incluir na base do PSS</span>
                    </label>
                </div>
            );
        }

        if (presetId === 'vantagens') {
            return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className={styles.label}>VPNI (Lei)</label>
                        <input type="number" className={styles.input} value={state.vpni_lei} onChange={e => update('vpni_lei', toPositiveNumber(e.target.value))} />
                    </div>
                    <div>
                        <label className={styles.label}>VPNI (Decisao)</label>
                        <input type="number" className={styles.input} value={state.vpni_decisao} onChange={e => update('vpni_decisao', toPositiveNumber(e.target.value))} />
                    </div>
                    <div>
                        <label className={styles.label}>ATS</label>
                        <input type="number" className={styles.input} value={state.ats} onChange={e => update('ats', toPositiveNumber(e.target.value))} />
                    </div>
                </div>
            );
        }

        if (presetId === 'abono') {
            return (
                <label className={styles.checkboxLabel}>
                    <input type="checkbox" className={styles.checkbox} checked={state.recebeAbono} onChange={e => update('recebeAbono', e.target.checked)} />
                    <span>Recebe abono de permanência</span>
                </label>
            );
        }

        if (presetId === 'ferias') return <VacationCard state={state} update={update} styles={styles} />;
        if (presetId === 'decimo') return <ThirteenthCard state={state} update={update} styles={styles} />;
        if (presetId === 'hora_extra') return <OvertimeCard state={state} update={update} styles={styles} />;
        if (presetId === 'substituicao') return <SubstitutionCard state={state} update={update} updateSubstDays={updateSubstDays} functionKeys={functionKeys} styles={styles} />;
        if (presetId === 'licenca') return <LicenseCard state={state} update={update} styles={styles} />;
        if (presetId === 'diarias') return <DailiesCard state={state} update={update} styles={styles} />;

        if (presetId === 'pre_escolar') {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={styles.label}>Qtd. dependentes</label>
                        <input type="number" className={styles.input} value={state.auxPreEscolarQtd} onChange={e => update('auxPreEscolarQtd', toPositiveNumber(e.target.value))} />
                    </div>
                    <div>
                        <label className={styles.label}>Cota pré-escolar</label>
                        <input type="number" className={styles.input} value={state.cotaPreEscolar} onChange={e => update('cotaPreEscolar', toPositiveNumber(e.target.value))} />
                    </div>
                </div>
            );
        }

        return (
            <div>
                <label className={styles.label}>Gasto mensal de transporte</label>
                <input type="number" className={styles.input} value={state.auxTransporteGasto} onChange={e => update('auxTransporteGasto', toPositiveNumber(e.target.value))} />
            </div>
        );
    };

    return (
        <div className={styles.card}>
            <h3 className={styles.sectionTitle}>
                <Settings className="w-4 h-4" />
                Formulario dinamico do holerite
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
                <h4 className={styles.innerBoxTitle}>
                    Adicional de Qualificação
                    <span className="text-label bg-secondary/10 text-secondary px-2 py-0.5 rounded-full">
                        {isNovoAQ ? 'LEI 15.292/2026' : 'REGRA ATUAL'}
                    </span>
                </h4>
                {renderPreset('aq')}
                {renderPresetGrossSummary('aq')}
            </div>

            <div className={styles.innerBox}>
                <h4 className={styles.innerBoxTitle}>Configurações tributárias</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className={styles.label}>Regime previdenciário</label>
                        <select className={styles.input} value={state.regimePrev} onChange={e => update('regimePrev', e.target.value)}>
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
            </div>

            <div className={styles.innerBox}>
                <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
                    <h4 className={styles.innerBoxTitle}>
                        <span className="flex items-center gap-2">
                            <Settings className="w-4 h-4" />
                            Rubricas Pré-definidas
                        </span>
                    </h4>
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                        <button
                            type="button"
                            onClick={() => setReorderMode(prev => !prev)}
                            disabled={enabledPresets.length < 2 && !reorderMode}
                            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-neutral-100 text-neutral-700 border border-neutral-200 hover:bg-neutral-200 transition-colors text-body-xs font-bold uppercase tracking-wider disabled:opacity-50 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-700 sm:justify-start"
                        >
                            <GripVertical className="w-4 h-4" />
                            {reorderMode ? 'Concluir ordem' : 'Reordenar cards'}
                        </button>
                        <div className="flex w-full items-center gap-2 sm:w-auto">
                            <select
                                className={`${styles.input} min-w-0 flex-1 sm:w-72`}
                                value={selectedPreset}
                                onChange={e => setSelectedPreset(e.target.value as PredefinedRubricId | '')}
                                disabled={availablePresets.length === 0}
                            >
                                {availablePresets.length === 0 && <option value="">Todas adicionadas</option>}
                                {availablePresets.map(option => (
                                    <option key={option.id} value={option.id}>{option.label}</option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={includePreset}
                                disabled={!selectedPreset}
                                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors text-body-xs font-bold uppercase tracking-wider disabled:opacity-50 shrink-0"
                            >
                                <Plus className="w-4 h-4" />
                                Incluir
                            </button>
                        </div>
                    </div>
                </div>

                {reorderMode && (
                    <p className="text-body-xs text-neutral-500 dark:text-neutral-400 mb-3">
                        Arraste os cards para reorganizar a ordem de exibição.
                    </p>
                )}

                <div className="space-y-3">
                    {enabledPresets.map(presetId => {
                        const preset = PREDEFINED_OPTIONS.find(option => option.id === presetId);
                        if (!preset) return null;

                        return (
                            <div
                                key={presetId}
                                draggable={reorderMode}
                                onDragStart={() => handlePresetDragStart(presetId)}
                                onDragOver={handlePresetDragOver}
                                onDrop={() => handlePresetDrop(presetId)}
                                onDragEnd={handlePresetDragEnd}
                                className={`rounded-xl border bg-white dark:bg-neutral-900 p-4 space-y-4 transition-shadow ${draggingPreset === presetId ? 'border-primary/60 shadow-lg' : 'border-neutral-200 dark:border-neutral-700'} ${reorderMode ? 'cursor-grab active:cursor-grabbing' : ''}`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        {reorderMode && <GripVertical className="w-4 h-4 text-neutral-400" />}
                                        <span className="px-2.5 py-1 rounded-full text-body-xs font-bold bg-primary/10 text-primary">{preset.label}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removePreset(presetId)}
                                        className="text-neutral-400 hover:text-error-500 p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                                        aria-label={`Remover ${preset.label}`}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                {renderPreset(presetId)}
                                {renderPresetGrossSummary(presetId)}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className={styles.innerBox}>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <h4 className={styles.innerBoxTitle}>
                        <span className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4" />
                            Rubricas Manuais
                        </span>
                    </h4>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => addRubrica('C')}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-success-500/10 text-success-700 dark:text-success-400 border border-success-500/20 hover:bg-success-500/20 transition-colors text-body-xs font-bold uppercase tracking-wider"
                        >
                            <Plus className="w-4 h-4" />
                            Incluir crédito
                        </button>
                        <button
                            type="button"
                            onClick={() => addRubrica('D')}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-error-500/10 text-error-700 dark:text-error-400 border border-error-500/20 hover:bg-error-500/20 transition-colors text-body-xs font-bold uppercase tracking-wider"
                        >
                            <Minus className="w-4 h-4" />
                            Incluir desconto
                        </button>
                    </div>
                </div>

                <div className="space-y-3 mt-4">
                    {state.rubricasExtras.map((rubrica, index) => (
                        <div key={rubrica.id} className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <span className={`px-2.5 py-1 rounded-full text-body-xs font-bold ${rubrica.tipo === 'C'
                                        ? 'bg-success-500/10 text-success-700 dark:text-success-400'
                                        : 'bg-error-500/10 text-error-700 dark:text-error-400'
                                        }`}>
                                        {rubrica.tipo === 'C' ? 'Crédito' : 'Desconto'} #{index + 1}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeRubrica(rubrica.id)}
                                    className="text-neutral-400 hover:text-error-500 p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                                    aria-label="Remover rubrica"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <div>
                                    <label className={styles.label}>Tipo</label>
                                    <select className={styles.input} value={rubrica.tipo} onChange={e => updateRubrica(rubrica.id, 'tipo', e.target.value as Rubrica['tipo'])}>
                                        <option value="C">Crédito (+)</option>
                                        <option value="D">Desconto (-)</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className={styles.label}>Descrição</label>
                                    <input type="text" className={styles.input} value={rubrica.descricao} onChange={e => updateRubrica(rubrica.id, 'descricao', e.target.value)} />
                                </div>
                                <div>
                                    <label className={styles.label}>Valor</label>
                                    <input type="number" className={styles.input} value={rubrica.valor || ''} onChange={e => updateRubrica(rubrica.id, 'valor', toPositiveNumber(e.target.value))} />
                                </div>
                            </div>

                            <div className="flex items-center gap-4 flex-wrap">
                                <label className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        className={styles.checkbox}
                                        checked={rubrica.isEA}
                                        onChange={e => {
                                            const checked = e.target.checked;
                                            updateRubrica(rubrica.id, 'isEA', checked);
                                            if (checked) {
                                                updateRubrica(rubrica.id, 'incideIR', false);
                                            }
                                        }}
                                    />
                                    <span>Exercício Anterior (EA)</span>
                                </label>
                                <label className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        className={styles.checkbox}
                                        checked={rubrica.incideIR}
                                        disabled={rubrica.isEA}
                                        onChange={e => updateRubrica(rubrica.id, 'incideIR', e.target.checked)}
                                    />
                                    <span>Incluir na base do IR</span>
                                </label>
                                <label className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        className={styles.checkbox}
                                        checked={rubrica.incidePSS}
                                        onChange={e => {
                                            const checked = e.target.checked;
                                            updateRubrica(rubrica.id, 'incidePSS', checked);
                                            if (!checked) {
                                                updateRubrica(rubrica.id, 'pssCompetenciaSeparada', false);
                                            }
                                        }}
                                    />
                                    <span>Incluir na base do PSS</span>
                                </label>
                                <label className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        className={styles.checkbox}
                                        checked={rubrica.pssCompetenciaSeparada}
                                        onChange={e => {
                                            const checked = e.target.checked;
                                            updateRubrica(rubrica.id, 'pssCompetenciaSeparada', checked);
                                            if (checked && !rubrica.incidePSS) {
                                                updateRubrica(rubrica.id, 'incidePSS', true);
                                            }
                                        }}
                                    />
                                    <span>PSS em competência anterior</span>
                                </label>
                            </div>
                        </div>
                    ))}
                </div>

                {state.rubricasExtras.length === 0 && (
                    <p className="text-body text-neutral-400 italic py-4">
                        Nenhuma rubrica manual adicionada.
                    </p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="rounded-xl border border-success-500/20 bg-success-500/5 px-4 py-3">
                        <p className="text-label font-bold uppercase tracking-widest text-success-700 dark:text-success-400">Total Créditos Dinâmicos</p>
                        <p className="text-body font-bold font-mono text-success-700 dark:text-success-400">{formatCurrency(totalCreditos)}</p>
                    </div>
                    <div className="rounded-xl border border-error-500/20 bg-error-500/5 px-4 py-3">
                        <p className="text-label font-bold uppercase tracking-widest text-error-700 dark:text-error-400">Total Descontos Dinâmicos</p>
                        <p className="text-body font-bold font-mono text-error-700 dark:text-error-400">{formatCurrency(totalDescontos)}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
