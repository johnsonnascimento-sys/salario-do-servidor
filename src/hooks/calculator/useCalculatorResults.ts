/**
 * Hook de Resultados - Calculadora
 *
 * Responsavel por:
 * - Execucao de calculos via agencyService
 * - Geracao de estado calculado derivado
 * - Geracao de rows para exibicao (resultRows)
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { CalculatorState, CalculatedPayrollState, CourtConfig, OvertimeEntry, SubstitutionEntry } from '../../types';
import { AgencyCalculationEngine } from '../../services/agency/engine/AgencyCalculationEngine';
import { mapStateToAgencyParams } from '../../services/agency/adapters/stateToParams';
import { getTablesForPeriod } from '../../utils/calculations';
import { resolveDailiesEmbarkationAdditional } from '../../utils/dailiesRules';
import { getEmptyCalculatedPayrollState } from '../../utils/calculatorState';

const mergeEffectiveState = (state: CalculatorState, calculatedState: CalculatedPayrollState): CalculatorState => (
    { ...state, ...calculatedState } as CalculatorState
);

export const useCalculatorResults = (
    state: CalculatorState,
    agencyService: AgencyCalculationEngine | null,
    courtConfig: CourtConfig | null,
    agency: { name: string; type: string; slug: string } | null
) => {
    const latestRequestRef = useRef(0);
    const [calculatedState, setCalculatedState] = useState<CalculatedPayrollState>(() => getEmptyCalculatedPayrollState());

    useEffect(() => {
        if (!agencyService) {
            setCalculatedState(getEmptyCalculatedPayrollState());
            return;
        }

        let cancelled = false;
        const requestId = latestRequestRef.current + 1;
        latestRequestRef.current = requestId;

        (async () => {
            try {
                const orgSlug = agency?.slug || 'jmu';
                const params = mapStateToAgencyParams(state, orgSlug, courtConfig || undefined);
                const result = await agencyService.calculateTotal(params);

                if (cancelled || requestId !== latestRequestRef.current) {
                    return;
                }

                const bd = result.breakdown;
                setCalculatedState({
                    vencimento: bd.vencimento || 0,
                    gaj: bd.gaj || 0,
                    aqTituloValor: bd.aqTitulo || 0,
                    aqTreinoValor: bd.aqTreino || 0,
                    gratEspecificaValor: bd.gratEspecifica || 0,
                    pssMensal: bd.pss || 0,
                    pssEA: bd.pssEA || 0,
                    valFunpresp: bd.funpresp || 0,
                    irMensal: bd.irrf || 0,
                    irEA: bd.irEA || 0,
                    aqIr: bd.aqIr || 0,
                    aqPss: bd.aqPss || 0,
                    gratIr: bd.gratIr || 0,
                    gratPss: bd.gratPss || 0,
                    vantagensIr: bd.vantagensIr || 0,
                    vantagensPss: bd.vantagensPss || 0,
                    abonoIr: bd.abonoIr || 0,
                    abonoPermanencia: bd.abono || 0,
                    auxPreEscolarValor: bd.auxPreEscolar || 0,
                    auxTransporteValor: bd.auxTransporte || 0,
                    auxTransporteDesc: bd.auxTransporteDebito || 0,
                    ferias1_3: bd.feriasConstitucional || 0,
                    feriasDesc: bd.feriasDesconto || 0,
                    irFerias: bd.impostoFerias || 0,
                    gratNatalinaTotal: bd.gratificacaoNatalina || 0,
                    abonoPerm13: bd.abono13 || 0,
                    pss13: bd.pss13 || 0,
                    ir13: bd.imposto13 || 0,
                    debitoPrimeiraParcela13: bd.debitoPrimeiraParcela13 || 0,
                    adiant13Venc: bd.adiant13Venc || 0,
                    adiant13FC: bd.adiant13FC || 0,
                    segunda13Venc: bd.segunda13Venc || 0,
                    segunda13FC: bd.segunda13FC || 0,
                    heVal50: bd.heVal50 || 0,
                    heVal100: bd.heVal100 || 0,
                    heTotal: bd.heTotal || 0,
                    heIr: bd.heIr || 0,
                    heIrMensal: bd.heIrMensal || 0,
                    heIrEA: bd.heIrEA || 0,
                    hePss: bd.hePss || 0,
                    substTotal: bd.substituicao || 0,
                    substIr: bd.substituicaoIr || 0,
                    substIrMensal: bd.substituicaoIrMensal || 0,
                    substIrEA: bd.substituicaoIrEA || 0,
                    substPss: bd.substituicaoPss || 0,
                    diariasValorTotal: bd.diariasValor || 0,
                    diariasBruto: bd.diariasBruto || 0,
                    diariasGlosa: bd.diariasGlosa || 0,
                    diariasCorteLdo: bd.diariasCorteLdo || 0,
                    diariasDescAlim: bd.diariasDescAlim ?? bd.diariasDeducoes ?? 0,
                    diariasDescTransp: bd.diariasDescTransp || 0,
                    diariasDiasDescontoAlimentacaoCalc: bd.diariasDiasDescAlim || 0,
                    diariasDiasDescontoTransporteCalc: bd.diariasDiasDescTransp || 0,
                    licencaValor: bd.licencaCompensatoria || 0,
                    totalBruto: result.netSalary + result.totalDeductions,
                    totalDescontos: result.totalDeductions,
                    liquido: result.netSalary,
                });
            } catch (error) {
                if (cancelled || requestId !== latestRequestRef.current) {
                    return;
                }
                console.error('Erro ao calcular resultados da folha:', error);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [
        agencyService,
        state.periodo, state.cargo, state.padrao, state.funcao,
        state.aqTituloPerc, state.aqTreinoPerc, state.aqTituloVR, state.aqTreinoVR,
        state.recebeAbono, state.gratEspecificaTipo, state.gratEspecificaValor,
        state.vpni_lei, state.vpni_decisao, state.ats,
        state.dependentes, state.regimePrev, state.funprespParticipacao, state.funprespAliq, state.funprespFacul,
        state.tabelaPSS, state.tabelaIR,
        state.pssSobreFC, state.incidirPSSGrat,
        state.auxAlimentacao, state.auxPreEscolarQtd, state.cotaPreEscolar, state.auxTransporteGasto,
        state.emprestimos, state.planoSaude, state.pensao,
        state.rubricasExtras,
        state.tipoCalculo, state.manualFerias, state.ferias1_3, state.feriasAntecipadas,
        state.feriasDesc, state.feriasDescManual,
        state.manualAdiant13, state.adiant13Venc, state.adiant13FC, state.segunda13Venc, state.segunda13FC,
        state.heQtd50, state.heQtd100, state.heIsEA, state.heExcluirIR, state.overtimeEntries, state.substDias, state.substIsEA, state.substPssIsEA, state.substitutionEntries,
        state.diariasQtd, state.diariasEmbarque,
        state.diariasModoDesconto, state.diariasDataInicio, state.diariasDataFim,
        state.diariasDiasDescontoAlimentacao, state.diariasDiasDescontoTransporte,
        state.diariasExtHospedagem, state.diariasExtAlimentacao, state.diariasExtTransporte,
        state.diariasDescontarAlimentacao, state.diariasDescontarTransporte,
        state.licencaDias, state.baseLicenca, state.incluirAbonoLicenca,
        courtConfig,
        agency?.slug
    ]);

    const currentTables = useMemo(() => {
        if (!courtConfig) {
            return null;
        }
        return getTablesForPeriod(state.periodo, courtConfig);
    }, [courtConfig, state.periodo]);

    const effectiveState = useMemo(
        () => mergeEffectiveState(state, calculatedState),
        [state, calculatedState]
    );

    const resultRows = useMemo(() => {
        if (!courtConfig) {
            return [];
        }

        const rows: Array<{ label: string; value: number; type: 'C' | 'D' }> = [];
        const isNovoAQ = effectiveState.periodo >= 1;

        if (effectiveState.vencimento > 0) rows.push({ label: 'VENCIMENTO-ATIVO EC', value: effectiveState.vencimento, type: 'C' });
        if (effectiveState.gaj > 0) rows.push({ label: 'GRAT. ATIV. JUD. (GAJ)', value: effectiveState.gaj, type: 'C' });

        if (effectiveState.gratEspecificaValor > 0) {
            const label = effectiveState.gratEspecificaTipo === 'gae'
                ? 'GRATIFICAÇÃO DE ATIVIDADE EXTERNA (GAE)'
                : 'GRATIFICAÇÃO DE ATIVIDADE DE SEGURANÇA (GAS)';
            rows.push({ label, value: effectiveState.gratEspecificaValor, type: 'C' });
        }

        if (effectiveState.aqTituloValor > 0) {
            const label = isNovoAQ ? 'AQ TÍTULOS (LEI 15.292)' : 'ADICIONAL QUALIFICAÇÃO (TÍTULO)';
            rows.push({ label, value: effectiveState.aqTituloValor, type: 'C' });
        }
        if (effectiveState.aqTreinoValor > 0) {
            const label = isNovoAQ ? 'AQ TREINAMENTO (LEI 15.292)' : 'ADICIONAL QUALIFICAÇÃO (TREINAMENTO)';
            rows.push({ label, value: effectiveState.aqTreinoValor, type: 'C' });
        }

        const noFunctionCode = courtConfig.careerCatalog?.noFunctionCode;
        if (effectiveState.funcao && effectiveState.funcao !== noFunctionCode && currentTables) {
            const valorFC = currentTables.funcoes[effectiveState.funcao] || 0;
            let labelTipo = 'FUNÇÃO COMISSIONADA (OPÇÃO)';
            if (effectiveState.funcao.startsWith('cj')) labelTipo = 'CARGO EM COMISSÃO';
            rows.push({ label: `${labelTipo} - ${effectiveState.funcao.toUpperCase()}`, value: valorFC, type: 'C' });
        }

        const substitutionEntries: SubstitutionEntry[] = effectiveState.substitutionEntries.length > 0
            ? effectiveState.substitutionEntries
            : [{
                id: 'legacy-subst',
                dias: effectiveState.substDias || {},
                isEA: effectiveState.substIsEA,
                excluirIR: false,
                pssIsEA: effectiveState.substPssIsEA
            }];
        const substitutionTotal = Math.max(0, effectiveState.substTotal || 0);
        const substitutionDaysTotal = substitutionEntries.reduce(
            (acc, entry) => acc + Object.values(entry.dias || {}).reduce((s, d) => s + Math.max(0, Number(d || 0)), 0),
            0
        );
        const substitutionDayValue = substitutionDaysTotal > 0 ? substitutionTotal / substitutionDaysTotal : 0;
        const substitutionMensalTotal = substitutionEntries
            .filter(entry => !entry.isEA && !entry.excluirIR)
            .reduce((acc, entry) => acc + Object.values(entry.dias || {}).reduce((s, d) => s + Math.max(0, Number(d || 0)), 0) * substitutionDayValue, 0);
        const substitutionEaTotal = substitutionEntries
            .filter(entry => entry.isEA && !entry.excluirIR)
            .reduce((acc, entry) => acc + Object.values(entry.dias || {}).reduce((s, d) => s + Math.max(0, Number(d || 0)), 0) * substitutionDayValue, 0);
        const substitutionExcluidoTotal = substitutionEntries
            .filter(entry => entry.excluirIR)
            .reduce((acc, entry) => acc + Object.values(entry.dias || {}).reduce((s, d) => s + Math.max(0, Number(d || 0)), 0) * substitutionDayValue, 0);

        if (substitutionMensalTotal > 0) rows.push({ label: 'SUBSTITUIÇÃO DE FUNÇÃO (IR MENSAL)', value: substitutionMensalTotal, type: 'C' });
        if (substitutionEaTotal > 0) rows.push({ label: 'SUBSTITUIÇÃO DE FUNÇÃO (IR EA)', value: substitutionEaTotal, type: 'C' });
        if (substitutionExcluidoTotal > 0) rows.push({ label: 'SUBSTITUIÇÃO DE FUNÇÃO (EXCLUÍDO IR)', value: substitutionExcluidoTotal, type: 'C' });

        const overtimeEntries: OvertimeEntry[] = effectiveState.overtimeEntries.length > 0
            ? effectiveState.overtimeEntries
            : [{
                id: 'legacy-he',
                qtd50: effectiveState.heQtd50 || 0,
                qtd100: effectiveState.heQtd100 || 0,
                isEA: effectiveState.heIsEA,
                excluirIR: effectiveState.heExcluirIR,
                usarSubstituicaoFuncao: false
            }];
        const overtimeDivisor = courtConfig.payrollRules?.overtimeMonthHours || 175;
        const baseOvertime = effectiveState.vencimento + effectiveState.gaj + effectiveState.aqTituloValor + effectiveState.aqTreinoValor +
            effectiveState.gratEspecificaValor + effectiveState.vpni_lei + effectiveState.vpni_decisao + effectiveState.ats + effectiveState.abonoPermanencia;
        const calcEntryOvertimeTotal = (entry: OvertimeEntry) => {
            const resolveFuncValue = (funcKey?: string) => {
                if (!funcKey || funcKey === noFunctionCode || !currentTables) return 0;
                return currentTables.funcoes[funcKey] || 0;
            };
            const calcSegment = (funcKey: string | undefined, qtd50: number, qtd100: number) => {
                const valorHora = overtimeDivisor > 0 ? (baseOvertime + resolveFuncValue(funcKey)) / overtimeDivisor : 0;
                return (valorHora * 1.5 * Math.max(0, qtd50 || 0)) + (valorHora * 2 * Math.max(0, qtd100 || 0));
            };

            let total = calcSegment(effectiveState.funcao, entry.qtd50 || 0, entry.qtd100 || 0);
            if (entry.usarSubstituicaoFuncao && entry.horasPorFuncao) {
                total += Object.entries(entry.horasPorFuncao as Record<string, { qtd50: number; qtd100: number }>).reduce((acc, [funcKey, horas]) => (
                    acc + calcSegment(funcKey, Number(horas?.qtd50 || 0), Number(horas?.qtd100 || 0))
                ), 0);
            }
            return total;
        };

        const heMensalTotal = overtimeEntries
            .filter(entry => !entry.isEA && !entry.excluirIR)
            .reduce((acc, entry) => acc + calcEntryOvertimeTotal(entry), 0);
        const heEaTotal = overtimeEntries
            .filter(entry => entry.isEA && !entry.excluirIR)
            .reduce((acc, entry) => acc + calcEntryOvertimeTotal(entry), 0);
        const heExcluidoTotal = overtimeEntries
            .filter(entry => entry.excluirIR)
            .reduce((acc, entry) => acc + calcEntryOvertimeTotal(entry), 0);

        if (heMensalTotal > 0) rows.push({ label: 'SERVIÇO EXTRAORDINÁRIO (IR MENSAL)', value: heMensalTotal, type: 'C' });
        if (heEaTotal > 0) rows.push({ label: 'SERVIÇO EXTRAORDINÁRIO (IR EA)', value: heEaTotal, type: 'C' });
        if (heExcluidoTotal > 0) rows.push({ label: 'SERVIÇO EXTRAORDINÁRIO (EXCLUÍDO IR)', value: heExcluidoTotal, type: 'C' });

        if (effectiveState.vpni_lei > 0) rows.push({ label: 'VPNI - LEI 9.527/97', value: effectiveState.vpni_lei, type: 'C' });
        if (effectiveState.vpni_decisao > 0) rows.push({ label: 'VPNI - DECISÃO JUDICIAL', value: effectiveState.vpni_decisao, type: 'C' });
        if (effectiveState.ats > 0) rows.push({ label: 'ADICIONAL TEMPO DE SERVIÇO', value: effectiveState.ats, type: 'C' });

        if (effectiveState.auxAlimentacao > 0) {
            rows.push({
                label: effectiveState.auxAlimentacaoProporcional && effectiveState.auxAlimentacaoDetalhe
                    ? effectiveState.auxAlimentacaoDetalhe
                    : 'AUXILIO-ALIMENTACAO',
                value: effectiveState.auxAlimentacao,
                type: 'C'
            });
        }

        if (effectiveState.auxPreEscolarValor > 0) rows.push({ label: 'AUXÍLIO PRÉ-ESCOLAR', value: effectiveState.auxPreEscolarValor, type: 'C' });
        if (effectiveState.auxTransporteValor > 0) rows.push({ label: 'AUXÍLIO-TRANSPORTE', value: effectiveState.auxTransporteValor, type: 'C' });
        if (effectiveState.licencaValor > 0) rows.push({ label: 'INDENIZAÇÃO LICENÇA COMPENSATÓRIA', value: effectiveState.licencaValor, type: 'C' });
        if (effectiveState.abonoPermanencia > 0) rows.push({ label: 'ABONO DE PERMANÊNCIA', value: effectiveState.abonoPermanencia, type: 'C' });
        if (effectiveState.ferias1_3 > 0) rows.push({ label: 'ADICIONAL 1/3 FÉRIAS', value: effectiveState.ferias1_3, type: 'C' });

        if (effectiveState.adiant13Venc > 0) rows.push({ label: 'GRATIFICACAO NATALINA-ADIANT. 1a PARCELA ATIVO EC', value: effectiveState.adiant13Venc, type: 'C' });
        if (effectiveState.adiant13FC > 0) rows.push({ label: 'GRATIFICACAO NATALINA-ADIANT. 1a PARCELA FC/CJ ATIVO EC', value: effectiveState.adiant13FC, type: 'C' });
        if (effectiveState.segunda13Venc > 0) rows.push({ label: 'GRATIFICACAO NATALINA-2a PARCELA ATIVO EC', value: effectiveState.segunda13Venc, type: 'C' });
        if (effectiveState.segunda13FC > 0) rows.push({ label: 'GRATIFICACAO NATALINA-2a PARCELA FC/CJ ATIVO EC', value: effectiveState.segunda13FC, type: 'C' });
        if (effectiveState.abonoPerm13 && effectiveState.abonoPerm13 > 0) {
            rows.push({ label: 'ABONO DE PERMANENCIA-GN (13o) EC 41/2003 ATIVO EC', value: effectiveState.abonoPerm13, type: 'C' });
        }

        if (effectiveState.pssMensal > 0) rows.push({ label: 'CONTRIBUIÇÃO RPPS (PSS)', value: effectiveState.pssMensal, type: 'D' });
        if (effectiveState.pssEA > 0) rows.push({ label: 'CONTRIBUIÇÃO RPPS-EA', value: effectiveState.pssEA, type: 'D' });
        if (effectiveState.valFunpresp > 0) rows.push({ label: 'FUNPRESP-JUD', value: effectiveState.valFunpresp, type: 'D' });
        const heIrMensal = Math.max(0, effectiveState.heIrMensal || 0);
        const heIrEA = Math.max(0, effectiveState.heIrEA || 0);
        const substIrMensal = Math.max(0, effectiveState.substIrMensal || 0);
        const substIrEA = Math.max(0, effectiveState.substIrEA || 0);
        const irMensalOutrasRubricas = Math.max(0, (effectiveState.irMensal || 0) - heIrMensal - substIrMensal);
        if (irMensalOutrasRubricas > 0) rows.push({ label: 'IMPOSTO DE RENDA-EC (DEMAIS RUBRICAS)', value: irMensalOutrasRubricas, type: 'D' });
        if (heIrMensal > 0) rows.push({ label: 'IMPOSTO DE RENDA-EC (HORA EXTRA)', value: heIrMensal, type: 'D' });
        if (substIrMensal > 0) rows.push({ label: 'IMPOSTO DE RENDA-EC (SUBSTITUIÇÃO)', value: substIrMensal, type: 'D' });
        if (heIrEA > 0) rows.push({ label: 'IMPOSTO DE RENDA-EA (HORA EXTRA)', value: heIrEA, type: 'D' });
        if (substIrEA > 0) rows.push({ label: 'IMPOSTO DE RENDA-EA (SUBSTITUIÇÃO)', value: substIrEA, type: 'D' });

        const irEaTotal = Math.max(0, effectiveState.irEA || 0);
        const irEaRestanteParaRubricas = Math.max(0, irEaTotal - heIrEA - substIrEA);
        const rubricasManuaisEA = effectiveState.rubricasExtras
            .filter(r => r.isEA && Number(r.valor) > 0)
            .map((r, index) => ({
                id: r.id,
                descricao: (r.descricao || '').trim() || `RUBRICA MANUAL ${index + 1}`,
                base: r.tipo === 'D' ? -Number(r.valor) : Number(r.valor)
            }))
            .filter(r => r.base > 0);

        const totalBaseRubricasEA = rubricasManuaisEA.reduce((acc, item) => acc + item.base, 0);
        if (irEaRestanteParaRubricas > 0 && totalBaseRubricasEA > 0) {
            let alocado = 0;
            rubricasManuaisEA.forEach((item, index) => {
                const isLast = index === rubricasManuaisEA.length - 1;
                const valor = isLast
                    ? Math.max(0, Math.round((irEaRestanteParaRubricas - alocado) * 100) / 100)
                    : Math.max(0, Math.round((irEaRestanteParaRubricas * (item.base / totalBaseRubricasEA)) * 100) / 100);
                alocado += valor;
                if (valor > 0) {
                    rows.push({
                        label: `IMPOSTO DE RENDA-EA (${item.descricao.toUpperCase()})`,
                        value: valor,
                        type: 'D'
                    });
                }
            });
        }

        if (effectiveState.irFerias > 0) rows.push({ label: 'IMPOSTO DE RENDA (FÉRIAS)', value: effectiveState.irFerias, type: 'D' });
        if (effectiveState.feriasDesc && effectiveState.feriasDesc > 0) rows.push({ label: 'ADICIONAL 1/3 DE FÉRIAS (ANTECIPADO)', value: effectiveState.feriasDesc, type: 'D' });
        if (effectiveState.pss13 && effectiveState.pss13 > 0) rows.push({ label: 'CONTRIBUIÇÃO RPPS-GN(13º) ATIVO EC', value: effectiveState.pss13, type: 'D' });
        if (effectiveState.ir13 && effectiveState.ir13 > 0) rows.push({ label: 'IMPOSTO DE RENDA-GN(13º) EC', value: effectiveState.ir13, type: 'D' });
        if (effectiveState.debitoPrimeiraParcela13 > 0) rows.push({ label: 'GRATIFICACAO NATALINA-ADIANT. 1a PARCELA (ABATIMENTO)', value: effectiveState.debitoPrimeiraParcela13, type: 'D' });
        if (effectiveState.auxTransporteDesc > 0) rows.push({ label: 'COTA-PARTE AUXÍLIO-TRANSPORTE', value: effectiveState.auxTransporteDesc, type: 'D' });
        if (effectiveState.emprestimos > 0) rows.push({ label: 'CONSIGNAÇÕES / EMPRÉSTIMOS', value: effectiveState.emprestimos, type: 'D' });
        if (effectiveState.planoSaude > 0) rows.push({ label: 'PLANO DE SAÚDE', value: effectiveState.planoSaude, type: 'D' });
        if (effectiveState.pensao > 0) rows.push({ label: 'PENSÃO ALIMENTÍCIA', value: effectiveState.pensao, type: 'D' });

        const diariasAdicionalEmbarque = resolveDailiesEmbarkationAdditional({
            dailiesConfig: courtConfig?.dailies,
            embarkationType: effectiveState.diariasEmbarque
        });
        const diariasSemAdicionalEmbarque = Math.max(0, effectiveState.diariasBruto - diariasAdicionalEmbarque);

        if (diariasSemAdicionalEmbarque > 0) {
            rows.push({ label: 'DIÁRIAS (SEM ADICIONAL DE EMBARQUE)', value: diariasSemAdicionalEmbarque, type: 'C' });
        }
        if (diariasAdicionalEmbarque > 0) {
            rows.push({ label: 'ADICIONAL DE EMBARQUE (DIÁRIAS)', value: diariasAdicionalEmbarque, type: 'C' });
        }
        if (effectiveState.diariasBruto > 0 && diariasSemAdicionalEmbarque <= 0 && diariasAdicionalEmbarque <= 0) {
            rows.push({ label: 'DIÁRIAS', value: effectiveState.diariasBruto, type: 'C' });
        }
        if (effectiveState.diariasCorteLdo > 0) rows.push({ label: 'CORTE TETO LDO (DIÁRIAS)', value: effectiveState.diariasCorteLdo, type: 'D' });
        if (effectiveState.diariasGlosa > 0) rows.push({ label: 'ABATIMENTO BENEF. EXTERNO (ART. 4º)', value: effectiveState.diariasGlosa, type: 'D' });
        if (effectiveState.diariasDescAlim > 0) rows.push({ label: 'RESTITUIÇÃO AUX. ALIM. (DIÁRIAS)', value: effectiveState.diariasDescAlim, type: 'D' });
        if (effectiveState.diariasDescTransp > 0) rows.push({ label: 'RESTITUIÇÃO AUX. TRANSP. (DIÁRIAS)', value: effectiveState.diariasDescTransp, type: 'D' });

        effectiveState.rubricasExtras.forEach((r, index) => {
            if (r.valor <= 0) {
                return;
            }

            const descricaoBase = r.descricao.trim() || `${r.tipo === 'C' ? 'CREDITO' : 'DESCONTO'} MANUAL ${index + 1}`;
            const bases: string[] = [];
            if (r.incideIR) bases.push('BASE IR');
            if (r.isEA) bases.push('BASE IR (EA)');
            if (r.incidePSS) bases.push('BASE PSS');
            if (r.pssCompetenciaSeparada) bases.push('BASE PSS (EA)');
            const sufixoBase = bases.length > 0 ? ` (${bases.join(' | ')})` : '';

            rows.push({
                label: `${descricaoBase}${sufixoBase}`.toUpperCase(),
                value: r.valor,
                type: r.tipo
            });
        });

        const creditRows = rows.filter(row => row.type === 'C');
        const debitRows = rows.filter(row => row.type === 'D');
        return [...creditRows, ...debitRows];
    }, [effectiveState, courtConfig, currentTables]);

    return { calculatedState, resultRows };
};
