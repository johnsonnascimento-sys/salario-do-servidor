import React from 'react';
import { Clock } from 'lucide-react';
import { OvertimeEntry } from '../../../types';

type Snapshot = NonNullable<OvertimeEntry['competenciaSnapshot']>;

interface OvertimeCardProps {
    entry: OvertimeEntry;
    updateEntry: (id: string, patch: Partial<OvertimeEntry>) => void;
    styles: any;
    currentSnapshotDefaults: Snapshot;
    currentReferenceMonth: number;
    currentReferenceYear: number;
    salaryTable: Record<string, Record<string, number>>;
    functionTable: Record<string, number>;
    noFunctionCode: string;
    noFunctionLabel: string;
    pssOptions: string[];
}

const ensureMonth = (value: number) => Math.min(12, Math.max(1, Math.trunc(value || 1)));
const ensureYear = (value: number) => Math.min(2100, Math.max(2000, Math.trunc(value || new Date().getFullYear())));

export const OvertimeCard: React.FC<OvertimeCardProps> = ({
    entry,
    updateEntry,
    styles,
    currentSnapshotDefaults,
    currentReferenceMonth,
    currentReferenceYear,
    salaryTable,
    functionTable,
    noFunctionCode,
    noFunctionLabel,
    pssOptions
}) => {
    const snapshot = entry.competenciaSnapshot || currentSnapshotDefaults;
    const cargoOptions = Object.keys(salaryTable || {});
    const padraoOptions = Object.keys((salaryTable || {})[snapshot.cargo] || {});

    const updateSnapshot = (patch: Partial<Snapshot>) => {
        updateEntry(entry.id, {
            competenciaSnapshot: {
                ...snapshot,
                ...patch
            }
        });
    };

    return (
        <div className={styles.card}>
            <h3 className={styles.sectionTitle}>
                <Clock className="w-4 h-4" /> Serviço Extraordinário (HE)
            </h3>
            <div className={styles.innerBox}>
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className={styles.label}>Competência da rubrica (MM/AAAA)</label>
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="number"
                                    className={styles.input}
                                    min={1}
                                    max={12}
                                    value={entry.competenciaMes || currentReferenceMonth}
                                    onChange={e => updateEntry(entry.id, { competenciaMes: ensureMonth(Number(e.target.value)) })}
                                />
                                <input
                                    type="number"
                                    className={styles.input}
                                    min={2000}
                                    max={2100}
                                    value={entry.competenciaAno || currentReferenceYear}
                                    onChange={e => updateEntry(entry.id, { competenciaAno: ensureYear(Number(e.target.value)) })}
                                />
                            </div>
                        </div>
                        <label className={`${styles.checkboxLabel} md:mt-8`}>
                            <input
                                type="checkbox"
                                className={styles.checkbox}
                                checked={Boolean(entry.usarDadosCompetencia)}
                                onChange={e => {
                                    const checked = e.target.checked;
                                    updateEntry(entry.id, {
                                        usarDadosCompetencia: checked,
                                        competenciaSnapshot: checked ? (entry.competenciaSnapshot || currentSnapshotDefaults) : entry.competenciaSnapshot
                                    });
                                }}
                            />
                            <span>Usar dados funcionais da competência</span>
                        </label>
                    </div>

                    {entry.usarDadosCompetencia && (
                        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 space-y-3">
                            <p className="text-body-xs text-neutral-500 dark:text-neutral-400">
                                Informe a situação funcional vigente na competência selecionada.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                    <label className={styles.label}>Cargo</label>
                                    <select
                                        className={styles.input}
                                        value={snapshot.cargo}
                                        onChange={e => {
                                            const nextCargo = e.target.value;
                                            const nextPadroes = Object.keys((salaryTable || {})[nextCargo] || {});
                                            updateSnapshot({ cargo: nextCargo, padrao: nextPadroes[0] || '' });
                                        }}
                                    >
                                        {cargoOptions.map((cargo) => (
                                            <option key={cargo} value={cargo}>{cargo.toUpperCase()}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className={styles.label}>Classe/Padrão</label>
                                    <select className={styles.input} value={snapshot.padrao} onChange={e => updateSnapshot({ padrao: e.target.value })}>
                                        {padraoOptions.map((padrao) => (
                                            <option key={padrao} value={padrao}>{padrao}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className={styles.label}>FC/CJ</label>
                                    <select className={styles.input} value={snapshot.funcao} onChange={e => updateSnapshot({ funcao: e.target.value })}>
                                        {noFunctionCode && <option value={noFunctionCode}>{noFunctionLabel}</option>}
                                        {Object.keys(functionTable || {}).map((funcao) => (
                                            <option key={funcao} value={funcao}>{funcao.toUpperCase()}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <div>
                                    <label className={styles.label}>AQ Títulos %</label>
                                    <input type="number" className={styles.input} min={0} step={0.001} value={snapshot.aqTituloPerc || 0} onChange={e => updateSnapshot({ aqTituloPerc: Math.max(0, Number(e.target.value) || 0) })} />
                                </div>
                                <div>
                                    <label className={styles.label}>AQ Trein. %</label>
                                    <input type="number" className={styles.input} min={0} step={0.001} value={snapshot.aqTreinoPerc || 0} onChange={e => updateSnapshot({ aqTreinoPerc: Math.max(0, Number(e.target.value) || 0) })} />
                                </div>
                                <div>
                                    <label className={styles.label}>AQ Títulos VR</label>
                                    <input type="number" className={styles.input} min={0} step={0.1} value={snapshot.aqTituloVR || 0} onChange={e => updateSnapshot({ aqTituloVR: Math.max(0, Number(e.target.value) || 0) })} />
                                </div>
                                <div>
                                    <label className={styles.label}>AQ Trein. VR</label>
                                    <input type="number" className={styles.input} min={0} step={0.1} value={snapshot.aqTreinoVR || 0} onChange={e => updateSnapshot({ aqTreinoVR: Math.max(0, Number(e.target.value) || 0) })} />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                                <div>
                                    <label className={styles.label}>VPNI (Lei)</label>
                                    <input type="number" className={styles.input} min={0} value={snapshot.vpni_lei || 0} onChange={e => updateSnapshot({ vpni_lei: Math.max(0, Number(e.target.value) || 0) })} />
                                </div>
                                <div>
                                    <label className={styles.label}>VPNI (Decisão)</label>
                                    <input type="number" className={styles.input} min={0} value={snapshot.vpni_decisao || 0} onChange={e => updateSnapshot({ vpni_decisao: Math.max(0, Number(e.target.value) || 0) })} />
                                </div>
                                <div>
                                    <label className={styles.label}>ATS</label>
                                    <input type="number" className={styles.input} min={0} value={snapshot.ats || 0} onChange={e => updateSnapshot({ ats: Math.max(0, Number(e.target.value) || 0) })} />
                                </div>
                                <div>
                                    <label className={styles.label}>Regime Prev.</label>
                                    <select className={styles.input} value={snapshot.regimePrev} onChange={e => updateSnapshot({ regimePrev: e.target.value as Snapshot['regimePrev'] })}>
                                        <option value="antigo">RPPS (Antigo)</option>
                                        <option value="migrado">RPPS (Migrado)</option>
                                        <option value="rpc">RPC</option>
                                        <option value="novo_antigo">Novo Antigo</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={styles.label}>Tabela PSS</label>
                                    <select className={styles.input} value={snapshot.tabelaPSS} onChange={e => updateSnapshot({ tabelaPSS: e.target.value })}>
                                        {pssOptions.map((option) => (
                                            <option key={option} value={option}>{option}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                    <label className={styles.label}>Gratificação específica</label>
                                    <select className={styles.input} value={snapshot.gratEspecificaTipo} onChange={e => updateSnapshot({ gratEspecificaTipo: e.target.value as Snapshot['gratEspecificaTipo'] })}>
                                        <option value="0">Nenhuma</option>
                                        <option value="gae">GAE</option>
                                        <option value="gas">GAS</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 flex-wrap">
                                <label className={styles.checkboxLabel}>
                                    <input type="checkbox" className={styles.checkbox} checked={snapshot.recebeAbono} onChange={e => updateSnapshot({ recebeAbono: e.target.checked })} />
                                    <span>Recebe abono de permanência</span>
                                </label>
                                <label className={styles.checkboxLabel}>
                                    <input type="checkbox" className={styles.checkbox} checked={snapshot.pssSobreFC} onChange={e => updateSnapshot({ pssSobreFC: e.target.checked })} />
                                    <span>PSS sobre FC/CJ</span>
                                </label>
                                <label className={styles.checkboxLabel}>
                                    <input type="checkbox" className={styles.checkbox} checked={snapshot.incidirPSSGrat} onChange={e => updateSnapshot({ incidirPSSGrat: e.target.checked })} />
                                    <span>PSS sobre gratificação específica</span>
                                </label>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                className={styles.checkbox}
                                checked={entry.isEA}
                                onChange={e => {
                                    const checked = e.target.checked;
                                    updateEntry(entry.id, { isEA: checked, excluirIR: checked ? false : entry.excluirIR });
                                }}
                            />
                            <span>Incluir na base do IR (Exercício Anterior - EA)</span>
                        </label>
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                className={styles.checkbox}
                                checked={entry.excluirIR}
                                onChange={e => {
                                    const checked = e.target.checked;
                                    updateEntry(entry.id, { excluirIR: checked, isEA: checked ? false : entry.isEA });
                                }}
                            />
                            <span>Excluir da base do IR</span>
                        </label>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={styles.label}>Qtd. Horas (50%)</label>
                            <input
                                type="number"
                                className={styles.input}
                                min={0}
                                value={entry.qtd50}
                                onChange={e => updateEntry(entry.id, { qtd50: Math.max(0, Number(e.target.value) || 0) })}
                            />
                        </div>
                        <div>
                            <label className={styles.label}>Qtd. Horas (100%)</label>
                            <input
                                type="number"
                                className={styles.input}
                                min={0}
                                value={entry.qtd100}
                                onChange={e => updateEntry(entry.id, { qtd100: Math.max(0, Number(e.target.value) || 0) })}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
