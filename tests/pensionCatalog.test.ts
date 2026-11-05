import assert from 'node:assert/strict';
import test from 'node:test';
import type { PensionRubricRule, PrevidenciaComplementarConfig, Rubrica, CourtConfig } from '../src/types';
import type { IAgencyCalculationParams } from '../src/services/agency/engine/types';
import { INITIAL_STATE } from '../src/types';
import { mapStateToAgencyParams } from '../src/services/agency/adapters/stateToParams';
import { assessPensionRubric, resolvePensionRubricRule, validateMonthlyPensionRubrics, validatePensionRubric,
    validatePensionRubricCatalog } from '../src/services/agency/engine/modules/pensionCatalog';
import { assertPensionRubricsReady, PensionCalculationPendingError } from '../src/services/agency/engine/modules/pensionPending';
import { calculatePensionRetroactives } from '../src/services/agency/engine/modules/pensionCalculations';
import { mapEffectiveConfigToCourtConfig } from '../src/services/config/mapEffectiveConfig';

// Synthetic classifications exercise mechanics, never claim official eligibility for an actual allowance.
const rule = (id: string, classification: PensionRubricRule['classification'], patch: Partial<PensionRubricRule> = {}): PensionRubricRule => ({
    id, label: `Verba ${id}`, classification, validFrom: '2025-01', validTo: null, source: `https://example.test/${id}`, ...patch,
});
const configuration = (): PrevidenciaComplementarConfig => ({ enabled: true, scope: 'teste', baseRule: 'excedente_teto_rgps',
    sponsoredRate: { min: .05, max: .09, step: .005, defaultRpc: .085 }, facultativeRate: { minIfPositive: .025, default: 0 },
    linkedRate: { min: .05, max: .1, step: .005 }, includeThirteenth: true,
    rubricCatalog: [rule('required', 'obrigatoria'), rule('optional', 'facultativa'), rule('excluded', 'excluida'), rule('review', 'pendente')],
});
const rubric = (patch: Partial<Rubrica> = {}): Rubrica => ({ id: 'r', descricao: 'Valor manual', tipo: 'C', valor: 1000,
    incideIR: false, isEA: false, incidePSS: false, pssCompetenciaSeparada: false,
    incideFunpresp: true, pensionRubricId: 'required', ...patch });
const pending = (fn: () => unknown, message?: RegExp) => assert.throws(fn, error =>
    error instanceof PensionCalculationPendingError && error.rubricaIds.includes('r') && (!message || message.test(error.message)));

test('mandatory and excluded incidence are validated without changing PSS or contribution inputs', () => {
    const config = configuration();
    const required = rubric();
    const before = structuredClone(required);
    assert.equal(validatePensionRubric(config, required, '2026-07', 'patrocinado')?.classification, 'obrigatoria');
    assert.deepEqual(required, before);
    pending(() => validatePensionRubric(config, rubric({ incideFunpresp: false }), '2026-07', 'patrocinado'), /obrigatória/);
    pending(() => validatePensionRubric(config, rubric({ pensionRubricId: 'excluded' }), '2026-07', 'patrocinado'), /excluída/);
    assert.equal(validatePensionRubric(config, rubric({ pensionRubricId: 'excluded', incideFunpresp: false }), '2026-07', 'patrocinado')?.classification, 'excluida');
    assert.equal(validatePensionRubric(config, required, '2026-07', 'vinculado')?.classification, 'obrigatoria');
});

test('optional inclusion requires a genuine protocol date and documentary reference, not PSS incidence', () => {
    const config = configuration();
    const selected = rubric({ pensionRubricId: 'optional', pensionOptionDate: '2026-07-20', pensionOptionReference: 'Protocolo sintético 1', pensionOptionAmountConfirmed: true });
    assert.equal(validatePensionRubric(config, selected, '2026-07', 'patrocinado')?.classification, 'facultativa');
    assert.equal(selected.incidePSS, false);
    assert.doesNotThrow(() => validatePensionRubric(config, rubric({ pensionRubricId: 'optional', incideFunpresp: false }), '2026-07', 'patrocinado'));
    for (const date of [undefined, '', '2026-02-30', '2025-02-29', '2026-13-01', '2026-08-01', '2026-07']) {
        pending(() => validatePensionRubric(config, { ...selected, pensionOptionDate: date }, '2026-07', 'patrocinado'), /data real/);
    }
    pending(() => validatePensionRubric(config, { ...selected, pensionOptionReference: ' ' }, '2026-07', 'patrocinado'), /referência/);
    pending(() => validatePensionRubric(config, { ...selected, pensionOptionAmountConfirmed: false }, '2026-07', 'patrocinado'), /parcela elegível/);
    assert.doesNotThrow(() => validatePensionRubric(config, { ...selected, pensionOptionDate: '2026-07-01', pensionOptionAmountConfirmed: false }, '2026-07', 'patrocinado'));
    assert.doesNotThrow(() => validatePensionRubric(config, { ...selected, pensionOptionDate: '2024-02-29' }, '2026-07', 'patrocinado'));
});

