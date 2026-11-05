import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ManualRubricasSection } from '../src/components/Calculator/ManualRubricasSection';
import type { Rubrica } from '../src/types';
import type { PensionCalculationMemory, PensionMemory, PensionParticipation } from '../src/types/pension';

// Synthetic amounts isolate presentation behavior from official configuration.
const rubric: Rubrica = { id: 'r', tipo: 'C', descricao: 'Parcela teste', valor: 1000,
    incideIR: false, isEA: false, incidePSS: false, pssCompetenciaSeparada: false, incideFunpresp: true };
const month: PensionCalculationMemory = { competencia: '2026-07', tipo: 'mensal', participacao: 'patrocinado',
    teto: 5000, baseRppsIntegral: 6000, baseRpps: 5000, baseComplementarIntegral: 6500, baseComplementar: 1500,
    aliquotaNormal: .085, aliquotaFacultativa: .025, normal: 127.5, facultativa: 37.5, facultativaExterna: 10,
    aporteFolha: 20, aporteExterno: 30, patrocinador: 127.5, descontoFolha: 175, dedutivelIRFolha: 175,
    deducaoSujeitaLimiteAnual: 47.5, componentes: {} };
const memory: PensionMemory = { mensal: month, thirteenth: { ...month, tipo: '13', normal: 42.5,
    facultativa: 0, facultativaExterna: 0, aporteFolha: 0, aporteExterno: 0, descontoFolha: 42.5 },
    retroativos: [{ id: 'retro', competencia: '2025-12', tipo: 'mensal', modo: 'manual', destinoIR: 'ea',
        rpps: 10, complementar: 15 }] };
const render = ({ current = rubric, ready = true, participation = 'patrocinado', withMemory = true, dataMemory = memory,
    taxes = { r: { ir: 0, pss: 0, funpresp: 85, totalDescontos: 85, liquido: 915 } } }: {
        current?: Rubrica; ready?: boolean; participation?: PensionParticipation; withMemory?: boolean; dataMemory?: PensionMemory;
        taxes?: Record<string, { ir: number; pss: number; funpresp: number; totalDescontos: number; liquido: number }>;
    } = {}) => renderToStaticMarkup(<ManualRubricasSection rubricas={[current]} styles={{}} totalCreditos={1000}
        totalDescontos={0} rubricasTax={taxes} calculationReady={ready} funprespParticipacao={participation}
        pensionMemory={withMemory ? dataMemory : undefined} addRubrica={() => {}} removeRubrica={() => {}}
        updateRubrica={() => {}} toPositiveNumber={Number} />).replace(/\s|&nbsp;/g, ' ');

test('não apresenta resumo antigo nem líquido enquanto a apuração está pendente', () => {
    const html = render({ ready: false });
    assert.match(html, /Resumo de descontos e líquido indisponível/);
    assert.doesNotMatch(html, /Resumo compartilhado da Funpresp|Parcela teste Líquido|915,00|85,00/);
});

test('não participante tem líquido recalculado, sem desconto individual ou rateio legado', () => {
    const fresh = { r: { ir: 0, pss: 0, funpresp: 0, totalDescontos: 0, liquido: 1000 } };
    const html = render({ participation: 'nao', taxes: fresh });
    assert.match(html, /Parcela teste Líquido/);
    assert.doesNotMatch(html, /Desconto Funpresp \(Parcela teste\)/);
    const legacy = render({ participation: 'nao' });
    assert.doesNotMatch(legacy, /Parcela teste Líquido|915,00/);
    assert.match(legacy, /Líquido individual indisponível/);
});

test('resumo compartilhado expõe mensal, 13º e retroativo e preserva valores externos informativos', () => {
    const html = render();
    assert.match(html, /Resumo compartilhado da Funpresp/);
    assert.match(html, /Folha mensal — 2026-07/);
    assert.match(html, /13º salário — 2026-07/);
    assert.match(html, /Retroativo — 2025-12 — Mensal/);
    assert.match(html, /Facultativa em folha/);
    assert.match(html, /27,50/);
    assert.match(html, /Total descontado em folha/);
    assert.match(html, /175,00/);
    assert.match(html, /Contrapartida patronal \(informativa\)/);
    assert.match(html, /Facultativa externa \(informativa\)/);
    assert.match(html, /Aporte externo \(informativo\)/);
    assert.match(html, /Líquido individual não apurado/);
    assert.doesNotMatch(html, /Parcela teste Líquido|Desconto Funpresp \(Parcela teste\)|915,00/);
});

test('participante vinculado não recebe desconto ou líquido individual atribuído à rubrica', () => {
    const html = render({ participation: 'vinculado', taxes: { r: { ir: 0, pss: 0, funpresp: 0,
        totalDescontos: 0, liquido: 1000 } } });
    assert.match(html, /Líquido individual não apurado/);
    assert.doesNotMatch(html, /Parcela teste Líquido|Desconto Funpresp \(Parcela teste\)/);
});

test('rubrica histórica mantém pendência mesmo quando não há participação atual', () => {
    const html = render({ current: { ...rubric, funprespCompetenciaSeparada: true }, participation: 'nao', ready: false });
    assert.match(html, /Apuração por competência/);
    assert.match(html, /href="#pension-retro-form"/);
    assert.doesNotMatch(html, /Parcela teste Líquido|915,00/);
});

for (const incideFunpresp of [false, true]) {
    test(`PSS histórico compartilhado não usa taxa mensal no card (Funpresp: ${incideFunpresp})`, () => {
        const historicalMemory: PensionMemory = { ...memory, retroativos: [{ ...memory.retroativos[0], rpps: 80 }] };
        const html = render({ current: { ...rubric, pssCompetenciaSeparada: true, incideFunpresp,
            funprespCompetenciaSeparada: incideFunpresp }, participation: 'nao', dataMemory: historicalMemory,
            taxes: { r: { ir: 0, pss: 100, funpresp: 0, totalDescontos: 100, liquido: 900 } } });
        assert.match(html, /Diferença RPPS descontada em folha/);
        assert.match(html, /80,00/);
        assert.match(html, /Líquido individual não apurado/);
        assert.doesNotMatch(html, /Desconto PSS-EA \(Parcela teste\)|Parcela teste Líquido|900,00/);
    });
}
