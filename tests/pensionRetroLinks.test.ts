import assert from 'node:assert/strict';
import test from 'node:test';
import { INITIAL_STATE, type CourtConfig, type PrevidenciaComplementarConfig } from '../src/types';
import type { PensionRetroEntry } from '../src/types/pension';
import { mapStateToAgencyParams } from '../src/services/agency/adapters/stateToParams';
import { calculatePensionRetroactives } from '../src/services/agency/engine/modules/pensionCalculations';
import { assertPensionRubricsReady, deriveLinkedPensionBases, getPensionRubricDistribution,
    PensionCalculationPendingError, prepareLinkedPensionRetroEntry } from '../src/services/agency/engine/modules/pensionPending';
import { resolveHistoricalPensionContext } from '../src/services/agency/engine/modules/pensionSelectionContext';
import { AgencyCalculationEngine } from '../src/services/agency/engine/AgencyCalculationEngine';
import { mapEffectiveConfigToCourtConfig } from '../src/services/config/mapEffectiveConfig';

// All amounts, rates and sources are synthetic. No legal configuration or database is changed.
const historical: PrevidenciaComplementarConfig = { enabled: true, scope: 'teste', baseRule: 'excedente_teto_rgps',
    includeThirteenth: true, sponsoredRate: { min: .05, max: .07, step: .01, defaultRpc: .06 },
    linkedRate: { min: .05, max: .07, step: .01 }, facultativeRate: { minIfPositive: .01, default: 0 },
    minimumUrpUnits: 10, urpByCompetence: { '2026-01': 100 }, urpSourcesByCompetence: { '2026-01': 'fonte sintética' } };
const configuration = (): CourtConfig => ({
    bases: { salario: { teste: { A1: 6000 } }, funcoes: {} }, values: {},
    historico_pss: { atual: { teto_rgps: 7000, faixas: [{ min: 0, max: 100000, rate: .12 }] },
        antiga: { teto_rgps: 5000, faixas: [{ min: 0, max: 100000, rate: .1 }] } }, historico_ir: { teste: 100 },
    careerCatalog: { noFunctionCode: '0', noFunctionLabel: 'Sem função', cargoLabels: {} },
    payrollRules: { gajRate: .5, specificGratificationRate: .1, vrRateOnCj1: .1, monthDayDivisor: 30,
        overtimeMonthHours: 200, transportWorkdays: 22, transportDiscountRate: .06, irrfTopRate: .2 },
    previdenciaComplementar: { ...historical, sponsoredRate: { min: .065, max: .085, step: .005, defaultRpc: .085 },
        historicalRules: [{ id: 'regra-antiga', validFrom: '2026-01', validTo: '2026-07', source: 'fonte histórica sintética',
            tabelaPSS: 'antiga', configuration: structuredClone(historical) }] },
});
const rubric = (id = 'r', valor = 500) => ({ id, descricao: 'Crédito histórico', valor, tipo: 'C' as const,
    incideIR: false, incidePSS: false, isEA: true, pssCompetenciaSeparada: false,
    incideFunpresp: true, funprespCompetenciaSeparada: true });
const entry = (patch: Partial<PensionRetroEntry> = {}): PensionRetroEntry => ({ id: 'e', competencia: '2026-01', modo: 'completo',
    tipo: 'mensal', destinoIR: 'ea', tabelaPSS: 'antiga', regimePrev: 'rpc', participacao: 'patrocinado',
    baseRppsOriginal: 6000, baseComplementarOriginal: 6000, contribuicaoRppsRecolhida: 500,
    contribuicaoComplementarRecolhida: 60, aliquotaNormal: .06, aliquotaFacultativa: 0,
    regraHistoricaId: 'regra-antiga', vinculos: [{ rubricaId: 'r', valor: 500 }], ...patch });
const parameters = () => ({ ...mapStateToAgencyParams({ ...INITIAL_STATE, cargo: 'teste', padrao: 'A1', funcao: '0',
    regimePrev: 'antigo', funprespParticipacao: 'nao', tabelaPSS: 'atual', tabelaIR: 'teste', funprespRevisarOpcoes: true,
    rubricasExtras: [rubric()], pensionRetroEntries: [entry()] }, 'jmu', configuration()), competencia: '2026-09' });
const pending = (action: () => unknown, pattern?: RegExp) => assert.throws(action, error =>
    error instanceof PensionCalculationPendingError && (!pattern || pattern.test(error.message)));

test('linked historical calculation uses its own regime, rate, table and source, not today inputs', async () => {
    const p = parameters();
    const memory = calculatePensionRetroactives(p)[0];
    assert.equal(memory.complementar, 30);
    assert.equal(memory.rpps, 0);
    assert.equal(memory.teto, 5000);
    assert.equal(memory.regraHistoricaId, 'regra-antiga');
    assert.equal(memory.fonteHistorica, 'fonte histórica sintética');
    assert.equal(memory.baseComplementarDevida, 6500);
    const total = await new AgencyCalculationEngine().calculateTotal(p);
    assert.equal(total.breakdown.funpresp, 0);
    assert.equal(total.breakdown.funprespEA, 30);
    assert.equal(total.pensionMemory?.retroativos[0].entrada?.participacao, 'patrocinado');
    p.pensionRetroEntries![0].vinculos![0].valor = 1;
    assert.equal(memory.entrada?.vinculos?.[0].valor, 500, 'audit input must not share mutable links');
});

