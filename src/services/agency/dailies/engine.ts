import type { DailiesCalculationResult, DailiesConfigPayload, DailiesContext, DailiesInput, DailiesParcel, DailiesRate, DailiesRules, DailiesVersion, ResolvedDailiesConfig } from './types';

export class DailiesError extends Error {
  constructor(public code: string, message: string) { super(message); this.name = 'DailiesError'; }
}
const fail = (code: string, message: string): never => { throw new DailiesError(code, message); };
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const scopes = ['global', 'power', 'branch', 'org'] as const;
export function isDailiesDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value;
}
function requireDate(date: string) { if (!isDailiesDate(date)) fail('INVALID_DATE', `Data inválida: ${date}.`); }
const nextDate = (date: string): string => new Date(Date.parse(date + 'T00:00:00Z') + 86400000).toISOString().slice(0, 10);
function datesBetween(from: string, to: string): string[] {
  requireDate(from); requireDate(to);
  if (to < from) fail('INVERTED_DATES', 'A data final deve ser igual ou posterior à inicial.');
  const days = (Date.parse(to) - Date.parse(from)) / 86400000 + 1;
  if (days > 3660) fail('PERIOD_TOO_LONG', 'Informe período de até dez anos por simulação.');
  const dates: string[] = [];
  for (let d = from; d <= to; d = nextDate(d)) dates.push(d);
  return dates;
}
const positive = (value: unknown, name: string, allowZero = true): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || (!allowZero && value === 0)) fail('INVALID_NUMBER', `${name} deve ser um número ${allowZero ? 'não negativo' : 'positivo'}.`);
  return value as number;
};
function fraction(value: number, name: string) { positive(value, name); if (value > 1) fail('INVALID_FRACTION', `${name} deve estar entre zero e um.`); return value; }
const matching = (v: DailiesVersion, context: DailiesContext) => v.scope_key === ({ global: '*', power: context.power, branch: context.branch, org: context.org_slug })[v.scope_type];

/** Pure temporal resolution. A missing org/branch configuration never borrows from a sibling. */
export function resolveDailiesConfig(versions: DailiesVersion[], context: DailiesContext, date: string): ResolvedDailiesConfig {
  requireDate(date);
  const selected = versions.filter(v => v.status === 'published' && matching(v, context) && v.valid_from <= date && (!v.valid_to || v.valid_to >= date));
  if (!selected.some(v => v.scope_type === 'org' || v.scope_type === 'branch')) fail('CONFIG_GAP', `Sem configuração publicada do regime em ${date}.`);
  const result: ResolvedDailiesConfig = { date, context: copy(context), payload: {}, provenance: {}, versions: [] };
  for (const scope of scopes) {
    const candidates = selected.filter(v => v.scope_type === scope);
    if (candidates.length > 1) fail('OVERLAPPING_VERSIONS', `Vigências sobrepostas no nível ${scope} em ${date}.`);
    const version = candidates[0];
    if (!version) continue;
    requireDate(version.valid_from); if (version.valid_to) requireDate(version.valid_to);
    if (version.valid_to && version.valid_to < version.valid_from) fail('INVALID_VALIDITY', 'Vigência final anterior à inicial.');
    for (const key of result.payload.locked_rules || []) {
      if (version.payload.rules?.[key] !== undefined && JSON.stringify(version.payload.rules[key]) !== JSON.stringify(result.payload.rules?.[key])) fail('MANDATORY_RULE', `Override incompatível com regra obrigatória ${key}.`);
    }
    for (const section of ['rules', 'rates', 'references', 'limits', 'auxiliary', 'sources', 'rule_sources'] as const) {
      const incoming = version.payload[section];
      if (!incoming) continue;
      const target = (result.payload[section] ||= {}) as Record<string, unknown>;
      for (const [key, value] of Object.entries(incoming)) {
        if (section === 'limits') {
          const prior = result.payload.limits?.[key];
          const limit = value as NonNullable<DailiesConfigPayload['limits']>[string];
          if (prior?.mandatory && (limit.currency !== prior.currency || limit.applies_to !== prior.applies_to || limit.value > prior.value || !limit.mandatory)) fail('MANDATORY_LIMIT', `Override incompatível com limite obrigatório ${key}.`);
        }
        target[key] = copy(value);
        result.provenance[`${section}.${key}`] = { version_id: version.id, revision: version.revision, scope_type: scope, scope_key: version.scope_key, valid_from: version.valid_from, valid_to: version.valid_to };
      }
    }
    if (version.payload.locked_rules) {
      result.payload.locked_rules = [...new Set([...(result.payload.locked_rules || []), ...version.payload.locked_rules])];
      for (const key of result.payload.locked_rules) if (result.payload.rules?.[key] === undefined) fail('MISSING_RULE', `Regra obrigatória ${key} não definida.`);
    }
    result.versions.push(copy(version));
  }
  validateResolved(result);
  return result;
}

