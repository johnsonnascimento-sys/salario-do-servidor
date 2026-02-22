import React from 'react';
import { DollarSign, Minus, Plus, Settings, Trash2 } from 'lucide-react';
import { CalculatorState, CourtConfig, Rubrica } from '../../types';
import { formatCurrency, getTablesForPeriod } from '../../utils/calculations';

interface DynamicPayrollFormProps {
    state: CalculatorState;
    update: (field: keyof CalculatorState, value: any) => void;
    courtConfig: CourtConfig;
    addRubrica: (tipo?: Rubrica['tipo']) => void;
    removeRubrica: (id: string) => void;
    updateRubrica: (id: string, field: keyof Rubrica, value: any) => void;
    styles: any;
}

const toNumber = (value: string) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const toPositiveNumber = (value: string) => {
    return Math.max(0, toNumber(value));
};

export const DynamicPayrollForm: React.FC<DynamicPayrollFormProps> = ({
    state,
    update,
    courtConfig,
    addRubrica,
    removeRubrica,
    updateRubrica,
    styles
}) => {
    const currentTables = getTablesForPeriod(state.periodo, courtConfig);
    const salaryByCargo = currentTables.salario[state.cargo] || {};
    const padroes = Object.keys(salaryByCargo);
    const baseVencimento = salaryByCargo[state.padrao] || 0;
    const gaj = baseVencimento * 1.4;

    const totalCreditos = state.rubricasExtras
        .filter(rubrica => rubrica.tipo === 'C')
        .reduce((total, rubrica) => total + (rubrica.valor || 0), 0);

    const totalDescontos = state.rubricasExtras
        .filter(rubrica => rubrica.tipo === 'D')
        .reduce((total, rubrica) => total + (rubrica.valor || 0), 0);

    const handleCargoChange = (nextCargo: CalculatorState['cargo']) => {
        const nextPadroes = Object.keys(currentTables.salario[nextCargo] || {});
        const fallbackPadrao = nextPadroes[0] || state.padrao;

        update('cargo', nextCargo);
        update('padrao', fallbackPadrao);
    };

    return (
        <div className={styles.card}>
            <h3 className={styles.sectionTitle}>
                <Settings className="w-4 h-4" />
                Formulario Dinamico do Holerite
            </h3>

            <div className={styles.innerBox}>
                <h4 className={styles.innerBoxTitle}>Base obrigatoria</h4>
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className={styles.label}>Cargo</label>
                            <select
                                className={styles.input}
                                value={state.cargo}
                                onChange={e => handleCargoChange(e.target.value as CalculatorState['cargo'])}
                            >
                                <option value="tec">Tecnico</option>
                                <option value="analista">Analista</option>
                            </select>
                        </div>
                        <div>
                            <label className={styles.label}>Classe/Padrao</label>
                            <select
                                className={styles.input}
                                value={state.padrao}
                                onChange={e => update('padrao', e.target.value)}
                            >
                                {padroes.map(padrao => (
                                    <option key={padrao} value={padrao}>{padrao}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={styles.label}>Funcao (FC/CJ)</label>
                            <select
                                className={styles.input}
                                value={state.funcao}
                                onChange={e => update('funcao', e.target.value)}
                            >
                                <option value="0">Sem funcao</option>
                                {Object.keys(currentTables.funcoes).map(funcao => (
                                    <option key={funcao} value={funcao}>
                                        {funcao.toUpperCase()} - {formatCurrency(currentTables.funcoes[funcao])}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 px-4 py-3">
                            <p className="text-label font-bold text-neutral-500 uppercase tracking-widest">Salario Base</p>
                            <p className="text-body font-bold text-neutral-800 dark:text-neutral-100 font-mono">
                                {formatCurrency(baseVencimento)}
                            </p>
                        </div>
                        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 px-4 py-3">
                            <p className="text-label font-bold text-neutral-500 uppercase tracking-widest">GAJ (140%)</p>
                            <p className="text-body font-bold text-neutral-800 dark:text-neutral-100 font-mono">
                                {formatCurrency(gaj)}
                            </p>
                        </div>
                        <div>
                            <label className={styles.label}>Auxilio Alimentacao</label>
                            <input
                                type="number"
                                className={styles.input}
                                value={state.auxAlimentacao || ''}
                                onChange={e => update('auxAlimentacao', toPositiveNumber(e.target.value))}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles.innerBox}>
                <h4 className={styles.innerBoxTitle}>Configuracoes tributarias</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className={styles.label}>Regime Previdenciario</label>
                        <select
                            className={styles.input}
                            value={state.regimePrev}
                            onChange={e => update('regimePrev', e.target.value)}
                        >
                            <option value="antigo">RPPS - sem teto</option>
                            <option value="novo_antigo">RPPS - novo sem migracao</option>
                            <option value="migrado">RPPS migrado (com teto)</option>
                            <option value="rpc">RPC (com teto)</option>
                        </select>
                    </div>
                    <div>
                        <label className={styles.label}>Dependentes (IR)</label>
                        <input
                            type="number"
                            className={styles.input}
                            value={state.dependentes}
                            onChange={e => update('dependentes', toPositiveNumber(e.target.value))}
                        />
                    </div>
                    <div className="flex flex-col justify-end gap-3">
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                className={styles.checkbox}
                                checked={state.pssSobreFC}
                                onChange={e => update('pssSobreFC', e.target.checked)}
                            />
                            <span>PSS sobre FC/CJ</span>
                        </label>
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                className={styles.checkbox}
                                checked={state.incidirPSSGrat}
                                onChange={e => update('incidirPSSGrat', e.target.checked)}
                            />
                            <span>PSS sobre gratificacoes</span>
                        </label>
                    </div>
                </div>

                {(state.regimePrev === 'migrado' || state.regimePrev === 'rpc') && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div>
                            <label className={styles.label}>Aliquota Funpresp</label>
                            <input
                                type="number"
                                className={styles.input}
                                value={state.funprespAliq}
                                onChange={e => update('funprespAliq', toPositiveNumber(e.target.value))}
                            />
                        </div>
                        <div>
                            <label className={styles.label}>Contribuicao Facultativa (%)</label>
                            <input
                                type="number"
                                className={styles.input}
                                value={state.funprespFacul}
                                onChange={e => update('funprespFacul', toPositiveNumber(e.target.value))}
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className={styles.innerBox}>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <h4 className={styles.innerBoxTitle}>
                        <span className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4" />
                            Rubricas dinamicas
                        </span>
                    </h4>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => addRubrica('C')}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-success-500/10 text-success-700 dark:text-success-400 border border-success-500/20 hover:bg-success-500/20 transition-colors text-body-xs font-bold uppercase tracking-wider"
                        >
                            <Plus className="w-4 h-4" />
                            Incluir credito
                        </button>
                        <button
                            type="button"
                            onClick={() => addRubrica('D')}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-error-500/10 text-error-700 dark:text-error-400 border border-error-500/20 hover:bg-error-500/20 transition-colors text-body-xs font-bold uppercase tracking-wider"
                        >
                            <Minus className="w-4 h-4" />
                            Incluir desconto
                        </button>
                    </div>
                </div>

                <p className="text-body-xs text-neutral-500 dark:text-neutral-400 mb-4">
                    Marque se a rubrica entra na base de IR e/ou PSS.
                </p>

                <div className="space-y-3">
                    {state.rubricasExtras.map((rubrica, index) => (
                        <div key={rubrica.id} className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <span className={`px-2.5 py-1 rounded-full text-body-xs font-bold ${rubrica.tipo === 'C'
                                        ? 'bg-success-500/10 text-success-700 dark:text-success-400'
                                        : 'bg-error-500/10 text-error-700 dark:text-error-400'
                                        }`}>
                                        {rubrica.tipo === 'C' ? 'Credito' : 'Desconto'} #{index + 1}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeRubrica(rubrica.id)}
                                    className="text-neutral-400 hover:text-error-500 p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                                    aria-label="Remover rubrica"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <div>
                                    <label className={styles.label}>Tipo</label>
                                    <select
                                        className={styles.input}
                                        value={rubrica.tipo}
                                        onChange={e => updateRubrica(rubrica.id, 'tipo', e.target.value as Rubrica['tipo'])}
                                    >
                                        <option value="C">Credito (+)</option>
                                        <option value="D">Desconto (-)</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className={styles.label}>Descricao</label>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        value={rubrica.descricao}
                                        onChange={e => updateRubrica(rubrica.id, 'descricao', e.target.value)}
                                        placeholder="Ex: Retroativo adicional de qualificacao"
                                    />
                                </div>
                                <div>
                                    <label className={styles.label}>Valor</label>
                                    <input
                                        type="number"
                                        className={styles.input}
                                        value={rubrica.valor || ''}
                                        onChange={e => updateRubrica(rubrica.id, 'valor', toPositiveNumber(e.target.value))}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-4 flex-wrap">
                                <label className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        className={styles.checkbox}
                                        checked={rubrica.incideIR}
                                        onChange={e => updateRubrica(rubrica.id, 'incideIR', e.target.checked)}
                                    />
                                    <span>Incluir na base do IR</span>
                                </label>
                                <label className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        className={styles.checkbox}
                                        checked={rubrica.incidePSS}
                                        onChange={e => updateRubrica(rubrica.id, 'incidePSS', e.target.checked)}
                                    />
                                    <span>Incluir na base do PSS</span>
                                </label>
                            </div>
                        </div>
                    ))}

                    {state.rubricasExtras.length === 0 && (
                        <p className="text-body text-neutral-400 italic py-4">
                            Nenhuma rubrica dinamica adicionada.
                        </p>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="rounded-xl border border-success-500/20 bg-success-500/5 px-4 py-3">
                        <p className="text-label font-bold uppercase tracking-widest text-success-700 dark:text-success-400">
                            Total creditos dinamicos
                        </p>
                        <p className="text-body font-bold font-mono text-success-700 dark:text-success-400">
                            {formatCurrency(totalCreditos)}
                        </p>
                    </div>
                    <div className="rounded-xl border border-error-500/20 bg-error-500/5 px-4 py-3">
                        <p className="text-label font-bold uppercase tracking-widest text-error-700 dark:text-error-400">
                            Total descontos dinamicos
                        </p>
                        <p className="text-body font-bold font-mono text-error-700 dark:text-error-400">
                            {formatCurrency(totalDescontos)}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