test('several rubrics share one historical assessment and one rubric can span months', () => {
    const p = parameters();
    p.rubricasExtras = [rubric('r', 300), rubric('s', 200)];
    p.pensionRetroEntries![0].vinculos = [{ rubricaId: 'r', valor: 300 }, { rubricaId: 's', valor: 200 }];
    assert.equal(calculatePensionRetroactives(p)[0].complementar, 30);
    p.rubricasExtras = [rubric()];
    p.pensionRetroEntries = [entry({ vinculos: [{ rubricaId: 'r', valor: 250 }] }),
        entry({ id: 'f', competencia: '2026-02', vinculos: [{ rubricaId: 'r', valor: 250 }] })];
    assert.deepEqual(calculatePensionRetroactives(p).map(item => item.complementar), [15, 15]);
    assert.deepEqual(getPensionRubricDistribution(p), { r: 500 });
});

test('new linked records require explicit historical data and complete recalculation', () => {
    for (const key of ['regimePrev', 'participacao', 'aliquotaNormal', 'aliquotaFacultativa', 'tipo', 'destinoIR',
        'baseRppsOriginal', 'baseComplementarOriginal', 'contribuicaoRppsRecolhida', 'contribuicaoComplementarRecolhida'] as const) {
        const p = parameters(); delete p.pensionRetroEntries![0][key];
        pending(() => assertPensionRubricsReady(p));
    }
    const p = parameters(); p.pensionRetroEntries![0].modo = 'manual';
    pending(() => calculatePensionRetroactives(p), /completa/);
});

test('missing historical configuration, table mismatch, unsupported source or validity never uses current rules', () => {
    const cases = [
        (p: ReturnType<typeof parameters>) => { delete p.agencyConfig!.previdenciaComplementar!.historicalRules; },
        (p: ReturnType<typeof parameters>) => { p.pensionRetroEntries![0].regraHistoricaId = 'não-cadastrada'; },
        (p: ReturnType<typeof parameters>) => { p.pensionRetroEntries![0].tabelaPSS = 'atual'; },
        (p: ReturnType<typeof parameters>) => { p.agencyConfig!.previdenciaComplementar!.historicalRules![0].source = ''; },
        (p: ReturnType<typeof parameters>) => { p.pensionRetroEntries![0].competencia = '2026-07'; },
        (p: ReturnType<typeof parameters>) => { p.pensionRetroEntries![0].competencia = '2027-01'; },
    ];
    for (const change of cases) { const p = parameters(); change(p); pending(() => calculatePensionRetroactives(p)); }
});

test('allocation detects missing, duplicate, stale, over/under and sub-cent values', () => {
    for (const links of [[], [{ rubricaId: 'r', valor: 499.99 }], [{ rubricaId: 'r', valor: 500.01 }],
        [{ rubricaId: 'r', valor: 250 }, { rubricaId: 'r', valor: 250 }], [{ rubricaId: 'missing', valor: 500 }],
        [{ rubricaId: 'r', valor: 499.999 }], [{ rubricaId: 'r', valor: NaN }], [{ rubricaId: 'r', valor: -500 }]]) {
        const p = parameters(); p.pensionRetroEntries![0].vinculos = links;
        pending(() => calculatePensionRetroactives(p));
    }
    const p = parameters(); p.rubricasExtras![0].incideFunpresp = false;
    pending(() => calculatePensionRetroactives(p), /sem incidência/);
});

test('overlapping or duplicated historical rules are rejected instead of choosing an arbitrary version', () => {
    const p = parameters();
    const rules = p.agencyConfig!.previdenciaComplementar!.historicalRules!;
    rules.push({ ...structuredClone(rules[0]), id: 'outra-regra' });
    pending(() => calculatePensionRetroactives(p), /sobrepostas/);
    rules[1].id = rules[0].id;
    pending(() => calculatePensionRetroactives(p), /regra histórica cadastrada/);
});

test('duplicate competence/species is rejected even when the other record is legacy', () => {
    const p = parameters(); p.pensionRetroEntries!.push({ id: 'old', competencia: '2026-01', modo: 'manual',
        ajusteComplementar: 0, justificativa: 'Legado sem vínculo' });
    pending(() => calculatePensionRetroactives(p), /agrupe/);
    p.pensionRetroEntries![1].tipo = '13';
    assert.doesNotThrow(() => calculatePensionRetroactives(p));
});

