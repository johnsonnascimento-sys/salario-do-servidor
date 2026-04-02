import { supabase } from '../lib/supabase';

export interface SiteSetting {
    id: string;
    key: string;
    value: string;
    updated_at: string;
}

const PIX_QR_BUCKET = 'assets';

function isAbsoluteUrl(value: string): boolean {
    return /^https?:\/\//i.test(value);
}

function normalizePixQrValue(rawValue: string | null): string | null {
    if (!rawValue) return null;
    const trimmed = rawValue.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith('data:image/')) {
        return trimmed;
    }

    if (isAbsoluteUrl(trimmed)) {
        return trimmed;
    }

    const normalizedPath = trimmed
        .replace(/^\/+/, '')
        .replace(/^assets\/+/i, '')
        .replace(/^qrcodes\/+/i, 'qrcodes/');
    const finalPath = normalizedPath.includes('/') ? normalizedPath : `qrcodes/${normalizedPath}`;

    const { data } = supabase.storage
        .from(PIX_QR_BUCKET)
        .getPublicUrl(finalPath);

    return data?.publicUrl || null;
}

export async function getSetting(key: string): Promise<string | null> {
    const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', key)
        .single();

    if (error) {
        console.error('Erro ao buscar configuração:', error);
        return null;
    }

    return data?.value || null;
}

export async function updateSetting(key: string, value: string): Promise<boolean> {
    const { error } = await supabase
        .from('site_settings')
        .upsert(
            { key, value, updated_at: new Date().toISOString() },
            { onConflict: 'key' }
        );

    if (error) {
        console.error('Erro ao atualizar configuração:', error);
        return false;
    }

    return true;
}

export async function getPixKey(): Promise<string> {
    const pixKey = await getSetting('pix_key');
    return pixKey || 'seu-pix-aqui@email.com';
}

export async function updatePixKey(pixKey: string): Promise<boolean> {
    return updateSetting('pix_key', pixKey);
}

export async function getPixQrCode(): Promise<string | null> {
    const qrCodeValue = await getSetting('pix_qrcode_url');
    return normalizePixQrValue(qrCodeValue);
}

export async function uploadPixQrCode(file: File): Promise<string | null> {
    const fileExt = file.name.split('.').pop();
    const fileName = `pix-qrcode-${Date.now()}.${fileExt}`;
    const filePath = `qrcodes/${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from(PIX_QR_BUCKET)
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true
        });

    if (uploadError) {
        console.error('Erro no upload:', uploadError);
        return null;
    }

    const { data } = supabase.storage
        .from(PIX_QR_BUCKET)
        .getPublicUrl(filePath);

    const publicUrl = data.publicUrl;
    const settingUpdated = await updateSetting('pix_qrcode_url', publicUrl);
    if (!settingUpdated) {
        await supabase.storage.from(PIX_QR_BUCKET).remove([filePath]);
        return null;
    }

    return publicUrl;
}