function validateResolved(config: ResolvedDailiesConfig) {
  const { payload } = config;
  for (const [id, source] of Object.entries(payload.sources || {})) {
    if (!source.title || !/^https:\/\//.test(source.url)) fail('INVALID_SOURCE', `Fonte ${id} deve ter título e URL HTTPS.`);
    for (const d of [source.published_on, source.effective_from, source.effective_to]) if (d) requireDate(d);
    if (source.effective_from && source.effective_to && source.effective_to < source.effective_from) fail('INVALID_SOURCE', `Vigência da fonte ${id} invertida.`);
  }
  for (const [id, rate] of Object.entries(payload.rates || {})) resolveRate(config, id);
  for (const ids of Object.values(payload.rule_sources || {})) validateSources(config, ids);
  for (const key of Object.keys(payload.rules || {})) validateSources(config, payload.rule_sources?.[key]);
  for (const [id, limit] of Object.entries(payload.limits || {})) {
    positive(limit.value, `Limite ${id}`);
    if (!/^[A-Z]{3}$/.test(limit.currency) || !['daily_rate', 'daily_gross', 'trip_gross'].includes(limit.applies_to)) fail('INVALID_LIMIT', `Limite ${id} inválido.`);
    validateSources(config, limit.source_ids);
  }
  for (const holiday of payload.auxiliary?.holidays || []) requireDate(holiday);
  if (payload.auxiliary?.weekend_days?.some(d => !Number.isInteger(d) || d < 0 || d > 6)) fail('INVALID_CALENDAR', 'Dias da semana inválidos.');
}
function validateSources(config: ResolvedDailiesConfig, ids?: string[]) {
  if (!ids?.length) fail('MISSING_SOURCE', 'Parâmetro sem fundamento documental identificado.');
  for (const id of ids) {
    const source = config.payload.sources?.[id];
    if (!source) fail('MISSING_SOURCE', `Fonte ${id} não encontrada.`);
    if ((source.effective_from && source.effective_from > config.date) || (source.effective_to && source.effective_to < config.date)) fail('SOURCE_VALIDITY', `Fonte ${id} não fundamenta o parâmetro em ${config.date}.`);
  }
}
export function resolveDailiesRate(config: ResolvedDailiesConfig, key: string) { return resolveRate(config, key); }
function resolveRate(config: ResolvedDailiesConfig, key: string, stack: string[] = []): { value: number; currency: string } {
  if (stack.includes(key)) fail('REFERENCE_CYCLE', `Referência circular: ${[...stack, key].join(' → ')}.`);
  const rate: DailiesRate = config.payload.rates?.[key];
  if (!rate) fail('MISSING_RATE', `Valor da categoria/referência ${key} não cadastrado.`);
  if (!/^[A-Z]{3}$/.test(rate.currency)) fail('INVALID_CURRENCY', `Moeda inválida em ${key}.`);
  validateSources(config, rate.source_ids);
  if (rate.kind === 'fixed') return { value: positive(rate.value, key), currency: rate.currency };
  positive(rate.percent, `Percentual ${key}`);
  let base: { value: number; currency: string };
  if (rate.kind === 'category_percent') base = resolveRate(config, rate.category, [...stack, key]);
  else if (rate.kind === 'reference_percent') {
    base = config.payload.references?.[rate.reference];
    if (!base) fail('MISSING_REFERENCE', `Referência ${rate.reference} não cadastrada.`);
    positive(base.value, rate.reference);
    validateSources(config, config.payload.references?.[rate.reference].source_ids);
  } else return fail('INVALID_RATE', `Forma de valor desconhecida em ${key}.`);
  if (base.currency !== rate.currency) fail('CURRENCY_MISMATCH', `Moedas incompatíveis em ${key}.`);
  return { value: base.value * rate.percent / 100, currency: rate.currency };
}
function requireRules(config: ResolvedDailiesConfig): DailiesRules {
  const rules = config.payload.rules || {};
  for (const key of ['temporal_basis', 'return_fraction', 'no_overnight_fraction', 'supplied_lodging_fraction', 'supplied_meals_fraction', 'rounding', 'decimals', 'deduct_meals', 'deduct_transport', 'deduction_days', 'deduction_cap']) {
    if (rules[key] === undefined) fail('MISSING_RULE', `Regra ${key} não configurada.`);
  }
  if (!['daily', 'departure'].includes(rules.temporal_basis) || !['half_up', 'half_even', 'truncate'].includes(rules.rounding) || !['business', 'all'].includes(rules.deduction_days) || !['daily_gross', 'none'].includes(rules.deduction_cap)) fail('INVALID_RULE', 'Regra de cálculo inválida.');
  if (typeof rules.deduct_meals !== 'boolean' || typeof rules.deduct_transport !== 'boolean') fail('INVALID_RULE', 'Regra de desconto inválida.');
  for (const key of ['return_fraction', 'no_overnight_fraction', 'supplied_lodging_fraction', 'supplied_meals_fraction'] as const) fraction(rules[key], key);
  if (rules.supplied_transport_fraction !== undefined) fraction(rules.supplied_transport_fraction, 'Fração transporte fornecido');
  if (rules.supplied_lodging_basis !== undefined && !['reduction', 'payable_fraction'].includes(rules.supplied_lodging_basis)) fail('INVALID_RULE', 'Base da hospedagem fornecida inválida.');
  if (rules.unit_decimals !== undefined && (!Number.isInteger(rules.unit_decimals) || rules.unit_decimals < 0 || rules.unit_decimals > 6)) fail('INVALID_ROUNDING', 'Casas decimais do valor unitário inválidas.');
  if (rules.unit_rounding !== undefined && !['half_up', 'half_even', 'truncate'].includes(rules.unit_rounding)) fail('INVALID_ROUNDING', 'Arredondamento unitário inválido.');
  if ((rules.unit_rounding === undefined) !== (rules.unit_decimals === undefined)) fail('INVALID_ROUNDING', 'Informe modo e casas decimais para fixação do valor unitário.');
  if (rules.supplied_reduction_combination !== undefined && !['multiply', 'add_reductions'].includes(rules.supplied_reduction_combination)) fail('INVALID_RULE', 'Combinação de reduções inválida.');
  for (const key of ['deduction_divisor', 'food_divisor', 'transport_divisor'] as const) if (rules[key] !== undefined) positive(rules[key], key, false);
  if (rules.deduct_meals) positive(rules.food_divisor ?? rules.deduction_divisor, 'Divisor alimentação', false);
  if (rules.deduct_transport) positive(rules.transport_divisor ?? rules.deduction_divisor, 'Divisor transporte', false);
  if (rules.deduction_fraction !== undefined && !['full_day', 'payable_fraction'].includes(rules.deduction_fraction)) fail('INVALID_RULE', 'Fração de desconto inválida.');
  for (const [id, factor] of Object.entries(rules.allowed_reductions || {})) fraction(factor, `Glosa ${id}`);
  if (rules.boarding && (!['once', 'per_leg'].includes(rules.boarding.count) || typeof rules.boarding.reduction_applies !== 'boolean')) fail('INVALID_RULE', 'Regra de embarque inválida.');
  if (rules.boarding && !config.payload.rates?.[rules.boarding.rate]) fail('MISSING_RATE', 'Valor do adicional de embarque não cadastrado.');
  for (const id of rules.additional_rates || []) if (!config.payload.rates?.[id]) fail('MISSING_RATE', `Adicional ${id} não cadastrado.`);
  if (!Number.isInteger(rules.decimals) || rules.decimals < 0 || rules.decimals > 6) fail('INVALID_ROUNDING', 'Casas decimais devem estar entre zero e seis.');
  return rules as DailiesRules;
}
export function roundDailies(value: number, decimals: number, mode: DailiesRules['rounding']): number {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 6 || !['half_up', 'half_even', 'truncate'].includes(mode)) fail('INVALID_ROUNDING', 'Arredondamento inválido.');
  if (!Number.isFinite(value) || Math.abs(value) * 10 ** decimals > Number.MAX_SAFE_INTEGER) fail('NUMERIC_RANGE', 'Resultado excede precisão numérica suportada.');
  if (value < 0) return -roundDailies(-value, decimals, mode);
  const factor = 10 ** decimals;
  const scaled = value * factor;
  const floor = Math.floor(scaled);
  const epsilon = Number.EPSILON * Math.max(1, Math.abs(scaled)) * 4;
  if (mode === 'truncate') return Math.trunc(scaled + epsilon) / factor;
  if (Math.abs(scaled - floor - 0.5) <= epsilon) return (mode === 'half_even' && floor % 2 === 0 ? floor : floor + 1) / factor;
  return Math.round(scaled) / factor;
}

