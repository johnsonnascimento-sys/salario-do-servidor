// Runs only against the disposable fixture from dailies_versioning.sql.
import assert from 'node:assert/strict';
import pg from 'pg';

const database = process.argv[2] || 'postgres';
assert.match(database, /^(postgres|dailies_[a-z0-9_]+)$/);
const port = Number(process.argv[3] || 55436);
assert.ok([55436, 25436].includes(port), 'Only reserved local fixture ports are permitted');
const options = { host: '127.0.0.1', port, user: 'postgres', database };
const clients = [new pg.Client(options), new pg.Client(options)];
try {
  await Promise.all(clients.map(async client => {
    await client.connect();
    await client.query(`select set_config('request.jwt.claims','{"email":"admin@test.invalid"}',false)`);
  }));
  const scope = (await clients[0].query(`select id from dailies_scopes where scope_type='org' and scope_key='jf'`)).rows[0].id;
  const ids = [];
  for (let i = 0; i < 2; i++) {
    const result = await clients[0].query(`select admin_save_dailies_draft(null,$1,$2,'2027-01-01',null,'Concurrency fixture','normative') as version`, [scope, { references: { base: { value: 100 + i, currency: 'BRL', source_ids: ['test'] } } }]);
    ids.push(result.rows[0].version.id);
  }
  const results = await Promise.allSettled(clients.map((client, i) => client.query(`select admin_publish_dailies_version($1)`, [ids[i]])));
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1, 'Exactly one overlapping publication may commit');
  const failure = results.find(result => result.status === 'rejected');
  assert.match(failure.reason.message, /Sobreposição/);
  const count = (await clients[0].query(`select count(*)::int as n from dailies_versions where id=any($1::uuid[]) and status='published'`, [ids])).rows[0].n;
  assert.equal(count, 1);
  console.log('Dailies concurrent publications: one committed; one rejected; no overlap.');
} finally {
  await Promise.all(clients.map(client => client.end()));
}
