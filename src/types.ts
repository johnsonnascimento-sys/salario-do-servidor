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

export interface IRBracket {
  min: number;
  max: number;
  rate: number;
  deduction: number;
}

export interface DailiesConfig {
  rates: Record<string, number>;
  embarkationAdditional: {
    completo: number;
    metade: number;
  };
  derivedFromMinister?: {
    enabled: boolean;
    ministerPerDiem: number;
    ratesPercentages: Record<string, number>;
    embarkationPercentageFull: number;
    embarkationPercentageHalf?: number;
  };
  externalGloss: {
    hospedagem: number;
    alimentacao: number;
    transporte: number;
  };
  ldoCap?: {
    enabled: boolean;
    perDiemLimit: number;
  };
  discountRules?: {
    foodDivisor: number;
    transportDivisor: number;
    excludeWeekendsAndHolidays: boolean;
    holidays: string[];
    halfDailyOnBusinessReturnDay?: boolean;
    halfDiscountOnBusinessReturnDay?: boolean;
    holidayCalendarLabel?: string;
    holidayCalendarReference?: string;
    holidayCalendarVersion?: string;
  };
}

export interface PayrollRulesConfig {
  gajRate: number;
  specificGratificationRate: number;
  vrRateOnCj1: number;
  monthDayDivisor: number;
  overtimeMonthHours: number;
  transportWorkdays: number;
  transportDiscountRate: number;
  irrfTopRate: number;
}

export interface CareerCatalogConfig {
  noFunctionCode: string;
  noFunctionLabel: string;
  cargoLabels: Record<string, string>;
}

export interface CourtConfig {
  adjustment_schedule?: Array<{ period: number; percentage: number; label?: string; date?: string }>;
  bases: {
    salario: SalaryTable;
    funcoes: FuncoesTable;
  };
  historico_pss: Record<string, TaxTable>;
  historico_ir: Record<string, number>;
  historico_ir_brackets: Record<string, IRBracket[]>;
  values: {
    food_allowance?: number;
    pre_school?: number;
    deducao_dep?: number;
    cj1_integral_base?: number;
    adjustment_schedule?: Array<{ period: number; percentage: number; label?: string; date?: string }>;
    reajustes?: Array<{ period: number; percentage: number; label?: string; date?: string }>;
  };
  menus?: {
    food_allowance?: Array<{ label: string; value: number }>;
    preschool_allowance?: Array<{ label: string; value: number }>;
  };
  dailies?: DailiesConfig;
  payrollRules?: PayrollRulesConfig;
  careerCatalog?: CareerCatalogConfig;
}

export interface Rubrica {
  id: string;
  descricao: string;
  valor: number;
  tipo: 'C' | 'D';
  incideIR: boolean;
  incidePSS: boolean;
  isEA: boolean;
  pssCompetenciaSeparada: boolean;
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
  cargo: string;
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
  hePssIsEA: boolean;

  // Substitution (New Grid System)
  substDias: Record<string, number>; // Map like { 'fc1': 0, 'cj2': 5 }
  substTotal: number;
  substIsEA: boolean;
  substPssIsEA: boolean;

  // License & Aids
  licencaDias: number;
  baseLicenca: string; // 'auto', 'cj4', 'cj3'...
  incluirAbonoLicenca: boolean;
  licencaValor: number;

  auxAlimentacao: number;
  auxAlimentacaoProporcional: boolean;
  auxAlimentacaoDetalhe: string;
  auxPreEscolarQtd: number;
  cotaPreEscolar: number;
  auxPreEscolarValor: number;
  auxTransporteGasto: number;
  auxTransporteValor: number; // Credit
  auxTransporteDesc: number; // Debit

  // Discounts
  tabelaPSS: string;
  tabelaIR: string;
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
  feriasDescManual: boolean;
  manualFerias: boolean; // Checkbox to not auto-calc/zero vacation
  feriasAntecipadas: boolean;
  ir13?: number;
  pss13?: number;
  gratNatalinaTotal?: number;

  // 13th Breakdown (Manual Calculation Support)
  adiant13Venc: number; // Adiantamento Ativo EC (Base) - Used for JAN/JUN logic
  adiant13FC: number;   // Adiantamento FC/CJ (Funcao) - Used for JAN/JUN logic
  segunda13Venc: number; // Segunda parcela do 13o (Base)
  segunda13FC: number;   // Segunda parcela do 13o (FC/CJ)
  manualAdiant13: boolean; // Checkbox to not auto-calc 13th (JAN/JUN)

