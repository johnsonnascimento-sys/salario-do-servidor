import React, { useEffect, useState } from 'react';
import { Info } from 'lucide-react';

interface VersionInfo {
    version: string;
    commit: string;
    commitFull: string;
    branch: string;
    isDirty: boolean;
    buildDate: string;
    buildTimestamp: number;
}

/**
 * Badge discreto que mostra informações de versão da aplicação
 *
 * Lê do arquivo /version.json gerado no build e exibe:
 * - Versão (do package.json)
 * - Hash do commit (7 caracteres)
 * - Data do build
 *
 * Uso: <VersionBadge />
 */
export const VersionBadge: React.FC = () => {
    const [version, setVersion] = useState<VersionInfo | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        // Buscar version.json
        fetch('/version.json')
            .then(res => res.json())
            .then(data => setVersion(data))
            .catch(err => {
                console.warn('Failed to load version info:', err);
                // Fallback para desenvolvimento
                setVersion({
                    version: 'dev',
                    commit: 'local',
                    commitFull: 'local',
                    branch: 'dev',
                    isDirty: false,
                    buildDate: new Date().toISOString(),
                    buildTimestamp: Date.now(),
                });
            });
    }, []);

    if (!version) return null;
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';
    const showDirtyState = version.isDirty && isLocalHost;

    const formatBuildDate = (isoDate: string) => {
        const date = new Date(isoDate);
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    };

    return (
        <div
            className="group relative"
            onMouseEnter={() => setIsExpanded(true)}
            onMouseLeave={() => setIsExpanded(false)}
        >
            {/* Badge compacto */}
            <div className="flex items-center gap-1 text-label text-neutral-400 dark:text-neutral-500 font-mono cursor-help">
                <Info size={12} className="opacity-50" />
                <span>
                    v{version.version} • {version.commit}
                    {showDirtyState && <span className="text-warning-500">*</span>}
                </span>
            </div>

            {/* Tooltip expandido */}
            {isExpanded && (
                <div className="absolute bottom-full left-0 mb-2 bg-neutral-800 dark:bg-neutral-900 text-white text-body-xs rounded-lg p-3 shadow-lg border border-neutral-700 z-tooltip min-w-60">
                    <div className="space-y-1.5">
                        <div className="flex justify-between">
                            <span className="text-neutral-400">Versão:</span>
                            <span className="font-semibold">{version.version}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-neutral-400">Commit:</span>
                            <span className="font-mono text-body-xs">{version.commit}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-neutral-400">Branch:</span>
                            <span className="font-mono text-body-xs">{version.branch}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-neutral-400">Build:</span>
                            <span className="text-body-xs">{formatBuildDate(version.buildDate)}</span>
                        </div>
                        {showDirtyState && (
                            <div className="text-warning-400 text-label mt-2 pt-2 border-t border-neutral-700">
                                * Uncommitted changes
                            </div>
                        )}
                    </div>

                    {/* Seta do tooltip */}
                    <div className="absolute bottom-[-6px] left-4 w-3 h-3 bg-neutral-800 dark:bg-neutral-900 border-b border-r border-neutral-700 transform rotate-45"></div>
                </div>
            )}
        </div>
    );
};
