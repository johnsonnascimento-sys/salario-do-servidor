import type { PensionParticipation } from '../../types/pension';

export const PENSION_GUIDANCE = 'Informe seu enquadramento e sua participação conforme o cadastro ou contracheque.';

export const PENSION_REGIME_HELP = {
    antigo: 'A contribuição ao regime próprio é calculada sobre a base contributiva, sem limitação ao teto do INSS.',
    rpc: 'A contribuição ao regime próprio é calculada sobre a base contributiva até o teto do INSS. Você continua no RPPS.',
} as const;

export const PENSION_PARTICIPATION_HELP: Record<PensionParticipation, string> = {
    nao: 'Não há desconto de contribuição à Funpresp nesta simulação. O RPPS é calculado separadamente.',
    patrocinado: 'Você contribui sobre a parcela da base da Funpresp que ultrapassa o teto do INSS, e o órgão também contribui conforme as regras do plano.',
    vinculado: 'Você contribui sobre a remuneração de participação escolhida, dentro dos limites do plano. O órgão não faz contribuição correspondente.',
};

export const PENSION_HELP_CLASS = 'mt-2 text-body-xs font-normal normal-case tracking-normal leading-relaxed text-neutral-600 dark:text-neutral-300';
