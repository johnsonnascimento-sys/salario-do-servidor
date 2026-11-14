/** User-facing explanations; raw engine errors remain available for diagnostics. */
export const getPensionErrorFeedback = (error?: string | null): { title: string; message: string; configuration: boolean } | null => {
    if (!error) return null;
    const detail = error.replace(/^Participação vinculada pendente:\s*/i, '').replace(/^Previdência:\s*/i, '');
    const missing = detail.match(/^modalidade vinculada exige URP e fonte oficial da competência (\d{4})-(\d{2})/i);
    if (missing) {
        const month = Number(missing[2]);
        const period = month >= 1 && month <= 12
            ? new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(Number(missing[1]), month - 1, 1)))
            : `${missing[2]}/${missing[1]}`;
        return {
            title: 'A Funpresp precisa de uma atualização no site', configuration: true,
            message: `A tabela necessária para a sua base de contribuição de ${period} ainda precisa ser atualizada pela equipe do site. Seus dados foram mantidos. Não altere seus dados apenas para contornar essa atualização; confira a referência no cadastro do plano.`,
        };
    }
    if (/^(quantidade mínima de URPs|mínimo em URP inválido)/i.test(detail)) return {
        title: 'A Funpresp precisa de uma atualização no site', configuration: true,
        message: 'A equipe do site precisa revisar os limites de contribuição da Funpresp. Seus dados foram mantidos; você não precisa corrigir essa configuração.',
    };
    if (/^informe o início da participação vinculada/i.test(detail)) return {
        title: 'Complete os dados da Funpresp', configuration: false,
        message: 'Informe o mês e o ano da inscrição ou da última alteração da sua base que já estava valendo nesta folha. Consulte o cadastro no plano; essa data não pode ser posterior ao mês do holerite.',
    };
    return null;
};
