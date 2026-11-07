import React from 'react';
import { ArrowDown, Plus, Trash2, AlertCircle, AlertTriangle, Info } from 'lucide-react';

interface Props {
    value?: string[];
    onChange: (value: string[]) => void;
    styles: any;
    tipo?: 'horas_extras' | 'substituicao' | 'rubrica';
    competenciaReferencia?: string;
    anoReferencia?: string | number;
}

export const extractYearFromRef = (ref?: string | number): number => {
    if (!ref) return 2026;
    const str = String(ref).trim();
    const match = str.match(/\b(19\d\d|20\d\d)\b/);
    if (match) return Number(match[1]);
    const digits = str.match(/\d{4}/);
    if (digits) return Number(digits[0]);
    const num = Number(str);
    if (Number.isFinite(num) && num > 1900 && num < 2100) return num;
    return 2026;
};

export const getDefaultEaCompetencia = (competenciaReferencia?: string | number, anoReferencia?: string | number): string => {
    const anoPagamento = extractYearFromRef(anoReferencia || competenciaReferencia);
    const anoMaximoEa = anoPagamento > 2000 ? anoPagamento - 1 : 2025;
    return `${anoMaximoEa}-12`;
};

export const getPreviousMonth = (monthStr: string): string => {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthStr)) return monthStr;
    const [yearStr, mStr] = monthStr.split('-');
    let year = Number(yearStr);
    let month = Number(mStr);
    month -= 1;
    if (month < 1) {
        month = 12;
        year -= 1;
    }
    return `${year}-${String(month).padStart(2, '0')}`;
};