  // Specific for November Override (Debit Correction)
  manualDecimoTerceiroNov: boolean;
  decimoTerceiroNovVenc: number;
  decimoTerceiroNovFC: number;

  integral13: number;   // Calculated automatically for Nov

  // Computed Results
  pssMensal: number;
  pssEA: number;
  irMensal: number;
  irEA: number;
  aqIr: number;
  aqPss: number;
  gratIr: number;
  gratPss: number;
  vantagensIr: number;
  vantagensPss: number;
  abonoIr: number;
  heIr: number;
  hePss: number;
  substIr: number;
  substPss: number;
  irFerias: number;
  valFunpresp: number;
  totalBruto: number;
  totalDescontos: number;
  liquido: number;

  // Diarias
  diariasQtd: number;
  diariasMeiaQtd: number;
  diariasEmbarque: 'nenhum' | 'metade' | 'completo';
  diariasModoDesconto: 'periodo' | 'manual';
  diariasDataInicio: string;
  diariasDataFim: string;
  diariasDiasDescontoAlimentacao: number;
  diariasDiasDescontoTransporte: number;
  diariasDiasDescontoAlimentacaoCalc: number;
  diariasDiasDescontoTransporteCalc: number;
  diariasMotivo: string;
  diariasDescontarAlimentacao: boolean;
  diariasDescontarTransporte: boolean;
  diariasValorTotal: number;
  diariasBruto: number;
  diariasGlosa: number;
  diariasCorteLdo: number;
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
  cargo: '',
  padrao: '',
  funcao: '',
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
  hePssIsEA: false,

  substDias: {},
  substTotal: 0,
  substIsEA: false,
  substPssIsEA: false,

  licencaDias: 0,
  baseLicenca: 'auto',
  incluirAbonoLicenca: true,
  licencaValor: 0,

  auxAlimentacao: 0,
  auxAlimentacaoProporcional: false,
  auxAlimentacaoDetalhe: '',
  auxPreEscolarQtd: 0,
  cotaPreEscolar: 0,
  auxPreEscolarValor: 0,
  auxTransporteGasto: 0,
  auxTransporteValor: 0,
  auxTransporteDesc: 0,

  tabelaPSS: '',
  tabelaIR: '',
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
  feriasDescManual: false,
  manualFerias: false,
  feriasAntecipadas: false,
  ir13: 0,
  pss13: 0,
  gratNatalinaTotal: 0,

  adiant13Venc: 0,
  adiant13FC: 0,
  segunda13Venc: 0,
  segunda13FC: 0,
  manualAdiant13: false,

  manualDecimoTerceiroNov: false,
  decimoTerceiroNovVenc: 0,
  decimoTerceiroNovFC: 0,

  integral13: 0,

  pssMensal: 0,
  pssEA: 0,
  irMensal: 0,
  irEA: 0,
  aqIr: 0,
  aqPss: 0,
  gratIr: 0,
  gratPss: 0,
  vantagensIr: 0,
  vantagensPss: 0,
  abonoIr: 0,
  heIr: 0,
  hePss: 0,
  substIr: 0,
  substPss: 0,
  irFerias: 0,
  valFunpresp: 0,
  totalBruto: 0,
  totalDescontos: 0,
  liquido: 0,

  diariasQtd: 0,
  diariasMeiaQtd: 0,
  diariasEmbarque: 'nenhum',
  diariasModoDesconto: 'manual',
  diariasDataInicio: '',
  diariasDataFim: '',
  diariasDiasDescontoAlimentacao: 0,
  diariasDiasDescontoTransporte: 0,
  diariasDiasDescontoAlimentacaoCalc: 0,
  diariasDiasDescontoTransporteCalc: 0,
  diariasMotivo: '',
  diariasDescontarAlimentacao: true,
  diariasDescontarTransporte: true,
  diariasValorTotal: 0,
  diariasBruto: 0,
  diariasGlosa: 0,
  diariasCorteLdo: 0,
  diariasDescAlim: 0,
  diariasDescTransp: 0,
  diariasExtHospedagem: false,
  diariasExtAlimentacao: false,
  diariasExtTransporte: false
};

