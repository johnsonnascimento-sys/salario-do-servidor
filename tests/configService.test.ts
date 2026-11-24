import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { ConfigService, ConfigLoadError, ConfigNotFoundError } from '../src/services/config/ConfigService';
import { mapEffectiveConfigToCourtConfig } from '../src/services/config/mapEffectiveConfig';
import { resolveConstitutionalCeiling } from '../src/services/config/constitutionalCeiling';

// Mock helper to control Supabase responses per table
type QueryResult = { data: any; error: any };
let tableMocks: Record<string, (args: any) => QueryResult> = {};

(globalThis as any).__supabaseMock = {
    from: (table: string) => {
        let selectedColumns = '*';
        let isFilter: { column?: string; value?: any } = {};
        let eqFilters: Array<{ column: string; value: any }> = [];

        const builder: any = {
            select: (cols: string = '*') => {
                selectedColumns = cols;
                return builder;
            },
            is: (col: string, val: any) => {
                isFilter = { column: col, value: val };
                return builder;
            },
            eq: (col: string, val: any) => {
                eqFilters.push({ column: col, value: val });
                return builder;
            },
            single: async () => {
                const handler = tableMocks[table];
                if (!handler) return { data: null, error: new Error(`No mock for table ${table}`) };
                return handler({ table, selectedColumns, isFilter, eqFilters, method: 'single' });
            },
            maybeSingle: async () => {
                const handler = tableMocks[table];
                if (!handler) return { data: null, error: null };
                return handler({ table, selectedColumns, isFilter, eqFilters, method: 'maybeSingle' });
            },
            then: (resolve: any) => {
                const handler = tableMocks[table];
                const res = handler ? handler({ table, selectedColumns, isFilter, eqFilters, method: 'all' }) : { data: [], error: null };
                resolve(res);
            }
        };
        return builder;
    }
};

const defaultGlobalRecords = [
    { config_key: 'ir_deduction', config_value: { brackets: [] } },
    { config_key: 'pss_tables', config_value: { '2026': { teto_rgps: 8000 } } }
];

const defaultPowerRecords = [
    { power_name: 'PJU', config_key: 'salary_bases', config_value: { analista: { A1: 6000 } } },
    { power_name: 'PJU', config_key: 'dailies_rules', config_value: { derived_from_minister: { enabled: true, minister_per_diem: 1466.95 } } }
];

const commissionMigration = readFileSync(
    new URL('../supabase/migrations/20261124_commission_profiles.sql', import.meta.url), 'utf8');
const commissionRules = JSON.parse(commissionMigration.split('$commission$')[1]);
const rgpsTables = JSON.parse(commissionMigration.split('$rgps$')[1]);
const commissionOrgOverrides = JSON.parse(commissionMigration.split('$organs$')[1]);
const commissionIrMigration = readFileSync(
    new URL('../supabase/migrations/20261124_commission_payroll_ir.sql', import.meta.url), 'utf8');
const commissionIrPayroll = JSON.parse(commissionIrMigration.split('$payroll$')[1]);
const commissionIrBrackets = JSON.parse(commissionIrMigration.split('$brackets$')[1]);

test('CJ/FC: catálogo oficial preserva os valores integrais e a transição de julho/2026', () => {
    assert.equal(commissionRules.enabled, false);
    const [january, july] = commissionRules.versions;
    assert.equal(january.valid_from, '2026-01-01');
    assert.equal(january.valid_to, '2026-06-30');
    assert.equal(january.cj_integral.cj3, 15430.68);
    assert.equal(january.fc.fc3, 1644.51);
    assert.equal(july.valid_from, '2026-07-01');
    assert.equal(july.cj_integral.cj3, 16665.13);
    assert.equal(july.fc.fc3, 1776.07);
    assert.equal(Math.round(july.cj_integral.cj3 * july.cj_option_rate * 100) / 100, 10832.33);
    assert.equal(rgpsTables.versions[0].valid_to, '2026-12-31');
    assert.equal(rgpsTables.versions[0].teto, 8475.55);
    assert.equal(rgpsTables.versions[0].faixas[1].ate, 2902.84);
});

