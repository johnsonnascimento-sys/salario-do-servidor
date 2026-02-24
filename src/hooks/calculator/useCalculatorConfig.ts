/**
 * Hook de Configuração e Carregamento - Calculadora
 * 
 * Responsável por:
 * - Carregamento de agência (agency) do Supabase
 * - Instanciação do service apropriado (JmuService, etc)
 * - Carregamento de configuração do tribunal (courtConfig)
 * - Estados de loading
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CourtConfig } from '../../types';
import { getCourtBySlug } from '../../services/courtService';
import { configService } from '../../services/config';
import { mapEffectiveConfigToCourtConfig } from '../../services/config/mapEffectiveConfig';
import { supabase } from '../../lib/supabase';
import { JmuService } from '../../services/agency/implementations/JmuService';

export const useCalculatorConfig = (slug: string | undefined) => {
    const navigate = useNavigate();
    const resolvedSlug = slug === 'stm' ? 'jmu' : slug;

    // Agency State
    const [agency, setAgency] = useState<{ name: string, type: string } | null>(null);
    const [agencyService, setAgencyService] = useState<JmuService | null>(null);
    const [loadingAgency, setLoadingAgency] = useState(true);

    // Court Config State
    const [courtConfig, setCourtConfig] = useState<CourtConfig | null>(null);
    const [loadingConfig, setLoadingConfig] = useState(true);
    const [configError, setConfigError] = useState<string | null>(null);

    // Load Agency
    useEffect(() => {
        const loadAgency = async () => {
            setLoadingAgency(true);
            try {
                if (!resolvedSlug) {
                    navigate('/');
                    return;
                }

                const { data, error } = await supabase
                    .from('agencies')
                    .select('name, type, slug')
                    .eq('slug', resolvedSlug)
                    .single();

                if (error || !data) {
                    console.error("Agency not found:", resolvedSlug);
                    return;
                }

                const normalizedAgency = data.slug === 'jmu'
                    ? { ...data, name: 'Justiça Militar da União' }
                    : data;

                setAgency(normalizedAgency);

                // Instantiate Service
                if (data.slug === 'jmu' || data.slug === 'pju') {
                    setAgencyService(new JmuService());
                } else {
                    console.warn("Service not implemented for slug:", resolvedSlug);
                }

            } catch (err) {
                console.error(err);
            } finally {
                setLoadingAgency(false);
            }
        };

        loadAgency();
    }, [resolvedSlug, navigate]);

    // Load Court Config
    useEffect(() => {
        async function fetchConfig() {
            try {
                if (resolvedSlug) {
                    const effectiveConfig = await configService.getEffectiveConfig(resolvedSlug);
                    setCourtConfig(mapEffectiveConfigToCourtConfig(effectiveConfig));
                    setConfigError(null);
                }
            } catch (err) {
                console.error("Failed to load config from ConfigService", err);
                try {
                    const court = resolvedSlug ? await getCourtBySlug(resolvedSlug) : null;
                    if (court) {
                        setCourtConfig(court.config);
                        setConfigError(null);
                        return;
                    }
                } catch (fallbackErr) {
                    console.error("Failed to load config from courts table", fallbackErr);
                }
                setConfigError('Configuração não encontrada.');
            } finally {
                setLoadingConfig(false);
            }
        }
        fetchConfig();
    }, [resolvedSlug]);

    return {
        agency,
        agencyService,
        loadingAgency,
        courtConfig,
        loadingConfig,
        configError
    };
};
