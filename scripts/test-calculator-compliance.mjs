import { spawnSync } from 'node:child_process';

// Run separately and sequentially to isolate mocks and Vite's test servers.
const scripts = [
    'test-agency-corrections.mjs', 'test-dailies-pju.mjs', 'test-config-service.mjs',
    'test-admin-versioning.mjs', 'test-presentation-regression.mjs',
    'test-pension.mjs', 'test-pension-integration.mjs', 'test-pension-form.mjs',
    'test-calculator-state.mjs', 'test-calculator-loading.mjs', 'test-payslip-sorting.cjs',
];
let failed = false;
for (const script of scripts) {
    console.log(`\n${script}`);
    const result = spawnSync(process.execPath, [`scripts/${script}`], { stdio: 'inherit' });
    if (result.status !== 0) failed = true;
}
process.exitCode = failed ? 1 : 0;
