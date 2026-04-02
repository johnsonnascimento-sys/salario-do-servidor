import { useMemo } from 'react';
import { CalculatorState, CourtConfig } from '../../../types';
import {
    buildRateOptions,
    isStepAligned,
    toPercentLabel
} from '../dynamicPayrollForm.helpers';

interface UseFunprespFormParams {
    state: CalculatorState;
    update: (field: keyof CalculatorState, value: any) => void;
    previdenciaComplementar: CourtConfig['previdenciaComplementar'];
}

export const useFunprespForm = ({
    state,
    update,
    previdenciaComplementar
}: UseFunprespFormParams) => {
    const isFunprespRegime = state.regimePrev === 'rpc' || state.regimePrev === 'migrado';
    const showFunprespSection = Boolean(previdenciaComplementar?.enabled && isFunprespRegime);

    const funprespNormalOptions = useMemo(
        () => buildRateOptions(
            previdenciaComplementar?.sponsoredRate?.min ?? 0,
            previdenciaComplementar?.sponsoredRate?.max ?? 0,
            previdenciaComplementar?.sponsoredRate?.step ?? 0
        ),
        [
            previdenciaComplementar?.sponsoredRate?.min,
            previdenciaComplementar?.sponsoredRate?.max,
            previdenciaComplementar?.sponsoredRate?.step
        ]
    );

    const funprespNormalOptionsSet = useMemo(
        () => new Set(funprespNormalOptions.map((value) => Number(value.toFixed(6)))),
        [funprespNormalOptions]
    );

    const applyFunprespDefaultsForRegime = (nextRegime: CalculatorState['regimePrev']) => {
        if (!previdenciaComplementar?.enabled) return;

        if (nextRegime === 'rpc') {
            update('funprespParticipacao', 'patrocinado');
            update('funprespAliq', previdenciaComplementar.sponsoredRate.defaultRpc);
            update('funprespFacul', previdenciaComplementar.facultativeRate.default);
            return;
        }

        update('funprespParticipacao', 'nao');
        update('funprespAliq', 0);
        update('funprespFacul', 0);
    };

    const handleRegimePrevChange = (nextRegimeValue: string) => {
        const nextRegime = nextRegimeValue as CalculatorState['regimePrev'];
        update('regimePrev', nextRegime);
        applyFunprespDefaultsForRegime(nextRegime);
    };

    const handleFunprespParticipacaoChange = (nextParticipacao: 'nao' | 'patrocinado') => {
        update('funprespParticipacao', nextParticipacao);
        if (nextParticipacao === 'nao') {
            update('funprespAliq', 0);
            update('funprespFacul', 0);
            return;
        }

        if (state.funprespAliq <= 0) {
            update('funprespAliq', previdenciaComplementar?.sponsoredRate.defaultRpc ?? 0);
        }
    };

    const funprespValidationError = useMemo(() => {
        if (!showFunprespSection || state.funprespParticipacao !== 'patrocinado' || !previdenciaComplementar) {
            return null;
        }

        const normal = Number(state.funprespAliq.toFixed(6));
        if (!funprespNormalOptionsSet.has(normal)) {
            return 'Contribuicao normal fora da grade permitida.';
        }

        const facultativa = Number(state.funprespFacul.toFixed(6));
        if (facultativa < 0) {
            return 'Contribuicao facultativa nao pode ser negativa.';
        }

        if (facultativa > 0) {
            if (facultativa < previdenciaComplementar.facultativeRate.minIfPositive) {
                return `Contribuicao facultativa minima: ${toPercentLabel(previdenciaComplementar.facultativeRate.minIfPositive)}.`;
            }
            if (!isStepAligned(facultativa, previdenciaComplementar.facultativeRate.step)) {
                return `Contribuicao facultativa deve seguir passo de ${toPercentLabel(previdenciaComplementar.facultativeRate.step)}.`;
            }
        }

        if (facultativa > previdenciaComplementar.facultativeRate.max) {
            return `Contribuicao facultativa maxima: ${toPercentLabel(previdenciaComplementar.facultativeRate.max)}.`;
        }

        return null;
    }, [
        funprespNormalOptionsSet,
        previdenciaComplementar,
        showFunprespSection,
        state.funprespAliq,
        state.funprespFacul,
        state.funprespParticipacao
    ]);

    return {
        showFunprespSection,
        funprespNormalOptions,
        handleRegimePrevChange,
        handleFunprespParticipacaoChange,
        funprespValidationError
    };
};
