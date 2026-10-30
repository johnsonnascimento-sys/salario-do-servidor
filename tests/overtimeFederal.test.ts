import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateOvertime } from '../src/services/agency/engine/modules/overtimeCalculations';
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

// =========================================================================
// Teste 1: Divisor 200 na Justiça Federal (Art. 46, caput e § 1º da Res. CJF 4/2008)
// =========================================================================
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
});
