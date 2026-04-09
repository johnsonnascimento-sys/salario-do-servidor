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
    prefix: 'IMPOSTO DE RENDA-EC (',
    totalLabel: 'IMPOSTO DE RENDA-EC (EXERCÍCIO CORRENTE)',
  },
  {
    prefix: 'IMPOSTO DE RENDA-EA (',
    totalLabel: 'IMPOSTO DE RENDA-EA (EXERCÍCIO ANTERIOR)',
  },
] as const;

export const groupPayslipRowsForDisplay = <T extends RowLike>(rows: T[]): PayslipDisplayRow[] => {
  const groupedRowsByIndex = new Map<number, PayslipDisplayRow>();
  const consumedIndexes = new Set<number>();

  IR_GROUPS.forEach((group) => {
    const details = rows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => row.type === 'D' && row.label.startsWith(group.prefix));

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
