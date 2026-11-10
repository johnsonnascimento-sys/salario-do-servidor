/**
 * ConfigService - Serviço de Configuração Hierárquica
 * 
 * Implementa o sistema de configuração em 3 níveis:
 * 1. global_config - Regras federais (IR, PSS, etc.)
 * 2. power_config - Regras do poder (PJU, Executivo, etc.)
 * 3. org_config - Regras do órgão (JMU, STM, etc.)
 * 
 * Hierarquia de prioridade: org_config > power_config > global_config
 */

import { supabase } from '../../lib/supabase';
import { deepMerge, deepMergeMultiple } from './mergeConfig';
import {
    GlobalConfig,
    PowerConfig,
    OrgConfig,
    EffectiveConfig,
    GlobalConfigRecord,
    PowerConfigRecord,
    OrgConfigRecord,
} from './types';

export class ConfigLoadError extends Error {
    readonly code = 'CONFIG_LOAD_FAILED';
    constructor(message: string, public readonly cause?: unknown) {
        super(message);
        this.name = 'ConfigLoadError';
    }
}

export class ConfigNotFoundError extends Error {
    readonly code = 'CONFIG_NOT_FOUND';
    constructor(orgSlug: string) {
        super(`Órgão ${orgSlug} não cadastrado na configuração hierárquica`);
        this.name = 'ConfigNotFoundError';
    }
}

export class ConfigService {
    /**
     * Cache de configurações para evitar múltiplas consultas ao banco
     */
    private cache: Map<string, EffectiveConfig> = new Map();

    /**
     * Busca configuração efetiva para um órgão
     * Aplica hierarquia: global < power < org
     * 
     * @param orgSlug - Slug do órgão (ex: 'jmu', 'stm')
     * @returns Configuração efetiva com merge completo
     */
    async getEffectiveConfig(orgSlug: string): Promise<EffectiveConfig> {
        // Verificar cache
        if (this.cache.has(orgSlug)) {
            return this.cache.get(orgSlug)!;
        }

        // 1. Buscar org_config (contém power_name)
        const orgConfig = await this.fetchOrgConfig(orgSlug);

        // 2. Buscar global_config
        const globalConfig = await this.fetchGlobalConfig();

        // 3. Buscar power_config usando power_name do org
        const powerConfig = await this.fetchPowerConfig(orgConfig.power_name);

        // 4. Fazer merge: global < power < org
        const effectiveConfig = this.mergeConfigs(
            globalConfig,
            powerConfig,
            orgConfig
        );

        // Cachear resultado
        this.cache.set(orgSlug, effectiveConfig);

        return effectiveConfig;
    }

    /**
     * Busca configuração global do banco
     * Retorna regras que se aplicam a todos os órgãos
     */
    private async fetchGlobalConfig(): Promise<GlobalConfig> {
        const { data, error } = await supabase
            .from('global_config')
            .select('*')
            .is('valid_to', null); // Apenas configs ativas

        if (error) {
            console.error('Erro operacional ao buscar global_config:', error);
            throw new ConfigLoadError('Falha operacional ao carregar configuração global', error);
        }

        if (!data || data.length === 0) {
            throw new ConfigNotFoundError('Configuração global ativa não cadastrada');
        }

        // Transformar array de registros em objeto estruturado
        const config: Partial<GlobalConfig> = {};

        for (const record of data as GlobalConfigRecord[]) {
            if (Object.prototype.hasOwnProperty.call(config, record.config_key)) {
                throw new ConfigLoadError(`Mais de uma versão global ativa para ${record.config_key}`);
            }
            config[record.config_key as keyof GlobalConfig] = record.config_value;
        }

        return config as GlobalConfig;
    }

