import { createServer } from 'vite';
const server = await createServer({ configFile: false, ssr: { noExternal: ['react-router-dom'] }, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
try { await server.ssrLoadModule('/tests/pensionStage3UI.test.tsx'); }
finally { await server.close(); }
