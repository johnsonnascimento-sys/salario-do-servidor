import { CalculatorState, Rubrica } from '../types';

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
const PSS_EA_TOTAL_LABEL = 'CONTRIBUIÇÃO RPPS-EA';
const PSS_13_TOTAL_LABEL = 'CONTRIBUIÇÃO RPPS-GN(13º) ATIVO EC';

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

const allocateProportionally = (
  total: number,
  items: Array<{ label: string; weight: number }>
): Array<{ label: string; value: number; type: 'D' }> => {
  const normalizedItems = items
    .map((item) => ({ label: item.label, weight: Math.max(0, Number(item.weight || 0)) }))
    .filter((item) => item.weight > 0);

  if (total <= 0 || normalizedItems.length === 0) {
    return [];
  }

  const totalWeight = normalizedItems.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight <= 0) {
    return [];
  }

  let allocated = 0;
  return normalizedItems.map((item, index) => {
    const isLast = index === normalizedItems.length - 1;
    const value = isLast
      ? roundCurrency(Math.max(0, total - allocated))
      : roundCurrency(total * (item.weight / totalWeight));
    allocated += value;
    return { label: item.label, value, type: 'D' as const };
  }).filter((item) => item.value > 0);
};

const normalizeRubricaLabel = (rubrica: Rubrica, fallbackIndex: number) => {
  const descricao = (rubrica.descricao || '').trim();
  return descricao ? descricao.toUpperCase() : `RUBRICA MANUAL ${fallbackIndex + 1}`;
};

const buildPssDetails = (
  state?: Pick<
    CalculatorState,
    'pssMensal' | 'aqPss' | 'gratPss' | 'vantagensPss' | 'rubricasExtras'
  >
): Array<{ label: string; value: number; type: 'D' }> => {
  if (!state || Number(state.pssMensal || 0) <= 0) {
    return [];
  }

  const componentRows: Array<{ label: string; value: number }> = [
    { label: 'AQ TÍTULOS', value: roundCurrency(Math.max(0, Number(state.aqPss || 0))) },
    { label: 'GRATIFICAÇÃO ESPECÍFICA', value: roundCurrency(Math.max(0, Number(state.gratPss || 0))) },
    { label: 'VANTAGENS (VPNI/ATS)', value: roundCurrency(Math.max(0, Number(state.vantagensPss || 0))) },
  ];

  const subtotal = roundCurrency(componentRows.reduce((sum, item) => sum + item.value, 0));
  const remaining = roundCurrency(Math.max(0, Number(state.pssMensal || 0) - subtotal));
  const manualRubricas = (state.rubricasExtras || [])
    .filter((rubrica) => rubrica.incidePSS && !rubrica.pssCompetenciaSeparada && !rubrica.isEA && Number(rubrica.valor) > 0)
    .map((rubrica, index) => ({
      label: normalizeRubricaLabel(rubrica, index),
      weight: Number(rubrica.valor || 0),
    }));

  const manualDetails = allocateProportionally(remaining, manualRubricas);

  return [
    ...componentRows
      .filter((item) => item.value > 0)
      .map((item) => ({ label: item.label, value: item.value, type: 'D' as const })),
    ...manualDetails,
  ];
};

const buildPssEaDetails = (
  state?: Pick<
    CalculatorState,
    'pssEA' | 'hePss' | 'substPss' | 'rubricasExtras'
  >
): Array<{ label: string; value: number; type: 'D' }> => {
  if (!state || Number(state.pssEA || 0) <= 0) {
    return [];
  }

  const componentRows: Array<{ label: string; value: number }> = [
    { label: 'HORA EXTRA (PSS-EA)', value: roundCurrency(Math.max(0, Number(state.hePss || 0))) },
    { label: 'SUBSTITUIÇÃO (PSS-EA)', value: roundCurrency(Math.max(0, Number(state.substPss || 0))) },
  ];

  const subtotal = roundCurrency(componentRows.reduce((sum, item) => sum + item.value, 0));
  const remaining = roundCurrency(Math.max(0, Number(state.pssEA || 0) - subtotal));
  const manualRubricas = (state.rubricasExtras || [])
    .filter((rubrica) => rubrica.pssCompetenciaSeparada && Number(rubrica.valor) > 0)
    .map((rubrica, index) => ({
      label: normalizeRubricaLabel(rubrica, index),
      weight: Number(rubrica.valor || 0),
    }));

  const manualDetails = allocateProportionally(remaining, manualRubricas);

  return [
    ...componentRows
      .filter((item) => item.value > 0)
      .map((item) => ({ label: item.label, value: item.value, type: 'D' as const })),
    ...manualDetails,
  ];
};

