import type { CourtConfig } from '../../../../types';
import type { PensionCalculationMemory, PensionParticipation, PensionRetroMemory } from '../../../../types/pension';
import type { IAgencyCalculationParams } from '../types';
import { calculatePss } from '../../../../core/calculations/taxUtils';

export const roundPension = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
export const hasPensionCeiling = (regime: string) => regime === 'migrado' || regime === 'rpc';
const fail = (message: string): never => { throw new Error(`Previdência: ${message}`); };
const nonnegative = (value: unknown, label: string): number => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) fail(`${label} deve ser um número não negativo.`);
    return value as number;
};
const checkRate = (value: number, rule: { min?: number; max?: number; step?: number } | undefined, label: string) => {
    nonnegative(value, label);
    if (!rule || !Number.isFinite(rule.min) || (rule.max !== undefined && !Number.isFinite(rule.max))) fail(`configuração de ${label} ausente ou inválida.`);
    if (value < rule.min! || (rule.max !== undefined && value > rule.max)) fail(`${label} fora dos limites configurados.`);
    if (rule.step !== undefined && (!Number.isFinite(rule.step) || !(rule.step > 0) || Math.abs((value - rule.min!) / rule.step - Math.round((value - rule.min!) / rule.step)) > 1e-6)) {
        fail(`${label} fora da grade configurada.`);
    }
};

export interface PensionComponents {
    vencimento: number;
    gaj: number;
    aqTitulo: number;
    aqTreino: number;
    gratificacao: number;
    vantagens: number;
    fc: number;
    rubricas: number;
}

/** Separate participation base: opting into FC/GAS never changes the RPPS base. */
export const buildComplementaryBase = (
    params: IAgencyCalculationParams, components: PensionComponents
): { base: number; componentes: Record<string, number> } => {
    const rules = params.agencyConfig?.previdenciaComplementar?.incidenceRules;
    const selected = {
        vencimento: components.vencimento,
        gaj: components.gaj,
        aqTitulo: components.aqTitulo,
        vantagens: components.vantagens,
        rubricas: components.rubricas,
        fc: 0, gratificacao: 0, aqTreino: 0,
    };
    const include = (flag: boolean | undefined, allowed: boolean | undefined, amount: number, name: string) => {
        if (flag && !allowed) fail(`inclusão de ${name} não autorizada pela configuração.`);
        return flag ? amount : 0;
    };
    selected.fc = include(params.funprespIncluirFC, rules?.fc, components.fc, 'FC/CJ');
    selected.aqTreino = include(params.funprespIncluirAQTreino, rules?.aqTreino, components.aqTreino, 'AQ treinamento');
    selected.gratificacao = params.gratEspecificaTipo === 'gas'
        ? include(params.funprespIncluirGAS, rules?.gas, components.gratificacao, 'GAS')
        : params.gratEspecificaTipo === 'gae'
            ? include(params.funprespIncluirGAE, rules?.gae, components.gratificacao, 'GAE') : 0;
    return { base: Math.max(0, Object.values(selected).reduce((sum, value) => sum + value, 0)), componentes: selected };
};

