import { createServer } from 'vite';

const server = await createServer({
    configFile: false,
    server: { middlewareMode: true, hmr: false },
    appType: 'custom',
    plugins: [{
        name: 'substitution-mock-supabase',
        enforce: 'pre',
        resolveId(source) {
            if (source.includes('lib/supabase')) return '\0substitution-mock-supabase';
        },
        load(id) {
            if (id === '\0substitution-mock-supabase') {
                return 'export const supabase = { from: () => ({ select: () => Promise.resolve({ data: [], error: null }) }) };';
            }
        }
    }]
});

try {
    await server.ssrLoadModule('/tests/substitutionCalculations.test.ts');
    if (!process.argv.includes('--engine-only')) await server.ssrLoadModule('/tests/substitutionCard.test.tsx');
} finally {
    await server.close();
}
