import React from 'react';
import type { PrevidenciaComplementarConfig, Rubrica } from '../../types';
import { resolvePensionRubricRule } from '../../services/agency/engine/modules/pensionCatalog';

interface Props {
    rubrica: Rubrica;
    competencia: string;
    config?: PrevidenciaComplementarConfig;
    styles: Record<string, string>;
    updateRubrica: (id: string, field: keyof Rubrica, value: any) => void;
}

/** Classification and legal effects are validated by the engine, including in every historical group. */
export const PensionRubricFields: React.FC<Props> = ({ rubrica, competencia, config, styles, updateRubrica }) => {
    const historical = Boolean(rubrica.pssCompetenciaSeparada || (rubrica.incideFunpresp && rubrica.funprespCompetenciaSeparada));
    const candidates = [...(config?.rubricCatalog ?? []), ...(config?.historicalRules ?? []).flatMap(rule => rule.configuration.rubricCatalog ?? [])];
    const options = Array.from(new Map(candidates.map(rule => [rule.id, rule])).values());
    let rule: ReturnType<typeof resolvePensionRubricRule> | undefined;
    try { rule = resolvePensionRubricRule(config, rubrica.pensionRubricId, competencia); } catch { /* Incomplete drafts remain editable. */ }
    const names = { obrigatoria: 'Inclusão obrigatória', facultativa: 'Inclusão por opção expressa', excluida: 'Excluída da base', pendente: 'Enquadramento pendente' };
    return <fieldset className="rounded-xl border border-neutral-200 dark:border-neutral-700 p-3 space-y-2">
        <legend className="text-body-xs font-semibold">Enquadramento da verba na Funpresp</legend>
        <label className={styles.label}>Natureza da verba
            <select aria-label={`Natureza previdenciária de ${rubrica.descricao || rubrica.id}`} className={styles.input}
                value={rubrica.pensionRubricId ?? ''} onChange={event => {
                    const id = event.target.value || undefined;
                    updateRubrica(rubrica.id, 'pensionRubricId', id);
                    if (!historical) {
                        try {
                            const selected = resolvePensionRubricRule(config, id, competencia);
                            if (selected.classification === 'obrigatoria') updateRubrica(rubrica.id, 'incideFunpresp', true);
                            if (selected.classification === 'excluida') updateRubrica(rubrica.id, 'incideFunpresp', false);
                        } catch { /* Do not guess an incidence when the classification is unavailable. */ }
                    }
                }}>
                <option value="">Selecione a natureza da verba</option>
                {rubrica.pensionRubricId && !options.some(item => item.id === rubrica.pensionRubricId) &&
                    <option value={rubrica.pensionRubricId}>Enquadramento salvo indisponível — revisar</option>}
                {options.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
        </label>
        {!options.length && <p role="status" className="text-body-xs">Catálogo previdenciário indisponível. Verbas que exigem enquadramento permanecerão pendentes.</p>}
        {historical ? <p className="text-body-xs">O enquadramento e a opção serão conferidos na regra de cada competência original.</p>
            : rule && <p className="text-body-xs">{names[rule.classification]}. Fonte: {/^https:\/\//.test(rule.source)
                ? <a className="underline" href={rule.source} target="_blank" rel="noreferrer">Consultar fundamento</a> : rule.source}</p>}
        {rubrica.incideFunpresp && (historical || rule?.classification === 'facultativa') && <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className={styles.label}>Data de efeito da opção expressa
                <input aria-label={`Data da opção de ${rubrica.id}`} type="date" className={styles.input} value={rubrica.pensionOptionDate ?? ''}
                    onChange={event => {
                        updateRubrica(rubrica.id, 'pensionOptionDate', event.target.value || undefined);
                        updateRubrica(rubrica.id, 'pensionOptionAmountConfirmed', false);
                    }} />
            </label>
            <label className={styles.label}>Referência do protocolo ou documento da opção
                <input aria-label={`Referência da opção de ${rubrica.id}`} type="text" className={styles.input} value={rubrica.pensionOptionReference ?? ''}
                    onChange={event => updateRubrica(rubrica.id, 'pensionOptionReference', event.target.value || undefined)} />
            </label>
            <p className="md:col-span-2 text-body-xs">Preencha para parcelas facultativas incluídas. O valor lançado deve corresponder à parcela elegível a partir da opção; não há prorrata automática.</p>
            <label className={`${styles.checkboxLabel} md:col-span-2`}>
                <input type="checkbox" className={styles.checkbox} checked={Boolean(rubrica.pensionOptionAmountConfirmed)}
                    onChange={event => updateRubrica(rubrica.id, 'pensionOptionAmountConfirmed', event.target.checked)} />
                <span>O valor lançado considera somente a parcela elegível a partir da data da opção.</span>
            </label>
        </div>}
    </fieldset>;
};
