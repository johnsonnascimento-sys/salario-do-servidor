import { createServer } from 'vite';
const server = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
try { await server.ssrLoadModule('/tests/pensionRetroWorkflow.test.tsx'); }
finally { await server.close(); }
