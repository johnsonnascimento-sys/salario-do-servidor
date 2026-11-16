import { createServer } from 'vite';
const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom' });
try {
    await server.ssrLoadModule('/tests/vacationIsolation.test.ts');
    await server.ssrLoadModule('/tests/vacationCard.test.tsx');
} finally {
    await server.close();
}

