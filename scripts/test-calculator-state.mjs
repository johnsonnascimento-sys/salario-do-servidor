import { createServer } from 'vite';

// Use Vite's existing TS bundler and Node's test runner; no database is accessed.
const server = await createServer({
    configFile: false,
    server: { middlewareMode: true },
    appType: 'custom',
});
try {
    await server.ssrLoadModule('/tests/calculatorState.test.ts');
    await server.ssrLoadModule('/tests/rubricCatalog.test.tsx');
    await server.ssrLoadModule('/tests/calculatorSearch.test.ts');
} finally {
    await server.close();
}
