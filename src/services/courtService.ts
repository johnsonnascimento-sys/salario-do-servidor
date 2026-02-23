import { supabase } from '../lib/supabase';

export interface CourtConfig {
    adjustment_schedule?: Array<{ period: number; percentage: number; label?: string }>;
    bases: any; // Defines structure matching BASES_2025
    historico_pss: any;
    historico_ir: any;
    historico_ir_brackets?: any;
    values: {
        food_allowance?: number; // Though auxAlimentacao is in state, maybe defaults?
        pre_school?: number; // COTA_PRE_ESCOLAR
        deducao_dep?: number; // DEDUCAO_DEP
        cj1_integral_base?: number; // CJ1_INTEGRAL_BASE
        adjustment_schedule?: Array<{ period: number; percentage: number; label?: string }>;
        reajustes?: Array<{ period: number; percentage: number; label?: string }>;
    };
    menus?: {
        food_allowance?: Array<{ label: string; value: number }>;
        preschool_allowance?: Array<{ label: string; value: number }>;
    };
    dailies?: {
        rates: Record<string, number>;
        embarkationAdditional: {
            completo: number;
            metade: number;
        };
        externalGloss: {
            hospedagem: number;
            alimentacao: number;
            transporte: number;
        };
    };
    payrollRules?: {
        gajRate: number;
        specificGratificationRate: number;
        vrRateOnCj1: number;
        monthDayDivisor: number;
        overtimeMonthHours: number;
        transportWorkdays: number;
        transportDiscountRate: number;
        irrfTopRate: number;
    };
    careerCatalog?: {
        noFunctionCode: string;
        noFunctionLabel: string;
        cargoLabels: Record<string, string>;
    };
}

export interface Court {
    id: string;
    slug: string;
    name: string;
    power?: string;
    sphere?: string;
    visible?: boolean;
    parent_id?: string | null;
    config: CourtConfig;
}

// Utility to deep merge two objects (Child overrides Parent)
const mergeConfigs = (parent: any, child: any): any => {
    if (!child) return parent;
    if (!parent) return child;

    const output = { ...parent };

    Object.keys(child).forEach(key => {
        const pValue = parent[key];
        const cValue = child[key];

        if (Array.isArray(cValue)) {
            // Arrays are replaced, not merged
            output[key] = cValue;
        } else if (
            cValue &&
            typeof cValue === 'object' &&
            pValue &&
            typeof pValue === 'object'
        ) {
            // Recursive merge for objects
            output[key] = mergeConfigs(pValue, cValue);
        } else {
            // Primitive or new field overrides
            output[key] = cValue;
        }
    });

    return output;
};

export const getCourtBySlug = async (slug: string): Promise<Court | null> => {
    // 1. Fetch the target court
    const { data: court, error } = await supabase
        .from('courts')
        .select('*')
        .eq('slug', slug)
        .single();

    if (error) {
        console.error('Error fetching court:', error);
        return null;
    }

    // 2. If no parent, return as is
    if (!court.parent_id) {
        return court;
    }

    // 3. Fetch parent
    const { data: parent, error: parentError } = await supabase
        .from('courts')
        .select('*')
        .eq('id', court.parent_id)
        .single();

    if (parentError) {
        console.warn('Error fetching parent court (ignoring inheritance):', parentError);
        return court;
    }

    // 4. Merge Configs (Parent + Child)
    // Child config takes precedence, filling gaps with Parent config
    const mergedConfig = mergeConfigs(parent.config, court.config);

    return {
        ...court,
        config: mergedConfig
    };
};

export const getCourtsByFilter = async (power: string, sphere: string): Promise<Court[]> => {
    const { data, error } = await supabase
        .from('courts')
        .select('*')
        .eq('power', power)
        .eq('sphere', sphere)
        .eq('visible', true);

    if (error) {
        console.error('Error fetching courts by filter:', error);
        return [];
    }
    return data || [];
};

export const getAllCourts = async (): Promise<Court[]> => {
    const { data, error } = await supabase
        .from('courts')
        .select('*')
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching all courts:', error);
        return [];
    }
    return data || [];
};

export const createCourt = async (courtData: Omit<Court, 'id'>): Promise<Court | null> => {
    const { data, error } = await supabase
        .from('courts')
        .insert([courtData])
        .select()
        .single();

    if (error) {
        console.error('Error creating court:', error);
        throw error;
    }
    return data;
};

export const updateCourt = async (id: string, courtData: Partial<Court>): Promise<void> => {
    const { error } = await supabase
        .from('courts')
        .update(courtData)
        .eq('id', id);

    if (error) {
        console.error('Error updating court:', error);
        throw error;
    }
};

export const getAvailablePowers = () => {
    return ['Judiciário', 'Executivo', 'Legislativo', 'MP'];
};

export const getAvailableSpheres = () => {
    return ['Federal', 'Estadual', 'Distrital', 'Municipal'];
};

export const updateCourtConfig = async (id: string, newConfig: any): Promise<void> => {
    return updateCourt(id, { config: newConfig });
};