    /**
     * Busca configuração de poder do banco
     * Retorna regras compartilhadas por um poder (ex: PJU)
     * 
     * @param powerName - Nome do poder (ex: 'PJU')
     */
    private async fetchPowerConfig(powerName: string): Promise<PowerConfig> {
        const { data, error } = await supabase
            .from('power_config')
            .select('*')
            .eq('power_name', powerName)
            .is('valid_to', null); // Apenas configs ativas

        if (error) {
            console.error('Erro operacional ao buscar power_config:', error);
            throw new ConfigLoadError(`Falha operacional ao carregar configuração do poder ${powerName}`, error);
        }

        if (!data || data.length === 0) {
            throw new ConfigNotFoundError(`Configuração ativa do poder ${powerName} não cadastrada`);
        }

        // Transformar array de registros em objeto estruturado
        const config: Partial<PowerConfig> = {};

        for (const record of data as PowerConfigRecord[]) {
            if (Object.prototype.hasOwnProperty.call(config, record.config_key)) {
                throw new ConfigLoadError(`Mais de uma versão ativa para ${powerName}/${record.config_key}`);
            }
            config[record.config_key as keyof PowerConfig] = record.config_value;
        }

        return config as PowerConfig;
    }

    /**
     * Busca configuração de organização do banco
     * Retorna regras específicas de um órgão (ex: JMU, CJF)
     *
     * Distingue ausência de cadastro de erro operacional de consulta.
     * Caso o registro não exista no banco, recorre a fallback transitório
     * para os órgãos federais pendentes de aplicação da migration 014.
     * 
     * @param orgSlug - Slug do órgão (ex: 'jmu', 'cjf')
     */
    private async fetchOrgConfig(orgSlug: string): Promise<OrgConfig> {
        const { data, error } = await supabase
            .from('org_config')
            .select('*')
            .eq('org_slug', orgSlug)
            .maybeSingle();

        // 1. Falha operacional da consulta (banco indisponível, erro de rede, RLS):
        // Não deve ser mascarada como ausência de registro
        if (error) {
            console.error(`Erro operacional ao buscar org_config para "${orgSlug}":`, error);
            throw new ConfigLoadError(`Falha operacional ao carregar configuração do órgão ${orgSlug}`, error);
        }

        // 2. Registro cadastrado no banco (caminho data-driven canônico)
        if (data) {
            const transitional = this.getTransitionalOrgFallback(orgSlug);
            if (transitional?.configuration?.transport_indemnity && !data.configuration?.transport_indemnity) {
                return {
                    ...data,
                    configuration: {
                        ...data.configuration,
                        transport_indemnity: transitional.configuration.transport_indemnity
                    }
                } as OrgConfigRecord;
            }
            return data as OrgConfigRecord;
        }

        // 3. Registro ausente no banco:
        // Verifica se há fallback técnico transitório para evitar indisponibilidade em produção
        // enquanto a migration 014 não for aplicada no banco de dados.
        const transitional = this.getTransitionalOrgFallback(orgSlug);
        if (transitional) {
            console.warn(
                `[ConfigService] Órgão "${orgSlug}" não encontrado na tabela org_config do banco de dados. ` +
                `Utilizando fallback técnico transitório. Aplique migrations/014_fix_cjf_trf_dailies_rules.sql no Supabase.`
            );
            return transitional;
        }

        // 4. Órgão sem registro e sem fallback técnico
        throw new ConfigNotFoundError(orgSlug);
    }