test('bases are derived from signed links and independent PSS/Funpresp incidence', async () => {
    const p = parameters(); p.rubricasExtras![0] = { ...rubric(), incideFunpresp: false, pssCompetenciaSeparada: true };
    p.pensionRetroEntries![0].baseRppsOriginal = 4000;
    p.pensionRetroEntries![0].contribuicaoRppsRecolhida = 400;
    assert.deepEqual(deriveLinkedPensionBases(p, p.pensionRetroEntries![0]), { baseRppsDevida: 4500, baseComplementarDevida: 6000 });
    const result = await new AgencyCalculationEngine().calculateTotal(p);
    assert.equal(result.breakdown.pssEA, 50, 'historical PSS must be collected once');
    assert.equal(result.breakdown.funprespEA, 0, 'PSS-only link must not gain complementary incidence');
    assert.equal(result.breakdown.rubricasTax.r.pss, 0, 'historical PSS cannot be allocated at the current monthly rate');
    p.agencyConfig!.historico_pss.antiga.faixas[0].rate = .16;
    p.pensionRetroEntries![0].contribuicaoRppsRecolhida = 640;
    const differentRate = await new AgencyCalculationEngine().calculateTotal(p);
    assert.equal(differentRate.breakdown.pssEA, 80);
    assert.equal(differentRate.breakdown.rubricasTax.r.pss, 0);
    p.pensionRetroEntries![0].baseRppsDevida = 5000;
    pending(() => calculatePensionRetroactives(p), /diverge/);
});

test('zero due differences are valid; linked salary remains elected; current opt-in review is not inherited', () => {
    const p = parameters(); p.pensionRetroEntries![0] = entry({ regimePrev: 'antigo', participacao: 'vinculado',
        salarioParticipacaoVinculado: 1000, inicioVinculado: '2026-01', contribuicaoRppsRecolhida: 600 });
    assert.equal(calculatePensionRetroactives(p)[0].complementar, 0);
    p.pensionRetroEntries![0] = entry({ participacao: 'nao', contribuicaoComplementarRecolhida: 0,
        aliquotaNormal: undefined, aliquotaFacultativa: undefined });
    assert.equal(calculatePensionRetroactives(p)[0].complementar, 0);
});

test('refunds and historically incompatible modalities become pending rather than being clamped', () => {
    const p = parameters(); p.pensionRetroEntries![0].contribuicaoComplementarRecolhida = 100;
    pending(() => calculatePensionRetroactives(p), /restituição/);
    p.pensionRetroEntries![0] = entry({ regimePrev: 'antigo' });
    pending(() => calculatePensionRetroactives(p), /patrocinada/);
    const debit = parameters(); debit.rubricasExtras![0].tipo = 'D' as any;
    debit.pensionRetroEntries![0] = entry({ baseComplementarOriginal: 6500, contribuicaoComplementarRecolhida: 60 });
    assert.equal(calculatePensionRetroactives(debit)[0].complementar, 0);
    assert.equal(prepareLinkedPensionRetroEntry(debit, debit.pensionRetroEntries![0]).entry.baseComplementarDevida, 6000);
});

test('historical eligibility context is available before chosen rates and participation fields are complete', () => {
    const p = parameters(); delete p.pensionRetroEntries![0].aliquotaNormal; delete p.pensionRetroEntries![0].aliquotaFacultativa;
    delete p.pensionRetroEntries![0].participacao;
    const context = resolveHistoricalPensionContext(p, p.pensionRetroEntries![0]);
    assert.equal(context.error, null);
    assert.deepEqual(context.context?.allowed, ['nao', 'patrocinado']);
});

test('unlinked additional PSS retroactives cannot be silently ignored beside linked assessment', async () => {
    const p = parameters(); p.hePssIsEA = true; p.heQtd50 = 2;
    await assert.rejects(new AgencyCalculationEngine().calculateTotal(p), error =>
        error instanceof PensionCalculationPendingError && /sem vínculo/.test(error.message));
});

test('configuration adapter maps historical rules independently of current rates', () => {
    const power = { enabled: true, scope: 'teste', base_rule: 'excedente_teto_rgps', include_thirteenth: true,
        sponsored_rate: { min: .065, max: .085, step: .005, default_rpc: .085 }, facultative_rate: { min_if_positive: .025, default: 0 } };
    const effective = { org_slug: 'jmu', org_name: 'JMU', power_name: 'PJU', previdencia_complementar: { ...power,
        historical_rules: [{ id: 'old', valid_from: '2026-01', valid_to: '2026-07', source: 'sintética', tabela_pss: 'antiga',
            configuration: { ...power, sponsored_rate: { min: .05, max: .07, step: .01, default_rpc: .06 } } }] } } as any;
    const mapped = mapEffectiveConfigToCourtConfig(effective);
    assert.equal(mapped.previdenciaComplementar?.sponsoredRate.max, .085);
    assert.equal(mapped.previdenciaComplementar?.historicalRules?.[0].configuration.sponsoredRate.max, .07);
    assert.equal(mapped.previdenciaComplementar?.historicalRules?.[0].tabelaPSS, 'antiga');
});
