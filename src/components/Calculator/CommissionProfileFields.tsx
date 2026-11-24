import React from 'react';
import type { CalculatorState } from '../../types';

interface CommissionProfileFieldsProps {
    state: CalculatorState;
    update: (field: keyof CalculatorState, value: any) => void;
    styles: Record<string, string>;
    section: 'basic' | 'pension';
}

export const CommissionProfileFields: React.FC<CommissionProfileFieldsProps> = ({ state, update, styles, section }) => {
    const fieldId = React.useId();
    const profile = state.commissionProfile;
    if (!profile) return null;

    const setProfile = (changes: Record<string, unknown>) => update('commissionProfile', { ...profile, ...changes });
    const numberValue = (value: string) => value === '' ? undefined : Number(value);
    const inputNumber = (id: string, label: string, value: number | undefined, onChange: (value: number | undefined) => void) => <div>
        <label htmlFor={`${fieldId}-${id}`} className={styles.label}>{label}</label>
        <input id={`${fieldId}-${id}`} className={styles.input} type="number" min="0" step="0.01" inputMode="decimal"
            value={value ?? ''} onChange={event => onChange(numberValue(event.target.value))} />
    </div>;

    if (section === 'basic' && profile.kind === 'exclusive_cj') return null;
    if (section === 'basic' && profile.kind === 'external') {
        const isCj = /^cj/i.test(state.funcao);
        const showOrigin = !isCj || profile.cjOption === 'effective_plus_65';
        return <section className={`${styles.formSection} space-y-4`} aria-labelledby={`${fieldId}-origem`}>
            <h4 id={`${fieldId}-origem`} className={styles.innerBoxTitle}>Vínculo e remuneração de origem</h4>
            <div>
                <label htmlFor={`${fieldId}-vinculo`} className={styles.label}>Vínculo de origem</label>
                <select id={`${fieldId}-vinculo`} className={styles.input} value={profile.originLink ?? ''}
                    onChange={event => setProfile({ originLink: event.target.value || undefined })}>
                    <option value="">Selecione o vínculo</option>
                    <option value="statutory">Cargo público efetivo</option>
                    <option value="public_employee">Emprego público</option>
                </select>
            </div>
            {isCj && <div>
                <label htmlFor={`${fieldId}-opcao`} className={styles.label}>Opção de remuneração do CJ</label>
                <select id={`${fieldId}-opcao`} className={styles.input} value={profile.cjOption ?? ''}
                    onChange={event => setProfile({ cjOption: event.target.value || undefined })}>
                    <option value="">Selecione a opção</option>
                    <option value="full">Valor integral do cargo em comissão</option>
                    <option value="effective_plus_65">Remuneração de origem acrescida de 65% do CJ</option>
                </select>
            </div>}
            {showOrigin && <>
                <div>
                    <label htmlFor={`${fieldId}-pagador`} className={styles.label}>Quem paga a remuneração de origem?</label>
                    <select id={`${fieldId}-pagador`} className={styles.input} value={profile.payment ?? ''}
                        onChange={event => setProfile({ payment: event.target.value || undefined })}>
                        <option value="">Selecione o pagador</option>
                        <option value="origin">Órgão de origem</option>
                        <option value="judiciary">Judiciário, nesta folha</option>
                    </select>
                </div>
                {profile.payment === 'judiciary' && inputNumber('remuneracao', 'Remuneração de origem paga nesta folha', profile.originRemuneration,
                    value => setProfile({ originRemuneration: value }))}
                <p className="text-body-sm">O resultado considera os valores pagos na folha do Judiciário.</p>
                {profile.payment === 'judiciary' && <>
                    <div>
                        <label htmlFor={`${fieldId}-ferias`} className={styles.label}>A parcela de origem é paga pelo Judiciário no adicional de férias?</label>
                        <select id={`${fieldId}-ferias`} className={styles.input}
                            value={profile.vacationPaysOriginRemuneration === undefined ? '' : String(profile.vacationPaysOriginRemuneration)}
                            onChange={event => setProfile({ vacationPaysOriginRemuneration: event.target.value === '' ? undefined : event.target.value === 'true' })}>
                            <option value="">Selecione se houver pagamento de férias</option>
                            <option value="true">Sim</option>
                            <option value="false">Não</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor={`${fieldId}-decimo`} className={styles.label}>A parcela de origem é paga pelo Judiciário no 13º?</label>
                        <select id={`${fieldId}-decimo`} className={styles.input}
                            value={profile.thirteenthPaysOriginRemuneration === undefined ? '' : String(profile.thirteenthPaysOriginRemuneration)}
                            onChange={event => setProfile({ thirteenthPaysOriginRemuneration: event.target.value === '' ? undefined : event.target.value === 'true' })}>
                            <option value="">Selecione se houver pagamento de 13º</option>
                            <option value="true">Sim</option>
                            <option value="false">Não</option>
                        </select>
                    </div>
                </>}
            </>}
        </section>;
    }

    if (section === 'pension' && profile.kind === 'exclusive_cj') return <section id="regime-previdenciario" className={`${styles.formSection} space-y-4`}>
        <h4 className={styles.innerBoxTitle}>Previdência — RGPS</h4>
        <p className="text-body-sm">Informe a remuneração sujeita ao INSS em outros vínculos na competência. Use zero se não houver outro vínculo.</p>
        {inputNumber('outros-vinculos', 'Base de outros vínculos no mês', profile.otherRgpsBase, value => setProfile({ otherRgpsBase: value }))}
        {inputNumber('outros-vinculos-decimo', 'Base de outros vínculos no 13º', profile.otherRgpsThirteenthBase, value => setProfile({ otherRgpsThirteenthBase: value }))}
    </section>;

    if (section === 'pension' && profile.kind === 'external') return <section id="regime-previdenciario" className={`${styles.formSection} space-y-4`}>
        <h4 className={styles.innerBoxTitle}>Previdência do vínculo de origem</h4>
        <div>
            <label htmlFor={`${fieldId}-regime`} className={styles.label}>Regime previdenciário</label>
            <select id={`${fieldId}-regime`} className={styles.input} value={profile.pensionRegime ?? ''}
                onChange={event => setProfile({ pensionRegime: event.target.value || undefined })}>
                <option value="">Selecione o regime</option>
                <option value="rpps">Regime próprio — RPPS</option>
                <option value="rgps">Regime geral — RGPS</option>
            </select>
        </div>
        <p className="text-body-sm">Informe a contribuição previdenciária descontada nesta folha, conforme os dados do vínculo e da cessão. Use zero quando não houver desconto.</p>
        {inputNumber('desconto-mensal', 'Contribuição previdenciária mensal nesta folha', profile.withholdingMonthly, value => setProfile({ withholdingMonthly: value }))}
        {inputNumber('desconto-decimo', 'Contribuição previdenciária do 13º nesta folha', profile.withholdingThirteenth, value => setProfile({ withholdingThirteenth: value }))}
        {inputNumber('desconto-ferias', 'Contribuição previdenciária sobre férias nesta folha', profile.withholdingVacation, value => setProfile({ withholdingVacation: value }))}
    </section>;
    return null;
};
