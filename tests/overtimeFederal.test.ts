import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { act, create } from 'react-test-renderer';
import { calculateOvertime } from '../src/services/agency/engine/modules/overtimeCalculations';
import { buildPresetGrossLines } from '../src/components/Calculator/presetGrossLines';
import { OvertimeCard } from '../src/components/Calculator/cards/OvertimeCard';
import { configService } from '../src/services/config/ConfigService';
import { mapEffectiveConfigToCourtConfig } from '../src/services/config/mapEffectiveConfig';
import type { CourtConfig } from '../src/types';

// Mock Supabase para testar fallbacks do ConfigService
const mockDb = {
    global_config: [
        {
            config_key: 'pss_tables',
            config_value: { '2026': { ceiling: 8475.55, rates: [{ min: 0, max: null, rate: 0.14 }] } }
        },
        {
            config_key: 'ir_deduction',
            config_value: { '2025_maio': { deduction: 908.73, brackets: [] } }
        }
    ],
    power_config: [
        {
            power_name: 'PJU',
            config_key: 'payroll_rules',
            config_value: {
                gaj_rate: 1.40,
                specific_gratification_rate: 0.35,
                vr_rate_on_cj1: 0.05,
                month_day_divisor: 30,
                overtime_month_hours: 200,
                transport_workdays: 22,
                transport_discount_rate: 0.06,
                irrf_top_rate: 0.275
            }
        }
    ],
    org_config: [] as any[]
};

(globalThis as any).__supabaseMock = {
    from: (table: string) => {
        return {
            select: () => ({
                is: () => Promise.resolve({ data: (mockDb as any)[table] || [], error: null }),
                eq: (col: string, val: string) => ({
                    is: () => {
                        const rows = ((mockDb as any)[table] || []).filter((r: any) => r[col] === val);
                        return Promise.resolve({ data: rows, error: null });
                    },
                    maybeSingle: () => {
                        const row = ((mockDb as any)[table] || []).find((r: any) => r[col] === val);
                        return Promise.resolve({ data: row || null, error: null });
                    }
                })
            })
        };
    }
};

const makeMockConfig = (overtimeMonthHours = 200): CourtConfig => ({
    bases: {
        salario: {
            analista: { C13: 14852.66 },
            tecnico: { C13: 9052.83 }
        },
        funcoes: {
            fc1: 1000,
            fc5: 2662.06,
            cj2: 8822.98,
            sem_funcao: 0
        },
        valorVR: 357.20
    },
    historico_pss: {},
    historico_ir: {},
    values: {},
    payrollRules: {
        gajRate: 1.4,
        specificGratificationRate: 0.35,
        vrRateOnCj1: 0.05,
        monthDayDivisor: 30,
        overtimeMonthHours,
        transportWorkdays: 22,
        transportDiscountRate: 0.06,
        irrfTopRate: 0.275
    },
    careerCatalog: {
        noFunctionCode: 'sem_funcao',
        noFunctionLabel: 'Sem Função',
        cargoLabels: {}
    }
});

