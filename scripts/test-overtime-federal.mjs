import { createServer } from 'vite';

const server = await createServer({
    configFile: false,
    server: { middlewareMode: true },
    appType: 'custom',
    plugins: [{
        name: 'overtime-federal-mock-supabase',
        enforce: 'pre',
        resolveId(source) {
            if (source.includes('lib/supabase')) {
                return '\0overtime-mock-supabase';
            }
        },
        load(id) {
            if (id === '\0overtime-mock-supabase') {
                return 'export const supabase = { from: (...args) => globalThis.__supabaseMock.from(...args) };';
            }
        }
    }]
});

try {
    await server.ssrLoadModule('/tests/overtimeFederal.test.ts');
} finally {
    await server.close();
}
