import React, { useState, useEffect } from 'react';
import { getPixKey, getPixQrCode } from '../services/settingsService';
import { Heart, QrCode, Copy, Check } from 'lucide-react';

export default function Donate() {
    const [copied, setCopied] = useState(false);
    const [pixKey, setPixKey] = useState<string>('');
    const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadDonationData() {
            const [key, qrUrl] = await Promise.all([
                getPixKey(),
                getPixQrCode()
            ]);
            setPixKey(key);
            setQrCodeUrl(qrUrl);
            setLoading(false);
        }
        loadDonationData();
    }, []);

    const handleCopyPix = async () => {
        try {
            await navigator.clipboard.writeText(pixKey);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Erro ao copiar:', err);
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="bg-white dark:bg-neutral-800 rounded-3xl p-8 md:p-12 border border-neutral-200 dark:border-neutral-700 shadow-xl relative overflow-hidden">
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>

                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-16 h-16 brand-gradient rounded-2xl flex items-center justify-center text-white shadow-lg">
                            <Heart className="w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-h2 md:text-h1 font-extrabold text-neutral-900 dark:text-white">
                                Apoie o <span className="gradient-text">Projeto</span>
                            </h1>
                            <p className="text-neutral-500 dark:text-neutral-400 font-medium">Ajude a manter a transparência no serviço público.</p>
                        </div>
                    </div>

                    <div className="prose perror-lg dark:perror-invert max-w-none text-neutral-600 dark:text-neutral-300 leading-relaxed space-y-6">
                        <p>
                            <strong>Olá, meu nome é Johnson.</strong>
                        </p>
                        <p>
                            Sou Técnico Judiciário da <strong>Justiça Militar da União</strong> e decidi criar este projeto com um propósito claro: acabar com a complexidade e a falta de clareza sobre nossas remunerações.
                        </p>
                        <p>
                            Notei que diversos colegas tinham as mesmas dificuldades para entender seus contracheques ou prever quanto ganhariam no futuro. Foi então que tive a ideia de desenvolver o <strong>Salário do Servidor</strong>, uma ferramenta dedicada a calcular com precisão matemática o que é nosso por direito.
                        </p>
                        <div className="bg-neutral-50 dark:bg-neutral-900/50 p-6 rounded-2xl border-l-4 border-secondary my-8">
                            <p className="italic m-0 text-neutral-700 dark:text-neutral-200">
                                "Eu sou o único desenvolvedor deste projeto. Do design ao código, da interpretação da legislação à manutenção dos servidores, tudo é feito por mim."
                            </p>
                        </div>
                        <p>
                            Para manter um serviço complexo como este no ar, pago do meu próprio bolso as ferramentas, domínios, segurança e hospedagem. Além disso, dedico meu tempo livre para estudar a legislação de cada órgão e garantir que a calculadora seja o mais próxima possível da realidade.
                        </p>
                        <p>
                            Minha missão é manter este acesso <strong>aberto e gratuito para todos</strong>. Se esta ferramenta já te ajudou a planejar suas finanças ou conferir seu contracheque, considere apoiar o projeto.
                        </p>
                    </div>

                    <div className="mt-12 bg-neutral-900 dark:bg-black rounded-3xl p-8 text-center md:text-left md:flex items-center justify-between gap-8">
                        <div>
                            <h3 className="text-white font-bold text-h4 mb-2">Faça um Pix e apoie</h3>
                            <p className="text-neutral-400 text-body mb-6 md:mb-0">Todo valor é revertido para a manutenção do site.</p>
                        </div>
                        <div className="flex flex-col items-center gap-3">
                            <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl">
                                {qrCodeUrl ? (
                                    <img
                                        src={qrCodeUrl}
                                        alt="QR Code Pix"
                                        className="w-24 h-24 object-contain"
                                    />
                                ) : (
                                    <QrCode className="w-10 h-10 text-neutral-900 dark:text-neutral-100" />
                                )}
                            </div>
                            <div className="bg-neutral-800 py-2 px-4 rounded-lg flex items-center gap-2 text-neutral-200 font-mono text-body border border-neutral-700">
                                <span className="truncate max-w-52">{pixKey}</span>
                                <button
                                    onClick={handleCopyPix}
                                    className="hover:text-white transition-colors flex-shrink-0"
                                    title="Copiar chave Pix"
                                >
                                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>
                            {copied && (
                                <span className="text-success-400 text-body-xs font-medium">Copiado!</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
