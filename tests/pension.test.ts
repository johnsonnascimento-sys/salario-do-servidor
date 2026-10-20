import assert from 'node:assert/strict';
import test from 'node:test';
import { INITIAL_STATE, type CourtConfig } from '../src/types';
import { mapStateToAgencyParams } from '../src/services/agency/adapters/stateToParams';
import { AgencyCalculationEngine } from '../src/services/agency/engine/AgencyCalculationEngine';
import { buildComplementaryBase, calculateComplementaryPension, calculatePensionRetroactives } from '../src/services/agency/engine/modules/pensionCalculations';
import type { IAgencyCalculationParams } from '../src/services/agency/engine/types';

// Deliberately synthetic rates and amounts; no production configuration is read or changed.
const configuration = (): CourtConfig => ({
    bases: { salario: { teste: { A1: 6000 } }, funcoes: { fc1: 1000 } },
    historico_pss: {
        atual: { teto_rgps: 5000, faixas: [{ min: 0, max: 100000, rate: 0.1 }] },
        anterior: { teto_rgps: 4000, faixas: [{ min: 0, max: 100000, rate: 0.08 }] },
    },
    historico_ir: { teste: 100 }, historico_ir_brackets: {}, values: { deducao_dep: 100 },
    payrollRules: { gajRate: 0.5, specificGratificationRate: 0.1, vrRateOnCj1: 0.1,
        monthDayDivisor: 30, overtimeMonthHours: 200, transportWorkdays: 22,
        transportDiscountRate: 0.06, irrfTopRate: 0.2 },
    careerCatalog: { noFunctionCode: '0', noFunctionLabel: 'Sem função', cargoLabels: {} },
    previdenciaComplementar: {
        enabled: true, scope: 'patrocinado', baseRule: 'excedente_teto_rgps', includeThirteenth: true,
        sponsoredRate: { min: 0.065, max: 0.085, step: 0.005, defaultRpc: 0.085 },
        facultativeRate: { minIfPositive: 0.025, default: 0 },
        linkedRate: { min: 0.065, max: 0.22, step: 0.005 }, minimumUrpUnits: 10,
        urpByCompetence: { '2026-07': 100, '2025-11': 90 },
        urpSourcesByCompetence: { '2026-07': 'https://example.test/2026-07', '2025-11': 'https://example.test/2025-11' },
        incidenceRules: { fc: true, gas: true, gae: true, aqTreino: true },
    },
});
const parameters = (patch: Partial<IAgencyCalculationParams> = {}): IAgencyCalculationParams => ({
    ...mapStateToAgencyParams({ ...INITIAL_STATE, cargo: 'teste', padrao: 'A1', funcao: 'fc1',
        tabelaPSS: 'atual', tabelaIR: 'teste', regimePrev: 'rpc', funprespParticipacao: 'patrocinado',
        funprespAliq: 0.085 }, 'jmu', configuration()),
    competencia: '2026-07', ...patch,
});

test('RPPS capped is independent of complementary participation and excluded benefits', async () => {
    const engine = new AgencyCalculationEngine();
    const noPlan = await engine.calculateTotal(parameters({ funprespParticipacao: 'nao', funprespAliq: 0 }));
    const plan = await engine.calculateTotal(parameters());
    assert.equal(noPlan.breakdown.pss, 500);
    assert.equal(plan.breakdown.pss, 500);
    assert.equal(plan.breakdown.funpresp, 340);
    assert.equal(plan.breakdown.funprespPatrocinador, 340);
    assert.equal(noPlan.netSalary - plan.netSalary, 272); // 340 deduction less 68 IR saving.
});

test('FC, GAS and AQ treino choices affect only complementary base', async () => {
    const engine = new AgencyCalculationEngine();
    const basic = parameters({ gratEspecificaTipo: 'gas', aqTreinoPerc: 0.01 });
    const before = await engine.calculateTotal(basic);
    const after = await engine.calculateTotal({ ...basic, funprespIncluirFC: true, funprespIncluirGAS: true, funprespIncluirAQTreino: true });
    assert.equal(before.breakdown.pss, after.breakdown.pss);
    assert.equal(after.breakdown.baseFunpresp - before.breakdown.baseFunpresp, 1660);
});

