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
    isEa: false,
  },
  {
    detailPrefix: 'IMPOSTO DE RENDA-EA (',
    totalLabel: 'IMPOSTO DE RENDA-EA (EXERCÍCIO ANTERIOR)',
    isEa: true,
  },
] as const;

const PSS_TOTAL_LABEL = 'CONTRIBUIÇÃO RPPS (PSS)';
const PSS_EA_TOTAL_LABEL = 'CONTRIBUIÇÃO RPPS-EA';
const PSS_13_TOTAL_LABEL = 'CONTRIBUIÇÃO RPPS-GN(13º) ATIVO EC';

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

const toRow = (label: string, value: number): { label: string; value: number; type: 'D' } | null => {
  const rounded = roundCurrency(Math.max(0, Number(value || 0)));
  return rounded > 0 ? { label, value: rounded, type: 'D' } : null;
};

const rubricaLabel = (rubrica: Rubrica, fallbackIndex: number) => {
  const descricao = (rubrica.descricao || '').trim();
  return (descricao || `RUBRICA MANUAL ${fallbackIndex + 1}`).toUpperCase();
};

const buildPssDetails = (
  state?: Pick<
    CalculatorState,
    'periodo' | 'aqTituloValor' | 'gratEspecificaValor' | 'vpni_lei' | 'vpni_decisao' | 'ats' | 'rubricasExtras'
  >
): Array<{ label: string; value: number; type: 'D' }> => {
  if (!state) return [];

  const rows = [
    toRow(
      state.periodo >= 1
        ? 'ADICIONAL DE QUALIFICAÇÃO 1X VR (JANEIRO A JUNHO)'
        : 'AQ TÍTULOS',
      state.aqTituloValor
    ),
    toRow('GRATIFICAÇÃO ESPECÍFICA', state.gratEspecificaValor),
    toRow('VANTAGENS (VPNI/ATS)', Number(state.vpni_lei || 0) + Number(state.vpni_decisao || 0) + Number(state.ats || 0)),
    ...(state.rubricasExtras || [])
      .filter((rubrica) => rubrica.incidePSS && !rubrica.pssCompetenciaSeparada && !rubrica.isEA)
      .map((rubrica, index) => toRow(rubricaLabel(rubrica, index), rubrica.valor))
      .filter((row): row is NonNullable<typeof row> => Boolean(row)),
  ];

  return rows.filter((row): row is NonNullable<typeof row> => Boolean(row));
};

const buildIrrfDetails = (
  state?: Pick<
    CalculatorState,
    | 'periodo'
    | 'aqTituloValor'
    | 'aqTreinoValor'
    | 'gratEspecificaValor'
    | 'vpni_lei'
    | 'vpni_decisao'
    | 'ats'
    | 'abonoPermanencia'
    | 'heTotal'
    | 'substTotal'
    | 'rubricasExtras'
  >,
  isEa = false
): Array<{ label: string; value: number; type: 'D' }> => {
  if (!state) return [];

  const rows = isEa
    ? [
        toRow('HORA EXTRA (IR EA)', state.heTotal),
        toRow('SUBSTITUIÇÃO (IR EA)', state.substTotal),
        ...(state.rubricasExtras || [])
          .filter((rubrica) => rubrica.incideIR && rubrica.isEA)
          .map((rubrica, index) => toRow(rubricaLabel(rubrica, index), rubrica.valor))
          .filter((row): row is NonNullable<typeof row> => Boolean(row)),
      ]
    : [
        toRow(
          state.periodo >= 1
            ? 'ADICIONAL DE QUALIFICAÇÃO 1X VR (JANEIRO A JUNHO)'
            : 'AQ TÍTULOS',
          state.aqTituloValor
        ),
        toRow('AQ TREINAMENTO', state.aqTreinoValor),
        toRow('GRATIFICAÇÃO ESPECÍFICA', state.gratEspecificaValor),
        toRow('VANTAGENS (VPNI/ATS)', Number(state.vpni_lei || 0) + Number(state.vpni_decisao || 0) + Number(state.ats || 0)),
        toRow('ABONO DE PERMANÊNCIA', state.abonoPermanencia),
        toRow('HORA EXTRA', state.heTotal),
        toRow('SUBSTITUIÇÃO', state.substTotal),
        ...(state.rubricasExtras || [])
          .filter((rubrica) => rubrica.incideIR && !rubrica.isEA)
          .map((rubrica, index) => toRow(rubricaLabel(rubrica, index), rubrica.valor))
          .filter((row): row is NonNullable<typeof row> => Boolean(row)),
      ];

  return rows.filter((row): row is NonNullable<typeof row> => Boolean(row));
};

