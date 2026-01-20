export interface SalaryTable {
  [cargo: string]: {
    [padrao: string]: number;
  };
}

export interface FuncoesTable {
  [key: string]: number;
}

export interface TaxTable {
  teto_rgps: number;
  faixas: { min: number; max: number; rate: number }[];
}

export interface CourtConfig {
  bases: {
    salario: SalaryTable;
    funcoes: FuncoesTable;
  };
  historico_pss: Record<string, TaxTable>;
  historico_ir: Record<string, number>;
  values: {
    food_allowance?: number;
    pre_school?: number;
    deducao_dep?: number;
    cj1_integral_base?: number;
  };
  menus?: {
    food_allowance?: Array<{ label: string; value: number }>;
    preschool_allowance?: Array<{ label: string; value: number }>;
  };
}

export interface Rubrica {
  id: string;
  descricao: string;
  valor: number;
  tipo: 'C' | 'D';
}

export interface CalculatorState {
  // Rubricas Dinâmicas
  rubricasExtras: Rubrica[];

  // Dados de Impressão (UI)
  dadosBancarios: {
    banco: string;
    agencia: string;
    conta: string;
  };
  lotacao: string;
  observacoes: string;

  // Global
  nome: string;
  periodo: number; // 0 to 4
  mesRef: string;
  anoRef: number;
  tipoCalculo: 'comum' | 'jan' | 'jun' | 'nov';

  // Fixed Income
  cargo: 'analista' | 'tec';
  padrao: string;
  funcao: string; // '0' for none, or key like 'fc1'
  vencimento: number;
  gaj: number;
  vpni_lei: number;
  vpni_decisao: number;
  ats: number;
  recebeAbono: boolean;
  abonoPermanencia: number;
  abonoPerm13?: number;
  gratEspecificaTipo: '0' | 'gae' | 'gas';
  gratEspecificaValor: number;
  incidirPSSGrat: boolean;

  // AQ
  aqTituloPerc: number; // For 2025 rule (percent)
  aqTreinoPerc: number; // For 2025 rule (percent)
  aqTituloVR: number;   // For 2026+ rule (qty of VRs)
  aqTreinoVR: number;   // For 2026+ rule (qty of VRs)
  aqTituloValor: number;
  aqTreinoValor: number;

  // Variables & HE
  heBase: number;
  manualBaseHE: boolean; // Checkbox to lock HE base
  heQtd50: number;
  heQtd100: number;
  heVal50: number;
  heVal100: number;
  heTotal: number;
  heIsEA: boolean;

  // Substitution (New Grid System)
  substDias: Record<string, number>; // Map like { 'fc1': 0, 'cj2': 5 }
  substTotal: number;
  substIsEA: boolean;

  // License & Aids
  licencaDias: number;
  baseLicenca: string; // 'auto', 'cj4', 'cj3'...
  incluirAbonoLicenca: boolean;
  licencaValor: number;

  auxAlimentacao: number;
  auxPreEscolarQtd: number;
  cotaPreEscolar: number;
  auxPreEscolarValor: number;
  auxTransporteGasto: number;
  auxTransporteValor: number; // Credit
  auxTransporteDesc: number; // Debit

  // Discounts
  tabelaPSS: '2026' | '2025' | '2024';
  tabelaIR: '2025_maio' | '2024_fev';
  dependentes: number;
  regimePrev: 'antigo' | 'migrado' | 'novo_antigo' | 'rpc';
  funprespAliq: number;
  funprespFacul: number;

  // PSS Configuration Flags
  pssSobreFC: boolean;
  pssSobreAQTreino: boolean;

  // Manual Inputs
  emprestimos: number;
  planoSaude: number;
  pensao: number;

  // 13th and Vacation
  ferias1: number; // Placeholder/Deprecated?
  ferias1_3: number;
  feriasDesc: number; // Debit for advanced vacation
  manualFerias: boolean; // Checkbox to not auto-calc/zero vacation
  feriasAntecipadas: boolean;
  ir13?: number;
  pss13?: number;
  gratNatalinaTotal?: number;

  // 13th Breakdown (Manual Calculation Support)
  adiant13Venc: number; // Adiantamento Ativo EC (Base) - Used for JAN/JUN logic
  adiant13FC: number;   // Adiantamento FC/CJ (Função) - Used for JAN/JUN logic
  manualAdiant13: boolean; // Checkbox to not auto-calc 13th (JAN/JUN)

