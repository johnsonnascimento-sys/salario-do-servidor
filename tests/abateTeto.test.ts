
import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { act, create } from 'react-test-renderer';
import * as XLSX from 'xlsx';
import { INITIAL_STATE, type CalculatorState, type CourtConfig } from '../src/types';
import { mapStateToAgencyParams } from '../src/services/agency/adapters/stateToParams';
import { AgencyCalculationEngine } from '../src/services/agency/engine/AgencyCalculationEngine';
import { calculateAbateTeto } from '../src/services/agency/engine/modules/abateTetoCalculations';
import { useCalculatorResults } from '../src/hooks/calculator/useCalculatorResults';
import { hydrateCalculatorState } from '../src/utils/calculatorState';
import { exportToExcel, exportToPDF } from '../src/services/exportService';
import { AbateTetoDetails } from '../src/components/Calculator/AbateTetoDetails';
import { AbateTetoCard } from '../src/components/Calculator/cards/AbateTetoCard';
import type { AbateTetoMemory } from '../src/types/constitutionalCeiling';

const engine = new AgencyCalculationEngine();
const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
// Teto da competência e alíquotas sintéticas de 10% e 20% para homologação.
const limit = 46366.19;
const start = '2026-11-01';
const source = 'https://atos.cnj.jus.br/atos/detalhar/178';
const officialCeiling = 'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/lei/l14520.htm';
const input = (patch: Partial<CalculatorState> = {}): CalculatorState => ({
    ...INITIAL_STATE, nome: 'SIMULAÇÃO DE HOMOLOGAÇÃO', mesRef: 'NOVEMBRO', anoRef: 2026,
    cargo: 'teste', padrao: 'A1', funcao: '0', tabelaPSS: 'synthetic', tabelaIR: 'synthetic',
    regimePrev: 'antigo', dependentes: 0, auxAlimentacao: 0, auxTransporteGasto: 0, ...patch,
});
const court = (slug: string, salary: number): CourtConfig => ({
    orgSlug: slug, powerName: 'PJU',
    bases: { salario: { teste: { A1: salary } }, funcoes: { fc1: 2000 } },
    careerCatalog: { noFunctionCode: '0', noFunctionLabel: 'Sem função', cargoLabels: {} },
    payrollRules: { gajRate: 1.4, specificGratificationRate: 0.35, vrRateOnCj1: 0.065,
        monthDayDivisor: 30, overtimeMonthHours: 200, transportWorkdays: 22,
        transportDiscountRate: 0.06, irrfTopRate: 0.2 },
    historico_pss: { synthetic: { teto_rgps: 8000, faixas: [{ min: 0, max: 100000, rate: 0.1 }] } },
    historico_ir: { synthetic: 100 }, historico_ir_brackets: {}, values: { deducao_dep: 100 },
    constitutionalCeilingReference: {
        versions: [{ valid_from: '2025-02-01', valid_to: null, amount: limit, source: officialCeiling }],
    },
    abateTetoActivation: { versions: [{ enabled: true, valid_from: start, valid_to: null }] },
    abateTetoRules: { versions: [{ valid_from: start, valid_to: null, source, rubrics: {
        vencimento: { kind: 'monthly', provision: 'Art. 2º, I, a' },
        gaj: { kind: 'monthly', provision: 'Art. 2º, I, g' },
        fc: { kind: 'monthly', provision: 'Art. 2º, II, f' },
        aqTreino: { kind: 'monthly', provision: 'Art. 2º, I, g' },
        abono: { kind: 'excluded', provision: 'Art. 4º, IV' },
        auxAlimentacao: { kind: 'excluded', provision: 'Art. 4º, I, b' },
    } }] },
});
const calculate = (config: CourtConfig, state = input()) =>
    engine.calculateTotal(mapStateToAgencyParams(state, config.orgSlug!, config));