test('unknown, pending, unsourced or noncurrent classifications cannot certify participant credits', () => {
    pending(() => validatePensionRubric(undefined, rubric(), '2026-07', 'patrocinado'), /cadastro/);
    pending(() => validatePensionRubric(configuration(), rubric({ pensionRubricId: undefined, incideFunpresp: false }), '2026-07', 'patrocinado'), /natureza/);
    pending(() => validatePensionRubric(configuration(), rubric({ pensionRubricId: 'review' }), '2026-07', 'patrocinado'), /revisão administrativa/);
    const expired = configuration(); expired.rubricCatalog![0].validTo = '2026-07';
    pending(() => validatePensionRubric(expired, rubric(), '2026-07', 'patrocinado'), /vigente/);
    const unsourced = configuration(); unsourced.rubricCatalog![0].source = '';
    pending(() => validatePensionRubric(unsourced, rubric(), '2026-07', 'patrocinado'), /fonte/);
});

test('nonparticipants without incidence need no classification, but explicit inclusion cannot bypass exclusions', () => {
    assert.equal(validatePensionRubric(undefined, rubric({ incideFunpresp: false, pensionRubricId: undefined }), '2026-07', 'nao'), null);
    pending(() => validatePensionRubric(configuration(), rubric({ pensionRubricId: 'excluded' }), '2026-07', 'nao'), /excluída/);
    assert.equal(validatePensionRubric(configuration(), rubric(), '2026-07', 'nao')?.classification, 'obrigatoria');
    assert.equal(validatePensionRubric(undefined, rubric({ tipo: 'D', incideFunpresp: false }), '2026-07', 'patrocinado'), null);
});

test('catalog versions use exclusive ends and reject ambiguous periods or malformed configuration', () => {
    const config = configuration();
    config.rubricCatalog = [rule('v', 'obrigatoria', { validTo: '2026-07' }), rule('v', 'excluida', { validFrom: '2026-07' })];
    assert.equal(resolvePensionRubricRule(config, 'v', '2026-06').classification, 'obrigatoria');
    assert.equal(resolvePensionRubricRule(config, 'v', '2026-07').classification, 'excluida');
    config.rubricCatalog[0].validTo = '2026-08';
    assert.throws(() => validatePensionRubricCatalog(config.rubricCatalog), /sobrepostas/);
    for (const malformed of [null, {}, [rule('v', 'obrigatoria', { source: '' })], [rule('v', 'obrigatoria', { validTo: '2024-01' })]]) {
        assert.throws(() => validatePensionRubricCatalog(malformed));
    }
});

test('a timing flag alone cannot omit mandatory monthly classification while real historical credits use their source period', () => {
    const params = { competencia: '2026-07', funprespParticipacao: 'patrocinado',
        agencyConfig: { previdenciaComplementar: configuration() },
        rubricasExtras: [rubric({ incideFunpresp: false, funprespCompetenciaSeparada: true })] } as IAgencyCalculationParams;
    pending(() => validateMonthlyPensionRubrics(params), /obrigatória/);
    params.rubricasExtras = [rubric({ funprespCompetenciaSeparada: true, pensionRubricId: undefined })];
    assert.doesNotThrow(() => validateMonthlyPensionRubrics(params));
    pending(() => assertPensionRubricsReady(params), /históricas/);
    params.rubricasExtras = [rubric({ incideFunpresp: false, pssCompetenciaSeparada: true })];
    pending(() => assertPensionRubricsReady(params), /históricas/);
    params.rubricasExtras = [rubric({ pssCompetenciaSeparada: true, funprespCompetenciaSeparada: false, pensionRubricId: 'excluded' })];
    pending(() => validateMonthlyPensionRubrics(params), /excluída/);
});

test('current nonparticipation cannot release a positive PSS-only historical credit without verified links', () => {
    const params = { competencia: '2026-07', funprespParticipacao: 'nao',
        agencyConfig: { previdenciaComplementar: configuration() },
        rubricasExtras: [rubric({ incideFunpresp: false, pssCompetenciaSeparada: true, pensionRubricId: undefined })],
        pensionRetroEntries: [],
    } as unknown as IAgencyCalculationParams;
    pending(() => assertPensionRubricsReady(params), /históricas verificáveis/);
    // An isolated legacy entry cannot stand in for original-competence provenance of a marked credit.
    params.pensionRetroEntries = [{ id: 'legacy', competencia: '2025-07', modo: 'manual',
        ajusteRpps: 10, ajusteComplementar: 0, justificativa: 'Documento de teste' }];
    pending(() => assertPensionRubricsReady(params), /históricas verificáveis/);
    params.rubricasExtras = [];
    assert.doesNotThrow(() => assertPensionRubricsReady(params));
});

