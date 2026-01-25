import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, Eye, EyeOff, AlertCircle, ArrowLeft, Shield } from 'lucide-react';
import logo from '../assets/logo.png';

export default function Login() {
    const { session, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<'login' | 'magic-link'>('login');
    const [magicLinkSent, setMagicLinkSent] = useState(false);

    React.useEffect(() => {
        if (session && !authLoading) {
            navigate('/admin');
        }
    }, [session, authLoading, navigate]);

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
        } catch (err) {
            setError('Erro de conexão. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const handleMagicLink = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    emailRedirectTo: `${window.location.origin}/admin`
                }
            });

            if (error) {
                setError(error.message);
            } else {
                setMagicLinkSent(true);
            }
        } catch (err) {
            setError('Erro ao enviar o link. Tente novamente.');
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
            {/* Header */}
            <header className="p-6">
                <Link to="/" className="inline-flex items-center gap-2 text-neutral-400 hover:text-white transition-colors text-body font-medium">
                    <ArrowLeft className="w-4 h-4" />
                    Voltar ao site
                </Link>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex items-center justify-center px-4 pb-12">
                <div className="w-full max-w-md">
                    {/* Logo & Title */}
                    <div className="text-center mb-8">
                        <div className="flex justify-center mb-4">
                            <div className="w-20 h-20 bg-white/10 dark:bg-neutral-900/40 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20">
                                <img src={logo} alt="Logo" className="w-14 h-14 object-contain" />
                            </div>
                        </div>
                        <h1 className="text-h3 font-bold text-white mb-2">Área Administrativa</h1>
                        <p className="text-neutral-400 text-body">Acesso restrito para administradores</p>
                    </div>

                    {/* Login Card */}
                    <div className="bg-white/5 dark:bg-neutral-900/40 backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-2xl">

                        {/* Magic Link Success Message */}
                        {magicLinkSent ? (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 bg-success-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Mail className="w-8 h-8 text-success-400" />
                                </div>
                                <h2 className="text-h4 font-bold text-white mb-2">Verifique seu email!</h2>
                                <p className="text-neutral-400 text-body mb-6">
                                    Enviamos um link de acesso para <strong className="text-white">{email}</strong>
                                </p>
                                <button
                                    onClick={() => setMagicLinkSent(false)}
                                    className="text-secondary-400 hover:text-secondary-300 text-body font-medium transition-colors"
                                >
                                    Usar outro email
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Mode Tabs */}
                                <div className="flex gap-2 p-1 bg-neutral-800/50 rounded-xl mb-6">
                                    <button
                                        onClick={() => setMode('login')}
                                        className={`flex-1 py-2.5 px-4 rounded-lg text-body font-medium transition-all ${mode === 'login'
                                                ? 'bg-white text-neutral-900 shadow-lg dark:bg-neutral-900/60 dark:text-white'
                                                : 'text-neutral-400 hover:text-white'
                                            }`}
                                    >
                                        Email & Senha
                                    </button>
                                    <button
                                        onClick={() => setMode('magic-link')}
                                        className={`flex-1 py-2.5 px-4 rounded-lg text-body font-medium transition-all ${mode === 'magic-link'
                                                ? 'bg-white text-neutral-900 shadow-lg dark:bg-neutral-900/60 dark:text-white'
                                                : 'text-neutral-400 hover:text-white'
                                            }`}
                                    >
                                        Magic Link
                                    </button>
                                </div>

                                {/* Error Message */}
                                {error && (
                                    <div className="mb-6 p-4 bg-error-500/10 border border-error-500/20 rounded-xl flex items-start gap-3">
                                        <AlertCircle className="w-5 h-5 text-error-400 flex-shrink-0 mt-0.5" />
                                        <p className="text-error-400 text-body">{error}</p>
                                    </div>
                                )}

                                {/* Login Form */}
                                <form onSubmit={mode === 'login' ? handleEmailLogin : handleMagicLink} className="space-y-5">
                                    {/* Email Field */}
                                    <div>
                                        <label className="block text-body font-medium text-neutral-300 mb-2">Email</label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 -tranneutral-y-1/2 w-5 h-5 text-neutral-500" />
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

                                    {/* Password Field (only for login mode) */}
                                    {mode === 'login' && (
                                        <div>
                                            <label className="block text-body font-medium text-neutral-300 mb-2">Senha</label>
                                            <div className="relative">
                                                <Lock className="absolute left-4 top-1/2 -tranneutral-y-1/2 w-5 h-5 text-neutral-500" />
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
                                                    className="absolute right-4 top-1/2 -tranneutral-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
                                                >
                                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Submit Button */}
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-gradient-to-r from-secondary-600 to-secondary-600 hover:from-secondary-500 hover:to-secondary-500 text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-secondary-500/25 hover:shadow-secondary-500/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {loading ? (
                                            <>
                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                                {mode === 'login' ? 'Entrando...' : 'Enviando...'}
                                            </>
                                        ) : (
                                            <>
                                                <Shield className="w-5 h-5" />
                                                {mode === 'login' ? 'Entrar' : 'Enviar Magic Link'}
                                            </>
                                        )}
                                    </button>
                                </form>

                                {/* Help Text */}
                                <p className="mt-6 text-center text-neutral-500 text-body-xs">
                                    {mode === 'login'
                                        ? 'Use suas credenciais de administrador para acessar.'
                                        : 'Você receberá um link de acesso único no seu email.'
                                    }
                                </p>
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <p className="mt-8 text-center text-neutral-600 dark:text-neutral-400 text-body-xs">
                        © 2024 Salário do Servidor. Área restrita.
                    </p>
                </div>
            </main>
        </div>
    );
}
