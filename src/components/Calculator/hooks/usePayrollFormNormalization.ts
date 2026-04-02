import { useEffect } from 'react';
import { CalculatorState } from '../../../types';
import { pickBestKeyByReference, toReferenceMonthIndex } from '../referenceDateUtils';

interface UsePayrollFormNormalizationParams {
    state: CalculatorState;
    update: (field: keyof CalculatorState, value: any) => void;
    cargoOptions: string[];
    padroes: string[];
    functionKeys: string[];
    noFunctionCode: string;
    pssOptions: string[];
    irOptions: string[];
    salaryTable: Record<string, Record<string, number>>;
}

interface UsePayrollFormNormalizationResult {
    handleCargoChange: (nextCargo: CalculatorState['cargo']) => void;
}

export const usePayrollFormNormalization = ({
    state,
    update,
    cargoOptions,
    padroes,
    functionKeys,
    noFunctionCode,
    pssOptions,
    irOptions,
    salaryTable
}: UsePayrollFormNormalizationParams): UsePayrollFormNormalizationResult => {
    const handleCargoChange = (nextCargo: CalculatorState['cargo']) => {
        const nextPadroes = Object.keys(salaryTable[nextCargo] || {});
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

    return { handleCargoChange };
};
