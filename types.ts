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
  auxPreEscolarValor: number;
  auxTransporteGasto: number;
  auxTransporteValor: number; // Credit
  auxTransporteDesc: number; // Debit

  // Discounts
  tabelaPSS: '2025' | '2024';
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
  ferias1_3: number;
  manualFerias: boolean; // Checkbox to not auto-calc/zero vacation
  feriasAntecipadas: boolean;

  // 13th Breakdown (Manual Calculation Support)
  adiant13Venc: number; // Adiantamento Ativo EC (Base)
  adiant13FC: number;   // Adiantamento FC/CJ (Função)
  manualAdiant13: boolean; // Checkbox to not auto-calc 13th
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
}

export const INITIAL_STATE: CalculatorState = {
  rubricasExtras: [],
  dadosBancarios: { banco: '', agencia: '', conta: '' },
  lotacao: 'Xa AUD Xa CJM',
  observacoes: '',

  nome: "",
  periodo: 0,
  mesRef: "MARÇO",
  anoRef: 2025,
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
  auxPreEscolarValor: 0,
  auxTransporteGasto: 0,
  auxTransporteValor: 0,
  auxTransporteDesc: 0,

  tabelaPSS: '2025',
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

  ferias1_3: 0,
  manualFerias: false,
  feriasAntecipadas: false,

  adiant13Venc: 0,
  adiant13FC: 0,
  manualAdiant13: false,
  integral13: 0,

  pssMensal: 0,
  irMensal: 0,
  irEA: 0,
  irFerias: 0,
  valFunpresp: 0,
  totalBruto: 0,
  totalDescontos: 0,
  liquido: 0
};