const memory = (result: Awaited<ReturnType<typeof calculate>>) => result.breakdown.abateTeto as AbateTetoMemory;

for (const slug of ['jmu', 'cjf']) {
    test(slug + ': teto em centavos e ordem das retenções', async () => {
        for (const [salary, gross, discount] of [[19000, 45600, 0], [19319.245, 46366.19, 0], [19319.25, 46366.20, 0.01], [20000, 48000, 1633.81]]) {
            // Fronteiras em centavos usam GAJ percentual com vencimento inteiro quando possível.
            const config = court(slug, salary);
            if (discount <= 0.01) {
                config.bases.salario.teste.A1 = gross;
                config.payrollRules!.gajRate = 0;
            }
            const result = await calculate(config);
            const taxable = Math.min(gross, limit);
            const pss = taxable * 0.1;
            const irrf = (taxable - pss) * 0.2 - 100;
            assert.equal(memory(result).status, 'ready');
            assert.equal(memory(result).amount, discount);
            assert.equal(memory(result).monthlyGross, gross);
            assert.equal(round(memory(result).irBefore!), gross);
            assert.equal(round(memory(result).irAfter!), taxable);
            assert.equal(round(memory(result).rppsBefore!), gross);
            assert.equal(round(memory(result).rppsAfter!), taxable);
            assert.equal(round(result.breakdown.pss), round(pss));
            assert.equal(round(result.breakdown.irrf), round(irrf));
            assert.equal(round(result.totalDeductions), round(discount + pss + irrf));
            assert.equal(round(result.netSalary), round(taxable - pss - irrf));
        }
    });

    test(slug + ': abono recalculado, benefício excluído e RPPS limitado ao RGPS', async () => {
        const config = court(slug, 20000);
        const result = await calculate(config, input({ recebeAbono: true, auxAlimentacao: 100 }));
        const pss = limit * 0.1;
        const irrf = limit * 0.2 - 100;
        assert.equal(round(result.breakdown.abono), round(pss));
        assert.equal(round(result.breakdown.irrf), round(irrf));
        assert.equal(memory(result).monthlyGross, 48000);
        assert.deepEqual(memory(result).components?.filter(row => row.kind === 'excluded').map(row => row.code).sort(), ['abono', 'auxAlimentacao']);
        assert.equal(round(result.netSalary), round(limit + 100 - irrf));

        const limited = await calculate(config, input({ regimePrev: 'rpc' }));
        assert.equal(memory(limited).amount, 1633.81);
        assert.equal(round(limited.breakdown.pss), 800);
        assert.equal(round(limited.breakdown.irrf), round((limit - 800) * 0.2 - 100));
    });
}



test('preserva histórico, respeita ativação e distingue cenários fora do piloto', async () => {
    const config = court('jmu', 20000);
    assert.equal(INITIAL_STATE.abateTetoVersion, 1);
    const old = hydrateCalculatorState({ ...input(), abateTetoVersion: undefined });
    assert.equal(old.abateTetoVersion, undefined);
    assert.equal((await calculate(config, old)).breakdown.abateTeto, undefined);
    const reopened = hydrateCalculatorState(JSON.parse(JSON.stringify(input())));
    assert.equal(reopened.abateTetoVersion, 1);
    assert.equal(memory(await calculate(config, reopened)).amount, 1633.81);
    for (const state of [input({ mesRef: 'OUTUBRO' }), input({ heQtd50: 1 }), input({ ferias1_3: 1 })]) {
        const result = await calculate(config, state);
        assert.equal(memory(result).status, 'out_of_scope');
        assert.equal(memory(result).amount, 0);
    }
    const missingLimit = await calculate({ ...config, constitutionalCeilingReference: undefined });
    assert.equal(memory(missingLimit).status, 'pending');
});