test('RPPS unlimited remains independent and accepts linked, not sponsored, participation', async () => {
    const engine = new AgencyCalculationEngine();
    const base = parameters({ regimePrev: 'antigo', funprespParticipacao: 'nao', funprespAliq: 0 });
    assert.equal((await engine.calculateTotal(base)).breakdown.pss, 900);
    await assert.rejects(engine.calculateTotal({ ...base, funprespParticipacao: 'patrocinado', funprespAliq: 0.085 }), /patrocinada exige/);
    const linked = await engine.calculateTotal({ ...base, funprespParticipacao: 'vinculado',
        funprespBaseIntegral: 1200, funprespVinculadaInicio: '2026-07', funprespAliq: 0.065 });
    assert.equal(linked.breakdown.funpresp, 78);
    assert.equal(linked.breakdown.funprespPatrocinador, 0);
    assert.equal(linked.breakdown.pss, 900);
});

test('linked requires dated URP, source, subscription date and minimum participation salary', () => {
    const base = parameters({ funprespParticipacao: 'vinculado', funprespAliq: 0.065, funprespBaseIntegral: 1200 });
    assert.throws(() => calculateComplementaryPension(base, 4000, 4000), /início/);
    assert.throws(() => calculateComplementaryPension({ ...base, funprespVinculadaInicio: '2026-06' }, 4000, 4000), /URP/);
    assert.throws(() => calculateComplementaryPension({ ...base, funprespVinculadaInicio: '2026-07', funprespBaseIntegral: 999 }, 4000, 4000), /mínimo/);
    const older = calculateComplementaryPension({ ...base, funprespVinculadaInicio: '2024-01', funprespBaseIntegral: 900 }, 4000, 4000);
    assert.equal(older.normal, 58.5);
});

test('zero, below and exact ceiling preserve RPPS and require appropriate participation category', () => {
    for (const amount of [0, 4000, 5000]) {
        const p = parameters({ funprespParticipacao: 'nao', funprespAliq: 0 });
        const memory = calculateComplementaryPension(p, amount, amount);
        assert.equal(memory.baseRpps, amount);
        assert.equal(memory.descontoFolha, 0);
        assert.throws(() => calculateComplementaryPension(parameters(), amount, amount), /acima do teto/);
    }
});

test('13th complementary contribution is deducted, returned, and reconciles net salary', async () => {
    const engine = new AgencyCalculationEngine();
    const p = parameters({ adiant13Venc: 1, segunda13Venc: 1, adiant13FC: 1, segunda13FC: 1 });
    const result = await engine.calculateTotal(p);
    assert.equal(result.breakdown.funpresp13, 340);
    assert.equal(result.pensionMemory?.thirteenth?.descontoFolha, 340);
    const ordinary = await engine.calculateTotal(parameters());
    assert.equal(result.totalDeductions - ordinary.totalDeductions,
        result.breakdown.pss13 + result.breakdown.funpresp13 + result.breakdown.imposto13 + result.breakdown.debitoPrimeiraParcela13);
    assert.equal((await engine.calculateTotal({ ...p, segunda13Venc: 0, segunda13FC: 0 })).breakdown.funpresp13, 0);
});

test('disabled configuration and includeThirteenth govern engine, independently of UI', () => {
    const p = parameters();
    p.agencyConfig!.previdenciaComplementar!.includeThirteenth = false;
    assert.equal(calculateComplementaryPension(p, 9000, 9000, '13').descontoFolha, 0);
    p.agencyConfig!.previdenciaComplementar!.enabled = false;
    assert.throws(() => calculateComplementaryPension(p, 9000, 9000), /não habilitada/);
    p.agencyConfig!.previdenciaComplementar = undefined;
    assert.throws(() => calculateComplementaryPension(p, 9000, 9000), /não habilitada/);
});

test('negative, nonfinite and out-of-grid rates are rejected by engine', () => {
    for (const rate of [-1, NaN, Infinity, 0.07 + 0.001, 0.9]) {
        assert.throws(() => calculateComplementaryPension(parameters({ funprespAliq: rate }), 9000, 9000), /Previdência/);
    }
    assert.throws(() => calculateComplementaryPension(parameters({ funprespFacul: 0.01 }), 9000, 9000), /limites/);
    for (const rate of [0.065, 0.07, 0.075, 0.08, 0.085]) {
        assert.equal(calculateComplementaryPension(parameters({ funprespAliq: rate }), 9000, 9000).normal, 4000 * rate);
    }
});

