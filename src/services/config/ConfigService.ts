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
