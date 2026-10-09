import { createServer } from 'vite';

// Isolate configuration I/O; real hooks, adapters and row building run unchanged.
const mocks = {
    '../../lib/supabase': `export const supabase = { from: () => ({ select: () => ({ eq: (_, slug) => ({ single: () => globalThis.__calculatorIO.agency(slug) }) }) }) };`,
    '../../services/config': `export const configService = { getEffectiveConfig: slug => globalThis.__calculatorIO.config(slug) };`,
    '../../services/courtService': `export const getCourtBySlug = slug => globalThis.__calculatorIO.legacy(slug);`,
    '../../services/config/mapEffectiveConfig': `export const mapEffectiveConfigToCourtConfig = value => value;`,
    'react-router-dom': `export const useNavigate = () => globalThis.__calculatorIO.navigate;`,
};
const server = await createServer({ configFile: false, ssr: { noExternal: ['react-router-dom'] }, server: { middlewareMode: true }, appType: 'custom',
    plugins: [{ name: 'calculator-loading-io', enforce: 'pre',
        resolveId(source, importer) {
            if (importer?.includes('/hooks/calculator/useCalculatorConfig.ts') && source in mocks) return '\0calculator-mock-' + Object.keys(mocks).indexOf(source);
        },
        load(id) { if (id.startsWith('\0calculator-mock-')) return Object.values(mocks)[Number(id.slice('\0calculator-mock-'.length))]; }
    }]
});
try { await server.ssrLoadModule('/tests/calculatorLoading.test.ts'); }
finally { await server.close(); }
