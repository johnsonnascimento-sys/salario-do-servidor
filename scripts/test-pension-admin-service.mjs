import { createServer } from 'vite';

// Only the transport is replaced; routes, config mapping and validation remain production code.
const mockedSupabase = '\0pension-admin-service-supabase';
const server = await createServer({
    configFile: false,
    plugins: [{
        name: 'pension-admin-service-supabase-only',
        enforce: 'pre',
        resolveId(id, importer) {
            if (id === '../../lib/supabase' && importer?.replaceAll('\\', '/').endsWith('/src/services/admin/AdminService.ts')) return mockedSupabase;
        },
        load(id) {
            if (id === mockedSupabase) return `export const supabase = {
                from(...args) { return globalThis.__pensionSupabaseMock.from(...args); },
                rpc(...args) { return globalThis.__pensionSupabaseMock.rpc(...args); }
            };`;
        },
    }],
    server: { middlewareMode: true, hmr: false }, appType: 'custom',
});
try { await server.ssrLoadModule('/tests/pensionAdminService.test.ts'); }
finally { await server.close(); }
