import { createServer } from 'vite';
const server = await createServer({
    configFile:false, server:{middlewareMode:true}, appType:'custom',
    plugins:[{
        name:'isolated-config-db', enforce:'pre',
        load(id) {
            if(!id.replaceAll('\\','/').endsWith('/src/lib/supabase.ts')) return;
            return `export const supabase={from(table){
                const filters={};
                const request=()=>globalThis.__configDatabase(table,filters);
                const query={select(){return query},eq(key,value){filters[key]=value;return query},
                    is(key,value){filters[key]=value;return query},maybeSingle(){filters.single=true;return request()},
                    then(ok,fail){return Promise.resolve().then(request).then(ok,fail)}};
                return query;
            }};`;
        },
    }],
});
try { await server.ssrLoadModule('/tests/configService.test.ts'); }
finally { await server.close(); }
