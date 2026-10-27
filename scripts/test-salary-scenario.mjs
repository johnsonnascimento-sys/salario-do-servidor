import { createServer } from 'vite';
const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom',
  plugins: [{ name: 'salary-scenario-no-data-io', enforce: 'pre',
    resolveId(source) { if (source.endsWith('/DailiesService')) return '\0salary-no-dailies-io'; },
    load(id) { if (id === '\0salary-no-dailies-io') return `export const dailiesService = { getForInput: () => { throw new Error('Unexpected data IO in salary scenario test'); } };`; },
  }],
});
try { await server.ssrLoadModule('/tests/salaryScenario.test.ts'); }
finally { await server.close(); }