test('facultative and one-off payroll contributions do not receive employer matching; external excludes net and IR', () => {
    const payroll = calculateComplementaryPension(parameters({ funprespFacul: 0.025, funprespFaculValor: 150, funprespFaculForma: 'folha' }), 9000, 9000);
    assert.equal(payroll.descontoFolha, 590);
    assert.equal(payroll.dedutivelIRFolha, 590);
    assert.equal(payroll.patrocinador, 340);
    assert.equal(payroll.deducaoSujeitaLimiteAnual, 250);
    const external = calculateComplementaryPension(parameters({ funprespFacul: 0.025, funprespFaculValor: 150, funprespFaculForma: 'externo' }), 9000, 9000);
    assert.equal(external.descontoFolha, 340);
    assert.equal(external.aporteExterno, 150);
    assert.equal(external.facultativaExterna, 100);
    assert.equal(external.dedutivelIRFolha, 340);
});

test('linked salary maximum, supplementary one-off minimum, and nonfinite bases are validated', () => {
    assert.throws(() => calculateComplementaryPension(parameters({ funprespParticipacao: 'vinculado',
        funprespBaseIntegral: 6000, funprespVinculadaInicio: '2026-07', funprespAliq: 0.065 }), 4000, 4000), /exceder/);
    assert.throws(() => calculateComplementaryPension(parameters({ funprespFaculValor: 99 }), 9000, 9000), /mínimo/);
    assert.throws(() => calculateComplementaryPension(parameters(), NaN, 9000), /base RPPS/);
    assert.throws(() => calculateComplementaryPension(parameters(), 9000, Infinity), /base complementar/);
    assert.throws(() => calculateComplementaryPension(parameters({ funprespRevisarOpcoes: true }), 9000, 9000), /revise e confirme/);
});

test('manual rubrics have independent opt-in complementary incidence', async () => {
    const p = parameters({ rubricasExtras: [{ id: 'r', descricao: 'Teste', valor: 100, tipo: 'C', incideIR: true,
        incidePSS: false, isEA: false, pssCompetenciaSeparada: false, incideFunpresp: true }] });
    const result = await new AgencyCalculationEngine().calculateTotal(p);
    assert.equal(result.breakdown.baseRpps, 5000);
    assert.equal(result.breakdown.baseFunpresp, 4100);
});

test('historical recalculation uses historical total less actually paid, with separate 13th ceiling', () => {
    const p = parameters({ pensionRetroEntries: [{ id: 'e', competencia: '2025-07', tabelaPSS: 'anterior',
        baseRppsOriginal: 3000, baseRppsDevida: 6000, baseComplementarOriginal: 5000, baseComplementarDevida: 6000,
        contribuicaoRppsRecolhida: 240, contribuicaoComplementarRecolhida: 85,
        aliquotaNormal: 0.085 }] });
    const [result] = calculatePensionRetroactives(p);
    assert.equal(result.rpps, 80); // 4000 * 8% - 240; not today's 10% marginal.
    assert.equal(result.complementar, 85); // (6000 - 4000) * 8.5% - 85.
    p.pensionRetroEntries![0].tipo = '13';
    assert.equal(calculatePensionRetroactives(p)[0].rpps, 80);
});

test('legacy capped EA cannot silently apply current marginal rate', async () => {
    const p = parameters({ rubricasExtras: [{ id: 'r', descricao: 'EA', valor: 100, tipo: 'C', incideIR: false,
        incidePSS: true, isEA: true, pssCompetenciaSeparada: true }] });
    await assert.rejects(new AgencyCalculationEngine().calculateTotal(p), /por competência/);
});

test('manual adjustments require documentary reason and refunds are not silently clamped', () => {
    const p = parameters({ pensionRetroEntries: [{ id: 'm', competencia: '2025-01', modo: 'manual', ajusteRpps: 10 }] });
    assert.throws(() => calculatePensionRetroactives(p), /justificativa/);
    p.pensionRetroEntries![0].justificativa = 'Valor informado na folha original';
    assert.equal(calculatePensionRetroactives(p)[0].rpps, 10);
    p.pensionRetroEntries![0].ajusteRpps = -1;
    assert.throws(() => calculatePensionRetroactives(p), /não negativo/);
});

