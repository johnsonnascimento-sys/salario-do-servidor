import { SalaryTable, FuncoesTable, TaxTable } from './types';

export const BASES_2025: { salario: SalaryTable; funcoes: FuncoesTable } = {
  salario: {
    'analista': { 'C13': 9292.14, 'C12': 9021.50, 'C11': 8758.73, 'B10': 8503.62, 'B9': 8255.95, 'B8': 7810.73, 'B7': 7583.23, 'B6': 7362.37, 'A5': 7147.92, 'A4': 6939.75, 'A3': 6565.50, 'A2': 6374.26, 'A1': 6188.61 },
    'tec': { 'C13': 5663.47, 'C12': 5498.51, 'C11': 5338.36, 'B10': 5182.88, 'B9': 5031.90, 'B8': 4760.56, 'B7': 4621.90, 'B6': 4487.29, 'A5': 4356.59, 'A4': 4229.69, 'A3': 4001.60, 'A2': 3885.06, 'A1': 3771.88 }
  },
  funcoes: {
    'fc1': 1215.34, 'fc2': 1413.14, 'fc3': 1644.51, 'fc4': 2313.27, 'fc5': 2662.06, 'fc6': 3663.71,
    'cj1': 7143.98, 'cj2': 8822.98, 'cj3': 10029.94, 'cj4': 11322.60
  }
};

// CJ1 Integral Base for calculating VR dynamically (Lei 15.292/2025)
// VR = CJ1_INTEGRAL_BASE * 0.065
export const CJ1_INTEGRAL_BASE = 10990.74;

// Multiplicadores do Novo AQ (Lei 15.292/2025)
// VR = CJ1_INTEGRAL_BASE * 0.065 = R$ 714,39
export const AQ_MULTIPLIERS = {
  // Títulos (com regra de absorção - pega o maior)
  DOUTORADO: 5.0,      // 5.0 x VR = R$ 3.571,95
  MESTRADO: 3.5,       // 3.5 x VR = R$ 2.500,37
  ESPECIALIZACAO: 1.0, // 1.0 x VR = R$ 714,39
  NENHUM: 0,

  // Treinamento (acumulável, não absorvido)
  TREINAMENTO_120H: 0.2,  // 0.2 x VR = R$ 142,88
  TREINAMENTO_240H: 0.4,  // 0.4 x VR = R$ 285,76
  TREINAMENTO_360H: 0.6,  // 0.6 x VR = R$ 428,63
};

export const HISTORICO_PSS: Record<string, TaxTable> = {
  '2026': {
    teto_rgps: 8475.55,
    faixas: [
      { min: 0.00, max: 1621.00, rate: 0.075 },
      { min: 1621.01, max: 2902.84, rate: 0.090 },
      { min: 2902.85, max: 4354.27, rate: 0.120 },
      { min: 4354.28, max: 8475.55, rate: 0.140 },
      { min: 8475.56, max: 14514.30, rate: 0.145 },
      { min: 14514.31, max: 29028.58, rate: 0.165 },
      { min: 29028.59, max: 56605.73, rate: 0.190 },
      { min: 56605.74, max: Infinity, rate: 0.220 }
    ]
  },
  '2025': {
    teto_rgps: 8157.41,
    faixas: [
      { min: 0.00, max: 1518.00, rate: 0.075 },
      { min: 1518.01, max: 2793.88, rate: 0.090 },
      { min: 2793.89, max: 4190.83, rate: 0.120 },
      { min: 4190.84, max: 8157.41, rate: 0.140 },
      { min: 8157.42, max: 13969.49, rate: 0.145 },
      { min: 13969.50, max: 27938.96, rate: 0.165 },
      { min: 27938.97, max: 54480.97, rate: 0.190 },
      { min: 54480.98, max: Infinity, rate: 0.220 }
    ]
  },
  '2024': {
    teto_rgps: 7786.02,
    faixas: [
      { min: 0.00, max: 1412.00, rate: 0.075 },
      { min: 1412.01, max: 2666.68, rate: 0.090 },
      { min: 2666.69, max: 4000.03, rate: 0.120 },
      { min: 4000.04, max: 7786.02, rate: 0.140 },
      { min: 7786.03, max: 13333.48, rate: 0.145 },
      { min: 13333.49, max: 26666.94, rate: 0.165 },
      { min: 26666.95, max: 52000.54, rate: 0.190 },
      { min: 52000.55, max: Infinity, rate: 0.220 }
    ]
  }
};

export const HISTORICO_IR: Record<string, number> = {
  '2025_maio': 908.73,
  '2024_fev': 896.00
};

export const COTA_PRE_ESCOLAR = 1235.77;
export const DEDUCAO_DEP = 189.59;