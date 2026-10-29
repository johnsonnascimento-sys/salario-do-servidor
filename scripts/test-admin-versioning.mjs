import { createServer } from 'vite';
const server=await createServer({configFile:false,server:{middlewareMode:true,hmr:false},appType:'custom',
plugins:[{name:'admin-version-io',enforce:'pre',
resolveId(source,importer){
 if(importer?.includes('/pages/Admin') && source==='../services/admin/AdminService')return '\0admin-service';
 if(importer?.includes('/pages/Admin') && source==='../services/config')return '\0admin-cache';
},
load(id){
 if(id==='\0admin-service')return `export const AdminService={listGlobalConfigs:()=>globalThis.__adminVersionIO.list(),listPowerConfigs:()=>globalThis.__adminVersionIO.list(),versionGlobalConfig:p=>globalThis.__adminVersionIO.version(p),versionPowerConfig:p=>globalThis.__adminVersionIO.version(p)};`;
 if(id==='\0admin-cache')return `export const configService={clearCache:()=>globalThis.__adminVersionIO.clear()};`;
}}]});
try {await server.ssrLoadModule('/tests/adminVersioning.test.ts');}finally{await server.close();}
