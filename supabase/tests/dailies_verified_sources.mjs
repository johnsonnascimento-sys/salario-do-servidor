// Tests the exact payload literals shipped by the review migration. These drafts
// become published ONLY in memory to exercise rate resolution; never in a database.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';

const sql = await readFile(new URL('../migrations/20261027180000_dailies_verified_drafts.sql', import.meta.url), 'utf8');
const extract = tag => JSON.parse(sql.match(new RegExp(`\\$${tag}\\$([\\s\\S]*?)\\$${tag}\\$`))[1]);
const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom' });
let assertions = 0;
try {
  const { resolveDailiesConfig, resolveDailiesRate, calculateDailies } = await server.ssrLoadModule('/src/services/agency/dailies/engine.ts');
  const fixtures = [
    { tag: 'cjf596', branch: 'CJF', org: 'jf', from: '2023-09-21', to: '2026-06-09', values: {analista:763.60,cj:763.60,tecnico:624.76,fc:624.76} },
    { tag: 'cjf315', branch: 'CJF', org: 'jf', from: '2026-06-10', to: null, values: {analista:850.04,cj:850.04,tecnico:695.49,fc:695.49} },
    { tag: 'jmu799', branch: 'JMU', org: 'jmu', from: '2024-11-14', to: null, values: {analista:806.82,cj:880.17,tecnico:660.13} },
    { tag: 'jmu926', branch: 'JMU', org: 'jmu', from: '2026-01-23', to: '2026-12-31', values: {} },
  ];
  for (const fixture of fixtures) {
    const payload = extract(fixture.tag);
    const context = {org_slug:fixture.org,power:'PJU',branch:fixture.branch};
    const version = {id:fixture.tag,revision:1,scope_type:'branch',scope_key:fixture.branch,valid_from:fixture.from,valid_to:fixture.to,status:'published',payload};
    const config = resolveDailiesConfig([version], context, fixture.from);
    for (const [category, expected] of Object.entries(fixture.values)) {
      assert.deepEqual(resolveDailiesRate(config,category), {value:expected,currency:'BRL'}); assertions++;
    }
    assert.equal(payload.rules,undefined,'Do not invent legal calculation rules from a monetary table'); assertions++;
    assert.equal(payload.limits,undefined,'Documentary ceiling must not choose an unsupported cap strategy'); assertions++;
    const result = calculateDailies({org_slug:fixture.org,competence:fixture.from.slice(0,7),mode:'quantity',normative_date:fixture.from,quantity:1,category:'analista'},[version],context);
    assert.equal(result.available,false,'Incomplete documentary draft must not calculate'); assertions++;
  }
  assert.equal(extract('cjf596').references.indenizacao_deslocamento_documentada.value,610.88); assertions++;
  assert.equal(extract('cjf315').references.indenizacao_deslocamento_documentada.value,680); assertions++;
  assert.equal(extract('cjf315').references.teto_nacional_documentado.value,1165.27); assertions++;
  assert.equal(extract('jmu926').references.teto_ldo_nacional_documentado_2026.value,1153.37); assertions++;
  assert.match(sql,/'draft','2023-09-21','2026-06-09'/); assertions++;
  assert.match(sql,/'draft','2026-06-10',null/); assertions++;
  assert.equal((sql.match(/'draft',/g)||[]).length,4); assertions++;
  console.log(`Verified official dailies tables: ${assertions} assertions passed; all database rows remain drafts.`);
} finally { await server.close(); }
