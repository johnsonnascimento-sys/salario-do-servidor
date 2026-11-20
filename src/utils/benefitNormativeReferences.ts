export interface BenefitRuleSource {
    label: string;
    href: string;
}

export type TabledBenefit = 'food' | 'preschool';

interface JointOrder extends BenefitRuleSource {
    effectiveFrom: string;
    food: number;
    preschool?: number;
}

// Published reference values for the help panels. Payroll uses the configured benefit values.
const JOINT_ORDERS: JointOrder[] = [
    {
        label: 'Portaria Conjunta nº 1/2023',
        href: 'https://www.tse.jus.br/legislacao/compilada/prtc/2023/portaria-conjunta-no-1-de-1o-de-fevereiro-de-2023',
        effectiveFrom: '2023-02-07',
        food: 1182.74,
        preschool: 935.22,
    },
    {
        label: 'Portaria Conjunta nº 1/2024',
        href: 'https://www.cjf.jus.br/publico/biblioteca/PCJ-CNJ%201-2024%20publ.pdf',
        effectiveFrom: '2024-02-01',
        food: 1393.10,
        preschool: 1178.82,
    },
    {
        label: 'Portaria Conjunta nº 2/2025',
        href: 'https://www.cjf.jus.br/publico/biblioteca/PCJ_CNJ_2-2025_publ.pdf',
        effectiveFrom: '2025-02-03',
        food: 1460.40,
        preschool: 1235.77,
    },
    {
        label: 'Portaria Conjunta nº 3/2025',
        href: 'https://www.cjf.jus.br/publico/biblioteca/PCJ_CNJ_3-2025_publ.pdf',
        effectiveFrom: '2025-04-01',
        food: 1784.42,
    },
    {
        label: 'Portaria Conjunta nº 1/2026',
        href: 'https://www.tse.jus.br/legislacao/compilada/prtc/2026/portaria-conjunta-no-1-de-3-de-fevereiro-de-2026',
        effectiveFrom: '2026-02-06',
        food: 1860.51,
        preschool: 1288.47,
    },
];

export const getBenefitNormativeReferences = (benefit: TabledBenefit, competence: string) => {
    const applicable = JOINT_ORDERS.flatMap(order => {
        const amount = order[benefit];
        return amount !== undefined && order.effectiveFrom.slice(0, 7) <= competence ? [{ ...order, amount }] : [];
    });
    const latest = applicable[applicable.length - 1];
    if (!latest) return [];

    const changedMidMonth = latest.effectiveFrom.startsWith(`${competence}-`) && !latest.effectiveFrom.endsWith('-01');
    return changedMidMonth ? applicable.slice(-2) : [latest];
};
