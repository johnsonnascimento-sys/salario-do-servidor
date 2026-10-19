import React from 'react';
import type { PensionMemory as PensionMemoryData, PensionCalculationMemory } from '../../types/pension';

const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const percent = (value: number) => `${(value * 100).toLocaleString('pt-BR', { maximumFractionDigits: 6 })}%`;
const componentLabels: Record<string, string> = {
    vencimento: 'Vencimento', gaj: 'GAJ', aqTitulo: 'AQ de titulação', vantagens: 'Vantagens pessoais',
    rubricas: 'Rubricas manuais com incidência', fc: 'FC/CJ', gratificacao: 'Gratificação específica (GAS/GAE)', aqTreino: 'AQ de treinamento'
};
const participationLabels = { nao: 'Não participa', patrocinado: 'Patrocinada', vinculado: 'Vinculada, sem patrocínio' };

const Calculation: React.FC<{ memory: PensionCalculationMemory }> = ({ memory }) => {
    const lines: Array<[string, string]> = [
        ['Base RPPS antes do teto', money(memory.baseRppsIntegral)], ['Teto RGPS da competência', money(memory.teto)],
        ['Base efetiva RPPS', money(memory.baseRpps)], ['Base própria Funpresp antes do teto', money(memory.baseComplementarIntegral)],
        ['Base efetiva Funpresp', money(memory.baseComplementar)], ['Alíquota normal', percent(memory.aliquotaNormal)],
        ['Contribuição normal do participante', money(memory.normal)], ['Alíquota facultativa', percent(memory.aliquotaFacultativa)],
        ['Facultativa regular total (inclui pagamentos externos)', money(memory.facultativa)], ['Deste total: facultativa externa (informativa)', money(memory.facultativaExterna)],
        ['Aporte em folha', money(memory.aporteFolha)], ['Aporte externo', money(memory.aporteExterno)], ['Contrapartida patronal (informativa)', money(memory.patrocinador)],
        ['Desconto Funpresp na folha', money(memory.descontoFolha)], ['Funpresp deduzida da base de IR da folha', money(memory.dedutivelIRFolha)],
        ['Parcela sujeita ao limite anual de dedução', money(memory.deducaoSujeitaLimiteAnual)]
    ];
    return <section className="mt-4">
        <h4 className="font-semibold">{memory.tipo === '13' ? '13º salário' : 'Folha mensal'} — {memory.competencia}</h4>
        {memory.avisos?.map((warning, index) => <p key={index} role="status" className="mt-2 text-body-xs text-amber-700 dark:text-amber-300">{warning}</p>)}
        <p className="text-body-xs">Participação: {participationLabels[memory.participacao]}</p>
        <dl className="mt-2 grid grid-cols-1 gap-1 text-body-xs">
            {lines.map(([label, value]) => <div key={label} className="flex flex-wrap justify-between gap-2"><dt>{label}</dt><dd className="font-medium tabular-nums">{value}</dd></div>)}
        </dl>
        {memory.participacao === 'patrocinado' && <details className="mt-3 text-body-xs">
            <summary className="cursor-pointer">Rubricas da base própria da Funpresp</summary>
            <dl className="mt-2 space-y-1">{Object.entries(memory.componentes).map(([key, value]) => <div key={key} className="flex flex-wrap justify-between gap-2">
                <dt>{componentLabels[key] ?? key}{value === 0 ? ' (sem valor incluído)' : ''}</dt><dd>{money(Number(value))}</dd>
            </div>)}</dl>
            <p className="mt-2">Parcelas opcionais sem inclusão ficam fora desta base. Confira as escolhas no formulário; uma parcela com valor zero também pode não ter sido recebida.</p>
        </details>}
    </section>;
};

export const PensionMemory: React.FC<{ memory: PensionMemoryData }> = ({ memory }) => <details className="rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
    <summary className="cursor-pointer font-semibold">Memória previdenciária: bases, opções e descontos</summary>
    <p className="mt-2 text-body-xs text-neutral-600 dark:text-neutral-300">Apuração mensal e do 13º separadas. Contrapartida patronal e pagamentos externos são informativos e não reduzem o líquido desta folha.</p>
    <Calculation memory={memory.mensal} />
    {memory.thirteenth && <Calculation memory={memory.thirteenth} />}
    {memory.retroativos.length > 0 && <section className="mt-4 text-body-xs">
        <h4 className="font-semibold">Retroativos por competência</h4>
        {memory.retroativos.map(entry => <div key={entry.id} className="mt-2 border-t border-neutral-200 dark:border-neutral-700 pt-2">
            <p>{entry.competencia} — {entry.tipo === '13' ? '13º salário' : 'Mensal'} — {entry.modo === 'manual' ? 'Ajuste informado' : 'Recalculado por competência'}</p>
            <p>RPPS: {money(entry.rpps)} · Funpresp: {money(entry.complementar)}</p>
            <p>Dedução de IR: {entry.destinoIR === 'mensal' ? 'Folha mensal' : entry.destinoIR === '13' ? '13º salário' : 'Exercícios anteriores (EA)'}</p>
            {entry.justificativa && <p>{entry.justificativa}</p>}
        </div>)}
    </section>}
</details>;