test('HE em substituição zera destinos inferiores/iguais e aceita apenas destinos superiores', async () => {
    const base = {
        periodo: 0, cargo: 'analista', padrao: 'C13', funcao: 'fc5',
        tabelaPSS: '2026', tabelaIR: '2025_maio', regimePrev: 'rpc',
        recebeAbono: false, gratEspecificaTipo: 'nenhuma',
        aqTituloVR: 0, aqTreinoVR: 0, aqTituloPerc: 0, aqTreinoPerc: 0,
        agencyConfig: makeMockConfig(200)
    };
    const calculate = (funcao: string, target: string, gratEspecificaTipo = 'nenhuma') => calculateOvertime({
        ...base, funcao, gratEspecificaTipo,
        overtimeEntries: [{ id: 'he-subst', qtd50: 9, qtd100: 9, usarSubstituicaoFuncao: true,
            horasPorFuncao: { [target]: { qtd50: 10, qtd100: 5 } }, isEA: false, excluirIR: false }]
    });
    for (const target of ['fc1', 'fc5', 'sem_funcao', 'inexistente']) {
        const result = await calculate('fc5', target);
        assert.equal(result.heTotal, 0, `Destino ${target} não deve remunerar HE nesse modo, mesmo com horas globais residuais`);
        assert.equal(result.heVal50, 0);
        assert.equal(result.heVal100, 0);
    }
    const superior = await calculate('fc5', 'cj2');
    const normalCJ = await calculateOvertime({ ...base, funcao: 'cj2', overtimeEntries: [
        { id: 'he-normal', qtd50: 10, qtd100: 5, usarSubstituicaoFuncao: false, isEA: false, excluirIR: false }
    ] });
    assert.equal(superior.heTotal, normalCJ.heTotal);
    assert.ok(superior.heTotal > 0);
    assert.deepEqual(superior.entries[0].funcoesSubstituicaoElegiveis, ['cj2']);
    const imported = await calculateOvertime({ ...base, overtimeEntries: [
        { id: 'he-antiga', qtd50: 10, qtd100: 10, usarSubstituicaoFuncao: true,
            horasPorFuncao: { fc1: { qtd50: 10, qtd100: 5 } }, valorBrutoManual: 1000, isEA: true, excluirIR: false }
    ] });
    assert.equal(imported.heTotal, 0, 'Valor manual antigo não pode contornar a elegibilidade no modo de substituição');
    assert.equal((await calculate('cj2', 'fc5')).heTotal, 0);
    assert.equal((await calculate('cj2', 'cj2')).heTotal, 0);
    assert.ok((await calculate('sem_funcao', 'fc1')).heTotal > 0);
    for (const grat of ['gae', 'gas']) {
        assert.equal((await calculate('sem_funcao', 'fc1', grat)).heTotal, 0);
        assert.ok((await calculate('sem_funcao', 'cj2', grat)).heTotal > 0);
    }
});

test('OvertimeCard bloqueia destinos sem diferença inclusive em lançamentos já preenchidos', () => {
    const tree = create(React.createElement(OvertimeCard, {
        entry: { id: 'he', qtd50: 0, qtd100: 0, usarSubstituicaoFuncao: true, isEA: false, excluirIR: false,
            horasPorFuncao: { fc1: { qtd50: 10, qtd100: 5 } } },
        updateEntry: () => {}, functionKeys: ['fc1', 'fc5', 'cj2'], eligibleFunctionKeys: ['cj2'],
        competenciaReferencia: '2026-11', styles: {}, courtConfig: makeMockConfig()
    }));
    for (const key of ['FC1', 'FC5']) {
        for (const rate of ['50', '100']) {
            assert.equal(tree.root.findByProps({ 'aria-label': `${key} — Horas (${rate}%)` }).props.disabled, true);
        }
    }
    assert.equal(tree.root.findByProps({ 'aria-label': 'CJ2 — Horas (50%)' }).props.disabled, false);
    tree.unmount();
});

