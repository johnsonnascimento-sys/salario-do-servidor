import { createServer } from 'vite';

// Mock only external I/O. State, calculation, persistence guards and row generation are real.
const mocks = {
    'react-router-dom': `export const useParams=()=>({slug:'jmu'}); export const useNavigate=()=>()=>{}; export const useLocation=()=>globalThis.__pensionPendingIO.location;`,
    './calculator/useCalculatorConfig': `export const useCalculatorConfig=()=>globalThis.__pensionPendingIO.configuration;`,
    './user/useUserAuth': `export const useUserAuth=()=>({user:globalThis.__pensionPendingIO.user});`,
    './calculator/useCalculatorExport': `export const useCalculatorExport=()=>({donationModalOpen:false,setDonationModalOpen:()=>{},pendingExportType:'pdf',
        initiateExportPDF:()=>globalThis.__pensionPendingIO.exports++,initiateExportExcel:()=>globalThis.__pensionPendingIO.exports++,
        handleDonationComplete:async()=>{globalThis.__pensionPendingIO.downloads++;}});`,
    '../services/user/payslipService': `export const createPayslip=async data=>{globalThis.__pensionPendingIO.writes++;return {id:'new',...data};};
        export const updatePayslip=async(id,data)=>{globalThis.__pensionPendingIO.writes++;globalThis.__pensionPendingIO.saved={id,...data};return {id,...data};};`,
    '../services/user/profileService': `export const getMyProfile=async()=>null;`,
};
const server = await createServer({ configFile: false, ssr: { noExternal: ['react-router-dom'] },
    server: { middlewareMode: true, hmr: false }, appType: 'custom',
    plugins: [{ name: 'pension-pending-io', enforce: 'pre',
        resolveId(source, importer) {
            if ((source === 'react-router-dom' || importer?.endsWith('/hooks/useCalculator.ts')) && source in mocks) {
                return '\0pension-pending-' + Object.keys(mocks).indexOf(source);
            }
        },
        load(id) { if (id.startsWith('\0pension-pending-')) return Object.values(mocks)[Number(id.slice('\0pension-pending-'.length))]; },
    }],
});
try {
    await server.ssrLoadModule('/tests/pensionPending.test.ts');
    await server.ssrLoadModule('/tests/pensionStage2Integration.test.ts');
}
finally { await server.close(); }
