
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { INITIAL_STATE, CalculatorState, Rubrica, CourtConfig } from '../types';
import { getCourtBySlug } from '../services/courtService';

import { getTablesForPeriod } from '../utils/calculations'; // Still needed for some UI helpers like ferias logic or manual checks?
import { exportToPDF, exportToExcel } from '../services/exportService';
import { supabase } from '../lib/supabase';
import { JmuService, IJmuCalculationParams } from '../services/agency/implementations/JmuService';

// Instance of the service (could be memoized or inside hook)
// Moved inside hook for dynamic loading

export const useCalculator = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();

    // Agency State
    const [agency, setAgency] = useState<{ name: string, type: string } | null>(null);
    const [agencyService, setAgencyService] = useState<JmuService | null>(null);
    const [loadingAgency, setLoadingAgency] = useState(true);

    // Initial Load: Identify Agency
    useEffect(() => {
        const loadAgency = async () => {
            setLoadingAgency(true);
            try {
                // 1. Check Slug
                if (!slug) {
                    navigate('/'); // or 404
                    return;
                }

                // 2. Fetch from DB
                const { data, error } = await supabase
                    .from('agencies')
                    .select('name, type, slug')
                    .eq('slug', slug)
                    .single();

                if (error || !data) {
                    console.error("Agency not found:", slug);
                    // navigate('/404'); // Optional
                    return;
                }

                setAgency(data);

                // 3. Instantiate Service Factory
                if (data.slug === 'stm' || data.slug === 'jmu') {
                    setAgencyService(new JmuService());
                } else {
                    // Future: other services
                    console.warn("Service not implemented for slug:", slug);
                }

            } catch (err) {
                console.error(err);
            } finally {
                setLoadingAgency(false);
            }
        };

        loadAgency();
    }, [slug, navigate]);

    const [state, setState] = useState<CalculatorState>(INITIAL_STATE);
    const [courtConfig, setCourtConfig] = useState<CourtConfig | null>(null);
    const [loadingConfig, setLoadingConfig] = useState(true);

    // Estado do Modal de Doação
    const [donationModalOpen, setDonationModalOpen] = useState(false);
    const [pendingExportType, setPendingExportType] = useState<'pdf' | 'excel'>('pdf');

    // Fetch Court Config
    useEffect(() => {
        async function fetchConfig() {
            try {
                if (slug) {
                    const court = await getCourtBySlug(slug);
                    if (court) {
                        setCourtConfig(court.config);
                    }
                }
            } catch (err) {
                console.error("Failed to load court config", err);
            } finally {
                setLoadingConfig(false);
            }
        }
        fetchConfig();
    }, [slug]);

    // Recalculate whenever inputs change or config loads
    useEffect(() => {
        // START: Migration to JmuService
        // 1. Map State to Params
        const params: IJmuCalculationParams = {
            grossSalary: 0, // Ignored by JMU Service which calculates from cargo/padrao
            dependents: state.dependentes,
            discounts: state.emprestimos + state.planoSaude + state.pensao,
            otherDeductions: 0,

            periodo: state.periodo,
            cargo: state.cargo,
            padrao: state.padrao,
            funcao: state.funcao,
            aqTituloPerc: state.aqTituloPerc,
            aqTreinoPerc: state.aqTreinoPerc,
            aqTituloVR: state.aqTituloVR,
            aqTreinoVR: state.aqTreinoVR,
            recebeAbono: state.recebeAbono,
            gratEspecificaTipo: state.gratEspecificaTipo,
            gratEspecificaValor: state.gratEspecificaValor,
            vpni_lei: state.vpni_lei,
            vpni_decisao: state.vpni_decisao,
            ats: state.ats,
            regimePrev: state.regimePrev,
            tabelaPSS: state.tabelaPSS,
            pssSobreFC: state.pssSobreFC,
            incidirPSSGrat: state.incidirPSSGrat,
            funprespAliq: state.funprespAliq,
            funprespFacul: state.funprespFacul,
            auxAlimentacao: state.auxAlimentacao,
            auxPreEscolarQtd: state.auxPreEscolarQtd,
            auxTransporteGasto: state.auxTransporteGasto,
        };

        // 2. Execute Calculation
        if (agencyService) {
            const result = agencyService.calculateTotal(params);

            // 3. Map Result back to State
            setState(prev => {
                const bd = result.breakdown;
                return {
                    ...prev,
                    vencimento: bd.vencimento,
                    gaj: bd.gaj,
                    aqTituloValor: bd.aqTitulo,
                    aqTreinoValor: bd.aqTreino,
                    gratEspecificaValor: bd.gratEspecifica,
                    pssMensal: bd.pssMensal,
                    valFunpresp: bd.valFunpresp || 0,
                    irMensal: bd.irMensal,
                    abonoPermanencia: bd.abonoPermanencia,
                    auxAlimentacao: bd.auxAlimentacao,
                    auxPreEscolarValor: bd.auxPreEscolar,
                    auxTransporteValor: bd.auxTransporte,
                    auxTransporteDesc: bd.auxTransporteDebito,
                    totalBruto: result.netSalary + result.totalDeductions,
                    totalDescontos: result.totalDeductions,
                    liquido: result.netSalary,
                };
            });
        }


    }, [
        agencyService, // Dependency added
        state.periodo, state.cargo, state.padrao, state.funcao,
        state.aqTituloPerc, state.aqTreinoPerc, state.aqTituloVR, state.aqTreinoVR,
        state.recebeAbono, state.gratEspecificaTipo, state.gratEspecificaValor,
        state.vpni_lei, state.vpni_decisao, state.ats,
        state.dependentes, state.regimePrev, state.funprespAliq, state.funprespFacul,
        state.tabelaPSS, state.tabelaIR,
        state.pssSobreFC, state.pssSobreAQTreino, state.incidirPSSGrat,
        state.auxAlimentacao, state.auxPreEscolarQtd, state.auxTransporteGasto,
        state.emprestimos, state.planoSaude, state.pensao,
        courtConfig
    ]);


    const update = useCallback((field: keyof CalculatorState, value: any) => {
        setState(prev => ({ ...prev, [field]: value }));
    }, []);

    const updateSubstDays = useCallback((key: string, days: number) => {
        setState(prev => ({
            ...prev,
            substDias: { ...prev.substDias, [key]: days }
        }));
    }, []);

    const handleCalcFerias = useCallback(() => {
        // Phase 4: Temporarily disabled or needs migration
        // const tables = getTablesForPeriod(state.periodo, courtConfig || undefined);
        // const { totalComFC } = calculateBaseFixa(state, tables.funcoes, tables.salario, tables.valorVR);
        // update('ferias1_3', totalComFC / 3);
    }, [state, courtConfig, update]);

    const handleCalc13Manual = useCallback(() => {
        // Phase 4: Temporarily disabled or needs migration
        // const tables = getTablesForPeriod(state.periodo, courtConfig || undefined);
        // const { baseSemFC, funcaoValor } = calculateBaseFixa(state, tables.funcoes, tables.salario, tables.valorVR);
        // setState(prev => ({
        //     ...prev,
        //     adiant13Venc: baseSemFC / 2,
        //     adiant13FC: funcaoValor / 2
        // }));
    }, [state, courtConfig]);

    const addRubrica = useCallback(() => {
        const newRubrica: Rubrica = {
            id: Math.random().toString(36).substr(2, 9),
            descricao: '',
            valor: 0,
            tipo: 'C'
        };
        setState(prev => ({
            ...prev,
            rubricasExtras: [...prev.rubricasExtras, newRubrica]
        }));
    }, []);

    const removeRubrica = useCallback((id: string) => {
        setState(prev => ({
            ...prev,
            rubricasExtras: prev.rubricasExtras.filter(r => r.id !== id)
        }));
    }, []);

    const updateRubrica = useCallback((id: string, field: keyof Rubrica, value: any) => {
        setState(prev => ({
            ...prev,
            rubricasExtras: prev.rubricasExtras.map(r => r.id === id ? { ...r, [field]: value } : r)
        }));
    }, []);

    const handleTipoCalculoChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        const newTipo = e.target.value;
        let updates: Partial<CalculatorState> = { tipoCalculo: newTipo };

        if (newTipo === 'jan') updates.mesRef = 'JANEIRO';
        if (newTipo === 'jun') updates.mesRef = 'JUNHO';
        if (newTipo === 'nov') updates.mesRef = 'NOVEMBRO';

        // Calculation logic for Ferias/13th temporarily simplified or removed in Phase 4 
        // until we migrate these logics to the Service.

        setState(prev => ({ ...prev, ...updates }));
    }, [state, courtConfig]);

    const resultRows = useMemo(() => {
        const rows: Array<{ label: string; value: number; type: 'C' | 'D' }> = [];
        const isNovoAQ = state.periodo >= 1;

        // Proventos
        if (state.vencimento > 0) rows.push({ label: 'VENCIMENTO-ATIVO EC', value: state.vencimento, type: 'C' });
        if (state.gaj > 0) rows.push({ label: 'GRAT. ATIV. JUD. (GAJ)', value: state.gaj, type: 'C' });

        if (state.gratEspecificaValor > 0) {
            const label = state.gratEspecificaTipo === 'gae' ? 'GRATIFICAÇÃO DE ATIVIDADE EXTERNA (GAE)' : 'GRATIFICAÇÃO DE ATIVIDADE DE SEGURANÇA (GAS)';
            rows.push({ label: label, value: state.gratEspecificaValor, type: 'C' });
        }

        if (state.aqTituloValor > 0) {
            const label = isNovoAQ ? 'AQ TÍTULOS (LEI 15.292)' : 'ADICIONAL QUALIFICAÇÃO (TÍTULO)';
            rows.push({ label, value: state.aqTituloValor, type: 'C' });
        }
        if (state.aqTreinoValor > 0) {
            const label = isNovoAQ ? 'AQ TREINAMENTO (LEI 15.292)' : 'ADICIONAL QUALIFICAÇÃO (TREINAMENTO)';
            rows.push({ label, value: state.aqTreinoValor, type: 'C' });
        }

        if (state.funcao !== '0') {
            const tables = getTablesForPeriod(state.periodo, courtConfig || undefined);
            const valorFC = tables.funcoes[state.funcao] || 0;
            let labelTipo = "FUNÇÃO COMISSIONADA (OPÇÃO)";
            if (state.funcao.startsWith('cj')) labelTipo = "CARGO EM COMISSÃO";
            rows.push({ label: `${labelTipo} - ${state.funcao.toUpperCase()}`, value: valorFC, type: 'C' });
        }

        if (state.substTotal > 0) rows.push({ label: `SUBSTITUIÇÃO DE FUNÇÃO${state.substIsEA ? ' (EA)' : ''}`, value: state.substTotal, type: 'C' });
        if (state.heTotal > 0) rows.push({ label: `SERVIÇO EXTRAORDINÁRIO${state.heIsEA ? ' (EA)' : ''}`, value: state.heTotal, type: 'C' });
        if (state.vpni_lei > 0) rows.push({ label: 'VPNI - LEI 9.527/97', value: state.vpni_lei, type: 'C' });
        if (state.vpni_decisao > 0) rows.push({ label: 'VPNI - DECISÃO JUDICIAL', value: state.vpni_decisao, type: 'C' });
        if (state.ats > 0) rows.push({ label: 'ADICIONAL TEMPO DE SERVIÇO', value: state.ats, type: 'C' });
        if (state.auxAlimentacao > 0) rows.push({ label: 'AUXÍLIO-ALIMENTAÇÃO', value: state.auxAlimentacao, type: 'C' });
        if (state.auxPreEscolarValor > 0) rows.push({ label: 'AUXÍLIO PRÉ-ESCOLAR', value: state.auxPreEscolarValor, type: 'C' });
        if (state.auxTransporteValor > 0) rows.push({ label: 'AUXÍLIO-TRANSPORTE', value: state.auxTransporteValor, type: 'C' });
        if (state.licencaValor > 0) rows.push({ label: 'INDENIZAÇÃO LICENÇA COMPENSATÓRIA', value: state.licencaValor, type: 'C' });
        if (state.abonoPermanencia > 0) rows.push({ label: 'ABONO DE PERMANÊNCIA', value: state.abonoPermanencia, type: 'C' });
        if (state.ferias1_3 > 0) rows.push({ label: 'ADICIONAL 1/3 FÉRIAS', value: state.ferias1_3, type: 'C' });

        if (state.tipoCalculo === 'nov') {
            if (state.gratNatalinaTotal && state.gratNatalinaTotal > 0) {
                rows.push({ label: 'GRATIFICAÇÃO NATALINA-ATIVO EC', value: state.gratNatalinaTotal, type: 'C' });
            }
            if (state.abonoPerm13 && state.abonoPerm13 > 0) {
                rows.push({ label: 'ABONO DE PERMANÊNCIA-GN (13º) EC 41/2003 ATIVO EC', value: state.abonoPerm13, type: 'C' });
            }
            if (state.adiant13Venc > 0) {
                rows.push({ label: 'GRATIFICAÇÃO NATALINA-ADIANT. ATIVO EC', value: state.adiant13Venc, type: 'D' });
            }
            if (state.adiant13FC > 0) {
                rows.push({ label: 'GRATIFICAÇÃO NATALINA-ADIANT. FC/CJ ATIVO EC', value: state.adiant13FC, type: 'D' });
            }
        } else {
            if (state.adiant13Venc > 0) rows.push({ label: 'GRATIFICAÇÃO NATALINA-ADIANT. ATIVO EC', value: state.adiant13Venc, type: 'C' });
            if (state.adiant13FC > 0) rows.push({ label: 'GRATIFICAÇÃO NATALINA-ADIANT. FC/CJ ATIVO EC', value: state.adiant13FC, type: 'C' });
        }

        // Descontos
        if (state.pssMensal > 0) rows.push({ label: 'CONTRIBUIÇÃO RPPS (PSS)', value: state.pssMensal, type: 'D' });
        if (state.valFunpresp > 0) rows.push({ label: 'FUNPRESP-JUD', value: state.valFunpresp, type: 'D' });
        if (state.irMensal > 0) rows.push({ label: 'IMPOSTO DE RENDA-EC', value: state.irMensal, type: 'D' });
        if (state.irEA > 0) rows.push({ label: 'IMPOSTO DE RENDA-EA', value: state.irEA, type: 'D' });
        if (state.irFerias > 0) rows.push({ label: 'IMPOSTO DE RENDA (FÉRIAS)', value: state.irFerias, type: 'D' });
        if (state.feriasDesc && state.feriasDesc > 0) rows.push({ label: 'ADICIONAL 1/3 DE FÉRIAS (ANTECIPADO)', value: state.feriasDesc, type: 'D' });
        if (state.pss13 && state.pss13 > 0) rows.push({ label: 'CONTRIBUIÇÃO RPPS-GN(13º) ATIVO EC', value: state.pss13, type: 'D' });
        if (state.ir13 && state.ir13 > 0) rows.push({ label: 'IMPOSTO DE RENDA-GN(13º) EC', value: state.ir13, type: 'D' });
        if (state.auxTransporteDesc > 0) rows.push({ label: 'COTA-PARTE AUXÍLIO-TRANSPORTE', value: state.auxTransporteDesc, type: 'D' });
        if (state.emprestimos > 0) rows.push({ label: 'CONSIGNAÇÕES / EMPRÉSTIMOS', value: state.emprestimos, type: 'D' });
        if (state.planoSaude > 0) rows.push({ label: 'PLANO DE SAÚDE', value: state.planoSaude, type: 'D' });
        if (state.pensao > 0) rows.push({ label: 'PENSÃO ALIMENTÍCIA', value: state.pensao, type: 'D' });

        // Diárias/Indenizações
        if (state.diariasBruto > 0) rows.push({ label: 'DIÁRIAS', value: state.diariasBruto, type: 'C' });
        if (state.diariasDescAlim > 0) rows.push({ label: 'RESTITUIÇÃO AUX. ALIM. (DIÁRIAS)', value: state.diariasDescAlim, type: 'D' });
        if (state.diariasDescTransp > 0) rows.push({ label: 'RESTITUIÇÃO AUX. TRANSP. (DIÁRIAS)', value: state.diariasDescTransp, type: 'D' });

        const glosaEst = state.diariasBruto - state.diariasValorTotal - state.diariasDescAlim - state.diariasDescTransp;
        if (glosaEst > 0.01) rows.push({ label: 'ABATIMENTO BENEF. EXTERNO (ART. 4)', value: glosaEst, type: 'D' });

        state.rubricasExtras.forEach(r => {
            if (r.valor > 0 && r.descricao) {
                rows.push({ label: r.descricao.toUpperCase(), value: r.valor, type: r.tipo });
            }
        });

        return rows;
    }, [state, courtConfig]);

    const initiateExportPDF = () => {
        setPendingExportType('pdf');
        setDonationModalOpen(true);
    };

    const initiateExportExcel = () => {
        setPendingExportType('excel');
        setDonationModalOpen(true);
    };

    const handleDonationComplete = () => {
        if (pendingExportType === 'pdf') {
            exportToPDF(state, resultRows, courtConfig);
        } else {
            exportToExcel(state, resultRows, courtConfig);
        }
    };

    return {
        state,
        update,
        courtConfig,
        loadingConfig,
        resultRows,
        donationModalOpen,
        setDonationModalOpen,
        handleDonationComplete,
        initiateExportPDF,
        initiateExportExcel,
        updateSubstDays,
        handleCalcFerias,
        handleCalc13Manual,
        addRubrica,
        removeRubrica,
        updateRubrica,
        handleTipoCalculoChange,
        navigate,
        pendingExportType,
        setState,
        agencyName: agency?.name || 'Carregando...',
        loadingAgency
    };
};