const historicalParams = () => {
    const config = configuration();
    const old = configuration(); old.rubricCatalog![0].validFrom = '2025-01';
    config.rubricCatalog![0].classification = 'excluida';
    config.historicalRules = [{ id: 'historical', validFrom: '2025-01', validTo: '2026-01', source: 'https://example.test/history',
        tabelaPSS: 'old', configuration: old }];
    const court: CourtConfig = { bases: { salario: { teste: { A1: 6000 } }, funcoes: {} }, values: {},
        historico_pss: { old: { teto_rgps: 5000, faixas: [{ min: 0, max: 100000, rate: .1 }] } }, previdenciaComplementar: config };
    return { ...mapStateToAgencyParams({ ...INITIAL_STATE, cargo: 'teste', padrao: 'A1', funcao: '0', regimePrev: 'antigo',
        funprespParticipacao: 'nao', rubricasExtras: [rubric({ funprespCompetenciaSeparada: true })],
        pensionRetroEntries: [{ id: 'e', competencia: '2025-07', modo: 'completo', tipo: 'mensal', destinoIR: 'ea',
            tabelaPSS: 'old', regimePrev: 'rpc', participacao: 'patrocinado', regraHistoricaId: 'historical',
            vinculos: [{ rubricaId: 'r', valor: 1000 }], baseRppsOriginal: 4500, baseComplementarOriginal: 4500,
            contribuicaoRppsRecolhida: 450, contribuicaoComplementarRecolhida: 0, aliquotaNormal: .06, aliquotaFacultativa: 0 }],
    }, 'jmu', court), competencia: '2026-07' };
};

test('linked classification is resolved from the original rule catalog, not today catalog or participation', () => {
    const params = historicalParams();
    const memory = calculatePensionRetroactives(params)[0];
    assert.equal(memory.complementar, 30);
    assert.deepEqual(memory.enquadramentos, [{ rubricaId: 'r', ruleId: 'required', classification: 'obrigatoria',
        source: 'https://example.test/required', competencia: '2025-07' }]);
    assert.deepEqual(validateMonthlyPensionRubrics(params), []);
    delete params.agencyConfig!.previdenciaComplementar!.historicalRules![0].configuration.rubricCatalog;
    pending(() => calculatePensionRetroactives(params), /cadastro/);
});

test('historical optional election must already exist in the original competence', () => {
    const params = historicalParams();
    params.rubricasExtras![0].pensionRubricId = 'optional';
    params.rubricasExtras![0].pensionOptionDate = '2026-01-01';
    params.rubricasExtras![0].pensionOptionReference = 'Documento sintético';
    pending(() => calculatePensionRetroactives(params), /data real/);
    params.rubricasExtras![0].pensionOptionDate = '2025-07-15';
    pending(() => calculatePensionRetroactives(params), /parcela elegível/);
    params.rubricasExtras![0].pensionOptionAmountConfirmed = true;
    const memory = calculatePensionRetroactives(params)[0];
    assert.equal(memory.complementar, 30);
    assert.deepEqual(memory.enquadramentos, [{ rubricaId: 'r', ruleId: 'optional', classification: 'facultativa',
        source: 'https://example.test/optional', competencia: '2025-07', optionDate: '2025-07-15',
        optionReference: 'Documento sintético', optionAmountConfirmed: true }]);
});

test('audit assessments include only validated option metadata and their own catalog source', () => {
    const entry = rubric({ pensionOptionDate: 'invalid', pensionOptionReference: 'unverified', pensionOptionAmountConfirmed: true });
    assert.deepEqual(assessPensionRubric(configuration(), entry, '2026-07', 'patrocinado'), {
        rubricaId: 'r', ruleId: 'required', classification: 'obrigatoria', source: 'https://example.test/required', competencia: '2026-07',
    });
    assert.equal(assessPensionRubric(undefined, { ...entry, incideFunpresp: false }, '2026-07', 'nao'), null);
    pending(() => assessPensionRubric(configuration(), { ...entry, pensionRubricId: 'optional' }, '2026-07', 'patrocinado'));
});

test('configuration mapping preserves current and historical catalogs independently', () => {
    const raw = { enabled: true, scope: 'teste', base_rule: 'excedente_teto_rgps', include_thirteenth: true,
        sponsored_rate: { min: .05, max: .09, step: .005, default_rpc: .085 }, facultative_rate: { min_if_positive: .025, default: 0 },
        rubric_catalog: [{ id: 'v', label: 'Verba', classification: 'excluida', valid_from: '2026-01', source: 'https://example.test/current' }] };
    const effective = { org_slug: 'jmu', org_name: 'JMU', power_name: 'PJU', previdencia_complementar: { ...raw,
        historical_rules: [{ id: 'old', valid_from: '2025-01', valid_to: '2026-01', source: 'https://example.test/old', tabela_pss: 'old',
            configuration: { ...raw, rubric_catalog: [{ ...raw.rubric_catalog[0], classification: 'obrigatoria', valid_from: '2025-01' }] } }] } } as any;
    const mapped = mapEffectiveConfigToCourtConfig(effective);
    assert.equal(mapped.previdenciaComplementar?.rubricCatalog?.[0].classification, 'excluida');
    assert.equal(mapped.previdenciaComplementar?.historicalRules?.[0].configuration.rubricCatalog?.[0].classification, 'obrigatoria');
});