/** The returned memory is detached from mutable UI/config objects and can be persisted verbatim. */
export function calculateDailies(input: DailiesInput, versions: DailiesVersion[], context: DailiesContext = { org_slug: input.org_slug }): DailiesCalculationResult {
  const result: DailiesCalculationResult = { available: false, issues: [], parcels: [], totals: {}, memory: { schema_version: 1, engine_version: '1', input: copy(input), context: copy(context), versions: [], parcels: [], totals: {} } };
  try {
    if (context.org_slug !== input.org_slug) fail('ORG_MISMATCH', 'O órgão do contexto difere da entrada.');
    if (!/^\d{4}-\d{2}$/.test(input.competence) || !isDailiesDate(input.competence + '-01')) fail('INVALID_COMPETENCE', 'Competência inválida.');
    let days: string[];
    if (input.mode === 'period') {
      if (!input.start_date || !input.end_date) fail('MISSING_DATES', 'Informe início e fim da viagem.');
      days = datesBetween(input.start_date, input.end_date);
    } else if (input.mode === 'quantity') {
      positive(input.quantity, 'Quantidade', false);
      if (input.normative_date) { requireDate(input.normative_date); days = [input.normative_date]; }
      else {
        const start = input.competence + '-01';
        const end = new Date(Date.UTC(Number(start.slice(0, 4)), Number(start.slice(5, 7)), 0)).toISOString().slice(0, 10);
        const configs = datesBetween(start, end).map(d => resolveDailiesConfig(versions, context, d));
        const identity = (c: ResolvedDailiesConfig) => JSON.stringify(c.versions.map(v => [v.id, v.revision]));
        if (configs.some(c => identity(c) !== identity(configs[0]))) fail('AMBIGUOUS_COMPETENCE', 'Há mais de uma configuração nesta competência. Informe a data normativa.');
        days = [start];
      }
    } else return fail('INVALID_MODE', 'Modo de cálculo inválido.');
    const departureConfig = resolveDailiesConfig(versions, context, days[0]);
    const departureRules = requireRules(departureConfig);
    const spansMultipleMonths = new Set(days.map(d => d.slice(0, 7))).size > 1;
    const tripGross: Record<string, number> = {};
    const currencyPrecision: Record<string, number> = {};
    const circumstances = input.circumstances || {};
    if (circumstances.reduction_fraction !== undefined) fail('INVALID_REDUCTION', 'Escolha uma glosa cadastrada; fator livre não é autorizado.');
    if (circumstances.boarding_legs !== undefined && (!Number.isInteger(circumstances.boarding_legs) || circumstances.boarding_legs < 1)) fail('INVALID_LEGS', 'Número de embarques deve ser inteiro positivo.');
    for (const [index, date] of days.entries()) {
      const config = departureRules.temporal_basis === 'departure' ? departureConfig : resolveDailiesConfig(versions, context, date);
      const rules = requireRules(config);
      const round = (v: number) => roundDailies(v, rules.decimals, rules.rounding);
      // A ceiling cannot be rounded upward beyond its remaining amount. This
      // only constrains an already rounded credit to its representable quantum.
      const capped = (value: number, ceiling: number) => Math.min(value, roundDailies(Math.max(0, ceiling), rules.decimals, 'truncate'));
      const rate = resolveRate(config, input.category);
      currencyPrecision[rate.currency] = Math.max(currencyPrecision[rate.currency] ?? 0, rules.decimals);
      const sumMoney = (value: number) => roundDailies(value, currencyPrecision[rate.currency], 'half_up');
      if (input.mode === 'quantity' && Object.values(config.payload.limits || {}).some(limit => limit.currency === rate.currency && limit.applies_to === 'daily_gross')) {
        fail('QUANTITY_REQUIRES_DATES', 'Limite diário sobre o valor bruto exige datas para individualizar diárias, frações e adicionais.');
      }
      const originalDaily = rules.unit_rounding === undefined ? rate.value : roundDailies(rate.value, rules.unit_decimals, rules.unit_rounding);
      let daily = originalDaily;
      for (const limit of Object.values(config.payload.limits || {})) if (limit.currency === rate.currency && limit.applies_to === 'daily_rate') daily = Math.min(daily, limit.value);
      const quantity = input.mode === 'quantity' ? input.quantity : 1;
      let portion = 1;
      if (input.mode === 'period' && index === days.length - 1) portion = rules.return_fraction;
      if (circumstances.no_overnight) portion = Math.min(portion, rules.no_overnight_fraction);
      if (circumstances.supplied_lodging && rules.supplied_lodging_basis === 'payable_fraction') portion = Math.min(portion, rules.supplied_lodging_fraction);
      const supplied = [circumstances.supplied_lodging && rules.supplied_lodging_basis !== 'payable_fraction' ? rules.supplied_lodging_fraction : undefined, circumstances.supplied_meals ? rules.supplied_meals_fraction : undefined, circumstances.supplied_transport ? rules.supplied_transport_fraction : undefined].filter(v => v !== undefined);
      if (circumstances.supplied_transport && rules.supplied_transport_fraction === undefined) fail('MISSING_RULE', 'Redução por transporte fornecido não configurada.');
      if (supplied.length > 1 && !rules.supplied_reduction_combination) fail('MISSING_RULE', 'Informe como combinar reduções simultâneas de despesas fornecidas.');
      let reductionFactor = rules.supplied_reduction_combination === 'add_reductions' ? Math.max(0, 1 - supplied.reduce((sum, f) => sum + 1 - f, 0)) : supplied.reduce((product, f) => product * f, 1);
      if (circumstances.reduction_id) {
        const reduction = rules.allowed_reductions?.[circumstances.reduction_id];
        if (reduction === undefined) fail('INVALID_REDUCTION', 'Glosa não cadastrada para esta vigência.');
        reductionFactor *= fraction(reduction, 'Fator de glosa');
      }
      const gross = round(originalDaily * quantity * portion);
      let payableBasic = round(daily * quantity * portion * reductionFactor);
      let reductions = round(gross - round(originalDaily * quantity * portion * reductionFactor));
      let limitCut = round(gross - reductions - payableBasic);
      let boarding = 0;
      if (circumstances.boarding && index === 0) {
        if (!rules.boarding) fail('MISSING_BOARDING_RULE', 'Adicional de embarque sem regra configurada.');
        const boardingRate = resolveRate(config, rules.boarding.rate);
        if (boardingRate.currency !== rate.currency) fail('CURRENCY_MISMATCH', 'Moeda do embarque difere da diária.');
        const count = rules.boarding.count === 'once' ? 1 : positive(circumstances.boarding_legs, 'Quantidade de embarques', false);
        boarding = round(boardingRate.value * count);
      }
      let payableBoarding = round(boarding * (rules.boarding?.reduction_applies ? reductionFactor : 1));
      reductions = round(reductions + boarding - payableBoarding);
      let additions = 0;
      if (new Set(circumstances.additional_rates || []).size !== (circumstances.additional_rates || []).length) fail('DUPLICATE_ADDITION', 'Adicional informado mais de uma vez.');
      for (const key of circumstances.additional_rates || []) {
        if (!rules.additional_rates?.includes(key)) fail('INVALID_ADDITION', `Adicional ${key} não autorizado pela configuração.`);
        const additional = resolveRate(config, key);
        if (additional.currency !== rate.currency) fail('CURRENCY_MISMATCH', 'Moeda do adicional difere da diária.');
        additions += round(additional.value * quantity * portion);
      }
      additions = round(additions);
      let payableAdditions = round(additions * reductionFactor);
      reductions = round(reductions + additions - payableAdditions);
      for (const limit of Object.values(config.payload.limits || {})) if (limit.currency === rate.currency && limit.applies_to === 'daily_gross') {
        const beforeLimit = payableBasic + payableAdditions + payableBoarding;
        payableBasic = capped(payableBasic, limit.value);
        payableAdditions = capped(payableAdditions, limit.value - payableBasic);
        payableBoarding = capped(payableBoarding, limit.value - payableBasic - payableAdditions);
        limitCut = round(limitCut + beforeLimit - payableBasic - payableAdditions - payableBoarding);
      }
      // A trip ceiling is selected on departure and remains the same for every parcel.
      // Applying a lower later ceiling only to later parcels would exceed that ceiling.
      for (const limit of Object.values(departureConfig.payload.limits || {})) if (limit.currency === rate.currency && limit.applies_to === 'trip_gross') {
        const beforeLimit = payableBasic + payableAdditions + payableBoarding;
        const allowed = Math.max(0, limit.value - (tripGross[rate.currency] || 0));
        // Preserve transparent itemisation: cap basic allowance, then additions, then boarding.
        payableBasic = capped(payableBasic, allowed);
        payableAdditions = capped(payableAdditions, allowed - payableBasic);
        payableBoarding = capped(payableBoarding, allowed - payableBasic - payableAdditions);
        limitCut = round(limitCut + beforeLimit - payableBasic - payableAdditions - payableBoarding);
      }
      let deductionDays = quantity;
      if (rules.deduction_days === 'business' && (rules.deduct_meals || rules.deduct_transport)) {
        if (input.mode === 'period') {
          if (!config.payload.auxiliary?.holidays || !config.payload.auxiliary?.weekend_days) fail('MISSING_CALENDAR', 'Calendário e finais de semana não configurados.');
          validateSources(config, config.payload.auxiliary.source_ids);
          deductionDays = config.payload.auxiliary.holidays.includes(date) || config.payload.auxiliary.weekend_days.includes(new Date(date + 'T00:00:00Z').getUTCDay()) ? 0 : 1;
        }
      }
      let foodDays = rules.deduct_meals ? deductionDays : 0;
      let transportDays = rules.deduct_transport ? deductionDays : 0;
      if (input.mode === 'quantity') {
        const foodProvided = input.food_deduction_days_quantity ?? input.deduction_days_quantity;
        const transportProvided = input.transport_deduction_days_quantity ?? input.deduction_days_quantity;
        if (rules.deduct_meals && (foodProvided !== undefined || rules.deduction_days === 'business')) foodDays = positive(foodProvided, 'Dias de desconto alimentação');
        if (rules.deduct_transport && (transportProvided !== undefined || rules.deduction_days === 'business')) transportDays = positive(transportProvided, 'Dias de desconto transporte');
        if (Math.max(foodDays, transportDays) > Math.ceil(quantity)) fail('INVALID_DEDUCTION_DAYS', 'Dias de desconto excedem a quantidade de diárias.');
      } else if (rules.deduct_meals || rules.deduct_transport) {
        if (!rules.deduction_fraction) fail('MISSING_RULE', 'Configure se o desconto de benefício usa dia integral ou fração paga.');
        if (rules.deduction_fraction === 'payable_fraction') { foodDays *= portion * reductionFactor; transportDays *= portion * reductionFactor; }
      }
      let foodMonthly = 0;
      let transportMonthly = 0;
      if (rules.deduct_meals || rules.deduct_transport) {
        const month = date.slice(0, 7);
        const benefits = input.benefits_by_month?.[month] ?? (spansMultipleMonths ? undefined : input.benefits);
        if (spansMultipleMonths && !benefits) fail('AMBIGUOUS_BENEFITS', `Informe os benefícios efetivamente percebidos em ${month}; a viagem abrange múltiplas competências.`);
        if (!benefits || benefits.currency !== rate.currency) fail('MISSING_BENEFITS', 'Informe os benefícios percebidos na moeda da diária.');
        if (rules.deduct_meals) foodMonthly = positive(benefits.meals_monthly, 'Auxílio alimentação');
        if (rules.deduct_transport) transportMonthly = positive(benefits.transport_monthly, 'Auxílio transporte');
      }
      const cap = rules.deduction_cap === 'daily_gross' ? payableBasic : Infinity;
      const foodDeduction = round(Math.min(rules.deduct_meals ? foodMonthly / (rules.food_divisor ?? rules.deduction_divisor) * foodDays : 0, cap));
      const transportDeduction = round(Math.min(rules.deduct_transport ? transportMonthly / (rules.transport_divisor ?? rules.deduction_divisor) * transportDays : 0, Math.max(0, cap - foodDeduction)));
      const deductions = round(foodDeduction + transportDeduction);
      const parcel: DailiesParcel = { date, configuration_date: config.date, currency: rate.currency, quantity, daily_rate: originalDaily, fraction: portion, reduction_factor: reductionFactor, gross, boarding, additions, deductions, food_deduction: foodDeduction, transport_deduction: transportDeduction, food_deduction_days: foodDays, transport_deduction_days: transportDays, reductions, limit_cut: limitCut, net: round(gross + boarding + additions - reductions - limitCut - deductions), config };
      result.parcels.push(parcel);
      tripGross[rate.currency] = sumMoney((tripGross[rate.currency] || 0) + payableBasic + payableBoarding + payableAdditions);
      const totals = result.totals[rate.currency] ||= { gross: 0, boarding: 0, additions: 0, deductions: 0, food_deduction: 0, transport_deduction: 0, reductions: 0, limit_cut: 0, net: 0 };
      for (const field of ['gross', 'boarding', 'additions', 'deductions', 'food_deduction', 'transport_deduction', 'reductions', 'limit_cut', 'net'] as const) totals[field] = sumMoney(totals[field] + parcel[field]);
    }
    result.available = true;
    result.memory.parcels = copy(result.parcels);
    result.memory.totals = copy(result.totals);
    result.memory.versions = copy([...new Map(result.parcels.flatMap(p => p.config.versions).map(v => [v.id, v])).values()]);
  } catch (error) {
    result.parcels = []; result.totals = {};
    result.issues.push({ code: error instanceof DailiesError ? error.code : 'INVALID_CONFIG', message: error instanceof Error ? error.message : 'Configuração inválida.' });
  }
  return result;
}

/** Snapshot reads never consult live versions. A recalculation must call calculateDailies explicitly. */
export function replayDailiesMemory(memory: DailiesCalculationResult['memory']): DailiesCalculationResult {
  if (memory.schema_version !== 1 || memory.engine_version !== '1') fail('UNSUPPORTED_MEMORY', 'Versão de memória não suportada.');
  const result = calculateDailies(memory.input, memory.versions, memory.context);
  if (!result.available || JSON.stringify(result.memory.parcels) !== JSON.stringify(memory.parcels) || JSON.stringify(result.totals) !== JSON.stringify(memory.totals)) fail('MEMORY_MISMATCH', 'A memória não corresponde às entradas e versões preservadas.');
  return result;
}
