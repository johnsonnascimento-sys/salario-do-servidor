import { createServer } from 'vite';

const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom' });
try {
    await server.ssrLoadModule('/tests/thirteenthCard.test.tsx');
    await server.ssrLoadModule('/tests/thirteenthResults.test.tsx');
} finally {
    await server.close();
}
