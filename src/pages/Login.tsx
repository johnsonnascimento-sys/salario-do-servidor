import React, { useState } from 'react';
import { useUserAuth } from '../hooks/user/useUserAuth';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, Eye, EyeOff, AlertCircle, ArrowLeft, Shield } from 'lucide-react';
import logo from '../assets/logo.png';

export default function Login() {
    const { session, loading: authLoading, isAdmin } = useUserAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    React.useEffect(() => {
        if (session && !authLoading) {
            if (isAdmin) {
                navigate('/admin');
            } else {
                setError('Sua conta não possui acesso administrativo.');
            }
        }
    }, [session, authLoading, isAdmin, navigate]);

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                if (error.message.includes('Invalid login credentials')) {
                    setError('Email ou senha incorretos.');
                } else if (error.message.includes('Email not confirmed')) {
                    setError('Confirme seu email antes de fazer login.');
                } else {
                    setError(error.message);
                }
            }
        } catch (_err) {
            setError('Erro de conexão. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 flex flex-col">
            <header className="p-6">
                <Link to="/" className="inline-flex items-center gap-2 text-neutral-400 hover:text-white transition-colors text-body font-medium">
                    <ArrowLeft className="w-4 h-4" />
                    Voltar ao site
                </Link>
            </header>

            <main className="flex-1 flex items-center justify-center px-4 pb-12">
                <div className="w-full max-w-md">
                    <div className="text-center mb-8">
                        <div className="flex justify-center mb-4">
                            <div className="w-20 h-20 bg-white/10 dark:bg-neutral-900/40 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20">
                                <img src={logo} alt="Logo" className="w-14 h-14 object-contain" />
                            </div>
                        </div>
                        <h1 className="text-h3 font-bold text-white mb-2">Área Administrativa</h1>
                        <p className="text-neutral-400 text-body">Acesso restrito para administradores</p>
                    </div>

                    <div className="bg-white/5 dark:bg-neutral-900/40 backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-2xl">
                        {error && (
                            <div className="mb-6 p-4 bg-error-500/10 border border-error-500/20 rounded-xl flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-error-400 flex-shrink-0 mt-0.5" />
                                <p className="text-error-400 text-body">{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleEmailLogin} className="space-y-5">
                            <div>
                                <label className="block text-body font-medium text-neutral-300 mb-2">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="seu@email.com"
                                        required
                                        className="w-full bg-neutral-800/50 border border-neutral-700 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-transparent transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-body font-medium text-neutral-300 mb-2">Senha</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        className="w-full bg-neutral-800/50 border border-neutral-700 rounded-xl py-3.5 pl-12 pr-12 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-transparent transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-secondary-600 to-secondary-600 hover:from-secondary-500 hover:to-secondary-500 text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-secondary-500/25 hover:shadow-secondary-500/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                        Entrando...
                                    </>
                                ) : (
                                    <>
                                        <Shield className="w-5 h-5" />
                                        Entrar
                                    </>
                                )}
                            </button>
                        </form>

                        <p className="mt-6 text-center text-neutral-500 text-body-xs">
                            Use suas credenciais de administrador para acessar.
                        </p>
                    </div>

                    <p className="mt-8 text-center text-neutral-600 dark:text-neutral-400 text-body-xs">
                        © 2024 Salário do Servidor. Área restrita.
                    </p>
                </div>
            </main>
        </div>
    );
}
