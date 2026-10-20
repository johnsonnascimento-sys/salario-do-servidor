import { createServer } from 'vite';
const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom' });
try {
    await server.ssrLoadModule('/tests/pensionForm.test.ts');
    await server.ssrLoadModule('/tests/pensionSelection.test.ts');
    await server.ssrLoadModule('/tests/pensionSelectionRetro.test.ts');
} finally { await server.close(); }
