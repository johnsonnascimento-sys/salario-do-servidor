import { useEffect, useMemo, useRef, useState } from 'react';
import { dailiesService } from '../services/dailies/DailiesService';
import { calculateDailies, resolveDailiesConfig } from '../services/agency/dailies';
import type { DailiesContext, DailiesInput, DailiesVersion } from '../services/agency/dailies/types';

/** Configuration requests depend on the period; local inputs calculate synchronously. */
export function useDailies(input: DailiesInput, context: DailiesContext) {
  const inputKey = JSON.stringify({ input, context });
  const generation = useRef(0);
  const [refresh, setRefresh] = useState(0);
  const from = input.mode === 'period' ? input.start_date : input.normative_date || `${input.competence}-01`;
  const to = input.mode === 'period' ? input.end_date : input.normative_date || (/^\d{4}-(0[1-9]|1[0-2])$/.test(input.competence) ? new Date(Date.UTC(Number(input.competence.slice(0, 4)), Number(input.competence.slice(5, 7)), 0)).toISOString().slice(0, 10) : undefined);
  const periodKey = JSON.stringify({ org: input.org_slug, context, from, to });
  const requestKey = JSON.stringify([periodKey, refresh]);
  const [state, setState] = useState<{ key: string; periodKey: string; versions: DailiesVersion[]; revision: string; context?: DailiesContext; error?: string }>({ key: '', periodKey: '', versions: [], revision: '' });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const revalidate = () => setRefresh(value => value + 1);
    const onVisible = () => { if (document.visibilityState === 'visible') revalidate(); };
    window.addEventListener('focus', revalidate);
    document.addEventListener('visibilitychange', onVisible);
    return () => { window.removeEventListener('focus', revalidate); document.removeEventListener('visibilitychange', onVisible); };
  }, []);
  useEffect(() => {
    const request = ++generation.current;
    if (!from || !to || to < from) {
      setState({ key: requestKey, periodKey, versions: [], revision: '', error: 'Informe um período válido; o retorno deve ser igual ou posterior à saída.' });
      return;
    }
    dailiesService.fetchPublishedVersions(input.org_slug, from, to).then(data => {
      if (request === generation.current) setState({ key: requestKey, periodKey, versions: data.versions, revision: data.revision, context: data.context });
    }).catch(error => {
      if (request === generation.current) setState(previous => ({ key: requestKey, periodKey, versions: previous.periodKey === periodKey ? previous.versions : [], context: previous.periodKey === periodKey ? previous.context : undefined, revision: '', error: error instanceof Error ? error.message : 'Não foi possível carregar as diárias.' }));
    });
    return () => { generation.current++; };
  }, [requestKey]);
  return useMemo(() => {
    let config;
    const resolvedContext = state.context || context;
    const samePeriod = state.periodKey === periodKey;
    if (samePeriod) { try { config = resolveDailiesConfig(state.versions, resolvedContext, from!); } catch { /* The motor reports missing configuration explicitly. */ } }
    const boundaries = new Set<string>(samePeriod ? [from!] : []);
    if (samePeriod) for (const version of state.versions) {
      if (version.valid_from >= from! && version.valid_from <= to!) boundaries.add(version.valid_from);
      if (version.valid_to && version.valid_to >= from! && version.valid_to < to!) boundaries.add(new Date(Date.parse(`${version.valid_to}T00:00:00Z`) + 86400000).toISOString().slice(0, 10));
    }
    const configs = config?.payload.rules?.temporal_basis === 'departure' ? [config] : [...boundaries].sort().flatMap(date => {
      try { return [resolveDailiesConfig(state.versions, resolvedContext, date)]; } catch { return []; }
    });
    if (state.key !== requestKey) return { loading: true, result: undefined, config, configs, error: undefined, revision: '' };
    if (state.error) return { loading: false, result: undefined, config, configs, error: state.error, revision: state.revision };
    return { loading: false, result: calculateDailies(input, state.versions, resolvedContext), config, configs, error: undefined, revision: state.revision };
  }, [inputKey, requestKey, state]);
}