test('CJ/FC: ativação por órgão preserva o catálogo do poder e mapeia as tabelas globais', async () => {
    tableMocks = {
        global_config: () => ({ data: [
            { config_key: 'ir_deduction', config_value: { '2026_jan': {
                deduction: 908.73, valid_from: '2026-01-01', reference: 'RFB 2026',
                brackets: commissionIrBrackets, payroll: commissionIrPayroll,
                rra: { reductionApplicable: false, deductDependents: false, deductComplementaryPension: false },
            } } },
            { config_key: 'pss_tables', config_value: {} },
            { config_key: 'rgps_tables', config_value: rgpsTables }], error: null }),
        power_config: () => ({ data: [...defaultPowerRecords,
            { power_name: 'PJU', config_key: 'commission_rules', config_value: commissionRules }], error: null }),
        org_config: () => ({ data: { org_slug: 'trt2', org_name: 'TRT-2', power_name: 'PJU',
            configuration: { commission_rules: { enabled: true } } }, error: null }),
    };
    const effective = await new ConfigService().getEffectiveConfig('trt2');
    const court = mapEffectiveConfigToCourtConfig(effective);
    assert.equal(court.commission?.enabled, true);
    assert.equal(court.commission?.versions.length, 2);
    assert.equal(court.commission?.versions[1].cjIntegral.cj3, 16665.13);
    assert.equal(court.commission?.versions[0].validTo, '2026-06-30');
    assert.equal(court.rgps?.versions[0].teto, 8475.55);
    assert.equal(court.rgps?.versions[0].faixas[1].ate, 2902.84);
    assert.match(court.rgps?.versions[0].source ?? '', /gov\.br\/inss/);
    assert.equal(court.historico_ir_metadata?.['2026_jan'].payroll?.simplifiedDeduction, 607.20);
    assert.equal(court.historico_ir_metadata?.['2026_jan'].payroll?.reduction?.exemptIncome, 5000);
    assert.equal(court.historico_ir_metadata?.['2026_jan'].payroll?.reduction?.slope, 0.133145);
    assert.equal(court.historico_ir_metadata?.['2026_jan'].rra.reductionApplicable, false);
    assert.equal(commissionRules.enabled, false);
});

for (const org of ['jmu', 'cjf']) {
    test(`CJ/FC: referências locais de ${org} preservam ativação desabilitada e tabelas comuns`, async () => {
        tableMocks = {
            global_config: () => ({ data: [{ config_key: 'pss_tables', config_value: {} }], error: null }),
            power_config: () => ({ data: [...defaultPowerRecords,
                { power_name: 'PJU', config_key: 'commission_rules', config_value: commissionRules }], error: null }),
            org_config: () => ({ data: { org_slug: org, org_name: org, power_name: 'PJU', configuration: {
                commission_rules: commissionOrgOverrides[org],
            } }, error: null }),
        };
        const effective = await new ConfigService().getEffectiveConfig(org);
        const commission = mapEffectiveConfigToCourtConfig(effective).commission;
        assert.equal(commission?.enabled, false);
        assert.equal(commission?.versions[1].cjIntegral.cj3, 16665.13);
        assert.ok(commission?.gaactaSource?.url.startsWith('https://'));
        if (org === 'cjf') {
            assert.equal(commission?.dailiesFc?.amount, 695.49);
            assert.equal(commission?.dailiesFc?.validFrom, '2026-06-10');
            assert.equal(commission?.compensatoryLeave, undefined);
        } else {
            assert.equal(commission?.dailiesFc, undefined);
            assert.equal(commission?.compensatoryLeave?.validFrom, '2025-07-01');
            assert.equal(commission?.compensatoryLeave?.validTo, '2026-06-01');
        }
    });
}

test('ConfigService: erro operacional em org_config lança ConfigLoadError (não mascara erro)', async () => {
    tableMocks = {
        global_config: () => ({ data: defaultGlobalRecords, error: null }),
        power_config: () => ({ data: defaultPowerRecords, error: null }),
        org_config: () => ({ data: null, error: { message: 'Database connection failed', code: '500' } })
    };

    const service = new ConfigService();
    await assert.rejects(
        async () => { await service.getEffectiveConfig('cjf'); },
        (err: any) => {
            assert.ok(err instanceof ConfigLoadError);
            assert.match(err.message, /Falha operacional ao carregar configuração do órgão cjf/);
            return true;
        }
    );
});

