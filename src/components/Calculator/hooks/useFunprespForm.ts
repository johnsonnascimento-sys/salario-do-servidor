import { resolvePensionUrp, validateLinkedPensionSalary } from '../../../services/agency/engine/modules/pensionUrp';
import { useMemo } from 'react';
import { CalculatorState, CourtConfig } from '../../../types';
import { PensionParticipation } from '../../../types/pension';
import { buildRateOptions, isStepAligned, toPercentLabel } from '../dynamicPayrollForm.helpers';
import { selectPensionRegime } from '../PensionRegimeSelect';
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
        const selected = selectPensionRegime(state.regimePrev, value);
        if (selected !== state.regimePrev) update('regimePrev', selected);
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

    const funprespAdditionalValidationError = useMemo(() => {
        if (state.funprespParticipacao === 'nao' || !config?.enabled) return null;
        const facultativa = state.funprespFacul;
        if (!Number.isFinite(facultativa) || facultativa < 0) return 'Contribuição facultativa deve ser um percentual não negativo.';
        const rule = config.facultativeRate;
        if (facultativa > 0 && facultativa < rule.minIfPositive) return `Contribuição facultativa mínima: ${toPercentLabel(rule.minIfPositive)}.`;
        if (facultativa > 0 && rule.step && !isStepAligned(facultativa, rule.step)) return `Contribuição facultativa deve seguir passo de ${toPercentLabel(rule.step)}.`;
        if (rule.max !== undefined && facultativa > rule.max) return `Contribuição facultativa máxima: ${toPercentLabel(rule.max)}.`;
        if (!Number.isFinite(state.funprespFaculValor ?? 0) || (state.funprespFaculValor ?? 0) < 0) return 'Aporte esporádico deve ser um valor não negativo.';
        return null;
    }, [config, state.funprespParticipacao, state.funprespFacul, state.funprespFaculValor]);

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
            const resolution = resolvePensionUrp(config, competence, state.funprespVinculadaInicio ?? '');
            if (!resolution.reference) return `Participação vinculada pendente: ${resolution.error}`;
            const salaryError = validateLinkedPensionSalary(state.funprespBaseIntegral, resolution.reference);
            if (salaryError) return salaryError;
        }
        return funprespAdditionalValidationError;
    }, [config, funprespNormalOptions, state, funprespAdditionalValidationError]);

    return { showFunprespSection, funprespNormalOptions, handleRegimePrevChange, handleFunprespParticipacaoChange, funprespValidationError, funprespAdditionalValidationError };
};
