import assert from 'node:assert/strict';
import test from 'node:test';
import * as XLSX from 'xlsx';
import { exportToExcel, exportToPDF } from '../src/services/exportService';
import { INITIAL_STATE } from '../src/types';
import type { PensionMemory } from '../src/types/pension';

const memory: PensionMemory = { mensal: { competencia: '2026-09', tipo: 'mensal', participacao: 'patrocinado',
 teto: 5000, baseRppsIntegral: 9000, baseRpps: 5000, baseComplementarIntegral: 9000, baseComplementar: 4000,
 aliquotaNormal: 0.085, aliquotaFacultativa: 0, normal: 340, facultativa: 0, facultativaExterna: 0, aporteFolha: 0,
 aporteExterno: 150, patrocinador: 340, descontoFolha: 340, dedutivelIRFolha: 340, deducaoSujeitaLimiteAnual: 0,
 componentes: { vencimento: 6000, gaj: 3000 } }, retroativos: [] };
const state = { ...INITIAL_STATE, mesRef: 'SETEMBRO', anoRef: 2026, totalBruto: 9000, totalDescontos: 340, liquido: 8660, pensionMemory: memory };
const rows = [{ label: 'VENCIMENTO', value: 9000, type: 'C' as const }, { label: 'FUNPRESP-JUD', value: 340, type: 'D' as const }];

test('XLSX keeps payroll totals and a separate audit sheet with informational external and employer payments', async () => {
 (globalThis as any).__pensionFiles = [];
 exportToExcel(state, rows, null);
 const [file] = (globalThis as any).__pensionFiles;
 assert.match(file.name, /\.xlsx$/);
 const workbook = XLSX.read(await file.blob.arrayBuffer(), { type: 'array' });
 assert.deepEqual(workbook.SheetNames, ['Holerite', 'Memória previdenciária']);
 const payroll = XLSX.utils.sheet_to_json(workbook.Sheets.Holerite, { header: 1 }) as any[][];
 assert.deepEqual(payroll.find(row => row[1] === 'TOTAL'), ['', 'TOTAL', 9000, 340]);
 const audit = XLSX.utils.sheet_to_json(workbook.Sheets['Memória previdenciária'], { header: 1 }) as any[][];
 assert.equal(audit.find(row => row[0] === 'Pagamento externo (informativo)')?.[1], 150);
 assert.equal(audit.find(row => row[0] === 'Patrocínio (informativo)')?.[1], 340);
});

test('PDF contains a separate audit page and only the employee contribution as payroll discount', async () => {
 (globalThis as any).__pensionFiles = [];
 exportToPDF(state, rows, null);
 const [file] = (globalThis as any).__pensionFiles;
 assert.match(file.name, /\.pdf$/);
 const pdf = new TextDecoder('latin1').decode(await file.blob.arrayBuffer());
 assert.match(pdf, /^%PDF-/);
 assert.ok((pdf.match(/\/Type \/Page\b/g) || []).length >= 2);
 assert.match(pdf, /FUNPRESP-JUD/);
 assert.match(pdf, /8660|8\.660/);
});