const buildThirteenthPssDetails = (
  state?: Pick<CalculatorState, 'pss13' | 'segunda13Venc' | 'segunda13FC' | 'rubricasExtras'>
): Array<{ label: string; value: number; type: 'D' }> => {
  if (!state || Number(state.pss13 || 0) <= 0) {
    return [];
  }

  const pss13 = roundCurrency(Math.max(0, Number(state.pss13 || 0)));
  const segundaVenc = roundCurrency(Math.max(0, Number(state.segunda13Venc || 0)));
  const segundaFC = roundCurrency(Math.max(0, Number(state.segunda13FC || 0)));
  const baseTotal = roundCurrency(segundaVenc + segundaFC);
  const manualRubricas = (state.rubricasExtras || [])
    .filter((rubrica) => rubrica.pssCompetenciaSeparada && Number(rubrica.valor) > 0)
    .map((rubrica, index) => ({
      label: normalizeRubricaLabel(rubrica, index),
      weight: Number(rubrica.valor || 0),
    }));

  const fallbackDetails = baseTotal > 0
    ? allocateProportionally(pss13, [
        ...(segundaVenc > 0 ? [{ label: 'PSS DA GRATIFICAÇÃO NATALINA - 2ª PARCELA - VENCIMENTO/ATIVO EC', weight: segundaVenc }] : []),
        ...(segundaFC > 0 ? [{ label: 'PSS DA GRATIFICAÇÃO NATALINA - 2ª PARCELA - FC/CJ', weight: segundaFC }] : []),
      ])
    : [];

  const manualDetails = allocateProportionally(
    roundCurrency(Math.max(0, pss13 - fallbackDetails.reduce((sum, item) => sum + item.value, 0))),
    manualRubricas
  );

  return [
    ...fallbackDetails,
    ...manualDetails,
  ];
};

const buildIrrfDetails = (
  total: number,
  components: Array<{ label: string; value: number }>,
  manualRubricas: Array<{ label: string; weight: number }>
) => {
  const componentRows = components
    .filter((item) => item.value > 0)
    .map((item) => ({ label: item.label, value: roundCurrency(item.value), type: 'D' as const }));

  const subtotal = roundCurrency(componentRows.reduce((sum, item) => sum + item.value, 0));
  const remaining = roundCurrency(Math.max(0, total - subtotal));
  const manualDetails = allocateProportionally(remaining, manualRubricas);

  return [...componentRows, ...manualDetails];
};

export const groupPayslipRowsForDisplay = <T extends RowLike>(
  rows: T[],
  calculatorState?: Pick<
    CalculatorState,
    | 'pssMensal'
    | 'pssEA'
    | 'aqPss'
    | 'gratPss'
    | 'vantagensPss'
    | 'pss13'
    | 'segunda13Venc'
    | 'segunda13FC'
    | 'irMensal'
    | 'irEA'
    | 'aqIr'
    | 'gratIr'
    | 'vantagensIr'
    | 'abonoIr'
    | 'heIrMensal'
    | 'heIrEA'
    | 'substIrMensal'
    | 'substIrEA'
    | 'hePss'
    | 'substPss'
    | 'rubricasExtras'
  >
): PayslipDisplayRow[] => {
  const groupedRowsByIndex = new Map<number, PayslipDisplayRow>();
  const consumedIndexes = new Set<number>();

  IR_GROUPS.forEach((group) => {
    const detailRows = rows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => row.type === 'D' && row.label.startsWith(group.detailPrefix));

    if (detailRows.length === 0) {
      return;
    }

    detailRows.forEach(({ index }) => consumedIndexes.add(index));

    const isEaGroup = group.totalLabel.includes('EXERCÃCIO ANTERIOR');
    const detailRowsByGroup = isEaGroup
      ? buildIrrfDetails(
          Number(calculatorState?.irEA || 0),
          [
            { label: 'HORA EXTRA (IR-EA)', value: Number(calculatorState?.heIrEA || 0) },
            { label: 'SUBSTITUIÇÃO (IR-EA)', value: Number(calculatorState?.substIrEA || 0) },
          ],
          (calculatorState?.rubricasExtras || [])
            .filter((rubrica) => rubrica.isEA && rubrica.incideIR && Number(rubrica.valor) > 0)
            .map((rubrica, index) => ({
              label: normalizeRubricaLabel(rubrica, index),
              weight: Number(rubrica.valor || 0),
            }))
        )
      : buildIrrfDetails(
          Number(calculatorState?.irMensal || 0),
          [
            { label: 'AQ TÍTULOS (IR)', value: Number(calculatorState?.aqIr || 0) },
            { label: 'GRATIFICAÇÃO ESPECÍFICA (IR)', value: Number(calculatorState?.gratIr || 0) },
            { label: 'VANTAGENS (VPNI/ATS) (IR)', value: Number(calculatorState?.vantagensIr || 0) },
            { label: 'ABONO DE PERMANÊNCIA (IR)', value: Number(calculatorState?.abonoIr || 0) },
            { label: 'HORA EXTRA (IR)', value: Number(calculatorState?.heIrMensal || 0) },
            { label: 'SUBSTITUIÇÃO (IR)', value: Number(calculatorState?.substIrMensal || 0) },
          ],
          (calculatorState?.rubricasExtras || [])
            .filter((rubrica) => !rubrica.isEA && rubrica.incideIR && Number(rubrica.valor) > 0)
            .map((rubrica, index) => ({
              label: normalizeRubricaLabel(rubrica, index),
              weight: Number(rubrica.valor || 0),
            }))
        );

    groupedRowsByIndex.set(detailRows[0].index, {
      label: group.totalLabel,
      value: detailRows.reduce((sum, { row }) => sum + Number(row.value || 0), 0),
      type: 'D',
      details: detailRowsByGroup.length > 0
        ? detailRowsByGroup
        : detailRows.map(({ row }) => ({
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

  const pssEaParent = rows
    .map((row, index) => ({ row, index }))
    .find(({ row }) => row.type === 'D' && row.label === PSS_EA_TOTAL_LABEL);

  if (pssEaParent) {
    const pssEaDetails = buildPssEaDetails(calculatorState);
    if (pssEaDetails.length > 0) {
      groupedRowsByIndex.set(pssEaParent.index, {
        label: PSS_EA_TOTAL_LABEL,
        value: Number(pssEaParent.row.value || 0),
        type: 'D',
        details: pssEaDetails,
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