test('anonymous August and September payroll reconciliation: capped RPPS plus opted-in GAS/training', async () => {
    const config = configuration();
    config.bases.salario = { tecnico: { C13: 4846.27 } };
    config.bases.funcoes = { fc4: 2498.33 };
    config.values.cj1_integral_base = 7715.5;
    config.payrollRules!.gajRate = 1.4;
    config.payrollRules!.specificGratificationRate = 0.35;
    config.historico_pss['2026'] = { teto_rgps: 8475.55, faixas: [
        { min: 0, max: 1621, rate: 0.075 },
        { min: 1621, max: 2902.84, rate: 0.09 },
        { min: 2902.84, max: 4354.27, rate: 0.12 },
        { min: 4354.27, max: 8475.55, rate: 0.14 },
    ] };
    const p = parameters({ agencyConfig: config, periodo: 1, cargo: 'tecnico', padrao: 'C13', funcao: 'fc4',
        tabelaPSS: '2026', gratEspecificaTipo: 'gas', aqTituloVR: 1, aqTreinoVR: 0.4,
        vpni_lei: 771.55, funprespIncluirGAS: true, funprespIncluirAQTreino: true });
    const engine = new AgencyCalculationEngine();
    const september = await engine.calculateTotal(p);
    assert.equal(Math.round(september.breakdown.pss * 100) / 100, 988.09);
    assert.equal(september.breakdown.funpresp, 569.79);
    assert.equal(Math.round((september.breakdown.pss + september.breakdown.funpresp) * 100) / 100, 1557.88);
    const august = await engine.calculateTotal({ ...p, rubricasExtras: [{ id: 'passivo', descricao: 'Passivo previdenciário EC',
        tipo: 'C', valor: 61.99, incidePSS: true, incideIR: true, isEA: false,
        pssCompetenciaSeparada: false, incideFunpresp: true }] });
    assert.equal(august.breakdown.funpresp, 575.06);
    assert.equal(Math.round((august.breakdown.pss + august.breakdown.funpresp) * 100) / 100, 1563.15);
});

test('retroactive destinations reduce only the selected IR base and flags do not double charge', async () => {
    const engine = new AgencyCalculationEngine();
    const base = parameters({ adiant13Venc: 1, segunda13Venc: 1,
        rubricasExtras: [{ id: 'r', descricao: 'Retroativo', tipo: 'C', valor: 1000,
            incideIR: true, incidePSS: true, pssCompetenciaSeparada: true, isEA: true }] });
    for (const destinoIR of ['mensal', 'ea', '13'] as const) {
        const result = await engine.calculateTotal({ ...base, pensionRetroEntries: [{ id: 'm', competencia: '2025-01',
            modo: 'manual', destinoIR, ajusteRpps: 100, ajusteComplementar: 50, justificativa: 'Apuração individualizada' }] });
        assert.equal(result.breakdown.pssEA, 100);
        assert.equal(result.breakdown.funprespEA, 50);
        assert.equal(result.pensionMemory?.retroativos[0].destinoIR, destinoIR);
        const noAdjustment = await engine.calculateTotal({ ...base, pensionRetroEntries: [{ id: 'm', competencia: '2025-01',
            modo: 'manual', destinoIR, ajusteRpps: 0, ajusteComplementar: 0, justificativa: 'Controle sem ajuste' }] });
        for (const [destination, field] of [['mensal', 'irrf'], ['ea', 'irEA'], ['13', 'imposto13']]) {
            assert.equal(Math.round((noAdjustment.breakdown[field] - result.breakdown[field]) * 100) / 100,
                destination === destinoIR ? 30 : 0);
        }
        // Removing EA flags only changes calculation classification, never adds a second pension assessment.
        const comparison = await engine.calculateTotal({ ...base,
            rubricasExtras: base.rubricasExtras!.map(r => ({ ...r, incidePSS: false, pssCompetenciaSeparada: false })),
            pensionRetroEntries: [{ id: 'm', competencia: '2025-01', modo: 'manual', destinoIR,
                ajusteRpps: 100, ajusteComplementar: 50, justificativa: 'Apuração individualizada' }] });
        assert.equal(result.totalDeductions, comparison.totalDeductions);
    }
});