export const calculateComplementaryPension = (
    params: IAgencyCalculationParams,
    baseRppsIntegral: number,
    baseComplementarIntegral: number,
    tipo: 'mensal' | '13' = 'mensal',
    componentes: Record<string, number> = {},
): PensionCalculationMemory => {
    nonnegative(baseRppsIntegral, 'base RPPS');
    nonnegative(baseComplementarIntegral, 'base complementar');
    Object.entries(componentes).forEach(([name, value]) => {
        if (!Number.isFinite(value)) fail(`componente ${name} inválido.`);
    });
    if (!['antigo', 'novo_antigo', 'migrado', 'rpc'].includes(params.regimePrev)) fail('regime inválido.');
    const table = params.agencyConfig?.historico_pss?.[params.tabelaPSS];
    const capped = hasPensionCeiling(params.regimePrev);
    if (!table || !Number.isFinite(table.teto_rgps) || !(table.teto_rgps > 0) || !Array.isArray(table.faixas) || !table.faixas.length ||
        table.faixas.some(faixa => !Number.isFinite(faixa.min) || !(faixa.max > faixa.min) ||
            !Number.isFinite(faixa.max) || !Number.isFinite(faixa.rate) || faixa.rate < 0 || faixa.rate > 1)) {
        fail('tabela de RPPS, faixas e teto válidos são obrigatórios.');
    }
    const teto = table?.teto_rgps || 0;
    const participation = params.funprespParticipacao;
    if (!['nao', 'patrocinado', 'vinculado'].includes(participation)) fail('participação complementar inválida.');
    const memory: PensionCalculationMemory = {
        competencia: params.competencia || '', tipo, participacao: participation,
        teto, baseRppsIntegral, baseRpps: capped ? Math.min(baseRppsIntegral, teto) : baseRppsIntegral,
        baseComplementarIntegral, baseComplementar: 0, aliquotaNormal: 0, aliquotaFacultativa: 0,
        normal: 0, facultativa: 0, facultativaExterna: 0, aporteFolha: 0, aporteExterno: 0, patrocinador: 0,
        descontoFolha: 0, dedutivelIRFolha: 0, deducaoSujeitaLimiteAnual: 0, componentes,
    };
    nonnegative(params.funprespAliq, 'alíquota normal');
    nonnegative(params.funprespFacul, 'alíquota facultativa');
    nonnegative(params.funprespFaculValor ?? 0, 'aporte');
    if (participation === 'nao') return memory;
    if (params.funprespRevisarOpcoes) fail('revise e confirme as opções de incidência da previdência complementar deste holerite legado.');
    const config = params.agencyConfig?.previdenciaComplementar;
    if (!config?.enabled) fail('previdência complementar não habilitada na configuração.');
    if (config.baseRule !== 'excedente_teto_rgps') fail('regra de base complementar não suportada.');
    if (participation === 'patrocinado' && !capped) fail('participação patrocinada exige RPPS limitado ao teto.');
    if (tipo === 'mensal' && participation === 'patrocinado' && baseComplementarIntegral <= teto) fail('participação patrocinada exige remuneração de participação acima do teto; confira modalidade vinculada.');
    if (tipo === 'mensal' && participation === 'vinculado' && capped && baseComplementarIntegral > teto) fail('remuneração acima do teto exige participação patrocinada para o regime limitado ao teto.');
    checkRate(params.funprespAliq, participation === 'patrocinado' ? config.sponsoredRate : config.linkedRate, 'alíquota normal');
    if (params.funprespFacul > 0) {
        checkRate(params.funprespFacul, {
            min: config.facultativeRate.minIfPositive, max: config.facultativeRate.max,
            step: config.facultativeRate.step,
        }, 'alíquota facultativa');
    }
    memory.aliquotaNormal = params.funprespAliq;
    memory.aliquotaFacultativa = params.funprespFacul;
    if (tipo === '13' && !config.includeThirteenth) return memory;
    if (participation === 'patrocinado') memory.baseComplementar = Math.max(0, baseComplementarIntegral - teto);
    else {
        const competence = params.competencia || '';
        const start = params.funprespVinculadaInicio || '';
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(start) || start > competence) fail('informe o início da participação vinculada, anterior ou igual à competência.');
        const urpCompetence = start.slice(0, 4) === competence.slice(0, 4)
            ? start : `${Number(competence.slice(0, 4)) - 1}-11`;
        const urp = config.urpByCompetence?.[urpCompetence];
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(competence) || !Number.isFinite(urp) || !(urp! > 0) || !config.urpSourcesByCompetence?.[urpCompetence]) {
            fail('modalidade vinculada exige URP e fonte oficial da competência.');
        }
        const declared = nonnegative(params.funprespBaseIntegral, 'salário de participação vinculado');
        if (!Number.isFinite(config.minimumUrpUnits) || !(config.minimumUrpUnits! > 0) || declared < urp! * config.minimumUrpUnits!) fail('salário de participação vinculado inferior ao mínimo em URP configurado.');
        if (declared > baseComplementarIntegral) fail('salário de participação vinculado não pode exceder a remuneração integral elegível.');
        memory.baseComplementarIntegral = declared;
        memory.baseComplementar = declared;
    }
    memory.normal = roundPension(memory.baseComplementar * params.funprespAliq);
    memory.facultativa = roundPension(memory.baseComplementar * params.funprespFacul);
    const aporte = tipo === 'mensal' ? params.funprespFaculValor || 0 : 0;
    if (aporte > 0 && aporte < roundPension(memory.baseComplementar * config.facultativeRate.minIfPositive)) {
        fail('aporte facultativo inferior ao mínimo configurado sobre o salário de participação.');
    }
    if (params.funprespFaculForma && !['folha', 'externo'].includes(params.funprespFaculForma)) fail('forma do aporte inválida.');
    memory.aporteExterno = params.funprespFaculForma === 'externo' ? aporte : 0;
    memory.aporteFolha = params.funprespFaculForma === 'externo' ? 0 : aporte;
    memory.facultativaExterna = params.funprespFaculForma === 'externo' ? memory.facultativa : 0;
    memory.patrocinador = participation === 'patrocinado' ? memory.normal : 0;
    memory.descontoFolha = roundPension(memory.normal + memory.facultativa - memory.facultativaExterna + memory.aporteFolha);
    memory.dedutivelIRFolha = memory.descontoFolha;
    memory.deducaoSujeitaLimiteAnual = participation === 'patrocinado'
        ? roundPension(memory.facultativa - memory.facultativaExterna + memory.aporteFolha) : memory.descontoFolha;
    return memory;
};

