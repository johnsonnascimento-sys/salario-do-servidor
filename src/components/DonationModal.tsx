import React, { useState, useEffect, useRef, useId } from 'react';
import { Heart, X, Clock, FileText, QrCode, Table } from 'lucide-react';
import { getPixKey, getPixQrCode } from '../services/settingsService';

interface DonationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onDownloadReady: () => void;
    exportType: 'pdf' | 'excel';
    countdownSeconds?: number;
}

export default function DonationModal({
    isOpen,
    onClose,
    onDownloadReady,
    exportType,
    countdownSeconds = 10
}: DonationModalProps) {
    const [countdown, setCountdown] = useState(countdownSeconds);
    const [isReady, setIsReady] = useState(false);
    const [pixKey, setPixKey] = useState('');
    const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [qrLoadError, setQrLoadError] = useState(false);
    const [pixError, setPixError] = useState('');
    const dialogRef = useRef<HTMLDivElement>(null);
    const titleId = useId();

    useEffect(() => {
        if (!isOpen) return;
        const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        dialogRef.current?.focus();
        return () => {
            document.body.style.overflow = previousOverflow;
            if (previousFocus?.isConnected) previousFocus.focus();
        };
    }, [isOpen]);

    // Load Pix data on open
    useEffect(() => {
        if (isOpen) {
            let active = true;
            setCountdown(countdownSeconds);
            setIsReady(false);
            setQrLoadError(false);
            setPixError('');

            Promise.all([getPixKey(), getPixQrCode()]).then(([key, qr]) => {
                if (!active) return;
                setPixKey(key);
                setQrCodeUrl(qr);
            }).catch(() => { if (active) setPixError('Os dados de apoio estão indisponíveis. Seu download será liberado normalmente.'); });
            return () => { active = false; };
        }
    }, [isOpen, countdownSeconds]);

    // Countdown timer
    useEffect(() => {
        if (!isOpen || isReady) return;

        if (countdown <= 0) {
            setIsReady(true);
            return;
        }

        const timer = setInterval(() => {
            setCountdown(prev => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [isOpen, countdown, isReady]);

    const handleCopyPix = async () => {
        try {
            await navigator.clipboard.writeText(pixKey);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Erro ao copiar:', err);
            setPixError('Não foi possível copiar a chave. Selecione e copie o texto exibido.');
        }
    };

    const handleDownload = () => {
        onDownloadReady();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}
                onKeyDown={event => {
                    if (event.key === 'Escape') { event.preventDefault(); onClose(); }
                    if (event.key !== 'Tab') return;
                    const controls = Array.from<HTMLElement>(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), [tabindex="0"]') ?? []).filter(element => element.getClientRects().length > 0);
                    const first = controls[0];
                    const last = controls[controls.length - 1];
                    if (!first) { event.preventDefault(); return; }
                    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
                        event.preventDefault(); last.focus();
                    } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialogRef.current)) {
                        event.preventDefault(); first.focus();
                    }
                }}
                className="bg-white dark:bg-neutral-800 rounded-3xl max-w-lg w-full max-h-[calc(100dvh-2rem)] overflow-y-auto shadow-2xl animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="bg-gradient-to-r from-error-500 to-error-600 p-6 text-white relative">
                    <button
                        type="button"
                        aria-label="Fechar exportação"
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/20 dark:bg-transparent dark:hover:bg-neutral-900/40 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/20 dark:bg-neutral-900/40 rounded-xl flex items-center justify-center">
                            <Heart className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 id={titleId} className="text-h4 font-bold">Apoie o Projeto!</h2>
                            <p className="text-body text-white/80">
                                Seu download será liberado em instantes
                            </p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {pixError && <p role="status" className="text-body text-neutral-700 dark:text-neutral-200">{pixError}</p>}
                    <p className="text-neutral-600 dark:text-neutral-300 text-body leading-relaxed">
                        O <strong>Salário do Servidor</strong> é mantido por uma única pessoa, com recursos próprios.
                        Se esta ferramenta te ajudou, considere fazer uma contribuição via Pix.
                        <strong> Qualquer valor faz diferença!</strong>
                    </p>

                    {/* QR Code Section */}
                    <div className="bg-neutral-50 dark:bg-neutral-900 rounded-2xl p-6 flex flex-col items-center gap-4">
                        {qrCodeUrl && !qrLoadError ? (
                            <img
                                src={qrCodeUrl}
                                alt="QR Code Pix"
                                className="w-32 h-32 bg-white dark:bg-neutral-900 p-2 rounded-xl"
                                onError={() => setQrLoadError(true)}
                            />
                        ) : (
                            <div className="w-32 h-32 bg-neutral-200 dark:bg-neutral-700 rounded-xl flex items-center justify-center">
                                <QrCode className="w-8 h-8 text-neutral-400" />
                            </div>
                        )}

                        <div className="flex items-center gap-2 bg-white dark:bg-neutral-800 py-2 px-4 rounded-lg border border-neutral-200 dark:border-neutral-700">
                            <span className="font-mono text-body-xs text-neutral-600 dark:text-neutral-300 truncate max-w-44">
                                {pixKey || 'Carregando...'}
                            </span>
                            <button
                                onClick={handleCopyPix}
                                className="text-secondary hover:text-secondary/80 transition-colors text-body-xs font-bold"
                            >
                                {copied ? '✓ Copiado!' : 'Copiar'}
                            </button>
                        </div>
                    </div>

                    {/* Countdown / Download Button */}
                    <div className="flex flex-col items-center gap-3">
                        {!isReady ? (
                            <div className="flex items-center gap-3 text-neutral-500 dark:text-neutral-400">
                                <Clock className="w-5 h-5" />
                                <span className="text-body">
                                    Download disponível em <strong className="text-secondary text-body-xl">{countdown}s</strong>
                                </span>
                            </div>
                        ) : (
                            <button
                                onClick={handleDownload}
                                className={`btn btn-lg w-full ${exportType === 'pdf'
                                        ? 'bg-error-500 hover:bg-error-600 text-white'
                                        : 'bg-success-500 hover:bg-success-600 text-white'
                                    }`}
                            >
                                {exportType === 'pdf' ? (
                                    <>
                                        <FileText className="w-5 h-5" />
                                        Baixar PDF Agora
                                    </>
                                ) : (
                                    <>
                                        <Table className="w-5 h-5" />
                                        Baixar Excel Agora
                                    </>
                                )}
                            </button>
                        )}
                    </div>

                    {/* Progress Bar */}
                    {!isReady && (
                        <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-1.5 overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-secondary to-primary transition-all duration-1000 ease-linear"
                                style={{ width: `${((countdownSeconds - countdown) / countdownSeconds) * 100}%` }}
                            />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 pb-6">
                    <p className="text-body-xs text-center text-neutral-400">
                        {isReady
                            ? 'Obrigado por considerar apoiar o projeto! ❤️'
                            : 'Enquanto aguarda, considere fazer uma contribuição via Pix'
                        }
                    </p>
                </div>
            </div>
        </div>
    );
}