test('partial 13th below ceiling has zero complementary deduction and invalid RPPS tables always block', () => {
    assert.equal(calculateComplementaryPension(parameters(), 4000, 4000, '13').descontoFolha, 0);
    const p = parameters({ regimePrev: 'antigo', funprespParticipacao: 'nao' });
    delete p.agencyConfig!.historico_pss.atual;
    assert.throws(() => calculateComplementaryPension(p, 9000, 9000), /tabela de RPPS/);
});

test('historical linked requires its own selection and historical normal rate rather than today inputs', () => {
    const p = parameters({ regimePrev: 'antigo', funprespParticipacao: 'vinculado', funprespBaseIntegral: 2000,
        funprespVinculadaInicio: '2026-07', funprespAliq: 0.065,
        pensionRetroEntries: [{ id: 'e', competencia: '2026-07', tabelaPSS: 'atual',
            baseRppsOriginal: 3000, baseRppsDevida: 4000, baseComplementarOriginal: 3000, baseComplementarDevida: 4000,
            contribuicaoRppsRecolhida: 300, contribuicaoComplementarRecolhida: 0 }] });
    assert.throws(() => calculatePensionRetroactives(p), /alíquota normal histórica/);
    p.pensionRetroEntries![0].aliquotaNormal = 0.07;
    assert.throws(() => calculatePensionRetroactives(p), /início/);
    p.pensionRetroEntries![0].inicioVinculado = '2026-07';
    p.pensionRetroEntries![0].salarioParticipacaoVinculado = 1000;
    const result = calculatePensionRetroactives(p)[0];
    assert.equal(result.complementar, 70);
    assert.equal(result.rpps, 100);
    assert.equal(result.entrada?.salarioParticipacaoVinculado, 1000);
});

test('capped 13th honors the RPPS gratification option without changing complementary opt-ins', async () => {
    const engine = new AgencyCalculationEngine();
    const config = configuration();
    config.bases.salario.teste.A1 = 2000;
    const p = parameters({ agencyConfig: config, gratEspecificaTipo: 'gas', funprespParticipacao: 'nao',
        funprespAliq: 0, adiant13Venc: 1, segunda13Venc: 1, incidirPSSGrat: true });
    const included = await engine.calculateTotal(p);
    const excluded = await engine.calculateTotal({ ...p, incidirPSSGrat: false });
    assert.equal(included.breakdown.pss13 - excluded.breakdown.pss13, 20);
});

for (const [left, right] of [['antigo', 'novo_antigo'], ['migrado', 'rpc']] as const) {
    test('aliases produzem os mesmos resultados completos: ' + left + '/' + right, async () => {
        const engine = new AgencyCalculationEngine();
        for (const salary of [2000, 10000 / 3, 6000]) {
            const cfg = configuration();
            cfg.bases.salario.teste.A1 = salary;
            const above = salary * 1.5 > cfg.historico_pss.atual.teto_rgps;
            for (const participation of ['nao', ...(left === 'antigo' || !above ? ['vinculado'] : ['patrocinado'])] as const) {
                const p = parameters({ agencyConfig: cfg, funprespParticipacao: participation as IAgencyCalculationParams['funprespParticipacao'],
                    funprespAliq: .085, funprespBaseIntegral: 1200, funprespVinculadaInicio: '2026-07',
                    adiant13Venc: 1, segunda13Venc: 1, adiant13FC: 1, segunda13FC: 1,
                    heQtd50: 2, heQtd100: 1, recebeAbono: true });
                assert.deepEqual(await engine.calculateTotal({ ...p, regimePrev: left }), await engine.calculateTotal({ ...p, regimePrev: right }));
            }
        }
        const retro = parameters({ funprespParticipacao: 'nao', pensionRetroEntries: [{ id: 'r', competencia: '2025-07', tabelaPSS: 'anterior',
            baseRppsOriginal: 3000, baseRppsDevida: 6000, baseComplementarOriginal: 3000, baseComplementarDevida: 6000,
            contribuicaoRppsRecolhida: 240, contribuicaoComplementarRecolhida: 0 }] });
        assert.deepEqual(calculatePensionRetroactives({ ...retro, regimePrev: left }), calculatePensionRetroactives({ ...retro, regimePrev: right }));
    });
}
