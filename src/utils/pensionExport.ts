import type { PensionMemory, PensionRubricAssessment } from '../types/pension';

/** Informational rows, deliberately separate from credit/debit payroll rows. */
export const buildPensionAuditRows = (memory?: PensionMemory): Array<[string, string | number]> => {
    if (!memory) return [];
    const rows: Array<[string, string | number]> = [];
    const assessments = (items: PensionRubricAssessment[] = []) => {
        for (const rule of items) {
            rows.push(['Enquadramento da rubrica (ID)', rule.rubricaId], ['Natureza previdenciária (ID)', rule.ruleId],
                ['Classificação validada', rule.classification], ['Competência do enquadramento', rule.competencia],
                ['Fonte do enquadramento', rule.source]);
            if (rule.optionDate) rows.push(['Data da opção expressa', rule.optionDate]);
            if (rule.optionReference) rows.push(['Protocolo da opção expressa', rule.optionReference]);
            if (rule.optionAmountConfirmed) rows.push(['Valor elegível desde a opção confirmado', 'Sim']);
        }
    };
    for (const item of [memory.mensal, memory.thirteenth]) {
        if (!item) continue;
        const prefix = `${item.competencia} ${item.tipo === '13' ? '13º' : 'Mensal'}`;
        rows.push([prefix, item.participacao],
            ['Base RPPS integral', item.baseRppsIntegral], ['Teto RGPS', item.teto],
            ['Base RPPS efetiva', item.baseRpps], ['Base Funpresp integral', item.baseComplementarIntegral],
            ['Base Funpresp efetiva', item.baseComplementar], ['Alíquota normal (decimal)', item.aliquotaNormal],
            ['Alíquota facultativa (decimal)', item.aliquotaFacultativa], ['Normal do participante', item.normal],
            ['Facultativa regular total (inclui externa)', item.facultativa], ['Facultativa externa (informativa)', item.facultativaExterna], ['Aporte em folha', item.aporteFolha],
            ['Pagamento externo (informativo)', item.aporteExterno],
            ['Patrocínio (informativo)', item.patrocinador], ['Desconto Funpresp na folha', item.descontoFolha],
            ['Dedução de IR na folha', item.dedutivelIRFolha], ['Parcela sujeita ao limite anual', item.deducaoSujeitaLimiteAnual]);
        for (const warning of item.avisos || []) rows.push(['Pendência / observação', warning]);
        for (const [key, value] of Object.entries(item.componentes)) rows.push([`Componente ${key}`, value]);
        assessments(item.enquadramentos);
    }
    for (const item of memory.retroativos) {
        rows.push(['Destino IR do retroativo', item.destinoIR]);
        for (const [key, value] of Object.entries(item.entrada || {})) {
            if (key === 'vinculos') continue;
            if (value !== undefined) rows.push([`Entrada histórica ${key}`, typeof value === 'number' ? value : String(value)]);
        }
        for (const link of item.entrada?.vinculos || []) {
            rows.push(['Rubrica vinculada (ID)', link.rubricaId], ['Valor distribuído na competência', link.valor]);
        }
        if (item.regraHistoricaId) rows.push(['Regra histórica utilizada', item.regraHistoricaId]);
        if (item.fonteHistorica) rows.push(['Fonte histórica', item.fonteHistorica]);
        assessments(item.enquadramentos);
        if (item.teto !== undefined) rows.push(['Teto histórico RGPS', item.teto]);
        if (item.baseRppsDevida !== undefined) rows.push(['Base RPPS histórica corrigida', item.baseRppsDevida]);
        if (item.baseComplementarDevida !== undefined) rows.push(['Base Funpresp histórica corrigida', item.baseComplementarDevida]);
        rows.push(
        [`Retroativo ${item.competencia} ${item.tipo} (${item.modo})`, item.justificativa || 'Apuração por competência'],
        ['Diferença RPPS', item.rpps], ['Diferença Funpresp', item.complementar]);
    }
    rows.push(['Observação', 'Patrocínio e pagamentos externos são informativos. Ajuste anual de IR não apurado nesta folha.']);
    return rows;
};