test('ConfigService: erro operacional em global_config lança ConfigLoadError', async () => {
    tableMocks = {
        global_config: () => ({ data: null, error: { message: 'PG network timeout' } }),
        power_config: () => ({ data: defaultPowerRecords, error: null }),
        org_config: () => ({
            data: { org_slug: 'jmu', org_name: 'JMU', power_name: 'PJU', configuration: {} },
            error: null
        })
    };

    const service = new ConfigService();
    await assert.rejects(
        async () => { await service.getEffectiveConfig('jmu'); },
        (err: any) => {
            assert.ok(err instanceof ConfigLoadError);
            assert.match(err.message, /Falha operacional ao carregar configuração global/);
            return true;
        }
    );
});

test('ConfigService: erro operacional em power_config lança ConfigLoadError', async () => {
    tableMocks = {
        global_config: () => ({ data: defaultGlobalRecords, error: null }),
        power_config: () => ({ data: null, error: { message: 'Table locked' } }),
        org_config: () => ({
            data: { org_slug: 'jmu', org_name: 'JMU', power_name: 'PJU', configuration: {} },
            error: null
        })
    };

    const service = new ConfigService();
    await assert.rejects(
        async () => { await service.getEffectiveConfig('jmu'); },
        (err: any) => {
            assert.ok(err instanceof ConfigLoadError);
            assert.match(err.message, /Falha operacional ao carregar configuração do poder PJU/);
            return true;
        }
    );
});

test('ConfigService: ausência de configuração global lança ConfigNotFoundError', async () => {
    tableMocks = {
        global_config: () => ({ data: [], error: null }),
        power_config: () => ({ data: defaultPowerRecords, error: null }),
        org_config: () => ({
            data: { org_slug: 'jmu', org_name: 'JMU', power_name: 'PJU', configuration: {} },
            error: null
        })
    };

    const service = new ConfigService();
    await assert.rejects(
        async () => { await service.getEffectiveConfig('jmu'); },
        (err: any) => {
            assert.ok(err instanceof ConfigNotFoundError);
            assert.match(err.message, /Configuração global ativa não cadastrada/);
            return true;
        }
    );
});

test('ConfigService: chaves ativas duplicadas lançam ConfigLoadError', async () => {
    tableMocks = {
        global_config: () => ({
            data: [
                { config_key: 'ir_deduction', config_value: { v: 1 } },
                { config_key: 'ir_deduction', config_value: { v: 2 } }
            ],
            error: null
        }),
        power_config: () => ({ data: defaultPowerRecords, error: null }),
        org_config: () => ({
            data: { org_slug: 'jmu', org_name: 'JMU', power_name: 'PJU', configuration: {} },
            error: null
        })
    };

    const service = new ConfigService();
    await assert.rejects(
        async () => { await service.getEffectiveConfig('jmu'); },
        (err: any) => {
            assert.ok(err instanceof ConfigLoadError);
            assert.match(err.message, /Mais de uma versão global ativa/);
            return true;
        }
    );
});

test('ConfigService: órgão desconhecido ausente do banco lança ConfigNotFoundError', async () => {
    tableMocks = {
        global_config: () => ({ data: defaultGlobalRecords, error: null }),
        power_config: () => ({ data: defaultPowerRecords, error: null }),
        org_config: () => ({ data: null, error: null }) // maybeSingle retorna null quando não há registro
    };

    const service = new ConfigService();
    await assert.rejects(
        async () => { await service.getEffectiveConfig('orgao_inexistente'); },
        (err: any) => {
            assert.ok(err instanceof ConfigNotFoundError);
            assert.match(err.message, /Órgão orgao_inexistente não cadastrado/);
            return true;
        }
    );
});

test('ConfigService: CJF ausente do banco aciona fallback técnico transitório sem quebrar aplicação', async () => {
    tableMocks = {
        global_config: () => ({ data: defaultGlobalRecords, error: null }),
        power_config: () => ({ data: defaultPowerRecords, error: null }),
        org_config: () => ({ data: null, error: null }) // CJF ainda não cadastrado no banco remoto
    };

    const service = new ConfigService();
    const effective = await service.getEffectiveConfig('cjf');

    assert.equal(effective.org_slug, 'cjf');
    assert.equal(effective.power_name, 'PJU');
    assert.equal(effective.dailies_rules?.embarkation_label, 'Adicional de transporte');
    assert.equal(effective.dailies_rules?.derived_from_minister?.minister_per_diem, 1466.95);
    assert.equal(effective.dailies_rules?.derived_from_minister?.rates_percentages?.desembargador, 0.95);
    assert.equal(effective.dailies_rules?.derived_from_minister?.rates_percentages?.juiz, 0.9025);
    assert.equal(effective.dailies_rules?.derived_from_minister?.assistance_percentage, 0.80);
});

