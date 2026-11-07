import { createServer } from 'vite';

const server = await createServer({
    configFile: false,
    server: { middlewareMode: true },
    appType: 'custom',
    plugins: [{
        name: 'ir-ea-mock-supabase',
        enforce: 'pre',
        resolveId(source) {
            if (source.includes('lib/supabase')) {
                return '\0ir-ea-mock-supabase';
            }
        },
        load(id) {
            if (id === '\0ir-ea-mock-supabase') {
                return 'export const supabase = { from: () => ({ select: () => Promise.resolve({ data: [], error: null }) }) };';
            }
        }
    }]
});

try {
    await server.ssrLoadModule('/tests/irEaProgressive.test.ts');
} finally {
    await server.close();
}