test('mantém fora do piloto as folhas sem classificação mensal homologada', async () => {
    const config = court('jmu', 20000);
    const monthly = mapStateToAgencyParams(input(), 'jmu', config);
    const noSubstitution = { total: 0, entries: [] };
    const fixedVpni = {
        id: 'synthetic', descricao: 'VPNI sintética', valor: 100, tipo: 'C' as const,
        vantagemPessoal: 'VPNI' as const, incideIR: true, incidePSS: true, isEA: false,
        pssCompetenciaSeparada: false,
    };
    const cases = [
        [{ ...monthly, funprespParticipacao: 'patrocinado' as const }, /previdência complementar/],
        [{ ...monthly, rubricasExtras: [{ ...fixedVpni, vantagemPessoal: null }] }, /rubrica manual/],
        [{ ...monthly, rubricasExtras: [{ ...fixedVpni, isEA: true }] }, /competência original/],
        [{ ...monthly, gaactaAtivo: true }, /GAACTA/],
        [{ ...monthly, licencaDias: 1 }, /licença compensatória/],
        [{ ...monthly, agencyConfig: {
            ...config, abateTetoActivation: { versions: [{ valid_from: start, valid_to: null, enabled: false }] },
        } }, /fora da ativação/],
    ] as const;
    for (const [params, reason] of cases) {
        const result = await calculateAbateTeto(params, noSubstitution, 0);
        assert.equal(result?.status, 'out_of_scope');
        assert.equal(result.amount, 0);
        assert.match(result.reason ?? '', reason);
    }

    const mixed = await calculateAbateTeto({ ...monthly, periodo: 0, aqTreinoPerc: 0.01 }, noSubstitution, 0);
    assert.equal(mixed?.status, 'pending');
    assert.match(mixed.reason ?? '', /incidências distintas/);
    assert.equal(mixed.components?.find(item => item.code === 'aqTreino')?.amount, 200);
});

test('holerite e exportações registram o abate uma vez, com memória e bloqueio de incidências mistas', async () => {
    const config = court('cjf', 20000);
    let current = input();
    let latest!: ReturnType<typeof useCalculatorResults>;
    const agency = { slug: 'cjf', name: 'CJF', type: 'judiciary' };
    function Probe() {
        latest = useCalculatorResults(current, engine, config, agency);
        return React.createElement(AbateTetoDetails, { memory: latest.effectiveState.abateTetoMemory });
    }
    let tree!: ReturnType<typeof create>;
    await act(async () => { tree = create(React.createElement(Probe)); });
    try {
        assert.equal(latest.calculationStatus, 'ready', latest.calculationError ?? '');
        const rows = latest.resultRows.filter(row => row.label === 'Abate-teto constitucional');
        assert.deepEqual(rows, [{ label: 'Abate-teto constitucional', type: 'D', value: 1633.81 }]);
        assert.match(JSON.stringify(tree.toJSON()), /Memória do abate-teto/);
        const captures: Array<{ blob: Blob; filename: string }> = [];
        Object.assign(globalThis, { __abateTetoExports: captures });
        exportToPDF(latest.effectiveState, latest.resultRows, config);
        exportToExcel(latest.effectiveState, latest.resultRows, config);
        const pdf = captures.find(item => item.filename.endsWith('.pdf'));
        const excel = captures.find(item => item.filename.endsWith('.xlsx'));
        assert.ok(pdf && excel);
        const pdfText = Buffer.from(await pdf.blob.arrayBuffer()).toString('latin1');
        assert.match(pdfText, /Memória do abate-teto/);
        assert.match(pdfText, /Base de RPPS após o abate/);
        const workbook = XLSX.read(await excel.blob.arrayBuffer());
        const audit = workbook.Sheets['Memória do abate-teto'];
        assert.ok(audit);
        assert.match(JSON.stringify(XLSX.utils.sheet_to_json(audit, { header: 1 })), /1\.633,81/);

        current = input({ funcao: 'fc1', pssSobreFC: false });
        await act(async () => { tree.update(React.createElement(Probe)); });
        assert.equal(latest.calculationStatus, 'ceiling_pending');
        assert.match(latest.calculationError ?? '', /incidência/i);
        assert.equal(latest.resultRows.length, 0);
        assert.equal(latest.calculatedState.liquido, 0);
        assert.equal(latest.effectiveState.funcao, 'fc1');
        assert.ok(latest.effectiveState.abateTetoMemory?.composicaoBase?.some(item => item.code === 'fc'));
    } finally {
        act(() => tree.unmount());
    }
});

