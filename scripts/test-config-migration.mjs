// Disposable PostgreSQL via PGlite. No network/database credentials are used.
// Install @electric-sql/pglite in a temporary directory and set PGLITE_MODULE_PATH
// to its dist/index.js, or install the package in your usual external tooling path.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const moduleName = process.env.PGLITE_MODULE_PATH;
const { PGlite } = await import(moduleName ? pathToFileURL(moduleName).href : '@electric-sql/pglite');
const db = new PGlite();
let checks = 0;
const verify = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
try {
    await db.exec(`
        create role anon;
        create role authenticated;
        create schema auth;
        create function auth.jwt() returns jsonb language sql stable as
            $$ select coalesce(nullif(current_setting('request.jwt.claims', true),''),'{}')::jsonb $$;
        create table public.admin_allowlist(email text,enabled boolean);
        create table public.signup_allowlist(id uuid);
        create table public.courts(id uuid);
        create table public.global_config(id uuid primary key default gen_random_uuid(), config_key text not null,
            config_value jsonb not null, valid_from date not null, valid_to date, unique(config_key,valid_from));
        create table public.power_config(id uuid primary key default gen_random_uuid(), power_name text not null,
            config_key text not null, config_value jsonb not null, valid_from date not null, valid_to date,
            unique(power_name,config_key,valid_from));
        create table public.org_config(id uuid primary key default gen_random_uuid(), org_slug text not null unique,
            org_name text not null,power_name text not null,configuration jsonb default '{}');
        insert into public.admin_allowlist values ('admin@example.test',true);
    `);
    const usersSql = await readFile(new URL('../supabase/migrations/20260306_admin_users_management_and_password_recovery.sql', import.meta.url),'utf8');
    const adminFunction = usersSql.match(/create or replace function public.is_admin_user\(\)[\s\S]*?\$\$;/)[0];
    await db.exec(adminFunction);
    await db.exec(await readFile(new URL('../supabase/migrations/20260306_security_hardening_admin_and_config_policies.sql', import.meta.url),'utf8'));
    await db.exec(`
        insert into public.power_config(power_name,config_key,config_value,valid_from) values ('PJU','dailies_rules','{
            "derived_from_minister":{"enabled":true,"minister_per_diem":1466.95,"rates_percentages":{"cj":0.6,"analista":0.55,"juiz":0.9025},"embarkation_percentage_full":0.4,"embarkation_percentage_half":0.2},
            "external_gloss":{"hospedagem":0.55,"alimentacao":0.25,"transporte":0.2},
            "discount_rules":{"holidays":["2026-09-07"],"holiday_calendar_label":"STM 2026"},"custom_key":"preservado"}', '2026-10-01');
        insert into public.org_config(org_slug,org_name,power_name,configuration) values ('trf3','Nome personalizado','PJU',
            '{"custom":{"keep":true},"dailies_rules":{"ldo_cap":{"per_diem_limit":999},"derived_from_minister":{"embarkation_percentage_full":0.48}}}');
    `);
    const migration = await readFile(new URL('../supabase/migrations/20261029_calculator_config_compliance.sql', import.meta.url),'utf8');
    await db.exec(`insert into public.power_config(power_name,config_key,config_value,valid_from,valid_to)
        values('PJU','dailies_rules','{"legitimate_version":true}','2026-10-29','2026-10-30')`);
    await assert.rejects(()=>db.exec(migration),/versão não identificada/); checks++;
    await db.exec('rollback');
    verify((await db.query('select count(*)::int as count from org_config')).rows[0].count,1,'colisão não cria órgãos parcialmente');
    await db.exec(`delete from power_config where valid_from='2026-10-29'`);
    await db.exec(migration);
    let rows = (await db.query(`select *,valid_to::text as closed_date from power_config where power_name='PJU' and config_key='dailies_rules' order by valid_from`)).rows;
    verify(rows.length,2,'diárias versionadas');
    verify(rows[0].config_value.custom_key,'preservado','versão antiga intocada');
    verify(rows[0].closed_date,'2026-10-28','versão anterior encerrada');
    const common=rows[1].config_value;
    verify(common.custom_key,'preservado','campos comuns extras preservados');
    verify(common.discount_rules.holidays,[],'sem calendário STM compartilhado');
    verify(common.discount_rules.holiday_calendar_label,undefined,'metadado do calendário retirado');
    verify(common.external_gloss,undefined,'glosa cadastrada por ramo');
    let orgs=(await db.query(`select * from org_config order by org_slug`)).rows;
    verify(orgs.length,8,'JMU, CJF e seis TRFs cadastrados');
    verify(orgs.every(org=>org.power_name==='PJU'),true,'poder PJU');
    const trf3=orgs.find(org=>org.org_slug==='trf3');
    verify(trf3.org_name,'Nome personalizado','nome existente preservado');
    verify(trf3.configuration.custom.keep,true,'override externo preservado');
    verify(trf3.configuration.dailies_rules.ldo_cap.per_diem_limit,999,'override local de teto preservado');
    verify(trf3.configuration.dailies_rules.derived_from_minister.embarkation_percentage_full,0.48,'override local do adicional preservado');
    const jmu=orgs.find(org=>org.org_slug==='jmu').configuration.dailies_rules;
    verify(jmu.derived_from_minister.rates_percentages.juiz_titular,0.95,'JMU juiz 95%');
    verify(jmu.assisted_authorities.map(a=>a.code),['ministro_stm','juiz_militar'],'catálogo JMU segregado');
    const jf=orgs.find(org=>org.org_slug==='cjf').configuration.dailies_rules;
    verify(jf.derived_from_minister.rates_percentages.juiz_titular,0.9025,'Justiça Federal juiz 90,25%');
    verify(jf.assisted_authorities.map(a=>a.code),['ministro_cjf','desembargador_trf','juiz_federal'],'catálogo JF segregado');
    const before=JSON.stringify((await db.query('select * from power_config order by id')).rows);
    await db.exec(migration);
    verify(JSON.stringify((await db.query('select * from power_config order by id')).rows),before,'reexecução idempotente');

    for (const layer of ['global','power']) {
        const table=layer+'_config';
        const columns=layer==='power'?'power_name,config_key,config_value,valid_from':'config_key,config_value,valid_from';
        const values=layer==='power'?"'PJU','rpc_test','{\"old\":true}',current_date-10":"'rpc_test','{\"old\":true}',current_date-10";
        const old=(await db.query(`insert into ${table}(${columns}) values(${values}) returning id`)).rows[0].id;
        const powerArg=layer==='power'?"'PJU',":'';
        const call=(key='rpc_test',from='current_date-5',power=powerArg)=>
            `select public.admin_version_${table}('${old}',${power}'${key}','{"new":true}',${from},null)`;
        await db.exec(`set role authenticated; set request.jwt.claims='{"email":"user@example.test"}';`);
        await assert.rejects(()=>db.exec(call()),/acesso negado/); checks++;
        await assert.rejects(()=>db.exec(`insert into ${table}(${columns}) values(${values})`),/row-level security/); checks++;
        await db.exec(`set request.jwt.claims='{"email":"admin@example.test"}';`);
        await assert.rejects(()=>db.exec(call('different_key')),/chave e o poder/); checks++;
        if(layer==='power') { await assert.rejects(()=>db.exec(call('rpc_test','current_date-5',"'OUTRO',")),/chave e o poder/); checks++; }
        await assert.rejects(()=>db.exec(call('rpc_test','current_date-10')),/sem repetir o dia/); checks++;
        await assert.rejects(()=>db.exec(call('rpc_test','current_date+1')),/agendamento futuro/); checks++;
        await db.exec('reset role');
        const overlapValues=layer==='power'?"'PJU','rpc_test','{}',current_date-4":"'rpc_test','{}',current_date-4";
        const overlap=(await db.query(`insert into ${table}(${columns},valid_to) values(${overlapValues},current_date-1) returning id`)).rows[0].id;
        await assert.rejects(()=>db.exec(call()),/sobreposição/); checks++;
        await db.exec(`delete from ${table} where id='${overlap}';set role authenticated;`);
        // The WASM database serializes requests; both callers use the same stale id.
        const outcomes=await Promise.allSettled([db.exec(call()),db.exec(call())]);
        verify(outcomes.filter(result=>result.status==='fulfilled').length,1,'um único versionamento aceita a versão anterior');
        verify(outcomes.filter(result=>result.status==='rejected').length,1,'versão obsoleta é rejeitada');
        await db.exec('reset role');
        const history=(await db.query(`select * from ${table} where config_key='rpc_test' order by valid_from`)).rows;
        verify(history.length,2,'histórico de RPC preservado');
        verify(history[0].config_value,{old:true},'valor anterior preservado');
        verify(history[1].config_value,{new:true},'valor novo ativo');
        verify(history[1].valid_to,null,'nova versão ativa');
    }
    await db.exec('set role anon');
    await assert.rejects(()=>db.exec(`select public.admin_version_global_config(gen_random_uuid(),'a','{}',current_date,null)`),/permission denied/); checks++;
    console.log(`Config migration: ${checks} checks passed in disposable PostgreSQL (PGlite).`);
} finally { await db.close(); }
