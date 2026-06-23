import { CalculatorState } from '../types';

export interface PayslipDisplayRow {
  label: string;
  value: number;
  type: 'C' | 'D';
  details?: Array<{ label: string; value: number; type: 'C' | 'D' }>;
}

interface RowLike {
  label: string;
  value: number;
  type: 'C' | 'D';
}

const IR_GROUPS = [
  {
    detailPrefix: 'IMPOSTO DE RENDA-EC (',
    totalLabel: 'IMPOSTO DE RENDA-EC (EXERCÍCIO CORRENTE)',
  },
  {
    detailPrefix: 'IMPOSTO DE RENDA-EA (',
    totalLabel: 'IMPOSTO DE RENDA-EA (EXERCÍCIO ANTERIOR)',
  },
] as const;

const PSS_TOTAL_LABEL = 'CONTRIBUIÇÃO RPPS (PSS)';
const PSS_13_TOTAL_LABEL = 'CONTRIBUIÇÃO RPPS-GN(13º) ATIVO EC';

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

const buildPssDetails = (
  state?: Pick<CalculatorState, 'pssMensal' | 'aqPss' | 'gratPss' | 'vantagensPss'>
): Array<{ label: string; value: number; type: 'D' }> => {
  if (!state || Number(state.pssMensal || 0) <= 0) {
    return [];
  }

  const details: Array<{ label: string; value: number; type: 'D' }> = [];
  const componentRows: Array<{ label: string; value: number }> = [
    { label: 'AQ TÍTULOS', value: roundCurrency(Math.max(0, Number(state.aqPss || 0))) },
    { label: 'GRATIFICAÇÃO ESPECÍFICA', value: roundCurrency(Math.max(0, Number(state.gratPss || 0))) },
    { label: 'VANTAGENS (VPNI/ATS)', value: roundCurrency(Math.max(0, Number(state.vantagensPss || 0))) },
  ];

  componentRows.forEach((item) => {
    if (item.value > 0) {
      details.push({ label: item.label, value: item.value, type: 'D' });
    }
  });

  const subtotal = roundCurrency(details.reduce((sum, item) => sum + item.value, 0));
  const remainder = roundCurrency(Math.max(0, Number(state.pssMensal || 0) - subtotal));
  if (remainder > 0) {
    details.push({ label: 'OUTRAS RUBRICAS BASE PSS', value: remainder, type: 'D' });
  }

  return details;
};

const buildThirteenthPssDetails = (
  state?: Pick<CalculatorState, 'pss13' | 'adiant13Venc' | 'adiant13FC' | 'segunda13Venc' | 'segunda13FC'>
): Array<{ label: string; value: number; type: 'D' }> => {
  if (!state || Number(state.pss13 || 0) <= 0) {
    return [];
  }

  const pss13 = roundCurrency(Math.max(0, Number(state.pss13 || 0)));
  const segundaVenc = roundCurrency(Math.max(0, Number(state.segunda13Venc || 0)));
  const segundaFC = roundCurrency(Math.max(0, Number(state.segunda13FC || 0)));
  const baseTotal = roundCurrency(segundaVenc + segundaFC);

  if (baseTotal <= 0) {
    return [{ label: 'PSS DA GRATIFICAÇÃO NATALINA - 2ª PARCELA', value: pss13, type: 'D' }];
  }

  const vencShare = roundCurrency(pss13 * (segundaVenc / baseTotal));
  const fcShare = roundCurrency(Math.max(0, pss13 - vencShare));
  const details: Array<{ label: string; value: number; type: 'D' }> = [];

  if (vencShare > 0) {
    details.push({ label: 'PSS DA GRATIFICAÇÃO NATALINA - 2ª PARCELA - VENCIMENTO/ATIVO EC', value: vencShare, type: 'D' });
  }

  if (fcShare > 0) {
    details.push({ label: 'PSS DA GRATIFICAÇÃO NATALINA - 2ª PARCELA - FC/CJ', value: fcShare, type: 'D' });
  }

  return details.length > 0
    ? details
    : [{ label: 'PSS DA GRATIFICAÇÃO NATALINA - 2ª PARCELA', value: pss13, type: 'D' }];
};

export const groupPayslipRowsForDisplay = <T extends RowLike>(
  rows: T[],
  calculatorState?: Pick<
    CalculatorState,
    'pssMensal' | 'aqPss' | 'gratPss' | 'vantagensPss' | 'pss13' | 'adiant13Venc' | 'adiant13FC' | 'segunda13Venc' | 'segunda13FC'
  >
): PayslipDisplayRow[] => {
  const groupedRowsByIndex = new Map<number, PayslipDisplayRow>();
  const consumedIndexes = new Set<number>();

  IR_GROUPS.forEach((group) => {
    const details = rows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => row.type === 'D' && row.label.startsWith(group.detailPrefix));

    if (details.length === 0) {
      return;
    }

    details.forEach(({ index }) => consumedIndexes.add(index));
    groupedRowsByIndex.set(details[0].index, {
      label: group.totalLabel,
      value: details.reduce((sum, { row }) => sum + Number(row.value || 0), 0),
      type: 'D',
      details: details.map(({ row }) => ({
        label: row.label,
        value: Number(row.value || 0),
        type: row.type,
      })),
    });
  });

  const pssParent = rows
    .map((row, index) => ({ row, index }))
    .find(({ row }) => row.type === 'D' && row.label === PSS_TOTAL_LABEL);

  if (pssParent) {
    const pssDetails = buildPssDetails(calculatorState);
    if (pssDetails.length > 0) {
      groupedRowsByIndex.set(pssParent.index, {
        label: PSS_TOTAL_LABEL,
        value: Number(pssParent.row.value || 0),
        type: 'D',
        details: pssDetails,
      });
    }
  }

  const pss13Parent = rows
    .map((row, index) => ({ row, index }))
    .find(({ row }) => row.type === 'D' && row.label === PSS_13_TOTAL_LABEL);

  if (pss13Parent) {
    const pss13Details = buildThirteenthPssDetails(calculatorState);
    if (pss13Details.length > 0) {
      groupedRowsByIndex.set(pss13Parent.index, {
        label: PSS_13_TOTAL_LABEL,
        value: Number(pss13Parent.row.value || 0),
        type: 'D',
        details: pss13Details,
      });
    }
  }

  return rows.reduce<PayslipDisplayRow[]>((acc, row, index) => {
    const groupedRow = groupedRowsByIndex.get(index);
    if (groupedRow) {
      acc.push(groupedRow);
      return acc;
    }

    if (!consumedIndexes.has(index)) {
      acc.push({
        label: row.label,
        value: Number(row.value || 0),
        type: row.type,
      });
    }

    return acc;
  }, []);
};
