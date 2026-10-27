import { createServer } from 'vite';

// Replace external IO only. The production adapters, engine, serializer, PDF,
// spreadsheet and export builders all run unchanged with real implementations.
globalThis.__dailiesIntegrationIO = { calls: 0, versions: [], context: { org_slug: 'jmu' }, downloads: [] };
const server = await createServer({
  configFile: false, server: { middlewareMode: true }, appType: 'custom', ssr: { noExternal: ['file-saver'] },
  plugins: [{
    name: 'dailies-integration-io', enforce: 'pre',
    resolveId(source) {
      if (source.endsWith('/DailiesService')) return '\0dailies-service-test';
      if (source === 'file-saver') return '\0dailies-download-test';
    },
    load(id) {
      if (id === '\0dailies-service-test') return `export const dailiesService = { getForInput: async () => {
        const io = globalThis.__dailiesIntegrationIO; io.calls++;
        return { versions: structuredClone(io.versions), context: structuredClone(io.context), revision: 'fixture' };
      }};`;
      if (id === '\0dailies-download-test') return `export const saveAs = (blob, filename) => globalThis.__dailiesIntegrationIO.downloads.push({ blob, filename });`;
    },
  }],
});
try { await server.ssrLoadModule('/tests/dailies-integration.test.ts'); }
finally { await server.close(); delete globalThis.__dailiesIntegrationIO; }