// =========================================================================
// Teste 1: Divisor 200 na Justiça Federal (Art. 46, caput e § 1º da Res. CJF 4/2008)
// =========================================================================
test('HE: composição por card, créditos por ID, abono e GAACTA sem resultado anterior', async () => {
    const agencyConfig = makeMockConfig();
    agencyConfig.historico_pss = { '2026': { teto_rgps: 8000, faixas: [{ min: 0, max: 999999, rate: 0.1 }] } };
    agencyConfig.gaactaRules = { enabled: true, versions: [{ validFrom: '2026-01', percentage: 0.15, reference: 'Regra sintética' }] };
    const off = Object.fromEntries(['vencimento', 'gaj', 'funcao', 'aqTitulo', 'aqTreino', 'grat', 'vpniLei', 'vpniDecisao', 'ats', 'abono'].map(key => [key, false]));
    const params: any = {
        periodo: 0, cargo: 'analista', padrao: 'C13', funcao: 'cj2', competencia: '2026-11',
        tabelaPSS: '2026', tabelaIR: '2025_maio', regimePrev: 'antigo', recebeAbono: true,
        pssSobreFC: true, aqTituloVR: 0, aqTreinoVR: 0, aqTituloPerc: 0, aqTreinoPerc: 0,
        gaactaAtivo: true, gaactaManualBase: true, gaactaBaseManualValor: 10000,
        agencyConfig, rubricasExtras: [{ id: 'credito', tipo: 'C', descricao: 'VPNI dinâmica', valor: 1000 }, { id: 'debito', tipo: 'D', valor: 9000 }],
        overtimeEntries: [
            { id: 'credit', qtd50: 10, qtd100: 0, composicaoBase: { ...off, 'rubrica:credito': true, 'rubrica:debito': true } },
            { id: 'gaacta', qtd50: 10, qtd100: 0, composicaoBase: { ...off, gaacta: true } },
            { id: 'abono', qtd50: 10, qtd100: 0, composicaoBase: { ...off, abono: true } },
            { id: 'zero', qtd50: 10, qtd100: 5, composicaoBase: off },
        ]
    };
    const result = await calculateOvertime(params);
    assert.equal(result.entries[0].heTotal, 75);
    assert.equal(result.entries[1].heTotal, 112.5);
    assert.equal(result.entries[2].heTotal, 333.52);
    assert.equal(result.entries[3].heTotal, 0);
    const legacyVpni = await calculateOvertime({ ...params, vpni_lei: 9999, vpni_decisao: 8888, recebeAbono: false,
        overtimeEntries: [{ ...params.overtimeEntries[0], composicaoBase: { ...off, vpniLei: true, vpniDecisao: true, 'rubrica:credito': true } }] });
    assert.equal(legacyVpni.heTotal, 75, 'VPNI entra pelo crédito dinâmico sem somar os campos legados');
    assert.equal(legacyVpni.entries[0].composicaoBase?.some(part => ['vpniLei', 'vpniDecisao'].includes(part.key)), false);
    params.gaactaManualBase = false;
    params.gaactaIncideAbono = true;
    params.rubricasExtras[0].incidePSS = true;
    const automatic = await calculateOvertime(params);
    assert.equal(automatic.entries[1].composicaoBase?.find(part => part.key === 'gaacta')?.valor, 7502.45,
        'GAACTA automática usa abono do PSS mensal, incluindo a rubrica contributiva');
    params.rubricasExtras = [];
    assert.equal((await calculateOvertime(params)).entries[0].heTotal, 0, 'Crédito removido deixa de compor a base');
    params.gaactaAtivo = false;
    assert.equal((await calculateOvertime(params)).entries[1].heTotal, 0, 'GAACTA removida não usa resultado residual');
    params.recebeAbono = false;
    assert.equal((await calculateOvertime(params)).entries[2].heTotal, 0);
});

test('OvertimeCard atualiza composição somente na instância selecionada e mantém escolhas anteriores', () => {
    let patch: any;
    const tree = create(React.createElement(OvertimeCard, {
        entry: { id: 'he-base', qtd50: 10, qtd100: 0, isEA: false, excluirIR: false, composicaoBase: { gaj: false } },
        updateEntry: (id, value) => { patch = { id, value }; }, functionKeys: [], competenciaReferencia: '2026-11', styles: {},
        baseItems: [{ key: 'abono', label: 'Abono de Permanência', valor: 100, selecionado: true }], baseTotal: 100
    }));
    const open = () => act(() => tree.root.findAllByType('button').find(button => button.children.includes('Personalizar cálculo'))!.props.onClick());
    open();
    const editor = tree.root.findByProps({ 'aria-label': 'Personalizar cálculo de Serviço Extraordinário' });
    assert.equal(editor.findAllByType('details').length, 1, 'Jornada avançada está disponível na personalização');
    assert.equal(editor.findAllByType('input').filter(input => input.props.type === 'checkbox').length, 1);
    assert.equal(JSON.stringify(tree.toJSON()).includes('Qtd. Horas (50%)'), false);
    assert.equal(JSON.stringify(tree.toJSON()).includes('Opções Tributárias'), false);
    assert.equal(JSON.stringify(tree.toJSON()).includes('Prestado no recesso forense'), false);
    act(() => tree.root.findByProps({ 'aria-label': 'Incluir Abono de Permanência na base de HE' }).props.onChange({ target: { checked: false } }));
    assert.equal(patch, undefined, 'Edição da base só é aplicada ao confirmar');
    act(() => tree.root.findAllByType('button').find(button => button.children.includes('Cancelar'))!.props.onClick());
    assert.equal(patch, undefined, 'Cancelar preserva a composição anterior');
    open();
    act(() => tree.root.findByProps({ 'aria-label': 'Incluir Abono de Permanência na base de HE' }).props.onChange({ target: { checked: false } }));
    act(() => tree.root.findAllByType('button').find(button => button.children.includes('Aplicar ajustes'))!.props.onClick());
    assert.equal(patch.id, 'he-base');
    assert.deepEqual(patch.value.composicaoBase, { gaj: false, abono: false });
    tree.unmount();
});

