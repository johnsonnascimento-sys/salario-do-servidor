import { buildIrEaAuditRows } from '../utils/irEaExport';
import { buildPensionAuditRows } from '../utils/pensionExport';
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
    doc.text(`Demonstrativo de Pagamento Simulado - Ref: ${state.mesRef}/${state.anoRef}`, 105, 35, { align: 'center' });
    doc.text(`Servidor: ${state.nome || 'SERVIDOR SIMULADO'}`, 14, 45);

    const tableBody = resultRows.map((row) => [
        row.type === 'C' ? 'C' : 'D',
        row.label,
        row.type === 'C' ? formatCurrency(row.value) : '',
        row.type === 'D' ? formatCurrency(row.value) : ''
    ]);
    tableBody.push(['', 'TOTAL', formatCurrency(state.totalBruto), formatCurrency(state.totalDescontos)]);

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
    doc.text(`LÍQUIDO A RECEBER: ${formatCurrency(state.liquido)}`, 195, finalY, { align: 'right' });

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

    const transportMemory = state.transporteIndenizacaoAtivo ? state.transporteIndenizacaoMemory : undefined;
    const transitionWarning = transportMemory?.transitionWarning;
    if (transportMemory && (transportMemory.amount > 0 || transportMemory.fullAmount > 0)) {
        const compDisplay = transportMemory.competence ? transportMemory.competence.split('-').reverse().join('/') : `${state.mesRef}/${state.anoRef}`;
        const isDual = transportMemory.serviceCompetence && transportMemory.serviceCompetence !== transportMemory.competence;
        const transportRows = [
            ['Competência da folha (pagamento)', compDisplay],
            ...(isDual && transportMemory.serviceCompetence ? [['Mês de execução do serviço', transportMemory.serviceCompetence.split('-').reverse().join('/')]] : []),
            ['Valor integral de referência', formatCurrency(transportMemory.fullAmount)],
            ['Divisor aplicável', String(transportMemory.divisor || 20)],
            ['Dias de serviço externo informados', String(transportMemory.days || 0)],
            ['Dias elegíveis computados', String(transportMemory.eligibleDays || 0)],
            ['Valor apurado a receber', formatCurrency(transportMemory.amount)],
            ...(transitionWarning ? [['Alerta de vigência / efeitos', transitionWarning]] : [])
        ];
        doc.addPage();
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text('Indenização de Transporte — memória de cálculo', 14, 18);
        doc.autoTable({
            head: [['Item / Parâmetro', 'Detalhamento']],
            body: transportRows,
            startY: 24,
            theme: 'grid',
            styles: { fontSize: 9 },
            margin: { bottom: 20 }
        });
    } else if (transitionWarning) {
        doc.addPage();
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text('Indenização de Transporte — alerta de vigência', 14, 18);
        doc.autoTable({ head: [['Alerta da simulação']], body: [[transitionWarning]],
            startY: 24, theme: 'grid', styles: { fontSize: 9 }, margin: { bottom: 20 } });
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
    const irEaRows = buildIrEaAuditRows(state.irEaMemory);
    if (irEaRows.length > 0) {
        doc.addPage();
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text('Memória do IR-EA', 14, 18);
        doc.autoTable({ head: [['Campo', 'Valor']], body: irEaRows,
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

    const wb = XLSX.utils.book_new();
    const wsData: (string | number)[][] = [
        [orgName],
        [`SIMULAÇÃO DE SALÁRIO - REF: ${state.mesRef}/${state.anoRef}`],
        [`NOME: ${state.nome}`],
        [''],
        ['TIPO', 'RUBRICA', 'PROVENTOS', 'DESCONTOS']
    ];

    resultRows.forEach((row) => {
        wsData.push([
            row.type,
            row.label,
            row.type === 'C' ? row.value : '',
            row.type === 'D' ? row.value : ''
        ]);
    });

    wsData.push(['', 'TOTAL', state.totalBruto, state.totalDescontos]);
    wsData.push(['', 'LÍQUIDO', '', state.liquido]);

    if (state.observacoes) {
        wsData.push(['']);
        wsData.push(['OBS:', state.observacoes]);
    }

    wsData.push(['']);
    const transportMemory = state.transporteIndenizacaoAtivo ? state.transporteIndenizacaoMemory : undefined;
    if (transportMemory && (transportMemory.amount > 0 || transportMemory.fullAmount > 0)) {
        const compDisplay = transportMemory.competence ? transportMemory.competence.split('-').reverse().join('/') : `${state.mesRef}/${state.anoRef}`;
        const isDual = transportMemory.serviceCompetence && transportMemory.serviceCompetence !== transportMemory.competence;
        wsData.push(['INDENIZAÇÃO DE TRANSPORTE:']);
        wsData.push(['Competência da folha (pagamento):', compDisplay]);
        if (isDual && transportMemory.serviceCompetence) {
            wsData.push(['Mês de execução do serviço:', transportMemory.serviceCompetence.split('-').reverse().join('/')]);
        }
        wsData.push(['Valor integral de referência:', transportMemory.fullAmount]);
        wsData.push(['Dias informados / Divisor:', `${transportMemory.days} / ${transportMemory.divisor || 20}`]);
        wsData.push(['Valor apurado a receber:', transportMemory.amount]);
        wsData.push(['']);
    }
    const transitionWarning = state.transporteIndenizacaoAtivo ? state.transporteIndenizacaoMemory?.transitionWarning : undefined;
    if (transitionWarning) wsData.push(['ALERTA DE VIGÊNCIA:', transitionWarning]);
    wsData.push(['AVISO LEGAL:', 'Os dados desta simulação são meramente ilustrativos e não possuem valor legal. Confirme sempre com o órgão oficial.']);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 5 }, { wch: 40 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Holerite');
    const pensionRows = buildPensionAuditRows(state.pensionMemory);
    if (pensionRows.length > 0) {
        const auditSheet = XLSX.utils.aoa_to_sheet([['Referência / Campo', 'Valor'], ...pensionRows]);
        auditSheet['!cols'] = [{ wch: 58 }, { wch: 70 }];
        XLSX.utils.book_append_sheet(wb, auditSheet, 'Memória previdenciária');
    }

    const irEaRows = buildIrEaAuditRows(state.irEaMemory);
    if (irEaRows.length > 0) {
        const irEaSheet = XLSX.utils.aoa_to_sheet([['Campo', 'Valor'], ...irEaRows]);
        irEaSheet['!cols'] = [{ wch: 40 }, { wch: 70 }];
        XLSX.utils.book_append_sheet(wb, irEaSheet, 'Memória IR-EA');
    }
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const excelBlob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const filename = options?.filename?.trim() || `Holerite_${state.mesRef}_${state.anoRef}`;
    saveAs(excelBlob, `${filename}.xlsx`);
};
