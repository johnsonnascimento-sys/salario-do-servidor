import { createServer } from 'vite';

const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom' });
try {
    await server.ssrLoadModule('/tests/irEaConfig.test.ts');
} finally {
    await server.close();
}
