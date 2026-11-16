// Exercise the real PDF/XLSX generators. Only the browser download sink is
// replaced, so this checks the produced bytes rather than a click or filename.
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import * as XLSX from 'xlsx';

const downloads = [];
globalThis.__exportFilesTest = (blob, filename) => downloads.push({ blob, filename });
const server = await createServer({ configFile: false,
    ssr: { noExternal: ['file-saver'] },
    server: { middlewareMode: true }, appType: 'custom',
    plugins: [{
        name: 'capture-download-blobs', enforce: 'pre',
        resolveId(source) { if (source === 'file-saver') return '\0capture-download-blobs'; },
        load(id) { if (id === '\0capture-download-blobs') return 'export const saveAs = (blob, filename) => globalThis.__exportFilesTest(blob, filename);'; }
    }]
});
try {
    const { INITIAL_STATE } = await server.ssrLoadModule('/src/types.ts');
    const { exportToPDF, exportToExcel } = await server.ssrLoadModule('/src/services/exportService.ts');
    const state = { ...INITIAL_STATE, nome: 'VALIDACAO DE EXPORTACAO', mesRef: 'NOVEMBRO', anoRef: 2026,
        totalBruto: 1350, totalDescontos: 125, liquido: 1225,
        transporteIndenizacaoAtivo: true, transporteIndenizacaoMemory: { transitionWarning: 'ALERTA TESTE DE VIGENCIA' },
        irEaMemory: { status: 'ready', mesPagamento: '2026-11', competencias: ['2024-01', '2024-02'], meses: 2,
            tabela: 'Tabela documentada', baseBruta: 10000, deducoes: 1000, baseCalculo: 9000,
            impostoAntesReducao: 125, reducao: 0, imposto: 125,
            ajustesBaseDocumentados: [{ valor: 1000, descricao: 'Despesa documentada', fundamento: 'Documento EA 123' }], avisos: [] } };
    const rows = [
        { type: 'C', label: 'CREDITO TESTE', value: 1100 },
        { type: 'D', label: 'DESCONTO TESTE', value: 100 },
        { type: 'C', label: 'DIARIAS TESTE', value: 250 },
        { type: 'D', label: 'RESTITUICAO AUX. ALIM. (DIARIAS)', value: 25 },
    ];
    exportToPDF(state, rows, null);
    exportToExcel(state, rows, null);
    assert.equal(downloads.length, 2);
    const pdf = downloads.find(file => file.filename.endsWith('.pdf'));
    const excel = downloads.find(file => file.filename.endsWith('.xlsx'));
    assert(pdf && excel, 'Both download callbacks must receive a file.');
    const pdfBytes = Buffer.from(await pdf.blob.arrayBuffer());
    assert(pdfBytes.subarray(0, 5).equals(Buffer.from('%PDF-')));
    assert(pdfBytes.length > 1000);
    const pdfContent = pdfBytes.toString('latin1');
    for (const content of ['CREDITO TESTE', 'DESCONTO TESTE', 'DIARIAS TESTE',
        'RESTITUICAO AUX. ALIM.', 'VALIDACAO DE EXPORTACAO', '1.225,00']) {
        assert(pdfContent.includes(content), `PDF missing ${content}`);
    }
    assert(pdfContent.includes('ALERTA TESTE DE VIGENCIA'), 'PDF preserves transition warning');
    assert(pdfContent.includes('2024-01, 2024-02'), 'PDF preserves original EA months');
    assert(pdfContent.includes('Documento EA 123'), 'PDF preserves documented deduction');
    assert(pdfContent.includes('%%EOF'), 'PDF must have a complete trailer.');
    const excelBytes = new Uint8Array(await excel.blob.arrayBuffer());
    const workbook = XLSX.read(excelBytes, { type: 'array' });
    assert(workbook.SheetNames.includes('Memória IR-EA'));
    const memoryCells = XLSX.utils.sheet_to_json(workbook.Sheets['Memória IR-EA'], { header: 1 });
    assert(memoryCells.some(row => row[0] === 'Número de meses (NM)' && row[1] === '2'));
    assert(memoryCells.some(row => row[1]?.includes?.('Documento EA 123')));
    const cells = XLSX.utils.sheet_to_json(workbook.Sheets.Holerite, { header: 1 });
    assert(cells.some(row => row[0] === 'ALERTA DE VIGÊNCIA:' && row[1] === 'ALERTA TESTE DE VIGENCIA'));
    assert(cells.some(row => row[1] === 'CREDITO TESTE' && row[2] === 1100));
    assert(cells.some(row => row[1] === 'DESCONTO TESTE' && row[3] === 100));
    assert(cells.some(row => row[1] === 'DIARIAS TESTE' && row[2] === 250));
    assert(cells.some(row => row[1] === 'RESTITUICAO AUX. ALIM. (DIARIAS)' && row[3] === 25));
    assert(cells.some(row => row[1] === 'TOTAL' && row[2] === 1350 && row[3] === 125));
    assert(cells.some(row => row[1] === 'LÍQUIDO' && row[3] === 1225));
    const { thirteenthPaymentRows } = await server.ssrLoadModule('/src/utils/thirteenthPresentation.ts');
    const unified = { ...INITIAL_STATE, mesRef: 'NOVEMBRO', anoRef: 2026, totalBruto: 2000, totalDescontos: 1000, liquido: 1000,
        thirteenthMemory: { version: 1, firstSelected: true, secondSelected: true, firstMode: 'informado', secondMode: 'automatico',
            components: [{ id: 'vencimento', label: 'Salary demo', amount: 2000 }], groups: [], cargoTotal: 2000, functionTotal: 0, referenceTotal: 2000,
            advances: [{ id: 'demo-first', target: 'grupo:cargo', description: 'ADVANCE DEMO', amount: 1000 }],
            secondEntries: [{ id: 'demo-second', target: 'grupo:cargo', description: 'BALANCE DEMO', amount: 1000 }], firstTotal: 1000, secondTotal: 1000 } };
    const unifiedRows = thirteenthPaymentRows(unified);
    exportToPDF(unified, unifiedRows, null, { filename: 'unified-13' });
    exportToExcel(unified, unifiedRows, null, { filename: 'unified-13' });
    const auditPdf = Buffer.from(await downloads[2].blob.arrayBuffer()).toString('latin1');
    assert(auditPdf.includes('demo-first / grupo:cargo'), 'PDF retains original payment links');
    const auditWorkbook = XLSX.read(new Uint8Array(await downloads[3].blob.arrayBuffer()), { type: 'array' });
    assert(auditWorkbook.SheetNames.includes('Memória do 13º'));
    const auditCells = XLSX.utils.sheet_to_json(auditWorkbook.Sheets['Memória do 13º'], { header: 1 });
    assert(auditCells.some(row => row[0] === 'Identificador / vínculo' && row[1] === 'demo-first / grupo:cargo'));
    const unifiedCells = XLSX.utils.sheet_to_json(auditWorkbook.Sheets.Holerite, { header: 1 });
    for (const row of unifiedRows) assert.equal(unifiedCells.filter(cell => cell[1] === row.label).length, 1);
    assert(unifiedCells.some(row => row[1] === 'TOTAL' && row[2] === 2000 && row[3] === 1000));
    console.log('Unified thirteenth PDF/XLSX audit memory, unique entries, links and totals verified.');
    console.log(`Export generators passed: PDF ${pdfBytes.length} bytes; XLSX ${excelBytes.length} bytes; credits, debits and totals verified.`);
} finally {
    delete globalThis.__exportFilesTest;
    await server.close();
}
