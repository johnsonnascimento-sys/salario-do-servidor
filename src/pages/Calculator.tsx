import { getPensionErrorFeedback } from '../utils/pensionFeedback';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useCalculator } from '../hooks/useCalculator';
import { styles } from '../components/Calculator/styles';
import { GlobalSettings } from '../components/Calculator/GlobalSettings';
import { CalculatorHeader } from '../components/Calculator/CalculatorHeader';
import { DynamicPayrollForm } from '../components/Calculator/DynamicPayrollForm';
import { ObservationsSection } from '../components/Calculator/ObservationsSection';
import { ResultsSummary } from '../components/Calculator/ResultsSummary';
import { ResultsOverview } from '../components/Calculator/ResultsOverview';
import { CalculatorNavigation } from '../components/Calculator/CalculatorNavigation';
import { IrEaContextSection } from '../components/Calculator/IrEaContextSection';
import { toReferenceMonthIndex } from '../components/Calculator/referenceDateUtils';
import { ActionFooter } from '../components/Calculator/ActionFooter';
import { MobileResultsBar } from '../components/Calculator/MobileResultsBar';
import { FieldCalculator } from '../components/Calculator/FieldCalculator';
import DonationModal from '../components/DonationModal';
import { CalculatorState, INITIAL_STATE } from '../types';
import type { PayslipResultRow } from '../types/user';
import { getPayslipById } from '../services/user/payslipService';
import {
    CALCULATOR_DRAFT_STORAGE_KEY,
    USER_AREA_LAST_CALCULATOR_STATE_KEY,
    USER_AREA_LAST_RESULT_ROWS_KEY,
} from '../constants/storage';
import { hydrateCalculatorState } from '../utils/calculatorState';
import { CalculatorNavigationState, CalculatorRestoreSource } from '../types/calculatorRestore';

