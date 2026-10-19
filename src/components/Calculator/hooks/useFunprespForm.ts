import { useMemo } from 'react';
import { CalculatorState, CourtConfig } from '../../../types';
import { PensionParticipation } from '../../../types/pension';
import { buildRateOptions, isStepAligned, toPercentLabel } from '../dynamicPayrollForm.helpers';
import { toReferenceMonthIndex } from '../referenceDateUtils';

interface UseFunprespFormParams {
    state: CalculatorState;
    update: (field: keyof CalculatorState, value: any) => void;
    previdenciaComplementar: CourtConfig['previdenciaComplementar'];
}

export const useFunprespForm = ({ state, update, previdenciaComplementar: config }: UseFunprespFormParams) => {
    const showFunprespSection = Boolean(config?.enabled);
    const rate = state.funprespParticipacao === 'vinculado' ? config?.linkedRate : config?.sponsoredRate;
    const funprespNormalOptions = useMemo(
        () => rate ? buildRateOptions(rate.min, rate.max, rate.step) : [],
        [rate?.min, rate?.max, rate?.step]
    );

    // Changing the statutory regime never enrolls, migrates or cancels a plan.
    const handleRegimePrevChange = (value: string) => {
        if (['antigo', 'novo_antigo', 'migrado', 'rpc'].includes(value)) update('regimePrev', value);
    };
    const handleFunprespParticipacaoChange = (value: PensionParticipation) => {
        update('funprespParticipacao', value);
        if (value === 'nao') return;
        const selectedRate = value === 'vinculado' ? config?.linkedRate : config?.sponsoredRate;
        const options = selectedRate ? buildRateOptions(selectedRate.min, selectedRate.max, selectedRate.step) : [];
        if (!options.some(option => Math.abs(option - state.funprespAliq) < 1e-9)) {
            const suggested = value === 'patrocinado' ? config?.sponsoredRate.defaultRpc : selectedRate?.min;
            update('funprespAliq', suggested ?? 0);
        }
    };

    const funprespValidationError = useMemo(() => {
        if (state.funprespParticipacao === 'nao') return null;
        if (!config?.enabled) return 'Previdência complementar sem configuração habilitada para este órgão.';
        if (state.funprespParticipacao === 'patrocinado' && !['migrado', 'rpc'].includes(state.regimePrev)) {
            return 'A participação patrocinada exige RPPS com teto. Confira seu enquadramento e sua adesão.';
        }
        if (!Number.isFinite(state.funprespAliq) || !funprespNormalOptions.some(option => Math.abs(option - state.funprespAliq) < 1e-9)) {
            return 'Selecione uma alíquota permitida para a modalidade de participação.';
        }
        if (state.funprespParticipacao === 'vinculado') {
            const competence = `${state.anoRef}-${String(toReferenceMonthIndex(state.mesRef)).padStart(2, '0')}`;
            const inicio = state.funprespVinculadaInicio ?? '';
            if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(inicio) || inicio > competence) {
                return 'Informe a competência de inscrição ou eleição da base, anterior ou igual à folha.';
            }
            const urpCompetence = inicio.slice(0, 4) === String(state.anoRef) ? inicio : `${state.anoRef - 1}-11`;
            if (!config.urpByCompetence?.[urpCompetence] || !config.urpSourcesByCompetence?.[urpCompetence]) {
                return `Participação vinculada pendente: falta cadastrar a URP e sua fonte para ${urpCompetence}.`;
            }
            if (!Number.isFinite(state.funprespBaseIntegral) || (state.funprespBaseIntegral ?? 0) <= 0) {
                return 'Informe a remuneração de participação escolhida no plano. Os limites serão conferidos pelo motor.';
            }
        }
        const facultativa = state.funprespFacul;
        if (!Number.isFinite(facultativa) || facultativa < 0) return 'Contribuição facultativa deve ser um percentual não negativo.';
        const rule = config.facultativeRate;
        if (facultativa > 0 && facultativa < rule.minIfPositive) return `Contribuição facultativa mínima: ${toPercentLabel(rule.minIfPositive)}.`;
        if (facultativa > 0 && rule.step && !isStepAligned(facultativa, rule.step)) return `Contribuição facultativa deve seguir passo de ${toPercentLabel(rule.step)}.`;
        if (rule.max !== undefined && facultativa > rule.max) return `Contribuição facultativa máxima: ${toPercentLabel(rule.max)}.`;
        if (!Number.isFinite(state.funprespFaculValor ?? 0) || (state.funprespFaculValor ?? 0) < 0) return 'Aporte esporádico deve ser um valor não negativo.';
        return null;
    }, [config, funprespNormalOptions, state]);

    return { showFunprespSection, funprespNormalOptions, handleRegimePrevChange, handleFunprespParticipacaoChange, funprespValidationError };
};
