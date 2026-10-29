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
            console.error('Erro ao buscar global_config:', error);
            throw new Error('Falha ao carregar configuração global');
        }

        // Transformar array de registros em objeto estruturado
        const config: Partial<GlobalConfig> = {};

        for (const record of data as GlobalConfigRecord[]) {
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
            console.error('Erro ao buscar power_config:', error);
            throw new Error(`Falha ao carregar configuração do poder ${powerName}`);
        }



        // Transformar array de registros em objeto estruturado
        const config: Partial<PowerConfig> = {};

        for (const record of data as PowerConfigRecord[]) {
            config[record.config_key as keyof PowerConfig] = record.config_value;
        }

        return config as PowerConfig;
    }

    /**
     * Busca configuração de organização do banco
     * Retorna regras específicas de um órgão (ex: JMU)
     * 
     * @param orgSlug - Slug do órgão (ex: 'jmu')
     */
    private async fetchOrgConfig(orgSlug: string): Promise<OrgConfig> {
        const { data, error } = await supabase
            .from('org_config')
            .select('*')
            .eq('org_slug', orgSlug)
            .single();

        if (error) {
            if (orgSlug === 'cjf' || orgSlug.startsWith('trf')) {
                return {
                    org_slug: orgSlug,
                    org_name: orgSlug === 'cjf' ? 'Justiça Federal (CJF e TRFs)' : 'Tribunal Regional Federal',
                    power_name: 'PJU',
                    configuration: {
                        dailies_rules: {
                            rates: {},
                            embarkation_additional: {
                                completo: 645.46,
                                metade: 322.73
                            },
                            embarkation_label: 'Adicional de deslocamento',
                            normative_info: {
                                general_rule_label: 'Resolução CNJ Nº 73/2009',
                                branch_rule_label: 'Resolução CJF Nº 340/2015',
                                notes: [
                                    'Regulamentado pela Resolução CJF Nº 340/2015 e Resolução CNJ Nº 73/2009',
                                    'Valores unitários vinculados à diária de Ministro do STF'
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
                                assistance_percentage: 0.80
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
                        }
                    }
                };
            }
            console.error('Erro ao buscar org_config:', error);
            throw new Error(`Falha ao carregar configuração do órgão ${orgSlug}`);
        }

        return data as OrgConfigRecord;
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