test('personalização da base do abate-teto altera cálculo, resolve pendência e persiste no estado e card', async () => {
    const config = court('jmu', 20000);
    // Desmarcar GAJ reduz a base mensal abaixo do teto
    const withoutGaj = await calculate(config, input({ abateTetoComposicao: { gaj: false } }));
    assert.equal(memory(withoutGaj).status, 'ready');
    assert.equal(memory(withoutGaj).monthlyGross, 20000);
    assert.equal(memory(withoutGaj).amount, 0);
    assert.equal(memory(withoutGaj).isCustomized, true);

    // Desmarcar parcela não contributiva (aqTreino) destrava pendência de incidência mista
    const withAqTreino = input({ periodo: 0, aqTreinoPerc: 0.01 });
    assert.equal(memory(await calculate(config, withAqTreino)).status, 'pending');
    const resolvedAqTreino = await calculate(config, { ...withAqTreino, abateTetoComposicao: { aqTreino: false } });
    assert.equal(memory(resolvedAqTreino).status, 'ready');
    assert.equal(memory(resolvedAqTreino).amount, 1633.81);

    // Marcar parcela excluída (auxAlimentacao) inclui na base quando abaixo do teto
    const withFoodInBase = await calculate(court('jmu', 10000), input({
        auxAlimentacao: 500,
        abateTetoComposicao: { auxAlimentacao: true },
    }));
    assert.equal(memory(withFoodInBase).status, 'ready');
    assert.equal(memory(withFoodInBase).monthlyGross, 24500);
    assert.equal(memory(withFoodInBase).isCustomized, true);

    // Hidratação preserva abateTetoComposicao
    const hydrated = hydrateCalculatorState(JSON.parse(JSON.stringify(input({ abateTetoComposicao: { gaj: false } }))));
    assert.deepEqual(hydrated.abateTetoComposicao, { gaj: false });

    // Interação no AbateTetoCard (Personalizar cálculo -> checkbox -> Aplicar ajustes)
    let saved: Record<string, boolean> | undefined;
    const baseMemory = memory(await calculate(config, input()));
    let cardTree!: ReturnType<typeof create>;
    await act(async () => {
        cardTree = create(React.createElement(AbateTetoCard, {
            memory: baseMemory,
            composicao: undefined,
            onChangeComposicao: next => { saved = next; },
            styles: { checkboxLabel: 'lbl', checkbox: 'chk' },
            calculationReady: true,
        }));
    });
    try {
        const customizeBtn = cardTree.root.findAllByType('button').find(b => b.children.join('').includes('Personalizar cálculo'));
        assert.ok(customizeBtn);
        await act(async () => { customizeBtn.props.onClick(); });

        const gajCheckbox = cardTree.root.findAllByType('input').find(i => i.props['aria-label'] === 'Incluir GAJ na base do abate-teto');
        assert.ok(gajCheckbox);
        assert.equal(gajCheckbox.props.checked, true);
        await act(async () => { gajCheckbox.props.onChange({ target: { checked: false } }); });

        const applyBtn = cardTree.root.findAllByType('button').find(b => b.children.join('') === 'Aplicar ajustes');
        assert.ok(applyBtn);
        await act(async () => { applyBtn.props.onClick(); });
        assert.deepEqual(saved, { gaj: false });
    } finally {
        act(() => cardTree.unmount());
    }
});
