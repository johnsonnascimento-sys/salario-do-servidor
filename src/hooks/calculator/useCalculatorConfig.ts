import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CourtConfig } from '../../types';
import { getCourtBySlug } from '../../services/courtService';
import { configService } from '../../services/config';
import { mapEffectiveConfigToCourtConfig } from '../../services/config/mapEffectiveConfig';
import { supabase } from '../../lib/supabase';
import { AgencyCalculationEngine } from '../../services/agency/engine/AgencyCalculationEngine';

type LoadedConfig = {
    slug: string | undefined;
    agency: { name: string; type: string; slug: string } | null;
    agencyService: AgencyCalculationEngine | null;
    courtConfig: CourtConfig | null;
    loadingAgency: boolean;
    loadingConfig: boolean;
    agencyError: string | null;
    configError: string | null;
};
const emptyConfig = (slug: string | undefined): LoadedConfig => ({
    slug, agency: null, agencyService: null, courtConfig: null,
    loadingAgency: Boolean(slug), loadingConfig: Boolean(slug), agencyError: null, configError: null
});

export const useCalculatorConfig = (slug: string | undefined) => {
    const navigate = useNavigate();
    const resolvedSlug = slug === 'stm' ? 'jmu' : slug;
    const [loaded, setLoaded] = useState<LoadedConfig>(() => emptyConfig(resolvedSlug));
    useEffect(() => {
        let cancelled = false;
        setLoaded(emptyConfig(resolvedSlug));
        const update = (patch: Partial<LoadedConfig>) => {
            if (!cancelled) setLoaded(previous => ({ ...previous, ...patch }));
        };
        if (!resolvedSlug) {
            navigate('/');
            return () => { cancelled = true; };
        }
        void (async () => {
            try {
                const { data, error } = await supabase.from('agencies')
                    .select('name, type, slug').eq('slug', resolvedSlug).single();
                if (error || !data || data.slug !== resolvedSlug) throw new Error('Agência não encontrada.');
                if (data.slug !== 'jmu' && data.slug !== 'pju') throw new Error('Simulador indisponível para este órgão.');
                update({ agency: data.slug === 'jmu' ? { ...data, name: 'Justiça Militar da União' } : data,
                    agencyService: new AgencyCalculationEngine() });
            } catch (error) {
                update({ agencyError: error instanceof Error ? error.message : 'Não foi possível carregar a agência.' });
            } finally { update({ loadingAgency: false }); }
        })();
        void (async () => {
            try {
                const effective = await configService.getEffectiveConfig(resolvedSlug);
                if (cancelled) return;
                update({ courtConfig: mapEffectiveConfigToCourtConfig(effective) });
            } catch (_error) {
                if (cancelled) return;
                try {
                    // Legacy courts config remains a technical fallback only.
                    const court = await getCourtBySlug(resolvedSlug);
                    if (!court?.config) throw new Error('Configuração não encontrada.');
                    update({ courtConfig: court.config as CourtConfig });
                } catch (_fallbackError) { update({ configError: 'Configuração não encontrada.' }); }
            } finally { update({ loadingConfig: false }); }
        })();
        return () => { cancelled = true; };
    }, [resolvedSlug, navigate]);
    // Route changes hide the previous org before effects run.
    const current = loaded.slug === resolvedSlug ? loaded : emptyConfig(resolvedSlug);
    return {
        agency: current.agency, agencyService: current.agencyService,
        loadingAgency: current.loadingAgency, courtConfig: current.courtConfig,
        loadingConfig: current.loadingConfig, agencyError: current.agencyError,
        configError: current.configError
    };
};
