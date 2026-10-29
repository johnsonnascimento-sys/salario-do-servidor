import { createServer } from 'vite';

const server = await createServer({
    configFile: false,
    server: { middlewareMode: true },
    appType: 'custom',
    plugins: [{
        name: 'config-service-mock-supabase',
        enforce: 'pre',
        resolveId(source, importer) {
            if (source.includes('lib/supabase')) {
                return '\0config-mock-supabase';
            }
        },
        load(id) {
            if (id === '\0config-mock-supabase') {
                return 'export const supabase = { from: (...args) => globalThis.__supabaseMock.from(...args) };';
            }
        }
    }]
});

try {
    await server.ssrLoadModule('/tests/configService.test.ts');
} finally {
    await server.close();
}