test('Hora Extra JF: Aplicação estrita do divisor 200 e eliminação do erro de 14.28% do divisor 175', async () => {
    const configJF = makeMockConfig(200);
    const config175 = makeMockConfig(175);

    const paramsBase = {
        periodo: 0,
        cargo: 'analista',
        padrao: 'C13',
        funcao: 'sem_funcao',
        tabelaPSS: '2026',
        tabelaIR: '2025_maio',
        regimePrev: 'rpc',
        recebeAbono: false,
        gratEspecificaTipo: 'nenhuma',
        aqTituloVR: 0,
        aqTreinoVR: 0,
        aqTituloPerc: 0,
        aqTreinoPerc: 0,
        overtimeEntries: [
            {
                id: 'he-1',
                qtd50: 10,
                qtd100: 10,
                isEA: false,
                excluirIR: false,
                usarSubstituicaoFuncao: false
            }
        ]
    };

    // Vencimento = 14.852,66 | GAJ (140%) = 20.793,724 | Remuneração = 35.646,384
    const res200 = await calculateOvertime({ ...paramsBase, agencyConfig: configJF });
    const res175 = await calculateOvertime({ ...paramsBase, agencyConfig: config175 });

    // Com divisor 200:
    // Valor hora normal = 35.646,384 / 200 = 178,23192
    // HE 50% (10h) = 178,23192 * 1.5 * 10 = 2.673,4788
    // HE 100% (10h) = 178,23192 * 2.0 * 10 = 3.564,6384
    // Total = 6.238,1172
    assert.equal(Math.round(res200.heVal50 * 100) / 100, 2673.48);
    assert.equal(Math.round(res200.heVal100 * 100) / 100, 3564.64);
    assert.equal(Math.round(res200.heTotal * 100) / 100, 6238.12);

    // Com divisor 175:
    // Valor hora normal = 35.646,384 / 175 = 203,69362
    // HE 50% = 3.055,40 | HE 100% = 4.073,87 | Total = 7.129,28
    assert.equal(Math.round(res175.heVal50 * 100) / 100, 3055.40);
    assert.equal(Math.round(res175.heVal100 * 100) / 100, 4073.87);

    // O divisor 175 cobraria ~14.28% a mais que o divisor 200 estabelecido pela Res. CJF 4/2008
    const razao = res175.heTotal / res200.heTotal;
    assert.ok(Math.abs(razao - (200 / 175)) < 0.001);
});

// =========================================================================
// Teste 2: Inclusão de Cargo em Comissão / Função de Confiança na Base da HE (Art. 46)
// =========================================================================
test('Hora Extra JF: Base de cálculo inclui retribuição de CJ/FC conforme Art. 46 da Res. CJF 4/2008', async () => {
    const configJF = makeMockConfig(200);

    const resComCJ = await calculateOvertime({
        periodo: 0,
        cargo: 'analista',
        padrao: 'C13',
        funcao: 'cj2', // CJ-2: 8.822,98
        tabelaPSS: '2026',
        tabelaIR: '2025_maio',
        regimePrev: 'rpc',
        recebeAbono: false,
        gratEspecificaTipo: 'nenhuma',
        aqTituloVR: 0,
        aqTreinoVR: 0,
        aqTituloPerc: 0,
        aqTreinoPerc: 0,
        agencyConfig: configJF,
        overtimeEntries: [
            {
                id: 'he-cj',
                qtd50: 10,
                qtd100: 0,
                isEA: false,
                excluirIR: false,
                usarSubstituicaoFuncao: false
            }
        ]
    });

    // Remuneração total = 35.646,384 + 8.822,98 = 44.469,364
    // Valor hora = 44.469,364 / 200 = 222,34682
    // HE 50% (10h) = 222,34682 * 1.5 * 10 = 3.335,2023
    assert.equal(Math.round(resComCJ.heVal50 * 100) / 100, 3335.20);
});

