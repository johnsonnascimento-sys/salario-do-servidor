import assert from 'node:assert/strict';
import test from 'node:test';
import type { CourtConfig } from '../src/types';
import { buildCalculatorSearchIndex, searchCalculator } from '../src/components/Calculator/calculatorSearchIndex';
import { CALCULATOR_SECTIONS, CALCULATOR_STEP } from '../src/components/Calculator/calculatorSections';
import { PRESET_CATALOG } from '../src/components/Calculator/dynamicPayrollForm.helpers';

test('busca geral encontra o abono e o serviço extraordinário por nome, sigla ou sinônimo', () => {
    const index = buildCalculatorSearchIndex({});
    for (const query of ['abono de permanência', '  ABONO   de permanencia  ', 'abono perman']) {
        assert.deepEqual(searchCalculator(index, query)[0]?.destination, {
            kind: 'element', step: CALCULATOR_STEP.pension, elementId: 'abono-permanencia'
        });
    }
    for (const query of ['hora extra', 'Horas extras', 'serviço extraordinário', 'SERVICO EXTRAORDINARIO', 'HE']) {
        assert.deepEqual(searchCalculator(index, query)[0]?.destination, {
            kind: 'preset', step: CALCULATOR_STEP.credits, presetId: 'hora_extra'
        });
    }
    assert.equal(searchCalculator(index, 'previdência e abono')[0]?.id, `step-${CALCULATOR_STEP.pension}`);
    assert.equal(searchCalculator(index, 'FC/CJ')[0]?.id, 'dados-principais');
    assert.deepEqual(searchCalculator(index, '    '), []);
    assert.deepEqual(searchCalculator(index, 'opção inexistente'), []);
});

test('Competência antecede Dados básicos e a busca separa período de cargo', () => {
    const index = buildCalculatorSearchIndex({});
    assert.deepEqual(CALCULATOR_SECTIONS.slice(0, 2).map(section => section.label), ['Competência', 'Dados básicos']);
    for (const query of ['mês', 'ano', 'enquadramento normativo']) {
        assert.deepEqual(searchCalculator(index, query)[0]?.destination, {
            kind: 'element', step: CALCULATOR_STEP.competence, elementId: 'competencia'
        });
    }
    assert.deepEqual(searchCalculator(index, 'cargo')[0]?.destination, {
        kind: 'element', step: CALCULATOR_STEP.basic, elementId: 'dados-principais'
    });
});

test('índice cobre as etapas e o catálogo e respeita a disponibilidade por órgão', () => {
    const enabled = buildCalculatorSearchIndex({
        previdenciaComplementar: { enabled: true } as CourtConfig['previdenciaComplementar'],
        transportIndemnity: { enabled: true } as CourtConfig['transportIndemnity']
    });
    assert.equal(enabled.filter(entry => entry.destination.kind === 'step').length, 11);
    assert.deepEqual(enabled.filter(entry => entry.destination.kind === 'preset').map(entry => entry.id), PRESET_CATALOG.map(item => item.id));
    assert.equal(searchCalculator(enabled, 'funpresp')[0]?.id, 'funpresp-settings');
    assert.equal(searchCalculator(enabled, 'indenização de transporte')[0]?.id, 'indenizacao_transporte');
    assert.deepEqual(searchCalculator(enabled, 'pensão alimentícia')[0]?.destination, {
        kind: 'preset', step: CALCULATOR_STEP.discounts, presetId: 'pensao'
    });

    const disabled = buildCalculatorSearchIndex({});
    assert.deepEqual(searchCalculator(disabled, 'funpresp'), []);
    assert.deepEqual(searchCalculator(disabled, 'indenização de transporte'), []);
});
