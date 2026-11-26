import { createServer } from 'vite';

const server = await createServer({
    configFile: false,
    ssr: { noExternal: ['file-saver'] },
    server: { middlewareMode: true, hmr: false },
    appType: 'custom',
    plugins: [{
        name: 'capture-abate-teto-exports',
        enforce: 'pre',
        resolveId: source => source === 'file-saver' ? '\0abate-teto-export' : undefined,
        load: id => id === '\0abate-teto-export'
            ? 'export const saveAs = (blob, filename) => globalThis.__abateTetoExports.push({ blob, filename });'
            : undefined,
    }],
});
try {
    await server.ssrLoadModule('/tests/abateTeto.test.ts');
} finally {
    await server.close();
}