  // Specific for November Override (Debit Correction)
  manualDecimoTerceiroNov: boolean;
  decimoTerceiroNovVenc: number;
  decimoTerceiroNovFC: number;

  integral13: number;   // Calculated automatically for Nov

  // Computed Results
  pssMensal: number;
  irMensal: number;
  irEA: number;
  irFerias: number;
  valFunpresp: number;
  totalBruto: number;
  totalDescontos: number;
  liquido: number;

  // Diarias
  diariasQtd: number;
  diariasMeiaQtd: number;
  diariasEmbarque: 'nenhum' | 'metade' | 'completo';
  diariasMotivo: string;
  diariasDescontarAlimentacao: boolean;
  diariasDescontarTransporte: boolean;
  diariasValorTotal: number;
  diariasBruto: number;
  diariasDescAlim: number;
  diariasDescTransp: number;
  diariasExtHospedagem: boolean;
  diariasExtAlimentacao: boolean;
  diariasExtTransporte: boolean;
}

export const INITIAL_STATE: CalculatorState = {
  rubricasExtras: [],
  dadosBancarios: { banco: '', agencia: '', conta: '' },
  lotacao: 'Xa AUD Xa CJM',
  observacoes: '',

  nome: "",
  periodo: 0,
  mesRef: ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"][new Date().getMonth()],
  anoRef: new Date().getFullYear(),
  tipoCalculo: 'comum',
  cargo: 'tec',
  padrao: 'C13',
  funcao: '0',
  vencimento: 0,
  gaj: 0,
  vpni_lei: 0,
  vpni_decisao: 0,
  ats: 0,
  recebeAbono: false,
  abonoPermanencia: 0,
  abonoPerm13: 0,
  gratEspecificaTipo: '0',
  gratEspecificaValor: 0,
  incidirPSSGrat: true,

  aqTituloPerc: 0,
  aqTreinoPerc: 0,
  aqTituloVR: 0,
  aqTreinoVR: 0,
  aqTituloValor: 0,
  aqTreinoValor: 0,

  heBase: 0,
  manualBaseHE: false,
  heQtd50: 0,
  heQtd100: 0,
  heVal50: 0,
  heVal100: 0,
  heTotal: 0,
  heIsEA: false,

  substDias: {
    'fc1': 0, 'fc2': 0, 'fc3': 0, 'fc4': 0, 'fc5': 0, 'fc6': 0,
    'cj1': 0, 'cj2': 0, 'cj3': 0, 'cj4': 0
  },
  substTotal: 0,
  substIsEA: false,

  licencaDias: 0,
  baseLicenca: 'auto',
  incluirAbonoLicenca: true,
  licencaValor: 0,

  auxAlimentacao: 1784.42,
  auxPreEscolarQtd: 0,
  cotaPreEscolar: 1235.77,
  auxPreEscolarValor: 0,
  auxTransporteGasto: 0,
  auxTransporteValor: 0,
  auxTransporteDesc: 0,

  tabelaPSS: '2026',
  tabelaIR: '2025_maio',
  dependentes: 0,
  regimePrev: 'antigo',
  funprespAliq: 0,
  funprespFacul: 0,

  pssSobreFC: false,
  pssSobreAQTreino: false,

  emprestimos: 0,
  planoSaude: 0,
  pensao: 0,

  ferias1: 0,
  ferias1_3: 0,
  feriasDesc: 0,
  manualFerias: false,
  feriasAntecipadas: false,
  ir13: 0,
  pss13: 0,
  gratNatalinaTotal: 0,

  adiant13Venc: 0,
  adiant13FC: 0,
  manualAdiant13: false,

  manualDecimoTerceiroNov: false,
  decimoTerceiroNovVenc: 0,
  decimoTerceiroNovFC: 0,

  integral13: 0,

  pssMensal: 0,
  irMensal: 0,
  irEA: 0,
  irFerias: 0,
  valFunpresp: 0,
  totalBruto: 0,
  totalDescontos: 0,
  liquido: 0,

  diariasQtd: 0,
  diariasMeiaQtd: 0,
  diariasEmbarque: 'nenhum',
  diariasMotivo: '',
  diariasDescontarAlimentacao: true,
  diariasDescontarTransporte: true,
  diariasValorTotal: 0,
  diariasBruto: 0,
  diariasDescAlim: 0,
  diariasDescTransp: 0,
  diariasExtHospedagem: false,
  diariasExtAlimentacao: false,
  diariasExtTransporte: false
};