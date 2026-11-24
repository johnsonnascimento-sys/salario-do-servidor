import { getPensionErrorFeedback } from '../utils/pensionFeedback';
import { commissionAuditRows } from '../utils/commissionPresentation';
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronDown, AlertCircle, List } from 'lucide-react';
import { useCalculator } from '../hooks/useCalculator';
import { styles } from '../components/Calculator/styles';
import { GlobalSettings } from '../components/Calculator/GlobalSettings';
import { CalculatorHeader } from '../components/Calculator/CalculatorHeader';
import { CalculatorStepHeader } from '../components/Calculator/CalculatorStepHeader';
import { DynamicPayrollForm } from '../components/Calculator/DynamicPayrollForm';
import { ObservationsSection } from '../components/Calculator/ObservationsSection';
import { ResultsSummary } from '../components/Calculator/ResultsSummary';
import { ResultsOverview } from '../components/Calculator/ResultsOverview';
import { CalculatorNavigation } from '../components/Calculator/CalculatorNavigation';
import { CALCULATOR_SECTIONS, CALCULATOR_STEP } from '../components/Calculator/calculatorSections';
import type { CalculatorSearchDestination } from '../components/Calculator/calculatorSearchIndex';
import { calculatorTargetClass, useCalculatorTargetFocus } from '../components/Calculator/hooks/useCalculatorTargetFocus';
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
    const hasHistoricalRubrics = effectiveState.rubricasExtras.some(rubrica => Number(rubrica.valor) > 0 &&
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
    const [step, setStep] = useState<number>(CALCULATOR_STEP.competence);
    const [mobileStepsOpen, setMobileStepsOpen] = useState(false);
    const mobileStepsTrigger = useRef<HTMLButtonElement | null>(null);
    const [searchDestination, setSearchDestination] = useState<CalculatorSearchDestination | null>(null);
    const stepHeadingRef = useRef<HTMLHeadingElement>(null);
    const focusSearchTarget = useCalculatorTargetFocus();
    const initialScrollDone = useRef(false);

    const mobileStepsTriggerProps = {
        'aria-haspopup': 'dialog' as const,
        'aria-expanded': mobileStepsOpen,
        'aria-controls': mobileStepsOpen ? 'calculator-mobile-navigation' : undefined,
        onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
            mobileStepsTrigger.current = event.currentTarget;
            setMobileStepsOpen(true);
        }
    };

    const closeMobileSteps = useCallback((restoreFocus = true) => {
        setMobileStepsOpen(false);
        if (restoreFocus) mobileStepsTrigger.current?.focus({ preventScroll: true });
    }, []);

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
        setSearchDestination(null);
        setStep(nextStep);
        window.requestAnimationFrame(() => {
            stepHeadingRef.current?.focus({ preventScroll: true });
            window.scrollTo({ top: 0, behavior: 'instant' });
        });
    };

    const selectSearchResult = (destination: CalculatorSearchDestination) => {
        setStep(destination.step);
        setSearchDestination({ ...destination });
    };

    const focusSearchFallback = useCallback(() => { focusSearchTarget(stepHeadingRef.current); }, [focusSearchTarget]);

    useLayoutEffect(() => {
        if (searchDestination?.step !== step) return;
        if (searchDestination.kind !== 'preset') {
            const target = searchDestination.kind === 'element' ? document.getElementById(searchDestination.elementId) : null;
            if (target instanceof HTMLDetailsElement) target.open = true;
            if (!focusSearchTarget(target)) focusSearchFallback();
        }
        setSearchDestination(null);
    }, [searchDestination, step, focusSearchTarget, focusSearchFallback]);

    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash;
            setSearchDestination(null);
            if (hash === '#resultado' || hash === '#detalhamento' || hash === '#apuracao-ir-ea' || hash === '#memoria-ir-ea') setStep(CALCULATOR_STEP.result);
            else if (hash === '#funpresp-settings' || hash === '#pension-retro-form') setStep(CALCULATOR_STEP.pension);
            else if (hash === '#dependentes-ir') setStep(CALCULATOR_STEP.incomeTax);
            else if (hash === '#verbas' || hash === '#manual-rubricas-section') setStep(CALCULATOR_STEP.credits);
            else if (hash === '#descontos') setStep(CALCULATOR_STEP.discounts);
            else if (hash === '#observacoes') setStep(CALCULATOR_STEP.notes);
            else if (hash === '#remuneracao') setStep(CALCULATOR_STEP.basic);
            else if (hash === '#competencia') setStep(CALCULATOR_STEP.competence);
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
    const commissionStatus = state.commissionProfile && calculationError
        ? /ainda não habilitada para o órgão/i.test(calculationError) ? 'Vínculo ainda não habilitado neste órgão'
            : /(?:sem regra e fonte|vigência e fonte).*competência/i.test(calculationError) ? 'Regra indisponível para a competência'
                : undefined
        : undefined;
    const resultMessage = calculationStatus === 'pension_pending' ? 'Apuração pendente'
        : calculationStatus === 'selection_required' ? 'Revise a participação previdenciária'
            : calculationStatus === 'error' ? (commissionStatus || (pensionFeedback?.configuration ? 'Funpresp em atualização' : pensionFeedback?.title || 'Cálculo indisponível')) : 'Calculando...';

    const loading = loadingConfig || loadingAgency;
    const unavailable = agencyError || configError || !courtConfig;
    const header = <CalculatorHeader agencyName={loadingAgency || agencyError ? undefined : agencyName}
        courtConfig={courtConfig} onSelectSearchResult={selectSearchResult} />;
    if (loading || unavailable || !courtConfig || restoreError || !restoreReady) {
        const message = loading ? 'Carregando…' : unavailable
            ? agencyError || configError || 'Configuração indisponível.'
            : restoreError || 'Carregando holerite salvo…';
        return (
            <div className="calculator-workspace calculator-shell">
                {header}
                <div className="flex min-h-[45dvh] items-center justify-center p-6 text-center">
                    <p role={!loading && (unavailable || restoreError) ? 'alert' : 'status'} className="text-neutral-600 dark:text-neutral-300">{message}</p>
                </div>
            </div>
        );
    }

    const currentSection = CALCULATOR_SECTIONS[step];
    const stepDescription = courtConfig.transportIndemnity?.enabled
        ? currentSection.descriptionWithTransportIndemnity ?? currentSection.description
        : currentSection.description;
    const reviewPendingAssessment = () => selectSearchResult({
        kind: 'element', step: CALCULATOR_STEP.pension, elementId: 'pension-retro-form'
    });
    const pendingActionClass = step === CALCULATOR_STEP.result
        ? 'min-h-11 rounded-lg bg-secondary-800 px-4 font-semibold text-white hover:bg-secondary-900'
        : 'min-h-11 font-semibold underline underline-offset-4';
    const pendingAction = onlyEmptyRetroDrafts
        ? <button type="button" className={pendingActionClass} onClick={() =>
            update('pensionRetroEntries', (state.pensionRetroEntries ?? []).filter(entry => !emptyRetroDraftIds.includes(entry.id)))
        }>Descartar competência vazia</button>
        : <button type="button" className={pendingActionClass}
            onClick={reviewPendingAssessment}>Revisar apuração</button>;
    const pendingRubrics = calculationPending
        ? state.rubricasExtras.filter(rubrica => calculationPending.rubricaIds.includes(rubrica.id))
        : [];

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

            <div className="calculator-workspace calculator-shell flex flex-col" style={{ '--calculator-bar-height': `${barHeight}px` } as React.CSSProperties}>
                {header}
                <div className="flex flex-1 flex-col min-[960px]:flex-row">
                <CalculatorNavigation step={step} onChange={changeStep} mobileOpen={mobileStepsOpen} onCloseMobile={closeMobileSteps} />
                <div data-calculator-content className="min-w-0 flex-1 px-4 pb-[calc(var(--calculator-bar-height)_+_4.5rem)] pt-3 sm:px-6 min-[960px]:px-8 min-[960px]:pb-6 min-[960px]:pt-5">
                <CalculatorStepHeader
                    title={currentSection.label}
                    description={stepDescription}
                    headingRef={stepHeadingRef}
                    mobileStep={`Etapa ${step + 1} de ${CALCULATOR_SECTIONS.length}`}
                    mobileAction={<button type="button" aria-label="Abrir etapas da simulação" {...mobileStepsTriggerProps}
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-secondary-100 text-secondary-800 dark:bg-secondary-950 dark:text-secondary-200 min-[960px]:hidden">
                        <ChevronDown size={20} aria-hidden="true" />
                    </button>}
                />
                {(saveFeedback || exportError) && <div role="status" aria-live="polite" className="mb-6 flex items-start justify-between gap-4 rounded-xl border border-secondary-300 bg-secondary-50 p-4 text-body text-secondary-900 dark:bg-secondary-950 dark:text-secondary-100">
                    <p>{exportError || saveFeedback}</p>
                    {!exportError && <button type="button" aria-label="Fechar mensagem" className="min-h-11 shrink-0 px-2 font-semibold" onClick={() => setSaveFeedback('')}>Fechar</button>}
                </div>}
                <div className="space-y-5">
                    <section id="competencia" tabIndex={-1} aria-label="Competência" className={calculatorTargetClass} hidden={step !== CALCULATOR_STEP.competence}>
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
                    {calculationPending && step !== CALCULATOR_STEP.result && <div id="calculator-pension-pending" className="flex flex-wrap items-center justify-between gap-x-4 rounded-lg border border-warning-300 bg-warning-50 px-3 py-1 text-body-sm text-warning-800 dark:border-warning-800 dark:bg-warning-900/20 dark:text-warning-200">
                        <p className="flex items-center gap-2" role="status">
                            <AlertCircle size={16} className="shrink-0" aria-hidden="true" />
                            {onlyEmptyRetroDrafts ? 'Há uma competência anterior vazia.' : 'A apuração previdenciária precisa de revisão.'}
                        </p>
                        {pendingAction}
                    </div>}
                    <DynamicPayrollForm
                        step={step}
                        presetSearchDestination={searchDestination?.kind === 'preset' && searchDestination.step === step ? searchDestination : null}
                        onSearchFallback={focusSearchFallback}
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
                    <div hidden={step !== CALCULATOR_STEP.notes}>
                    <ObservationsSection
                        state={effectiveState}
                        update={update}
                        styles={styles}
                    />
                    </div>
                    <section id="resultado" tabIndex={-1} aria-label="Resultado da simulação" className="scroll-mt-28 space-y-5" hidden={step !== CALCULATOR_STEP.result}>
                    {calculationPending ? <div id="calculator-pension-pending" className="divide-y divide-warning-200 overflow-hidden rounded-xl border border-warning-300 dark:divide-warning-800 dark:border-warning-800">
                        <div role="status" className="flex items-center gap-3 bg-warning-50 px-4 py-4 text-warning-800 dark:bg-warning-900/30 dark:text-warning-200">
                            <AlertCircle size={22} className="shrink-0" aria-hidden="true" />
                            <h3 className="text-h5 font-bold">Apuração pendente</h3>
                        </div>
                        <div className="space-y-3 bg-white px-4 py-4 text-body dark:bg-neutral-800 sm:px-6">
                            <p>{onlyEmptyRetroDrafts
                                ? 'Há uma competência anterior vazia no rascunho, sem verba retroativa vinculada.'
                                : calculationPending.message.replace(/^Apuração pendente\s*(\([^)]+\))?:\s*(.)/i, (_, competence: string | undefined, first: string) =>
                                    (competence ? `${competence.slice(1, -1)} · ` : '') + first.toLocaleUpperCase('pt-BR'))}</p>
                            {pendingRubrics.length > 0 && <ul aria-label="Rubricas a revisar" className="list-disc space-y-1 break-words pl-5 font-semibold">
                                {pendingRubrics.map(rubrica => <li key={rubrica.id}>{rubrica.descricao.trim() || 'Rubrica manual sem descrição'}</li>)}
                            </ul>}
                            <div className="text-secondary-800 dark:text-secondary-300">{pendingAction}</div>
                            <p className="text-body-sm text-neutral-600 dark:text-neutral-300">Salvar e exportar ficam disponíveis após a revisão.</p>
                        </div>
                    </div> : <ResultsOverview state={effectiveState} resultRows={resultRows} dailiesResultRows={dailiesResultRows} calculationReady={calculationReady} resultMessage={resultMessage} />}
                    {calculationReady ? <ResultsSummary
                        dailiesResultRows={dailiesResultRows}
                        state={effectiveState}
                        resultRows={resultRows}
                        update={update}
                        calculationError={calculationError}
                        courtConfig={courtConfig}
                        styles={styles}
                    /> : !calculationPending && <p role={calculationStatus === 'error' ? 'alert' : 'status'} aria-live="polite"
                        className="p-6 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200">
                        {(pensionFeedback?.configuration ? 'Aguardando a atualização da Funpresp para concluir o holerite.' : displayCalculationError) || (calculationStatus === 'selection_required' ? resultMessage : 'Calculando os valores do holerite...')}
                    </p>}
                    {calculationReady && effectiveState.commissionMemory && <details className="mt-4 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
                        <summary className="cursor-pointer font-semibold">Memória do vínculo, CJ/FC e tributos</summary>
                        <dl className="mt-3 divide-y divide-neutral-200 text-body-sm dark:divide-neutral-700">
                            {commissionAuditRows(effectiveState).map(([label, value], index) => <div key={`${label}-${index}`} className="flex flex-wrap justify-between gap-2 py-2">
                                <dt>{label}</dt><dd className="break-all text-right">{value.startsWith('https://') ? <a href={value} className="underline" target="_blank" rel="noreferrer">Consultar fonte</a> : value}</dd>
                            </div>)}
                        </dl>
                    </details>}
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
                    {step > CALCULATOR_STEP.competence ? <button type="button" onClick={() => changeStep(step - 1)} className="min-h-11 rounded-lg border border-neutral-300 px-5 py-2 font-semibold text-neutral-700 dark:border-neutral-600 dark:text-neutral-100">Voltar</button> : <span />}
                    {step < CALCULATOR_STEP.result && <button type="button" onClick={() => changeStep(step + 1)} className="min-h-11 rounded-lg bg-secondary-800 px-5 py-2 font-semibold text-white hover:bg-secondary-900">{step === CALCULATOR_STEP.notes ? 'Ver resultado' : 'Avançar'}</button>}
                </div>

                </div>
                </div>

                <button type="button" {...mobileStepsTriggerProps}
                    className="fixed bottom-[calc(var(--calculator-bar-height)_+_0.75rem)] right-4 z-40 inline-flex min-h-11 items-center gap-2 rounded-full border border-secondary-700 bg-secondary-800 px-4 text-body-sm font-semibold text-white shadow-lg hover:bg-secondary-900 dark:border-secondary-400 min-[960px]:hidden">
                    <List size={18} aria-hidden="true" />
                    Etapas
                </button>

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


