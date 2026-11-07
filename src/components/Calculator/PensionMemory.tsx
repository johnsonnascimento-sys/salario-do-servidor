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
    return <section className="mt-4 pt-3 border-t border-neutral-200 dark:border-neutral-700/60 first:mt-0 first:pt-0 first:border-0">
        <h4 className="text-body-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wide">{memory.tipo === '13' ? '13º salário' : 'Folha mensal'} — {memory.competencia}</h4>
        {memory.avisos?.map((warning, index) => <p key={index} role="status" className="mt-2 text-body-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-2.5">{warning}</p>)}
        <p className="mt-1 text-body-xs text-neutral-500 dark:text-neutral-400">Participação: <strong className="text-neutral-700 dark:text-neutral-200 font-medium">{participationLabels[memory.participacao]}</strong></p>
        <dl className="mt-2 grid grid-cols-1 gap-1 text-body-xs">
            {lines.map(([label, value]) => <div key={label} className="flex flex-wrap justify-between items-baseline gap-2 py-0.5 border-b border-neutral-100 dark:border-neutral-700/40 last:border-0"><dt className="text-neutral-600 dark:text-neutral-400">{label}</dt><dd className="font-mono font-medium tabular-nums text-neutral-900 dark:text-neutral-100">{value}</dd></div>)}
        </dl>
        {memory.participacao === 'patrocinado' && <details className="mt-3 text-body-xs rounded-lg border border-neutral-200 dark:border-neutral-700 p-2.5 bg-white dark:bg-neutral-800/60">
            <summary className="cursor-pointer font-medium text-neutral-700 dark:text-neutral-300 select-none">Rubricas da base própria da Funpresp</summary>
            <dl className="mt-2 space-y-1">{Object.entries(memory.componentes).map(([key, value]) => <div key={key} className="flex flex-wrap justify-between items-baseline gap-2 py-0.5 border-b border-neutral-100 dark:border-neutral-700/30 last:border-0">
                <dt className="text-neutral-600 dark:text-neutral-400">{componentLabels[key] ?? key}{value === 0 ? ' (sem valor incluído)' : ''}</dt><dd className="font-mono font-medium tabular-nums text-neutral-900 dark:text-neutral-100">{money(Number(value))}</dd>
            </div>)}</dl>
            <p className="mt-2 text-neutral-500 dark:text-neutral-400">Parcelas opcionais sem inclusão ficam fora desta base. Confira as escolhas no formulário; uma parcela com valor zero também pode não ter sido recebida.</p>
        </details>}
    </section>;
};

export const PensionMemory: React.FC<{ memory: PensionMemoryData }> = ({ memory }) => <details className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/60 dark:bg-neutral-800/40 p-4 space-y-3">
    <summary className="cursor-pointer text-body-xs font-semibold text-neutral-800 dark:text-neutral-200 select-none">Memória previdenciária: bases, opções e descontos</summary>
    <p className="text-body-xs text-neutral-500 dark:text-neutral-400">Apuração mensal e do 13º separadas. Contrapartida patronal e pagamentos externos são informativos e não reduzem o líquido desta folha.</p>
    <Calculation memory={memory.mensal} />
    {memory.thirteenth && <Calculation memory={memory.thirteenth} />}
    {memory.retroativos.length > 0 && <section className="mt-4 pt-3 border-t border-neutral-200 dark:border-neutral-700/60 text-body-xs">
        <h4 className="text-body-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wide">Retroativos por competência</h4>
        {memory.retroativos.map(entry => <div key={entry.id} className="mt-2 border-t border-neutral-200 dark:border-neutral-700 pt-2 space-y-0.5">
            <p className="font-medium text-neutral-800 dark:text-neutral-200">{entry.competencia} — {entry.tipo === '13' ? '13º salário' : 'Mensal'} — {entry.modo === 'manual' ? 'Ajuste informado' : 'Recalculado por competência'}</p>
            <p className="font-mono tabular-nums text-neutral-600 dark:text-neutral-400">RPPS: {money(entry.rpps)} · Funpresp: {money(entry.complementar)}</p>
            <p className="text-neutral-500 dark:text-neutral-400">Dedução de IR: {entry.destinoIR === 'mensal' ? 'Folha mensal' : entry.destinoIR === '13' ? '13º salário' : 'Exercícios anteriores (EA)'}</p>
            {entry.justificativa && <p className="text-neutral-500 italic">{entry.justificativa}</p>}
        </div>)}
    </section>}
</details>;