// =========================================================================
// Teste 3: ConfigService entrega overtime_month_hours = 200 para CJF e TRFs
// =========================================================================
test('ConfigService: Retorna overtime_month_hours = 200 para CJF e TRFs na configuração efetiva', async () => {
    configService.clearCache();
    const effectiveCJF = await configService.getEffectiveConfig('cjf');
    assert.ok(effectiveCJF.payroll_rules, 'payroll_rules deve existir na configuração do CJF');
    assert.equal(effectiveCJF.payroll_rules.overtime_month_hours, 200);

    const courtConfig = mapEffectiveConfigToCourtConfig(effectiveCJF);
    assert.ok(courtConfig.payrollRules, 'courtConfig deve conter payrollRules');
    assert.equal(courtConfig.payrollRules.overtimeMonthHours, 200);

    // TRF1 também deve herdar 200
    configService.clearCache();
    const effectiveTRF1 = await configService.getEffectiveConfig('trf1');
    assert.equal(effectiveTRF1.payroll_rules.overtime_month_hours, 200);
});

// =========================================================================
// Teste 4: JMU adota Resolução STM Nº 374/2025 com divisor 175 e teto 30h
// =========================================================================
test('Hora Extra JMU: Divisor 175 para jornada de 35h e teto de 30h (Resolução STM 374/2025 c/ Res. 399/2026)', async () => {
    const configJMU = makeMockConfig(175);
    configJMU.orgSlug = 'jmu';

    const params = {
        periodo: 0,
        cargo: 'tecnico',
        padrao: 'C13', // 9052.83
        funcao: 'sem_funcao',
        tabelaPSS: '2026',
        tabelaIR: '2025_maio',
        regimePrev: 'rpc',
        recebeAbono: false,
        gratEspecificaTipo: 'nenhuma',
        aqTituloVR: 0,
        aqTreinoVR: 0,
        aqTituloPerc: 0,
        aqTreinoPerc: 0,
        agencyConfig: configJMU,
        overtimeEntries: [
            {
                id: 'he-jmu',
                qtd50: 10,
                qtd100: 0,
                isEA: false,
                excluirIR: false,
                usarSubstituicaoFuncao: false
            }
        ]
    };

    // Vencimento = 9.052,83 | GAJ (140%) = 12.673,962 | Remuneração = 21.726,792
    // Divisor 175: 21.726,792 / 175 = 124,153097
    // HE 50% (10h) = 124,153097 * 1.5 * 10 = 1.862,30
    const res = await calculateOvertime(params);
    assert.equal(Math.round(res.heVal50 * 100) / 100, 1862.30);
    assert.equal(res.entries[0].divisor, 175);
    assert.equal(res.entries[0].valorHoraNormal, 124.15);
});

