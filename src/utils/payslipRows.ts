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

const normalizeLabel = (label: string) =>
  label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '');

const findCreditRow = (rows: RowLike[], predicate: (row: RowLike) => boolean) =>
  rows.find((row) => row.type === 'C' && Number(row.value || 0) > 0 && predicate(row));

const roundDetail = (value: number) => roundCurrency(Math.max(0, Number(value || 0)));

const allocateDetailRows = (
  total: number,
  items: Array<{ label: string; base: number }>
): Array<{ label: string; value: number; type: 'D' }> => {
  const mergedItems = items.reduce<Array<{ label: string; base: number; key: string }>>((acc, item) => {
    const base = roundDetail(item.base);
    if (base <= 0) {
      return acc;
    }

    const key = normalizeLabel(item.label);
    const existing = acc.find((entry) => entry.key === key);
    if (existing) {
      existing.base = roundDetail(existing.base + base);
      return acc;
    }

    acc.push({ label: item.label, base, key });
    return acc;
  }, []);

  const positiveItems = mergedItems;

  if (positiveItems.length === 0 || total <= 0) {
    return [];
  }

  const totalBase = positiveItems.reduce((sum, item) => sum + item.base, 0);
  if (totalBase <= 0) {
    return [];
  }

  let allocated = 0;

  return positiveItems
    .map((item, index) => {
      const isLast = index === positiveItems.length - 1;
      const value = isLast
        ? roundDetail(Math.max(0, total - allocated))
        : roundDetail(total * (item.base / totalBase));
      allocated += value;
      return toRow(item.label, value);
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));
};

const buildPssDetails = (
  rows: RowLike[],
  state?: Pick<
    CalculatorState,
    | 'periodo'
    | 'vencimento'
    | 'gaj'
    | 'aqTituloValor'
    | 'gratEspecificaValor'
    | 'vpni_lei'
    | 'vpni_decisao'
    | 'ats'
    | 'incidirPSSGrat'
    | 'rubricasExtras'
    | 'pssMensal'
  >
): Array<{ label: string; value: number; type: 'D' }> => {
  if (!state || Number(state.pssMensal || 0) <= 0) return [];

  const functionRow = findCreditRow(rows, (row) =>
    normalizeLabel(row.label).includes('FUNCAOCOMISSIONADA') ||
    normalizeLabel(row.label).includes('CARGOEMCOMISSAO')
  );

  const items = [
    { label: 'VENCIMENTO-ATIVO EC', base: state.vencimento || 0 },
    { label: 'GRAT. ATIV. JUD. (GAJ)', base: state.gaj || 0 },
    { label: 'FUNÇÃO COMISSIONADA / CARGO EM COMISSÃO', base: functionRow?.value || 0 },
    {
      label: state.periodo >= 1 ? 'ADICIONAL DE QUALIFICAÇÃO 1X VR (JANEIRO A JUNHO)' : 'AQ TÍTULOS',
      base: state.aqTituloValor || 0,
    },
    { label: 'GRATIFICAÇÃO ESPECÍFICA', base: state.incidirPSSGrat ? (state.gratEspecificaValor || 0) : 0 },
    { label: 'VPNI - LEI 9.527/97', base: state.vpni_lei || 0 },
    { label: 'VPNI - DECISÃO JUDICIAL', base: state.vpni_decisao || 0 },
    { label: 'ADICIONAL TEMPO DE SERVIÇO', base: state.ats || 0 },
    ...(state.rubricasExtras || [])
      .filter((rubrica) => rubrica.incidePSS && !rubrica.pssCompetenciaSeparada && !rubrica.isEA && Number(rubrica.valor) > 0 && rubrica.tipo !== 'D')
      .map((rubrica, index) => ({
        label: rubricaLabel(rubrica, index),
        base: rubrica.valor,
      })),
  ];

  return allocateDetailRows(state.pssMensal || 0, items);
};