export default function Calculator() {
    const {
        state,
        effectiveState,
        calculationStatus,
        calculationError,
        calculationPending,
        pensionContexts,
        calculationReady,
        loadingAgency,
        agencyError,
        update,
        updateMany,
        updateSubstDays,
        courtConfig,
        loadingConfig,
        resultRows,
        dailiesResultRows,
        exportError,
        donationModalOpen,
        setDonationModalOpen,
        handleDonationComplete,
        initiateExportPDF,
        initiateExportExcel,
        navigate,
        pendingExportType,
        addRubrica,
        removeRubrica,
        updateRubrica,
        setState,
        agencyName,
        configError,
        saveCurrentPayslip,
        savingPayslip,
    } = useCalculator();

    const emptyRetroDraftIds = (state.pensionRetroEntries ?? []).filter(entry =>
        entry.competencia === '' && entry.modo === 'completo' && entry.tipo === 'mensal' &&
        Array.isArray(entry.vinculos) && entry.vinculos.length === 0 &&
        Object.keys(entry).every(key => ['id', 'competencia', 'modo', 'tipo', 'vinculos'].includes(key))
    ).map(entry => entry.id);
    const hasHistoricalRubrics = state.rubricasExtras.some(rubrica => Number(rubrica.valor) > 0 &&
        (rubrica.pssCompetenciaSeparada || (rubrica.incideFunpresp && rubrica.funprespCompetenciaSeparada)));
    const onlyEmptyRetroDrafts = !hasHistoricalRubrics && emptyRetroDraftIds.length > 0 &&
        emptyRetroDraftIds.length === (state.pensionRetroEntries ?? []).length;

    const location = useLocation();
    const navigationState = location.state as CalculatorNavigationState | null;
    const editPayslipId = new URLSearchParams(location.search).get('editPayslipId') || '';
    const startBlank = Boolean(navigationState?.startBlank);
    const restoreSnapshot = navigationState?.restoreSnapshot;
    const preserveRestoredGlobals = Boolean(editPayslipId || restoreSnapshot?.calculatorState);
    const lastRestoreSourceRef = useRef('');
    const [formKey, setFormKey] = useState(0);
    const [restoreReady, setRestoreReady] = useState(!(editPayslipId || restoreSnapshot?.calculatorState));
    const [restoreError, setRestoreError] = useState('');
    const [saveFeedback, setSaveFeedback] = useState('');
    const [barHeight, setBarHeight] = useState(120);
    const [step, setStep] = useState(0);
    const stepHeadingRef = useRef<HTMLHeadingElement>(null);
    const initialScrollDone = useRef(false);

    useLayoutEffect(() => {
        const previousScrollRestoration = window.history.scrollRestoration;
        window.history.scrollRestoration = 'manual';
        if (window.location.hash) {
            window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}`);
        }
        window.scrollTo(0, 0);
        return () => { window.history.scrollRestoration = previousScrollRestoration; };
    }, []);

    useEffect(() => {
        if (initialScrollDone.current || loadingConfig || loadingAgency || !restoreReady) return;
        initialScrollDone.current = true;
        const frame = window.requestAnimationFrame(() => window.scrollTo(0, 0));
        return () => window.cancelAnimationFrame(frame);
    }, [loadingConfig, loadingAgency, restoreReady]);

    const changeStep = (nextStep: number) => {
        setStep(nextStep);
        window.requestAnimationFrame(() => {
            stepHeadingRef.current?.focus();
            stepHeadingRef.current?.scrollIntoView({ block: 'start' });
        });
    };

    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash;
            if (hash === '#resultado' || hash === '#detalhamento' || hash === '#apuracao-ir-ea' || hash === '#memoria-ir-ea') setStep(9);
            else if (hash === '#funpresp-settings' || hash === '#pension-retro-form') setStep(4);
            else if (hash === '#dependentes-ir') setStep(5);
            else if (hash === '#verbas' || hash === '#manual-rubricas-section') setStep(6);
            else if (hash === '#descontos') setStep(7);
            else if (hash === '#observacoes') setStep(8);
            else if (hash === '#remuneracao') setStep(0);
            else if (hash === '#competencia') setStep(0);
            if (hash && document.getElementById(hash.slice(1))) {
                window.requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView());
            }
        };
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    useEffect(() => {
        if (typeof ResizeObserver === 'undefined') return;
        const bars = Array.from(document.querySelectorAll<HTMLElement>('[data-calculator-results-bar]'));
        const measure = () => setBarHeight(Math.max(0, ...bars.map(bar => bar.getBoundingClientRect().height)));
        const observer = new ResizeObserver(measure);
        bars.forEach(bar => observer.observe(bar));
        measure();
        return () => observer.disconnect();
    }, [loadingAgency, loadingConfig, restoreReady, restoreError, agencyError, configError]);

    useEffect(() => {
        let active = true;

        const applyHydratedState = (snapshot: unknown, savedRows: PayslipResultRow[] = []) => {
            if (!active || !snapshot) return;
            const hydrated = hydrateCalculatorState(snapshot, savedRows);
            setState(hydrated);
            setFormKey((prev) => prev + 1);
            setRestoreReady(true);
            lastRestoreSourceRef.current = restoreSource;
        };

        const restoreKind: CalculatorRestoreSource = startBlank
            ? 'blank'
            : editPayslipId
                ? 'savedPayslip'
                : restoreSnapshot?.calculatorState
                    ? 'navigationRestore'
                    : 'draft';
        const restoreSource = restoreKind === 'savedPayslip'
            ? `${restoreKind}:${editPayslipId}`
            : restoreKind === 'navigationRestore'
                ? `${restoreKind}:${location.key}`
                : restoreKind;

        if (lastRestoreSourceRef.current === restoreSource) {
            return () => {
                active = false;
            };
        }

        setRestoreError('');

        if (startBlank) {
            try {
                localStorage.removeItem(CALCULATOR_DRAFT_STORAGE_KEY);
            } catch (_error) {
                // ignora falhas de localStorage
            }

            setState(hydrateCalculatorState(INITIAL_STATE));
            setFormKey((prev) => prev + 1);
            setRestoreReady(true);
            lastRestoreSourceRef.current = restoreSource;
        } else if (editPayslipId) {
            setRestoreReady(false);
            getPayslipById(editPayslipId)
                .then((payslip) => {
                    if (!payslip?.calculator_state) {
                        throw new Error('Holerite não encontrado ou indisponível para edição.');
                    }
                    applyHydratedState(payslip.calculator_state, payslip.result_rows || []);
                })
                .catch((error) => {
                    if (active) {
                        setRestoreError((error as Error).message || 'Falha ao carregar o holerite salvo.');
                    }
                });
        } else {
            if (restoreSnapshot?.calculatorState) {
                applyHydratedState(restoreSnapshot.calculatorState);
            } else {
                try {
                    const rawDraft = localStorage.getItem(CALCULATOR_DRAFT_STORAGE_KEY);
                    if (rawDraft) {
                        applyHydratedState(JSON.parse(rawDraft));
                    } else {
                        setRestoreReady(true);
                    }
                } catch (_error) {
                    // ignora rascunho inválido
                    setRestoreReady(true);
                }
            }
        }

        return () => {
            active = false;
        };
    }, [editPayslipId, location.key, restoreSnapshot, setState, startBlank]);

    const handleSavePayslip = async () => {
        try {
            const result = await saveCurrentPayslip();
            if (result.success) {
                setSaveFeedback(result.mode === 'updated'
                    ? 'Holerite atualizado com sucesso na sua área.'
                    : 'Holerite salvo com sucesso na sua área.');
            } else if (result.reason === 'auth') {
                setSaveFeedback('Faça login para salvar holerites na sua área.');
            } else {
                setSaveFeedback('Aguarde a conclusão do cálculo antes de salvar.');
            }
        } catch (error) {
            setSaveFeedback((error as Error).message || 'Falha ao salvar holerite. Tente novamente.');
        }
    };

    const openMyPayslips = () => navigate('/minha-area/holerites');

    const handleClearCalculator = () => {
        const confirmed = window.confirm('Limpar todos os dados preenchidos da calculadora?');
        if (!confirmed) return;

        try {
            localStorage.removeItem(CALCULATOR_DRAFT_STORAGE_KEY);
            localStorage.removeItem(USER_AREA_LAST_CALCULATOR_STATE_KEY);
            localStorage.removeItem(USER_AREA_LAST_RESULT_ROWS_KEY);
        } catch (_error) {
            // ignora falhas de localStorage
        }

        setState(hydrateCalculatorState(INITIAL_STATE));
        setSaveFeedback('Os dados da calculadora foram limpos.');
        setFormKey((prev) => prev + 1);
        lastRestoreSourceRef.current = 'blank';
    };

    const pensionFeedback = getPensionErrorFeedback(calculationError);
    const displayCalculationError = pensionFeedback?.message || calculationError;
    const resultMessage = calculationStatus === 'pension_pending' ? 'Apuração pendente'
        : calculationStatus === 'selection_required' ? 'Revise a participação previdenciária'
            : calculationStatus === 'error' ? (pensionFeedback?.configuration ? 'Funpresp em atualização' : pensionFeedback?.title || 'Cálculo indisponível') : 'Calculando...';

    if (loadingConfig || loadingAgency) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <p className="text-gray-500 animate-pulse">Carregando...</p>
            </div>
        );
    }

    if (agencyError || configError || !courtConfig) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900">
                <p className="text-neutral-500 dark:text-neutral-300">
                    {agencyError || configError || 'Configuracao indisponivel.'}
                </p>
            </div>
        );
    }

    if (restoreError || !restoreReady) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900">
                <p className="text-neutral-500 dark:text-neutral-300">
                    {restoreError || 'Carregando holerite salvo...'}
                </p>
            </div>
        );
    }

        return (
        <>
            <MobileResultsBar
                resultLabel={dailiesResultRows.length > 0 ? 'Total estimado' : 'Líquido do holerite'}
                calculationReady={calculationReady}
                resultMessage={resultMessage}
                savingPayslip={savingPayslip}
                liquido={effectiveState.liquido}
                onExportPDF={initiateExportPDF}
                onExportExcel={initiateExportExcel}
                onSavePayslip={handleSavePayslip}
                onOpenPayslips={openMyPayslips}
                onClearCalculator={handleClearCalculator}
            />

            <div className="calculator-workspace max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6" style={{ paddingBottom: barHeight + 40, '--calculator-bar-height': `${barHeight}px` } as React.CSSProperties}>
                <CalculatorHeader
                    navigate={navigate}
                    agencyName={agencyName}
                />

                <div className="flex flex-col gap-5 min-[960px]:flex-row min-[960px]:items-start">
                <CalculatorNavigation step={step} onChange={changeStep} />
                <div className="min-w-0 flex-1">
                <h2 ref={stepHeadingRef} tabIndex={-1} className="scroll-mt-28 text-h3 font-bold text-neutral-900 dark:text-white mb-4">
                    {['Dados básicos', 'Adicional de Qualificação (AQ)', 'Vantagens pessoais', 'Benefícios', 'Previdência e abono', 'Imposto de Renda', 'Créditos Eventuais', 'Descontos', 'Observações/Notas', 'Resultado'][step]}
                </h2>
                <p className="mb-6 text-body text-neutral-600 dark:text-neutral-300">{step === 6
                    ? 'Adicione os créditos que fazem parte da sua folha. Abra uma categoria ou pesquise pelo nome; depois, selecione Adicionar no item correspondente. Se não encontrar um crédito no catálogo, use Adicionar crédito avulso.'
                    : step === 7
                        ? 'Adicione os descontos que aparecem na sua folha. Abra uma categoria ou pesquise pelo nome; depois, selecione Adicionar no item correspondente. Para um desconto que não aparece no catálogo, use Adicionar desconto avulso.'
                        : step === 1
                            ? 'Selecione os títulos reconhecidos e a carga de treinamento registrada para a competência.'
                            : step === 4
                            ? 'Informe seu regime previdenciário, o abono de permanência e sua participação na Funpresp, quando aplicável.'
                            : step === 5
                                ? 'Informe quantos dependentes são considerados para o Imposto de Renda. O resumo abaixo mostra a dedução e o cálculo mensal.'
                                : step === 8
                                    ? 'Registre observações que deverão acompanhar a impressão da simulação.'
                                    : step === 9
                                    ? 'Confira o valor líquido estimado e o detalhamento dos créditos e descontos da simulação.'
                                    : step === 2
                                        ? 'Revise as vantagens pessoais e adicionais lançados na sua remuneração.'
                                        : step === 3
                                            ? 'Preencha os auxílios que se aplicam a esta competência. Use o catálogo para adicionar outras verbas.'
                                    : 'Preencha seus dados principais. Os valores são atualizados automaticamente.'}</p>
                {(saveFeedback || exportError) && <div role="status" aria-live="polite" className="mb-6 flex items-start justify-between gap-4 rounded-xl border border-secondary-300 bg-secondary-50 p-4 text-body text-secondary-900 dark:bg-secondary-950 dark:text-secondary-100">
                    <p>{exportError || saveFeedback}</p>
                    {!exportError && <button type="button" aria-label="Fechar mensagem" className="min-h-11 shrink-0 px-2 font-semibold" onClick={() => setSaveFeedback('')}>Fechar</button>}
                </div>}
                <div className="space-y-5">
                    <section id="competencia" tabIndex={-1} aria-label="Competência" className="scroll-mt-28" hidden={step !== 0}>
                    <GlobalSettings
                        key={`global-settings-${formKey}`}
                        state={effectiveState}
                        update={update}
                        courtConfig={courtConfig}
                        styles={styles}
                        preserveRestoredGlobals={preserveRestoredGlobals}
                    />
                    </section>
                    {calculationStatus === 'error' && <div id="calculator-error" role="alert" aria-live="polite" className="rounded-xl border border-error-300 bg-error-50 dark:bg-error-900/20 p-4 text-body text-error-700 dark:text-error-300">
                        <p className="font-semibold">{pensionFeedback?.title || 'Não foi possível calcular esta simulação'}</p>
                        <p className="mt-1">{displayCalculationError || 'O cálculo retornou um erro sem descrição. Seus dados preenchidos foram mantidos.'}</p>
                        {pensionFeedback && <a href="#funpresp-settings" className="mt-2 inline-block font-semibold underline">Ver dados da Funpresp</a>}
                    </div>}
                    {calculationPending && <div id="calculator-pension-pending" role="status" aria-live="polite" className="rounded-xl border border-warning-300 bg-warning-50 dark:bg-warning-900/20 p-4 text-body text-warning-700 dark:text-warning-300">
                        <p className="font-semibold">Apuração pendente</p>
                        {onlyEmptyRetroDrafts ? <>
                            <p className="mt-1">Há uma competência anterior vazia no rascunho, sem verba retroativa vinculada. Ela impede a conclusão do cálculo.</p>
                            <button type="button" className="mt-2 font-semibold underline" onClick={() =>
                                update('pensionRetroEntries', (state.pensionRetroEntries ?? []).filter(entry => !emptyRetroDraftIds.includes(entry.id)))
                            }>Descartar competência vazia</button>
                        </> : <>
                            <p className="mt-1">{calculationPending.message}</p>
                            <p className="mt-2">Revise os dados da competência anterior na seção de verbas retroativas. Seus dados foram mantidos.</p>
                            <a href="#pension-retro-form" className="mt-2 inline-block font-semibold underline">Revisar contribuição de verbas retroativas</a>
                        </>}
                        <ul className="mt-2 list-disc pl-5">
                            {state.rubricasExtras.filter(rubrica => calculationPending.rubricaIds.includes(rubrica.id)).map(rubrica =>
                                <li key={rubrica.id}>{rubrica.descricao.trim() || 'Rubrica manual sem descrição'}</li>)}
                        </ul>
                        <p className="mt-2">O resultado final, o salvamento do holerite e a exportação ficam indisponíveis até a apuração ser concluída.</p>
                    </div>}
                    <DynamicPayrollForm
                        step={step}
                        calculationReady={calculationReady}
                        pensionPending={Boolean(calculationPending)}
                        updateMany={updateMany}
                        pensionContexts={pensionContexts}
                        calculationError={calculationError}
                        key={`dynamic-payroll-form-${formKey}`}
                        inputState={state}
                        preserveRestoredGlobals={preserveRestoredGlobals}
                        resultRows={resultRows}
                        state={effectiveState}
                        update={update}
                        updateSubstDays={updateSubstDays}
                        courtConfig={courtConfig}
                        addRubrica={addRubrica}
                        removeRubrica={removeRubrica}
                        updateRubrica={updateRubrica}
                        styles={styles}
                    />
                    <div hidden={step !== 8}>
                    <ObservationsSection
                        state={effectiveState}
                        update={update}
                        styles={styles}
                    />
                    </div>
                    <section id="resultado" tabIndex={-1} aria-label="Resultado da simulação" className="scroll-mt-28 space-y-5" hidden={step !== 9}>
                    <ResultsOverview state={effectiveState} resultRows={resultRows} dailiesResultRows={dailiesResultRows} calculationReady={calculationReady} resultMessage={resultMessage} />
                    {calculationReady ? <ResultsSummary
                        dailiesResultRows={dailiesResultRows}
                        state={effectiveState}
                        resultRows={resultRows}
                        update={update}
                        calculationError={calculationError}
                        courtConfig={courtConfig}
                        styles={styles}
                    /> : <p role={calculationStatus === 'error' ? 'alert' : 'status'} aria-live="polite"
                        className="p-6 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200">
                        {calculationPending ? 'Conclua a apuração previdenciária para apresentar o resultado final.'
                            : (pensionFeedback?.configuration ? 'Aguardando a atualização da Funpresp para concluir o holerite.' : displayCalculationError) || (calculationStatus === 'selection_required' ? resultMessage : 'Calculando os valores do holerite...')}
                    </p>}
                    {!calculationReady && calculationError?.includes('IR-EA') && (
                        <div id="apuracao-ir-ea" className="scroll-mt-20">
                            <IrEaContextSection
                                value={effectiveState.irEaContext}
                                onChange={context => update('irEaContext', context)}
                                styles={styles}
                                error={calculationError}
                                mesFolha={toReferenceMonthIndex(effectiveState.mesRef) ? `${effectiveState.anoRef}-${String(toReferenceMonthIndex(effectiveState.mesRef)).padStart(2, '0')}` : undefined}
                                dependentes={Number(effectiveState.dependentes) || 0}
                                deducaoDependente={courtConfig?.values?.deducao_dep || 189.59}
                            />
                        </div>
                    )}
                    </section>
                </div>

                <div className="mt-6 flex justify-between gap-3">
                    {step > 0 ? <button type="button" onClick={() => changeStep(step - 1)} className="min-h-11 rounded-lg border border-neutral-300 px-5 py-2 font-semibold text-neutral-700 dark:border-neutral-600 dark:text-neutral-100">Voltar</button> : <span />}
                    {step < 9 && <button type="button" onClick={() => changeStep(step + 1)} className="min-h-11 rounded-lg bg-secondary-800 px-5 py-2 font-semibold text-white hover:bg-secondary-900">{step === 8 ? 'Ver resultado' : 'Avançar'}</button>}
                </div>

                </div>
                </div>

                <ActionFooter
                    resultLabel={dailiesResultRows.length > 0 ? 'Total estimado' : 'Líquido do holerite'}
                    errorDetail={pensionFeedback?.configuration ? 'Seus dados estão preservados. A equipe do site precisa atualizar a tabela da Funpresp.' : displayCalculationError}
                    calculationReady={calculationReady}
                    resultMessage={resultMessage}
                    state={effectiveState}
                    onExportPDF={initiateExportPDF}
                    onExportExcel={initiateExportExcel}
                    onSavePayslip={handleSavePayslip}
                    onOpenPayslips={openMyPayslips}
                    savingPayslip={savingPayslip}
                    onClearCalculator={handleClearCalculator}
                />

                <DonationModal
                    isOpen={donationModalOpen && calculationReady}
                    onClose={() => setDonationModalOpen(false)}
                    onDownloadReady={handleDonationComplete}
                    exportType={pendingExportType}
                    countdownSeconds={10}
                />

                <FieldCalculator />
            </div>
        </>
    );
}


