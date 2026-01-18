import React from 'react';
import { Sparkles, Calculator, TrendingUp, Shield } from 'lucide-react';
import logo from '../assets/logo.png';

export default function ComingSoon() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white font-display">
            {/* Background decorative elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
                <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
            </div>

            {/* Main Content */}
            <div className="relative container-app min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
                {/* Logo/Brand */}
                <div className="text-center mb-12 animate-fade-in">
                    <div className="inline-flex items-center justify-center mb-6">
                        <img
                            src={logo}
                            alt="Salário do Servidor"
                            className="w-24 h-24 sm:w-32 sm:h-32 drop-shadow-2xl"
                        />
                    </div>
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-4">
                        <span className="gradient-text">Salário do Servidor</span>
                    </h1>
                    <p className="text-xl sm:text-2xl text-slate-300 font-light">
                        Simuladores precisos para servidores públicos
                    </p>
                </div>

                {/* Status Badge */}
                <div className="flex justify-center mb-12">
                    <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
                        <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                        <span className="text-sm font-bold uppercase tracking-wider">Em Desenvolvimento</span>
                    </div>
                </div>

                {/* Description */}
                <div className="max-w-3xl mx-auto text-center mb-16">
                    <p className="text-lg sm:text-xl text-slate-300 leading-relaxed mb-8">
                        Estamos construindo a plataforma definitiva para cálculo de salários,
                        benefícios e simulações financeiras para servidores públicos brasileiros.
                    </p>

                    {/* Features Preview */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-12">
                        <div className="card p-6 bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all">
                            <Calculator className="w-8 h-8 text-primary mb-4 mx-auto" />
                            <h3 className="text-lg font-bold mb-2">Cálculos Precisos</h3>
                            <p className="text-sm text-slate-400">
                                Simulações baseadas em legislação atualizada
                            </p>
                        </div>

                        <div className="card p-6 bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all">
                            <TrendingUp className="w-8 h-8 text-primary mb-4 mx-auto" />
                            <h3 className="text-lg font-bold mb-2">Planejamento</h3>
                            <p className="text-sm text-slate-400">
                                Visualize proventos, descontos e benefícios
                            </p>
                        </div>

                        <div className="card p-6 bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all">
                            <Shield className="w-8 h-8 text-primary mb-4 mx-auto" />
                            <h3 className="text-lg font-bold mb-2">Seguro</h3>
                            <p className="text-sm text-slate-400">
                                Seus dados protegidos e privados
                            </p>
                        </div>
                    </div>
                </div>

                {/* Launch Timeline */}
                <div className="text-center">
                    <p className="text-slate-400 text-sm mb-4">
                        Lançamento previsto para
                    </p>
                    <p className="text-2xl sm:text-3xl font-bold gradient-text">
                        Em breve
                    </p>
                </div>

                {/* Footer */}
                <div className="mt-20 text-center text-slate-500 text-sm">
                    <p>© 2026 Salário do Servidor. Todos os direitos reservados.</p>
                </div>
            </div>

            {/* Animations */}
            <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }
      `}</style>
        </div>
    );
}
