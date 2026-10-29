import test from 'node:test';
import assert from 'node:assert/strict';
import { ConfigService, ConfigLoadError, ConfigNotFoundError } from '../src/services/config/ConfigService';

const org = { org_slug:'cjf',org_name:'CJF',power_name:'PJU',configuration:{ dailies_rules:{ rates:{analista:333} } } };
const globalRows = [{config_key:'dependent_deduction',config_value:189.59},
    {config_key:'dailies_rules',config_value:{rates:{analista:111,tecnico:100}}}];
const powerRows = [{config_key:'dailies_rules',config_value:{rates:{analista:222},derived_from_minister:{enabled:true}}}];
test('ConfigService preserva precedência e cache, sem fabricar órgãos CJF/TRF ausentes', async () => {
    const calls:string[]=[];
    (globalThis as any).__configDatabase = async (table:string, filters:Record<string,unknown>) => {
        calls.push(table);
        if(table==='org_config') {
            assert.equal(filters.single,true);
            if(filters.org_slug==='trf6') return {data:null,error:null};
            return {data:org,error:null};
        }
        assert.equal(filters.valid_to,null);
        if(table==='power_config') assert.equal(filters.power_name,'PJU');
        return {data:table==='global_config'?globalRows:powerRows,error:null};
    };
    const service=new ConfigService();
    const first=await service.getEffectiveConfig('cjf');
    assert.equal(first.dailies_rules?.rates.analista,333);
    assert.equal(first.dailies_rules?.rates.tecnico,100);
    assert.equal(first.dailies_rules?.derived_from_minister?.enabled,true);
    assert.equal(first.org_slug,'cjf');
    assert.equal((await service.getEffectiveConfig('cjf')),first);
    assert.equal(calls.length,3);
    service.clearCacheForOrg('cjf');
    await service.getEffectiveConfig('cjf');
    assert.equal(calls.length,6);
    service.clearCache();
    await assert.rejects(()=>service.getEffectiveConfig('trf6'),error=>error instanceof ConfigNotFoundError && error.code==='CONFIG_NOT_FOUND');
    assert.equal(calls.length,7,'órgão ausente não recebe regras normativas inventadas');
});

test('ConfigService diferencia ausência de falha operacional sem cachear falhas', async () => {
    const service=new ConfigService();
    (globalThis as any).__configDatabase=async()=>({data:null,error:{message:'offline'}});
    const consoleError=console.error;
    console.error=()=>{};
    try {
        await assert.rejects(()=>service.getEffectiveConfig('cjf'),error=>error instanceof ConfigLoadError && error.code==='CONFIG_LOAD_FAILED');
    } finally {console.error=consoleError;}
    (globalThis as any).__configDatabase=async(table:string)=>({data:table==='org_config'?org:[],error:null});
    await assert.rejects(()=>service.getEffectiveConfig('cjf'),error=>error instanceof ConfigNotFoundError);
    (globalThis as any).__configDatabase=async(table:string)=>({data:table==='org_config'?org:table==='global_config'?globalRows:[],error:null});
    await assert.rejects(()=>service.getEffectiveConfig('cjf'),error=>error instanceof ConfigNotFoundError);
    (globalThis as any).__configDatabase=async(table:string)=>({data:table==='org_config'?org:table==='global_config'?[...globalRows,...globalRows]:powerRows,error:null});
    await assert.rejects(()=>service.getEffectiveConfig('cjf'),/Mais de uma versão global ativa/);
    (globalThis as any).__configDatabase=async(table:string)=>({data:table==='org_config'?org:table==='global_config'?globalRows:powerRows,error:null});
    assert.equal((await service.getEffectiveConfig('cjf')).org_slug,'cjf');
});
