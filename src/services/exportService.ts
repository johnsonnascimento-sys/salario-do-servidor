
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { CalculatorState, CourtConfig } from '../types';
import { formatCurrency } from '../utils/calculations';

// Estende o tipo jsPDF para incluir autoTable (adicionado pelo plugin)
interface jsPDFWithAutoTable extends jsPDF {
    autoTable: (options: any) => void;
    lastAutoTable: { finalY: number };
}

const EXPORT_BRAND_NAME = import.meta.env.VITE_EXPORT_BRAND_NAME || 'SIMULADOR DE SALARIO';
const EXPORT_SITE_NAME = import.meta.env.VITE_EXPORT_SITE_NAME || 'Salario do Servidor';
const EXPORT_SITE_URL = import.meta.env.VITE_EXPORT_SITE_URL || 'www.salariodoservidor.com.br';

export const exportToPDF = (state: CalculatorState, resultRows: any[], courtConfig: CourtConfig | null) => {
    const doc = new jsPDF() as jsPDFWithAutoTable;

    // Configura o nome do órgão
    const orgName = EXPORT_BRAND_NAME;

    // Nome do Site e URL (Marca no topo direito)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(37, 99, 235); // Azul (Secondary)
    doc.text(EXPORT_SITE_NAME, 195, 18, { align: "right" });
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(EXPORT_SITE_URL, 195, 23, { align: "right" });

    // Nome do Órgão (Centralizado)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(orgName, 105, 25, { align: "center" });

    // Detalhes do Servidor
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Demonstrativo de Pagamento Simulado - Ref: ${state.mesRef}/${state.anoRef}`, 105, 35, { align: "center" });
    doc.text(`Servidor: ${state.nome || "SERVIDOR SIMULADO"}`, 14, 45);

    // --- TABELA ---
    const tableBody = resultRows.map(row => [
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
    doc.setFont("helvetica", "bold");
    doc.text(`LÍQUIDO A RECEBER: ${formatCurrency(state.liquido)}`, 195, finalY, { align: "right" });

    if (state.observacoes) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        const splitObs = doc.splitTextToSize(`OBS: ${state.observacoes}`, 180);
        doc.text(splitObs, 14, finalY + 10);
    }

    // --- DISCLAIMER (AVISO LEGAL) ---
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(7);
    doc.setTextColor(150);
    const disclaimerText = "AVISO LEGAL: Os dados desta simulação são meramente ilustrativos, não possuem valor legal e podem conter imprecisões. Os cálculos oficiais devem ser sempre confirmados junto à unidade de pagamento do órgão competente.";
    const splitDisclaimer = doc.splitTextToSize(disclaimerText, 180);
    doc.text(splitDisclaimer, 105, pageHeight - 15, { align: "center" });

    const pdfBlob = doc.output('blob');
    saveAs(pdfBlob, `Holerite_${state.mesRef}_${state.anoRef}.pdf`);
};

export const exportToExcel = (state: CalculatorState, resultRows: any[], courtConfig: CourtConfig | null) => {
    const orgName = EXPORT_BRAND_NAME;

    const wb = XLSX.utils.book_new();
    const wsData: (string | number)[][] = [
        [orgName],
        [`SIMULAÇÃO DE SALÁRIO - REF: ${state.mesRef}/${state.anoRef}`],
        [`NOME: ${state.nome}`],
        [""],
        ["TIPO", "RUBRICA", "PROVENTOS", "DESCONTOS"]
    ];
    resultRows.forEach(row => {
        wsData.push([
            row.type,
            row.label,
            row.type === 'C' ? row.value : "",
            row.type === 'D' ? row.value : ""
        ]);
    });
    wsData.push(["", "TOTAL", state.totalBruto, state.totalDescontos]);
    wsData.push(["", "LÍQUIDO", "", state.liquido]);
    if (state.observacoes) {
        wsData.push([""]);
        wsData.push(["OBS:", state.observacoes]);
    }

    // Disclaimer no Excel
    wsData.push([""]);
    wsData.push(["AVISO LEGAL:", "Os dados desta simulação são meramente ilustrativos e não possuem valor legal. Confirme sempre com o órgão oficial."]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 5 }, { wch: 40 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws, "Holerite");

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const excelBlob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(excelBlob, `Holerite_${state.mesRef}_${state.anoRef}.xlsx`);
};
