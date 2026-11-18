import { Award, Briefcase, FileText, HeartPulse, MinusCircle, PlusCircle, ReceiptText, Shield, StickyNote, UserRound } from 'lucide-react';

export const CALCULATOR_SECTIONS = [
    { label: 'Dados básicos', Icon: UserRound },
    { label: 'Adicional de Qualificação (AQ)', Icon: Award },
    { label: 'Vantagens pessoais', Icon: Briefcase },
    { label: 'Benefícios', Icon: HeartPulse },
    { label: 'Previdência e abono', Icon: Shield },
    { label: 'Imposto de Renda', Icon: ReceiptText },
    { label: 'Créditos Eventuais', hint: 'Horas extras, férias, 13º e mais', Icon: PlusCircle },
    { label: 'Descontos', Icon: MinusCircle },
    { label: 'Observações/Notas', Icon: StickyNote },
    { label: 'Resultado', Icon: FileText }
];
