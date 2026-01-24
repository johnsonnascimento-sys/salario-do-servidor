
import { JmuService } from '../src/services/agency/implementations/JmuService';
import { CalculatorState } from '../src/types';
import { mapStateToJmuParams } from '../src/services/agency/adapters/stateToParams';
import { config } from 'dotenv';
import path from 'path';

// Load env
config({ path: path.resolve(__dirname, '../.env.local') });

const mockState: CalculatorState = {
    // Current defaults for Analista A1
    cargo: 'analista',
    padrao: 'A1',
    periodo: 0, // 2025
    funcao: '0',
    aqTituloPerc: 0,
    aqTreinoPerc: 0,
    aqTituloVR: 0,
    aqTreinoVR: 0,
    recebeAbono: false,
    gratEspecificaTipo: 'nenhum',
    gratEspecificaValor: 0,
    vpni_lei: 0,
    vpni_decisao: 0,
    ats: 0,
    dependentes: 0,
    regimePrev: 'rpc',
    funprespAliq: 0,
    funprespFacul: 0,
    tabelaPSS: '2025',
    tabelaIR: '2025_maio',
    pssSobreFC: false,
    incidirPSSGrat: false,
    auxAlimentacao: 1182.74,
    auxPreEscolarQtd: 0,
    auxTransporteGasto: 0,
    emprestimos: 0,
    planoSaude: 0,
    pensao: 0,
    tipoCalculo: 'jan',
    manualFerias: false,
    ferias1_3: 0,
    feriasAntecipadas: false,
    manualAdiant13: false,
    adiant13Venc: 0,
    adiant13FC: 0,
    heQtd50: 0,
    heQtd100: 0,
    substDias: {},
    diariasQtd: 0,
    diariasEmbarque: 'nenhum',
    diariasExtHospedagem: false,
    diariasExtAlimentacao: false,
    diariasExtTransporte: false,
    diariasDescontarAlimentacao: false,
    diariasDescontarTransporte: false,
    licencaDias: 0,
    baseLicenca: 'auto',
    incluirAbonoLicenca: false,
    rubricasExtras: [],
    manualBaseHE: false,
    heBase: 0,
    heIsEA: false,
    substIsEA: false,
    manualDecimoTerceiroNov: false,
    decimoTerceiroNovVenc: 0,
    decimoTerceiroNovFC: 0,
    vencimento: 0, // Will be calculated
    gaj: 0,
    totalBruto: 0,
    totalDescontos: 0,
    liquido: 0,
    aqTituloValor: 0,
    aqTreinoValor: 0,
    auxPreEscolarValor: 0,
    auxTransporteValor: 0,
    auxTransporteDesc: 0,
    abonoPermanencia: 0,
    irEA: 0,
    feriasDesc: 0,
    gratNatalinaTotal: 0,
    abonoPerm13: 0,
    diariasValorTotal: 0,
    diariasBruto: 0,
    diariasDescAlim: 0,
    diariasDescTransp: 0,
    licencaValor: 0,
    pssMensal: 0,
    valFunpresp: 0,
    irMensal: 0,
    irFerias: 0,
    pss13: 0,
    ir13: 0,
    heVal50: 0,
    heVal100: 0,
    heTotal: 0,
    substTotal: 0
};

async function run() {
    console.log('Testing JmuService...');
    try {
        const service = new JmuService();
        const params = mapStateToJmuParams(mockState, 'jmu');

        console.log('Params:', JSON.stringify(params, null, 2));

        const result = await service.calculateTotal(params);
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (err) {
        console.error('Error:', err);
    }
}

run();
