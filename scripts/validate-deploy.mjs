import { createServer } from 'vite';

// Same config service, mapper and engine as the application, with public credentials.
const server = await createServer({ configFile: false, mode: 'production',
    server: { middlewareMode: true }, optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom' });
const originalError = console.error;
try {
    console.error = () => {}; // Supabase responses must not disclose credentials in deploy logs.
    const { supabase } = await server.ssrLoadModule('/src/lib/supabase.ts');
    const { configService } = await server.ssrLoadModule('/src/services/config/ConfigService.ts');
    const { mapEffectiveConfigToCourtConfig } = await server.ssrLoadModule('/src/services/config/mapEffectiveConfig.ts');
    const { AgencyCalculationEngine } = await server.ssrLoadModule('/src/services/agency/engine/AgencyCalculationEngine.ts');
    const { mapStateToAgencyParams } = await server.ssrLoadModule('/src/services/agency/adapters/stateToParams.ts');
    const { INITIAL_STATE } = await server.ssrLoadModule('/src/types.ts');
    const { data: agency, error } = await supabase.from('agencies').select('slug').eq('slug', 'jmu').single();
    if (error || agency?.slug !== 'jmu') throw new Error('agency');
    const config = mapEffectiveConfigToCourtConfig(await configService.getEffectiveConfig('jmu'));
    const cargo = Object.keys(config.bases.salario)[0];
    const padrao = Object.keys(config.bases.salario[cargo] || {})[0];
    if (!cargo || !padrao || !config.payrollRules || !config.careerCatalog?.noFunctionCode) throw new Error('config');
    const result = await new AgencyCalculationEngine().calculateTotal(mapStateToAgencyParams({
        ...INITIAL_STATE, cargo, padrao, funcao: config.careerCatalog.noFunctionCode,
        tabelaIR: Object.keys(config.historico_ir)[0],
        tabelaPSS: Object.keys(config.historico_pss)[0],
        periodo: config.adjustment_schedule?.[0]?.period ?? 0,
    }, 'jmu', config));
    if (!Number.isFinite(result.netSalary) || !(result.breakdown.vencimento > 0)) throw new Error('calculation');
    console.log('Preflight aprovado: agência JMU, configuração efetiva e cálculo disponíveis.');
} catch {
    process.exitCode = 1;
    originalError('Preflight reprovado: confira a configuração pública de produção, a conexão e os dados da JMU.');
} finally {
    console.error = originalError;
    await server.close();
}
