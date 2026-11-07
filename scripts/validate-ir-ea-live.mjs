// Public, read-only release verification using the same configuration and engine as the site.
// --candidate overlays only the reviewed SQL JSON, without changing the database.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'vite';

const server = await createServer({ configFile: false, mode: 'production',
    server: { middlewareMode: true, hmr: false }, optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom' });
try {
    const { configService } = await server.ssrLoadModule('/src/services/config/ConfigService.ts');
    const { mapEffectiveConfigToCourtConfig: adapt } = await server.ssrLoadModule('/src/services/config/mapEffectiveConfig.ts');
    const { mapStateToAgencyParams: params } = await server.ssrLoadModule('/src/services/agency/adapters/stateToParams.ts');
    const { AgencyCalculationEngine } = await server.ssrLoadModule('/src/services/agency/engine/AgencyCalculationEngine.ts');
    const { INITIAL_STATE } = await server.ssrLoadModule('/src/types.ts');
    const engine = new AgencyCalculationEngine();
    let candidate;
    if (process.argv.includes('--candidate')) {
        candidate = JSON.parse(readFileSync('supabase/migrations/20261107_expand_ir_ea_rra_reduction.sql', 'utf8').match(/\$json\$([\s\S]*?)\$json\$::jsonb/)[1]);
    }
    for (const org of ['cjf', 'jmu']) {
        const effective = await configService.getEffectiveConfig(org);
        const config = adapt(candidate ? { ...effective, ir_deduction: { ...effective.ir_deduction, ...candidate } } : effective);
        assert.equal(config.payrollRules.overtimeMonthHours, org === 'cjf' ? 200 : 175);
        const salaryYear = Object.keys(config.historico_pss).sort().at(-1);
        const state = { ...INITIAL_STATE, cargo: 'tecnico', padrao: 'C13', funcao: 'cj1', periodo: 2,
            anoRef: '2026', mesRef: 'NOVEMBRO', tabelaPSS: salaryYear, tabelaIR: '2026_jan',
            aqTituloVR: 1, aqTreinoVR: .6, funprespParticipacao: 'nao', dependentes: 0,
            irEaContext: { mesPagamento: '2026-11' },
            overtimeEntries: [{ id: 'release-he', qtd50: 16, qtd100: 0, isEA: true, excluirIR: false, competenciasEA: ['2025-12'] }] };
        const result = await engine.calculateTotal(params(state, org, config));
        assert(result.breakdown.irEaMemory?.status === 'ready');
        assert.equal(result.breakdown.irEaMemory.tabela, '2026_jan');
        assert.equal(result.breakdown.irEaMemory.meses, 1);
        assert.equal(result.breakdown.irEA, 0, '2026 NM=1: low RRA is zero after the verified reduction.');
        assert(result.breakdown.irEaMemory.impostoAntesReducao > 0, 'Progressive tax must be computed before reduction.');
        assert.equal(result.breakdown.hePss, 0);
        const mapSum = Object.values(result.breakdown.irEaEntryTax).reduce((sum, value) => sum + value, 0);
        assert.equal(Math.round(mapSum * 100), Math.round(result.breakdown.irEA * 100));
        await assert.rejects(engine.calculateTotal(params({ ...state, overtimeEntries: state.overtimeEntries.map(entry => ({ ...entry, competenciasEA: [] })) }, org, config)), /IR-EA.*competências/);
        const multi = await engine.calculateTotal(params({ ...state, overtimeEntries: state.overtimeEntries.map(entry => ({ ...entry, competenciasEA: ['2025-11', '2025-12'] })) }, org, config));
        assert.equal(multi.breakdown.irEaMemory.meses, 2);
        // The same low gross paid in May/2025 has progressive tax, without the 2026 reducer.
        const historical = await engine.calculateTotal(params({ ...state, anoRef: '2025', mesRef: 'MAIO', tabelaIR: '2025_maio',
            irEaContext: { mesPagamento: '2025-05' }, overtimeEntries: [{ id: 'release-historical', qtd50: 0, qtd100: 0,
                valorBrutoManual: 2801.38, isEA: true, excluirIR: false, competenciasEA: ['2024-12'] }] }, org, config));
        assert.equal(historical.breakdown.irEA, 27.94);
        console.log(JSON.stringify({ org, heGross: result.breakdown.heTotal, irBeforeReduction: result.breakdown.irEaMemory.impostoAntesReducao,
            reduction: result.breakdown.irEaMemory.reducao, irEA: result.breakdown.irEA, historicalMay2025: historical.breakdown.irEA }));
    }
    console.log(process.argv.includes('--candidate') ? 'CANDIDATE PASSED: public configuration plus reviewed IR JSON; database unchanged.' : 'LIVE PASSED: published database configuration and official engine scenarios.');
} finally { await server.close(); }
