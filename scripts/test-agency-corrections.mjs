import { createServer } from 'vite';

const server = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
try {
    await server.ssrLoadModule('/tests/agencyCorrections.test.ts');
} finally {
    await server.close();
}