// =========================================================================
// Teste 5: Divisor 150 para jornada de 30h semanais (Res. STM 374/2025, art. 7º, § 1º, II)
// =========================================================================
test('Hora Extra: Divisor 150 para jornada de 30h semanais (Res. STM 374/2025, art. 7º, § 1º, II)', async () => {
    const configJMU = makeMockConfig(175);
    configJMU.orgSlug = 'jmu';

    const params = {
        periodo: 0,
        cargo: 'tecnico',
        padrao: 'C13',
        funcao: 'sem_funcao',
        tabelaPSS: '2026',
        tabelaIR: '2025_maio',
        regimePrev: 'rpc',
        recebeAbono: false,
        gratEspecificaTipo: 'nenhuma',
        aqTituloVR: 0,
        aqTreinoVR: 0,
        aqTituloPerc: 0,
        aqTreinoPerc: 0,
        agencyConfig: configJMU,
        overtimeEntries: [
            {
                id: 'he-30h',
                qtd50: 10,
                qtd100: 5,
                isEA: false,
                excluirIR: false,
                usarSubstituicaoFuncao: false,
                divisor: 150,
                jornadaSemanal: 30
            }
        ]
    };

    // Remuneração = 21.726,792
    // Divisor 150: 21.726,792 / 150 = 144,84528
    // HE 50% (10h) = 144,84528 * 1.5 * 10 = 2.172,6792 -> 2.172,68
    // HE 100% (5h) = 144,84528 * 2.0 * 5 = 1.448,4528 -> 1.448,45
    // Total = 3.621,13
    const res = await calculateOvertime(params);
    assert.equal(res.heVal50, 2172.68);
    assert.equal(res.heVal100, 1448.45);
    assert.equal(res.heTotal, 3621.13);
    assert.equal(res.entries[0].divisor, 150);
    assert.equal(res.entries[0].valorHoraNormal, 144.85);
});

// =========================================================================
// Teste 6: Divisor 100 para jornada de 20h semanais (art. 7º, § 1º, III - médicos/especial)
// =========================================================================
test('Hora Extra: Divisor 100 para jornada de 20h semanais (Res. STM 374/2025, art. 7º, § 1º, III)', async () => {
    const configJMU = makeMockConfig(175);
    configJMU.orgSlug = 'jmu';

    const params = {
        periodo: 0,
        cargo: 'tecnico',
        padrao: 'C13',
        funcao: 'sem_funcao',
        tabelaPSS: '2026',
        tabelaIR: '2025_maio',
        regimePrev: 'rpc',
        recebeAbono: false,
        gratEspecificaTipo: 'nenhuma',
        aqTituloVR: 0,
        aqTreinoVR: 0,
        aqTituloPerc: 0,
        aqTreinoPerc: 0,
        agencyConfig: configJMU,
        overtimeEntries: [
            {
                id: 'he-20h',
                qtd50: 10,
                qtd100: 0,
                isEA: false,
                excluirIR: false,
                usarSubstituicaoFuncao: false,
                divisor: 100,
                jornadaSemanal: 20
            }
        ]
    };

    // Divisor 100: 21.726,792 / 100 = 217,26792
    // HE 50% (10h) = 217,26792 * 1.5 * 10 = 3.259,0188 -> 3.259,02
    const res = await calculateOvertime(params);
    assert.equal(res.heVal50, 3259.02);
    assert.equal(res.entries[0].divisor, 100);
    assert.equal(res.entries[0].valorHoraNormal, 217.27);
});

// =========================================================================
// Teste 7: Divisor calculado pela fórmula (Jornada ÷ 6) × 30 (art. 7º, § 2º)
// =========================================================================
test('Hora Extra: Fórmula (Jornada ÷ 6) × 30 para jornada de 25h semanais (divisor 125)', async () => {
    const configJF = makeMockConfig(200);

    // Jornada 25h -> (25 / 6) * 30 = 125
    const divisor25h = Math.round(((25 / 6) * 30) * 100) / 100;
    assert.equal(divisor25h, 125);

    const params = {
        periodo: 0,
        cargo: 'tecnico',
        padrao: 'C13',
        funcao: 'sem_funcao',
        tabelaPSS: '2026',
        tabelaIR: '2025_maio',
        regimePrev: 'rpc',
        recebeAbono: false,
        gratEspecificaTipo: 'nenhuma',
        aqTituloVR: 0,
        aqTreinoVR: 0,
        aqTituloPerc: 0,
        aqTreinoPerc: 0,
        agencyConfig: configJF,
        overtimeEntries: [
            {
                id: 'he-25h',
                qtd50: 10,
                qtd100: 0,
                isEA: false,
                excluirIR: false,
                usarSubstituicaoFuncao: false,
                divisor: divisor25h,
                jornadaSemanal: 25
            }
        ]
    };

    // Remuneração = 21.726,792
    // Divisor 125: 21.726,792 / 125 = 173,814336
    // HE 50% (10h) = 173,814336 * 1.5 * 10 = 2.607,21504 -> 2.607,22
    const res = await calculateOvertime(params);
    assert.equal(res.heVal50, 2607.22);
    assert.equal(res.entries[0].divisor, 125);
    assert.equal(res.entries[0].valorHoraNormal, 173.81);
});

