import React from 'react';
import { ArrowDown, Plus, Trash2, AlertCircle, Info } from 'lucide-react';

interface Props {
    value?: string[];
    onChange: (value: string[]) => void;
    styles: any;
}

/** Collect original months without inferring them from the payment reference. */
export const IrEaCompetencias: React.FC<Props> = ({ value = [], onChange, styles }) => {
    const scrollToIrEa = () => {
        if (typeof document === 'undefined') return;
        const target = document.getElementById('apuracao-ir-ea');
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            target.classList.add('ring-2', 'ring-primary-500', 'transition-all', 'duration-500');
            setTimeout(() => {
                target.classList.remove('ring-2', 'ring-primary-500');
            }, 2000);
        }
    };

    return (
        <fieldset className="space-y-3 rounded-2xl border border-neutral-200/90 dark:border-neutral-700 bg-neutral-50/60 dark:bg-neutral-900/40 p-4">
            <legend className={styles.label}>Meses em que o serviço foi prestado (Ano Anterior)</legend>
            <p className="text-body-xs text-neutral-600 dark:text-neutral-400">Informe em qual(is) mês(es) o serviço foi prestado ou a parcela foi gerada.</p>

            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-primary-50/70 dark:bg-primary-950/30 border border-primary-200/80 dark:border-primary-800/50 text-body-xs text-primary-950 dark:text-primary-200">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-primary-600 dark:text-primary-400" />
                <div className="space-y-1.5 leading-relaxed">
                    <p className="font-semibold text-primary-900 dark:text-primary-100">
                        Por que informar os meses trabalhados? (RRA — Lei nº 7.713/88)
                    </p>
                    <p className="text-neutral-700 dark:text-neutral-300">
                        Ao receber atrasados de anos anteriores, <strong>a faixa de isenção do Imposto de Renda é multiplicada pela quantidade de meses</strong> a que o serviço se refere:
                    </p>
                    <ul className="list-disc list-inside text-neutral-600 dark:text-neutral-400 space-y-0.5 text-[11px] pl-1 font-mono">
                        <li><strong>1 mês:</strong> isenção até R$ 2.259,20</li>
                        <li><strong>2 meses:</strong> o limite dobra para <strong>R$ 4.518,40</strong></li>
                        <li><strong>3 meses:</strong> sobe para <strong>R$ 6.777,60</strong> (e assim por diante)</li>
                    </ul>
                    <p className="text-neutral-700 dark:text-neutral-300">
                        Quanto mais meses você informar, menor será o imposto retido na fonte.
                    </p>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 pt-0.5">
                        💡 <em>Você pode adicionar vários meses neste card ou criar um card separado para cada mês (o que também permite controlar o teto mensal de horas).</em>
                    </p>
                </div>
            </div>

            {value.length === 0 && (
                <div role="status" className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-body-xs text-amber-800 dark:text-amber-300">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>Adicione o mês e ano em que as horas/serviços foram realizados para calcular o imposto de anos anteriores.</span>
                </div>
            )}
            {value.length > 0 && (
                <div className="space-y-2">
                    {value.map((month, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <label className="flex-1">
                                <span className="sr-only">Mês trabalhado {index + 1}</span>
                                <input
                                    type="month"
                                    className={styles.input}
                                    value={month}
                                    required
                                    onChange={event => onChange(value.map((item, i) => i === index ? event.target.value : item))}
                                />
                            </label>
                            <button
                                type="button"
                                title={`Remover mês ${index + 1}`}
                                aria-label={`Remover mês ${index + 1}`}
                                onClick={() => onChange(value.filter((_, i) => i !== index))}
                                className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-error-300 dark:hover:border-error-700 bg-white dark:bg-neutral-800 hover:bg-error-50 dark:hover:bg-error-950/40 text-neutral-400 hover:text-error-600 dark:hover:text-error-400 transition-all shrink-0 cursor-pointer shadow-xs"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
            <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
                <button
                    type="button"
                    onClick={() => onChange([...value, ''])}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-secondary/30 bg-secondary/5 text-secondary hover:bg-secondary/15 transition-all text-body-xs font-bold uppercase tracking-wider shadow-xs cursor-pointer"
                >
                    <Plus className="w-4 h-4" />
                    <span>Adicionar mês trabalhado</span>
                </button>
                <button
                    type="button"
                    onClick={scrollToIrEa}
                    className="inline-flex items-center gap-1 text-body-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline cursor-pointer"
                >
                    <span>Ver Apuração do IR-EA</span>
                    <ArrowDown className="w-3.5 h-3.5" />
                </button>
            </div>
            <p className="text-body-xs text-neutral-500 dark:text-neutral-400 pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60">
                Cálculo por RRA (Lei nº 7.713/88): o imposto é apurado mês a mês pelo ano trabalhado, evitando que você pague imposto a mais ao receber tudo junto agora.
            </p>
        </fieldset>
    );
};
