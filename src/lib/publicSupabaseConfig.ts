export function validatePublicSupabaseConfig(url: string | undefined, key: string | undefined) {
    const invalid = () => { throw new Error('Configure VITE_SUPABASE_URL e uma chave pública Supabase válida.'); };
    if (!url || !key) return invalid();
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return invalid();
        if (!key.startsWith('sb_publishable_')) {
            const payload = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
            if (payload.role !== 'anon') return invalid();
        }
    } catch { return invalid(); }
    return { url, key };
}
