// Read-only publication gate. Never imports privileged environment credentials.
import { loadEnv, createServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
const env = loadEnv('production', process.cwd(), 'VITE_');
const server = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
let failed = false;
try {
    const { validatePublicSupabaseConfig } = await server.ssrLoadModule('/src/lib/publicSupabaseConfig.ts');
    const { mapEffectiveConfigToCourtConfig } = await server.ssrLoadModule('/src/services/config/mapEffectiveConfig.ts');
    const { deepMergeMultiple } = await server.ssrLoadModule('/src/services/config/mergeConfig.ts');
    const { resolveAssistedAuthorityDailyRate } = await server.ssrLoadModule('/src/utils/dailiesRules.ts');
    const cfg = validatePublicSupabaseConfig(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
    const db = createClient(cfg.url, cfg.key, { auth: { persistSession: false } });
    const globals = await db.from('global_config').select('config_key,config_value').is('valid_to', null);
    const powers = await db.from('power_config').select('config_key,config_value').eq('power_name', 'PJU').is('valid_to', null);
    if (globals.error || powers.error) throw new Error('Falha na leitura pública das configurações.');
    const toValues = rows => Object.fromEntries(rows.map(row => [row.config_key, row.config_value]));
    for (const slug of ['jmu', 'cjf', 'trf1', 'trf2', 'trf3', 'trf4', 'trf5', 'trf6']) {
        const { data, error } = await db.from('org_config').select('org_slug,power_name,configuration').eq('org_slug', slug).maybeSingle();
        const problems = [];
        if (error || !data) problems.push('cadastro hierárquico ausente ou indisponível');
        else {
            const effective = { ...deepMergeMultiple(toValues(globals.data), toValues(powers.data), data.configuration), org_slug: slug, power_name: data.power_name };
            const config = mapEffectiveConfigToCourtConfig(effective);
            if (data.power_name !== 'PJU') problems.push('poder incompatível');
            const review = config.adjustment_schedule?.filter(entry => entry.reviewRequired) ?? [];
            if (review.length) problems.push(`reajustes sem status revisado: ${review.map(entry => entry.period).join(', ')}`);
            if (!config.dailies?.branchId || !config.dailies?.assistedAuthorities?.length) problems.push('ramo ou catálogo de autoridades ausente');
            else for (const authority of config.dailies.assistedAuthorities) {
                try { resolveAssistedAuthorityDailyRate(config.dailies, authority.code); }
                catch { problems.push(`parâmetros incompletos para autoridade ${authority.code}`); }
            }
        }
        if (problems.length) failed = true;
        console.log(`${slug}: ${problems.length ? problems.join('; ') : 'configuração revisada disponível'}`);
    }
} catch (error) { console.error(error instanceof Error ? error.message : 'Falha na verificação de configuração.'); failed = true; }
finally { await server.close(); }
process.exitCode = failed ? 1 : 0;
