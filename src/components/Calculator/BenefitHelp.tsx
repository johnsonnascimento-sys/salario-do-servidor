import React from 'react';
import type { CalculatorState, CourtConfig } from '../../types';
import { formatCurrency } from '../../utils/calculations';
import { getBenefitNormativeReferences } from '../../utils/benefitNormativeReferences';
import { toReferenceMonthIndex } from './referenceDateUtils';

export type BenefitHelpKind = 'transport' | 'preschool' | 'food';

interface BenefitHelpProps {
    kind: BenefitHelpKind;
    orgSlug: CourtConfig['orgSlug'];
    state: Pick<CalculatorState, 'mesRef' | 'anoRef' | 'auxAlimentacao' | 'auxAlimentacaoProporcional' | 'auxPreEscolarQtd' | 'auxPreEscolarValor'>;
    calculationReady: boolean;
}

const CJF_RESOLUTION = 'https://www.cjf.jus.br/publico/biblioteca/Res%20004-2008.pdf';
const STM_TRANSPORT = 'https://www2.stm.jus.br/sislegis/index.php/ctrl_publico_extranet/link_detalhar/34963';
const STM_PREVIOUS_TRANSPORT = 'https://www2.stm.jus.br/sislegis/index.php/ctrl_publico_pdf/visualizar/25857-ATN-000309_26-12-2018_STM_1.pdf';
const STM_PRESCHOOL = 'https://www2.stm.jus.br/sislegis/index.php/ctrl_publico_pdf/visualizar/9295-ATN-000292_06-08-2008_STM_0.pdf';
const STM_TRANSPORT_CHANGE_MONTH = '2025-03';

const Source = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a className="underline" href={href} target="_blank" rel="noreferrer">{children}</a>
);

export function BenefitHelp({ kind, orgSlug, state, calculationReady }: BenefitHelpProps) {
    const month = toReferenceMonthIndex(state.mesRef);
    const competence = month && Number.isFinite(state.anoRef)
        ? `${state.anoRef}-${String(month).padStart(2, '0')}`
        : '';
    const isJmu = orgSlug === 'jmu' || orgSlug === 'stm';
    const isFederalJustice = orgSlug === 'cjf' || /^trf[1-6]$/.test(orgSlug ?? '');
    const references = kind !== 'transport' && (isJmu || isFederalJustice)
        ? getBenefitNormativeReferences(kind, competence)
        : [];

    return (
        <div className="space-y-2" aria-live="polite">
            {kind === 'transport' && <>
                <p>O auxílio-transporte cobre parte das despesas do trajeto entre a residência e o trabalho. Informe o gasto mensal com os deslocamentos. O valor do auxílio depende da despesa e da cota-parte aplicável.</p>
                {isJmu && competence && <p>
                    Na JMU, {competence < STM_TRANSPORT_CHANGE_MONTH
                        ? <>a referência para esta competência é o <Source href={STM_PREVIOUS_TRANSPORT}>Ato Normativo STM nº 309/2018</Source>.</>
                        : <>o <Source href={STM_TRANSPORT}>Ato Normativo STM nº 824/2025</Source> regulamenta o benefício desde 07/03/2025.</>}
                    {competence === STM_TRANSPORT_CHANGE_MONTH && <> Até a mudança, aplicava-se o <Source href={STM_PREVIOUS_TRANSPORT}>Ato Normativo STM nº 309/2018</Source>.</>}
                </p>}
                {isFederalJustice && <p>No CJF e na Justiça Federal de 1º e 2º graus, a concessão segue a <Source href={CJF_RESOLUTION}>Resolução CJF nº 4/2008, arts. 2º a 16</Source>. A <Source href="https://www.cjf.jus.br/publico/biblioteca/Res%20605-2019%20publ.pdf">Resolução CJF nº 605/2019</Source> atualizou a regra sobre os meios de transporte.</p>}
            </>}
            {kind === 'preschool' && <>
                <p>O auxílio pré-escolar é pago por dependente elegível. Informe a quantidade de dependentes e confira a cota por dependente na competência da folha.</p>
                {isJmu && <p>
                    Na JMU, o programa é regulamentado pelo <Source href={STM_PRESCHOOL}>Ato Normativo STM nº 292/2008</Source>.
                    {competence >= '2024-02' && <> Veja também a alteração pelo <Source href="https://www2.stm.jus.br/sislegis/index.php/ctrl_publico_pdf/visualizar/33157-ATN-000709_12-01-2024_STM_0.pdf">Ato Normativo STM nº 709/2024</Source>.</>}
                </p>}
                {isFederalJustice && <p>
                    No CJF e na Justiça Federal de 1º e 2º graus, a concessão segue a <Source href={CJF_RESOLUTION}>Resolução CJF nº 4/2008, arts. 75 a 95</Source>.
                    {competence >= '2023-06' && <> Veja a atualização pela <Source href="https://www.cjf.jus.br/publico/biblioteca/Res%20832-2023.pdf">Resolução CJF nº 832/2023</Source></>}
                    {competence >= '2024-08' && <> e pela <Source href="https://www.cjf.jus.br/publico/biblioteca/Res_904-2024_publ_DOU.pdf">Resolução CJF nº 905/2024</Source></>}
                    {competence >= '2023-06' && '.'}
                </p>}
                <p>Referências gerais do programa de assistência pré-escolar: <Source href="https://www.planalto.gov.br/ccivil_03/decreto/antigos/d0977.htm">Decreto nº 977/1993</Source> e <Source href="https://www.planalto.gov.br/ccivil_03/leis/l8069.htm#art54">ECA, art. 54, IV</Source>.</p>
            </>}
            {kind === 'food' && <>
                <p>O auxílio-alimentação ajuda a custear as refeições do servidor. A calculadora preenche o valor conforme a competência da folha.</p>
                {isFederalJustice && <p>No CJF e na Justiça Federal de 1º e 2º graus, a concessão segue a <Source href={CJF_RESOLUTION}>Resolução CJF nº 4/2008, arts. 17 a 30</Source>.</p>}
            </>}
            {kind !== 'transport' && (isJmu || isFederalJustice) && <>
                {references.length ? (
                    <ul className="list-disc space-y-1 pl-5">
                        {references.map(reference => (
                            <li key={reference.effectiveFrom}>
                                <strong>{formatCurrency(reference.amount)}</strong>{kind === 'preschool' ? ' por dependente' : ' mensais'}
                                {' desde '}{reference.effectiveFrom.split('-').reverse().join('/')}{' · '}
                                <Source href={reference.href}>{reference.label}</Source>
                            </li>
                        ))}
                    </ul>
                ) : <p>Não há referência das portarias conjuntas cadastrada para esta competência.</p>}
                {references.length > 0 && <p>
                    A <Source href="https://atos.cnj.jus.br/atos/detalhar/atos-normativos?documento=903">Portaria Conjunta nº 5/2011</Source> estabeleceu a política de valores do PJU.
                    {' '}A implantação de cada reajuste depende da disponibilidade orçamentária do órgão.
                </p>}
            </>}
            {calculationReady && kind === 'food' && state.auxAlimentacao > 0 && <p>
                <strong>{state.auxAlimentacaoProporcional ? 'Valor proporcional na simulação' : 'Valor usado na simulação'}:</strong>{' '}
                {formatCurrency(state.auxAlimentacao)}.
            </p>}
            {calculationReady && kind === 'preschool' && state.auxPreEscolarQtd > 0 && <p>
                <strong>Total na simulação:</strong> {formatCurrency(state.auxPreEscolarValor)}.
            </p>}
        </div>
    );
}
