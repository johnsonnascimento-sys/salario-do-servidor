import { createServer } from 'vite';
const server = await createServer({ configFile: false, ssr: { noExternal: ["file-saver"] }, server: { middlewareMode: true, hmr: false }, appType: 'custom',
 plugins: [{ name: 'capture-pension-exports', enforce: 'pre',
 resolveId(source) { if (source === 'file-saver') return '\0pension-file-saver'; },
 load(id) { if (id === '\0pension-file-saver') return 'export const saveAs = (blob, name) => globalThis.__pensionFiles.push({blob, name});'; }
 }] });
try { await server.ssrLoadModule('/tests/pensionIntegration.test.ts'); await server.ssrLoadModule('/tests/pensionExport.test.ts'); }
finally { await server.close(); }

