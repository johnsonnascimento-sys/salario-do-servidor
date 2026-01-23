/**
 * Utilitário de Deep Merge para Configurações
 * 
 * Faz merge profundo de objetos respeitando a hierarquia:
 * base < override
 * 
 * Configurações mais específicas sobrescrevem as mais genéricas.
 */

/**
 * Verifica se um valor é um objeto plano (não array, não null)
 */
function isPlainObject(value: any): boolean {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Deep merge de dois objetos
 * 
 * @param base - Objeto base (menor prioridade)
 * @param override - Objeto que sobrescreve (maior prioridade)
 * @returns Novo objeto com merge profundo
 */
export function deepMerge<T extends Record<string, any>>(
    base: T,
    override: Partial<T>
): T {
    const result = { ...base };

    for (const key in override) {
        if (override.hasOwnProperty(key)) {
            const overrideValue = override[key];
            const baseValue = result[key];

            if (isPlainObject(overrideValue) && isPlainObject(baseValue)) {
                // Se ambos são objetos, fazer merge recursivo
                result[key] = deepMerge(baseValue, overrideValue);
            } else if (overrideValue !== undefined) {
                // Caso contrário, sobrescrever
                result[key] = overrideValue;
            }
        }
    }

    return result;
}

/**
 * Deep merge de múltiplos objetos
 * Aplica merge em ordem: primeiro < segundo < terceiro
 * 
 * @param objects - Array de objetos para fazer merge
 * @returns Novo objeto com merge de todos
 */
export function deepMergeMultiple<T extends Record<string, any>>(
    ...objects: Array<Partial<T>>
): T {
    return objects.reduce((acc, obj) => deepMerge(acc as T, obj), {} as T);
}
