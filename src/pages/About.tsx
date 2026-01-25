import React from 'react';
import { Users, Target, Lightbulb, Shield } from 'lucide-react';

export default function About() {
    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="bg-white dark:bg-neutral-800 rounded-3xl p-8 md:p-12 border border-neutral-200 dark:border-neutral-700 shadow-xl relative overflow-hidden">
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>

                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-16 h-16 brand-gradient rounded-2xl flex items-center justify-center text-white shadow-lg">
                            <Users className="w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-h2 md:text-h1 font-extrabold text-neutral-900 dark:text-white">
                                Quem <span className="gradient-text">Somos</span>
                            </h1>
                            <p className="text-neutral-500 dark:text-neutral-400 font-medium">Conheça a história por trás do projeto.</p>
                        </div>
                    </div>

                    <div className="prose perror-lg dark:perror-invert max-w-none text-neutral-600 dark:text-neutral-300 leading-relaxed space-y-6">
                        <p>
                            O <strong>Salário do Servidor</strong> nasceu da necessidade de oferecer aos servidores públicos brasileiros uma ferramenta confiável e precisa para entender suas remunerações.
                        </p>
                        <p>
                            Desenvolvido por um servidor público que enfrentou as mesmas dificuldades que você, este projeto tem como objetivo democratizar o acesso à informação e promover a transparência no serviço público.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8">
                            <div className="bg-neutral-50 dark:bg-neutral-900/50 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-700">
                                <div className="flex items-center gap-3 mb-3">
                                    <Target className="w-6 h-6 text-secondary" />
                                    <h3 className="font-bold text-neutral-900 dark:text-white m-0">Nossa Missão</h3>
                                </div>
                                <p className="text-body m-0">
                                    Facilitar o entendimento das remunerações dos servidores públicos, oferecendo cálculos precisos e atualizados.
                                </p>
                            </div>
                            <div className="bg-neutral-50 dark:bg-neutral-900/50 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-700">
                                <div className="flex items-center gap-3 mb-3">
                                    <Lightbulb className="w-6 h-6 text-secondary" />
                                    <h3 className="font-bold text-neutral-900 dark:text-white m-0">Nossa Visão</h3>
                                </div>
                                <p className="text-body m-0">
                                    Ser a principal referência em simulação de remunerações para servidores públicos no Brasil.
                                </p>
                            </div>
                        </div>

                        <div className="bg-neutral-50 dark:bg-neutral-900/50 p-6 rounded-2xl border-l-4 border-secondary my-8">
                            <p className="italic m-0 text-neutral-700 dark:text-neutral-200">
                                "Acreditamos que todo servidor tem o direito de entender exatamente como sua remuneração é calculada."
                            </p>
                        </div>

                        <h2 className="text-h3 font-bold text-neutral-900 dark:text-white mt-8">Nossos Valores</h2>

                        <div className="grid grid-cols-1 gap-4">
                            <div className="flex items-start gap-4">
                                <Shield className="w-6 h-6 text-secondary flex-shrink-0 mt-1" />
                                <div>
                                    <h4 className="font-bold text-neutral-900 dark:text-white m-0">Transparência</h4>
                                    <p className="text-body m-0">Compromisso com informações claras e acessíveis.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <Shield className="w-6 h-6 text-secondary flex-shrink-0 mt-1" />
                                <div>
                                    <h4 className="font-bold text-neutral-900 dark:text-white m-0">Precisão</h4>
                                    <p className="text-body m-0">Cálculos baseados na legislação vigente e constantemente atualizados.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <Shield className="w-6 h-6 text-secondary flex-shrink-0 mt-1" />
                                <div>
                                    <h4 className="font-bold text-neutral-900 dark:text-white m-0">Acessibilidade</h4>
                                    <p className="text-body m-0">Ferramenta gratuita e aberta para todos os servidores públicos.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
