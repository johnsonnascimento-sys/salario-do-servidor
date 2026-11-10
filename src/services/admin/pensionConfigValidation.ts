import type { JsonObject } from '../../types/admin';
import { mapEffectiveConfigToCourtConfig } from '../config/mapEffectiveConfig';
import type { EffectiveConfig } from '../config/types';
import { validatePensionRubricCatalog } from '../agency/engine/modules/pensionCatalog';

const month = /^\d{4}-(0[1-9]|1[0-2])$/;
const object = (value: unknown): value is JsonObject => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const fail = (message: string): never => { throw new Error(`Configuração previdenciária: ${message}`); };
const stable = (value: unknown): string => JSON.stringify(value, (_key, item) => object(item)
  ? Object.fromEntries(Object.entries(item).sort(([left], [right]) => left.localeCompare(right))) : item);

/** The admin editor uses the same catalog contract as the calculation engine. No remote writes here. */
export const validatePensionConfigurationInput = (raw: unknown, partial = false): void => {
  if (!object(raw)) fail('informe um objeto JSON.');
  const value = raw as JsonObject;
  if (!partial || 'rubric_catalog' in value) {
    if (!Array.isArray(value.rubric_catalog)) fail('informe o catálogo de verbas com fonte e vigência.');
    const mapped = mapEffectiveConfigToCourtConfig({ org_slug: 'validation', org_name: 'Validation', power_name: 'PJU',
      previdencia_complementar: { ...value, historical_rules: undefined } } as unknown as EffectiveConfig);
    validatePensionRubricCatalog(mapped.previdenciaComplementar?.rubricCatalog);
  }
  if ('historical_rules' in value) {
    if (!Array.isArray(value.historical_rules)) fail('o histórico deve ser uma lista de versões.');
    const rules = value.historical_rules as JsonObject[];
    const ids = new Set<string>();
    for (const rule of rules) {
      if (!object(rule) || typeof rule.id !== 'string' || !rule.id.trim() || ids.has(rule.id) ||
          typeof rule.source !== 'string' || !rule.source.trim() || typeof rule.tabela_pss !== 'string' || !rule.tabela_pss.trim() ||
          typeof rule.valid_from !== 'string' || !month.test(rule.valid_from) ||
          (rule.valid_to != null && (typeof rule.valid_to !== 'string' || !month.test(rule.valid_to) || rule.valid_to <= rule.valid_from))) {
        fail('cada regra histórica exige ID único, fonte, tabela PSS e intervalo válido.');
      }
      ids.add(rule.id as string);
      if (!object(rule.configuration) || 'historical_rules' in rule.configuration) fail('a versão histórica exige uma configuração própria, sem histórico recursivo.');
      validatePensionConfigurationInput(rule.configuration);
      const config = rule.configuration as JsonObject;
      if (typeof config.enabled !== 'boolean' || config.base_rule !== 'excedente_teto_rgps' || typeof config.include_thirteenth !== 'boolean') {
        fail('a configuração histórica precisa declarar habilitação, base e tratamento do 13º.');
      }
      for (const key of ['sponsored_rate', 'linked_rate']) {
        const rate = config[key];
        if (!object(rate) || typeof rate.min !== 'number' || typeof rate.max !== 'number' || typeof rate.step !== 'number' ||
            !Number.isFinite(rate.min) || !Number.isFinite(rate.max) || !Number.isFinite(rate.step) ||
            rate.min < 0 || rate.max > 1 || rate.max < rate.min || rate.step <= 0) fail('grades de alíquotas históricas inválidas.');
      }
      const facultative = config.facultative_rate;
      if (!object(facultative) || typeof facultative.min_if_positive !== 'number' ||
          !Number.isFinite(facultative.min_if_positive) || facultative.min_if_positive < 0 || facultative.min_if_positive > 1) {
        fail('a configuração histórica exige limite facultativo explícito.');
      }
    }
    const sorted = [...rules].sort((left, right) => String(left.valid_from).localeCompare(String(right.valid_from)));
    for (let index = 1; index < sorted.length; index++) {
      if (sorted[index - 1].valid_to == null || String(sorted[index - 1].valid_to) > String(sorted[index].valid_from)) {
        fail('há regras históricas sobrepostas.');
      }
    }
  }
};

/** A new effective record must retain the contents of already published rule versions. */
export const validatePensionConfigurationChange = (previous: unknown, next: unknown, validFrom?: string): void => {
  validatePensionConfigurationInput(next);
  if (!object(previous) || !object(next)) return;
  for (const [field, identity] of [['rubric_catalog', (rule: JsonObject) => `${rule.id}:${rule.valid_from}`],
    ['historical_rules', (rule: JsonObject) => String(rule.id)]] as const) {
    if (!Array.isArray(previous[field])) continue;
    const nextRules = Array.isArray(next[field]) ? next[field] as JsonObject[] : [];
    for (const rule of previous[field] as JsonObject[]) {
      const updated = nextRules.find(item => identity(item) === identity(rule));
      if (!updated) fail('preserve as versões anteriores e acrescente uma nova vigência.');
      const { valid_to: previousEnd, ...oldContents } = rule;
      const { valid_to: nextEnd, ...newContents } = updated!;
      if (stable(oldContents) !== stable(newContents) || (previousEnd != null && previousEnd !== nextEnd)) {
        fail('uma regra publicada não pode ser reescrita; crie uma nova versão.');
      }
      if (previousEnd == null && nextEnd != null) {
        const boundary = validFrom?.slice(0, 7);
        if (!boundary || !month.test(boundary) || nextEnd !== boundary || !nextRules.some(item =>
          item.valid_from === boundary && identity(item) !== identity(rule) && (field !== 'rubric_catalog' || item.id === rule.id))) {
          fail('feche a regra aberta na vigência da nova versão, com uma regra sucessora explícita.');
        }
      }
    }
  }
};

/** Versioned catalogs belong to power_config; local editors cannot shadow or erase them. */
export const validateOrgPensionOverrideChange = (previous: unknown, next: unknown): void => {
  const before = object(previous) ? previous : {};
  const after = object(next) ? next : {};
  if (next !== undefined) validatePensionConfigurationInput(next, true);
  for (const field of ['rubric_catalog', 'historical_rules']) {
    if (stable(before[field]) !== stable(after[field])) {
      fail('catálogo e histórico devem ser versionados na configuração do poder; preserve o cadastro local existente.');
    }
  }
};
