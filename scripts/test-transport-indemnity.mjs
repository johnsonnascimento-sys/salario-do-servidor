import { createServer } from 'vite';

const downloads = [];
globalThis.__exportFilesTest = (blob, filename) => downloads.push({ blob, filename });

const server = await createServer({
  configFile: false,
  ssr: { noExternal: ['file-saver'] },
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  plugins: [{
    name: 'capture-download-blobs', enforce: 'pre',
    resolveId(source) { if (source === 'file-saver') return '\0capture-download-blobs'; },
    load(id) { if (id === '\0capture-download-blobs') return 'export const saveAs = (blob, filename) => globalThis.__exportFilesTest?.(blob, filename);'; }
  }]
});
try { await server.ssrLoadModule('/tests/transportIndemnity.test.ts'); }
finally { await server.close(); }