    /**
     * Fallback técnico transitório para órgãos federais antes da aplicação da migration 014.
     * Segue a estrutura canônica da Resolução CJF Nº 340/2015.
     */
    private getTransitionalOrgFallback(orgSlug: string): OrgConfig | null {
        if (orgSlug === 'cjf' || orgSlug.startsWith('trf')) {
            const orgName = orgSlug === 'cjf'
                ? 'Justiça Federal (CJF e TRFs)'
                : `Tribunal Regional Federal da ${orgSlug.replace('trf', '')}ª Região`;

            return {
                org_slug: orgSlug,
                org_name: orgName,
                power_name: 'PJU',
                configuration: {
                    dailies_rules: {
                        rates: {},
                        embarkation_additional: {
                            completo: 645.46,
                            metade: 322.73
                        },
                        embarkation_label: 'Adicional de transporte',
                        embarkation_description: 'Resolução CJF nº 340/2015 (art. 17): adicional de transporte para cobrir despesas de deslocamento de 80% sobre a diária básica de Analista Judiciário (equivalente a 44% da diária de Ministro do STF) para percurso completo e metade (22%) para apenas ida ou volta.',
                        normative_info: {
                            general_rule_label: 'Resolução CNJ Nº 73/2009',
                            branch_rule_label: 'Resolução CJF Nº 340/2015',
                            notes: [
                                'Regulamentado pela Resolução CJF Nº 340/2015 e Resolução CNJ Nº 73/2009',
                                'Valores unitários vinculados à diária de Ministro do STF',
                                'Adicional de transporte de 80% sobre a diária de Analista Judiciário para cobrir despesas de deslocamento (art. 17 da Res. CJF 340/2015)',
                                'Equipe de trabalho: diária correspondente ao maior valor da diária entre os membros da equipe (art. 10, § 1º da Res. CJF 340/2015 c/c art. 6º, § 2º da Res. CNJ 73/2009)',
                                'Acompanhamento de magistrado em tempo integral e mesma hospedagem: diária a 90% da autoridade assistida (art. 6º, § 5º da Res. CNJ 73/2009)'
                            ]
                        },
                        derived_from_minister: {
                            enabled: true,
                            minister_per_diem: 1466.95,
                            rates_percentages: {
                                desembargador: 0.95,
                                juiz: 0.9025,
                                juiz_titular: 0.9025,
                                juiz_substituto: 0.9025,
                                cj4: 0.55,
                                cj3: 0.55,
                                cj2: 0.55,
                                cj1: 0.55,
                                cj: 0.55,
                                analista: 0.55,
                                tecnico: 0.45,
                                auxiliar: 0.45
                            },
                            embarkation_percentage_full: 0.44,
                            embarkation_percentage_half: 0.22,
                            assistance_percentage: 0.80,
                            full_time_accompaniment_percentage: 0.90
                        },
                        external_gloss: {
                            hospedagem: 0.50,
                            alimentacao: 0.25,
                            transporte: 0.25
                        },
                        ldo_cap: {
                            enabled: true,
                            per_diem_limit: 1153.37
                        },
                        discount_rules: {
                            food_divisor: 22,
                            transport_divisor: 22,
                            exclude_weekends_and_holidays: true,
                            holidays: [],
                            return_day_half_diem_business_day: true,
                            return_day_half_discount_business_day: true
                        }
                    },
                    payroll_rules: {
                        gaj_rate: 1.40,
                        specific_gratification_rate: 0.35,
                        vr_rate_on_cj1: 0.05,
                        month_day_divisor: 30,
                        overtime_month_hours: 200, // Art. 46, § 1º da Resolução CJF Nº 4/2008 (Res. CJF 186/2012)
                        transport_workdays: 22,
                        transport_discount_rate: 0.06,
                        irrf_top_rate: 0.275
                    },
                    transport_indemnity: {
                        enabled: true,
                        competenceMode: 'previous_month',
                        divisor: 20,
                        versions: [
                            {
                                validFrom: '2025-01-01',
                                validTo: '2025-12-31',
                                fullAmount: 2289.21,
                                divisor: 20,
                                incidences: { ir: false, pss: false, funpresp: false },
                                publicationDate: '2025-02-13',
                                financialEffectsFrom: '2025-01-01',
                                normativeLabel: 'Res. CJF nº 4/2008 • Portaria nº 43/2025',
                                reference: 'Portaria CJF nº 43, de 22/01/2025 (DOU 13/02/2025, Seção 1, p. 119), com efeitos financeiros a partir de 01/01/2025'
                            },
                            {
                                validFrom: '2026-01-01',
                                validTo: null,
                                fullAmount: 2391.30,
                                divisor: 20,
                                incidences: { ir: false, pss: false, funpresp: false },
                                publicationDate: '2026-04-08',
                                financialEffectsFrom: '2026-01-01',
                                normativeLabel: 'Res. CJF nº 4/2008 • Portaria nº 182/2026',
                                reference: 'Portaria CJF nº 182, de 06/04/2026 (DOU 08/04/2026, Seção 1, p. 177), com efeitos financeiros a partir de 01/01/2026'
                            }
                        ],
                        normativeLabel: 'Res. CJF nº 4/2008 • Portaria nº 182/2026',
                        info: 'Ressarcimento das despesas com veículo particular utilizado em serviço externo pelo Analista Judiciário, Área Judiciária, especialidade Oficial de Justiça Avaliador Federal. O pagamento é realizado no mês seguinte ao da execução do serviço, integral a partir de 20 dias e proporcional (1/20 por dia) abaixo desse número.',
                        notes: [
                            'O pagamento é realizado no mês seguinte ao da execução do serviço externo (art. 56 da Resolução CJF nº 4/2008). Os dias informados referem-se ao mês de serviço.',
                            'São devidos 20 dias para o valor integral, ou 1/20 por dia de efetiva realização de serviço externo quando inferior a 20 dias (art. 55, caput e § 1º).',
                            'Considere apenas dias de efetivo serviço externo, excluindo férias, licenças e demais afastamentos, ainda que considerados em lei como de efetivo exercício (art. 56, parágrafo único).',
                            'Não computar os dias que servirem de base para o cálculo de diárias (art. 55, § 2º). A existência de diárias no mês não exclui automaticamente a indenização dos demais dias elegíveis.',
                            'É vedada a concessão de suprimento de fundos para tal finalidade, bem como a utilização de veículo oficial (art. 57).',
                            'A prestação dos serviços deve ser atestada pelo titular da unidade (art. 56); este cálculo constitui uma simulação.',
                            'Portaria CJF nº 182/2026 publicada no DOU em 08/04/2026, com efeitos financeiros a partir de 01/01/2026 (R$ 2.391,30). Período de 2025 regido pela Portaria CJF nº 43/2025 (R$ 2.289,21).',
                            'Não incidem IR (Decreto nº 9.580/2018, art. 35, I, \'e\'), PSS (Lei nº 10.887/2004, art. 4º, § 1º, III) nem contribuição Funpresp-Jud, nem há desconto sobre auxílio-alimentação.'
                        ],
                        incidences: { ir: false, pss: false, funpresp: false }
                    }
                }
            };
        }
        return null;
    }

    /**
     * Faz merge das configurações respeitando hierarquia
     * 
     * @param global - Configuração global (menor prioridade)
     * @param power - Configuração do poder (prioridade média)
     * @param org - Configuração do órgão (maior prioridade)
     * @returns Configuração efetiva com merge completo
     */
    private mergeConfigs(
        global: GlobalConfig,
        power: PowerConfig,
        org: OrgConfig
    ): EffectiveConfig {
        // Merge em ordem de prioridade: global < power < org
        const merged = deepMergeMultiple<any>(
            global,
            power,
            org.configuration
        );

        // Adicionar metadados do órgão
        return {
            ...merged,
            org_slug: org.org_slug,
            org_name: org.org_name,
            power_name: org.power_name,
        } as EffectiveConfig;
    }

    /**
     * Limpa o cache de configurações
     * Útil quando configurações são atualizadas no banco
     */
    clearCache(): void {
        this.cache.clear();
    }

    /**
     * Limpa cache de um órgão específico
     * 
     * @param orgSlug - Slug do órgão
     */
    clearCacheForOrg(orgSlug: string): void {
        this.cache.delete(orgSlug);
    }
}

// Exportar instância singleton
export const configService = new ConfigService();
