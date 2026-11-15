import { createServer } from 'vite';

const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom' });
try {
    await server.ssrLoadModule('/tests/calculatorAccordion.test.tsx');
} finally {
    await server.close();
}