const buildPssEaDetails = (
  state?: Pick<CalculatorState, 'pssEA' | 'rubricasExtras'>
): Array<{ label: string; value: number; type: 'D' }> => {
  if (!state || Number(state.pssEA || 0) <= 0) return [];

  const rows = [
    ...(state.rubricasExtras || [])
      .filter((rubrica) => rubrica.pssCompetenciaSeparada && Number(rubrica.valor) > 0)
      .map((rubrica, index) => toRow(rubricaLabel(rubrica, index), rubrica.valor))
      .filter((row): row is NonNullable<typeof row> => Boolean(row)),
  ];

  return rows;
};

const buildThirteenthPssDetails = (
  state?: Pick<CalculatorState, 'pss13' | 'adiant13Venc' | 'adiant13FC' | 'segunda13Venc' | 'segunda13FC' | 'rubricasExtras'>
): Array<{ label: string; value: number; type: 'D' }> => {
  if (!state || Number(state.pss13 || 0) <= 0) return [];

  const rows = [
    toRow('PSS DA GRATIFICAÇÃO NATALINA - 1ª PARCELA - VENCIMENTO/ATIVO EC', state.adiant13Venc),
    toRow('PSS DA GRATIFICAÇÃO NATALINA - 1ª PARCELA - FC/CJ', state.adiant13FC),
    toRow('PSS DA GRATIFICAÇÃO NATALINA - 2ª PARCELA - VENCIMENTO/ATIVO EC', state.segunda13Venc),
    toRow('PSS DA GRATIFICAÇÃO NATALINA - 2ª PARCELA - FC/CJ', state.segunda13FC),
    ...(state.rubricasExtras || [])
      .filter((rubrica) => rubrica.pssCompetenciaSeparada && Number(rubrica.valor) > 0)
      .map((rubrica, index) => toRow(rubricaLabel(rubrica, index), rubrica.valor))
      .filter((row): row is NonNullable<typeof row> => Boolean(row)),
  ];

  return rows.filter((row): row is NonNullable<typeof row> => Boolean(row));
};

export const groupPayslipRowsForDisplay = <T extends RowLike>(
  rows: T[],
  calculatorState?: Pick<
    CalculatorState,
    | 'periodo'
    | 'aqTituloValor'
    | 'aqTreinoValor'
    | 'gratEspecificaValor'
    | 'vpni_lei'
    | 'vpni_decisao'
    | 'ats'
    | 'abonoPermanencia'
    | 'heTotal'
    | 'substTotal'
    | 'pssMensal'
    | 'pssEA'
    | 'pss13'
    | 'adiant13Venc'
    | 'adiant13FC'
    | 'segunda13Venc'
    | 'segunda13FC'
    | 'rubricasExtras'
  >
): PayslipDisplayRow[] => {
  const groupedRowsByIndex = new Map<number, PayslipDisplayRow>();
  const consumedIndexes = new Set<number>();

  IR_GROUPS.forEach((group) => {
    const detailRows = rows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => row.type === 'D' && row.label.startsWith(group.detailPrefix));

    if (detailRows.length === 0) return;

    detailRows.forEach(({ index }) => consumedIndexes.add(index));

    groupedRowsByIndex.set(detailRows[0].index, {
      label: group.totalLabel,
      value: detailRows.reduce((sum, { row }) => sum + Number(row.value || 0), 0),
      type: 'D',
      details: buildIrrfDetails(calculatorState, group.isEa),
    });
  });

  const pssParent = rows.find((row) => row.type === 'D' && row.label === PSS_TOTAL_LABEL);
  if (pssParent) {
    const pssDetails = buildPssDetails(calculatorState);
    if (pssDetails.length > 0) {
      const index = rows.findIndex((row) => row.type === 'D' && row.label === PSS_TOTAL_LABEL);
      groupedRowsByIndex.set(index, {
        label: PSS_TOTAL_LABEL,
        value: Number(pssParent.value || 0),
        type: 'D',
        details: pssDetails,
      });
    }
  }

  const pssEaParent = rows.find((row) => row.type === 'D' && row.label === PSS_EA_TOTAL_LABEL);
  if (pssEaParent) {
    const pssEaDetails = buildPssEaDetails(calculatorState);
    if (pssEaDetails.length > 0) {
      const index = rows.findIndex((row) => row.type === 'D' && row.label === PSS_EA_TOTAL_LABEL);
      groupedRowsByIndex.set(index, {
        label: PSS_EA_TOTAL_LABEL,
        value: Number(pssEaParent.value || 0),
        type: 'D',
        details: pssEaDetails,
      });
    }
  }

  const pss13Parent = rows.find((row) => row.type === 'D' && row.label === PSS_13_TOTAL_LABEL);
  if (pss13Parent) {
    const pss13Details = buildThirteenthPssDetails(calculatorState);
    if (pss13Details.length > 0) {
      const index = rows.findIndex((row) => row.type === 'D' && row.label === PSS_13_TOTAL_LABEL);
      groupedRowsByIndex.set(index, {
        label: PSS_13_TOTAL_LABEL,
        value: Number(pss13Parent.value || 0),
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
