/**
 * Hook de Resultados - Calculadora
 *
 * Responsavel por:
 * - Execucao de calculos via agencyService
 * - Mapeamento de resultados para o estado
 * - Geracao de rows para exibicao (resultRows)
 */

import { useEffect, useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { CalculatorState, CourtConfig } from '../../types';
import { JmuService } from '../../services/agency/implementations/JmuService';
import { mapStateToJmuParams } from '../../services/agency/adapters/stateToParams';
import { getTablesForPeriod } from '../../utils/calculations';

export const useCalculatorResults = (
    state: CalculatorState,
    setState: Dispatch<SetStateAction<CalculatorState>>,
    agencyService: JmuService | null,
    courtConfig: CourtConfig | null,
    agency: { name: string; type: string; slug: string } | null
) => {
    useEffect(() => {
        if (!agencyService) return;

        (async () => {
            const orgSlug = agency?.slug || 'jmu';
            const params = mapStateToJmuParams(state, orgSlug, courtConfig || undefined);
            const result = await agencyService.calculateTotal(params);

            setState(prev => {
                const bd = result.breakdown;
                return {
                    ...prev,
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
                    abonoPermanencia: bd.abono || 0,
                    auxAlimentacao: bd.auxAlimentacao || 0,
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
                    adiant13Venc: bd.adiant13Venc || 0,
                    adiant13FC: bd.adiant13FC || 0,
                    segunda13Venc: bd.segunda13Venc || 0,
                    segunda13FC: bd.segunda13FC || 0,
                    heVal50: bd.heVal50 || 0,
                    heVal100: bd.heVal100 || 0,
                    heTotal: bd.heTotal || 0,
                    substTotal: bd.substituicao || 0,
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
                };
            });
        })();
    }, [
        agencyService,
        state.periodo, state.cargo, state.padrao, state.funcao,
        state.aqTituloPerc, state.aqTreinoPerc, state.aqTituloVR, state.aqTreinoVR,
        state.recebeAbono, state.gratEspecificaTipo, state.gratEspecificaValor,
        state.vpni_lei, state.vpni_decisao, state.ats,
        state.dependentes, state.regimePrev, state.funprespAliq, state.funprespFacul,
        state.tabelaPSS, state.tabelaIR,
        state.pssSobreFC, state.incidirPSSGrat,
        state.auxAlimentacao, state.auxPreEscolarQtd, state.cotaPreEscolar, state.auxTransporteGasto,
        state.emprestimos, state.planoSaude, state.pensao,
        state.rubricasExtras,
        state.tipoCalculo, state.manualFerias, state.ferias1_3, state.feriasAntecipadas,
        state.feriasDesc, state.feriasDescManual,
        state.manualAdiant13, state.adiant13Venc, state.adiant13FC, state.segunda13Venc, state.segunda13FC,
        state.heQtd50, state.heQtd100, state.heIsEA, state.substDias, state.substIsEA,
        state.diariasQtd, state.diariasEmbarque,
        state.diariasModoDesconto, state.diariasDataInicio, state.diariasDataFim,
        state.diariasDiasDescontoAlimentacao, state.diariasDiasDescontoTransporte,
        state.diariasExtHospedagem, state.diariasExtAlimentacao, state.diariasExtTransporte,
        state.diariasDescontarAlimentacao, state.diariasDescontarTransporte,
        state.licencaDias, state.baseLicenca, state.incluirAbonoLicenca,
        courtConfig,
        setState
    ]);

    const resultRows = useMemo(() => {
        if (!courtConfig) {
            return [];
        }

        const rows: Array<{ label: string; value: number; type: 'C' | 'D' }> = [];
        const isNovoAQ = state.periodo >= 1;

        if (state.vencimento > 0) rows.push({ label: 'VENCIMENTO-ATIVO EC', value: state.vencimento, type: 'C' });
        if (state.gaj > 0) rows.push({ label: 'GRAT. ATIV. JUD. (GAJ)', value: state.gaj, type: 'C' });

        if (state.gratEspecificaValor > 0) {
            const label = state.gratEspecificaTipo === 'gae'
                ? 'GRATIFICAÇÃO DE ATIVIDADE EXTERNA (GAE)'
                : 'GRATIFICAÇÃO DE ATIVIDADE DE SEGURANÇA (GAS)';
            rows.push({ label, value: state.gratEspecificaValor, type: 'C' });
        }

        if (state.aqTituloValor > 0) {
            const label = isNovoAQ ? 'AQ TÍTULOS (LEI 15.292)' : 'ADICIONAL QUALIFICAÇÃO (TÍTULO)';
            rows.push({ label, value: state.aqTituloValor, type: 'C' });
        }
        if (state.aqTreinoValor > 0) {
            const label = isNovoAQ ? 'AQ TREINAMENTO (LEI 15.292)' : 'ADICIONAL QUALIFICAÇÃO (TREINAMENTO)';
            rows.push({ label, value: state.aqTreinoValor, type: 'C' });
        }

        const noFunctionCode = courtConfig.careerCatalog?.noFunctionCode;
        if (state.funcao && state.funcao !== noFunctionCode) {
            const tables = getTablesForPeriod(state.periodo, courtConfig);
            const valorFC = tables.funcoes[state.funcao] || 0;
            let labelTipo = 'FUNÇÃO COMISSIONADA (OPÇÃO)';
            if (state.funcao.startsWith('cj')) labelTipo = 'CARGO EM COMISSÃO';
            rows.push({ label: `${labelTipo} - ${state.funcao.toUpperCase()}`, value: valorFC, type: 'C' });
        }

        if (state.substTotal > 0) rows.push({ label: `SUBSTITUIÇÃO DE FUNÇÃO${state.substIsEA ? ' (EA)' : ''}`, value: state.substTotal, type: 'C' });
        if (state.heTotal > 0) rows.push({ label: `SERVIÇO EXTRAORDINÁRIO${state.heIsEA ? ' (EA)' : ''}`, value: state.heTotal, type: 'C' });
        if (state.vpni_lei > 0) rows.push({ label: 'VPNI - LEI 9.527/97', value: state.vpni_lei, type: 'C' });
        if (state.vpni_decisao > 0) rows.push({ label: 'VPNI - DECISÃO JUDICIAL', value: state.vpni_decisao, type: 'C' });
        if (state.ats > 0) rows.push({ label: 'ADICIONAL TEMPO DE SERVIÇO', value: state.ats, type: 'C' });

        if (state.auxAlimentacao > 0) {
            rows.push({
                label: state.auxAlimentacaoProporcional && state.auxAlimentacaoDetalhe
                    ? state.auxAlimentacaoDetalhe
                    : 'AUXILIO-ALIMENTACAO',
                value: state.auxAlimentacao,
                type: 'C'
            });
        }

        if (state.auxPreEscolarValor > 0) rows.push({ label: 'AUXÍLIO PRÉ-ESCOLAR', value: state.auxPreEscolarValor, type: 'C' });
        if (state.auxTransporteValor > 0) rows.push({ label: 'AUXÍLIO-TRANSPORTE', value: state.auxTransporteValor, type: 'C' });
        if (state.licencaValor > 0) rows.push({ label: 'INDENIZAÇÃO LICENÇA COMPENSATÓRIA', value: state.licencaValor, type: 'C' });
        if (state.abonoPermanencia > 0) rows.push({ label: 'ABONO DE PERMANÊNCIA', value: state.abonoPermanencia, type: 'C' });
        if (state.ferias1_3 > 0) rows.push({ label: 'ADICIONAL 1/3 FÉRIAS', value: state.ferias1_3, type: 'C' });

        if (state.adiant13Venc > 0) rows.push({ label: 'GRATIFICACAO NATALINA-ADIANT. 1a PARCELA ATIVO EC', value: state.adiant13Venc, type: 'C' });
        if (state.adiant13FC > 0) rows.push({ label: 'GRATIFICACAO NATALINA-ADIANT. 1a PARCELA FC/CJ ATIVO EC', value: state.adiant13FC, type: 'C' });
        if (state.segunda13Venc > 0) rows.push({ label: 'GRATIFICACAO NATALINA-2a PARCELA ATIVO EC', value: state.segunda13Venc, type: 'C' });
        if (state.segunda13FC > 0) rows.push({ label: 'GRATIFICACAO NATALINA-2a PARCELA FC/CJ ATIVO EC', value: state.segunda13FC, type: 'C' });
        if (state.abonoPerm13 && state.abonoPerm13 > 0) {
            rows.push({ label: 'ABONO DE PERMANENCIA-GN (13o) EC 41/2003 ATIVO EC', value: state.abonoPerm13, type: 'C' });
        }

        if (state.pssMensal > 0) rows.push({ label: 'CONTRIBUIÇÃO RPPS (PSS)', value: state.pssMensal, type: 'D' });
        if (state.pssEA > 0) rows.push({ label: 'CONTRIBUIÇÃO RPPS-EA', value: state.pssEA, type: 'D' });
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

        if (state.diariasBruto > 0) rows.push({ label: 'DIÁRIAS', value: state.diariasBruto, type: 'C' });
        if (state.diariasCorteLdo > 0) rows.push({ label: 'CORTE TETO LDO (DIÁRIAS)', value: state.diariasCorteLdo, type: 'D' });
        if (state.diariasGlosa > 0) rows.push({ label: 'ABATIMENTO BENEF. EXTERNO (ART. 4º)', value: state.diariasGlosa, type: 'D' });
        if (state.diariasDescAlim > 0) rows.push({ label: 'RESTITUIÇÃO AUX. ALIM. (DIÁRIAS)', value: state.diariasDescAlim, type: 'D' });
        if (state.diariasDescTransp > 0) rows.push({ label: 'RESTITUIÇÃO AUX. TRANSP. (DIÁRIAS)', value: state.diariasDescTransp, type: 'D' });

        state.rubricasExtras.forEach((r, index) => {
            if (r.valor <= 0) {
                return;
            }

            const descricaoBase = r.descricao.trim() || `${r.tipo === 'C' ? 'CREDITO' : 'DESCONTO'} MANUAL ${index + 1}`;
            const bases: string[] = [];
            if (r.isEA) bases.push('EA');
            else if (r.incideIR) bases.push('BASE IR');
            if (r.incidePSS) bases.push('BASE PSS');
            if (r.pssCompetenciaSeparada) bases.push('PSS COMP. ANT.');
            const sufixoBase = bases.length > 0 ? ` (${bases.join(' | ')})` : '';

            rows.push({
                label: `${descricaoBase}${sufixoBase}`.toUpperCase(),
                value: r.valor,
                type: r.tipo
            });
        });

        return rows;
    }, [state, courtConfig]);

    return { resultRows };
};
