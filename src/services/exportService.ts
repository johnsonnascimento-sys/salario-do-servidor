import { buildPensionAuditRows } from '../utils/pensionExport';
import { buildDailiesAuditRows, isDailiesRow } from '../utils/dailiesExport';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { CalculatorState, CourtConfig } from '../types';
import { formatCurrency } from '../utils/calculations';

interface jsPDFWithAutoTable extends jsPDF {
    autoTable: (options: any) => void;
    lastAutoTable: { finalY: number };
}

const EXPORT_BRAND_NAME = import.meta.env.VITE_EXPORT_BRAND_NAME || 'SIMULADOR DE SALÁRIO';
const EXPORT_SITE_NAME = import.meta.env.VITE_EXPORT_SITE_NAME || 'Salário do Servidor';
const EXPORT_SITE_URL = import.meta.env.VITE_EXPORT_SITE_URL || 'www.salariodoservidor.com.br';

interface ExportOptions {
    filename?: string;
}

export const exportToPDF = (
    state: CalculatorState,
    resultRows: any[],
    courtConfig: CourtConfig | null,
    options?: ExportOptions
) => {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    const money = (value: number) => state.dailiesOnly
        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: state.dailiesCurrency || 'BRL' }).format(value)
        : formatCurrency(value);
    const mainRows = state.dailiesOnly ? resultRows : resultRows.filter(row => !isDailiesRow(row.label));
    const credit = mainRows.filter(row => row.type === 'C').reduce((sum, row) => sum + row.value, 0);
    const debit = mainRows.filter(row => row.type === 'D').reduce((sum, row) => sum + row.value, 0);

    const orgName = EXPORT_BRAND_NAME;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(37, 99, 235);
    doc.text(EXPORT_SITE_NAME, 195, 18, { align: 'right' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(EXPORT_SITE_URL, 195, 23, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(orgName, 105, 25, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`${state.dailiesOnly ? 'Diárias' : 'Holerite (sem diárias)'} - Ref: ${state.mesRef}/${state.anoRef}`, 105, 35, { align: 'center' });
    doc.text(`Servidor: ${state.nome || 'SERVIDOR SIMULADO'}`, 14, 45);

    const tableBody = mainRows.map((row) => [
        row.type === 'C' ? 'C' : 'D',
        row.label,
        row.type === 'C' ? money(row.value) : '',
        row.type === 'D' ? money(row.value) : ''
    ]);
    tableBody.push(['', 'TOTAL', money(credit), money(debit)]);

    doc.autoTable({
        head: [['TIPO', 'RUBRICA', 'PROVENTOS', 'DESCONTOS']],
        body: tableBody,
        startY: 50,
        theme: 'grid',
        headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' },
        columnStyles: {
            0: { halign: 'center', cellWidth: 15 },
            2: { halign: 'right', textColor: [0, 100, 0] },
            3: { halign: 'right', textColor: [180, 0, 0] }
        },
        didParseCell: function (data: any) {
            if (data.section === 'body' && data.row.index === tableBody.length - 1) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fillColor = [240, 240, 240];
            }
        }
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`LÍQUIDO A RECEBER: ${money(credit - debit)}`, 195, finalY, { align: 'right' });

    if (state.observacoes) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        const splitObs = doc.splitTextToSize(`OBS: ${state.observacoes}`, 180);
        doc.text(splitObs, 14, finalY + 10);
    }

    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(7);
    doc.setTextColor(150);
    const disclaimerText = 'AVISO LEGAL: Os dados desta simulação são meramente ilustrativos, não possuem valor legal e podem conter imprecisões. Os cálculos oficiais devem ser sempre confirmados junto à unidade de pagamento do órgão competente.';
    const splitDisclaimer = doc.splitTextToSize(disclaimerText, 180);
    doc.text(splitDisclaimer, 105, pageHeight - 15, { align: 'center' });

    if (!state.dailiesOnly && resultRows.some(row => isDailiesRow(row.label))) {
        doc.addPage();
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text('Diárias (pagamento separado)', 14, 18);
        const dailyRows = resultRows.filter(row => isDailiesRow(row.label));
        const total = dailyRows.reduce((sum, row) => sum + (row.type === 'C' ? row.value : -row.value), 0);
        doc.autoTable({ head: [['Tipo', 'Rubrica', 'Valor']], body: [...dailyRows.map(row => [row.type, row.label, formatCurrency(row.value)]), ['', 'Diárias líquidas', formatCurrency(total)]], startY: 24 });
    }
    const dailiesAudit = buildDailiesAuditRows(state.dailiesMemory);
    if (dailiesAudit.length) {
        doc.addPage();
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text('Memória de diárias e fundamentos', 14, 18);
        doc.autoTable({ head: [['Referência / Campo', 'Valor']], body: dailiesAudit, startY: 24, theme: 'grid', styles: { fontSize: 7 }, margin: { bottom: 20 } });
    }
    const pensionRows = buildPensionAuditRows(state.pensionMemory);
    if (pensionRows.length > 0) {
        doc.addPage();
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text('Memória previdenciária (informativa)', 14, 18);
        doc.autoTable({ head: [['Referência / Campo', 'Valor']], body: pensionRows,
            startY: 24, theme: 'grid', styles: { fontSize: 8 }, margin: { bottom: 20 } });
    }
    const pdfBlob = doc.output('blob');
    const filename = options?.filename?.trim() || `Holerite_${state.mesRef}_${state.anoRef}`;
    saveAs(pdfBlob, `${filename}.pdf`);
};

export const exportToExcel = (
    state: CalculatorState,
    resultRows: any[],
    courtConfig: CourtConfig | null,
    options?: ExportOptions
) => {
    const orgName = EXPORT_BRAND_NAME;
    const mainRows = state.dailiesOnly ? resultRows : resultRows.filter(row => !isDailiesRow(row.label));
    const credit = mainRows.filter(row => row.type === 'C').reduce((sum, row) => sum + row.value, 0);
    const debit = mainRows.filter(row => row.type === 'D').reduce((sum, row) => sum + row.value, 0);

    const wb = XLSX.utils.book_new();
    const wsData: (string | number)[][] = [
        [orgName],
        [`${state.dailiesOnly ? `DIÁRIAS (${state.dailiesCurrency || 'BRL'})` : 'HOLERITE (BRL)'} - REF: ${state.mesRef}/${state.anoRef}`],
        [`NOME: ${state.nome}`],
        [''],
        ['TIPO', 'RUBRICA', 'PROVENTOS', 'DESCONTOS']
    ];

    mainRows.forEach((row) => {
        wsData.push([
            row.type,
            row.label,
            row.type === 'C' ? row.value : '',
            row.type === 'D' ? row.value : ''
        ]);
    });

    wsData.push(['', 'TOTAL', credit, debit]);
    wsData.push(['', 'LÍQUIDO', '', credit - debit]);

    if (state.observacoes) {
        wsData.push(['']);
        wsData.push(['OBS:', state.observacoes]);
    }

    wsData.push(['']);
    wsData.push(['AVISO LEGAL:', 'Os dados desta simulação são meramente ilustrativos e não possuem valor legal. Confirme sempre com o órgão oficial.']);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 5 }, { wch: 40 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws, state.dailiesOnly ? 'Diárias' : 'Holerite');
    if (!state.dailiesOnly && resultRows.some(row => isDailiesRow(row.label))) {
        const dailyRows = resultRows.filter(row => isDailiesRow(row.label));
        const total = dailyRows.reduce((sum, row) => sum + (row.type === 'C' ? row.value : -row.value), 0);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
            ['DIÁRIAS (BRL)'], ['TIPO', 'RUBRICA', 'VALOR'], ...dailyRows.map(row => [row.type, row.label, row.value]), ['', 'LÍQUIDO', total],
        ]), 'Diárias');
    }
    const dailyAudit = buildDailiesAuditRows(state.dailiesMemory);
    if (dailyAudit.length) {
        const sheet = XLSX.utils.aoa_to_sheet([['Referência / Campo', 'Valor'], ...dailyAudit]);
        sheet['!cols'] = [{ wch: 65 }, { wch: 85 }];
        XLSX.utils.book_append_sheet(wb, sheet, 'Memória diárias');
    }
    const pensionRows = buildPensionAuditRows(state.pensionMemory);
    if (pensionRows.length > 0) {
        const auditSheet = XLSX.utils.aoa_to_sheet([['Referência / Campo', 'Valor'], ...pensionRows]);
        auditSheet['!cols'] = [{ wch: 58 }, { wch: 70 }];
        XLSX.utils.book_append_sheet(wb, auditSheet, 'Memória previdenciária');
    }

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const excelBlob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const filename = options?.filename?.trim() || `Holerite_${state.mesRef}_${state.anoRef}`;
    saveAs(excelBlob, `${filename}.xlsx`);
};