// =========================================================================
// Teste 8: Múltiplas instâncias com divisores distintos isolados (PROJECT_RULES 4.8)
// =========================================================================
test('Hora Extra: Isolamento de múltiplas instâncias com divisores distintos na mesma folha', async () => {
    const configJMU = makeMockConfig(175);
    configJMU.orgSlug = 'jmu';

    const params = {
        periodo: 0,
        cargo: 'tecnico',
        padrao: 'C13',
        funcao: 'sem_funcao',
        tabelaPSS: '2026',
        tabelaIR: '2025_maio',
        regimePrev: 'rpc',
        recebeAbono: false,
        gratEspecificaTipo: 'nenhuma',
        aqTituloVR: 0,
        aqTreinoVR: 0,
        aqTituloPerc: 0,
        aqTreinoPerc: 0,
        agencyConfig: configJMU,
        overtimeEntries: [
            {
                id: 'he-mes-anterior-30h',
                qtd50: 10,
                qtd100: 0,
                isEA: true,
                excluirIR: false,
                usarSubstituicaoFuncao: false,
                divisor: 150
            },
            {
                id: 'he-mes-atual-35h',
                qtd50: 10,
                qtd100: 0,
                isEA: false,
                excluirIR: false,
                usarSubstituicaoFuncao: false,
                divisor: 175
            }
        ]
    };

    const res = await calculateOvertime(params);
    assert.equal(res.entries.length, 2);
    // Entrada 1: divisor 150 -> 2.172,68
    assert.equal(res.entries[0].divisor, 150);
    assert.equal(res.entries[0].heVal50, 2172.68);

    // Entrada 2: divisor 175 -> 1.862,30
    assert.equal(res.entries[1].divisor, 175);
    assert.equal(res.entries[1].heVal50, 1862.30);

    // Total consolidado
    assert.equal(res.heVal50, 4034.98);
});

// =========================================================================
// Teste 9: Memória de cálculo unitária incorporada ao resumo calculado
// =========================================================================
test('PresetGrossSummary: Memória de cálculo unitária incorporada ao resumo calculado da hora extra', async () => {
    const configJMU = makeMockConfig(175);
    configJMU.orgSlug = 'jmu';

    const calculatedEntries = [
        {
            id: 'he-1',
            heVal50: 1862.30,
            heVal100: 0,
            heTotal: 1862.30,
            isEA: false,
            excluirIR: false,
            divisor: 175,
            valorHoraNormal: 124.15,
            valorHora50: 186.23,
            valorHora100: 248.30
        }
    ];

    const state = {
        overtimeCalculatedEntries: calculatedEntries,
        overtimeEntries: [{ id: 'he-1', qtd50: 10, qtd100: 0, isEA: false, excluirIR: false, divisor: 175 }]
    } as any;

    const lines = buildPresetGrossLines({
        instance: { key: 'preset-he-1', presetId: 'hora_extra', overtimeEntryId: 'he-1' },
        state,
        courtConfig: configJMU,
        currentTables: { funcoes: {} },
        isNovoAQ: true,
        noFunctionCode: '',
        currentFunctionValue: 0,
        gratificacaoEspecificaCalculada: 0
    });

    // Confere se as linhas unitárias foram incorporadas no topo do resumo calculado
    assert.equal(lines.find(l => l.label === 'Valor da Hora Normal (divisor 175)')?.value, 124.15);
    assert.equal(lines.find(l => l.label === 'Valor unitário da Hora (+50%)')?.value, 186.23);
    assert.equal(lines.find(l => l.label === 'Valor unitário da Hora (+100%)')?.value, 248.30);
    assert.equal(lines.find(l => l.label === 'Total hora extra Bruto')?.value, 1862.30);
});