const buildIrrfDetails = (
  rows: RowLike[],
  state?: Pick<
    CalculatorState,
    | 'periodo'
    | 'vencimento'
    | 'gaj'
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
    | 'irMensal'
    | 'irEA'
  >,
  isEa = false
): Array<{ label: string; value: number; type: 'D' }> => {
  if (!state) return [];

  const functionRow = findCreditRow(rows, (row) =>
    normalizeLabel(row.label).includes('FUNCAOCOMISSIONADA') ||
    normalizeLabel(row.label).includes('CARGOEMCOMISSAO')
  );
  const heMonthlyRow = findCreditRow(
    rows,
    (row) => normalizeLabel(row.label).includes('SERVICOEXTRAORDINARIO') && !normalizeLabel(row.label).includes('IREA')
  );
  const heEaRow = findCreditRow(
    rows,
    (row) => normalizeLabel(row.label).includes('SERVICOEXTRAORDINARIO') && normalizeLabel(row.label).includes('IREA')
  );
  const substMonthlyRow = findCreditRow(
    rows,
    (row) => normalizeLabel(row.label).includes('SUBSTITUICAODEFUNCAO') && !normalizeLabel(row.label).includes('IREA')
  );
  const substEaRow = findCreditRow(
    rows,
    (row) => normalizeLabel(row.label).includes('SUBSTITUICAODEFUNCAO') && normalizeLabel(row.label).includes('IREA')
  );

  const items = isEa
    ? [
        { label: 'HORA EXTRA (IR EA)', base: heEaRow?.value || 0 },
        { label: 'SUBSTITUIÇÃO (IR EA)', base: substEaRow?.value || 0 },
        ...(state.rubricasExtras || [])
          .filter((rubrica) => rubrica.incideIR && rubrica.isEA && Number(rubrica.valor) > 0 && rubrica.tipo !== 'D')
          .map((rubrica, index) => ({
            label: rubricaLabel(rubrica, index),
            base: rubrica.valor,
          })),
      ]
    : [
        { label: 'VENCIMENTO-ATIVO EC', base: state.vencimento || 0 },
        { label: 'GRAT. ATIV. JUD. (GAJ)', base: state.gaj || 0 },
        { label: 'FUNÇÃO COMISSIONADA / CARGO EM COMISSÃO', base: functionRow?.value || 0 },
        {
          label: state.periodo >= 1 ? 'ADICIONAL DE QUALIFICAÇÃO 1X VR (JANEIRO A JUNHO)' : 'AQ TÍTULOS',
          base: state.aqTituloValor || 0,
        },
        { label: 'AQ TREINAMENTO', base: state.aqTreinoValor || 0 },
        { label: 'GRATIFICAÇÃO ESPECÍFICA', base: state.gratEspecificaValor || 0 },
        { label: 'VPNI - LEI 9.527/97', base: state.vpni_lei || 0 },
        { label: 'VPNI - DECISÃO JUDICIAL', base: state.vpni_decisao || 0 },
        { label: 'ADICIONAL TEMPO DE SERVIÇO', base: state.ats || 0 },
        { label: 'ABONO DE PERMANÊNCIA', base: state.abonoPermanencia || 0 },
        { label: 'HORA EXTRA (IR MENSAL)', base: heMonthlyRow?.value || 0 },
        { label: 'SUBSTITUIÇÃO (IR MENSAL)', base: substMonthlyRow?.value || 0 },
        ...(state.rubricasExtras || [])
          .filter((rubrica) => rubrica.incideIR && !rubrica.isEA && Number(rubrica.valor) > 0 && rubrica.tipo !== 'D')
          .map((rubrica, index) => ({
            label: rubricaLabel(rubrica, index),
            base: rubrica.valor,
          })),
      ];

  return allocateDetailRows(isEa ? (state.irEA || 0) : (state.irMensal || 0), items);
};

const buildPssEaDetails = (
  rows: RowLike[],
  state?: Pick<CalculatorState, 'pssEA' | 'heTotal' | 'substTotal' | 'hePssIsEA' | 'substPssIsEA' | 'rubricasExtras'>
): Array<{ label: string; value: number; type: 'D' }> => {
  if (!state || Number(state.pssEA || 0) <= 0) return [];

  const heEaRow = findCreditRow(rows, (row) =>
    normalizeLabel(row.label).includes('SERVICOEXTRAORDINARIO') && normalizeLabel(row.label).includes('IREA')
  );
  const substEaRow = findCreditRow(rows, (row) =>
    normalizeLabel(row.label).includes('SUBSTITUICAODEFUNCAO') && normalizeLabel(row.label).includes('IREA')
  );

  const items = [
    { label: 'HORA EXTRA (BASE PSS-EA)', base: state.hePssIsEA ? (heEaRow?.value || 0) : 0 },
    { label: 'SUBSTITUIÇÃO (BASE PSS-EA)', base: state.substPssIsEA ? (substEaRow?.value || 0) : 0 },
    ...(state.rubricasExtras || [])
      .filter((rubrica) => rubrica.pssCompetenciaSeparada && Number(rubrica.valor) > 0 && rubrica.tipo !== 'D')
      .map((rubrica, index) => ({
        label: rubricaLabel(rubrica, index),
        base: rubrica.valor,
      })),
  ];

  return allocateDetailRows(state.pssEA || 0, items);
};

const buildThirteenthPssDetails = (
  state?: Pick<CalculatorState, 'pss13' | 'adiant13Venc' | 'adiant13FC' | 'segunda13Venc' | 'segunda13FC'>
): Array<{ label: string; value: number; type: 'D' }> => {
  if (!state || Number(state.pss13 || 0) <= 0) return [];

  const items = [
    { label: 'PSS DA GRATIFICAÇÃO NATALINA - 1ª PARCELA - VENCIMENTO/ATIVO EC', base: state.adiant13Venc || 0 },
    { label: 'PSS DA GRATIFICAÇÃO NATALINA - 1ª PARCELA - FC/CJ', base: state.adiant13FC || 0 },
    { label: 'PSS DA GRATIFICAÇÃO NATALINA - 2ª PARCELA - VENCIMENTO/ATIVO EC', base: state.segunda13Venc || 0 },
    { label: 'PSS DA GRATIFICAÇÃO NATALINA - 2ª PARCELA - FC/CJ', base: state.segunda13FC || 0 },
  ];

  return allocateDetailRows(state.pss13 || 0, items);
};

export const groupPayslipRowsForDisplay = <T extends RowLike>(
  rows: T[],
  calculatorState?: Pick<
    CalculatorState,
    | 'periodo'
    | 'vencimento'
    | 'gaj'
    | 'aqTituloValor'
    | 'aqTreinoValor'
    | 'gratEspecificaValor'
    | 'incidirPSSGrat'
    | 'vpni_lei'
    | 'vpni_decisao'
    | 'ats'
    | 'abonoPermanencia'
    | 'heTotal'
    | 'substTotal'
    | 'hePssIsEA'
    | 'substPssIsEA'
    | 'irMensal'
    | 'irEA'
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
      details: buildIrrfDetails(rows, calculatorState, group.isEa),
    });
  });

  const pssParent = rows.find((row) => row.type === 'D' && row.label === PSS_TOTAL_LABEL);
  if (pssParent) {
    const pssDetails = buildPssDetails(rows, calculatorState);
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
    const pssEaDetails = buildPssEaDetails(rows, calculatorState);
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