/** Recompute historical total due, then subtract actual paid amount. Never use today's marginal rate. */
export const calculatePensionRetroactives = (params: IAgencyCalculationParams): PensionRetroMemory[] => {
    const entries = params.pensionRetroEntries || [];
    const ids = new Set<string>();
    const competenceKeys = new Set<string>();
    return entries.map(entry => {
        if (entry.modo !== undefined && !['completo', 'manual'].includes(entry.modo)) fail('modo do retroativo inválido.');
        if (entry.tipo !== undefined && !['mensal', '13'].includes(entry.tipo)) fail('espécie do retroativo inválida.');
        if (!entry.id || ids.has(entry.id)) fail('identificador de retroativo ausente ou duplicado.');
        ids.add(entry.id);
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(entry.competencia)) fail('competência do retroativo inválida.');
        const tipo = entry.tipo || 'mensal';
        const destinoIR = entry.destinoIR || (tipo === '13' ? '13' : 'ea');
        if (!['mensal', 'ea', '13'].includes(destinoIR)) fail('destino IR do retroativo inválido.');
        const key = `${entry.competencia}:${tipo}`;
        if (competenceKeys.has(key)) fail('agrupe todos os ajustes da mesma competência e espécie em um lançamento.');
        competenceKeys.add(key);
        let rpps: number, complementar: number;
        if (entry.modo === 'manual') {
            if (!entry.justificativa?.trim()) fail('ajuste manual exige justificativa documental.');
            rpps = nonnegative(entry.ajusteRpps ?? 0, 'ajuste RPPS');
            complementar = nonnegative(entry.ajusteComplementar ?? 0, 'ajuste complementar');
        } else {
            if (!entry.tabelaPSS) fail('retroativo exige tabela histórica de RPPS.');
            const table = params.agencyConfig?.historico_pss?.[entry.tabelaPSS];
            if (!table || !(table.teto_rgps > 0)) fail('tabela histórica de RPPS indisponível.');
            nonnegative(entry.baseRppsOriginal, 'base RPPS original');
            nonnegative(entry.baseComplementarOriginal, 'base complementar original');
            const base = nonnegative(entry.baseRppsDevida, 'base RPPS devida');
            const paidPss = nonnegative(entry.contribuicaoRppsRecolhida, 'RPPS recolhido');
            const paidComplementary = nonnegative(entry.contribuicaoComplementarRecolhida, 'complementar recolhida');
            const participation = entry.participacao || params.funprespParticipacao;
            if (participation !== 'nao' && entry.aliquotaNormal === undefined) fail('retroativo participante exige alíquota normal histórica explícita.');
            const historical = { ...params, competencia: entry.competencia, tabelaPSS: entry.tabelaPSS,
                regimePrev: entry.regimePrev || params.regimePrev,
                funprespParticipacao: participation,
                funprespAliq: entry.aliquotaNormal ?? 0,
                funprespFacul: entry.aliquotaFacultativa ?? 0,
                funprespFaculValor: 0,
                funprespFaculForma: 'folha' as const,
                funprespBaseIntegral: entry.salarioParticipacaoVinculado,
                funprespVinculadaInicio: entry.inicioVinculado,
            };
            const complementary = calculateComplementaryPension(historical, base,
                nonnegative(entry.baseComplementarDevida, 'base complementar devida'), tipo);
            rpps = roundPension(calculatePss(complementary.baseRpps, table) - paidPss);
            complementar = roundPension(complementary.descontoFolha - paidComplementary);
            if (rpps < 0 || complementar < 0) fail('recolhimento superior ao devido: restituição deve ser tratada separadamente.');
        }
        return { id: entry.id, competencia: entry.competencia, tipo, destinoIR, modo: entry.modo || 'completo',
            rpps: roundPension(rpps), complementar: roundPension(complementar), justificativa: entry.justificativa, entrada: { ...entry } };
    });
};
