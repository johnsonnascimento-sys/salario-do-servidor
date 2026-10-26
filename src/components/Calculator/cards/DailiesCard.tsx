import React from 'react';
import { CalculatorState, CourtConfig } from '../../../types';
import DailiesForm from '../../Dailies/DailiesForm';
import DailiesResult from '../../Dailies/DailiesResult';
import { useDailies } from '../../../hooks/useDailies';
import { dailiesInputFromState } from '../../../services/agency/adapters/dailiesInput';
import type { DailiesInput } from '../../../services/agency/dailies';

interface DailiesCardProps {
    state: CalculatorState;
    update: (field: keyof CalculatorState, value: any) => void;
    styles: any;
    courtConfig?: CourtConfig | null;
    competenciaReferencia: string;
}
const months = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
export const DailiesCard: React.FC<DailiesCardProps> = ({ state, update }) => {
    const input = dailiesInputFromState(state);
    const loaded = useDailies(input, { org_slug: 'jmu', power: 'PJU', branch: 'JMU' });
    const onChange = (next: DailiesInput) => {
        if (next.competence !== input.competence && /^\d{4}-\d{2}$/.test(next.competence)) {
            update('anoRef', Number(next.competence.slice(0, 4)));
            update('mesRef', months[Number(next.competence.slice(5, 7)) - 1]);
        }
        update('dailiesInput', next);
    };
    return <div className="space-y-4">
        <DailiesForm input={input} onChange={onChange} config={loaded.config} configs={loaded.configs} />
        {loaded.loading && <p role="status">Carregando regras de diárias do período…</p>}
        {loaded.error && <p role="alert" className="text-error-600">{loaded.error}</p>}
        {state.dailiesMemory ? <DailiesResult result={{ available: true, issues: [], memory: state.dailiesMemory, parcels: state.dailiesMemory.parcels, totals: state.dailiesMemory.totals }} />
            : loaded.result && !loaded.result.available ? <DailiesResult result={loaded.result} />
            : state.dailiesInput && <p role="status">Calculando diárias com a configuração publicada…</p>}
        <p className="text-sm text-neutral-500">O enquadramento usa a categoria publicada. A seleção de cargo efetivo, FC e CJ da folha é preservada separadamente.</p>
    </div>;
};