// =========================================================================
// Teste 10: Seleção e persistência do modo "Outra jornada personalizada"
// =========================================================================
test('OvertimeCard: jornada personalizada é aplicada somente ao confirmar', () => {
    const entry: any = { id: 'he', qtd50: 0, qtd100: 0, divisor: 175, jornadaSemanal: 35, jornadaPersonalizada: false };
    let patch: any;
    const tree = create(React.createElement(OvertimeCard, { entry, updateEntry: (_id, value) => { patch = value; }, functionKeys: [], competenciaReferencia: '2026-11', styles: {}, courtConfig: makeMockConfig() }));
    const click = (text: string) => act(() => tree.root.findAllByType('button').find(button => button.children.includes(text))!.props.onClick());
    click('Personalizar cálculo');
    act(() => tree.root.findByType('select').props.onChange({ target: { value: 'custom' } }));
    act(() => tree.root.findAllByType('input').find(input => input.props.placeholder === 'Ex: 25')!.props.onChange({ target: { value: '25' } }));
    assert.equal(patch, undefined);
    click('Cancelar');
    assert.equal(patch, undefined);
    click('Personalizar cálculo');
    act(() => tree.root.findByType('select').props.onChange({ target: { value: 'custom' } }));
    act(() => tree.root.findAllByType('input').find(input => input.props.placeholder === 'Ex: 25')!.props.onChange({ target: { value: '25' } }));
    click('Aplicar ajustes');
    assert.equal(patch.jornadaSemanal, 25);
    assert.equal(patch.divisor, 125);
    tree.unmount();
});

test('OvertimeCard: IR mensal, EA e exclusão são exclusivos e isolados por instância', () => {
    let entries: any[] = [
        { id: 'he-a', qtd50: 2, qtd100: 0, isEA: false, excluirIR: false },
        { id: 'he-b', qtd50: 3, qtd100: 0, isEA: false, excluirIR: false },
    ];
    const patches: string[] = [];
    const updateEntry = (id: string, patch: any) => {
        patches.push(id);
        entries = entries.map(entry => entry.id === id ? { ...entry, ...patch } : entry);
    };
    const render = () => React.createElement('div', {}, ...entries.map(entry => React.createElement(OvertimeCard, {
        key: entry.id, entry, updateEntry, functionKeys: [], competenciaReferencia: '11/2026', styles: {},
        courtConfig: { orgSlug: 'cjf' } as CourtConfig,
    })));
    const tree = create(render());
    const radio = (text: string) => tree.root.findAllByType(OvertimeCard)[0].findAllByType('label')
        .find(label => label.findAllByType('span').some(span => span.children.includes(text)))!.findByType('input');
    const change = (text: string, checked: boolean) => act(() => {
        radio(text).props.onChange();
        tree.update(render());
    });
    const ea = 'Exercícios anteriores (RRA)';
    assert.equal(JSON.stringify(tree.toJSON()).includes('Incidências na Folha Mensal'), false);
    const advanced = () => tree.root.findAllByType(OvertimeCard)[0].findAllByType('details').find(detail => detail.props.className === 'group/tax pt-1')!;
    assert.equal(advanced().props.open, false);
    assert.equal(JSON.stringify(tree.toJSON()).includes('PSS'), false);
    change(ea, true);
    assert.deepEqual(entries[0].competenciasEA, ['2025-12']);
    assert.equal(advanced().props.open, true);
    change('IR mensal', true);
    assert.equal(entries[0].isEA, false);
    assert.equal(entries[0].excluirIR, false);
    assert.deepEqual(entries[0].competenciasEA, ['2025-12'], 'Alternar preserva meses informados');
    change('Excluir do IR', true);
    assert.equal(entries[0].excluirIR, true);
    change(ea, true);
    assert.equal(entries[0].excluirIR, false);
    change('Excluir do IR', true);
    assert.equal(entries[0].isEA, false);
    assert.deepEqual(entries[1], { id: 'he-b', qtd50: 3, qtd100: 0, isEA: false, excluirIR: false });
    assert.ok(patches.every(id => id === 'he-a'));
    tree.unmount();
});