/** Collect original months without inferring them from the payment reference. */
export const IrEaCompetencias: React.FC<Props> = ({
    value = [],
    onChange,
    styles,
    tipo,
    competenciaReferencia,
    anoReferencia
}) => {
    const scrollToIrEa = () => {
        if (typeof document === 'undefined') return;
        const target = document.getElementById('memoria-ir-ea') || document.getElementById('apuracao-ir-ea');
        if (target) {
            const details = (target.tagName?.toLowerCase() === 'details'
                ? target
                : target.querySelector('details') || target.closest('details')) as HTMLDetailsElement | null;
            if (details) {
                details.open = true;
            }
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            target.classList.add('ring-2', 'ring-primary-500', 'transition-all', 'duration-500');
            setTimeout(() => {
                target.classList.remove('ring-2', 'ring-primary-500');
            }, 2000);
        }
    };

    const anoPagamento = extractYearFromRef(anoReferencia || competenciaReferencia);
    const anoMaximoEa = anoPagamento > 2000 ? anoPagamento - 1 : 2025;
    const maxCompetenciaEa = `${anoMaximoEa}-12`;

    const handleMonthChange = (index: number, newMonth: string) => {
        const updated = value.map((item, i) => (i === index ? newMonth : item));
        const allComplete = updated.every(m => /^\d{4}-(0[1-9]|1[0-2])$/.test(m));
        if (allComplete) {
            const sorted = [...new Set(updated)].sort();
            onChange(sorted);
        } else {
            onChange(updated);
        }
    };

    const handleAddMonth = () => {
        if (!competenciaReferencia && !anoReferencia) {
            onChange([...value, '']);
            return;
        }
        const validPriorMonths = value
            .filter(m => /^\d{4}-(0[1-9]|1[0-2])$/.test(m) && Number(m.slice(0, 4)) < anoPagamento)
            .sort();
        let nextMonth: string;
        if (validPriorMonths.length === 0) {
            nextMonth = maxCompetenciaEa;
        } else {
            const earliest = validPriorMonths[0];
            nextMonth = getPreviousMonth(earliest);
        }
        const updated = [...value, nextMonth];
        const sorted = [...new Set(updated.filter(Boolean))].sort();
        onChange(sorted);
    };

    const isMesAnoCorrenteOuPosterior = (monthStr: string) => {
        if (!monthStr || monthStr.length < 4) return false;
        const anoMes = Number(monthStr.slice(0, 4));
        return Number.isFinite(anoMes) && anoMes >= anoPagamento;
    };

    const emptyWarning = tipo === 'horas_extras'
        ? `Adicione o mês e ano em que as horas foram realizadas (até dez/${anoMaximoEa}) para calcular o imposto de anos anteriores.`
        : tipo === 'substituicao'
            ? `Adicione o mês e ano em que a substituição ocorreu (até dez/${anoMaximoEa}) para calcular o imposto de anos anteriores.`
            : tipo === 'rubrica'
                ? `Adicione o mês e ano de origem da parcela (até dez/${anoMaximoEa}) para calcular o imposto de anos anteriores.`
                : `Adicione o mês e ano em que as horas/serviços foram realizados (até dez/${anoMaximoEa}) para calcular o imposto de anos anteriores.`;

    return (
        <fieldset className="space-y-3 rounded-2xl border border-neutral-200/90 dark:border-neutral-700 bg-neutral-50/60 dark:bg-neutral-900/40 p-4">
            <legend className={styles.label}>
                Meses em que o serviço foi prestado (Ano Anterior{anoPagamento ? ` — até dez/${anoMaximoEa}` : ''})
            </legend>
            <p className="text-body-xs text-neutral-600 dark:text-neutral-400">
                Informe em qual(is) mês(es) de anos anteriores o serviço foi prestado para usufruir da tabela especial de RRA.
            </p>

            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-primary-50/70 dark:bg-primary-950/30 border border-primary-200/80 dark:border-primary-800/50 text-body-xs text-primary-950 dark:text-primary-200">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-primary-600 dark:text-primary-400" />
                <div className="space-y-2 leading-relaxed">
                    <p className="font-semibold text-primary-900 dark:text-primary-100">
                        Por que informar os meses trabalhados? (RRA — Lei nº 7.713/88)
                    </p>
                    <p className="text-neutral-700 dark:text-neutral-300">
                        Quando você recebe valores atrasados de uma só vez, o total pode parecer alto porque reúne pagamentos referentes a vários meses. Se o imposto fosse calculado como se todo esse valor tivesse sido ganho em um único mês, a alíquota poderia ser maior.
                    </p>
                    <p className="text-neutral-700 dark:text-neutral-300">
                        Por isso, a regra do Rendimento Recebido Acumuladamente (RRA) ajusta a tabela do Imposto de Renda à quantidade de meses a que o pagamento se refere.
                    </p>
                    <p className="text-neutral-700 dark:text-neutral-300">
                        Por exemplo, para valores recebidos em 2026, a primeira faixa da tabela fica assim:
                    </p>
                    <ul className="list-disc list-inside text-neutral-600 dark:text-neutral-400 space-y-0.5 text-[11px] pl-1 font-mono">
                        <li><strong>1 mês:</strong> até R$ 2.428,80</li>
                        <li><strong>2 meses:</strong> até R$ 4.857,60</li>
                        <li><strong>3 meses:</strong> até R$ 7.286,40</li>
                    </ul>
                    <p className="text-neutral-700 dark:text-neutral-300">
                        Assim, se você recebeu valores atrasados referentes a três meses, informe 3. A quantidade deve corresponder aos meses indicados no comprovante ou nos documentos do pagamento.
                    </p>
                    <p className="text-neutral-700 dark:text-neutral-300">
                        Essa regra se aplica aos pagamentos que se enquadram como RRA, em geral referentes a anos anteriores ao recebimento. O imposto final também depende das deduções e das demais regras aplicáveis ao caso.
                    </p>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 pt-1 border-t border-primary-200/40 dark:border-primary-800/30">
                        {tipo === 'horas_extras' && (
                            <>💡 <em>Você pode adicionar vários meses neste card ou criar um card separado para cada mês (o que também permite controlar o teto mensal de horas).</em></>
                        )}
                        {tipo === 'substituicao' && (
                            <>💡 <em>Você pode adicionar vários meses neste card ou criar um card separado para cada mês de substituição exercido.</em></>
                        )}
                        {tipo === 'rubrica' && (
                            <>💡 <em>Você pode adicionar vários meses nesta rubrica ou lançar rubricas separadas para cada competência de origem.</em></>
                        )}
                        {!tipo && (
                            <>💡 <em>Você pode adicionar vários meses nesta parcela ou criar lançamentos separados para cada período trabalhado.</em></>
                        )}
                    </p>
                </div>
            </div>

            {value.length === 0 && (
                <div role="status" className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-body-xs text-amber-800 dark:text-amber-300">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>{emptyWarning}</span>
                </div>
            )}
            {value.length > 0 && (
                <div className="space-y-3">
                    {value.map((month, index) => {
                        const isAnoCorrente = isMesAnoCorrenteOuPosterior(month);
                        return (
                            <div key={index} className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                    <label className="flex-1">
                                        <span className="sr-only">Mês trabalhado {index + 1}</span>
                                        <input
                                            type="month"
                                            className={`${styles.input} ${isAnoCorrente ? 'border-amber-400 dark:border-amber-600 focus:ring-amber-500' : ''}`}
                                            value={month}
                                            max={maxCompetenciaEa}
                                            required
                                            onChange={event => handleMonthChange(index, event.target.value)}
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
                                {isAnoCorrente && (
                                    <div
                                        role="alert"
                                        className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/80 text-body-xs text-amber-900 dark:text-amber-200 animate-fadeIn"
                                    >
                                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                                        <div className="space-y-1 leading-relaxed">
                                            <p className="font-semibold text-amber-950 dark:text-amber-100">
                                                Atenção: competência de {month.slice(0, 4)} pertence ao mesmo ano do contracheque ({anoPagamento})
                                            </p>
                                            <p className="text-[11px] text-amber-800 dark:text-amber-300">
                                                Pela Lei nº 7.713/88 (art. 12-A), a apuração por RRA (faixas de isenção multiplicadas) só é permitida para serviços prestados em <strong>anos anteriores (até dez/{anoMaximoEa})</strong>. Como este mês é de {month.slice(0, 4)}, ele será somado à remuneração mensal normal e <strong>tributado na folha corrente</strong> do mês.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
            <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
                <button
                    type="button"
                    onClick={handleAddMonth}
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
                    <span>Ver Memória do IR-EA</span>
                    <ArrowDown className="w-3.5 h-3.5" />
                </button>
            </div>
            <p className="text-body-xs text-neutral-500 dark:text-neutral-400 pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60">
                Cálculo por RRA (Lei nº 7.713/88): o imposto é apurado mês a mês pelo ano trabalhado, evitando que você pague imposto a mais ao receber tudo junto agora.
            </p>
        </fieldset>
    );
};