test('ConfigService: CJF presente no banco tem precedência canônica sobre qualquer fallback', async () => {
    const customBankMinisterRate = 1500.00;
    tableMocks = {
        global_config: () => ({ data: defaultGlobalRecords, error: null }),
        power_config: () => ({ data: defaultPowerRecords, error: null }),
        org_config: () => ({
            data: {
                org_slug: 'cjf',
                org_name: 'Conselho da Justiça Federal (Banco de Dados)',
                power_name: 'PJU',
                configuration: {
                    dailies_rules: {
                        embarkation_label: 'Adicional de deslocamento oficial',
                        derived_from_minister: {
                            enabled: true,
                            minister_per_diem: customBankMinisterRate,
                            rates_percentages: {
                                juiz: 0.9025
                            }
                        }
                    }
                }
            },
            error: null
        })
    };

    const service = new ConfigService();
    const effective = await service.getEffectiveConfig('cjf');

    assert.equal(effective.org_slug, 'cjf');
    assert.equal(effective.org_name, 'Conselho da Justiça Federal (Banco de Dados)');
    assert.equal(effective.dailies_rules?.embarkation_label, 'Adicional de deslocamento oficial');
    assert.equal(effective.dailies_rules?.derived_from_minister?.minister_per_diem, 1500.00);
});

test('ConfigService: provê gaacta_rules para JMU e CJF preservando vigência e percentual', async () => {
    tableMocks = {
        global_config: () => ({ data: defaultGlobalRecords, error: null }),
        power_config: () => ({ data: defaultPowerRecords, error: null }),
        org_config: (slug: string) => ({
            data: slug === 'jmu' ? {
                org_slug: 'jmu',
                org_name: 'Superior Tribunal Militar',
                power_name: 'PJU',
                configuration: {} // ainda sem migration de gaacta_rules no banco
            } : null,
            error: null
        })
    };

    const service = new ConfigService();
    const jmuEffective = await service.getEffectiveConfig('jmu');
    const cjfEffective = await service.getEffectiveConfig('cjf');

    assert.ok(jmuEffective.gaacta_rules?.enabled, 'JMU deve ter gaacta_rules habilitado');
    assert.equal(jmuEffective.gaacta_rules?.versions?.[0]?.percentage, 0.15);
    assert.equal(jmuEffective.gaacta_rules?.versions?.[0]?.validFrom, '2026-06');

    assert.ok(cjfEffective.gaacta_rules?.enabled, 'CJF deve ter gaacta_rules habilitado');
    assert.equal(cjfEffective.gaacta_rules?.versions?.[0]?.percentage, 0.15);
    assert.equal(cjfEffective.gaacta_rules?.versions?.[0]?.validFrom, '2026-06');
});

test('teto federal: JMU e CJF herdam a mesma série global da migration', async () => {
    const migration = readFileSync(new URL(
        '../supabase/migrations/20261125000000_constitutional_ceiling_reference.sql', import.meta.url,
    ), 'utf8');
    const reference = JSON.parse(migration.split('$ceiling$')[1]);
    tableMocks = {
        global_config: ({ isFilter }) => {
            assert.deepEqual(isFilter, { column: 'valid_to', value: null });
            return { data: [
                { config_key: 'pss_tables', config_value: {} },
                { config_key: 'constitutional_ceiling_reference', config_value: reference },
            ], error: null };
        },
        power_config: () => ({ data: defaultPowerRecords, error: null }),
        org_config: ({ eqFilters }) => ({ data: {
            org_slug: eqFilters[0].value, org_name: eqFilters[0].value.toUpperCase(),
            power_name: 'PJU', configuration: {},
        }, error: null }),
    };
    const service = new ConfigService();
    for (const slug of ['jmu', 'cjf']) {
        const court = mapEffectiveConfigToCourtConfig(await service.getEffectiveConfig(slug));
        assert.equal(court.orgSlug, slug);
        assert.deepEqual(court.constitutionalCeilingReference, reference);
        for (const [year, month, amount] of [[2023, 3, undefined], [2023, 4, 41650.92],
            [2024, 1, 41650.92], [2024, 2, 44008.52], [2025, 1, 44008.52],
            [2025, 2, 46366.19], [2026, 11, 46366.19]] as const) {
            assert.equal(resolveConstitutionalCeiling(court.constitutionalCeilingReference, year, month)?.amount, amount);
        }
    }
});
