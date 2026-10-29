import assert from 'node:assert/strict';
import test from 'node:test';
import { ConfigService, ConfigLoadError, ConfigNotFoundError } from '../src/services/config/ConfigService';

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
    assert.equal(effective.dailies_rules?.embarkation_label, 'Adicional de deslocamento');
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
