import { Award, Coins, FileText, HandCoins, MinusCircle, PlusCircle, ReceiptText, Shield, StickyNote, UserRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface CalculatorSection {
    label: string;
    Icon: LucideIcon;
    description: string;
    hint?: string;
    descriptionWithTransportIndemnity?: string;
}

const eventCreditsDescription = 'Em Adicionar crédito, você encontra horas extras, substituição de função, férias, 13º salário';

export const CALCULATOR_SECTIONS: CalculatorSection[] = [
    {
        label: 'Dados básicos',
        Icon: UserRound,
        description: 'Escolha o mês da folha e informe seu cargo e padrão.',
    },
    {
        label: 'Adicional de Qualificação (AQ)',
        Icon: Award,
        description: 'Selecione os títulos reconhecidos e a carga de treinamento registrada para a competência.',
    },
    {
        label: 'Vantagens pessoais',
        Icon: Coins,
        description: 'Revise as vantagens pessoais e adicionais lançados na sua remuneração.',
    },
    {
        label: 'Benefícios',
        Icon: HandCoins,
        description: 'Preencha os auxílios que se aplicam a esta competência.',
    },
    {
        label: 'Previdência e abono',
        Icon: Shield,
        description: 'Informe seu regime previdenciário, o abono de permanência e sua participação na Funpresp, quando aplicável.',
    },
    {
        label: 'Imposto de Renda',
        Icon: ReceiptText,
        description: 'Informe quantos dependentes são considerados para o Imposto de Renda. O resumo abaixo mostra a dedução e o cálculo mensal.',
    },
    {
        label: 'Créditos Eventuais',
        Icon: PlusCircle,
        hint: 'Horas extras, férias, 13º e mais',
        description: `${eventCreditsDescription} e diárias.`,
        descriptionWithTransportIndemnity: `${eventCreditsDescription}, diárias e indenização de transporte.`,
    },
    {
        label: 'Descontos',
        Icon: MinusCircle,
        description: 'Inclua os descontos que aparecem na sua folha.',
    },
    {
        label: 'Observações/Notas',
        Icon: StickyNote,
        description: 'Registre observações que deverão acompanhar a impressão da simulação.',
    },
    {
        label: 'Resultado',
        Icon: FileText,
        description: 'Confira o valor líquido estimado e o detalhamento dos créditos e descontos da simulação.',
    },
];
